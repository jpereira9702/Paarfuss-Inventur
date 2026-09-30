import { datenPruefen, leereInventur, menge } from './inventur.js'

export const FILIALEN = { innsbruck: 'Innsbruck', kematen: 'Kematen' }
const filialIds = Object.keys(FILIALEN)
export const leererBetrieb = () => ({ version: 2, produkte: [], inventuren: { innsbruck: leereInventur(), kematen: leereInventur() }, bestellungen: [] })
const leeresLager = () => ({ bestand: 0, mindestbestand: 0, zielbestand: 0 })
function filialePruefen(id) {
  if (!filialIds.includes(id)) throw new Error('Bitte eine gültige Filiale auswählen.')
}
function positiv(wert) {
  const zahl = menge(wert)
  if (!zahl) throw new Error('Bitte eine Menge größer als 0 eingeben.')
  return zahl
}
function datumPruefen(wert) {
  if (typeof wert !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(wert) || !Number.isFinite(Date.parse(wert)) || new Date(wert).toISOString().slice(0, 10) !== wert) throw new Error('Bestelldatum ist ungültig.')
  return wert
}
export function filialDaten(daten, filiale) {
  filialePruefen(filiale)
  return { produkte: daten.produkte.map(({ lager, ...p }) => ({ ...p, ...lager[filiale] })), inventur: daten.inventuren[filiale] }
}

// Alte Sicherungen bleiben bis zur ausdrücklichen Filialzuordnung unverändert.
export function betriebPruefen(eingabe) {
  if (eingabe?.version === undefined) return datenPruefen(eingabe)
  if (eingabe.version !== 2) throw new Error('Diese Version der Sicherung wird nicht unterstützt.')
  if (!Array.isArray(eingabe.produkte) || !eingabe.inventuren || !Array.isArray(eingabe.bestellungen)) throw new Error('Die Filialdaten sind unvollständig.')
  const geprueft = {}
  for (const filiale of filialIds) {
    if (!eingabe.inventuren[filiale] || eingabe.produkte.some(p => !p?.lager?.[filiale] || p.lager[filiale].zielbestand === undefined || !p.id || !p.einheit || p.packung === undefined)) throw new Error(`Lagerdaten für ${FILIALEN[filiale]} fehlen.`)
    geprueft[filiale] = datenPruefen(filialDaten(eingabe, filiale))
  }
  const produkte = geprueft.innsbruck.produkte.map((p, index) => {
    const { bestand, mindestbestand, zielbestand, ...stamm } = p
    const k = geprueft.kematen.produkte[index]
    return { ...stamm, lager: { innsbruck: { bestand, mindestbestand, zielbestand }, kematen: { bestand: k.bestand, mindestbestand: k.mindestbestand, zielbestand: k.zielbestand } } }
  })
  const ids = new Set()
  const bestellungen = eingabe.bestellungen.map(b => {
    if (!b || typeof b.id !== 'string' || !b.id.trim() || ids.has(b.id)) throw new Error('Bestellkennung fehlt oder ist doppelt.')
    ids.add(b.id)
    filialePruefen(b.filiale)
    if (!produkte.some(p => p.id === b.produktId)) throw new Error('Ein Bestellvermerk verweist auf ein fehlendes Produkt.')
    const anzahl = positiv(b.menge)
    const erhalten = menge(b.erhalten)
    if (erhalten > anzahl || typeof b.storniert !== 'boolean') throw new Error('Ungültiger Lieferstand.')
    return { id: b.id, produktId: b.produktId, filiale: b.filiale, menge: anzahl, erhalten, datum: datumPruefen(b.datum), storniert: b.storniert }
  })
  // Auch Summen müssen exakt darstellbar bleiben.
  for (const p of produkte) for (const f of filialIds) menge(bestellungen.filter(b => b.produktId === p.id && b.filiale === f && !b.storniert).reduce((s, b) => s + b.menge - b.erhalten, 0))
  return { version: 2, produkte, inventuren: Object.fromEntries(filialIds.map(f => [f, geprueft[f].inventur])), bestellungen }
}

export function altbestandZuordnen(alt, filiale) {
  filialePruefen(filiale)
  if (alt.version !== undefined) throw new Error('Die Daten sind bereits Filialen zugeordnet.')
  const geprueft = datenPruefen(alt)
  return betriebPruefen({ ...leererBetrieb(),
    produkte: geprueft.produkte.map(({ bestand, mindestbestand, zielbestand, ...p }) => ({ ...p, lager: { innsbruck: leeresLager(), kematen: leeresLager(), [filiale]: { bestand, mindestbestand, zielbestand } } })),
    inventuren: { ...leererBetrieb().inventuren, [filiale]: geprueft.inventur },
  })
}

