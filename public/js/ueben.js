// Übungsseite: allein üben (ohne Klasse, ohne Anmeldung). Alle Knöpfe liegen auf dem eigenen Handy.
// Gespeichert werden nur die eigenen Rekorde im Browser. Die Seite bleibt stumm.
import { store } from './net.js';
import { erstellePult, esc } from './pult.js';
import { inhalte, mischen, pool, startZustand, neueAufgabe, trefferSuchen, zieleText, breit, hatZustand, MED_AJ, ASSESS_WAHL, SCHWIERIGKEIT, stufe, stufeK, GRUPPE_PRO_HANDY, istListe, PAUSE_OK, PAUSE_VERPASST, PAUSE_VERPASST_SIT, PUNKTE_TREFFER, PUNKTE_FEHLGRIFF } from './regeln.js';
import { THEMEN, MEDIKAMENTE, PROPHYLAXEN, ASSESSMENTS } from './inhalte.js';
import { LOGO, symbol } from './bilder.js';
import { spielfeldZeigen, countdown, auftragZeigen, auftragTick, aktuellerAuftrag, meldung, vibrieren, wachHalten, mmss } from './ui.js';

const $ = s => document.querySelector(s);
const I = inhalte();
const r = Math.random;
const NEUES_PULT_NACH = 5;
const proPult = () => stufe(einst.schwierigkeit).ueben; // Elemente auf dem Pult: Leicht 4, Mittel 5, Schwer 6
const MODI = {
  befehle: { name: 'Anweisungen', anteil: 0, kurz: 'Direkte Anweisungen, z. B. „Bettgitter hoch!“' },
  gemischt: { name: 'Gemischt', anteil: 0.5, kurz: 'Anweisungen und Situationen gemischt.' },
  situationen: { name: 'Situationen', anteil: 1, kurz: 'Nur Situationen: Was ist zu tun?' },
};
const DAUERN = [60, 90, 120];

// Gespeicherte Einstellungen; ältere Fassungen bekommen „Sehr leicht“ und „Anweisungen“ als neue Voreinstellung
const gespeichert = store('stationsteam.ueben') || {};
if ((gespeichert.v || 1) < 2) { delete gespeichert.schwierigkeit; delete gespeichert.modus; }
let einst = Object.assign({ modus: 'befehle', dauer: 90, themen: THEMEN.map(t => t.id), medAJ: 2, assessment: 'einfach', schwierigkeit: 'sehrleicht' }, gespeichert, { v: 2 });
if (!SCHWIERIGKEIT[einst.schwierigkeit]) einst.schwierigkeit = 'sehrleicht';
if (!ASSESS_WAHL[einst.assessment]) einst.assessment = 'einfach';
if (!MODI[einst.modus]) einst.modus = 'befehle';
einst.medAJ = Number(einst.medAJ); if (!MED_AJ[einst.medAJ]) einst.medAJ = 2;
if (!DAUERN.includes(einst.dauer)) einst.dauer = 90;
einst.themen = (einst.themen || []).filter(t => THEMEN.some(x => x.id === t));
if (!einst.themen.length) einst.themen = THEMEN.map(t => t.id);
const rekordKey = () => `stationsteam.rekord.${einst.modus}.${einst.dauer}.${einst.schwierigkeit}`;

let G = null;

