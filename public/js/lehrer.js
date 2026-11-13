// Beamer-Seite der Lehrkraft: Anmeldung mit QR-Code, Stationen, Schichten mit Live-Fortschritt, Übergabe, Siegerehrung
import { KNet, randomCode, randomId, store } from './net.js';
import { esc } from './pult.js';
import { TEAM_GROESSEN, DAUERN, dauerText, SCHWIERIGKEIT, ANWEISUNGEN, SCHICHTEN, STANDARD_CFG, WAHLEN, STOER_WAHL, EREIGNISSE, MED_AJ, ASSESS_WAHL, stationFarbe, schichtText } from './regeln.js';
import { THEMEN, MEDIKAMENTE } from './inhalte.js';
import { symbol, SCHICHT_SYMBOL } from './bilder.js';
import { Ton } from './ton.js';

const $ = s => document.querySelector(s);
const view = $('#view'), netdot = $('#netdot'), codeChip = $('#codeChip'), toastEl = $('#toast');

let sess = store('stationsteam.lehrer');
let net = null, room = null, screen = '';
// Gespeicherte Einstellungen. Ältere Fassungen bekommen die neuen Voreinstellungen
// (Fassung 2: „Nur Anweisungen“ und Störungen „Aus“, Fassung 3: Schwierigkeit „Sehr leicht“).
const CFG_VERSION = 4; // Fassung 4: Schwierigkeit „Ultra leicht“
const gespeichert = store('stationsteam.lehrer.cfg') || {};
if ((gespeichert.v || 1) < 2) { delete gespeichert.anweisungen; delete gespeichert.stoerungen; }
if ((gespeichert.v || 1) < 4) delete gespeichert.schwierigkeit;
let cfg = Object.assign({}, STANDARD_CFG, gespeichert, { v: CFG_VERSION });
if (!TEAM_GROESSEN.includes(Number(cfg.groesse))) cfg.groesse = STANDARD_CFG.groesse;
if (!DAUERN.includes(Number(cfg.dauer))) cfg.dauer = STANDARD_CFG.dauer;
if (!SCHWIERIGKEIT[cfg.schwierigkeit]) cfg.schwierigkeit = STANDARD_CFG.schwierigkeit;
delete cfg.tempo; // früher „Tempo“, jetzt „Schwierigkeit“
if (!ANWEISUNGEN[cfg.anweisungen]) cfg.anweisungen = STANDARD_CFG.anweisungen;
if (!WAHLEN[cfg.wahl]) cfg.wahl = STANDARD_CFG.wahl;
if (!STOER_WAHL[cfg.stoerungen]) cfg.stoerungen = STANDARD_CFG.stoerungen;
cfg.medAJ = Number(cfg.medAJ); if (!MED_AJ[cfg.medAJ]) cfg.medAJ = STANDARD_CFG.medAJ;
if (!ASSESS_WAHL[cfg.assessment]) cfg.assessment = STANDARD_CFG.assessment;
cfg.themen = (Array.isArray(cfg.themen) ? cfg.themen : []).filter(t => THEMEN.some(x => x.id === t));
if (!cfg.themen.length) cfg.themen = THEMEN.map(t => t.id);
const bekannt = new Set(); // Namen in der Anmeldung, die schon angezeigt wurden
let auswahl = null;        // ausgewählter Name zum Verschieben
const serverNow = () => net ? net.serverNow() : Date.now();
const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const kurzDauer = s => s === 90 ? '1,5 Min.' : s % 60 ? s + ' s' : s / 60 + ' Min.';

// ---------------------------------------------------------------- Ton & Werkzeuge
Ton.an = store('stationsteam.ton') !== false;
const btnTon = $('#btnTon');
function tonText() { btnTon.textContent = Ton.an ? 'Ton: an' : 'Ton: aus'; btnTon.setAttribute('aria-pressed', String(Ton.an)); }
tonText();
btnTon.onclick = () => { Ton.init(); Ton.an = !Ton.an; store('stationsteam.ton', Ton.an); tonText(); };
document.addEventListener('pointerdown', () => Ton.init(), { capture: true });
document.addEventListener('keydown', () => Ton.init(), { capture: true });
$('#btnFull').onclick = vollbild;
function vollbild() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
}
$('#btnSess').onclick = () => { $('#dlgCode').textContent = sess.code; $('#dlg').hidden = false; };
$('#btnTest').onclick = testansicht;
// Testlauf allein: Die Handys der Computer-Mitspieler erscheinen in einem eigenen Fenster
function testansicht() {
  const w = window.open('/testansicht', 'stationsteam-testansicht', 'popup,width=1280,height=860');
  if (!w) toast('Das Fenster wurde blockiert. Bitte Pop-ups für diese Seite erlauben und noch einmal klicken.');
  else w.focus();
}
const cpu = (p, html) => p.bot ? `<span class="cpuico" title="Computer-Mitspieler">${symbol('robo')}</span>${html}` : html;
$('#btnDlgClose').onclick = () => { $('#dlg').hidden = true; };
$('#btnNewSess').onclick = () => { $('#dlg').hidden = true; newSession(); };
$('#btnWipe').onclick = () => { $('#dlg').hidden = true; send({ t: 'wipe' }); setTimeout(newSession, 600); };

let toastT = 0;
function toast(t) { toastEl.textContent = t; toastEl.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { toastEl.hidden = true; }, 4500); }

