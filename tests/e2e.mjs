// Browser-Durchlauf: Beamer + 7 Handys (+ 1 Nachzügler) durch Stationen, Früh-, Spät- und Nachtdienst, Siegerehrung und Übungsseite.
// Start:  node tests/e2e.mjs      (startet den lokalen Server selbst; Bildschirmfotos in tests/ergebnisse/)
// Mit Adresse (z. B. node tests/e2e.mjs http://127.0.0.1:8787 bei laufendem „npx wrangler dev“) wird kein eigener Server gestartet.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inhalte } from '../public/js/regeln.js';
import { wischen, bedienenJetzt as bedienenRoh } from './bedienen.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests', 'ergebnisse');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8790, BASE = process.argv[2] || `http://127.0.0.1:${PORT}`;
let srv = null;
if (!process.argv[2]) {
  srv = spawn(process.execPath, [path.join(ROOT, 'server', 'local.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
  srv.stderr.on('data', d => process.stderr.write(d));
  await new Promise(r => srv.stdout.once('data', r));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(14, 23), ...a);
const shot = (p, name, full) => p.screenshot({ path: path.join(OUT, name + '.png'), fullPage: !!full });
// Zählt, ob eine Seite eine Tonausgabe (AudioContext) startet – Handys müssen stumm bleiben
const audioZaehler = () => {
  window.__audio = 0;
  const A = window.AudioContext || window.webkitAudioContext;
  if (!A) return;
  const Z = function (...a) { window.__audio++; return new A(...a); };
  Z.prototype = A.prototype;
  window.AudioContext = window.webkitAudioContext = Z;
};

// Lösungen aus der Inhalte-Datei: Anweisungstext bzw. Situationstext → [[Element, Stufe], …]
const I = inhalte();
const LOESUNG = new Map();
for (const c of I.katalog) for (const liste of [c.befehle, c.ohneKategorie || []]) liste.forEach((b, w) => LOESUNG.set(b, [[c.id, w]]));
for (const s of I.situationen) LOESUNG.set(s.text, s.ziele);

const errors = [];
const browser = await chromium.launch();
let ok = false;
const phones = [];
const stats = { treffer: 0, fehlgriffe: 0, ignoriert: 0, situationen: 0, selbst: 0, gewischt: 0, ereignisse: 0, stoerGesehen: new Set(), stoerFoto: false };
const arten = {}; // wie oft jede Art im Spiel bedient wurde
let botsAn = false;

async function neuesHandy(name, ini, code, klein) {
  const ctx = await browser.newContext({ viewport: klein ? { width: 360, height: 640 } : { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(audioZaehler);
  const p = await ctx.newPage();
  p.setDefaultTimeout(6000);
  p.on('pageerror', e => errors.push(name + ': ' + e.message));
  await p.goto(`${BASE}/mitspielen?c=${code}`);
  await p.fill('#fFirst', name); await p.fill('#fInit', ini);
  await p.click('button[type=submit]');
  const ph = { p, name, profil: 'gut', erledigt: new Set() };
  phones.push(ph);
  return ph;
}
// Was zeigt das Handy gerade?
const lesen = p => p.evaluate(() => {
  const sf = document.querySelector('#spielfeld');
  if (!sf || sf.hidden) return null;
  const box = document.querySelector('#auftrag');
  return {
    id: box.dataset.id || '', klasse: box.className, text: document.querySelector('#aText').textContent,
    station: document.querySelector('#sStation').textContent, tipp: !document.querySelector('#aTipp').hidden,
    blass: document.querySelector('#aText').classList.contains('blass'),
  };
}).catch(() => null);

// Ein Spiel-Roboter je Handy: liest die Aufgabe und drückt das passende Element auf einem Handy derselben Station
async function bot(ph) {
  const p = ph.p;
  while (botsAn) {
    const a = await lesen(p);
    if (!a || a.klasse.includes('wartet') || a.klasse.includes('leer') || ph.erledigt.has(a.id)) { await sleep(200); continue; }
    if (await p.$('#ereignis:not([hidden])')) { await sleep(300); continue; } // während eines Ereignisses ruht die Aufgabe
    const situation = a.klasse.includes('situation');
    // „mittel“: lässt manche Aufgabe verfallen und drückt manchmal erst daneben
    const r = Math.random();
    // „träumt“: lässt jede Situation liegen (damit sicher ein Tipp erscheint und etwas verpasst wird)
    if ((ph.profil === 'mittel' && r < 0.25) || (ph.profil === 'traeumt' && situation)) {
      ph.erledigt.add(a.id); stats.ignoriert++;
      continue;
    }
    ph.erledigt.add(a.id);
    if (situation) stats.situationen++;
    const ziele = LOESUNG.get(a.text);
    if (!ziele) { errors.push(`${ph.name}: unbekannte Aufgabe „${a.text}“`); continue; }
    await sleep(situation ? 700 + Math.random() * 1500 : 300 + Math.random() * 900);
    const team = phones.filter(x => x.station === a.station);
    if (ph.profil === 'mittel' && r < 0.45) await fehlgriff(ph, team);
    let gedrueckt = false;
    // Erst auf den Handys der anderen suchen, das eigene zuletzt
    for (const reihe of [team.filter(t => t !== ph), [ph]]) {
      for (const [id, w] of ziele) {
        for (const t of reihe) {
          const sel = `.ctl[data-c="${id}"]`;
          if (!(await t.p.$(sel))) continue;
          if (await t.p.$(`${sel} button[data-w="${w}"][aria-checked="true"]`) || await t.p.$(`${sel}.auswahl[data-z="${w}"]`)) continue; // steht schon so
          if (t === ph) {
            stats.selbst++;
            if (!a.klasse.includes('selbst')) errors.push(`${ph.name}: Aufgabe „${a.text}“ ist auf dem eigenen Handy, ohne Hinweis`);
          }
          bedienen(t, id, w);
          gedrueckt = true; stats.treffer++;
          break;
        }
        if (gedrueckt) break;
      }
      if (gedrueckt) break;
    }
    if (!gedrueckt) errors.push(`${ph.name}: Element für „${a.text}“ in ${a.station} nicht gefunden`);
  }
}
// Daneben drücken: ein Knopf, den gerade keine Aufgabe der Station braucht
async function fehlgriff(ph, team) {
  const gesucht = new Set();
  for (const t of team) { const a = await lesen(t.p); if (a) for (const [id] of LOESUNG.get(a.text) || []) gesucht.add(id); }
  const ids = await ph.p.$$eval('.ctl.knopf', els => els.map(e => e.dataset.c));
  const frei = ids.find(id => !gesucht.has(id));
  if (frei) { await bedienen(ph, frei, 0); stats.fehlgriffe++; }
}
// Beim gemeinsamen Ereignis mitmachen (außer „träumt“)
async function ereignisBot(ph) {
  const fertig = new Set();
  while (botsAn) {
    const ev = await ph.p.$eval('#ereignis', e => ({ sichtbar: !e.hidden, aktiv: e.dataset.aktiv === 'true', eid: e.dataset.eid, art: (e.className.match(/ev-(\w+)/) || [])[1] })).catch(() => null);
    if (ev && ev.aktiv && !fertig.has(ev.eid) && ph.profil !== 'traeumt') {
      fertig.add(ev.eid);
      await bedienen(ph, 'ev-' + ev.art, ev.art === 'strom' ? 1 : 0);
      stats.ereignisse++;
    }
    await sleep(250);
  }
}
// Schaut, ob auf einem Handy eine Störung liegt (für ein Bildschirmfoto)
async function stoerWaechter() {
  while (botsAn) {
    for (const ph of phones) {
      const n = await ph.p.$$eval('.pult .stoer', els => els.map(e => e.className)).catch(() => []);
      if (n.length) { stats.stoerGesehen.add(ph.name + n.join()); if (!stats.stoerFoto) { stats.stoerFoto = true; await shot(ph.p, '11b-handy-stoerung'); } }
    }
    await sleep(700);
  }
}
// Beamer: Ereignis erscheint, mindestens eine Station bekommt den Bonus
async function ereignisPruefen(T, name, foto) {
  await T.waitForSelector('#evbox:not([hidden])', { timeout: 70000 });
  const titel = await T.textContent('#evbox .evtitel b');
  log('Ereignis am Beamer:', titel);
  const gut = phones.find(p => p.profil === 'gut');
  await gut.p.waitForSelector('#ereignis:not([hidden])', { timeout: 6000 });
  await gut.p.waitForSelector('#ereignis[data-aktiv="true"]', { timeout: 8000 }).catch(() => {});
  await sleep(1200);
  await shot(gut.p, foto + '-handy');
  await T.waitForSelector('.evchip.ok', { timeout: 20000 });
  await shot(T, foto + '-beamer');
  const chips = await T.$$eval('.evchip', els => els.map(e => e.textContent.trim()));
  log('Stand beim Ereignis:', chips.join(' | '));
  return { titel, chips };
}
// Ein Element bedienen, je nach Art: tippen, halten, im Takt tippen, Dosis einstellen und auslösen, Stufe antippen.
// Pro Handy immer nur eine Bedienung gleichzeitig (wie bei einer echten Hand).
function bedienen(t, id, w) {
  t.sperre = (t.sperre || Promise.resolve()).then(() => bedienenJetzt(t.p, id, w)).catch(() => {});
  return t.sperre;
}
const bedienenJetzt = (p, id, w) => bedienenRoh(p, id, w, (art, gewischt) => { arten[art] = (arten[art] || 0) + 1; if (gewischt) stats.gewischt++; });
async function stationenLesen() {
  for (const ph of phones) { const a = await lesen(ph.p); if (a) ph.station = a.station; }
}
const zahlen = T => T.$$eval('.stbar', els => els.map(e => ({
  name: e.querySelector('.stn').textContent, pz: parseInt(e.querySelector('.pz').textContent, 10),
  z: [...e.querySelectorAll('.zahlen span')].map(s => parseInt(s.textContent.replace(/\D+/g, ''), 10)),
})));

try {
  // ---------------- Anmeldung
  const tctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await tctx.addInitScript(audioZaehler);
  const T = await tctx.newPage();
  T.on('pageerror', e => errors.push('Beamer: ' + e.message));
  T.on('dialog', d => d.accept());
  await T.goto(BASE + '/lehrer');
  await T.waitForSelector('#qr');
  const code = (await T.textContent('#codeChip')).replace('Code ', '').trim();
  log('Code', code);
  const namen = [['Lena', 'K'], ['Tom', 'B'], ['Aylin', 'S'], ['Max', 'M'], ['Sara', 'P'], ['Jonas', 'W'], ['Mia', 'L']];
  for (const [n, i] of namen) await neuesHandy(n, i, code, n === 'Mia');
  for (const ph of phones) await ph.p.waitForSelector('.waitdots');
  await T.waitForFunction(() => document.querySelectorAll('.name').length === 7);
  await T.click('.seg[aria-label="Personen pro Station"] button:has-text("3 Personen")');
  await T.click('.seg[aria-label="Dauer einer Schicht"] button:has-text("1 Min.")');
  await T.click('.seg[aria-label="Themen"] button:has-text("Notfälle")'); // aus …
  await T.click('.seg[aria-label="Themen"] button:has-text("Notfälle")'); // … und wieder an
  await sleep(300);
  await shot(T, '01-beamer-anmeldung');
  await shot(phones[0].p, '02-handy-warten');

  // ---------------- Stationen selbst wählen (60 Sekunden)
  const handy = n => phones.find(x => x.name === n);
  await T.keyboard.press('Enter');
  await T.waitForSelector('#wTimer');
  if ((await T.$$eval('.stkarte', els => els.length)) !== 2) throw new Error('7 Personen bei Größe 3: zwei Stationen erwartet');
  for (const ph of phones) await ph.p.waitForSelector('.stbtn');
  await shot(phones[0].p, '03a-handy-station-waehlen', true);
  // Fünf wählen Station Rot → voll (höchstens 5)
  for (const n of ['Lena', 'Tom', 'Aylin', 'Max', 'Jonas']) {
    await handy(n).p.click('.stbtn[data-i="0"]');
    await handy(n).p.waitForSelector('.stbtn.mein[data-i="0"]');
  }
  await handy('Mia').p.waitForSelector('.stbtn[data-i="0"]:disabled');
  log('Station Rot ist voll ✓');
  await shot(handy('Mia').p, '03b-handy-station-voll');
  // Sara wählt Blau, Jonas wechselt zu Blau, Mia wählt gar nicht
  await handy('Sara').p.click('.stbtn[data-i="1"]');
  await handy('Jonas').p.click('.stbtn[data-i="1"]');
  await handy('Jonas').p.waitForSelector('.stbtn.mein[data-i="1"]');
  await handy('Mia').p.waitForSelector('.stbtn[data-i="0"]:not(:disabled)');
  await T.waitForFunction(() => document.querySelectorAll('.stkarte[data-i="1"] .mchip').length === 2);
  await shot(T, '03c-beamer-stationen-waehlen');
  const ohne = await T.textContent('#ohne');
  if (!ohne.includes('Mia')) throw new Error('Beamer zeigt Mia nicht als „ohne Station“');
  log('Warte auf das Ende der 60 Sekunden …');
  await T.waitForSelector('#tHint', { timeout: 90000 });
  let karten = await T.$$eval('.stkarte', els => els.map(e => e.querySelectorAll('.mchip').length));
  log('Stationen nach der Wahl', karten.join(' + '));
  if (karten.join() !== '4,3') throw new Error('Mia hätte in die kleinere Station gelost werden müssen');
  if (!(await T.$('.stkarte[data-i="1"] .mchip.zug'))) throw new Error('Zugeloste Person ist am Beamer nicht markiert');
  await handy('Mia').p.waitForSelector('.zugelost');
  const zugText = await handy('Mia').p.textContent('.zugelost');
  log('Mia:', zugText);
  if (!zugText.includes('Sara P.') || !zugText.includes('Jonas W.')) throw new Error('Mia erfährt nicht, zu wem sie gehen soll');
  await shot(handy('Mia').p, '04a-handy-zugelost', true);
  // Jemanden verschieben: Namen anklicken, dann die andere Station
  const vorher = karten.slice();
  const grosse = vorher[0] >= vorher[1] ? 0 : 1;
  await T.click(`.stkarte[data-i="${grosse}"] .mchip`);
  await T.click(`.stkarte[data-i="${1 - grosse}"] h3`);
  await T.waitForFunction(([g, n]) => document.querySelectorAll(`.stkarte[data-i="${g}"] .mchip`).length === n, [grosse, vorher[grosse] - 1]);
  karten = await T.$$eval('.stkarte', els => els.map(e => e.querySelectorAll('.mchip').length));
  log('Nach dem Verschieben', karten.join(' + '));
  await T.click(`.stkarte[data-i="${1 - grosse}"] .mchip`);
  await T.click(`.stkarte[data-i="${grosse}"] h3`);
  await T.waitForFunction(([g, n]) => document.querySelectorAll(`.stkarte[data-i="${g}"] .mchip`).length === n, [grosse, vorher[grosse]]);
  await shot(T, '03-beamer-stationen');
  await phones[0].p.waitForSelector('.stationkarte');
  await shot(phones[0].p, '04-handy-station', true);

  // ---------------- Frühdienst
  await T.keyboard.press('Enter');
  await T.waitForSelector('.stbar');
  await phones[0].p.waitForSelector('.pult .ctl');
  await sleep(1500);
  await shot(phones[0].p, '05-handy-countdown');
  await phones[0].p.waitForFunction(() => document.querySelector('#countdown').hidden, null, { timeout: 10000 });
  await stationenLesen();
  const stationen = [...new Set(phones.map(p => p.station))];
  log('Stationen auf den Handys:', stationen.join(', '));
  if (stationen.length !== 2) throw new Error('Handys zeigen nicht zwei Stationen');
  // Station 1 spielt gut, Station 2 „mittel“ (verpasst manches, greift manchmal daneben)
  for (const ph of phones) ph.profil = ph.station === stationen[0] ? 'gut' : 'mittel';
  const anzahl = await phones[0].p.$$eval('.pult .ctl', els => els.length);
  if (anzahl !== 4) throw new Error('Frühdienst: 4 Elemente pro Handy erwartet, gefunden ' + anzahl);
  const art = await phones[0].p.$eval('#auftrag', e => e.className);
  if (!art.includes('befehl')) throw new Error('Frühdienst: nur Anweisungen erwartet');
  botsAn = true;
  let bots = phones.flatMap(ph => [bot(ph), ereignisBot(ph)]);
  await sleep(8000);
  await shot(phones[1].p, '06-handy-fruehdienst');
  await shot(T, '07-beamer-fruehdienst');
  // Nachzüglerin mitten in der Schicht: wählt ihre Station selbst
  const nz = await neuesHandy('Nele', 'N', code);
  await nz.p.waitForSelector('.stbtn', { timeout: 10000 });
  await T.waitForFunction(() => document.querySelector('#ohneHint').textContent.includes('Nele N.'));
  await shot(nz.p, '08a-handy-nachzuegler-waehlt');
  await nz.p.click('.stbtn[data-i="1"]');
  await nz.p.waitForSelector('.pult .ctl', { timeout: 10000 });
  await sleep(1500);
  await stationenLesen();
  nz.profil = nz.station === stationen[0] ? 'gut' : 'mittel';
  bots.push(bot(nz), ereignisBot(nz));
  log('Nachzügler Nele ist in', nz.station, 'mit', await nz.p.$$eval('.pult .ctl', els => els.length), 'Elementen');
  await T.waitForFunction(() => [...document.querySelectorAll('.stbar .mit')].some(e => e.textContent.includes('Nele N.')));
  await shot(nz.p, '08-handy-nachzuegler');
  // Neu laden mitten in der Schicht: Handy und Beamer machen dort weiter, wo sie waren
  const re = phones[2];
  const vorherPult = await re.p.$$eval('.pult .ctl', els => els.map(e => e.dataset.c).sort().join(','));
  await re.p.reload();
  await re.p.waitForSelector('.pult .ctl', { timeout: 10000 });
  const nachherPult = await re.p.$$eval('.pult .ctl', els => els.map(e => e.dataset.c).sort().join(','));
  if (vorherPult !== nachherPult) throw new Error('Nach dem Neuladen ein anderes Pult');
  await re.p.waitForFunction(() => document.querySelector('#auftrag').dataset.id, null, { timeout: 10000 });
  await T.reload();
  await T.waitForSelector('.stbar', { timeout: 10000 });
  log('Neu laden mitten in der Schicht: Handy und Beamer ✓');
  // Warten auf das Schichtende (1 Minute)
  await T.waitForSelector('.rtab', { timeout: 90000 });
  botsAn = false; await Promise.all(bots);
  log('Frühdienst vorbei', JSON.stringify(stats));
  if (stats.selbst) log('Hinweis: ' + stats.selbst + '× lag das Element auf dem eigenen Handy (mit Hinweis)');
  await sleep(600);
  await shot(T, '09-beamer-uebergabe');
  const zeilen = await T.$$eval('.rtab tbody tr', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  log('Übergabe:', zeilen.join(' | '));
  if (zeilen.length !== 2) throw new Error('Übergabe: zwei Stationen erwartet');
  const prozente = await T.$$eval('.rtab tbody tr td.hl', els => els.map(e => parseInt(e.textContent, 10)));
  if (!(prozente[0] > 0)) throw new Error('Beste Station hat keine Punkte');
  await phones[0].p.waitForSelector('.stationkarte .bigstat');
  await shot(phones[0].p, '10-handy-uebergabe', true);
  const fgSumme = await phones.find(p => p.profil === 'mittel').p.$eval('.stationkarte', e => e.textContent);
  log('Handy (mittel):', fgSumme.replace(/\s+/g, ' ').slice(0, 160));

  // ---------------- Spätdienst: Situationen kommen dazu
  stats.situationen = 0;
  await T.keyboard.press('Enter');
  await T.waitForSelector('.stbar');
  await phones[0].p.waitForFunction(() => document.querySelector('#countdown').hidden && document.querySelectorAll('.pult .ctl').length === 5, null, { timeout: 15000 });
  for (const ph of phones) ph.erledigt.clear();
  const traeumer = phones.find(p => p.profil === 'mittel');
  traeumer.profil = 'traeumt';
  botsAn = true; bots = phones.flatMap(ph => [bot(ph), ereignisBot(ph)]).concat(stoerWaechter());
  const evSpaet = ereignisPruefen(T, 'Spätdienst', '12b-ereignis-spaet');
  // Ein Situations-Bild mit Tipp aufnehmen
  let tippFoto = false;
  for (let i = 0; i < 60 && !tippFoto; i++) {
    for (const ph of phones) {
      const a = await lesen(ph.p);
      if (a && a.klasse.includes('situation') && a.tipp && !a.klasse.includes('wartet')) { await shot(ph.p, '11-handy-situation-tipp'); tippFoto = true; break; }
    }
    await sleep(500);
  }
  await shot(T, '12-beamer-spaetdienst');
  // Diesmal bis zum Ende der Schicht spielen
  await T.waitForSelector('.rtab', { timeout: 90000 });
  botsAn = false; await Promise.all(bots);
  log('Spätdienst:', JSON.stringify(stats));
  const es = await evSpaet;
  if (!/Hygiene|Stromausfall/.test(es.titel)) throw new Error('Spätdienst: Hygiene-Begehung oder Stromausfall erwartet');
  if (!es.chips.some(c => c.includes('✓'))) throw new Error('Kein Bonus beim Ereignis');
  if (es.chips.every(c => c.includes('✓'))) throw new Error('Die Station mit dem „Träumer“ hätte keinen Bonus bekommen dürfen');
  if (!stats.situationen) throw new Error('Im Spätdienst kamen keine Situationen');
  if (!tippFoto) throw new Error('Kein Tipp bei einer Situation gesehen');
  await sleep(500);
  await shot(T, '13-beamer-uebergabe-knifflig');
  const knifflig = await T.$$eval('.knifflig li', els => els.map(e => e.textContent.replace(/\s+/g, ' ').trim()));
  log('Knifflige Situationen am Beamer:', knifflig.length, knifflig[0] || '');
  if (!knifflig.length) throw new Error('Verpasste Situationen fehlen in „Das war knifflig“');
  const mittel = phones.find(p => p.profil === 'mittel');
  await mittel.p.waitForSelector('.stationkarte');
  await shot(mittel.p, '13b-handy-verpasst', true);

  // ---------------- Nachtdienst: Text verblasst
  await T.keyboard.press('Enter');
  await T.waitForSelector('.stbar');
  await phones[0].p.waitForFunction(() => document.querySelector('#countdown').hidden && document.querySelectorAll('.pult .ctl').length === 6, null, { timeout: 15000 });
  for (const ph of phones) ph.erledigt.clear();
  botsAn = true; bots = phones.flatMap(ph => [bot(ph), ereignisBot(ph)]).concat(stoerWaechter());
  const evNacht = ereignisPruefen(T, 'Nachtdienst', '14c-ereignis-rea');
  let blassFoto = false;
  for (let i = 0; i < 40 && !blassFoto; i++) {
    for (const ph of phones) {
      if (await ph.p.$('#aText.blass')) { await shot(ph.p, '14-handy-nacht-blass'); blassFoto = true; break; }
    }
    await sleep(500);
  }
  const en = await evNacht;
  if (!en.titel.includes('Rea-Alarm')) throw new Error('Nachtdienst: Rea-Alarm erwartet');
  botsAn = false; await Promise.all(bots);
  if (!blassFoto) throw new Error('Im Nachtdienst wurde keine Aufgabe blass');
  log('Störungen gesehen:', stats.stoerGesehen.size, '· weggewischt von Robotern:', stats.gewischt, '· beim Ereignis mitgemacht:', stats.ereignisse);
  if (!stats.stoerGesehen.size) throw new Error('Keine Störung auf einem Handy gesehen');
  log('Im Spiel bedient:', JSON.stringify(arten));
  // Häufige Arten müssen im (zufälligen) Spiel vorkommen. Drehregler und Takt gibt es nur ein- bis zweimal im Katalog:
  // Die prüft der Bauteil-Test unten jedes Mal gezielt, hier nur als Hinweis
  for (const a of ['knopf', 'halten', 'schalter', 'stufen', 'regler', 'auswahl', 'medikament']) if (!arten[a]) throw new Error('Im Spiel wurde nie bedient: ' + a);
  for (const a of ['dosis', 'takt']) if (!arten[a]) log(`Hinweis: „${a}“ kam in diesem Spiel zufällig nicht vor (der Bauteil-Test prüft es)`);
  const mia = phones.find(p => p.name === 'Mia');
  await shot(mia.p, '14b-handy-klein-nachtdienst');
  const passt = await mia.p.evaluate(() => [...document.querySelectorAll('.pult .ctl')].every(e => e.scrollHeight <= e.clientHeight + 2 && e.getBoundingClientRect().bottom <= innerHeight + 1));
  if (!passt) throw new Error('Kleines Handy: Das Pult passt nicht auf den Bildschirm');
  await T.click('#btnEnd');
  await T.waitForSelector('.winner', { timeout: 10000 });
  await sleep(1500);
  await shot(T, '15-beamer-siegerehrung');
  const sieger = await T.textContent('.winner h2');
  log('Siegerehrung:', sieger);
  if (!sieger.includes(stationen[0])) log('Hinweis: die „gute“ Station hat nicht gewonnen (Zufall)');
  await phones[0].p.waitForSelector('.rangliste li');
  await shot(phones[0].p, '16-handy-ende', true);

  // ---------------- Nochmal mit denselben Stationen
  await T.keyboard.press('Enter');
  await T.waitForSelector('.stbar');
  const z0 = await zahlen(T);
  if (!z0.every(z => z.pz === 0)) throw new Error('Nochmal: Punkte nicht zurückgesetzt');
  await T.click('#btnEnd');
  await T.waitForSelector('.rtab');

  // ---------------- Übungsseite
  const uctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await uctx.addInitScript(audioZaehler);
  const U = await uctx.newPage();
  U.on('pageerror', e => errors.push('Üben: ' + e.message));
  await U.goto(BASE + '/');
  await shot(U, '17-ueben-menue');
  await U.click('.seg[data-name="modus"] button[data-v="situationen"]');
  await U.click('#btnGo');
  await U.waitForFunction(() => document.querySelector('#countdown').hidden && !document.querySelector('#auftrag').className.includes('wartet'), null, { timeout: 10000 });
  let geloest = 0;
  for (let i = 0; i < 4; i++) {
    const a = await lesen(U);
    if (!a || a.klasse.includes('wartet')) { await sleep(300); i--; continue; }
    if (!a.klasse.includes('situation')) throw new Error('Üben „Situationen“: Anweisung statt Situation');
    let id = null, w = 0;
    for (const z of LOESUNG.get(a.text)) {
      if (!(await U.$(`.ctl[data-c="${z[0]}"]`)) || (await U.$(`.ctl[data-c="${z[0]}"] button[data-w="${z[1]}"][aria-checked="true"]`)) || (await U.$(`.ctl[data-c="${z[0]}"].auswahl[data-z="${z[1]}"]`))) continue;
      [id, w] = z; break;
    }
    if (!id) throw new Error('Üben: kein passendes Element für „' + a.text + '“');
    if (i === 1) await shot(U, '18-ueben-spiel');
    await bedienenJetzt(U, id, w);
    geloest++;
    await U.waitForFunction(old => document.querySelector('#auftrag').dataset.id !== old, a.id, { timeout: 5000 });
  }
  const punkte = await U.textContent('#sProzent');
  log('Üben:', geloest, 'gelöst,', punkte);
  if (!punkte.startsWith('8')) throw new Error('Üben: 8 Punkte erwartet, angezeigt: ' + punkte);

  // ---------------- Bauteil-Test: jede Eingabeart einzeln, mit echtem Ziehen, Drehen, Halten und Takt
  const bctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const BT = await bctx.newPage();
  BT.on('pageerror', e => errors.push('Bauteile: ' + e.message));
  await BT.goto(BASE + '/');
  await BT.evaluate(async () => {
    const { erstellePult } = await import('/js/pult.js');
    const { inhalte } = await import('/js/regeln.js');
    const I = inhalte();
    document.body.className = 'handy spielt';
    document.body.innerHTML = `<main class="app"><section class="spielfeld" id="spielfeld"><div class="sleiste" style="height:34px"></div>
      <div class="auftrag"><div class="aart">Anweisung</div><p class="atext">Bauteil-Test</p></div><div id="pult" class="pult"></div></section></main>`;
    window.__tun = [];
    const pult = ['kopfteil', 'beratung', 'haende', 'insulin', 'hdm', 'bettgitter'].map(id => I.byId.get(id));
    window.__pult = erstellePult(document.getElementById('pult'), { pult, zustand: { kopfteil: 0, bettgitter: 0, beratung: 2 }, onTun: (id, w) => window.__tun.push(id + ':' + w) });
  });
  const tun = () => BT.evaluate(() => window.__tun.slice());
  const mitte = async sel => { const b = await BT.locator(sel).boundingBox(); return [b.x + b.width / 2, b.y + b.height / 2, b]; };
  // Alles passt auf ein kleines Handy (360 × 640)
  const passtB = await BT.evaluate(() => [...document.querySelectorAll('.pult .ctl')].every(e => e.scrollHeight <= e.clientHeight + 2 && e.getBoundingClientRect().bottom <= innerHeight + 1));
  if (!passtB) throw new Error('Bauteile passen nicht auf ein kleines Handy');
  // Schieberegler: von 0° bis 60° ziehen (6 Stufen), dann 15° antippen
  {
    const [, , b] = await mitte('.ctl[data-c="kopfteil"] .schiene');
    const y = b.y + b.height / 2, x = i => b.x + (i + 0.5) / 6 * b.width;
    await BT.mouse.move(x(0), y); await BT.mouse.down();
    for (let i = 1; i <= 4; i++) { await BT.mouse.move(x(i), y, { steps: 4 }); }
    await BT.mouse.up();
    if ((await tun()).at(-1) !== 'kopfteil:4') throw new Error('Schieberegler ziehen: ' + (await tun()).join());
    if ((await BT.textContent('.ctl[data-c="kopfteil"] .wert')) !== '60°') throw new Error('Schieberegler zeigt nicht 60°');
    if ((await tun()).filter(x => x.startsWith('kopfteil')).length !== 1) throw new Error('Beim Ziehen zählt nur die Endstellung');
    await BT.click('.ctl[data-c="kopfteil"] .marken button[data-w="1"]');
    if ((await tun()).at(-1) !== 'kopfteil:1') throw new Error('Schieberegler antippen');
  }
  // Drehregler: auf 8 IE drehen (Stufe 3 von 6), mit ‹ › nachstellen, dann spritzen
  {
    const [cx, cy, b] = await mitte('.ctl[data-c="insulin"] .dreh');
    const r = b.width / 2 - 6, punkt = grad => [cx + r * Math.sin(grad * Math.PI / 180), cy - r * Math.cos(grad * Math.PI / 180)];
    await BT.mouse.move(...punkt(-135)); await BT.mouse.down();
    for (const g of [-90, -30, 30, 90, 135, 60, 27]) await BT.mouse.move(...punkt(g), { steps: 3 });
    await BT.mouse.up();
    if ((await BT.textContent('.ctl[data-c="insulin"] .dwert')) !== '8 IE') throw new Error('Drehregler drehen: ' + await BT.textContent('.ctl[data-c="insulin"] .dwert'));
    if ((await tun()).some(x => x.startsWith('insulin'))) throw new Error('Drehen allein darf nichts auslösen');
    await BT.click('.ctl[data-c="insulin"] .dpfeil[data-d="1"]');
    await BT.click('.ctl[data-c="insulin"] .dpfeil[data-d="-1"]');
    await BT.click('.ctl[data-c="insulin"] .dpfeil[data-d="-1"]');
    await shot(BT, '19-bauteile');
    await BT.click('.ctl[data-c="insulin"] .los');
    if ((await tun()).at(-1) !== 'insulin:2') throw new Error('Spritzen mit 6 IE: ' + (await tun()).join());
  }
  // Halten: zu kurz zählt nicht, 3 Sekunden schon
  {
    const [x, y] = await mitte('.ctl[data-c="haende"]');
    await BT.mouse.move(x, y); await BT.mouse.down(); await sleep(1000); await BT.mouse.up();
    if ((await tun()).some(t => t.startsWith('haende'))) throw new Error('Halten: 1 Sekunde darf nicht zählen');
    if (!(await BT.textContent('.ctl[data-c="haende"] .hz')).includes('Länger halten')) throw new Error('Halten: Hinweis „Länger halten“ fehlt');
    await BT.mouse.down(); await sleep(1500);
    await shot(BT, '20-bauteile-halten');
    await sleep(1800); await BT.mouse.up();
    if ((await tun()).at(-1) !== 'haende:0') throw new Error('Halten: 3 Sekunden müssen zählen');
  }
  // Takt: viel zu schnell zählt nicht, im Takt (110/min) schon
  {
    for (let i = 0; i < 10; i++) { await BT.click('.ctl[data-c="hdm"]'); await sleep(150); }
    if ((await tun()).some(t => t.startsWith('hdm'))) throw new Error('Takt: viel zu schnell darf nicht zählen');
    if (!(await BT.textContent('.ctl[data-c="hdm"] .hz')).includes('Zu schnell')) throw new Error('Takt: Hinweis „Zu schnell“ fehlt');
    await sleep(2000);
    for (let i = 0; i < 10; i++) { const t0 = Date.now(); await BT.click('.ctl[data-c="hdm"]'); await sleep(Math.max(0, 545 - (Date.now() - t0))); }
    if ((await tun()).at(-1) !== 'hdm:0') throw new Error('Takt: 110 pro Minute muss zählen');
    log('Bauteile: ' + (await BT.textContent('.ctl[data-c="hdm"] .hz')));
  }
  // Ausklapp-Liste (Patientenedukation): Zurück und gleiches Thema lösen nichts aus, ein anderes Thema schon
  {
    const B = '.ctl[data-c="beratung"]';
    if ((await BT.textContent(`${B} .awert`)) !== 'Diabetes') throw new Error('Auswahl zeigt nicht das aktuelle Thema');
    await BT.click(`${B} .ausw`);
    await BT.waitForSelector('.blatt[data-c="beratung"]');
    if ((await BT.$$('.blatt .liste button')).length !== 6) throw new Error('Liste: 6 Themen erwartet');
    if ((await BT.textContent('.blatt .liste button.jetzt')) !== 'Diabetes') throw new Error('Liste: aktuelles Thema nicht markiert');
    await sleep(400);
    await shot(BT, '22-bauteile-auswahl');
    const vorher = (await tun()).length;
    await BT.click('.blatt .zurueck');
    if (await BT.$('.blatt')) throw new Error('„Zurück“ schließt die Liste nicht');
    await BT.click(`${B} .ausw`); await BT.click('.blatt .liste button[data-w="2"]');
    if ((await tun()).length !== vorher) throw new Error('Gleiches Thema oder „Zurück“ darf nichts auslösen');
    await BT.click(`${B} .ausw`); await BT.click('.blatt .liste button[data-w="0"]');
    if ((await tun()).at(-1) !== 'beratung:0') throw new Error('Auswahl „Ernährung“: ' + (await tun()).join());
    if ((await BT.textContent(`${B} .awert`)) !== 'Ernährung') throw new Error('Auswahl zeigt das neue Thema nicht');
  }
  // Störungen: Kaffee blockiert die Ausklapp-Liste bis zum Wegwischen, Post-its blockieren das Bettgitter bis zum Wegtippen
  {
    await BT.evaluate(() => { window.__pult.stoeren('kaffee', ['beratung']); window.__pult.stoeren('postit', ['bettgitter', 'kopfteil']); window.__pult.stoeren('kruemel', ['insulin']); });
    await sleep(300);
    await shot(BT, '21-bauteile-stoerungen');
    const passtS = await BT.evaluate(() => [...document.querySelectorAll('#pult .ctl')].every(e => e.scrollHeight <= e.clientHeight + 2));
    if (!passtS) throw new Error('Störungen ragen über den Rand der Elemente');
    await wischen(BT, '.ctl[data-c="kopfteil"]');
    await wischen(BT, '.ctl[data-c="insulin"]');
    const vorher = (await tun()).length;
    await BT.click('.ctl[data-c="beratung"] .ausw', { force: true });
    if (await BT.$('.blatt')) throw new Error('Unter dem Kaffee ließ sich die Liste öffnen');
    await BT.click('.ctl[data-c="bettgitter"] button[data-w="1"]', { force: true });
    if ((await tun()).length !== vorher) throw new Error('Störung: Darunter darf nichts auslösen');
    await wischen(BT, '.ctl[data-c="beratung"]');
    await wischen(BT, '.ctl[data-c="bettgitter"]');
    await sleep(350);
    if (await BT.$('.stoer')) throw new Error('Störung ließ sich nicht wegmachen');
    await BT.click('.ctl[data-c="beratung"] .ausw'); await BT.click('.blatt .liste button[data-w="3"]');
    await BT.click('.ctl[data-c="bettgitter"] button[data-w="1"]');
    if ((await tun()).slice(-2).join() !== 'beratung:3,bettgitter:1') throw new Error('Nach dem Wegmachen: ' + (await tun()).join());
  }
  // Schmerzskalen: alles passt aufs kleine Handy, NRS auf 7 ziehen, Gesicht 8 antippen, VRS „unaushaltbar“ wählen
  {
    await BT.evaluate(async () => {
      const { erstellePult } = await import('/js/pult.js');
      const { inhalte } = await import('/js/regeln.js');
      const I = inhalte();
      window.__tun = [];
      // Ungünstigster Fall: längste Situation mit Tipp, zwei breite Elemente, Ausklapp-Zeilen und ein langer Schalter-Name
      const lang = I.situationen.map(x => x.text).sort((a, b) => b.length - a.length)[0];
      const box = document.querySelector('.auftrag');
      box.className = 'auftrag situation sehrlang';
      box.innerHTML = `<div class="aart">Situation <small>Was ist zu tun? Ruf es laut!</small></div><p class="atext">${lang}</p><p class="atipp">💡 Tipp: <b>Beratung: Medikamente</b></p><div class="zeitbalken"><i></i></div>`;
      const pult = ['nrs', 'information', 'vrs', 'smiley', 'hdm', 'matratze'].map(id => I.byId.get(id));
      window.__pult = erstellePult(document.getElementById('pult'), { pult, zustand: { nrs: 0, vrs: 0, smiley: 0, information: 0, matratze: 0 }, onTun: (id, w) => window.__tun.push(id + ':' + w) });
    });
    const passtSchmerz = await BT.evaluate(() => [...document.querySelectorAll('#pult .ctl')].every(e => e.scrollHeight <= e.clientHeight + 2 && e.getBoundingClientRect().bottom <= innerHeight + 1));
    if (!passtSchmerz) throw new Error('Schmerzskalen passen nicht auf ein kleines Handy');
    const [, , b] = await mitte('.ctl[data-c="nrs"] .schiene');
    const y = b.y + b.height / 2, x = i => b.x + (i + 0.5) / 11 * b.width;
    await BT.mouse.move(x(0), y); await BT.mouse.down();
    for (let i = 1; i <= 7; i++) await BT.mouse.move(x(i), y, { steps: 3 });
    await BT.mouse.up();
    await BT.click('.ctl[data-c="smiley"] button[data-w="4"]');
    await BT.click('.ctl[data-c="vrs"] .ausw'); await BT.click('.blatt .liste button[data-w="5"]');
    await sleep(300);
    await shot(BT, '23-bauteile-schmerzskalen');
    if ((await tun()).join() !== 'nrs:7,smiley:4,vrs:5') throw new Error('Schmerzskalen: ' + (await tun()).join());
    if ((await BT.textContent('.ctl[data-c="nrs"] .wert')) !== '7') throw new Error('NRS zeigt nicht 7');
  }
  // Medikamente: Blatt mit Wirkstoff, Dosis und Zeitpunkt. „Geben“ erst, wenn alles gewählt ist.
  // Eine Kombination, die es nicht gibt (Metformin zur Nacht), geht als Fehlgriff an den Server.
  {
    await BT.evaluate(async () => {
      const { erstellePult } = await import('/js/pult.js');
      const { inhalte } = await import('/js/regeln.js');
      const I = inhalte();
      window.__tun = [];
      const box = document.querySelector('.auftrag');
      // Ungünstigster Fall: die längste Situation mit Tipp (wenig Platz für das Blatt)
      const lang = I.situationen.map(x => x.text).sort((a, b) => b.length - a.length)[0];
      box.className = 'auftrag situation sehrlang';
      box.innerHTML = `<div class="aart">Situation <small>Was ist zu tun? Ruf es laut!</small></div><p class="atext">${lang}</p><p class="atipp">💡 Tipp: <b>Nicht-Opioide: Paracetamol 1000 mg zur Nacht</b></p><div class="zeitbalken"><i></i></div>`;
      const sicht = c => ({ id: c.id, art: c.art, name: c.name, stufen: c.stufen, thema: c.thema, hinweis: c.hinweis, zeiten: c.zeiten, wirkstoffe: c.wirkstoffe && c.wirkstoffe.map(w => ({ name: w.name, dosen: w.dosen })) });
      const pult = ['med-antidiabetika', 'med-parkinson', 'puls', 'kopfteil', 'smiley', 'bettgitter'].map(id => sicht(I.byId.get(id)));
      window.__pult = erstellePult(document.getElementById('pult'), { pult, zustand: { kopfteil: 0, smiley: 0, bettgitter: 0 }, onTun: (id, w) => window.__tun.push(id + ':' + w) });
    });
    const passtM = await BT.evaluate(() => [...document.querySelectorAll('#pult .ctl')].every(e => e.scrollHeight <= e.clientHeight + 2 && e.getBoundingClientRect().bottom <= innerHeight + 1));
    if (!passtM) throw new Error('Medikamente passen nicht auf ein kleines Handy');
    const M = '.ctl[data-c="med-antidiabetika"]', MB = '.mblatt[data-c="med-antidiabetika"]';
    const ad = I.byId.get('med-antidiabetika');
    await BT.click(`${M} .mgeben`);
    await BT.waitForSelector(MB);
    if (!(await BT.$(`${MB} .geben:disabled`))) throw new Error('„Geben“ muss gesperrt sein, bis alles gewählt ist');
    if ((await BT.$$(`${MB} [data-r="w"] button`)).length !== 3 || (await BT.$$(`${MB} [data-r="z"] button`)).length !== 4) throw new Error('Blatt: 3 Wirkstoffe und 4 Zeitpunkte erwartet');
    await BT.click(`${MB} [data-r="w"] button:has-text("Metformin")`);
    if ((await BT.$$(`${MB} [data-r="d"] button`)).length !== 3) throw new Error('Metformin: 3 Dosen erwartet');
    await BT.click(`${MB} [data-r="d"] button:has-text("500 mg")`);
    await BT.click(`${MB} [data-r="z"] button:has-text("zur Nacht")`);
    await sleep(300);
    const blattPasst = await BT.evaluate(sel => { const b = document.querySelector(sel); const g = b.querySelector('.geben').getBoundingClientRect(); return g.bottom <= b.getBoundingClientRect().bottom + 1 && g.bottom <= innerHeight + 1 && [...b.querySelectorAll('button')].every(x => x.scrollWidth <= x.clientWidth + 2); }, MB);
    if (!blattPasst) throw new Error('Medikamenten-Blatt passt nicht auf ein kleines Handy');
    await shot(BT, '24-bauteile-medikamente');
    await BT.click(`${MB} .geben`);
    if (await BT.$(MB)) throw new Error('Nach „Geben“ muss das Blatt zu sein');
    await BT.click(`${M} .mgeben`); await BT.click(`${MB} .zurueck`);
    await BT.click(`${M} .mgeben`);
    await BT.click(`${MB} [data-r="w"] button:has-text("Metformin")`);
    await BT.click(`${MB} [data-r="d"] button:has-text("500 mg")`);
    await BT.click(`${MB} [data-r="z"] button:has-text("morgens")`);
    await BT.click(`${MB} .geben`);
    const erwartet = `med-antidiabetika:${ad.stufen.length},med-antidiabetika:${ad.stufen.indexOf('Metformin 500 mg morgens')}`;
    if ((await tun()).join() !== erwartet) throw new Error(`Medikamente: ${(await tun()).join()} statt ${erwartet}`);
    // Lange Wirkstoffnamen passen auch
    await BT.click('.ctl[data-c="med-parkinson"] .mgeben');
    await BT.click('.mblatt [data-r="w"] button:has-text("Levodopa")');
    const lang = await BT.evaluate(() => [...document.querySelectorAll('.mblatt button')].every(x => x.scrollWidth <= x.clientWidth + 2 && x.getBoundingClientRect().bottom <= innerHeight + 1));
    if (!lang) throw new Error('Langer Wirkstoffname passt nicht');
    await shot(BT, '25-bauteile-medikamente-lang');
    await BT.click('.mblatt .zurueck');
  }
  log('Bauteil-Test: Schieberegler, Drehregler, Halten, Takt, Ausklapp-Liste, Störungen, Schmerzskalen, Medikamente ✓');

  // ---------------- Ton nur am Beamer
  for (const ph of phones) if (await ph.p.evaluate(() => window.__audio)) throw new Error(ph.name + ': Handy hat Ton gestartet');
  if (await U.evaluate(() => window.__audio)) throw new Error('Übungsseite hat Ton gestartet');
  if (!(await T.evaluate(() => window.__audio))) throw new Error('Beamer hat keinen Ton vorbereitet');
  log('Handys und Übungsseite stumm, Ton nur am Beamer ✓');
  if (errors.length) throw new Error('Fehler:\n' + errors.join('\n'));
  ok = true;
  log('ALLES OK');
} catch (e) {
  console.error('FEHLER:', e.message);
  if (errors.length) console.error(errors.join('\n'));
} finally {
  botsAn = false;
  await browser.close();
  if (srv) srv.kill();
  process.exit(ok ? 0 : 1);
}
