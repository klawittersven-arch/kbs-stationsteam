// Browser-Test „Testlauf allein“: Beamer + Testansicht (3 Computer-Mitspieler) + ein echtes Handy.
// Die Computer-Mitspieler erledigen die Anweisungen des Handys. Was auf ihren Handys steht, führt das Handy aus.
// Start:  node tests/testlauf.mjs      (startet den lokalen Server selbst; Bildschirmfotos in tests/ergebnisse/)
// Mit Adresse (z. B. node tests/testlauf.mjs http://127.0.0.1:8787 bei laufendem „npx wrangler dev“) wird kein eigener Server gestartet.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inhalte, COMPUTER } from '../public/js/regeln.js';
import { bedienenJetzt, sleep } from './bedienen.mjs';

const { chromium } = createRequire(import.meta.url)(process.env.PLAYWRIGHT || 'playwright');
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'tests', 'ergebnisse');
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8791, BASE = process.argv[2] || `http://127.0.0.1:${PORT}`;
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
for (const c of I.katalog) c.befehle.forEach((b, w) => LOESUNG.set(b, [[c.id, w]]));
for (const s of I.situationen) LOESUNG.set(s.text, s.ziele);

const errors = [];
const browser = await chromium.launch();
let ok = false;
// Was zeigt eine Handy-Seite (oder eine Testansicht) gerade?
const lesen = f => f.evaluate(() => {
  const sf = document.querySelector('#spielfeld');
  if (!sf || sf.hidden) return null;
  const box = document.querySelector('#auftrag');
  return { id: box.dataset.id || '', klasse: box.className, text: document.querySelector('#aText').textContent, meldung: document.querySelector('#aMeldung').hidden ? '' : document.querySelector('#aMeldung').textContent };
}).catch(() => null);

