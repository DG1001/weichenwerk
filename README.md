# Libre Transport Tycoon

Ein kleiner, eigenstaendiger OpenTTD-inspirierter Transport-Tycoon fuer den Browser.

## Start

Oeffne `index.html` direkt im Browser. Es ist kein Build-Schritt und kein lokaler Server noetig.

## Neustart und Kartengroesse

Unter **Neue Welt / Kartengroesse** eine Groesse waehlen: 34 x 26, 64 x 48, 96 x 72 oder 128 x 96. **Neue Welt starten** setzt nach einer Rueckfrage Karte, Fahrzeuge, Finanzen und Kalender zurueck. **Bestehende Karte erweitern** ergaenzt Land, Orte und Industrien, ohne bestehende Felder, Strecken, Fahrzeuge oder Finanzen zu veraendern. Verkleinern ist nicht moeglich.

Vor Neustart und Erweiterung wird die aktuelle Welt als eine vorherige Welt gesichert. **Vorherige Welt wiederherstellen** wechselt zu dieser Sicherung zurueck. Es gibt nur eine solche Sicherung; weitere Neustarts/Erweiterungen ersetzen sie. Falls der Browser die Sicherung blockiert oder sein Speicher voll ist, wird vor Fortfahren nachgefragt. Fuer langfristige Sicherungen JSON exportieren. Alte Spielstaende ohne Groessenangabe laden weiterhin.

## Zufaellige Landschaften

Im Dialog **Neue Welt / Kartengroesse** lassen sich fuer eine neue Welt vier flache Landschaftstypen waehlen: **Binnenland**, **Seenplatte**, **Kuestenland** und **Flussland**. Zusammenhaengende Waldgebiete, Wiesen, Feldregionen, unregelmaessige Seen, Kuesten und geschwungene Fluesse ersetzen das fruehere wiederholte Muster. Ufer und Landschaftsfarben unterscheiden sich auch in 3D; Baeume stehen innerhalb neuer Waldkacheln unterschiedlich.

Der **Seed** darf eine Zahl oder ein kurzer Text sein. Der Pfeil daneben erzeugt einen neuen Zufallswert. Die Kartenvorschau zeigt die neue Welt inklusive Orten, Industrien und Wasseranteil, ohne die laufende Welt zu veraendern. Erst **Neue Welt starten** mit Bestaetigung ersetzt sie. Gleicher Seed, gleiche Groesse und gleicher Typ ergeben mit dieser Generatorversion dieselbe Welt.

Staedte und Industrien werden verteilt statt auf festen Rasterpositionen gesetzt. Mindestens drei Orte und die Kohle-/Getreide-/Warenkette benoetigen einen gemeinsamen bebaubaren Landbereich. Unguenstige Platzierungen werden deterministisch neu versucht. Wasser kann mit geraden Bahn-/Strassenbruecken ueberquert werden. Tunnel, Berge und Gelaendehoehen sind noch nicht enthalten.

Seed, Typ, interne Generatorvariante und urspruengliche Groesse werden gespeichert. Erweiterungen neuer Welten verwenden dieselben koordinatenbasierten Landschaftsregeln und lassen vorhandene Felder, Orte und Strecken unveraendert. Die Landschaftsauswahl im Dialog gilt nur fuer einen Neustart, nicht fuer die Umgestaltung bestehender Karten. Alte Welten ohne Seed behalten ihre bisherige Landschaft und Erweiterungslogik. Die Noise-Bibliothek liegt lokal bei; die Erzeugung benoetigt kein Netz.

## Spielstaende und Fahrzeuge

Der Spielstand wird alle 15 Sekunden und beim Verlassen lokal gespeichert und beim naechsten Start automatisch fortgesetzt. Speichern/Laden ist auch manuell moeglich. JSON-Export/-Import dient als portable Sicherung. Falls der Browser lokalen Speicher blockiert, bleibt der Export nutzbar. Ein bereits offener Tab mit der alten Version besitzt diese Funktion noch nicht.

Im Depot lassen sich Zielstation, Fracht und Wagenzahl vor dem Kauf waehlen. Die Fahrzeugliste erlaubt gezielte Auswahl und Start/Stopp. Leere, angehaltene Fahrzeuge am Bahnhof lassen sich verkaufen oder fuer einen neuen Zweistationenauftrag mit anderer Fracht/Wagenzahl einrichten. Entladen gibt Fracht am Ursprungsbahnhof ohne Einnahme zurueck oder liefert sie bei einem passenden Empfaenger ab. Ladeoptionen: verfuegbare Fracht, Vollbeladung oder nicht laden. Wahlweise wendet der Zug klassisch oder faehrt schiebend zurueck. Wagenzuwachs kostet $1.000 je Wagen; Verkauf erloest 65 % des Kaufwerts. Fuer kurze Strecken die Wagenzahl reduzieren.

