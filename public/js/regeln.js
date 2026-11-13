/*
 * Spielregeln, Zeiten und Zufall. Diese Datei lesen Handys, Beamer UND der Cloudflare-Dienst.
 * Die Inhalte (Bedienelemente, Situationen) stehen in inhalte.js.
 */
import { THEMEN, PULT, SITUATIONEN, MEDIKAMENTE, MED_ZEITPUNKTE, PROPHYLAXEN, PROPH_SKALEN, ASSESSMENTS } from './inhalte.js';

// ---------------------------------------------------------------- Einstellungen am Beamer
export const TEAM_GROESSEN = [2, 3, 4, 5, 6];   // Personen pro Station (voreingestellt: 4)
export const MAX_TEAMS = 10;                     // höchstens 10 Stationen
export const DAUERN = [60, 90, 120, 180];        // Dauer einer Schicht in Sekunden (voreingestellt: 2 Minuten)
export const dauerText = s => s % 60 ? (s === 90 ? '1,5 Minuten' : s + ' Sekunden') : s === 60 ? '1 Minute' : s / 60 + ' Minuten';
// Schwierigkeit (am Beamer und auf der Übungsseite)
// proHandy: Elemente pro Handy in Früh-, Spät- und Nachtdienst · f: Zeit pro Aufgabe (1 = wie in SCHICHTEN; Zahl oder je Schicht)
// tippAb: Tipp bei Situationen nach diesem Anteil der Zeit · verblasst: Aufgabe wird im Nachtdienst blass · ohneAb: ab dieser Schicht
// (0 Früh, 1 Spät, 2 Nacht, 3 nie) Medikamente und Prophylaxen auch ohne Kategorie und Pflegeprozess ohne Nummern · ueben: Elemente
// auf der Übungsseite · nur bei „Sehr leicht“: gleichzeitig = höchstens so viele Aufgaben pro Station (0 = alle), abstand = Pause
// zwischen zwei Aufgaben in ms (am Anfang → am Ende der Schicht), fZiel = Zeit für das Schichtziel, kennenlernen = vor dem
// Frühdienst probiert jede Person ihre Knöpfe aus, maxListen = höchstens so viele Elemente mit Ausklapp-Liste pro Handy
// nacheinander: je Schicht [ab Anteil der Schicht, höchstens so viele Aufgaben gleichzeitig pro Station], z. B. Nachtdienst:
// erst eine nach der anderen, ab 40 % der Zeit zwei gleichzeitig. abstand: Pause zwischen zwei Aufgaben (Anfang → Ende der Schicht)
const SEHR_LEICHT = { name: 'Sehr leicht', proHandy: [3, 3, 3], maxListen: 1, f: [1.6, 1.5, 1.4], fZiel: [1, 1, 1.2],
  nacheinander: [[[0, 1]], [[0, 1]], [[0, 1], [0.4, 2]]], abstand: [[2500, 1200], [1500, 800], [1000, 800]],
  tippAb: 1 / 3, verblasst: false, ohneAb: 3, ueben: 3, kennenlernen: true,
  kurz: 'Immer 3 Knöpfe (höchstens einer mit Liste). Vor jedem Dienst neue Knöpfe ausprobieren. Früh- und Spätdienst: eine Anweisung nach der anderen (spät etwas schneller), Nachtdienst: später zwei gleichzeitig.' };
export const SCHWIERIGKEIT = {
  // Ultra leicht: wie „Sehr leicht“, aber gar keine Elemente mit Ausklapp-Liste
  ultraleicht: { ...SEHR_LEICHT, name: 'Ultra leicht', maxListen: 0,
    kurz: 'Wie „Sehr leicht“ (vor jedem Dienst Knöpfe ausprobieren, Anweisungen nacheinander), aber nur einfache Knöpfe, Schalter und Regler, keine Listen.' },
  sehrleicht: SEHR_LEICHT,
  leicht: { name: 'Leicht', proHandy: [3, 4, 4], f: 1.4, tippAb: 1 / 3, verblasst: false, ohneAb: 3, ueben: 4,
    kurz: 'Weniger Knöpfe (3 bis 4), 40 % mehr Zeit, Tipp früher. Medikamente und Prophylaxen immer mit Kategorie, Pflegeprozess immer mit Nummern.' },
  mittel: { name: 'Mittel', proHandy: [4, 4, 5], f: 1.2, tippAb: 0.5, verblasst: false, ohneAb: 2, ueben: 5,
    kurz: '4 bis 5 Knöpfe, 20 % mehr Zeit. Ohne Kategorie bzw. ohne Nummern erst im Nachtdienst.' },
  schwer: { name: 'Schwer', proHandy: [4, 5, 6], f: 1, tippAb: 0.5, verblasst: true, ohneAb: 1, ueben: 6,
    kurz: '4 bis 6 Knöpfe, etwa 15 s pro Anweisung. Im Nachtdienst wird die Aufgabe blass. Ohne Kategorie ab dem Spätdienst.' },
};
export const stufe = schwierigkeit => SCHWIERIGKEIT[schwierigkeit] || SCHWIERIGKEIT.mittel;
// Werte einer Schwierigkeit für eine Schicht k
// gleichzeitig: höchstens so viele Aufgaben pro Station (0 = alle), plan: wann wie viele, mittel: im Schnitt (für das Schichtziel)
export function stufeK(schwierigkeit, k) {
  const st = stufe(schwierigkeit), j = Math.max(0, Math.min(2, k || 0));
  const f = Array.isArray(st.f) ? st.f[j] : st.f;
  const plan = st.nacheinander ? st.nacheinander[j] : null;
  const mittel = plan ? plan.reduce((sum, [ab, n], i) => sum + n * ((i + 1 < plan.length ? plan[i + 1][0] : 1) - ab), 0) : 0;
  return { f, fZiel: st.fZiel ? st.fZiel[j] : f, gleichzeitig: plan ? Math.max(...plan.map(x => x[1])) : 0, plan, mittel, abstand: st.abstand ? st.abstand[j] : null, proHandy: st.proHandy[j] };
}
// Wie viele Aufgaben dürfen jetzt gleichzeitig laufen? (x = Anteil der Schicht, 0 bis 1)
export const gleichzeitigJetzt = (plan, x) => plan.reduce((n, [ab, m]) => (x >= ab ? m : n), plan[0][1]);
export const KENNEN_MS = 60000; // Kennenlernen vor dem Frühdienst: so lange höchstens (dann geht es auch ohne alle los). Vor Spät- und Nachtdienst die Hälfte
// Anteil der Situationen je Schicht (Früh, Spät, Nacht)
export const ANWEISUNGEN = {
  steigend: { name: 'Steigend', anteil: [0, 0.5, 0.7], kurz: 'Frühdienst nur Anweisungen („Bettgitter hoch!“), ab dem Spätdienst auch Situationen („Frau K. hat Atemnot“).' },
  befehle: { name: 'Nur Anweisungen', anteil: [0, 0, 0], kurz: 'Immer direkte Anweisungen („Bettgitter hoch!“). Gut zum Kennenlernen der Begriffe.' },
  situationen: { name: 'Nur Situationen', anteil: [1, 1, 1], kurz: 'Immer Situationen: Das Team muss erkennen, was zu tun ist. Für Fortgeschrittene.' },
};
export const WAHLEN = {
  selbst: { name: 'Selbst wählen', kurz: 'Die SuS wählen auf dem Handy eine Station mit ihren Sitznachbarn (60 Sekunden). Der Rest wird zugelost.' },
  zufall: { name: 'Zufällig', kurz: 'Das Spiel lost die Stationen aus. Danach müssen sich die SuS umsetzen.' },
};
export const WAHL_SEKUNDEN = 60;   // so lange dürfen die SuS ihre Station selbst wählen
export const WAHL_PLUS = 30;       // „+30 Sekunden“ am Beamer
// Höchstgröße beim Selbst-Wählen: höchstens eine Person mehr als bei gleichmäßiger Verteilung
export const wahlMax = (personen, stationen) => Math.ceil(Math.max(1, personen) / Math.max(1, stationen)) + 1;
export const STOER_WAHL = {
  an: { name: 'An', kurz: 'Ab dem Spätdienst: Kaffee, Post-its und Krümel auf Handys, dazu Ereignisse wie der Rea-Alarm (mit Bonus).' },
  aus: { name: 'Aus', kurz: 'Keine Störungen und keine Ereignisse.' },
};
// Medikamente: welche Kategorien vorkommen (bis zu welchem Ausbildungsjahr, siehe aj in inhalte.js)
export const MED_AJ = { 1: 'bis 1. AJ', 2: 'bis 2. AJ', 3: 'bis 3. AJ' };
// Assessmentinstrumente: einfach = Punktzahl eintragen, schwer = Ergebnis einordnen („11 Punkte“ → „hohes Risiko“)
export const ASSESS_WAHL = {
  einfach: { name: 'Einfach', kurz: 'Punktzahl eintragen' },
  schwer: { name: 'Schwer', kurz: 'Ergebnis einordnen' },
};
export const STANDARD_CFG = { groesse: 4, dauer: 120, schwierigkeit: 'ultraleicht', anweisungen: 'befehle', themen: THEMEN.map(t => t.id), wahl: 'selbst', stoerungen: 'aus', medAJ: 2, assessment: 'einfach' };

