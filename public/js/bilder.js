/*
 * Eigene Grafiken als SVG (© 2026 Sven Klawitter). Nichts wird von fremden Servern geladen.
 * Alle Symbole liegen in einem Feld von 48 × 48 und übernehmen die Textfarbe (currentColor).
 */
const svg = (inner, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;

const SYMBOLE = {
  // Lagerung & Mobilisation: Pflegebett mit hochgestelltem Kopfteil
  lagerung: svg('<path d="M5 12v26M43 26v12M5 33h38"/><path d="M5 27l11-9 4 5h23v4H5"/><circle cx="12" cy="15" r="3.6" fill="currentColor" stroke="none"/><path d="M9 38l-2 4M41 38l2 4"/>'),
  // Prophylaxen & Hygiene: Tropfen Desinfektionsmittel mit Glanz und Schutz-Haken
  hygiene: svg('<path d="M24 5c7 9 13 16 13 23a13 13 0 0 1-26 0c0-7 6-14 13-23z"/><path d="M18 29l4 4 8-9"/>'),
  // Vitalzeichen & Beobachtung: Herz mit EKG-Linie
  vital: svg('<path d="M24 41S6 30 6 17.5A9.5 9.5 0 0 1 24 12a9.5 9.5 0 0 1 18 5.5C42 30 24 41 24 41z"/><path d="M9 24h8l3-6 5 12 3-6h11"/>'),
  // Notfälle & Erste Hilfe: Blaulicht mit Strahlen
  notfall: svg('<path d="M14 36v-9a10 10 0 0 1 20 0v9"/><path d="M10 36h28v5H10z"/><path d="M24 6v5M10 11l3.5 3.5M38 11l-3.5 3.5M5 23h4M39 23h4"/><path d="M20 27a4 4 0 0 1 4-4"/>'),
  // Kommunikation (KB2): zwei Sprechblasen
  kommunikation: svg('<path d="M6 10h24a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H16l-7 6v-6H6a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z"/><path d="M38 20h4a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-2v5l-6-5h-8a4 4 0 0 1-3-1.5"/>'),
  // Prophylaxen: Schutzschild mit Kreuz
  prophylaxen: svg('<path d="M24 5l15 6v10c0 10-6.5 17-15 21C15.5 38 9 31 9 21V11z"/><path d="M24 15v14M17 22h14"/>'),
  // Medikamente: Kapsel (halb gefüllt) und Tablette
  medikamente: svg('<g transform="rotate(-40 22 22)"><rect x="5" y="15" width="34" height="14" rx="7"/><path d="M12 15h10v14H12a7 7 0 0 1 0-14z" fill="currentColor" stroke="none" opacity=".45"/><path d="M22 15v14"/></g><circle cx="36" cy="37" r="7"/><path d="M31 37h10"/>'),
  // Stationsalltag: Kaffeetasse mit Dampf
  alltag: svg('<path d="M9 20h24v9a10 10 0 0 1-10 10h-4A10 10 0 0 1 9 29z"/><path d="M33 23h3a5 5 0 0 1 0 10h-4"/><path d="M16 6c-2 3 2 5 0 8M23 6c-2 3 2 5 0 8M30 6c-2 3 2 5 0 8"/><path d="M7 43h30"/>'),
  // Frühdienst: Sonne geht auf
  frueh: svg('<path d="M6 36h36M14 36a10 10 0 0 1 20 0"/><path d="M24 14v5M11 20l3.5 3.5M37 20l-3.5 3.5M6 29h4M38 29h4"/><path d="M18 42h12"/>'),
  // Spätdienst: Sonne geht unter
  spaet: svg('<path d="M6 30h36M15 30a9 9 0 0 1 18 0"/><path d="M12 36h24M17 42h14"/><path d="M24 11v4M12 16l3 3M36 16l-3 3"/>'),
  // Nachtdienst: Mond und Sterne
  nacht: svg('<path d="M30 7a15 15 0 1 0 11 24A13 13 0 0 1 30 7z"/><path d="M38 9v6M35 12h6M10 9v4M8 11h4"/>'),
  // Pokal (Siegerehrung)
  pokal: svg('<path d="M15 6h18v10a9 9 0 0 1-18 0z"/><path d="M15 9H8v3a7 7 0 0 0 7 7M33 9h7v3a7 7 0 0 1-7 7"/><path d="M24 25v8M17 41h14M19 41l2-8h6l2 8"/>'),
  // Rufen (Hinweis „laut sagen“)
  rufen: svg('<path d="M6 20v8h7l13 9V11l-13 9z"/><path d="M32 18a8 8 0 0 1 0 12M36 13a14 14 0 0 1 0 22"/>'),
  // Uhr
  uhr: svg('<circle cx="24" cy="24" r="17"/><path d="M24 14v10l7 5"/>'),
  // Team (mehrere Personen)
  team: svg('<circle cx="16" cy="16" r="5"/><circle cx="32" cy="16" r="5"/><path d="M6 38c0-7 4.5-11 10-11s10 4 10 11M22 38c0-7 4.5-11 10-11s10 4 10 11"/>'),
  // Computer-Mitspieler (Testlauf): Roboterkopf mit Antenne
  robo: svg('<rect x="9" y="15" width="30" height="23" rx="6"/><path d="M24 15V9"/><circle cx="24" cy="7" r="2.6" fill="currentColor" stroke="none"/><circle cx="18" cy="25" r="2.8" fill="currentColor" stroke="none"/><circle cx="30" cy="25" r="2.8" fill="currentColor" stroke="none"/><path d="M18 32h12M5 23v8M43 23v8"/>'),
  // Fragezeichen für unbekannte Themen
  frage: svg('<circle cx="24" cy="24" r="17"/><path d="M19 19a5 5 0 1 1 7 4.6c-1.4.6-2 1.6-2 3.4M24 33v.5"/>'),
};

export const symbol = name => SYMBOLE[name] || SYMBOLE.frage;
export const SCHICHT_SYMBOL = ['frueh', 'spaet', 'nacht'];

// Großes Spiel-Logo für Übungsseite und Anmeldung: Pult mit Knöpfen und Herzkurve
export const LOGO = `<svg class="logo-pult" viewBox="0 0 220 120" aria-hidden="true">
  <rect x="6" y="14" width="208" height="98" rx="16" fill="#13263b" stroke="#3ee0b0" stroke-width="4"/>
  <rect x="20" y="26" width="98" height="34" rx="8" fill="#06121b" stroke="#24425f" stroke-width="2"/>
  <path d="M26 44h18l6-10 9 20 7-14 5 4h41" fill="none" stroke="#3ee0b0" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="144" cy="43" r="14" fill="#ff5d73" stroke="#fff" stroke-width="3"/>
  <circle cx="184" cy="43" r="14" fill="#ffb238" stroke="#fff" stroke-width="3"/>
  <rect x="20" y="72" width="54" height="28" rx="8" fill="#5ec8ff"/>
  <rect x="82" y="72" width="54" height="28" rx="8" fill="#24425f"/>
  <rect x="144" y="72" width="56" height="28" rx="14" fill="#06121b" stroke="#24425f" stroke-width="2"/>
  <circle cx="186" cy="86" r="10" fill="#3ee0b0"/>
  <circle cx="30" cy="6" r="5" fill="#3ee0b0"/><circle cx="48" cy="6" r="5" fill="#ffb238"/><circle cx="66" cy="6" r="5" fill="#ff5d73"/>
</svg>`;

// Gesichter für die Smiley-Skala (eigene Zeichnungen): Stufe i von n, von lachend (0) bis weinend (n-1)
const MUENDER = ['M15 29q9 9 18 0', 'M16 30q8 5 16 0', 'M16 31h16', 'M16 33q8-4 16 0', 'M15 34q9-7 18 0', 'M14 35q10-10 20 0'];
export function gesicht(i, n) {
  const g = n > 1 ? Math.round(i / (n - 1) * 5) : 0;
  const brauen = g >= 3 ? `<path d="M13 ${g === 5 ? 15 : 16}l7 ${g === 5 ? 3 : 2}M35 ${g === 5 ? 15 : 16}l-7 ${g === 5 ? 3 : 2}"/>` : '';
  const augen = g === 5 ? '<path d="M15 21q3-2 6 0M27 21q3-2 6 0"/>' : '<circle cx="18" cy="21" r="2.2" fill="currentColor" stroke="none"/><circle cx="30" cy="21" r="2.2" fill="currentColor" stroke="none"/>';
  const traenen = g === 5 ? '<path d="M16 24q-3 5 0 7q3-2 0-7zM32 24q-3 5 0 7q3-2 0-7z" fill="#5ec8ff" stroke="#5ec8ff" stroke-width="1"/>' : '';
  return `<svg class="gesicht" viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="20"/>${augen}${brauen}<path d="${MUENDER[g]}"/>${traenen}</svg>`;
}
