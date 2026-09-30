import { useEffect, useRef, useState } from 'react'
import { leereDaten } from '../data/inventur.js'
import { FILIALEN, filialeAendern, filialDaten, leererBetrieb } from '../data/filialen.js'
import { ALT_KEY, laden, speichern, SPEICHER_KEY } from '../data/speicher.js'

function startLesen() {
  try { return { ...laden(localStorage), fehler: '' } }
  catch (error) { return { daten: leererBetrieb(), fehler: `Gespeicherte Daten konnten nicht geladen werden: ${error.message}` } }
}

export function useInventurDaten() {
  const [stand, setStand] = useState(startLesen)
  const aktuell = useRef(stand)
  const [filiale, setFiliale] = useState(() => {
    try {
      const gespeichert = sessionStorage.getItem('paarfuss.filiale')
      if (Object.hasOwn(FILIALEN, gespeichert)) return gespeichert
    } catch { /* Auch ohne Sitzungsspeicher benutzbar. */ }
    return Object.keys(FILIALEN).find(f => stand.daten.inventuren?.[f].aktiv) ?? 'innsbruck'
  })
  const aktiveFiliale = useRef(filiale)
  function filialeWechseln(id) {
    if (!Object.hasOwn(FILIALEN, id)) return
    aktiveFiliale.current = id
    setFiliale(id)
    setMeldung('')
    try { sessionStorage.setItem('paarfuss.filiale', id) } catch { /* Auswahl bleibt im Arbeitsspeicher. */ }
  }
  const [extern, setExtern] = useState(false)
  const [meldung, setMeldung] = useState('')
  useEffect(() => {
    const geaendert = event => {
      if (event.key === null || event.key === SPEICHER_KEY || event.key === ALT_KEY) setExtern(true)
    }
    window.addEventListener('storage', geaendert)
    return () => window.removeEventListener('storage', geaendert)
  }, [])

  function neuLaden() {
    const neu = startLesen()
    aktuell.current = neu
    setStand(neu)
    setExtern(false)
    setMeldung('')
  }

  function aendernGesamt(funktion, erfolg = 'Änderung gespeichert.') {
    try {
      if (aktuell.current.fehler) throw new Error('Bitte zuerst den Fehler beim Laden beheben. Vorhandene Daten werden nicht überschrieben.')
      if (extern) throw new Error('Bitte zuerst den aktuellen Stand aus dem anderen Tab laden.')
      const neu = { ...speichern(localStorage, aktuell.current, funktion(aktuell.current.daten)), fehler: '' }
      aktuell.current = neu
      setStand(neu)
      setMeldung(erfolg)
      return true
    } catch (error) {
      setMeldung(`Nicht gespeichert: ${error.message}`)
      return false
    }
  }

  function aendern(funktion, erfolg) {
    if (aktiveFiliale.current !== filiale) return false
    return aendernGesamt(d => filialeAendern(d, filiale, funktion), erfolg)
  }
  const zuordnungNoetig = stand.daten.version !== 2
  const daten = zuordnungNoetig ? leereDaten() : filialDaten(stand.daten, filiale)
  return { daten, gesamtDaten: stand.daten, filiale, filialeWechseln, zuordnungNoetig, aendern, aendernGesamt, meldung, setMeldung, ladeFehler: stand.fehler, ausAltbestand: stand.ausAltbestand, extern, neuLaden }
}
