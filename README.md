# KBS Stationsteam: Alle Hände voll!

Ein lautes Teamspiel für die generalistische Pflegeausbildung. Die Klasse wird in **Stationen** (Teams) aufgeteilt. Jedes Handy zeigt ein Pult mit Bedienelementen aus der Pflege: Knöpfe („Puls zählen“), Schalter („Bettgitter: unten / oben“), Schieberegler („Kopfteil 0° bis 90°“), Drehregler mit Auslöser („Insulin-Pen: 4 IE einstellen, dann spritzen“), Knöpfe zum Gedrückthalten („Druck auf die Wunde“) und zum Drücken im Takt („Herzdruckmassage“) sowie Ausklapp-Listen für die Patientenedukation aus KB2 („Beratung: Ernährung“), Medikamente („Orales Antidiabetikum Metformin 500 mg morgens!“), Prophylaxen („Pneumonieprophylaxe: Atemstimulierende Einreibung 5 Minuten!“), den Pflegeprozess („Pflegeprozess auf Schritt 3!“) und Assessmentinstrumente („Braden-Skala: 11 Punkte eintragen!“). Dazu kommen ein paar lustige Aufgaben aus dem Stationsalltag („Kaffee kochen!“). Oben auf jedem Handy steht eine Aufgabe, aber das passende Element hat immer **jemand anderes** aus der Station. Also: laut rufen, zuhören, drücken! Ab dem Spätdienst kommen **Situationen** dazu („Frau K. hat starke Atemnot“): Die Station muss selbst erkennen, was zu tun ist.

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
| **Störungen** | An · Aus (voreingestellt: An) | Ab dem Spätdienst: Kaffeeflecken, Post-its und Krümel auf einzelnen Handys und gemeinsame Ereignisse mit Bonus (siehe unten) |
| **Tempo** | Ruhig · Normal · Schnell | Zeit für jede Aufgabe (Ruhig: 40 % mehr, Schnell: 25 % weniger) |
| **Themen** | Lagerung & Mobilisation · Hygiene · Prophylaxen · Vitalzeichen & Beobachtung · Notfälle & Erste Hilfe · Kommunikation (KB2) · Medikamente · Pflegeprozess & Assessment · Stationsalltag | Bedienelemente aus den gewählten Themen kommen zuerst. Reichen sie nicht, kommen andere dazu. Vom **Stationsalltag** liegt höchstens ein Element auf jedem Handy. Ist **Kommunikation (KB2)** an, hat jede Station die vier Formen der Patientenedukation, bei **Medikamente** 2 bis 4 Kategorien, bei **Prophylaxen** 2 bis 3 Prophylaxen, bei **Pflegeprozess & Assessment** den Pflegeprozess und 2 bis 3 Instrumente (siehe unten). Sind mehr als zwei dieser vier Listen-Themen an, wechseln sie sich ab (siehe „Listen-Themen abwechselnd“). Ist ein Thema aus, kommt es gar nicht vor. |
| **Ausbildungsjahr** | bis 1. AJ · bis 2. AJ · bis 3. AJ (voreingestellt: bis 2. AJ) | Welche Medikamenten-Kategorien vorkommen, passend zum Jahrgang (siehe unten). Steht unter den Themen. |
| **Assessment** | Einfach · Schwer (voreingestellt: Einfach) | *Einfach:* Punktzahl eintragen. *Schwer:* Ergebnis einordnen (z. B. 11 Punkte → hohes Risiko). Steht unter den Themen. |

### Die Bedienelemente

