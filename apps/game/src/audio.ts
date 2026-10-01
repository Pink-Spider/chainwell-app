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

/** Music is not wired yet (no tracks); the 음악 setting is stored for when it is. */
export function music(_track: 'home' | 'run' | 'boss' | null): void { /* TODO: loops + crossfade */ }
