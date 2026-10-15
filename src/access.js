// Accessibility settings, in the menu under "Accessibility": text size, high contrast,
// reduce motion and the opening flight. They are remembered in this browser.
// Reduce motion follows the system setting until the visitor changes it here.
const KEY = 'pv-access';
const SIZES = [1, 1.15, 1.3];
const system = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

const st = { text: 0, contrast: false, calm: null, flight: true };
try { Object.assign(st, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { /* ignore */ }
st.text = Math.max(0, Math.min(SIZES.length - 1, st.text | 0));
const listeners = [];

export const access = {
  text: () => st.text,
  contrast: () => !!st.contrast,
  calm: () => (st.calm === null || st.calm === undefined ? system() : !!st.calm),
  // the sweep over the village on a fresh visit (never with reduced motion)
  flight: () => st.flight !== false && !access.calm(),
  onChange: (f) => listeners.push(f),
  set(k, v) {
    st[k] = v; try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
    apply(); paint(); listeners.forEach((f) => f(k));
  },
};

function apply() {
  const h = document.documentElement;
  h.classList.toggle('calm', access.calm());
  h.classList.toggle('contrast', access.contrast());
  h.classList.toggle('big-text', st.text > 0);
  h.style.setProperty('--ts', SIZES[st.text]);
}
apply();

// the controls in the menu (see index.html, #access)
let box = null;
function paint() {
  if (!box) return;
  box.querySelectorAll('[data-ts]').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.ts === st.text)));
  const on = { contrast: access.contrast(), calm: access.calm(), flight: st.flight !== false };
  box.querySelectorAll('[data-acc]').forEach((b) => b.setAttribute('aria-checked', String(on[b.dataset.acc])));
  const fl = box.querySelector('[data-acc="flight"]'); if (fl) fl.disabled = access.calm(); // reduced motion already skips it
}
export function bindAccess(el, click) {
  box = el; if (!box) return;
  box.querySelectorAll('[data-ts]').forEach((b) => { b.onclick = () => { if (click) click(); access.set('text', +b.dataset.ts); }; });
  box.querySelectorAll('[data-acc]').forEach((b) => {
    b.onclick = () => {
      if (click) click();
      const k = b.dataset.acc, now = k === 'contrast' ? access.contrast() : k === 'calm' ? access.calm() : st.flight !== false;
      access.set(k, !now);
    };
  });
  paint();
}
