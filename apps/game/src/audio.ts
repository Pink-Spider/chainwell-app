/**
 * Synthesized sound effects (no asset files) played through Phaser's Web Audio manager.
 * Every effect is rendered once at boot into an AudioBuffer and registered in the audio cache.
 * `sfx()` honours the 효과음 setting; `music()` is a stub until a track exists (음악 setting kept).
 */
import Phaser from 'phaser';
import { settings } from './save';

type Wave = 'sine' | 'square' | 'tri' | 'saw' | 'noise';
interface Tone { wave: Wave; freq: number; to?: number; dur: number; vol?: number; attack?: number; decay?: number; at?: number }

export type SfxName = 'move' | 'rotate' | 'soft' | 'hard' | 'lock' | 'hold' | 'line' | 'color' | 'gray' | 'chain' | 'cross' | 'stageClear' | 'gameOver' | 'perk' | 'tap';

const SR = 44100;
let manager: Phaser.Sound.WebAudioSoundManager | null = null;
let ready = false;

/** Render overlapping tones into one mono buffer. Pitch slides are exponential (musical). */
function render(ctx: AudioContext, tones: Tone[]): AudioBuffer {
  const total = Math.max(...tones.map((t) => (t.at ?? 0) + t.dur)) + 0.03;
  const n = Math.ceil(total * SR), out = new Float32Array(n);
  let seed = 0x9e3779b9;
  const rnd = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000 * 2 - 1; };
  for (const t of tones) {
    const start = Math.floor((t.at ?? 0) * SR), len = Math.floor(t.dur * SR);
    const a = Math.max(1, Math.floor((t.attack ?? 0.004) * SR)), d = Math.max(1, Math.floor((t.decay ?? t.dur * 0.6) * SR));
    const vol = t.vol ?? 0.5, f0 = t.freq, f1 = t.to ?? t.freq;
    let phase = 0;
    for (let i = 0; i < len; i++) {
      const p = i / len, f = f0 * Math.pow(f1 / f0, p);
      phase += f / SR; if (phase > 1) phase -= 1;
      let s: number;
      switch (t.wave) {
        case 'sine': s = Math.sin(phase * Math.PI * 2); break;
        case 'square': s = phase < 0.5 ? 1 : -1; break;
        case 'tri': s = 1 - 4 * Math.abs(phase - 0.5); break;
        case 'saw': s = 2 * phase - 1; break;
        default: s = rnd();
      }
      const env = Math.min(1, i / a) * (i > len - d ? Math.max(0, (len - i) / d) : 1);
      out[start + i] = (out[start + i] ?? 0) + s * env * vol;
    }
  }
  for (let i = 0; i < n; i++) out[i] = Math.max(-1, Math.min(1, out[i]!));
  const buf = ctx.createBuffer(1, n, SR);
  buf.copyToChannel(out, 0);
  return buf;
}

const note = (semi: number, base = 440) => base * Math.pow(2, semi / 12);