| Art | So wird es bedient | Beispiele |
|---|---|---|
| **Knopf** | einmal antippen | Puls zählen, Nachttisch desinfizieren, Kaffee kochen |
| **Gedrückt halten** | drücken und halten, bis der Balken voll ist (3 bis 4 Sekunden). Zu früh losgelassen: „Länger halten!“ | Hände desinfizieren (mit dem Hinweis „in echt 30 s“), Druck auf die Wunde, Verschnaufen |
| **Im Takt drücken** | 10-mal drücken, eine Lampe blinkt im Takt 100 bis 120 pro Minute. Viel zu schnell oder zu langsam (mehr als 10 daneben): nochmal | Herzdruckmassage |
| **Schalter** | eine von zwei Stellungen antippen | Bettgitter, Handschuhe, Fenster, „Kannst du einspringen?“ |
| **Stufen** | eine von 3 bis 4 Stufen antippen | Lagerung 30° links / Rücken / 30° rechts, Sauerstoff, Kaffee |
| **Schieberegler** | den Griff ziehen (rastet ein) oder eine Markierung antippen. Es zählt die Stellung beim Loslassen | Kopfteil 0° bis 90°, Fußteil, Betthöhe, Laufrate (Infusionspumpe) 25 bis 500 ml/h, **NRS 0 bis 10**, Radio |
| **Ausklapp-Liste** | die Zeile antippen, die Liste klappt über dem Pult auf, einen Eintrag antippen („Zurück“ schließt ohne Änderung) | Patientenedukation: Information, Anleitung, Schulung, Beratung mit den Themen Ernährung, Mobilisation, Diabetes, COPD, Medikamente, Sturzprophylaxe; **VRS**: kein Schmerz, leicht, mäßig, stark, sehr stark, unaushaltbar; **Pflegeprozess** (6 Schritte); **Assessment** (einfach: Zahlen als Raster, schwer: Einstufungen) |
| **Gesichter** | eines von sechs gezeichneten Gesichtern antippen (lachend bis weinend, darunter 0, 2, 4, 6, 8, 10) | **Smiley-Skala** |
| **Drehregler + Knopf** | erst den Wert einstellen (drehen oder ‹ ›), dann auslösen. Nur der richtige Wert zählt, Drehen allein zählt nicht | Insulin-Pen 2 bis 12 IE + „Spritzen“, Perfusor 1 bis 20 ml/h + „Start“ |
| **Prophylaxe** | die Prophylaxe antippen, eine Liste mit Maßnahmen klappt auf. Maßnahme antippen, dann die Zahl mit **‹ ›** einstellen (oder die Zahl darunter antippen), dann **„Durchführen“**. „Zurück“ führt zur Liste bzw. schließt | Pneumonie, Thrombose, Dekubitus, Sturz … |
| **Medikament** | die Kategorie antippen, ein Blatt klappt auf: **Wirkstoff**, **Dosis** und **Zeitpunkt** antippen, dann **„Geben“**. „Geben“ geht erst, wenn alles gewählt ist; „Zurück“ schließt ohne Aktion | Diuretika, Orale Antidiabetika, Opioide (BtM) … |

Auf jedem Handy liegen höchstens zwei breite Elemente (Stufen, Schieberegler, Drehregler), damit alles auch auf kleine Bildschirme passt.

### Schmerzskalen

Drei Skalen im Thema „Vitalzeichen & Beobachtung“, ohne feste Gruppe (sie können auf verschiedene Stationen verteilt sein):

| Skala | Bedienung | Anweisung | Beispiel-Situation |
|---|---|---|---|
| **NRS** | Schieberegler 0 bis 10 | „NRS auf 7 stellen!“ | „Mein Schmerz ist 7 von 10.“ → NRS: 7 |
| **VRS** | Ausklapp-Liste mit sechs Wörtern | „VRS: starker Schmerz!“ | „Mein Schmerz ist mäßig.“ → VRS: mäßig |
| **Smiley-Skala** | sechs Gesichter mit 0, 2, 4, 6, 8, 10 | „Smiley-Skala: Gesicht 8!“ | „Paul (5 Jahre) kann noch keine Zahlen. Er zeigt auf das Gesicht mit der 6.“ → Smiley-Skala: 6 |

### Kommunikation (KB2): Patientenedukation

Ist das Thema **Kommunikation (KB2)** an, bekommt jede Station alle vier Formen der Patientenedukation: **Information**, **Anleitung**, **Schulung** und **Beratung**. Sie werden zufällig verteilt, **höchstens zwei pro Handy**: Mal haben vier Personen je eine Form, mal haben zwei Personen je zwei und die anderen keine. Jede Form hat eine Ausklapp-Liste mit Themen.

