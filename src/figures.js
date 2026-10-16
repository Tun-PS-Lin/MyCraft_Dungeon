// Blocky people. One builder makes the player, the outfit mannequins and the
// town hall agents; a "design" is just a set of colours and a few style switches
// that get painted onto tiny pixel canvases. Add an entry to OUTFITS to add an outfit.
import * as THREE from 'three';
import { fill, toTex, lin } from './textures.js';

export const PXU = 0.0625; // one skin pixel is 1/16 of a block, the same as every world texture; a figure is 32 pixels tall

// hairStyle: short | long | bun | bald | hood      topStyle: straps | plain | apron | robe | armor | vest | stripe
// sleeve: short | long      robe / skirt change how the legs are painted
// hairStyle: short | long | bun | buns | pony | spiky | curly | bald | hood
// topStyle:  straps | plain | apron | robe | armor | vest | stripe      sleeve: short | long
// gear:      raised 3D pieces, any of the keys in GEAR below (hats, belt, backpack, pouches, cape ...)
export const OUTFITS = [
  { id: 'adventurer', name: 'Adventurer', skin: '#d6a070', hair: '#6b3f22', hairStyle: 'short', eye: '#2b3a67', top: '#2f6fb5', top2: '#275e9b', trim: '#5b3a1e', topStyle: 'straps', sleeve: 'short', pants: '#33415c', boots: '#4a2f1a', gear: ['belt', 'backpack', 'pouch', 'boots'] },
  { id: 'explorer', name: 'Explorer', skin: '#e8b890', hair: '#a5482a', hairStyle: 'pony', eye: '#2f6b35', top: '#2b9a88', top2: '#f3ead2', trim: '#7a5530', topStyle: 'vest', sleeve: 'long', pants: '#5a4630', boots: '#3a2a1a', gear: ['fedora', 'scarf', 'belt', 'pouch', 'boots'] },
  { id: 'ranger', name: 'Ranger', skin: '#c98f5f', hair: '#2f5a2a', hairStyle: 'hood', eye: '#3a2a1a', top: '#3d7d40', top2: '#2f6b35', trim: '#7a5530', topStyle: 'plain', sleeve: 'long', pants: '#5a4630', boots: '#3a2a1a', gear: ['quiver', 'belt', 'gloves', 'boots'] },
  { id: 'scholar', name: 'Scholar', skin: '#e2b48a', hair: '#3a3a40', hairStyle: 'short', eye: '#3a2a1a', glasses: true, top: '#a3342e', top2: '#7d2622', trim: '#e4b93a', topStyle: 'robe', sleeve: 'long', robe: true, pants: '#a3342e', boots: '#3a2413', gear: ['mortar', 'sash', 'book'] },
  { id: 'performer', name: 'Performer', skin: '#e8b890', hair: '#e85a9a', hairStyle: 'buns', eye: '#2b3a67', top: '#2a2a33', top2: '#c2317a', trim: '#ffd84a', topStyle: 'stripe', sleeve: 'short', skirt: true, pants: '#c2317a', boots: '#2a2a33', gear: ['skirt', 'gloves', 'boots'] },
  { id: 'smith', name: 'Blacksmith', skin: '#b97a50', hair: '#2a2019', hairStyle: 'bald', eye: '#2a2019', beard: '#3a2a1f', top: '#8f8f96', top2: '#77777e', trim: '#5b3a1e', topStyle: 'apron', sleeve: 'short', pants: '#3a3a40', boots: '#2a2019', gear: ['headband', 'belt', 'hammer', 'gloves', 'boots'] },
  { id: 'mage', name: 'Mage', skin: '#d6a070', hair: '#e9e2cf', hairStyle: 'long', eye: '#b0409a', top: '#7a4fc2', top2: '#5a2f86', trim: '#ffd84a', topStyle: 'robe', sleeve: 'long', robe: true, pants: '#7a4fc2', boots: '#2a2040', gear: ['wizard', 'cape', 'sash', 'potion'] },
  { id: 'merchant', name: 'Merchant', skin: '#8a5a3a', hair: '#1d1d1d', hairStyle: 'short', eye: '#1d1d1d', beard: '#1d1d1d', top: '#c98a2b', top2: '#f3ead2', trim: '#7a4f1a', topStyle: 'vest', sleeve: 'long', pants: '#3a2a50', boots: '#2a2019', gear: ['turban', 'belt', 'backpack', 'pouch'] },
  { id: 'farmer', name: 'Farmer', skin: '#c98f5f', hair: '#e2c15a', hairStyle: 'long', eye: '#2f6b35', top: '#e9e2cf', top2: '#d6cfbc', trim: '#3f6fb0', topStyle: 'apron', sleeve: 'short', pants: '#3f6fb0', boots: '#5a3a1f', gear: ['straw', 'pocket', 'boots'] },
  { id: 'knight', name: 'Knight', skin: '#e2b48a', hair: '#d9b24a', hairStyle: 'short', eye: '#2b3a67', top: '#9aa3b0', top2: '#6f7888', trim: '#c23b32', topStyle: 'armor', sleeve: 'long', pants: '#6f7888', boots: '#3a3f4a', gear: ['helmet', 'pads', 'cape', 'belt', 'boots'] },
  { id: 'sailor', name: 'Sailor', skin: '#6f4a30', hair: '#1d1d1d', hairStyle: 'curly', eye: '#1d1d1d', top: '#f1efe6', top2: '#2f66c4', trim: '#c23b32', topStyle: 'stripe', sleeve: 'long', pants: '#27405f', boots: '#1d1d1d', gear: ['bandana', 'scarf', 'belt', 'boots'] },
  { id: 'watch', name: 'Night watch', skin: '#d6a070', hair: '#1f2333', hairStyle: 'hood', eye: '#2b6f9a', top: '#2a3047', top2: '#1f2333', trim: '#8fd0ff', topStyle: 'armor', sleeve: 'long', pants: '#1f2333', boots: '#12141f', gear: ['pads', 'belt', 'lamp', 'boots'] },
];

