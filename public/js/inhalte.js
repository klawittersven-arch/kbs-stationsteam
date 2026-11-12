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
 *
 * 2) BEDIENELEMENTE: Daraus wird das Pult auf jedem Handy gebaut. Es gibt drei Arten:
 *      art: 'knopf'     ein Knopf zum Drücken, z. B. „Puls zählen“
 *      art: 'schalter'  zwei Stellungen, z. B. Bettgitter: unten / oben
 *      art: 'stufen'    drei bis fünf Stufen, z. B. Oberkörper: flach / 30° / sitzend
 *    id       kurze Kennung, nur Kleinbuchstaben (nicht mehr ändern, wenn sie einmal da ist)
 *    name     Beschriftung auf dem Handy (kurz halten!)
 *    stufen   (nur Schalter und Stufen) die Stellungen
 *    befehl   (nur Knopf, wahlweise) Text der Anweisung. Ohne Angabe: der Name mit „!“
 *    befehle  (nur Schalter und Stufen, wahlweise) eine Anweisung je Stufe, in derselben Reihenfolge.
 *             Ohne Angabe: „Name: Stufe!“
 *
 * 3) SITUATIONEN: Ab dem Spätdienst erscheinen statt mancher Anweisungen kurze Situationen.
 *    Das Team muss selbst erkennen, was zu tun ist.
 *    text  die Situation (kurz, einfache Sprache)
 *    tun   was richtig ist, GENAU so geschrieben wie auf dem Handy:
 *            bei einem Knopf:              'Puls zählen'
 *            bei Schaltern und Stufen:     'Oberkörper: sitzend'   (Name, Doppelpunkt, Stufe)
 *          Mehrere richtige Möglichkeiten in eckigen Klammern mit Komma: ['Puls zählen', 'Blutdruck messen']
 *    Situationen, deren „tun“ zu keinem Bedienelement passt, werden übersprungen.
 *    Der Beamer zeigt dann in der Anmeldung einen Hinweis.
 *
 * Tipp: Neue Bedienelemente und Situationen einfach unten in der passenden Gruppe ergänzen.
 * Für das Spiel braucht es mindestens 36 Bedienelemente (6 Personen × 6 Elemente in der Nachtschicht).
 * -------------------------------------------------------------------------------------------------
 */

export const THEMEN = [
  { id: 'lagerung', name: 'Lagerung & Mobilisation' },
  { id: 'hygiene', name: 'Prophylaxen & Hygiene' },
  { id: 'vital', name: 'Vitalzeichen & Beobachtung' },
  { id: 'notfall', name: 'Notfälle & Erste Hilfe' },
];

