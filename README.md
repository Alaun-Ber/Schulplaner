# Schulplaner

Eine installierbare, offline-fähige Progressive Web App für die tägliche Organisation einer Schulleitung. Alle Nutzerdaten bleiben in der lokalen IndexedDB des Geräts. Die Anwendung verwendet weder Cloud-Dienste noch Tracking oder externe APIs.

## Start

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev
```

Produktions-Build und Tests:

```bash
npm run build
npm test
```

## Funktionsumfang

- Dashboard, Tagesansicht und Wochenplanung
- Aufgabenverwaltung mit Prioritäten, Status, Filtern und Fälligkeiten
- Kalender mit Tages-, Wochen- und Monatsansicht
- Gespräche, Konferenzen, Wiedervorlagen, Personen und Dokumentationen
- globale Suche und Archiv
- vollständiger JSON-Export und geprüfter Import
- Desktop-Sidebar, mobile Navigation und touchfreundliche Formulare
- installierbare PWA mit Offline-Cache

Beim ersten Start werden wenige Beispieldaten angelegt. Danach bleiben Änderungen dauerhaft lokal gespeichert.

## Architektur

`src/app` enthält Routing und App-Einstieg, `layouts` das responsive Grundlayout, `pages` die Hauptansichten und `features` fachliche Abläufe wie die Schnellanlage. Wiederverwendbare UI liegt in `components`. Typen, Datenzugriff und Sicherung sind in `types`, `db` und `services` getrennt.

Die zentrale `SchoolPlannerDB` basiert auf Dexie und kapselt alle IndexedDB-Tabellen. React-Komponenten beobachten relevante Abfragen über `useLiveQuery`, wodurch lokale Änderungen sofort sichtbar sind. Backup und Restore laufen als atomare Datenbanktransaktion.

`vite-plugin-pwa` erzeugt Manifest und Service Worker. App-Shell und Assets werden vorab gecacht; Navigation fällt offline auf `index.html` zurück. Es werden keine externen Schriften oder Laufzeitressourcen geladen.

## Datenschutz und Backup

Browserdaten können durch das Löschen von Website-Daten verloren gehen. Regelmäßige Exporte unter **Einstellungen → Backup exportieren** werden empfohlen. Ein Import prüft Format und Version und verlangt eine Bestätigung, bevor lokale Inhalte ersetzt werden.
