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
  group.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
  group.scale.setScalar(TUNING.playerScale); scene.add(group);

  const shadow = makeBlob(scene, 1.25 * TUNING.playerScale);
  const state = { x: 0, y: FLOOR, z: 4.6, vy: 0, yaw: Math.PI, grounded: true, phase: 0, blend: 0, squash: 0, visY: FLOOR };

  // dt, time in seconds; day is 1 in full daylight and 0 at night or indoors
  function animate(dt, time, moving, running, groundY, day) {
    const P = state;
    P.blend += ((moving && P.grounded ? 1 : 0) - P.blend) * Math.min(1, dt * 10);
    fig.pose(Math.sin(P.phase) * (running ? 1.15 : 0.75) * P.blend, P.grounded ? 0 : 1, time);
    P.squash = Math.max(0, P.squash - dt * 6);
    rig.scale.set(1 + P.squash * 0.08, 1 - P.squash * 0.16, 1 + P.squash * 0.08);
    if (P.grounded) P.visY += (P.y - P.visY) * Math.min(1, dt * 18); else P.visY = P.y;
    group.position.set(P.x, P.visY + Math.abs(Math.sin(P.phase)) * 0.05 * P.blend, P.z);
    group.rotation.y = P.yaw; rig.rotation.x = running && P.grounded ? 0.12 * P.blend : 0;
    // In daylight the blob stretches away from the sun so it reads as a cast shadow.
    const lift = Math.max(0, P.visY - groundY), k = Math.max(0.45, 1 - lift * 0.35), stretch = 1 + day * 0.75, off = day * 0.42 * TUNING.playerScale;
    shadow.position.set(P.x + SHADOW_DIR[0] * off, groundY + 0.03, P.z + SHADOW_DIR[1] * off);
    shadow.rotation.z = Math.atan2(-SHADOW_DIR[1], SHADOW_DIR[0]); shadow.scale.set(k * stretch, k * (1 - day * 0.15), 1); shadow.material.opacity = (0.5 - day * 0.12) * k;
  }
  function setOutfit(id, remember = true) {
    const o = OUTFITS.find((q) => q.id === id); if (!o) return; fig.setDesign(o);
    if (remember) { try { localStorage.setItem('pv-outfit', id); } catch (e) { /* ignore */ } }
  }
  return { state, group, animate, setOutfit, outfit: () => fig.design.id };
}

// Round soft shadow, the same trick the original blocky games use for moving things.
export function makeBlob(scene, size) {
  const tex = new THREE.CanvasTexture(cv(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 4, 32, 32, 30); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 2; scene.add(m); return m;
}