export const PULT = [
  // ---------------------------------------------------------------- Lagerung & Mobilisation
  { id: 'oberkoerper', thema: 'lagerung', art: 'stufen', name: 'Oberkörper', stufen: ['flach', '30°', 'sitzend'],
    befehle: ['Oberkörper flach lagern!', 'Oberkörper auf 30° stellen!', 'Oberkörper hoch zum Sitzen!'] },
  { id: 'lagerung', thema: 'lagerung', art: 'stufen', name: 'Lagerung', stufen: ['30° links', 'Rücken', '30° rechts'],
    befehle: ['30°-Lagerung nach links!', 'Auf den Rücken drehen!', '30°-Lagerung nach rechts!'] },
  { id: 'mobilisation', thema: 'lagerung', art: 'stufen', name: 'Mobilisation', stufen: ['Bettkante', 'Stuhl', 'Flur'],
    befehle: ['An die Bettkante setzen!', 'In den Stuhl setzen!', 'Auf dem Flur gehen!'] },
  { id: 'licht', thema: 'lagerung', art: 'stufen', name: 'Licht', stufen: ['aus', 'Nachtlicht', 'hell'],
    befehle: ['Licht aus!', 'Nachtlicht an!', 'Licht ganz hell!'] },
  { id: 'bettgitter', thema: 'lagerung', art: 'schalter', name: 'Bettgitter', stufen: ['unten', 'oben'],
    befehle: ['Bettgitter runter!', 'Bettgitter hoch!'] },
  { id: 'betthoehe', thema: 'lagerung', art: 'schalter', name: 'Betthöhe', stufen: ['ganz tief', 'Arbeitshöhe'],
    befehle: ['Bett ganz tief stellen!', 'Bett auf Arbeitshöhe!'] },
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
  { id: 'haende', thema: 'hygiene', art: 'knopf', name: 'Hände desinfizieren' },
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

  // ---------------------------------------------------------------- Notfälle & Erste Hilfe
  { id: 'bewusstsein', thema: 'notfall', art: 'knopf', name: 'Bewusstsein prüfen' },
  { id: 'kopf', thema: 'notfall', art: 'knopf', name: 'Kopf überstrecken' },
  { id: 'seitenlage', thema: 'notfall', art: 'knopf', name: 'Stabile Seitenlage', befehl: 'Ab in die stabile Seitenlage!' },
  { id: 'notruf', thema: 'notfall', art: 'knopf', name: 'Notruf absetzen' },
  { id: 'notfallklingel', thema: 'notfall', art: 'knopf', name: 'Notfallklingel', befehl: 'Notfallklingel drücken!' },
  { id: 'hdm', thema: 'notfall', art: 'knopf', name: 'Herzdruckmassage', befehl: 'Herzdruckmassage starten!' },
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
];

export const SITUATIONEN = [
  // ---------------------------------------------------------------- Lagerung & Mobilisation
  { text: 'Frau K. hat starke Atemnot (Dyspnoe).', tun: ['Oberkörper: sitzend', 'SpO2 messen'] },
  { text: 'Herr B. bekommt gleich Sondenkost über seine PEG-Sonde.', tun: ['Oberkörper: 30°', 'Oberkörper: sitzend'] },
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
  { text: 'Herr M. liegt nach der Bauch-OP viel im Bett und atmet nur flach.', tun: ['Atemübung anleiten', 'Mobilisation: Bettkante'] },
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

  // ---------------------------------------------------------------- Notfälle & Erste Hilfe
  { text: 'Herr W. liegt im Flur auf dem Boden und bewegt sich nicht.', tun: ['Bewusstsein prüfen'] },
  { text: 'Frau N. ist bewusstlos. Du willst prüfen, ob sie atmet.', tun: ['Kopf überstrecken'] },
  { text: 'Frau B. ist bewusstlos, atmet aber normal.', tun: ['Stabile Seitenlage'] },
  { text: 'Herr U. reagiert nicht und atmet nicht normal.', tun: ['Notruf absetzen', 'Herzdruckmassage', 'Notfallklingel'] },
  { text: 'Der Notruf ist abgesetzt. Frau X. atmet weiterhin nicht.', tun: ['Herzdruckmassage', 'AED holen'] },
  { text: 'Frau Y. ist im Bad gestürzt. Du brauchst sofort Hilfe vom Team.', tun: ['Notfallklingel', 'Notruf absetzen'] },
  { text: 'Der Blutzucker von Herrn D. ist 45 mg/dl. Er ist wach und kann schlucken.', tun: ['Traubenzucker geben'] },
  { text: 'Frau S. wird nach der Blutabnahme kreidebleich und fühlt sich schwach.', tun: ['Beine hochlagern'] },
  { text: 'Herr V. hat sich am Unterarm geschnitten. Es blutet stark.', tun: ['Druckverband anlegen', 'Handschuhe: an'] },
  { text: 'Frau J. hat sich heißen Tee über die Hand gegossen.', tun: ['Mit Wasser kühlen'] },
  { text: 'Herr O. hat sich beim Essen verschluckt. Er kann nicht mehr husten und nicht sprechen.', tun: ['Schläge auf den Rücken'] },
  { text: 'Herr I. hat einen Krampfanfall und zuckt am ganzen Körper.', tun: ['Gegenstände wegräumen'] },
];