## Bruecken

Schiene oder Strasse waehlen und unter **Streckenplanung** auf **Bruecke ueber Wasser** wechseln. Vom letzten Landfeld direkt am einen Ufer zum ersten Landfeld direkt am anderen Ufer ziehen. Beide Ufer muessen in derselben Zeile oder Spalte liegen; dazwischen duerfen 1 bis 32 unbebaute Wasserfelder liegen. Die erhoehte Vorschau zeigt den Preis. Erst **Bauen** errichtet die gesamte Bruecke; Loslassen oder Abbrechen veraendert nichts.

Danach fuer die Zubringer wieder **Hindernisse umfahren** oder **Direkt** waehlen und die Brueckenrampen gerade anschliessen. Bereits vorhandene gerade Schienen/Strassen koennen als Uferanschluss dienen. Auf Bruecken und Rampen gibt es keine Stationen, Signale, Kurven oder seitlichen Abzweige. Signale koennen vor und hinter die Bruecke. Wasser und Landschaft werden nicht umgeformt; ein Neustart ist nicht erforderlich.

Fahrwege, Schwellen, Gelaender und Fahrzeuge liegen auf dem erhoehten Deck; Lok, Wagen und Anhaenger neigen sich auf den Rampen. Bruecken bleiben Teil des bestehenden Signal-/PBS-Netzes. Der Zuschlag pro Feld einschliesslich beider Rampen betraegt $900 bei der Bahn bzw. $650 bei Strassen, zusaetzlich zu eventuell neuem Gleis/Strassenbau. Jedes Brueckenfeld kostet $6 monatliche Zusatzwartung. Es gibt vorerst einen festen Brueckentyp, keine Ueberfuehrungen ueber Landstrecken und keinen Schiffsverkehr.

Mit **Abriss** ein beliebiges Brueckenfeld auswaehlen: Die Vorschau markiert die gesamte Bruecke inklusive Rampen. Nach Bestaetigung werden alle zugehoerigen Felder fuer $80 je Feld entfernt. Solange Fahrzeuge die Bruecke belegen oder reservieren, wird der Abriss verweigert. Wasser und Ufer bleiben beim Abriss erhalten. Bruecken und ihre Anschluesse werden gespeichert, beim Import geprueft und bei Kartenerweiterungen beibehalten.

## Fahrzeugrettung

Ein festgefahrenes Fahrzeug in der Fahrzeugliste auswaehlen und **Bergen** anklicken. Nach Bestaetigung steht es mit seiner Ladung im abstrakten Depot und gibt Belegung/Reservierungen frei. **Aus Depot starten** sucht seine Strecke erneut und setzt es nur in einen freien Startbereich. Fehlen Gleise oder ist dieser Bereich belegt, bleibt es im Depot. **Fracht zurueckgeben** leert das Depotfahrzeug ohne Bezahlung in den Bestand der Quelle; deren Frachtannahme ist dafuer unerheblich. Ist die normale Warteschlange von 420 Einheiten voll, bleiben Ueberschuesse als gespeicherte Rueckgaben erhalten und ruecken beim Beladen automatisch nach. Die Stationsansicht zaehlt diese Bestaende mit. Stationen mit noch gelagerten Rueckgaben koennen nicht vollstaendig abgerissen werden. Leere Depotfahrzeuge koennen neu beauftragt oder verkauft werden.

**Abfahrt** beendet einen Lade-/Vollbeladungsstopp vorzeitig. Bereits entladene Fracht bleibt abgerechnet, Restladung bleibt an Bord. Signale und Kollisionsschutz bleiben wirksam; der Befehl erzwingt keine Fahrt durch einen belegten Block.

## Spielkern

- Isometrische Karte mit Staedten, Industrien, Feldern, Wald und Wasser
- 3D-Spielkarte mit lokal eingebundenem Three.js
- Bauwerkzeuge fuer Schienen, Strassen, Stationen und Abriss
- Bahn- und Truck-Stationen mit lokaler Produktion und Nachfrage
- Kaufbare Zuege mit mehreren Wagen, Trucks mit Anhaenger und automatische Routensuche ueber verbundene Netze
- Passagiere, Waren, Kohle und Getreide als Frachtarten
- Einnahmen, Wartungskosten, Darlehen und monatlicher Spieltakt

