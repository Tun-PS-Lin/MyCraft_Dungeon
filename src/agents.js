// The agents who work in the town hall. Each one sits and types at its desk, walks
// the carpets, and now and then takes a break out in the village before coming back.
// They stop and face you when you come close, and the agent board can call one over.
import { AGENTS, HALL } from './config.js';
import { createFigure } from './figures.js';
import { CARPET, deskOf } from './hall.js';
import { makeBlob } from './player.js';
import { findPath } from './nav.js';
import { groundAt } from './collision.js';
import { TUNING } from './config.js';

// places in the square where an agent on a break goes to stand
const SPOTS = [[2, 6], [-4, 3], [6, -3], [11, -5], [-9, -4.5], [-11, 5], [12, 6], [3, 11], [-3, -9], [14, -6]];
const MAX_OUT = 2; // at most this many agents away from the hall at once
const designFor = (a) => ({ id: a.id, name: a.name, skin: '#c99a72', hair: a.robe, hairStyle: 'bald', brow: '#3a2a1f', eye: '#2f6b35', top: a.robe, top2: a.color, trim: a.trim, topStyle: 'robe', sleeve: 'long', robe: true, pants: a.robe, boots: '#3a2a1a', gear: ['sash'] });

export function createAgents(scene, board) {
  const rand = (a, b) => a + Math.random() * (b - a);
  const carpetPoint = () => (Math.random() < 0.55 ? [rand(CARPET.hx[0], CARPET.hx[1]), CARPET.hz] : [CARPET.vx, rand(CARPET.vz[0], CARPET.vz[1])]);
  const path = (from, to) => findPath(from[0], from[1], to[0], to[1]) || [to];

  const list = AGENTS.map((a, i) => {
    const design = designFor(a), fig = createFigure(design, { nose: true, tag: a.id }), desk = deskOf(a);
    fig.group.traverse((o) => { if (o.isMesh) { o.receiveShadow = false; o.userData.agent = a.id; } });
    scene.add(fig.group);
    const seated = i % 2 === 0, start = seated ? desk.seat : desk.access;
    return { ...a, index: i, design, fig, desk, x: start[0], z: start[1], y: HALL.floor, yaw: 0, phase: 0, blend: 0, sit: seated ? 1 : 0,
      mode: seated ? 'sit' : 'walk', task: 'work', arrived: false, timer: rand(5, 12), queue: [], trips: 1 + (i % 2), outside: false, blob: makeBlob(scene, 1.1) };
  });
  const away = () => list.filter((n) => n.task === 'break').length;
  const home = (n, from) => [...path(from, n.desk.access), n.desk.side, n.desk.seat, 'sit'];

  // decide what an idle agent does next
  function plan(n) {
    const here = [n.x, n.z], leaving = n.mode === 'sit', lead = leaving ? [n.desk.side, n.desk.access] : [], from = leaving ? n.desk.access : here;
    if (leaving) { n.mode = 'walk'; n.trips = 1 + ((Math.random() * 3) | 0); }
    if (leaving && Math.random() < 0.45 && away() < MAX_OUT) {
      // a break: out through the door to one or two spots in the village, then back to the desk
      const a = SPOTS[(Math.random() * SPOTS.length) | 0], b = SPOTS[(Math.random() * SPOTS.length) | 0];
      n.task = 'break'; n.queue = [...lead, ...path(from, a), { wait: rand(5, 10) }, ...(Math.random() < 0.5 ? [...path(a, b), { wait: rand(4, 8) }, ...home(n, b)] : home(n, a))];
    } else if (n.trips-- > 0) n.queue = [...lead, ...path(from, carpetPoint()), { wait: rand(0.8, 3) }];
    else n.queue = home(n, here);
  }
  // the board calls an agent over: it comes to stand in front of the board, waits, then goes back to work
  function call(id) {
    const n = list.find((q) => q.id === id); if (!n || n.task === 'called') return;
    const spot = board.callSpot(n.index, list.length), leaving = n.mode === 'sit', from = leaving ? n.desk.access : [n.x, n.z];
    n.mode = 'walk'; n.task = 'called'; n.arrived = false;
    n.queue = [...(leaving ? [n.desk.side, n.desk.access] : []), ...path(from, spot), { wait: 22, arrive: true }, ...home(n, spot)];
  }

  // talkingTo is the id of the agent whose chat is open, or null
  function update(dt, time, P, talkingTo) {
    for (const n of list) {
      const dp = Math.hypot(P.x - n.x, P.z - n.z), near = dp < 1.9 || talkingTo === n.id, facePlayer = () => { let d = Math.atan2(P.x - n.x, P.z - n.z) - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); n.yaw += d * Math.min(1, dt * 7); };
      let moving = false;
      if (n.mode === 'sit') {
        n.sit = Math.min(1, n.sit + dt * 3); n.yaw += (0 - n.yaw) * Math.min(1, dt * 8);
        if (talkingTo !== n.id) { n.timer -= dt; if (n.timer <= 0) plan(n); }
      } else {
        n.sit = Math.max(0, n.sit - dt * 3);
        const step = n.queue[0];
        if (near) facePlayer();
        else if (step === undefined) plan(n);
        else if (step === 'sit') { n.queue.shift(); n.mode = 'sit'; n.task = 'work'; n.arrived = false; n.timer = rand(9, 18); }
        else if (!Array.isArray(step)) { if (step.arrive) { n.arrived = true; if (dp < 8) facePlayer(); } step.wait -= dt; if (step.wait <= 0) { n.queue.shift(); n.arrived = false; if (n.task === 'called') n.task = 'work'; } }
        else {
          const dx = step[0] - n.x, dz = step[1] - n.z, dist = Math.hypot(dx, dz), go = (n.outside ? 2.3 : 1.8) * dt;
          if (dist <= go) { n.x = step[0]; n.z = step[1]; n.queue.shift(); }
          else { n.x += (dx / dist) * go; n.z += (dz / dist) * go; let d = Math.atan2(dx, dz) - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); n.yaw += d * Math.min(1, dt * 9); moving = true; }
        }
      }
      n.outside = n.z > HALL.z1 + 0.2;
      if (n.task === 'break' && !n.outside && n.queue.length <= 3) n.task = 'work'; // back at the desk side: the break is over
      n.y += (groundAt(n.x, n.z, n.y) - n.y) * Math.min(1, dt * 10);
      n.blend += ((moving ? 1 : 0) - n.blend) * Math.min(1, dt * 10); if (moving) n.phase += dt * (n.outside ? 9 : 7.5);
      n.fig.pose(Math.sin(n.phase) * 0.6 * n.blend, 0, time + n.index * 2, n.sit, talkingTo === n.id ? 0 : 1);
      n.fig.group.position.set(n.x, n.y - n.sit * 0.24 + (1 - Math.cos(n.phase * 2)) * 0.02 * n.blend, n.z); n.fig.group.rotation.y = n.yaw;
      n.blob.position.set(n.x, n.y + 0.04, n.z); n.blob.material.opacity = 0.4;
    }
  }
  // 'working' | 'break' | 'coming' | 'here'
  const status = (n) => (n.task === 'called' ? (n.arrived ? 'here' : 'coming') : n.task === 'break' ? 'break' : 'working');
  // where the agent is, as an interface text key
  const where = (n) => (n.task === 'called' ? (n.arrived ? 'whereHere' : 'whereWay') : n.outside ? 'whereOut' : n.mode === 'sit' ? 'whereDesk' : 'whereHall');
  // nearest agent within talking range that the player can actually see, or null
  function nearest(P, indoors) { let best = null, bd = TUNING.talkRange; for (const n of list) { if (!n.outside && indoors < 0.5) continue; const d = Math.hypot(P.x - n.x, P.z - n.z); if (d < bd) { bd = d; best = n; } } return best; }
  return { list, update, nearest, call, status, where, groups: list.map((n) => n.fig.group) };
}
