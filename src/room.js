// Raum-Logik für eine Klasse: Anmeldung, Stationen (Teams), drei Schichten, Übergabe und Siegerehrung.
// Diese Datei kennt weder Cloudflare noch Node. Der Server-Adapter
// (src/worker.js für Cloudflare, server/local.mjs für den Laptop) reicht Verbindungen und Speicher herein.
import { THEMEN } from '../public/js/inhalte.js';
import {
  inhalte, STANDARD_CFG, TEAM_GROESSEN, DAUERN, TEMPI, ANWEISUNGEN, SCHICHTEN, VORLAUF_START, GNADE, WAHLEN, WAHL_SEKUNDEN, WAHL_PLUS, wahlMax,
  teamAnzahl, mischen, ohneStufen, hatZustand, STOER_WAHL, STOERUNGEN, STOER_ABSTAND, EREIGNIS_VORLAUF, EREIGNIS_DAUER, EREIGNIS_BONUS, ereignisPlan,
  PAUSE_OK, PAUSE_VERPASST, PAUSE_VERPASST_SIT, PUNKTE_TREFFER, PUNKTE_FEHLGRIFF,
  zielPunkte, prozent, teamsBilden, proHandy, pool, pultVerteilen, startZustand, neueAufgabe, trefferSuchen, zieleText, stationName, COMPUTER, MED_AJ,
  istBlatt, gruppenPause, ASSESS_WAHL,
} from '../public/js/regeln.js';

export const MAX_PLAYERS = 60;
// Was das Handy über ein Bedienelement wissen muss (ohne Anweisungen und Lösungen)
export function pultSicht(c) {
  const v = { id: c.id, art: c.art, name: c.name, stufen: c.stufen, thema: c.thema };
  for (const k of ['knopf', 'sekunden', 'anzahl', 'min', 'max', 'hinweis', 'zeiten', 'titel', 'skalen', 'nummern', 'zahlen']) if (c[k] != null) v[k] = c[k];
  // Medikamente: Wirkstoffe mit ihren Dosen (welche Zeitpunkte üblich sind, bleibt auf dem Server)
  if (c.wirkstoffe) v.wirkstoffe = c.wirkstoffe.map(w => ({ name: w.name, dosen: w.dosen }));
  // Prophylaxen: Maßnahmen mit ihrer Einheit (welche Zahlen üblich sind, bleibt auf dem Server)
  if (c.massnahmen) v.massnahmen = c.massnahmen.map(m => ({ name: m.name, einheit: m.einheit }));
  return v;
}
const NAME_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ' -]{0,15}$/;

export function cleanName(first, initial) {
  first = String(first || '').trim().replace(/\s+/g, ' ');
  initial = String(initial || '').trim();
  if (!NAME_RE.test(first)) return null;
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ]$/.test(initial)) return null;
  const cap = s => s.charAt(0).toLocaleUpperCase('de-DE') + s.slice(1);
  return cap(first) + ' ' + initial.toLocaleUpperCase('de-DE') + '.';
}
const int = (v, lo, hi, def) => {
  v = Number(v);
  return Number.isInteger(v) && v >= lo && v <= hi ? v : def;
};

export function cleanCfg(c, old) {
  c = c || {}; old = old || STANDARD_CFG;
  const pick = (v, list, def) => list.includes(v) ? v : def;
  const alle = THEMEN.map(t => t.id);
  let themen = Array.isArray(c.themen) ? [...new Set(c.themen.filter(t => alle.includes(t)))] : null;
  if (!themen || !themen.length) themen = Array.isArray(old.themen) ? old.themen.filter(t => alle.includes(t)) : [];
  if (!themen.length) themen = alle;
  return {
    groesse: pick(Number(c.groesse), TEAM_GROESSEN, pick(Number(old.groesse), TEAM_GROESSEN, STANDARD_CFG.groesse)),
    dauer: pick(Number(c.dauer), DAUERN, pick(Number(old.dauer), DAUERN, STANDARD_CFG.dauer)),
    tempo: pick(c.tempo, Object.keys(TEMPI), pick(old.tempo, Object.keys(TEMPI), STANDARD_CFG.tempo)),
    anweisungen: pick(c.anweisungen, Object.keys(ANWEISUNGEN), pick(old.anweisungen, Object.keys(ANWEISUNGEN), STANDARD_CFG.anweisungen)),
    themen,
    wahl: pick(c.wahl, Object.keys(WAHLEN), pick(old.wahl, Object.keys(WAHLEN), STANDARD_CFG.wahl)),
    stoerungen: pick(c.stoerungen, Object.keys(STOER_WAHL), pick(old.stoerungen, Object.keys(STOER_WAHL), STANDARD_CFG.stoerungen)),
    medAJ: pick(Number(c.medAJ), Object.keys(MED_AJ).map(Number), pick(Number(old.medAJ), Object.keys(MED_AJ).map(Number), STANDARD_CFG.medAJ)),
    assessment: pick(c.assessment, Object.keys(ASSESS_WAHL), pick(old.assessment, Object.keys(ASSESS_WAHL), STANDARD_CFG.assessment)),
  };
}

export function freshState(code) {
  return {
    v: 1, code, teacherKey: null, created: 0, updated: 0,
    phase: 'lobby', // lobby | wahl (Stationen selbst wählen) | teams | schicht | uebergabe | ende
    cfg: cleanCfg({}),
    players: {},
    order: [],   // pids in Anmelde-Reihenfolge
    teams: [],   // Stationen
    teamModus: 'zufall', // wie die Stationen entstanden sind: 'selbst' (gewählt) oder 'zufall'
    wahl: null,  // während der Wahl: { endAt }
    spiel: null, // laufende bzw. letzte Schicht
    stat: {},    // Situationen: wie oft gezeigt, erledigt, verpasst (für „Das war knifflig“)
    nr: 0,       // zählt die Schichten, damit alte Nachrichten nicht zählen
    aid: 0,      // fortlaufende Nummer der Aufgaben
  };
}
const leer3 = () => [0, 0, 0];
const neueStats = () => ({ tr: 0, fg: 0, ok: 0, vp: 0 }); // tr = Treffer (für andere erledigt), fg = Fehlgriffe, ok/vp = eigene Aufgaben erledigt/verpasst
function neuesTeam(s) {
  return { s, pids: [], punkte: leer3(), ziel: leer3(), ok: leer3(), fg: leer3(), vp: leer3(), run: null };
}

