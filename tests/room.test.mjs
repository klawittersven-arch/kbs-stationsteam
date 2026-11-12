// Tests der Regeln und der Raum-Logik ohne Server:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { RoomLogic, cleanName, cleanCfg, rangliste, gesamt } from '../src/room.js';
import {
  inhalte, pruefeInhalte, rng, teamsBilden, teamAnzahl, pultVerteilen, pool, startZustand, neueAufgabe, trefferSuchen,
  zielPunkte, prozent, SCHICHTEN, VORLAUF_START, GNADE, PAUSE_OK, MAX_TEAMS,
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

async function klasse(R, n, cfg = {}) {
  const T = R.conn();
  await R.logic.open(T, { code: 'ABCDE', role: 'teacher', key: 'k'.repeat(20) });
  const P = [];
  for (let i = 0; i < n; i++) {
    const c = R.conn(); c.pid = 'spieler' + String(i).padStart(3, '0');
    await R.logic.open(c, { code: 'ABCDE', role: 'player', pid: c.pid });
    await R.msg(c, { t: 'join', first: 'Name' + 'abcdefghijklmnopqrstuvwxyz'[i % 26] + (i >= 26 ? 'x' : ''), initial: 'K' });
    P.push(c);
  }
  await R.msg(T, { t: 'teams-bilden', cfg: { groesse: 3, dauer: 60, tempo: 'normal', anweisungen: 'steigend', ...cfg } });
  return { T, P };
}
const you = (R, c) => R.last(c, 'you');
// Wer im Team hat das Bedienelement?
function besitzer(R, P, id) {
  for (const c of P) { const y = you(R, c); if (y && y.pult && y.pult.some(x => x.id === id)) return c; }
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
  for (const th of THEMEN) assert.ok(I.katalog.filter(c => c.thema === th.id).length >= 8, th.name + ' hat genug Elemente');
  for (const s of I.situationen) for (const [id, w] of s.ziele) {
    const c = I.byId.get(id);
    assert.ok(c, s.text);
    assert.ok(c.art === 'knopf' ? w === 0 : w < c.stufen.length, s.text);
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
      assert.ok(list.filter(id => I.byId.get(id).art === 'stufen').length <= 2);
    }
    const nf = I.katalog.filter(c => c.thema === 'notfall').length;
    assert.equal(all.filter(id => I.byId.get(id).thema === 'notfall').length, nf, 'alle Notfall-Elemente sind dabei');
  }
});

test('Aufgaben: nie zwei auf dasselbe Element, Schalter ändern sich immer, meist fremdes Handy', () => {
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
        if (c.art !== 'knopf') assert.notEqual(zustand[id], w, 'Schalter/Stufen müssen sich ändern');
      }
      if (a.art === 's') { sit++; assert.ok(a.tipp.length > 0); } else assert.equal(a.text, I.byId.get(a.ziele[0][0]).befehle[a.ziele[0][1]]);
      gesamtN++;
      if (!pult[holder].includes(a.ziele[0][0])) fremd++;
      // ab und zu wird eine Aufgabe erledigt (Zustand ändert sich)
      if (step % 3 === 0) { const [id, w] = a.ziele[0]; if (I.byId.get(id).art !== 'knopf') zustand[id] = w; auf[holder] = null; }
    }
  }
  assert.ok(fremd / gesamtN > 0.75, 'meist liegt das Element auf einem anderen Handy: ' + fremd / gesamtN);
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
  const own0 = besitzer(R, P, z0[0]);
  await R.msg(own0, { t: 'tun', nr, c: z0[0], w: z0[1] });
  assert.equal(R.last(own0, 'tat'), undefined);
  R.tick(VORLAUF_START + 1600);

  // Treffer: die Person mit dem Element führt die Anweisung aus
  const team0 = R.logic.s.teams[R.logic.s.players[P[0].pid].team];
  const z = loesung(R, P[0]);
  const own = besitzer(R, P, z[0]);
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
  await R.msg(fc, { t: 'tun', nr, c: frei[1], w: el.art === 'knopf' ? 0 : (team0.run.zustand[frei[1]] + 1) % el.stufen.length });
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
  assert.ok(you(R, P[0]).verpasst.length > 0);

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
