# Fachliche Beschreibung

Spielregeln und Bedienung aus Sicht der Spielenden: was das Spiel kann, wie es sich verhaelt, Kosten und Grenzen. Technische Umsetzung: [technisch.md](technisch.md). Aenderungsverlauf: [devlog.md](devlog.md).

## Hilfe

Der Knopf **?** oben rechts oeffnet die Spielhilfe `help.html` in einem neuen Tab: erste Schritte, Bedienung (Handy/PC), Strecken und Verbindungen, Bruecken, Signale, Block- oder Pfadsignal, Ausweichgleise, Fahrzeuge und Staedte, jeweils mit Schemabildern. Bei den Optionen von Schiene/Strasse und Signal fuehren kurze Links direkt zum passenden Abschnitt. Die Hilfe funktioniert offline.

## Grafik

Im Panel unter **Grafik**: **Hoch** (bis doppelte Pixeldichte, volle Bildrate), **Ausgewogen** (bis 1,5-fache Pixeldichte) und **Akku sparen** (einfache Pixeldichte, hoechstens 30 Bilder pro Sekunde; Spiel und Zuege laufen gleich schnell weiter, nur seltener gezeichnet). Auf Touch-Geraeten ist **Ausgewogen** voreingestellt, sonst **Hoch**. Die Wahl gilt fuer diesen Browser und wird nicht im Spielstand gespeichert.

## Als App installieren

Wird das Spiel ueber HTTPS (oder `localhost`) aufgerufen, laesst es sich ueber das Browsermenue (z. B. **Zum Startbildschirm hinzufuegen** bzw. **App installieren**) als App installieren. Es startet dann mit eigenem Symbol ohne Browserleiste und funktioniert nach dem ersten Aufruf auch ohne Internet. Online werden immer die aktuellen Dateien geladen. Ueber `http://` oder direkt als Datei (`index.html`) ist keine Installation moeglich; das Spiel laeuft dort wie bisher. Spielstaende haengen weiter an der jeweiligen Adresse.

## Bedienung

Fahrzeug auswaehlen und im Fahrzeugbereich **Fuehrerhaus** anklicken. Die Kamera sitzt auf Augenhoehe der Lok bzw. des Lkw und folgt Kurven, Bruecken und dem Wenden. Linke/rechte Maustaste gedrueckt halten oder auf dem Touchscreen ziehen, um sich umzusehen; das Zielsymbol richtet den Blick wieder geradeaus. Tempo, Fahrziel und Haltstatus stehen am unteren Bildrand. Das Ausstiegssymbol, Escape oder ein erneuter Klick auf **Fuehrerhaus** stellt die unveraenderte Kartenkamera wieder her. Ein anderes Fahrzeug aus der Liste wechselt die Mitfahrt; Bergen beendet sie. Im Depot ist die Ansicht gesperrt. Karten-Baugesten sind waehrend der Mitfahrt deaktiviert. Speichern behaelt die normale Kartenkamera; die Mitfahrt wird nicht mitgespeichert.

Der Knopf **Zu Koordinaten** im Seitenpanel (neben **Staedte**) oeffnet **Koordinaten**: X/Y eingeben und **Anzeigen** waehlen. Die Kamera springt zum Feld und markiert es orange. Der naechste Klick auf die Karte entfernt die Sprungmarkierung. X/Y beginnen bei 0; auf einer 128-x-96-Karte gelten X=0 bis 127 und Y=0 bis 95. Der Sprung fuehrt keine Bauaktion aus und veraendert keine Fahrzeuge, Fracht oder Finanzen; eine noch offene Bauvorschau wird abgebrochen.