// Rangliste einer Schicht k (nur Stationen, die mitgespielt haben)
export function rangliste(teams, k) {
  return teams.map((t, i) => i).filter(i => teams[i].ziel[k] > 0)
    .sort((a, b) => (prozent(teams[b].punkte[k], teams[b].ziel[k]) - prozent(teams[a].punkte[k], teams[a].ziel[k])) || (teams[b].ok[k] - teams[a].ok[k]) || (a - b));
}
// Gesamtpunkte: Summe der Prozente aller Schichten bis k
export function gesamt(t, k) {
  let sum = 0;
  for (let j = 0; j <= k; j++) if (t.ziel[j] > 0) sum += prozent(t.punkte[j], t.ziel[j]);
  return sum;
}
export function gesamtRangliste(teams, k) {
  const okSum = t => t.ok.slice(0, k + 1).reduce((a, b) => a + b, 0);
  return teams.map((t, i) => i).filter(i => teams[i].ziel.slice(0, k + 1).some(z => z > 0))
    .sort((a, b) => (gesamt(teams[b], k) - gesamt(teams[a], k)) || (okSum(teams[b]) - okSum(teams[a])) || (a - b));
}

export class RoomLogic {
  /**
   * @param {object} io  Adapter:
   *   io.load() -> Promise<state|null>
   *   io.save(state) -> Promise
   *   io.wipe() -> Promise
   *   io.conns() -> Array<{meta, ws, send(obj), sendRaw(str), close(code, reason)}>
   *   io.setMeta(conn, meta)
   *   io.now() -> ms
   *   io.random() -> Zahl zwischen 0 und 1 (wahlweise, für Tests)
   */
  constructor(io) { this.io = io; this.s = null; this.r = io.random || Math.random; }

  async state(code) {
    if (!this.s) this.s = (await this.io.load()) || freshState(code);
    return this.s;
  }
  async persist() { this.s.updated = this.io.now(); await this.io.save(this.s); }

  // ---------- Verbindungen
  async open(conn, q) {
    const s = await this.state(q.code);
    const role = q.role === 'teacher' ? 'teacher' : 'player';
    if (role === 'teacher') {
      const key = String(q.key || '');
      if (key.length < 12 || key.length > 64) return this.reject(conn, 'bad-key');
      if (!s.teacherKey) { s.teacherKey = key; s.created = this.io.now(); await this.persist(); }
      else if (s.teacherKey !== key) return this.reject(conn, 'code-taken');
      this.io.setMeta(conn, { role: 'teacher' });
      conn.send(this.roomMsg());
    } else {
      const pid = String(q.pid || '');
      if (!/^[a-z0-9]{8,24}$/.test(pid)) return this.reject(conn, 'bad-pid');
      if (!s.teacherKey) return this.reject(conn, 'no-room');
      this.io.setMeta(conn, { role: 'player', pid });
      // Wieder da (z. B. nach dem Neuladen): eine neue Aufgabe bekommen
      const p = s.players[pid];
      const ch = p && s.phase === 'schicht' ? this.sweep(s) : new Set();
      if (ch.size) await this.persist();
      if (ch.has('alle')) return this.pushAll();
      conn.send(this.youMsg(pid));
      if (p && p.team >= 0) this.pushTeam(s.teams[p.team], pid);
      this.pushTeachers();
    }
  }
  reject(conn, why) {
    try { conn.send({ t: 'error', why }); conn.close(4001, why); } catch (e) {}
  }
  async close(conn) {
    const m = conn.meta || {};
    if (m.role !== 'player') return;
    const s = await this.state();
    this.closing = conn.ws;
    try {
      const p = s.players[m.pid];
      if (p && p.team >= 0) this.pushTeam(s.teams[p.team]);
      this.pushTeachers();
    } finally { this.closing = null; }
  }

  // ---------- Nachrichten
  async message(conn, raw) {
    if (typeof raw !== 'string' || raw.length > 4096) return;
    let msg; try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;
    const m = conn.meta || {};
    const s = await this.state();
    if (msg.t === 'sync') { conn.send({ t: 'sync', c: msg.c, s: this.io.now() }); return; }
    if (m.role === 'teacher') return this.teacherMsg(conn, msg, s);
    if (m.role === 'player') return this.playerMsg(conn, msg, s, m.pid);
  }

