# React-App auf GitHub Pages

Die Veröffentlichung verwendet aktuell den Branch `Barcodesearch`.
Ein Push auf diesen Branch startet `.github/workflows/pages.yml`.
Der Workflow installiert die Pakete, prüft den Code, führt die Funktionstests aus,
baut die Website und prüft die fertigen Seiten im Browser. Erst danach wird
`frontend/dist` auf GitHub Pages veröffentlicht.

## Einmalig auf GitHub

1. Im Repository **Settings → Pages → Build and deployment → Source** auf
   **GitHub Actions** stellen.
2. Falls **Settings → Environments → github-pages → Deployment branches and tags**
   die erlaubten Branches einschränkt, `Barcodesearch` dort zulassen.
3. Alle Änderungen der React-Umstellung einschließlich des Workflows committen
   und auf `Barcodesearch` pushen. Der Workflow benötigt die neuen React-Dateien.
4. Unter **Actions → Publish Paarfuss to GitHub Pages** den erfolgreichen Lauf abwarten.

Danach:

- React: https://jpereira9702.github.io/Paarfuss-Inventur/
- Bisherige App mit Export: https://jpereira9702.github.io/Paarfuss-Inventur/alt/

Am Handy die React-Adresse in Safari oder Chrome öffnen und den Kamerazugriff
bei Bedarf erlauben. Der Computer muss dafür nicht laufen.

## Vorhandene Daten

Im gleichen Browser auf der gleichen GitHub-Pages-Domain liest React den alten
Speicherschlüssel `produkte`, solange noch kein eigener React-Datenstand existiert.
Beim ersten Speichern entsteht eine getrennte React-Kopie. Die alte App wird
anschließend nicht mehr mit der neuen synchronisiert.

Für einen anderen Browser oder ein anderes Gerät: In der bisherigen App unter
**Start → Daten für React exportieren** sichern und in React
unter **Einstellungen → Datensicherung** importieren. Vor einem ersetzenden Import den React-Stand exportieren.
Alte Bestände müssen ausdrücklich Innsbruck oder Kematen zugeordnet werden.
Ein Import ersetzt den gesamten Stand beider Filialen.
Computer und Handy synchronisieren sich erst nach der späteren Datenbankanbindung.

## Lokal prüfen

Im Ordner `frontend`:

```sh
npm run build:pages
npm run test:pages
```

Für die Browserprüfung muss Chromium installiert sein (`npx playwright install chromium`).
`frontend/dist`, heruntergeladene Pakete und Testberichte bleiben ignoriert.
GitHub veröffentlicht ausschließlich die erzeugte Website aus `frontend/dist`.

Wenn später `main` veröffentlicht werden soll, die beiden Branch-Angaben in
`.github/workflows/pages.yml` und gegebenenfalls die GitHub-Environment-Regel gemeinsam umstellen.