try {
  // ---------------- Beamer: Testlauf allein starten, Testansicht öffnet sich
  const tctx = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  const T = await tctx.newPage();
  T.on('pageerror', e => errors.push('Beamer: ' + e.message));
  T.on('dialog', d => d.accept());
  await T.goto(BASE + '/lehrer');
  await T.waitForSelector('#qr');
  const code = (await T.textContent('#codeChip')).replace('Code ', '').trim();
  await T.click('.seg[aria-label="Dauer einer Schicht"] button:has-text("1 Min.")');
  const [TV] = await Promise.all([T.waitForEvent('popup'), T.click('#btnCpu')]);
  TV.on('pageerror', e => errors.push('Testansicht: ' + e.message));
  await TV.setViewportSize({ width: 1280, height: 860 });
  await T.waitForFunction(() => document.querySelectorAll('.name.cpu').length === 3);
  if (!(await T.textContent('#btnCpu')).includes('Computer entfernen')) throw new Error('Knopf zum Entfernen fehlt');
  if (await T.$('#btnTest[hidden]')) throw new Error('Knopf „Testansicht“ oben fehlt');
  await TV.waitForFunction(() => document.querySelectorAll('.tvhandy iframe').length === 3);
  log('Testansicht mit 3 Computer-Handys ✓');

  // ---------------- Mein Handy
  const hctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const H = await hctx.newPage();
  H.on('pageerror', e => errors.push('Handy: ' + e.message));
  await H.goto(`${BASE}/mitspielen?c=${code}`);
  await H.fill('#fFirst', 'Sven'); await H.fill('#fInit', 'K');
  await H.click('button[type=submit]');
  await T.waitForFunction(() => document.querySelectorAll('.name').length === 4);
  await shot(T, '20-testlauf-beamer-anmeldung');

  // ---------------- Stationen selbst wählen: Die Computer-Mitspieler sitzen schon
  await T.keyboard.press('Enter');
  await T.waitForSelector('#wTimer');
  await H.waitForSelector('.stbtn');
  if ((await T.$$eval('.stkarte .mchip', els => els.length)) !== 3) throw new Error('Computer-Mitspieler haben keine Station gewählt');
  await H.click('.stbtn[data-i="0"]');
  await H.waitForSelector('.stbtn.mein[data-i="0"]');
  await T.keyboard.press('Enter'); // Jetzt verteilen
  await T.waitForSelector('#tHint');
  await TV.waitForFunction(() => [...document.querySelectorAll('.tvst')].every(e => e.textContent === 'Station Rot'));
  for (const f of TV.frames().filter(f => f.url().includes('computer='))) await f.waitForSelector('.stationkarte');
  log('Alle in Station Rot ✓');

  // ---------------- Frühdienst und Spätdienst
  const frames = () => TV.frames().filter(f => f.url().includes('computer='));
  const zaehler = { fuerMich: 0, vonRobo: 0, gesehen: new Set(), meine: new Set(), ereignis: 0 };
  let foto = false;
  for (const k of [0, 1]) {
    await T.keyboard.press('Enter');
    await H.waitForSelector('.pult .ctl');
    await H.waitForFunction(() => document.querySelector('#countdown').hidden, null, { timeout: 12000 });
    for (const f of frames()) await f.waitForSelector('.pult .ctl', { timeout: 8000 });
    const bis = Date.now() + 61000;
    let ev = false;
    while (Date.now() < bis && !(await T.$('.rtab'))) {
      // Ereignis: auf meinem Handy mitmachen
      const e = await H.$eval('#ereignis', x => ({ aktiv: x.dataset.aktiv === 'true', art: (x.className.match(/ev-(\w+)/) || [])[1] })).catch(() => null);
      if (e && e.aktiv && !ev) { ev = true; await bedienenJetzt(H, 'ev-' + e.art, e.art === 'strom' ? 1 : 0); zaehler.ereignis++; continue; }
      // Meine eigene Aufgabe: Die Computer-Mitspieler erledigen sie
      const meine = await lesen(H);
      if (meine && meine.id) zaehler.meine.add(meine.id);
      if (meine && /von Robo/.test(meine.meldung)) zaehler.vonRobo++;
      // Aufgaben auf den Computer-Handys, für die ich den Knopf habe
      for (const f of frames()) {
        const a = await lesen(f);
        if (!a || !a.id || a.klasse.includes('wartet') || a.klasse.includes('leer') || zaehler.gesehen.has(a.id)) continue;
        const ziele = LOESUNG.get(a.text);
        if (!ziele) { errors.push('Unbekannte Aufgabe auf einem Computer-Handy: ' + a.text); zaehler.gesehen.add(a.id); continue; }
        const z = [];
        for (const [id, w] of ziele) if (await H.$(`.ctl[data-c="${id}"]`)) z.push([id, w]);
        if (!z.length) continue;
        zaehler.gesehen.add(a.id);
        await sleep(400);
        await bedienenJetzt(H, z[0][0], z[0][1]);
        zaehler.fuerMich++;
        if (!foto && k === 0) { foto = true; await sleep(300); await shot(TV, '21-testlauf-testansicht'); await shot(H, '22-testlauf-handy'); }
      }
      await sleep(250);
    }
    await T.waitForSelector('.rtab', { timeout: 20000 });
    const zeile = await T.$eval('.rtab tbody tr', e => e.textContent.replace(/\s+/g, ' ').trim());
    log(k ? 'Spätdienst' : 'Frühdienst', 'vorbei:', zeile, '· von mir für Computer erledigt:', zaehler.fuerMich, '· meine Aufgaben:', zaehler.meine.size);
    if (k === 0) {
      await sleep(500);
      await shot(T, '23-testlauf-beamer-uebergabe');
      const fz = await H.$eval('.stationkarte', e => e.textContent.replace(/\s+/g, ' '));
      if (!/Du hast [1-9]\d* Aufgabe/.test(fz)) throw new Error('Ich habe für die Computer-Mitspieler nichts erledigt: ' + fz.slice(0, 120));
    }
  }
  if (zaehler.fuerMich < 4) throw new Error('Zu wenige Aufgaben von den Computer-Handys erledigt: ' + zaehler.fuerMich);
  if (zaehler.meine.size < 6) throw new Error('Mein Handy hat zu wenige Aufgaben bekommen');
  if (!zaehler.vonRobo) throw new Error('Keine meiner Aufgaben wurde von einem Computer-Mitspieler erledigt');
  if (!zaehler.ereignis) throw new Error('Kein Ereignis im Spätdienst');
  const chips = await T.$$eval('.rtab tbody td.zl', els => els.map(e => Number(e.textContent)));
  log('Spätdienst ✓ ⏰ ✗:', chips.join(' / '), '· Ereignis mitgemacht:', zaehler.ereignis);
  // Computer-Mitspieler machen auch Fehler (zufällig; nur Hinweis, wenn es diesmal nicht vorkam)
  if (!chips[2]) log('Hinweis: Diesmal kein Fehlgriff der Computer-Mitspieler (zufällig, Anteil ' + COMPUTER.fehlgriff * 100 + ' %).');

  // ---------------- Zurück zur Anmeldung, Computer entfernen
  await T.keyboard.press('Escape');
  await T.waitForSelector('#btnCpu');
  await T.click('#btnCpu');
  await T.waitForFunction(() => !document.querySelector('.name.cpu') && document.querySelectorAll('.name').length === 1);
  await TV.waitForSelector('.tvleer');
  if (!(await T.$('#btnTest[hidden]'))) throw new Error('Knopf „Testansicht“ müsste wieder verschwinden');
  log('Computer entfernt, Testansicht leer ✓');
  if (errors.length) throw new Error('Fehler: ' + errors.join(' | '));
  ok = true;
  log('TESTLAUF OK');
} catch (e) {
  console.error('FEHLER:', e.message);
  if (errors.length) console.error(errors.join('\n'));
} finally {
  await browser.close();
  if (srv) srv.kill();
  process.exit(ok ? 0 : 1);
}
