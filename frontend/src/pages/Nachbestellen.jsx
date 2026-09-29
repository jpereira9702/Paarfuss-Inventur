export default function Nachbestellen({ produkte }) {
  const kritisch = produkte.filter(p => p.bestand <= p.mindestbestand).sort((a, b) => a.name.localeCompare(b.name, 'de'))
  return <><h2>Nachbestellen</h2><p>Produkte auf oder unter ihrem Mindestbestand: {kritisch.length}</p>
    <div className="produkt-raster">{kritisch.map(p => <article className="karte" key={p.artikelnummer}>
      <h3>{p.name}</h3><p>Artikel: {p.artikelnummer}</p><p>Barcode: {p.barcode || 'Nicht hinterlegt'}</p>
      <p>Bestand: {p.bestand} · Mindestbestand: {p.mindestbestand}</p><p className="kritisch">Nachbestellen</p>
    </article>)}</div>
    {!kritisch.length && <p className="leer">Keine Nachbestellungen erforderlich.</p>}
  </>
}
