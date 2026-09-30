import type { Action, Cell, Config } from './types';
import { BOARD_W, DEFAULT_CONFIG } from './types';
import { Rng } from './rng';
import { Game } from './game';
import { idx } from './board';
import { GRAY, EMPTY } from './types';
import { applyPerks, PERKS, type PerkId } from './perks';
import { STAGES, type StageDef, type StageGoal } from './stages';

export type RunPhase = 'stage' | 'pick' | 'won' | 'lost';

/** A run-level input: a piece action inside a stage, or a perk pick between stages. */
export type RunAction = Action | { t: 'pick'; index: number };

export interface RunInputEvent {
  stage: number;
  tick: number;
  action: RunAction;
}

export interface RunOptions {
  stages?: readonly StageDef[];
  /** Base config before perks. Hold and 3-preview are perks, so the run default turns them off. */
  baseConfig?: Partial<Config>;
  offerSize?: number;
}

export const RUN_BASE_CONFIG: Config = { ...DEFAULT_CONFIG, holdEnabled: false, previewCount: 1 };

/**
 * One roguelike run: a sequence of stages, each a fresh Game on its own derived seed, with a perk
 * pick between stages. Deterministic: every stage seed and perk offer comes from the run Rng, so
 * `replayRun(seed, log)` rebuilds the whole run.
 */
export class Run {
  readonly seed: number;
  readonly stages: readonly StageDef[];
  readonly baseConfig: Config;
  readonly offerSize: number;
  readonly rng: Rng;
  readonly perks: PerkId[] = [];
  readonly log: RunInputEvent[] = [];
  private readonly stageSeeds: number[];
  stageIndex = 0;
  phase: RunPhase = 'stage';
  game: Game;
  offer: PerkId[] = [];
  /** Score banked from finished stages. */
  bankedScore = 0;
  /** True once the current stage's score has been banked (goal met), so it is not counted twice. */
  private stageBanked = false;

  constructor(seed: number, opts: RunOptions = {}) {
    this.seed = seed >>> 0;
    this.stages = opts.stages ?? STAGES;
    this.baseConfig = { ...RUN_BASE_CONFIG, ...opts.baseConfig };
    this.offerSize = opts.offerSize ?? 3;
    this.rng = new Rng(this.seed);
    this.stageSeeds = this.stages.map(() => this.rng.nextU32());
    this.game = this.startStage(0);
  }

  get stage(): StageDef { return this.stages[this.stageIndex]!; }
  get goal(): StageGoal { return this.stage.goal; }
  /** Banked + in-progress score (a cleared stage's score is banked, not double counted). */
  get score(): number { return this.bankedScore + (this.stageBanked ? 0 : this.game.score); }

  /** Progress toward the current goal, as [current, target] integers. */
  progress(): [number, number] {
    const g = this.goal;
    switch (g.t) {
      case 'score': return [Math.min(this.game.score, g.target), g.target];
      case 'gray': return [Math.min(this.game.grayCleared, g.target), g.target];
      case 'survive': return [Math.min(this.game.tick, g.ticks), g.ticks];
    }
  }

  /** Piece input during a stage. Logged for replay. */
  input(action: Action): void {
    if (this.phase !== 'stage') return;
    this.log.push({ stage: this.stageIndex, tick: this.game.tick, action });
    this.game.input(action);
    this.check();
  }

  /** Perk pick between stages. Logged for replay. */
  pick(index: number): void {
    if (this.phase !== 'pick' || !this.offer[index]) return;
    this.log.push({ stage: this.stageIndex, tick: this.game.tick, action: { t: 'pick', index } });
    this.pickInternal(index);
  }

  /** Advance one fixed tick of the current stage. */
  step(): void {
    if (this.phase !== 'stage') return;
    this.game.step();
    const every = this.stage.garbageEveryTicks;
    if (every > 0 && this.game.tick % every === 0) this.game.pushGarbageRow(this.rng.nextInt(BOARD_W));
    this.check();
  }

  /** Apply a logged run action without re-logging (used by replay). */
  applyLogged(a: RunAction): void {
    if (a.t === 'pick') { this.pickInternal(a.index); return; }
    if (this.phase !== 'stage') return;
    this.game.apply(a);
    this.check();
  }

