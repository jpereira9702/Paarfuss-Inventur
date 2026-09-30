import { useState } from 'react'
import { bestellungMerken, bestellungStornieren, FILIALEN, lieferungBuchen, nachbestellListe } from '../data/filialen.js'

const heute = () => new Date().toLocaleDateString('sv-SE')
function BestellZeile({ zeile, gesamtDaten, aendernGesamt }) {
  const { produkt: p, filiale, bestand, mindestbestand, zielbestand, offen, vorschlag, packungen, andere, ueberschuss } = zeile
  const bestellt = gesamtDaten.bestellungen.filter(b => b.produktId === p.id && b.filiale === filiale && !b.storniert && b.erhalten < b.menge)
  return <article className="karte bestellkarte">
    <h3>{p.name} · {FILIALEN[filiale]}</h3><p>Artikel: {p.artikelnummer} · {p.einheit}</p>
    <p>Bestand: {bestand} · Mindestbestand: {mindestbestand} · Zielbestand: {zielbestand}</p>
    <p>Bereits bestellt, noch offen: {offen} {p.einheit}</p>
    <p className={vorschlag ? 'kritisch' : ''}><strong>Noch nachbestellen: {vorschlag} {p.einheit}</strong> · {packungen} Bestellpackungen à {p.packung}</p>
    {bestand <= mindestbestand && zielbestand <= mindestbestand && <p>Zielbestand liegt am Mindestbestand. Für einen Vorrat oberhalb der Bestellgrenze bitte im Lager anpassen.</p>}
    {ueberschuss > 0 && <p>Umlagerung prüfen: {FILIALEN[andere]} hat {ueberschuss} {p.einheit} über dem Zielbestand. Eine Umlagerung kann im Lager gebucht werden.</p>}
    <details className="nicht-drucken"><summary>Externe Bestellung vermerken</summary>
      <p>Hier wird keine Bestellung versendet. Trage die tatsächlich extern bestellte Menge in {p.einheit} ein.</p>
      <form key={`${vorschlag}-${offen}`} className="formular" onSubmit={e => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        aendernGesamt(d => bestellungMerken(d, { produktId: p.id, filiale, anzahl: form.get('menge'), datum: form.get('datum') }), `Bestellung für ${FILIALEN[filiale]} vermerkt.`)
      }}>
        <label>Bestellte Menge ({p.einheit})<input name="menge" type="number" min={p.packung} step={p.packung} defaultValue={vorschlag || p.packung} required /></label>
        <label>Bestelldatum<input name="datum" type="date" defaultValue={heute()} max={heute()} required /></label>
        <button type="submit">Als bestellt vermerken</button>
      </form>
    </details>
    {bestellt.map(b => <section className="lieferung" key={b.id}>
      <h4>Bestellt am {new Date(`${b.datum}T12:00:00`).toLocaleDateString('de-AT')}</h4>
      <p>{b.menge} {p.einheit} bestellt · {b.erhalten} geliefert · {b.menge - b.erhalten} offen</p>
      <form key={b.erhalten} className="mengen-formular nicht-drucken" onSubmit={e => {
        e.preventDefault()
        const menge = new FormData(e.currentTarget).get('lieferung')
        if (window.confirm(`${menge} ${p.einheit} „${p.name}“ als Lieferung in ${FILIALEN[filiale]} buchen?`)) aendernGesamt(d => lieferungBuchen(d, b.id, menge), `Wareneingang in ${FILIALEN[filiale]} gebucht.`)
      }}>
        <label>Jetzt geliefert ({p.einheit})<input name="lieferung" type="number" min="1" max={b.menge - b.erhalten} step="1" defaultValue={b.menge - b.erhalten} required /></label>
        <button disabled={gesamtDaten.inventuren[filiale].aktiv} type="submit">Lieferung buchen</button>
        <button type="button" onClick={() => {
          if (window.confirm(`Restmenge von ${b.menge - b.erhalten} ${p.einheit} für ${FILIALEN[filiale]} stornieren? Bereits gelieferte Mengen bleiben im Lager.`)) aendernGesamt(d => bestellungStornieren(d, b.id), 'Offene Restmenge storniert.')
        }}>Rest stornieren</button>
      </form>
      {gesamtDaten.inventuren[filiale].aktiv && <p className="nicht-drucken">Wareneingang nach Abschluss der Inventur buchen.</p>}
    </section>)}
  </article>
}

export default function Nachbestellen({ gesamtDaten, aendernGesamt }) {
  const [filter, setFilter] = useState('alle')
  const [standDatum] = useState(() => new Date().toLocaleDateString('de-AT'))
  const zeilen = nachbestellListe(gesamtDaten).filter(z => filter === 'alle' || z.filiale === filter)
  const archiv = gesamtDaten.bestellungen.filter(b => (filter === 'alle' || b.filiale === filter) && (b.storniert || b.erhalten === b.menge))
  return <section className="nachbestellliste">
    <h2>Nachbestellen</h2><p>Filialen: {filter === 'alle' ? 'Innsbruck und Kematen' : FILIALEN[filter]} · Stand: {standDatum}</p>
    <p>Artikel am Mindestbestand oder darunter sowie offene Lieferungen. Bestellte Mengen sind im Vorschlag bereits berücksichtigt.</p>
    <div className="aktionen nicht-drucken"><label>Filiale filtern<select value={filter} onChange={e => setFilter(e.target.value)}><option value="alle">Beide Filialen</option>{Object.entries(FILIALEN).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label><button onClick={() => window.print()}>Liste drucken / als PDF sichern</button></div>
    <div className="produkt-raster">{zeilen.map(z => <BestellZeile key={`${z.produkt.id}-${z.filiale}`} zeile={z} gesamtDaten={gesamtDaten} aendernGesamt={aendernGesamt} />)}</div>
    {!zeilen.length && <p className="leer">Keine Nachbestellungen oder offenen Lieferungen für diese Auswahl.</p>}
    {!!archiv.length && <details className="karte nicht-drucken"><summary>Erledigte Bestellvermerke ({archiv.length})</summary><ul>{archiv.map(b => <li key={b.id}>{gesamtDaten.produkte.find(p => p.id === b.produktId)?.name} · {FILIALEN[b.filiale]} · {b.datum} · {b.erhalten} von {b.menge} geliefert · {b.storniert ? 'Rest storniert' : 'vollständig geliefert'}</li>)}</ul></details>}
  </section>
}
