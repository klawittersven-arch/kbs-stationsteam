# KBS Stationsteam: Alle Hände voll!

Ein lautes Teamspiel für die generalistische Pflegeausbildung. Die Klasse wird in **Stationen** (Teams) aufgeteilt. Jedes Handy zeigt ein Pult mit Bedienelementen aus der Pflege: Knöpfe („Puls zählen“), Schalter („Bettgitter: unten / oben“), Schieberegler („Kopfteil 0° bis 90°“), Drehregler mit Auslöser („Insulin-Pen: 4 IE einstellen, dann spritzen“), Knöpfe zum Gedrückthalten („Druck auf die Wunde“) und zum Drücken im Takt („Herzdruckmassage“). Dazu kommen ein paar lustige Aufgaben aus dem Stationsalltag („Kaffee kochen!“). Oben auf jedem Handy steht eine Aufgabe, aber das passende Element hat immer **jemand anderes** aus der Station. Also: laut rufen, zuhören, drücken! Ab dem Spätdienst kommen **Situationen** dazu („Frau K. hat starke Atemnot“): Die Station muss selbst erkennen, was zu tun ist.

| Seite | Adresse | Für wen |
|---|---|---|
| Üben | `/` | alle, auch zu Hause (allein, ohne Anmeldung) |
| Klassenmodus | `/lehrer` | Lehrkraft am Laptop mit Beamer |
| Mitspielen | `/mitspielen` | SuS, wird über den QR-Code geöffnet |

**Link für den Beamer (nach der Einrichtung):** `https://kbs-stationsteam.klawittersven.workers.dev/lehrer`

Spiel, Grafiken und Töne: © 2026 Sven Klawitter. Alle Bilder sind eigene Zeichnungen.

---

## Einmalige Einrichtung bei Cloudflare (etwa 10 Minuten)

Genauso wie bei KBS Simon says, KBS-Kart und Tetris:

1. Bei Cloudflare anmelden: <https://dash.cloudflare.com>
2. Links im Menü **Workers & Pages** öffnen (je nach Ansicht unter **Compute (Workers)**).
3. **Create application** (Anwendung erstellen) wählen, dann **GitHub** bzw. **Import a repository**.
4. Das Repository **kbs-stationsteam** auswählen. Falls es nicht in der Liste steht: in den GitHub-Einstellungen der Cloudflare-App den Zugriff auf `kbs-stationsteam` erlauben.
5. Einstellungen prüfen:
   - **Project name / Worker name:** `kbs-stationsteam` (muss genau so heißen, sonst schlägt der Build fehl)
   - **Build command:** leer lassen
   - **Deploy command:** `npx wrangler deploy` (ist voreingestellt)
   - **Root directory:** leer lassen
6. **Save and Deploy** klicken. Nach ein bis zwei Minuten ist das Spiel online unter `https://kbs-stationsteam.klawittersven.workers.dev`.

**Updates:** Jede Änderung, die im Branch `main` dieses GitHub-Repositorys landet, veröffentlicht Cloudflare automatisch.

---

## Ablauf im Unterricht

1. **Lehrer-Link am Laptop öffnen**, Beamer und Lautsprecher an, **F** für Vollbild. Oben rechts steht der Code der Sitzung.
2. **Anmeldung:** Die SuS scannen den QR-Code und geben Vornamen und den ersten Buchstaben des Nachnamens ein (z. B. „Lena K.“). Die Namen erscheinen am Beamer. Mit **×** entfernst du unpassende Namen.
3. **Einstellungen** (unter den Namen, bleiben gespeichert), siehe Tabelle unten.
4. **Stationen bilden** (Enter). Eine Station muss nah zusammensitzen, sonst hört man sich nicht. Darum **wählen die SuS ihre Station selbst** (Einstellung „Selbst wählen“, voreingestellt):
   - Das Spiel legt passend zur Klasse Stationen an (Station Rot, Blau, Grün …, bei 30 SuS und Größe 4 sind es 8). Am Beamer läuft ein **Countdown von 60 Sekunden**.
   - Auf dem Handy tippen die SuS die Station an, die sie mit ihren **Sitznachbarn** nehmen. Wechseln geht, bis die Zeit um ist. Am Beamer siehst du live, wer wo ist, und unten, wer noch keine Station hat.
   - Eine Station nimmt höchstens **eine Person mehr** auf, als bei gleichmäßiger Verteilung nötig wäre (bei 30 SuS und 8 Stationen: 5). Danach steht sie auf „voll“.
   - Ist die Zeit um (oder klickst du **Jetzt verteilen**, Enter), werden alle ohne Station in die kleinsten Stationen gelost. Leere Stationen fallen weg, und niemand bleibt allein in einer Station. Wer zugelost wurde, ist am Beamer mit **↪** markiert, und das Handy sagt, zu wem die Person sich setzen soll. Mit **+30 Sekunden** gibst du mehr Zeit.
   - Danach kannst du am Beamer noch **tauschen**: einen Namen anklicken, dann die neue Station anklicken. **Nochmal selbst wählen** und **Zufällig neu auslosen** sind auch möglich.
   - Mit der Einstellung **„Zufällig“** lost das Spiel die Stationen sofort aus. Dann müssen sich die SuS umsetzen.