- **Anweisung:** „Patientenedukation: Beratung – Ernährung!“ Wer „Beratung“ hat, stellt die Liste auf „Ernährung“.
- **Situation (ab dem Spätdienst):** z. B. „Frau M. hat neu Diabetes. Du zeigst ihr, wie sie Insulin spritzt, und sie übt es selbst.“ → Anleitung: Diabetes. Die Station muss Form **und** Thema erkennen. Es gibt 12 Situationen, 3 pro Form, nach diesen Definitionen:
  - **Information:** gezielt Wissen weitergeben (Infoblatt, kurze Auskunft)
  - **Anleitung:** eine Fertigkeit zeigen und üben lassen
  - **Schulung:** geplant und strukturiert, oft in der Gruppe oder über mehrere Termine
  - **Beratung:** ergebnisoffenes Gespräch, der Patient entscheidet selbst

Mit allen Themen an kommt etwa jede vierte Anweisung aus der Patientenedukation. Wer es seltener möchte, schaltet das Thema am Beamer aus. Auf der Übungsseite liegen höchstens zwei Formen auf dem Pult, außer man wählt nur „Kommunikation (KB2)“: Dann sind alle vier dabei.

### Medikamente

Ist das Thema **Medikamente** an, bekommt jede Station **2 bis 4 Kategorien**, zufällig aus den Kategorien bis zum gewählten Ausbildungsjahr (ist auch KB2 an: 2 bis 3). Jede Kategorie ist ein Element auf einem Handy. **Auf einem Handy liegen höchstens zwei Ausklapp-Elemente** (KB2-Formen, Medikamente und Prophylaxen zusammen), damit jeder im Frühdienst noch mindestens zwei normale Knöpfe hat. So hat mal eine Person zwei Kategorien, mal zwei Personen je eine.

- **Anweisung:** „Orales Antidiabetikum Metformin 500 mg morgens!“ Wer „Orale Antidiabetika“ hat, tippt das Element an und wählt **Metformin**, **500 mg** und **morgens**, dann **„Geben“**. Nur wenn alle drei stimmen, ist es ein Treffer (+2). Eine falsche Dosis oder ein falscher Zeitpunkt ist ein Fehlgriff (−1).
- **Ab dem Spätdienst** (bei „Steigend“) kommen Medikamente auch **ohne Kategorie**: „Metformin 500 mg morgens!“ Dann muss die Station wissen, wer Metformin hat. Das zählt wie eine Situation: mehr Zeit, nach der Hälfte erscheint ein Tipp mit der Kategorie, und Verpasstes steht in „Das war knifflig“.
- Als Anweisung kommen nur die **üblichen Kombinationen** vor (also nie „Furosemid zur Nacht“). Auf dem Blatt stehen aber immer alle vier Zeitpunkte (morgens, mittags, abends, zur Nacht), damit man nicht raten kann.

| Kategorie | AJ | Wirkstoffe (Übungsbeispiele) |
|---|---|---|
| Antikoagulanzien | 1 | Phenprocoumon 1,5 / 3 mg abends · Apixaban 2,5 / 5 mg morgens, abends · Enoxaparin 20 / 40 mg abends |
| Diuretika | 1 | Furosemid 20 / 40 mg morgens, mittags · Torasemid 5 / 10 mg morgens · Spironolacton 25 / 50 mg morgens |
| Antihypertensiva | 1 | Ramipril 2,5 / 5 mg · Bisoprolol 2,5 / 5 mg · Amlodipin 5 / 10 mg, jeweils morgens |
| Laxanzien | 1 | Macrogol 1 / 2 Beutel morgens · Lactulose 10 / 20 ml morgens · Bisacodyl 5 / 10 mg zur Nacht |
| Inhalativa | 1 | Budesonid 1 / 2 Hübe morgens, abends · Formoterol 1 / 2 Hübe morgens, abends · Tiotropium 2 Hübe morgens |
| Orale Antidiabetika | 2 | Metformin 500 / 850 / 1000 mg morgens, abends · Sitagliptin 50 / 100 mg morgens · Glimepirid 1 / 2 / 3 mg morgens |
| Nicht-Opioide | 2 | Paracetamol 500 / 1000 mg · Ibuprofen 400 / 600 mg · Metamizol 500 / 1000 mg, über den Tag verteilt |
| Opioide (BtM) | 2 | Tilidin/Naloxon 50/4 / 100/8 mg · Morphin retard 10 / 30 mg · Oxycodon retard 5 / 10 mg, jeweils morgens, abends |
| Parkinson-Mittel | 3 | Levodopa/Benserazid 62,5 / 125 mg · Pramipexol 0,18 / 0,35 mg, jeweils morgens, mittags, abends |
| Antiepileptika | 3 | Levetiracetam 500 / 1000 mg · Valproinsäure 300 / 500 mg morgens, abends · Lamotrigin 50 / 100 mg morgens |
| Schilddrüsenmittel | 3 | L-Thyroxin 50 / 75 / 100 µg morgens · Thiamazol 5 / 10 mg morgens |
| Psychopharmaka | 3 | Mirtazapin 15 / 30 mg zur Nacht · Sertralin 50 / 100 mg morgens · Quetiapin 25 / 50 mg zur Nacht |

