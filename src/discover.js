// The discovery checklist: a short list of things to find around the village, the town hall,
// the Hideout and the pond. Progress is kept in the browser, ticks off with a little note beside
// the button, and finding everything earns a badge. The list is in LIST below.
import { sound } from './audio.js';

const touch = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
/* id: what the game reports; go: where "Show me" walks you (a place id, or a function name the
   game handles); need: how many of something to collect */
export const LIST = [
  { group: 'The village', items: [
    { id: 'about', text: 'Read the About Me signpost', go: 'about' },
    { id: 'stalls', text: 'Open every stall', need: 6, go: 'nextStall' },
    { id: 'outfit', text: 'Try on a new outfit', go: 'outfits' },
    { id: 'roll', text: touch ? 'Do a dash roll (tap Jump twice)' : 'Do a dash roll (Space twice)' },
    { id: 'night', text: 'See the village at night', go: 'night' },
  ] },
  { group: 'The town hall', items: [
    { id: 'board', text: 'Read the agent board', go: 'board' },
    { id: 'agents', text: 'Talk to every agent', need: 4, go: 'nextAgent' },
    { id: 'call', text: 'Call someone to the meeting table', go: 'board' },
  ] },
  { group: 'The Hideout', items: [
    { id: 'hideout', text: 'Find the Hideout', go: 'hideout' },
    { id: 'cd', text: 'Change the CD', go: 'hx:music' },
    { id: 'journal', text: 'Open the journal', go: 'hx:journal' },
    { id: 'gallery', text: 'Visit the gallery', go: 'hx:gallery' },
    { id: 'library', text: 'Browse the library', go: 'hx:library' },
    { id: 'cat', text: 'Pet the cat', go: 'hx:cat' },
  ] },
  { group: 'The pond', items: [
    { id: 'facts', text: 'Catch all three facts', need: 3, go: 'pond' },
  ] },
];
const ITEMS = LIST.flatMap((g) => g.items);
const KEY = 'pv-found';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const STAR = (g) => { const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); }; f('#ffd24a', 7, 1, 2, 3); f('#ffd24a', 5, 4, 6, 2); f('#ffd24a', 1, 6, 14, 2); f('#ffd24a', 3, 8, 10, 2); f('#ffd24a', 4, 10, 8, 2); f('#ffd24a', 3, 12, 3, 2); f('#ffd24a', 10, 12, 3, 2); f('#fff2b0', 7, 6, 2, 3); };

