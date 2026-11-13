// Tests der Regeln und der Raum-Logik ohne Server:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomLogic, cleanName, cleanCfg, rangliste, gesamt } from '../src/room.js';
import {
  inhalte, pruefeInhalte, rng, teamsBilden, teamAnzahl, pultVerteilen, pool, startZustand, neueAufgabe, trefferSuchen,
  zielPunkte, prozent, SCHICHTEN, SCHWIERIGKEIT, stufe, stufeK, VORLAUF_START, GNADE, PAUSE_OK, MAX_TEAMS, WAHL_SEKUNDEN, WAHL_PLUS, wahlMax,
  ohneStufen, hatZustand, breit, taktPruefen, ARTEN, EREIGNIS_VORLAUF, EREIGNIS_DAUER, STOERUNGEN, COMPUTER, KENNEN_MS, istBlatt, istListe, gruppenPause, listenDran, schichtText, zieleText,
} from '../public/js/regeln.js';
import { THEMEN, PULT, SITUATIONEN, MEDIKAMENTE, MED_ZEITPUNKTE, PROPHYLAXEN, PROPH_SKALEN, ASSESSMENTS } from '../public/js/inhalte.js';

const I = inhalte();

function makeRoom(seed = 7) {
  let t = 1_000_000, saved = null;
  const conns = [];
  const logic = new RoomLogic({
    load: async () => saved, save: async s => { saved = structuredClone(s); }, wipe: async () => { saved = null; },
    conns: () => conns, setMeta: (c, m) => { c.meta = m; }, now: () => t, random: rng(seed),
  });
  const conn = () => { const c = { meta: {}, ws: {}, inbox: [], send(o) { this.inbox.push(o); }, sendRaw(s) { this.inbox.push(JSON.parse(s)); }, close() {} }; conns.push(c); return c; };
  const last = (c, type) => [...c.inbox].reverse().find(m => m.t === type);
  const offline = c => { const i = conns.indexOf(c); if (i >= 0) conns.splice(i, 1); };
  return { logic, conn, last, offline, conns, tick: ms => { t += ms; }, now: () => t, msg: (c, o) => logic.message(c, JSON.stringify(o)) };
}

async function anmelden(R, n) {
  const T = R.conn();
  await R.logic.open(T, { code: 'ABCDE', role: 'teacher', key: 'k'.repeat(20) });
  const P = [];
  for (let i = 0; i < n; i++) {
    const c = R.conn(); c.pid = 'spieler' + String(i).padStart(3, '0');
    await R.logic.open(c, { code: 'ABCDE', role: 'player', pid: c.pid });
    await R.msg(c, { t: 'join', first: 'Name' + 'abcdefghijklmnopqrstuvwxyz'[i % 26] + (i >= 26 ? 'x' : ''), initial: 'K' });
    P.push(c);
  }
  return { T, P };
}
async function klasse(R, n, cfg = {}) {
  const { T, P } = await anmelden(R, n);
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 3, dauer: 60, schwierigkeit: 'schwer', anweisungen: 'steigend', stoerungen: 'an', wahl: 'zufall', ...cfg } });
  return { T, P };
}
const you = (R, c) => R.last(c, 'you');
// Wer in der Station von „von“ hat das Bedienelement?
function besitzer(R, P, id, von) {
  const team = R.logic.s.players[von.pid].team;
  for (const c of P) { if (R.logic.s.players[c.pid].team !== team) continue; const y = you(R, c); if (y && y.pult && y.pult.some(x => x.id === id)) return c; }
  return null;
}
// Die richtige Aktion zu einer Aufgabe (aus Sicht des Servers)
function loesung(R, c) {
  const s = R.logic.s, p = s.players[c.pid], t = s.teams[p.team];
  const a = t.run.auf[c.pid];
  return a ? a.ziele[0] : null;
}

// ---------------------------------------------------------------- Inhalte und Regeln
test('Namen werden geprüft und vereinheitlicht', () => {
  assert.equal(cleanName('lena', 'k'), 'Lena K.');
  assert.equal(cleanName('', 'k'), null);
  assert.equal(cleanName('Lena', ''), null);
  assert.equal(cleanName('<b>', 'k'), null);
});

test('Inhalte: ohne Fehler, genug Bedienelemente, alle Situationen lösbar', () => {
  assert.deepEqual(I.warnungen, []);
  assert.ok(I.katalog.length >= 36, 'mindestens 36 Bedienelemente (6 Personen × 6 Elemente)');
  assert.equal(I.katalog.length, PULT.length + MEDIKAMENTE.length + PROPHYLAXEN.length + 2 * ASSESSMENTS.length); // Assessments: einfach und schwer
  assert.equal(I.situationen.length, SITUATIONEN.length);
  for (const th of THEMEN) assert.ok(I.katalog.filter(c => c.thema === th.id).length >= (th.id === 'kommunikation' ? 4 : 6), th.name + ' hat genug Elemente');
  for (const s of I.situationen) for (const [id, w] of s.ziele) {
    const c = I.byId.get(id);
    assert.ok(c, s.text);
    assert.ok(ohneStufen(c) ? w === 0 : w < c.stufen.length, s.text);
  }
  // Jede Anweisung hat einen Text
  for (const c of I.katalog) for (const b of c.befehle) assert.ok(b.length > 2 && b.length <= 64, c.name + ': ' + b);
  // Jede Anweisung ist eindeutig einem Element und einer Stufe zugeordnet
  const befehle = I.katalog.flatMap(c => c.befehle);
  assert.equal(new Set(befehle).size, befehle.length, 'keine Anweisung doppelt');
  // Jedes Element passt aufs Handy (lange Namen werden getrennt)
  for (const c of I.katalog) assert.ok(c.name.length <= 24, 'Name zu lang: ' + c.name);
});

test('Fehler in der Inhalte-Datei werden übersprungen und gemeldet', () => {
  const r = pruefeInhalte(
    [{ id: 'a', name: 'A' }],
    [
      { id: 'x', thema: 'a', art: 'knopf', name: 'Puls zählen' },
      { id: 'x', thema: 'a', art: 'knopf', name: 'Doppelt' },
      { id: 'y', thema: 'a', art: 'schalter', name: 'Gitter', stufen: ['unten'] },
      { id: 'z', thema: 'a', art: 'stufen', name: 'Oberkörper', stufen: ['flach', '30°', 'sitzend'] },
      { id: 'Q', thema: 'a', art: 'knopf', name: 'Groß' },
    ],
    [
      { text: 'Atemnot', tun: ['oberkörper:sitzend', 'Gibt es nicht'] },
      { text: 'Herzrasen', tun: 'Puls zählen' },
      { text: 'Kaputt', tun: ['Nichts'] },
    ],
  );
  assert.deepEqual(r.katalog.map(c => c.id), ['x', 'z']);
  assert.deepEqual(r.katalog[1].befehle, ['Oberkörper: flach!', 'Oberkörper: 30°!', 'Oberkörper: sitzend!']);
  assert.deepEqual(r.situationen.map(s => s.text), ['Atemnot', 'Herzrasen']);
  assert.deepEqual(r.situationen[0].ziele, [['z', 2]]);
  assert.equal(r.warnungen.length, 5);
});

test('Stationen: gleich groß, höchstens 10, niemand allein', () => {
  const r = rng(3);
  const sizes = (n, g) => teamsBilden(Array.from({ length: n }, (_, i) => 'p' + i), g, r).map(t => t.length).sort((a, b) => b - a);
  assert.deepEqual(sizes(30, 4), [4, 4, 4, 4, 4, 4, 3, 3]);
  assert.deepEqual(sizes(7, 4), [4, 3]);
  assert.deepEqual(sizes(3, 2), [3]);
  assert.deepEqual(sizes(1, 4), [1]);
  assert.equal(teamAnzahl(60, 2), MAX_TEAMS);
  for (let n = 2; n <= 60; n++) for (const g of [2, 3, 4, 5, 6]) {
    const s = sizes(n, g);
    assert.ok(s[0] - s[s.length - 1] <= 1 && s[s.length - 1] >= 2, `${n} Personen, Größe ${g}: ${s}`);
    assert.equal(s.reduce((a, b) => a + b, 0), n);
  }
});

test('Pulte: jedes Element nur einmal pro Station, höchstens 2 Stufen-Regler pro Handy, gewählte Themen zuerst', () => {
  const r = rng(11);
  for (let i = 0; i < 50; i++) {
    const pids = ['a', 'b', 'c', 'd', 'e', 'f'];
    const p = pultVerteilen(pids, 6, pool(['notfall'], I.katalog, r));
    const all = Object.values(p).flat();
    assert.equal(new Set(all).size, all.length);
    assert.equal(all.length, 36);
    for (const list of Object.values(p)) {
      assert.equal(list.length, 6);
      assert.ok(list.filter(id => breit(I.byId.get(id))).length <= 2);
      assert.ok(list.filter(id => I.byId.get(id).lustig).length <= 1);
    }
    const nf = I.katalog.filter(c => c.thema === 'notfall').length;
    assert.equal(all.filter(id => I.byId.get(id).thema === 'notfall').length, nf, 'alle Notfall-Elemente sind dabei');
  }
});

test('Aufgaben: nie zwei auf dasselbe Element, Schalter ändern sich immer, immer für jemand anderen', () => {
  const r = rng(5);
  let fremd = 0, gesamtN = 0, sit = 0;
  for (let run = 0; run < 40; run++) {
    const pids = ['a', 'b', 'c', 'd'];
    const pult = pultVerteilen(pids, 5, pool(['lagerung', 'hygiene', 'vital', 'notfall'], I.katalog, r));
    const zustand = startZustand(Object.values(pult).flat(), I.byId, r);
    const auf = {};
    for (let step = 0; step < 60; step++) {
      const holder = pids[step % 4];
      auf[holder] = null;
      const a = neueAufgabe({ pult, zustand, auf, holder, online: null, anteil: 0.6, k: 1, tempoF: 1, byId: I.byId, situationen: I.situationen, kuerzlich: [], r, now: 0, pause: 0, id: step });
      assert.ok(a);
      auf[holder] = a;
      const ziele = Object.values(auf).filter(Boolean).flatMap(x => [...new Set(x.ziele.map(z => z[0]))]);
      assert.equal(new Set(ziele).size, ziele.length, 'ein Element ist nur Ziel einer Aufgabe');
      for (const [id, w] of a.ziele) {
        const c = I.byId.get(id);
        assert.ok(Object.values(pult).flat().includes(id));
        if (hatZustand(c)) assert.notEqual(zustand[id], w, 'Schalter/Stufen/Regler müssen sich ändern');
      }
      if (a.art === 's') { sit++; assert.ok(a.tipp.length > 0); } else { const c = I.byId.get(a.ziele[0][0]), w = a.ziele[0][1]; assert.ok(a.text === c.befehle[w] || (c.befehle2 && a.text === c.befehle2[w]), a.text); }
      gesamtN++;
      if (a.ziele.every(z => !pult[holder].includes(z[0]))) fremd++;
      assert.equal(a.selbst, false);
      // ab und zu wird eine Aufgabe erledigt (Zustand ändert sich)
      if (step % 3 === 0) { const [id, w] = a.ziele[0]; if (hatZustand(I.byId.get(id))) zustand[id] = w; auf[holder] = null; }
    }
  }
  assert.equal(fremd, gesamtN, 'das Element liegt immer auf einem anderen Handy');
  assert.ok(sit / gesamtN > 0.45 && sit / gesamtN < 0.75, 'Anteil Situationen ≈ 60 %: ' + sit / gesamtN);
});

test('Treffer zählen nur, solange die Aufgabe sichtbar ist (mit Gnadenzeit)', () => {
  const auf = { a: { startAt: 1000, endAt: 5000, ziele: [['puls', 0]] } };
  assert.equal(trefferSuchen(auf, 'puls', 0, 500), null);
  assert.equal(trefferSuchen(auf, 'puls', 0, 3000), 'a');
  assert.equal(trefferSuchen(auf, 'puls', 0, 5000 + GNADE), 'a');
  assert.equal(trefferSuchen(auf, 'puls', 0, 5000 + GNADE + 1), null);
  assert.equal(trefferSuchen(auf, 'temperatur', 0, 3000), null);
});