// ---------------------------------------------------------------- Verbindung
function newSession() {
  sess = { code: randomCode(5), key: randomId(24) };
  store('stationsteam.lehrer', sess);
  room = null; screen = '';
  connect();
}
function connect() {
  if (net) net.close();
  codeChip.hidden = false; codeChip.textContent = 'Code ' + sess.code;
  net = KNet({
    code: sess.code, params: { role: 'teacher', key: sess.key },
    onMessage,
    onStatus: s => { netdot.dataset.s = s; if (s === 'offline' && net.stopped === 'code-taken') newSession(); },
  });
  net.open();
}
function onMessage(m) {
  if (typeof m.now === 'number' && net.rtt > 5000) net.offset = m.now - Date.now();
  switch (m.t) {
    case 'room': room = m; render(); break;
    case 'error':
      if (m.why === 'code-taken') newSession();
      else if (m.why === 'no-players') toast('Es hat sich noch niemand angemeldet.');
      break;
    case 'ended': room = null; screen = ''; break;
  }
}
function send(obj) { if (net && !net.send(obj, true)) toast('Keine Verbindung zum Server. Der Befehl wird gesendet, sobald die Verbindung wieder steht.'); }

function joinUrl() { return location.origin + '/mitspielen?c=' + sess.code; }
function drawQR(canvas, text) {
  const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make();
  const n = qr.getModuleCount(), q = 2, s = Math.max(4, Math.floor(512 / (n + 2 * q)));
  canvas.width = canvas.height = (n + 2 * q) * s;
  const g = canvas.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, canvas.width, canvas.height);
  g.fillStyle = '#0c1b2b';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) g.fillRect((c + q) * s, (r + q) * s, s, s);
}

// ---------------------------------------------------------------- Bausteine
function seg(name, options, value, onPick) {
  const w = document.createElement('div');
  w.className = 'seg'; w.setAttribute('role', 'radiogroup'); w.setAttribute('aria-label', name);
  for (const [val, label] of options) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(val === value)); b.textContent = label;
    b.onclick = () => { w.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b))); onPick(val); };
    w.appendChild(b);
  }
  return w;
}
function setCfg(part) {
  Object.assign(cfg, part);
  store('stationsteam.lehrer.cfg', cfg);
  send({ t: 'cfg', cfg });
}
function optionen(el) {
  el.innerHTML = '';
  const add = (lbl, node, desc) => {
    const l = document.createElement('div'); l.className = 'lbl'; l.textContent = lbl;
    el.append(l, node);
    if (desc != null) { const d = document.createElement('div'); d.className = 'desc'; d.id = 'desc-' + lbl; d.textContent = desc; el.appendChild(d); }
    return node;
  };
  const desc = (lbl, t) => { const d = document.getElementById('desc-' + lbl); if (d) d.textContent = t; };
  add('Stationen', seg('Personen pro Station', TEAM_GROESSEN.map(n => [n, n + ' Personen']), cfg.groesse, groesse => setCfg({ groesse })), 'So viele Personen spielen zusammen an einer Station (ungefähr).');
  add('Einteilung', seg('Einteilung der Stationen', Object.entries(WAHLEN).map(([k, v]) => [k, v.name]), cfg.wahl, wahl => { setCfg({ wahl }); desc('Einteilung', WAHLEN[wahl].kurz); }), WAHLEN[cfg.wahl].kurz);
  add('Schicht', seg('Dauer einer Schicht', DAUERN.map(s => [s, kurzDauer(s)]), cfg.dauer, dauer => { setCfg({ dauer }); desc('Schicht', dauerKurz()); }), dauerKurz());
  add('Aufgaben', seg('Anweisungen', Object.entries(ANWEISUNGEN).map(([k, v]) => [k, v.name]), cfg.anweisungen, anweisungen => { setCfg({ anweisungen }); desc('Aufgaben', ANWEISUNGEN[anweisungen].kurz); }), ANWEISUNGEN[cfg.anweisungen].kurz);
  add('Störungen', seg('Störungen', Object.entries(STOER_WAHL).map(([k, v]) => [k, v.name]), cfg.stoerungen, stoerungen => { setCfg({ stoerungen }); desc('Störungen', STOER_WAHL[stoerungen].kurz); }), STOER_WAHL[cfg.stoerungen].kurz);
  add('Schwierigkeit', seg('Schwierigkeit', Object.entries(SCHWIERIGKEIT).map(([k, v]) => [k, v.name]), cfg.schwierigkeit, schwierigkeit => { setCfg({ schwierigkeit }); desc('Schwierigkeit', SCHWIERIGKEIT[schwierigkeit].kurz); }), SCHWIERIGKEIT[cfg.schwierigkeit].kurz);
  const th = document.createElement('div');
  th.className = 'seg multi'; th.setAttribute('role', 'group'); th.setAttribute('aria-label', 'Themen');
  for (const t of THEMEN) {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.t = t.id; b.setAttribute('aria-pressed', String(cfg.themen.includes(t.id)));
    b.innerHTML = `<span class="sym">${symbol(t.id)}</span>${esc(t.name)}`;
    b.onclick = () => {
      const an = new Set(cfg.themen);
      if (an.has(t.id)) { if (an.size === 1) return toast('Mindestens ein Thema muss an sein.'); an.delete(t.id); } else an.add(t.id);
      const themen = THEMEN.map(x => x.id).filter(x => an.has(x));
      th.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(themen.includes(x.dataset.t))));
      setCfg({ themen });
    };
    th.appendChild(b);
  }
  add('Themen', th, 'Bedienelemente aus diesen Themen kommen zuerst. Reichen sie nicht, kommen andere dazu.');
  // Ausbildungsjahr (Medikamente) und Stufe der Assessments direkt unter den Themen (spart Zeilen)
  const mz = document.createElement('div');
  mz.className = 'desc medzeile';
  const mt = document.createElement('span');
  const medZeigen = () => { const list = MEDIKAMENTE.filter(m => m.aj <= cfg.medAJ).map(m => m.name); mt.textContent = list.length + ' Medikamenten-Kategorien'; mt.title = list.join(', '); };
  mt.className = 'medtext'; medZeigen();
  const b1 = document.createElement('b'); b1.textContent = 'Ausbildungsjahr:';
  const b2 = document.createElement('b'); b2.textContent = 'Assessment:'; b2.title = 'Einfach: Punktzahl eintragen. Schwer: Ergebnis einordnen (z. B. 11 Punkte → hohes Risiko).';
  mz.append(b1, seg('Ausbildungsjahr', Object.entries(MED_AJ).map(([k, v]) => [Number(k), v]), cfg.medAJ, medAJ => { setCfg({ medAJ }); medZeigen(); }), mt,
    b2, seg('Assessment', Object.entries(ASSESS_WAHL).map(([k, v]) => [k, v.name]), cfg.assessment, assessment => setCfg({ assessment })));
  el.appendChild(mz);
}

