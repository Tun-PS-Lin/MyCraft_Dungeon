// Sound. Every effect has a small synthesized placeholder; list real files in
// config.js (SOUND_FILES) and they replace the placeholders automatically.
// Music is a separate looping track with its own on/off switch.
import { SOUND_FILES, MUSIC_FILE, MUSIC_VOLUME } from './config.js';
import { BASE } from './base.js';
import { RECORDS } from './hideout-content.js';
import { rng } from './textures.js';

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
  crackle: () => { for (let i = 0; i < 3; i++) setTimeout(() => thud(0.03, 2400 + Math.random() * 1800, 0.05 + Math.random() * 0.05), i * (40 + Math.random() * 90)); },
  roll: () => { thud(0.22, 1400, 0.12); tone(200, 110, 0.2, 'triangle', 0.05); },
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

/* ── background music ──
   The CD player in the Hideout holds several CDs (src/hideout-content.js). A record is
   either an audio file, played with an <audio> element, or one of the small built-in demo
   tunes below, played with Web Audio. The chosen record is remembered. */
const pick = () => { try { return localStorage.getItem('pv-record'); } catch (e) { return null; } };
let musicOn = read('pv-music', true), began = false, el = null, current = (RECORDS.find((r) => r.id === pick()) || RECORDS[0] || {}).id, synth = null, mctx = null;
const listeners = [];
const changed = () => listeners.forEach((f) => f());
function musicCtx() {
  if (!mctx) { const A = window.AudioContext || window.webkitAudioContext; if (!A) return null; try { mctx = new A(); } catch (e) { return null; } }
  if (mctx.state === 'suspended') mctx.resume(); return mctx;
}
// the demo tunes: a chord progression played as an arpeggio over a bass line, with a few melody notes
const TUNES = {
  cave:   { bpm: 70, root: 57, wave: 'triangle', lead: 'sine', echo: 0.42, chords: [[0, 3, 7, 12], [-4, 0, 3, 8], [3, 7, 10, 15], [-2, 2, 5, 10]], scale: [0, 3, 5, 7, 10, 12] },
  rain:   { bpm: 82, root: 60, wave: 'sine', lead: 'triangle', echo: 0.3, chords: [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 4]], scale: [0, 2, 4, 7, 9, 12] },
  market: { bpm: 116, root: 53, wave: 'square', lead: 'square', echo: 0.15, chords: [[0, 4, 7, 12], [5, 9, 12, 17], [7, 11, 14, 19], [0, 4, 7, 12]], scale: [0, 2, 4, 7, 9, 12], bounce: true },
};
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
function startSynth(name) {
  const a = musicCtx(), T = TUNES[name]; if (!a || !T) return null;
  const out = a.createGain(); out.gain.value = 0; out.gain.linearRampToValueAtTime(MUSIC_VOLUME * (T.wave === 'square' ? 0.55 : 1.1), a.currentTime + 0.8); out.connect(a.destination);
  const echo = a.createDelay(1), fb = a.createGain(), wet = a.createGain(); echo.delayTime.value = 60 / T.bpm * 0.75; fb.gain.value = T.echo; wet.gain.value = T.echo;
  echo.connect(fb); fb.connect(echo); echo.connect(wet); wet.connect(out);
  const note = (m, t, len, type, vol) => {
    const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    o.connect(g); g.connect(out); g.connect(echo); o.start(t); o.stop(t + len + 0.05);
  };
  const r = rng(name.length * 7 + 3), melody = []; // a fixed little melody for the 4-bar loop
  for (let i = 0; i < 16; i++) melody.push(r() < 0.55 ? T.scale[(r() * T.scale.length) | 0] + 12 : null);
  const step = 60 / T.bpm / 2, ARP = [0, 1, 2, 3, 2, 1, 2, 1];
  let n = 0, next = a.currentTime + 0.1;
  const timer = setInterval(() => {
    while (next < a.currentTime + 0.25) {
      const bar = Math.floor(n / 8) % 4, k = n % 8, ch = T.chords[bar];
      note(T.root + ch[ARP[k]], next, step * 1.6, T.wave, T.wave === 'square' ? 0.05 : 0.12);
      if (k % (T.bounce ? 2 : 4) === 0) note(T.root - 12 + ch[0] + (T.bounce && k % 4 === 2 ? 7 : 0), next, step * (T.bounce ? 1.5 : 3.6), 'triangle', 0.16);
      if (k % 2 === 0) { const m = melody[(bar * 4 + k / 2) % 16]; if (m !== null) note(T.root + m, next + step * 0.02, step * 2.6, T.lead, T.lead === 'square' ? 0.035 : 0.09); }
      n++; next += step;
    }
  }, 50);
  return { stop() { clearInterval(timer); const t = a.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + 0.4); setTimeout(() => out.disconnect(), 600); } };
}
function stopAll() { if (el) el.pause(); if (synth) { synth.stop(); synth = null; } }
// volume steps shown on the player's screen, 0 to 20; 10 is the site's normal music level
let level = (() => { try { const v = parseInt(localStorage.getItem('pv-volume'), 10); return isNaN(v) ? 10 : Math.max(0, Math.min(20, v)); } catch (e) { return 10; } })();
const gain = () => Math.min(1, MUSIC_VOLUME * level / 10 * (level > 10 ? 1 + (level - 10) * 0.25 : 1));
function playCurrent() {
  stopAll(); const rec = RECORDS.find((q) => q.id === current); if (!rec || !musicOn) { changed(); return; }
  if (rec.file) {
    if (!el) { el = new Audio(); el.loop = true; el.preload = 'auto'; }
    const src = BASE + 'assets/sounds/' + rec.file; if (el.dataset.src !== src) { el.src = src; el.dataset.src = src; }
    el.volume = gain(); el.play().catch(() => { began = false; });
  } else if (rec.synth) synth = startSynth(rec.synth);
  changed();
}
export const music = {
  available: RECORDS.length > 0,
  isOn: () => musicOn,
  current: () => current,
  // browsers only allow audio after the visitor has pressed a key or tapped
  start() { if (began || !this.available) return; began = true; playCurrent(); },
  toggle() { musicOn = !musicOn; write('pv-music', musicOn); began = true; playCurrent(); return musicOn; },
  // the CD player: put on a CD from the start (and switch music on if it was off)
  play(id) {
    if (id !== current && el) { el.dataset.src = ''; } // a new CD starts from the top
    current = id; try { localStorage.setItem('pv-record', id); } catch (e) { /* ignore */ }
    began = true; if (!musicOn) { musicOn = true; write('pv-music', true); } playCurrent();
  },
  stop() { musicOn = false; write('pv-music', false); stopAll(); if (el) el.currentTime = 0; changed(); },
  step(dir) { const i = RECORDS.findIndex((q) => q.id === current), n = RECORDS.length; const r = RECORDS[(i + dir + n) % n]; this.play(r.id); return r; },
  volume: () => level,
  setVolume(v) { level = Math.max(0, Math.min(20, v)); try { localStorage.setItem('pv-volume', level); } catch (e) { /* ignore */ } if (el) el.volume = gain(); changed(); },
  // elapsed seconds of the CD that is playing (0 for the built-in tunes)
  time: () => (el && el.dataset.src ? el.currentTime || 0 : 0),
  onChange: (f) => listeners.push(f),
};
