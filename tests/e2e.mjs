// Browser-Durchlauf: Beamer + 7 Handys (+ 1 Nachzügler) durch Stationen, Früh-, Spät- und Nachtdienst, Siegerehrung und Übungsseite.
// Start:  node tests/e2e.mjs      (startet den lokalen Server selbst; Bildschirmfotos in tests/ergebnisse/)
// Mit Adresse (z. B. node tests/e2e.mjs http://127.0.0.1:8787 bei laufendem „npx wrangler dev“) wird kein eigener Server gestartet.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inhalte } from '../public/js/regeln.js';

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
for (const c of I.katalog) c.befehle.forEach((b, w) => LOESUNG.set(b, [[c.id, w]]));
for (const s of I.situationen) LOESUNG.set(s.text, s.ziele);

const errors = [];
const browser = await chromium.launch();
let ok = false;
const phones = [];
const stats = { treffer: 0, fehlgriffe: 0, ignoriert: 0, situationen: 0, selbst: 0 };
const arten = {}; // wie oft jede Art im Spiel bedient wurde
let botsAn = false;

async function neuesHandy(name, ini, code, klein) {
  const ctx = await browser.newContext({ viewport: klein ? { width: 360, height: 640 } : { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await ctx.addInitScript(audioZaehler);
  const p = await ctx.newPage();
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
          if (await t.p.$(`${sel} button[data-w="${w}"][aria-checked="true"]`)) continue; // steht schon so
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
// Ein Element bedienen, je nach Art: tippen, halten, im Takt tippen, Dosis einstellen und auslösen, Stufe antippen.
// Pro Handy immer nur eine Bedienung gleichzeitig (wie bei einer echten Hand).
function bedienen(t, id, w) {
  t.sperre = (t.sperre || Promise.resolve()).then(() => bedienenJetzt(t.p, id, w)).catch(() => {});
  return t.sperre;
}
async function bedienenJetzt(p, id, w) {
  const sel = `.ctl[data-c="${id}"]`;
  const info = await p.$eval(sel, e => ({ art: e.classList[1], ms: Number(e.dataset.ms), anzahl: Number(e.dataset.anzahl), schlag: Number(e.dataset.schlag), v: Number(e.dataset.v) }));
  arten[info.art] = (arten[info.art] || 0) + 1;
  if (info.art === 'knopf') return p.click(sel);
  if (info.art === 'halten') {
    const b = await p.locator(sel).boundingBox();
    await p.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await p.mouse.down(); await sleep(info.ms + 300); await p.mouse.up();
    return;
  }
  if (info.art === 'takt') {
    for (let i = 0; i < info.anzahl; i++) { const t0 = Date.now(); await p.click(sel); await sleep(Math.max(0, info.schlag - (Date.now() - t0))); }
    return;
  }
  if (info.art === 'dosis') {
    let v = info.v || 0;
    while (v !== w) { const d = w > v ? 1 : -1; await p.click(`${sel} .dpfeil[data-d="${d}"]`); v += d; }
    return p.click(`${sel} .los`);
  }
  return p.click(`${sel} button[data-w="${w}"]`); // Schalter, Stufen, Schieberegler (Markierung antippen)
}
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
  let bots = phones.map(bot);
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
  bots.push(bot(nz));
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
  botsAn = true; bots = phones.map(bot);
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
  botsAn = true; bots = phones.map(bot);
  let blassFoto = false;
  for (let i = 0; i < 40 && !blassFoto; i++) {
    for (const ph of phones) {
      if (await ph.p.$('#aText.blass')) { await shot(ph.p, '14-handy-nacht-blass'); blassFoto = true; break; }
    }
    await sleep(500);
  }
  await sleep(3000);
  botsAn = false; await Promise.all(bots);
  if (!blassFoto) throw new Error('Im Nachtdienst wurde keine Aufgabe blass');
  log('Im Spiel bedient:', JSON.stringify(arten));
  for (const a of ['knopf', 'halten', 'schalter', 'stufen', 'regler', 'dosis']) if (!arten[a]) throw new Error('Im Spiel wurde nie bedient: ' + a);
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
      if (!(await U.$(`.ctl[data-c="${z[0]}"]`)) || (await U.$(`.ctl[data-c="${z[0]}"] button[data-w="${z[1]}"][aria-checked="true"]`))) continue;
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
    const pult = ['kopfteil', 'puls', 'haende', 'insulin', 'hdm', 'bettgitter'].map(id => I.byId.get(id));
    erstellePult(document.getElementById('pult'), { pult, zustand: { kopfteil: 0, bettgitter: 0 }, onTun: (id, w) => window.__tun.push(id + ':' + w) });
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
  log('Bauteil-Test: Schieberegler, Drehregler, Halten, Takt ✓');

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
