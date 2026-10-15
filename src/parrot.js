// The parrot: earned by catching all three facts at the pond. It rides on the player's shoulder;
// when the player dash-rolls it takes off, circles overhead, and flies back down to land.
// Every move is driven by a critically damped spring, so it eases in and out without jolts.
import * as THREE from 'three';
import { lin } from './textures.js';

const U = 0.0625; // one skin pixel
const mat = {};
const m = (c) => mat[c] || (mat[c] = new THREE.MeshLambertMaterial({ color: lin(c) }));
function box(parent, w, h, d, c, x, y, z) { const b = new THREE.Mesh(new THREE.BoxGeometry(w * U, h * U, d * U), m(c)); b.position.set(x * U, y * U, z * U); parent.add(b); return b; }

// 16×16 picture for the achievement badge
export function PARROT_ICON(g) {
  const f = (c, x, y, w, h) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
  f('#d8403a', 5, 2, 6, 5); f('#f6f1e3', 8, 3, 2, 2); f('#141418', 9, 3, 1, 1); f('#ffc93c', 11, 4, 2, 2); f('#c2312a', 4, 7, 7, 5);
  f('#2f66c4', 3, 8, 3, 5); f('#57d47c', 3, 12, 2, 1); f('#d8403a', 6, 12, 3, 3); f('#2f66c4', 6, 14, 2, 2); f('#ffc93c', 7, 12, 1, 1); f('#3a2a1f', 7, 11, 3, 1);
}