**Achtung:** Alle Dosen und Zeitpunkte sind gängige **Übungsbeispiele**, keine Verordnung. Bitte fachlich prüfen und in `inhalte.js` (ganz unten, `MEDIKAMENTE`) an euren Unterricht anpassen. Antidepressiva und Neuroleptika stehen in eurem Curriculum schon im 2. AJ (Psychiatrie). Wer sie dort üben will, ändert bei „Psychopharmaka“ `aj: 3` in `aj: 2`. Die Einstellung heißt am Beamer „Ausbildungsjahr“ (unter den Themen). Die Übungsseite hat dieselbe Einstellung und unter „Zum Nachlesen“ eine Liste aller Kategorien mit Wirkstoffen.

### Prophylaxen

Ist das Thema **Prophylaxen** an, bekommt jede Station **2 bis 3 Prophylaxen**. Jede ist ein Element auf einem Handy, z. B. „Pneumonie“ (darunter klein „Prophylaxe“). Dazu gehören im Thema noch Wechseldruckmatratze, Fingertest und Kostform als normale Bedienelemente.

- **Anweisung:** „Pneumonieprophylaxe: Atemstimulierende Einreibung 5 Minuten!“ Wer „Pneumonie“ hat, tippt das Element an, wählt **Atemstimulierende Einreibung** aus der Liste, stellt mit **‹ ›** auf **5 Minuten** und drückt **„Durchführen“**. Nur wenn Maßnahme und Zahl stimmen, ist es ein Treffer. Eine andere Zahl ist ein Fehlgriff.
- Es gibt drei Sorten Zahlen: **Dauer** („5 Minuten“), **Anzahl** („10-mal“) und **Abstand** („alle 2 Stunden“, „stündlich“). Manche Maßnahmen haben keine Zahl („Kompressionsstrümpfe anziehen“): Dann steht nur „Keine Zahl nötig“ da.
- Als Anweisung kommen nur die **üblichen Zahlen** vor. Auf dem Handy stehen aber immer alle Zahlen der Sorte zur Auswahl (Dauer 3, 5, 10, 15 Minuten · Anzahl 5, 10, 15, 20 · Abstand 1, 2, 3, 4 Stunden), damit man nicht raten kann.
- **Ab dem Spätdienst** kommt die Anweisung manchmal **ohne Prophylaxe**: „Atemstimulierende Einreibung 5 Minuten!“ Wer hat die Pneumonieprophylaxe? Das zählt wie eine Situation (Tipp nach der halben Zeit). Darum gehört **jede Maßnahme nur zu einer Prophylaxe** (ein Test prüft das).
- In **Situationen** zählt die richtige Maßnahme, **die Zahl ist egal**: „Herr M. atmet nach der OP nur flach.“ → Pneumonieprophylaxe: Atemtrainer oder Atemstimulierende Einreibung (jede Zahl). In `inhalte.js` schreibt man dafür bei „tun“ nur Prophylaxe und Maßnahme: `'Pneumonieprophylaxe: Atemtrainer'`.

| Prophylaxe | Maßnahmen (Übungsbeispiele) |
|---|---|
| Pneumonie | Atemstimulierende Einreibung 5 / 10 Minuten · Atemtrainer 10 / 15-mal · Lippenbremse 5 / 10-mal |
| Thrombose | Fußgymnastik 10 / 20-mal · Bettfahrrad 5 / 10 Minuten · Kompressionsstrümpfe anziehen |
| Dekubitus | Positionswechsel alle 2 / 3 / 4 Stunden · Mikrolagerung durchführen · Fersen freilagern |
| Kontrakturen | Gelenke durchbewegen 5 / 10-mal · Bewegungsübungen 10 / 20-mal · Fußstütze anbringen |
| Obstipation | Kolonmassage 5 / 10 Minuten · Ballaststoffe anbieten |
| Soor und Parotitis | Mundpflege alle 2 / 4 Stunden · Lippenpflege machen · Kaugummi anbieten |
| Dehydration | Getränk anbieten stündlich / alle 2 Stunden · Trinkprotokoll führen |
| Sturz | Gehtraining 5 / 10 Minuten · Stoppersocken anziehen · Klingel in Reichweite legen |