test('Schichtziel und Prozent', () => {
  assert.equal(zielPunkte(4, 120000, 0), 107);
  assert.ok(zielPunkte(4, 120000, 0) > zielPunkte(4, 120000, 1), 'Situationen brauchen länger: niedrigeres Ziel');
  assert.ok(zielPunkte(3, 120000, 0) < zielPunkte(4, 120000, 0), 'kleinere Station: kleineres Ziel');
  assert.equal(prozent(50, 100), 50);
  assert.equal(prozent(-3, 100), 0);
  assert.equal(prozent(130, 100), 130);
  assert.deepEqual(cleanCfg({ themen: ['gibtsnicht'] }).themen, THEMEN.map(t => t.id));
  assert.deepEqual(cleanCfg({ themen: ['notfall', 'notfall'] }).themen, ['notfall']);
  assert.equal(cleanCfg({ groesse: 9 }).groesse, 4);
});

// ---------------------------------------------------------------- Raum: ganzer Ablauf
test('Ablauf: Stationen bilden, drei Schichten, Treffer, Fehlgriffe, verpasste Aufgaben, Siegerehrung', async () => {
  const R = makeRoom(21);
  const { T, P } = await klasse(R, 9);
  let room = R.last(T, 'room');
  assert.equal(room.phase, 'teams');
  assert.equal(room.teams.length, 3);
  assert.deepEqual(room.teams.map(t => t.mitglieder.length), [3, 3, 3]);
  assert.match(you(R, P[0]).team.name, /^Station /);
  assert.equal(you(R, P[0]).team.mitglieder[0].pid, undefined, 'Handys sehen keine Geräte-Kennungen');

  await R.msg(T, { t: 'schicht-start' });
  room = R.last(T, 'room');
  assert.equal(room.phase, 'schicht');
  assert.equal(room.spiel.k, 0);
  const nr = room.spiel.nr;
  // Jede Person hat ein Pult mit 4 Elementen und eine Aufgabe (noch nicht sichtbar)
  for (const c of P) {
    const y = you(R, c);
    assert.equal(y.pult.length, SCHWIERIGKEIT.schwer.proHandy[0]);
    assert.ok(y.auf && y.auf.startAt >= R.now() + VORLAUF_START);
    assert.equal(y.auf.art, 'b', 'Frühdienst: nur Anweisungen');
    assert.equal(y.auf.ziele, undefined, 'die Lösung wird nicht mitgeschickt');
  }
  // Vor dem Start zählt nichts
  const z0 = loesung(R, P[0]);
  const own0 = besitzer(R, P, z0[0], P[0]);
  await R.msg(own0, { t: 'tun', nr, c: z0[0], w: z0[1] });
  assert.equal(R.last(own0, 'tat'), undefined);
  R.tick(VORLAUF_START + 1600);

  // Treffer: die Person mit dem Element führt die Anweisung aus
  const team0 = R.logic.s.teams[R.logic.s.players[P[0].pid].team];
  const z = loesung(R, P[0]);
  const own = besitzer(R, P, z[0], P[0]);
  const alteAufgabe = you(R, P[0]).auf.id;
  await R.msg(own, { t: 'tun', nr, c: z[0], w: z[1] });
  assert.equal(R.last(own, 'tat').ok, true);
  assert.equal(team0.punkte[0], 2);
  let y0 = you(R, P[0]);
  assert.equal(y0.me.zuletzt.ok, true);
  assert.notEqual(y0.auf.id, alteAufgabe, 'neue Aufgabe');
  assert.ok(y0.auf.startAt >= R.now() + PAUSE_OK - 1);

  // Fehlgriff: ein Element, das gerade niemand braucht
  const reserviert = new Set(Object.values(team0.run.auf).filter(Boolean).flatMap(a => a.ziele.map(q => q[0])));
  const frei = team0.pids.flatMap(pid => team0.run.pult[pid].map(id => [pid, id])).find(([, id]) => !reserviert.has(id));
  const fc = P.find(c => c.pid === frei[0]);
  const el = I.byId.get(frei[1]);
  await R.msg(fc, { t: 'tun', nr, c: frei[1], w: hatZustand(el) ? (team0.run.zustand[frei[1]] + 1) % el.stufen.length : 0 });
  assert.equal(R.last(fc, 'tat').ok, false);
  assert.equal(team0.punkte[0], 1);
  assert.equal(team0.fg[0], 1);
  // Fremde Elemente und alte Schicht-Nummern zählen nicht
  const fremdC = team0.run.pult[team0.pids.find(pid => pid !== frei[0])][0];
  fc.inbox.length = 0;
  await R.msg(fc, { t: 'tun', nr, c: fremdC, w: 0 });
  await R.msg(fc, { t: 'tun', nr: nr - 1, c: frei[1], w: 0 });
  assert.equal(R.last(fc, 'tat'), undefined);

  // Verpasst: Zeit läuft ab, die Beamer-Uhr ersetzt die Aufgabe
  const vorher = you(R, P[1]).auf;
  R.tick(vorher.endAt - R.now() + GNADE + 10);
  await R.msg(T, { t: 'tick' });
  const y1 = you(R, P[1]);
  assert.equal(y1.me.zuletzt.ok, false);
  assert.equal(y1.me.zuletzt.id, vorher.id);
  assert.ok(y1.me.zuletzt.loesung.length > 0);
  assert.notEqual(y1.auf.id, vorher.id);
  assert.ok(R.logic.s.teams.reduce((a, t) => a + t.vp[0], 0) >= 1);

  // Schichtende
  R.tick(60000);
  await R.msg(T, { t: 'tick' });
  room = R.last(T, 'room');
  assert.equal(room.phase, 'uebergabe');
  assert.equal(room.rang.length, 3);
  assert.equal(room.rang[0], R.logic.s.players[P[0].pid].team, 'Station mit Punkten vorn');
  const yu = you(R, P[0]);
  assert.equal(yu.phase, 'uebergabe');
  assert.ok(yu.team.platz >= 1 && yu.rang.length === 3);
  assert.equal(yu.auf, null);

  // Spätdienst: auch Situationen, 5 Elemente
  await R.msg(T, { t: 'schicht-start' });
  room = R.last(T, 'room');
  assert.equal(room.spiel.k, 1);
  assert.equal(you(R, P[0]).pult.length, 5);
  let situationen = 0;
  for (let i = 0; i < 12; i++) {
    R.tick(30000);
    await R.msg(T, { t: 'tick' });
    for (const c of P) { const y = you(R, c); if (y.auf && y.auf.art === 's') { situationen++; assert.ok(y.auf.tipp.length > 0); } }
    if (R.last(T, 'room').phase !== 'schicht') break;
  }
  assert.ok(situationen > 0, 'im Spätdienst kommen Situationen');
  room = R.last(T, 'room');
  assert.equal(room.phase, 'uebergabe');
  assert.ok(room.knifflig.length > 0, 'verpasste Situationen werden gesammelt');
  assert.ok(room.knifflig[0].loesung.length > 0);
  assert.ok(P.some(c => you(R, c).verpasst.length > 0), 'mindestens eine Station hat etwas verpasst');

  // Nachtdienst → Siegerehrung
  await R.msg(T, { t: 'schicht-start' });
  assert.equal(you(R, P[0]).pult.length, 6);
  assert.equal(you(R, P[0]).verblasst, SCHICHTEN[2].verblasst);
  await R.msg(T, { t: 'schicht-ende', nr: R.last(T, 'room').spiel.nr });
  room = R.last(T, 'room');
  assert.equal(room.phase, 'ende');
  assert.equal(room.gesamtRang.length, 3);
  assert.ok(room.teams[room.gesamtRang[0]].gesamt >= room.teams[room.gesamtRang[2]].gesamt);
  assert.ok(room.kniffligAlle.length > 0);

  // Nochmal mit denselben Stationen: Punkte von vorn
  await R.msg(T, { t: 'nochmal' });
  room = R.last(T, 'room');
  assert.equal(room.phase, 'schicht');
  assert.equal(room.spiel.k, 0);
  assert.ok(room.teams.every(t => t.punkte.every(p => p === 0)));
  assert.equal(room.knifflig.length, 0);
});

test('Nachzügler bekommt mitten in der Schicht ein eigenes Pult und eine Aufgabe', async () => {
  const R = makeRoom(4);
  const { T, P } = await klasse(R, 6);
  await R.msg(T, { t: 'schicht-start' });
  R.tick(VORLAUF_START + 20000);
  const zielVorher = R.logic.s.teams.map(t => t.ziel[0]);
  const c = R.conn(); c.pid = 'nachzuegler1';
  await R.logic.open(c, { code: 'ABCDE', role: 'player', pid: c.pid });
  await R.msg(c, { t: 'join', first: 'Nele', initial: 'N' });
  const y = you(R, c);
  assert.equal(y.phase, 'schicht');
  assert.ok(y.team, 'ist in einer Station');
  assert.equal(y.pult.length, SCHWIERIGKEIT.schwer.proHandy[0]);
  assert.ok(y.auf);
  const t = R.logic.s.teams[R.logic.s.players[c.pid].team];
  const all = Object.values(t.run.pult).flat();
  assert.equal(new Set(all).size, all.length, 'keine doppelten Elemente');
  assert.ok(t.ziel[0] > zielVorher[R.logic.s.players[c.pid].team], 'Schichtziel wächst');
  // Die Mitspielenden der Station erfahren davon
  const mate = P.find(p => R.logic.s.players[p.pid].team === R.logic.s.players[c.pid].team);
  assert.ok(you(R, mate).team.mitglieder.some(m => m.name === 'Nele N.'));
});

test('Entfernen mitten in der Schicht: Aufgaben auf die Elemente dieser Person werden ersetzt', async () => {
  const R = makeRoom(9);
  const { T, P } = await klasse(R, 6);
  await R.msg(T, { t: 'schicht-start' });
  R.tick(VORLAUF_START + 2000);
  const s = R.logic.s;
  for (let i = 0; i < 20; i++) {
    const weg = P[i % 6];
    if (!s.players[weg.pid]) continue;
    const t = s.teams[s.players[weg.pid].team];
    const ids = new Set(t.run.pult[weg.pid]);
    if (![...Object.entries(t.run.auf)].some(([h, a]) => h !== weg.pid && a && a.ziele.some(z => ids.has(z[0])))) continue;
    await R.msg(T, { t: 'kick', pid: weg.pid });
    assert.equal(R.last(weg, 'kicked').t, 'kicked');
    for (const a of Object.values(t.run.auf)) if (a) assert.ok(a.ziele.every(z => !ids.has(z[0])));
    assert.ok(!t.pids.includes(weg.pid));
    return;
  }
  assert.fail('kein passender Fall gefunden');
});

test('Elemente auf Handys ohne Verbindung werden nicht mehr verlangt', async () => {
  const R = makeRoom(13);
  const { T, P } = await klasse(R, 3, { groesse: 3 });
  await R.msg(T, { t: 'schicht-start' });
  R.tick(VORLAUF_START + 1000);
  const s = R.logic.s, t = s.teams[0];
  R.offline(P[2]);
  await R.logic.close(P[2]);
  const weg = new Set(t.run.pult[P[2].pid]);
  for (let i = 0; i < 15; i++) {
    R.tick(40000 / 15);
    // alle Aufgaben verfallen lassen und neu verteilen
    for (const pid of t.pids) if (t.run.auf[pid]) t.run.auf[pid].endAt = R.now() - GNADE - 1;
    await R.msg(T, { t: 'tick' });
    for (const pid of [P[0].pid, P[1].pid]) { const a = t.run.auf[pid]; if (a) assert.ok(a.ziele.every(z => !weg.has(z[0])), 'kein Element vom Handy ohne Verbindung'); }
    assert.equal(t.run.auf[P[2].pid], null, 'ohne Verbindung keine neue Aufgabe');
  }
});

test('Rangliste und Gesamtwertung', () => {
  const teams = [
    { punkte: [10, 0, 0], ziel: [20, 20, 0], ok: [5, 0, 0] },
    { punkte: [20, 5, 0], ziel: [20, 20, 0], ok: [10, 3, 0] },
    { punkte: [0, 0, 0], ziel: [0, 0, 0], ok: [0, 0, 0] },
  ];
  assert.deepEqual(rangliste(teams, 0), [1, 0]);
  assert.equal(gesamt(teams[1], 1), 125);
  assert.equal(gesamt(teams[0], 1), 50);
});

test('Zurück zur Anmeldung: alle bleiben angemeldet, Stationen weg', async () => {
  const R = makeRoom(2);
  const { T, P } = await klasse(R, 4);
  await R.msg(T, { t: 'to-lobby' });
  const room = R.last(T, 'room');
  assert.equal(room.phase, 'lobby');
  assert.equal(room.players.length, 4);
  assert.equal(room.teams.length, 0);
  assert.equal(you(R, P[0]).team, null);
});