5. **Frühdienst starten** (Enter). Nach einem Countdown spielen alle Stationen gleichzeitig. Am Beamer siehst du für jede Station einen Balken: Wie viel vom **Schichtziel** ist geschafft? Die weiße Marke ist 100 %.
6. **Übergabe:** Nach jeder Schicht zeigt der Beamer die Wertung, die Zahlen jeder Station (erledigt, verpasst, Fehlgriffe) und **„Das war knifflig“**: die Situationen, die verpasst wurden, mit der richtigen Lösung. Gut für ein kurzes Gespräch. Wenn nichts verpasst wurde, stehen dort Fragen für eine kurze Teambesprechung. Die Handys zeigen das eigene Ergebnis und die Situationen, die die eigene Station verpasst hat.
7. **Spätdienst** und **Nachtdienst** starten (jeweils Enter). Jede Schicht wird schwieriger (siehe unten).
8. **Siegerehrung** nach dem Nachtdienst: Gewinnerstation mit Pokal, Gesamtwertung und die kniffligsten Situationen des ganzen Spiels. Danach **Nochmal mit denselben Stationen** (Enter), **Neue Stationen** oder **Neues Spiel** (Esc, zurück zur Anmeldung, alle bleiben angemeldet).

### Einstellungen

| Einstellung | Auswahl | Bedeutung |
|---|---|---|
| **Stationen** | 2 bis 6 Personen (voreingestellt: 4) | So viele Personen spielen ungefähr zusammen. Bei 30 SuS und 4 Personen gibt es 8 Stationen. Höchstens 10 Stationen. |
| **Einteilung** | Selbst wählen · Zufällig | *Selbst wählen:* Die SuS wählen auf dem Handy eine Station mit ihren Sitznachbarn (60 Sekunden), der Rest wird zugelost. *Zufällig:* Das Spiel lost aus. |
| **Schicht** | 1, 1,5, 2 oder 3 Minuten (voreingestellt: 2) | Dauer jeder der drei Schichten |
| **Aufgaben** | Steigend · Nur Anweisungen · Nur Situationen | *Steigend:* Frühdienst nur Anweisungen, Spätdienst etwa die Hälfte Situationen, Nachtdienst noch mehr |
| **Tempo** | Ruhig · Normal · Schnell | Zeit für jede Aufgabe (Ruhig: 40 % mehr, Schnell: 25 % weniger) |
| **Themen** | Lagerung & Mobilisation · Prophylaxen & Hygiene · Vitalzeichen & Beobachtung · Notfälle & Erste Hilfe · Stationsalltag (zum Lachen) | Bedienelemente aus den gewählten Themen kommen zuerst. Reichen sie nicht, kommen andere dazu. Vom **Stationsalltag** liegt höchstens ein Element auf jedem Handy. Ist das Thema aus, kommt er gar nicht vor. |

### Die Bedienelemente

