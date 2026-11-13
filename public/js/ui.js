// Gemeinsame Anzeige-Bausteine für Handy und Übungsseite
import { TIPP_AB } from './regeln.js';
import { esc } from './pult.js';

const $ = s => document.querySelector(s);

export function spielfeldZeigen(on) {
  document.body.classList.toggle('spielt', !!on);
  $('#spielfeld').hidden = !on;
  $('#panel').hidden = !!on;
}

export function countdown(num, text) {
  const el = $('#countdown');
  if (num == null) { el.hidden = true; return; }
  el.hidden = false;
  const b = $('#cdNum');
  if (b.textContent !== String(num)) { b.textContent = num; b.style.animation = 'none'; void b.offsetWidth; b.style.animation = ''; }
  $('#cdText').textContent = text || '';
}

export const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

// ---------------------------------------------------------------- Die Aufgabe oben auf dem Handy
let A = null, meldungBis = 0;
/**
 * a: { id, art: 'b'|'s', text, tipp, startAt, endAt } oder null · verblasst: ms (Nachtdienst) oder 0
 */
export function auftragZeigen(a, verblasst, solo) {
  const box = $('#auftrag');
  if (!a) {
    A = null;
    box.className = 'auftrag leer';
    $('#aArt').textContent = 'Keine Aufgabe';
    $('#aText').textContent = 'Gerade hast du nichts zu sagen. Hilf deinem Team!';
    $('#aTipp').hidden = true;
    zeitbalken(null);
    return;
  }
  if (A && A.id === a.id) { A.startAt = a.startAt; A.endAt = a.endAt; return; } // z. B. während eines Ereignisses verlängert
  A = { ...a, verblasst: verblasst || 0 };
  const laenge = a.text.length > 75 ? ' sehrlang' : a.text.length > 50 ? ' lang' : '';
  box.className = 'auftrag ' + (a.art === 's' ? 'situation' : 'befehl') + (a.selbst && !solo ? ' selbst' : '') + laenge + ' wartet';
  box.dataset.id = a.id;
  const art = a.art === 's' ? 'Situation' : 'Anweisung';
  $('#aArt').innerHTML = solo ? `${art} <small>${a.art === 's' ? 'Was ist zu tun?' : 'Drück den passenden Knopf!'}</small>`
    : a.selbst ? `${art} <small>Das ist dein eigener Knopf – drück ihn selbst!</small>`
    : `${art} <small>${a.art === 's' ? 'Was ist zu tun? Ruf es laut!' : 'Ruf sie laut!'}</small>`;
  $('#aText').textContent = a.text;
  $('#aText').classList.remove('blass');
  const tipp = $('#aTipp');
  tipp.hidden = true;
  tipp.innerHTML = a.tipp ? `💡 Tipp: <b>${esc(a.tipp)}</b>` : '';
}
export const aktuellerAuftrag = () => A;

// Kurze Meldung über der Aufgabe (z. B. „Erledigt!“ oder „Zu spät!“)
export function meldung(html, art, ms, now) {
  const el = $('#aMeldung');
  el.innerHTML = html; el.className = 'ameldung ' + art; el.hidden = false;
  meldungBis = now + ms;
}

// Jede Animationsrunde: Zeitbalken, Tipp, Verblassen. Rückgabe true, wenn die Aufgabe abgelaufen ist
export function auftragTick(now) {
  const el = $('#aMeldung');
  if (!el.hidden && now > meldungBis && (!A || now >= A.startAt)) el.hidden = true;
  if (!A) return false;
  const box = $('#auftrag');
  const vor = now < A.startAt;
  box.classList.toggle('wartet', vor);
  if (vor) { zeitbalken(null); return false; }
  const ges = A.endAt - A.startAt, rest = A.endAt - now;
  zeitbalken(Math.max(0, rest), ges);
  if (A.tipp && $('#aTipp').hidden && now - A.startAt > ges * TIPP_AB) $('#aTipp').hidden = false;
  if (A.verblasst && now - A.startAt > A.verblasst) $('#aText').classList.add('blass');
  return rest <= 0;
}

export function zeitbalken(rest, gesamt) {
  const box = $('#aBarBox'), bar = $('#aBar');
  if (rest == null) { bar.style.transform = 'scaleX(0)'; box.classList.remove('knapp'); return; }
  bar.style.transform = `scaleX(${Math.max(0, Math.min(1, rest / gesamt))})`;
  box.classList.toggle('knapp', rest < 4000);
}

let toastT = 0;
export function toast(t) {
  const el = $('#toast'); if (!el) return;
  el.textContent = t; el.hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, 4200);
}

export function vibrieren(muster) { if (navigator.vibrate) try { navigator.vibrate(muster); } catch (e) {} }

// Bildschirm nicht ausgehen lassen, solange gespielt wird
let lock = null, lockWanted = false;
export async function wachHalten(on) {
  lockWanted = !!on;
  try {
    if (on && !lock && navigator.wakeLock) {
      lock = await navigator.wakeLock.request('screen');
      lock.addEventListener('release', () => { lock = null; });
    } else if (!on && lock) { await lock.release(); lock = null; }
  } catch (e) { lock = null; }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && lockWanted) wachHalten(true); });

// So geht's (für Handy und Übungsseite)
export const SO_GEHTS = `<ol class="regeln">
  <li><b>Oben</b> steht deine Aufgabe. Den passenden Knopf hat <b>jemand anderes</b> aus deiner Station. Also: <b>Ruf sie laut!</b></li>
  <li>Hör gut zu, was die anderen rufen: Die Knöpfe dafür sind auf <b>deinem</b> Handy. Hast du ihn? Dann drück ihn!</li>
  <li>Manche Elemente musst du <b>ziehen</b>, <b>drehen</b> (dann auslösen), <b>gedrückt halten</b> oder <b>im Takt drücken</b>.</li>
  <li>Ab dem Spätdienst kommen <b>Situationen</b>, z. B. „Frau K. hat Atemnot“. Überlegt zusammen: Was ist richtig?</li>
  <li>Erledigt: <b>+2 Punkte</b>. Falscher Knopf: <b>−1 Punkt</b>. Also erst denken, dann drücken!</li>
</ol>`;