// ---------------------------------------------------------------- Menü
function menue(ergebnis) {
  spielfeldZeigen(false);
  wachHalten(false);
  const rekord = store(rekordKey()) || 0;
  const seg = (name, list, val) => `<div class="seg c${list.length}" data-name="${name}">${list.map(([v, l]) => `<button type="button" data-v="${v}" aria-checked="${String(v) === String(val)}">${esc(l)}</button>`).join('')}</div>`;
  $('#panel').innerHTML = `
    ${ergebnis || ''}
    <div class="card">
      ${ergebnis ? '' : `<div class="logo">${LOGO}</div>`}
      <h2>${ergebnis ? 'Nochmal?' : 'Alle Hände voll!'}</h2>
      ${ergebnis ? '' : '<p>Im Klassenspiel rufst du deinem Team Aufgaben zu, und wer den passenden Knopf hat, drückt ihn. <b>Hier übst du allein:</b> Alle Knöpfe liegen auf deinem Handy.</p>'}
      <div class="settings">
        <div><div class="lbl">Schwierigkeit</div>${seg('schwierigkeit', Object.entries(SCHWIERIGKEIT).map(([k, v]) => [k, v.name]), einst.schwierigkeit)}<p class="hint" id="stufeText">${esc(stufe(einst.schwierigkeit).kurz)}</p></div>
        <div><div class="lbl">Aufgaben</div>${seg('modus', Object.entries(MODI).map(([k, v]) => [k, v.name]), einst.modus)}<p class="hint" id="modusText">${esc(MODI[einst.modus].kurz)}</p></div>
        <div><div class="lbl">Dauer</div>${seg('dauer', DAUERN.map(s => [s, s === 60 ? '1 Minute' : s === 90 ? '1,5 Min.' : '2 Minuten']), einst.dauer)}</div>
        <div><div class="lbl">Themen</div><div class="seg multi c2" data-name="themen">${THEMEN.map(t => `<button type="button" data-t="${t.id}" aria-pressed="${einst.themen.includes(t.id)}"><span class="sym">${symbol(t.id)}</span>${esc(t.name)}</button>`).join('')}</div></div>
        <div><div class="lbl">Ausbildungsjahr (Medikamente)</div>${seg('medAJ', Object.entries(MED_AJ), einst.medAJ)}</div>
        <div><div class="lbl">Assessment</div>${seg('assessment', Object.entries(ASSESS_WAHL).map(([k, v]) => [k, v.name + ': ' + v.kurz]), einst.assessment)}</div>
      </div>
      <p class="hint" id="rekord">${rekord ? `Dein Rekord hier: <b>${rekord} Punkte</b>` : 'Noch kein Rekord mit diesen Einstellungen.'}</p>
      <button class="big-btn" id="btnGo">Los geht’s!</button>
    </div>
    <div class="card"><h3>Zum Nachlesen: alle Situationen</h3>
      ${THEMEN.map(t => { const list = I.situationen.filter(s => I.byId.get(s.ziele[0][0]).thema === t.id); return list.length ? `<details class="lern"><summary><span class="sym">${symbol(t.id)}</span>${esc(t.name)} <small>(${list.length})</small></summary><ul class="loesungen">${list.map(s => `<li><span>${esc(s.text)}</span><b>→ ${esc(zieleText(s.ziele, I.byId))}</b></li>`).join('')}</ul></details>` : ''; }).join('')}
      <details class="lern"><summary><span class="sym">${symbol('medikamente')}</span>Medikamente: Welcher Wirkstoff gehört wohin? <small>(${MEDIKAMENTE.length})</small></summary><ul class="loesungen">${I.katalog.filter(c => c.art === 'medikament').map(c => `<li><span><b>${esc(c.name)}</b> (${c.aj}. AJ)</span><span>${c.wirkstoffe.map(w => `${esc(w.name)} ${esc(w.dosen.join(' / '))} · ${esc(w.zeiten.join(', '))}`).join('<br>')}</span></li>`).join('')}</ul>
        <p class="hint">Alle Dosen und Zeitpunkte sind Übungsbeispiele.</p></details>
      <details class="lern"><summary><span class="sym">${symbol('prophylaxen')}</span>Prophylaxen: Welche Maßnahme gehört wohin? <small>(${PROPHYLAXEN.length})</small></summary><ul class="loesungen">${I.katalog.filter(c => c.art === 'prophylaxe').map(c => `<li><span><b>${esc(c.titel)}</b></span><span>${c.massnahmen.map(m => esc(m.name) + (m.werte.length ? ' ' + esc(m.werte.join(' / ')) + ' ' + esc(m.einheit === 'Stunden' ? '(Abstand in Stunden)' : m.einheit) : '')).join('<br>')}</span></li>`).join('')}</ul>
        <p class="hint">Alle Zahlen sind Übungsbeispiele.</p></details>
      <details class="lern"><summary><span class="sym">${symbol('pflegeprozess')}</span>Pflegeprozess und Assessment <small>(${ASSESSMENTS.length + 1})</small></summary><ul class="loesungen">
        <li><span><b>Pflegeprozess</b> (6 Schritte)</span><span>${I.byId.get('pflegeprozess').stufen.map((x, i) => `${i + 1}. ${esc(x)}`).join('<br>')}</span></li>
        ${ASSESSMENTS.map(a => `<li><span><b>${esc(a.name)}</b> (${esc(a.wofuer)})</span><span>${a.einordnung.map(([n, v, b]) => `${v}–${b}: ${esc(n)}`).join('<br>')}</span></li>`).join('')}</ul>
        <p class="hint">Die Grenzwerte sind Übungsbeispiele.</p></details>
    </div>
    <div class="card"><p>Mit der ganzen Klasse spielen? Die Lehrkraft öffnet <b>${esc(location.host)}/lehrer</b> am Beamer, ihr scannt den QR-Code.</p></div>
    <p class="foot">© 2026 Sven Klawitter · Alle Grafiken sind eigene Zeichnungen.</p>`;
  $('#panel').querySelectorAll('.seg[data-name="modus"] button, .seg[data-name="dauer"] button, .seg[data-name="medAJ"] button, .seg[data-name="assessment"] button, .seg[data-name="schwierigkeit"] button').forEach(b => {
    b.onclick = () => {
      const name = b.parentElement.dataset.name;
      b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
      einst[name] = ['modus', 'assessment', 'schwierigkeit'].includes(name) ? b.dataset.v : Number(b.dataset.v);
      store('stationsteam.ueben', einst);
      $('#modusText').textContent = MODI[einst.modus].kurz;
      $('#stufeText').textContent = stufe(einst.schwierigkeit).kurz;
      const rek = store(rekordKey()) || 0;
      $('#rekord').innerHTML = rek ? `Dein Rekord hier: <b>${rek} Punkte</b>` : 'Noch kein Rekord mit diesen Einstellungen.';
    };
  });
  $('#panel').querySelectorAll('.seg[data-name="themen"] button').forEach(b => {
    b.onclick = () => {
      const an = new Set(einst.themen);
      if (an.has(b.dataset.t)) { if (an.size === 1) return; an.delete(b.dataset.t); } else an.add(b.dataset.t);
      einst.themen = THEMEN.map(t => t.id).filter(t => an.has(t));
      b.parentElement.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(einst.themen.includes(x.dataset.t))));
      store('stationsteam.ueben', einst);
    };
  });
  $('#btnGo').onclick = start;
}

