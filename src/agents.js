// The agents who work in the town hall. Each one sits and types at its desk, walks
// the carpets, and now and then walks over to the stall it serves before coming back.
// They stop and face you when you come close, and the agent board can call one to the
// meeting table. Everything they "do" here is for show: the work log is sample activity.
import { AGENTS, STALLS, HALL, TUNING, LIVE_STATUS_URL, frontOf } from './config.js';
import { createFigure } from './figures.js';
import { CARPET, deskOf } from './hall.js';
import { makeBlob } from './player.js';
import { findPath } from './nav.js';
import { groundAt } from './collision.js';

// How each agent looks. The fields are the same as an outfit in figures.js.
const LOOKS = {
  bobby: { skin: '#c99a72', hair: '#5a3a22', hairStyle: 'short', brow: '#3a2a1f', eye: '#2f6b35', top: '#3d8a4a', top2: '#e9e2cf', trim: '#5b3a1e', topStyle: 'vest', sleeve: 'short', pants: '#4a3b2a', boots: '#2a2019', cap: '#6a5236', gear: ['newscap', 'satchel', 'belt', 'boots'] },
  friday: { skin: '#d9ab82', hair: '#2a2019', hairStyle: 'pony', lashes: true, slim: true, eye: '#2b3a67', top: '#3b6fd0', top2: '#cfe6ff', trim: '#cfe6ff', topStyle: 'vest', sleeve: 'long', skirt: true, pants: '#27407f', boots: '#1d2333', gear: ['headset', 'skirt', 'tablet', 'boots'] },
  sally: { skin: '#e2b48a', hair: '#a5482a', hairStyle: 'bun', lashes: true, slim: true, glasses: true, eye: '#2f6b35', top: '#f1efe6', top2: '#d9d6ca', trim: '#2b9a88', topStyle: 'robe', sleeve: 'long', robe: true, pants: '#f1efe6', boots: '#3a2a1a', gear: ['coat', 'scarf', 'book'] },
  edwin: { skin: '#b98a62', hair: '#3a3a40', hairStyle: 'short', brow: '#2a2a30', moustache: '#3a3a40', eye: '#2a2019', top: '#6a3fb0', top2: '#f1efe6', trim: '#e4b93a', topStyle: 'vest', sleeve: 'long', pants: '#2a2040', boots: '#12141f', gear: ['tophat', 'tie', 'watch', 'belt', 'boots'] },
};
// Sample desk work: [line for the activity log, short speech bubble]
const WORK = {
  bobby: [['filed 3 stories from Sample Daily', '3 stories filed'], ['dropped 5 duplicate stories', 'Duplicates gone'], ['ranked the shortlist for today', 'Shortlist ranked'], ['tagged 4 stories as work and visas', 'Tagged 4']],
  friday: [['answered a question about plot P-014', 'Answered!'], ['updated 2 task statuses on the map', '2 tasks updated'], ['logged a voice note', 'Noted'], ['looked up this week\'s high priority plots', 'Found 3 plots']],
  sally: [['fitted the 2014 ring data', 'Good fit'], ['checked the density profile against the model', 'Profile checked'], ['saved a note on the growth curve', 'Note saved'], ['pulled new ring data for comparison', 'Data in']],
  edwin: [['compared holdings with the target', 'On target?'], ['flagged a bond that matures soon', 'Flagged one'], ['drafted the morning brief', 'Brief drafted'], ['checked the cash buffer', 'Buffer is fine']],
};
const SPOTS = [[2, 6], [-4, 3], [6, -3], [11, -5], [12, 6], [3, 11]]; // other places to pause on the way back
const MAX_OUT = 2; // at most this many agents away from the hall at once

