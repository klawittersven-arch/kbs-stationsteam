// Töne (Web Audio, ohne Dateien). Nur der Beamer-Laptop spielt Töne.
// Handy-Seiten und die Übungsseite binden diese Datei gar nicht erst ein: Handys bleiben immer stumm.
let ctx = null, master = null;
export const Ton = {
  an: true,
  // Muss einmal nach einem Klick oder Tastendruck aufgerufen werden (Browser-Regel)
  init() {
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        ctx = new AC();
        master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {}
  },
  _osc(freq, start, dur, type, vol, slide) {
    if (!ctx || !this.an) return;
    const t0 = ctx.currentTime + Math.max(0, start);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  // Countdown-Piep (hoch = Start)
  piep(hoch) { this._osc(hoch ? 1046.5 : 659.25, 0, hoch ? 0.45 : 0.16, 'square', 0.14); },
  // Monitor-Piepen in den letzten Sekunden einer Schicht
  monitor() { this._osc(988, 0, 0.09, 'sine', 0.3); },
  // Gong: Schicht beginnt / endet
  gong() { [392, 523.25, 659.25].forEach((f, j) => { this._osc(f, j * 0.18, 1.1, 'sine', 0.35); this._osc(f * 2, j * 0.18, 0.5, 'triangle', 0.06); }); },
  ende() { [659.25, 523.25, 392].forEach((f, j) => this._osc(f, j * 0.2, 1, 'sine', 0.35)); },
  // Eine Station hat das Schichtziel erreicht
  ziel() { [784, 988, 1175, 1568].forEach((f, j) => this._osc(f, j * 0.08, 0.25, 'triangle', 0.3)); },
  fanfare() { [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5].forEach((f, j) => this._osc(f, j * 0.13, j === 5 ? 0.8 : 0.2, 'triangle', 0.4)); },
};
