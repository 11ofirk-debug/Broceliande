// Sound effects (M1g §3): every sound is synthesised here with the Web Audio API (oscillators,
// filtered noise, short envelopes). Gameplay never calls this module; it emits events on the
// bus and the subscriptions below turn them into sounds. Nothing here touches the simulation,
// and pitch variation uses its own RNG stream, so the game's seeded RNG is never consumed.

import * as C from './config.js';
import { events } from './events.js';
import { createRng } from './rng.js';

const AUDIO_RNG_SEED = 0x5eed50; // audio-only stream (pitch jitter, noise, rustle timing)
const rng = createRng(AUDIO_RNG_SEED);

let ctx = null;        // AudioContext, created on the first click or key press (§3.3)
let master = null;     // master gain → speakers
let noiseBuffer = null;
let muted = loadMuted();

const lastPlayed = {}; // sound → ctx time of its last play (minGap)
const voices = {};     // sound → end times of copies still sounding (maxVoices)
const history = [];    // { name, time, result: 'played' | 'gap' | 'cap' } for the debug panel (§5)

// ---------------------------------------------------------------------------
// Setup, unlock and mute
// ---------------------------------------------------------------------------

// Subscribes to gameplay events and waits for the first user gesture to start audio.
export function initAudio() {
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);
  subscribe();
}