test('Eigenes Element nur, wenn auf den anderen Handys nichts frei ist (dann mit Hinweis)', () => {
  const r = rng(8);
  const pult = { a: ['puls', 'temperatur'], b: ['blutdruck'] };
  // Das Element von b ist schon Ziel einer anderen Aufgabe → a bekommt ein eigenes
  const auf = { b: { ziele: [['blutdruck', 0]] }, a: null };
  const x = neueAufgabe({ pult, zustand: {}, auf, holder: 'a', online: null, anteil: 0, k: 0, byId: I.byId, situationen: I.situationen, r, now: 0, id: 1 });
  assert.equal(x.selbst, true);
  assert.ok(pult.a.includes(x.ziele[0][0]));
  // Ist es frei, geht die Aufgabe an das andere Handy
  const y = neueAufgabe({ pult, zustand: {}, auf: { a: null, b: null }, holder: 'a', online: null, anteil: 0, k: 0, byId: I.byId, situationen: I.situationen, r, now: 0, id: 2 });
  assert.equal(y.selbst, false);
  assert.deepEqual(y.ziele, [['blutdruck', 0]]);
  // Situationen, die man auch mit einem EIGENEN Knopf lösen könnte, kommen nicht (z. B. Herzrasen: Puls oder Blutdruck)
  for (let i = 0; i < 30; i++) {
    const z = neueAufgabe({ pult, zustand: {}, auf: { a: null, b: null }, holder: 'a', online: null, anteil: 1, k: 1, byId: I.byId, situationen: I.situationen, r, now: 0, id: 3 });
    assert.ok(z.ziele.every(q => q[0] === 'blutdruck'), z.text);
  }
});

// ---------------------------------------------------------------- Stationen selbst wählen
test('Stationen selbst wählen: wählen, wechseln, voll, Countdown, Rest wird zugelost', async () => {
  const R = makeRoom(31);
  const { T, P } = await anmelden(R, 10);
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 4, wahl: 'selbst' } });
  let room = R.last(T, 'room');
  assert.equal(room.phase, 'wahl');
  assert.equal(room.teams.length, 3, '10 Personen, Größe 4 → 3 Stationen');
  assert.ok(room.teams.every(t => t.mitglieder.length === 0));
  assert.equal(room.wahl.endAt, R.now() + WAHL_SEKUNDEN * 1000);
  const max = wahlMax(10, 3);
  assert.equal(max, 5);
  let y = you(R, P[0]);
  assert.equal(y.wahl.stationen.length, 3);
  assert.equal(y.wahl.max, 5);
  assert.equal(y.wahl.meine, -1);
  // 5 Personen wählen Station 0 → voll
  for (let i = 0; i < 5; i++) await R.msg(P[i], { t: 'waehle', team: 0 });
  assert.equal(R.last(T, 'room').teams[0].mitglieder.length, 5);
  await R.msg(P[5], { t: 'waehle', team: 0 });
  assert.equal(R.last(P[5], 'error').why, 'voll');
  assert.equal(you(R, P[5]).wahl.stationen[0].voll, true);
  assert.equal(you(R, P[0]).wahl.stationen[0].voll, false, 'die eigene Station ist nie „voll“');
  // Wechseln ist erlaubt
  await R.msg(P[4], { t: 'waehle', team: 1 });
  await R.msg(P[5], { t: 'waehle', team: 0 });
  room = R.last(T, 'room');
  assert.deepEqual(room.teams.map(t => t.mitglieder.length), [5, 1, 0]);
  // Vor Ablauf passiert nichts
  R.tick(30000);
  await R.msg(T, { t: 'tick' });
  assert.equal(R.last(T, 'room').phase, 'wahl');
  // +30 Sekunden
  await R.msg(T, { t: 'wahl-plus' });
  assert.equal(R.last(T, 'room').wahl.endAt, R.now() + 30000 + WAHL_PLUS * 1000);
  // Countdown abgelaufen: 4 ohne Station werden auf die kleinsten verteilt, niemand bleibt allein, keine leere Station
  R.tick(60000 + 1);
  await R.msg(T, { t: 'tick' });
  room = R.last(T, 'room');
  assert.equal(room.phase, 'teams');
  const groessen = room.teams.map(t => t.mitglieder.length);
  assert.equal(groessen.reduce((a, b) => a + b, 0), 10);
  assert.ok(groessen.every(g => g >= 2), 'keine Einzel-Station: ' + groessen);
  assert.equal(room.teams[0].mitglieder.length, 5, 'gewählte Station bleibt');
  const zug = room.teams.flatMap(t => t.mitglieder).filter(m => m.zugeteilt).map(m => m.name);
  assert.equal(zug.length, 4);
  assert.equal(you(R, P[9]).me.zugeteilt, true);
  assert.equal(you(R, P[0]).me.zugeteilt, false);
  assert.equal(you(R, P[0]).wahl, undefined, 'nach der Wahl kein Wahlbildschirm mehr');
  // Nach der Wahl können SuS nicht mehr selbst wechseln
  await R.msg(P[0], { t: 'waehle', team: 1 });
  assert.equal(R.last(T, 'room').teams[0].mitglieder.length, 5);
});

test('Stationen selbst wählen: Lehrkraft verteilt vorzeitig, leere Stationen fallen weg', async () => {
  const R = makeRoom(32);
  const { T, P } = await anmelden(R, 7);
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 2, wahl: 'selbst' } });
  assert.equal(R.last(T, 'room').teams.length, 3);
  for (let i = 0; i < 7; i++) await R.msg(P[i], { t: 'waehle', team: i < 4 ? 0 : 1 });
  await R.msg(T, { t: 'verteilen' });
  const room = R.last(T, 'room');
  assert.equal(room.phase, 'teams');
  assert.deepEqual(room.teams.map(t => t.mitglieder.length), [4, 3], 'die leere Station ist weg');
  assert.ok(room.teams.every(t => t.mitglieder.every(m => !m.zugeteilt)));
  // Die Farben bleiben (Station Rot und Blau)
  assert.deepEqual(room.teams.map(t => t.name), ['Station Rot', 'Station Blau']);
});

test('Stationen selbst wählen: Wer allein in einer Station ist, kommt dazu', async () => {
  const R = makeRoom(33);
  const { T, P } = await anmelden(R, 9);
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 3, wahl: 'selbst' } });
  assert.equal(R.last(T, 'room').teams.length, 3);
  for (let i = 0; i < 8; i++) await R.msg(P[i], { t: 'waehle', team: i < 4 ? 0 : 1 });
  await R.msg(P[8], { t: 'waehle', team: 2 });
  await R.msg(T, { t: 'verteilen' });
  const room = R.last(T, 'room');
  assert.ok(room.teams.every(t => t.mitglieder.length >= 2), room.teams.map(t => t.mitglieder.length).join());
  assert.equal(room.teams.length, 2);
  assert.equal(you(R, P[8]).me.zugeteilt, true);
});

test('Stationen selbst wählen: Nachzügler wählt mitten in der Schicht und bekommt sofort ein Pult', async () => {
  const R = makeRoom(34);
  const { T, P } = await anmelden(R, 6);
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 3, dauer: 60, wahl: 'selbst', schwierigkeit: 'mittel' } });
  for (let i = 0; i < 6; i++) await R.msg(P[i], { t: 'waehle', team: i % 2 });
  await R.msg(T, { t: 'verteilen' });
  await R.msg(T, { t: 'schicht-start' });
  R.tick(VORLAUF_START + 10000);
  const c = R.conn(); c.pid = 'nachzuegler2';
  await R.logic.open(c, { code: 'ABCDE', role: 'player', pid: c.pid });
  await R.msg(c, { t: 'join', first: 'Nele', initial: 'N' });
  let y = you(R, c);
  assert.equal(y.team, null, 'keine automatische Station');
  assert.equal(y.wahl.stationen.length, 2);
  assert.equal(y.wahl.endAt, 0);
  await R.msg(c, { t: 'waehle', team: 1 });
  y = you(R, c);
  assert.equal(y.team.name, 'Station Blau');
  assert.equal(y.wahl, undefined);
  assert.equal(y.pult.length, SCHWIERIGKEIT.schwer.proHandy[0]);
  assert.ok(y.auf);
  // Ein zweites Mal wählen geht nicht
  await R.msg(c, { t: 'waehle', team: 0 });
  assert.equal(you(R, c).team.name, 'Station Blau');
});

// ---------------------------------------------------------------- Neue Eingabearten
test('Alle Arten sind in den Inhalten, mit sinnvollen Standardwerten', () => {
  for (const art of ARTEN) assert.ok(I.katalog.some(c => c.art === art), 'Art fehlt: ' + art);
  const insulin = I.byId.get('insulin');
  assert.equal(insulin.knopf, 'Spritzen');
  assert.equal(insulin.befehle[1], '4 IE Insulin spritzen!');
  assert.equal(I.byId.get('haende').sekunden, 3);
  const hdm = I.byId.get('hdm');
  assert.deepEqual([hdm.anzahl, hdm.min, hdm.max], [10, 100, 120]);
  assert.ok(I.katalog.filter(c => c.lustig).length >= 10, 'Stationsalltag');
  assert.ok(I.katalog.filter(c => c.lustig).every(c => !I.situationen.some(s => s.ziele.some(z => z[0] === c.id))), 'Stationsalltag nur als Anweisung');
  // Rechen-Situationen stimmen
  const sit = t => I.situationen.find(s => s.text.startsWith(t));
  assert.deepEqual(sit('Infusion: 500 ml in 5 Stunden').ziele, [['pumpe', 2]]);
  assert.deepEqual(sit('Perfusor: 50 ml in 10 Stunden').ziele, [['perfusor', 2]]);

  const r = pruefeInhalte([{ id: 'a', name: 'A' }, { id: 'l', name: 'Lustig', lustig: true }], [
    { id: 'r1', thema: 'a', art: 'regler', name: 'Kurz', stufen: ['a', 'b'] },
    { id: 'd1', thema: 'a', art: 'dosis', name: 'Pen', stufen: ['1', '2'], befehl: '# geben!' },
    { id: 'h1', thema: 'l', art: 'halten', name: 'Halt', sekunden: 99 },
    { id: 't1', thema: 'a', art: 'takt', name: 'Takt', anzahl: 5, min: 60, max: 80 },
    { id: 'x1', thema: 'a', art: 'wischen', name: 'Gibt es nicht' },
  ], [{ text: 'Gib 2', tun: 'Pen: 2' }, { text: 'Halten', tun: 'Halt' }]);
  assert.deepEqual(r.katalog.map(c => c.id), ['d1', 'h1', 't1']);
  assert.equal(r.warnungen.length, 2);
  assert.deepEqual(r.byId.get('d1').befehle, ['1 geben!', '2 geben!']);
  assert.equal(r.byId.get('d1').knopf, 'Los');
  assert.equal(r.byId.get('h1').sekunden, 3, 'unsinnige Sekundenzahl → 3');
  assert.equal(r.byId.get('h1').lustig, true);
  assert.deepEqual([r.byId.get('t1').anzahl, r.byId.get('t1').min, r.byId.get('t1').max], [5, 60, 80]);
  assert.deepEqual(r.situationen.map(x => x.ziele), [[['d1', 1]], [['h1', 0]]]);
});

test('Im Takt tippen: 100–120 pro Minute zählt (mit etwas Spielraum), viel zu schnell oder zu langsam nicht', () => {
  const c = { min: 100, max: 120 };
  const reihe = ms => Array.from({ length: 10 }, (_, i) => i * ms);
  assert.equal(taktPruefen(reihe(545), c).ok, true);
  assert.equal(taktPruefen(reihe(545), c).proMin, 110);
  assert.equal(taktPruefen(reihe(480), c).ok, true, '125 pro Minute: knapp drüber, zählt noch');
  assert.equal(taktPruefen(reihe(300), c).ok, false, '200 pro Minute');
  assert.equal(taktPruefen(reihe(750), c).ok, false, '80 pro Minute');
  assert.equal(taktPruefen([0], c).ok, false);
});

test('Lustige Elemente: höchstens eins pro Handy, und gar nicht, wenn das Thema aus ist', () => {
  const r = rng(77);
  for (let i = 0; i < 30; i++) {
    const p = pultVerteilen(['a', 'b', 'c', 'd'], 6, pool(['lagerung', 'hygiene', 'vital', 'notfall', 'alltag'], I.katalog, r));
    for (const list of Object.values(p)) assert.ok(list.filter(id => I.byId.get(id).lustig).length <= 1);
    const ohne = pultVerteilen(['a', 'b', 'c', 'd', 'e', 'f'], 6, pool(['lagerung', 'hygiene', 'vital', 'notfall'], I.katalog, r));
    assert.equal(Object.values(ohne).flat().filter(id => I.byId.get(id).lustig).length, 0);
  }
});

