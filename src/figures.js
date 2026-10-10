// Blocky people. One builder makes the player, the outfit mannequins and the
// town hall agents; a "design" is just a set of colours and a few style switches
// that get painted onto tiny pixel canvases. Add an entry to OUTFITS to add an outfit.
import * as THREE from 'three';
import { fill, toTex, lin } from './textures.js';

export const PXU = 0.06; // one skin pixel in world units; a figure is 32 pixels tall

// hairStyle: short | long | bun | bald | hood      topStyle: straps | plain | apron | robe | armor | vest | stripe
// sleeve: short | long      robe / skirt change how the legs are painted
export const OUTFITS = [
  { id: 'adventurer', name: 'Adventurer', skin: '#d6a070', hair: '#6b3f22', hairStyle: 'short', eye: '#2b3a67', top: '#2f6fb5', top2: '#275e9b', trim: '#5b3a1e', topStyle: 'straps', sleeve: 'short', pants: '#33415c', boots: '#4a2f1a' },
  { id: 'explorer', name: 'Explorer', skin: '#e8b890', hair: '#a5482a', hairStyle: 'long', eye: '#2f6b35', top: '#2b9a88', top2: '#f3ead2', trim: '#7a5530', topStyle: 'vest', sleeve: 'long', pants: '#5a4630', boots: '#3a2a1a' },
  { id: 'ranger', name: 'Ranger', skin: '#c98f5f', hair: '#2f5a2a', hairStyle: 'hood', eye: '#3a2a1a', top: '#3d7d40', top2: '#2f6b35', trim: '#7a5530', topStyle: 'plain', sleeve: 'long', pants: '#5a4630', boots: '#3a2a1a' },
  { id: 'scholar', name: 'Scholar', skin: '#e2b48a', hair: '#3a3a40', hairStyle: 'short', eye: '#3a2a1a', glasses: true, top: '#a3342e', top2: '#7d2622', trim: '#e4b93a', topStyle: 'robe', sleeve: 'long', robe: true, pants: '#a3342e', boots: '#3a2413' },
  { id: 'performer', name: 'Performer', skin: '#e8b890', hair: '#e85a9a', hairStyle: 'bun', eye: '#2b3a67', top: '#2a2a33', top2: '#c2317a', trim: '#ffd84a', topStyle: 'stripe', sleeve: 'short', skirt: true, pants: '#c2317a', boots: '#2a2a33' },
  { id: 'smith', name: 'Blacksmith', skin: '#b97a50', hair: '#2a2019', hairStyle: 'bald', eye: '#2a2019', beard: '#3a2a1f', top: '#8f8f96', top2: '#77777e', trim: '#5b3a1e', topStyle: 'apron', sleeve: 'short', pants: '#3a3a40', boots: '#2a2019' },
  { id: 'mage', name: 'Mage', skin: '#d6a070', hair: '#5a2f86', hairStyle: 'hood', eye: '#b0409a', top: '#7a4fc2', top2: '#5a2f86', trim: '#ffd84a', topStyle: 'robe', sleeve: 'long', robe: true, pants: '#7a4fc2', boots: '#2a2040' },
  { id: 'merchant', name: 'Merchant', skin: '#8a5a3a', hair: '#1d1d1d', hairStyle: 'short', eye: '#1d1d1d', top: '#c98a2b', top2: '#f3ead2', trim: '#7a4f1a', topStyle: 'vest', sleeve: 'long', pants: '#3a2a50', boots: '#2a2019' },
  { id: 'farmer', name: 'Farmer', skin: '#c98f5f', hair: '#e2c15a', hairStyle: 'long', eye: '#2f6b35', top: '#e9e2cf', top2: '#d6cfbc', trim: '#3f6fb0', topStyle: 'apron', sleeve: 'short', pants: '#3f6fb0', boots: '#5a3a1f' },
  { id: 'knight', name: 'Knight', skin: '#e2b48a', hair: '#d9b24a', hairStyle: 'short', eye: '#2b3a67', top: '#9aa3b0', top2: '#6f7888', trim: '#c23b32', topStyle: 'armor', sleeve: 'long', pants: '#6f7888', boots: '#3a3f4a' },
  { id: 'sailor', name: 'Sailor', skin: '#6f4a30', hair: '#1d1d1d', hairStyle: 'bun', eye: '#1d1d1d', top: '#f1efe6', top2: '#2f66c4', trim: '#c23b32', topStyle: 'stripe', sleeve: 'long', pants: '#27405f', boots: '#1d1d1d' },
  { id: 'watch', name: 'Night watch', skin: '#d6a070', hair: '#1f2333', hairStyle: 'hood', eye: '#2b6f9a', top: '#2a3047', top2: '#1f2333', trim: '#8fd0ff', topStyle: 'armor', sleeve: 'long', pants: '#1f2333', boots: '#12141f' },
];

