# Devlog

Entwicklungsverlauf, neueste Eintraege zuerst. Spielregeln: [fachlich.md](fachlich.md), Technik: [technisch.md](technisch.md).

## 2026-11-01 - Dokumentation aufgeteilt

- README auf Einstieg, Spielkern und Links gekuerzt. Spielregeln und Bedienung wortgleich nach `fachlich.md` verschoben, Testliste und 3D-Modell-Details nach `technisch.md`.
- Neu: `technisch.md` (Aufbau, Spielstaende, Kamera/Eingabe, Tests, Testumgebung) und dieses Devlog.
- Arbeitsweise in `CLAUDE.md` festgehalten: kleine lokale Commits, Doku bei jeder Aenderung mitziehen.

## 2026-11-01 - Bau-Lupe und Rand-Scrollen (Touch)

- Beim Zeichnen von Schiene/Strasse mit dem Finger zeigt eine Lupe ueber dem Finger das Zielfeld vergroessert mit Fadenkreuz. Zweiter Render-Durchgang mit eigener Kamera in einen Scissor-Bereich, keine zusaetzlichen Dateien.
- Haelt der zeichnende Finger am Kartenrand, scrollt die Karte mit und die Vorschau waechst weiter.
- Grund: Der Finger verdeckt beim Zeichnen genau das Zielfeld, und lange Strecken endeten am Bildrand.
- Test: `tests/browser-touch.cjs` um Lupe und Rand-Scrollen erweitert. Ergebnis des Laufs: siehe naechster Eintrag.

## 2026-11-01 - Touch-Gesten fuer die Karte

- Ausgangslage: Am Handy war die Kamera kaum bedienbar. Verschieben/Drehen hingen an mittlerer/rechter Maustaste, Pinch-Zoom fehlte, ein Finger mit Bauwerkzeug zeichnete sofort.
- Neu: 1 Finger verschiebt (Boden haftet am Finger, Nachlauf nach schnellem Wischen), 2 Finger verschieben/zoomen/drehen, Tippen waehlt aus. Mit Schiene/Strasse wird erst nach Bewegung gezeichnet; ein zweiter Finger macht eine Kamerageste daraus, eine offene Vorschau bleibt erhalten.
- Maus- und Fuehrerhaus-Steuerung unveraendert (eigener Zweig nur fuer `pointerType === "touch"`).
- Tests: neuer `tests/browser-touch.cjs` besteht (390 und 1440 px). `browser-cab.cjs` (nutzt Touch im Fuehrerhaus) und alle Tests ohne Browser bestehen weiterhin.
- Bekannte Grenze: Neigen per Finger fehlt noch. Beim Drehen bleiben die Finger wegen der Perspektive nur ungefaehr (ca. 20 px) auf ihrem Punkt, der Mittelpunkt exakt.

## 2026-11-01 - Testumgebung eingerichtet

- Playwright 1.64.1, pngjs und Chromium installiert (untracked, ohne `package.json`). Browser-Tests nutzen jetzt `$CHROME_PATH` oder Playwrights Chromium statt nur des festen Windows-Pfads.
- Ergebnis: 15 Tests ohne Browser bestehen. Von 15 Browser-Tests bestehen 12. `browser-construction`, `browser-coordinates` und `browser-landscape` laufen in Timeouts, auch mit 120 s.
- Ursache: Der Container hat keine GPU, WebGL rendert in Software auf ausgelasteter CPU. Gemessen ca. 2 s pro Frame auf der Standardkarte, ca. 23 s auf 128 x 96. Umgebungsproblem, kein Spielfehler.
- Statischer Testserver fuer das Handy: `python3 -m http.server 8000 --bind 0.0.0.0` im Projektverzeichnis.

## Offene Punkte

- Neigen der Kamera per Touch-Geste.
- Signale per Tippen setzen/aendern statt ueber Formularfelder.
- Werkzeug fuer Ausweichgleise (paralleles Gleis mit Weichen und Signalen als Vorschlag).
- Layout im Querformat mit Karte im Vollbild, Werkzeugleiste unten und hochziehbarem Panel.
- PWA (Manifest, Service Worker) fuer Homescreen und Offline-Start.
- Leistung auf Mittelklasse-Handys pruefen (Pixeldichte, Detailstufen, 30-fps-Modus).