test('Dosis: nur der richtige Wert zählt; Regler bleibt stehen; Halten und Takt wie ein Knopf', async () => {
  const R = makeRoom(55);
  const { T, P } = await klasse(R, 2, { groesse: 2 });
  await R.msg(T, { t: 'schicht-start' });
  R.tick(VORLAUF_START + 2000);
  const s = R.logic.s, t = s.teams[0], nr = s.spiel.nr;
  const [a, b] = P;
  // Pulte und Aufgaben gezielt setzen
  t.run.pult = { [a.pid]: ['insulin', 'kopfteil'], [b.pid]: ['hdm', 'haende'] };
  t.run.zustand = { kopfteil: 0 };
  const jetzt = R.now();
  t.run.auf = {
    [b.pid]: { id: 900, art: 'b', text: '6 IE Insulin spritzen!', ziele: [['insulin', 2]], tipp: '', sid: '', startAt: jetzt, endAt: jetzt + 10000 },
    [a.pid]: { id: 901, art: 'b', text: 'Herzdruckmassage starten!', ziele: [['hdm', 0]], tipp: '', sid: '', startAt: jetzt, endAt: jetzt + 10000 },
  };
  await R.msg(a, { t: 'tun', nr, c: 'insulin', w: 1 });
  assert.equal(R.last(a, 'tat').ok, false, 'falsche Dosis = Fehlgriff');
  assert.equal(t.run.auf[b.pid].id, 900, 'Aufgabe bleibt');
  await R.msg(a, { t: 'tun', nr, c: 'insulin', w: 2 });
  assert.equal(R.last(a, 'tat').ok, true, 'richtige Dosis');
  assert.equal(t.run.zustand.insulin, undefined, 'Dosis hat keine Stellung');
  await R.msg(b, { t: 'tun', nr, c: 'hdm', w: 7 });
  assert.equal(R.last(b, 'tat').ok, true, 'Takt zählt wie ein Knopf (Stufe egal)');
  await R.msg(a, { t: 'tun', nr, c: 'kopfteil', w: 4 });
  assert.equal(t.run.zustand.kopfteil, 4, 'Regler bleibt stehen');
  a.inbox.length = 0;
  await R.msg(a, { t: 'tun', nr, c: 'kopfteil', w: 4 });
  assert.equal(R.last(a, 'tat'), undefined, 'gleiche Stellung nochmal: keine Aktion');
  // Das Handy bekommt die Zusatzangaben zum Pult
  const yb = R.logic.youMsg(b.pid), ya = R.logic.youMsg(a.pid);
  const hdm = (yb.pult || []).find(x => x.id === 'hdm');
  assert.ok(hdm && hdm.anzahl === 10 && hdm.min === 100, 'Takt-Angaben');
  assert.equal(yb.pult.find(x => x.id === 'haende').sekunden, 3);
  assert.equal(ya.pult.find(x => x.id === 'insulin').knopf, 'Spritzen');
  assert.equal(ya.pult.find(x => x.id === 'insulin').befehle, undefined, 'keine Anweisungen ans Handy');
});

test('Rechenaufgaben sind sehr einfach (runde Zahlen, nur durch 1, 2, 5 oder 10) und die Lösung stimmt', () => {
  let n = 0;
  for (const s of SITUATIONEN) {
    const m = s.text.match(/(\d+) ml in (\d+) Stunden?/);
    if (!m) continue;
    n++;
    const ml = Number(m[1]), h = Number(m[2]);
    assert.ok([1, 2, 5, 10].includes(h), `${s.text}: nur durch 1, 2, 5 oder 10 teilen`);
    assert.equal(ml % h, 0, `${s.text}: muss glatt aufgehen`);
    assert.ok(ml % 10 === 0, `${s.text}: runde Menge`);
    const tun = Array.isArray(s.tun) ? s.tun : [s.tun];
    assert.equal(tun.length, 1, s.text);
    assert.equal(tun[0].split(': ')[1], (ml / h) + ' ml/h', `${s.text}: Lösung falsch`);
  }
  assert.ok(n >= 10, 'Rechenaufgaben gefunden: ' + n);
});

// ---------------------------------------------------------------- Störungen und Ereignisse
async function schichtBis(R, T, k) {
  await R.msg(T, { t: 'schicht-start' });
  for (let i = 0; i < k; i++) { await R.msg(T, { t: 'schicht-ende', nr: R.logic.s.spiel.nr }); await R.msg(T, { t: 'schicht-start' }); }
}
test('Ereignisse und Störungen: erst ab dem Spätdienst, abschaltbar, sinnvoll geplant', async () => {
  const R = makeRoom(61);
  const { T, P } = await klasse(R, 8, { groesse: 4, dauer: 120 });
  await R.msg(T, { t: 'schicht-start' });
  assert.equal(R.logic.s.spiel.ereignisse.length, 0, 'Frühdienst: keine Ereignisse');
  assert.ok(R.logic.s.teams.every(t => !t.run.stoer), 'Frühdienst: keine Störungen');
  await R.msg(T, { t: 'schicht-ende', nr: R.logic.s.spiel.nr });
  await R.msg(T, { t: 'schicht-start' });
  let sp = R.logic.s.spiel;
  assert.equal(sp.ereignisse.length, 1);
  assert.ok(['hygiene', 'strom'].includes(sp.ereignisse[0].art));
  for (const t of R.logic.s.teams) {
    assert.ok(t.run.stoer.length >= 2, 'mehrere Störungen in 2 Minuten');
    for (const x of t.run.stoer) {
      assert.ok(x.at > sp.startAt && x.at < sp.endAt);
      assert.ok(!sp.ereignisse.some(e => x.at > e.at - 4000 && x.at < e.endAt + 3000), 'keine Störung während eines Ereignisses');
      assert.ok(x.ziele.length >= 1 && x.ziele.length <= 2 && x.ziele.every(id => t.run.pult[x.pid].includes(id)), 'Störung liegt auf eigenen Elementen');
      assert.ok(STOERUNGEN[x.art]);
    }
  }
  // Das Handy kennt nur seine eigenen Störungen
  const y = you(R, P[0]);
  const meine = R.logic.s.teams[R.logic.s.players[P[0].pid].team].run.stoer.filter(x => x.pid === P[0].pid);
  assert.equal(y.stoerungen.length, meine.length);
  assert.equal(y.ereignisse.length, 1);
  await R.msg(T, { t: 'schicht-ende', nr: sp.nr });
  await R.msg(T, { t: 'schicht-start' });
  sp = R.logic.s.spiel;
  assert.deepEqual(sp.ereignisse.map(e => e.art).sort(), ['rea', sp.ereignisse[1].art].sort());
  assert.equal(sp.ereignisse[0].art, 'rea', 'Nachtdienst: Rea-Alarm');
  // Abschalten
  const R2 = makeRoom(62);
  const k2 = await klasse(R2, 4, { stoerungen: 'aus' });
  await schichtBis(R2, k2.T, 2);
  assert.equal(R2.logic.s.spiel.ereignisse.length, 0);
  assert.ok(R2.logic.s.teams.every(t => !t.run.stoer));
});

test('Ereignis: Aufgaben pausieren, Bonus nur wenn die ganze Station mitmacht', async () => {
  const R = makeRoom(63);
  const { T, P } = await klasse(R, 6, { groesse: 3, dauer: 120 });
  await schichtBis(R, T, 1);
  const s = R.logic.s, sp = s.spiel, e = sp.ereignisse[0];
  R.tick(e.at - R.now() - 2000);
  await R.msg(T, { t: 'tick' });
  const t0 = s.teams[0], vorher = Object.fromEntries(Object.entries(t0.run.auf).map(([pid, a]) => [pid, a && a.endAt]));
  // Ankündigung beginnt: laufende Aufgaben bekommen mehr Zeit
  R.tick(2100);
  await R.msg(T, { t: 'tick' });
  for (const [pid, a] of Object.entries(t0.run.auf)) if (a && vorher[pid]) assert.ok(a.endAt >= vorher[pid] + EREIGNIS_DAUER, 'Aufgabe pausiert');
  // Vor dem Start zählt Mitmachen noch nicht
  const team0 = P.filter(c => s.players[c.pid].team === 0), team1 = P.filter(c => s.players[c.pid].team === 1);
  await R.msg(team0[0], { t: 'ereignis', nr: sp.nr, eid: e.eid });
  assert.equal(e.done[team0[0].pid], undefined);
  R.tick(EREIGNIS_VORLAUF);
  const punkteVorher = [s.teams[0].punkte[1], s.teams[1].punkte[1]];
  for (const c of team0) await R.msg(c, { t: 'ereignis', nr: sp.nr, eid: e.eid });
  await R.msg(team1[0], { t: 'ereignis', nr: sp.nr, eid: e.eid });
  const bonus = Math.round(s.teams[0].ziel[1] * 0.1);
  assert.equal(s.teams[0].punkte[1], punkteVorher[0] + bonus, 'ganze Station: +10 % vom Schichtziel');
  assert.equal(s.teams[1].punkte[1], punkteVorher[1], 'nur eine Person: kein Bonus');
  // Doppelt melden bringt nichts
  await R.msg(team0[0], { t: 'ereignis', nr: sp.nr, eid: e.eid });
  assert.equal(s.teams[0].punkte[1], punkteVorher[0] + bonus);
  const room = R.last(T, 'room');
  assert.deepEqual(room.spiel.ereignisse[0].stand.slice(0, 2).map(x => [x.fertig, x.von, x.bonus > 0]), [[3, 3, true], [1, 3, false]]);
  const y = you(R, team0[1]);
  assert.equal(y.ereignisse[0].ich, true);
  assert.equal(y.ereignisse[0].bonus, bonus);
  // Während des Ereignisses entstehen neue Aufgaben erst danach
  const c = team1[1], a = s.teams[1].run.auf[c.pid];
  if (a) {
    const [id, w] = a.ziele[0];
    const owner = P.find(x => (s.teams[1].run.pult[x.pid] || []).includes(id));
    await R.msg(owner, { t: 'tun', nr: sp.nr, c: id, w });
    const neu = s.teams[1].run.auf[c.pid];
    if (neu) assert.ok(neu.startAt >= e.endAt, 'neue Aufgabe erst nach dem Ereignis');
  }
  // Nach dem Ende zählt nichts mehr
  R.tick(EREIGNIS_DAUER + 5000);
  await R.msg(team1[1], { t: 'ereignis', nr: sp.nr, eid: e.eid });
  assert.equal(e.done[team1[1].pid], undefined);
});

test('Ereignis: Wer keine Verbindung hat, verhindert den Bonus nicht', async () => {
  const R = makeRoom(64);
  const { T, P } = await klasse(R, 3, { groesse: 3, dauer: 120 });
  await schichtBis(R, T, 1);
  const s = R.logic.s, e = s.spiel.ereignisse[0];
  R.offline(P[2]); await R.logic.close(P[2]);
  R.tick(e.startAt - R.now() + 100);
  await R.msg(P[0], { t: 'ereignis', nr: s.spiel.nr, eid: e.eid });
  await R.msg(P[1], { t: 'ereignis', nr: s.spiel.nr, eid: e.eid });
  assert.ok(e.bonus[0] > 0);
});

// ---------------------------------------------------------------- Kommunikation (KB2): Patientenedukation
test('Patientenedukation: vier Formen mit Ausklapp-Liste, 12 Situationen mit genau einer Lösung', () => {
  const formen = ['Information', 'Anleitung', 'Schulung', 'Beratung'];
  const edu = I.katalog.filter(c => c.gruppe === 'edukation');
  assert.deepEqual(edu.map(c => c.name).sort(), [...formen].sort());
  for (const c of edu) {
    assert.equal(c.art, 'auswahl');
    assert.equal(c.thema, 'kommunikation');
    assert.ok(c.stufen.length >= 2 && c.stufen.length <= 8);
    assert.ok(c.stufen.includes('Ernährung') && c.stufen.includes('COPD'));
    assert.equal(c.befehle[c.stufen.indexOf('Ernährung')], `Patientenedukation: ${c.name} – Ernährung!`);
    assert.equal(c.hinweis, 'Patientenedukation');
  }
  const sits = I.situationen.filter(s => s.ziele.some(z => I.byId.get(z[0]).gruppe === 'edukation'));
  assert.equal(sits.length, 12);
  for (const f of formen) assert.equal(sits.filter(s => I.byId.get(s.ziele[0][0]).name === f).length, 3, f + ': 3 Situationen');
  for (const s of sits) assert.equal(s.ziele.length, 1, 'genau eine richtige Antwort: ' + s.text);
});