| Art | So wird es bedient | Beispiele |
|---|---|---|
| **Knopf** | einmal antippen | Puls zählen, Mundpflege, Kaffee kochen |
| **Gedrückt halten** | drücken und halten, bis der Balken voll ist (3 bis 4 Sekunden). Zu früh losgelassen: „Länger halten!“ | Hände desinfizieren (mit dem Hinweis „in echt 30 s“), Druck auf die Wunde, Pause machen |
| **Im Takt drücken** | 10-mal drücken, eine Lampe blinkt im Takt 100 bis 120 pro Minute. Viel zu schnell oder zu langsam (mehr als 10 daneben): nochmal | Herzdruckmassage |
| **Schalter** | eine von zwei Stellungen antippen | Bettgitter, Handschuhe, Fenster, „Kannst du einspringen?“ |
| **Stufen** | eine von 3 bis 4 Stufen antippen | Lagerung 30° links / Rücken / 30° rechts, Sauerstoff, Kaffee |
| **Schieberegler** | den Griff ziehen (rastet ein) oder eine Markierung antippen. Es zählt die Stellung beim Loslassen | Kopfteil 0° bis 90°, Fußteil, Betthöhe, Infusionspumpe 25 bis 250 ml/h, Radio |
| **Drehregler + Knopf** | erst den Wert einstellen (drehen oder ‹ ›), dann auslösen. Nur der richtige Wert zählt, Drehen allein zählt nicht | Insulin-Pen 2 bis 12 IE + „Spritzen“, Perfusor 2 bis 10 ml/h + „Start“ |

Auf jedem Handy liegen höchstens zwei breite Elemente (Stufen, Schieberegler, Drehregler), damit alles auch auf kleine Bildschirme passt.

### Die drei Schichten

| Schicht | Elemente pro Handy | Aufgaben (bei „Steigend“) | Zeit pro Aufgabe (Tempo „Normal“) | Besonderheit |
|---|---|---|---|---|
| **Frühdienst** | 4 | nur Anweisungen | 15 Sekunden | – |
| **Spätdienst** | 5 | etwa die Hälfte Situationen | 14 s (Anweisung), 24 s (Situation) | Bei Situationen erscheint nach der Hälfte der Zeit ein **Tipp** |
| **Nachtdienst** | 6 | etwa 70 % Situationen | 13 s (Anweisung), 22 s (Situation) | Die Aufgabe wird nach 4 Sekunden **blass** (müde Augen). Schnell lesen und rufen! Der Tipp bei Situationen kommt trotzdem. |

### Regeln im Detail

- **Erledigt:** +2 Punkte für die Station. **Falscher Knopf** (den gerade keine Aufgabe der Station braucht): −1 Punkt. **Verpasst** (Zeit um): 0 Punkte, das Handy zeigt kurz die richtige Lösung.
- **Schichtziel (100 %):** richtet sich nach der Größe der Station und der Schichtdauer. Eine Station mit 3 Personen hat ein kleineres Ziel als eine mit 4. So ist die Wertung fair, auch wenn die Stationen verschieden groß sind. Mehr als 100 % ist möglich.
- **Gesamtwertung:** Die Prozente der drei Schichten werden zu Punkten addiert (z. B. 85 % + 92 % + 70 % = 247 Punkte).
- Jede Aufgabe passt zu genau einem Element auf einem Handy der eigenen Station, und zwar **immer auf dem Handy von jemand anderem**. Die eigene Aufgabe muss man also immer rufen. Nur wenn auf den anderen Handys gerade gar nichts frei ist (sehr selten, z. B. wenn alle anderen Handys keine Verbindung haben), ist es ein eigener Knopf. Dann steht auf dem Handy „Das ist dein eigener Knopf – drück ihn selbst!“.
- Situationen, die man auch mit einem eigenen Knopf lösen könnte, bekommt man nicht. So kommt niemand in die Lage, selbst etwas Richtiges zu drücken und dafür einen Fehlgriff zu bekommen.
- Bei Situationen kann es **mehrere richtige Lösungen** geben (z. B. bei Herzrasen: „Puls zählen“ oder „Blutdruck messen“). Jede davon zählt.
- **Nachzügler** können über den kleinen QR-Code jederzeit einsteigen. Sie wählen auf dem Handy die Station, bei der sie sitzen, und bekommen sofort ein eigenes Pult. Bis dahin steht ihr Name am Beamer unter „Noch ohne Station“. (Bei „Zufällig“ kommen sie automatisch in die kleinste Station.)
- Wer die Seite versehentlich schließt, scannt den QR-Code noch einmal. Das Handy wird wiedererkannt (gleicher Browser) und bekommt sein Pult zurück.
- Handys, die keine Verbindung haben, bekommen keine Aufgaben. Ihre Knöpfe werden auch nicht verlangt.

