import { type CharacterId, type PlayerStats, EMPTY_STATS, type Run } from '@chainwell/core';

/** Local save. localStorage for the web prototype; swap the backend for Capacitor Preferences later. */
export interface SaveData extends PlayerStats {
  character: CharacterId;
  bestScore: number;
}

const KEY = 'chainwell.save.v1';
const DEFAULTS: SaveData = { ...EMPTY_STATS, character: 'diver', bestScore: 0 };

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<SaveData>) };
  } catch { return { ...DEFAULTS }; }
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