  async teacherMsg(conn, msg, s) {
    switch (msg.t) {
      case 'cfg': {
        s.cfg = cleanCfg(msg.cfg, s.cfg);
        await this.persist(); this.pushTeachers(); return;
      }
      case 'kick': {
        const pid = String(msg.pid || ''); if (!s.players[pid]) return;
        this.entfernen(s, pid);
        await this.persist(); this.pushAll(); return;
      }
      case 'computer': {
        // Testlauf allein: drei Computer-Mitspieler dazu (nur in der Anmeldung) oder alle wieder entfernen
        if (msg.an) {
          if (s.phase !== 'lobby') return;
          const namen = new Set(Object.values(s.players).map(p => p.name));
          for (const name of COMPUTER.namen) {
            if (namen.has(name) || s.order.length >= MAX_PLAYERS) continue;
            const pid = 'robo' + Array.from({ length: 12 }, () => Math.floor(this.r() * 36).toString(36)).join('');
            s.players[pid] = { name, at: this.io.now(), team: -1, st: null, sum: null, zuletzt: null, zugeteilt: false, bot: true };
            s.order.push(pid);
          }
        } else {
          for (const pid of s.order.filter(x => s.players[x] && s.players[x].bot)) this.entfernen(s, pid);
        }
        await this.persist(); this.pushAll(); return;
      }
      case 'teams-bilden': {
        if (!['lobby', 'wahl', 'teams', 'uebergabe', 'ende'].includes(s.phase)) return;
        if (msg.cfg) s.cfg = cleanCfg(msg.cfg, s.cfg);
        const pids = s.order.filter(p => s.players[p]);
        if (!pids.length) return conn.send({ t: 'error', why: 'no-players' });
        const modus = WAHLEN[msg.modus] ? msg.modus : s.cfg.wahl;
        for (const pid of s.order) { s.players[pid].team = -1; s.players[pid].zugeteilt = false; }
        s.spiel = null; s.teamModus = modus;
        if (modus === 'selbst') {
          // Leere Stationen anlegen, die SuS wählen selbst
          s.teams = Array.from({ length: teamAnzahl(pids.length, s.cfg.groesse) }, (_, i) => neuesTeam(i));
          s.wahl = { endAt: this.io.now() + WAHL_SEKUNDEN * 1000 };
          s.phase = 'wahl';
          // Computer-Mitspieler wählen sofort (jeweils die kleinste Station)
          for (const pid of pids) if (s.players[pid].bot) this.inTeam(s, pid, this.kleinste(s));
        } else {
          s.teams = teamsBilden(pids, s.cfg.groesse, this.r).map((list, i) => { const t = neuesTeam(i); t.pids = list; return t; });
          s.teams.forEach((t, i) => t.pids.forEach(pid => { s.players[pid].team = i; }));
          s.wahl = null; s.phase = 'teams';
        }
        await this.persist(); this.pushAll(); return;
      }
      case 'wahl-plus': {
        if (s.phase !== 'wahl' || !s.wahl) return;
        s.wahl.endAt = Math.max(s.wahl.endAt, this.io.now()) + WAHL_PLUS * 1000;
        await this.persist(); this.pushAll(); return;
      }
      case 'verteilen': {
        if (s.phase !== 'wahl') return;
        this.verteilen(s);
        await this.persist(); this.pushAll(); return;
      }
      case 'verschieben': {
        if (!['wahl', 'teams', 'uebergabe'].includes(s.phase)) return;
        const pid = String(msg.pid || ''), ti = int(msg.team, 0, s.teams.length - 1, -1);
        const p = s.players[pid]; if (!p || ti < 0 || p.team === ti) return;
        this.ausTeam(s, pid); this.inTeam(s, pid, ti);
        p.zugeteilt = s.phase !== 'wahl'; // von der Lehrkraft gesetzt: muss sich evtl. umsetzen
        await this.persist(); this.pushAll(); return;
      }
      case 'schicht-start': case 'nochmal': {
        let k;
        if (msg.t === 'nochmal') { if (s.phase !== 'ende') return; k = 0; }
        else if (s.phase === 'teams') k = 0;
        else if (s.phase === 'uebergabe' && s.spiel && s.spiel.k < 2) k = s.spiel.k + 1;
        else return;
        if (msg.cfg) s.cfg = cleanCfg(msg.cfg, s.cfg);
        if (!s.teams.some(t => t.pids.some(pid => s.players[pid]))) return conn.send({ t: 'error', why: 'no-players' });
        this.startSchicht(s, k);
        await this.persist(); this.pushAll(); return;
      }
      case 'tick': {
        // Der Beamer meldet sich jede Sekunde: Ende der Stationswahl, abgelaufene Aufgaben ersetzen, Schichtende prüfen
        if (s.phase === 'wahl') return this.wahlEnde(s);
        if (s.phase !== 'schicht') return;
        const ch = this.sweep(s);
        for (const i of this.computerZug(s)) ch.add(i);
        if (!ch.size) return;
        await this.persist();
        if (ch.has('alle') || s.phase !== 'schicht') this.pushAll(); else { for (const i of ch) this.pushTeam(s.teams[i]); this.pushTeachers(); }
        return;
      }
      case 'schicht-ende': {
        // Die Lehrkraft beendet die Schicht vorzeitig
        if (s.phase !== 'schicht' || !s.spiel || msg.nr !== s.spiel.nr) return;
        this.schichtSchliessen(s);
        await this.persist(); this.pushAll(); return;
      }
      case 'to-lobby': {
        s.phase = 'lobby'; s.teams = []; s.spiel = null; s.stat = {}; s.wahl = null;
        for (const pid of s.order) { const p = s.players[pid]; p.team = -1; p.st = null; p.sum = null; p.zuletzt = null; p.zugeteilt = false; }
        await this.persist(); this.pushAll(); return;
      }
      case 'wipe': {
        for (const c of this.io.conns()) { try { c.send({ t: 'ended' }); c.close(4000, 'ended'); } catch (e) {} }
        this.s = null; await this.io.wipe(); return;
      }
    }
  }

  async playerMsg(conn, msg, s, pid) {
    const now = this.io.now();
    // Die Testansicht zeigt die Handys der Computer-Mitspieler nur an
    if (s.players[pid] && s.players[pid].bot && msg.t !== 'zeit') return;
    switch (msg.t) {
      case 'join': {
        const name = cleanName(msg.first, msg.initial);
        if (!name) return conn.send({ t: 'error', why: 'bad-name' });
        let p = s.players[pid];
        if (!p) {
          if (s.order.length >= MAX_PLAYERS) return conn.send({ t: 'error', why: 'full' });
          let shown = name, n = 2;
          const taken = new Set(Object.values(s.players).map(x => x.name));
          while (taken.has(shown)) shown = name + ' ' + (n++);
          p = s.players[pid] = { name: shown, at: now, team: -1, st: null, sum: null, zuletzt: null, zugeteilt: false };
          s.order.push(pid);
          // Nachzügler bei zufälligen Stationen: in die kleinste Station. Beim Selbst-Wählen wählen sie selbst.
          if (s.phase !== 'lobby' && s.phase !== 'wahl' && s.teams.length && s.teamModus !== 'selbst') {
            this.inTeam(s, pid, this.kleinste(s));
            p.zugeteilt = true;
          }
        }
        await this.persist();
        conn.send(this.youMsg(pid));
        if (p.team >= 0) this.pushTeam(s.teams[p.team], pid);
        this.pushTeachers(); return;
      }
      case 'leave': {
        // „Nicht ich?“: Name freigeben, solange noch keine Schicht läuft
        const p = s.players[pid]; if (!p) return;
        if (!['lobby', 'wahl', 'teams'].includes(s.phase)) return;
        const ti = p.team;
        this.ausTeam(s, pid);
        delete s.players[pid]; s.order = s.order.filter(x => x !== pid);
        await this.persist(); conn.send(this.youMsg(pid));
        if (s.phase === 'wahl') this.pushAll();
        else { if (ti >= 0) this.pushTeam(s.teams[ti]); this.pushTeachers(); }
        return;
      }
      case 'waehle': {
        // Station selbst wählen: während der Wahl (wechseln erlaubt) oder später als Nachzügler ohne Station
        const p = s.players[pid]; if (!p) return;
        const ti = int(msg.team, 0, s.teams.length - 1, -1); if (ti < 0 || p.team === ti) return;
        const spaeter = s.teamModus === 'selbst' && p.team < 0 && ['teams', 'schicht', 'uebergabe', 'ende'].includes(s.phase);
        if (s.phase !== 'wahl' && !spaeter) return;
        if (this.voll(s, ti)) { conn.send({ t: 'error', why: 'voll' }); conn.send(this.youMsg(pid)); return; }
        this.ausTeam(s, pid); this.inTeam(s, pid, ti);
        p.zugeteilt = false;
        await this.persist(); this.pushAll(); return;
      }
      case 'tun': {
        const r = this.tun(s, pid, msg.c, msg.w, msg.nr);
        if (!r) return;
        if (r.tat) conn.send(r.tat);
        await this.persist();
        if (r.ch.has('alle') || s.phase !== 'schicht') { this.pushAll(); return; }
        this.pushTeam(r.t);
        for (const i of r.ch) if (s.teams[i] !== r.t) this.pushTeam(s.teams[i]);
        this.pushTeachers();
        return;
      }
      case 'ereignis': {
        // Eine Person hat beim Ereignis mitgemacht. Hat es die ganze Station geschafft: Bonus
        const sp = s.spiel, p = s.players[pid];
        if (!p || s.phase !== 'schicht' || !sp || !sp.open || msg.nr !== sp.nr || p.team < 0) return;
        const e = (sp.ereignisse || []).find(x => x.eid === msg.eid);
        if (!e || now < e.startAt - 500 || now > e.endAt + GNADE || e.done[pid]) return;
        const t = this.ereignisTun(s, pid, e);
        await this.persist(); this.pushTeam(t); this.pushTeachers(); return;
      }
      case 'zeit': {
        // Das Handy meldet: Meine Aufgabe (oder die Stationswahl) ist abgelaufen
        if (s.phase === 'wahl') return this.wahlEnde(s);
        if (s.phase !== 'schicht' || !s.spiel || msg.nr !== s.spiel.nr) return;
        const ch = this.sweep(s);
        if (!ch.size) return;
        await this.persist();
        if (ch.has('alle')) this.pushAll(); else { for (const i of ch) this.pushTeam(s.teams[i]); this.pushTeachers(); }
        return;
      }
    }
  }