// darker shade of a hex colour
function dk(hex, f = 0.82) { const n = parseInt(hex.slice(1), 16); const c = (s) => Math.round(((n >> s) & 255) * f).toString(16).padStart(2, '0'); return '#' + c(16) + c(8) + c(0); }

const SIZE = { top: [8, 8], face: [8, 8], side: [8, 8], back: [8, 8], bot: [8, 8], bodyF: [8, 12], bodyS: [4, 12], bodyB: [8, 12], arm: [4, 12], leg: [4, 12] };
const torso = (g, D, w) => {
  const T = D.top, T2 = D.top2, K = D.trim;
  fill(g, T, 0, 0, w, 12);
  if (D.topStyle === 'stripe') for (let y = 0; y < 10; y += 4) fill(g, T2, 0, y + 2, w, 2);
  if (D.topStyle === 'robe') { fill(g, T2, 0, 7, w, 1); fill(g, K, 0, 11, w, 1); } else if (D.topStyle === 'armor') { fill(g, T2, 0, 3, w, 1); fill(g, T2, 0, 7, w, 1); fill(g, T2, 0, 10, w, 1); } else fill(g, K, 0, 10, w, 1);
};
const PAINT = {
  top(g, D) { fill(g, D.hairStyle === 'bald' ? D.skin : D.hair, 0, 0, 8, 8); if (D.hairStyle !== 'bald') { fill(g, dk(D.hair), 2, 2, 2, 1); fill(g, dk(D.hair), 5, 5, 2, 1); } },
  bot(g, D) { fill(g, D.skin, 0, 0, 8, 8); },
  face(g, D) {
    const s = D.skin, h = D.hair, eye = D.eye || '#2b3a67';
    fill(g, s, 0, 0, 8, 8);
    if (D.hairStyle === 'hood') { fill(g, h, 0, 0, 8, 2); fill(g, h, 0, 2, 1, 6); fill(g, h, 7, 2, 1, 6); fill(g, dk(s, 0.8), 1, 2, 6, 1); }
    else if (D.hairStyle === 'long') { fill(g, h, 0, 0, 8, 2); fill(g, h, 0, 2, 1, 6); fill(g, h, 7, 2, 1, 6); }
    else if (D.hairStyle !== 'bald') { fill(g, h, 0, 0, 8, 2); fill(g, h, 0, 2, 1, 1); fill(g, h, 7, 2, 1, 1); }
    fill(g, '#ffffff', 1, 4, 2, 1); fill(g, '#ffffff', 5, 4, 2, 1); fill(g, eye, 2, 4, 1, 1); fill(g, eye, 5, 4, 1, 1);
    if (D.glasses) { fill(g, '#1d1d1d', 1, 3, 2, 1); fill(g, '#1d1d1d', 5, 3, 2, 1); fill(g, '#1d1d1d', 3, 4, 2, 1); }
    if (D.brow) fill(g, D.brow, 1, 3, 6, 1);
    fill(g, dk(s, 0.88), 3, 5, 2, 1);
    if (D.beard) { fill(g, D.beard, 1, 6, 6, 2); fill(g, D.beard, 0, 5, 1, 3); fill(g, D.beard, 7, 5, 1, 3); fill(g, dk(D.beard, 0.6), 3, 6, 2, 1); }
    else fill(g, dk(s, 0.62), 3, 6, 2, 1);
  },
  side(g, D) {
    if (D.hairStyle === 'hood' || D.hairStyle === 'long') { fill(g, D.hair, 0, 0, 8, 8); return; }
    fill(g, D.skin, 0, 0, 8, 8); if (D.hairStyle !== 'bald') fill(g, D.hair, 0, 0, 8, 3);
    if (D.beard) fill(g, D.beard, 0, 6, 8, 2);
  },
  back(g, D) {
    if (D.hairStyle === 'hood' || D.hairStyle === 'long') { fill(g, D.hair, 0, 0, 8, 8); return; }
    fill(g, D.skin, 0, 0, 8, 8); if (D.hairStyle !== 'bald') fill(g, D.hair, 0, 0, 8, 6);
  },
  bodyF(g, D) {
    const T2 = D.top2, K = D.trim; torso(g, D, 8);
    if (D.topStyle === 'straps') { for (let i = 0; i < 8; i++) { fill(g, K, i, 1 + i, 1, 2); fill(g, K, 7 - i, 1 + i, 1, 2); } fill(g, K, 0, 10, 8, 1); fill(g, '#e4b93a', 3, 10, 2, 1); }
    else if (D.topStyle === 'plain') { fill(g, T2, 2, 0, 4, 1); fill(g, T2, 3, 1, 2, 1); fill(g, '#e4b93a', 3, 10, 2, 1); }
    else if (D.topStyle === 'apron') { fill(g, K, 2, 3, 4, 9); fill(g, K, 2, 0, 1, 3); fill(g, K, 5, 0, 1, 3); fill(g, dk(K), 3, 6, 2, 2); }
    else if (D.topStyle === 'robe') { fill(g, K, 3, 0, 2, 7); fill(g, K, 3, 8, 2, 3); }
    else if (D.topStyle === 'armor') { fill(g, K, 3, 4, 2, 2); fill(g, dk(D.top, 1.0), 1, 1, 6, 1); }
    else if (D.topStyle === 'vest') { fill(g, T2, 3, 0, 2, 10); fill(g, K, 3, 3, 1, 1); fill(g, K, 3, 6, 1, 1); }
  },
  bodyS(g, D) { torso(g, D, 4); },
  bodyB(g, D) { torso(g, D, 8); if (D.topStyle === 'straps') for (let i = 0; i < 8; i++) { fill(g, D.trim, i, 1 + i, 1, 2); fill(g, D.trim, 7 - i, 1 + i, 1, 2); } },
  arm(g, D) {
    const L = D.sleeve === 'long' ? 10 : 5; fill(g, D.skin, 0, 0, 4, 12); fill(g, D.top, 0, 0, 4, L);
    if (D.topStyle === 'stripe') for (let y = 2; y < L; y += 4) fill(g, D.top2, 0, y, 4, Math.min(2, L - y));
    fill(g, dk(D.top), 0, L - 1, 4, 1); fill(g, dk(D.skin, 0.88), 0, 11, 4, 1);
  },
  leg(g, D) {
    if (D.robe) { fill(g, D.top, 0, 0, 4, 10); fill(g, D.trim, 0, 9, 4, 1); fill(g, D.boots, 0, 10, 4, 2); return; }
    fill(g, D.pants, 0, 0, 4, 8); if (D.skirt) fill(g, D.skin, 0, 5, 4, 3);
    fill(g, D.boots, 0, 8, 4, 4); fill(g, dk(D.boots, 0.7), 0, 11, 4, 1);
  },
};

