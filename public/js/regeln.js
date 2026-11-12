/*
 * Spielregeln, Zeiten und Zufall. Diese Datei lesen Handys, Beamer UND der Cloudflare-Dienst.
 * Die Inhalte (Bedienelemente, Situationen) stehen in inhalte.js.
 */
import { THEMEN, PULT, SITUATIONEN } from './inhalte.js';

// ---------------------------------------------------------------- Einstellungen am Beamer
export const TEAM_GROESSEN = [2, 3, 4, 5, 6];   // Personen pro Station (voreingestellt: 4)
export const MAX_TEAMS = 10;                     // höchstens 10 Stationen
export const DAUERN = [60, 90, 120, 180];        // Dauer einer Schicht in Sekunden (voreingestellt: 2 Minuten)
export const dauerText = s => s % 60 ? (s === 90 ? '1,5 Minuten' : s + ' Sekunden') : s === 60 ? '1 Minute' : s / 60 + ' Minuten';
export const TEMPI = {
  ruhig: { name: 'Ruhig', f: 1.4, kurz: 'Viel Zeit für jede Aufgabe. Gut für den Einstieg.' },
  normal: { name: 'Normal', f: 1, kurz: 'Etwa 15 Sekunden für eine Anweisung, 25 Sekunden für eine Situation.' },
  schnell: { name: 'Schnell', f: 0.75, kurz: 'Für eingespielte Teams: weniger Zeit für jede Aufgabe.' },
};
// Anteil der Situationen je Schicht (Früh, Spät, Nacht)
export const ANWEISUNGEN = {
  steigend: { name: 'Steigend', anteil: [0, 0.5, 0.7], kurz: 'Frühdienst: nur Anweisungen („Bettgitter hoch!“). Ab dem Spätdienst kommen Situationen dazu („Frau K. hat Atemnot“), im Nachtdienst noch mehr.' },
  befehle: { name: 'Nur Anweisungen', anteil: [0, 0, 0], kurz: 'Immer direkte Anweisungen („Bettgitter hoch!“). Gut zum Kennenlernen der Begriffe.' },
  situationen: { name: 'Nur Situationen', anteil: [1, 1, 1], kurz: 'Immer Situationen: Das Team muss erkennen, was zu tun ist. Für Fortgeschrittene.' },
};
export const STANDARD_CFG = { groesse: 4, dauer: 120, tempo: 'normal', anweisungen: 'steigend', themen: THEMEN.map(t => t.id) };