test('Gruppen: alle vier Formen der Patientenedukation in eine Station, höchstens 2 pro Handy, mal 1, mal 2', () => {
  const r = rng(91);
  const alle = THEMEN.map(t => t.id);
  const verteilungen = new Set();
  for (let i = 0; i < 30; i++) for (const n of [2, 3, 4, 5, 6]) {
    const pids = Array.from({ length: n }, (_, j) => 'p' + j);
    const p = pultVerteilen(pids, 4, pool(alle, I.katalog, r, undefined, 2), r);
    const edu = Object.values(p).map(list => list.filter(id => I.byId.get(id).gruppe === 'edukation').length);
    const gruppe = Object.values(p).map(list => list.filter(id => I.byId.get(id).gruppe).length);
    assert.equal(edu.reduce((a, b) => a + b, 0), 4, `${n} Personen: alle vier Formen`);
    assert.ok(Math.max(...gruppe) <= 2, `${n} Personen: höchstens 2 Ausklapp-Elemente pro Handy (${gruppe})`);
    if (n === 4) verteilungen.add(edu.slice().sort().join(''));
    for (const list of Object.values(p)) assert.equal(list.length, 4);
  }
  assert.ok(verteilungen.has('1111') && [...verteilungen].some(v => v.endsWith('2')), 'mal je eine Form, mal zwei auf einem Handy: ' + [...verteilungen]);
  // Allein (z. B. Nachzügler mit eigenem Pult) und bei abgewähltem Thema: keine Formen
  assert.equal(pultVerteilen(['x'], 6, pool(alle, I.katalog, r)).x.filter(id => I.byId.get(id).gruppe).length, 0);
  const ohne = pultVerteilen(['a', 'b', 'c', 'd'], 6, pool(alle.filter(t => !['kommunikation', 'medikamente', 'prophylaxen', 'pflegeprozess'].includes(t)), I.katalog, r), r);
  assert.equal(Object.values(ohne).flat().filter(id => I.byId.get(id).gruppe).length, 0);
});

// ---------------------------------------------------------------- Medikamente
test('Medikamente: Kategorien mit üblichen Kombinationen, Anweisungen mit und ohne Kategorie', () => {
  const meds = I.katalog.filter(c => c.art === 'medikament');
  assert.equal(meds.length, MEDIKAMENTE.length);
  assert.deepEqual([1, 2, 3].map(aj => meds.filter(c => c.aj <= aj).length), [5, 8, 12], 'bis 1. AJ: 5, bis 2. AJ: 8, bis 3. AJ: 12 Kategorien');
  for (const c of meds) {
    assert.equal(c.thema, 'medikamente');
    assert.equal(c.gruppe, 'medikamente');
    assert.ok(c.wirkstoffe.length >= 2 && c.wirkstoffe.length <= 4, c.name);
    assert.equal(c.stufen.length, c.wirkstoffe.reduce((n, w) => n + w.dosen.length * w.zeiten.length, 0));
    c.stufen.forEach((st, w) => {
      assert.ok(c.befehle[w].startsWith(c.einzeln + ' ') && c.befehle[w].endsWith(st + '!'), c.befehle[w]);
      assert.equal(c.ohneKategorie[w], st + '!');
      assert.ok(c.befehle[w].length < 60, c.befehle[w]);
      assert.ok(MED_ZEITPUNKTE.some(z => st.endsWith(' ' + z)), st);
    });
    assert.ok(c.name.length <= 20, 'Name passt aufs Handy: ' + c.name);
  }
  // Beispiel aus dem Unterricht
  const ad = I.byId.get('med-antidiabetika');
  assert.ok(ad.befehle.includes('Orales Antidiabetikum Metformin 500 mg morgens!'));
  assert.ok(!ad.stufen.includes('Metformin 500 mg zur Nacht'), 'nur übliche Zeitpunkte');
  // Kein Wirkstoff kommt in zwei Kategorien vor (sonst wäre „ohne Kategorie“ nicht eindeutig)
  const wst = meds.flatMap(c => c.wirkstoffe.map(w => w.name));
  assert.equal(new Set(wst).size, wst.length);
  // Fehler werden gemeldet
  const f = pruefeInhalte(THEMEN, [], [], [{ id: 'x', name: 'X', wirkstoffe: [{ name: 'A', dosen: ['1 mg'], zeiten: ['nachmittags'] }] }]);
  assert.ok(f.warnungen.some(w => w.includes('nachmittags') || w.includes('zeiten')), f.warnungen.join(' | '));
});

test('Medikamente: 2 bis 4 Kategorien pro Station (mit KB2 höchstens 3), nur bis zum gewählten AJ', () => {
  const r = rng(92);
  const alle = THEMEN.map(t => t.id), ohneKB2 = alle.filter(t => t !== 'kommunikation');
  const zahlen = { mit: new Set(), ohne: new Set() };
  for (let i = 0; i < 40; i++) for (const n of [3, 4, 5]) {
    const pids = Array.from({ length: n }, (_, j) => 'p' + j);
    for (const [art, themen] of [['mit', alle], ['ohne', ohneKB2]]) {
      const p = pultVerteilen(pids, 5, pool(themen, I.katalog, r, undefined, 1), r);
      const meds = Object.values(p).flat().filter(id => I.byId.get(id).art === 'medikament');
      zahlen[art].add(meds.length);
      assert.ok(meds.every(id => I.byId.get(id).aj === 1), 'nur 1. AJ');
      assert.ok(Object.values(p).every(list => list.filter(id => I.byId.get(id).gruppe).length <= 2), 'höchstens 2 pro Handy');
    }
  }
  assert.deepEqual([...zahlen.mit].sort(), [2, 3], 'mit KB2: 2 oder 3 Kategorien');
  assert.deepEqual([...zahlen.ohne].sort(), [2, 3, 4], 'ohne KB2: 2 bis 4 Kategorien');
});

test('Medikamente im Spiel: richtige Kombination zählt, falsche ist ein Fehlgriff, ab dem Spätdienst manchmal ohne Kategorie', async () => {
  const R = makeRoom(93);
  const { T, P } = await klasse(R, 4, { groesse: 4, dauer: 180, themen: ['medikamente', 'vital'], medAJ: 2, stoerungen: 'aus' });
  const s = R.logic.s;
  await R.msg(T, { t: 'schicht-start' });
  R.tick(VORLAUF_START + 100);
  const t = s.teams[0];
  const meds = Object.values(t.run.pult).flat().filter(id => I.byId.get(id).art === 'medikament');
  assert.ok(meds.length >= 2, 'mindestens zwei Kategorien in der Station');
  // Das Handy bekommt Wirkstoffe und Dosen, aber nicht die üblichen Zeitpunkte
  const halter = P.find(c => t.run.pult[c.pid].includes(meds[0]));
  const sicht = you(R, halter).pult.find(x => x.id === meds[0]);
  assert.deepEqual(sicht.zeiten, MED_ZEITPUNKTE);
  assert.ok(sicht.wirkstoffe.every(w => w.name && w.dosen.length && !w.zeiten));
  // Eine Aufgabe auf ein Medikament abwarten
  let a = null, holder = null;
  for (let i = 0; i < 400 && !a; i++) {
    for (const [pid, x] of Object.entries(t.run.auf)) if (x && I.byId.get(x.ziele[0][0]).art === 'medikament') { a = x; holder = pid; }
    if (!a) { R.tick(1000); await R.msg(T, { t: 'tick' }); }
  }
  assert.ok(a, 'Aufgabe mit Medikament');
  assert.equal(a.art, 'b', 'Frühdienst: mit Kategorie');
  assert.ok(I.byId.get(a.ziele[0][0]).befehle.includes(a.text));
  const [id, w] = a.ziele[0], c = I.byId.get(id);
  const geber = P.find(x => t.run.pult[x.pid].includes(id));
  R.tick(Math.max(0, a.startAt - R.now()) + 200);
  const fg = t.fg[0];
  await R.msg(geber, { t: 'tun', nr: s.spiel.nr, c: id, w: c.stufen.length }); // Kombination, die es nicht gibt
  assert.equal(t.fg[0], fg + 1, 'falsche Kombination: Fehlgriff');
  const ok = t.ok[0];
  await R.msg(geber, { t: 'tun', nr: s.spiel.nr, c: id, w });
  assert.equal(t.ok[0], ok + 1, 'richtige Kombination: Treffer');
  await R.msg(geber, { t: 'tun', nr: s.spiel.nr, c: id, w: c.stufen.length + 1 });
  assert.equal(t.fg[0], fg + 1, 'ungültige Werte zählen gar nicht');
  // Spätdienst: Medikamente auch ohne Kategorie (als Situation mit Tipp)
  await R.msg(T, { t: 'schicht-ende', nr: s.spiel.nr });
  await R.msg(T, { t: 'schicht-start' });
  let ohne = null;
  for (let i = 0; i < 600 && !ohne; i++) {
    for (const x of Object.values(t.run.auf)) if (x && x.art === 's' && I.byId.get(x.ziele[0][0]).art === 'medikament') ohne = x;
    if (!ohne) { R.tick(1000); await R.msg(T, { t: 'tick' }); }
  }
  assert.ok(ohne, 'Medikament ohne Kategorie im Spätdienst');
  const oc = I.byId.get(ohne.ziele[0][0]);
  assert.equal(ohne.text, oc.ohneKategorie[ohne.ziele[0][1]]);
  assert.ok(!ohne.text.includes(oc.einzeln + ' '), 'Text ohne Kategorie');
  assert.ok(ohne.tipp.startsWith(oc.name + ': '), 'Tipp nennt die Kategorie: ' + ohne.tipp);
});

test('Patientenedukation im Spiel: Anweisung, Thema umstellen, Treffer', async () => {
  const R = makeRoom(92);
  const { T, P } = await klasse(R, 4, { groesse: 4, dauer: 120 });
  await R.msg(T, { t: 'schicht-start' });
  R.tick(VORLAUF_START + 2000);
  const s = R.logic.s, t = s.teams[0], nr = s.spiel.nr;
  const halter = P.find(c => (t.run.pult[c.pid] || []).includes('beratung'));
  const rufer = P.find(c => c !== halter);
  assert.ok(halter, 'Beratung liegt auf einem Handy');
  const jetzt = t.run.zustand.beratung, ziel = (jetzt + 1) % 6;
  t.run.auf[rufer.pid] = { id: 999, art: 'b', text: I.byId.get('beratung').befehle[ziel], ziele: [['beratung', ziel]], tipp: '', sid: '', startAt: R.now(), endAt: R.now() + 10000 };
  assert.match(t.run.auf[rufer.pid].text, /^Patientenedukation: Beratung – /);
  const yh = R.logic.youMsg(halter.pid);
  const el = yh.pult.find(x => x.id === 'beratung');
  assert.equal(el.art, 'auswahl');
  assert.equal(el.hinweis, 'Patientenedukation');
  assert.equal(yh.zustand.beratung, jetzt);
  await R.msg(halter, { t: 'tun', nr, c: 'beratung', w: ziel });
  assert.equal(R.last(halter, 'tat').ok, true);
  assert.equal(t.run.zustand.beratung, ziel);
});

// ---------------------------------------------------------------- Schmerzskalen und Bezeichnungen
test('Schmerzskalen: NRS (Schieberegler 0–10), VRS (Liste), Smiley-Skala (Gesichter); Situationen eindeutig', () => {
  const nrs = I.byId.get('nrs'), vrs = I.byId.get('vrs'), sm = I.byId.get('smiley');
  assert.equal(nrs.art, 'regler');
  assert.equal(nrs.stufen.length, 11);
  assert.equal(nrs.befehle[7], 'NRS auf 7 stellen!');
  assert.equal(vrs.art, 'auswahl');
  assert.deepEqual(vrs.stufen, ['kein Schmerz', 'leicht', 'mäßig', 'stark', 'sehr stark', 'unaushaltbar']);
  assert.equal(vrs.befehle[3], 'VRS: starker Schmerz!');
  assert.equal(sm.art, 'gesichter');
  assert.deepEqual(sm.stufen, ['0', '2', '4', '6', '8', '10']);
  assert.equal(sm.befehle[4], 'Smiley-Skala: Gesicht 8!');
  assert.equal(I.byId.get('schmerz'), undefined, 'der alte Knopf „Schmerzskala“ ist weg');
  assert.ok(hatZustand(sm) && breit(sm) && breit(nrs) && !breit(vrs));
  assert.equal(nrs.gruppe, undefined, 'keine feste Gruppe');
  const sits = I.situationen.filter(s => s.ziele.some(z => ['nrs', 'vrs', 'smiley'].includes(z[0])));
  assert.equal(sits.length, 7);
  for (const s of sits) assert.equal(s.ziele.length, 1, 'genau eine Lösung: ' + s.text);
});

