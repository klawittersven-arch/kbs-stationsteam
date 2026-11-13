/*
 * DIE INHALTE DES SPIELS: Bedienelemente und Situationen.
 *
 * Diese Datei lesen Handys, Beamer UND der Cloudflare-Dienst. Nach dem Hochladen auf GitHub (Branch main)
 * gilt sie nach ein bis zwei Minuten überall.
 *
 * So änderst du etwas auf GitHub: Datei öffnen, auf den Stift klicken, nur den Text zwischen den
 * Hochkommas ' … ' ändern, unten „Commit changes“ klicken. Kommas und Klammern bitte stehen lassen.
 * Ein Hochkomma IM Text schreibst du als ’ (oder als \').
 *
 * -------------------------------------------------------------------------------------------------
 * 1) THEMEN: Jedes Bedienelement gehört zu einem Thema. Am Beamer kann man Themen an- und ausschalten.
 *    lustig: true  heißt: zum Lachen, nur als Anweisung, höchstens ein Element davon pro Handy.
 *
 * 2) BEDIENELEMENTE: Daraus wird das Pult auf jedem Handy gebaut. Es gibt acht Arten:
 *      art: 'knopf'     ein Knopf zum Antippen, z. B. „Puls zählen“
 *      art: 'halten'    ein Knopf, den man gedrückt halten muss (sekunden: 3), z. B. „Druck auf die Wunde“
 *      art: 'takt'      ein Knopf, den man mehrmals im Takt drückt (anzahl: 10, min: 100, max: 120 pro Minute),
 *                       z. B. „Herzdruckmassage“
 *      art: 'schalter'  zwei Stellungen, z. B. Bettgitter: unten / oben
 *      art: 'stufen'    2 bis 5 Stufen zum Antippen, z. B. Lagerung: 30° links / Rücken / 30° rechts
 *      art: 'regler'    Schieberegler mit 3 bis 7 Stufen zum Ziehen, z. B. Kopfteil: 0° / 15° / 30° …
 *      art: 'dosis'     Drehregler mit 2 bis 12 Stufen und einem Knopf zum Auslösen (knopf: 'Spritzen'),
 *                       z. B. Insulin-Pen: erst 4 IE einstellen, dann „Spritzen“ drücken
 *      art: 'auswahl'   eine Zeile zum Ausklappen mit 2 bis 8 Einträgen, z. B. Beratung: Ernährung / Diabetes …
 *    id       kurze Kennung, nur Kleinbuchstaben (nicht mehr ändern, wenn sie einmal da ist)
 *    name     Beschriftung auf dem Handy (kurz halten!)
 *    stufen   (Schalter, Stufen, Regler, Dosis, Auswahl) die Stellungen bzw. Einträge
 *    befehl   Text der Anweisung. Ohne Angabe: der Name mit „!“.
 *             Bei Elementen mit Stufen steht # für die Stufe: '# Insulin spritzen!' → „4 IE Insulin spritzen!“
 *    befehle  (wahlweise, statt befehl) eine Anweisung je Stufe, in derselben Reihenfolge. Ohne Angabe: „Name: Stufe!“
 *    hinweis  (wahlweise) kleiner Text auf dem Knopf, z. B. 'in echt 30 s' (kurz!)
 *    gruppe   (wahlweise) Elemente mit derselben Gruppe kommen immer zusammen in eine Station,
 *             jedes auf ein anderes Handy (z. B. die vier Formen der Patientenedukation)
 *
 * 3) SITUATIONEN: Ab dem Spätdienst erscheinen statt mancher Anweisungen kurze Situationen.
 *    Das Team muss selbst erkennen, was zu tun ist.
 *    text  die Situation (kurz, einfache Sprache)
 *    tun   was richtig ist, GENAU so geschrieben wie auf dem Handy:
 *            bei Knopf, Halten, Takt:                'Puls zählen'
 *            bei Schalter, Stufen, Regler, Dosis, Auswahl:   'Kopfteil: 90°'   (Name, Doppelpunkt, Stufe)
 *          Mehrere richtige Möglichkeiten in eckigen Klammern mit Komma: ['Puls zählen', 'Blutdruck messen']
 *    Situationen, deren „tun“ zu keinem Bedienelement passt, werden übersprungen.
 *    Der Beamer zeigt dann in der Anmeldung einen Hinweis.
 *
 * Tipp: Neue Bedienelemente und Situationen einfach unten in der passenden Gruppe ergänzen.
 * Für das Spiel braucht es mindestens 36 Bedienelemente (6 Personen × 6 Elemente in der Nachtschicht).
 * Die Rechenaufgaben (Infusion, Perfusor) und die Korrekturschemata für Insulin sind erfundene Übungsbeispiele.
 * Rechenaufgaben bitte SEHR einfach halten: runde Zahlen, nur durch 1, 2, 5 oder 10 teilen.
 * Schreibweise: '… 500 ml in 5 Stunden …' (ein Test prüft dann, ob die Lösung stimmt).
 * -------------------------------------------------------------------------------------------------
 */

