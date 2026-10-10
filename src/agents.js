// The agents who work in the town hall. Each one walks the carpets, returns to
// its desk to sit and type, then sets off again. They stop and face you when you
// come close. Talking to one only shows what it does; nothing real is triggered.
import { AGENTS, HALL, TUNING } from './config.js';
import { createFigure } from './figures.js';
import { CARPET, deskOf } from './hall.js';
import { makeBlob } from './player.js';

const SPEED = 1.7;
const designFor = (a) => ({ id: a.id, name: a.name, skin: '#c99a72', hair: a.robe, hairStyle: 'bald', brow: '#3a2a1f', eye: '#2f6b35', top: a.robe, top2: a.color, trim: a.trim, topStyle: 'robe', sleeve: 'long', robe: true, pants: a.robe, boots: '#3a2a1a' });

export function createAgents(scene) {
  const rand = (a, b) => a + Math.random() * (b - a);
  const carpetPoint = () => (Math.random() < 0.55 ? [rand(CARPET.hx[0], CARPET.hx[1]), CARPET.hz] : [CARPET.vx, rand(CARPET.vz[0], CARPET.vz[1])]);
  const onH = (p) => Math.abs(p[1] - CARPET.hz) < 0.05;
  // carpets form a cross, so any two carpet points join directly or through the middle
  const route = (from, to) => (onH(from) === onH(to) || (Math.abs(from[0] - CARPET.vx) < 0.05 && Math.abs(from[1] - CARPET.hz) < 0.05) ? [to] : [[CARPET.vx, CARPET.hz], to]);

  const list = AGENTS.map((a, i) => {
    const design = designFor(a), fig = createFigure(design, { nose: true }), desk = deskOf(a);
    fig.group.traverse((o) => { if (o.isMesh) { o.receiveShadow = false; o.userData.agent = a.id; } });
    scene.add(fig.group);
    const seated = i % 2 === 0, start = seated ? desk.seat : desk.access;
    return { ...a, design, fig, desk, x: start[0], z: start[1], yaw: 0, phase: 0, blend: 0, sit: seated ? 1 : 0, mode: seated ? 'sit' : 'walk', timer: rand(4, 10), queue: [], trips: 1 + (i % 2), blob: makeBlob(scene, 1.1) };
  });

  function plan(n) {
    if (n.mode === 'sit') { n.mode = 'walk'; n.trips = 2 + ((Math.random() * 2) | 0); n.queue = [n.desk.side, n.desk.access]; return; }
    const here = [n.x, n.z];
    if (n.trips-- > 0) n.queue = route(here, carpetPoint());
    else n.queue = [...route(here, n.desk.access), n.desk.side, n.desk.seat, 'sit'];
  }

  // talkingTo is the id of the agent whose chat is open, or null
  function update(dt, time, P, talkingTo) {
    for (const n of list) {
      const dp = Math.hypot(P.x - n.x, P.z - n.z), near = dp < 1.9 || talkingTo === n.id;
      let moving = false;
      if (n.mode === 'sit') {
        n.sit = Math.min(1, n.sit + dt * 3); n.yaw += (0 - n.yaw) * Math.min(1, dt * 8);
        if (talkingTo !== n.id) { n.timer -= dt; if (n.timer <= 0) plan(n); }
      } else {
        n.sit = Math.max(0, n.sit - dt * 3);
        if (near) { let d = Math.atan2(P.x - n.x, P.z - n.z) - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); n.yaw += d * Math.min(1, dt * 7); }
        else if (!n.queue.length) { n.timer -= dt; if (n.timer <= 0) { plan(n); n.timer = rand(0.6, 2.5); } }
        else if (n.queue[0] === 'sit') { n.queue.shift(); n.mode = 'sit'; n.timer = rand(7, 14); }
        else {
          const t = n.queue[0], dx = t[0] - n.x, dz = t[1] - n.z, dist = Math.hypot(dx, dz), step = SPEED * dt;
          if (dist <= step) { n.x = t[0]; n.z = t[1]; n.queue.shift(); }
          else { n.x += (dx / dist) * step; n.z += (dz / dist) * step; let d = Math.atan2(dx, dz) - n.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); n.yaw += d * Math.min(1, dt * 9); moving = true; }
        }
      }
      n.blend += ((moving ? 1 : 0) - n.blend) * Math.min(1, dt * 10); if (moving) n.phase += dt * 7.5;
      n.fig.pose(Math.sin(n.phase) * 0.6 * n.blend, 0, time + n.x, n.sit, talkingTo === n.id ? 0 : 1);
      n.fig.group.position.set(n.x, HALL.floor - n.sit * 0.24 + Math.abs(Math.sin(n.phase)) * 0.04 * n.blend, n.z); n.fig.group.rotation.y = n.yaw;
      n.blob.position.set(n.x, HALL.floor + 0.04, n.z); n.blob.material.opacity = 0.4;
    }
  }
  // nearest agent within talking range, or null
  function nearest(P) { let best = null, bd = TUNING.talkRange; for (const n of list) { const d = Math.hypot(P.x - n.x, P.z - n.z); if (d < bd) { bd = d; best = n; } } return best; }
  return { list, update, nearest, groups: list.map((n) => n.fig.group) };
}