test('Bezeichnungen: nichts erinnert an eine Form der Patientenedukation', () => {
  for (const c of I.katalog.filter(c => c.gruppe !== 'edukation')) {
    const t = [c.name, ...c.befehle].join(' ').toLowerCase();
    for (const f of ['anleit', 'schulung', 'informier', 'berat']) assert.ok(!t.includes(f), `${c.name}: „${f}…“ erinnert an eine Edukationsform`);
  }
  const listen = new Set(I.katalog.filter(c => c.gruppe === 'edukation').flatMap(c => c.stufen.map(x => x.toLowerCase())));
  for (const c of I.katalog) assert.ok(!listen.has(c.name.toLowerCase()), `„${c.name}“ heißt wie ein Eintrag der Edukations-Liste`);
  // Namen sind eindeutig (Assessments gibt es je einmal für „einfach“ und „schwer“)
  const namen = I.katalog.filter(c => c.modus !== 'schwer').map(c => c.name.toLowerCase());
  assert.equal(new Set(namen).size, namen.length);
});

test('Situationen sind höchstens 90 Zeichen lang (passt auf kleine Handys)', () => {
  for (const s of I.situationen) assert.ok(s.text.length <= 90, `${s.text.length} Zeichen: ${s.text}`);
  for (const c of I.katalog) for (const b of c.befehle) assert.ok(b.length <= 64, `${b.length} Zeichen: ${b}`);
});

// ---------------------------------------------------------------- Testlauf allein: Computer-Mitspieler
// Eine Schicht mit einem Menschen und drei Computer-Mitspielern durchspielen. Der Mensch tut nichts.
async function testSchicht(R, T, P, beobachten) {
  const s = R.logic.s, sp = s.spiel;
  while (s.phase === 'schicht' && s.spiel === sp) {
    R.tick(500);
    if (R.now() % 1000 === 0) await R.msg(T, { t: 'tick' });
    if (beobachten) beobachten();
  }
}
test('Testlauf: drei Computer-Mitspieler, Anmeldung, Stationen, immer verbunden', async () => {
  const R = makeRoom(81);
  const { T, P } = await anmelden(R, 1);
  await R.msg(T, { t: 'computer', an: true });
  await R.msg(T, { t: 'computer', an: true }); // zweimal: trotzdem nur drei
  const s = R.logic.s;
  let room = R.last(T, 'room');
  assert.equal(room.players.length, 4);
  assert.deepEqual(room.players.filter(p => p.bot).map(p => p.name), COMPUTER.namen);
  assert.ok(room.players.filter(p => p.bot).every(p => p.online && /^[a-z0-9]{8,24}$/.test(p.pid)), 'Computer-Mitspieler sind verbunden');
  // Selbst wählen: Die Computer-Mitspieler sitzen sofort in einer Station
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 4, dauer: 60, wahl: 'selbst', schwierigkeit: 'mittel' } });
  assert.equal(s.phase, 'wahl');
  assert.equal(s.teams.length, 1);
  assert.equal(s.teams[0].pids.length, 3);
  await R.msg(P[0], { t: 'waehle', team: 0 });
  await R.msg(T, { t: 'verteilen' });
  assert.equal(s.teams[0].pids.length, 4);
  // Die Testansicht verbindet sich als Computer-Mitspieler, darf aber nichts drücken
  const bot = s.order.find(pid => s.players[pid].bot);
  const V = R.conn();
  await R.logic.open(V, { code: 'ABCDE', role: 'player', pid: bot });
  assert.equal(you(R, V).me.bot, true);
  await R.msg(T, { t: 'schicht-start' });
  R.tick(VORLAUF_START + 100);
  const id = s.teams[0].run.pult[bot][0];
  const fg = s.teams[0].fg[0], ok = s.teams[0].ok[0];
  await R.msg(V, { t: 'tun', nr: s.spiel.nr, c: id, w: 0 });
  assert.equal(s.teams[0].fg[0] + s.teams[0].ok[0], fg + ok, 'Testansicht drückt nichts');
  // Wieder entfernen
  await R.msg(T, { t: 'computer', an: false });
  assert.equal(s.order.length, 1);
  assert.equal(R.last(V, 'kicked').t, 'kicked');
});

test('Testlauf: Computer-Mitspieler erledigen Aufgaben nach 2–4 Sekunden, greifen auch daneben und vergessen etwas', async () => {
  const R = makeRoom(82);
  const { T, P } = await anmelden(R, 1);
  await R.msg(T, { t: 'computer', an: true });
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 4, dauer: 180, wahl: 'zufall', stoerungen: 'aus', anweisungen: 'steigend', schwierigkeit: 'mittel' } });
  const s = R.logic.s, ich = P[0].pid;
  assert.equal(s.teams.length, 1);
  const summe = { ok: 0, fg: 0, vp: 0 };
  const dauern = [];
  for (let k = 0; k < 3; k++) {
    await R.msg(T, { t: 'schicht-start' });
    const t = s.teams[0];
    let vorher = null;
    await testSchicht(R, T, P, () => {
      // Meine Aufgaben: Wer erledigt sie, und wie schnell?
      const a = t.run.auf[ich], z = s.players[ich].zuletzt;
      if (vorher && (!a || a.id !== vorher.id) && z && z.id === vorher.id && z.ok) dauern.push(R.now() - vorher.startAt);
      vorher = a;
    });
    summe.ok += t.ok[k]; summe.fg += t.fg[k]; summe.vp += t.vp[k];
  }
  assert.ok(dauern.length >= 5, 'meine Anweisungen wurden von den Computer-Mitspielern erledigt: ' + dauern.length);
  assert.ok(dauern.every(d => d >= COMPUTER.direkt[0]), 'nicht schneller als 2 Sekunden');
  assert.ok(dauern.filter(d => d <= COMPUTER.situation[1] + 1000).length >= dauern.length * 0.8, 'meist nach 2 bis 4 Sekunden');
  assert.ok(summe.ok > 30, 'viele Aufgaben erledigt: ' + summe.ok);
  assert.ok(summe.fg > 0, 'auch Fehlgriffe');
  assert.ok(summe.vp > 0, 'auch verpasste Aufgaben');
  assert.ok(s.players[ich].sum.ok > 0);
  assert.equal(s.players[ich].sum.tr, 0, 'ich habe nichts gedrückt');
  // Verpasste Situationen tauchen in „Das war knifflig“ auf
  assert.equal(s.phase, 'ende');
  assert.ok(R.last(T, 'room').kniffligAlle.length > 0);
});

test('Testlauf: Beim Ereignis machen die Computer-Mitspieler mit, der Bonus kommt erst mit mir', async () => {
  const R = makeRoom(83);
  const { T, P } = await anmelden(R, 1);
  await R.msg(T, { t: 'computer', an: true });
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 4, dauer: 120, wahl: 'zufall', stoerungen: 'an', schwierigkeit: 'mittel' } });
  const s = R.logic.s;
  await schichtBis(R, T, 1);
  const e = s.spiel.ereignisse[0];
  while (R.now() < e.startAt + COMPUTER.ereignis[1] + 1000) { R.tick(1000); await R.msg(T, { t: 'tick' }); }
  assert.equal(Object.keys(e.done).length, 3, 'alle drei Computer-Mitspieler haben mitgemacht');
  assert.ok(Object.values(e.done).every(at => at >= e.startAt + COMPUTER.ereignis[0]));
  assert.ok(!e.bonus[0], 'ohne mich kein Bonus');
  await R.msg(P[0], { t: 'ereignis', nr: s.spiel.nr, eid: e.eid });
  assert.ok(e.bonus[0] > 0, 'mit mir: Bonus');
});

// ---------------------------------------------------------------- Prophylaxen
test('Prophylaxen: Kategorien mit Maßnahmen und üblichen Zahlen, jede Maßnahme nur einmal', () => {
  const pro = I.katalog.filter(c => c.art === 'prophylaxe');
  assert.equal(pro.length, PROPHYLAXEN.length);
  assert.equal(pro.length, 8);
  const alle = [];
  for (const c of pro) {
    assert.equal(c.thema, 'prophylaxen');
    assert.equal(c.gruppe, 'prophylaxen');
    assert.ok(c.titel.endsWith('prophylaxe'), c.titel);
    assert.ok(c.name.length <= 16, 'Name passt aufs Handy: ' + c.name);
    assert.equal(c.stufen.length, c.massnahmen.reduce((n, m) => n + (m.werte.length || 1), 0));
    c.stufen.forEach((st, w) => {
      assert.equal(c.befehle[w], `${c.titel}: ${st}!`);
      assert.equal(c.ohneKategorie[w], st + '!');
      assert.ok(st.startsWith(c.teile[w]));
    });
    for (const m of c.massnahmen) {
      alle.push(m.name);
      if (m.einheit) {
        assert.ok(m.werte.every(v => PROPH_SKALEN[m.einheit].includes(v)), m.name);
        assert.deepEqual(c.skalen[m.einheit].map(x => x.n), PROPH_SKALEN[m.einheit]);
      }
    }
  }
  assert.equal(new Set(alle).size, alle.length, 'jede Maßnahme gehört nur zu einer Prophylaxe');
  const andere = new Set(I.katalog.filter(c => !istBlatt(c)).map(c => c.name));
  for (const m of alle) assert.ok(!andere.has(m), 'Maßnahme heißt wie ein anderes Element: ' + m);
  // Beispiele
  assert.ok(I.byId.get('pro-pneumonie').befehle.includes('Pneumonieprophylaxe: Atemstimulierende Einreibung 5 Minuten!'));
  assert.ok(I.byId.get('pro-dekubitus').befehle.includes('Dekubitusprophylaxe: Positionswechsel alle 2 Stunden!'));
  assert.ok(I.byId.get('pro-dehydration').befehle.includes('Dehydrationsprophylaxe: Getränk anbieten stündlich!'));
  assert.ok(I.byId.get('pro-thrombose').befehle.includes('Thromboseprophylaxe: Kompressionsstrümpfe anziehen!'));
  // Die Einzelknöpfe sind in den Kategorien aufgegangen, Hygiene und Prophylaxen sind getrennte Themen
  for (const id of ['atemuebung', 'mts', 'fussgymnastik', 'trinken', 'mundpflege', 'mikrolagerung', 'klingel', 'socken']) assert.ok(!I.byId.has(id), id);
  assert.deepEqual(THEMEN.filter(t => ['hygiene', 'prophylaxen'].includes(t.id)).map(t => t.name), ['Hygiene', 'Prophylaxen']);
  // In Situationen zählt die Maßnahme, die Zahl ist egal
  const m = I.situationen.find(x => x.text.startsWith('Herr M. liegt nach der Bauch-OP'));
  const at = I.byId.get('pro-pneumonie');
  for (let w = 0; w < at.stufen.length; w++) if (at.teile[w] === 'Atemtrainer') assert.ok(m.ziele.some(z => z[0] === at.id && z[1] === w), at.stufen[w]);
  assert.ok(zieleText(m.ziele, I.byId).startsWith('Pneumonieprophylaxe: Atemtrainer oder Atemstimulierende Einreibung'), zieleText(m.ziele, I.byId));
  // Fehler werden gemeldet
  const f = pruefeInhalte(THEMEN, [], [], [], [
    { id: 'a', name: 'A', titel: 'A-Prophylaxe', massnahmen: [{ name: 'Tun', einheit: 'Minuten', werte: [7] }] },
    { id: 'b', name: 'B', titel: 'B-Prophylaxe', massnahmen: [{ name: 'Machen' }, { name: 'machen' }] },
  ]);
  assert.ok(f.warnungen.some(w => w.includes('werte müssen')), f.warnungen.join(' | '));
  assert.ok(f.warnungen.some(w => w.includes('zweimal')), f.warnungen.join(' | '));
});