// darker shade of a hex colour
function dk(hex, f = 0.82) { const n = parseInt(hex.slice(1), 16); const c = (s) => Math.min(255, Math.round(((n >> s) & 255) * f)).toString(16).padStart(2, '0'); return '#' + c(16) + c(8) + c(0); }

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
    else if (D.hairStyle === 'curly') { fill(g, h, 0, 0, 8, 3); fill(g, h, 0, 3, 1, 2); fill(g, h, 7, 3, 1, 2); }
    else if (D.hairStyle !== 'bald') { fill(g, h, 0, 0, 8, 2); fill(g, h, 0, 2, 1, 1); fill(g, h, 7, 2, 1, 1); }
    fill(g, '#ffffff', 1, 4, 2, 1); fill(g, '#ffffff', 5, 4, 2, 1); fill(g, eye, 2, 4, 1, 1); fill(g, eye, 5, 4, 1, 1);
    if (D.glasses) { fill(g, '#1d1d1d', 1, 3, 2, 1); fill(g, '#1d1d1d', 5, 3, 2, 1); fill(g, '#1d1d1d', 3, 4, 2, 1); }
    if (D.brow) fill(g, D.brow, 1, 3, 6, 1);
    if (D.lashes) { fill(g, '#2a1c14', 1, 3, 1, 1); fill(g, '#2a1c14', 6, 3, 1, 1); fill(g, '#c4606a', 3, 6, 2, 1); }
    fill(g, dk(s, 0.88), 3, 5, 2, 1);
    if (D.beard) { fill(g, D.beard, 1, 6, 6, 2); fill(g, D.beard, 0, 5, 1, 3); fill(g, D.beard, 7, 5, 1, 3); fill(g, dk(D.beard, 0.6), 3, 6, 2, 1); }
    else if (!D.lashes) fill(g, dk(s, 0.62), 3, 6, 2, 1);
    if (D.moustache) { fill(g, D.moustache, 2, 6, 4, 1); fill(g, D.moustache, 1, 7, 1, 1); fill(g, D.moustache, 6, 7, 1, 1); }
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

