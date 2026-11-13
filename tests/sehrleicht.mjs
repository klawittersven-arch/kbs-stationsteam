// Browser-Test „Sehr leicht“: Voreinstellungen, Kennenlernen auf den Handys, dann Anweisungen nacheinander (Frühdienst)
// und höchstens zwei gleichzeitig (Spätdienst). Beamer + 3 Handys (eines klein).
// Start:  node tests/sehrleicht.mjs      (startet den lokalen Server selbst; Bildschirmfotos in tests/ergebnisse/)
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inhalte } from '../public/js/regeln.js';
import { bedienenJetzt, sleep } from './bedienen.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests', 'ergebnisse');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8792, BASE = process.argv[2] || `http://127.0.0.1:${PORT}`;
let srv = null;
if (!process.argv[2]) {
  srv = spawn(process.execPath, [path.join(ROOT, 'server', 'local.mjs')], { env: { ...process.env, PORT: String(PORT) }, stdio: 'pipe' });
  srv.stderr.on('data', d => process.stderr.write(d));
  await new Promise(r => srv.stdout.once('data', r));
}
const log = (...a) => console.log(new Date().toISOString().slice(14, 23), ...a);
const shot = (p, name) => p.screenshot({ path: path.join(OUT, name + '.png') });
const I = inhalte();
const LOESUNG = new Map();
for (const c of I.katalog) for (const liste of [c.befehle, c.befehle2 || [], c.ohneKategorie || []]) liste.forEach((b, w) => LOESUNG.set(b, [[c.id, w]]));

const errors = [];
const browser = await chromium.launch();
let ok = false, spielen = false;
const phones = [];
const lesen = p => p.evaluate(() => {
  const sf = document.querySelector('#spielfeld');
  if (!sf || sf.hidden) return null;
  const box = document.querySelector('#auftrag');
  return { id: box.dataset.id || '', klasse: box.className, text: document.querySelector('#aText').textContent };
}).catch(() => null);
// Spiel-Roboter: erledigt Aufgaben, sobald sie sichtbar sind (auf dem Handy, das das Element hat)
async function roboter() {
  const erledigt = new Set();
  while (spielen) {
    for (const ph of phones) {
      const a = await lesen(ph.p);
      if (!a || !a.id || /leer|wartet|kennen/.test(a.klasse) || erledigt.has(a.id)) continue;
      erledigt.add(a.id);
      const ziele = LOESUNG.get(a.text);
      if (!ziele) { errors.push('Unbekannte Aufgabe: ' + a.text); continue; }
      const [id, w] = ziele[0];
      // Neue Schicht, neues Pult: Elemente neu einlesen
      for (const x of phones) x.ids = await x.p.$$eval('.pult .ctl', els => els.map(e => e.dataset.c)).catch(() => x.ids);
      const t = phones.find(x => x !== ph && x.ids.includes(id)) || phones.find(x => x.ids.includes(id));
      if (!t) { errors.push('Kein Handy hat das Element für: ' + a.text); continue; }
      await sleep(900);
      await bedienenJetzt(t.p, id, w).catch(() => {});
    }
    await sleep(200);
  }
}
// Kennenlernen auf einem Handy durchspielen (markierten Knopf so bedienen, wie es oben steht)
async function kennenDurchspielen(ph) {
  for (let i = 0; i < 5 && await ph.p.$('#auftrag.kennen:not(.fertig)'); i++) {
    const m = (await ph.p.textContent('#aText')).match(/„(.+)“/);
    const ziele = m && LOESUNG.get(m[1]);
    if (!ziele) throw new Error(ph.name + ': Kennenlernen ohne passende Anweisung');
    const [id, w] = ziele[0];
    if ((await ph.p.$eval('.ctl.zeigen', e => e.dataset.c)) !== id) throw new Error(ph.name + ': falscher Knopf markiert');
    await bedienenJetzt(ph.p, id, w);
    await sleep(300);
  }
}
// Wie viele Handys haben gerade eine Aufgabe (auch angekündigt)?
const aktive = async () => (await Promise.all(phones.map(ph => lesen(ph.p)))).filter(a => a && a.id && !/leer|kennen/.test(a.klasse)).length;