// handlers: { go(target), toast(o), focusGame() }
export function createDiscoveries(handlers) {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { saved = {}; }
  const done = new Set((saved.done || []).filter((id) => ITEMS.some((q) => q.id === id)));
  const counts = { agents: new Set(saved.agents || []), facts: new Set(saved.facts || []), stalls: new Set() };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ done: [...done], agents: [...counts.agents], facts: [...counts.facts] })); } catch (e) { /* storage unavailable */ } };
  const total = ITEMS.length;

  /* the button: a progress ring and the count */
  const btn = el('button', 'disc-btn'); btn.id = 'discBtn'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg class="disc-ring" viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="bg"/><circle cx="18" cy="18" r="15" class="fg"/></svg><span class="disc-label">Discoveries</span><b class="disc-count"></b>';
  const ring = btn.querySelector('.fg'), countEl = btn.querySelector('.disc-count');
  const chip = el('div', 'disc-chip'); chip.setAttribute('role', 'status'); chip.setAttribute('aria-live', 'polite');

  /* the panel */
  const panel = el('div', 'disc-panel'); panel.id = 'discPanel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Discoveries');
  const scrim = el('div', 'disc-scrim');
  const head = el('div', 'disc-head'), title = el('div'), x = el('button', 'xbtn disc-x', '×'); x.setAttribute('aria-label', 'Close');
  title.append(el('small', '', 'Things to find'), el('strong', '', 'Discoveries'));
  head.append(title, x);
  const bar = el('div', 'disc-bar'), barFill = el('i'), barText = el('span'); bar.append(barFill);
  const list = el('div', 'disc-list'), foot = el('p', 'disc-foot');
  panel.append(head, bar, barText, list, foot);
  const rows = {};
  LIST.forEach((g) => {
    const sec = el('section'); sec.appendChild(el('h3', '', g.group));
    g.items.forEach((it) => {
      const row = el('div', 'disc-row'), box = el('i', 'disc-box'), txt = el('span', 'disc-text', it.text), n = el('em', 'disc-n');
      const go = el('button', 'disc-go', 'Show me'); go.setAttribute('aria-label', 'Show me: ' + it.text);
      if (!it.go) go.hidden = true; else go.onclick = () => { close(true); handlers.go(it.go); };
      row.append(box, txt, n, go); sec.appendChild(row); rows[it.id] = { row, n, go };
    });
    list.appendChild(sec);
  });
  document.body.append(scrim, panel);

  let open = false;
  function paint() {
    const n = done.size;
    countEl.textContent = n + '/' + total; ring.style.strokeDashoffset = String(94.25 * (1 - n / total));
    barFill.style.width = (n / total) * 100 + '%'; barText.className = 'disc-bar-text'; barText.textContent = n === total ? 'Everything found. Thanks for exploring!' : n + ' of ' + total + ' found';
    btn.classList.toggle('all', n === total);
    for (const it of ITEMS) {
      const r = rows[it.id], d = done.has(it.id); r.row.classList.toggle('done', d); r.go.hidden = d || !it.go;
      r.n.textContent = it.need && !d ? (counts[it.id] ? counts[it.id].size : 0) + '/' + it.need : '';
    }
    foot.textContent = n === total ? 'You found everything in MyCraft Dungeon.' : 'Find them all for a badge.';
  }
  function show() { if (open) return; open = true; paint(); panel.classList.add('show'); scrim.classList.add('show'); btn.setAttribute('aria-expanded', 'true'); sound.play('menu'); setTimeout(() => x.focus({ preventScroll: true }), 30); }
  function close(silent) { if (!open) return; open = false; panel.classList.remove('show'); scrim.classList.remove('show'); btn.setAttribute('aria-expanded', 'false'); if (!silent) sound.play('menu'); handlers.focusGame(); }
  btn.onclick = () => (open ? close() : show()); x.onclick = () => close(); scrim.addEventListener('pointerdown', () => close());

  // a short note slides out beside the button for each new find, one after another
  const queue = []; let showing = false;
  function note(text) { queue.push(text); if (!showing) next(); }
  function next() {
    const text = queue.shift(); if (!text) { showing = false; return; } showing = true;
    chip.innerHTML = ''; chip.append(el('i', 'disc-tick'), el('span', '', text), el('b', '', done.size + '/' + total));
    chip.classList.remove('show'); void chip.offsetWidth; chip.classList.add('show');
    btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop');
    setTimeout(() => { chip.classList.remove('show'); setTimeout(next, 420); }, 2600);
  }

  function mark(id) {
    if (done.has(id)) return false; const it = ITEMS.find((q) => q.id === id); if (!it) return false;
    done.add(id); save(); paint(); note(it.text); sound.play('near');
    if (done.size === total) setTimeout(() => { handlers.toast({ title: 'Village Explorer', text: 'You found everything in MyCraft Dungeon. Thanks for exploring!', icon: STAR }); sound.play('achieve'); }, 3200);
    return true;
  }
  // one more of something you collect (an agent talked to, a fact caught); ticks the item off once complete
  function add(id, key) {
    const it = ITEMS.find((q) => q.id === id), set = counts[id]; if (!it || !set || set.has(key)) return;
    set.add(key); save(); if (set.size >= it.need) mark(id); else paint();
  }
  // the stalls are counted by the game already (they unlock the wolf), so it just reports them here
  function setStalls(visited) { counts.stalls = new Set(visited); const it = ITEMS.find((q) => q.id === 'stalls'); it.need = Math.max(1, handlers.stallCount || it.need); if (counts.stalls.size >= it.need) mark('stalls'); else paint(); }
  paint();
  return { button: btn, chip, mark, add, setStalls, has: (id) => done.has(id), count: (id) => (counts[id] ? counts[id].size : 0), collected: (id) => counts[id] || new Set(), isOpen: () => open, show, close };
}