// ---------------------------------------------------------------- Spiel
// Ein Pult für eine Person: bei Situationen zuerst passende Elemente, dann auffüllen
// (höchstens 2 breite Elemente und 1 aus dem Stationsalltag)
function soloPult(anteil) {
  const an = new Set(einst.themen), ids = [];
  let nBreit = 0, nLustig = 0;
  // Gruppen (Patientenedukation, Medikamente): zusammen höchstens 2, außer es ist nur ein Thema gewählt
  const nurEinThema = einst.themen.length === 1;
  const gruppen = {};
  let nGruppe = 0, nListe = 0;
  const maxListen = nurEinThema ? Infinity : stufe(einst.schwierigkeit).maxListen || Infinity; // „Sehr leicht“: höchstens eine Liste
  const nimm = id => {
    const c = I.byId.get(id);
    if (!c || ids.includes(id) || ids.length >= proPult()) return;
    if ((breit(c) && nBreit >= 2) || (c.lustig && nLustig >= 1)) return;
    if (c.gruppe && !nurEinThema && ((gruppen[c.gruppe] || 0) >= 2 || nGruppe >= GRUPPE_PRO_HANDY)) return;
    if (istListe(c) && nListe >= maxListen) return;
    if (c.aj > einst.medAJ || (c.modus && c.modus !== einst.assessment)) return;
    if (breit(c)) nBreit++;
    if (c.lustig) nLustig++;
    if (c.gruppe) { gruppen[c.gruppe] = (gruppen[c.gruppe] || 0) + 1; nGruppe++; }
    if (istListe(c)) nListe++;
    ids.push(id);
  };
  if (anteil > 0) {
    const sits = mischen(I.situationen.filter(s => an.has(I.byId.get(s.ziele[0][0]).thema)), r);
    for (const s of sits) { if (ids.length >= Math.ceil(proPult() * Math.min(1, anteil + 0.2))) break; nimm(s.ziele[0][0]); }
  }
  for (const c of pool(einst.themen, I.katalog, r, undefined, einst.medAJ, [], einst.assessment)) nimm(c.id);
  return ids;
}

function neuesPult() {
  G.ids = soloPult(G.anteil);
  G.zustand = startZustand(G.ids, I.byId, r);
  G.seit = 0;
  const pult = G.ids.map(id => I.byId.get(id));
  G.pult = erstellePult($('#pult'), { pult, zustand: G.zustand, onTun, ohneNummern: 1 >= stufe(einst.schwierigkeit).ohneAb });
}

function naechste(pause) {
  G.aid++;
  G.auf = neueAufgabe({
    pult: { ich: G.ids }, zustand: G.zustand, auf: {}, holder: 'ich', online: null, anteil: G.anteil, k: 1, tempoF: stufeK(einst.schwierigkeit, 0).f, ohneAb: stufe(einst.schwierigkeit).ohneAb,
    byId: I.byId, situationen: I.situationen, kuerzlich: G.kuerzlich, letzte: G.letzte, r, now: Date.now(), pause, id: G.aid,
  });
  if (G.auf) {
    G.letzte = G.auf.ziele[0][0];
    if (G.auf.sid) { G.kuerzlich.push(G.auf.sid); if (G.kuerzlich.length > 12) G.kuerzlich.shift(); }
  }
  if (G.auf) G.auf.tippAb = stufe(einst.schwierigkeit).tippAb;
  auftragZeigen(G.auf, 0, true);
}

