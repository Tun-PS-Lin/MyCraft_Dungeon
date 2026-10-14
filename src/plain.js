// The simple version: every project, agent and contact detail on one ordinary page.
// It reads the same src/config.js as the village, so the two never drift apart.
import { inject as analytics } from '@vercel/analytics';
import { STALLS, AGENTS, SITE_NAME, CONTACT_EMAIL, REPO_URL } from './config.js';
import { BASE } from './base.js';
import { JOURNAL, GALLERY, BOOKS } from './hideout-content.js';
import { drawPainting, drawIcon, pictureCanvas } from './pixelart.js';

analytics();

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
const link = (href, text, cls) => { const a = el('a', cls, text); a.href = href; if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; } return a; };
const page = document.getElementById('page');
const about = STALLS.find((s) => s.about);
const projects = STALLS.filter((s) => s.kind === 'project' && !s.about && !s.email);
const noWebGL = new URLSearchParams(location.search).get('from') === '3d';

/* header */
const head = el('header', 'hero');
head.appendChild(el('p', 'kicker', 'A portfolio by Tun. L'));
head.appendChild(el('h1', '', SITE_NAME));
if (about) head.appendChild(el('p', 'lede', about.desc));
const actions = el('div', 'actions');
if (noWebGL) head.appendChild(el('p', 'note', "This device can't show the 3D village, so here is everything on one page."));
else actions.appendChild(link('./', 'Enter the 3D village', 'btn primary'));
actions.appendChild(link('mailto:' + CONTACT_EMAIL, 'Email me', 'btn'));
head.appendChild(actions);
page.appendChild(head);

/* projects */
const sec = (title, sub) => { const s = el('section'); s.appendChild(el('h2', '', title)); if (sub) s.appendChild(el('p', 'sub', sub)); page.appendChild(s); return s; };
const ps = sec('Projects');
const grid = el('div', 'cards'); ps.appendChild(grid);
for (const p of projects) {
  const c = el('article', 'card'); c.style.setProperty('--accent', p.color);
  if (p.image) { const img = el('img'); img.src = BASE + 'assets/images/' + p.image; img.alt = p.title; img.loading = 'lazy'; img.width = 1100; img.height = 619; c.appendChild(img); } else c.appendChild(el('div', 'noimg', p.title));
  const b = el('div', 'body'); b.appendChild(el('h3', '', p.title)); b.appendChild(el('p', '', p.desc));
  if (p.url) b.appendChild(link(p.url, (p.sub || p.cta) + ' ↗', 'go')); else b.appendChild(el('span', 'soon', 'Link coming soon'));
  c.appendChild(b); grid.appendChild(c);
}

/* agents */
const as = sec('The agents', 'Four AI agents I have built or am building. In the village they work in the town hall; the demos there run on sample data.');
const list = el('div', 'agents'); as.appendChild(list);
for (const a of AGENTS) {
  const c = el('article', 'agent'); c.style.setProperty('--accent', a.color);
  const top = el('div', 'atop'); top.appendChild(el('h3', '', a.name)); top.appendChild(el('span', 'role', a.role)); c.appendChild(top);
  c.appendChild(el('p', '', a.about));
  const dl = el('dl');
  for (const [k, v] of [['Runs', a.schedule], ['Delivers', a.delivers]]) { dl.appendChild(el('dt', '', k)); dl.appendChild(el('dd', '', v)); }
  c.appendChild(dl); list.appendChild(c);
}

/* side projects (the gallery in the Hideout) */
if (GALLERY.length) {
  const gs = sec('Side projects', 'Smaller things I have built. In the village they hang in the Hideout, down the cave.');
  const gg = el('div', 'cards'); gs.appendChild(gg);
  for (const p of GALLERY) {
    const c = el('article', 'card'); c.style.setProperty('--accent', '#c98a2b');
    let pic; if (p.image) { pic = el('img', 'shot'); pic.src = './assets/images/gallery/' + p.image + '.jpg'; pic.alt = p.title; pic.loading = 'lazy'; } else { pic = pictureCanvas(32, 24, (g) => drawPainting(g, p.art)); pic.className = 'pix'; }
    c.appendChild(pic);
    const b = el('div', 'body'); b.appendChild(el('h3', '', p.title)); b.appendChild(el('p', '', p.desc));
    if (p.url) b.appendChild(link(p.url, 'Visit ↗', 'go')); else b.appendChild(el('span', 'soon', 'Link coming soon'));
    c.appendChild(b); gg.appendChild(c);
  }
}

/* bookshelf */
if (BOOKS.length) {
  const bs = sec('Bookshelf', 'Books that shaped how I think, with one line on each.');
  const bg = el('div', 'books'); bs.appendChild(bg);
  for (const bk of BOOKS) {
    const c = el('article', 'book'); const img = el('img'); img.src = BASE + 'assets/images/books/' + bk.cover; img.alt = bk.title; img.loading = 'lazy'; img.width = 480; img.height = 720; c.appendChild(img);
    const b = el('div', 'body'); b.append(el('h3', '', bk.title), el('p', 'by', bk.author), el('p', '', bk.takeaway)); c.appendChild(b); bg.appendChild(c);
  }
}

/* journal */
if (JOURNAL.length) {
  const js = sec('Journal', 'Notes on the mental models I use.');
  for (const e of JOURNAL) {
    const d = el('details', 'entry'), s2 = el('summary'); const ic = pictureCanvas(16, 16, (g) => drawIcon(g, e.icon)); ic.className = 'pix-icon';
    const t = el('span'); t.append(el('strong', '', e.title), el('small', '', 'Mental model No. ' + String(e.n).padStart(2, '0')));
    s2.append(ic, t); d.appendChild(s2);
    const q = el('blockquote'); q.appendChild(el('p', '', '\u201c' + e.quote + '\u201d')); if (e.by) q.appendChild(el('cite', '', '\u2014 ' + e.by)); d.appendChild(q);
    const ul = el('ul'); (e.points || []).forEach((p) => ul.appendChild(el('li', '', p))); d.appendChild(ul); js.appendChild(d);
  }
}

/* contact */
const cs = sec('Say hello', 'Want to work together or talk through an idea?');
const mail = link('mailto:' + CONTACT_EMAIL, CONTACT_EMAIL, 'mail'); cs.appendChild(mail);

const foot = el('footer');
foot.appendChild(document.createTextNode('Made by Tun. L'));
if (REPO_URL) { foot.appendChild(document.createTextNode(' · ')); foot.appendChild(link(REPO_URL, 'Source on GitHub')); }
if (!noWebGL) { foot.appendChild(document.createTextNode(' · ')); foot.appendChild(link('./', 'Back to the village')); }
page.appendChild(foot);
