// A small interactive demo for each agent, shown in the chat panel when you talk to them.
// Everything here runs in the browser on made-up sample data: nothing is fetched,
// sent or triggered. To wire up a real action later, replace the body of a button's
// handler with a call to your own endpoint and show what it returns.
//
// Each demo is a function (root, agent) that fills `root` and returns a cleanup function.

const h = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
const button = (label, cls, onClick) => { const b = h('button', cls, label); b.type = 'button'; b.onclick = onClick; return b; };

// Timers that stop when the panel closes.
function clock() {
  const ids = new Set();
  return {
    after(ms, fn) { const id = setTimeout(() => { ids.delete(id); fn(); }, ms); ids.add(id); return id; },
    stop() { ids.forEach(clearTimeout); ids.clear(); },
  };
}
// Type a line out a few characters at a time.
function type(el, text, time, done) {
  let i = 0; el.textContent = '';
  const tick = () => { i += 2; el.textContent = text.slice(0, i); if (i < text.length) time.after(22, tick); else if (done) done(); };
  tick();
}
// A row of choices where one is picked.
function chips(labels, onPick, start = 0) {
  const row = h('div', 'chips'); let current = start;
  const all = labels.map((label, i) => { const b = button(label, 'chip' + (i === start ? ' on' : ''), () => { current = i; all.forEach((c, k) => c.classList.toggle('on', k === i)); onPick(i); }); row.appendChild(b); return b; });
  return { row, value: () => current };
}
// A run of status lines with a progress bar, then a callback.
function progress(root, lines, time, done) {
  const box = h('div', 'dprog'), bar = h('div', 'dbar'), fill = h('i'), text = h('span');
  bar.appendChild(fill); box.appendChild(text); box.appendChild(bar); root.appendChild(box);
  let k = 0;
  const next = () => {
    if (k >= lines.length) { time.after(250, () => { box.remove(); done(); }); return; }
    text.textContent = lines[k]; fill.style.width = ((k + 1) / lines.length) * 100 + '%'; k++; time.after(620, next);
  };
  next();
}

/* ── Bobby: the news scraper ── */
const TOPICS = ['All topics', 'Work and visas', 'Money', 'Community', 'Thailand'];
const STORIES = [
  { t: 'Work permit renewals move to a single online form', topic: 1, src: 'Sample Daily', score: 96 },
  { t: 'Remittance fees fall on two popular transfer apps', topic: 2, src: 'Example Wire', score: 91 },
  { t: 'Free Thai language classes open in three provinces', topic: 3, src: 'Sample Daily', score: 88 },
  { t: 'Minimum wage review scheduled for next quarter', topic: 1, src: 'Demo Post', score: 85 },
  { t: 'Weekend health clinic for migrant families returns', topic: 3, src: 'Example Wire', score: 82 },
  { t: 'Baht steadies after a volatile week', topic: 2, src: 'Demo Post', score: 77 },
  { t: 'New bus routes link two industrial estates', topic: 4, src: 'Sample Daily', score: 71 },
  { t: 'Flood warnings issued for low-lying districts', topic: 4, src: 'Example Wire', score: 68 },
];
function bobby(root) {
  const time = clock(); let ran = false;
  const pick = chips(TOPICS, () => { if (ran) show(); });
  const run = button("Run today's scrape", 'dbtn', () => {
    run.disabled = true; out.textContent = ''; ran = false;
    progress(out, ['Reading 14 sources', 'Found 212 stories', 'Removing 37 duplicates', 'Ranking for Myanmar migrants in Thailand'], time, () => { ran = true; run.disabled = false; run.textContent = 'Run it again'; show(); });
  });
  const out = h('div', 'dout');
  function show() {
    out.textContent = '';
    const list = STORIES.filter((s) => !pick.value() || s.topic === pick.value()).slice(0, 5), ul = h('ol', 'dlist');
    list.forEach((s) => { const li = h('li'); li.appendChild(h('b', '', s.t)); li.appendChild(h('span', '', TOPICS[s.topic] + ' · ' + s.src)); const m = h('em', '', String(s.score)); m.title = 'Relevance score'; li.appendChild(m); ul.appendChild(li); });
    out.appendChild(ul);
    const send = button('Send shortlist to Telegram', 'dbtn alt', () => {
      send.disabled = true; send.textContent = 'Sending';
      time.after(700, () => { send.remove(); const msg = h('div', 'dbubble'); msg.appendChild(h('b', '', 'Mingalar News shortlist')); msg.appendChild(h('span', '', list.length + ' stories · ' + TOPICS[pick.value()])); msg.appendChild(h('small', '', 'Demo only: no message was sent.')); out.appendChild(msg); });
    });
    out.appendChild(send);
  }
  root.append(h('p', 'dlead', 'Pick a topic, then run the daily scrape.'), pick.row, run, out);
  return () => time.stop();
}