function start() {
  const anteil = MODI[einst.modus].anteil;
  G = { anteil, startAt: Date.now() + 3200, endAt: Date.now() + 3200 + einst.dauer * 1000, punkte: 0, ok: 0, fg: 0, vp: 0, aid: 0, kuerzlich: [], letzte: null, verpasst: [], raf: 0, vorbei: false };
  spielfeldZeigen(true);
  wachHalten(true);
  $('#aMeldung').hidden = true;
  neuesPult();
  G.aid++;
  naechste(3200);
  leiste();
  G.raf = requestAnimationFrame(loop);
}

function leiste() {
  $('#sProzent').textContent = G.punkte + ' Punkte';
}

function loop() {
  if (!G || G.vorbei) return;
  const now = Date.now();
  const vor = G.startAt - now;
  if (vor > 0) countdown(Math.ceil(vor / 1000), 'Gleich geht’s los!'); else countdown(null);
  G.pult.sperren(vor > 0);
  $('#sUhr').textContent = '⏱ ' + mmss(Math.min(G.endAt - now, G.endAt - G.startAt));
  if (now >= G.endAt) return ende();
  if (auftragTick(now)) {
    const a = aktuellerAuftrag();
    if (a && G.auf && a.id === G.auf.id) {
      G.vp++;
      if (a.art === 's' && !G.verpasst.some(v => v.text === a.text)) G.verpasst.push({ text: a.text, loesung: a.tipp });
      meldung(`⏰ Zu spät!<small>Richtig wäre: <b>${esc(a.tipp)}</b></small>`, 'bad', a.art === 's' ? 3300 : 1400, now);
      vibrieren([80, 60, 80]);
      zaehle();
      naechste(a.art === 's' ? PAUSE_VERPASST_SIT : PAUSE_VERPASST);
    }
  }
  G.raf = requestAnimationFrame(loop);
}

function zaehle() {
  G.seit++;
  if (G.seit >= NEUES_PULT_NACH) { neuesPult(); blase('Neues Zimmer, neues Pult!', 'info'); }
}

function onTun(id, w) {
  if (!G || G.vorbei) return;
  const c = I.byId.get(id);
  if (hatZustand(c)) G.zustand[id] = w;
  const now = Date.now();
  const hit = G.auf && trefferSuchen({ ich: G.auf }, id, w, now);
  if (hit) {
    G.punkte += PUNKTE_TREFFER; G.ok++;
    G.pult.blitz(id, true);
    meldung('✓ Richtig! +2', 'ok', 800, now);
    vibrieren(40);
    zaehle();
    naechste(PAUSE_OK);
  } else {
    G.punkte += PUNKTE_FEHLGRIFF; G.fg++;
    G.pult.blitz(id, false);
    blase('✗ Falscher Knopf −1', 'bad');
    vibrieren([60, 40, 60]);
  }
  leiste();
}

let blaseT = 0;
function blase(text, art) {
  const b = $('#blase');
  b.className = 'blase ' + art; b.textContent = text; b.hidden = false;
  clearTimeout(blaseT); blaseT = setTimeout(() => { b.hidden = true; }, 1300);
}

function ende() {
  G.vorbei = true;
  cancelAnimationFrame(G.raf);
  countdown(null);
  vibrieren(200);
  const alt = store(rekordKey()) || 0;
  const neu = G.punkte > alt;
  if (neu) store(rekordKey(), G.punkte);
  const erg = `<div class="card ${neu ? 'good' : ''}">
      <p class="eyebrow">Zeit um!</p>
      <h2>${neu ? 'Neuer Rekord! 🎉' : 'Geschafft!'}</h2>
      <div class="bigstat"><b>${G.punkte}</b><span>Punkte</span></div>
      <p><b>${G.ok}</b> richtig · <b>${G.vp}</b> verpasst · <b>${G.fg}</b> falsche Knöpfe</p>
      ${!neu && alt ? `<p class="hint">Dein Rekord: ${alt} Punkte</p>` : ''}
    </div>
    ${G.verpasst.length ? `<div class="card"><h3>Diese Situationen hast du verpasst</h3><ul class="loesungen">${G.verpasst.map(v => `<li><span>${esc(v.text)}</span><b>→ ${esc(v.loesung)}</b></li>`).join('')}</ul></div>` : ''}`;
  menue(erg);
  window.scrollTo(0, 0);
}

menue();