/* ── raised gear ──
   Each entry returns boxes as [part, w, h, d, colour, x, y, z, tiltX, glows], in skin pixels,
   placed relative to that part's pivot (head: 0..8 up; body: -6..6; arm: 1..-11; leg: 0..-12). */
const GOLD = '#e4b93a', LEATHER = '#5b3a1e';
const GEAR = {
  belt: (D) => [['body', 8.7, 1.6, 4.7, D.topStyle === 'armor' ? '#3a2a1a' : LEATHER, 0, -4.2, 0], ['body', 2, 1.9, 0.5, GOLD, 0, -4.2, 2.5]],
  sash: (D) => [['body', 8.7, 1.5, 4.7, D.trim, 0, -3.6, 0], ['body', 1.6, 4, 0.5, D.trim, 1.6, -6, 2.5]],
  backpack: (D) => [['body', 6.4, 7.2, 2.8, '#7a5530', 0, 0.4, -3.4], ['body', 6.7, 2.4, 3, LEATHER, 0, 3.2, -3.45], ['body', 7.6, 2.1, 2.1, D.top2, 0, 5.3, -3.3], ['body', 1.2, 1.2, 0.5, GOLD, 0, 2.4, -5]],
  pouch: () => [['body', 2.4, 2.7, 1.5, '#7a5530', -2.5, -5.7, 2.7], ['body', 2.6, 0.9, 1.6, LEATHER, -2.5, -4.6, 2.7]],
  book: () => [['body', 2.6, 3.2, 1.1, '#2f66c4', -2.5, -5.8, 2.6], ['body', 2.2, 2.8, 1.2, '#f1efe6', -2.5, -5.8, 2.6]],
  potion: () => [['body', 1.5, 2, 1.5, '#62e4ff', 2.6, -5.6, 2.7, 0, true], ['body', 0.9, 0.9, 0.9, LEATHER, 2.6, -4.3, 2.7]],
  lamp: (D) => [['body', 1.7, 2.2, 1.7, D.trim, -2.6, -5.8, 2.8, 0, true], ['body', 2.1, 0.5, 2.1, '#12141f', -2.6, -4.5, 2.8]],
  hammer: () => [['body', 0.9, 4.2, 0.9, '#7a5530', 2.7, -6.4, 2.7], ['body', 2.6, 1.5, 1.5, '#8f8f96', 2.7, -8.2, 2.7]],
  pocket: (D) => [['body', 3, 2, 0.6, D.trim, 0, -2.8, 2.3], ['body', 3.2, 0.6, 0.7, '#2f5590', 0, -1.9, 2.3]],
  quiver: () => [['body', 2.4, 8, 2.4, '#7a5530', 2, 1.4, -3.4, 0.22], ['body', 1.6, 1.4, 1.6, '#f1efe6', 2, 6, -4.2, 0.22], ['body', 0.8, 1.6, 0.8, '#c23b32', 1.6, 6.9, -4.4, 0.22]],
  cape: (D) => [['body', 8.4, 13, 0.7, D.id === 'knight' ? D.trim : D.top2, 0, -1.6, -3, 0.13], ['body', 8.9, 1.4, 5, D.id === 'knight' ? D.trim : D.top2, 0, 5.5, -0.2]],
  scarf: (D) => [['body', 8.8, 1.8, 4.8, D.trim, 0, 5.3, 0], ['body', 1.8, 4, 0.6, D.trim, -2.4, 3, 2.5]],
  skirt: (D) => [['body', 9.2, 3.2, 5.2, D.pants, 0, -7.2, 0], ['body', 9.4, 0.8, 5.4, D.trim, 0, -8.6, 0]],
  pads: (D) => [['armL', 4.9, 1.9, 4.9, D.top2, 0, 0.3, 0], ['armR', 4.9, 1.9, 4.9, D.top2, 0, 0.3, 0], ['armL', 3, 0.8, 3, D.trim, 0, 1.5, 0], ['armR', 3, 0.8, 3, D.trim, 0, 1.5, 0]],
  gloves: (D) => [['armL', 4.6, 1.6, 4.6, D.boots, 0, -8.4, 0], ['armR', 4.6, 1.6, 4.6, D.boots, 0, -8.4, 0]],
  boots: (D) => [['legL', 4.7, 1.4, 4.7, dk(D.boots, 1.35), 0, -8.3, 0], ['legR', 4.7, 1.4, 4.7, dk(D.boots, 1.35), 0, -8.3, 0], ['legL', 4, 1.7, 1.2, D.boots, 0, -11.1, 2.5], ['legR', 4, 1.7, 1.2, D.boots, 0, -11.1, 2.5]],
  satchel: () => [['body', 3.4, 3.4, 1.7, '#7a5530', -3, -5.4, 2.7], ['body', 3.6, 1, 1.8, LEATHER, -3, -4, 2.7], ['body', 1, 2.4, 1, '#f6f3e8', -2.4, -3.4, 2.6], ['body', 1.2, 9, 0.5, LEATHER, -1.2, 1, 2.3, 0, false, 0.5]],
  tablet: () => [['body', 3, 2.3, 0.5, '#1b2a4a', 2.5, -5.4, 2.6], ['body', 2.5, 1.8, 0.55, '#62c8ff', 2.5, -5.4, 2.62, 0, true]],
  tie: (D) => [['body', 2, 1.5, 0.6, D.trim, 0, 4.8, 2.3], ['body', 1.5, 5.4, 0.5, D.trim, 0, 1.6, 2.3]],
  watch: () => [['body', 3.4, 0.6, 0.45, GOLD, 1.9, -1.2, 2.3], ['body', 1.3, 1.3, 0.5, GOLD, 3.2, -2.2, 2.3]],
  coat: (D) => [['body', 2.2, 3.4, 0.5, D.top, -2.1, 3.9, 2.3], ['body', 2.2, 3.4, 0.5, D.top, 2.1, 3.9, 2.3], ['body', 8.9, 1.2, 4.9, D.top, 0, -5.4, 0]],
  // hats
  newscap: (D) => [['head', 9.2, 2, 9.2, D.cap || '#5a4630', 0, 7.5, -0.2], ['head', 7, 0.8, 3, D.cap || '#5a4630', 0, 6.7, 5.2], ['head', 1.4, 0.9, 1.4, dk(D.cap || '#5a4630', 0.7), 0, 8.8, 0]],
  headset: () => [['head', 9, 1, 1.6, '#1d2333', 0, 8.4, 0], ['head', 1.3, 2.8, 2.8, '#1d2333', 4.6, 4.2, 0], ['head', 1.3, 2.8, 2.8, '#1d2333', -4.6, 4.2, 0], ['head', 0.7, 0.7, 4, '#1d2333', 4.9, 2.4, 2], ['head', 1, 1, 1, '#62e4ff', 4.9, 2.4, 4.2, 0, true]],
  tophat: (D) => [['head', 10.4, 0.8, 10.4, '#1b1b22', 0, 8.3, 0], ['head', 7.2, 4.6, 7.2, '#1b1b22', 0, 11, 0], ['head', 7.5, 1.1, 7.5, D.trim, 0, 9.3, 0]],
  wizard: (D) => [['head', 11, 1, 11, D.top2, 0, 8.4, 0], ['head', 7, 2.4, 7, D.top, 0, 10, 0], ['head', 7.3, 0.9, 7.3, D.trim, 0, 9.3, 0], ['head', 5, 2.4, 5, D.top, 0, 12.2, -0.4], ['head', 3, 2.4, 3, D.top, 0, 14.4, -1], ['head', 1.6, 1.6, 1.6, D.trim, 0, 16, -1.6]],
  straw: (D) => [['head', 13, 0.8, 13, '#e2c15a', 0, 8.3, 0], ['head', 7.4, 2.6, 7.4, '#d9b54a', 0, 9.9, 0], ['head', 7.7, 0.8, 7.7, D.trim, 0, 9.1, 0]],
  fedora: () => [['head', 11.4, 0.8, 11.4, '#7a5530', 0, 8.3, 0], ['head', 8, 2.6, 8, '#8a6238', 0, 9.9, 0], ['head', 8.3, 0.8, 8.3, '#3a2a1a', 0, 9.1, 0]],
  mortar: (D) => [['head', 6.4, 1.4, 6.4, D.top2, 0, 8.6, 0], ['head', 10, 0.7, 10, D.top2, 0, 9.6, 0], ['head', 0.8, 2.8, 0.8, D.trim, 4.4, 8.4, 4.4], ['head', 1.2, 0.8, 1.2, D.trim, 0, 10.2, 0]],
  helmet: (D) => [['head', 9, 3.6, 9, D.top, 0, 6.9, 0], ['head', 1.2, 3, 0.7, D.top, 0, 4.4, 4.4], ['head', 9.3, 0.9, 9.3, D.top2, 0, 5.3, 0], ['head', 1.6, 3.2, 5.4, D.trim, 0, 10, -1]],
  bandana: (D) => [['head', 8.8, 1.7, 8.8, D.trim, 0, 5.8, 0], ['head', 1.6, 1.6, 1.6, D.trim, 2.6, 5.6, -5], ['head', 1.2, 2.8, 0.8, D.trim, 2.6, 3.6, -5.2]],
  turban: (D) => [['head', 9.2, 3, 9.2, D.top2, 0, 7.3, 0], ['head', 6.6, 1.6, 6.6, D.top2, 0, 9.4, 0], ['head', 1.4, 1.4, 0.7, D.top, 0, 7.6, 4.8]],
  headband: (D) => [['head', 8.7, 1.3, 8.7, '#c23b32', 0, 6.2, 0]],
};
// Hair with volume, by style.
const HAIR = {
  long: (D) => [['head', 8.8, 6.4, 1.5, D.hair, 0, 1.4, -4.4]],
  pony: (D) => [['head', 2.4, 2.4, 2.4, D.hair, 0, 5.6, -5.1], ['head', 2, 5.2, 1.6, D.hair, 0, 2.2, -5.7, -0.15]],
  bun: (D) => [['head', 4, 4, 3, D.hair, 0, 6, -5]],
  buns: (D) => [['head', 3.2, 3.2, 3.2, D.hair, 3.4, 8.8, -1], ['head', 3.2, 3.2, 3.2, D.hair, -3.4, 8.8, -1]],
  spiky: (D) => [['head', 2, 2, 7, D.hair, 0, 9, 0], ['head', 2, 1.2, 3, D.hair, 0, 10.4, 0.5]],
  curly: (D) => [['head', 9.3, 3.4, 9.3, D.hair, 0, 7.2, -0.2], ['head', 9.2, 5, 3, D.hair, 0, 4, -3.4]],
  hood: (D) => [['head', 9, 9.2, 6.6, D.hair, 0, 4.3, -1.4], ['head', 9, 1.3, 2.6, D.hair, 0, 8.25, 3.1], ['body', 8.8, 1.6, 5, D.hair, 0, 5.6, -0.3]],
};
function gearBoxes(D) {
  const out = [];
  if (D.moustache) out.push(['head', 5, 1.1, 0.8, D.moustache, 0, 1.6, 4.3]);
  if (HAIR[D.hairStyle]) out.push(...HAIR[D.hairStyle](D));
  if (D.beard) out.push(['head', 6.4, 3, 1, D.beard, 0, 1.3, 4.3]);
  for (const k of D.gear || []) if (GEAR[k]) out.push(...GEAR[k](D));
  return out;
}