/* ── Friday: the Alacrity Research assistant ── */
const STATUS = [['Complete', 12, '#57d47c'], ['In progress', 5, '#ffc93c'], ['Not started', 7, '#d8403a']];
const ASKS = [
  { q: 'How many plots are in progress?', a: 'Five plots are in progress, out of twenty-four on the map.', card: 'status' },
  { q: 'What is high priority this week?', a: 'Three plots are marked high priority. Two are waiting on a boundary survey and one on a signature.', card: 'priority' },
  { q: 'Summarise plot P-014.', a: 'P-014 is in progress. The name transfer is done, the boundary survey is booked, and the fencing has not started.', card: 'plot' },
];
function friday(root) {
  const time = clock(), log = h('div', 'dchat');
  function ask(i, heard) {
    const item = ASKS[i]; log.textContent = '';
    log.appendChild(h('div', 'dsay you', (heard ? 'Heard: ' : '') + item.q));
    const reply = h('div', 'dsay'); log.appendChild(reply);
    type(reply, item.a, time, () => {
      if (item.card === 'status') {
        const bar = h('div', 'dstack'), key = h('div', 'dkey'), total = STATUS.reduce((n, s) => n + s[1], 0);
        STATUS.forEach(([name, n, c]) => { const seg = h('i'); seg.style.width = (n / total) * 100 + '%'; seg.style.background = c; bar.appendChild(seg); const k = h('span', '', name + ' ' + n); k.style.setProperty('--c', c); key.appendChild(k); });
        log.append(bar, key);
      } else if (item.card === 'priority') {
        const ul = h('ul', 'dticks'); ['P-003 · boundary survey', 'P-014 · boundary survey', 'P-021 · signature'].forEach((x) => ul.appendChild(h('li', '', x))); log.appendChild(ul);
      } else {
        const ul = h('ul', 'dticks'); [['Name transfer', true], ['Boundary survey', false], ['Fencing', false]].forEach(([x, ok]) => ul.appendChild(h('li', ok ? 'ok' : '', x))); log.appendChild(ul);
      }
    });
  }
  const row = h('div', 'chips'); ASKS.forEach((a, i) => row.appendChild(button(a.q, 'chip', () => ask(i))));
  const wave = h('div', 'dwave'); for (let i = 0; i < 14; i++) wave.appendChild(h('i'));
  const talk = button('Ask by voice', 'dbtn', () => {
    talk.disabled = true; wave.classList.add('on'); talk.textContent = 'Listening';
    time.after(1500, () => { wave.classList.remove('on'); talk.disabled = false; talk.textContent = 'Ask by voice'; ask((Math.random() * ASKS.length) | 0, true); });
  });
  const voice = h('div', 'drow'); voice.append(talk, wave);
  root.append(h('p', 'dlead', 'Ask about the map, or try the voice button.'), row, voice, log);
  return () => time.stop();
}

