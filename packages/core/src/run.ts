import type { Action, Cell, Config } from './types';
import { BOARD_W, DEFAULT_CONFIG } from './types';
import { Rng } from './rng';
import { Game } from './game';
import { idx } from './board';
import { GRAY, EMPTY } from './types';
import { applyPerks, PERKS, type PerkId } from './perks';
import { STAGES, type StageDef, type StageGoal } from './stages';

export type RunPhase = 'stage' | 'pick' | 'won' | 'lost';

/** A run-level input: a piece action inside a stage, or a perk pick / skip between stages. */
export type RunAction = Action | { t: 'pick'; index: number } | { t: 'skip' } | { t: 'reroll' } | { t: 'revive' };

/** Lifetime-of-run counters, summed over finished stages plus the stage in progress. */
export interface RunStats {
  lines: number;
  colorClears: number;
  ticks: number;
  bestChain: number;
}

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
  /** Perks owned from tick 0 (a character's kit). Part of the replay options, not the log. */
  startPerks?: readonly PerkId[];
  /** Continues allowed per run (default 1) and rerolls allowed per perk offer (default 1). */
  maxRevives?: number;
  maxRerolls?: number;
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
  /** Continues used this run (the app gates the first behind a rewarded ad; core allows `maxRevives`). */
  revivesUsed = 0;
  readonly maxRevives: number;
  /** Rerolls used on the current offer (reset on each new offer). */
  rerollsUsed = 0;
  readonly maxRerolls: number;
  private banked: RunStats = { lines: 0, colorClears: 0, ticks: 0, bestChain: 0 };

  constructor(seed: number, opts: RunOptions = {}) {
    this.seed = seed >>> 0;
    this.stages = opts.stages ?? STAGES;
    this.baseConfig = { ...RUN_BASE_CONFIG, ...opts.baseConfig };
    this.offerSize = opts.offerSize ?? 3;
    this.maxRevives = opts.maxRevives ?? 1;
    this.maxRerolls = opts.maxRerolls ?? 1;
    this.rng = new Rng(this.seed);
    this.stageSeeds = this.stages.map(() => this.rng.nextU32());
    for (const id of opts.startPerks ?? []) if (!this.perks.includes(id)) this.perks.push(id);
    this.game = this.startStage(0);
  }

  get stage(): StageDef { return this.stages[this.stageIndex]!; }
  get goal(): StageGoal { return this.stage.goal; }
  /** Banked + in-progress score (a cleared stage's score is banked, not double counted). */
  get score(): number { return this.bankedScore + (this.stageBanked ? 0 : this.game.score); }

  /** Run-wide counters (finished stages + current stage). */
  stats(): RunStats {
    const g = this.game, b = this.banked;
    if (this.stageBanked) return { ...b };
    return {
      lines: b.lines + g.linesCleared,
      colorClears: b.colorClears + g.colorClears,
      ticks: b.ticks + g.tick,
      bestChain: Math.max(b.bestChain, g.bestChain),
    };
  }

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

  /** Decline the offer and move on without a perk. Logged for replay. */
  skip(): void {
    if (this.phase !== 'pick') return;
    this.log.push({ stage: this.stageIndex, tick: this.game.tick, action: { t: 'skip' } });
    this.advance();
  }

  get canReroll(): boolean { return this.phase === 'pick' && this.rerollsUsed < this.maxRerolls; }
  get canRevive(): boolean { return this.phase === 'lost' && this.revivesUsed < this.maxRevives; }

  /** Replace the current offer with a fresh draw from the run Rng. Logged for replay. */
  reroll(): boolean {
    if (!this.canReroll) return false;
    this.log.push({ stage: this.stageIndex, tick: this.game.tick, action: { t: 'reroll' } });
    return this.rerollInternal();
  }

  /** Continue the lost stage: top half of the board cleared, piece respawned. Logged for replay. */
  revive(): boolean {
    if (!this.canRevive) return false;
    this.log.push({ stage: this.stageIndex, tick: this.game.tick, action: { t: 'revive' } });
    return this.reviveInternal();
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
    if (a.t === 'skip') { if (this.phase === 'pick') this.advance(); return; }
    if (a.t === 'reroll') { if (this.canReroll) this.rerollInternal(); return; }
    if (a.t === 'revive') { if (this.canRevive) this.reviveInternal(); return; }
    if (this.phase !== 'stage') return;
    this.game.apply(a);
    this.check();
  }

  private rerollInternal(): boolean {
    this.rerollsUsed++;
    this.offer = this.makeOffer(this.offer);
    return true;
  }

  private reviveInternal(): boolean {
    this.revivesUsed++;
    if (!this.game.revive()) return false;
    this.phase = 'stage';
    return true;
  }

  private pickInternal(index: number): void {
    const id = this.offer[index];
    if (this.phase !== 'pick' || !id) return;
    this.perks.push(id);
    this.advance();
  }

  /** Leave the pick phase and start the next stage. */
  private advance(): void {
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
    this.banked = this.stats();
    this.stageBanked = true;
    if (this.stageIndex === this.stages.length - 1) { this.phase = 'won'; return; }
    this.rerollsUsed = 0;
    this.offer = this.makeOffer();
    if (this.offer.length === 0) { this.advance(); return; } // nothing left to offer
    this.phase = 'pick';
  }

  /**
   * Up to `offerSize` distinct perks not yet owned, chosen by partial Fisher–Yates on the run Rng.
   * `avoid` (the offer being rerolled) is excluded while enough other perks remain.
   */
  private makeOffer(avoid: readonly PerkId[] = []): PerkId[] {
    const unowned = PERKS.map((p) => p.id).filter((id) => !this.perks.includes(id));
    const fresh = unowned.filter((id) => !avoid.includes(id));
    const pool = fresh.length >= Math.min(this.offerSize, unowned.length) ? fresh : unowned;
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
    if (r.phase === 'won') break;
    if (r.phase === 'lost') {
      // Only a logged revive at this stage/tick continues the run.
      const nxt = log[i];
      if (!nxt || nxt.action.t !== 'revive' || nxt.stage !== r.stageIndex || nxt.tick !== r.game.tick) break;
      continue;
    }
    if (r.phase === 'pick') {
      // A pick must be the next logged action; otherwise the log is exhausted or corrupt and replay ends here.
      const nxt = log[i];
      if (!nxt || (nxt.action.t !== 'pick' && nxt.action.t !== 'skip' && nxt.action.t !== 'reroll') || nxt.stage !== r.stageIndex) break;
      continue;
    }
    const done = i >= log.length && (r.stageIndex > endStage || (r.stageIndex === endStage && r.game.tick >= endTick));
    if (done) break;
    r.step();
  }
  return r;
}