export const THEMEN = [
  { id: 'lagerung', name: 'Lagerung & Mobilisation' },
  { id: 'hygiene', name: 'Prophylaxen & Hygiene' },
  { id: 'vital', name: 'Vitalzeichen & Beobachtung' },
  { id: 'notfall', name: 'Notfälle & Erste Hilfe' },
  { id: 'kommunikation', name: 'Kommunikation (KB2)' },
  { id: 'alltag', name: 'Stationsalltag (zum Lachen)', lustig: true },
];

// Themen der Patientenedukation (Einträge in der Ausklapp-Liste, bis zu 8)
const EDU_THEMEN = ['Ernährung', 'Mobilisation', 'Diabetes', 'COPD', 'Medikamente', 'Sturzprophylaxe'];

export const PULT = [
  // ---------------------------------------------------------------- Lagerung & Mobilisation
  { id: 'kopfteil', thema: 'lagerung', art: 'regler', name: 'Kopfteil', stufen: ['0°', '15°', '30°', '45°', '60°', '90°'],
    befehl: 'Kopfteil auf # stellen!' },
  { id: 'fussteil', thema: 'lagerung', art: 'regler', name: 'Fußteil', stufen: ['0°', '10°', '20°', '30°'],
    befehl: 'Fußteil auf # stellen!' },
  { id: 'lagerung', thema: 'lagerung', art: 'stufen', name: 'Lagerung', stufen: ['30° links', 'Rücken', '30° rechts'],
    befehle: ['30°-Lagerung nach links!', 'Auf den Rücken drehen!', '30°-Lagerung nach rechts!'] },
  { id: 'mobilisation', thema: 'lagerung', art: 'stufen', name: 'Mobilisation', stufen: ['Bettkante', 'Stuhl', 'Flur'],
    befehle: ['An die Bettkante setzen!', 'In den Stuhl setzen!', 'Auf dem Flur gehen!'] },
  { id: 'licht', thema: 'lagerung', art: 'stufen', name: 'Licht', stufen: ['aus', 'Nachtlicht', 'hell'],
    befehle: ['Licht aus!', 'Nachtlicht an!', 'Licht ganz hell!'] },
  { id: 'bettgitter', thema: 'lagerung', art: 'schalter', name: 'Bettgitter', stufen: ['unten', 'oben'],
    befehle: ['Bettgitter runter!', 'Bettgitter hoch!'] },
  { id: 'betthoehe', thema: 'lagerung', art: 'regler', name: 'Betthöhe', stufen: ['ganz tief', 'tief', 'mittel', 'Arbeitshöhe'],
    befehle: ['Bett ganz tief stellen!', 'Bett auf „tief“ stellen!', 'Bett auf mittlere Höhe!', 'Bett auf Arbeitshöhe!'] },
  { id: 'rollstuhl', thema: 'lagerung', art: 'schalter', name: 'Rollstuhlbremse', stufen: ['gelöst', 'fest'],
    befehle: ['Rollstuhlbremse lösen!', 'Rollstuhlbremse feststellen!'] },
  { id: 'sichtschutz', thema: 'lagerung', art: 'schalter', name: 'Sichtschutz', stufen: ['weg', 'aufgestellt'],
    befehle: ['Sichtschutz wegstellen!', 'Sichtschutz aufstellen!'] },
  { id: 'fenster', thema: 'lagerung', art: 'schalter', name: 'Fenster', stufen: ['zu', 'offen'],
    befehle: ['Fenster zumachen!', 'Fenster auf zum Lüften!'] },
  { id: 'klingel', thema: 'lagerung', art: 'knopf', name: 'Klingel in Reichweite', befehl: 'Klingel in Reichweite legen!' },
  { id: 'socken', thema: 'lagerung', art: 'knopf', name: 'Rutschfeste Socken', befehl: 'Rutschfeste Socken anziehen!' },
  { id: 'rollator', thema: 'lagerung', art: 'knopf', name: 'Rollator holen' },

  // ---------------------------------------------------------------- Prophylaxen & Hygiene
  { id: 'haende', thema: 'hygiene', art: 'halten', name: 'Hände desinfizieren', sekunden: 3, hinweis: 'in echt 30 s' },
  { id: 'handschuhe', thema: 'hygiene', art: 'schalter', name: 'Handschuhe', stufen: ['aus', 'an'],
    befehle: ['Handschuhe ausziehen!', 'Handschuhe anziehen!'] },
  { id: 'kittel', thema: 'hygiene', art: 'schalter', name: 'Schutzkittel', stufen: ['aus', 'an'],
    befehle: ['Schutzkittel ausziehen!', 'Schutzkittel anziehen!'] },
  { id: 'maske', thema: 'hygiene', art: 'schalter', name: 'Maske', stufen: ['ab', 'auf'],
    befehle: ['Maske absetzen!', 'Maske aufsetzen!'] },
  { id: 'matratze', thema: 'hygiene', art: 'schalter', name: 'Wechseldruckmatratze', stufen: ['aus', 'an'],
    befehle: ['Wechseldruckmatratze aus!', 'Wechseldruckmatratze an!'] },
  { id: 'kost', thema: 'hygiene', art: 'stufen', name: 'Kostform', stufen: ['Vollkost', 'weich', 'passiert'],
    befehle: ['Kostform: Vollkost!', 'Kostform: weiche Kost!', 'Kostform: passiert!'] },
  { id: 'nachttisch', thema: 'hygiene', art: 'knopf', name: 'Nachttisch desinfizieren' },
  { id: 'abwurf', thema: 'hygiene', art: 'knopf', name: 'Kanülenabwurf', befehl: 'Ab in den Kanülenabwurf!' },
  { id: 'atemuebung', thema: 'hygiene', art: 'knopf', name: 'Atemübung anleiten' },
  { id: 'mts', thema: 'hygiene', art: 'knopf', name: 'Kompressionsstrümpfe', befehl: 'Kompressionsstrümpfe anziehen!' },
  { id: 'fussgymnastik', thema: 'hygiene', art: 'knopf', name: 'Fußgymnastik', befehl: 'Fußgymnastik anleiten!' },
  { id: 'trinken', thema: 'hygiene', art: 'knopf', name: 'Getränk anbieten' },
  { id: 'mundpflege', thema: 'hygiene', art: 'knopf', name: 'Mundpflege', befehl: 'Mundpflege machen!' },
  { id: 'fingertest', thema: 'hygiene', art: 'knopf', name: 'Fingertest', befehl: 'Fingertest machen!' },
  { id: 'mikrolagerung', thema: 'hygiene', art: 'knopf', name: 'Mikrolagerung', befehl: 'Mikrolagerung durchführen!' },

  // ---------------------------------------------------------------- Vitalzeichen & Beobachtung
  { id: 'blutdruck', thema: 'vital', art: 'knopf', name: 'Blutdruck messen' },
  { id: 'puls', thema: 'vital', art: 'knopf', name: 'Puls zählen' },
  { id: 'atemfrequenz', thema: 'vital', art: 'knopf', name: 'Atemfrequenz zählen' },
  { id: 'temperatur', thema: 'vital', art: 'knopf', name: 'Temperatur messen' },
  { id: 'spo2', thema: 'vital', art: 'knopf', name: 'SpO2 messen', befehl: 'Sauerstoffsättigung (SpO2) messen!' },
  { id: 'blutzucker', thema: 'vital', art: 'knopf', name: 'Blutzucker messen' },
  { id: 'schmerz', thema: 'vital', art: 'knopf', name: 'Schmerzskala', befehl: 'Schmerzskala zeigen (0 bis 10)!' },
  { id: 'wiegen', thema: 'vital', art: 'knopf', name: 'Wiegen', befehl: 'Patient wiegen!' },
  { id: 'bilanz', thema: 'vital', art: 'knopf', name: 'Flüssigkeitsbilanz', befehl: 'Flüssigkeitsbilanz führen!' },
  { id: 'pupillen', thema: 'vital', art: 'knopf', name: 'Pupillen prüfen' },
  { id: 'infusion', thema: 'vital', art: 'schalter', name: 'Infusion', stufen: ['läuft', 'gestoppt'],
    befehle: ['Infusion laufen lassen!', 'Infusion stoppen!'] },
  { id: 'pumpe', thema: 'vital', art: 'regler', name: 'Infusionspumpe', stufen: ['25 ml/h', '50 ml/h', '100 ml/h', '250 ml/h', '500 ml/h'],
    befehl: 'Infusionspumpe auf # stellen!' },
  { id: 'perfusor', thema: 'vital', art: 'dosis', name: 'Perfusor', stufen: ['1 ml/h', '2 ml/h', '5 ml/h', '10 ml/h', '20 ml/h'],
    knopf: 'Start', befehl: 'Perfusor mit # starten!' },
  { id: 'insulin', thema: 'vital', art: 'dosis', name: 'Insulin-Pen', stufen: ['2 IE', '4 IE', '6 IE', '8 IE', '10 IE', '12 IE'],
    knopf: 'Spritzen', befehl: '# Insulin spritzen!' },

  // ---------------------------------------------------------------- Notfälle & Erste Hilfe
  { id: 'bewusstsein', thema: 'notfall', art: 'knopf', name: 'Bewusstsein prüfen' },
  { id: 'kopf', thema: 'notfall', art: 'knopf', name: 'Kopf überstrecken' },
  { id: 'seitenlage', thema: 'notfall', art: 'knopf', name: 'Stabile Seitenlage', befehl: 'Ab in die stabile Seitenlage!' },
  { id: 'notruf', thema: 'notfall', art: 'knopf', name: 'Notruf absetzen' },
  { id: 'notfallklingel', thema: 'notfall', art: 'knopf', name: 'Notfallklingel', befehl: 'Notfallklingel drücken!' },
  { id: 'hdm', thema: 'notfall', art: 'takt', name: 'Herzdruckmassage', anzahl: 10, min: 100, max: 120, befehl: 'Herzdruckmassage starten!' },
  { id: 'wunde', thema: 'notfall', art: 'halten', name: 'Druck auf die Wunde', sekunden: 3, befehl: 'Druck auf die Wunde ausüben!' },
  { id: 'aed', thema: 'notfall', art: 'knopf', name: 'AED holen', befehl: 'Defi (AED) holen!' },
  { id: 'traubenzucker', thema: 'notfall', art: 'knopf', name: 'Traubenzucker geben' },
  { id: 'beine', thema: 'notfall', art: 'knopf', name: 'Beine hochlagern' },
  { id: 'druckverband', thema: 'notfall', art: 'knopf', name: 'Druckverband anlegen' },
  { id: 'kuehlen', thema: 'notfall', art: 'knopf', name: 'Mit Wasser kühlen' },
  { id: 'ruecken', thema: 'notfall', art: 'knopf', name: 'Schläge auf den Rücken', befehl: 'Kräftige Schläge auf den Rücken!' },
  { id: 'wegraeumen', thema: 'notfall', art: 'knopf', name: 'Gegenstände wegräumen' },
  // Sauerstoff nur nach ärztlicher Anordnung: darum nur als Anweisung, ohne Situation
  { id: 'sauerstoff', thema: 'notfall', art: 'stufen', name: 'Sauerstoff', stufen: ['aus', '2 l/min', '4 l/min', '6 l/min'],
    befehle: ['Sauerstoff aus!', 'Sauerstoff auf 2 l/min!', 'Sauerstoff auf 4 l/min!', 'Sauerstoff auf 6 l/min!'] },

  // ---------------------------------------------------------------- Kommunikation (KB2): Patientenedukation
  // Die vier Formen kommen immer zusammen in eine Station, jede auf ein anderes Handy.
  //   Information: gezielt Wissen weitergeben (Infoblatt, kurze Auskunft)
  //   Anleitung:   eine Fertigkeit zeigen und üben lassen
  //   Schulung:    geplant und strukturiert, oft in der Gruppe oder über mehrere Termine
  //   Beratung:    ergebnisoffenes Gespräch, der Patient entscheidet selbst
  { id: 'information', thema: 'kommunikation', art: 'auswahl', gruppe: 'edukation', name: 'Information', hinweis: 'Patientenedukation',
    stufen: EDU_THEMEN, befehl: 'Patientenedukation: Information – #!' },
  { id: 'anleitung', thema: 'kommunikation', art: 'auswahl', gruppe: 'edukation', name: 'Anleitung', hinweis: 'Patientenedukation',
    stufen: EDU_THEMEN, befehl: 'Patientenedukation: Anleitung – #!' },
  { id: 'schulung', thema: 'kommunikation', art: 'auswahl', gruppe: 'edukation', name: 'Schulung', hinweis: 'Patientenedukation',
    stufen: EDU_THEMEN, befehl: 'Patientenedukation: Schulung – #!' },
  { id: 'beratung', thema: 'kommunikation', art: 'auswahl', gruppe: 'edukation', name: 'Beratung', hinweis: 'Patientenedukation',
    stufen: EDU_THEMEN, befehl: 'Patientenedukation: Beratung – #!' },

  // ---------------------------------------------------------------- Stationsalltag (zum Lachen, nur Anweisungen)
  { id: 'kaffee', thema: 'alltag', art: 'knopf', name: 'Kaffee kochen' },
  { id: 'kuli', thema: 'alltag', art: 'knopf', name: 'Kugelschreiber suchen' },
  { id: 'kuchen', thema: 'alltag', art: 'knopf', name: 'Kuchen anschneiden', befehl: 'Kuchen von den Angehörigen anschneiden!' },
  { id: 'schluessel', thema: 'alltag', art: 'knopf', name: 'Schlüssel suchen', befehl: 'Schlüssel für den Medikamentenschrank suchen!' },
  { id: 'visite', thema: 'alltag', art: 'knopf', name: 'Der Visite hinterher', befehl: 'Der Visite hinterherlaufen!' },
  { id: 'wunschbuch', thema: 'alltag', art: 'knopf', name: 'Dienstplan-Wunsch', befehl: 'Dienstplan-Wunsch eintragen!' },
  { id: 'doku', thema: 'alltag', art: 'knopf', name: 'Doku nachtragen' },
  { id: 'angehoerige', thema: 'alltag', art: 'knopf', name: 'Anruf vertrösten', befehl: 'Angehörigen-Anruf vertrösten!' },
  { id: 'frischluft', thema: 'alltag', art: 'knopf', name: 'Kaffeepause' },
  { id: 'pause', thema: 'alltag', art: 'halten', name: 'Pause machen', sekunden: 4, hinweis: 'endlich sitzen' },
  { id: 'einspringen', thema: 'alltag', art: 'schalter', name: 'Telefon: Einspringen?', stufen: ['ignorieren', 'annehmen'],
    befehle: ['„Kannst du einspringen?“ – Anruf ignorieren!', '„Kannst du einspringen?“ – Anruf annehmen!'] },
  { id: 'kaffeemaschine', thema: 'alltag', art: 'schalter', name: 'Kaffeemaschine', stufen: ['aus', 'an'],
    befehle: ['Kaffeemaschine aus!', 'Kaffeemaschine an!'] },
  { id: 'kaffeesorte', thema: 'alltag', art: 'stufen', name: 'Kaffee', stufen: ['schwarz', 'mit Milch', 'mit Zucker'],
    befehle: ['Kaffee schwarz!', 'Kaffee mit Milch!', 'Kaffee mit Zucker!'] },
  { id: 'radio', thema: 'alltag', art: 'regler', name: 'Radio', stufen: ['aus', 'leise', 'mittel', 'laut'],
    befehle: ['Radio aus!', 'Radio leise!', 'Radio auf mittel!', 'Radio laut!'] },
];