### Tasten am Beamer

| Taste | Funktion |
|---|---|
| Enter | Stationen bilden, Jetzt verteilen, Schicht starten, Nochmal |
| Esc | Zurück zur Anmeldung (Neues Spiel) |
| F | Vollbild |
| M | Ton an/aus |

**Tipps**
- Die Handys sind **immer stumm**, auch auf der Übungsseite. Ton gibt es nur über den Beamer-Laptop: Countdown, Gong zum Schichtbeginn und -ende, Monitor-Piepen in den letzten 10 Sekunden, ein Signal, wenn eine Station ihr Schichtziel erreicht, und eine Fanfare bei der Siegerehrung (mit **M** oder dem Knopf oben rechts ausschaltbar).
- Am Anfang lohnt sich eine Proberunde mit **Tempo „Ruhig“** und **„Nur Anweisungen“**.
- Es wird laut. Das ist gewollt: Kommunikation im Team ist Teil des Spiels. Eine Station pro Tischgruppe hilft.
- **Schicht beenden** am Beamer beendet eine Schicht vorzeitig (es zählen die Punkte bis dahin).
- Der Bildschirm der Handys bleibt während der Schicht an (sofern der Browser das unterstützt).
- **Mehrere Klassen gleichzeitig:** Jede Lehrkraft öffnet `/lehrer` und bekommt einen eigenen Code. **Sitzung → Neue Sitzung** erzeugt einen neuen Code.

---

## Inhalte ändern: Bedienelemente und Situationen

Alle Inhalte stehen in **`public/js/inhalte.js`**. Auf GitHub die Datei öffnen, auf den Stift klicken, ändern, „Commit changes“. Nach ein bis zwei Minuten gilt die neue Fassung. Oben in der Datei steht eine ausführliche Anleitung.

**Ein Knopf** (Name = Beschriftung auf dem Handy, Anweisung wahlweise):
```js
{ id: 'puls', thema: 'vital', art: 'knopf', name: 'Puls zählen' },
{ id: 'aed', thema: 'notfall', art: 'knopf', name: 'AED holen', befehl: 'Defi (AED) holen!' },
```

**Ein Schalter** (Stufen in der Reihenfolge auf dem Handy, Anweisungen in derselben Reihenfolge):
```js
{ id: 'bettgitter', thema: 'lagerung', art: 'schalter', name: 'Bettgitter', stufen: ['unten', 'oben'],
  befehle: ['Bettgitter runter!', 'Bettgitter hoch!'] },
```

**Ein Schieberegler** (3 bis 7 Stufen; in `befehl` steht `#` für die Stufe):
```js
{ id: 'kopfteil', thema: 'lagerung', art: 'regler', name: 'Kopfteil', stufen: ['0°', '15°', '30°', '45°', '60°', '90°'],
  befehl: 'Kopfteil auf # stellen!' },
```

**Ein Drehregler mit Knopf** (2 bis 12 Stufen, `knopf` ist die Beschriftung zum Auslösen):
```js
{ id: 'insulin', thema: 'vital', art: 'dosis', name: 'Insulin-Pen', stufen: ['2 IE', '4 IE', '6 IE', '8 IE', '10 IE', '12 IE'],
  knopf: 'Spritzen', befehl: '# Insulin spritzen!' },
```

**Gedrückt halten** und **im Takt drücken**:
```js
{ id: 'wunde', thema: 'notfall', art: 'halten', name: 'Druck auf die Wunde', sekunden: 3 },
{ id: 'hdm', thema: 'notfall', art: 'takt', name: 'Herzdruckmassage', anzahl: 10, min: 100, max: 120 },
```

