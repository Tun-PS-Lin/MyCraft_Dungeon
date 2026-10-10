// Sound. Every effect has a small synthesized placeholder; list real files in
// config.js (SOUND_FILES) and they replace the placeholders automatically.
import { SOUND_FILES, AMBIENT_LOOP } from './config.js';

let ctx = null, on = true, noiseBuf = null, ambient = null;
const samples = {};
try { on = localStorage.getItem('pv-sound') !== 'off'; } catch (e) { /* storage unavailable */ }

function audio() {
  if (!on) return null;
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    try { ctx = new A(); } catch (e) { return null; }
    loadFiles();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function loadFiles() {
  const base = import.meta.env && import.meta.env.BASE_URL ? import.meta.env.BASE_URL : './';
  for (const name in SOUND_FILES) for (const file of SOUND_FILES[name] || []) {
    fetch(base + 'assets/sounds/' + file).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => { (samples[name] = samples[name] || []).push(buf); }).catch(() => {});
  }
  if (AMBIENT_LOOP) { ambient = new Audio(base + 'assets/sounds/' + AMBIENT_LOOP); ambient.loop = true; ambient.volume = 0.35; ambient.play().catch(() => {}); }
}
function sample(name, vol) {
  const list = samples[name]; if (!list || !list.length) return false;
  const a = audio(); if (!a) return true;
  const s = a.createBufferSource(), g = a.createGain(); s.buffer = list[(Math.random() * list.length) | 0]; g.gain.value = vol; s.connect(g); g.connect(a.destination); s.start(); return true;
}
function tone(f0, f1, dur, type, vol) {
  const a = audio(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
}
function thud(dur, cut, vol) {
  const a = audio(); if (!a) return;
  if (!noiseBuf) { noiseBuf = a.createBuffer(1, a.sampleRate * 0.3, a.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
  s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = cut; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(a.destination); s.start(t, Math.random() * 0.1, dur);
}
const SYNTH = {
  step: () => thud(0.07, 700 + Math.random() * 500, 0.09),
  jump: () => tone(260, 470, 0.11, 'square', 0.04),
  land: () => thud(0.12, 380, 0.16),
  open: () => { tone(520, 520, 0.07, 'triangle', 0.08); setTimeout(() => tone(780, 780, 0.1, 'triangle', 0.08), 70); },
  close: () => tone(620, 380, 0.1, 'triangle', 0.07),
  near: () => tone(880, 880, 0.05, 'square', 0.025),
  menu: () => tone(330, 440, 0.08, 'triangle', 0.07),
  cluck: () => { tone(700, 420, 0.06, 'sawtooth', 0.03); setTimeout(() => tone(820, 520, 0.07, 'sawtooth', 0.03), 90); },
  bird: () => { const f = 1800 + Math.random() * 900; tone(f, f + 500, 0.07, 'sine', 0.012); setTimeout(() => tone(f + 300, f - 200, 0.09, 'sine', 0.012), 110); },
};
const VOLUME = { step: 0.5, bird: 0.4 };

export const sound = {
  play(name) { if (!sample(name, VOLUME[name] || 0.8) && SYNTH[name]) SYNTH[name](); },
  unlock: audio,                       // call from the first key press or tap
  started: () => !!ctx,
  isOn: () => on,
  toggle() { on = !on; try { localStorage.setItem('pv-sound', on ? 'on' : 'off'); } catch (e) { /* ignore */ } if (ambient) { if (on) ambient.play().catch(() => {}); else ambient.pause(); } return on; },
};