  // Ein Bedienelement wurde bedient (von einem Handy oder einem Computer-Mitspieler).
  // Rückgabe: null (ungültig, nichts geändert) oder { t: Station, ch: geänderte Stationen, tat: Rückmeldung fürs Handy }
  tun(s, pid, cid, wert, nr) {
    const sp = s.spiel, p = s.players[pid], now = this.io.now();
    if (!p || s.phase !== 'schicht' || !sp || !sp.open || nr !== sp.nr) return null;
    if (now < sp.startAt - 300 || now > sp.endAt + GNADE) return null;
    const t = s.teams[p.team]; if (!t || !t.run) return null;
    const id = String(cid || '');
    if (!(t.run.pult[pid] || []).includes(id)) return null;
    const c = inhalte().byId.get(id); if (!c) return null;
    // Medikamente, Prophylaxen: Eine Kombination, die es so nicht gibt (z. B. falscher Zeitpunkt), kommt als stufen.length an: immer ein Fehlgriff
    const w = ohneStufen(c) ? 0 : int(wert, 0, c.stufen.length - (istBlatt(c) ? 0 : 1), -1);
    if (w < 0) return null;
    if (hatZustand(c)) {
      if (t.run.zustand[id] === w) return null; // steht schon so
      t.run.zustand[id] = w;
    }
    const ch = this.sweep(s);
    if (s.phase !== 'schicht') return { t, ch, tat: null };
    const k = sp.k, holder = trefferSuchen(t.run.auf, id, w, now);
    let tat;
    if (holder) {
      const a = t.run.auf[holder], h = s.players[holder];
      t.punkte[k] += PUNKTE_TREFFER; t.ok[k]++;
      p.st.tr++; p.sum.tr++; h.st.ok++; h.sum.ok++;
      if (a.sid && s.stat[a.sid]) s.stat[a.sid].ok[k]++;
      h.zuletzt = { id: a.id, ok: true, von: holder === pid ? '' : p.name, text: a.text, art: a.art, loesung: a.tipp };
      t.run.auf[holder] = null;
      this.aufgabeGeben(s, t, holder, PAUSE_OK, this.online());
      if (!t.run.hundert && prozent(t.punkte[k], t.ziel[k]) >= 100) t.run.hundert = now;
      tat = { t: 'tat', nr: sp.nr, c: id, w, ok: true, fuer: holder === pid ? '' : h.name };
    } else {
      t.punkte[k] += PUNKTE_FEHLGRIFF; t.fg[k]++;
      p.st.fg++; p.sum.fg++;
      tat = { t: 'tat', nr: sp.nr, c: id, w, ok: false };
    }
    return { t, ch, tat };
  }

  // Beim Ereignis mitgemacht. Hat es die ganze Station geschafft: Bonus. Rückgabe: die Station
  ereignisTun(s, pid, e) {
    const sp = s.spiel, p = s.players[pid], now = this.io.now();
    e.done[pid] = now;
    const t = s.teams[p.team], ti = p.team, on = this.online(), k = sp.k;
    const pflicht = t.pids.filter(x => on.has(x) || e.done[x]);
    if (!e.bonus[ti] && pflicht.length && pflicht.every(x => e.done[x])) {
      const bonus = Math.max(2, Math.round(t.ziel[k] * EREIGNIS_BONUS));
      e.bonus[ti] = bonus;
      t.punkte[k] += bonus;
      if (t.run && !t.run.hundert && prozent(t.punkte[k], t.ziel[k]) >= 100) t.run.hundert = now;
    }
    return t;
  }