/* ── 2D pictures of a design, for the interface ── */
export const SPRITE = { w: 20, h: 40, ox: 2, oy: 8 }; // room around the 16×32 body for hats and capes
const part2d = (ctx, key, D, x, y) => { const c = document.createElement('canvas'); c.width = SIZE[key][0]; c.height = SIZE[key][1]; PAINT[key](c.getContext('2d'), D); ctx.drawImage(c, x, y); };
// Front view of a design on a SPRITE.w × SPRITE.h canvas (used for the wardrobe cards).
export function drawSprite(ctx, D) {
  const { ox, oy } = SPRITE, f = (c, x, y, w, h) => fill(ctx, c, ox + x, oy + y, w, h), has = (k) => (D.gear || []).includes(k);
  ctx.clearRect(0, 0, SPRITE.w, SPRITE.h);
  if (has('cape')) f(D.id === 'knight' ? D.trim : D.top2, 2, 9, 12, 20);
  if (has('quiver')) { f('#7a5530', 11, 3, 2, 5); f('#f1efe6', 11, 2, 1, 1); f('#c23b32', 12, 1, 1, 2); }
  if (has('backpack')) f(D.top2, 3, 7, 10, 1);
  if (D.hairStyle === 'pony') f(D.hair, 12, 2, 2, 6);
  part2d(ctx, 'leg', D, ox + 4, oy + 20); part2d(ctx, 'leg', D, ox + 8, oy + 20); part2d(ctx, 'arm', D, ox, oy + 8); part2d(ctx, 'arm', D, ox + 12, oy + 8); part2d(ctx, 'bodyF', D, ox + 4, oy + 8); part2d(ctx, 'face', D, ox + 4, oy);
  // hair
  if (D.hairStyle === 'bun') f(D.hair, 6, -2, 4, 2);
  if (D.hairStyle === 'buns') { f(D.hair, 3, -2, 3, 2); f(D.hair, 10, -2, 3, 2); }
  if (D.hairStyle === 'spiky') { f(D.hair, 5, -1, 6, 1); f(D.hair, 7, -2, 2, 1); }
  if (D.hairStyle === 'curly') { f(D.hair, 3, -1, 10, 3); f(D.hair, 3, 2, 1, 3); f(D.hair, 12, 2, 1, 3); }
  if (D.hairStyle === 'hood') { f(D.hair, 3, -1, 10, 1); f(D.hair, 3, 0, 1, 9); f(D.hair, 12, 0, 1, 9); }
  // body gear
  if (has('scarf')) { f(D.trim, 4, 8, 8, 2); f(D.trim, 5, 10, 2, 3); }
  if (has('pads')) { f(D.top2, 0, 7, 4, 2); f(D.top2, 12, 7, 4, 2); f(D.trim, 1, 6, 2, 1); f(D.trim, 13, 6, 2, 1); }
  if (has('belt')) { f(D.topStyle === 'armor' ? '#3a2a1a' : LEATHER, 4, 17, 8, 2); f(GOLD, 7, 17, 2, 2); }
  if (has('sash')) { f(D.trim, 4, 17, 8, 1); f(D.trim, 9, 18, 1, 4); }
  if (has('skirt')) { f(D.pants, 3, 19, 10, 3); f(D.trim, 3, 22, 10, 1); }
  if (has('pouch')) { f('#7a5530', 5, 19, 2, 2); f(LEATHER, 5, 18, 2, 1); }
  if (has('book')) { f('#2f66c4', 5, 18, 2, 3); f('#f1efe6', 6, 19, 1, 1); }
  if (has('potion')) f('#62e4ff', 9, 19, 2, 2);
  if (has('lamp')) f(D.trim, 5, 19, 2, 2);
  if (has('hammer')) { f('#7a5530', 10, 18, 1, 4); f('#8f8f96', 9, 21, 3, 2); }
  if (has('pocket')) f(D.trim, 6, 16, 4, 2);
  if (has('gloves')) { f(D.boots, 0, 16, 4, 2); f(D.boots, 12, 16, 4, 2); }
  if (has('boots')) f(dk(D.boots, 1.35), 4, 27, 8, 1);
  // hats
  if (has('wizard')) { f(D.top2, 2, -1, 12, 1); f(D.top, 4, -3, 8, 2); f(D.trim, 4, -2, 8, 1); f(D.top, 5, -5, 6, 2); f(D.top, 7, -7, 3, 2); f(D.trim, 8, -8, 1, 1); }
  if (has('straw')) { f('#e2c15a', 1, -1, 14, 1); f('#d9b54a', 4, -3, 8, 2); f(D.trim, 4, -2, 8, 1); }
  if (has('fedora')) { f('#7a5530', 2, -1, 12, 1); f('#8a6238', 4, -4, 8, 3); f('#3a2a1a', 4, -2, 8, 1); }
  if (has('mortar')) { f(D.top2, 5, -1, 6, 1); f(D.top2, 2, -2, 12, 1); f(D.trim, 13, -1, 1, 3); }
  if (has('helmet')) { f(D.top, 3, -1, 10, 4); f(D.top2, 3, 2, 10, 1); f(D.top, 7, 3, 2, 3); f(D.trim, 7, -4, 2, 3); }
  if (has('bandana')) { f(D.trim, 4, 1, 8, 2); f(D.trim, 12, 2, 1, 3); }
  if (has('turban')) { f(D.top2, 3, -1, 10, 3); f(D.top2, 5, -2, 6, 1); f(D.top, 7, 0, 2, 1); }
  if (has('headband')) f('#c23b32', 4, 1, 8, 1);
  if (has('newscap')) { f(D.cap || '#5a4630', 3, -1, 10, 2); f(D.cap || '#5a4630', 4, 1, 8, 1); }
  if (has('headset')) { f('#1d2333', 4, -1, 8, 1); f('#1d2333', 3, 2, 1, 4); f('#1d2333', 12, 2, 1, 4); f('#62e4ff', 11, 6, 1, 1); }
  if (has('tophat')) { f('#1b1b22', 2, -1, 12, 1); f('#1b1b22', 4, -6, 8, 5); f(D.trim, 4, -2, 8, 1); }
  if (has('tie')) { f(D.trim, 7, 8, 2, 2); f(D.trim, 7, 10, 2, 5); }
  if (has('satchel')) { f('#7a5530', 4, 18, 3, 3); f(LEATHER, 4, 17, 3, 1); for (let i = 0; i < 8; i++) f(LEATHER, 5 + i, 9 + i, 1, 1); }
  if (has('tablet')) { f('#1b2a4a', 9, 18, 3, 3); f('#62c8ff', 10, 19, 1, 1); }
  if (has('watch')) { f(GOLD, 9, 14, 3, 1); f(GOLD, 11, 15, 1, 1); }
  if (has('coat')) { f(D.top, 4, 8, 2, 4); f(D.top, 10, 8, 2, 4); }
  if (D.moustache) f(D.moustache, 6, 6, 4, 1);
}
// Head and shoulders on a 16×16 canvas (used for the chat portrait).
export function drawFace(ctx, D) {
  const c = document.createElement('canvas'); c.width = SPRITE.w; c.height = SPRITE.h; drawSprite(c.getContext('2d'), D);
  ctx.clearRect(0, 0, 16, 16); ctx.drawImage(c, SPRITE.ox, SPRITE.oy - 3, 16, 16, 0, 0, 16, 16);
}