// ---------------------------------------------------------------- Die drei Schichten
// proHandy: Bedienelemente auf jedem Handy · direkt/situation: Zeit für eine Aufgabe (ms, bei Tempo „Normal“)
// verblasst: Nach so vielen ms wird die Anweisung blass (müde Augen im Nachtdienst). 0 = nie
export const SCHICHTEN = [
  { id: 'frueh', name: 'Frühdienst', proHandy: 4, direkt: 15000, situation: 25000, verblasst: 0 },
  { id: 'spaet', name: 'Spätdienst', proHandy: 5, direkt: 14000, situation: 24000, verblasst: 0 },
  { id: 'nacht', name: 'Nachtdienst', proHandy: 6, direkt: 13000, situation: 22000, verblasst: 4000 },
];
export function schichtText(k, anweisungen) {
  const a = (ANWEISUNGEN[anweisungen] || ANWEISUNGEN.steigend).anteil[k] || 0;
  const art = a === 0 ? 'Nur Anweisungen' : a >= 1 ? 'Situationen erkennen' : 'Anweisungen und Situationen';
  const s = SCHICHTEN[k];
  return `${art} · ${s.proHandy} Elemente pro Handy${s.verblasst ? ' · Die Aufgabe wird nach ein paar Sekunden blass. Schnell lesen!' : ''}`;
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
export const FREMD_ANTEIL = 0.85;    // so oft liegt das passende Element auf einem ANDEREN Handy (wenn möglich)
export const VORLAUF_START = 5000;   // Countdown vor jeder Schicht
export const PAUSE_OK = 900;         // nach einer erledigten Aufgabe: „✓ Erledigt“ zeigen
export const PAUSE_VERPASST = 1500;  // nach einer verpassten Anweisung: Auflösung zeigen
export const PAUSE_VERPASST_SIT = 3500; // nach einer verpassten Situation: Auflösung in Ruhe lesen
export const GNADE = 1200;           // so lange nach Ablauf zählen Aktionen noch (Netz)
export const TIPP_AB = 0.5;          // Situationen: nach der Hälfte der Zeit erscheint ein Tipp

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
export function pruefeInhalte(themen = THEMEN, pult = PULT, situationen = SITUATIONEN) {
  const warnungen = [];
  const themenIds = (Array.isArray(themen) ? themen : []).map(t => t && t.id).filter(Boolean);
  const katalog = [], byId = new Map(), names = new Set();
  (Array.isArray(pult) ? pult : []).forEach((e, i) => {
    if (!e || typeof e !== 'object') return warnungen.push(`Bedienelement Nr. ${i + 1} ist leer.`);
    const id = String(e.id || '').trim(), name = String(e.name || '').trim(), art = e.art;
    if (!/^[a-z0-9_-]{1,30}$/.test(id)) return warnungen.push(`Bedienelement „${kurz(name || '?')}“: Die Kennung (id) fehlt oder enthält mehr als Kleinbuchstaben.`);
    if (byId.has(id)) return warnungen.push(`Die Kennung „${id}“ gibt es zweimal. Das zweite Element wird übersprungen.`);
    if (!name) return warnungen.push(`Bedienelement „${id}“ hat keinen Namen.`);
    if (!['knopf', 'schalter', 'stufen'].includes(art)) return warnungen.push(`Bedienelement „${name}“: art muss 'knopf', 'schalter' oder 'stufen' sein.`);
    let stufen = [];
    if (art !== 'knopf') {
      stufen = (Array.isArray(e.stufen) ? e.stufen : []).map(s => String(s).trim()).filter(Boolean);
      if (new Set(stufen.map(normName)).size !== stufen.length) return warnungen.push(`Bedienelement „${name}“: Zwei Stufen heißen gleich.`);
      if (art === 'schalter' && stufen.length !== 2) return warnungen.push(`Schalter „${name}“ braucht genau 2 Stufen.`);
      if (art === 'stufen' && (stufen.length < 2 || stufen.length > 5)) return warnungen.push(`„${name}“ braucht 2 bis 5 Stufen.`);
    }
    let thema = e.thema;
    if (!themenIds.includes(thema)) { warnungen.push(`Bedienelement „${name}“: Thema „${thema}“ gibt es nicht.`); thema = themenIds[0] || 'x'; }
    if (names.has(normName(name))) warnungen.push(`Der Name „${name}“ kommt zweimal vor. Situationen damit sind nicht eindeutig.`);
    names.add(normName(name));
    const befehle = art === 'knopf'
      ? [String(e.befehl || '').trim() || name + '!']
      : stufen.map((s, j) => (Array.isArray(e.befehle) && String(e.befehle[j] || '').trim()) || `${name}: ${s}!`);
    const c = { id, name, art, stufen, thema, befehle };
    katalog.push(c); byId.set(id, c);
  });
  const aktion = new Map();
  for (const c of katalog) {
    if (c.art === 'knopf') aktion.set(normName(c.name), [c.id, 0]);
    else c.stufen.forEach((s, w) => aktion.set(normName(c.name + ': ' + s), [c.id, w]));
  }
  const sits = [], sids = new Set();
  (Array.isArray(situationen) ? situationen : []).forEach((s, i) => {
    const text = String((s && s.text) || '').trim();
    if (!text) return warnungen.push(`Situation Nr. ${i + 1} hat keinen Text.`);
    const tun = Array.isArray(s.tun) ? s.tun : [s.tun];
    const ziele = [], fehlt = [];
    for (const t of tun) {
      const z = aktion.get(normName(t));
      if (!z) { fehlt.push(String(t)); continue; }
      if (!ziele.some(x => x[0] === z[0] && x[1] === z[1])) ziele.push(z.slice());
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

// „Oberkörper: sitzend“ bzw. „Puls zählen“
export function zielText(z, byId) {
  const c = byId.get(z[0]);
  if (!c) return '';
  return c.art === 'knopf' ? c.name : `${c.name}: ${c.stufen[z[1]]}`;
}
export const zieleText = (ziele, byId) => ziele.map(z => zielText(z, byId)).filter(Boolean).join(' oder ');

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
export function proHandy(k, teamGroesse, katalogLaenge) {
  return Math.max(1, Math.min(SCHICHTEN[k].proHandy, Math.floor(katalogLaenge / Math.max(1, teamGroesse))));
}
// Bedienelemente in Ziehungsreihenfolge: erst die gewählten Themen, dann die übrigen
export function pool(themen, katalog, r, ohne = new Set()) {
  const an = new Set(themen);
  const frei = katalog.filter(c => !ohne.has(c.id));
  return mischen(frei.filter(c => an.has(c.thema)), r).concat(mischen(frei.filter(c => !an.has(c.thema)), r));
}
// Jede Person bekommt k Elemente, davon höchstens 2 breite Stufen-Regler (passt sonst nicht aufs Handy)
export function pultVerteilen(pids, k, liste) {
  const slots = pids.map(pid => ({ pid, c: [], st: 0 }));
  for (const c of liste) {
    if (slots.every(s => s.c.length >= k)) break;
    let best = null;
    for (const s of slots) {
      if (s.c.length >= k || (c.art === 'stufen' && s.st >= 2)) continue;
      if (!best || s.c.length < best.c.length) best = s;
    }
    if (!best) continue;
    best.c.push(c.id);
    if (c.art === 'stufen') best.st++;
  }
  return Object.fromEntries(slots.map(s => [s.pid, s.c]));
}
export function startZustand(ids, byId, r) {
  const z = {};
  for (const id of ids) { const c = byId.get(id); if (c && c.art !== 'knopf') z[id] = Math.floor(r() * c.stufen.length); }
  return z;
}

// ---------------------------------------------------------------- Aufgaben
/**
 * Neue Aufgabe für eine Person (holder) erzeugen.
 * ctx: { pult: {pid: [id]}, zustand: {id: stufe}, auf: {pid: Aufgabe|null}, holder, online: Set|null,
 *        anteil, k (Schicht), tempoF, byId, situationen, kuerzlich: [sid], letzte: id, r, now, pause, id }
 * Eine Aufgabe: { id, art: 'b' (Anweisung) | 's' (Situation), text, ziele: [[id, stufe], …], tipp, sid, startAt, endAt }
 * Regeln: Kein Element ist Ziel zweier Aufgaben gleichzeitig. Schalter und Stufen sollen sich immer ÄNDERN.
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
  const andere = frei(pids.filter(p => p !== holder));
  const machbar = z => alleSet.has(z[0]) && (byId.get(z[0]).art === 'knopf' || zustand[z[0]] !== z[1]);
  const sit = r() < (ctx.anteil || 0);
  const versuche = [];
  if (andere.length && r() < FREMD_ANTEIL) versuche.push(andere);
  versuche.push(alle);
  const k = Math.max(0, Math.min(2, ctx.k || 0)), f = ctx.tempoF || 1;
  const startAt = ctx.now + (ctx.pause || 0);
  for (const cands of versuche) {
    if (!cands.length) continue;
    const set = new Set(cands);
    if (sit) {
      let moegl = (ctx.situationen || []).filter(s => s.ziele.some(z => set.has(z[0]) && machbar(z)));
      const neu = moegl.filter(s => !(ctx.kuerzlich || []).includes(s.sid));
      if (neu.length) moegl = neu;
      if (moegl.length) {
        const s = waehle(moegl, r);
        const ziele = s.ziele.filter(machbar).map(z => z.slice());
        return { id: ctx.id, art: 's', text: s.text, ziele, tipp: zieleText(ziele, byId), sid: s.sid, startAt, endAt: startAt + Math.round(SCHICHTEN[k].situation * f) };
      }
    }
    let ids = cands.filter(id => id !== ctx.letzte);
    if (!ids.length) ids = cands;
    const id = waehle(ids, r), c = byId.get(id);
    let w = 0;
    if (c.art !== 'knopf') {
      const jetzt = zustand[id] || 0;
      w = waehle(c.stufen.map((_, i) => i).filter(i => i !== jetzt), r);
    }
    const ziele = [[id, w]];
    return { id: ctx.id, art: 'b', text: c.befehle[w], ziele, tipp: zieleText(ziele, byId), sid: '', startAt, endAt: startAt + Math.round(SCHICHTEN[k].direkt * f) };
  }
  return null;
}

// Welche Aufgabe erledigt die Aktion (Element id auf Stufe w)? Rückgabe: pid der Person mit der Aufgabe oder null
export function trefferSuchen(auf, id, w, now) {
  for (const [pid, a] of Object.entries(auf || {})) {
    if (!a || now < a.startAt - 300 || now > a.endAt + GNADE) continue;
    if (a.ziele.some(z => z[0] === id && z[1] === w)) return pid;
  }
  return null;
}