/** The sound set. Chain is pitched at play time, so it is rendered once at its base pitch. */
const SFX: Record<SfxName, Tone[]> = {
  move:   [{ wave: 'tri', freq: 520, dur: 0.035, vol: 0.25 }],
  rotate: [{ wave: 'square', freq: 660, to: 990, dur: 0.06, vol: 0.18 }],
  soft:   [{ wave: 'tri', freq: 300, dur: 0.025, vol: 0.15 }],
  hard:   [{ wave: 'noise', freq: 1, dur: 0.09, vol: 0.18, decay: 0.08 }, { wave: 'sine', freq: 900, to: 200, dur: 0.1, vol: 0.3 }],
  lock:   [{ wave: 'sine', freq: 180, to: 70, dur: 0.11, vol: 0.55 }, { wave: 'noise', freq: 1, dur: 0.04, vol: 0.12 }],
  hold:   [{ wave: 'sine', freq: 500, to: 700, dur: 0.07, vol: 0.25 }, { wave: 'sine', freq: 700, to: 500, dur: 0.07, vol: 0.25, at: 0.07 }],
  line:   [{ wave: 'saw', freq: 240, to: 960, dur: 0.16, vol: 0.22 }, { wave: 'noise', freq: 1, dur: 0.12, vol: 0.08, at: 0.04 }],
  color:  [0, 4, 7].map((s, i) => ({ wave: 'sine' as Wave, freq: note(s, 660), dur: 0.12, vol: 0.3, at: i * 0.045 })),
  gray:   [{ wave: 'noise', freq: 1, dur: 0.12, vol: 0.25, decay: 0.1 }, { wave: 'square', freq: 110, to: 60, dur: 0.1, vol: 0.2 }],
  chain:  [{ wave: 'sine', freq: 880, dur: 0.18, vol: 0.4 }, { wave: 'sine', freq: 1760, dur: 0.12, vol: 0.12 }, { wave: 'tri', freq: 440, dur: 0.1, vol: 0.15 }],
  cross:  [{ wave: 'sine', freq: 1320, dur: 0.14, vol: 0.3 }, { wave: 'sine', freq: 1760, dur: 0.2, vol: 0.3, at: 0.08 }],
  stageClear: [0, 4, 7, 12].map((s, i) => ({ wave: 'square' as Wave, freq: note(s, 523), dur: 0.14, vol: 0.18, at: i * 0.1 })).concat([{ wave: 'sine', freq: note(12, 523), dur: 0.5, vol: 0.25, at: 0.4 }]),
  gameOver: [{ wave: 'saw', freq: 420, to: 90, dur: 0.6, vol: 0.25, decay: 0.3 }, { wave: 'sine', freq: 210, to: 45, dur: 0.6, vol: 0.3, decay: 0.3 }],
  perk:   [{ wave: 'sine', freq: 660, dur: 0.1, vol: 0.3 }, { wave: 'sine', freq: 990, dur: 0.18, vol: 0.3, at: 0.09 }],
  tap:    [{ wave: 'square', freq: 1800, dur: 0.018, vol: 0.12 }],
};

/** Build all effects once. Call from the boot scene; safe to call again (no-op). */
export function initAudio(scene: Phaser.Scene): void {
  if (ready) return;
  const m = scene.sound;
  if (!(m instanceof Phaser.Sound.WebAudioSoundManager)) return; // NoAudio / HTML5 fallback: stay silent
  manager = m;
  const ctx = m.context;
  for (const [name, tones] of Object.entries(SFX)) scene.cache.audio.add(`sfx-${name}`, render(ctx, tones));
  ready = true;
}

/** Play an effect. `chain` pitches the chain sound up a semitone per step (capped at an octave). */
export function sfx(name: SfxName, o: { chain?: number; volume?: number } = {}): void {
  if (!manager || !settings().sfx) return;
  const semis = o.chain ? Math.min(12, o.chain - 1) : 0;
  manager.play(`sfx-${name}`, { volume: o.volume ?? 1, rate: Math.pow(2, semis / 12) });
}

// ── Generative music ────────────────────────────────────────────────────────
// Three moods sequenced live on Web Audio oscillators (no files). A lookahead scheduler books notes
// ~150 ms ahead; each mood has its own gain so switching cross-fades. The 음악 setting drives the
// master gain every tick, so toggling it in Settings takes effect immediately.

export type MusicTrack = 'home' | 'run' | 'boss';
interface Mood {
  bpm: number;
  stepsPerBeat: number;
  /** semitone offsets from the root (A2 = 110 Hz) for the arpeggio, cycled per step */
  arp: number[];
  arpOctave: number;
  arpWave: OscillatorType;
  arpVol: number;
  bassEvery: number;    // steps between bass hits (0 = none)
  drone: number[];      // semitone offsets of sustained drone voices
  droneVol: number;
}
const ROOT = 110; // A2
const MOODS: Record<MusicTrack, Mood> = {
  // slow well: two-voice drone, a sparse descending pentatonic arpeggio
  home: { bpm: 60, stepsPerBeat: 1, arp: [19, 15, 12, 10, 7, 3, 0, -2], arpOctave: 1, arpWave: 'triangle', arpVol: 0.10, bassEvery: 0, drone: [0, 7], droneVol: 0.045 },
  // run: 16th-note minor arpeggio, bass on beats 1 and 3; tempo rises with stage depth (see music())
  run:  { bpm: 112, stepsPerBeat: 4, arp: [0, 3, 7, 10, 12, 10, 7, 3], arpOctave: 2, arpWave: 'square', arpVol: 0.045, bassEvery: 8, drone: [0], droneVol: 0.03 },
  // boss: faster, 8th-note bass pulse, drone a fifth below
  boss: { bpm: 132, stepsPerBeat: 4, arp: [0, 3, 6, 10, 12, 10, 6, 3], arpOctave: 2, arpWave: 'sawtooth', arpVol: 0.04, bassEvery: 2, drone: [-5, 0], droneVol: 0.04 },
};
const BRIGHT = [0, 4, 7, 11, 12, 11, 7, 4]; // major colour borrowed for a bar after a chain

