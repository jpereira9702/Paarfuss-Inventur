import { useRef, useState } from 'react'
import { datenPruefen } from '../data/inventur.js'
import { dateiHerunterladen } from '../data/speicher.js'

export default function Start({ daten, aendern, setMeldung, wechseln, ausAltbestand }) {
  const [importDaten, setImportDaten] = useState(null)
  const [liest, setLiest] = useState(false)
  const importAuftrag = useRef(0)
  async function dateiLesen(event) {
    const datei = event.target.files[0]
    event.target.value = ''
    if (!datei) return
    const auftrag = ++importAuftrag.current
    setImportDaten(null); setLiest(true)
    try {
      if (datei.size > 10 * 1024 * 1024) throw new Error('Die Datei ist größer als 10 MB.')
      const eingabe = datenPruefen(JSON.parse(await datei.text()))
      if (auftrag === importAuftrag.current) setImportDaten(eingabe)
    } catch (error) { if (auftrag === importAuftrag.current) setMeldung(`Import nicht möglich: ${error.message}`) }
    finally { if (auftrag === importAuftrag.current) setLiest(false) }
  }
  return <>
    <h2>Start</h2><p>Willkommen bei Paarfuss Inventur.</p>
    <div className="kennzahlen">
      <div className="karte"><strong>{daten.produkte.length}</strong><span>Produkte</span></div>
      <div className="karte"><strong>{daten.produkte.filter(p => p.bestand <= p.mindestbestand).length}</strong><span>Nachbestellen</span></div>
      <div className="karte"><strong>{daten.inventur.aktiv ? 'Läuft' : 'Keine'}</strong><span>Aktive Inventur</span></div>
    </div>
    <div className="aktionen"><button onClick={() => wechseln('lager')}>Zum Lager</button>{daten.inventur.aktiv && <button onClick={() => wechseln('inventur')}>Inventur fortsetzen</button>}</div>
    <section className="karte">
      <h3>Daten sichern und übernehmen</h3>
      <p>Deine Daten werden auf diesem Gerät in diesem Browser gespeichert. Exportiere regelmäßig eine Sicherung. Andere Geräte erhalten Änderungen derzeit nur über einen Import.</p>
      {ausAltbestand && <p className="hinweis">Vorhandene Daten der bisherigen App wurden geladen. Beim nächsten Speichern wird eine eigene Kopie für die React-App angelegt.</p>}
      <div className="aktionen"><button onClick={() => {
        dateiHerunterladen(JSON.stringify(daten, null, 2), `paarfuss-sicherung-${new Date().toISOString().slice(0, 10)}.json`)
        setMeldung('Sicherungsdatei zum Download bereitgestellt.')
      }}>Daten exportieren</button></div>
      <label>JSON-Sicherung importieren<input type="file" accept=".json,application/json" onChange={dateiLesen} disabled={liest} /></label>
      <p>Für Daten aus der bisherigen App: Dort unter Start „Daten für React exportieren“ wählen und die Datei hier auswählen.</p>
      {import.meta.env.PROD && <p><a href={`${import.meta.env.BASE_URL}alt/`}>Bisherige App zum Datenexport öffnen</a></p>}
      {liest && <p role="status">Datei wird geprüft …</p>}
      {importDaten && <div className="hinweis">
        <p>Geprüft: {importDaten.produkte.length} Produkte · {importDaten.inventur.aktiv ? 'laufende Inventur enthalten' : 'keine laufende Inventur'}.</p>
        <p>Der Import ersetzt alle aktuellen Produkte und Inventurzählungen. Exportiere vorher bei Bedarf eine Sicherung.</p>
        <div className="aktionen"><button onClick={() => {
          if (window.confirm('Aktuelle Produkte und Inventur vollständig durch diese Datei ersetzen?') && aendern(() => importDaten, 'Daten erfolgreich übernommen.')) setImportDaten(null)
        }}>Daten ersetzen</button><button onClick={() => setImportDaten(null)}>Abbrechen</button></div>
      </div>}
    </section>
  </>
}
