import type { PerkId, PerkCategory, StageGoal } from '@chainwell/core';

/** UI strings for perks (core only carries ids). Swap for i18next later. */
export const PERK_TEXT: Record<PerkId, { name: string; desc: string }> = {
  red_x2:      { name: '붉은 심지',   desc: '빨강 색 소거 점수 ×2' },
  chain_bonus: { name: '연쇄 증폭',   desc: '3연쇄부터 배율 +1' },
  hold:        { name: '홀드 슬롯',   desc: '블록 하나를 보관했다 꺼낼 수 있음' },
  preview3:    { name: '먼 시야',     desc: '다음 블록 3개 미리보기' },
  slow_fall:   { name: '느린 우물',   desc: '낙하 속도 −20%' },
  blue_min3:   { name: '파랑 약결합', desc: '파랑은 3개만 연결돼도 소거' },
  line_gray:   { name: '바닥 청소',   desc: '줄 소거마다 회색 1개 추가 제거' },
};

export const CATEGORY_TEXT: Record<PerkCategory, string> = { score: '점수', control: '조작', rule: '룰' };

export function goalText(g: StageGoal): string {
  switch (g.t) {
    case 'score': return `점수 ${g.target.toLocaleString()}`;
    case 'gray': return `회색 ${g.target}개 제거`;
    case 'survive': return `${Math.ceil(g.ticks / 60)}초 생존`;
  }
}