export function createParrot(scene, player) {
  const root = new THREE.Group(); root.visible = false; scene.add(root);
  const body = new THREE.Group(); root.add(body); // tilts with flight
  // body, head, beak, tail, feet: a little blocky macaw
  box(body, 3.2, 4.2, 3.2, '#d8403a', 0, 2.6, 0);
  box(body, 3.0, 1.2, 3.0, '#c2312a', 0, 0.9, 0.1);
  const head = new THREE.Group(); head.position.set(0, 5.2, 0.5 * 1); body.add(head);
  box(head, 3, 3, 3, '#d8403a', 0, 0.9, 0);
  box(head, 0.7, 1.3, 1.6, '#f6f1e3', 1.55, 0.9, 0.5); box(head, 0.7, 1.3, 1.6, '#f6f1e3', -1.55, 0.9, 0.5);
  box(head, 0.75, 0.6, 0.6, '#141418', 1.6, 1.0, 0.7); box(head, 0.75, 0.6, 0.6, '#141418', -1.6, 1.0, 0.7);
  box(head, 1.2, 1.4, 1.4, '#ffc93c', 0, 0.4, 2.0); box(head, 1.0, 0.8, 0.8, '#2a2019', 0, -0.4, 2.2);
  box(head, 1, 1.4, 1, '#d8403a', 0, 2.8, -0.6);
  const tail = new THREE.Group(); tail.position.set(0, 1.0, -1.6); body.add(tail);
  box(tail, 2.2, 0.6, 4.4, '#2f66c4', 0, -0.6, -2); box(tail, 1.4, 0.5, 2, '#57d47c', 0, -0.9, -4.8);
  const wings = [-1, 1].map((s) => { const w = new THREE.Group(); w.position.set(s * 1.6, 4.4, 0); body.add(w); box(w, 0.6, 4, 3, '#2f66c4', s * 0.3, -2, -0.2); box(w, 0.5, 1.4, 2.6, '#57d47c', s * 0.3, -4.4, -0.4); box(w, 0.62, 1, 3, '#ffc93c', s * 0.3, -0.2, -0.2); return w; });
  const legs = new THREE.Group(); body.add(legs); box(legs, 0.6, 0.8, 0.6, '#3a2a1f', 0.8, 0.1, 0.3); box(legs, 0.6, 0.8, 0.6, '#3a2a1f', -0.8, 0.1, 0.3);

  const SH = new THREE.Vector3(5.4 * U, 24.2 * U, -0.6 * U); // on the left shoulder, in the figure's own space
  const anchor = new THREE.Vector3(), pos = new THREE.Vector3(), vel = new THREE.Vector3(), aim = new THREE.Vector3(), tmp = new THREE.Vector3();
  let state = 'off', t = 0, yaw = 0, yawV = 0, flap = 0, flapAmt = 0, pitch = 0, look = 0, lookT = 0, lookAt = 2;
  const P = player.state;
  // spring the position toward aim: stiffness w (higher is quicker), never overshooting
  // (solved exactly for each step, so it moves the same at any frame rate)
  const chase = (w, dt) => { const e = Math.exp(-w * dt); for (const k of ['x', 'y', 'z']) { const x = pos[k] - aim[k], q = (vel[k] + w * x) * dt; pos[k] = aim[k] + (x + q) * e; vel[k] = (vel[k] - w * q) * e; } };
  const turnTo = (a, w, dt) => { let d = a - yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); const x = -d, e = Math.exp(-w * dt), q = (yawV + w * x) * dt; yaw = a + (x + q) * e; yawV = (yawV - w * q) * e; };

  function shoulder() { player.shoulder(anchor.copy(SH)); return anchor; }
  return {
    on: () => state !== 'off', root, state: () => state,
    // start: 'perch' to appear on the shoulder, 'arrive' to fly in from the sky and land
    enable(how) {
      root.visible = true; shoulder(); t = 0;
      if (how === 'arrive') { state = 'land'; pos.set(anchor.x - 3, anchor.y + 5, anchor.z + 2); vel.set(1.5, -1, -0.5); yaw = P.yaw; }
      else { state = 'perch'; pos.copy(anchor); vel.set(0, 0, 0); yaw = P.yaw; }
    },
    update(dt, time) {
      if (state === 'off') return;
      t += dt; shoulder();
      const rolling = P.rollK >= 0;
      if (state === 'perch' && rolling) { state = 'fly'; t = 0; vel.set(Math.sin(P.yaw) * 1.5, 4.5, Math.cos(P.yaw) * 1.5); }
      if (state === 'perch') {
        pos.copy(anchor); vel.set(0, 0, 0); turnTo(P.yaw, 14, dt);
        flapAmt += (0 - flapAmt) * Math.min(1, dt * 8); pitch += (0 - pitch) * Math.min(1, dt * 8);
        // now and then it looks around
        lookT -= dt; if (lookT < 0) { lookT = 1.5 + Math.random() * 3; lookAt = (Math.random() - 0.5) * 1.6; }
        look += (lookAt - look) * Math.min(1, dt * 6);
      } else {
        if (state === 'fly') {
          // circle above the player until the roll is over
          aim.set(P.x + Math.cos(t * 3.2) * 0.8, P.visY + 3.0 + Math.sin(t * 5) * 0.15, P.z + Math.sin(t * 3.2) * 0.8);
          chase(5.5, dt);
          if (!rolling && t > 0.9) { state = 'land'; t = 0; }
        } else { // land: home in on the shoulder, gently at the end
          aim.copy(anchor).add(tmp.set(0, Math.max(0, 0.6 - t) * 0.8, 0));
          chase(Math.min(9, 4 + t * 7), dt);
          if (t > 0.45 && pos.distanceTo(anchor) < 0.04 && vel.length() < 0.6) { state = 'perch'; }
          if (rolling && t > 0.2) { state = 'fly'; t = 0; } // rolled again before landing: up it goes
        }
        const sp = Math.hypot(vel.x, vel.z);
        turnTo(sp > 0.3 ? Math.atan2(vel.x, vel.z) : P.yaw, 9, dt);
        flapAmt += ((state === 'land' && pos.distanceTo(anchor) < 0.5 ? 0.45 : 1) - flapAmt) * Math.min(1, dt * 6);
        pitch += (Math.max(-0.5, Math.min(0.5, -vel.y * 0.08 + sp * 0.06)) - pitch) * Math.min(1, dt * 6);
        look += (0 - look) * Math.min(1, dt * 6);
      }
      flap += dt * (10 + flapAmt * 18);
      const f = flapAmt * (0.5 + 0.5 * Math.sin(flap));
      wings[0].rotation.z = -0.15 - f * 1.4; wings[1].rotation.z = 0.15 + f * 1.4;
      wings[0].rotation.x = wings[1].rotation.x = -f * 0.25;
      legs.visible = flapAmt < 0.6;
      tail.rotation.x = 0.35 + pitch * 0.5 + (state === 'perch' ? Math.sin(time * 1.3) * 0.04 : 0);
      head.rotation.y = look; head.rotation.x = state === 'perch' ? Math.sin(time * 0.9) * 0.05 : -pitch * 0.5;
      root.position.copy(pos); root.rotation.set(0, yaw, 0); body.rotation.x = pitch;
      // a small breath while perched
      body.position.y = state === 'perch' ? Math.sin(time * 2.4) * 0.006 : 0;
    },
  };
}