  // ---------- Computer-Mitspieler (Testlauf allein)
  // Läuft mit jedem Takt des Beamers (jede Sekunde). Jede Aufgabe, deren Element ein Computer-Mitspieler hat,
  // erledigt er nach 2–4 Sekunden (Situationen etwas später). Manchmal greift er erst daneben oder vergisst sie.
  // Rückgabe: Set der geänderten Stationen
  computerZug(s) {
    const ch = new Set(), sp = s.spiel;
    if (s.phase !== 'schicht' || !sp || !sp.open) return ch;
    const now = this.io.now(), I = inhalte();
    const zwischen = ([lo, hi]) => lo + Math.floor(this.r() * (hi - lo + 1));
    const melden = (pid, tat) => { if (tat) for (const c of this.io.conns()) if ((c.meta || {}).pid === pid) c.send(tat); };
    s.teams.forEach((t, i) => {
      const run = t.run;
      if (!run || s.phase !== 'schicht') return;
      const bots = t.pids.filter(pid => s.players[pid] && s.players[pid].bot && run.pult[pid]);
      if (!bots.length) return;
      run.cpu = run.cpu || {};
      const offen = new Set();
      for (const [holder, a] of Object.entries(run.auf)) {
        if (!a || !s.players[holder]) continue;
        offen.add(String(a.id));
        let plan = run.cpu[a.id];
        if (!plan) {
          // Welcher Computer-Mitspieler hat ein passendes Element? (Sonst ist der Mensch dran.)
          let bot = null, ziel = null;
          for (const z of a.ziele) { bot = bots.find(b => run.pult[b].includes(z[0])); if (bot) { ziel = z; break; } }
          if (!bot) { run.cpu[a.id] = { aus: true }; continue; }
          const x = this.r(), vg = COMPUTER.vergessen[a.art] || 0;
          plan = run.cpu[a.id] = {
            bot, z: ziel.slice(), at: Math.max(now, a.startAt) + zwischen(a.art === 's' ? COMPUTER.situation : COMPUTER.direkt),
            art: x < vg ? 'vergessen' : x < vg + COMPUTER.fehlgriff ? 'fehlgriff' : 'ok',
          };
        }
        if (plan.aus || plan.fertig || now < plan.at) continue;
        if (plan.art === 'vergessen') { plan.fertig = true; continue; }
        if (plan.art === 'fehlgriff') {
          // Erst daneben (ein Element, das gerade niemand braucht), kurz danach richtig
          plan.art = 'ok'; plan.at = now + zwischen([1200, 2500]);
          const falsch = this.falscherGriff(run, plan.bot, I);
          if (falsch) { const r = this.tun(s, plan.bot, falsch[0], falsch[1], sp.nr); if (r) { melden(plan.bot, r.tat); for (const j of r.ch) ch.add(j); ch.add(i); } }
          continue;
        }
        plan.fertig = true;
        const r = this.tun(s, plan.bot, plan.z[0], plan.z[1], sp.nr);
        if (r) { melden(plan.bot, r.tat); for (const j of r.ch) ch.add(j); ch.add(i); }
        if (s.phase !== 'schicht') return;
      }
      for (const id of Object.keys(run.cpu)) if (!offen.has(id)) delete run.cpu[id];
      // Gemeinsames Ereignis: Computer-Mitspieler machen nach ein paar Sekunden mit
      for (const e of sp.ereignisse || []) {
        if (now < e.startAt || now > e.endAt) continue;
        e.cpu = e.cpu || {};
        for (const b of bots) {
          if (e.done[b]) continue;
          if (!e.cpu[b]) e.cpu[b] = e.startAt + zwischen(COMPUTER.ereignis);
          if (now >= e.cpu[b]) { this.ereignisTun(s, b, e); ch.add(i); }
        }
      }
    });
    return ch;
  }
  // Ein Griff daneben: ein Element des Computer-Mitspielers, das gerade keine Aufgabe braucht
  falscherGriff(run, pid, I) {
    const gebraucht = new Set();
    for (const a of Object.values(run.auf)) if (a) for (const z of a.ziele) gebraucht.add(z[0]);
    const frei = (run.pult[pid] || []).filter(id => !gebraucht.has(id) && I.byId.has(id));
    if (!frei.length) return null;
    const c = I.byId.get(frei[Math.floor(this.r() * frei.length)]);
    if (ohneStufen(c)) return [c.id, 0];
    const werte = c.stufen.map((_, w) => w).filter(w => !hatZustand(c) || w !== run.zustand[c.id]);
    return werte.length ? [c.id, werte[Math.floor(this.r() * werte.length)]] : null;
  }

  // ---------- Stationen
  entfernen(s, pid) {
    this.ausTeam(s, pid);
    delete s.players[pid]; s.order = s.order.filter(p => p !== pid);
    for (const c of this.io.conns()) if ((c.meta || {}).pid === pid) c.send({ t: 'kicked' });
  }
  inTeam(s, pid, ti) {
    const p = s.players[pid], t = s.teams[ti];
    if (!p || !t) return;
    if (!t.pids.includes(pid)) t.pids.push(pid);
    p.team = ti;
    const sp = s.spiel;
    if (s.phase !== 'schicht' || !sp || !sp.open) return;
    // Mitten in der Schicht: eigenes Pult aus den noch freien Bedienelementen und eine Aufgabe
    const now = this.io.now(), k = sp.k, I = inhalte();
    if (!p.st) p.st = neueStats();
    if (!p.sum) p.sum = neueStats();
    if (!t.run) t.run = { pult: {}, zustand: {}, auf: {}, letzte: {}, kuerzlich: [], verpasst: [], hundert: 0 };
    const benutzt = new Set(Object.values(t.run.pult).flat());
    const andere = Object.values(t.run.pult).map(l => l.length);
    const kk = Math.max(1, andere.length ? Math.max(...andere) : proHandy(k, 1, I.katalog.length));
    const ids = pultVerteilen([pid], kk, pool(sp.themen, I.katalog, this.r, benutzt, sp.medAJ, sp.gruppenAus || [], sp.assessment), this.r)[pid];
    t.run.pult[pid] = ids;
    Object.assign(t.run.zustand, startZustand(ids, I.byId, this.r));
    t.run.auf[pid] = null;
    const rest = Math.max(0, sp.endAt - Math.max(now, sp.startAt));
    t.ziel[k] += zielPunkte(1, rest, sp.anteil, sp.tempoF);
    this.aufgabeGeben(s, t, pid, Math.max(1500, sp.startAt - now + 500), this.online());
  }

  ausTeam(s, pid) {
    const p = s.players[pid];
    if (!p || p.team < 0) return;
    const t = s.teams[p.team];
    p.team = -1;
    if (!t) return;
    t.pids = t.pids.filter(x => x !== pid);
    const run = t.run, sp = s.spiel;
    if (!run) return;
    const weg = new Set(run.pult[pid] || []);
    delete run.pult[pid]; delete run.auf[pid]; delete run.letzte[pid];
    for (const id of weg) delete run.zustand[id];
    if (s.phase === 'schicht' && sp && sp.open) {
      const now = this.io.now(), k = sp.k;
      const rest = Math.max(0, sp.endAt - Math.max(now, sp.startAt));
      t.ziel[k] = t.pids.length ? Math.max(2, t.ziel[k] - zielPunkte(1, rest, sp.anteil, sp.tempoF)) : t.ziel[k];
      // Aufgaben, deren Bedienelemente weg sind, ersetzen (ohne Strafe)
      for (const [h, a] of Object.entries(run.auf)) {
        if (!a || !a.ziele.some(z => weg.has(z[0]))) continue;
        a.ziele = a.ziele.filter(z => !weg.has(z[0]));
        if (a.ziele.length) { a.tipp = zieleText(a.ziele, inhalte().byId); continue; }
        run.auf[h] = null;
        this.aufgabeGeben(s, t, h, 600, this.online());
      }
    }
  }