  private pickInternal(index: number): void {
    const id = this.offer[index];
    if (this.phase !== 'pick' || !id) return;
    this.perks.push(id);
    this.offer = [];
    this.stageIndex++;
    this.game = this.startStage(this.stageIndex);
    this.phase = 'stage';
  }


  private startStage(i: number): Game {
    this.stageBanked = false;
    const def = this.stages[i]!;
    const cfg = applyPerks({ ...this.baseConfig, colorCount: def.colorCount }, this.perks);
    const sealed: Cell[] = [...cfg.rules.sealedColors, ...def.sealedColors];
    // Random seals: draw from the colors not yet sealed, so a run always seals distinct colors.
    for (let n = 0; n < def.randomSealCount; n++) {
      const pool: Cell[] = [];
      for (let c = 1; c <= def.colorCount; c++) if (!sealed.includes(c as Cell)) pool.push(c as Cell);
      if (!pool.length) break;
      sealed.push(pool[this.rng.nextInt(pool.length)]!);
    }
    cfg.rules = { ...cfg.rules, sealedColors: sealed };
    const g = new Game(this.stageSeeds[i]!, cfg);
    // Pre-filled gray rows: written directly (not pushed) so the spawn position is untouched.
    for (let r = 0; r < def.startGarbageRows; r++) {
      const y = g.board.length / BOARD_W - 1 - r;
      const hole = this.rng.nextInt(BOARD_W);
      for (let x = 0; x < BOARD_W; x++) g.board[idx(x, y)] = x === hole ? EMPTY : GRAY;
    }
    return g;
  }

  private goalMet(): boolean {
    const g = this.goal;
    switch (g.t) {
      case 'score': return this.game.score >= g.target;
      case 'gray': return this.game.grayCleared >= g.target;
      case 'survive': return this.game.tick >= g.ticks;
    }
  }

  private check(): void {
    if (this.phase !== 'stage') return;
    if (this.game.phase === 'over') { this.phase = 'lost'; return; }
    if (!this.goalMet()) return;
    this.bankedScore += this.game.score;
    this.stageBanked = true;
    if (this.stageIndex === this.stages.length - 1) { this.phase = 'won'; return; }
    this.offer = this.makeOffer();
    if (this.offer.length === 0) {
      // Nothing left to offer: go straight to the next stage.
      this.stageIndex++;
      this.game = this.startStage(this.stageIndex);
      return;
    }
    this.phase = 'pick';
  }

  /** Up to `offerSize` distinct perks not yet owned, chosen by partial Fisher–Yates on the run Rng. */
  private makeOffer(): PerkId[] {
    const pool = PERKS.map((p) => p.id).filter((id) => !this.perks.includes(id));
    const n = Math.min(this.offerSize, pool.length);
    for (let i = 0; i < n; i++) {
      const j = i + this.rng.nextInt(pool.length - i);
      [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    return pool.slice(0, n);
  }
}

/** Re-simulate a run from seed + run log. Stops when the log is exhausted and `untilTick` (of the last stage) is reached. */
export function replayRun(seed: number, log: readonly RunInputEvent[], opts: RunOptions = {}, untilTick?: number): Run {
  const r = new Run(seed, opts);
  let i = 0;
  const last = log[log.length - 1];
  const endStage = last?.stage ?? 0;
  const endTick = untilTick ?? last?.tick ?? 0;
  for (;;) {
    while (i < log.length && log[i]!.stage === r.stageIndex && log[i]!.tick === r.game.tick) { r.applyLogged(log[i]!.action); i++; }
    if (r.phase === 'won' || r.phase === 'lost') break;
    if (r.phase === 'pick') {
      // A pick must be the next logged action; otherwise the log is exhausted or corrupt and replay ends here.
      const nxt = log[i];
      if (!nxt || nxt.action.t !== 'pick' || nxt.stage !== r.stageIndex) break;
      continue;
    }
    const done = i >= log.length && (r.stageIndex > endStage || (r.stageIndex === endStage && r.game.tick >= endTick));
    if (done) break;
    r.step();
  }
  return r;
}