interface Voice { gain: GainNode; drones: OscillatorNode[]; mood: Mood }
let mctx: AudioContext | null = null;
let master: GainNode | null = null;
let lowpass: BiquadFilterNode | null = null;
let current: { track: MusicTrack; voice: Voice } | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let nextTime = 0, step = 0, intensity = 0, brightUntilStep = -1;
let mseed = 0x2545f491;
const mrand = () => { mseed = (Math.imul(mseed, 1664525) + 1013904223) >>> 0; return mseed / 0x100000000; };
const hz = (semi: number, oct = 0) => ROOT * Math.pow(2, semi / 12 + oct);

function ensureGraph(): boolean {
  if (!manager) return false;
  if (!mctx) {
    mctx = manager.context;
    lowpass = mctx.createBiquadFilter(); lowpass.type = 'lowpass'; lowpass.frequency.value = 1800; lowpass.Q.value = 0.7;
    master = mctx.createGain(); master.gain.value = settings().music ? 1 : 0;
    lowpass.connect(master); master.connect(mctx.destination);
  }
  return true;
}

function startVoice(mood: Mood): Voice {
  const ctx = mctx!, gain = ctx.createGain();
  gain.gain.value = 0; gain.connect(lowpass!);
  const drones = mood.drone.map((semi, i) => {
    const o = ctx.createOscillator(); o.type = i === 0 ? 'sine' : 'triangle'; o.frequency.value = hz(semi, 0);
    const g = ctx.createGain(); g.gain.value = mood.droneVol; o.connect(g); g.connect(gain); o.start();
    return o;
  });
  return { gain, drones, mood };
}

function playNote(ctx: AudioContext, dest: AudioNode, freq: number, t: number, dur: number, vol: number, type: OscillatorType) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
  o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.02);
}

function tick() {
  if (!mctx || !current || !master) return;
  master.gain.setTargetAtTime(settings().music ? 1 : 0, mctx.currentTime, 0.05);
  const { mood } = current.voice;
  const bpm = mood.bpm + (current.track === 'run' ? Math.round(intensity * 24) : 0);
  const stepDur = 60 / bpm / mood.stepsPerBeat;
  while (nextTime < mctx.currentTime + 0.15) {
    const scale = step < brightUntilStep ? BRIGHT : mood.arp;
    const semi = scale[step % scale.length]!;
    const skip = mood.stepsPerBeat === 1 ? mrand() < 0.25 : false;     // home: leave gaps
    if (!skip) playNote(mctx, current.voice.gain, hz(semi, mood.arpOctave), nextTime, mood.stepsPerBeat === 1 ? 1.4 : stepDur * 1.8, mood.arpVol, mood.arpWave);
    if (mood.bassEvery && step % mood.bassEvery === 0) playNote(mctx, current.voice.gain, hz(0, 0), nextTime, stepDur * 1.5, 0.09, 'sine');
    nextTime += stepDur; step++;
  }
}

/** Start or switch the background mood with a 1 s cross-fade. `null` fades out. `o.intensity` (0–1) speeds up the run mood. */
export function music(track: MusicTrack | null, o: { intensity?: number } = {}): void {
  if (!ensureGraph()) return;
  const ctx = mctx!;
  if (o.intensity !== undefined) intensity = Math.max(0, Math.min(1, o.intensity));
  if (current && current.track === track) return;
  if (current) {
    const old = current.voice, t = ctx.currentTime;
    old.gain.gain.cancelScheduledValues(t); old.gain.gain.setValueAtTime(old.gain.gain.value, t); old.gain.gain.linearRampToValueAtTime(0, t + 1);
    for (const d of old.drones) d.stop(t + 1.05);
    setTimeout(() => old.gain.disconnect(), 1200);
    current = null;
  }
  if (timer) { clearInterval(timer); timer = null; }
  if (!track) return;
  const voice = startVoice(MOODS[track]);
  voice.gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 1);
  current = { track, voice };
  nextTime = ctx.currentTime + 0.05; step = 0; brightUntilStep = -1;
  timer = setInterval(tick, 50);
  tick();
}

/** A chain just resolved: borrow the major colour for one bar (longer chains, longer bar). */
export function musicAccent(chain: number): void {
  if (!current) return;
  brightUntilStep = step + current.voice.mood.stepsPerBeat * Math.min(4, 1 + chain);
}
