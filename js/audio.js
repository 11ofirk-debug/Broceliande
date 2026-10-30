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
const ENEMY_ATTACK_SOUND = { wolf: 'wolfBite', bear: 'bearAttack', ogre: 'ogreBlow', stirge: 'stirgeBite' };
const ENEMY_DEATH_SOUND = { wolf: 'wolfDie', bear: 'bearDie', ogre: 'ogreDies', stirge: 'stirgeDies' };
// M2c §2.9: a mini-boss's arrival, footsteps and wind-up (none for wolves and Bears).
const ENEMY_SPAWN_SOUND = { ogre: 'ogreSpawns', stirge: 'stirgeFlockSpawns' }; // M2h: once per flock (its first Stirge)
const ENEMY_STEP_SOUND = { ogre: 'ogreStep' };
const ENEMY_WINDUP_SOUND = { ogre: 'ogreWindup' };

function subscribe() {
  events.on('turretFired', (e) => play(TURRET_FIRE_SOUND[e.type], e));
  events.on('cloudBurst', (e) => play('cloudBurst', e));
  events.on('enemyAttacked', (e) => play(ENEMY_ATTACK_SOUND[e.type], e));
  events.on('druidSwing', (e) => play('druidWhoosh', e));
  events.on('druidImpact', (e) => play('druidThud', e));
  events.on('vulturePecked', (e) => play('vulturePeck', e));
  events.on('squirrelStrikes', (e) => play('squirrelScratch', e));
  events.on('enemyDied', (e) => play(ENEMY_DEATH_SOUND[e.type], e));
  events.on('enemySpawned', (e) => { if (e.first !== false) play(ENEMY_SPAWN_SOUND[e.type], e); });
  events.on('enemyStep', (e) => play(ENEMY_STEP_SOUND[e.type], e));
  events.on('enemyWindup', (e) => play(ENEMY_WINDUP_SOUND[e.type], e));
  events.on('resourcesGained', (e) => { // M2k §2.1: Shells have their own chime (and sounds row)
    const resources = e.resources ?? [];
    const others = resources.filter((r) => r !== 'shells');
    if (others.length) play('resourceChime', { ...e, resources: others });
    const i = resources.indexOf('shells');
    if (i >= 0) play('shellChime', { delay: i * C.SOUND_CHIME_STAGGER }); // keeps its turn in the sequence
  });
  events.on('searchStarted', (e) => play('searchRustle', e));
  events.on('turretBuilt', (e) => play('build', e));
  events.on('mapNodeHover', (e) => play('mapNodeHover', e));
  events.on('mapNodeChosen', (e) => play('mapNodeChosen', e));
  events.on('runComplete', (e) => play('runComplete', e));
  events.on('magicFound', (e) => play('magicFound', e));
  events.on('bellToll', (e) => play('bellToll', e));
  events.on('waveStarts', (e) => play('waveStarts', e));   // M2i §4.3
  events.on('waveCleared', (e) => play('waveCleared', e));
  events.on('summonDenied', (e) => play('summonDenied', e));
  events.on('doubleAppears', (e) => play('doubleAppears', e));
  events.on('doubleCraftHit', (e) => play('doubleCraftHit', e));
  events.on('doubleCancelled', (e) => play('doubleCancelled', e));
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

// Growl: a sawtooth gliding from freq to `to` through a lowpass at `cutoff` Hz, with a fast
// tremolo at `trem` Hz (the Ogre's voice).
function growl(t, out, { freq, to, dur, attack = 0.04, cutoff, trem, gain = 1, delay = 0 }) {
  const start = t + delay;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(to, start + dur);
  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = cutoff;
  const tremolo = ctx.createGain();
  tremolo.gain.value = 0.6;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = trem;
  const depth = ctx.createGain();
  depth.gain.value = 0.4;
  lfo.connect(depth);
  depth.connect(tremolo.gain);
  const env = envelope(start, attack, dur, gain);
  osc.connect(lowpass);
  lowpass.connect(tremolo);
  tremolo.connect(env);
  env.connect(out);
  osc.start(start);
  lfo.start(start);
  osc.stop(start + dur + 0.02);
  lfo.stop(start + dur + 0.02);
  return delay + dur;
}

// Wood creak: a slow buzz (a train of clicks) gliding from freq to `to`, through a narrow
// mid band so it sounds like stressed wood rather than a tone.
function creak(t, out, freq, to, dur, gain) {
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(freq, t);
  osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 900;
  band.Q.value = 3;
  const env = envelope(t, 0.03, dur, gain);
  osc.connect(band);
  band.connect(env);
  env.connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.02);
  return dur;
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

  // Short, light scratch (M1h §3.4): two quick high noise rakes, thinner and higher than the peck.
  squirrelScratch(t, out, p) {
    noise(t, out, { freq: 5500 * p, to: 7500 * p, q: 2.5, dur: 0.025, gain: 0.8 });
    return noise(t, out, { freq: 6000 * p, to: 8500 * p, q: 2.5, dur: 0.03, gain: 0.6, delay: 0.035 });
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

  // Magic find (M2e §3.2): a bright shimmer, a quick rising run of high bell tones over a soft
  // airy sparkle; brighter and longer than the resource chime.
  magicFound(t, out, p) {
    [1318, 1661, 1976, 2637, 3322].forEach((f, i) => {
      tone(t, out, { type: 'sine', freq: f * p, dur: 0.6, gain: 0.5, delay: i * 0.06, attack: 0.004 });
      tone(t, out, { type: 'triangle', freq: f * 2 * p, dur: 0.25, gain: 0.12, delay: i * 0.06, attack: 0.003 });
    });
    noise(t, out, { filter: 'highpass', freq: 6000 * p, dur: 0.9, attack: 0.05, gain: 0.25 });
    return 0.95;
  },

  // A wave starts (M2i §4.3): a low drum hit under a short, rough horn call.
  waveStarts(t, out, p) {
    tone(t, out, { freq: 70 * p, to: 42 * p, dur: 0.35, gain: 1 });
    noise(t, out, { filter: 'lowpass', freq: 300 * p, dur: 0.12, gain: 0.5 });
    tone(t, out, { type: 'sawtooth', freq: 147 * p, to: 165 * p, dur: 0.55, gain: 0.22, attack: 0.08, delay: 0.05 });
    return tone(t, out, { type: 'triangle', freq: 294 * p, to: 330 * p, dur: 0.55, gain: 0.25, attack: 0.08, delay: 0.05 });
  },

  // A wave cleared: a soft rising chime.
  waveCleared(t, out, p) {
    bell(t, out, 660 * p, 0, 0.5, 0.35);
    bell(t, out, 880 * p, 0.12, 0.5, 0.35);
    return bell(t, out, 1100 * p, 0.24, 0.7, 0.35);
  },

  // Stirges (M2h §5). A flock arriving: a short, thin buzzing whirr (a fast-trembling high buzz).
  stirgeFlockSpawns(t, out, p) {
    const dur = 0.5;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(420 * p, t);
    osc.frequency.linearRampToValueAtTime(520 * p, t + dur);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1400 * p;
    band.Q.value = 2.5;
    const trem = ctx.createGain();
    trem.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 55;
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    lfo.connect(depth);
    depth.connect(trem.gain);
    const env = envelope(t, 0.06, dur, 0.9);
    osc.connect(band);
    band.connect(trem);
    trem.connect(env);
    env.connect(out);
    osc.start(t);
    lfo.start(t);
    osc.stop(t + dur + 0.02);
    lfo.stop(t + dur + 0.02);
    return dur;
  },

  // A bite: a tiny wet "tsk".
  stirgeBite(t, out, p) {
    noise(t, out, { filter: 'highpass', freq: 3500 * p, q: 1, dur: 0.025, gain: 0.7 });
    return tone(t, out, { freq: 900 * p, to: 500 * p, dur: 0.03, gain: 0.25, attack: 0.002 });
  },

  // Death: a short high squeak.
  stirgeDies(t, out, p) {
    return tone(t, out, { type: 'triangle', freq: 2200 * p, to: 1300 * p, dur: 0.12, gain: 0.7, attack: 0.004 });
  },

  // Summon shortcut denied: a soft, short two-note low blip, falling.
  summonDenied(t, out, p) {
    tone(t, out, { type: 'triangle', freq: 330 * p, dur: 0.08, gain: 0.7, attack: 0.005 });
    return tone(t, out, { type: 'triangle', freq: 247 * p, dur: 0.12, gain: 0.7, attack: 0.005, delay: 0.08 });
  },

  // Bell toll (M2f §4.10): a deep bronze bell, its slightly inharmonic partials ringing out long,
  // with a dull strike at the start.
  bellToll(t, out, p) {
    for (const [ratio, gain, dur] of [[1, 1, 3.2], [2.0, 0.5, 2.6], [2.4, 0.35, 2.2], [3.0, 0.25, 1.8], [4.2, 0.15, 1.2]]) {
      tone(t, out, { type: 'sine', freq: 98 * ratio * p, dur, gain, attack: 0.004 });
    }
    noise(t, out, { filter: 'lowpass', freq: 900 * p, dur: 0.08, gain: 0.6 });
    return 3.3;
  },

  // The Ogre (M2c §2.9). Deep, long roar: two detuned growls swelling and falling, with breath.
  ogreSpawns(t, out, p) {
    growl(t, out, { freq: 95 * p, to: 52 * p, dur: 1.6, attack: 0.25, cutoff: 600, trem: 14, gain: 1 });
    growl(t, out, { freq: 71 * p, to: 40 * p, dur: 1.5, attack: 0.3, cutoff: 420, trem: 9, gain: 0.8, delay: 0.05 });
    noise(t, out, { filter: 'lowpass', freq: 700 * p, to: 250 * p, dur: 1.4, attack: 0.2, gain: 0.35 });
    return 1.65;
  },

  // Very low, short thud per heavy step.
  ogreStep(t, out, p) {
    tone(t, out, { freq: 62 * p, to: 34 * p, dur: 0.16, gain: 1 });
    return noise(t, out, { filter: 'lowpass', freq: 260 * p, dur: 0.07, gain: 0.5 });
  },

  // Short low creak and groan as the club goes up.
  ogreWindup(t, out, p) {
    creak(t, out, 38 * p, 62 * p, 0.35, 0.9);
    growl(t, out, { freq: 82 * p, to: 110 * p, dur: 0.4, attack: 0.08, cutoff: 500, trem: 18, gain: 0.5 });
    return 0.42;
  },

  // Heavy thump plus crunch: deeper, longer and louder than the Bear's attack.
  ogreBlow(t, out, p) {
    tone(t, out, { freq: 85 * p, to: 28 * p, dur: 0.42, gain: 1.4 });
    noise(t, out, { filter: 'lowpass', freq: 650 * p, dur: 0.22, gain: 1.1 });
    noise(t, out, { freq: 420 * p, q: 1.5, dur: 0.12, gain: 0.9, delay: 0.05 });
    noise(t, out, { freq: 900 * p, q: 2, dur: 0.07, gain: 0.6, delay: 0.1 });
    return 0.45;
  },

  // Long falling groan, then a heavy thud as it hits the ground.
  ogreDies(t, out, p) {
    growl(t, out, { freq: 120 * p, to: 38 * p, dur: 1.5, attack: 0.06, cutoff: 650, trem: 20, gain: 1 });
    tone(t, out, { freq: 70 * p, to: 26 * p, dur: 0.5, gain: 1.5, delay: 1.35 });
    noise(t, out, { filter: 'lowpass', freq: 400 * p, dur: 0.35, gain: 1, delay: 1.35 });
    return 1.9;
  },

  // Bright chime per resource gained, pitched by resource; several resources ring in turn.
  // Boughs (M1i §1.3) are the lowest and woody: a hollow knock rather than a bell.
  resourceChime(t, out, p, data) {
    let end = 0;
    (data.resources ?? []).forEach((res, i) => {
      const freq = C.SOUND_RESOURCE_FREQ[res] * p;
      const delay = i * C.SOUND_CHIME_STAGGER;
      if (res === 'boughs') {
        tone(t, out, { type: 'triangle', freq, to: freq * 0.85, dur: 0.22, gain: 0.9, delay, attack: 0.003 });
        tone(t, out, { freq: freq * 2.4, dur: 0.07, gain: 0.3, delay, attack: 0.002 });
        noise(t, out, { freq: freq * 4, q: 4, dur: 0.04, gain: 0.4, delay });
        end = delay + 0.22;
      } else {
        end = bell(t, out, freq, delay, 0.4, 0.8);
      }
    });
    return end;
  },

  // Snail Shell gained (M2k §2.1): a soft, slightly hollow tone, like blowing across a shell.
  shellChime(t, out, p, data) {
    const freq = C.SOUND_RESOURCE_FREQ.shells * p;
    const delay = data.delay ?? 0;
    tone(t, out, { freq, to: freq * 0.94, dur: 0.38, gain: 0.7, delay, attack: 0.02 });
    tone(t, out, { freq: freq * 1.5, to: freq * 1.42, dur: 0.24, gain: 0.18, delay, attack: 0.02 });
    noise(t, out, { freq: freq * 2, q: 8, dur: 0.18, gain: 0.25, delay, attack: 0.02 });
    return delay + 0.38;
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

  // Map (M2a §7): hovering an available node — a very soft tick.
  mapNodeHover(t, out, p) {
    tone(t, out, { type: 'triangle', freq: 1400 * p, to: 1150 * p, dur: 0.035, gain: 0.5, attack: 0.002 });
    return 0.04;
  },

  // Choosing a node: a low, warm drum hit and a short rising tone.
  mapNodeChosen(t, out, p) {
    tone(t, out, { freq: 120 * p, to: 55 * p, dur: 0.3, gain: 1.1, attack: 0.004 });
    noise(t, out, { filter: 'lowpass', freq: 400 * p, dur: 0.12, gain: 0.5 });
    return tone(t, out, { type: 'triangle', freq: 330 * p, to: 660 * p, dur: 0.35, gain: 0.35, attack: 0.04, delay: 0.08 });
  },

  // Run complete: a short triumphant three-note phrase (rising major arpeggio, last note held).
  runComplete(t, out, p) {
    bell(t, out, 523 * p, 0, 0.3, 0.7);
    bell(t, out, 659 * p, 0.16, 0.3, 0.7);
    tone(t, out, { type: 'triangle', freq: 784 * p, dur: 0.8, gain: 0.5, delay: 0.32, attack: 0.01 });
    return bell(t, out, 784 * p, 0.32, 0.8, 0.8);
  },

  // Bough Double arrives (M1i §2.8): a soft woody creak with a low shimmer under it.
  doubleAppears(t, out, p) {
    creak(t, out, 40 * p, 58 * p, 0.32, 0.7);
    [1, 1.5].forEach((k, i) => tone(t, out, { freq: 220 * k * p, to: 300 * k * p, dur: 0.4, attack: 0.08, gain: 0.18, delay: 0.05 + i * 0.05 }));
    return 0.5;
  },

  // One crafting swing: a tiny, quiet wooden tap. Replaces the old upgrade ratchet.
  doubleCraftHit(t, out, p) {
    tone(t, out, { type: 'triangle', freq: 720 * p, to: 520 * p, dur: 0.035, gain: 0.7, attack: 0.002 });
    noise(t, out, { freq: 2200 * p, q: 4, dur: 0.02, gain: 0.4 });
    return 0.04;
  },

  // Job cancelled: a short descending creak.
  doubleCancelled(t, out, p) {
    return creak(t, out, 65 * p, 32 * p, 0.3, 0.7);
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