  kleinste(s, ohne = -1) {
    let best = -1;
    s.teams.forEach((t, i) => { if (i !== ohne && (best < 0 || t.pids.length < s.teams[best].pids.length)) best = i; });
    return best;
  }
  // Station voll? (Die kleinste Station nimmt immer noch jemanden auf)
  voll(s, ti) {
    const n = s.order.filter(pid => s.players[pid]).length;
    const len = s.teams[ti].pids.length;
    return len >= wahlMax(n, s.teams.length) && len > Math.min(...s.teams.map(t => t.pids.length));
  }
  async wahlEnde(s) {
    if (s.phase !== 'wahl' || !s.wahl || this.io.now() < s.wahl.endAt) return;
    this.verteilen(s);
    await this.persist(); this.pushAll();
  }
  // Ende der Wahl: Wer keine Station hat, kommt in die kleinste. Leere Stationen fallen weg, niemand bleibt allein.
  verteilen(s) {
    for (const pid of mischen(s.order.filter(p => s.players[p] && s.players[p].team < 0), this.r)) {
      this.inTeam(s, pid, this.kleinste(s));
      s.players[pid].zugeteilt = true;
    }
    while (s.teams.length > 1) {
      const leer = s.teams.findIndex(t => !t.pids.length);
      if (leer >= 0) { this.teamEntfernen(s, leer); continue; }
      const allein = s.teams.findIndex(t => t.pids.length === 1);
      if (allein < 0) break;
      const pid = s.teams[allein].pids[0];
      this.ausTeam(s, pid);
      this.inTeam(s, pid, this.kleinste(s, allein));
      s.players[pid].zugeteilt = true;
    }
    s.wahl = null; s.phase = 'teams';
  }
  teamEntfernen(s, ti) {
    s.teams.splice(ti, 1);
    s.teams.forEach((t, i) => t.pids.forEach(pid => { if (s.players[pid]) s.players[pid].team = i; }));
  }

  // ---------- Schichten
  startSchicht(s, k) {
    const now = this.io.now(), cfg = s.cfg, I = inhalte();
    if (k === 0) {
      s.stat = {};
      for (const t of s.teams) Object.assign(t, { punkte: leer3(), ziel: leer3(), ok: leer3(), fg: leer3(), vp: leer3() });
      for (const pid of s.order) s.players[pid].sum = neueStats();
    }
    s.nr++;
    const anteil = (ANWEISUNGEN[cfg.anweisungen] || ANWEISUNGEN.steigend).anteil[k];
    const tempoF = (TEMPI[cfg.tempo] || TEMPI.normal).f;
    const sp = s.spiel = {
      nr: s.nr, k, startAt: now + VORLAUF_START, endAt: now + VORLAUF_START + cfg.dauer * 1000, open: true,
      anteil, tempoF, dauer: cfg.dauer, themen: cfg.themen.slice(), anweisungen: cfg.anweisungen, medAJ: cfg.medAJ,
      gruppenAus: gruppenPause(cfg.themen, k), // Listen-Themen: abwechselnd Pause, wenn mehr als zwei an sind
      assessment: cfg.assessment,
    };
    for (const pid of s.order) { const p = s.players[pid]; p.st = neueStats(); p.zuletzt = null; if (!p.sum) p.sum = neueStats(); }
    const on = this.online();
    for (const t of s.teams) {
      t.pids = t.pids.filter(pid => s.players[pid]);
      t.punkte[k] = 0; t.ok[k] = 0; t.fg[k] = 0; t.vp[k] = 0;
      t.ziel[k] = t.pids.length ? zielPunkte(t.pids.length, cfg.dauer * 1000, anteil, tempoF) : 0;
      t.run = null;
      if (!t.pids.length) continue;
      const kk = proHandy(k, t.pids.length, I.katalog.length);
      const pult = pultVerteilen(t.pids, kk, pool(cfg.themen, I.katalog, this.r, undefined, cfg.medAJ, sp.gruppenAus, cfg.assessment), this.r);
      t.run = { pult, zustand: startZustand(Object.values(pult).flat(), I.byId, this.r), auf: {}, letzte: {}, kuerzlich: [], verpasst: [], hundert: 0 };
      for (const pid of t.pids) t.run.auf[pid] = null;
      // Die ersten Aufgaben kommen leicht versetzt, damit nicht alle gleichzeitig rufen
      for (const pid of t.pids) if (on.has(pid)) this.aufgabeGeben(s, t, pid, VORLAUF_START + Math.floor(this.r() * 1500), on);
    }
    // Ab dem Spätdienst: gemeinsame Ereignisse und Störungen auf einzelnen Handys
    sp.ereignisse = [];
    if (k >= 1 && cfg.stoerungen === 'an') {
      ereignisPlan(k, cfg.dauer, this.r).forEach((e, j) => {
        const at = sp.startAt + Math.round(cfg.dauer * 1000 * e.anteil);
        sp.ereignisse.push({ eid: j + 1, art: e.art, at, startAt: at + EREIGNIS_VORLAUF, endAt: at + EREIGNIS_VORLAUF + EREIGNIS_DAUER, aktiv: false, done: {}, bonus: {} });
      });
      for (const t of s.teams) if (t.run) t.run.stoer = this.stoerPlan(s, t);
    }
    s.phase = 'schicht';
  }