/* ── Sally: the urban expansion researcher ── */
const HEAT = ['#16233f', '#234a9e', '#2fa0a8', '#57d47c', '#e4d23a', '#f08a2a', '#d8403a'];
function sally(root) {
  const time = clock();
  const cvs = h('canvas', 'dcity'); cvs.width = 96; cvs.height = 60;
  const slider = h('input', 'dslider'); slider.type = 'range'; slider.min = 1990; slider.max = 2030; slider.value = 2014; slider.id = 'demoYear'; slider.setAttribute('aria-label', 'Year');
  const read = h('div', 'dread');
  // logistic growth of the built-up area, and the radius it implies
  const area = (y) => 900 / (1 + Math.exp(-0.12 * (y - 2008)));
  function draw() {
    const y = +slider.value, A = area(y), D = 1.9 * Math.sqrt(A / Math.PI), g = cvs.getContext('2d'), px = 0.62; // km per pixel
    for (let j = 0; j < 60; j++) for (let i = 0; i < 96; i++) {
      const r = Math.hypot(i - 47.5, j - 29.5) * px, dens = 0.04 + 0.96 / (1 + Math.exp(4.2 * ((2 * r) / D - 1)));
      g.fillStyle = HEAT[Math.min(6, Math.floor(dens * 6.99))]; g.fillRect(i, j, 1, 1);
    }
    read.textContent = '';
    [['Year', String(y)], ['Built-up area', Math.round(A) + ' km²'], ['Main urban radius', D.toFixed(1) + ' km']].forEach(([k, v]) => { const d = h('div'); d.append(h('span', '', k), h('b', '', v)); read.appendChild(d); });
  }
  slider.oninput = draw;
  const out = h('div', 'dout');
  const run = button('Check the model against the rings', 'dbtn', () => {
    run.disabled = true; out.textContent = '';
    progress(out, ['Loading ring data, 1989 to 2014', 'Fitting the logistic area curve', 'Deriving the wave and the density profile'], time, () => { run.disabled = false; out.appendChild(h('div', 'dresult', 'The derived profile matches the sample rings with R² = 0.998.')); });
  });
  const view = h('div', 'drow top'); const side = h('div', 'dcol'); side.append(read, slider); view.append(cvs, side);
  root.append(h('p', 'dlead', 'Drag the year to watch the city grow outward.'), view, run, out);
  draw();
  return () => time.stop();
}

/* ── Edwin: the financial advisor ── */
const ASSETS = [['Cash', '#a9b3c6'], ['Bonds', '#62a0d8'], ['Shares', '#57d47c'], ['Property', '#ffc93c']];
const PLANS = [['Cautious', [25, 45, 20, 10]], ['Balanced', [10, 30, 45, 15]], ['Bold', [5, 15, 65, 15]]];
const HELD = [12, 24, 51, 13]; // what the sample portfolio holds today
function edwin(root) {
  const time = clock();
  const row = (title, values) => { const box = h('div', 'dalloc'); box.appendChild(h('span', '', title)); const bar = h('div', 'dstack tall'); values.forEach((v, i) => { const seg = h('i', '', v >= 9 ? v + '%' : ''); seg.style.width = v + '%'; seg.style.background = ASSETS[i][1]; seg.title = ASSETS[i][0] + ' ' + v + '%'; bar.appendChild(seg); }); box.appendChild(bar); return { box, bar }; };
  const held = row('Held today', HELD), target = row('Target', PLANS[1][1]);
  const key = h('div', 'dkey'); ASSETS.forEach(([name, c]) => { const k = h('span', '', name); k.style.setProperty('--c', c); key.appendChild(k); });
  const out = h('ul', 'dticks');
  const pick = chips(PLANS.map((p) => p[0]), (i) => {
    [...target.bar.children].forEach((seg, k) => { const v = PLANS[i][1][k]; seg.style.width = v + '%'; seg.textContent = v >= 9 ? v + '%' : ''; seg.title = ASSETS[k][0] + ' ' + v + '%'; });
    out.textContent = '';
  }, 1);
  const brief = button('Write the morning brief', 'dbtn', () => {
    out.textContent = ''; brief.disabled = true;
    const goal = PLANS[pick.value()][1], lines = [];
    // the biggest gap between what is held and the chosen target comes first
    HELD.map((v, i) => [i, v - goal[i]]).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).slice(0, 2).forEach(([i, d]) => { if (d) lines.push(ASSETS[i][0] + ' is ' + Math.abs(d) + ' points ' + (d > 0 ? 'over' : 'under') + ' the ' + PLANS[pick.value()][0].toLowerCase() + ' target of ' + goal[i] + '%.'); });
    lines.push('The cash on hand covers about seven months of spending.');
    let k = 0;
    const next = () => { if (k >= lines.length) { brief.disabled = false; return; } const li = h('li'); out.appendChild(li); type(li, lines[k++], time, () => time.after(150, next)); };
    next();
  });
  root.append(h('p', 'dlead', 'Choose a plan and compare it with what is held.'), pick.row, held.box, target.box, key, brief, out, h('p', 'dfine', 'A made-up portfolio. Not financial advice.'));
  return () => time.stop();
}

export const DEMOS = { bobby, friday, sally, edwin };
