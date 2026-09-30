import { type CharacterId, type PlayerStats, EMPTY_STATS, type Run } from '@chainwell/core';

export type DragSensitivity = 'low' | 'normal' | 'high';

/** Player options (Figma: Menu / Settings). Only stored here; each consumer reads `settings()`. */
export interface Settings {
  sfx: boolean;
  music: boolean;
  haptics: boolean;
  glyphs: boolean;        // 색 기호 표시
  bigText: boolean;       // 큰 글씨 (stored; no consumer yet)
  dropOnRelease: boolean; // 손 떼면 드롭
  hints: boolean;         // 조작 힌트 표시
  dragSensitivity: DragSensitivity;
  lang: 'ko';
}
export const DEFAULT_SETTINGS: Settings = { sfx: true, music: true, haptics: true, glyphs: true, bigText: false, dropOnRelease: false, hints: true, dragSensitivity: 'normal', lang: 'ko' };

/** Local save. localStorage for the web prototype; swap the backend for Capacitor Preferences later. */
export interface SaveData extends PlayerStats {
  character: CharacterId;
  bestScore: number;
  settings: Settings;
}

const KEY = 'chainwell.save.v1';
const DEFAULTS: SaveData = { ...EMPTY_STATS, character: 'diver', bestScore: 0, settings: DEFAULT_SETTINGS };
let cachedSettings: Settings | null = null;

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    return { ...DEFAULTS, ...parsed, settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) } };
  } catch { return { ...DEFAULTS }; }
}

/** Cached settings for per-frame readers (PlayScene, haptics). */
export function settings(): Settings {
  return cachedSettings ??= loadSave().settings;
}
export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): Settings {
  cachedSettings = { ...settings(), [key]: value };
  writeSave({ settings: cachedSettings });
  return cachedSettings;
}

export function writeSave(patch: Partial<SaveData>): SaveData {
  const next = { ...loadSave(), ...patch };
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode etc. */ }
  return next;
}

/** Fold a finished run into lifetime stats. */
export function recordRun(run: Run): SaveData {
  const s = loadSave();
  return writeSave({
    runsPlayed: s.runsPlayed + 1,
    runsWon: s.runsWon + (run.phase === 'won' ? 1 : 0),
    bestStage: Math.max(s.bestStage, run.stageIndex),
    bestScore: Math.max(s.bestScore, run.score),
  });
}