  // Störungen einer Station: alle 30–60 Sekunden auf einem zufälligen Handy, nicht während eines Ereignisses
  stoerPlan(s, t) {
    const sp = s.spiel, plan = [], arten = Object.keys(STOERUNGEN);
    const rand = (lo, hi) => lo + Math.floor(this.r() * (hi - lo + 1));
    for (let at = sp.startAt + rand(12000, 22000); at < sp.endAt - 12000; at += rand(...STOER_ABSTAND)) {
      const e = sp.ereignisse.find(x => at > x.at - 4000 && at < x.endAt + 3000);
      if (e) { at = e.endAt + rand(3000, 8000); if (at >= sp.endAt - 12000) break; } // nach dem Ereignis
      const pid = t.pids[Math.floor(this.r() * t.pids.length)];
      const ids = mischen(t.run.pult[pid] || [], this.r).slice(0, rand(1, 2));
      if (!ids.length) continue;
      plan.push({ sid: plan.length + 1, pid, at, art: arten[Math.floor(this.r() * arten.length)], ziele: ids });
    }
    return plan;
  }
  aktivesEreignis(sp, zeit) { return (sp.ereignisse || []).find(e => zeit >= e.at - 500 && zeit < e.endAt); }

  aufgabeGeben(s, t, pid, pause, on) {
    const run = t.run, sp = s.spiel, I = inhalte(), now = this.io.now();
    if (!run || !sp || !sp.open) return;
    // Während eines Ereignisses gibt es keine neuen Aufgaben: die nächste kommt danach
    const ev = this.aktivesEreignis(sp, now + pause);
    if (ev) pause = ev.endAt - now + 800;
    if (now + pause > sp.endAt - 1500) { run.auf[pid] = null; return; } // kurz vor Schluss: nichts Neues mehr
    s.aid++;
    const a = neueAufgabe({
      pult: run.pult, zustand: run.zustand, auf: run.auf, holder: pid, online: on, anteil: sp.anteil, k: sp.k, tempoF: sp.tempoF,
      byId: I.byId, situationen: I.situationen, kuerzlich: run.kuerzlich, letzte: run.letzte[pid], r: this.r, now, pause, id: s.aid,
    });
    run.auf[pid] = a;
    if (!a) return;
    run.letzte[pid] = a.ziele[0][0];
    if (a.sid) {
      run.kuerzlich.push(a.sid);
      if (run.kuerzlich.length > 10) run.kuerzlich.shift();
      const sit = I.situationen.find(x => x.sid === a.sid);
      const st = s.stat[a.sid] || (s.stat[a.sid] = { t: a.text, l: sit ? zieleText(sit.ziele, I.byId) : a.tipp, n: leer3(), ok: leer3(), vp: leer3() });
      st.n[sp.k]++;
    }
  }

  // Abgelaufene Aufgaben ersetzen, fehlende verteilen, Schichtende prüfen.
  // Rückgabe: Set der geänderten Stationen (oder 'alle')
  sweep(s) {
    const ch = new Set(), sp = s.spiel;
    if (s.phase !== 'schicht' || !sp || !sp.open) return ch;
    const now = this.io.now();
    if (now >= sp.endAt) { this.schichtSchliessen(s); ch.add('alle'); return ch; }
    const on = this.online(), k = sp.k;
    // Ein Ereignis beginnt: laufende Aufgaben pausieren (ihre Zeit verlängert sich um die Dauer des Ereignisses)
    for (const e of sp.ereignisse || []) {
      if (e.aktiv || now < e.at) continue;
      e.aktiv = true;
      const plus = Math.max(0, e.endAt - now) + 800;
      for (const t of s.teams) if (t.run) for (const a of Object.values(t.run.auf)) if (a && a.endAt > now - GNADE) a.endAt += plus;
      ch.add('alle');
    }
    s.teams.forEach((t, i) => {
      const run = t.run; if (!run) return;
      for (const pid of t.pids) {
        const a = run.auf[pid], p = s.players[pid];
        if (!p) continue;
        if (a && now > a.endAt + GNADE) {
          t.vp[k]++; p.st.vp++; p.sum.vp++;
          if (a.sid) {
            if (s.stat[a.sid]) s.stat[a.sid].vp[k]++;
            if (!run.verpasst.some(v => v.sid === a.sid)) run.verpasst.push({ sid: a.sid, text: a.text, loesung: a.tipp });
          }
          p.zuletzt = { id: a.id, ok: false, text: a.text, art: a.art, loesung: a.tipp };
          run.auf[pid] = null;
          if (on.has(pid)) this.aufgabeGeben(s, t, pid, a.art === 's' ? PAUSE_VERPASST_SIT : PAUSE_VERPASST, on);
          ch.add(i);
        } else if (!a && on.has(pid) && now < sp.endAt - 2000) {
          this.aufgabeGeben(s, t, pid, Math.max(300, sp.startAt - now), on);
          if (run.auf[pid]) ch.add(i);
        }
      }
    });
    return ch;
  }

  schichtSchliessen(s) {
    const sp = s.spiel;
    if (!sp || !sp.open) return;
    sp.open = false; sp.endedAt = this.io.now();
    for (const t of s.teams) if (t.run) for (const pid of Object.keys(t.run.auf)) t.run.auf[pid] = null;
    s.phase = sp.k >= 2 ? 'ende' : 'uebergabe';
  }

