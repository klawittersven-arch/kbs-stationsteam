// Handy-Seite der SuS: anmelden, Station sehen, in der Schicht Aufgaben rufen und Knöpfe drücken.
// Das Handy bleibt immer stumm (Ton gibt es nur am Beamer-Laptop).
import { KNet, randomId, store } from './net.js';
import { erstellePult, esc } from './pult.js';
import { SCHICHTEN, GNADE, ANWEISUNGEN, STOERUNGEN, EREIGNISSE, stationFarbe, stufe, verblasstMs } from './regeln.js';
import { LOGO, symbol, SCHICHT_SYMBOL } from './bilder.js';
import { spielfeldZeigen, countdown, auftragZeigen, auftragTick, aktuellerAuftrag, meldung, toast, vibrieren, wachHalten, mmss, SO_GEHTS } from './ui.js';

const $ = s => document.querySelector(s);
const panel = $('#panel'), netdot = $('#netdot');

const params = new URLSearchParams(location.search);
let code = (params.get('c') || params.get('code') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
// Testansicht: das Handy eines Computer-Mitspielers, nur zum Zuschauen (nichts wird gespeichert, nichts gedrückt)
const computer = String(params.get('computer') || '').toLowerCase();
const nurZuschauen = /^[a-z0-9]{8,24}$/.test(computer);
let pid = nurZuschauen ? computer : store('stationsteam.pid');
if (!nurZuschauen && (!pid || !/^[a-z0-9]{8,24}$/.test(pid))) { pid = randomId(16); store('stationsteam.pid', pid); }
if (nurZuschauen) document.body.classList.add('computer');

let net = null, you = null, shown = '';
let S = null; // laufende Schicht { nr, key, pult, raf, gemeldet, zuletzt, offen: {id: {w, at}} }

// ---------------------------------------------------------------- Verbindung
const serverNow = () => net ? net.serverNow() : Date.now();
function connect() {
  net = KNet({
    code, params: { role: 'player', pid },
    onMessage,
    onStatus: s => {
      netdot.dataset.s = s;
      if (s === 'offline' && net.stopped) {
        stopSchicht();
        if (net.stopped === 'no-room') show('noroom', `<div class="card"><h2>Raum nicht gefunden</h2><p>Zum Code <b>${esc(code)}</b> gibt es gerade kein Spiel. Ist die Lehrer-Seite am Beamer geöffnet? Scanne den QR-Code noch einmal.</p><button class="big-btn" id="btnRetry">Nochmal versuchen</button></div>`, () => { $('#btnRetry').onclick = () => location.reload(); });
        else if (net.stopped === 'ended') show('ended', '<div class="card"><h2>Das Spiel ist beendet</h2><p>Die Lehrkraft hat die Sitzung geschlossen. Danke fürs Mitspielen!</p></div>');
      }
    },
  });
  net.open();
}
function send(obj) { if (net) net.send(obj, true); }

function onMessage(m) {
  if (typeof m.now === 'number' && net.rtt > 5000) net.offset = m.now - Date.now();
  switch (m.t) {
    case 'you': you = m; update(); break;
    case 'tat': tat(m); break;
    case 'kicked':
      you = null; stopSchicht();
      if (nurZuschauen) { show('kicked', '<div class="card"><h2>Entfernt</h2><p>Dieser Computer-Mitspieler wurde entfernt.</p></div>'); break; }
      store('stationsteam.name', null);
      show('kicked', '<div class="card"><h2>Abgemeldet</h2><p>Die Lehrkraft hat deinen Namen entfernt. Du kannst dich neu anmelden.</p><button class="big-btn" id="btnAgain">Neu anmelden</button></div>', () => { $('#btnAgain').onclick = () => location.reload(); });
      break;
    case 'error':
      if (m.why === 'bad-name') { const e = $('#joinErr'); if (e) { e.textContent = 'Bitte einen Vornamen (nur Buchstaben) und den ersten Buchstaben des Nachnamens eingeben.'; e.hidden = false; } }
      else if (m.why === 'full') toast('Das Spiel ist voll (60 Personen).');
      else if (m.why === 'voll') { toast('Diese Station ist schon voll. Wähle eine andere!'); shown = ''; update(); }
      break;
  }
}

// ---------------------------------------------------------------- Anzeige
function show(key, html, after) {
  spielfeldZeigen(false);
  if (shown === key) return;
  shown = key;
  panel.innerHTML = html;
  after && after();
}
function stationStil(t) { document.body.style.setProperty('--station', t ? stationFarbe(t.s) : 'var(--mint)'); }

function update() {
  if (!you) return;
  const me = you.me;
  if (!me) { stopSchicht(); return joinForm(); }
  stationStil(you.team);
  // Station wählen (während der Wahl oder als Nachzügler ohne Station)
  if (you.wahl) { stopSchicht(); wachHalten(false); return wahlKarte(); }
  clearInterval(wahlUhrT);
  switch (you.phase) {
    case 'lobby': stopSchicht(); wachHalten(false); return show('lobby:' + me.name, warteKarte(me.name), wireLeave);
    case 'teams': stopSchicht(); wachHalten(false); return teamKarte();
    case 'schicht': return schicht();
    case 'uebergabe': case 'ende': stopSchicht(); wachHalten(false); return uebergabe();
  }
}

function warteKarte(name) {
  return `<div class="card"><p class="eyebrow">Hallo ${esc(name)}!</p><h2>Gleich geht’s los</h2>
    <p>Die Lehrkraft bildet gleich die <b>Stationen</b> (Teams). Dann siehst du hier, mit wem du zusammen spielst.</p><div class="waitdots"><i></i><i></i><i></i></div>
    <button class="ghost-btn" id="btnLeave">Nicht ${esc(name)}? Namen ändern</button></div>
    <div class="card"><h3>So geht’s</h3>${SO_GEHTS}</div>`;
}
function wireLeave() { const b = $('#btnLeave'); if (b) b.onclick = () => { store('stationsteam.name', null); send({ t: 'leave' }); shown = ''; }; }

function mitgliederListe(t) {
  return `<ul class="mitglieder">${t.mitglieder.map(m => `<li class="${m.online ? '' : 'off'} ${m.ich ? 'ich' : ''}">${esc(m.name)}${m.ich ? ' <small>(du)</small>' : ''}</li>`).join('')}</ul>`;
}
// ---------------------------------------------------------------- Station selbst wählen
let wahlUhrT = 0, wahlGemeldet = 0;
function wahlKarte() {
  const w = you.wahl, me = you.me;
  const meine = w.stationen.find(x => x.i === w.meine);
  const key = 'wahl:' + you.phase + ':' + w.meine + ':' + w.endAt + ':' + JSON.stringify(w.stationen);
  if (shown !== key) {
    show(key, `<div class="card wahlkarte">
      <p class="eyebrow">Hallo ${esc(me.name)}!</p>
      <h2>${meine ? `Du bist in<span class="stname">${esc(meine.name)}</span>` : 'Wähle deine Station'}</h2>
      <p>${w.endAt ? 'Wählt eine Station mit euren <b>Sitznachbarn</b>. Ihr müsst euch gut hören können!' : 'Das Spiel läuft schon. Wähle die Station, bei der du sitzt.'} Höchstens <b>${w.max}</b> Personen pro Station.</p>
      ${w.endAt ? '<div class="wahluhr" id="wahlUhr"></div>' : ''}
      <div class="stwahl">${w.stationen.map(x => `<button type="button" class="stbtn ${x.i === w.meine ? 'mein' : ''}" data-i="${x.i}" style="--station:${stationFarbe(x.s)}" ${x.voll ? 'disabled' : ''}>
          <span class="stk"><span class="dot"></span><b>${esc(x.name.replace(/^Station /, ''))}</b><small>${x.voll ? 'voll' : x.namen.length + ' / ' + w.max}</small></span>
          <span class="nm">${x.namen.length ? x.namen.map(esc).join(', ') : 'noch leer'}</span></button>`).join('')}</div>
      <p class="hint">${w.endAt ? (meine ? 'Du kannst noch wechseln, bis die Zeit um ist.' : 'Wer bis zum Ende keine Station gewählt hat, wird zugelost.') : ''}</p>
      ${w.endAt ? `<button class="ghost-btn" id="btnLeave">Nicht ${esc(me.name)}? Namen ändern</button>` : ''}
    </div>`, () => {
      panel.querySelectorAll('.stbtn').forEach(b => {
        b.onclick = () => {
          send({ t: 'waehle', team: Number(b.dataset.i) });
          panel.querySelectorAll('.stbtn').forEach(x => x.classList.toggle('gewaehlt', x === b));
          vibrieren(20);
        };
      });
      wireLeave();
    });
  }
  clearInterval(wahlUhrT);
  if (!w.endAt) return;
  const tick = () => {
    const el = $('#wahlUhr');
    if (!el || !you || !you.wahl || !you.wahl.endAt) { clearInterval(wahlUhrT); return; }
    const rest = you.wahl.endAt - serverNow();
    el.textContent = rest > 0 ? '⏱ noch ' + mmss(rest) : 'Zeit um! Die Stationen werden verteilt …';
    el.classList.toggle('knapp', rest < 10000);
    // Ende auch selbst melden (falls der Beamer-Laptop gerade schläft)
    if (rest < -1500 && wahlGemeldet !== you.wahl.endAt) { wahlGemeldet = you.wahl.endAt; send({ t: 'zeit' }); }
  };
  tick();
  wahlUhrT = setInterval(tick, 250);
}

function teamKarte() {
  const t = you.team, me = you.me;
  if (!t) return show('lobby:' + me.name, warteKarte(me.name), wireLeave);
  const gewaehlt = t.mitglieder.filter(m => !m.ich && !m.zugeteilt).map(m => esc(m.name));
  show('team:' + t.i + ':' + me.zugeteilt + ':' + t.mitglieder.map(m => m.name + m.online + m.zugeteilt).join(','), `<div class="card stationkarte">
      <p class="eyebrow">Hallo ${esc(me.name)}!</p>
      <h2>Du bist in<span class="stname">${esc(t.name)}</span></h2>
      ${mitgliederListe(t)}
      ${me.zugeteilt && gewaehlt.length ? `<p class="zugelost"><b>Du wurdest zugelost.</b> Setz dich zu ${gewaehlt.join(', ')}!</p>` : ''}
      <p><b>Setzt euch zusammen!</b> Gleich beginnt der Frühdienst.${you.schwierigkeit ? ` Schwierigkeit: <b>${esc(stufe(you.schwierigkeit).name)}</b>.` : ''}</p>
      <button class="ghost-btn" id="btnLeave">Nicht ${esc(me.name)}? Namen ändern</button>
    </div>
    <div class="card"><h3>So geht’s</h3>${SO_GEHTS}</div>`, wireLeave);
}

function joinForm() {
  if (nurZuschauen) return show('nocpu', '<div class="card"><h2>Nicht gefunden</h2><p>Diesen Computer-Mitspieler gibt es nicht (mehr).</p></div>');
  if (shown === 'join') return;
  const last = store('stationsteam.name') || {};
  show('join', `<div class="card">
    <div class="logo">${LOGO}</div>
    <h2>Mitspielen</h2>
    <p>Gib deinen Vornamen und den ersten Buchstaben deines Nachnamens ein. Der Name erscheint am Beamer.</p>
    <form id="joinForm" class="settings" autocomplete="off">
      <div class="row">
        <div class="field grow"><label for="fFirst">Vorname</label><input id="fFirst" maxlength="16" required value="${esc(last.first || '')}" autocapitalize="words" enterkeyhint="next"></div>
        <div class="field initial"><label for="fInit">Nachname</label><input id="fInit" maxlength="1" required value="${esc(last.initial || '')}" autocapitalize="characters" enterkeyhint="go" aria-label="Erster Buchstabe des Nachnamens"></div>
      </div>
      <p class="err" id="joinErr" hidden></p>
      <button class="big-btn" type="submit">Mitspielen</button>
    </form></div>`, () => {
    const f = $('#fFirst'), i = $('#fInit');
    f.addEventListener('input', () => { if (/\s/.test(f.value)) { f.value = f.value.trim(); i.focus(); } });
    $('#joinForm').onsubmit = e => {
      e.preventDefault();
      const first = f.value.trim(), initial = i.value.trim();
      store('stationsteam.name', { first, initial });
      send({ t: 'join', first, initial });
    };
  });
}

// ---------------------------------------------------------------- Schicht
function stopSchicht() {
  if (!S) return;
  cancelAnimationFrame(S.raf);
  countdown(null);
  ereignisEnde();
  S = null;
}

function schicht() {
  const sp = you.spiel, t = you.team;
  if (!sp || !t) return show('ohne', '<div class="card"><h2>Einen Moment …</h2><p>Du kommst gleich in eine Station.</p></div>');
  if (!sp.open) return;
  if (!S || S.nr !== sp.nr) {
    stopSchicht();
    S = { nr: sp.nr, key: null, pult: null, raf: 0, gemeldet: new Set(), zuletzt: you.me.zuletzt ? you.me.zuletzt.id : 0, offen: {}, vorbei: false, stoerDa: new Set(), ev: null };
    // Nach dem Neuladen: alte Störungen nicht nochmal zeigen
    for (const x of you.stoerungen || []) if (x.at < serverNow() - 1500) S.stoerDa.add(x.sid);
    $('#aMeldung').hidden = true;
    $('#blase').hidden = true;
    spielfeldZeigen(true); shown = 'schicht';
    if (!nurZuschauen) wachHalten(true);
    S.raf = requestAnimationFrame(loop);
  }
  // Das eigene Pult
  const key = (you.pult || []).map(c => c.id).join(',');
  if (key !== S.key) {
    S.key = key; S.offen = {};
    S.pult = erstellePult($('#pult'), { pult: you.pult || [], zustand: you.zustand, onTun, ohneNummern: sp.k >= stufe(sp.schwierigkeit).ohneAb });
  } else {
    // Eigene, noch nicht bestätigte Eingaben nicht überschreiben
    const z = { ...you.zustand }, jetzt = Date.now();
    for (const [id, o] of Object.entries(S.offen)) {
      if (z[id] === o.w || jetzt - o.at > 2000) delete S.offen[id];
      else z[id] = o.w;
    }
    S.pult.setze(z);
  }
  // Rückmeldung zur eigenen letzten Aufgabe
  const zl = you.me.zuletzt, now = serverNow();
  if (zl && zl.id !== S.zuletzt) {
    S.zuletzt = zl.id;
    if (zl.ok) { meldung(`✓ Erledigt!${zl.von ? `<small>von ${esc(zl.von)}</small>` : ''}`, 'ok', 1000, now); vibrieren(40); }
    else { meldung(`⏰ Zu spät!<small>Richtig wäre: <b>${esc(zl.loesung)}</b></small>`, 'bad', zl.art === 's' ? 3300 : 1400, now); vibrieren([80, 60, 80]); }
  }
  auftragZeigen(you.auf, you.verblasst);
  leiste();
}

function leiste() {
  const t = you.team, sp = you.spiel;
  $('#sStation').textContent = t.name;
  const p = t.prozent[sp.k] || 0;
  $('#sFort').style.transform = `scaleX(${Math.min(1, p / 100)})`;
  $('#sLeiste').classList.toggle('voll', p >= 100);
  $('#sProzent').textContent = p + ' %';
}

function loop() {
  if (!S || !you || you.phase !== 'schicht') return;
  const sp = you.spiel, now = serverNow();
  const vor = sp.startAt - now;
  if (vor > 0) countdown(vor <= 3000 ? Math.ceil(vor / 1000) : '…', (SCHICHTEN[sp.k] || SCHICHTEN[0]).name + ' beginnt');
  else countdown(null);
  if (S.pult) S.pult.sperren(vor > 0 || S.vorbei);
  $('#sUhr').textContent = '⏱ ' + mmss(Math.min(sp.endAt - now, sp.endAt - sp.startAt));
  if (auftragTick(now)) {
    const a = aktuellerAuftrag();
    if (a && !S.gemeldet.has(a.id) && now > a.endAt + GNADE + 150) { S.gemeldet.add(a.id); send({ t: 'zeit', nr: sp.nr }); }
  }
  // Störungen auf diesem Handy, wenn ihre Zeit gekommen ist
  for (const x of you.stoerungen || []) {
    if (now < x.at || S.stoerDa.has(x.sid) || S.vorbei || !S.pult) continue;
    S.stoerDa.add(x.sid);
    if (S.pult.stoeren(x.art, x.ziele)) {
      const st = STOERUNGEN[x.art] || {};
      blase(`${esc(st.name || 'Störung!')}<small>${esc(st.kurz || '')}</small>`, 'info', 1800); vibrieren([40, 30, 40]);
      // Computer-Mitspieler wischen die Störung nach ein paar Sekunden weg
      if (nurZuschauen) setTimeout(() => document.querySelectorAll('#pult .stoer').forEach(d => { d.classList.add('weg'); setTimeout(() => d.remove(), 260); }), 2500 + Math.random() * 1500);
    }
  }
  // Gemeinsames Ereignis (Rea-Alarm, Hygiene-Begehung, Stromausfall)
  const e = (you.ereignisse || []).find(x => now >= x.at && now < x.endAt + 1500);
  if (e && (!S.ev || S.ev.eid !== e.eid)) ereignisStart(e);
  if (!e && S.ev) ereignisEnde();
  if (S.ev) ereignisTick(now);
  // Schichtende auch selbst melden (falls der Beamer-Laptop gerade schläft)
  if (now > sp.endAt + 1500 && !S.endeGemeldet) { S.endeGemeldet = true; send({ t: 'zeit', nr: sp.nr }); }
  if (now >= sp.endAt && !S.vorbei) {
    S.vorbei = true;
    meldung('Schicht vorbei!<small>Schau zum Beamer.</small>', 'info', 600000, now);
    vibrieren(200);
  }
  S.raf = requestAnimationFrame(loop);
}

function onTun(id, w) {
  if (!S || S.vorbei || nurZuschauen) return;
  S.offen[id] = { w, at: Date.now() };
  send({ t: 'tun', nr: S.nr, c: id, w });
  vibrieren(15);
}

let blaseT = 0;
function blase(html, art, ms) {
  const b = $('#blase');
  b.className = 'blase ' + art;
  b.innerHTML = html;
  b.hidden = false;
  clearTimeout(blaseT); blaseT = setTimeout(() => { b.hidden = true; }, ms || 1300);
}
function tat(m) {
  if (!S || m.nr !== S.nr || !S.pult) return;
  S.pult.blitz(m.c, m.ok);
  blase(m.ok ? `✓ Treffer! +2${m.fuer ? `<small>Aufgabe von ${esc(m.fuer)}</small>` : ''}` : '✗ Fehlgriff −1<small>Das hat gerade niemand gebraucht.</small>', m.ok ? 'ok' : 'bad');
  if (m.ok) vibrieren(50); else vibrieren([60, 40, 60]);
}

// ---------------------------------------------------------------- Gemeinsame Ereignisse
// Jede Person macht auf dem eigenen Handy mit. Schafft es die ganze Station, gibt es +10 %.
const EV_ELEMENT = {
  rea: { id: 'ev-rea', art: 'takt', name: 'Herzdruckmassage', thema: 'notfall', anzahl: 10, min: 100, max: 120 },
  hygiene: { id: 'ev-hygiene', art: 'halten', name: 'Hände desinfizieren', thema: 'hygiene', sekunden: 3 },
  strom: { id: 'ev-strom', art: 'regler', name: 'Taschenlampe', thema: 'alltag', stufen: ['aus', 'an'] },
};
function ereignisStart(e) {
  ereignisEnde();
  const box = $('#ereignis'), info = EREIGNISSE[e.art] || { name: 'Ereignis!', kurz: '' }, el = EV_ELEMENT[e.art] || EV_ELEMENT.hygiene;
  box.className = 'ereignis ev-' + e.art;
  box.dataset.eid = e.eid;
  box.innerHTML = `<div class="evkopf"><b>${esc(info.name)}</b><span class="evuhr" id="evUhr"></span></div>
    <p class="evkurz">${esc(info.kurz)}</p><div class="pult evpult" id="evPult"></div><p class="evstand" id="evStand"></p>`;
  box.hidden = false;
  S.ev = { eid: e.eid, art: e.art, gesendet: !!e.ich, pult: null };
  S.ev.pult = erstellePult($('#evPult'), {
    pult: [el], zustand: el.art === 'regler' ? { [el.id]: 0 } : {},
    onTun: (id, w) => {
      if (!S || !S.ev || S.ev.gesendet || (el.art === 'regler' && w !== 1)) return;
      S.ev.gesendet = true;
      send({ t: 'ereignis', nr: S.nr, eid: e.eid });
      vibrieren(60);
    },
  });
  vibrieren([100, 60, 100, 60, 100]);
}
function ereignisTick(now) {
  const e = (you.ereignisse || []).find(x => x.eid === S.ev.eid);
  if (!e) return;
  const box = $('#ereignis');
  const vor = e.startAt - now, rest = e.endAt - now, fertig = S.ev.gesendet || e.ich;
  $('#evUhr').textContent = vor > 0 ? 'gleich: ' + Math.ceil(vor / 1000) : rest > 0 ? '⏱ ' + Math.ceil(rest / 1000) + ' s' : 'vorbei';
  S.ev.pult.sperren(vor > 0 || rest <= 0 || fertig);
  box.classList.toggle('fertig', fertig);
  box.dataset.aktiv = String(vor <= 0 && rest > 0 && !fertig);
  const stand = e.bonus ? `🎉 Eure Station hat es geschafft! +10 %`
    : fertig ? `✓ Geschafft! Warte auf deine Station (${e.fertig} von ${e.von}).`
    : `Eure Station: ${e.fertig} von ${e.von} fertig.`;
  const st = $('#evStand');
  if (st.textContent !== stand) st.textContent = stand;
}
function ereignisEnde() {
  const box = $('#ereignis');
  if (box) { box.hidden = true; box.innerHTML = ''; box.removeAttribute('data-eid'); box.removeAttribute('data-aktiv'); }
  if (S) S.ev = null;
}

// ---------------------------------------------------------------- Übergabe und Siegerehrung
function uebergabe() {
  const t = you.team, sp = you.spiel, me = you.me;
  if (!t || !sp) return show('lobby:' + me.name, warteKarte(me.name), wireLeave);
  const k = sp.k, ende = you.phase === 'ende';
  const p = t.prozent[k] || 0;
  const st = me.st || { tr: 0, fg: 0, ok: 0, vp: 0 };
  const rang = you.rang || [];
  const sieger = rang[0];
  const naechste = !ende && SCHICHTEN[k + 1];
  const neuSituationen = naechste && (ANWEISUNGEN[you.spiel.anweisungen] || ANWEISUNGEN.steigend);
  const key = 'ueb:' + sp.nr + ':' + you.phase + ':' + t.platz + ':' + p + ':' + rang.map(r => r.gesamt).join(',');
  show(key, `<div class="card stationkarte ${p >= 100 ? 'good' : ''}">
      <p class="eyebrow"><span class="schsym">${symbol(SCHICHT_SYMBOL[k])}</span> ${esc(SCHICHTEN[k].name)} vorbei</p>
      <h2>${ende && sieger ? (sieger.ich ? '🏆 Eure Station gewinnt!' : `🏆 ${esc(sieger.name)} gewinnt!`) : esc(t.name)}</h2>
      <div class="bigstat"><b>${p} %</b><span>vom Schichtziel${p >= 100 ? ' – geschafft! 🎉' : ''}</span></div>
      <div class="placebox">${ende ? `Gesamt: Platz ${t.gesamtPlatz} von ${rang.length}` : `Platz ${t.platz} von ${t.von} in dieser Schicht`}</div>
      <p>Eure Station: <b>${t.ok[k]}</b> erledigt · <b>${t.vp[k]}</b> verpasst · <b>${t.fg[k]}</b> Fehlgriffe</p>
      <p>Du hast <b>${st.tr}</b> ${st.tr === 1 ? 'Aufgabe' : 'Aufgaben'} mit deinen Knöpfen erledigt${st.fg ? ` und <b>${st.fg}</b>-mal danebengegriffen` : ''}.</p>
    </div>
    ${(you.verpasst || []).length ? `<div class="card"><h3>Das hat eure Station verpasst</h3><ul class="loesungen">${you.verpasst.map(v => `<li><span>${esc(v.text)}</span><b>→ ${esc(v.loesung)}</b></li>`).join('')}</ul></div>` : ''}
    <div class="card"><h3>${ende ? 'Endstand' : 'Zwischenstand'} (alle Schichten)</h3><ol class="rangliste">${rang.map((r, i) => `<li class="${r.ich ? 'ich' : ''}" style="--station:${stationFarbe(r.s)}"><span class="nr">${i + 1}.</span><span class="dot"></span><span class="nm">${esc(r.name)}</span><b>${r.gesamt}</b></li>`).join('')}</ol>
      <p class="hint">Pro Schicht gibt es bis zu 100 Punkte für das Schichtziel (mehr ist möglich).</p></div>
    ${naechste ? `<div class="card"><h3>Gleich: ${esc(naechste.name)}</h3><p>${neuSituationen && neuSituationen.anteil[k + 1] > neuSituationen.anteil[k] ? 'Jetzt kommen mehr <b>Situationen</b>. Ruft sie laut und überlegt zusammen, was zu tun ist!' : stufe(sp.schwierigkeit).proHandy[k + 1] > stufe(sp.schwierigkeit).proHandy[k] ? 'Jetzt habt ihr mehr Knöpfe auf dem Handy.' : 'Gleich geht es weiter.'}${verblasstMs(k + 1, sp.schwierigkeit) ? ' Und: Die Aufgabe wird nach ein paar Sekunden blass. Schnell lesen!' : ''}${k === 0 && sp.stoerungen === 'an' ? ' <b>Neu: Störungen!</b> Kaffee, Krümel oder Post-its auf dem Handy: wegwischen oder wegtippen. Bei einem <b>Ereignis</b> (z. B. Rea-Alarm) macht die ganze Station mit, dann gibt es +10 %.' : ''}</p></div>` : ''}`);
}

// ---------------------------------------------------------------- Start
if (!code) {
  show('nocode', `<div class="card"><div class="logo">${LOGO}</div><h2>Code eingeben</h2><p>Scanne den QR-Code am Beamer oder gib den Code ein, der dort steht.</p>
    <form id="codeForm" class="settings"><div class="field"><label for="fCode">Code</label><input id="fCode" maxlength="5" autocapitalize="characters" required></div><button class="big-btn">Weiter</button></form></div>`, () => {
    $('#codeForm').onsubmit = e => { e.preventDefault(); const c = $('#fCode').value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length === 5) location.search = '?c=' + c; };
  });
} else {
  connect();
}
