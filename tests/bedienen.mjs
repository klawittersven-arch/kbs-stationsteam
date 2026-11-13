// Gemeinsame Hilfen für die Browser-Tests: ein Bedienelement auf einer Handy-Seite bedienen (wie mit dem Finger)
import { inhalte } from '../public/js/regeln.js';
export const sleep = ms => new Promise(r => setTimeout(r, ms));

// Störung wegmachen: Kaffee und Krümel wegwischen, Post-its antippen
export async function wischen(p, sel) {
  const ov = `${sel} .stoer`;
  for (let i = 0; i < 10 && await p.$(`${ov}:not(.weg)`); i++) {
    const cls = await p.$eval(ov, e => e.className).catch(() => '');
    if (cls.includes('postit')) { await p.click(ov, { force: true }).catch(() => {}); await sleep(90); continue; }
    const b = await p.locator(ov).boundingBox().catch(() => null); if (!b) break;
    await p.mouse.move(b.x + 8, b.y + b.height / 2); await p.mouse.down();
    await p.mouse.move(b.x + b.width - 8, b.y + b.height / 3, { steps: 6 });
    await p.mouse.move(b.x + 8, b.y + b.height * 2 / 3, { steps: 6 });
    await p.mouse.up();
  }
}
// Ein Element bedienen, je nach Art: tippen, halten, im Takt tippen, Dosis einstellen und auslösen, Stufe antippen.
// zaehl(art, gewischt) wird vorher aufgerufen (für Statistiken).
export async function bedienenJetzt(p, id, w, zaehl) {
  const sel = `.ctl[data-c="${id}"]`;
  if (!id.startsWith('ev-') && await p.$('#ereignis:not([hidden])')) return; // erst das Ereignis
  let gewischt = false;
  if (await p.$(`${sel} .stoer`)) { await wischen(p, sel); gewischt = true; await sleep(320); }
  const info = await p.$eval(sel, e => ({ art: e.classList[1], ms: Number(e.dataset.ms), anzahl: Number(e.dataset.anzahl), schlag: Number(e.dataset.schlag), v: Number(e.dataset.v), z: Number(e.dataset.z) }));
  if (zaehl) zaehl(info.art, gewischt);
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
  if (info.art === 'medikament') {
    // Stufe w = „Wirkstoff Dosis Zeitpunkt“: die drei Knöpfe im Blatt antippen, dann „Geben“
    const c = inhalte().byId.get(id), ziel = c.stufen[w];
    let wahl = null;
    c.wirkstoffe.forEach((x, wi) => x.dosen.forEach((d, di) => c.zeiten.forEach((z, zi) => { if (`${x.name} ${d} ${z}` === ziel) wahl = [wi, di, zi]; })));
    if (!wahl) throw new Error('Medikament: keine Kombination für ' + ziel);
    const B = `.mblatt[data-c="${id}"]`;
    await p.click(`${sel} .mgeben`);
    await p.click(`${B} [data-r="w"] button[data-i="${wahl[0]}"]`);
    await p.click(`${B} [data-r="d"] button[data-i="${wahl[1]}"]`);
    await p.click(`${B} [data-r="z"] button[data-i="${wahl[2]}"]`);
    return p.click(`${B} .geben`);
  }
  if (info.art === 'auswahl') {
    if (info.z === w) return;
    await p.click(`${sel} .ausw`);
    return p.click(`.blatt[data-c="${id}"] .liste button[data-w="${w}"]`);
  }
  return p.click(`${sel} button[data-w="${w}"]`); // Schalter, Stufen, Schieberegler (Markierung antippen)
}
