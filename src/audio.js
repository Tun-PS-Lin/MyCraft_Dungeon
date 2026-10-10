// Sound. Every effect has a small synthesized placeholder; list real files in
// config.js (SOUND_FILES) and they replace the placeholders automatically.
// Music is a separate looping track with its own on/off switch.
import { SOUND_FILES, MUSIC_FILE, MUSIC_VOLUME } from './config.js';

const BASE = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || './';
const read = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v !== 'off'; } catch (e) { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, v ? 'on' : 'off'); } catch (e) { /* ignore */ } };

let ctx = null, on = read('pv-sound', true), noiseBuf = null;
const samples = {};

function audio() {
  if (!on) return null;
  if (!ctx) {
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    try { ctx = new A(); } catch (e) { return null; }
    for (const name in SOUND_FILES) for (const file of SOUND_FILES[name] || []) {
      fetch(BASE + 'assets/sounds/' + file).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).then((buf) => { (samples[name] = samples[name] || []).push(buf); }).catch(() => {});
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
function sample(name, vol) {
  const list = samples[name]; if (!list || !list.length) return false;
  const a = audio(); if (!a) return true;
  const s = a.createBufferSource(), g = a.createGain(); s.buffer = list[(Math.random() * list.length) | 0]; g.gain.value = vol; s.connect(g); g.connect(a.destination); s.start(); return true;
}
function tone(f0, f1, dur, type, vol, delay = 0, band = 0) {
  const a = audio(); if (!a) return; const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.linearRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  if (band) { const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = band; f.Q.value = 2.5; o.connect(f); f.connect(g); } else o.connect(g);
  g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
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
  open: () => { tone(520, 520, 0.07, 'triangle', 0.08); tone(780, 780, 0.1, 'triangle', 0.08, 0.07); },
  close: () => tone(620, 380, 0.1, 'triangle', 0.07),
  near: () => tone(880, 880, 0.05, 'square', 0.025),
  menu: () => tone(330, 440, 0.08, 'triangle', 0.07),
  cluck: () => { tone(700, 420, 0.06, 'sawtooth', 0.03); tone(820, 520, 0.07, 'sawtooth', 0.03, 0.09); },
  bird: () => { const f = 1800 + Math.random() * 900; tone(f, f + 500, 0.07, 'sine', 0.012); tone(f + 300, f - 200, 0.09, 'sine', 0.012, 0.11); },
  cricket: () => { for (let i = 0; i < 3; i++) tone(4300, 4300, 0.045, 'sine', 0.008, i * 0.07); },
  // a nasal "hrmm", in the spirit of a grumbling villager
  villager: () => { const f = 150 + Math.random() * 50; tone(f, f * 0.78, 0.34, 'sawtooth', 0.16, 0, 820); tone(f * 1.5, f * 1.1, 0.22, 'sawtooth', 0.05, 0.02, 1500); },
  bark: () => { tone(430, 250, 0.09, 'square', 0.07, 0, 700); tone(470, 260, 0.1, 'square', 0.07, 0.16, 700); },
  achieve: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.22, 'triangle', 0.08, i * 0.1)); },
};
const VOLUME = { step: 0.5, bird: 0.4, cricket: 0.4 };

export const sound = {
  play(name) { if (!sample(name, VOLUME[name] || 0.8) && SYNTH[name]) SYNTH[name](); },
  unlock() { audio(); music.start(); },   // call from the first key press or tap
  started: () => !!ctx,
  isOn: () => on,
  toggle() { on = !on; write('pv-sound', on); return on; },
};

/* ── background music ── */
let track = null, musicOn = read('pv-music', true), began = false;
export const music = {
  available: !!MUSIC_FILE,
  isOn: () => musicOn,
  // browsers only allow audio after the visitor has pressed a key or tapped
  start() {
    if (!MUSIC_FILE || began) return; began = true;
    track = new Audio(BASE + 'assets/sounds/' + MUSIC_FILE); track.loop = true; track.volume = MUSIC_VOLUME;
    if (musicOn) track.play().catch(() => { began = false; });
  },
  toggle() {
    musicOn = !musicOn; write('pv-music', musicOn);
    if (!track) this.start(); else if (musicOn) track.play().catch(() => {}); else track.pause();
    return musicOn;
  },
};
