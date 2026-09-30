import { useState } from 'react'
import { altbestandZuordnen, FILIALEN } from '../data/filialen.js'
import { dateiHerunterladen } from '../data/speicher.js'

export default function FilialZuordnung({ gesamtDaten, aendernGesamt, filialeWechseln, setMeldung }) {
  const [ziel, setZiel] = useState('')
  return <section className="karte"><h2>Vorhandenen Bestand zuordnen</h2>
    <p>Deine {gesamtDaten.produkte.length} Produkte haben bisher keine Filialzuordnung. Wähle das Lager, zu dem diese Bestände und eine gegebenenfalls laufende Inventur gehören. Die andere Filiale beginnt mit Bestand 0.</p>
    <p>Enthält dein bisheriger Stand beide Filialen zusammen, sichere ihn zuerst und trenne die Mengen anschließend anhand der tatsächlichen Bestände.</p>
    <button onClick={() => {
      try { dateiHerunterladen(JSON.stringify(gesamtDaten, null, 2), 'paarfuss-vor-filialzuordnung.json') }
      catch (error) { setMeldung(`Sicherung nicht möglich: ${error.message}`) }
    }}>Bisherigen Stand sichern</button>
    <label>Filiale des bisherigen Bestands<select value={ziel} onChange={e => setZiel(e.target.value)}><option value="">Bitte auswählen</option>{Object.entries(FILIALEN).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
    <button disabled={!ziel} onClick={() => {
      if (window.confirm(`Vorhandene Bestände und Inventur ${FILIALEN[ziel]} zuordnen? Die andere Filiale startet leer.`) && aendernGesamt(d => altbestandZuordnen(d, ziel), `Bestände ${FILIALEN[ziel]} zugeordnet.`)) filialeWechseln(ziel)
    }}>Bestand zuordnen</button>
  </section>
}