try {
  // ---------------- Beamer: Voreinstellungen prüfen, „Sehr leicht“ wählen
  const T = await (await browser.newContext({ viewport: { width: 1600, height: 900 } })).newPage();
  T.on('pageerror', e => errors.push('Beamer: ' + e.message));
  T.on('dialog', d => d.accept());
  await T.goto(BASE + '/lehrer');
  await T.waitForSelector('#qr');
  const code = (await T.textContent('#codeChip')).replace('Code ', '').trim();
  const gewaehlt = lbl => T.$eval(`.seg[aria-label="${lbl}"] button[aria-checked="true"]`, e => e.textContent.trim());
  const vor = [await gewaehlt('Anweisungen'), await gewaehlt('Störungen'), await gewaehlt('Schwierigkeit')];
  if (vor.join() !== 'Nur Anweisungen,Aus,Ultra leicht') throw new Error('Voreinstellungen: ' + vor.join());
  log('Voreinstellungen: Nur Anweisungen, Störungen aus, Ultra leicht ✓');
  const stufen = await T.$$eval('.seg[aria-label="Schwierigkeit"] button', els => els.map(e => e.textContent.trim()));
  if (stufen.join() !== 'Ultra leicht,Sehr leicht,Leicht,Mittel,Schwer') throw new Error('Schwierigkeiten am Beamer: ' + stufen.join());
  await T.click('.seg[aria-label="Schwierigkeit"] button:has-text("Sehr leicht")');
  await T.click('.seg[aria-label="Einteilung der Stationen"] button:has-text("Zufällig")');
  await T.click('.seg[aria-label="Dauer einer Schicht"] button:has-text("1 Min.")');

  // ---------------- Drei Handys
  for (const [n, i, klein] of [['Lena', 'K', false], ['Tom', 'B', true], ['Aylin', 'S', false]]) {
    const ctx = await browser.newContext({ viewport: klein ? { width: 360, height: 640 } : { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(n + ': ' + e.message));
    await p.goto(`${BASE}/mitspielen?c=${code}`);
    await p.fill('#fFirst', n); await p.fill('#fInit', i);
    await p.click('button[type=submit]');
    phones.push({ p, name: n, ids: [] });
  }
  await T.waitForFunction(() => document.querySelectorAll('.name').length === 3);
  await T.keyboard.press('Enter'); // Stationen auslosen
  await T.waitForSelector('#tHint');
  await phones[0].p.waitForSelector('.stationkarte');
  if (!(await phones[0].p.textContent('.stationkarte')).includes('Schwierigkeit: Sehr leicht')) throw new Error('Handy nennt die Schwierigkeit nicht');
  await T.keyboard.press('Enter'); // Frühdienst starten → Kennenlernen

  // ---------------- Kennenlernen
  await T.waitForSelector('#kennbox:not([hidden])');
  if (await T.$('#bigcount')) throw new Error('Beamer zeigt den Countdown schon während des Kennenlernens');
  const kopf = await T.textContent('.shead p');
  if (!kopf.includes('eine Anweisung nach der anderen') || !kopf.includes('3 Elemente')) throw new Error('Beamer-Hinweis: ' + kopf);
  for (const ph of phones) {
    await ph.p.waitForSelector('#auftrag.kennen');
    ph.ids = await ph.p.$$eval('.pult .ctl', els => els.map(e => e.dataset.c));
    if (ph.ids.length !== 3) throw new Error(ph.name + ': 3 Elemente erwartet');
    const listen = await ph.p.$$eval('.pult .ctl.auswahl, .pult .ctl.medikament, .pult .ctl.prophylaxe', els => els.length);
    if (listen > 1) throw new Error(ph.name + ': höchstens ein Element mit Liste erwartet, gefunden ' + listen);
  }
  await sleep(400);
  await shot(phones[1].p, '31-sehrleicht-kennenlernen');
  // Falscher Knopf zählt nicht
  {
    const ph = phones[0];
    const markiert = await ph.p.$eval('.ctl.zeigen', e => e.dataset.c);
    const anderer = ph.ids.find(id => id !== markiert && I.byId.get(id).art === 'knopf');
    if (anderer) {
      await bedienenJetzt(ph.p, anderer, 0);
      await ph.p.waitForSelector('#blase.bad');
      if ((await ph.p.$eval('.ctl.zeigen', e => e.dataset.c)) !== markiert) throw new Error('Falscher Knopf hat weitergeschaltet');
    }
  }
  // Alle Schritte ausführen
  for (const ph of phones) {
    for (let i = 0; i < 3; i++) {
      const text = await ph.p.textContent('#aText');
      const m = text.match(/„(.+)“/);
      const ziele = m && LOESUNG.get(m[1]);
      if (!ziele) throw new Error(ph.name + ': Kennenlernen ohne passende Anweisung: ' + text);
      const [id, w] = ziele[0];
      if ((await ph.p.$eval('.ctl.zeigen', e => e.dataset.c)) !== id) throw new Error(ph.name + ': falscher Knopf markiert');
      await bedienenJetzt(ph.p, id, w);
      await sleep(300);
      if (process.env.DEBUG) console.log(ph.name, i, id, w, I.byId.get(id).art, await ph.p.$eval('#aText', e => e.textContent));
    }
    // fertig: „Warte auf die anderen“ (beim letzten Handy geht es sofort los)
    await ph.p.waitForFunction(() => !document.querySelector('#auftrag.kennen') || document.querySelector('#auftrag.kennen.fertig'));
    if (ph === phones[1]) {
      await sleep(300);
      await shot(ph.p, '33-sehrleicht-kennenlernen-fertig');
      const stand = await T.$$eval('#kennbox .evchip', els => els.map(e => e.textContent));
      if (!stand.join().includes('2/3')) throw new Error('Beamer zeigt den Stand nicht: ' + stand.join());
      await shot(T, '32-sehrleicht-beamer-kennenlernen');
    }
  }
  log('Kennenlernen: alle 3 Handys fertig ✓');
  await T.waitForSelector('#kennbox', { state: 'hidden', timeout: 5000 });
  await phones[0].p.waitForFunction(() => document.querySelector('#countdown').hidden === false, null, { timeout: 5000 });
  await phones[0].p.waitForFunction(() => document.querySelector('#countdown').hidden, null, { timeout: 10000 });
  log('Countdown nach dem Kennenlernen ✓');

  // ---------------- Frühdienst: eine Anweisung nach der anderen
  spielen = true;
  const r = roboter();
  const halter = new Set();
  let maxAktiv = 0;
  for (let i = 0; i < 60; i++) {
    maxAktiv = Math.max(maxAktiv, await aktive());
    for (const ph of phones) { const a = await lesen(ph.p); if (a && a.id && !/leer/.test(a.klasse)) halter.add(ph.name); }
    if (i === 20) await shot(phones[1].p, '34-sehrleicht-fruehdienst');
    await sleep(500);
  }
  spielen = false; await r;
  log('Frühdienst: höchstens', maxAktiv, 'Aufgabe(n) gleichzeitig, dran waren:', [...halter].join(', '));
  if (maxAktiv !== 1) throw new Error('Frühdienst „Sehr leicht“: nur eine Anweisung gleichzeitig erwartet, gesehen ' + maxAktiv);
  if (halter.size < 3) throw new Error('Nicht alle kamen dran: ' + [...halter]);
  await T.click('#btnEnd');
  await T.waitForSelector('.rtab');

  // ---------------- Spätdienst: vorher die neuen Knöpfe ausprobieren, dann weiter eine Anweisung nach der anderen
  await T.keyboard.press('Enter');
  await T.waitForSelector('#kennbox:not([hidden])');
  if (!(await T.textContent('#kennbox .evtitel b')).includes('Neue Knöpfe')) throw new Error('Beamer: „Neue Knöpfe“ fehlt');
  await sleep(800);
  for (const ph of phones) ph.ids = await ph.p.$$eval('.pult .ctl', els => els.map(e => e.dataset.c));
  await shot(phones[0].p, '35-sehrleicht-neue-knoepfe');
  for (const ph of phones) await kennenDurchspielen(ph);
  await T.waitForSelector('#kennbox', { state: 'hidden', timeout: 5000 });
  log('Neue Knöpfe vor dem Spätdienst ausprobiert ✓');
  await phones[0].p.waitForFunction(() => document.querySelector('#countdown').hidden && document.querySelectorAll('.pult .ctl').length === 3, null, { timeout: 15000 });
  spielen = true;
  const r2 = roboter();
  let maxSpaet = 0;
  for (let i = 0; i < 30; i++) { maxSpaet = Math.max(maxSpaet, await aktive()); await sleep(500); }
  spielen = false; await r2;
  log('Spätdienst: höchstens', maxSpaet, 'Aufgabe(n) gleichzeitig');
  if (maxSpaet !== 1) throw new Error('Spätdienst „Sehr leicht“: weiter eine nach der anderen erwartet, gesehen ' + maxSpaet);
  await T.click('#btnEnd');
  await T.waitForSelector('.rtab');
  if (errors.length) throw new Error('Fehler: ' + errors.join(' | '));
  ok = true;
  log('SEHR LEICHT OK');
} catch (e) {
  console.error('FEHLER:', e.message);
  for (const ph of phones) console.error(ph.name, JSON.stringify(await ph.p.evaluate(() => ({ k: document.querySelector('#auftrag').className, t: document.querySelector('#aText').textContent, zeigen: (document.querySelector('.ctl.zeigen') || {}).dataset })).catch(() => null)));
  if (errors.length) console.error(errors.join('\n'));
} finally {
  spielen = false;
  await browser.close();
  if (srv) srv.kill();
  process.exit(ok ? 0 : 1);
}