**Eine Situation** (`tun` genau so geschrieben wie auf dem Handy, bei Elementen mit Stufen mit Doppelpunkt und Stufe):
```js
{ text: 'Frau K. hat starke Atemnot (Dyspnoe).', tun: ['Kopfteil: 60°', 'Kopfteil: 90°', 'SpO2 messen'] },
{ text: 'Anordnung: 1000 ml Infusion in 8 Stunden. Stell die Pumpe ein!', tun: ['Infusionspumpe: 125 ml/h'] },
```

- Die Kennung (`id`) einmal festlegen und dann nicht mehr ändern.
- Es braucht **mindestens 36 Bedienelemente** (6 Personen × 6 Elemente im Nachtdienst). Enthalten sind 71 Elemente (davon 14 aus dem Stationsalltag) und 68 Situationen.
- **Rechen-Situationen:** Infusionspumpe (Menge ÷ Stunden = ml/h) und Perfusor. **Insulin:** zwei Situationen mit einem kurzen Korrekturschema im Text. Die Schemata und Zahlen sind **erfundene Übungsbeispiele**. Passe sie an das an, was ihr im Unterricht verwendet.
- **Stationsalltag:** Das Thema hat `lustig: true`. Seine Elemente kommen nur als direkte Anweisung vor, nie in einer Situation.
- Passt ein `tun` zu keinem Bedienelement (z. B. Tippfehler), wird die Situation übersprungen. Der Beamer zeigt dann in der Anmeldung einen **Hinweis**, welche Zeile betroffen ist.
- Bewusst nicht als Lösung enthalten: **Bettgitter** (freiheitsentziehende Maßnahme, braucht eine Genehmigung) und **Sauerstoff** (nur nach ärztlicher Anordnung). Beide kommen nur als direkte Anweisung vor. Das ist ein guter Gesprächsanlass, wenn jemand bei „Herr T. könnte aus dem Bett fallen“ das Bettgitter hochstellt.
- Ein neues Thema: in `THEMEN` eine Zeile ergänzen (`{ id: 'wunde', name: 'Wundversorgung' }`) und bei den neuen Elementen `thema: 'wunde'` eintragen. Es bekommt automatisch ein Fragezeichen-Symbol.

---

## Datenschutz

- **Gespeichert wird nur:** Vorname mit Anfangsbuchstabe des Nachnamens, die Station und die Spielergebnisse. Keine Konten, keine E-Mail-Adressen, keine Cookies, keine Werbung, kein Tracking.
- Die Daten liegen im Klassenraum-Speicher bei Cloudflare und werden **6 Stunden nach der letzten Änderung automatisch gelöscht**. Sofort löschen: **Sitzung → Sitzung beenden und Daten jetzt löschen**.
- Im Browser der Handys speichert die Seite eine zufällige Geräte-Kennung und den zuletzt eingegebenen Namen. Die Übungsseite speichert nur die eigenen Rekorde im Browser. Die Handys sehen die Geräte-Kennungen der anderen nicht.
- Schriften, Grafiken und Programmbibliotheken liegen im Projekt selbst. Die Seiten laden nichts von Google oder anderen Drittanbietern nach.
- Cloudflare ist ein US-Anbieter. Stimme den Einsatz am besten kurz mit der Schulleitung oder dem Datenschutzbeauftragten ab.

## Kosten

Der kostenlose Cloudflare-Tarif reicht aus. Jedes Handy schickt pro Knopfdruck eine kurze Nachricht, der Beamer einmal pro Sekunde. Eine Unterrichtsstunde mit 30 SuS und drei Schichten zu 2 Minuten braucht grob 3.000 bis 5.000 Nachrichten und genauso viele Speichervorgänge (frei sind 100.000 pro Tag).

---

## Notlösung ohne Cloudflare: Laptop als Server