// Chrome only lets audio start from a user gesture. Until then plays are skipped silently.
function unlock() {
  try {
    if (!ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      ctx = new AudioContextClass();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : C.MASTER_VOLUME;
      master.connect(ctx.destination);
      noiseBuffer = makeNoiseBuffer();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  } catch {
    ctx = null; // no audio on this browser; the game runs silently
  }
}

function loadMuted() {
  try {
    return localStorage.getItem(C.SOUND_MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isMuted() {
  return muted;
}

// V key and the HUD speaker icon (§3.6). Remembered in localStorage.
export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : C.MASTER_VOLUME;
  try {
    localStorage.setItem(C.SOUND_MUTE_KEY, muted ? '1' : '0');
  } catch {
    // storage unavailable: mute still works for this session
  }
}

// ---------------------------------------------------------------------------
// Events → sounds
// ---------------------------------------------------------------------------
const TURRET_FIRE_SOUND = { sprinkler: 'sprinklerFire', toader: 'toaderFire' };
const ENEMY_ATTACK_SOUND = { wolf: 'wolfBite', bear: 'bearAttack' };
const ENEMY_DEATH_SOUND = { wolf: 'wolfDie', bear: 'bearDie' };

function subscribe() {
  events.on('turretFired', (e) => play(TURRET_FIRE_SOUND[e.type], e));
  events.on('cloudBurst', (e) => play('cloudBurst', e));
  events.on('enemyAttacked', (e) => play(ENEMY_ATTACK_SOUND[e.type], e));
  events.on('druidSwing', (e) => play('druidWhoosh', e));
  events.on('druidImpact', (e) => play('druidThud', e));
  events.on('vulturePecked', (e) => play('vulturePeck', e));
  events.on('enemyDied', (e) => play(ENEMY_DEATH_SOUND[e.type], e));
  events.on('resourcesGained', (e) => play('resourceChime', e));
  events.on('searchStarted', (e) => play('searchRustle', e));
  events.on('turretBuilt', (e) => play('build', e));
  events.on('upgradeTick', (e) => play('upgradeTick', e));
  events.on('upgradeCompleted', (e) => play('upgradeDone', e));
  events.on('summonPlaced', (e) => play('summon', e));
}

// Plays a sound unless audio is not started, muted, disabled, within its minGap of the last
// play, or already at maxVoices (§3.5). Each play is pitched by ±SOUND_PITCH_JITTER.
function play(name, data) {
  const def = C.SOUNDS[name];
  if (!def || !def.enabled || muted || !ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (now - (lastPlayed[name] ?? -Infinity) < def.minGap) {
    record(name, 'gap');
    return;
  }
  const live = (voices[name] ?? []).filter((end) => end > now);
  voices[name] = live;
  if (live.length >= def.maxVoices) {
    record(name, 'cap');
    return;
  }
  const out = ctx.createGain();
  out.gain.value = def.volume;
  out.connect(master);
  const pitch = def.pitch * (1 + rng.range(-C.SOUND_PITCH_JITTER, C.SOUND_PITCH_JITTER));
  const duration = RECIPES[name](now, out, pitch, data);
  live.push(now + duration);
  lastPlayed[name] = now;
  record(name, 'played');
  setTimeout(() => out.disconnect(), (duration + 0.2) * 1000);
}

function record(name, result) {
  history.push({ name, time: performance.now() / 1000, result });
  pruneHistory();
}

function pruneHistory() {
  const cutoff = performance.now() / 1000 - C.SOUND_STATS_WINDOW;
  while (history.length && history[0].time < cutoff) history.shift();
}

// Debug panel (§5): per sound, { played, gap, cap } over the last SOUND_STATS_WINDOW s.
export function soundStats() {
  pruneHistory();
  const stats = {};
  for (const h of history) {
    stats[h.name] ??= { played: 0, gap: 0, cap: 0 };
    stats[h.name][h.result]++;
  }
  return stats;
}

export function audioStatus() {
  if (!ctx) return 'waiting for first click / key';
  return ctx.state === 'running' ? (muted ? 'muted' : 'on') : ctx.state;
}

// ---------------------------------------------------------------------------
// Synthesis building blocks
// ---------------------------------------------------------------------------
function makeNoiseBuffer() {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); // 1 s of white noise
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = rng.range(-1, 1);
  return buffer;
}

// Percussive envelope: quick rise to `gain`, exponential fall to silence at start + dur.
function envelope(start, attack, dur, gain) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(gain, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  return g;
}

// Oscillator gliding from freq to `to` over dur. Returns when it ends, relative to t.
function tone(t, out, { type = 'sine', freq, to = freq, dur, attack = 0.005, gain = 1, delay = 0 }) {
  const start = t + delay;
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
  const env = envelope(start, attack, dur, gain);
  osc.connect(env);
  env.connect(out);
  osc.start(start);
  osc.stop(start + dur + 0.02);
  return delay + dur;
}

// White noise through a filter whose frequency glides from freq to `to`.
function noise(t, out, { filter = 'bandpass', freq, to = freq, q = 1, dur, attack = 0.003, gain = 1, delay = 0 }) {
  const start = t + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(freq, start);
  if (to !== freq) f.frequency.exponentialRampToValueAtTime(to, start + dur);
  const env = envelope(start, attack, dur, gain);
  src.connect(f);
  f.connect(env);
  env.connect(out);
  src.start(start, rng.range(0, 0.5));
  src.stop(start + dur + 0.02);
  return delay + dur;
}

// A small bell: fundamental plus a quieter, quickly fading inharmonic partial.
function bell(t, out, freq, delay, dur, gain) {
  tone(t, out, { freq, dur, gain, delay, attack: 0.004 });
  tone(t, out, { freq: freq * 2.76, dur: dur * 0.4, gain: gain * 0.25, delay, attack: 0.002 });
  return delay + dur;
}

// ---------------------------------------------------------------------------
// Recipes (§3.4): (t, out, pitch, data) → duration in s. pitch scales every frequency.
// ---------------------------------------------------------------------------
const RECIPES = {
  // Very short, quiet high tick.
  sprinklerFire(t, out, p) {
    noise(t, out, { filter: 'highpass', freq: 6000 * p, dur: 0.015, gain: 0.4 });
    return tone(t, out, { freq: 3200 * p, to: 2400 * p, dur: 0.03, gain: 0.5, attack: 0.002 });
  },

  // Low wet "blorp": a falling low sine with a small bubble on top.
  toaderFire(t, out, p) {
    tone(t, out, { freq: 520 * p, to: 820 * p, dur: 0.05, gain: 0.25 });
    noise(t, out, { filter: 'lowpass', freq: 500 * p, dur: 0.08, gain: 0.3 });
    return tone(t, out, { freq: 300 * p, to: 85 * p, dur: 0.19, gain: 1, attack: 0.01 });
  },

  // Soft hiss: noise sweeping down, quick fade.
  cloudBurst(t, out, p) {
    return noise(t, out, { freq: 3200 * p, to: 900 * p, q: 0.7, dur: 0.4, attack: 0.03, gain: 0.8 });
  },

  // Short crunchy burst, mid-low: two noise snaps and a low buzz.
  wolfBite(t, out, p) {
    noise(t, out, { freq: 1100 * p, q: 1.5, dur: 0.05, gain: 1 });
    noise(t, out, { freq: 750 * p, q: 1.5, dur: 0.06, gain: 0.8, delay: 0.04 });
    tone(t, out, { type: 'square', freq: 160 * p, to: 90 * p, dur: 0.06, gain: 0.2 });
    return 0.1;
  },

  // Heavier, lower thump plus crunch.
  bearAttack(t, out, p) {
    tone(t, out, { freq: 110 * p, to: 42 * p, dur: 0.26, gain: 1.2 });
    noise(t, out, { filter: 'lowpass', freq: 900 * p, dur: 0.14, gain: 0.9, delay: 0.02 });
    noise(t, out, { freq: 600 * p, q: 2, dur: 0.08, gain: 0.7, delay: 0.08 });
    return 0.26;
  },

  // Druid strike, swing: rising whoosh. The impact thud is its own event at the impact moment.
  druidWhoosh(t, out, p) {
    return noise(t, out, { freq: 500 * p, to: 2600 * p, q: 1.2, dur: 0.11, attack: 0.07, gain: 0.8 });
  },

  // Druid strike, impact: soft thud.
  druidThud(t, out, p) {
    noise(t, out, { filter: 'lowpass', freq: 500 * p, dur: 0.05, gain: 0.5 });
    return tone(t, out, { freq: 160 * p, to: 60 * p, dur: 0.12, gain: 1 });
  },

  // Sharp, dry click.
  vulturePeck(t, out, p) {
    noise(t, out, { filter: 'highpass', freq: 2500 * p, q: 0.7, dur: 0.015, gain: 1 });
    tone(t, out, { type: 'square', freq: 1500 * p, to: 1200 * p, dur: 0.012, gain: 0.3, attack: 0.001 });
    return 0.02;
  },

  // Short descending yelp.
  wolfDie(t, out, p) {
    tone(t, out, { type: 'triangle', freq: 1000 * p, to: 380 * p, dur: 0.22, attack: 0.01, gain: 0.9 });
    tone(t, out, { freq: 2000 * p, to: 760 * p, dur: 0.15, attack: 0.01, gain: 0.2 });
    return 0.22;
  },

  // Low, longer descending growl: a filtered sawtooth with a fast tremolo.
  bearDie(t, out, p) {
    const dur = 0.8;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150 * p, t);
    osc.frequency.exponentialRampToValueAtTime(48 * p, t + dur);
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 700 * p;
    const tremolo = ctx.createGain();
    tremolo.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 26;
    const depth = ctx.createGain();
    depth.gain.value = 0.4;
    lfo.connect(depth);
    depth.connect(tremolo.gain);
    const env = envelope(t, 0.04, dur, 1);
    osc.connect(lowpass);
    lowpass.connect(tremolo);
    tremolo.connect(env);
    env.connect(out);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + dur + 0.02);
    lfo.stop(t + dur + 0.02);
    noise(t, out, { filter: 'lowpass', freq: 300 * p, dur: 0.5, attack: 0.05, gain: 0.4 });
    return dur;
  },

  // Bright chime per resource gained, pitched by resource; several resources ring in turn.
  resourceChime(t, out, p, data) {
    let end = 0;
    (data.resources ?? []).forEach((res, i) => {
      end = bell(t, out, C.SOUND_RESOURCE_FREQ[res] * p, i * C.SOUND_CHIME_STAGGER, 0.4, 0.8);
    });
    return end;
  },

  // Leafy rustle: a handful of short, uneven high noise bursts.
  searchRustle(t, out, p) {
    let end = 0;
    for (let i = 0; i < 6; i++) {
      end = noise(t, out, {
        freq: rng.range(3000, 5000) * p,
        q: 0.9,
        dur: rng.range(0.04, 0.07),
        gain: rng.range(0.4, 0.9),
        delay: i * 0.045 + rng.range(0, 0.02),
      });
    }
    return end;
  },

  // Two quick wooden knocks.
  build(t, out, p) {
    for (const delay of [0, 0.12]) {
      tone(t, out, { type: 'triangle', freq: 520 * p, to: 380 * p, dur: 0.05, gain: 0.8, delay, attack: 0.002 });
      noise(t, out, { freq: 1600 * p, q: 3, dur: 0.03, gain: 0.5, delay });
    }
    return 0.17;
  },

  // One ratchet tick.
  upgradeTick(t, out, p) {
    noise(t, out, { filter: 'highpass', freq: 3000 * p, dur: 0.012, gain: 0.8 });
    tone(t, out, { type: 'square', freq: 900 * p, dur: 0.01, gain: 0.25, attack: 0.001 });
    return 0.015;
  },

  // Rising two-note chime.
  upgradeDone(t, out, p) {
    bell(t, out, 660 * p, 0, 0.25, 0.7);
    return bell(t, out, 990 * p, 0.11, 0.35, 0.8);
  },

  // Short rising shimmer, pitched by summon (Vulture lower, Squirrel higher).
  summon(t, out, p, data) {
    const f = (C.SOUND_SUMMON_FREQ[data.kind] ?? C.SOUND_SUMMON_FREQ.vulture) * p;
    [1, 1.5, 2, 2.5].forEach((k, i) => {
      tone(t, out, { freq: f * k, to: f * k * 1.5, dur: 0.35, attack: 0.05, gain: 0.3, delay: i * 0.04 });
    });
    noise(t, out, { filter: 'highpass', freq: 6000, dur: 0.3, attack: 0.05, gain: 0.12 });
    return 0.47;
  },
};