Baue zwei passende Stationen, verbinde sie mit Schiene oder Strasse und kaufe danach ein Fahrzeug am ausgewaehlten Depot.

Das Spiel besitzt ausschliesslich eine 3D-Ansicht. Three.js, Modelle und Bibliotheken liegen lokal bei; auch der direkte Start ueber `index.html` benoetigt keinen CDN-Zugriff. Ein Browser mit WebGL ist erforderlich. Wenn 3D nicht gestartet werden kann, bleibt ein Fehlerhinweis mit Neuladen-Schaltflaeche sichtbar; die Simulation laeuft nicht unsichtbar weiter. Die kleine Landschaftsvorschau im Welt-Dialog bleibt erhalten.

## 3D-Modelle

Die 3D-Ansicht verwendet 30 lokal eingebundene CC0-Modelle von Kenney statt der bisherigen einfachen Platzhalter: sechs Haustypen mit unterschiedlichen Fassaden und Daechern, vier Baumtypen, Fabrik-/Lagergebaeude, Tanks, Schornsteine, Farmdetails, Dampflok, Personen-/Gueterwagen, Truck, Traktor und Ladung. Die Auswahl ist stilisiert und nicht streng auf ein historisches Baujahr beschraenkt.

Kohle und Getreide sind vom Wagen getrennt; Kisten erscheinen schrittweise beim Laden. Leere Wagen zeigen keine Ladung. Personenwagen haben eine kleine Belegungsmarkierung. Gleise besitzen Schwellen und Schotterbett. Wiederholte Modelle werden per Instancing dargestellt; Geometrien werden gemeinsam genutzt und bei Weltumbauten nicht staendig neu geladen. Beleuchtung und Kontakt-Schatten sind auf die Modelle abgestimmt.

Die aufbereiteten Modelldaten benoetigen ca. 0,9 MB und werden als lokale JavaScript-Datei geladen. Es gibt keine zusaetzlichen Modell-/Texturabrufe beim Spielen; der direkte Start ueber `index.html` bleibt moeglich. Bestehende Spielstaende, Fahrzeugparameter und Streckenregeln bleiben erhalten. Alte 2D-Spielstaende werden beim Laden in 3D geoeffnet; neue Exporte enthalten keine 2D-Kamera mehr. [Quellen, originale CC0-Lizenzen und Aufbereitung](src/assets/README.md) sowie die [Modellliste](src/assets/manifest.json) liegen im Projekt. Es wurden echte 3D-Modelle eingebunden, keine KI-Bilder als 3D-Ersatz.

## Bedienung

Fahrzeug auswaehlen und im Fahrzeugbereich **Fuehrerhaus** anklicken. Die Kamera sitzt auf Augenhoehe der Lok bzw. des Lkw und folgt Kurven, Bruecken und dem Wenden. Linke/rechte Maustaste gedrueckt halten oder auf dem Touchscreen ziehen, um sich umzusehen; das Zielsymbol richtet den Blick wieder geradeaus. Tempo, Fahrziel und Haltstatus stehen am unteren Bildrand. Das Ausstiegssymbol, Escape oder ein erneuter Klick auf **Fuehrerhaus** stellt die unveraenderte Kartenkamera wieder her. Ein anderes Fahrzeug aus der Liste wechselt die Mitfahrt; Bergen beendet sie. Im Depot ist die Ansicht gesperrt. Karten-Baugesten sind waehrend der Mitfahrt deaktiviert. Speichern behaelt die normale Kartenkamera; die Mitfahrt wird nicht mitgespeichert.

Links unter den Kameratasten stehen die Koordinaten des Feldes unter der Maus bzw. des zuletzt beruehrten Kartenfelds. Das Zielsymbol daneben oeffnet **Koordinaten**: X/Y eingeben und **Anzeigen** waehlen. Die Kamera springt zum Feld und markiert es orange. Der naechste Klick auf die Karte entfernt die Sprungmarkierung. X/Y beginnen bei 0; auf einer 128-x-96-Karte gelten X=0 bis 127 und Y=0 bis 95. Der Sprung fuehrt keine Bauaktion aus und veraendert keine Fahrzeuge, Fracht oder Finanzen; eine noch offene Bauvorschau wird abgebrochen.

