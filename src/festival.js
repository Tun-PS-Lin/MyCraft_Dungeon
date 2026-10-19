// Seasonal festivals: Christmas, Valentine's and Easter. On "Auto" (the default) a festival
// comes on by itself around its date; the menu can also pick one, or switch them off.
// The festival is chosen once, as the page loads, and the village is built with it (snow,
// ice, decorations...). Changing it in the menu reloads the page behind the loading screen.
//
//   Christmas    1 December to 6 January
//   Valentine's  7 to 15 February
//   Easter       the week before Easter Sunday to the week after
//   Thingyan     11 to 17 April (the Myanmar water festival and new year)
//   Thadingyut   two days either side of the full moon of Thadingyut (October), the festival of lights

const KEY = 'pv-festival';
export const FESTIVALS = {
  christmas: { name: 'Christmas', precip: 'snow', loading: 'Decorating for Christmas…' },
  valentine: { name: 'Valentine’s', precip: 'petals', loading: 'Decorating for Valentine’s…' },
  easter: { name: 'Easter', precip: 'blossom', loading: 'Decorating for Easter…' },
  thingyan: { name: 'Thingyan', precip: 'padauk', loading: 'Filling the water bowls for Thingyan…' },
  thadingyut: { name: 'Thadingyut', precip: 'rain', loading: 'Lighting the lanterns for Thadingyut…' },
};
// greetings for the loading card
export const GREETING = { christmas: 'Merry Christmas', valentine: 'Happy Valentine’s Day', easter: 'Happy Easter', thingyan: 'Happy Thingyan', thadingyut: 'Happy Thadingyut · Festival of Lights' };

// the full moon of Thadingyut. Known years from the Myanmar calendar; otherwise the first full moon
// on or after 1 October (worked out from the mean lunar month, good to about a day)
const THADINGYUT = { 2024: [9, 17], 2025: [9, 6], 2026: [9, 26], 2027: [9, 15] };
export function thadingyutFullMoon(y) {
  if (THADINGYUT[y]) return new Date(y, THADINGYUT[y][0], THADINGYUT[y][1]);
  const SYN = 29.530588853, NEW = Date.UTC(2000, 0, 6, 18, 14), start = Date.UTC(y, 9, 1);
  let k = Math.ceil(((start - NEW) / 864e5 - SYN / 2) / SYN), fm = NEW + (k * SYN + SYN / 2) * 864e5;
  if (fm < start) fm += SYN * 864e5;
  const d = new Date(fm + 6.5 * 36e5); return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); // (in Myanmar time)
}

// Easter Sunday (Gregorian), by the anonymous Gregorian algorithm
export function easterSunday(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
export function festivalOn(date = new Date()) {
  const m = date.getMonth(), d = date.getDate();
  if (m === 11 || (m === 0 && d <= 6)) return 'christmas';
  if (m === 1 && d >= 7 && d <= 15) return 'valentine';
  if (m === 3 && d >= 11 && d <= 17) return 'thingyan';
  { const fm = thadingyutFullMoon(date.getFullYear()), days = Math.round((new Date(date.getFullYear(), m, d) - fm) / 864e5); if (days >= -2 && days <= 2) return 'thadingyut'; }
  const e = easterSunday(date.getFullYear()), days = Math.round((new Date(date.getFullYear(), m, d) - e) / 864e5);
  if (days >= -7 && days <= 7) return 'easter';
  return null;
}

const read = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; } };
export const festivalChoice = (() => { const v = read(); return v === 'auto' || v === 'off' || FESTIVALS[v] ? v : 'auto'; })();
// the festival this page is built with (null: none)
export const FESTIVAL = festivalChoice === 'auto' ? festivalOn() : festivalChoice === 'off' ? null : festivalChoice;
export const festival = FESTIVAL ? FESTIVALS[FESTIVAL] : null;
// the loading card (index.html) is themed before any of this code loads, from this note
try { const n = new Date(); localStorage.setItem('pv-fest-auto', JSON.stringify({ id: festivalOn(n), day: n.toDateString() })); } catch (e) { /* ignore */ }

// change the setting: if that changes what the village looks like, reload behind the loading screen
// (resume: where to put the player back, kept for this tab only)
export function chooseFestival(choice, resume) {
  try { localStorage.setItem(KEY, choice); } catch (e) { /* ignore */ }
  const next = choice === 'auto' ? festivalOn() : choice === 'off' ? null : choice;
  if (next === FESTIVAL) return false;
  const text = next ? FESTIVALS[next].loading : 'Taking the decorations down…';
  try { sessionStorage.setItem('pv-resume', JSON.stringify(resume || {})); sessionStorage.setItem('pv-loading', text); } catch (e) { /* ignore */ }
  const cover = document.getElementById('travel');
  if (window.__festTheme) window.__festTheme(next); // the cover takes the next festival's colours
  if (cover) { cover.querySelector('strong').textContent = text; cover.classList.add('show', 'fest'); }
  setTimeout(() => location.reload(), 480);
  return true;
}
// where to put the player back after a festival change (read once)
export function takeResume() {
  try { const v = sessionStorage.getItem('pv-resume'); sessionStorage.removeItem('pv-resume'); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