1. [Node.js](https://nodejs.org) installieren (Version 18 oder neuer).
2. Das Repository herunterladen (bei GitHub: **Code → Download ZIP**) und entpacken.
3. Im Projektordner ein Terminal öffnen und `node server/local.mjs` eingeben.
4. Die angezeigte Adresse „Im Netz: http://192.168.…:8787/lehrer“ am Laptop öffnen (nicht `localhost`), damit der QR-Code die Netzwerkadresse enthält.

Voraussetzung: Handys und Laptop sind im selben WLAN, und das WLAN erlaubt Verbindungen zwischen den Geräten.

---

## Technik

| Datei | Inhalt |
|---|---|
| `public/js/inhalte.js` | ← die Inhalte: Themen, Bedienelemente, Situationen |
| `public/js/regeln.js` | Regeln, Schichten, Zeiten, Punkte, Stationen auslosen, Pulte verteilen, Aufgaben erzeugen, Inhalte prüfen (gilt für Handys, Beamer und Server) |
| `public/js/bilder.js` | eigene Grafiken (SVG): Themen, Schichten, Pokal, Logo |
| `public/js/pult.js` | das Pult auf dem Handy: Knopf, Halten, Takt, Schalter, Stufen, Schieberegler, Drehregler |
| `public/js/ui.js` | gemeinsame Bausteine: Aufgabe mit Zeitbalken, Tipp, Verblassen, Countdown |
| `public/js/lehrer.js` | Beamer-Seite: Anmeldung, Stationen, Schichten, Übergabe, Siegerehrung |
| `public/js/mitspielen.js` | Handy-Seite |
| `public/js/ueben.js` | Übungsseite mit Lernliste aller Situationen |
| `public/js/ton.js` | Töne für den Beamer (Web Audio, ohne Dateien) |
| `public/js/net.js` | WebSocket-Verbindung mit Wiederverbinden und Uhrabgleich |
| `src/room.js` | Raum-Logik einer Klasse (unabhängig vom Server) |
| `src/worker.js` | Cloudflare Worker und Durable Object (ein Raum je Code) |
| `server/local.mjs` | Lokaler Server ohne Zusatzpakete |

Der Server entscheidet über alles: welche Elemente auf welchem Handy liegen, welche Aufgaben es gibt und ob ein Knopfdruck ein Treffer war. Ein Element ist nie Ziel von zwei Aufgaben gleichzeitig, und Schalter, Stufen und Schieberegler müssen sich bei einer Aufgabe immer ändern. Ob lange genug gehalten oder im richtigen Takt gedrückt wurde, prüft das Handy. Erst dann meldet es dem Server die Aktion. Die Handys bekommen die Lösung einer Aufgabe nicht mitgeschickt (nur den Tipp bei Situationen).

### Tests

```
node --test tests/room.test.mjs     # Regeln, Inhalte und Raum-Logik
node tests/e2e.mjs                  # Browser-Durchlauf (Playwright), Bildschirmfotos in tests/ergebnisse/
```

Der Browser-Durchlauf startet einen Beamer und 7 Handys (eines davon klein, 360 × 640). Er prüft Anmeldung, Stationen selbst wählen (eine Station läuft voll, jemand wechselt, eine Person wählt nicht und wird nach den 60 Sekunden zugelost), Tauschen am Beamer, alle drei Schichten mit Spiel-Robotern (eine Station spielt sauber, eine verpasst manches und greift daneben; dabei wird geprüft, dass keine Aufgabe auf dem eigenen Handy landet), eine Nachzüglerin, die mitten in der Schicht ihre Station wählt, Neuladen von Handy und Beamer, Tipps, Verblassen, „Das war knifflig“, Siegerehrung, „Nochmal“, die Übungsseite und dass nur der Beamer Töne macht. Die Spiel-Roboter bedienen alle Arten: Sie halten, drücken im Takt, stellen Dosen ein und schieben Regler. Ein eigener **Bauteil-Test** prüft jede Eingabeart mit echten Fingerbewegungen auf einem kleinen Handy: Schieberegler ziehen (nur die Endstellung zählt), Drehregler drehen und mit ‹ › nachstellen (Drehen allein löst nichts aus), zu kurz und lange genug halten, viel zu schnell und im Takt drücken, und ob alles auf 360 × 640 Pixel passt. Mit `node tests/e2e.mjs http://127.0.0.1:8787` läuft er gegen einen laufenden `npx wrangler dev` (echte Cloudflare-Laufzeit).

**Lizenzen:** Schriften Bungee und Rubik unter SIL Open Font License (siehe `public/fonts/`). QR-Code-Generator von Kazuhiko Arase unter MIT-Lizenz (`public/js/qrcode.js`). Das Schullogo gehört der Karoline-Breitinger-Schule.

---

© 2026 Sven Klawitter