export function filialeAendern(daten, filiale, funktion) {
  const vorher = filialDaten(daten, filiale)
  const nachher = datenPruefen(funktion(vorher))
  const inventurEndet = vorher.inventur.aktiv && !nachher.inventur.aktiv
  const inventurAktiv = Object.values(daten.inventuren).some(i => i.aktiv)
  const produkte = nachher.produkte.map(({ bestand, mindestbestand, zielbestand, ...stamm }) => {
    const alt = daten.produkte.find(p => p.id === stamm.id)
    if (vorher.inventur.aktiv && !inventurEndet && (!alt || alt.lager[filiale].bestand !== bestand)) throw new Error('Während der Inventur sind Bestandsbuchungen in dieser Filiale gesperrt. Bitte zuerst abschließen oder abbrechen.')
    if (alt && inventurAktiv && (alt.artikelnummer !== stamm.artikelnummer || alt.barcode !== stamm.barcode || alt.einheit !== stamm.einheit)) throw new Error('Artikelnummer, Barcode und Zähleinheit können erst nach den laufenden Inventuren geändert werden.')
    if (alt && alt.einheit !== stamm.einheit && (filialIds.some(f => alt.lager[f].bestand > 0) || daten.bestellungen.some(b => b.produktId === alt.id))) throw new Error('Die Zähleinheit kann bei vorhandenen Beständen oder Bestellvermerken nicht geändert werden.')
    return { ...stamm, lager: { ...(alt?.lager ?? { innsbruck: leeresLager(), kematen: leeresLager() }), [filiale]: { bestand, mindestbestand, zielbestand } } }
  })
  for (const alt of daten.produkte.filter(p => !produkte.some(q => q.id === p.id))) {
    if (inventurAktiv || filialIds.some(f => alt.lager[f].bestand > 0) || daten.bestellungen.some(b => b.produktId === alt.id)) throw new Error('Löschen ist nur ohne Bestände, Bestellvermerke und laufende Inventuren möglich. Das Produkt gilt für beide Filialen.')
  }
  return betriebPruefen({ ...daten, produkte, inventuren: { ...daten.inventuren, [filiale]: nachher.inventur } })
}

export function offeneMenge(daten, produktId, filiale) {
  return daten.bestellungen.filter(b => b.produktId === produktId && b.filiale === filiale && !b.storniert).reduce((s, b) => s + b.menge - b.erhalten, 0)
}
export function nachbestellListe(daten) {
  return daten.produkte.flatMap(p => filialIds.flatMap(filiale => {
    const lager = p.lager[filiale]
    const offen = offeneMenge(daten, p.id, filiale)
    if (lager.bestand > lager.mindestbestand && !offen) return []
    const bedarf = lager.bestand <= lager.mindestbestand ? Math.max(0, lager.zielbestand - lager.bestand - offen) : 0
    const vorschlag = menge(Math.ceil(bedarf / p.packung) * p.packung)
    const andere = filialIds.find(f => f !== filiale)
    const ueberschuss = Math.max(0, p.lager[andere].bestand - p.lager[andere].zielbestand)
    return [{ produkt: p, filiale, ...lager, offen, vorschlag, packungen: vorschlag / p.packung, andere, ueberschuss }]
  })).sort((a, b) => a.produkt.name.localeCompare(b.produkt.name, 'de') || a.filiale.localeCompare(b.filiale))
}

export function bestellungMerken(daten, { produktId, filiale, anzahl, datum }, id = crypto.randomUUID()) {
  filialePruefen(filiale)
  const produkt = daten.produkte.find(p => p.id === produktId)
  if (!produkt) throw new Error('Produkt nicht gefunden.')
  const wert = positiv(anzahl)
  if (wert % produkt.packung) throw new Error(`Bitte ganze Bestellpackungen mit je ${produkt.packung} ${produkt.einheit} erfassen.`)
  return betriebPruefen({ ...daten, bestellungen: [...daten.bestellungen, { id, produktId, filiale, menge: wert, erhalten: 0, datum: datumPruefen(datum), storniert: false }] })
}
export function lieferungBuchen(daten, id, anzahl) {
  const b = daten.bestellungen.find(b => b.id === id)
  if (!b || b.storniert) throw new Error('Offene Bestellung nicht gefunden.')
  const wert = positiv(anzahl)
  if (wert > b.menge - b.erhalten) throw new Error('Die Lieferung ist größer als die offene Bestellmenge.')
  if (daten.inventuren[b.filiale].aktiv) throw new Error('Bitte zuerst die Inventur dieser Filiale abschließen oder abbrechen.')
  return betriebPruefen({ ...daten,
    produkte: daten.produkte.map(p => p.id !== b.produktId ? p : { ...p, lager: { ...p.lager, [b.filiale]: { ...p.lager[b.filiale], bestand: menge(p.lager[b.filiale].bestand + wert) } } }),
    bestellungen: daten.bestellungen.map(q => q.id === id ? { ...q, erhalten: q.erhalten + wert } : q),
  })
}
export function bestellungStornieren(daten, id) {
  if (!daten.bestellungen.some(b => b.id === id && !b.storniert && b.erhalten < b.menge)) throw new Error('Offene Bestellung nicht gefunden.')
  return betriebPruefen({ ...daten, bestellungen: daten.bestellungen.map(b => b.id === id ? { ...b, storniert: true } : b) })
}
export function umlagern(daten, produktId, von, anzahl) {
  filialePruefen(von)
  const nach = filialIds.find(f => f !== von)
  const wert = positiv(anzahl)
  if (daten.inventuren[von].aktiv || daten.inventuren[nach].aktiv) throw new Error('Umlagern ist erst nach Abschluss der laufenden Inventuren möglich.')
  if (!daten.produkte.some(p => p.id === produktId)) throw new Error('Produkt nicht gefunden.')
  return betriebPruefen({ ...daten, produkte: daten.produkte.map(p => p.id !== produktId ? p : { ...p, lager: {
    ...p.lager, [von]: { ...p.lager[von], bestand: menge(p.lager[von].bestand - wert) }, [nach]: { ...p.lager[nach], bestand: menge(p.lager[nach].bestand + wert) },
  } }) })
}
