// The playable character: a figure from figures.js plus its shadow and movement state.
import * as THREE from 'three';
import { cv } from './textures.js';
import { TUNING, FLOOR } from './config.js';
import { createFigure, OUTFITS } from './figures.js';

// Direction the sun's shadows fall in (matches the sun position in main.js).
const SHADOW_DIR = (() => { const l = Math.hypot(30, 16); return [30 / l, 16 / l]; })();

export function createPlayer(scene) {
  let saved = null; try { saved = localStorage.getItem('pv-outfit'); } catch (e) { /* storage unavailable */ }
  const fig = createFigure(OUTFITS.find((o) => o.id === saved) || OUTFITS[0]);
  const { group, rig } = fig;
  // no baked sun shadow on the player, so lantern and candle light can reach them under roofs
  group.scale.setScalar(TUNING.playerScale); scene.add(group);

  const shadow = makeBlob(scene, 1.25 * TUNING.playerScale);
  const state = { rollK: -1, x: 0, y: FLOOR, z: 4.6, vx: 0, vz: 0, vy: 0, yaw: Math.PI, grounded: true, phase: 0, blend: 0, gait: 0, air: 0, squash: 0, visY: FLOOR };
  const mix = (a, b, t) => a + (b - a) * t;
  let hold = { k: 0, rz: 0 };

  // Advance the stride. Its pace follows the real ground speed, so feet never slide, and
  // walk and run are blended rather than switched. Returns true on each footfall.
  function stride(dt, speed, running) {
    const P = state, before = Math.floor(P.phase / Math.PI);
    P.gait += ((running ? 1 : 0) - P.gait) * Math.min(1, dt * 5);
    P.blend += ((P.grounded ? Math.min(1, speed / (TUNING.walkSpeed * 0.8)) : 0) - P.blend) * Math.min(1, dt * 9);
    P.air += ((P.grounded ? 0 : 1) - P.air) * Math.min(1, dt * 12);
    P.phase += dt * speed * mix(2.2, 1.8, P.gait);
    return P.grounded && speed > 0.6 && Math.floor(P.phase / Math.PI) !== before;
  }
  // time in seconds; day is 1 in full daylight and 0 at night or indoors
  function animate(dt, time, groundY, day) {
    const P = state, s = Math.sin(P.phase);
    P.squash = Math.max(0, P.squash - dt * 6);
    if (P.rollK >= 0) {
      // the dash roll: tuck into a ball and turn one full forward somersault around the body's middle
      const k = P.rollK, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, a = e * Math.PI * 2;
      const tuck = Math.sin(Math.PI * Math.min(1, k * 1.08)), s2 = 1 - 0.2 * tuck, c = 1 * s2;
      fig.pose(0, 0, time, tuck, 0, 0);
      rig.scale.setScalar(s2); rig.rotation.x = a; rig.position.set(0, c - c * Math.cos(a), -c * Math.sin(a));
    } else {
      fig.pose(s * mix(0.72, 0.98, P.gait) * P.blend, P.air, time, 0, 0, s * 0.1 * P.blend);
      rig.scale.set(1 + P.squash * 0.08, 1 - P.squash * 0.16, 1 + P.squash * 0.08); rig.position.set(0, 0, 0);
    }
    // holding the fishing rod: the right arm follows the rod's angle, the left comes in to help
    if (hold.k > 0.001) {
      const k = hold.k, a = -(0.55 + Math.max(-1.2, Math.min(1.4, hold.rz)) * 0.55), pr = fig.parts;
      pr.armR.rotation.x += (a - pr.armR.rotation.x) * k; pr.armR.rotation.z += (-0.1 - pr.armR.rotation.z) * k;
      pr.armL.rotation.x += (a * 0.75 - pr.armL.rotation.x) * k; pr.armL.rotation.z += (-0.32 - pr.armL.rotation.z) * k;
    }
    if (P.grounded) P.visY += (P.y - P.visY) * Math.min(1, dt * 18); else P.visY = P.y;
    // a smooth rise and fall twice per stride, and a forward lean that grows with the run
    const bob = (1 - Math.cos(P.phase * 2)) * 0.5 * mix(0.045, 0.085, P.gait) * P.blend;
    group.position.set(P.x, P.visY + bob, P.z);
    group.rotation.y = P.yaw; if (P.rollK < 0) rig.rotation.x = 0.13 * P.gait * P.blend;
    // In daylight the blob stretches away from the sun so it reads as a cast shadow.
    const lift = Math.max(0, P.visY - groundY), k = Math.max(0.45, 1 - lift * 0.35), stretch = 1 + day * 0.75, off = day * 0.42 * TUNING.playerScale;
    shadow.position.set(P.x + SHADOW_DIR[0] * off, groundY + 0.03, P.z + SHADOW_DIR[1] * off);
    shadow.rotation.z = Math.atan2(-SHADOW_DIR[1], SHADOW_DIR[0]); shadow.scale.set(k * stretch, k * (1 - day * 0.15), 1); shadow.material.opacity = (0.5 - day * 0.12) * k;
  }
  function setOutfit(id, remember = true) {
    const o = OUTFITS.find((q) => q.id === id); if (!o) return; fig.setDesign(o);
    if (remember) { try { localStorage.setItem('pv-outfit', id); } catch (e) { /* ignore */ } }
  }
  // the Scholar's Lantern, carried in the right hand once it has been earned
  const lantern = new THREE.Group(); lantern.visible = false; lantern.position.set(0, -12.5 * 0.0625, 0.6 * 0.0625); fig.parts.armR.add(lantern);
  { const P = 0.0625, dark = new THREE.MeshLambertMaterial({ color: new THREE.Color('#2a2019').convertSRGBToLinear() }), lit = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd27a').convertSRGBToLinear() });
    const box = (w, h, d, m, y) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w * P, h * P, d * P), m); b.position.y = y * P; lantern.add(b); };
    box(0.8, 2, 0.8, dark, 0); box(3.4, 0.8, 3.4, dark, -1.4); box(2.6, 3.2, 2.6, lit, -3.4); box(3.4, 0.8, 3.4, dark, -5.4); }
  const handAt = new THREE.Vector3(0, -10.5 * 0.0625, 0.4 * 0.0625);
  return { state, group, stride, animate, setOutfit, outfit: () => fig.design.id, setLantern(on) { lantern.visible = on; },
    setHold(h) { hold = h; },
    // where the right hand is in the world (for things the player holds)
    hand(v) { group.updateMatrixWorld(true); return fig.parts.armR.localToWorld(v.copy(handAt)); } };
}

// Round soft shadow, the same trick the original blocky games use for moving things.
export function makeBlob(scene, size) {
  const tex = new THREE.CanvasTexture(cv(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); return m;
}
