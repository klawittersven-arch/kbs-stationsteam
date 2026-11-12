// Das Pult auf dem Handy: Knöpfe, Schalter und Stufen-Regler
import { symbol } from './bilder.js';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * el: Container · pult: [{id, art, name, stufen, thema}] · zustand: {id: stufe}
 * onTun(id, stufe): wird beim Tippen aufgerufen (Schalter/Stufen nur, wenn sich etwas ändert)
 */
export function erstellePult(el, { pult, zustand, onTun }) {
  // Breite Stufen-Regler und halbe Elemente (Knopf, Schalter) so mischen, dass das Raster aufgeht
  const halbe = pult.filter(c => c.art !== 'stufen'), ganze = pult.filter(c => c.art === 'stufen');
  const order = [];
  while (halbe.length || ganze.length) {
    if (halbe.length) order.push(halbe.shift());
    if (halbe.length) order.push(halbe.shift());
    if (ganze.length) order.push(ganze.shift());
  }
  const anzahlHalbe = order.filter(c => c.art !== 'stufen').length;
  const zeilen = Math.ceil(anzahlHalbe / 2) + order.filter(c => c.art === 'stufen').length;
  el.className = 'pult z' + zeilen;
  el.innerHTML = '';
  let aktiv = true;
  const nodes = new Map();
  order.forEach((c, i) => {
    const th = ' th-' + esc(c.thema);
    let node;
    if (c.art === 'knopf') {
      node = document.createElement('button');
      node.type = 'button';
      node.className = 'ctl knopf' + th;
      node.dataset.c = c.id; node.dataset.w = '0';
      node.innerHTML = `<span class="led"></span><span class="sym">${symbol(c.thema)}</span><span class="nm" lang="de">${esc(c.name)}</span>`;
      node.onclick = () => {
        if (!aktiv || node.classList.contains('gedrueckt')) return;
        node.classList.add('gedrueckt');
        setTimeout(() => node.classList.remove('gedrueckt'), 450);
        onTun(c.id, 0);
      };
    } else {
      node = document.createElement('div');
      node.className = 'ctl ' + c.art + th;
      node.dataset.c = c.id;
      node.setAttribute('role', 'radiogroup');
      node.setAttribute('aria-label', c.name);
      node.innerHTML = `<div class="kopf"><span class="sym">${symbol(c.thema)}</span><span class="nm" lang="de">${esc(c.name)}</span></div>
        <div class="wahl n${c.stufen.length}">${c.stufen.map((s, w) => `<button type="button" role="radio" data-w="${w}" aria-checked="false"><i class="led"></i><span lang="de">${esc(s)}</span></button>`).join('')}</div>`;
      node.querySelectorAll('button').forEach(b => {
        b.onclick = () => {
          if (!aktiv) return;
          const w = Number(b.dataset.w);
          if (Number(node.dataset.z) === w) return;
          setzeEins(c.id, w);
          onTun(c.id, w);
        };
      });
    }
    // Ungerade Anzahl halber Elemente: das letzte füllt die Zeile
    if (c.art !== 'stufen' && anzahlHalbe % 2 === 1 && i === order.map(x => x.art !== 'stufen').lastIndexOf(true)) node.classList.add('breit');
    nodes.set(c.id, node);
    el.appendChild(node);
  });
  function setzeEins(id, w) {
    const node = nodes.get(id);
    if (!node || node.classList.contains('knopf')) return;
    node.dataset.z = String(w);
    node.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.w) === w)));
  }
  function setze(z) { for (const [id, w] of Object.entries(z || {})) setzeEins(id, w); }
  setze(zustand);
  return {
    setze,
    // Rückmeldung nach einer Aktion: grün (Treffer) oder rot (Fehlgriff)
    blitz(id, ok) {
      const node = nodes.get(id); if (!node) return;
      node.classList.remove('treffer', 'fehl'); void node.offsetWidth;
      node.classList.add(ok ? 'treffer' : 'fehl');
      setTimeout(() => node.classList.remove('treffer', 'fehl'), 900);
    },
    sperren(on) { aktiv = !on; el.classList.toggle('gesperrt', !!on); },
  };
}