  // ---------- Sicht auf den Raum
  online() {
    const set = new Set();
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player' && c.ws !== this.closing) set.add(m.pid); }
    // Computer-Mitspieler sind immer da (auch ohne geöffnete Testansicht)
    if (this.s) for (const pid of this.s.order) if (this.s.players[pid] && this.s.players[pid].bot) set.add(pid);
    return set;
  }
  knifflig(k) {
    const list = Object.values(this.s.stat || {}).map(x => {
      const n = k == null ? x.n.reduce((a, b) => a + b, 0) : x.n[k];
      const vp = k == null ? x.vp.reduce((a, b) => a + b, 0) : x.vp[k];
      return { text: x.t, loesung: x.l, n, vp };
    }).filter(x => x.vp > 0);
    list.sort((a, b) => (b.vp - a.vp) || (b.vp / b.n - a.vp / a.n));
    return list.slice(0, 5);
  }
  teamSicht(t, i, on, mitPid) {
    const s = this.s, sp = s.spiel, k = sp ? sp.k : 0;
    return {
      i, s: t.s, name: stationName(t.s),
      mitglieder: t.pids.filter(pid => s.players[pid]).map(pid => ({ pid: mitPid ? pid : undefined, name: s.players[pid].name, online: on.has(pid), zugeteilt: !!s.players[pid].zugeteilt, bot: !!s.players[pid].bot })),
      punkte: t.punkte, ziel: t.ziel, ok: t.ok, fg: t.fg, vp: t.vp,
      prozent: t.ziel.map((z, j) => prozent(t.punkte[j], z)), gesamt: gesamt(t, k), hundert: t.run ? t.run.hundert : 0,
    };
  }
  roomMsg() {
    const s = this.s, on = this.online(), sp = s.spiel;
    const players = s.order.filter(p => s.players[p]).map(pid => ({ pid, name: s.players[pid].name, online: on.has(pid), team: s.players[pid].team, bot: !!s.players[pid].bot }));
    const k = sp ? sp.k : 0;
    return {
      t: 'room', code: s.code, phase: s.phase, cfg: s.cfg, now: this.io.now(), players,
      teamModus: s.teamModus, wahl: s.wahl, wahlMax: s.teams.length ? wahlMax(players.length, s.teams.length) : 0,
      teams: s.teams.map((t, i) => this.teamSicht(t, i, on, true)),
      spiel: sp ? { nr: sp.nr, k, startAt: sp.startAt, endAt: sp.endAt, open: sp.open, anteil: sp.anteil, dauer: sp.dauer, anweisungen: sp.anweisungen,
        ereignisse: (sp.ereignisse || []).map(e => ({ eid: e.eid, art: e.art, at: e.at, startAt: e.startAt, endAt: e.endAt,
          stand: s.teams.map((t, i) => ({ fertig: t.pids.filter(x => e.done[x]).length, von: t.pids.filter(x => on.has(x) || e.done[x]).length, bonus: e.bonus[i] || 0 })) })) } : null,
      rang: sp ? rangliste(s.teams, k) : [], gesamtRang: sp ? gesamtRangliste(s.teams, k) : [],
      knifflig: sp ? this.knifflig(k) : [], kniffligAlle: s.phase === 'ende' ? this.knifflig(null) : [],
      warnungen: inhalte().warnungen.slice(0, 8),
    };
  }
  youMsg(pid) {
    const s = this.s, p = s.players[pid] || null, sp = s.spiel, I = inhalte();
    const t = p && p.team >= 0 ? s.teams[p.team] : null;
    const on = this.online();
    const msg = { t: 'you', phase: s.phase, now: this.io.now(), me: null, team: null, spiel: null, pult: null, zustand: null, auf: null };
    if (!p) return msg;
    msg.me = { name: p.name, st: p.st, sum: p.sum, zuletzt: p.zuletzt, zugeteilt: !!p.zugeteilt, bot: !!p.bot };
    // Station wählen: während der Wahl, oder später als Nachzügler ohne Station
    if (s.phase === 'wahl' || (s.teamModus === 'selbst' && p.team < 0 && s.teams.length && ['teams', 'schicht', 'uebergabe', 'ende'].includes(s.phase))) {
      msg.wahl = {
        endAt: s.phase === 'wahl' && s.wahl ? s.wahl.endAt : 0, meine: p.team,
        max: wahlMax(s.order.filter(x => s.players[x]).length, s.teams.length),
        stationen: s.teams.map((t, i) => ({ i, s: t.s, name: stationName(t.s), namen: t.pids.map(x => s.players[x].name), voll: i !== p.team && this.voll(s, i) })),
      };
    }
    if (sp) msg.spiel = { nr: sp.nr, k: sp.k, startAt: sp.startAt, endAt: sp.endAt, open: sp.open, dauer: sp.dauer, anteil: sp.anteil, anweisungen: sp.anweisungen, stoerungen: s.cfg.stoerungen };
    if (!t) return msg;
    msg.team = this.teamSicht(t, p.team, on, false);
    msg.team.mitglieder.forEach((m, j) => { m.ich = t.pids.filter(x => s.players[x])[j] === pid; });
    if (sp && (s.phase === 'uebergabe' || s.phase === 'ende' || s.phase === 'schicht')) {
      const r = rangliste(s.teams, sp.k), g = gesamtRangliste(s.teams, sp.k);
      msg.team.platz = r.indexOf(p.team) + 1; msg.team.von = r.length;
      msg.team.gesamtPlatz = g.indexOf(p.team) + 1;
      if (s.phase !== 'schicht') {
        msg.rang = g.map(i => ({ name: stationName(s.teams[i].s), s: s.teams[i].s, gesamt: gesamt(s.teams[i], sp.k), ich: i === p.team }));
        msg.verpasst = t.run ? t.run.verpasst : [];
      }
    }
    if (s.phase === 'schicht' && t.run && t.run.pult[pid]) {
      msg.pult = t.run.pult[pid].map(id => { const c = I.byId.get(id); return c ? pultSicht(c) : null; }).filter(Boolean);
      msg.zustand = {};
      for (const id of t.run.pult[pid]) if (id in t.run.zustand) msg.zustand[id] = t.run.zustand[id];
      const a = t.run.auf[pid];
      if (a) msg.auf = { id: a.id, art: a.art, text: a.text, tipp: a.art === 's' ? a.tipp : '', selbst: !!a.selbst, startAt: a.startAt, endAt: a.endAt };
      msg.verblasst = SCHICHTEN[sp.k].verblasst;
      // Störungen auf diesem Handy (mit Zeitpunkt) und gemeinsame Ereignisse mit dem Stand der eigenen Station
      msg.stoerungen = (t.run.stoer || []).filter(x => x.pid === pid).map(x => ({ sid: x.sid, at: x.at, art: x.art, ziele: x.ziele }));
      msg.ereignisse = (sp.ereignisse || []).map(e => ({ eid: e.eid, art: e.art, at: e.at, startAt: e.startAt, endAt: e.endAt, ich: !!e.done[pid],
        fertig: t.pids.filter(x => e.done[x]).length, von: t.pids.filter(x => on.has(x) || e.done[x]).length, bonus: e.bonus[p.team] || 0 }));
    }
    return msg;
  }
  pushTeachers() {
    if (!this.s) return;
    let msg = null;
    for (const c of this.io.conns()) if ((c.meta || {}).role === 'teacher') { msg = msg || JSON.stringify(this.roomMsg()); c.sendRaw(msg); }
  }
  pushTeam(t, ohne) {
    if (!this.s || !t) return;
    const set = new Set(t.pids);
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player' && set.has(m.pid) && m.pid !== ohne) c.send(this.youMsg(m.pid)); }
  }
  pushPlayers() {
    if (!this.s) return;
    for (const c of this.io.conns()) { const m = c.meta || {}; if (m.role === 'player') c.send(this.youMsg(m.pid)); }
  }
  pushAll() { this.pushTeachers(); this.pushPlayers(); }
}