**Achtung:** Alle Zahlen sind **Übungsbeispiele**. Bitte fachlich prüfen und in `inhalte.js` (ganz unten, `PROPHYLAXEN`) anpassen. Die Übungsseite hat unter „Zum Nachlesen“ eine Liste aller Prophylaxen mit ihren Maßnahmen.

### Pflegeprozess & Assessment

Ist das Thema **Pflegeprozess & Assessment** an, hat jede Station **immer den Pflegeprozess** und dazu **2 bis 3 Assessmentinstrumente**.

**Pflegeprozess** (6 Schritte nach Fiechter und Meier): eine Ausklapp-Liste mit Informationssammlung, Probleme und Ressourcen erkennen, Pflegeziele festlegen, Pflegemaßnahmen planen, Pflege durchführen, Evaluation (Bewertung).
- Anweisungen in zwei Formen, zufällig gemischt: „Pflegeprozess auf Schritt 3!“ oder „Pflegeprozess: Evaluation!“
- Im **Frühdienst** stehen in der Liste die Nummern dabei („Schritt 3: Pflegeziele festlegen“). **Ab dem Spätdienst** stehen nur die Namen da, in gemischter Reihenfolge: Dann muss man wissen, was Schritt 3 ist.
- 12 **Situationen** (2 pro Schritt), z. B. „Du prüfst mit Frau K.: Kann sie wieder allein essen? Ist das Ziel erreicht?“ → Evaluation.

**Assessmentinstrumente:** Jedes Instrument ist ein Element, darunter steht klein, was es einschätzt und welche Werte es gibt (z. B. „Dekubitusrisiko · 6–23 Punkte“). Am Beamer gibt es zwei Stufen (unter den Themen):
- **Einfach** (voreingestellt): „Braden-Skala: 11 Punkte eintragen!“ Wer die Braden-Skala hat, tippt im Zahlenraster die 11 an.
- **Schwer:** Im Frühdienst „Braden-Skala: hohes Risiko eintragen!“. Ab dem Spätdienst auch „Braden-Skala: 11 Punkte – einordnen!“: Dann muss man selbst „hohes Risiko“ wählen. Das zählt wie eine Situation (mehr Zeit, Tipp nach der halben Zeit, Verpasstes in „Das war knifflig“).

| Instrument | wofür | Einstufung (Übungsbeispiele, bitte prüfen) |
|---|---|---|
| Braden-Skala (6–23 Punkte) | Dekubitusrisiko | 19–23 kein · 15–18 geringes · 13–14 mittleres · 10–12 hohes · 6–9 sehr hohes Risiko |
| Norton-Skala (5–20 Punkte) | Dekubitusrisiko | 15–20 geringes · 13–14 erhöhtes · 5–12 hohes Risiko |
| Glasgow Coma Scale (3–15 Punkte) | Bewusstsein | 13–15 leichte · 9–12 mittelschwere · 3–8 schwere Störung |
| Bristol-Stuhlformenskala (Typ 1–7) | Stuhlform | Typ 1–2 Verstopfung · Typ 3–4 normal · Typ 5–7 Durchfall |
| BMI (16–35, ganze Zahlen) | Körpergewicht | 16–18 Untergewicht · 19–24 Normalgewicht · 25–29 Übergewicht · 30–35 Adipositas |

Die Instrumente stehen ganz unten in `inhalte.js` (`ASSESSMENTS`), dort lassen sich Grenzwerte und Bezeichnungen ändern. APGAR, Morse-Sturz-Skala, Timed Up and Go, Mini-Mental-Status-Test, Manchester-Triage-System, KUSS, BMI-Perzentilen und der Frowein-Score sind (noch) nicht eingebaut.

### Listen-Themen abwechselnd

