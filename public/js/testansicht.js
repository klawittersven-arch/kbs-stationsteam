// Testansicht (Testlauf allein): zeigt die Handys der Computer-Mitspieler nebeneinander.
// Läuft am Laptop in einem eigenen Fenster. Die Handys sind echte Handy-Seiten (nur zum Zuschauen).
// Was dort oben steht, „rufen“ die Computer-Mitspieler: Du führst es auf deinem eigenen Handy aus.
import { KNet, store } from './net.js';
import { esc } from './pult.js';
import { symbol } from './bilder.js';
import { stationFarbe } from './regeln.js';

const $ = s => document.querySelector(s);
const box = $('#handys'), hinweis = $('#tvHinweis');
const B = 390, H = 780; // Größe eines Handys (wie ein übliches Smartphone)
const sess = store('stationsteam.lehrer');
let schluessel = '';

// Neue Sitzung am Beamer: diese Ansicht neu laden
addEventListener('storage', e => { if (e.key === 'stationsteam.lehrer') location.reload(); });

function karte(html) { schluessel = ''; box.innerHTML = `<div class="tcard tvleer">${html}</div>`; }

// Handys so groß wie möglich, alle nebeneinander
function einpassen() {
  const n = Math.max(1, box.querySelectorAll('.tvhandy').length);
  const kopf = $('.tvkopf').getBoundingClientRect().height;
  const sc = Math.min(1.2, (innerHeight - kopf - 64) / H, (innerWidth - 32 - (n - 1) * 20) / n / B);
  document.documentElement.style.setProperty('--sc', String(Math.max(0.3, sc)));
}
addEventListener('resize', einpassen);

function zeichne(room) {
  const bots = room.players.filter(p => p.bot);
  if (!bots.length) {
    hinweis.textContent = 'Noch keine Computer-Mitspieler.';
    return karte(`<h2>Noch keine Computer-Mitspieler</h2><p>Klicke am Beamer in der Anmeldung auf <b>„Testlauf allein“</b>. Dann erscheinen hier ihre drei Handys.</p>`);
  }
  hinweis.innerHTML = 'Was oben auf diesen Handys steht, rufen die Computer-Mitspieler. <b>Führe es auf deinem Handy aus!</b> Deine eigenen Anweisungen erledigen sie von selbst.';
  const key = room.code + ':' + bots.map(p => p.pid).join(',');
  if (key !== schluessel) {
    schluessel = key;
    box.innerHTML = bots.map(p => `<figure class="tvhandy" data-pid="${esc(p.pid)}">
        <figcaption><span class="cpuico">${symbol('robo')}</span><b>${esc(p.name)}</b><small class="tvst"></small></figcaption>
        <div class="tvrahmen"><iframe src="/mitspielen?c=${encodeURIComponent(room.code)}&computer=${encodeURIComponent(p.pid)}" title="Handy von ${esc(p.name)}"></iframe></div>
      </figure>`).join('');
    einpassen();
  }
  // Station unter dem Namen
  for (const p of bots) {
    const fig = box.querySelector(`.tvhandy[data-pid="${p.pid}"]`); if (!fig) continue;
    const t = p.team >= 0 ? room.teams[p.team] : null;
    fig.style.setProperty('--station', t ? stationFarbe(t.s) : 'var(--line)');
    fig.querySelector('.tvst').textContent = t ? t.name : 'noch ohne Station';
  }
}

if (!sess || !sess.code || !sess.key) {
  karte('<h2>Erst die Lehrer-Seite öffnen</h2><p>Öffne am Laptop die Seite <b>/lehrer</b> und klicke dort in der Anmeldung auf <b>„Testlauf allein“</b>.</p>');
} else {
  const net = KNet({
    code: sess.code, params: { role: 'teacher', key: sess.key },
    onMessage: m => { if (m.t === 'room') zeichne(m); else if (m.t === 'ended') karte('<h2>Sitzung beendet</h2><p>Die Sitzung am Beamer wurde beendet.</p>'); },
    onStatus: s => {
      $('#netdot').dataset.s = s;
      if (s === 'offline' && net.stopped) karte('<h2>Keine Verbindung</h2><p>Die Sitzung am Beamer gibt es nicht mehr. Lade die Lehrer-Seite neu und klicke noch einmal auf „Testlauf allein“.</p>');
    },
  });
  net.open();
}
