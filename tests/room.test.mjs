// Tests der Regeln und der Raum-Logik ohne Server:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomLogic, cleanName, cleanCfg, rangliste, gesamt } from '../src/room.js';
import {
  inhalte, pruefeInhalte, rng, teamsBilden, teamAnzahl, pultVerteilen, pool, startZustand, neueAufgabe, trefferSuchen,
  zielPunkte, prozent, SCHICHTEN, VORLAUF_START, GNADE, PAUSE_OK, MAX_TEAMS, WAHL_SEKUNDEN, WAHL_PLUS, wahlMax,
  ohneStufen, hatZustand, breit, taktPruefen, ARTEN, EREIGNIS_VORLAUF, EREIGNIS_DAUER, STOERUNGEN,
} from '../public/js/regeln.js';
import { THEMEN, PULT, SITUATIONEN } from '../public/js/inhalte.js';

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
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 3, dauer: 60, tempo: 'normal', anweisungen: 'steigend', wahl: 'zufall', ...cfg } });
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
  assert.equal(I.katalog.length, PULT.length);
  assert.equal(I.situationen.length, SITUATIONEN.length);
  for (const th of THEMEN) assert.ok(I.katalog.filter(c => c.thema === th.id).length >= (th.id === 'kommunikation' ? 4 : 8), th.name + ' hat genug Elemente');
  for (const s of I.situationen) for (const [id, w] of s.ziele) {
    const c = I.byId.get(id);
    assert.ok(c, s.text);
    assert.ok(ohneStufen(c) ? w === 0 : w < c.stufen.length, s.text);
  }
  // Jede Anweisung hat einen Text
  for (const c of I.katalog) for (const b of c.befehle) assert.ok(b.length > 2 && b.length < 60, c.name + ': ' + b);
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
      if (a.art === 's') { sit++; assert.ok(a.tipp.length > 0); } else assert.equal(a.text, I.byId.get(a.ziele[0][0]).befehle[a.ziele[0][1]]);
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
    assert.equal(y.pult.length, SCHICHTEN[0].proHandy);
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
  assert.equal(y.pult.length, SCHICHTEN[0].proHandy);
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
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 3, dauer: 60, wahl: 'selbst' } });
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
  assert.equal(y.pult.length, SCHICHTEN[0].proHandy);
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

test('Patientenedukation: alle vier Formen in eine Station, möglichst jede auf ein anderes Handy', () => {
  const r = rng(91);
  const alle = THEMEN.map(t => t.id);
  for (let i = 0; i < 20; i++) for (const n of [2, 3, 4, 5, 6]) {
    const pids = Array.from({ length: n }, (_, j) => 'p' + j);
    const p = pultVerteilen(pids, 4, pool(alle, I.katalog, r));
    const proHandy = Object.values(p).map(list => list.filter(id => I.byId.get(id).gruppe === 'edukation').length);
    assert.equal(proHandy.reduce((a, b) => a + b, 0), 4, `${n} Personen: alle vier Formen`);
    assert.equal(Math.max(...proHandy), Math.ceil(4 / n), `${n} Personen: so gleichmäßig wie möglich (${proHandy})`);
    for (const list of Object.values(p)) assert.equal(list.length, 4);
  }
  // Allein (z. B. Nachzügler mit eigenem Pult) und bei abgewähltem Thema: keine Formen
  assert.equal(pultVerteilen(['x'], 6, pool(alle, I.katalog, r)).x.filter(id => I.byId.get(id).gruppe).length, 0);
  const ohne = pultVerteilen(['a', 'b', 'c', 'd'], 6, pool(alle.filter(t => t !== 'kommunikation'), I.katalog, r));
  assert.equal(Object.values(ohne).flat().filter(id => I.byId.get(id).gruppe).length, 0);
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
  // Namen sind eindeutig
  const namen = I.katalog.map(c => c.name.toLowerCase());
  assert.equal(new Set(namen).size, namen.length);
});

test('Situationen sind höchstens 90 Zeichen lang (passt auf kleine Handys)', () => {
  for (const s of I.situationen) assert.ok(s.text.length <= 90, `${s.text.length} Zeichen: ${s.text}`);
  for (const c of I.katalog) for (const b of c.befehle) assert.ok(b.length <= 60, `${b.length} Zeichen: ${b}`);
});