// ---------------------------------------------------------------- Störungen und Ereignisse (ab dem Spätdienst)
// Störung: liegt auf 1–2 Elementen eines Handys und muss erst weg, bevor man sie bedienen kann
export const STOERUNGEN = {
  kaffee: { name: 'Kaffee verschüttet!', kurz: 'Wisch den Fleck weg!' },
  postit: { name: 'Post-it-Flut!', kurz: 'Tipp die Zettel weg!' },
  kruemel: { name: 'Kuchenkrümel!', kurz: 'Wisch die Krümel weg!' },
};
export const STOER_ABSTAND = [30000, 60000]; // pro Station alle 30–60 Sekunden eine Störung auf einem Handy
// Ereignis: alle machen gleichzeitig mit. Schafft es die ganze Station, gibt es einen Bonus
export const EREIGNISSE = {
  rea: { name: 'Rea-Alarm im Haus!', kurz: 'Alle: 10× im Takt drücken (100–120 pro Minute)!' },
  hygiene: { name: 'Hygiene-Begehung!', kurz: 'Alle: Hände desinfizieren (3 Sekunden halten)!' },
  strom: { name: 'Stromausfall!', kurz: 'Alle: Taschenlampe an (Schalter nach rechts schieben)!' },
};
export const EREIGNIS_VORLAUF = 3000;  // Ankündigung, dann geht es los
export const EREIGNIS_DAUER = 15000;   // so lange hat jede Station Zeit
export const EREIGNIS_BONUS = 0.1;     // Bonus: 10 % des Schichtziels
// Wann kommen Ereignisse? Spätdienst eins, Nachtdienst zwei (bei kurzen Schichten eins)
export function ereignisPlan(k, dauerS, r) {
  if (k < 1) return [];
  const anders = r() < 0.5 ? 'hygiene' : 'strom';
  if (k === 1) return [{ anteil: 0.4, art: anders }];
  if (dauerS >= 90) return [{ anteil: 0.3, art: 'rea' }, { anteil: 0.7, art: anders === 'hygiene' ? 'strom' : 'hygiene' }];
  return [{ anteil: 0.45, art: 'rea' }];
}

// ---------------------------------------------------------------- Testlauf allein: Computer-Mitspieler
// Die Lehrkraft kann das Spiel allein ausprobieren. Die Computer-Mitspieler erledigen alles, was ihre Knöpfe betrifft,
// und machen dabei auch Fehler. Ihre Handys sieht man in der „Testansicht“ (eigenes Fenster am Laptop).
export const COMPUTER = {
  namen: ['Robo A.', 'Robo B.', 'Robo C.'],
  direkt: [2000, 4000],             // so lange brauchen sie für eine Anweisung (ms)
  situation: [3000, 5500],          // … und für eine Situation
  fehlgriff: 0.08,                  // so oft drücken sie erst daneben (und kurz danach richtig)
  vergessen: { b: 0.05, s: 0.15 },  // so oft lassen sie eine Anweisung (b) bzw. Situation (s) verfallen
  ereignis: [2000, 7000],           // beim Ereignis: so lange, bis sie mitmachen
};

// ---------------------------------------------------------------- Die drei Schichten
// direkt/situation: Zeit für eine Aufgabe (ms, bei „Schwer“; „Mittel“ und „Leicht“ geben mehr Zeit, siehe SCHWIERIGKEIT)
// verblasst: Nach so vielen ms wird die Anweisung blass (müde Augen im Nachtdienst, nur bei „Schwer“). 0 = nie
// Wie viele Elemente auf jedem Handy liegen, steht in SCHWIERIGKEIT.
export const SCHICHTEN = [
  { id: 'frueh', name: 'Frühdienst', direkt: 15000, situation: 25000, verblasst: 0 },
  { id: 'spaet', name: 'Spätdienst', direkt: 14000, situation: 24000, verblasst: 0 },
  { id: 'nacht', name: 'Nachtdienst', direkt: 13000, situation: 22000, verblasst: 4000 },
];
export const verblasstMs = (k, schwierigkeit) => stufe(schwierigkeit).verblasst ? SCHICHTEN[k].verblasst : 0;
export function schichtText(k, anweisungen, themen, schwierigkeit) {
  const a = (ANWEISUNGEN[anweisungen] || ANWEISUNGEN.steigend).anteil[k] || 0;
  const art = a === 0 ? 'Nur Anweisungen' : a >= 1 ? 'Situationen erkennen' : 'Anweisungen und Situationen';
  const pause = themen ? gruppenPause(themen, k) : [];
  const listen = pause.length ? ' · Listen: ' + listenDran(themen, k).map(l => l.name).join(' und ') : '';
  const plan = stufeK(schwierigkeit, k).plan;
  const nacheinander = !plan ? '' : plan.length === 1 && plan[0][1] === 1 ? ' · eine Anweisung nach der anderen'
    : plan[0][1] === 1 ? ` · erst eine Anweisung nach der anderen, dann ${plan[plan.length - 1][1] === 2 ? 'zwei' : plan[plan.length - 1][1]} gleichzeitig` : ` · höchstens ${plan[0][1]} Anweisungen gleichzeitig`;
  return `${art} · ${stufe(schwierigkeit).proHandy[k]} Elemente pro Handy${nacheinander}${listen}${verblasstMs(k, schwierigkeit) ? ' · Die Aufgabe wird nach ein paar Sekunden blass. Schnell lesen!' : ''}`;
}

