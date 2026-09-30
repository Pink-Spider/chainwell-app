import type { PerkId } from './perks';

/**
 * Characters (spec §10: names/abilities are placeholders pending balance). A character is a set of
 * starting perks; everything else about the run is identical, so replays only need the perk list.
 */
export type CharacterId = 'diver' | 'stacker' | 'painter' | 'breaker' | 'chainer';

/** Lifetime stats the unlock rules read. Persisted by the app, never by core. */
export interface PlayerStats {
  runsPlayed: number;
  runsWon: number;
  /** Highest stage index reached (0-based), across all runs. */
  bestStage: number;
}

export type UnlockRule =
  | { t: 'free' }
  | { t: 'runs'; count: number }
  | { t: 'stage'; reach: number }
  | { t: 'wins'; count: number };

export interface CharacterDef {
  id: CharacterId;
  nameKey: string;
  startPerks: PerkId[];
  unlock: UnlockRule;
}

export const CHARACTERS: readonly CharacterDef[] = [
  { id: 'diver',   nameKey: 'char.diver',   startPerks: ['slow_fall'],   unlock: { t: 'free' } },
  { id: 'stacker', nameKey: 'char.stacker', startPerks: ['hold'],        unlock: { t: 'runs', count: 1 } },
  { id: 'painter', nameKey: 'char.painter', startPerks: ['blue_min3'],   unlock: { t: 'stage', reach: 2 } },
  { id: 'breaker', nameKey: 'char.breaker', startPerks: ['line_gray'],   unlock: { t: 'stage', reach: 4 } },
  { id: 'chainer', nameKey: 'char.chainer', startPerks: ['chain_bonus'], unlock: { t: 'wins', count: 1 } },
];

export const CHARACTER_BY_ID: Readonly<Record<CharacterId, CharacterDef>> =
  Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<CharacterId, CharacterDef>;

export const EMPTY_STATS: PlayerStats = { runsPlayed: 0, runsWon: 0, bestStage: 0 };

export function isUnlocked(c: CharacterDef, s: PlayerStats): boolean {
  const u = c.unlock;
  switch (u.t) {
    case 'free': return true;
    case 'runs': return s.runsPlayed >= u.count;
    case 'stage': return s.bestStage >= u.reach;
    case 'wins': return s.runsWon >= u.count;
  }
}
