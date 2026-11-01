# Weichenwerk

Eine kleine, eigenstaendige, von OpenTTD inspirierte Eisenbahn- und Transportsimulation fuer den Browser. Am Handy mit Touch-Gesten spielbar, am PC mit Maus und Tastatur.

## Start

Oeffne `index.html` direkt im Browser. Es ist kein Build-Schritt und kein lokaler Server noetig. Ueber HTTPS ausgeliefert, laesst sich das Spiel als App installieren und offline spielen.

Am Handy (hoch und quer) fuellt die Karte den Bildschirm; Werkzeuge und Infos liegen in einem Panel unten bzw. rechts. Ein Finger verschiebt die Karte, zwei Finger zoomen und drehen. Schienen und Strassen mit einem Finger ziehen; eine Lupe ueber dem Finger zeigt das Zielfeld. Details in [fachlich.md](fachlich.md#bedienung).

## Spielkern

- Isometrische Karte mit Staedten, Industrien, Feldern, Wald und Wasser
- 3D-Spielkarte mit lokal eingebundenem Three.js
- Bauwerkzeuge fuer Schienen, Strassen, Stationen und Abriss
- Bahn- und Truck-Stationen mit lokaler Produktion und Nachfrage
- Kaufbare Zuege mit mehreren Wagen, Trucks mit Anhaenger und automatische Routensuche ueber verbundene Netze
- Passagiere, Waren, Kohle und Getreide als Frachtarten
- Einnahmen, Wartungskosten, Darlehen und monatlicher Spieltakt
- Optionale Aufgaben, die aufeinander aufbauen und schwieriger werden; Standard bleibt freies Bauen

Baue zwei passende Stationen, verbinde sie mit Schiene oder Strasse und kaufe danach ein Fahrzeug am ausgewaehlten Depot.

Das Spiel besitzt ausschliesslich eine 3D-Ansicht. Three.js, Modelle und Bibliotheken liegen lokal bei; auch der direkte Start ueber `index.html` benoetigt keinen CDN-Zugriff. Ein Browser mit WebGL ist erforderlich. Wenn 3D nicht gestartet werden kann, bleibt ein Fehlerhinweis mit Neuladen-Schaltflaeche sichtbar; die Simulation laeuft nicht unsichtbar weiter. Die kleine Landschaftsvorschau im Welt-Dialog bleibt erhalten.

## Dokumentation

- [help.html](help.html): Spielhilfe mit Bildern (erste Schritte, Bedienung, Bruecken, Block- und Pfadsignale, Ausweichgleise), im Spiel ueber **?** oben rechts
- [fachlich.md](fachlich.md): Spielregeln, Bedienung, Kosten und Grenzen aus Spielersicht
- [technisch.md](technisch.md): Aufbau des Codes, Abhaengigkeiten, Spielstaende, Tests und Testumgebung
- [devlog.md](devlog.md): Entwicklungsverlauf, neueste Eintraege zuerst
- [OPENTTD-AUDIT.md](OPENTTD-AUDIT.md): Vergleich mit OpenTTD und offene Unterschiede

## Tests

Jeder Test ist ein eigenstaendiges Node-Skript, z. B. `node tests/railway.cjs`. Die Tests ohne `browser` im Namen brauchen nur Node; die Browser-Tests brauchen Playwright. Einrichtung und vollstaendige Liste stehen in [technisch.md](technisch.md#tests).