KB2, Medikamente, Prophylaxen sowie Pflegeprozess & Assessment brauchen viel Platz auf dem Pult. Sind **mehr als zwei** davon an, kommen pro Schicht nur zwei dran, und jedes mindestens einmal:

| an sind | Frühdienst | Spätdienst | Nachtdienst |
|---|---|---|---|
| drei, z. B. KB2, Medikamente, Prophylaxen | KB2 und Medikamente | Medikamente und Prophylaxen | KB2 und Prophylaxen |
| alle vier | KB2 und Medikamente | Prophylaxen und Pflegeprozess & Assessment | KB2 und Pflegeprozess & Assessment |

(Bei drei gilt die Reihenfolge KB2, Medikamente, Prophylaxen, Pflegeprozess & Assessment: die ersten beiden, die letzten beiden, der erste und der letzte.) Der Beamer zeigt das oben in der Schicht und in der Übergabe an („Listen: …“). Sind höchstens zwei an, gibt es keine Pause.

### Störungen und Ereignisse (ab dem Spätdienst)

**Störungen auf einzelnen Handys:** Pro Station landet etwa alle 30 bis 60 Sekunden eine Störung auf einem Handy. Sie liegt über ein oder zwei Bedienelementen, und darunter lässt sich nichts drücken, bis sie weg ist:

| Störung | Wegmachen |
|---|---|
| **Kaffee verschüttet!** | mit dem Finger wegwischen |
| **Kuchenkrümel!** | wegwischen |
| **Post-it-Flut!** | die Zettel einzeln wegtippen |

Antippen hilft auch beim Wischen (etwa fünfmal). So klappt es auf jedem Handy.

**Gemeinsame Ereignisse:** Im Spätdienst gibt es eins, im Nachtdienst zwei (bei Schichten unter 1,5 Minuten eins). Der Beamer kündigt sie mit Ton an, alle Handys zeigen sie groß, und nach 3 Sekunden geht es los. Jede Station hat 15 Sekunden Zeit. **Macht die ganze Station mit, gibt es +10 % vom Schichtziel.** Am Beamer sieht man live, wie viele pro Station fertig sind.

| Ereignis | Was alle tun | Wann |
|---|---|---|
| **Rea-Alarm im Haus!** | 10-mal im Takt drücken (100 bis 120 pro Minute). **Der Beamer gibt den Takt hörbar vor**, und auf dem Handy blinkt der Knopf im Takt | immer im Nachtdienst |
| **Hygiene-Begehung!** | Hände desinfizieren: 3 Sekunden halten | Spät- oder Nachtdienst |
| **Stromausfall!** | Der Bildschirm wird dunkel, alle schieben die Taschenlampe an | Spät- oder Nachtdienst |

Während eines Ereignisses ruhen die normalen Aufgaben: Ihre Zeit läuft erst danach weiter. Wer keine Verbindung hat, verhindert den Bonus nicht. Schütteln gibt es bewusst nicht (Erlaubnis-Abfrage auf iPhones, Handys könnten herunterfallen).

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

### Testlauf allein (3 Computer-Mitspieler)

Zum Ausprobieren ohne Klasse, z. B. bei der Unterrichtsvorbereitung:

1. `/lehrer` am Laptop öffnen und in der Anmeldung auf **„Testlauf allein“** klicken. Drei Computer-Mitspieler (**Robo A., Robo B., Robo C.**) melden sich an. Gleichzeitig öffnet sich ein zweites Fenster, die **Testansicht**. Sie zeigt die drei Handys der Computer-Mitspieler nebeneinander. Falls der Browser das Fenster blockiert: Pop-ups erlauben und oben auf **„Testansicht“** klicken.
2. Mit dem eigenen Handy den QR-Code scannen und anmelden (oder in einem zweiten Browserfenster `/mitspielen` öffnen und den Code eingeben). Mit 4 Personen entsteht genau eine Station. Beim Selbst-Wählen sitzen die Computer-Mitspieler sofort in ihrer Station; du wählst dieselbe und klickst **Jetzt verteilen**.
3. Schicht starten. **Deine Anweisungen erledigen die Computer-Mitspieler von selbst**, nach etwa 2 bis 4 Sekunden (Situationen etwas später), so als hätten sie dich rufen hören. **Was auf ihren Handys in der Testansicht steht, führst du auf deinem Handy aus**, sofern du das passende Element hast. Aufgaben untereinander und Ereignisse wie den Rea-Alarm erledigen sie selbst. Störungen wischen sie nach ein paar Sekunden weg.
4. Die Computer-Mitspieler machen **auch Fehler**: Manchmal greifen sie erst daneben (−1) und lassen eine Aufgabe verfallen, Situationen öfter als Anweisungen. So siehst du auch die Übergabe mit „Das war knifflig“.
5. Danach in der Anmeldung **„Computer entfernen“** klicken (oder einzeln mit ×).