test('Listen-Themen: Sind mehr als zwei an, kommen pro Schicht nur zwei dran, jedes mindestens einmal', async () => {
  const drei = THEMEN.map(t => t.id).filter(t => t !== 'pflegeprozess'), vier = THEMEN.map(t => t.id);
  assert.deepEqual([0, 1, 2].map(k => gruppenPause(drei, k)), [['prophylaxen'], ['edukation'], ['medikamente']]);
  assert.deepEqual(gruppenPause(drei.filter(t => t !== 'medikamente'), 1), [], 'nur zwei an: keine Pause');
  assert.deepEqual([0, 1, 2].map(k => listenDran(vier, k).map(l => l.name)),
    [['KB2', 'Medikamente'], ['Prophylaxen', 'Pflegeprozess & Assessment'], ['KB2', 'Pflegeprozess & Assessment']]);
  assert.ok(schichtText(0, 'steigend', drei).includes('Listen: KB2 und Medikamente'));
  assert.ok(schichtText(1, 'steigend', vier).includes('Listen: Prophylaxen und Pflegeprozess & Assessment'));
  assert.ok(!schichtText(0, 'steigend', ['vital', 'kommunikation']).includes('Listen'));
  for (const [themen, erwartet] of [
    [drei, [['edukation', 'medikamente'], ['medikamente', 'prophylaxen'], ['edukation', 'prophylaxen']]],
    [vier, [['edukation', 'medikamente'], ['assessment', 'pflegeprozess', 'prophylaxen'], ['assessment', 'edukation', 'pflegeprozess']]],
  ]) {
    const R = makeRoom(94);
    const { T } = await klasse(R, 8, { groesse: 4, dauer: 60, themen, medAJ: 2, stoerungen: 'aus' });
    const s = R.logic.s;
    for (let k = 0; k < 3; k++) {
      await R.msg(T, { t: 'schicht-start' });
      for (const t of s.teams) {
        const gruppen = new Set(Object.values(t.run.pult).flat().map(id => I.byId.get(id).gruppe).filter(Boolean));
        assert.deepEqual([...gruppen].sort(), erwartet[k], `Schicht ${k + 1}: ${[...gruppen]}`);
        for (const list of Object.values(t.run.pult)) assert.ok(list.filter(id => I.byId.get(id).gruppe).length <= 2, 'höchstens 2 Listen pro Handy');
      }
      await R.msg(T, { t: 'schicht-ende', nr: s.spiel.nr });
    }
  }
});

test('Prophylaxen im Spiel: Maßnahme und Zahl müssen stimmen, das Handy kennt die üblichen Zahlen nicht', async () => {
  const R = makeRoom(95);
  const { T, P } = await klasse(R, 4, { groesse: 4, dauer: 180, themen: ['prophylaxen', 'vital'], stoerungen: 'aus' });
  const s = R.logic.s;
  await R.msg(T, { t: 'schicht-start' });
  R.tick(VORLAUF_START + 100);
  const t = s.teams[0];
  const pro = Object.values(t.run.pult).flat().filter(id => I.byId.get(id).art === 'prophylaxe');
  assert.ok(pro.length >= 2 && pro.length <= 3, '2 bis 3 Prophylaxen in der Station: ' + pro.length);
  const halter = P.find(c => t.run.pult[c.pid].includes(pro[0]));
  const sicht = you(R, halter).pult.find(x => x.id === pro[0]);
  assert.ok(sicht.massnahmen.every(m => m.name && !m.werte), 'keine üblichen Zahlen auf dem Handy');
  assert.equal(sicht.titel, I.byId.get(pro[0]).titel);
  // Eine Aufgabe auf eine Prophylaxe abwarten
  let a = null;
  for (let i = 0; i < 400 && !a; i++) {
    for (const x of Object.values(t.run.auf)) if (x && I.byId.get(x.ziele[0][0]).art === 'prophylaxe') a = x;
    if (!a) { R.tick(1000); await R.msg(T, { t: 'tick' }); }
  }
  assert.ok(a, 'Aufgabe mit Prophylaxe');
  const [id, w] = a.ziele[0], c = I.byId.get(id);
  assert.equal(a.text, c.befehle[w]);
  const geber = P.find(x => t.run.pult[x.pid].includes(id));
  R.tick(Math.max(0, a.startAt - R.now()) + 200);
  const fg = t.fg[0], ok = t.ok[0];
  await R.msg(geber, { t: 'tun', nr: s.spiel.nr, c: id, w: c.stufen.length }); // unübliche Zahl
  assert.equal(t.fg[0], fg + 1, 'falsche Zahl: Fehlgriff');
  await R.msg(geber, { t: 'tun', nr: s.spiel.nr, c: id, w });
  assert.equal(t.ok[0], ok + 1, 'richtige Maßnahme und Zahl: Treffer');
  // Spätdienst: auch ohne Prophylaxe (wie eine Situation, Tipp nennt die Prophylaxe). Hier nur Situationen, damit es sicher vorkommt
  await R.msg(T, { t: 'schicht-ende', nr: s.spiel.nr });
  await R.msg(T, { t: 'schicht-start', cfg: { anweisungen: 'situationen' } });
  let ohne = null;
  for (let i = 0; i < 600 && !ohne; i++) {
    for (const x of Object.values(t.run.auf)) if (x && x.art === 's' && I.byId.get(x.ziele[0][0]).art === 'prophylaxe' && x.text === I.byId.get(x.ziele[0][0]).ohneKategorie[x.ziele[0][1]]) ohne = x;
    if (!ohne) { R.tick(1000); await R.msg(T, { t: 'tick' }); }
  }
  assert.ok(ohne, 'Prophylaxe ohne Kategorie im Spätdienst');
  const oc = I.byId.get(ohne.ziele[0][0]);
  assert.ok(!ohne.text.includes(oc.titel), 'Text ohne Prophylaxe');
  assert.ok(ohne.tipp.startsWith(oc.titel + ': '), 'Tipp nennt die Prophylaxe: ' + ohne.tipp);
});

// ---------------------------------------------------------------- Pflegeprozess & Assessment
test('Pflegeprozess: sechs Schritte, zwei Formen der Anweisung, Situationen mit genau einer Lösung', () => {
  const pp = I.byId.get('pflegeprozess');
  assert.equal(pp.art, 'auswahl');
  assert.equal(pp.nummern, true);
  assert.deepEqual(pp.stufen, ['Informationssammlung', 'Probleme und Ressourcen erkennen', 'Pflegeziele festlegen', 'Pflegemaßnahmen planen', 'Pflege durchführen', 'Evaluation (Bewertung)']);
  assert.equal(pp.befehle[5], 'Pflegeprozess: Evaluation!');
  assert.equal(pp.befehle2[2], 'Pflegeprozess auf Schritt 3!');
  const sits = I.situationen.filter(x => x.ziele.some(z => z[0] === 'pflegeprozess'));
  assert.equal(sits.length, 12);
  for (const x of sits) assert.equal(x.ziele.length, 1, 'genau eine Lösung: ' + x.text);
  for (let w = 0; w < 6; w++) assert.equal(sits.filter(x => x.ziele[0][1] === w).length, 2, 'zwei Situationen für Schritt ' + (w + 1));
  // Beide Formen kommen als Anweisung vor
  const r = rng(96), texte = new Set();
  for (let i = 0; i < 200; i++) {
    const a = neueAufgabe({ pult: { a: ['pflegeprozess'], b: ['puls'] }, zustand: { pflegeprozess: 0 }, auf: {}, holder: 'b', online: null, anteil: 0, k: 0, byId: I.byId, situationen: [], r, now: 0, id: i });
    texte.add(a.text);
  }
  assert.ok([...texte].some(t => t.includes('auf Schritt')) && [...texte].some(t => t.startsWith('Pflegeprozess: ')), [...texte].join(' | '));
});

test('Assessments: fünf Instrumente, einfach (Punktzahl) und schwer (einordnen), Einstufungen ohne Lücken', () => {
  const ein = I.katalog.filter(c => c.gruppe === 'assessment' && c.modus === 'einfach');
  const sw = I.katalog.filter(c => c.gruppe === 'assessment' && c.modus === 'schwer');
  assert.deepEqual(ein.map(c => c.name), ['Braden-Skala', 'Norton-Skala', 'Glasgow Coma Scale', 'Bristol-Stuhlformenskala', 'BMI']);
  assert.deepEqual(sw.map(c => c.name), ein.map(c => c.name));
  const braden = I.byId.get('as-braden'), bradenS = I.byId.get('as-braden-s');
  assert.equal(braden.stufen.length, 18);
  assert.equal(braden.befehle[5], 'Braden-Skala: 11 Punkte eintragen!');
  assert.deepEqual(bradenS.stufen, ['kein Risiko', 'geringes Risiko', 'mittleres Risiko', 'hohes Risiko', 'sehr hohes Risiko']);
  assert.ok(bradenS.einordnen[3].includes('Braden-Skala: 11 Punkte – einordnen!'), '11 Punkte = hohes Risiko');
  assert.ok(I.byId.get('as-bristol-s').einordnen[2].includes('Bristol-Stuhlformenskala: Typ 6 – einordnen!'));
  assert.ok(I.byId.get('as-bmi-s').einordnen[2].includes('BMI: 27 – einordnen!'), 'BMI 27 = Übergewicht');
  for (const c of sw) {
    const alle = c.einordnen.flat();
    assert.equal(new Set(alle).size, alle.length, c.name + ': jeder Wert gehört zu genau einer Einstufung');
    assert.equal(alle.length, I.byId.get(c.id.replace(/-s$/, '')).stufen.length, c.name + ': alle Werte eingeordnet');
  }
  // Am Beamer ist immer nur eine Stufe dabei
  const r = rng(97), alleThemen = THEMEN.map(t => t.id);
  const p1 = pool(alleThemen, I.katalog, r, undefined, 3, [], 'einfach').filter(c => c.gruppe === 'assessment');
  const p2 = pool(alleThemen, I.katalog, r, undefined, 3, [], 'schwer').filter(c => c.gruppe === 'assessment');
  assert.ok(p1.every(c => c.modus === 'einfach') && p1.length === 5);
  assert.ok(p2.every(c => c.modus === 'schwer') && p2.length === 5);
  // Fehler werden gemeldet (Lücke zwischen den Einstufungen)
  const f = pruefeInhalte(THEMEN, [], [], [], [], [{ id: 'x', name: 'X-Skala', einheit: 'Punkte', einordnung: [['a', 1, 3], ['b', 5, 9]] }]);
  assert.ok(f.warnungen.some(w => w.includes('ohne Lücken')), f.warnungen.join(' | '));
});

test('Pflegeprozess & Assessment im Spiel: immer der Pflegeprozess, 2 bis 3 Instrumente, schwer: ab dem Spätdienst einordnen', async () => {
  const R = makeRoom(98);
  const { T, P } = await klasse(R, 4, { groesse: 4, dauer: 180, themen: ['pflegeprozess', 'vital'], stoerungen: 'aus', assessment: 'schwer' });
  const s = R.logic.s;
  await R.msg(T, { t: 'schicht-start' });
  const t = s.teams[0], ids = Object.values(t.run.pult).flat();
  assert.ok(ids.includes('pflegeprozess'), 'Pflegeprozess ist dabei');
  const inst = ids.filter(id => I.byId.get(id).gruppe === 'assessment');
  assert.ok(inst.length >= 2 && inst.length <= 3, '2 bis 3 Instrumente: ' + inst);
  assert.ok(inst.every(id => id.endsWith('-s')), 'Stufe schwer');
  const halter = P.find(c => t.run.pult[c.pid].includes('pflegeprozess'));
  assert.equal(you(R, halter).pult.find(x => x.id === 'pflegeprozess').nummern, true);
  // Spätdienst (nur Situationen, damit es sicher vorkommt): „… – einordnen!“ mit Tipp
  await R.msg(T, { t: 'schicht-ende', nr: s.spiel.nr });
  await R.msg(T, { t: 'schicht-start', cfg: { anweisungen: 'situationen' } });
  let e = null;
  for (let i = 0; i < 600 && !e; i++) {
    for (const x of Object.values(t.run.auf)) if (x && x.text.endsWith('– einordnen!')) e = x;
    if (!e) { R.tick(1000); await R.msg(T, { t: 'tick' }); }
  }
  assert.ok(e, 'Aufgabe zum Einordnen');
  const c = I.byId.get(e.ziele[0][0]), w = e.ziele[0][1];
  assert.ok(c.einordnen[w].includes(e.text), 'richtige Einstufung als Ziel');
  assert.equal(e.tipp, `${c.name}: ${c.stufen[w]}`);
  const geber = P.find(x => t.run.pult[x.pid].includes(c.id));
  R.tick(Math.max(0, e.startAt - R.now()) + 200);
  const ok = t.ok[1];
  await R.msg(geber, { t: 'tun', nr: s.spiel.nr, c: c.id, w });
  assert.equal(t.ok[1], ok + 1);
  // Einfach: keine Aufgaben zum Einordnen
  const R2 = makeRoom(99);
  const k2 = await klasse(R2, 4, { groesse: 4, dauer: 60, themen: ['pflegeprozess'], stoerungen: 'aus', assessment: 'einfach', anweisungen: 'situationen' });
  await R2.msg(k2.T, { t: 'schicht-start' });
  const t2 = R2.logic.s.teams[0];
  assert.ok(Object.values(t2.run.pult).flat().filter(id => I.byId.get(id).gruppe === 'assessment').every(id => !id.endsWith('-s')));
  for (let i = 0; i < 70; i++) {
    for (const x of Object.values(t2.run.auf)) if (x) assert.ok(!x.text.endsWith('– einordnen!'), x.text);
    R2.tick(1000); await R2.msg(k2.T, { t: 'tick' });
  }
});

