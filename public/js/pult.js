// Das Pult auf dem Handy: Knöpfe, Halte-Knöpfe, Takt-Knöpfe, Schalter, Stufen, Schieberegler und Drehregler
import { symbol, gesicht } from './bilder.js';
import { breit, taktPruefen } from './regeln.js';

export const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * el: Container · pult: [{id, art, name, stufen, thema, …}] · zustand: {id: stufe}
 * onTun(id, stufe): eine Aktion ist fertig (Knopf gedrückt, lange genug gehalten, Takt geschafft,
 *                   Schalter/Regler umgestellt, Dosis eingestellt und ausgelöst)
 */
export function erstellePult(el, { pult, zustand, onTun }) {
  // Breite Elemente und halbe Elemente so mischen, dass das Raster aufgeht
  const halbe = pult.filter(c => !breit(c)), ganze = pult.filter(c => breit(c));
  const order = [];
  while (halbe.length || ganze.length) {
    if (halbe.length) order.push(halbe.shift());
    if (halbe.length) order.push(halbe.shift());
    if (ganze.length) order.push(ganze.shift());
  }
  const anzahlHalbe = order.filter(c => !breit(c)).length;
  const letzteHalbe = order.map(c => !breit(c)).lastIndexOf(true);
  el.className = 'pult z' + (Math.ceil(anzahlHalbe / 2) + order.filter(breit).length);
  el.innerHTML = '';
  let aktiv = true;
  const nodes = new Map(), setzer = new Map();
  const kopf = c => `<div class="kopf"><span class="sym">${symbol(c.thema)}</span><span class="nm" lang="de">${esc(c.name)}</span></div>`;

  order.forEach((c, i) => {
    const node = document.createElement(['knopf', 'halten', 'takt'].includes(c.art) ? 'button' : 'div');
    node.className = `ctl ${c.art} th-${esc(c.thema)}`;
    node.dataset.c = c.id;
    if (node.tagName === 'BUTTON') { node.type = 'button'; node.dataset.w = '0'; }
    if (!breit(c) && anzahlHalbe % 2 === 1 && i === letzteHalbe) node.classList.add('breit');
    const bau = { knopf: baueKnopf, halten: baueHalten, takt: baueTakt, schalter: baueWahl, stufen: baueWahl, gesichter: baueWahl, regler: baueRegler, auswahl: baueAuswahl, dosis: baueDosis }[c.art];
    bau(node, c);
    nodes.set(c.id, node);
    el.appendChild(node);
  });

  // ---------- Knopf: einmal antippen
  function baueKnopf(node, c) {
    node.innerHTML = `<span class="led"></span><span class="sym">${symbol(c.thema)}</span><span class="nm" lang="de">${esc(c.name)}</span>${c.hinweis ? `<small class="hz">${esc(c.hinweis)}</small>` : ''}`;
    node.onclick = () => {
      if (!aktiv || node.classList.contains('gedrueckt')) return;
      node.classList.add('gedrueckt');
      setTimeout(() => node.classList.remove('gedrueckt'), 450);
      onTun(c.id, 0);
    };
  }

  // ---------- Halten: gedrückt halten, bis der Balken voll ist
  function baueHalten(node, c) {
    const ms = c.sekunden * 1000;
    node.style.setProperty('--dauer', ms + 'ms');
    node.dataset.ms = ms;
    node.innerHTML = `<span class="led"></span><span class="sym">${symbol(c.thema)}</span><span class="nm" lang="de">${esc(c.name)}</span>
      <small class="hz">${c.sekunden} s halten${c.hinweis ? ' – ' + esc(c.hinweis) : ''}</small><span class="haltbalken"><i></i></span>`;
    const hz = node.querySelector('.hz'), hzText = hz.textContent;
    let timer = 0;
    const start = e => {
      if (!aktiv || timer) return;
      if (e && e.pointerId != null) try { node.setPointerCapture(e.pointerId); } catch (x) {}
      node.classList.remove('fertig');
      node.classList.add('haelt');
      timer = setTimeout(() => {
        timer = 0;
        node.classList.remove('haelt');
        node.classList.add('fertig');
        setTimeout(() => node.classList.remove('fertig'), 700);
        onTun(c.id, 0);
      }, ms);
    };
    const stopp = () => {
      if (!timer) return;
      clearTimeout(timer); timer = 0;
      node.classList.remove('haelt');
      hz.textContent = 'Länger halten!';
      setTimeout(() => { hz.textContent = hzText; }, 1200);
    };
    node.addEventListener('pointerdown', e => { e.preventDefault(); start(e); });
    node.addEventListener('pointerup', stopp);
    node.addEventListener('pointercancel', stopp);
    node.addEventListener('lostpointercapture', stopp);
    node.addEventListener('contextmenu', e => e.preventDefault());
    node.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); start(); } });
    node.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') stopp(); });
  }

  // ---------- Takt: mehrmals im Takt drücken (z. B. Herzdruckmassage 100–120 pro Minute)
  function baueTakt(node, c) {
    const mitte = (c.min + c.max) / 2;
    node.style.setProperty('--schlag', Math.round(60000 / mitte) + 'ms');
    node.dataset.anzahl = c.anzahl;
    node.dataset.schlag = Math.round(60000 / mitte);
    const grund = `${c.anzahl}× im Takt (${c.min}–${c.max}/min)`;
    node.innerHTML = `<span class="led puls"></span><span class="sym">${symbol(c.thema)}</span><span class="nm" lang="de">${esc(c.name)}</span>
      <small class="hz">${grund}</small><span class="taktzahl"></span>`;
    const hz = node.querySelector('.hz'), zahl = node.querySelector('.taktzahl');
    let zeiten = [], ruheT = 0;
    const zuruecksetzen = text => {
      zeiten = []; zahl.textContent = '';
      hz.textContent = text || grund;
      if (text) setTimeout(() => { if (!zeiten.length) hz.textContent = grund; }, 1800);
    };
    const schlag = () => {
      if (!aktiv) return;
      const t = performance.now();
      if (zeiten.length && t - zeiten[zeiten.length - 1] > 1500) zeiten = []; // zu lange Pause: von vorn
      zeiten.push(t);
      node.classList.remove('schlag'); void node.offsetWidth; node.classList.add('schlag');
      zahl.textContent = zeiten.length + ' / ' + c.anzahl;
      clearTimeout(ruheT);
      ruheT = setTimeout(() => { if (zeiten.length) zuruecksetzen('Pause zu lang. Nochmal von vorn!'); }, 1600);
      if (zeiten.length < c.anzahl) return;
      clearTimeout(ruheT);
      const r = taktPruefen(zeiten, c);
      if (r.ok) { zuruecksetzen(`✓ ${r.proMin} pro Minute`); onTun(c.id, 0); }
      else zuruecksetzen(r.proMin > c.max ? `Zu schnell (${r.proMin}/min)! Nochmal.` : `Zu langsam (${r.proMin}/min)! Nochmal.`);
    };
    node.addEventListener('pointerdown', e => { e.preventDefault(); schlag(); });
    node.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); schlag(); } });
    node.addEventListener('contextmenu', e => e.preventDefault());
  }

  // ---------- Schalter und Stufen: eine Stufe antippen
  function baueWahl(node, c) {
    node.setAttribute('role', 'radiogroup');
    node.setAttribute('aria-label', c.name);
    node.innerHTML = `${kopf(c)}<div class="wahl n${c.stufen.length}">${c.stufen.map((s, w) => `<button type="button" role="radio" data-w="${w}" aria-checked="false"><i class="led"></i>${c.art === 'gesichter' ? gesicht(w, c.stufen.length) : ''}<span lang="de">${esc(s)}</span></button>`).join('')}</div>`;
    node.querySelectorAll('button').forEach(b => {
      b.onclick = () => {
        if (!aktiv) return;
        const w = Number(b.dataset.w);
        if (Number(node.dataset.z) === w) return;
        setzeEins(c.id, w);
        onTun(c.id, w);
      };
    });
    setzer.set(c.id, w => {
      node.dataset.z = String(w);
      node.querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.w) === w)));
    });
  }

  // ---------- Schieberegler: Griff ziehen (rastet ein) oder eine Markierung antippen
  function baueRegler(node, c) {
    const n = c.stufen.length;
    node.style.setProperty('--n', n);
    node.innerHTML = `<div class="kopf"><span class="sym">${symbol(c.thema)}</span><span class="nm" lang="de">${esc(c.name)}</span><b class="wert"></b></div>
      <div class="schiene"><span class="spur"></span><span class="fuell"></span><span class="griff" role="slider" tabindex="0" aria-label="${esc(c.name)}" aria-valuemin="0" aria-valuemax="${n - 1}"></span></div>
      <div class="marken">${c.stufen.map((s, w) => `<button type="button" data-w="${w}" aria-checked="false">${esc(s)}</button>`).join('')}</div>`;
    const schiene = node.querySelector('.schiene'), griff = node.querySelector('.griff'), wert = node.querySelector('.wert');
    const zeige = w => {
      node.style.setProperty('--pos', w);
      wert.textContent = c.stufen[w];
      griff.setAttribute('aria-valuenow', w);
      griff.setAttribute('aria-valuetext', c.stufen[w]);
    };
    const fest = w => {
      if (!aktiv) return zeige(Number(node.dataset.z) || 0);
      if (Number(node.dataset.z) === w) return zeige(w);
      setzeEins(c.id, w);
      onTun(c.id, w);
    };
    let zieht = null;
    const stufeBei = x => { const r = schiene.getBoundingClientRect(); return clamp(Math.floor((x - r.left) / r.width * n), 0, n - 1); };
    schiene.addEventListener('pointerdown', e => {
      if (!aktiv) return;
      e.preventDefault();
      try { schiene.setPointerCapture(e.pointerId); } catch (x) {}
      zieht = stufeBei(e.clientX);
      node.classList.add('zieht');
      zeige(zieht);
    });
    schiene.addEventListener('pointermove', e => { if (zieht == null) return; zieht = stufeBei(e.clientX); zeige(zieht); });
    const loslassen = () => { if (zieht == null) return; const w = zieht; zieht = null; node.classList.remove('zieht'); fest(w); };
    schiene.addEventListener('pointerup', loslassen);
    schiene.addEventListener('pointercancel', loslassen);
    node.querySelectorAll('.marken button').forEach(b => { b.onclick = () => fest(Number(b.dataset.w)); });
    griff.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      fest(clamp((Number(node.dataset.z) || 0) + d, 0, n - 1));
    });
    setzer.set(c.id, w => {
      node.dataset.z = String(w);
      node.querySelectorAll('.marken button').forEach(b => b.setAttribute('aria-checked', String(Number(b.dataset.w) === w)));
      if (zieht == null) zeige(w);
    });
    zeige(0);
  }

  // ---------- Auswahl: Zeile antippen, die Liste klappt über dem Pult aus, einen Eintrag wählen
  let blatt = null;
  function listeZu() { if (blatt) { blatt.remove(); blatt = null; } }
  function baueAuswahl(node, c) {
    node.innerHTML = `${kopf(c)}${c.hinweis ? `<small class="hz">${esc(c.hinweis)}</small>` : ''}<button type="button" class="ausw" aria-haspopup="listbox"><span class="awert"></span><b aria-hidden="true">▾</b></button>`;
    const awert = node.querySelector('.awert');
    node.querySelector('.ausw').onclick = () => {
      if (!aktiv) return;
      listeZu();
      const jetzt = Number(node.dataset.z) || 0;
      blatt = document.createElement('div');
      blatt.className = `blatt th-${esc(c.thema)}`;
      blatt.dataset.c = c.id;
      blatt.setAttribute('role', 'dialog');
      blatt.setAttribute('aria-label', c.name);
      blatt.innerHTML = `<div class="bkopf"><span class="sym">${symbol(c.thema)}</span><b>${esc(c.name)}</b><small>${c.hinweis ? esc(c.hinweis) + ' – ' : ''}bitte wählen</small></div>
        <div class="liste n${c.stufen.length}" role="listbox">${c.stufen.map((s, w) => `<button type="button" role="option" data-w="${w}" aria-selected="${w === jetzt}" class="${w === jetzt ? 'jetzt' : ''}">${esc(s)}</button>`).join('')}</div>
        <button type="button" class="zurueck">Zurück</button>`;
      blatt.querySelectorAll('.liste button').forEach(b => {
        b.onclick = () => {
          const w = Number(b.dataset.w);
          listeZu();
          if (!aktiv || w === (Number(node.dataset.z) || 0)) return;
          setzeEins(c.id, w);
          onTun(c.id, w);
        };
      });
      blatt.querySelector('.zurueck').onclick = listeZu;
      el.appendChild(blatt);
    };
    setzer.set(c.id, w => { node.dataset.z = String(w); awert.textContent = c.stufen[w] || ''; });
  }

  // ---------- Dosis: Drehregler einstellen (drehen oder ‹ ›), dann mit dem Knopf auslösen
  function baueDosis(node, c) {
    const n = c.stufen.length;
    const winkel = v => -135 + (n > 1 ? v / (n - 1) * 270 : 0);
    node.innerHTML = `${kopf(c)}
      <div class="dzeile">
        <button type="button" class="dpfeil" data-d="-1" aria-label="weniger">‹</button>
        <div class="dreh" role="spinbutton" tabindex="0" aria-label="${esc(c.name)}" aria-valuemin="0" aria-valuemax="${n - 1}">
          <span class="skala">${c.stufen.map((_, v) => `<i style="--a:${winkel(v)}deg"></i>`).join('')}</span>
          <span class="knauf"><span class="zeiger"></span></span><b class="dwert"></b>
        </div>
        <button type="button" class="dpfeil" data-d="1" aria-label="mehr">›</button>
        <button type="button" class="los">${esc(c.knopf || 'Los')}</button>
      </div>`;
    const dreh = node.querySelector('.dreh'), dwert = node.querySelector('.dwert'), los = node.querySelector('.los');
    const stelle = v => {
      v = clamp(v, 0, n - 1);
      node.dataset.v = String(v);
      node.style.setProperty('--a', winkel(v) + 'deg');
      dwert.textContent = c.stufen[v];
      dreh.setAttribute('aria-valuenow', v);
      dreh.setAttribute('aria-valuetext', c.stufen[v]);
    };
    const jetzt = () => Number(node.dataset.v) || 0;
    node.querySelectorAll('.dpfeil').forEach(b => { b.onclick = () => { if (aktiv) stelle(jetzt() + Number(b.dataset.d)); }; });
    // Drehen: Der Winkel zwischen Mitte und Finger bestimmt die Stufe (oben = Mitte der Skala)
    let dreht = false;
    const ausWinkel = e => {
      const r = dreh.getBoundingClientRect();
      let a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180 / Math.PI;
      a = clamp(a, -135, 135);
      stelle(Math.round((a + 135) / 270 * (n - 1)));
    };
    dreh.addEventListener('pointerdown', e => {
      if (!aktiv) return;
      e.preventDefault();
      try { dreh.setPointerCapture(e.pointerId); } catch (x) {}
      dreht = true; node.classList.add('dreht');
      ausWinkel(e);
    });
    dreh.addEventListener('pointermove', e => { if (dreht) ausWinkel(e); });
    const ende = () => { dreht = false; node.classList.remove('dreht'); };
    dreh.addEventListener('pointerup', ende);
    dreh.addEventListener('pointercancel', ende);
    dreh.addEventListener('keydown', e => {
      const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
      if (d) { e.preventDefault(); if (aktiv) stelle(jetzt() + d); }
    });
    los.onclick = () => {
      if (!aktiv || los.classList.contains('gedrueckt')) return;
      los.classList.add('gedrueckt');
      setTimeout(() => los.classList.remove('gedrueckt'), 450);
      onTun(c.id, jetzt());
    };
    stelle(0);
  }

  // ---------- Störung: liegt über einem Element, bis sie weggewischt (Kaffee, Krümel) oder weggetippt (Post-its) ist
  function baueStoerung(art) {
    const d = document.createElement('div');
    d.className = 'stoer ' + art;
    const halt = e => e.stopPropagation(); // nichts darunter auslösen
    ['click', 'pointerup', 'pointercancel', 'keydown'].forEach(t => d.addEventListener(t, halt));
    d.addEventListener('contextmenu', e => e.preventDefault());
    const weg = () => { if (d.classList.contains('weg')) return; d.classList.add('weg'); setTimeout(() => d.remove(), 260); };
    if (art === 'postit') {
      const z = [[4, 6, -7], [34, 30, 5], [12, 42, -3]];
      d.innerHTML = '<span class="stext">Zettel wegtippen!</span>' + z.map(([x, y, r]) => `<span class="zettel" style="--x:${x}%;--y:${y}%;--r:${r}deg"></span>`).join('');
      d.addEventListener('pointerdown', e => {
        e.stopPropagation(); e.preventDefault();
        const zettel = (e.target.closest && e.target.closest('.zettel:not(.ab)')) || d.querySelector('.zettel:not(.ab)');
        if (zettel) { zettel.classList.add('ab'); setTimeout(() => zettel.remove(), 220); }
        if (!d.querySelector('.zettel:not(.ab)')) weg();
      });
    } else {
      d.innerHTML = `<span class="stext">${art === 'kruemel' ? 'Krümel!' : 'Kaffee!'} Wegwischen</span>`;
      let rest = 1, letzte = null;
      const noetig = () => { const r = d.getBoundingClientRect(); return Math.max(150, (r.width + r.height) * 1.2); };
      const wischen = anteil => { rest -= anteil; d.style.opacity = String(Math.max(0.12, rest)); if (rest <= 0) weg(); };
      d.addEventListener('pointerdown', e => {
        e.stopPropagation(); e.preventDefault();
        try { d.setPointerCapture(e.pointerId); } catch (x) {}
        letzte = [e.clientX, e.clientY];
        wischen(0.2); // auch Antippen hilft: fünfmal tippen reicht
      });
      d.addEventListener('pointermove', e => {
        if (!letzte) return;
        const weit = Math.hypot(e.clientX - letzte[0], e.clientY - letzte[1]);
        letzte = [e.clientX, e.clientY];
        wischen(weit / noetig());
      });
      const los = () => { letzte = null; };
      d.addEventListener('pointerup', los);
      d.addEventListener('pointercancel', los);
    }
    return d;
  }

  function setzeEins(id, w) { const f = setzer.get(id); if (f) f(w); }
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
    sperren(on) { aktiv = !on; el.classList.toggle('gesperrt', !!on); if (on) listeZu(); },
    // Störung auf Elemente legen. Rückgabe: auf wie vielen Elementen sie jetzt liegt
    stoeren(art, ids) {
      let n = 0;
      for (const id of ids || []) {
        const node = nodes.get(id);
        if (!node || node.querySelector('.stoer')) continue;
        node.appendChild(baueStoerung(art));
        n++;
      }
      return n;
    },
  };
}