// ---------------------------------------------------------------- Stationen (Teams)
export const STATIONEN = [
  { name: 'Rot', farbe: '#ff5d73' }, { name: 'Blau', farbe: '#4da3ff' }, { name: 'Grün', farbe: '#3ddc84' },
  { name: 'Gelb', farbe: '#ffd23f' }, { name: 'Lila', farbe: '#b57bff' }, { name: 'Orange', farbe: '#ff9f43' },
  { name: 'Türkis', farbe: '#2ee6d6' }, { name: 'Pink', farbe: '#ff7ad9' }, { name: 'Limette', farbe: '#b8f35a' },
  { name: 'Silber', farbe: '#c9cfe6' },
];
export const stationName = i => 'Station ' + (STATIONEN[i] || { name: i + 1 }).name;
export const stationFarbe = i => (STATIONEN[i] || STATIONEN[9]).farbe;

// ---------------------------------------------------------------- Punkte und Zeiten
export const PUNKTE_TREFFER = 2;     // erledigte Aufgabe
export const PUNKTE_FEHLGRIFF = -1;  // Knopf gedrückt, den gerade niemand braucht
// Schichtziel (100 %): jede Person schafft im Schnitt alle 9 s eine Anweisung bzw. alle 14 s eine Situation
export const SOLL_DIREKT = 9000, SOLL_SITUATION = 14000;
export const VORLAUF_START = 5000;   // Countdown vor jeder Schicht
export const PAUSE_OK = 900;         // nach einer erledigten Aufgabe: „✓ Erledigt“ zeigen
export const PAUSE_VERPASST = 1500;  // nach einer verpassten Anweisung: Auflösung zeigen
export const PAUSE_VERPASST_SIT = 3500; // nach einer verpassten Situation: Auflösung in Ruhe lesen
export const GNADE = 1200;           // so lange nach Ablauf zählen Aktionen noch (Netz)
export const TIPP_AB = 0.5;          // Situationen: nach der Hälfte der Zeit erscheint ein Tipp (bei „Leicht“ früher, siehe SCHWIERIGKEIT)

export function zielPunkte(personen, dauerMs, anteil, tempoF = 1) {
  const soll = ((1 - anteil) * SOLL_DIREKT + anteil * SOLL_SITUATION) * tempoF;
  return Math.max(2, Math.round(personen * (dauerMs / soll) * PUNKTE_TREFFER));
}
export const prozent = (punkte, ziel) => ziel > 0 ? Math.max(0, Math.round(100 * punkte / ziel)) : 0;

// ---------------------------------------------------------------- Zufall
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function zufallsSeed() {
  if (globalThis.crypto && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0];
  return Math.floor(Math.random() * 4294967296);
}
export function mischen(list, r) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const waehle = (list, r) => list[Math.floor(r() * list.length)];

// ---------------------------------------------------------------- Arten von Bedienelementen
// knopf: tippen · halten: gedrückt halten · takt: mehrmals im Takt tippen   (alle ohne Stufen)
// schalter: 2 Stellungen · stufen: Reihe zum Antippen · regler: Schieberegler · auswahl: Zeile zum Ausklappen   (Stellung bleibt stehen)
// dosis: Drehregler zum Einstellen + Knopf zum Auslösen (z. B. Insulin-Pen)
// medikament: Kategorie (z. B. Diuretika) mit Blatt: Wirkstoff, Dosis, Zeitpunkt wählen, dann „Geben“ (aus MEDIKAMENTE in inhalte.js)
// prophylaxe: Prophylaxe (z. B. Pneumonie) mit Blatt: Maßnahme aus der Liste, Zahl mit ‹ › einstellen, „Durchführen“ (aus PROPHYLAXEN)
export const ARTEN = ['knopf', 'halten', 'takt', 'schalter', 'stufen', 'regler', 'auswahl', 'gesichter', 'dosis', 'medikament', 'prophylaxe'];
const PULT_ARTEN = ARTEN.filter(a => a !== 'medikament' && a !== 'prophylaxe');
// Elemente mit Blatt (Medikamente, Prophylaxen): Ihre Stufen sind Kombinationen, ohne Zustand, ab dem Spätdienst auch ohne Kategorie
export const istBlatt = c => !!c && (c.art === 'medikament' || c.art === 'prophylaxe');
export const ohneStufen = c => c.art === 'knopf' || c.art === 'halten' || c.art === 'takt';
export const hatZustand = c => ['schalter', 'stufen', 'regler', 'auswahl', 'gesichter'].includes(c.art);
export const breit = c => ['stufen', 'regler', 'dosis', 'gesichter'].includes(c.art); // braucht die ganze Breite
export const istListe = c => ['auswahl', 'medikament', 'prophylaxe'].includes(c.art); // klappt eine Liste bzw. ein Blatt auf
export const TAKT_TOLERANZ = 10; // im Takt tippen: so viel schneller/langsamer als verlangt zählt noch
const STUFEN_GRENZEN = { schalter: [2, 2], stufen: [2, 5], regler: [3, 11], auswahl: [2, 8], gesichter: [2, 6], dosis: [2, 12] };
// Gruppen: Elemente, die zusammen in eine Station kommen. Höchstens GRUPPE_PRO_HANDY davon liegen auf einem Handy.
//   alle: true  → alle Glieder oder keins (Patientenedukation: alle vier Formen, sonst fehlt die Frage „Wer hat Beratung?“)
//   min, max    → so viele zufällige Glieder (Medikamente: 2 bis 4 Kategorien), maxMit: weniger, wenn eine andere Gruppe schon da ist
export const GRUPPEN = {
  edukation: { alle: true },
  medikamente: { min: 2, max: 4, maxMit: { edukation: 3 } },
  prophylaxen: { min: 2, max: 3 },
  pflegeprozess: { alle: true },
  assessment: { min: 2, max: 3 },
};
export const GRUPPE_PRO_HANDY = 2;
export const MED_MAX_WIRKSTOFFE = 4, MED_MAX_DOSEN = 4, PROPH_MAX_MASSNAHMEN = 4;
// Sind KB2, Medikamente und Prophylaxen alle an, kommen pro Schicht nur zwei davon dran (sonst ist das Pult voller Listen):
// Frühdienst KB2 + Medikamente, Spätdienst Medikamente + Prophylaxen, Nachtdienst KB2 + Prophylaxen
// Mit „Pflegeprozess & Assessment“ sind es vier Listen-Themen: Dann kommt jedes mindestens einmal dran.
export const LISTEN = [
  { thema: 'kommunikation', gruppen: ['edukation'], name: 'KB2' },
  { thema: 'medikamente', gruppen: ['medikamente'], name: 'Medikamente' },
  { thema: 'prophylaxen', gruppen: ['prophylaxen'], name: 'Prophylaxen' },
  { thema: 'pflegeprozess', gruppen: ['pflegeprozess', 'assessment'], name: 'Pflegeprozess & Assessment' },
];
// Welche der eingeschalteten Listen-Themen in Früh-, Spät- und Nachtdienst drankommen (Nummern = Reihenfolge in LISTEN)
const LISTEN_PLAN = { 3: [[0, 1], [1, 2], [0, 2]], 4: [[0, 1], [2, 3], [0, 3]] };
export function listenDran(themen, k) {
  const an = LISTEN.filter(l => (themen || []).includes(l.thema));
  const plan = LISTEN_PLAN[an.length];
  return plan ? plan[Math.max(0, Math.min(2, k))].map(i => an[i]) : an;
}
export function gruppenPause(themen, k) {
  const dran = new Set(listenDran(themen, k));
  return LISTEN.filter(l => (themen || []).includes(l.thema) && !dran.has(l)).flatMap(l => l.gruppen);
}
// Zahlen bei Prophylaxen: „5 Minuten“, „10-mal“, „alle 2 Stunden“ (1 Stunde: „stündlich“)
export const einheitText = (e, n) => e === 'Minuten' ? `${n} Minuten` : e === 'mal' ? `${n}-mal` : n === 1 ? 'stündlich' : `alle ${n} Stunden`;
const einheitKlein = (e, n) => e === 'Minuten' ? 'Minuten' : e === 'mal' ? 'mal' : n === 1 ? 'stündlich' : 'alle … Stunden';

