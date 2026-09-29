import { useEffect, useRef, useState } from 'react'
import { leereDaten } from '../data/inventur.js'
import { ALT_KEY, laden, speichern, SPEICHER_KEY } from '../data/speicher.js'

function startLesen() {
  try { return { ...laden(localStorage), fehler: '' } }
  catch (error) { return { daten: leereDaten(), fehler: `Gespeicherte Daten konnten nicht geladen werden: ${error.message}` } }
}

export function useInventurDaten() {
  const [stand, setStand] = useState(startLesen)
  const aktuell = useRef(stand)
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

  function aendern(funktion, erfolg = 'Änderung gespeichert.') {
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

  return { daten: stand.daten, aendern, meldung, setMeldung, ladeFehler: stand.fehler, ausAltbestand: stand.ausAltbestand, extern, neuLaden }
}
