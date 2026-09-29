import { datenPruefen, leereDaten } from './inventur.js'

export const SPEICHER_KEY = 'paarfuss.react.v1'
export const ALT_KEY = 'produkte'

export function laden(speicher) {
  const roh = speicher.getItem(SPEICHER_KEY)
  const alt = roh === null ? speicher.getItem(ALT_KEY) : null
  const daten = roh !== null ? datenPruefen(JSON.parse(roh)) : alt !== null ? datenPruefen(JSON.parse(alt)) : leereDaten()
  return { daten, roh, alt, ausAltbestand: roh === null && alt !== null }
}

// Erst dauerhaft speichern, danach darf React den neuen Zustand anzeigen.
// Der Vergleich verhindert, dass ein veralteter Tab neuere Daten überschreibt.
export function speichern(speicher, vorher, daten) {
  if (speicher.getItem(SPEICHER_KEY) !== vorher.roh ||
    (vorher.roh === null && speicher.getItem(ALT_KEY) !== vorher.alt)) {
    throw new Error('Die Daten wurden in einem anderen Tab geändert. Bitte zuerst den aktuellen Stand laden.')
  }
  const geprueft = datenPruefen(daten)
  const roh = JSON.stringify(geprueft)
  speicher.setItem(SPEICHER_KEY, roh)
  return { daten: geprueft, roh, alt: null, ausAltbestand: false }
}

export function dateiHerunterladen(inhalt, name) {
  const url = URL.createObjectURL(new Blob([inhalt], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
