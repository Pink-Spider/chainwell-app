import type { PerkId, PerkCategory, StageGoal, CharacterId, UnlockRule } from '@chainwell/core';

/** UI strings for perks (core only carries ids). Swap for i18next later. */
export const PERK_TEXT: Record<PerkId, { name: string; desc: string; rare: boolean }> = {
  red_x2:      { name: '빨강 소거 ×2', desc: '빨강 색 소거 점수가 2배가 됩니다', rare: true },
  chain_bonus: { name: '연쇄 증폭',    desc: '3연쇄부터 배율이 +1 됩니다', rare: true },
  hold:        { name: '홀드 슬롯',    desc: '블록 하나를 보관했다 꺼낼 수 있습니다', rare: false },
  preview3:    { name: '미리보기 +2',  desc: '다음 블록을 3개까지 미리 봅니다', rare: false },
  slow_fall:   { name: '느린 우물',    desc: '낙하 속도가 20% 느려집니다', rare: false },
  blue_min3:   { name: '파랑 약결합',  desc: '파랑은 3개만 연결돼도 소거됩니다', rare: false },
  line_gray:   { name: '바닥 청소',    desc: '줄 소거마다 회색 블록 1개를 추가로 제거합니다', rare: false },
};

export const CATEGORY_TEXT: Record<PerkCategory, string> = { score: '점수', control: '조작', rule: '룰' };

export function goalLabel(g: StageGoal): string {
  switch (g.t) {
    case 'score': return '점수 달성';
    case 'gray': return '회색 블록 제거';
    case 'survive': return '생존';
  }
}

export const CHARACTER_TEXT: Record<CharacterId, { name: string; tagline: string; letter: string }> = {
  diver:   { name: '다이버',   tagline: '기본 캐릭터 · 균형형', letter: 'D' },
  stacker: { name: '스택커',   tagline: '홀드 특화 · 때를 기다린다', letter: 'S' },
  painter: { name: '페인터',   tagline: '색 소거 특화 · 파랑은 셋이면 충분', letter: 'P' },
  breaker: { name: '브레이커', tagline: '줄 소거 특화 · 회색을 부순다', letter: 'B' },
  chainer: { name: '체이너',   tagline: '연쇄 특화 · 길수록 더 크게', letter: 'C' },
};

export function unlockText(u: UnlockRule): string {
  switch (u.t) {
    case 'free': return '';
    case 'runs': return `런 ${u.count}회 플레이`;
    case 'stage': return `스테이지 ${u.reach + 1} 도달`;
    case 'wins': return `런 ${u.count}회 완주`;
  }
}
