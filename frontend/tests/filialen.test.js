import test from 'node:test'
import assert from 'node:assert/strict'
import { altbestandZuordnen, bestellungMerken, bestellungStornieren, betriebPruefen, filialeAendern, filialDaten, leererBetrieb, lieferungBuchen, nachbestellListe, offeneMenge, umlagern } from '../src/data/filialen.js'
import { bestandAendern, inventurAbschliessen, inventurMengeSetzen, inventurStarten, leereInventur, produktSpeichern } from '../src/data/inventur.js'
import { laden, speichern, SPEICHER_KEY } from '../src/data/speicher.js'
const alt = () => ({ produkte: [{ artikelnummer: 'A1', barcode: '123', name: 'Creme', bestand: 2, mindestbestand: 5, zielbestand: 12, packung: 6, einheit: 'Flasche' }], inventur: leereInventur() })
const basis = () => altbestandZuordnen(alt(), 'innsbruck')
const bestellen = (d, anzahl = 12) => bestellungMerken(d, { produktId: 'A1', filiale: 'innsbruck', anzahl, datum: '2026-09-30' }, 'B1')
const zeile = d => nachbestellListe(d).find(z => z.filiale === 'innsbruck')

test('Altbestände und laufende Inventur werden nur der gewählten Filiale zugeordnet', () => {
  for (const filiale of ['innsbruck', 'kematen']) {
    const vorher = inventurMengeSetzen(inventurStarten(alt()), 'A1', 3)
    const kopie = structuredClone(vorher)
    const neu = altbestandZuordnen(vorher, filiale)
    const andere = filiale === 'innsbruck' ? 'kematen' : 'innsbruck'
    assert.equal(neu.produkte[0].lager[filiale].bestand, 2)
    assert.equal(neu.produkte[0].lager[andere].bestand, 0)
    assert.equal(neu.inventuren[filiale].positionen[0].gezählt, 3)
    assert.equal(neu.inventuren[andere].aktiv, false)
    assert.deepEqual(vorher, kopie)
  }
  assert.throws(() => altbestandZuordnen(alt(), 'falsch'))
  assert.throws(() => altbestandZuordnen(basis(), 'kematen'))
})
test('Filialbuchungen bleiben getrennt; Stammdaten und Kennung bleiben gemeinsam', () => {
  const vorher = basis()
  let neu = filialeAendern(vorher, 'kematen', d => bestandAendern(d, 'A1', 9))
  neu = filialeAendern(neu, 'innsbruck', d => produktSpeichern(d, { ...d.produkte[0], artikelnummer: 'NEU', name: 'Fußcreme' }, 'A1'))
  assert.equal(neu.produkte[0].id, 'A1')
  assert.equal(filialDaten(neu, 'kematen').produkte[0].name, 'Fußcreme')
  assert.equal(neu.produkte[0].lager.kematen.bestand, 9)
  assert.equal(neu.produkte[0].lager.innsbruck.bestand, 2)
  assert.equal(vorher.produkte[0].lager.kematen.bestand, 0)
})
test('Neues Produkt steht in beiden Filialen mit getrennten Beständen bereit', () => {
  const daten = filialeAendern(leererBetrieb(), 'kematen', d => produktSpeichern(d, alt().produkte[0]))
  assert.equal(daten.produkte[0].lager.innsbruck.bestand, 0)
  assert.equal(daten.produkte[0].lager.kematen.bestand, 2)
})
test('Inventuren können parallel laufen und getrennt abgeschlossen werden', () => {
  let d = filialeAendern(basis(), 'innsbruck', inventurStarten)
  d = filialeAendern(d, 'kematen', inventurStarten)
  d = filialeAendern(d, 'innsbruck', s => inventurMengeSetzen(s, 'A1', 7))
  d = filialeAendern(d, 'innsbruck', inventurAbschliessen)
  assert.equal(d.produkte[0].lager.innsbruck.bestand, 7)
  assert.equal(d.produkte[0].lager.kematen.bestand, 0)
  assert.equal(d.inventuren.kematen.aktiv, true)
  assert.equal(d.inventuren.innsbruck.aktiv, false)
})
test('Inventur sperrt nur das betroffene Lager; auch Lieferung, Umlagerung und Identitätswechsel sind geschützt', () => {
  const d = filialeAendern(bestellen(basis()), 'innsbruck', inventurStarten)
  assert.throws(() => filialeAendern(d, 'innsbruck', s => bestandAendern(s, 'A1', 1)), /gesperrt/)
  assert.equal(filialeAendern(d, 'kematen', s => bestandAendern(s, 'A1', 1)).produkte[0].lager.kematen.bestand, 1)
  assert.throws(() => lieferungBuchen(d, 'B1', 1), /Inventur/)
  assert.throws(() => umlagern(d, 'A1', 'innsbruck', 1), /Inventur/)
  assert.throws(() => filialeAendern(d, 'kematen', s => produktSpeichern(s, { ...s.produkte[0], barcode: '456' }, 'A1')), /Inventur/)
})
test('Nachbestellung rundet auf Packungen und berücksichtigt offene Bestellungen', () => {
  assert.equal(zeile(basis()).vorschlag, 12)
  assert.equal(zeile(basis()).packungen, 2)
  const d = bestellen(basis(), 6)
  assert.equal(zeile(d).offen, 6)
  assert.equal(zeile(d).vorschlag, 6)
  assert.equal(d.produkte[0].lager.innsbruck.bestand, 2)
  assert.equal(zeile(bestellen(basis())).vorschlag, 0)
})
test('Umlagerhinweis verwendet nur Überschuss über dem Zielbestand', () => {
  const d = filialeAendern(basis(), 'kematen', s => produktSpeichern(s, { ...s.produkte[0], bestand: 20, mindestbestand: 3, zielbestand: 8 }, 'A1'))
  assert.equal(zeile(d).andere, 'kematen')
  assert.equal(zeile(d).ueberschuss, 12)
})
test('Teillieferungen erhöhen nur das zugehörige Lager und verbleiben bis zur vollständigen Lieferung sichtbar', () => {
  const vorher = bestellen(basis())
  let d = lieferungBuchen(vorher, 'B1', 5)
  assert.equal(d.produkte[0].lager.innsbruck.bestand, 7)
  assert.equal(d.produkte[0].lager.kematen.bestand, 0)
  assert.equal(offeneMenge(d, 'A1', 'innsbruck'), 7)
  assert.equal(zeile(d).offen, 7)
  d = lieferungBuchen(d, 'B1', 7)
  assert.equal(d.produkte[0].lager.innsbruck.bestand, 14)
  assert.equal(zeile(d), undefined)
  assert.equal(vorher.produkte[0].lager.innsbruck.bestand, 2)
  assert.throws(() => lieferungBuchen(d, 'B1', 1))
})
test('Stornierung betrifft nur die Restmenge, keine bereits gelieferte Ware', () => {
  let d = lieferungBuchen(bestellen(basis()), 'B1', 1)
  d = bestellungStornieren(d, 'B1')
  assert.equal(d.produkte[0].lager.innsbruck.bestand, 3)
  assert.equal(offeneMenge(d, 'A1', 'innsbruck'), 0)
  assert.equal(zeile(d).vorschlag, 12)
  assert.throws(() => lieferungBuchen(d, 'B1', 1))
  assert.throws(() => bestellungStornieren(d, 'fehlt'))
})
test('Umlagerung erhält Gesamtbestand und lehnt Überbuchung ohne Teiländerung ab', () => {
  const d = basis()
  const neu = umlagern(d, 'A1', 'innsbruck', 2)
  assert.equal(neu.produkte[0].lager.innsbruck.bestand, 0)
  assert.equal(neu.produkte[0].lager.kematen.bestand, 2)
  assert.throws(() => umlagern(d, 'A1', 'innsbruck', 3))
  assert.equal(d.produkte[0].lager.innsbruck.bestand, 2)
})
test('Bestell- und Liefermengen, Packungen, Zielbestände und Daten werden validiert', () => {
  for (const wert of [0, -1, 1.5, '', 5, Infinity]) assert.throws(() => bestellen(basis(), wert))
  for (const wert of [0, -1, 1.5, 13, Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => lieferungBuchen(bestellen(basis()), 'B1', wert))
  for (const datum of ['2026-02-30', '', '31.09.2026']) assert.throws(() => bestellungMerken(basis(), { produktId: 'A1', filiale: 'innsbruck', anzahl: 6, datum }, 'x'))
  for (const patch of [{ packung: 0 }, { zielbestand: 4 }]) assert.throws(() => altbestandZuordnen({ ...alt(), produkte: [{ ...alt().produkte[0], ...patch }] }, 'innsbruck'))
})
test('Unvollständige Sicherungen, fremde Filialen und verwaiste Bestellungen werden abgelehnt', () => {
  const d = bestellen(basis())
  for (const kaputt of [
    { ...d, version: 3 }, { ...d, inventuren: { innsbruck: leereInventur() } },
    { ...d, produkte: [{ ...d.produkte[0], lager: { innsbruck: d.produkte[0].lager.innsbruck } }] },
    { ...d, bestellungen: [{ ...d.bestellungen[0], produktId: 'fehlt' }] },
    { ...d, bestellungen: [{ ...d.bestellungen[0], filiale: 'falsch' }] },
    { ...d, bestellungen: [d.bestellungen[0], d.bestellungen[0]] },
  ]) assert.throws(() => betriebPruefen(kaputt))
  assert.deepEqual(betriebPruefen(JSON.parse(JSON.stringify(d))), d)
})
test('Löschen oder Einheitenwechsel kann Bestände und Bestellvermerke nicht verlieren', () => {
  const d = bestellen(basis())
  assert.throws(() => filialeAendern(d, 'kematen', s => ({ ...s, produkte: [] })), /Löschen/)
  assert.throws(() => filialeAendern(d, 'innsbruck', s => produktSpeichern(s, { ...s.produkte[0], einheit: 'Schachtel' }, 'A1')), /Zähleinheit/)
})
test('Speicherfehler und veraltete Tabs können keine halbe Lieferung oder Umlagerung speichern', () => {
  const map = new Map()
  const storage = { getItem: k => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) }
  const alt = speichern(storage, laden(storage), bestellen(basis()))
  const neu = speichern(storage, alt, lieferungBuchen(alt.daten, 'B1', 1))
  assert.throws(() => speichern(storage, alt, umlagern(alt.daten, 'A1', 'innsbruck', 1)), /anderen Tab/)
  const roh = map.get(SPEICHER_KEY)
  storage.setItem = () => { throw new Error('voll') }
  assert.throws(() => speichern(storage, neu, lieferungBuchen(neu.daten, 'B1', 1)), /voll/)
  assert.equal(map.get(SPEICHER_KEY), roh)
  assert.equal(neu.daten.bestellungen[0].erhalten, 1)
})
test('Packungsrundung und summierte offene Bestellungen dürfen nicht überlaufen', () => {
  assert.throws(() => altbestandZuordnen({ ...alt(), produkte: [{ ...alt().produkte[0], zielbestand: Number.MAX_SAFE_INTEGER }] }, 'innsbruck'), /zu große/)
  const d = basis()
  d.produkte[0].packung = 1
  const voll = bestellen(d, Number.MAX_SAFE_INTEGER)
  assert.throws(() => bestellungMerken(voll, { produktId: 'A1', filiale: 'innsbruck', anzahl: 1, datum: '2026-09-30' }, 'B2'))
  assert.throws(() => lieferungBuchen(voll, 'B1', Number.MAX_SAFE_INTEGER))
})