// Front-view picture of a design on a 16×32 canvas (used for the wardrobe cards).
export function drawSprite(ctx, D) {
  const part = (key, x, y) => { const c = document.createElement('canvas'); c.width = SIZE[key][0]; c.height = SIZE[key][1]; PAINT[key](c.getContext('2d'), D); ctx.drawImage(c, x, y); };
  ctx.clearRect(0, 0, 16, 32);
  part('leg', 4, 20); part('leg', 8, 20); part('arm', 0, 8); part('arm', 12, 8); part('bodyF', 4, 8); part('face', 4, 0);
}
// Just the face on an 8×8 canvas (used for the chat portrait).
export function drawFace(ctx, D) { ctx.clearRect(0, 0, 8, 8); PAINT.face(ctx, D); }

export function createFigure(design, opts = {}) {
  const ctx = {}, tex = {}, mat = {};
  for (const k in SIZE) { const c = document.createElement('canvas'); c.width = SIZE[k][0]; c.height = SIZE[k][1]; ctx[k] = c.getContext('2d'); tex[k] = toTex(c, false); mat[k] = new THREE.MeshLambertMaterial({ map: tex[k] }); }
  const group = new THREE.Group(), rig = new THREE.Group(); group.add(rig);
  const part = (w, h, d, m, py, px, off) => {
    const pivot = new THREE.Group(); pivot.position.set(px * PXU, py * PXU, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * PXU, h * PXU, d * PXU), m); mesh.position.y = off * PXU; mesh.receiveShadow = true; pivot.add(mesh); rig.add(pivot); return pivot;
  };
  const parts = {
    head: part(8, 8, 8, [mat.side, mat.side, mat.top, mat.bot, mat.face, mat.back], 24, 0, 4),
    body: part(8, 12, 4, [mat.bodyS, mat.bodyS, mat.bodyS, mat.bodyS, mat.bodyF, mat.bodyB], 18, 0, 0),
    armL: part(4, 12, 4, mat.arm, 23, 6, -5), armR: part(4, 12, 4, mat.arm, 23, -6, -5),
    legL: part(4, 12, 4, mat.leg, 12, 2, -6), legR: part(4, 12, 4, mat.leg, 12, -2, -6),
  };
  // small 3D extras on the head: a hair bun, and a long nose for the agents
  const extraMat = new THREE.MeshLambertMaterial(), noseMat = new THREE.MeshLambertMaterial();
  const bun = new THREE.Mesh(new THREE.BoxGeometry(4 * PXU, 4 * PXU, 3 * PXU), extraMat); bun.position.set(0, 6 * PXU, -5 * PXU); parts.head.add(bun);
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2 * PXU, 4 * PXU, 2 * PXU), noseMat); nose.position.set(0, 2.2 * PXU, 5 * PXU); parts.head.add(nose);

  const fig = { group, rig, parts, design };
  fig.setDesign = (D) => {
    fig.design = D;
    for (const k in SIZE) { ctx[k].clearRect(0, 0, SIZE[k][0], SIZE[k][1]); PAINT[k](ctx[k], D); tex[k].needsUpdate = true; }
    bun.visible = D.hairStyle === 'bun'; extraMat.color.copy(lin(D.hair));
    nose.visible = !!opts.nose; noseMat.color.copy(lin(dk(D.skin, 0.9)));
  };
  // Rigid limbs swinging from shoulder and hip. swing is the walk angle, air 0..1 when
  // jumping, sit 0..1 when seated, type 0..1 for a hands-busy-at-the-desk motion.
  fig.pose = (swing, air, time, sit = 0, type = 0) => {
    const idle = Math.sin(time * 1.6) * 0.03 + 0.05;
    parts.legL.rotation.x = (swing + air * 0.5) * (1 - sit) - sit * 1.5; parts.legR.rotation.x = (-swing - air * 0.5) * (1 - sit) - sit * 1.5;
    parts.armL.rotation.x = (-swing - air * 1.2) * (1 - sit) - sit * (0.9 + Math.sin(time * 9) * 0.18 * type);
    parts.armR.rotation.x = (swing - air * 1.2) * (1 - sit) - sit * (0.9 + Math.sin(time * 9 + 2) * 0.18 * type);
    parts.armL.rotation.z = idle + air * 0.25; parts.armR.rotation.z = -idle - air * 0.25;
    parts.head.rotation.x = Math.sin(time * 0.9) * 0.03 + sit * 0.12 * type;
  };
  fig.setDesign(design);
  return fig;
}