function dauerKurz() { return `Drei Schichten: Früh-, Spät- und Nachtdienst, jede ${dauerText(cfg.dauer)} lang. Dazwischen ist Übergabe.`; }

function bigCount(num, text) {
  let el = $('#bigcount');
  if (num == null) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement('div'); el.id = 'bigcount'; el.className = 'bigcount'; document.body.appendChild(el); }
  el.innerHTML = `<div><b>${num}</b><span>${esc(text || '')}</span></div>`;
}
function banner(html, cls, ms) {
  const old = $('#banner'); if (old) old.remove();
  const b = document.createElement('div');
  b.id = 'banner'; b.className = 'banner ' + (cls || '');
  b.innerHTML = html;
  document.body.appendChild(b);
  setTimeout(() => { if (b.isConnected) b.remove(); }, ms || 2600);
}
const aktiveTeams = () => room.teams.filter(t => t.mitglieder.length);

// ---------------------------------------------------------------- Bildschirme
function render() {
  if (!room) return;
  $('#btnTest').hidden = !room.players.some(p => p.bot);
  if (room.phase !== 'schicht') stopSchicht();
  if (room.phase !== 'wahl') stopWahl();
  switch (room.phase) {
    case 'lobby': return lobby();
    case 'wahl': return wahl();
    case 'teams': return teams();
    case 'schicht': return schicht();
    case 'uebergabe': return uebergabe();
    case 'ende': return ende();
  }
}

