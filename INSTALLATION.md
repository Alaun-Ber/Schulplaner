# Schulplaner installieren

## macOS

1. `Schulplaner-1.0.2-arm64.dmg` öffnen.
2. Schulplaner in den Ordner „Programme“ ziehen.
3. Beim ersten Start gegebenenfalls mit Rechtsklick → „Öffnen“ bestätigen.

Diese Ausgabe ist für Macs mit Apple-Prozessor (M1 oder neuer) gebaut. Die App ist lokal erstellt und nicht im Apple App Store notarisiert.

## Windows

- `Schulplaner Setup 1.0.2.exe`: normale Installation (empfohlen).
- `Schulplaner 1.0.2.exe`: portable Ausgabe ohne Installation.

Da die Programme lokal erstellt und nicht mit einem kommerziellen Zertifikat signiert wurden, kann Windows SmartScreen beim ersten Start eine Rückfrage anzeigen.

## iPad

Das native Xcode-Projekt liegt unter `ios/App/App.xcodeproj`.

Installation auf einem eigenen iPad:

1. Das Projekt auf einem Mac mit Xcode öffnen.
2. Unter „Signing & Capabilities“ das eigene Apple-Team auswählen.
3. Das per Kabel oder WLAN verbundene iPad als Ziel auswählen.
4. In Xcode auf „Run“ klicken.

Das Paket `Schulplaner-iPad-Simulator.zip` ist ausschließlich für den iPad-Simulator gedacht. Für eine Verteilung auf mehrere Geräte oder über TestFlight/App Store ist eine Apple-Entwicklerregistrierung und Signierung erforderlich.

## Daten

Mac-, Windows- und iPad-Ausgabe speichern ihre Daten jeweils lokal. Für den Wechsel zwischen Geräten die in der App integrierte Sicherungs-/Sync-Datei verwenden.
