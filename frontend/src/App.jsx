import { useState } from 'react'
import { useInventurDaten } from './hooks/useInventurDaten.js'
import Start from './pages/Start.jsx'
import Lager from './pages/Lager.jsx'
import Inventur from './pages/Inventur.jsx'
import Nachbestellen from './pages/Nachbestellen.jsx'
import { ALT_KEY, dateiHerunterladen, SPEICHER_KEY } from './data/speicher.js'
import './App.css'

const ansichten = [ ['start', 'Start'], ['lager', 'Lager'], ['inventur', 'Inventur'], ['nachbestellen', 'Nachbestellen'] ]

export default function App() {
  const verwaltung = useInventurDaten()
  const { daten, meldung, setMeldung, ladeFehler, extern, neuLaden } = verwaltung
  const [aktiveAnsicht, setAktiveAnsicht] = useState(() => daten.inventur.aktiv ? 'inventur' : 'start')
  const [version, setVersion] = useState(0)
  function wechseln(id) { setAktiveAnsicht(id); setMeldung('') }
  function aktualisieren() { neuLaden(); setVersion(v => v + 1) }

  return <div className="app">
    <header className="app-kopf"><h1>Paarfuss Inventur</h1><p>Lager und Inventur · Auf diesem Gerät gespeichert</p></header>
    <nav className="navigation" aria-label="Hauptnavigation">{ansichten.map(([id, titel]) =>
      <button key={id} type="button" className={`navigation-knopf${aktiveAnsicht === id ? ' aktiv' : ''}`} aria-current={aktiveAnsicht === id ? 'page' : undefined} onClick={() => wechseln(id)}>{titel}</button>
    )}</nav>
    {meldung && <div className="meldung" role="status">{meldung}</div>}
    {extern && <div className="hinweis" role="alert"><p>Die Daten wurden in einem anderen Tab geändert. Lade den aktuellen Stand; ungespeicherte Formulareingaben werden dabei verworfen.</p><button onClick={aktualisieren}>Aktuellen Stand laden</button></div>}
    <main className="inhalt" key={version}>
      {ladeFehler ? <div role="alert"><h2>Daten konnten nicht geladen werden</h2><p>{ladeFehler}</p><p>Der gespeicherte Inhalt bleibt erhalten. Sichere ihn vor einer Reparatur.</p><div className="aktionen"><button onClick={aktualisieren}>Erneut laden</button><button onClick={() => {
        try { dateiHerunterladen(localStorage.getItem(SPEICHER_KEY) ?? localStorage.getItem(ALT_KEY) ?? 'null', 'paarfuss-rohdaten.json') }
        catch (error) { setMeldung(`Sicherung nicht möglich: ${error.message}`) }
      }}>Rohdaten sichern</button></div></div> : extern ? <p>Bitte den aktuellen Datenstand laden, um weiterzuarbeiten.</p> : <>
        {aktiveAnsicht === 'start' && <Start {...verwaltung} wechseln={wechseln} />}
        {aktiveAnsicht === 'lager' && <Lager {...verwaltung} />}
        {aktiveAnsicht === 'inventur' && <Inventur {...verwaltung} />}
        {aktiveAnsicht === 'nachbestellen' && <Nachbestellen produkte={daten.produkte} />}
      </>}
    </main>
  </div>
}
