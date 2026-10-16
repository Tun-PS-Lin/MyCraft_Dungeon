// Seasonal festivals: Christmas, Valentine's and Easter. On "Auto" (the default) a festival
// comes on by itself around its date; the menu can also pick one, or switch them off.
// The festival is chosen once, as the page loads, and the village is built with it (snow,
// ice, decorations...). Changing it in the menu reloads the page behind the loading screen.
//
//   Christmas    1 December to 6 January
//   Valentine's  7 to 15 February
//   Easter       the week before Easter Sunday to the week after

const KEY = 'pv-festival';
export const FESTIVALS = {
  christmas: { name: 'Christmas', precip: 'snow', loading: 'Decorating for Christmas…' },
  valentine: { name: 'Valentine’s', precip: 'petals', loading: 'Decorating for Valentine’s…' },
  easter: { name: 'Easter', precip: 'blossom', loading: 'Decorating for Easter…' },
};

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
  const e = easterSunday(date.getFullYear()), days = Math.round((new Date(date.getFullYear(), m, d) - e) / 864e5);
  if (days >= -7 && days <= 7) return 'easter';
  return null;
}

const read = () => { try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; } };
export const festivalChoice = (() => { const v = read(); return v === 'auto' || v === 'off' || FESTIVALS[v] ? v : 'auto'; })();
// the festival this page is built with (null: none)
export const FESTIVAL = festivalChoice === 'auto' ? festivalOn() : festivalChoice === 'off' ? null : festivalChoice;
export const festival = FESTIVAL ? FESTIVALS[FESTIVAL] : null;

// change the setting: if that changes what the village looks like, reload behind the loading screen
// (resume: where to put the player back, kept for this tab only)
export function chooseFestival(choice, resume) {
  try { localStorage.setItem(KEY, choice); } catch (e) { /* ignore */ }
  const next = choice === 'auto' ? festivalOn() : choice === 'off' ? null : choice;
  if (next === FESTIVAL) return false;
  const text = next ? FESTIVALS[next].loading : 'Taking the decorations down…';
  try { sessionStorage.setItem('pv-resume', JSON.stringify(resume || {})); sessionStorage.setItem('pv-loading', text); } catch (e) { /* ignore */ }
  const cover = document.getElementById('travel');
  if (cover) { cover.querySelector('strong').textContent = text; cover.classList.add('show'); }
  setTimeout(() => location.reload(), 480);
  return true;
}
// where to put the player back after a festival change (read once)
export function takeResume() {
  try { const v = sessionStorage.getItem('pv-resume'); sessionStorage.removeItem('pv-resume'); return v ? JSON.parse(v) : null; } catch (e) { return null; }
}
