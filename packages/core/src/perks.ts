import type { Cell, Config, Rules } from './types';

/**
 * Perk catalog (spec §4). A perk is a pure transform of the stage Config, so stacking order never
 * matters for determinism: Run applies them in pick order, and replay does the same.
 */
export type PerkId =
  | 'red_x2'         // 점수: 빨강 색 소거 점수 ×2
  | 'chain_bonus'    // 점수: 3연쇄 이상 시 배율 +1
  | 'hold'           // 조작: 홀드 슬롯
  | 'preview3'       // 조작: 다음 블록 3개 미리보기
  | 'slow_fall'      // 조작: 낙하 속도 -20%
  | 'blue_min3'      // 룰: 파랑은 3개만 연결돼도 소거
  | 'line_gray';     // 룰: 줄 소거 시 회색 블록 1개 추가 제거

export type PerkCategory = 'score' | 'control' | 'rule';

export interface PerkDef {
  id: PerkId;
  category: PerkCategory;
  /** Display key for i18n; the game app maps it to text. */
  nameKey: string;
  apply(cfg: Config): Config;
}

const RED: Cell = 1;
const BLUE: Cell = 3;

const rules = (cfg: Config, patch: Partial<Rules>): Config => ({ ...cfg, rules: { ...cfg.rules, ...patch } });

export const PERKS: readonly PerkDef[] = [
  { id: 'red_x2', category: 'score', nameKey: 'perk.red_x2',
    apply: (c) => rules(c, { colorWeightTenths: { ...c.rules.colorWeightTenths, [RED]: 20 } }) },
  { id: 'chain_bonus', category: 'score', nameKey: 'perk.chain_bonus',
    apply: (c) => rules(c, { chainBonusFrom: 3 }) },
  { id: 'hold', category: 'control', nameKey: 'perk.hold',
    apply: (c) => ({ ...c, holdEnabled: true }) },
  { id: 'preview3', category: 'control', nameKey: 'perk.preview3',
    apply: (c) => ({ ...c, previewCount: Math.max(c.previewCount, 3) }) },
  { id: 'slow_fall', category: 'control', nameKey: 'perk.slow_fall',
    // -20% speed == +25% ticks per cell, integer: 48 → 60
    apply: (c) => ({ ...c, gravityTicks: Math.floor(c.gravityTicks * 5 / 4) }) },
  { id: 'blue_min3', category: 'rule', nameKey: 'perk.blue_min3',
    apply: (c) => rules(c, { minGroupByColor: { ...c.rules.minGroupByColor, [BLUE]: 3 } }) },
  { id: 'line_gray', category: 'rule', nameKey: 'perk.line_gray',
    apply: (c) => rules(c, { lineExtraGray: c.rules.lineExtraGray + 1 }) },
];

export const PERK_BY_ID: Readonly<Record<PerkId, PerkDef>> = Object.fromEntries(PERKS.map((p) => [p.id, p])) as Record<PerkId, PerkDef>;

/** Fold a list of perks (in pick order) over a base config. */
export function applyPerks(base: Config, perks: readonly PerkId[]): Config {
  let cfg = base;
  for (const id of perks) cfg = PERK_BY_ID[id].apply(cfg);
  return cfg;
}
