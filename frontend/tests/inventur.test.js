import test from 'node:test'
import assert from 'node:assert/strict'
import { bestandAendern, datenPruefen, inventurAbschliessen, inventurMengeSetzen, inventurStarten, inventurZaehlen, leereDaten, leereInventur, menge, produktSpeichern } from '../src/data/inventur.js'
import { ALT_KEY, laden, speichern, SPEICHER_KEY } from '../src/data/speicher.js'
import { pruefzifferGueltig } from '../src/scanner/gtin.js'

const produkt = { artikelnummer: 'A1', barcode: '4006381333931', name: 'Creme', bestand: 5, mindestbestand: 2 }
const basis = () => ({ produkte: [{ ...produkt }, { ...produkt, artikelnummer: 'A2', barcode: '', name: 'Handschuhe' }], inventur: leereInventur() })
function speicher() {
  const daten = new Map()
  return { getItem: key => daten.get(key) ?? null, setItem: (key, value) => daten.set(key, value) }
}

test('alte Arrays erhalten fehlende Kennungen und Barcodes', () => {
  const daten = datenPruefen([{ name: 'Alt', bestand: 2, mindestbestand: 1 }])
  assert.equal(daten.produkte[0].artikelnummer, 'ALT-1')
  assert.equal(daten.produkte[0].barcode, '')
  assert.equal(daten.inventur.aktiv, false)
})
test('Import lehnt doppelte Artikelnummern und Barcodes ab', () => {
  assert.throws(() => datenPruefen([produkt, { ...produkt, artikelnummer: 'a1', barcode: '' }]), /doppelt/)
  assert.throws(() => datenPruefen([produkt, { ...produkt, artikelnummer: 'A2' }]), /doppelt/)
})
test('fehlerhafte und widersprüchliche Importdaten werden nicht akzeptiert', () => {
  for (const eingabe of [null, {}, { produkte: [] }, { produkte: [produkt], inventur: { ...leereInventur(), positionen: [{}] } }]) assert.throws(() => datenPruefen(eingabe))
  const daten = inventurStarten(basis())
  daten.inventur.positionen[0].gezählt = -1
  assert.throws(() => datenPruefen(daten))
})
test('Bestände akzeptieren nur sichere ganze Zahlen ab null', () => {
  for (const wert of ['', ' ', -1, 1.5, Infinity, NaN, null, true, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => menge(wert))
  assert.equal(menge('0'), 0)
})
test('Produkt bearbeiten erhält Anzahl; doppelte Kennungen werden verhindert', () => {
  const daten = produktSpeichern(basis(), { ...produkt, name: 'Neue Creme' }, 'A1')
  assert.equal(daten.produkte.length, 2)
  assert.equal(daten.produkte[0].name, 'Neue Creme')
  assert.throws(() => produktSpeichern(daten, produkt), /doppelt/)
})
test('Bestandsänderungen mutieren nicht den vorherigen Stand und verhindern negative Werte', () => {
  const vorher = basis()
  assert.equal(bestandAendern(vorher, 'A1', 1).produkte[0].bestand, 6)
  assert.equal(vorher.produkte[0].bestand, 5)
  assert.throws(() => bestandAendern(vorher, 'A1', -6))
})
test('Inventur zählt getrennt; Mengenkorrektur ersetzt die Gesamtmenge', () => {
  const vorher = basis()
  let daten = inventurStarten(vorher)
  daten = inventurZaehlen(daten, produkt.barcode)
  daten = inventurZaehlen(daten, produkt.barcode)
  assert.equal(daten.inventur.positionen[0].gezählt, 2)
  assert.equal(daten.produkte[0].bestand, 5)
  daten = inventurMengeSetzen(daten, 'A1', '1')
  daten = inventurMengeSetzen(daten, 'A2', '7')
  assert.equal(daten.inventur.positionen[0].gezählt, 1)
  assert.equal(daten.inventur.positionen[1].gezählt, 7)
  assert.equal(vorher.inventur.aktiv, false)
})
test('Unbekannte Barcodes werden summiert', () => {
  let daten = inventurStarten(basis())
  daten = inventurZaehlen(daten, 'unbekannt')
  daten = inventurZaehlen(daten, 'unbekannt')
  assert.deepEqual(daten.inventur.unbekannteBarcodes, [{ barcode: 'unbekannt', anzahl: 2 }])
})
test('Abschluss übernimmt auch null und beendet die Inventur gemeinsam mit den Beständen', () => {
  const aktiv = inventurZaehlen(inventurStarten(basis()), produkt.barcode)
  const fertig = inventurAbschliessen(aktiv)
  assert.deepEqual(fertig.produkte.map(p => p.bestand), [1, 0])
  assert.deepEqual(fertig.inventur, leereInventur())
  assert.equal(aktiv.inventur.aktiv, true)
})
test('Abschluss verweigert geänderte Bestände und gelöschte Artikel', () => {
  const daten = inventurStarten(basis())
  assert.throws(() => inventurAbschliessen(bestandAendern(daten, 'A1', 1)), /geändert/)
  assert.throws(() => inventurAbschliessen({ ...daten, produkte: [] }), /geändert/)
})
test('keine Inventuraktionen außerhalb einer aktiven Inventur', () => {
  assert.throws(() => inventurZaehlen(basis(), produkt.barcode))
  assert.throws(() => inventurAbschliessen(basis()))
  assert.throws(() => inventurStarten(leereDaten()))
  assert.throws(() => inventurStarten(inventurStarten(basis())))
})
test('Migration lässt alte Browserdaten unverändert und priorisiert danach den React-Stand', () => {
  const storage = speicher()
  const alt = JSON.stringify(basis())
  storage.setItem(ALT_KEY, alt)
  const vorher = laden(storage)
  assert.equal(vorher.ausAltbestand, true)
  speichern(storage, vorher, bestandAendern(vorher.daten, 'A1', 1))
  assert.equal(storage.getItem(ALT_KEY), alt)
  assert.equal(laden(storage).daten.produkte[0].bestand, 6)
})
test('laufende Inventur wird nach Neuladen wiederhergestellt', () => {
  const storage = speicher()
  const daten = inventurZaehlen(inventurStarten(basis()), produkt.barcode)
  speichern(storage, laden(storage), daten)
  assert.deepEqual(laden(storage).daten, datenPruefen(daten))
})
test('Speicherfehler verändert weder vorherigen Stand noch gesicherte Daten', () => {
  const storage = speicher()
  const vorher = speichern(storage, laden(storage), basis())
  const roh = storage.getItem(SPEICHER_KEY)
  storage.setItem = () => { throw new Error('Speicher voll') }
  assert.throws(() => speichern(storage, vorher, inventurStarten(vorher.daten)), /Speicher voll/)
  assert.equal(storage.getItem(SPEICHER_KEY), roh)
  assert.equal(vorher.daten.inventur.aktiv, false)
})
test('veralteter Tab darf neuere Speicherung nicht überschreiben', () => {
  const storage = speicher()
  const alt = speichern(storage, laden(storage), basis())
  speichern(storage, alt, bestandAendern(alt.daten, 'A1', 1))
  assert.throws(() => speichern(storage, alt, bestandAendern(alt.daten, 'A1', -1)), /anderen Tab/)
  assert.equal(laden(storage).daten.produkte[0].bestand, 6)
})
test('beschädigter Speicher wird nicht durch leere Daten ersetzt', () => {
  const storage = speicher()
  storage.setItem(SPEICHER_KEY, 'kaputt')
  assert.throws(() => laden(storage))
  assert.equal(storage.getItem(SPEICHER_KEY), 'kaputt')
})
test('OCR prüft GTIN-Länge und Prüfziffer', () => {
  assert.equal(pruefzifferGueltig('4006381333931'), true)
  for (const wert of ['4006381333932', '123', 'abc', '']) assert.equal(pruefzifferGueltig(wert), false)
})