function lobby() {
  if (screen !== 'lobby') {
    screen = 'lobby';
    view.innerHTML = `<div class="tpage"><div class="lobby">
      <div class="tcard joinbox">
        <h2>Mitspielen!</h2>
        <canvas id="qr" class="qr" role="img" aria-label="QR-Code zum Mitspielen"></canvas>
        <div class="joinurl">${esc(location.host)}/mitspielen</div>
        <div>Code: <span class="joincode">${esc(sess.code)}</span></div>
      </div>
      <div class="lobbyright">
        <div class="tcard namenkarte">
          <div class="thead"><h2 id="nameCount">Angemeldet</h2></div>
          <div class="names" id="names"></div>
        </div>
        <div class="tcard optkarte"><div class="optgrid" id="opts"></div></div>
        <div class="warnbox" id="warn" hidden></div>
        <div class="tactions">
          <p class="hint grow">Erst werden Stationen (Teams) ausgelost. Dann spielt jede Station drei Schichten: Früh-, Spät- und Nachtdienst.</p>
          <button class="ghost-btn" id="btnCpu" title="Zum Ausprobieren allein: drei Computer-Mitspieler machen mit"></button>
          <button class="big-btn" id="btnStart">Stationen bilden <span class="kbd">Enter</span></button>
        </div>
      </div>
    </div></div>`;
    drawQR($('#qr'), joinUrl());
    optionen($('#opts'));
    $('#btnStart').onclick = teamsBilden;
    $('#btnCpu').onclick = () => {
      if (room && room.players.some(p => p.bot)) return send({ t: 'computer', an: false });
      send({ t: 'computer', an: true });
      testansicht();
    };
  }
  const ps = room.players;
  const mitCpu = ps.some(p => p.bot);
  $('#btnCpu').innerHTML = mitCpu ? 'Computer entfernen' : `<span class="cpuico">${symbol('robo')}</span> Testlauf allein`;
  $('#nameCount').textContent = ps.length ? `Angemeldet: ${ps.length}` : 'Angemeldet';
  $('#names').innerHTML = ps.length ? ps.map(p => `<span class="name ${p.online ? '' : 'off'} ${bekannt.has(p.pid) ? '' : 'neu'} ${p.bot ? 'cpu' : ''}">${cpu(p, esc(p.name))}<button class="x" data-pid="${esc(p.pid)}" title="${esc(p.name)} entfernen" aria-label="${esc(p.name)} entfernen">×</button></span>`).join('')
    : '<p class="empty">Noch niemand da. Scannt den QR-Code und gebt euren Namen ein.</p>';
  $('#names').classList.toggle('viele', ps.length > 16);
  ps.forEach(p => bekannt.add(p.pid));
  $('#names').querySelectorAll('.x').forEach(b => { b.onclick = () => send({ t: 'kick', pid: b.dataset.pid }); });
  $('#btnStart').disabled = !ps.length;
  const w = $('#warn');
  w.hidden = !room.warnungen.length;
  w.innerHTML = room.warnungen.length ? `<b>Hinweis zur Datei inhalte.js:</b><ul>${room.warnungen.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : '';
}
function teamsBilden() {
  if (!room || !room.players.length) return toast('Es hat sich noch niemand angemeldet.');
  auswahl = null;
  send({ t: 'teams-bilden', cfg });
}

// Stationen als Karten mit Namen. Tauschen: Namen anklicken, dann die Station
function zeichneStationen(grid, max) {
  grid.className = 'stgrid n' + Math.min(10, room.teams.length);
  grid.innerHTML = room.teams.map(t => `<div class="stkarte ${auswahl ? 'ziel' : ''} ${max && t.mitglieder.length >= max ? 'voll' : ''}" data-i="${t.i}" style="--station:${stationFarbe(t.s)}">
      <h3><span class="dot"></span>${esc(t.name)}<small>${t.mitglieder.length}${max ? ' / ' + max : ''}</small></h3>
      <div class="mlist">${t.mitglieder.map(m => `<button type="button" class="mchip ${m.online ? '' : 'off'} ${m.zugeteilt ? 'zug' : ''} ${auswahl === m.pid ? 'sel' : ''}" data-pid="${esc(m.pid)}" title="${m.zugeteilt ? 'zugelost: muss sich zur Station setzen' : ''}">${m.zugeteilt ? '↪ ' : ''}${cpu(m, esc(m.name))}</button>`).join('') || '<span class="empty">noch leer</span>'}</div>
    </div>`).join('');
  grid.querySelectorAll('.mchip').forEach(b => {
    b.onclick = e => { e.stopPropagation(); auswahl = auswahl === b.dataset.pid ? null : b.dataset.pid; render(); };
  });
  grid.querySelectorAll('.stkarte').forEach(k => {
    k.onclick = () => { if (!auswahl) return; send({ t: 'verschieben', pid: auswahl, team: Number(k.dataset.i) }); auswahl = null; };
  });
}
// Wer hat noch keine Station?
function ohneListe(el, text) {
  const ohne = room.players.filter(p => p.team < 0);
  el.hidden = !ohne.length;
  el.innerHTML = ohne.length ? `<b>${esc(text)} (${ohne.length}):</b> ${ohne.map(p => `<button type="button" class="mchip ${p.online ? '' : 'off'} ${auswahl === p.pid ? 'sel' : ''}" data-pid="${esc(p.pid)}">${esc(p.name)}</button>`).join('')}` : '';
  el.querySelectorAll('.mchip').forEach(b => { b.onclick = () => { auswahl = auswahl === b.dataset.pid ? null : b.dataset.pid; render(); }; });
}

// ---------------------------------------------------------------- Stationen selbst wählen (60 Sekunden)
let WB = null;
function stopWahl() { if (WB) { clearInterval(WB.timer); clearInterval(WB.tick); WB = null; } }
function wahl() {
  if (screen !== 'wahl' || !WB) {
    stopWahl();
    screen = 'wahl';
    auswahl = null;
    view.innerHTML = `<div class="tpage">
      <div class="shead">
        <div class="sinfo"><span class="schsym gross">${symbol('team')}</span><div><h2>Stationen wählen</h2>
          <p>Wählt auf dem Handy eine Station mit euren <b>Sitznachbarn</b>. Ihr müsst euch gut hören können! Höchstens <b id="wMax"></b> Personen pro Station.</p></div></div>
        <div class="stimer" id="wTimer"></div>
        <canvas id="qrSmall" class="qr small" role="img" aria-label="QR-Code für Nachzügler"></canvas>
      </div>
      <div class="stgrid" id="stgrid"></div>
      <div class="ohne" id="ohne" hidden></div>
      <div class="tactions"><p class="hint grow">Wer am Ende keine Station hat, wird in die kleinsten Stationen gelost. Leere Stationen fallen weg.</p>
        <button class="ghost-btn" id="btnLobby">Zurück zur Anmeldung <span class="kbd">Esc</span></button>
        <button class="ghost-btn" id="btnPlus">+30 Sekunden</button>
        <button class="big-btn" id="btnVert">Jetzt verteilen <span class="kbd">Enter</span></button></div>
    </div>`;
    drawQR($('#qrSmall'), joinUrl());
    $('#btnLobby').onclick = toLobby;
    $('#btnPlus').onclick = () => send({ t: 'wahl-plus' });
    $('#btnVert').onclick = verteilen;
    WB = { letzte: -1 };
    const loop = () => {
      if (!room || room.phase !== 'wahl' || !room.wahl) return;
      const rest = room.wahl.endAt - serverNow(), el = $('#wTimer');
      if (rest > 0) {
        el.className = 'stimer' + (rest <= 10000 ? ' knapp' : '');
        el.innerHTML = `${mmss(rest)}<small>NOCH</small>`;
        const sek = Math.ceil(rest / 1000);
        if (sek <= 5 && WB.letzte !== sek) { WB.letzte = sek; Ton.monitor(); }
      } else { el.className = 'stimer um'; el.innerHTML = 'Zeit um!<small>VERTEILEN …</small>'; }
    };
    WB.timer = setInterval(loop, 200);
    loop();
    // Jede Sekunde dem Server Bescheid geben (er verteilt, wenn die Zeit um ist)
    WB.tick = setInterval(() => { if (room && room.phase === 'wahl' && room.wahl && serverNow() >= room.wahl.endAt) send({ t: 'tick' }); }, 1000);
  }
  $('#wMax').textContent = room.wahlMax;
  zeichneStationen($('#stgrid'), room.wahlMax);
  ohneListe($('#ohne'), 'Noch ohne Station');
}
function verteilen() { Ton.init(); send({ t: 'verteilen' }); }

function teams() {
  if (screen !== 'teams') {
    screen = 'teams';
    auswahl = null;
    view.innerHTML = `<div class="tpage">
      <div class="thead"><div><h2>Stationen</h2><p id="tHint"></p></div>
        <div class="tools"><button class="ghost-btn" id="btnWahl">Nochmal selbst wählen</button><button class="ghost-btn" id="btnMix">Zufällig neu auslosen</button></div></div>
      <div class="stgrid" id="stgrid"></div>
      <div class="ohne" id="ohne" hidden></div>
      <div class="tactions"><canvas id="qrSmall" class="qr small" role="img" aria-label="QR-Code für Nachzügler"></canvas>
        <p class="hint grow" id="tNach"></p>
        <button class="ghost-btn" id="btnLobby">Zurück zur Anmeldung <span class="kbd">Esc</span></button>
        <button class="big-btn" id="btnGo">${esc(SCHICHTEN[0].name)} starten <span class="kbd">Enter</span></button></div>
    </div>`;
    drawQR($('#qrSmall'), joinUrl());
    $('#btnMix').onclick = () => { if (confirm('Alle Stationen zufällig neu auslosen? Dann müssen sich viele umsetzen.')) send({ t: 'teams-bilden', cfg, modus: 'zufall' }); };
    $('#btnWahl').onclick = () => { if (confirm('Alle wählen ihre Station noch einmal selbst (60 Sekunden)?')) send({ t: 'teams-bilden', cfg, modus: 'selbst' }); };
    $('#btnLobby').onclick = toLobby;
    $('#btnGo').onclick = schichtStart;
  }
  const zug = room.teams.some(t => t.mitglieder.some(m => m.zugeteilt));
  $('#tHint').innerHTML = (zug ? 'Wer mit <b>↪</b> markiert ist, wurde zugelost und setzt sich jetzt zu seiner Station. ' : 'Setzt euch nach Stationen zusammen! ') + 'Tauschen: erst einen Namen anklicken, dann die neue Station.';
  $('#tNach').textContent = room.teamModus === 'selbst' ? 'Wer jetzt noch dazukommt, wählt seine Station auf dem Handy.' : 'Wer jetzt noch dazukommt, landet automatisch in der kleinsten Station.';
  zeichneStationen($('#stgrid'), 0);
  ohneListe($('#ohne'), 'Noch ohne Station');
}
function schichtStart() {
  Ton.init();
  send({ t: 'schicht-start', cfg });
}
function toLobby() {
  if (!confirm('Zurück zur Anmeldung? Alle bleiben angemeldet, Stationen und Punkte werden gelöscht.')) return;
  send({ t: 'to-lobby' });
}

// ---------------------------------------------------------------- Schicht
let SB = null; // { nr, timer, tick, hundert: Set, piep }
function stopSchicht() {
  if (!SB) return;
  clearInterval(SB.timer); clearInterval(SB.tick);
  bigCount(null);
  SB = null;
}
function schicht() {
  const sp = room.spiel;
  if (!SB || SB.nr !== sp.nr || screen !== 'schicht:' + sp.nr) {
    stopSchicht();
    screen = 'schicht:' + sp.nr;
    const S = SCHICHTEN[sp.k];
    view.innerHTML = `<div class="tpage">
      <div class="shead">
        <div class="sinfo"><span class="schsym gross">${symbol(SCHICHT_SYMBOL[sp.k])}</span><div><h2>${esc(S.name)} <small>Schicht ${sp.k + 1} von 3</small></h2><p>${esc(schichtText(sp.k, sp.anweisungen, room.cfg.themen, sp.schwierigkeit))}</p></div></div>
        <div class="stimer" id="sTimer"></div>
        <canvas id="qrSmall" class="qr small" role="img" aria-label="QR-Code für Nachzügler"></canvas>
      </div>
      <div class="evbox kennbox" id="kennbox" hidden></div>
      <div class="evbox" id="evbox" hidden></div>
      <div class="stbars" id="stbars"></div>
      <div class="tactions"><p class="hint grow"><span class="sym">${symbol('rufen')}</span> Ruft eure Aufgabe laut! Wer das passende Bedienelement hat, drückt es. Richtig: +2 Punkte, falscher Knopf: −1. <span class="ohnehint" id="ohneHint"></span></p>
        <button class="ghost-btn" id="btnEnd">Schicht beenden</button></div>
    </div>`;
    drawQR($('#qrSmall'), joinUrl());
    $('#btnEnd').onclick = () => {
      if (!room || !room.spiel || !room.spiel.open) return;
      if (confirm('Schicht jetzt beenden? Es zählen die Punkte bis jetzt.')) send({ t: 'schicht-ende', nr: room.spiel.nr });
    };
    SB = { nr: sp.nr, hundert: new Set(room.teams.filter(t => t.hundert).map(t => t.i)), piep: -1, key: '' };
    // Countdown, Restzeit, letzte 10 Sekunden
    const loop = () => {
      if (!room || room.phase !== 'schicht' || !SB) return;
      const now = serverNow(), g = room.spiel;
      const vor = g.startAt - now;
      kennenAnzeige(g, now);
      if (g.kennen) bigCount(null); // Kennenlernen („Sehr leicht“): erst danach der Countdown
      else if (vor > 0) {
        const s = Math.ceil(vor / 1000);
        bigCount(s <= 3 ? s : '…', S.name + ' beginnt! Alle schauen aufs Handy.');
        if (s <= 3 && SB.piep !== s) { SB.piep = s; Ton.piep(false); }
      } else {
        if (SB.piep > 0) { SB.piep = 0; Ton.gong(); }
        bigCount(null);
      }
      const rest = Math.min(g.endAt - g.startAt, g.endAt - now);
      const el = $('#sTimer');
      if (rest > 0) {
        el.className = 'stimer' + (rest <= 10000 ? ' knapp' : '');
        el.innerHTML = `${mmss(rest)}<small>NOCH</small>`;
        const s = Math.ceil(rest / 1000);
        if (s <= 10 && vor <= 0 && SB.letzte !== s) { SB.letzte = s; Ton.monitor(); }
      } else { el.className = 'stimer um'; el.innerHTML = 'Zeit um!<small>ÜBERGABE …</small>'; }
      ereignisAnzeige(g, now);
    };
    SB.timer = setInterval(loop, 200);
    loop();
    // Jede Sekunde dem Server Bescheid geben (abgelaufene Aufgaben, Schichtende)
    SB.tick = setInterval(() => { if (room && room.phase === 'schicht') send({ t: 'tick' }); }, 1000);
  }
  balken();
}

// Kennenlernen („Sehr leicht“): Stand jeder Station, Restzeit, „Jetzt starten“
function kennenAnzeige(g, now) {
  const box = $('#kennbox'); if (!box) return;
  if (!g.kennen) { if (!box.hidden) { box.hidden = true; box.dataset.html = ''; } return; }
  const teams = room.teams.filter(t => t.mitglieder.length);
  const rest = Math.max(0, Math.ceil((g.kennen.bisAt - now) / 1000));
  const name = (SCHICHTEN[g.k] || SCHICHTEN[0]).name;
  const html = `<div class="evtitel"><b>${g.kennen.k ? 'Neue Knöpfe' : 'Kennenlernen'}</b><span>Alle probieren auf dem Handy ihre ${g.kennen.k ? 'neuen' : 'eigenen'} Knöpfe aus. Wenn alle fertig sind, beginnt der ${esc(name)}.</span></div>
    <div class="evzeit">${rest} s</div>
    <div class="evchips">${teams.map(t => { const st = g.kennen.stand[t.i] || { fertig: 0, von: 0 }; return `<span class="evchip ${st.von && st.fertig >= st.von ? 'ok' : ''}" style="--station:${stationFarbe(t.s)}">${esc(t.name.replace(/^Station /, ''))} ${st.von && st.fertig >= st.von ? '✓' : st.fertig + '/' + st.von}</span>`; }).join('')}</div>
    <button class="big-btn" id="btnKennen">Jetzt starten <span class="kbd">Enter</span></button>`;
  box.hidden = false;
  if (box.dataset.html === html) return;
  box.dataset.html = html;
  box.innerHTML = html;
  box.querySelector('#btnKennen').onclick = () => send({ t: 'kennen-ende' });
}

// Gemeinsames Ereignis: Ankündigung mit Ton, Stand jeder Station, Bonus-Banner
function ereignisAnzeige(g, now) {
  const box = $('#evbox'); if (!box) return;
  const e = (g.ereignisse || []).find(x => now >= x.at && now < x.endAt + 2500);
  if (!e) { if (!box.hidden) box.hidden = true; return; }
  const info = EREIGNISSE[e.art] || { name: 'Ereignis!', kurz: '' };
  SB.ev = SB.ev || {};
  const k = e.eid;
  if (!SB.ev['a' + k]) {
    SB.ev['a' + k] = true;
    if (e.art === 'rea') Ton.alarm(); else if (e.art === 'strom') Ton.stromAus(); else Ton.ding();
  }
  if (now >= e.startAt && !SB.ev['s' + k] && now < e.endAt) {
    SB.ev['s' + k] = true;
    // Rea-Alarm: Der Beamer gibt den Takt vor (110 pro Minute), alle drücken mit
    if (e.art === 'rea') Ton.metronom(Math.floor((e.endAt - now) / 545), 545);
    else Ton.piep(true);
  }
  const vor = e.startAt - now, rest = e.endAt - now;
  const teams = room.teams.filter(t => t.mitglieder.length);
  box.hidden = false;
  box.className = 'evbox ev-' + e.art;
  box.innerHTML = `<div class="evtitel"><b>${esc(info.name)}</b><span>${esc(info.kurz)}</span></div>
    <div class="evzeit">${vor > 0 ? 'gleich: ' + Math.ceil(vor / 1000) : rest > 0 ? Math.ceil(rest / 1000) + ' s' : 'vorbei'}</div>
    <div class="evchips">${teams.map(t => { const st = e.stand[t.i] || { fertig: 0, von: 0, bonus: 0 }; return `<span class="evchip ${st.bonus ? 'ok' : ''}" style="--station:${stationFarbe(t.s)}">${esc(t.name.replace(/^Station /, ''))} ${st.bonus ? '✓ +10 %' : st.fertig + '/' + st.von}</span>`; }).join('')}</div>`;
  for (const t of teams) {
    const st = e.stand[t.i];
    if (st && st.bonus && !SB.ev['b' + k + ':' + t.i]) {
      SB.ev['b' + k + ':' + t.i] = true;
      banner(`<h2>${esc(t.name)}</h2><p>${esc(info.name.replace(/!$/, ''))} geschafft: +10 %</p>`, 'good', 1800);
      Ton.ziel();
    }
  }
}

function balken() {
  const list = aktiveTeams();
  const el = $('#stbars');
  const key = list.map(t => t.i + ':' + t.mitglieder.length).join(',');
  const k = room.spiel.k;
  if (SB.key !== key) {
    SB.key = key;
    el.className = 'stbars n' + list.length;
    el.innerHTML = list.map(t => `<div class="stbar" data-i="${t.i}" style="--station:${stationFarbe(t.s)}">
        <div class="sbkopf"><span class="rang"></span><b class="stn">${esc(t.name)}</b><span class="pz"></span></div>
        <div class="sbfort"><i></i><span class="mark" title="Schichtziel"></span></div>
        <div class="sbfuss"><span class="mit"></span><span class="zahlen"></span></div>
      </div>`).join('');
  }
  const ohne = room.players.filter(p => p.team < 0);
  $('#ohneHint').textContent = ohne.length ? `Noch ohne Station: ${ohne.map(p => p.name).join(', ')} (wählt auf dem Handy).` : '';
  const rang = room.rang;
  for (const t of list) {
    const node = el.querySelector(`.stbar[data-i="${t.i}"]`); if (!node) continue;
    const p = t.prozent[k] || 0;
    node.querySelector('.pz').textContent = p + ' %';
    // Balken bis 150 %, die Marke steht bei 100 %
    node.querySelector('.sbfort i').style.transform = `scaleX(${Math.min(1, p / 150)})`;
    node.classList.toggle('voll', p >= 100);
    const r = rang.indexOf(t.i);
    node.querySelector('.rang').textContent = r >= 0 ? (r + 1) + '.' : '';
    node.querySelector('.mit').innerHTML = t.mitglieder.map(m => `<span class="${m.online ? '' : 'off'}">${cpu(m, esc(m.name))}</span>`).join(' · ');
    node.querySelector('.zahlen').innerHTML = `<span title="erledigt">✓ ${t.ok[k]}</span><span title="verpasst">⏰ ${t.vp[k]}</span><span title="Fehlgriffe">✗ ${t.fg[k]}</span>`;
    if (t.hundert && !SB.hundert.has(t.i)) {
      SB.hundert.add(t.i);
      banner(`<h2>${esc(t.name)}</h2><p>hat das Schichtziel erreicht! 🎉</p>`, 'good', 2600);
      Ton.ziel();
    }
  }
}

// ---------------------------------------------------------------- Übergabe und Siegerehrung
function tabelle(bisK, hervorK) {
  const order = room.gesamtRang, z = hervorK >= 0;
  return `<table class="rtab"><thead><tr><th></th><th>Station</th>${z ? '<th title="erledigt">✓</th><th title="verpasst">⏰</th><th title="Fehlgriffe">✗</th>' : ''}${SCHICHTEN.slice(0, bisK + 1).map((s, j) => `<th class="${j === hervorK ? 'hl' : ''}">${esc(s.name)}</th>`).join('')}<th>Gesamt</th></tr></thead>
    <tbody>${order.map((i, r) => { const t = room.teams[i]; return `<tr style="--station:${stationFarbe(t.s)}"><td class="nr">${r + 1}.</td><td class="st"><span class="dot"></span><b>${esc(t.name)}</b><small>${t.mitglieder.map(m => esc(m.name)).join(', ')}</small></td>${z ? `<td class="zl">${t.ok[hervorK]}</td><td class="zl">${t.vp[hervorK]}</td><td class="zl">${t.fg[hervorK]}</td>` : ''}${t.prozent.slice(0, bisK + 1).map((p, j) => `<td class="${j === hervorK ? 'hl' : ''} ${p >= 100 ? 'voll' : ''}">${t.ziel[j] ? p + ' %' : '–'}</td>`).join('')}<td class="ges">${t.gesamt}</td></tr>`; }).join('')}</tbody></table>
    ${z ? '<p class="hint">✓ erledigt · ⏰ verpasst · ✗ Fehlgriffe (falscher Knopf) in dieser Schicht</p>' : ''}`;
}
function kniffligListe(list) {
  if (!list.length) return '';
  return `<ul class="knifflig">${list.map(x => `<li><span class="sit">${esc(x.text)}</span><b>→ ${esc(x.loesung)}</b><small>${x.vp}× verpasst</small></li>`).join('')}</ul>`;
}
function uebergabe() {
  const sp = room.spiel, k = sp.k;
  const key = 'ueb:' + sp.nr;
  const next = SCHICHTEN[k + 1];
  const a = ANWEISUNGEN[sp.anweisungen] || ANWEISUNGEN.steigend;
  if (screen !== key) {
    screen = key;
    Ton.ende();
  }
  const best = room.rang.length ? room.teams[room.rang[0]] : null;
  view.innerHTML = `<div class="tpage">
    <div class="thead"><div><h2><span class="schsym">${symbol(SCHICHT_SYMBOL[k])}</span> Übergabe nach dem ${esc(SCHICHTEN[k].name)}</h2>
      <p>${best ? `Beste Station in dieser Schicht: <b style="color:${stationFarbe(best.s)}">${esc(best.name)}</b> mit ${best.prozent[k]} % vom Schichtziel.` : ''} 100 % heißt: Schichtziel erreicht. Mehr geht auch!</p></div></div>
    <div class="ueb">
      <div class="tcard">${tabelle(k, k)}</div>
      <div class="tcard"><h2>${room.knifflig.length ? 'Das war knifflig' : 'Kurze Übergabe'}</h2>
        ${room.knifflig.length ? `<p class="hint">Diese Situationen wurden verpasst. Was wäre richtig gewesen?</p>${kniffligListe(room.knifflig)}`
          : `<ul class="impulse"><li>Was hat in eurer Station gut geklappt?</li><li>Wie habt ihr euch verständigt, als es laut wurde?</li><li>Was macht ihr in der nächsten Schicht anders?</li></ul>`}
        <div class="next"><span class="schsym">${symbol(SCHICHT_SYMBOL[k + 1])}</span><div><b>${esc(next.name)}</b><p>${esc(schichtText(k + 1, sp.anweisungen, room.cfg.themen, sp.schwierigkeit))}</p>
          ${a.anteil[k + 1] > a.anteil[k] ? '<p>Jetzt kommen mehr <b>Situationen</b>: Ruft sie laut und überlegt zusammen, was zu tun ist. Nach der Hälfte der Zeit erscheint ein Tipp.</p>' : ''}
          ${k === 0 && room.cfg.stoerungen === 'an' ? '<p><b>Neu: Störungen und Ereignisse.</b> Kaffee, Krümel oder Post-its auf dem Handy wegwischen bzw. wegtippen. Bei einem Ereignis (Rea-Alarm, Hygiene-Begehung, Stromausfall) macht die ganze Station mit: +10 %.</p>' : ''}</div></div>
      </div>
    </div>
    <div class="tactions"><button class="ghost-btn" id="btnLobby">Neues Spiel <span class="kbd">Esc</span></button>
      <button class="ghost-btn" id="btnNeu">Neue Stationen</button><span class="grow"></span>
      <button class="big-btn pulse" id="btnGo">${esc(next.name)} starten <span class="kbd">Enter</span></button></div>
  </div>`;
  $('#btnLobby').onclick = toLobby;
  $('#btnNeu').onclick = () => { if (confirm('Neue Stationen auslosen? Die Punkte werden gelöscht.')) send({ t: 'teams-bilden', cfg }); };
  $('#btnGo').onclick = schichtStart;
}

function ende() {
  const key = 'ende:' + room.spiel.nr;
  const neu = screen !== key;
  screen = key;
  const order = room.gesamtRang;
  const w = order.length ? room.teams[order[0]] : null;
  view.innerHTML = `<div class="tpage"><div class="podium">
      <div class="tcard winner" style="--station:${w ? stationFarbe(w.s) : 'var(--sun)'}">
        <div class="pokal">${symbol('pokal')}</div>
        <h2>${w ? esc(w.name) : ''} gewinnt!</h2>
        <p class="wm">${w ? w.mitglieder.map(m => esc(m.name)).join(' · ') : ''}</p>
        <p>${w ? `${w.gesamt} Punkte aus drei Schichten` : ''}</p>
      </div>
      <div class="tcard">${tabelle(2, -1)}
        ${room.kniffligAlle.length ? `<h2 style="font-size:1.3em;margin-top:.4em">Das war am kniffligsten</h2>${kniffligListe(room.kniffligAlle)}` : ''}</div>
    </div>
    <div class="tactions"><button class="ghost-btn" id="btnLobby">Neues Spiel <span class="kbd">Esc</span></button>
      <button class="ghost-btn" id="btnNeu">Neue Stationen</button><span class="grow"></span>
      <button class="big-btn" id="btnRev">Nochmal mit denselben Stationen <span class="kbd">Enter</span></button></div>
  </div>`;
  $('#btnLobby').onclick = toLobby;
  $('#btnNeu').onclick = () => send({ t: 'teams-bilden', cfg });
  $('#btnRev').onclick = nochmal;
  if (neu) { Ton.fanfare(); konfetti(); }
}
function nochmal() { Ton.init(); send({ t: 'nochmal', cfg }); }
function konfetti() {
  const c = document.createElement('div'); c.className = 'confetti';
  const cols = ['#ffb238', '#ff5d73', '#4da3ff', '#3ee0b0', '#b57bff', '#fff'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('i');
    p.style.left = Math.random() * 100 + 'vw';
    p.style.background = cols[i % cols.length];
    p.style.animationDuration = 2.4 + Math.random() * 2.6 + 's';
    p.style.animationDelay = Math.random() * 1.2 + 's';
    c.appendChild(p);
  }
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 6500);
}

// ---------------------------------------------------------------- Tasten
document.addEventListener('keydown', e => {
  if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
  if (!$('#dlg').hidden) { if (e.key === 'Escape') $('#dlg').hidden = true; return; }
  if (!room) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    if (room.phase === 'lobby') teamsBilden();
    else if (room.phase === 'wahl') verteilen();
    else if (room.phase === 'teams' || room.phase === 'uebergabe') schichtStart();
    else if (room.phase === 'schicht' && room.spiel && room.spiel.kennen) send({ t: 'kennen-ende' });
    else if (room.phase === 'ende') nochmal();
  } else if (e.key === 'Escape') {
    if (auswahl) { auswahl = null; render(); return; }
    if (['wahl', 'teams', 'uebergabe', 'ende'].includes(room.phase)) toLobby();
  } else if (e.key === 'f' || e.key === 'F') vollbild();
  else if (e.key === 'm' || e.key === 'M') btnTon.click();
});

// ---------------------------------------------------------------- Start
if (!sess || !sess.code || !sess.key) newSession(); else connect();