export const SITUATIONEN = [
  // ---------------------------------------------------------------- Lagerung & Mobilisation
  { text: 'Frau K. hat starke Atemnot (Dyspnoe).', tun: ['Kopfteil: 60°', 'Kopfteil: 90°', 'SpO2 messen'] },
  { text: 'Herr B. bekommt gleich Sondenkost über seine PEG-Sonde.', tun: ['Kopfteil: 30°', 'Kopfteil: 45°'] },
  { text: 'Frau L. hat dicke Unterschenkel durch eine Venenschwäche. Die Beine sollen höher liegen.', tun: ['Fußteil: 20°', 'Fußteil: 30°'] },
  { text: 'Frau A. hat am rechten Gesäß einen Dekubitus. Die Stelle muss frei von Druck sein.', tun: ['Lagerung: 30° links', 'Wechseldruckmatratze: an'] },
  { text: 'Herr L. hat an der linken Hüfte eine Druckstelle.', tun: ['Lagerung: 30° rechts'] },
  { text: 'Herr G. wurde gestern operiert. Heute darf er zum ersten Mal aufstehen.', tun: ['Mobilisation: Bettkante'] },
  { text: 'Frau R. ist fit und möchte zum Essen nicht im Bett bleiben.', tun: ['Mobilisation: Stuhl'] },
  { text: 'Frau E. ist dement. Nachts ist sie verwirrt und findet die Toilette nicht.', tun: ['Licht: Nachtlicht'] },
  { text: 'Herr T. ist nachts unruhig und könnte aus dem Bett fallen.', tun: ['Betthöhe: ganz tief'] },
  { text: 'Du willst Frau M. im Bett waschen und dabei deinen Rücken schonen.', tun: ['Betthöhe: Arbeitshöhe'] },
  { text: 'Herr D. will gleich vom Bett in den Rollstuhl umsteigen.', tun: ['Rollstuhlbremse: fest'] },
  { text: 'Herr D. sitzt sicher im Rollstuhl und möchte zum Fenster gefahren werden.', tun: ['Rollstuhlbremse: gelöst'] },
  { text: 'Im Zweibettzimmer willst du gleich Herrn Ü. waschen.', tun: ['Sichtschutz: aufgestellt'] },
  { text: 'Die Luft im Zimmer ist stickig und verbraucht.', tun: ['Fenster: offen'] },
  { text: 'Herr Z. friert beim Waschen.', tun: ['Fenster: zu'] },
  { text: 'Du verlässt das Zimmer. Frau C. darf nicht allein aufstehen.', tun: ['Klingel in Reichweite'] },
  { text: 'Frau H. will barfuß über den glatten Flur laufen.', tun: ['Rutschfeste Socken'] },
  { text: 'Frau P. geht unsicher, will aber allein zur Toilette.', tun: ['Rollator holen', 'Rutschfeste Socken'] },

  // ---------------------------------------------------------------- Prophylaxen & Hygiene
  { text: 'Du hast gerade die Handschuhe ausgezogen.', tun: ['Hände desinfizieren'] },
  { text: 'Du kommst aus dem Zimmer von Herrn B. und gehst zur nächsten Patientin.', tun: ['Hände desinfizieren'] },
  { text: 'Gleich wechselst du die Inkontinenzvorlage von Frau D.', tun: ['Handschuhe: an', 'Sichtschutz: aufgestellt'] },
  { text: 'Herr F. hat MRSA. Du machst gleich bei ihm die Körperpflege.', tun: ['Schutzkittel: an', 'Handschuhe: an'] },
  { text: 'Frau G. hat Grippe (Influenza) und hustet stark.', tun: ['Maske: auf'] },
  { text: 'Auf dem Nachttisch von Herrn W. ist Blut.', tun: ['Nachttisch desinfizieren', 'Handschuhe: an'] },
  { text: 'Du hast Blutzucker gemessen. Wohin mit der benutzten Lanzette?', tun: ['Kanülenabwurf'] },
  { text: 'Herr M. liegt nach der Bauch-OP viel im Bett und atmet nur flach.', tun: ['Atemübung anleiten', 'Mobilisation: Bettkante', 'Kopfteil: 45°', 'Kopfteil: 60°'] },
  { text: 'Frau W. wurde an der Hüfte operiert. Sie hat ein hohes Thromboserisiko.', tun: ['Kompressionsstrümpfe', 'Fußgymnastik'] },
  { text: 'Herr N. muss Bettruhe halten. Seine Wadenmuskeln sollen das Blut zum Herzen pumpen.', tun: ['Fußgymnastik', 'Kompressionsstrümpfe'] },
  { text: 'Frau O. (89 Jahre) hat trockene Lippen und trinkt zu wenig.', tun: ['Getränk anbieten', 'Flüssigkeitsbilanz'] },
  { text: 'Herr J. bekommt nur Sondenkost. Seine Zunge ist trocken und belegt.', tun: ['Mundpflege'] },
  { text: 'Frau A. hat eine Rötung am Steißbein. Ist das schon ein Dekubitus?', tun: ['Fingertest'] },
  { text: 'Herr Q. hat bei jeder großen Drehung Schmerzen, braucht aber Druckentlastung.', tun: ['Mikrolagerung'] },
  { text: 'Frau B. hat ein sehr hohes Dekubitusrisiko (Braden-Skala: 9 Punkte).', tun: ['Wechseldruckmatratze: an', 'Mikrolagerung'] },
  { text: 'Herr Ö. verschluckt sich oft beim Essen (Schluckstörung).', tun: ['Kostform: passiert'] },
  { text: 'Frau K. hat eine Druckstelle von der Zahnprothese. Kauen tut weh.', tun: ['Kostform: weich'] },

  // ---------------------------------------------------------------- Vitalzeichen & Beobachtung
  { text: 'Herr N. nimmt seit gestern neue Tabletten gegen Bluthochdruck (Hypertonie).', tun: ['Blutdruck messen'] },
  { text: 'Frau V. sagt: „Mein Herz rast und stolpert!“', tun: ['Puls zählen', 'Blutdruck messen'] },
  { text: 'Herr C. atmet sehr schnell und flach.', tun: ['Atemfrequenz zählen', 'SpO2 messen'] },
  { text: 'Frau I. hat Schüttelfrost und heiße, rote Wangen.', tun: ['Temperatur messen'] },
  { text: 'Die Lippen von Herrn A. sind bläulich (Zyanose).', tun: ['SpO2 messen', 'Atemfrequenz zählen'] },
  { text: 'Herr D. hat Diabetes. Plötzlich ist er zittrig, blass und schwitzt.', tun: ['Blutzucker messen', 'Traubenzucker geben'] },
  { text: 'Frau L. verzieht das Gesicht und hält sich den Bauch.', tun: ['Schmerzskala'] },
  { text: 'Herr K. hat Herzschwäche. Seine Beine sind dick geschwollen (Ödeme).', tun: ['Wiegen', 'Flüssigkeitsbilanz'] },
  { text: 'Frau T. bekommt Infusionen. Es soll genau kontrolliert werden, was rein- und rausgeht.', tun: ['Flüssigkeitsbilanz'] },
  { text: 'Herr R. ist gestürzt und mit dem Kopf aufgeschlagen. Jetzt ist er sehr müde.', tun: ['Pupillen prüfen', 'Bewusstsein prüfen'] },
  { text: 'Die Einstichstelle der Infusion ist geschwollen, kühl und tut weh.', tun: ['Infusion: gestoppt'] },
  // Ganz einfach rechnen: ml pro Stunde = Menge ÷ Stunden (nur durch 1, 2, 5 oder 10)
  { text: 'Infusion: 100 ml in 1 Stunde. Wie viel ml pro Stunde?', tun: ['Infusionspumpe: 100 ml/h'] },
  { text: 'Infusion: 500 ml in 1 Stunde. Wie viel ml pro Stunde?', tun: ['Infusionspumpe: 500 ml/h'] },
  { text: 'Infusion: 100 ml in 2 Stunden. Wie viel ml pro Stunde?', tun: ['Infusionspumpe: 50 ml/h'] },
  { text: 'Infusion: 500 ml in 2 Stunden. Wie viel ml pro Stunde?', tun: ['Infusionspumpe: 250 ml/h'] },
  { text: 'Infusion: 500 ml in 5 Stunden. Wie viel ml pro Stunde?', tun: ['Infusionspumpe: 100 ml/h'] },
  { text: 'Infusion: 1000 ml in 10 Stunden. Wie viel ml pro Stunde?', tun: ['Infusionspumpe: 100 ml/h'] },
  { text: 'Infusion: 250 ml in 10 Stunden. Wie viel ml pro Stunde?', tun: ['Infusionspumpe: 25 ml/h'] },
  { text: 'Perfusor: 20 ml in 1 Stunde. Wie viel ml pro Stunde?', tun: ['Perfusor: 20 ml/h'] },
  { text: 'Perfusor: 20 ml in 10 Stunden. Wie viel ml pro Stunde?', tun: ['Perfusor: 2 ml/h'] },
  { text: 'Perfusor: 50 ml in 10 Stunden. Wie viel ml pro Stunde?', tun: ['Perfusor: 5 ml/h'] },
  { text: 'Perfusor: 50 ml in 5 Stunden. Wie viel ml pro Stunde?', tun: ['Perfusor: 10 ml/h'] },
  { text: 'Perfusor: 10 ml in 10 Stunden. Wie viel ml pro Stunde?', tun: ['Perfusor: 1 ml/h'] },
  // Insulin nach einem (erfundenen) Korrekturschema: nur ablesen, nicht rechnen
  { text: 'Schema: unter 200 mg/dl → 2 IE, 200 bis 300 → 4 IE, über 300 → 6 IE. Blutzucker: 250 mg/dl.', tun: ['Insulin-Pen: 4 IE'] },
  { text: 'Schema: unter 200 mg/dl → 2 IE, 200 bis 300 → 4 IE, über 300 → 6 IE. Blutzucker: 350 mg/dl.', tun: ['Insulin-Pen: 6 IE'] },

  // ---------------------------------------------------------------- Notfälle & Erste Hilfe
  { text: 'Herr W. liegt im Flur auf dem Boden und bewegt sich nicht.', tun: ['Bewusstsein prüfen'] },
  { text: 'Frau N. ist bewusstlos. Du willst prüfen, ob sie atmet.', tun: ['Kopf überstrecken'] },
  { text: 'Frau B. ist bewusstlos, atmet aber normal.', tun: ['Stabile Seitenlage'] },
  { text: 'Herr U. reagiert nicht und atmet nicht normal.', tun: ['Notruf absetzen', 'Herzdruckmassage', 'Notfallklingel'] },
  { text: 'Der Notruf ist abgesetzt. Frau X. atmet weiterhin nicht.', tun: ['Herzdruckmassage', 'AED holen'] },
  { text: 'Frau Y. ist im Bad gestürzt. Du brauchst sofort Hilfe vom Team.', tun: ['Notfallklingel', 'Notruf absetzen'] },
  { text: 'Der Blutzucker von Herrn D. ist 45 mg/dl. Er ist wach und kann schlucken.', tun: ['Traubenzucker geben'] },
  { text: 'Frau S. wird nach der Blutabnahme kreidebleich und fühlt sich schwach.', tun: ['Beine hochlagern', 'Fußteil: 30°'] },
  { text: 'Herr V. hat sich am Unterarm geschnitten. Es blutet stark.', tun: ['Druck auf die Wunde', 'Druckverband anlegen', 'Handschuhe: an'] },
  { text: 'Frau J. hat sich heißen Tee über die Hand gegossen.', tun: ['Mit Wasser kühlen'] },
  { text: 'Herr O. hat sich beim Essen verschluckt. Er kann nicht mehr husten und nicht sprechen.', tun: ['Schläge auf den Rücken'] },
  { text: 'Herr I. hat einen Krampfanfall und zuckt am ganzen Körper.', tun: ['Gegenstände wegräumen'] },

  // ---------------------------------------------------------------- Kommunikation (KB2): Welche Form? Welches Thema?
  // Information
  { text: 'Herr P. fragt, wann er seine neuen Tabletten nehmen soll. Du sagst es ihm kurz.', tun: ['Information: Medikamente'] },
  { text: 'Du gibst Frau L. ein Infoblatt mit Tipps gegen Stürze zu Hause.', tun: ['Information: Sturzprophylaxe'] },
  { text: 'Frau K. hat COPD. Du gibst ihr ein Infoblatt über Lungensport.', tun: ['Information: COPD'] },
  // Anleitung
  { text: 'Frau M. hat neu Diabetes. Du zeigst ihr, wie sie Insulin spritzt, und sie übt es selbst.', tun: ['Anleitung: Diabetes'] },
  { text: 'Herr C. hat COPD. Du zeigst ihm, wie er sein Spray (Dosieraerosol) benutzt, und er probiert es aus.', tun: ['Anleitung: COPD'] },
  { text: 'Frau R. soll mit Gehstützen gehen. Du machst es vor, und sie übt mit dir auf dem Flur.', tun: ['Anleitung: Mobilisation'] },
  // Schulung
  { text: 'Herr D. besucht mit fünf anderen einen Diabetes-Kurs: vier Termine mit festem Plan.', tun: ['Schulung: Diabetes'] },
  { text: 'Eine Gruppe lernt an drei geplanten Terminen, wie man sich bei Herzschwäche gesund ernährt.', tun: ['Schulung: Ernährung'] },
  { text: 'In einem Kurs über mehrere Wochen trainieren Seniorinnen Kraft und Gleichgewicht gegen Stürze.', tun: ['Schulung: Sturzprophylaxe'] },
  // Beratung
  { text: 'Frau S. möchte abnehmen. Ihr sprecht über Möglichkeiten beim Essen. Sie entscheidet selbst.', tun: ['Beratung: Ernährung'] },
  { text: 'Herr T. überlegt, ob er zu Hause einen Rollator oder einen Rollstuhl möchte. Ihr wägt gemeinsam ab.', tun: ['Beratung: Mobilisation'] },
  { text: 'Frau E. überlegt, ob sie ihre Tabletten selbst richtet oder der Pflegedienst. Ihr sprecht ergebnisoffen darüber.', tun: ['Beratung: Medikamente'] },
];