Die Computer-Mitspieler laufen auf dem Server (Cloudflare), nicht im Browser. Sie handeln mit dem Takt des Beamers, die Lehrer-Seite muss also geöffnet bleiben. Die Testansicht zeigt nur an, dort kann man nichts drücken. Wie schnell sie sind und wie oft sie Fehler machen, steht in `public/js/regeln.js` unter `COMPUTER`.

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

**Eine Ausklapp-Liste** (2 bis 8 Einträge; `gruppe` sorgt dafür, dass alle Elemente der Gruppe zusammen in eine Station kommen, jedes auf ein anderes Handy):
```js
{ id: 'beratung', thema: 'kommunikation', art: 'auswahl', gruppe: 'edukation', name: 'Beratung', hinweis: 'Patientenedukation',
  stufen: EDU_THEMEN, befehl: 'Patientenedukation: Beratung – #!' },
```
Die Themen der Patientenedukation stehen einmal oben in der Liste `EDU_THEMEN` und gelten für alle vier Formen.

**Gedrückt halten** und **im Takt drücken**:
```js
{ id: 'wunde', thema: 'notfall', art: 'halten', name: 'Druck auf die Wunde', sekunden: 3 },
{ id: 'hdm', thema: 'notfall', art: 'takt', name: 'Herzdruckmassage', anzahl: 10, min: 100, max: 120 },
```

**Eine Situation** (`tun` genau so geschrieben wie auf dem Handy, bei Elementen mit Stufen mit Doppelpunkt und Stufe):
```js
{ text: 'Frau K. hat starke Atemnot (Dyspnoe).', tun: ['Kopfteil: 60°', 'Kopfteil: 90°', 'SpO2 messen'] },
{ text: 'Infusion: 500 ml in 5 Stunden. Wie viel ml pro Stunde?', tun: ['Laufrate: 100 ml/h'] },
```

