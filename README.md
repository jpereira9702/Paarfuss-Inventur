# Paarfuss Inventur

Mobile Lager- und Inventur-App für die Filialen **Innsbruck** und **Kematen**.
Die aktuelle Anwendung liegt in `frontend/` und verwendet React und Vite.

[GitHub Pages](https://jpereira9702.github.io/Paarfuss-Inventur/) · [Veröffentlichung](VEROEFFENTLICHUNG.md)

## Aktueller Funktionsumfang

- Gemeinsamer Produktkatalog mit Artikelnummer, optionalem Barcode, Produktname,
  Zähleinheit und Bestellpackungsgröße.
- Getrennte Bestände, Mindest- und Zielbestände für beide Filialen.
- Sichtbare Filialauswahl; Lagerbuchungen und Inventuren beziehen sich auf diese
  Filiale. Beim Wechsel werden Scanner beendet und offene Formulare zurückgesetzt.
- Live-Scanner, Fotoerkennung, OCR mit Bestätigung sowie manuelle Barcodeeingabe.
  Ein Scan erfasst eine Zähleinheit, keine ganze Bestellpackung.
- Getrennte, auch parallel laufende Inventuren mit manueller Mengenkorrektur,
  Wiederaufnahme nach Neuladen und bestätigtem Abschluss inklusive Nullbeständen.
- Während einer Inventur sind Bestandsbuchungen in dieser Filiale gesperrt.
  Die andere Filiale kann weiterarbeiten. Umlagerungen benötigen zwei Lager ohne
  aktive Inventur.
- Umlagerungen buchen Abgang und Zugang gemeinsam.
- Gemeinsame Nachbestellliste mit Filialfilter, Bestellvorschlägen und Druck-/PDF-Ansicht.
- Vermerke für extern aufgegebene Bestellungen mit Datum und Menge,
  Teillieferungen, Reststornierung und erledigten Bestellvermerken.
- Sicherung und Import des gesamten Datenstands unter **Einstellungen**.

### Mengen und Nachbestellungen

Die Zähleinheit muss pro Produkt eindeutig sein, z. B. Stück, Flaschen oder
Schachteln. Die Packungsgröße gibt an, wie viele dieser Zähleinheiten eine
Bestellpackung enthält. Einheitenwechsel sind bei vorhandenen Beständen,
Bestellvermerken oder laufenden Inventuren gesperrt.

Bei Bestand auf oder unter dem Mindestbestand gilt:

```text
Fehlmenge = max(0, Zielbestand − Bestand − offene Bestellmenge)
Vorschlag = Fehlmenge auf volle Bestellpackungen aufrunden
```

Beispiel: Bestand 2, Mindestbestand 5, Zielbestand 12, Packungsgröße 6 ergibt
12 nachzubestellende Zähleinheiten (2 Packungen). Bereits bestellte Mengen werden
abgezogen. Offene Lieferungen bleiben auch dann sichtbar, wenn eine Teillieferung
den Bestand über den Mindestbestand hebt.

Ein Bestellvermerk versendet keine Bestellung und erhöht keinen Bestand.
Erst **Lieferung buchen** erhöht den Bestand der angegebenen Filiale und reduziert
die offene Menge. Bei einer offenen Bestellung verweist ein Scan im Lager auf
diesen Ablauf, damit die Lieferung nicht doppelt gebucht wird.

Bestand oberhalb des Zielbestands in der anderen Filiale wird als möglicher
Umlagerungsvorrat angezeigt. Die Liste bestellt oder transferiert nichts automatisch.

## Vorhandene Daten und Speicherung

**Die Daten liegen weiterhin nur im jeweiligen Browser.** Es gibt noch keine
zentrale Datenbank, Benutzeranmeldung, serverseitigen Berechtigungen oder automatische
Synchronisierung zwischen Geräten.

Beim ersten Öffnen mit bisherigen Daten fragt die App nach der zugehörigen Filiale.
Produktbestände und eine laufende Inventur werden ausschließlich dieser Filiale
zugeordnet. Der gemeinsame Produktkatalog ist auch in der anderen Filiale sichtbar;
ihre Bestände, Mindest- und Zielbestände beginnen bei 0. Bei alten Produkten werden
Zähleinheit `Stück`, Packungsgröße 1 und Zielbestand gleich Mindestbestand ergänzt.
Diese Vorgaben sollten anschließend geprüft und angepasst werden.

Vor der Zuordnung kann der bisherige Stand gesichert werden. Enthält er bereits
zusammengefasste Mengen beider Filialen, müssen die Mengen anhand der tatsächlichen
Bestände getrennt werden; die App kann diese Aufteilung nicht erraten.

Der React-Speicherschlüssel bleibt `paarfuss.react.v1`; die neue Datenstruktur trägt
intern `version: 2` und enthält Produktkatalog mit Filialbeständen, beide Inventuren
und Bestellvermerke. Der alte Schlüssel `produkte` wird weiterhin eingelesen, wenn
noch keine React-Daten existieren, und bleibt unverändert.

- Neue Sicherungen enthalten beide Filialen, Inventuren und Bestellvermerke.
- Alte Produktarrays und Sicherungen mit `{ produkte, inventur }` bleiben importierbar;
  die Zielfiliale muss ausdrücklich gewählt werden.
- Ein bestätigter Import ersetzt den **gesamten** Stand beider Filialen, ohne
  Zusammenführung. Vorher eine Sicherung exportieren.
- Daten werden vor dem Speichern geprüft. Speicherfehler lassen den vorherigen
  Zustand bestehen. Ein veralteter Tab darf neuere Daten nicht überschreiben.
- Beschädigte gespeicherte Daten werden nicht automatisch gelöscht oder ersetzt.

## Lokal entwickeln und prüfen

Im Ordner `frontend`:

```sh
npm ci
npm run dev
npm test
npm run lint
npm run test:e2e
npm run build:pages
npm run test:pages
```

Für Browsertests wird Chromium benötigt (`npx playwright install chromium`).
Kamerazugriff benötigt HTTPS oder localhost. Automatisierte Tests ersetzen keine
Kameratests auf echten Handys, besonders bei runden oder schlecht beleuchteten Etiketten.

Die Tests decken unter anderem Datenmigration, Filialtrennung, Inventuren,
Packungsrundung, Bestellungen, Teillieferungen, Umlagerungen, Speicherfehler,
veraltete Tabs, Scannerabläufe, mobile Darstellung und Druckansicht ab.

## Aufbau

```text
frontend/src/
  App.jsx                    Navigation und Filialauswahl
  data/inventur.js           Produkt- und Inventurlogik eines Lagers
  data/filialen.js           Filialen, Migration, Bestellungen und Umlagerungen
  data/speicher.js           Geprüfte lokale Speicherung
  hooks/useInventurDaten.js  Gemeinsamer Zustand und Filialansichten
  pages/                    Start, Lager, Inventur, Nachbestellen, Einstellungen
  components/               Scanner und einmalige Filialzuordnung
  scanner/                  Kamera, Fotoerkennung und OCR
```

`index.html` im Hauptverzeichnis ist die bisherige App. Sie bleibt unter `/alt/`
für den Export älterer Daten erreichbar. Der Pages-Workflow baut und prüft die
React-App samt Datenübernahme, bevor `frontend/dist` veröffentlicht wird.

## Nächster Meilenstein: gemeinsame Datenbank und Anmeldung

Vereinbart sind persönliche Konten für Chefin und Tochter mit gleichen vollständigen
Administrationsrechten. Spätere Mitarbeitende erhalten Zugang zu den zugewiesenen
Filialen für Inventur und Wareneingang. Bestellungen erfolgen weiterhin extern.

Noch umzusetzen sind insbesondere:

- Zentrale Speicherung mit sicherer Behandlung gleichzeitiger Buchungen.
- Anmeldung und serverseitig durchgesetzte Filial- und Benutzerrechte.
- Nachvollziehbare Buchungshistorie mit Benutzer und Zeitpunkt.
- Serverseitige Sicherung und getestete Wiederherstellung.
- Gemeinsamer Gerätetest, Kundenfeedback und abschließende Übergabe.

Die lokale Filialauswahl ist eine Auswahl des Arbeitslagers und keine Zugriffskontrolle.