export function createAgents(scene, hall) {
  const rand = (a, b) => a + Math.random() * (b - a);
  const carpetPoint = () => (Math.random() < 0.55 ? [rand(CARPET.hx[0], CARPET.hx[1]), CARPET.hz] : [CARPET.vx, rand(CARPET.vz[0], CARPET.vz[1])]);
  const path = (from, to) => findPath(from[0], from[1], to[0], to[1]) || [to];
  const listeners = [], log = [];
  // tell the interface something happened: a line for the log and, optionally, a speech bubble
  function emit(n, text, bubble) {
    const d = new Date(), entry = { id: n.id, name: n.name, color: n.color, text, bubble, time: String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') };
    if (text) { log.unshift(entry); if (log.length > 12) log.pop(); }
    listeners.forEach((f) => f(entry));
  }

  const list = AGENTS.map((a, i) => {
    const design = Object.assign({ id: a.id, name: a.name }, LOOKS[a.id]), fig = createFigure(design, { nose: true, tag: a.id }), desk = deskOf(a);
    fig.group.traverse((o) => { if (o.isMesh) { o.receiveShadow = false; o.userData.agent = a.id; } });
    scene.add(fig.group);
    const seated = i % 2 === 0, start = seated ? desk.seat : desk.access, stall = STALLS.find((s) => s.id === a.haunt);
    // stand a little to one side of the stall front, so the player's own spot stays free
    let visit = null; if (stall) { const f = frontOf(stall, 3.5), side = stall.face === 'south' ? [1.7, 0] : [0, 1.7]; visit = [f[0] + side[0], f[1] + side[1]]; }
    return { ...a, index: i, design, fig, desk, stall, visit, x: start[0], z: start[1], y: HALL.floor, yaw: 0, phase: 0, blend: 0, sit: seated ? 1 : 0,
      mode: seated ? 'sit' : 'walk', task: 'work', arrived: false, atStall: false, timer: rand(5, 12), workIn: rand(6, 14), done: 0, lastWork: null, queue: [], trips: 1 + (i % 2), outside: false, blob: makeBlob(scene, 1.1) };
  });
  const away = () => list.filter((n) => n.task === 'break').length;
  const home = (n, from) => [...path(from, n.desk.access), n.desk.side, n.desk.seat, 'sit'];

  // decide what an idle agent does next
  function plan(n) {
    const here = [n.x, n.z], leaving = n.mode === 'sit', lead = leaving ? [n.desk.side, n.desk.access] : [], from = leaving ? n.desk.access : here;
    if (leaving) { n.mode = 'walk'; n.trips = 1 + ((Math.random() * 3) | 0); }
    if (leaving && n.visit && Math.random() < 0.45 && away() < MAX_OUT) {
      // a break with a purpose: over to the stall this agent serves, sometimes one more stop, then back
      const b = SPOTS[(Math.random() * SPOTS.length) | 0];
      n.task = 'break'; n.queue = [...lead, ...path(from, n.visit), { wait: rand(7, 12), stall: true }, ...(Math.random() < 0.4 ? [...path(n.visit, b), { wait: rand(4, 7) }, ...home(n, b)] : home(n, n.visit))];
      emit(n, 'walked over to ' + n.stall.label, 'Off to ' + n.stall.label);
    } else if (n.trips-- > 0) n.queue = [...lead, ...path(from, carpetPoint()), { wait: rand(0.8, 3) }];
    else n.queue = home(n, here);
  }
  // the board calls an agent: it comes to the meeting table, waits, then goes back to work
  function call(id) {
    const n = list.find((q) => q.id === id); if (!n || n.task === 'called') return;
    const spot = hall.table.spot(n.index), leaving = n.mode === 'sit', from = leaving ? n.desk.access : [n.x, n.z];
    n.mode = 'walk'; n.task = 'called'; n.arrived = false; n.atStall = false;
    n.queue = [...(leaving ? [n.desk.side, n.desk.access] : []), ...path(from, spot), { wait: 24, arrive: true }, ...home(n, spot)];
    emit(n, 'was called to the meeting table', 'On my way!');
  }
  const face = (n, x, z, rate) => { let d = Math.atan2(x - n.x, z - n.z) - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); n.yaw += d * rate; };

  // talkingTo is the id of the agent whose chat is open, or null
  function update(dt, time, P, talkingTo) {
    for (const n of list) {
      const dp = Math.hypot(P.x - n.x, P.z - n.z), near = dp < 1.9 || talkingTo === n.id;
      let moving = false;
      if (n.mode === 'sit') {
        n.sit = Math.min(1, n.sit + dt * 3); n.yaw += (0 - n.yaw) * Math.min(1, dt * 8);
        if (talkingTo !== n.id) {
          n.timer -= dt; n.workIn -= dt;
          if (n.workIn <= 0) { const w = WORK[n.id][(Math.random() * WORK[n.id].length) | 0]; n.workIn = rand(11, 24); n.done++; n.lastWork = { text: w[0], at: Date.now() }; emit(n, w[0], w[1]); }
          if (n.timer <= 0) plan(n);
        }
      } else {
        n.sit = Math.max(0, n.sit - dt * 3);
        const step = n.queue[0];
        if (near) face(n, P.x, P.z, Math.min(1, dt * 7));
        else if (step === undefined) plan(n);
        else if (step === 'sit') { n.queue.shift(); n.mode = 'sit'; n.arrived = false; n.timer = rand(14, 26); n.workIn = rand(4, 9); if (n.task !== 'work') emit(n, 'is back at the desk', 'Back to work'); n.task = 'work'; }
        else if (!Array.isArray(step)) {
          if (step.arrive) { if (!n.arrived) emit(n, 'arrived at the meeting table', 'You called?'); n.arrived = true; face(n, hall.table.at[0], hall.table.at[1], Math.min(1, dt * 5)); }
          if (step.stall) { n.atStall = true; face(n, n.stall.pos[0], n.stall.pos[1], Math.min(1, dt * 4)); }
          step.wait -= dt; if (step.wait <= 0) { n.queue.shift(); n.arrived = false; n.atStall = false; if (n.task === 'called') n.task = 'work'; }
        } else {
          const dx = step[0] - n.x, dz = step[1] - n.z, dist = Math.hypot(dx, dz), go = (n.outside ? 2.3 : 1.8) * dt;
          if (dist <= go) { n.x = step[0]; n.z = step[1]; n.queue.shift(); }
          else { n.x += (dx / dist) * go; n.z += (dz / dist) * go; face(n, step[0], step[1], Math.min(1, dt * 9)); moving = true; }
        }
      }
      n.outside = n.z > HALL.z1 + 0.2;
      n.y += (groundAt(n.x, n.z, n.y) - n.y) * Math.min(1, dt * 10);
      n.blend += ((moving ? 1 : 0) - n.blend) * Math.min(1, dt * 10); if (moving) n.phase += dt * (n.outside ? 9 : 7.5);
      n.fig.pose(Math.sin(n.phase) * 0.6 * n.blend, 0, time + n.index * 2, n.sit, talkingTo === n.id ? 0 : 1);
      n.fig.group.position.set(n.x, n.y - n.sit * 0.24 + (1 - Math.cos(n.phase * 2)) * 0.02 * n.blend, n.z); n.fig.group.rotation.y = n.yaw;
      n.blob.position.set(n.x, n.y + 0.04, n.z); n.blob.material.opacity = 0.4;
    }
  }
  // 'working' | 'break' | 'coming' | 'here'
  const status = (n) => (n.task === 'called' ? (n.arrived ? 'here' : 'coming') : n.task === 'break' ? 'break' : 'working');
  // where the agent is: an interface text key, plus a name for the stall case
  const where = (n) => (n.task === 'called' ? { key: n.arrived ? 'whereHere' : 'whereWay' } : n.atStall ? { key: 'whereStall', name: n.stall.label } : n.outside ? { key: 'whereOut' } : n.mode === 'sit' ? { key: 'whereDesk' } : { key: 'whereHall' });

  /* the "last run" line. Scheduled agents work it out from the clock in Bangkok;
     the others report their latest piece of desk work. A real endpoint can override both. */
  const fetched = {};
  if (LIVE_STATUS_URL) { const pull = () => fetch(LIVE_STATUS_URL).then((r) => r.json()).then((j) => Object.assign(fetched, j)).catch(() => {}); pull(); setInterval(pull, 60000); }
  function lastRun(n) {
    if (fetched[n.id]) return { real: true, when: fetched[n.id].when, result: fetched[n.id].result };
    if (n.runsAt) {
      const now = new Date(Date.now() + (7 * 60 + new Date().getTimezoneOffset()) * 60000), [h, m] = n.runsAt.split(':').map(Number);
      let back = now.getHours() * 60 + now.getMinutes() >= h * 60 + m ? 0 : 1; // days since the last run
      if (n.weekdays) { const d = new Date(now); d.setDate(d.getDate() - back); while (d.getDay() === 0 || d.getDay() === 6) { d.setDate(d.getDate() - 1); back++; } }
      return { days: back, at: n.runsAt, result: n.result };
    }
    return n.lastWork ? { mins: Math.floor((Date.now() - n.lastWork.at) / 60000), result: n.lastWork.text } : { none: true };
  }
  // nearest agent within talking range that the player can actually see, or null
  function nearest(P, indoors) { let best = null, bd = TUNING.talkRange; for (const n of list) { if (!n.outside && indoors < 0.5) continue; const d = Math.hypot(P.x - n.x, P.z - n.z); if (d < bd) { bd = d; best = n; } } return best; }
  return { list, log, update, nearest, call, status, where, lastRun, onEvent: (f) => listeners.push(f), groups: list.map((n) => n.fig.group) };
}