- Die Kennung (`id`) einmal festlegen und dann nicht mehr ändern.
- Es braucht **mindestens 36 Bedienelemente** (6 Personen × 6 Elemente im Nachtdienst). Enthalten sind 70 Elemente (davon 4 für die Patientenedukation, der Pflegeprozess und 14 aus dem Stationsalltag), 12 Medikamenten-Kategorien, 8 Prophylaxen, 5 Assessmentinstrumente und 104 Situationen.
- **Situationen höchstens 90 Zeichen**, damit Aufgabe und Pult auch auf kleine Handys passen (ein Test prüft das). Lange Aufgaben werden auf dem Handy automatisch etwas kleiner geschrieben.
- **Bezeichnungen nicht doppelt verwenden:** Namen von Elementen sollten nicht wie eine Form der Patientenedukation klingen (z. B. „anleiten“) und nicht wie ein Eintrag ihrer Liste heißen (z. B. „Mobilisation“). Darum heißt das Element mit Bettkante / Stuhl / Flur „Aufstehen“. Ein Test prüft das.
- **Rechen-Situationen:** Laufrate (Infusionspumpe) und Perfusor, **sehr einfach**: runde Zahlen, nur durch 1, 2, 5 oder 10 teilen (z. B. „500 ml in 5 Stunden. Wie viel ml pro Stunde?“ → 100 ml/h). Ein Test prüft bei jeder Aufgabe in der Form „… 500 ml in 5 Stunden …“, ob sie so einfach ist und die Lösung stimmt. **Insulin:** zwei Situationen mit einem kurzen Korrekturschema im Text, dort wird nur abgelesen, nicht gerechnet. Die Schemata und Zahlen sind **erfundene Übungsbeispiele**. Passe sie an das an, was ihr im Unterricht verwendet.
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
| `public/js/pult.js` | das Pult auf dem Handy: Knopf, Halten, Takt, Schalter, Stufen, Schieberegler, Drehregler, Ausklapp-Liste, Medikament, Prophylaxe |
| `public/js/ui.js` | gemeinsame Bausteine: Aufgabe mit Zeitbalken, Tipp, Verblassen, Countdown |
| `public/js/lehrer.js` | Beamer-Seite: Anmeldung, Stationen, Schichten, Übergabe, Siegerehrung |
| `public/js/mitspielen.js` | Handy-Seite |
| `public/js/ueben.js` | Übungsseite mit Lernliste aller Situationen |
| `public/js/testansicht.js` | Testansicht für den Testlauf allein: die Handys der Computer-Mitspieler nebeneinander |
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
node tests/testlauf.mjs             # Testlauf allein: Beamer, Testansicht mit 3 Computer-Mitspielern, ein Handy
```

Der Browser-Durchlauf startet einen Beamer und 7 Handys (eines davon klein, 360 × 640). Er prüft Anmeldung, Stationen selbst wählen (eine Station läuft voll, jemand wechselt, eine Person wählt nicht und wird nach den 60 Sekunden zugelost), Tauschen am Beamer, alle drei Schichten mit Spiel-Robotern (eine Station spielt sauber, eine verpasst manches und greift daneben; dabei wird geprüft, dass keine Aufgabe auf dem eigenen Handy landet), eine Nachzüglerin, die mitten in der Schicht ihre Station wählt, Neuladen von Handy und Beamer, Tipps, Verblassen, „Das war knifflig“, Siegerehrung, „Nochmal“, die Übungsseite und dass nur der Beamer Töne macht. Die Spiel-Roboter bedienen alle Arten: Sie halten, drücken im Takt, stellen Dosen ein und schieben Regler. Bei Störungen wischen und tippen die Roboter erst alles weg. Bei Ereignissen macht ein „Träumer“ absichtlich nicht mit. Geprüft wird, dass nur die vollständige Station den Bonus bekommt und im Nachtdienst der Rea-Alarm kommt. Ein eigener **Bauteil-Test** prüft jede Eingabeart mit echten Fingerbewegungen auf einem kleinen Handy: Schieberegler ziehen (nur die Endstellung zählt), Drehregler drehen und mit ‹ › nachstellen (Drehen allein löst nichts aus), Ausklapp-Liste öffnen und wählen („Zurück“ und das gleiche Thema lösen nichts aus), zu kurz und lange genug halten, viel zu schnell und im Takt drücken, Störungen (darunter löst nichts aus, Wegwischen und Wegtippen funktioniert), Schmerzskalen (NRS ziehen, Gesicht antippen, VRS wählen), Medikamente („Geben“ erst, wenn alles gewählt ist; eine Kombination, die es nicht gibt, ist ein Fehlgriff; lange Wirkstoffnamen passen), Prophylaxen (Liste, Zahl mit ‹ › oder antippen, „Zurück“ zur Liste, Maßnahme ohne Zahl, unübliche Zahl = Fehlgriff), Pflegeprozess (mit Nummern, ohne Nummern gemischt) und Assessment (Zahlenraster, Einstufung), und ob alles auf 360 × 640 Pixel passt, auch im ungünstigsten Fall (längste Situation mit Tipp, zwei breite Elemente, Ausklapp-Zeilen). Mit `node tests/e2e.mjs http://127.0.0.1:8787` läuft er gegen einen laufenden `npx wrangler dev` (echte Cloudflare-Laufzeit).

Der Test für den **Testlauf allein** öffnet den Beamer, klickt „Testlauf allein“, prüft die Testansicht mit den drei Computer-Handys und spielt mit einem Handy Früh- und Spätdienst: Das Handy führt aus, was auf den Computer-Handys steht, und die Computer-Mitspieler erledigen die Anweisungen des Handys. Die Logik-Tests prüfen außerdem, dass sie nicht schneller als 2 Sekunden sind, auch Fehler machen und beim Ereignis mitmachen (der Bonus kommt erst, wenn auch der Mensch mitmacht).

**Lizenzen:** Schriften Bungee und Rubik unter SIL Open Font License (siehe `public/fonts/`). QR-Code-Generator von Kazuhiko Arase unter MIT-Lizenz (`public/js/qrcode.js`). Das Schullogo gehört der Karoline-Breitinger-Schule.

---

© 2026 Sven Klawitter
