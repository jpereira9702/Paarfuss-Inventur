import { useRef, useState } from 'react'
import { altbestandZuordnen, betriebPruefen, FILIALEN } from '../data/filialen.js'
import { dateiHerunterladen } from '../data/speicher.js'

export default function Einstellungen({ gesamtDaten, aendernGesamt, setMeldung }) {
  const [importDaten, setImportDaten] = useState(null)
  const [ziel, setZiel] = useState('')
  const [liest, setLiest] = useState(false)
  const importAuftrag = useRef(0)
  async function dateiLesen(event) {
    const datei = event.target.files[0]
    event.target.value = ''
    if (!datei) return
    const auftrag = ++importAuftrag.current
    setImportDaten(null); setZiel(''); setLiest(true)
    try {
      if (datei.size > 10 * 1024 * 1024) throw new Error('Die Datei ist größer als 10 MB.')
      const eingabe = betriebPruefen(JSON.parse(await datei.text()))
      if (auftrag === importAuftrag.current) setImportDaten(eingabe)
    } catch (error) { if (auftrag === importAuftrag.current) setMeldung(`Import nicht möglich: ${error.message}`) }
    finally { if (auftrag === importAuftrag.current) setLiest(false) }
  }
  return <>
    <h2>Einstellungen</h2>
    <section className="karte"><h3>Datensicherung · beide Filialen</h3>
      <p>Die Daten liegen weiterhin nur in diesem Browser. Eine Sicherung enthält beide Lager, laufende Inventuren und Bestellvermerke. Benutzerkonten und Synchronisierung folgen mit der Datenbankanbindung.</p>
      <button onClick={() => {
        try {
          dateiHerunterladen(JSON.stringify(gesamtDaten, null, 2), `paarfuss-sicherung-${new Date().toISOString().slice(0, 10)}.json`)
          setMeldung('Sicherungsdatei zum Download bereitgestellt.')
        } catch (error) { setMeldung(`Sicherung nicht möglich: ${error.message}`) }
      }}>Daten exportieren</button>
      <label>JSON-Sicherung importieren<input type="file" accept=".json,application/json" onChange={dateiLesen} disabled={liest} /></label>
      <p>Ein Import ersetzt den gesamten Stand beider Filialen. Bitte vorher eine Sicherung exportieren.</p>
      {import.meta.env.PROD && <p><a href={`${import.meta.env.BASE_URL}alt/`}>Bisherige App zum Datenexport öffnen</a></p>}
      {liest && <p role="status">Datei wird geprüft …</p>}
      {importDaten && <div className="hinweis">
        <p>Geprüft: {importDaten.produkte.length} Produkte · {importDaten.version === 2 ? 'beide Filialen mit Inventuren und Bestellvermerken' : 'bisheriger Bestand ohne Filialzuordnung'}.</p>
        {importDaten.version !== 2 && <><label>Filiale des importierten Bestands<select value={ziel} onChange={e => setZiel(e.target.value)}><option value="">Bitte auswählen</option>{Object.entries(FILIALEN).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><p>Die andere Filiale beginnt mit Bestand 0. Ihre bisherigen Daten werden ebenfalls ersetzt.</p></>}
        <div className="aktionen"><button disabled={importDaten.version !== 2 && !ziel} onClick={() => {
          if (window.confirm('Alle Produkte, Bestände, Inventuren und Bestellvermerke beider Filialen durch diese Sicherung ersetzen?') && aendernGesamt(() => importDaten.version === 2 ? importDaten : altbestandZuordnen(importDaten, ziel), 'Daten erfolgreich übernommen.')) setImportDaten(null)
        }}>Daten ersetzen</button><button onClick={() => { ++importAuftrag.current; setImportDaten(null) }}>Abbrechen</button></div>
      </div>}
    </section>
  </>
}