// ---------------------------------------------------------------- Inhalte prüfen
export const normName = s => String(s == null ? '' : s).replace(/­/g, '').replace(/\s*:\s*/g, ': ').trim().replace(/\s+/g, ' ').toLocaleLowerCase('de-DE');
function hash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
const kurz = t => t.length > 40 ? t.slice(0, 38) + '…' : t;

/**
 * Liest die Inhalte, ergänzt fehlende Texte und sammelt Hinweise auf Fehler.
 * Rückgabe: { katalog: [Bedienelemente], byId: Map, situationen: [{sid, text, ziele: [[id, stufe], …]}], warnungen: [Text] }
 */
export function pruefeInhalte(themen = THEMEN, pult = PULT, situationen = SITUATIONEN, medikamente = themen === THEMEN ? MEDIKAMENTE : [], prophylaxen = themen === THEMEN ? PROPHYLAXEN : [], assessments = themen === THEMEN ? ASSESSMENTS : []) {
  const warnungen = [];
  const themenIds = (Array.isArray(themen) ? themen : []).map(t => t && t.id).filter(Boolean);
  const lustigeThemen = new Set((Array.isArray(themen) ? themen : []).filter(t => t && t.lustig).map(t => t.id));
  const zahl = (v, lo, hi, def) => { v = Number(v); return Number.isFinite(v) && v >= lo && v <= hi ? v : def; };
  const katalog = [], byId = new Map(), names = new Set();
  (Array.isArray(pult) ? pult : []).forEach((e, i) => {
    if (!e || typeof e !== 'object') return warnungen.push(`Bedienelement Nr. ${i + 1} ist leer.`);
    const id = String(e.id || '').trim(), name = String(e.name || '').trim(), art = e.art;
    if (!/^[a-z0-9_-]{1,30}$/.test(id)) return warnungen.push(`Bedienelement „${kurz(name || '?')}“: Die Kennung (id) fehlt oder enthält mehr als Kleinbuchstaben.`);
    if (byId.has(id)) return warnungen.push(`Die Kennung „${id}“ gibt es zweimal. Das zweite Element wird übersprungen.`);
    if (!name) return warnungen.push(`Bedienelement „${id}“ hat keinen Namen.`);
    if (art === 'medikament' || art === 'prophylaxe') return warnungen.push(`Bedienelement „${name}“: Medikamente und Prophylaxen bitte unten in MEDIKAMENTE bzw. PROPHYLAXEN eintragen.`);
    if (!PULT_ARTEN.includes(art)) return warnungen.push(`Bedienelement „${name}“: art muss eins davon sein: ${PULT_ARTEN.map(a => `'${a}'`).join(', ')}.`);
    let stufen = [];
    if (STUFEN_GRENZEN[art]) {
      const [lo, hi] = STUFEN_GRENZEN[art];
      stufen = (Array.isArray(e.stufen) ? e.stufen : []).map(s => String(s).trim()).filter(Boolean);
      if (new Set(stufen.map(normName)).size !== stufen.length) return warnungen.push(`Bedienelement „${name}“: Zwei Stufen heißen gleich.`);
      if (stufen.length < lo || stufen.length > hi) return warnungen.push(`„${name}“ (${art}) braucht ${lo === hi ? 'genau ' + lo : lo + ' bis ' + hi} Stufen.`);
    }
    let thema = e.thema;
    if (!themenIds.includes(thema)) { warnungen.push(`Bedienelement „${name}“: Thema „${thema}“ gibt es nicht.`); thema = themenIds[0] || 'x'; }
    if (names.has(normName(name))) warnungen.push(`Der Name „${name}“ kommt zweimal vor. Situationen damit sind nicht eindeutig.`);
    names.add(normName(name));
    // Anweisungen: je Stufe aus „befehle“, sonst aus „befehl“ (# steht für die Stufe), sonst „Name: Stufe!“
    const vorlage = String(e.befehl || '').trim();
    const befehle = !stufen.length
      ? [vorlage || name + '!']
      : stufen.map((s, j) => (Array.isArray(e.befehle) && String(e.befehle[j] || '').trim()) || (vorlage.includes('#') ? vorlage.replace(/#/g, s) : `${name}: ${s}!`));
    const c = { id, name, art, stufen, thema, befehle, lustig: lustigeThemen.has(thema) };
    if (art === 'dosis') c.knopf = String(e.knopf || '').trim() || 'Los';
    if (art === 'halten') c.sekunden = zahl(e.sekunden, 1, 10, 3);
    if (art === 'takt') { c.anzahl = Math.round(zahl(e.anzahl, 3, 30, 10)); c.min = zahl(e.min, 20, 300, 100); c.max = Math.max(c.min, zahl(e.max, 20, 300, 120)); }
    if (e.hinweis) c.hinweis = String(e.hinweis).trim().slice(0, 60);
    if (e.gruppe) c.gruppe = String(e.gruppe).trim();
    if (Array.isArray(e.befehle2) && stufen.length) {
      const b2 = stufen.map((_, j) => String(e.befehle2[j] || '').trim());
      if (b2.every(Boolean)) c.befehle2 = b2; else warnungen.push(`Bedienelement „${name}“: befehle2 braucht eine Anweisung je Stufe.`);
    }
    if (e.nummern && art === 'auswahl') c.nummern = true;
    katalog.push(c); byId.set(id, c);
  });
  // Medikamente: je Kategorie ein Element. Seine Stufen sind alle üblichen Kombinationen aus Wirkstoff, Dosis und Zeitpunkt.
  (Array.isArray(medikamente) ? medikamente : []).forEach((m, i) => {
    if (!m || typeof m !== 'object') return warnungen.push(`Medikamente: Kategorie Nr. ${i + 1} ist leer.`);
    const id = 'med-' + String(m.id || '').trim(), name = String(m.name || '').trim(), einzeln = String(m.einzeln || '').trim() || name;
    if (!/^med-[a-z0-9_-]{1,26}$/.test(id)) return warnungen.push(`Medikamente „${kurz(name || '?')}“: Die Kennung (id) fehlt oder enthält mehr als Kleinbuchstaben.`);
    if (byId.has(id)) return warnungen.push(`Die Medikamenten-Kennung „${m.id}“ gibt es zweimal. Die zweite Kategorie wird übersprungen.`);
    if (!name) return warnungen.push(`Medikamente „${m.id}“ hat keinen Namen.`);
    if (!themenIds.includes('medikamente')) return warnungen.push(`Medikamente „${name}“: Das Thema „medikamente“ fehlt in THEMEN.`);
    const wirkstoffe = [], stufen = [], befehle = [], ohne = [], teile = [];
    for (const w of (Array.isArray(m.wirkstoffe) ? m.wirkstoffe : [])) {
      const wn = String((w && w.name) || '').trim();
      const dosen = [...new Set((Array.isArray(w && w.dosen) ? w.dosen : []).map(x => String(x).trim()).filter(Boolean))];
      const zeiten = [...new Set((Array.isArray(w && w.zeiten) ? w.zeiten : []).map(x => String(x).trim()).filter(Boolean))];
      if (!wn || !dosen.length || !zeiten.length || zeiten.some(z => !MED_ZEITPUNKTE.includes(z))) {
        warnungen.push(`Medikamente „${name}“: Wirkstoff „${wn || '?'}“ braucht name, dosen und zeiten (nur ${MED_ZEITPUNKTE.map(z => `'${z}'`).join(', ')}).`);
        continue;
      }
      if (wirkstoffe.some(x => normName(x.name) === normName(wn))) { warnungen.push(`Medikamente „${name}“: Den Wirkstoff „${wn}“ gibt es zweimal.`); continue; }
      if (wirkstoffe.length >= MED_MAX_WIRKSTOFFE) { warnungen.push(`Medikamente „${name}“: Höchstens ${MED_MAX_WIRKSTOFFE} Wirkstoffe pro Kategorie, „${wn}“ wird übersprungen.`); continue; }
      if (dosen.length > MED_MAX_DOSEN) warnungen.push(`Medikamente „${name}“: Höchstens ${MED_MAX_DOSEN} Dosen pro Wirkstoff (${wn}).`);
      const d4 = dosen.slice(0, MED_MAX_DOSEN);
      wirkstoffe.push({ name: wn, dosen: d4, zeiten });
      for (const d of d4) for (const z of zeiten) {
        stufen.push(`${wn} ${d} ${z}`);
        befehle.push(`${einzeln} ${wn} ${d} ${z}!`);
        ohne.push(`${wn} ${d} ${z}!`);
        teile.push(wn);
      }
    }
    if (!wirkstoffe.length) return warnungen.push(`Medikamente „${name}“ hat keinen Wirkstoff.`);
    if (names.has(normName(name))) warnungen.push(`Der Name „${name}“ kommt zweimal vor. Situationen damit sind nicht eindeutig.`);
    names.add(normName(name));
    const c = {
      id, name, art: 'medikament', stufen, thema: 'medikamente', befehle, ohneKategorie: ohne, teile, lustig: false,
      hinweis: 'Medikamente', gruppe: 'medikamente', aj: [1, 2, 3].includes(Number(m.aj)) ? Number(m.aj) : 1, einzeln, wirkstoffe, zeiten: MED_ZEITPUNKTE.slice(),
    };
    katalog.push(c); byId.set(id, c);
  });
  // Prophylaxen: je Prophylaxe ein Element. Seine Stufen sind die Maßnahmen mit ihren üblichen Zahlen.
  const alleMassnahmen = new Set();
  (Array.isArray(prophylaxen) ? prophylaxen : []).forEach((m, i) => {
    if (!m || typeof m !== 'object') return warnungen.push(`Prophylaxen: Nr. ${i + 1} ist leer.`);
    const id = 'pro-' + String(m.id || '').trim(), name = String(m.name || '').trim(), titel = String(m.titel || '').trim() || name;
    if (!/^pro-[a-z0-9_-]{1,26}$/.test(id)) return warnungen.push(`Prophylaxen „${kurz(name || '?')}“: Die Kennung (id) fehlt oder enthält mehr als Kleinbuchstaben.`);
    if (byId.has(id)) return warnungen.push(`Die Prophylaxen-Kennung „${m.id}“ gibt es zweimal. Die zweite wird übersprungen.`);
    if (!name) return warnungen.push(`Prophylaxen „${m.id}“ hat keinen Namen.`);
    if (!themenIds.includes('prophylaxen')) return warnungen.push(`Prophylaxen „${name}“: Das Thema „prophylaxen“ fehlt in THEMEN.`);
    const massnahmen = [], stufen = [], befehle = [], ohne = [], teile = [];
    for (const x of (Array.isArray(m.massnahmen) ? m.massnahmen : [])) {
      const mn = String((x && x.name) || '').trim();
      if (!mn) { warnungen.push(`Prophylaxen „${name}“: Eine Maßnahme hat keinen Namen.`); continue; }
      if (alleMassnahmen.has(normName(mn))) { warnungen.push(`Prophylaxen: Die Maßnahme „${mn}“ gibt es zweimal. Jede Maßnahme gehört nur zu einer Prophylaxe.`); continue; }
      if (names.has(normName(mn))) warnungen.push(`Prophylaxen „${name}“: „${mn}“ heißt wie ein anderes Bedienelement.`);
      const einheit = x.einheit ? String(x.einheit).trim() : '', skala = einheit ? PROPH_SKALEN[einheit] : null;
      if (einheit && !skala) { warnungen.push(`Prophylaxen „${name}“, „${mn}“: einheit muss 'Minuten', 'mal' oder 'Stunden' sein.`); continue; }
      const werte = einheit ? [...new Set((Array.isArray(x.werte) ? x.werte : []).map(Number))] : [];
      if (einheit && (!werte.length || werte.some(v => !skala.includes(v)))) { warnungen.push(`Prophylaxen „${name}“, „${mn}“: werte müssen aus ${skala.join(', ')} sein.`); continue; }
      if (massnahmen.length >= PROPH_MAX_MASSNAHMEN) { warnungen.push(`Prophylaxen „${name}“: Höchstens ${PROPH_MAX_MASSNAHMEN} Maßnahmen, „${mn}“ wird übersprungen.`); continue; }
      alleMassnahmen.add(normName(mn));
      massnahmen.push({ name: mn, einheit, werte });
      for (const t of einheit ? werte.map(v => einheitText(einheit, v)) : ['']) {
        const st = t ? `${mn} ${t}` : mn;
        stufen.push(st); befehle.push(`${titel}: ${st}!`); ohne.push(`${st}!`); teile.push(mn);
      }
    }
    if (!massnahmen.length) return warnungen.push(`Prophylaxen „${name}“ hat keine Maßnahme.`);
    if (names.has(normName(name))) warnungen.push(`Der Name „${name}“ kommt zweimal vor. Situationen damit sind nicht eindeutig.`);
    names.add(normName(name));
    // Auf dem Handy stehen immer alle Zahlen einer Einheit (damit man nicht raten kann)
    const skalen = {};
    for (const x of massnahmen) if (x.einheit) skalen[x.einheit] = PROPH_SKALEN[x.einheit].map(n => ({ n, text: einheitText(x.einheit, n), klein: einheitKlein(x.einheit, n) }));
    const c = { id, name, titel, art: 'prophylaxe', stufen, thema: 'prophylaxen', befehle, ohneKategorie: ohne, teile, lustig: false, hinweis: 'Prophylaxe', gruppe: 'prophylaxen', massnahmen, skalen };
    katalog.push(c); byId.set(id, c);
  });
  // Assessmentinstrumente: je Instrument zwei Elemente, eins für „einfach“ (Punktzahl) und eins für „schwer“ (einordnen).
  // Am Beamer ist immer nur eine Stufe an (siehe pool).
  (Array.isArray(assessments) ? assessments : []).forEach((m, i) => {
    if (!m || typeof m !== 'object') return warnungen.push(`Assessments: Nr. ${i + 1} ist leer.`);
    const id = 'as-' + String(m.id || '').trim(), name = String(m.name || '').trim(), einheit = String(m.einheit || '').trim();
    if (!/^as-[a-z0-9_-]{1,24}$/.test(id)) return warnungen.push(`Assessments „${kurz(name || '?')}“: Die Kennung (id) fehlt oder enthält mehr als Kleinbuchstaben.`);
    if (byId.has(id)) return warnungen.push(`Die Assessment-Kennung „${m.id}“ gibt es zweimal. Die zweite wird übersprungen.`);
    if (!name) return warnungen.push(`Assessments „${m.id}“ hat keinen Namen.`);
    if (!themenIds.includes('pflegeprozess')) return warnungen.push(`Assessments „${name}“: Das Thema „pflegeprozess“ fehlt in THEMEN.`);
    const stufen = (Array.isArray(m.einordnung) ? m.einordnung : []).map(x => ({ name: String((x || [])[0] || '').trim(), von: Number((x || [])[1]), bis: Number((x || [])[2]) }));
    const sortiert = stufen.slice().sort((a, b) => a.von - b.von);
    const ok = stufen.length >= 2 && stufen.length <= 6 && stufen.every(x => x.name && Number.isInteger(x.von) && Number.isInteger(x.bis) && x.von <= x.bis)
      && sortiert.every((x, j) => !j || x.von === sortiert[j - 1].bis + 1) && new Set(stufen.map(x => normName(x.name))).size === stufen.length;
    if (!ok) return warnungen.push(`Assessments „${name}“: einordnung braucht 2 bis 6 Einstufungen [Name, von, bis] ohne Lücken und Überschneidungen.`);
    const von = sortiert[0].von, bis = sortiert[sortiert.length - 1].bis;
    if (bis - von + 1 > 30) return warnungen.push(`Assessments „${name}“: höchstens 30 mögliche Werte.`);
    if (names.has(normName(name))) warnungen.push(`Der Name „${name}“ kommt zweimal vor. Situationen damit sind nicht eindeutig.`);
    names.add(normName(name));
    const wert = n => einheit === 'Punkte' ? `${n} Punkte` : einheit ? `${einheit} ${n}` : String(n);
    const bereich = einheit === 'Punkte' ? `${von}–${bis} Punkte` : einheit ? `${einheit} ${von}–${bis}` : `${von}–${bis}`;
    const hinweis = `${String(m.wofuer || '').trim() || 'Assessment'} · ${bereich}`;
    const werte = Array.from({ length: bis - von + 1 }, (_, j) => von + j);
    // einfach: Punktzahl eintragen
    const e = { id, name, art: 'auswahl', thema: 'pflegeprozess', gruppe: 'assessment', modus: 'einfach', lustig: false, hinweis,
      stufen: werte.map(wert), zahlen: werte.map(String), befehle: werte.map(n => `${name}: ${wert(n)} eintragen!`) };
    // schwer: Ergebnis einordnen (Frühdienst: Einstufung als Anweisung, ab dem Spätdienst: Punktzahl → einordnen, wie eine Situation)
    const sw = { id: id + '-s', name, art: 'auswahl', thema: 'pflegeprozess', gruppe: 'assessment', modus: 'schwer', lustig: false, hinweis,
      stufen: stufen.map(x => x.name), befehle: stufen.map(x => `${name}: ${x.name} eintragen!`),
      einordnen: stufen.map(x => Array.from({ length: x.bis - x.von + 1 }, (_, j) => `${name}: ${wert(x.von + j)} – einordnen!`)) };
    for (const c of [e, sw]) { katalog.push(c); byId.set(c.id, c); }
  });
  // Was in Situationen bei „tun“ stehen darf: „Puls zählen“, „Kopfteil: 90°“, bei Medikamenten und Prophylaxen auch
  // „Pneumonieprophylaxe: Atemtrainer“ (jede Zahl zählt) oder „Pneumonieprophylaxe: Atemtrainer 10-mal“
  const aktion = new Map();
  const merke = (text, z) => { const k = normName(text); if (!aktion.has(k)) aktion.set(k, []); aktion.get(k).push(z); };
  for (const c of katalog) {
    const t = c.titel || c.name;
    if (ohneStufen(c)) merke(c.name, [c.id, 0]);
    else c.stufen.forEach((st, w) => { merke(t + ': ' + st, [c.id, w]); if (c.teile && c.teile[w] !== st) merke(t + ': ' + c.teile[w], [c.id, w]); });
  }
  const sits = [], sids = new Set();
  (Array.isArray(situationen) ? situationen : []).forEach((s, i) => {
    const text = String((s && s.text) || '').trim();
    if (!text) return warnungen.push(`Situation Nr. ${i + 1} hat keinen Text.`);
    const tun = Array.isArray(s.tun) ? s.tun : [s.tun];
    const ziele = [], fehlt = [];
    for (const t of tun) {
      const zs = aktion.get(normName(t));
      if (!zs) { fehlt.push(String(t)); continue; }
      for (const z of zs) if (!ziele.some(x => x[0] === z[0] && x[1] === z[1])) ziele.push(z.slice());
    }
    if (fehlt.length) warnungen.push(`Situation „${kurz(text)}“: „${fehlt.join('“, „')}“ passt zu keinem Bedienelement.`);
    const sid = hash(text);
    if (sids.has(sid)) return warnungen.push(`Die Situation „${kurz(text)}“ gibt es zweimal.`);
    if (!ziele.length) return;
    sids.add(sid);
    sits.push({ sid, text, ziele });
  });
  return { katalog, byId, situationen: sits, warnungen };
}

let cache = null;
export const inhalte = () => cache || (cache = pruefeInhalte());

// „Kopfteil: 90°“ bzw. „Puls zählen“ bzw. „Pneumonieprophylaxe: Atemtrainer 10-mal“
export function zielText(z, byId) {
  const c = byId.get(z[0]);
  if (!c) return '';
  return ohneStufen(c) ? c.name : `${c.titel || c.name}: ${c.stufen[z[1]]}`;
}
// Mehrere Lösungen: gleiche Elemente zusammengefasst („Kopfteil: 45° oder 60°“). Zählt bei einer Maßnahme jede Zahl,
// steht nur die Maßnahme da („Pneumonieprophylaxe: Atemtrainer“).
export function zieleText(ziele, byId) {
  const je = new Map();
  for (const z of ziele) { const c = byId.get(z[0]); if (!c) continue; if (!je.has(c.id)) je.set(c.id, { c, ws: [] }); je.get(c.id).ws.push(z[1]); }
  const out = [];
  for (const { c, ws } of je.values()) {
    if (ohneStufen(c)) { out.push(c.name); continue; }
    const teile = [];
    for (const w of ws) {
      const h = c.teile && c.teile[w];
      const alle = h ? c.stufen.map((_, i) => i).filter(i => c.teile[i] === h) : [];
      const t = alle.length > 1 && alle.every(i => ws.includes(i)) ? h : c.stufen[w];
      if (!teile.includes(t)) teile.push(t);
    }
    out.push(`${c.titel || c.name}: ${teile.join(' oder ')}`);
  }
  return out.join(' oder ');
}

// ---------------------------------------------------------------- Teams bilden
export function teamAnzahl(n, groesse) {
  if (n <= 0) return 0;
  let k = Math.max(1, Math.min(MAX_TEAMS, Math.round(n / groesse)));
  if (k > 1 && Math.floor(n / k) < 2) k = Math.max(1, Math.floor(n / 2)); // keine Station mit nur einer Person
  return k;
}
// Zufällig auf Stationen verteilen, die Größen unterscheiden sich höchstens um 1
export function teamsBilden(pids, groesse, r) {
  const list = mischen(pids, r), k = teamAnzahl(list.length, groesse);
  const teams = Array.from({ length: k }, () => []);
  list.forEach((p, i) => teams[i % k].push(p));
  return teams;
}

// ---------------------------------------------------------------- Pulte verteilen
export function proHandy(k, teamGroesse, katalogLaenge, schwierigkeit) {
  return Math.max(1, Math.min(stufe(schwierigkeit).proHandy[k], Math.floor(katalogLaenge / Math.max(1, teamGroesse))));
}
// Bedienelemente in Ziehungsreihenfolge: erst die gewählten Themen, dann die übrigen.
// aj: Medikamente nur bis zu diesem Ausbildungsjahr (andere gar nicht) · gruppenAus: diese Gruppen haben Pause (gar nicht)
// assessment: 'einfach' oder 'schwer' (Instrumente der anderen Stufe gar nicht)
export function pool(themen, katalog, r, ohne = new Set(), aj = 3, gruppenAus = [], assessment = 'einfach') {
  const an = new Set(themen);
  const frei = katalog.filter(c => !ohne.has(c.id) && !(c.aj > aj) && !(c.gruppe && gruppenAus.includes(c.gruppe)) && !(c.modus && c.modus !== assessment));
  // Gruppen aus gewählten Themen zuerst (dann sind sie sicher dabei; Patientenedukation vor Medikamenten),
  // Lustiges und Gruppen aus abgewählten Themen nur ganz zum Schluss (praktisch nie)
  const spaet = c => c.lustig || c.gruppe;
  const rang = c => { const i = Object.keys(GRUPPEN).indexOf(c.gruppe); return i < 0 ? 99 : i; };
  return mischen(frei.filter(c => an.has(c.thema) && c.gruppe), r).sort((a, b) => rang(a) - rang(b))
    .concat(mischen(frei.filter(c => an.has(c.thema) && !c.gruppe), r))
    .concat(mischen(frei.filter(c => !an.has(c.thema) && !spaet(c)), r))
    .concat(mischen(frei.filter(c => !an.has(c.thema) && spaet(c)), r));
}
// Jede Person bekommt k Elemente, davon höchstens 2 breite (passt sonst nicht aufs Handy),
// höchstens 1 aus einem lustigen Thema (Stationsalltag) und höchstens 2 aus Gruppen (Ausklapp-Listen, Medikamente).
// Gruppen kommen zusammen in die Station (siehe GRUPPEN), verteilt auf zufällige Handys: mal 1, mal 2 pro Handy.
// maxListen: höchstens so viele Elemente mit Ausklapp-Liste pro Handy (bei „Sehr leicht“ 1)
export function pultVerteilen(pids, k, liste, r = Math.random, maxListen = Infinity) {
  const slots = pids.map(pid => ({ pid, c: [], breit: 0, lustig: 0, gruppe: 0, liste: 0 }));
  const passt = (s, c) => s.c.length < k && !(breit(c) && s.breit >= 2) && !(c.lustig && s.lustig >= 1) && !(istListe(c) && s.liste >= maxListen);
  const lege = (s, c) => { s.c.push(c.id); if (breit(c)) s.breit++; if (c.lustig) s.lustig++; if (c.gruppe) s.gruppe++; if (istListe(c)) s.liste++; };
  const fertigeGruppen = new Set(), gelegt = new Set();
  for (const c of liste) {
    if (slots.every(s => s.c.length >= k)) break;
    if (c.gruppe) {
      if (fertigeGruppen.has(c.gruppe)) continue;
      fertigeGruppen.add(c.gruppe);
      if (pids.length < 2) continue; // allein: keine Gruppen
      const g = GRUPPEN[c.gruppe] || { alle: true };
      const glieder = liste.filter(x => x.gruppe === c.gruppe);
      let max = g.alle ? glieder.length : Math.min(g.max, glieder.length);
      for (const [andere, m] of Object.entries(g.maxMit || {})) if (gelegt.has(andere)) max = Math.min(max, m);
      const min = g.alle ? glieder.length : Math.min(g.min, max);
      const wunsch = g.alle ? glieder.length : min + Math.floor(r() * (max - min + 1));
      // Probeweise verteilen: jedes Glied auf ein zufälliges Handy, das noch Platz hat
      const probe = new Map(slots.map(s => [s, { n: s.c.length, b: s.breit, g: s.gruppe, l: s.liste }]));
      const plan = [];
      for (const x of glieder) {
        if (plan.length >= wunsch) break;
        const frei = slots.filter(s => { const p = probe.get(s); return p.n < k && p.g < GRUPPE_PRO_HANDY && !(breit(x) && p.b >= 2) && !(istListe(x) && p.l >= maxListen); });
        if (!frei.length) break;
        const s = frei[Math.floor(r() * frei.length)], p = probe.get(s);
        p.n++; p.g++; if (breit(x)) p.b++; if (istListe(x)) p.l++;
        plan.push([s, x]);
      }
      if (plan.length && plan.length >= min) { for (const [s, x] of plan) lege(s, x); gelegt.add(c.gruppe); }
      continue;
    }
    let best = null;
    for (const s of slots) if (passt(s, c) && (!best || s.c.length < best.c.length)) best = s;
    if (best) lege(best, c);
  }
  return Object.fromEntries(slots.map(s => [s.pid, s.c]));
}
export function startZustand(ids, byId, r) {
  const z = {};
  for (const id of ids) { const c = byId.get(id); if (c && hatZustand(c)) z[id] = Math.floor(r() * c.stufen.length); }
  return z;
}

// ---------------------------------------------------------------- Aufgaben
/**
 * Neue Aufgabe für eine Person (holder) erzeugen.
 * ctx: { pult: {pid: [id]}, zustand: {id: stufe}, auf: {pid: Aufgabe|null}, holder, online: Set|null,
 *        anteil, k (Schicht), tempoF, byId, situationen, kuerzlich: [sid], letzte: id, r, now, pause, id,
 *        ohneAb: ab dieser Schicht Medikamente und Prophylaxen auch ohne Kategorie (Standard 1 = Spätdienst) }
 * Eine Aufgabe: { id, art: 'b' (Anweisung) | 's' (Situation), text, ziele: [[id, stufe], …], tipp, sid, startAt, endAt }
 * Regeln: Kein Element ist Ziel zweier Aufgaben gleichzeitig. Schalter und Stufen sollen sich immer ÄNDERN.
 * Die Aufgabe ist immer für jemand ANDEREN aus der Station. Nur wenn auf keinem anderen Handy ein Element frei ist,
 * kommt ein eigenes dran (selbst: true, das Handy sagt dann „Das ist dein eigener Knopf“).
 */
export function neueAufgabe(ctx) {
  const { pult, zustand, auf, holder, r, byId } = ctx;
  const reserviert = new Set();
  for (const [pid, a] of Object.entries(auf || {})) if (pid !== holder && a) for (const z of a.ziele) reserviert.add(z[0]);
  const pids = Object.keys(pult).filter(pid => !ctx.online || ctx.online.has(pid) || pid === holder);
  const frei = list => {
    const out = [];
    for (const pid of list) for (const id of pult[pid] || []) if (!reserviert.has(id) && byId.has(id)) out.push(id);
    return out;
  };
  const alle = frei(pids), alleSet = new Set(alle);
  const eigene = new Set(pult[holder] || []);
  const andere = alle.filter(id => !eigene.has(id));
  const machbar = z => alleSet.has(z[0]) && (!hatZustand(byId.get(z[0])) || zustand[z[0]] !== z[1]);
  const sit = r() < (ctx.anteil || 0);
  // Erst nur Elemente der anderen; nur wenn dort nichts frei ist, auch die eigenen
  const versuche = andere.length ? [andere] : [alle];
  const k = Math.max(0, Math.min(2, ctx.k || 0)), f = ctx.tempoF || 1;
  const startAt = ctx.now + (ctx.pause || 0);
  for (const cands of versuche) {
    if (!cands.length) continue;
    const set = new Set(cands), nurAndere = cands === andere;
    if (sit) {
      // Bei „nur andere“: keine Situation, die man auch mit einem eigenen Knopf lösen könnte
      let moegl = (ctx.situationen || []).filter(s => s.ziele.some(z => set.has(z[0]) && machbar(z)) && !(nurAndere && s.ziele.some(z => eigene.has(z[0]) && machbar(z))));
      const neu = moegl.filter(s => !(ctx.kuerzlich || []).includes(s.sid));
      if (neu.length) moegl = neu;
      // Medikamente und Prophylaxen OHNE Kategorie zählen wie eine Situation („Metformin 500 mg morgens!“ – wer hat das?),
      // je Kategorie eine Möglichkeit
      // Ebenso Assessments (Stufe „schwer“): „Braden-Skala: 11 Punkte – einordnen!“ → hohes Risiko
      const ohneAb = ctx.ohneAb == null ? 1 : ctx.ohneAb;
      const meds = cands.filter(id => (istBlatt(byId.get(id)) && k >= ohneAb) || byId.get(id).einordnen);
      const i = moegl.length + meds.length ? Math.floor(r() * (moegl.length + meds.length)) : -1;
      if (i >= moegl.length) {
        const c = byId.get(meds[i - moegl.length]);
        if (c.einordnen) {
          const jetzt = zustand[c.id] || 0;
          const w = waehle(c.stufen.map((_, j) => j).filter(j => j !== jetzt), r), texte = c.einordnen[w], text = waehle(texte, r), ziele = [[c.id, w]];
          return { id: ctx.id, art: 's', text, ziele, tipp: zieleText(ziele, byId), sid: c.id + ':' + texte.indexOf(text) + ':' + w, selbst: eigene.has(c.id), startAt, endAt: startAt + Math.round(SCHICHTEN[k].situation * f) };
        }
        const w = Math.floor(r() * c.stufen.length), ziele = [[c.id, w]];
        return { id: ctx.id, art: 's', text: c.ohneKategorie[w], ziele, tipp: zieleText(ziele, byId), sid: c.id + ':' + w, selbst: eigene.has(c.id), startAt, endAt: startAt + Math.round(SCHICHTEN[k].situation * f) };
      }
      if (i >= 0) {
        const s = moegl[i];
        const ziele = s.ziele.filter(machbar).map(z => z.slice());
        return { id: ctx.id, art: 's', text: s.text, ziele, tipp: zieleText(ziele, byId), sid: s.sid, selbst: ziele.every(z => eigene.has(z[0])), startAt, endAt: startAt + Math.round(SCHICHTEN[k].situation * f) };
      }
    }
    let ids = cands.filter(id => id !== ctx.letzte);
    if (!ids.length) ids = cands;
    const id = waehle(ids, r), c = byId.get(id);
    let w = 0;
    if (hatZustand(c)) {
      const jetzt = zustand[id] || 0;
      w = waehle(c.stufen.map((_, i) => i).filter(i => i !== jetzt), r);
    } else if (c.art === 'dosis' || istBlatt(c)) w = Math.floor(r() * c.stufen.length);
    const ziele = [[id, w]];
    // Zwei Formen der Anweisung (z. B. „Pflegeprozess: Evaluation!“ oder „Pflegeprozess auf Schritt 6!“)
    const text = c.befehle2 && r() < 0.5 ? c.befehle2[w] : c.befehle[w];
    return { id: ctx.id, art: 'b', text, ziele, tipp: zieleText(ziele, byId), sid: '', selbst: eigene.has(id), startAt, endAt: startAt + Math.round(SCHICHTEN[k].direkt * f) };
  }
  return null;
}

// Kennenlernen („Sehr leicht“): für jedes eigene Element eine Anweisung, die man einmal ausprobiert
export function kennenSchritte(ids, zustand, byId) {
  return (ids || []).map(id => byId.get(id)).filter(Boolean).map(c => {
    const n = c.stufen.length;
    const w = ohneStufen(c) ? 0 : hatZustand(c) ? ((zustand[c.id] || 0) + 1) % n : c.art === 'dosis' ? Math.min(1, n - 1) : 0;
    return { id: c.id, w, text: c.befehle[w] };
  });
}

// Welche Aufgabe erledigt die Aktion (Element id auf Stufe w)? Rückgabe: pid der Person mit der Aufgabe oder null
export function trefferSuchen(auf, id, w, now) {
  for (const [pid, a] of Object.entries(auf || {})) {
    if (!a || now < a.startAt - 300 || now > a.endAt + GNADE) continue;
    if (a.ziele.some(z => z[0] === id && z[1] === w)) return pid;
  }
  return null;
}

// Im Takt tippen: Zeitpunkte (ms) → Takt pro Minute und ob er passt
export function taktPruefen(zeiten, c) {
  if (zeiten.length < 2) return { proMin: 0, ok: false };
  const proMin = Math.round(60000 / ((zeiten[zeiten.length - 1] - zeiten[0]) / (zeiten.length - 1)));
  return { proMin, ok: proMin >= c.min - TAKT_TOLERANZ && proMin <= c.max + TAKT_TOLERANZ };
}
