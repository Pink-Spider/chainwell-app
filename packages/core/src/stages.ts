import type { Cell } from './types';

/** Stage goal (spec §4): reach a score, remove N gray cells, or survive for a number of ticks. */
export type StageGoal =
  | { t: 'score'; target: number }
  | { t: 'gray'; target: number }
  | { t: 'survive'; ticks: number };

export interface StageDef {
  goal: StageGoal;
  /** Gray rows pre-filled at the bottom when the stage starts (each with one random hole). */
  startGarbageRows: number;
  /** If > 0, a gray row rises from the bottom every N ticks (boss mechanic). */
  garbageEveryTicks: number;
  /** Colors that cannot color-clear on this stage (boss mechanic). */
  sealedColors: Cell[];
  /** Number of piece colors on this stage. */
  colorCount: 4 | 5;
  boss: boolean;
}

export const TICKS_PER_SEC = 60;
const sec = (s: number) => s * TICKS_PER_SEC;

const base: Omit<StageDef, 'goal'> = { startGarbageRows: 0, garbageEveryTicks: 0, sealedColors: [], colorCount: 4, boss: false };

/**
 * Run curve: 8 stages + boss (spec §4, 1–2 min per stage, 10–15 min per run).
 * Targets are first-pass guesses; tune with playtest data. A plain 4-cell clear is 40 pts,
 * a 2-chain of 4+4 is 40 + 80 = 120.
 */
export const STAGES: readonly StageDef[] = [
  { ...base, goal: { t: 'score', target: 600 } },
  { ...base, goal: { t: 'gray', target: 8 }, startGarbageRows: 2 },
  { ...base, goal: { t: 'score', target: 1500 } },
  { ...base, goal: { t: 'survive', ticks: sec(75) } },
  { ...base, goal: { t: 'gray', target: 16 }, startGarbageRows: 3 },
  { ...base, goal: { t: 'score', target: 3000 }, colorCount: 5 },
  { ...base, goal: { t: 'survive', ticks: sec(90) }, garbageEveryTicks: sec(20), colorCount: 5 },
  { ...base, goal: { t: 'score', target: 5000 }, colorCount: 5 },
  // Boss: the floor rises and one color is sealed. Survive to the bottom of the well.
  { ...base, goal: { t: 'survive', ticks: sec(90) }, garbageEveryTicks: sec(12), sealedColors: [4], colorCount: 5, boss: true },
];
