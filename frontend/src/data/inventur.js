// Reine Fachlogik: unabhängig von React, Kamera und Browser-Speicher testbar.
export const leereInventur = () => ({ aktiv: false, gestartetAm: null, positionen: [], unbekannteBarcodes: [] })
export const leereDaten = () => ({ produkte: [], inventur: leereInventur() })

export function menge(wert) {
  if ((typeof wert !== 'number' && typeof wert !== 'string') || String(wert).trim() === '') {
    throw new Error('Bitte eine ganze Zahl ab 0 eingeben.')
  }
  const zahl = Number(wert)
  if (!Number.isSafeInteger(zahl) || zahl < 0) throw new Error('Bitte eine ganze Zahl ab 0 eingeben.')
  return zahl
}

function text(wert, feld, optional = false) {
  if (typeof wert !== 'string' || (!optional && !wert.trim())) throw new Error(`${feld} fehlt oder ist ungültig.`)
  return wert.trim()
}

function eindeutig(liste, feld, optional = false) {
  const gesehen = new Set()
  for (const eintrag of liste) {
    const wert = eintrag[feld].toLowerCase()
    if (optional && !wert) continue
    if (gesehen.has(wert)) throw new Error(`${feld} ist doppelt vorhanden: ${eintrag[feld]}`)
    gesehen.add(wert)
  }
}

export function produktPruefen(p) {
  if (!p || typeof p !== 'object') throw new Error('Ungültiges Produkt.')
  return {
    artikelnummer: text(p.artikelnummer, 'Artikelnummer'),
    barcode: text(p.barcode ?? '', 'Barcode', true),
    name: text(p.name, 'Produktname'),
    bestand: menge(p.bestand),
    mindestbestand: menge(p.mindestbestand),
  }
}

// Unterstützt alte Produktarrays und das bisherige Objekt { produkte, inventur }.
export function datenPruefen(eingabe) {
  const daten = Array.isArray(eingabe) ? { produkte: eingabe, inventur: leereInventur() } : eingabe
  if (!daten || !Array.isArray(daten.produkte)) throw new Error('Die Datei enthält keine gültige Produktliste.')
  const produkte = daten.produkte.map((p, i) => produktPruefen({ ...p, artikelnummer: p?.artikelnummer ?? `ALT-${i + 1}` }))
  eindeutig(produkte, 'artikelnummer')
  eindeutig(produkte, 'barcode', true)
  const inv = daten.inventur
  if (!inv || typeof inv.aktiv !== 'boolean' || !Array.isArray(inv.positionen) || !Array.isArray(inv.unbekannteBarcodes)) {
    throw new Error('Der Inventurstand ist ungültig.')
  }
  if (!inv.aktiv) {
    if (inv.positionen.length || inv.unbekannteBarcodes.length) throw new Error('Eine beendete Inventur enthält noch Zählungen.')
    return { produkte, inventur: leereInventur() }
  }
  if (typeof inv.gestartetAm !== 'string' || !Number.isFinite(Date.parse(inv.gestartetAm))) throw new Error('Inventurdatum ist ungültig.')
  const positionen = inv.positionen.map(p => ({
    artikelnummer: text(p.artikelnummer, 'Inventur-Artikelnummer'),
    barcode: text(p.barcode ?? '', 'Barcode', true),
    name: text(p.name, 'Produktname'),
    erwartet: menge(p.erwartet),
    gezählt: menge(p.gezählt),
  }))
  eindeutig(positionen, 'artikelnummer')
  eindeutig(positionen, 'barcode', true)
  const unbekannteBarcodes = inv.unbekannteBarcodes.map(p => ({ barcode: text(p.barcode, 'Barcode'), anzahl: menge(p.anzahl) }))
  eindeutig(unbekannteBarcodes, 'barcode')
  if (unbekannteBarcodes.some(p => positionen.some(q => q.barcode === p.barcode))) throw new Error('Ein unbekannter Barcode ist bereits einer Inventurposition zugeordnet.')
  return { produkte, inventur: { aktiv: true, gestartetAm: inv.gestartetAm, positionen, unbekannteBarcodes } }
}

export function produktSpeichern(daten, eingabe, original = null) {
  const produkt = produktPruefen(eingabe)
  if (original !== null && !daten.produkte.some(p => p.artikelnummer === original)) throw new Error('Das bearbeitete Produkt existiert nicht mehr.')
  const produkte = original === null
    ? [...daten.produkte, produkt]
    : daten.produkte.map(p => p.artikelnummer === original ? produkt : p)
  return datenPruefen({ ...daten, produkte })
}

export function bestandAendern(daten, artikelnummer, differenz) {
  const produkt = daten.produkte.find(p => p.artikelnummer === artikelnummer)
  if (!produkt) throw new Error('Produkt nicht gefunden.')
  return produktSpeichern(daten, { ...produkt, bestand: menge(produkt.bestand + differenz) }, artikelnummer)
}

export function inventurStarten(daten, jetzt = new Date().toISOString()) {
  if (daten.inventur.aktiv) throw new Error('Es läuft bereits eine Inventur.')
  if (!daten.produkte.length) throw new Error('Bitte zuerst Produkte anlegen oder importieren.')
  return { ...daten, inventur: {
    aktiv: true, gestartetAm: jetzt, unbekannteBarcodes: [],
    positionen: daten.produkte.map(p => ({ artikelnummer: p.artikelnummer, barcode: p.barcode, name: p.name, erwartet: p.bestand, gezählt: 0 })),
  } }
}

export function inventurMengeSetzen(daten, artikelnummer, anzahl) {
  if (!daten.inventur.aktiv) throw new Error('Bitte zuerst eine Inventur starten.')
  if (!daten.inventur.positionen.some(p => p.artikelnummer === artikelnummer)) throw new Error('Inventurposition nicht gefunden.')
  const wert = menge(anzahl)
  return { ...daten, inventur: { ...daten.inventur, positionen: daten.inventur.positionen.map(p => p.artikelnummer === artikelnummer ? { ...p, gezählt: wert } : p) } }
}

export function inventurZaehlen(daten, eingabe) {
  if (!daten.inventur.aktiv) throw new Error('Bitte zuerst eine Inventur starten.')
  const barcode = text(eingabe, 'Barcode')
  const position = daten.inventur.positionen.find(p => p.barcode === barcode)
  if (position) return inventurMengeSetzen(daten, position.artikelnummer, position.gezählt + 1)
  const unbekannte = daten.inventur.unbekannteBarcodes
  const vorhanden = unbekannte.some(p => p.barcode === barcode)
  return { ...daten, inventur: { ...daten.inventur, unbekannteBarcodes: vorhanden
    ? unbekannte.map(p => p.barcode === barcode ? { ...p, anzahl: menge(p.anzahl + 1) } : p)
    : [...unbekannte, { barcode, anzahl: 1 }] } }
}

export function inventurAbschliessen(daten) {
  if (!daten.inventur.aktiv) throw new Error('Keine Inventur aktiv.')
  const positionen = daten.inventur.positionen
  for (const position of positionen) {
    const produkt = daten.produkte.find(p => p.artikelnummer === position.artikelnummer)
    if (!produkt || produkt.bestand !== position.erwartet) {
      throw new Error(`Lagerbestand oder Artikelnummer von „${position.name}“ wurde geändert. Bitte die Abweichung vor dem Abschluss klären.`)
    }
  }
  return { produkte: daten.produkte.map(p => {
    const position = positionen.find(q => q.artikelnummer === p.artikelnummer)
    return position ? { ...p, bestand: position.gezählt } : p
  }), inventur: leereInventur() }
}