const plainCache = {}, glowCache = {};
const plain = (c) => plainCache[c] || (plainCache[c] = new THREE.MeshLambertMaterial({ color: lin(c) }));
const lit = (c) => glowCache[c] || (glowCache[c] = new THREE.MeshBasicMaterial({ color: lin(c) }));

export function createFigure(design, opts = {}) {
  const ctx = {}, tex = {}, mat = {};
  for (const k in SIZE) { const c = document.createElement('canvas'); c.width = SIZE[k][0]; c.height = SIZE[k][1]; ctx[k] = c.getContext('2d'); tex[k] = toTex(c, false); mat[k] = new THREE.MeshLambertMaterial({ map: tex[k] }); }
  const group = new THREE.Group(), rig = new THREE.Group(); group.add(rig); group.userData.moving = true; // (no snow settles on people)
  const part = (w, h, d, m, py, px, off) => {
    const pivot = new THREE.Group(); pivot.position.set(px * PXU, py * PXU, 0);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w * PXU, h * PXU, d * PXU), m); mesh.position.y = off * PXU; mesh.receiveShadow = !!opts.shadows; mesh.userData.skin = true; pivot.add(mesh); rig.add(pivot); return pivot;
  };
  const parts = {
    head: part(8, 8, 8, [mat.side, mat.side, mat.top, mat.bot, mat.face, mat.back], 24, 0, 4),
    body: part(8, 12, 4, [mat.bodyS, mat.bodyS, mat.bodyS, mat.bodyS, mat.bodyF, mat.bodyB], 18, 0, 0),
    armL: part(4, 12, 4, mat.arm, 23, 6, -5), armR: part(4, 12, 4, mat.arm, 23, -6, -5),
    legL: part(4, 12, 4, mat.leg, 12, 2, -6), legR: part(4, 12, 4, mat.leg, 12, -2, -6),
  };
  // a long nose for the agents
  const noseMat = new THREE.MeshLambertMaterial();
  const nose = new THREE.Mesh(new THREE.BoxGeometry(2 * PXU, 4 * PXU, 2 * PXU), noseMat); nose.position.set(0, 2.2 * PXU, 5 * PXU); nose.visible = !!opts.nose; parts.head.add(nose);
  let gear = [];

  const fig = { group, rig, parts, design };
  fig.setDesign = (D) => {
    fig.design = D;
    for (const k in SIZE) { ctx[k].clearRect(0, 0, SIZE[k][0], SIZE[k][1]); PAINT[k](ctx[k], D); tex[k].needsUpdate = true; }
    noseMat.color.copy(lin(dk(D.skin, 0.9)));
    for (const m of gear) { m.parent.remove(m); m.geometry.dispose(); }
    // slimmer arms for some figures
    for (const [arm, side] of [[parts.armL, 1], [parts.armR, -1]]) { arm.children[0].scale.x = D.slim ? 0.75 : 1; arm.position.x = side * (D.slim ? 5.5 : 6) * PXU; }
    gear = gearBoxes(D).map(([p, w, h, d, c, x, y, z, tilt, glows, roll]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w * PXU, h * PXU, d * PXU), glows ? lit(c) : plain(c));
      m.position.set(x * PXU, y * PXU, z * PXU); if (tilt) m.rotation.x = tilt; if (roll) m.rotation.z = roll; m.castShadow = !!opts.shadows; m.receiveShadow = false; if (opts.tag) m.userData.agent = opts.tag;
      parts[p].add(m); return m;
    });
  };
  // Rigid limbs swinging from shoulder and hip. swing is the walk angle, air 0..1 when
  // jumping, sit 0..1 when seated, type 0..1 for a hands-busy-at-the-desk motion.
  fig.pose = (swing, air, time, sit = 0, type = 0, twist = 0) => {
    const idle = Math.sin(time * 1.6) * 0.03 + 0.05;
    parts.legL.rotation.x = (swing + air * 0.5) * (1 - sit) - sit * 1.5; parts.legR.rotation.x = (-swing - air * 0.5) * (1 - sit) - sit * 1.5;
    parts.armL.rotation.x = (-swing * 1.1 - air * 1.2) * (1 - sit) - sit * (0.9 + Math.sin(time * 9) * 0.18 * type);
    parts.armR.rotation.x = (swing * 1.1 - air * 1.2) * (1 - sit) - sit * (0.9 + Math.sin(time * 9 + 2) * 0.18 * type);
    parts.armL.rotation.z = idle + air * 0.25; parts.armR.rotation.z = -idle - air * 0.25;
    parts.head.rotation.x = Math.sin(time * 0.9) * 0.03 + sit * 0.12 * type;
    parts.body.rotation.y = twist; parts.head.rotation.y = -twist * 0.5;
  };
  fig.setDesign(design);
  return fig;
}