- Schienen und Strassen mit gedrueckter linker Maustaste vom Start zum Ziel ziehen, dann die Vorschau mit **Bauen** bestaetigen oder **Abbrechen** waehlen. Loslassen allein baut nichts.
- Rechte Maustaste: 3D-Kamera drehen. Mittlere Maustaste oder Umschalt + rechte Maustaste: 3D-Karte verschieben.
- Touchscreen: Ein Finger verschiebt die Karte; der beruehrte Punkt bleibt unter dem Finger, schnelles Wischen laeuft kurz nach. Zwei Finger verschieben, zoomen (auseinander-/zusammenziehen) und drehen (Finger gegeneinander verdrehen). Tippen waehlt aus.
- Schienen/Strassen auf dem Touchscreen: Mit einem Finger ziehen zeichnet die Vorschau, sobald sich der Finger bewegt. Ein zweiter Finger macht daraus eine Kamerageste und bricht nur ein noch laufendes Zeichnen ab; eine fertige Vorschau bleibt beim Zoomen/Verschieben erhalten. Waehrend des Zeichnens zeigt eine Lupe ueber dem Finger das Zielfeld vergroessert mit Fadenkreuz. Am Kartenrand gehalten scrollt die Karte mit und die Vorschau waechst weiter.
- Mausrad oder +/-: zoomen. Kamera-Symbol: ganze Karte einpassen.
- Zuege halten zum Be-/Entladen und wenden danach als ganzer Verband im klassischen Tycoon-Stil. Die Lok fuehrt auch auf der Rueckfahrt; es ist keine reale Rangieranimation.
- Signalbloecke erlauben mehrere Zuege auf derselben Strecke. Belegte Bloecke bleiben bis zum letzten Wagen gesperrt.
- Frachtarten bleiben beim Fahrzeug fest. Kohle/Getreide gehen zur Fabrik, deren Waren in die Staedte; Passagiere zwischen Staedten.
- Unterbrochene Strecken stoppen Fahrzeuge, bis die Verbindung wiederhergestellt ist.
- Bei 1x dauert ein Spieltag 12 Sekunden, ein Monat 6 Minuten. Fahrtempo und Kalender sind getrennt; Pause und 2x/4x gelten fuer beide.
- Reisegeschwindigkeit bei 1x: Zuege 1,64 Kacheln/Sekunde, Trucks 1,16. Orientierung: [OpenTTD-Fahrzeugmechanik](https://wiki.openttd.org/en/Manual/Game%20Mechanics/#vehicle-speeds), etwa 1,8 Kacheln/Sekunde bei 100 km/h. Dies ist eine vereinfachte Abstimmung, keine vollstaendige OpenTTD-Physik.

## Streckenvorschau

**Hindernisse umfahren** sucht mit lokal gebuendeltem PathFinding.js/A* einen vierfach verbundenen Bauweg um Wasser, Haeuser, Industrien und bestehende Verkehrswege. Passende vorhandene Gleise/Strassen sind als bewusst gewaehlte Start-/Endanschluesse erlaubt, nicht als ungewollte Kreuzung unterwegs. **Direkt (X, dann Y)** zeigt alternativ einen direkten rechtwinkligen Weg und lehnt Hindernisse ab. Es gibt keine Bruecken oder Tunnel.

Die gruene Vorschau zeigt Verlauf, Feldzahl und Preis. Sie reserviert keine Felder und kostet noch nichts. Beim Bestaetigen wird die ganze Strecke erneut geprueft, inklusive Geld, belegten/reservierten Feldern und Signalen. Scheitert die Pruefung, wird kein Teil gebaut und nichts abgebucht. Escape bricht ab; Enter bestaetigt die fertige Vorschau, solange kein Eingabefeld oder Button fokussiert ist.

Neue parallele Gleise/Strassen werden nicht seitlich automatisch verbunden. Eine gewollte Verbindung entsteht durch eine geplante Strecke von einem bestehenden Weg bis auf den anderen. Darstellung, Routensuche und Signalbloecke benutzen dieselben expliziten Verbindungen. Alte Strecken behalten aus Kompatibilitaetsgruenden ihre bisherigen Verbindungen. Auch Stationen, Signale und Abriss erhalten vor ihrer Ausfuehrung eine bestaetigungspflichtige Einzelvorschau. Ein Werkzeugwechsel verwirft die Vorschau.

Grosse Karten verwenden in 3D gebuendelte Terrain-, Baum- und Feldgeometrien statt einzelner Objekte je Kachel. Der Kartenausschnitt laesst sich verschieben und deutlich weiter herauszoomen.

## Fahrphysik und Bahnsteige

Strassen und Schienen verwenden in 3D abgerundete Viertelkreisboegen statt rechtwinkliger Knicke. Schienenprofile, Schwellen und gestrichelte Strassenmarkierungen folgen dem Bogen; Fahrzeuge und ihre Wagen richten sich an derselben Kurve aus. Weichen und Kreuzungen behalten ihre vorhandenen Verbindungen. Der Umbau ist rein darstellungsbezogen: Kosten, Signalbelegung und Spielstaende bleiben unveraendert.

Fahrzeuge beschleunigen und bremsen jetzt. Wagenzahl und Ladung verlangsamen das Anfahren; vor Bahnhofsenden und roten Signalen wird rechtzeitig gebremst. Enge rechtwinklige Kurven begrenzen das Tempo, bis auch das Wagenende durch ist. Anhalten loest einen Bremsvorgang aus. Im Inspektor und in der Fahrzeugliste steht die aktuelle angenaeherte Geschwindigkeit. Beim Wechsel in einen anderen Tab pausiert die Simulation.

Ent- und Beladen geschieht schrittweise. In 3D fuellen sich die Wagen sichtbar. Einnahmen entstehen nur fuer tatsaechlich entladene Einheiten; ein Spielstand waehrend des Ladens wird genau an dieser Stelle fortgesetzt. Vollbeladung wartet auf Fracht, gewinnt dabei aber keine angesammelten Ladezeit-Gutschriften.

Mit dem Stationswerkzeug direkt neben eine bestehende Station klicken, um sie auf einer geraden Linie zu verlaengern. Bis zu 8 zusammenhaengende Felder zaehlen als eine Station mit gemeinsamer Fracht und Nachfrage. Je Erweiterungsfeld fallen $800 Baukosten und $10 monatliche Wartung zusaetzlich zu den $35 der Grundstation an. Fuer die Laderate zaehlt der tatsaechlich unter dem Zug liegende Bahnsteig: Ein zu kurzer Bahnsteig verlaengert den Ladestopp. Unbenutzte Stationen koennen von den Enden her verkuerzt werden; das urspruengliche Stationsfeld zuletzt entfernen.

Alte Spielstaende mit Einzelfeldstationen bleiben kompatibel. Dies ist weiterhin eine vereinfachte Physik fuer eine flache Karte, kein vollstaendiges OpenTTD-Leistungs- oder Hoehenmodell.

## Stadtwachstum

Ein Haus mit dem Info-Werkzeug anklicken oder **Staedte** oeffnen und einen Ort auswaehlen. Die Stadtansicht zeigt Einwohner, Zuwachs des letzten Monats, Ein-/Ausstiege, Warenversorgung, tatsaechlich bediente Halte und Fortschritt zum naechsten Haus. Die letzten sechs Monatswerte werden angezeigt; bis zu zwoelf Monate werden gespeichert. Die Stadtliste springt mit der Kamera zum gewaehlten Ort.

Das Wachstum wird zum Monatswechsel ausgewertet. Ohne aktuellen Verkehr wachsen Staedte nicht und verlieren auch keine Einwohner. Ein- und Ausstiege zaehlen als Personenbewegungen; Warenlieferungen geben einen zusaetzlichen Bonus. Ein Halt mit mehreren Ladeeinheiten zaehlt nur einmal. Deckt eine Station mehrere Staedte ab, werden Mengen geteilt statt vervielfacht. Depotbergung und Rueckgabe von Fracht erzeugen keinen zusaetzlichen Versorgungsbonus.

Das monatliche Personenziel betraegt mindestens 12 Bewegungen bzw. 12 % der Einwohner; das Warenziel mindestens 6 Einheiten bzw. 4,5 %. Bis zu drei Personenhalte bzw. zwei Warenhalte verbessern die Regelmaessigkeit. Volle Personenversorgung kann ein Haus pro Monat finanzieren; volle Warenversorgung und kombinierte Versorgung steigern dies auf hoechstens zwei Haeuser. Teilfortschritt bleibt erhalten. Ein Haus bringt 12 bis 20 Einwohner; mit steigender Bevoelkerung steigen Passagierproduktion und Versorgungsziele.

Gebaut wird zuerst in freien Bauluecken neben bestehenden Haeusern, danach am Rand. Wasser, Verkehrswege, Signale, Stationen, Industrie, andere Staedte und aktive Fahrzeugrouten werden nicht ueberbaut. Der Suchradius waechst mit der Bevoelkerung bis auf maximal 12 Felder um das Zentrum. Bei fehlendem Platz pausiert der Bau; Fortschritt wird auf ein Haus begrenzt, damit nach einer Freigabe kein jahrelang angesammelter Bauboom entsteht. Stations-Einzugsbereiche werden nach neuem Hausbau aktualisiert.

Ein Spielmonat dauert bei 1x sechs Minuten. Wachstum, Monatszaehler und laufende Ladestopps bleiben nach Speichern/Laden erhalten. Alte Spielstaende erhalten die neuen Werte bei ihrem ersten Verkehr bzw. Monatswechsel, ohne Bevoelkerung oder Karte vorab umzuschreiben. Dies ist ein vereinfachtes eigenes Wachstumsmodell, keine identische Nachbildung der OpenTTD-Stadtregeln.

## Signale und Mehrzugbetrieb

Das Signalwerkzeug erkennt die Ausrichtung gerader Gleise automatisch; eine Auswahl von Himmelsrichtungen gibt es nicht mehr. **Beide Richtungen** erlaubt Verkehr von beiden Seiten. Ohne Haekchen gilt die durch den Pfeil angezeigte Einweg-Fahrtrichtung; der Symbolknopf **Richtung umkehren** wechselt zwischen den beiden passenden Richtungen. Bei beidseitigem Verkehr ist der Knopf deaktiviert. Beide Modi funktionieren mit Block- und Pfadsignalen.

Beim Zeigen auf ein geeignetes Gleis erscheint eine gelbe Pfeilvorschau. Anklicken fixiert sie. Richtung und Typ koennen vor **Bauen** geaendert oder mit **Abbrechen** verworfen werden; die Welt wird erst beim Bestaetigen geaendert. Beim Anklicken vorhandener Signale uebernimmt die Vorschau zuerst deren Einstellungen. Kurven, Weichen, Sackgassen, Stationen und Bruecken sind keine Signalstandorte. Die Pfeile folgen der Karte auch bei gedrehter Kamera; bei beidseitigem Verkehr werden zwei Pfeile gezeigt. Alte gespeicherte Signalrichtungen bleiben erhalten.

Ein Signal kostet $300 und $5 Unterhalt pro Monat. Aenderungen vorhandener Signale sind kostenlos. Abriss entfernt zuerst das Signal und danach bei erneutem Abriss das Gleis. Unter Fahrzeugen und auf reservierten Feldern ist kein Signalumbau erlaubt.

Die #-Taste in der Kartenleiste schaltet farbige Signalbloecke ein. Signale und Bahnhofsfelder bilden Grenzen; zusammenhaengende Gleise zwischen diesen Grenzen gehoeren zu einem Block. Rot bedeutet, dass das Signal selbst oder der anschliessende Block belegt ist. Ein Folgezug wartet, bis der letzte Wagen den benoetigten Block verlassen hat. Ein neuer Zug kann erst gekauft werden, wenn sein gesamter Startbereich frei ist. Angehaltene Zuege belegen ihre Bloecke weiterhin.

Fuer dauerhaften Gegenverkehr getrennte Richtungswege mit Einwegsignalen oder Ausweichstellen bauen. Beim Wenden wird eine erlaubte Rueckroute gesucht. Fehlt sie, wartet der Zug mit Status 'Keine Rueckfahrt'. Signalabstaende sollten die Zuglaenge uebersteigen. Zwei gegenueberstehende Zuege auf einer eingleisigen Strecke koennen sicher zum Stillstand kommen; sie fahren nicht durcheinander, benoetigen zum Weiterfahren aber Platz zum Ausweichen. Blocksignale halten einen Bereich exklusiv; Pfadsignale erlauben getrennte Fahrwege innerhalb desselben Bereichs.

Signale, Fahrwege und wartende Zuege bleiben im Spielstand erhalten. Die tatsaechliche Belegung wird beim Laden neu berechnet. Alte Spielstaende ohne Signale sind weiterhin kompatibel.

## Pfadsignale (PBS)

Im Signalwerkzeug den Typ 'Pfadsignal (PBS)' waehlen. Pfadsignale haben ein tuerkises Gehaeuse. Vor der Einfahrt reserviert ein Zug seinen Fahrweg bis zum naechsten geeigneten Signal oder Zielbahnhof. Der Haltepunkt muss Platz fuer den gesamten Zug bieten, ohne dass ein Wagen oder sein Ueberhang eine Weiche/Kreuzung belegt. Ist die Ausfahrt belegt oder der Platz dahinter zu kurz, wartet der Zug vor der Einfahrt.

Nicht kreuzende Fahrwege im gleichen PBS-Bereich koennen gleichzeitig benutzt werden; gemeinsame Gleisfelder bleiben exklusiv. Hinter dem letzten Wagen werden Reservierungen schrittweise freigegeben. Die #-Ansicht markiert reservierte Gleise gelb. Ein Pfadsignal ist ohne passende Reservierung rot und wird fuer den ankommenden Zug mit reservierter Durchfahrt gruen. Einfahrt ueber ein normales Blocksignal bleibt auch im gemischten Netz exklusiv.

Reservierte Gleise und Signale sind gegen Umbau geschuetzt. Anhalten eines Zuges behaelt seine Reservierung; Verkauf oder Auftragswechsel gibt sie frei. Reservierungen werden zusammen mit dem Spielstand gespeichert und auf Konflikte geprueft. Aeltere Spielstaende ohne diesen neuen Signaltyp laden weiterhin.

Dies ist eine tilebasierte PBS-Umsetzung fuer das vorhandene flache Gleisnetz: keine getrennten kreuzenden Gleisrichtungen innerhalb derselben Kachel, keine umfassende YAPF-Suche nach alternativen freien Fahrstrassen und keine garantierte Aufloesung aller Netzblockaden. Ausweichstellen und passende Signalabstaende bleiben notwendig.

## Pruefung

`node tests/depot-returns.cjs` prueft komplette Rueckgaben an volle/nicht annehmende Quellen, Fracht-/Geld-Erhaltung, mehrere Fahrzeuge, Nachruecken/Beladen, Speichern/Validierung und Abrissschutz.

`node tests/cab.cjs` prueft Fuehrerhausposition/-richtung, Rueckfahrt, Schiebebetrieb, Kurven und Bruecken, Blickwinkel, unveraenderte Simulation, Kamerarueckkehr und Depot-/Welt-/Speicherwechsel.
`node tests/browser-cab.cjs` prueft Zug/Lkw, Mitfahrt/Umsehen, UI-Ausstieg/Escape, Fahrzeugwechsel/Bergung, lokale Icons, Save/Reload und echte WebGL-Screenshots mit Pixelchecks auf Desktop sowie bei 390 und 320 Pixel Breite.
`node tests/browser-depot-returns.cjs` prueft Rueckgabe, Umruesten, Anzeige, Save/Reload und erneutes Beladen ueber die echte Depotoberflaeche auf Desktop/Mobile.

`node tests/coordinates.cjs` prueft Koordinatenanzeige, grosse Karten, Grenzen/ungueltige Werte, Sprung/Kamera, Abbruch offener Entwuerfe und unveraenderte Simulation.
`node tests/browser-coordinates.cjs` prueft echte Mauskoordinaten, Dialog und Tastatur, Sprungmarkierung per Pixelcheck, grosse Karten, Speicher/Kamera und kollisionsfreies Layout auf Desktop sowie bei 390 und 320 Pixel Breite.

`node tests/signal-controls.cjs` prueft automatische Gleisachsen, die zwei Gegenrichtungen, explizite Verbindungen, Vorschau/Abbruch, bestehende Signalwerte, Einweg/Beide Richtungen, alte Speicherstaende und ungueltige Standorte.
`node tests/browser-signal-controls.cjs` prueft Hover-/Klickvorschau, Umkehren, Farb-Pixel des sichtbaren Pfeils bei gedrehter Kamera, beide Gleisachsen, bestehende Signale, Save/Reload, Geometriespeicher, lokale Icons und Desktop/Mobile.

`node tests/browser-startup.cjs` prueft den rein lokalen 3D-Start ohne Netzabrufe, entfernte Ansichtssteuerung, Zoom/Kamera, Desktop/Mobile und die dauerhafte Fehlermeldung bei fehlendem WebGL samt Simulationspause und verfuegbarem Speichern.
`node tests/bridges.cjs` prueft Brueckenplanung/Kosten, beide Verkehrsarten/Achsen, Hoehen, Vorschau/Abbruch, Anschluesse, Verkehr/Rueckfahrt, Reservierungen, sicheren Gesamtabriss, Speicherstaende, defekte Metadaten und Kartenerweiterung.
`node tests/browser-bridges.cjs` prueft echte Ziehgesten fuer Bahn-/Strassenbruecken, erhoehte Vorschau, Rampenneigung, Fahrzeugueberfahrten, Brueckenauswahl, Speicher, geschuetzten Abriss und Screenshots auf Desktop/Mobile.

`node tests/curves.cjs` prueft Kurvenradius, alle Drehrichtungen, tangentiale Uebergaenge, Wagenpositionen beim Wenden und explizite Verbindungen/Weichen.
`node tests/browser-curves.cjs` prueft gerundete Schienen/Strassen, passende Fahrzeugpositionen, Drehbewegung, Speicher und echte 3D-Screenshots auf Desktop/Mobile.

`node tests/simulation.cjs` prueft Bewegungs- und Simulationsfehler ohne Abhaengigkeiten.
`node tests/management.cjs` prueft Spielstaende und Fahrzeug-/Auftragsverwaltung ohne Abhaengigkeiten.
`node tests/railway.cjs` prueft Folgefahrt, Gegenverkehr, Kreuzungen, Wagenende, Signalumbau, Einwege und Rueckrouten.
`node tests/pbs.cjs` prueft parallele und kreuzende Fahrstrassen, blockierte Ausfahrten, ganze Zuglaengen, gemischte Signaltypen, Reservierungsfreigabe, Speichern und Umbau-/Kaufschutz.
`node tests/physics.cjs` prueft Beschleunigung, Bremswege, Kurven, Ladungseinfluss, graduelles Laden, Plattformlaenge, Teilzahlungen und Speichern mitten im Umschlag.
`node tests/construction.cjs` prueft Vorschau/Abbruch, Hindernisrouting, atomaren Bau, Parallelstrecken, gewollte Anschluesse, Bergung, Depotstart, Abfahrt, Neustart/Backup und Kartenerweiterung ohne Aenderungen am Altbestand.
`node tests/landscape.cjs` prueft 64 Seed-/Typ-Kombinationen, flache Landschaften, Industrieketten und erreichbare Baufelder, Reproduzierbarkeit, Vorschau-Isolation, Seed-Spielstaende, unveraenderte Altwelten und Erweiterungen.
`node tests/towns.cjs` prueft Personenverkehr/Waren, eindeutige Halte, geteilte Einzugsbereiche, monatliches Wachstum, hoehere Produktion, geschuetzte Flaechen, fehlenden Bauplatz, Wiederaufnahme, Spielstaende, alte Welten, Pause und monatsuebergreifende Zeitschritte.
`node tests/assets.cjs` prueft die 30 lokalen Modelle, kompakte Geometriedaten, Normalisierung, Indizes/Farben, getrennte Ladung und vorhandene Quell-/Lizenznachweise.
`node tests/browser.cjs` benoetigt Playwright, pngjs und eine lokale Chrome-Installation;
es prueft Desktop/Mobile, WebGL, Fahrzeugbewegung und Geometriespeicher und schreibt Screenshots nach `artifacts/`.
`node tests/browser-railway.cjs` prueft zwei Zuege ueber mehrere Umlaeufe, 3D-Signale, Rot/Gruen und Laden des Mehrzug-Spielstands auf Desktop/Mobile.
`node tests/browser-pbs.cjs` prueft gemeinsame PBS-Bereiche, gruene reservierte Einfahrten, gelbe Fahrwegmarkierung, Rueckfahrt und gespeicherte Reservierungen auf Desktop/Mobile.
`node tests/browser-physics.cjs` prueft sichtbare Wagenladung, Plattform-Spielstaende, Tempoanzeige, Beschleunigen/Bremsen, Entladen und Desktop-/Mobile-Layout.
`node tests/browser-construction.cjs` prueft echte Ziehgesten in 3D, Bestaetigen/Abbrechen, parallele Wege, UI-Bergung, Neustartabbruch, Erweiterung, Sicherungswiederherstellung und grosse Karten mit WebGL-Pixelchecks auf Desktop/Mobile.
`node tests/browser-landscape.cjs` prueft die vier Typen mit echter Seed-Eingabe, Vorschau/Neustart-Uebereinstimmung, 3D-Pixeln, Neuladen, Zufallswerten und einer gebauten Strecke mit fahrendem Zug auf Desktop/Mobile.
`node tests/browser-towns.cjs` prueft fahrende Zuege als Wachstumsquelle, Warenbonus, sichtbare neue Haeuser in 3D, Stadtliste/-ansicht, geschuetzte Infrastruktur und Neuladen auf Desktop/Mobile.
`node tests/browser-assets.cjs` prueft Modellgruppen in Nahansichten, verschiedene Haeuser/Baeume, Industrie, Fahrzeuge/Ladung, Bewegung und gemeinsame Geometrien ohne Speicherzuwachs bei wiederholtem Umbau auf Desktop/Mobile.
`node tests/browser-touch.cjs` prueft echte Mehrfinger-Gesten: Verschieben mit Nachlauf, Tippen, Pinch-Zoom, Drehen, Zwei-Finger-Verschieben, Zeichnen vs. Kamerageste mit dem Schienenwerkzeug, erhaltene Vorschau beim Zoomen, Bau-Lupe, Scrollen am Kartenrand und unveraendertes Mauszeichnen auf Desktop/Mobile.

Der detaillierte Vergleich mit OpenTTD und die noch offenen Unterschiede stehen in [OPENTTD-AUDIT.md](OPENTTD-AUDIT.md).
