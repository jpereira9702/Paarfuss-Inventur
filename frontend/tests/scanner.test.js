import test from 'node:test'
import assert from 'node:assert/strict'
import { scannerErstellen } from '../src/scanner/steuerung.js'

function offen() { let resolve; const promise = new Promise(r => { resolve = r }); return { promise, resolve } }
function umgebung(aenderungen = {}) {
  const treffer = [], status = []
  let callback, gestoppt = 0, kameraStarts = 0
  const controls = { stop() { gestoppt++ } }
  const stream = { getTracks: () => [{ stop() { gestoppt++ } }], getVideoTracks: () => [] }
  const scanner = scannerErstellen({
    video: { srcObject: null }, aktualisieren: s => status.push(s), barcodeErkannt: b => treffer.push(b),
    kamera: async () => { kameraStarts++; return stream },
    leserLaden: async () => ({ decodeFromStream: async (_s, _v, cb) => { callback = cb; return controls } }),
    fotoLesen: async () => ({ barcode: '1234', ocr: false }), ...aenderungen,
  })
  return { scanner, treffer, status, controls, stream, callback: () => callback, gestoppt: () => gestoppt, kameraStarts: () => kameraStarts }
}
test('wiederholte Decoder-Ergebnisse buchen nur einmal; neuer Start darf erneut buchen', async () => {
  const u = umgebung()
  await u.scanner.starten()
  const callback = u.callback()
  callback({ getText: () => '1234' }, null, u.controls)
  callback({ getText: () => '1234' }, null, u.controls)
  assert.deepEqual(u.treffer, ['1234'])
  await u.scanner.starten()
  u.callback()({ getText: () => '1234' }, null, u.controls)
  assert.deepEqual(u.treffer, ['1234', '1234'])
  u.scanner.beenden()
})
test('früher Treffer vor Ende des Kamerastarts wird nur einmal gebucht', async () => {
  const controls = { stop() {} }
  const u = umgebung({ leserLaden: async () => ({ decodeFromStream: async (_s, _v, cb) => {
    cb({ getText: () => 'frueh' }, null, controls)
    cb({ getText: () => 'frueh' }, null, controls)
    return controls
  } }) })
  await u.scanner.starten()
  assert.deepEqual(u.treffer, ['frueh'])
})
test('doppelter Kamerastart wird blockiert', async () => {
  const warten = offen()
  let starts = 0
  const u = umgebung({ kamera: () => { starts++; return warten.promise } })
  const erster = u.scanner.starten()
  await u.scanner.starten()
  await Promise.resolve()
  assert.equal(starts, 1)
  warten.resolve(u.stream)
  await erster
  u.scanner.beenden()
})
test('Kamera, die erst nach Menüwechsel bereit ist, wird sofort geschlossen', async () => {
  const warten = offen()
  const u = umgebung({ kamera: () => warten.promise })
  const arbeit = u.scanner.starten()
  await Promise.resolve()
  u.scanner.beenden()
  warten.resolve(u.stream)
  await arbeit
  assert.ok(u.gestoppt() > 0)
  assert.deepEqual(u.treffer, [])
})
test('spätes Fotoergebnis nach Abbruch bucht nichts', async () => {
  const warten = offen()
  const u = umgebung({ fotoLesen: () => warten.promise })
  const arbeit = u.scanner.foto(new Blob(['foto']))
  u.scanner.stoppen()
  warten.resolve({ barcode: '123', ocr: false })
  await arbeit
  assert.deepEqual(u.treffer, [])
})
test('neues Foto ersetzt ein altes ausstehendes Foto', async () => {
  const warten = offen()
  let anzahl = 0
  const u = umgebung({ fotoLesen: () => ++anzahl === 1 ? warten.promise : Promise.resolve({ barcode: 'neu', ocr: false }) })
  const alt = u.scanner.foto(new Blob(['alt']))
  await u.scanner.foto(new Blob(['neu']))
  warten.resolve({ barcode: 'alt', ocr: false })
  await alt
  assert.deepEqual(u.treffer, ['neu'])
})
test('OCR-Ergebnis muss bestätigt werden', async () => {
  const u = umgebung({ fotoLesen: async () => ({ barcode: '4006381333931', ocr: true }) })
  await u.scanner.foto(new Blob(['foto']))
  assert.deepEqual(u.treffer, [])
  assert.equal(u.status.at(-1).kandidat, '4006381333931')
  u.scanner.manuell('4006381333931')
  assert.deepEqual(u.treffer, ['4006381333931'])
})
test('Kamerafehler hält die manuelle Erfassung verfügbar', async () => {
  const u = umgebung({ kamera: async () => { throw new Error('Keine Berechtigung') } })
  await u.scanner.starten()
  assert.ok(u.status.some(s => s.hinweis?.includes('Keine Berechtigung')))
  u.scanner.manuell('123')
  assert.deepEqual(u.treffer, ['123'])
})