- Schienen und Strassen mit gedrueckter linker Maustaste vom Start zum Ziel ziehen, dann die Vorschau mit **Bauen** bestaetigen oder **Abbrechen** waehlen. Loslassen allein baut nichts.
- Rechte Maustaste: 3D-Kamera drehen. Mittlere Maustaste oder Umschalt + rechte Maustaste: 3D-Karte verschieben.
- Schmale Bildschirme (bis 980 px, z. B. Handy hochkant): Die Karte fuellt den Bildschirm. Oben stehen Datum und Finanzen in einer schmalen Leiste (seitlich wischbar). Unten liegt ein Panel mit den Werkzeugen und dem Namen der aktuellen Auswahl; nach oben wischen zeigt Werkzeugoptionen, Spieltempo, Inspektor, Depot, Fahrzeuge, Ereignisse, Finanzen und Spielstand. Die Karte bleibt dahinter stehen. Werkzeugwahl, Fuehrerhaus, Koordinatensprung und die Auswahl einer Stadt aus der Liste schieben das Panel automatisch zurueck und geben die Karte frei. Im Panel erscheinen nur die Optionen des gewaehlten Werkzeugs: Streckenplanung bei Schiene/Strasse, Stationstyp bei Station, Signaloptionen bei Signal. Eine offene Bauvorschau mit **Bauen**/**Abbrechen** bleibt auch bei hochgeschobenem Panel sichtbar, z. B. um nach dem Aendern von Signaloptionen direkt zu bestaetigen.
- Handy quer (bis 980 px breit und 600 px hoch): Die Karte steht links, rechts eine Spalte mit den Werkzeugen oben und allen weiteren Bedienelementen darunter; die Spalte scrollt, die Karte bleibt stehen.
- Touchscreen: Ein Finger verschiebt die Karte; der beruehrte Punkt bleibt unter dem Finger, schnelles Wischen laeuft kurz nach. Zwei Finger verschieben, zoomen (auseinander-/zusammenziehen) und drehen (Finger gegeneinander verdrehen). Tippen waehlt aus.
- Schienen/Strassen auf dem Touchscreen: Mit einem Finger ziehen zeichnet die Vorschau, sobald sich der Finger bewegt. Ein zweiter Finger macht daraus eine Kamerageste und bricht nur ein noch laufendes Zeichnen ab; eine fertige Vorschau bleibt beim Zoomen/Verschieben erhalten. Waehrend des Zeichnens zeigt eine Lupe ueber dem Finger das Zielfeld vergroessert mit Fadenkreuz. Am Kartenrand gehalten scrollt die Karte mit und die Vorschau waechst weiter.
- Mausrad oder +/-: zoomen. Kamera-Symbol: ganze Karte einpassen.
- Zuege halten zum Be-/Entladen und wenden danach als ganzer Verband wie in klassischen Transportsimulationen. Die Lok fuehrt auch auf der Rueckfahrt; es ist keine reale Rangieranimation.
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

## Ausweichgleise

Unter **Streckenplanung** mit dem Schienenwerkzeug **Ausweichgleis mit Signalen** waehlen und entlang einer geraden Strecke von A nach B ziehen (mindestens 5 Felder). Die Vorschau zeigt ein paralleles Gleis auf der freien Nachbarreihe, Weichen an A und B und vier Einweg-Blocksignale je ein Feld innerhalb der Weichen: auf der Strecke in Ost- bzw. Suedrichtung, auf dem Ausweichgleis in die Gegenrichtung. Bevorzugt wird die Seite suedlich bzw. oestlich; ist sie belegt, die andere. **Seite wechseln** legt das Gleis auf die andere Seite, sofern dort Platz ist. **Bauen** errichtet alles in einem Schritt (neue Gleisfelder plus 4 x $300 Signale) oder gar nicht.

Voraussetzungen: Der Abschnitt A bis B ist durchgehend verbundenes, gerades Gleis ohne Bahnhof, Bruecke, Signal oder vorhandene Weiche; daneben liegt eine Reihe freies, bebaubares Land. Sonst nennt die Vorschau den Grund. Von Hand geht es ebenso (siehe Spielhilfe): mit **Hindernisse umfahren** von A nach B ziehen und die vier Signale selbst setzen.

## Bruecken

Schiene oder Strasse waehlen und unter **Streckenplanung** auf **Bruecke ueber Wasser** wechseln. Vom letzten Landfeld direkt am einen Ufer zum ersten Landfeld direkt am anderen Ufer ziehen. Beide Ufer muessen in derselben Zeile oder Spalte liegen; dazwischen duerfen 1 bis 32 unbebaute Wasserfelder liegen. Die erhoehte Vorschau zeigt den Preis. Erst **Bauen** errichtet die gesamte Bruecke; Loslassen oder Abbrechen veraendert nichts.

Danach fuer die Zubringer wieder **Hindernisse umfahren** oder **Direkt** waehlen und die Brueckenrampen gerade anschliessen. Bereits vorhandene gerade Schienen/Strassen koennen als Uferanschluss dienen. Auf Bruecken und Rampen gibt es keine Stationen, Signale, Kurven oder seitlichen Abzweige. Signale koennen vor und hinter die Bruecke. Wasser und Landschaft werden nicht umgeformt; ein Neustart ist nicht erforderlich.

Fahrwege, Schwellen, Gelaender und Fahrzeuge liegen auf dem erhoehten Deck; Lok, Wagen und Anhaenger neigen sich auf den Rampen. Bruecken bleiben Teil des bestehenden Signal-/PBS-Netzes. Der Zuschlag pro Feld einschliesslich beider Rampen betraegt $900 bei der Bahn bzw. $650 bei Strassen, zusaetzlich zu eventuell neuem Gleis/Strassenbau. Jedes Brueckenfeld kostet $6 monatliche Zusatzwartung. Es gibt vorerst einen festen Brueckentyp, keine Ueberfuehrungen ueber Landstrecken und keinen Schiffsverkehr.

Mit **Abriss** ein beliebiges Brueckenfeld auswaehlen: Die Vorschau markiert die gesamte Bruecke inklusive Rampen. Nach Bestaetigung werden alle zugehoerigen Felder fuer $80 je Feld entfernt. Solange Fahrzeuge die Bruecke belegen oder reservieren, wird der Abriss verweigert. Wasser und Ufer bleiben beim Abriss erhalten. Bruecken und ihre Anschluesse werden gespeichert, beim Import geprueft und bei Kartenerweiterungen beibehalten.

## Signale und Mehrzugbetrieb

Das Signalwerkzeug erkennt die Ausrichtung gerader Gleise automatisch; eine Auswahl von Himmelsrichtungen gibt es nicht mehr. **Beide Richtungen** erlaubt Verkehr von beiden Seiten. Ohne Haekchen gilt die durch den Pfeil angezeigte Einweg-Fahrtrichtung; der Symbolknopf **Richtung umkehren** wechselt zwischen den beiden passenden Richtungen. Bei beidseitigem Verkehr ist der Knopf deaktiviert. Beide Modi funktionieren mit Block- und Pfadsignalen.

Beim Zeigen auf ein geeignetes Gleis erscheint eine gelbe Pfeilvorschau. Anklicken fixiert sie. Richtung und Typ koennen vor **Bauen** geaendert oder mit **Abbrechen** verworfen werden; die Welt wird erst beim Bestaetigen geaendert. Beim Anklicken vorhandener Signale uebernimmt die Vorschau zuerst deren Einstellungen. Kurven, Weichen, Sackgassen, Stationen und Bruecken sind keine Signalstandorte. Die Pfeile folgen der Karte auch bei gedrehter Kamera; bei beidseitigem Verkehr werden zwei Pfeile gezeigt. Alte gespeicherte Signalrichtungen bleiben erhalten.

Die Bauvorschau eines Signals hat zwei eigene Knoepfe: **Richtung** schaltet reihum zwischen beiden Richtungen, Einweg und umgekehrtem Einweg; **Typ** wechselt zwischen Block- und Pfadsignal (PBS). Am Handy laesst sich ein Signal so per Antippen des Gleises, Richtung/Typ und **Bauen** setzen, ohne das Panel zu oeffnen. Die Einstellungen im Panel bleiben gleichwertig und zeigen denselben Stand.

Ein Signal kostet $300 und $5 Unterhalt pro Monat. Aenderungen vorhandener Signale sind kostenlos. Abriss entfernt zuerst das Signal und danach bei erneutem Abriss das Gleis. Unter Fahrzeugen und auf reservierten Feldern ist kein Signalumbau erlaubt.

Die #-Taste in der Kartenleiste schaltet farbige Signalbloecke ein. Signale und Bahnhofsfelder bilden Grenzen; zusammenhaengende Gleise zwischen diesen Grenzen gehoeren zu einem Block. Rot bedeutet, dass das Signal selbst oder der anschliessende Block belegt ist. Ein Folgezug wartet, bis der letzte Wagen den benoetigten Block verlassen hat. Ein neuer Zug kann erst gekauft werden, wenn sein gesamter Startbereich frei ist. Angehaltene Zuege belegen ihre Bloecke weiterhin.

Fuer dauerhaften Gegenverkehr getrennte Richtungswege mit Einwegsignalen oder Ausweichstellen bauen. Beim Wenden wird eine erlaubte Rueckroute gesucht. Fehlt sie, wartet der Zug mit Status 'Keine Rueckfahrt'. Signalabstaende sollten die Zuglaenge uebersteigen. Zwei gegenueberstehende Zuege auf einer eingleisigen Strecke koennen sicher zum Stillstand kommen; sie fahren nicht durcheinander, benoetigen zum Weiterfahren aber Platz zum Ausweichen. Blocksignale halten einen Bereich exklusiv; Pfadsignale erlauben getrennte Fahrwege innerhalb desselben Bereichs.

Signale, Fahrwege und wartende Zuege bleiben im Spielstand erhalten. Die tatsaechliche Belegung wird beim Laden neu berechnet. Alte Spielstaende ohne Signale sind weiterhin kompatibel.

## Pfadsignale (PBS)

Im Signalwerkzeug den Typ 'Pfadsignal (PBS)' waehlen. Pfadsignale haben ein tuerkises Gehaeuse. Vor der Einfahrt reserviert ein Zug seinen Fahrweg bis zum naechsten geeigneten Signal oder Zielbahnhof. Der Haltepunkt muss Platz fuer den gesamten Zug bieten, ohne dass ein Wagen oder sein Ueberhang eine Weiche/Kreuzung belegt. Ist die Ausfahrt belegt oder der Platz dahinter zu kurz, wartet der Zug vor der Einfahrt.

Nicht kreuzende Fahrwege im gleichen PBS-Bereich koennen gleichzeitig benutzt werden; gemeinsame Gleisfelder bleiben exklusiv. Hinter dem letzten Wagen werden Reservierungen schrittweise freigegeben. Die #-Ansicht markiert reservierte Gleise gelb. Ein Pfadsignal ist ohne passende Reservierung rot und wird fuer den ankommenden Zug mit reservierter Durchfahrt gruen. Einfahrt ueber ein normales Blocksignal bleibt auch im gemischten Netz exklusiv.

Reservierte Gleise und Signale sind gegen Umbau geschuetzt. Anhalten eines Zuges behaelt seine Reservierung; Verkauf oder Auftragswechsel gibt sie frei. Reservierungen werden zusammen mit dem Spielstand gespeichert und auf Konflikte geprueft. Aeltere Spielstaende ohne diesen neuen Signaltyp laden weiterhin.

Dies ist eine tilebasierte PBS-Umsetzung fuer das vorhandene flache Gleisnetz: keine getrennten kreuzenden Gleisrichtungen innerhalb derselben Kachel, keine umfassende YAPF-Suche nach alternativen freien Fahrstrassen und keine garantierte Aufloesung aller Netzblockaden. Ausweichstellen und passende Signalabstaende bleiben notwendig.

## Fahrphysik und Bahnsteige

Strassen und Schienen verwenden in 3D abgerundete Viertelkreisboegen statt rechtwinkliger Knicke. Schienenprofile, Schwellen und gestrichelte Strassenmarkierungen folgen dem Bogen; Fahrzeuge und ihre Wagen richten sich an derselben Kurve aus. Weichen und Kreuzungen behalten ihre vorhandenen Verbindungen. Der Umbau ist rein darstellungsbezogen: Kosten, Signalbelegung und Spielstaende bleiben unveraendert.

Fahrzeuge beschleunigen und bremsen jetzt. Wagenzahl und Ladung verlangsamen das Anfahren; vor Bahnhofsenden und roten Signalen wird rechtzeitig gebremst. Enge rechtwinklige Kurven begrenzen das Tempo, bis auch das Wagenende durch ist. Anhalten loest einen Bremsvorgang aus. Im Inspektor und in der Fahrzeugliste steht die aktuelle angenaeherte Geschwindigkeit. Beim Wechsel in einen anderen Tab pausiert die Simulation.

Ent- und Beladen geschieht schrittweise. In 3D fuellen sich die Wagen sichtbar. Einnahmen entstehen nur fuer tatsaechlich entladene Einheiten; ein Spielstand waehrend des Ladens wird genau an dieser Stelle fortgesetzt. Vollbeladung wartet auf Fracht, gewinnt dabei aber keine angesammelten Ladezeit-Gutschriften.

Mit dem Stationswerkzeug direkt neben eine bestehende Station klicken, um sie auf einer geraden Linie zu verlaengern. Bis zu 8 zusammenhaengende Felder zaehlen als eine Station mit gemeinsamer Fracht und Nachfrage. Je Erweiterungsfeld fallen $800 Baukosten und $10 monatliche Wartung zusaetzlich zu den $35 der Grundstation an. Fuer die Laderate zaehlt der tatsaechlich unter dem Zug liegende Bahnsteig: Ein zu kurzer Bahnsteig verlaengert den Ladestopp. Unbenutzte Stationen koennen von den Enden her verkuerzt werden; das urspruengliche Stationsfeld zuletzt entfernen.

Alte Spielstaende mit Einzelfeldstationen bleiben kompatibel. Dies ist weiterhin eine vereinfachte Physik fuer eine flache Karte, kein vollstaendiges OpenTTD-Leistungs- oder Hoehenmodell.

## Spielstaende und Fahrzeuge

Der Spielstand wird alle 15 Sekunden und beim Verlassen lokal gespeichert und beim naechsten Start automatisch fortgesetzt. Speichern/Laden ist auch manuell moeglich. JSON-Export/-Import dient als portable Sicherung. Falls der Browser lokalen Speicher blockiert, bleibt der Export nutzbar. Ein bereits offener Tab mit der alten Version besitzt diese Funktion noch nicht.

Im Depot lassen sich Zielstation, Fracht und Wagenzahl vor dem Kauf waehlen. Die Fahrzeugliste erlaubt gezielte Auswahl und Start/Stopp. Leere, angehaltene Fahrzeuge am Bahnhof lassen sich verkaufen oder fuer einen neuen Zweistationenauftrag mit anderer Fracht/Wagenzahl einrichten. Entladen gibt Fracht am Ursprungsbahnhof ohne Einnahme zurueck oder liefert sie bei einem passenden Empfaenger ab. Ladeoptionen: verfuegbare Fracht, Vollbeladung oder nicht laden. Wahlweise wendet der Zug klassisch oder faehrt schiebend zurueck. Wagenzuwachs kostet $1.000 je Wagen; Verkauf erloest 65 % des Kaufwerts. Fuer kurze Strecken die Wagenzahl reduzieren.

## Fahrzeugrettung

Ein festgefahrenes Fahrzeug in der Fahrzeugliste auswaehlen und **Bergen** anklicken. Nach Bestaetigung steht es mit seiner Ladung im abstrakten Depot und gibt Belegung/Reservierungen frei. **Aus Depot starten** sucht seine Strecke erneut und setzt es nur in einen freien Startbereich. Fehlen Gleise oder ist dieser Bereich belegt, bleibt es im Depot. **Fracht zurueckgeben** leert das Depotfahrzeug ohne Bezahlung in den Bestand der Quelle; deren Frachtannahme ist dafuer unerheblich. Ist die normale Warteschlange von 420 Einheiten voll, bleiben Ueberschuesse als gespeicherte Rueckgaben erhalten und ruecken beim Beladen automatisch nach. Die Stationsansicht zaehlt diese Bestaende mit. Stationen mit noch gelagerten Rueckgaben koennen nicht vollstaendig abgerissen werden. Leere Depotfahrzeuge koennen neu beauftragt oder verkauft werden.

**Abfahrt** beendet einen Lade-/Vollbeladungsstopp vorzeitig. Bereits entladene Fracht bleibt abgerechnet, Restladung bleibt an Bord. Signale und Kollisionsschutz bleiben wirksam; der Befehl erzwingt keine Fahrt durch einen belegten Block.

## Stadtwachstum

Ein Haus mit dem Info-Werkzeug anklicken oder **Staedte** oeffnen und einen Ort auswaehlen. Die Stadtansicht zeigt Einwohner, Zuwachs des letzten Monats, Ein-/Ausstiege, Warenversorgung, tatsaechlich bediente Halte und Fortschritt zum naechsten Haus. Die letzten sechs Monatswerte werden angezeigt; bis zu zwoelf Monate werden gespeichert. Die Stadtliste springt mit der Kamera zum gewaehlten Ort.

Das Wachstum wird zum Monatswechsel ausgewertet. Ohne aktuellen Verkehr wachsen Staedte nicht und verlieren auch keine Einwohner. Ein- und Ausstiege zaehlen als Personenbewegungen; Warenlieferungen geben einen zusaetzlichen Bonus. Ein Halt mit mehreren Ladeeinheiten zaehlt nur einmal. Deckt eine Station mehrere Staedte ab, werden Mengen geteilt statt vervielfacht. Depotbergung und Rueckgabe von Fracht erzeugen keinen zusaetzlichen Versorgungsbonus.

Das monatliche Personenziel betraegt mindestens 12 Bewegungen bzw. 12 % der Einwohner; das Warenziel mindestens 6 Einheiten bzw. 4,5 %. Bis zu drei Personenhalte bzw. zwei Warenhalte verbessern die Regelmaessigkeit. Volle Personenversorgung kann ein Haus pro Monat finanzieren; volle Warenversorgung und kombinierte Versorgung steigern dies auf hoechstens zwei Haeuser. Teilfortschritt bleibt erhalten. Ein Haus bringt 12 bis 20 Einwohner; mit steigender Bevoelkerung steigen Passagierproduktion und Versorgungsziele.

Gebaut wird zuerst in freien Bauluecken neben bestehenden Haeusern, danach am Rand. Wasser, Verkehrswege, Signale, Stationen, Industrie, andere Staedte und aktive Fahrzeugrouten werden nicht ueberbaut. Der Suchradius waechst mit der Bevoelkerung bis auf maximal 12 Felder um das Zentrum. Bei fehlendem Platz pausiert der Bau; Fortschritt wird auf ein Haus begrenzt, damit nach einer Freigabe kein jahrelang angesammelter Bauboom entsteht. Stations-Einzugsbereiche werden nach neuem Hausbau aktualisiert.

Ein Spielmonat dauert bei 1x sechs Minuten. Wachstum, Monatszaehler und laufende Ladestopps bleiben nach Speichern/Laden erhalten. Alte Spielstaende erhalten die neuen Werte bei ihrem ersten Verkehr bzw. Monatswechsel, ohne Bevoelkerung oder Karte vorab umzuschreiben. Dies ist ein vereinfachtes eigenes Wachstumsmodell, keine identische Nachbildung der OpenTTD-Stadtregeln.

## Neustart und Kartengroesse

Unter **Neue Welt / Kartengroesse** eine Groesse waehlen: 34 x 26, 64 x 48, 96 x 72 oder 128 x 96. **Neue Welt starten** setzt nach einer Rueckfrage Karte, Fahrzeuge, Finanzen und Kalender zurueck. **Bestehende Karte erweitern** ergaenzt Land, Orte und Industrien, ohne bestehende Felder, Strecken, Fahrzeuge oder Finanzen zu veraendern. Verkleinern ist nicht moeglich.

Vor Neustart und Erweiterung wird die aktuelle Welt als eine vorherige Welt gesichert. **Vorherige Welt wiederherstellen** wechselt zu dieser Sicherung zurueck. Es gibt nur eine solche Sicherung; weitere Neustarts/Erweiterungen ersetzen sie. Falls der Browser die Sicherung blockiert oder sein Speicher voll ist, wird vor Fortfahren nachgefragt. Fuer langfristige Sicherungen JSON exportieren. Alte Spielstaende ohne Groessenangabe laden weiterhin.

## Zufaellige Landschaften

Im Dialog **Neue Welt / Kartengroesse** lassen sich fuer eine neue Welt vier flache Landschaftstypen waehlen: **Binnenland**, **Seenplatte**, **Kuestenland** und **Flussland**. Zusammenhaengende Waldgebiete, Wiesen, Feldregionen, unregelmaessige Seen, Kuesten und geschwungene Fluesse ersetzen das fruehere wiederholte Muster. Ufer und Landschaftsfarben unterscheiden sich auch in 3D; Baeume stehen innerhalb neuer Waldkacheln unterschiedlich.

Der **Seed** darf eine Zahl oder ein kurzer Text sein. Der Pfeil daneben erzeugt einen neuen Zufallswert. Die Kartenvorschau zeigt die neue Welt inklusive Orten, Industrien und Wasseranteil, ohne die laufende Welt zu veraendern. Erst **Neue Welt starten** mit Bestaetigung ersetzt sie. Gleicher Seed, gleiche Groesse und gleicher Typ ergeben mit dieser Generatorversion dieselbe Welt.

Staedte und Industrien werden verteilt statt auf festen Rasterpositionen gesetzt. Mindestens drei Orte und die Kohle-/Getreide-/Warenkette benoetigen einen gemeinsamen bebaubaren Landbereich. Unguenstige Platzierungen werden deterministisch neu versucht. Wasser kann mit geraden Bahn-/Strassenbruecken ueberquert werden. Tunnel, Berge und Gelaendehoehen sind noch nicht enthalten.

Seed, Typ, interne Generatorvariante und urspruengliche Groesse werden gespeichert. Erweiterungen neuer Welten verwenden dieselben koordinatenbasierten Landschaftsregeln und lassen vorhandene Felder, Orte und Strecken unveraendert. Die Landschaftsauswahl im Dialog gilt nur fuer einen Neustart, nicht fuer die Umgestaltung bestehender Karten. Alte Welten ohne Seed behalten ihre bisherige Landschaft und Erweiterungslogik. Die Noise-Bibliothek liegt lokal bei; die Erzeugung benoetigt kein Netz.