// ---------------------------------------------------------------- Schwierigkeit
test('Schwierigkeit: Leicht hat weniger Knöpfe und mehr Zeit, Schwer wie bisher', async () => {
  for (const [name, erwartet, blass, tippAb] of [['leicht', [3, 4, 4], 0, 1 / 3], ['mittel', [4, 4, 5], 0, 0.5], ['schwer', [4, 5, 6], SCHICHTEN[2].verblasst, 0.5]]) {
    const R = makeRoom(101);
    const { T, P } = await klasse(R, 4, { groesse: 4, dauer: 60, schwierigkeit: name, stoerungen: 'aus' });
    const s = R.logic.s, groessen = [];
    for (let k = 0; k < 3; k++) {
      await R.msg(T, { t: 'schicht-start' });
      groessen.push(you(R, P[0]).pult.length);
      const mitAuf = P.map(c => you(R, c)).find(y => y.auf);
      assert.equal(mitAuf.auf.tippAb, tippAb, name + ': Tipp');
      if (k === 2) assert.equal(you(R, P[0]).verblasst, blass, name + ': verblassen');
      await R.msg(T, { t: 'schicht-ende', nr: s.spiel.nr });
    }
    assert.deepEqual(groessen, erwartet, name + ': Elemente pro Handy');
    assert.ok(schichtText(0, 'steigend', null, name).includes(erwartet[0] + ' Elemente pro Handy'));
    assert.equal(schichtText(2, 'steigend', null, name).includes('blass'), name === 'schwer');
  }
  // Mehr Zeit: Leicht 40 %, Mittel 20 % mehr als Schwer; das Schichtziel ist entsprechend kleiner
  const zeit = f => { const a = neueAufgabe({ pult: { a: ['puls'], b: ['bettgitter'] }, zustand: {}, auf: {}, holder: 'b', online: null, anteil: 0, k: 0, tempoF: f, byId: I.byId, situationen: [], r: rng(3), now: 0, id: 1 }); return a.endAt - a.startAt; };
  assert.equal(zeit(stufe('leicht').f), Math.round(SCHICHTEN[0].direkt * 1.4));
  assert.equal(zeit(stufe('mittel').f), Math.round(SCHICHTEN[0].direkt * 1.2));
  assert.equal(zeit(stufe('schwer').f), SCHICHTEN[0].direkt);
  assert.ok(zielPunkte(4, 120000, 0, stufe('leicht').f) < zielPunkte(4, 120000, 0, stufe('schwer').f));
  // Ohne Kategorie: Leicht nie, Mittel erst im Nachtdienst, Schwer ab dem Spätdienst
  const art = (k, ohneAb) => neueAufgabe({ pult: { a: ['med-diuretika'], b: ['puls'] }, zustand: {}, auf: {}, holder: 'b', online: null, anteil: 1, k, byId: I.byId, situationen: [], r: rng(5), now: 0, id: 1, ohneAb }).art;
  assert.deepEqual([1, 2].map(k => art(k, stufe('leicht').ohneAb)), ['b', 'b']);
  assert.deepEqual([1, 2].map(k => art(k, stufe('mittel').ohneAb)), ['b', 's']);
  assert.deepEqual([1, 2].map(k => art(k, stufe('schwer').ohneAb)), ['s', 's']);
});

test('Voreinstellungen: Nur Anweisungen, Störungen aus, Schwierigkeit Sehr leicht', () => {
  const c = cleanCfg({});
  assert.equal(c.anweisungen, 'befehle');
  assert.equal(c.stoerungen, 'aus');
  assert.equal(c.schwierigkeit, 'sehrleicht');
});

test('Sehr leicht: Kennenlernen, dann eine Anweisung nach der anderen, später mehr gleichzeitig, immer 3 Knöpfe', async () => {
  const R = makeRoom(111);
  const { T, P } = await anmelden(R, 4);
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 4, dauer: 60, wahl: 'zufall', schwierigkeit: 'sehrleicht' } });
  const s = R.logic.s;
  await R.msg(T, { t: 'schicht-start' });
  const t = s.teams[0];
  // Kennenlernen: noch keine Aufgaben, jedes Handy bekommt für jeden Knopf eine Anweisung zum Ausprobieren
  assert.ok(s.spiel.kennen.aktiv);
  for (const c of P) {
    const y = you(R, c);
    assert.equal(y.pult.length, 3);
    assert.equal(y.kennen.schritte.length, 3);
    for (const st of y.kennen.schritte) {
      const el = I.byId.get(st.id);
      assert.equal(st.text, el.befehle[st.w]);
      if (hatZustand(el)) assert.notEqual(st.w, t.run.zustand[st.id], 'Schalter usw. müssen sich ändern');
    }
  }
  R.tick(5000); await R.msg(T, { t: 'tick' });
  assert.ok(Object.values(t.run.auf).every(a => !a), 'während des Kennenlernens keine Aufgaben');
  await R.msg(P[0], { t: 'tun', nr: s.spiel.nr, c: t.run.pult[P[0].pid][0], w: 0 });
  assert.equal(t.fg[0] + t.ok[0], 0, 'Ausprobieren zählt nicht');
  // Erst wenn alle fertig sind, beginnt der Countdown
  for (const c of P.slice(0, 3)) await R.msg(c, { t: 'kennen', nr: s.spiel.nr });
  assert.ok(s.spiel.kennen.aktiv);
  assert.deepEqual(R.last(T, 'room').spiel.kennen.stand[0], { fertig: 3, von: 4 });
  await R.msg(P[3], { t: 'kennen', nr: s.spiel.nr });
  assert.ok(!s.spiel.kennen.aktiv);
  assert.equal(s.spiel.startAt, R.now() + VORLAUF_START);
  // Frühdienst: immer nur eine Aufgabe gleichzeitig, reihum
  R.tick(VORLAUF_START + 100);
  const halter = new Set();
  let maxAktiv = 0;
  while (s.phase === 'schicht') {
    await R.msg(T, { t: 'tick' });
    const aktiv = Object.entries(t.run.auf).filter(([, a]) => a);
    maxAktiv = Math.max(maxAktiv, aktiv.length);
    for (const [h, a] of aktiv) {
      if (R.now() < a.startAt) continue;
      halter.add(h);
      const [id, w] = a.ziele[0];
      R.tick(1500);
      await R.msg(P.find(c => t.run.pult[c.pid].includes(id)), { t: 'tun', nr: s.spiel.nr, c: id, w });
    }
    R.tick(500);
  }
  assert.equal(maxAktiv, 1, 'Frühdienst: eine Anweisung nach der anderen');
  assert.equal(halter.size, 4, 'jede Person kommt dran');
  assert.ok(prozent(t.punkte[0], t.ziel[0]) >= 100, 'Schichtziel gut schaffbar: ' + prozent(t.punkte[0], t.ziel[0]));
  // Spätdienst: zwei gleichzeitig, Nachtdienst: alle (wie „Leicht“ im Frühdienst); immer 3 Knöpfe, kein Kennenlernen mehr
  for (const [k, erwartet] of [[1, 2], [2, 4]]) {
    await R.msg(T, { t: 'schicht-start' });
    assert.ok(!s.spiel.kennen);
    R.tick(VORLAUF_START + 2000); await R.msg(T, { t: 'tick' });
    assert.equal(Object.values(t.run.auf).filter(Boolean).length, erwartet, `Schicht ${k + 1}`);
    assert.ok(P.every(c => you(R, c).pult.length === 3));
    await R.msg(T, { t: 'schicht-ende', nr: s.spiel.nr });
  }
  assert.equal(stufeK('sehrleicht', 2).f, stufe('leicht').f, 'Nachtdienst so schnell wie „Leicht“');
  assert.ok(schichtText(0, 'befehle', null, 'sehrleicht').includes('eine Anweisung nach der anderen'));
});

test('Sehr leicht: Kennenlernen endet nach der Zeit oder auf Knopfdruck, Computer-Mitspieler machen mit', async () => {
  const start = async (seed, n, mitComputer) => {
    const R = makeRoom(seed), k = await anmelden(R, n);
    if (mitComputer) await R.msg(k.T, { t: 'computer', an: true });
    await R.msg(k.T, { t: 'teams-bilden', cfg: { groesse: 4, dauer: 60, wahl: 'zufall', schwierigkeit: 'sehrleicht' } });
    await R.msg(k.T, { t: 'schicht-start' });
    return { R, ...k, s: R.logic.s };
  };
  // Zeit um
  const a = await start(112, 3);
  a.R.tick(KENNEN_MS - 1000); await a.R.msg(a.T, { t: 'tick' });
  assert.ok(a.s.spiel.kennen.aktiv);
  a.R.tick(1500); await a.R.msg(a.T, { t: 'tick' });
  assert.ok(!a.s.spiel.kennen.aktiv, 'nach der Zeit geht es los');
  // Lehrkraft startet vorher
  const b = await start(113, 3);
  await b.R.msg(b.T, { t: 'kennen-ende' });
  assert.ok(!b.s.spiel.kennen.aktiv);
  b.R.tick(VORLAUF_START + 200); await b.R.msg(b.T, { t: 'tick' });
  assert.equal(Object.values(b.s.teams[0].run.auf).filter(Boolean).length, 1);
  // Computer-Mitspieler sind nach ein paar Sekunden fertig
  const c = await start(114, 1, true);
  await c.R.msg(c.P[0], { t: 'kennen', nr: c.s.spiel.nr });
  assert.ok(c.s.spiel.kennen.aktiv);
  for (let i = 0; i < 10; i++) { c.R.tick(1000); await c.R.msg(c.T, { t: 'tick' }); }
  assert.ok(!c.s.spiel.kennen.aktiv, 'Computer-Mitspieler waren fertig');
});

test('Sehr leicht: höchstens ein Element mit Ausklapp-Liste pro Handy', async () => {
  const listen = new Set();
  for (const seed of [121, 122, 123, 124]) {
    const R = makeRoom(seed);
    const { T, P } = await klasse(R, 8, { groesse: 4, dauer: 60, schwierigkeit: 'sehrleicht', themen: THEMEN.map(t => t.id) });
    const s = R.logic.s;
    for (let k = 0; k < 3; k++) {
      await R.msg(T, { t: 'schicht-start' });
      for (const t of s.teams) for (const ids of Object.values(t.run.pult)) {
        const l = ids.filter(id => istListe(I.byId.get(id)));
        assert.ok(l.length <= 1, `Schicht ${k + 1}: ${l.join(', ')}`);
        l.forEach(id => listen.add(I.byId.get(id).art));
      }
      await R.msg(T, { t: 'schicht-ende', nr: s.spiel.nr });
    }
  }
  assert.ok(listen.size >= 2, 'Listen kommen trotzdem vor: ' + [...listen]);
  // Andere Schwierigkeiten: wie bisher (zwei Listen auf einem Handy sind möglich)
  const r = rng(125);
  let zwei = false;
  for (let i = 0; i < 30 && !zwei; i++) {
    const p = pultVerteilen(['a', 'b', 'c', 'd'], 5, pool(THEMEN.map(t => t.id), I.katalog, r), r);
    zwei = Object.values(p).some(ids => ids.filter(id => istListe(I.byId.get(id))).length >= 2);
  }
  assert.ok(zwei);
});
