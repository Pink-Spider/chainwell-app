/**
 * UI strings in Korean and English. `t(key)` picks the language from settings (system → ko/en).
 * Core stays language-free (ids + nameKeys); everything the player reads goes through here.
 * Two languages and ~90 strings do not justify i18next; swap this module for it if more locales land.
 */
import type { PerkId, PerkCategory, CharacterId, StageGoal, UnlockRule } from '@chainwell/core';
import { settings, type DragSensitivity } from './save';

export type Lang = 'ko' | 'en';
type Pair = { ko: string; en: string };

const S = {
  // home
  'home.play': { ko: '런 시작', en: 'Start Run' },
  'home.character': { ko: '캐릭터', en: 'Character' },
  'home.characterSub': { ko: '{name} · {n} / {total} 해금', en: '{name} · {n} / {total} unlocked' },
  'home.daily': { ko: '데일리 챌린지', en: 'Daily Challenge' },
  'home.dailySub': { ko: '전 세계가 같은 시드로 하루 한 판', en: 'One run a day, same seed worldwide' },
  // character select
  'char.title': { ko: 'CHARACTERS', en: 'CHARACTERS' },
  'char.unlockCondition': { ko: '해금 조건: {cond}', en: 'Unlock: {cond}' },
  'char.startWith': { ko: '{name}로 런 시작', en: 'Start run as {name}' },
  // perk select
  'perk.keep': { ko: '이번 런에서만 유지됩니다', en: 'Lasts for this run only' },
  'perk.reroll': { ko: '리롤', en: 'Reroll' },
  'perk.confirm': { ko: '선택하고 계속', en: 'Pick and continue' },
  'perk.skip': { ko: '퍽 없이 진행', en: 'Continue without a perk' },
  // pause
  'pause.none': { ko: '아직 없음 · 스테이지를 클리어하면 선택', en: 'None yet · pick one after a stage' },
  'pause.resume': { ko: '계속하기', en: 'Resume' },
  'pause.restart': { ko: '다시 시작', en: 'Restart' },
  'pause.settings': { ko: '설정', en: 'Settings' },
  'pause.quit': { ko: '나가기', en: 'Quit' },
  'pause.quitNote': { ko: '나가면 현재 런의 진행이 사라집니다', en: 'Quitting discards the current run' },
  // result
  'result.bossReached': { ko: '보스 도달', en: 'Reached the boss' },
  'result.depth': { ko: '깊이 {d} / {n} 도달 · 보스까지 {left}층', en: 'Depth {d} / {n} · {left} to the boss' },
  'result.cleared': { ko: '우물 바닥에 닿았다', en: 'You reached the bottom of the well' },
  'result.nextUnlock': { ko: '다음 해금: {name}', en: 'Next unlock: {name}' },
  'result.allUnlocked': { ko: '모든 캐릭터 해금', en: 'All characters unlocked' },
  'result.allUnlockedSub': { ko: '다음 해금은 퍽 풀 확장에서', en: 'Perk pool expansions come next' },
  'result.newRun': { ko: '새 런 시작', en: 'New Run' },
  'result.home': { ko: '홈으로', en: 'Home' },
  'result.replay': { ko: '리플레이 보기', en: 'Watch Replay' },
  'result.continue': { ko: '이어하기', en: 'Continue' },
  'result.continueSub': { ko: '광고 보고 1회 · 윗줄을 비웁니다', en: 'Watch an ad · once per run · clears the top half' },
  // ads / purchases
  'ad.loading': { ko: '광고 불러오는 중…', en: 'Loading ad…' },
  'ad.failed': { ko: '지금은 광고를 불러올 수 없습니다', en: 'No ad available right now' },
  'shop.removeAds': { ko: '전면 광고 제거', en: 'Remove interstitial ads' },
  'shop.removeAdsSub': { ko: '런 사이 광고 없음 · 리롤·이어하기 광고는 선택 사항', en: 'No ads between runs · reroll and continue ads stay optional' },
  'shop.purchased': { ko: '구매함', en: 'Purchased' },
  'shop.thanks': { ko: '구매 완료. 전면 광고가 사라집니다', en: 'Purchased. Interstitial ads are gone' },
  'shop.unavailable': { ko: '스토어에 연결할 수 없습니다', en: 'Store unavailable' },
  'shop.error': { ko: '구매를 완료하지 못했습니다', en: 'Purchase did not complete' },
  'shop.restored': { ko: '구매를 복원했습니다', en: 'Purchases restored' },
  'shop.nothingToRestore': { ko: '복원할 구매가 없습니다', en: 'Nothing to restore' },
  // play hints
  'hint.drag': { ko: '드래그 · 이동', en: 'Drag · Move' },
  'hint.rotate': { ko: '탭 · 회전', en: 'Tap · Rotate' },
  'hint.flick': { ko: '플릭 · 드롭', en: 'Flick · Drop' },
  // goals
  'goal.score': { ko: '점수 달성', en: 'Score' },
  'goal.gray': { ko: '회색 블록 제거', en: 'Gray blocks' },
  'goal.survive': { ko: '생존', en: 'Survive' },
  // settings
  'settings.title': { ko: 'SETTINGS', en: 'SETTINGS' },
  'settings.sfx': { ko: '효과음', en: 'Sound effects' },
  'settings.music': { ko: '음악', en: 'Music' },
  'settings.haptics': { ko: '햅틱', en: 'Haptics' },
  'settings.hapticsSub': { ko: '연쇄·착지 진동', en: 'Vibrate on chains and landings' },
  'settings.glyphs': { ko: '색 기호 표시', en: 'Color symbols' },
  'settings.glyphsSub': { ko: '블록에 원·세모·네모·마름모 표시', en: 'Circle, triangle, square, diamond on blocks' },
  'settings.palette': { ko: '색상 팔레트', en: 'Color palette' },
  'settings.bigText': { ko: '큰 글씨', en: 'Large text' },
  'settings.dropOnRelease': { ko: '손 떼면 드롭', en: 'Drop on release' },
  'settings.dropOnReleaseSub': { ko: '드래그 후 손을 떼면 즉시 하드드롭', en: 'Hard drop as soon as a drag ends' },
  'settings.hints': { ko: '조작 힌트 표시', en: 'Gesture hints' },
  'settings.hintsSub': { ko: '터치 패드 위 제스처 안내', en: 'Show gesture labels on the touch pad' },
  'settings.sensitivity': { ko: '드래그 감도', en: 'Drag sensitivity' },
  'settings.language': { ko: '언어', en: 'Language' },
  'settings.privacy': { ko: '개인정보 설정', en: 'Privacy' },
  'settings.privacySub': { ko: '광고 개인화 동의 변경', en: 'Change ad personalization consent' },
  'settings.privacyNA': { ko: '이 지역에서는 해당 없음', en: 'Not required in your region' },
  'settings.restore': { ko: '구매 복원', en: 'Restore purchases' },
  'sens.low': { ko: '낮음', en: 'Low' },
  'sens.normal': { ko: '보통', en: 'Normal' },
  'sens.high': { ko: '높음', en: 'High' },
  'lang.system': { ko: '시스템', en: 'System' },
  'lang.ko': { ko: '한국어', en: '한국어' },
  'lang.en': { ko: 'English', en: 'English' },
  // unlock rules
  'unlock.runs': { ko: '런 {n}회 플레이', en: 'Play {n} run(s)' },
  'unlock.stage': { ko: '스테이지 {n} 도달', en: 'Reach stage {n}' },
  'unlock.wins': { ko: '런 {n}회 완주', en: 'Clear {n} run(s)' },
  // perk categories
  'cat.score': { ko: '점수', en: 'Score' },
  'cat.control': { ko: '조작', en: 'Control' },
  'cat.rule': { ko: '룰', en: 'Rule' },
} satisfies Record<string, Pair>;
export type Key = keyof typeof S;

/** Perk display text. English names are names, not translations. */
const PERKS: Record<PerkId, { name: Pair; desc: Pair; rare: boolean }> = {
  red_x2:      { name: { ko: '빨강 소거 ×2', en: 'Red ×2' },        desc: { ko: '빨강 색 소거 점수가 2배가 됩니다', en: 'Red color clears score double' }, rare: true },
  chain_bonus: { name: { ko: '연쇄 증폭', en: 'Chain Amp' },        desc: { ko: '3연쇄부터 배율이 +1 됩니다', en: '+1 multiplier from the 3rd chain on' }, rare: true },
  hold:        { name: { ko: '홀드 슬롯', en: 'Hold Slot' },        desc: { ko: '블록 하나를 보관했다 꺼낼 수 있습니다', en: 'Stash one piece and swap it back later' }, rare: false },
  preview3:    { name: { ko: '미리보기 +2', en: 'Preview +2' },     desc: { ko: '다음 블록을 3개까지 미리 봅니다', en: 'See the next three pieces' }, rare: false },
  slow_fall:   { name: { ko: '느린 우물', en: 'Slow Well' },        desc: { ko: '낙하 속도가 20% 느려집니다', en: 'Pieces fall 20% slower' }, rare: false },
  blue_min3:   { name: { ko: '파랑 약결합', en: 'Blue Bond' },      desc: { ko: '파랑은 3개만 연결돼도 소거됩니다', en: 'Blue clears with just 3 connected' }, rare: false },
  line_gray:   { name: { ko: '바닥 청소', en: 'Floor Sweep' },      desc: { ko: '줄 소거마다 회색 블록 1개를 추가로 제거합니다', en: 'Each line clear removes one extra gray block' }, rare: false },
};

const CHARS: Record<CharacterId, { name: Pair; tagline: Pair; letter: string }> = {
  diver:   { name: { ko: '다이버', en: 'Diver' },     tagline: { ko: '기본 캐릭터 · 균형형', en: 'Starter · balanced' }, letter: 'D' },
  stacker: { name: { ko: '스택커', en: 'Stacker' },   tagline: { ko: '홀드 특화 · 때를 기다린다', en: 'Hold specialist · waits for the moment' }, letter: 'S' },
  painter: { name: { ko: '페인터', en: 'Painter' },   tagline: { ko: '색 소거 특화 · 파랑은 셋이면 충분', en: 'Color specialist · three blues will do' }, letter: 'P' },
  breaker: { name: { ko: '브레이커', en: 'Breaker' }, tagline: { ko: '줄 소거 특화 · 회색을 부순다', en: 'Line specialist · breaks the gray' }, letter: 'B' },
  chainer: { name: { ko: '체이너', en: 'Chainer' },   tagline: { ko: '연쇄 특화 · 길수록 더 크게', en: 'Chain specialist · longer is louder' }, letter: 'C' },
};

// ── language resolution ──────────────────────────────────────────────────────
let override: Lang | null = null; // dev / tests
export function setLangOverride(l: Lang | null): void { override = l; }

export function lang(): Lang {
  if (override) return override;
  const pref = settings().lang;
  if (pref === 'ko' || pref === 'en') return pref;
  const sys = (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
  return sys.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}
const pick = (p: Pair): string => p[lang()];

/** Translate a key, filling `{name}`-style placeholders. */
export function t(key: Key, params: Record<string, string | number> = {}): string {
  return pick(S[key]).replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

export const perkName = (id: PerkId) => pick(PERKS[id].name);
export const perkDesc = (id: PerkId) => pick(PERKS[id].desc);
export const perkRare = (id: PerkId) => PERKS[id].rare;
export const categoryText = (c: PerkCategory) => t(`cat.${c}` as Key);
export const charName = (id: CharacterId) => pick(CHARS[id].name);
export const charTagline = (id: CharacterId) => pick(CHARS[id].tagline);
export const charLetter = (id: CharacterId) => CHARS[id].letter;
export const sensitivityText = (s: DragSensitivity) => t(`sens.${s}` as Key);

export function goalLabel(g: StageGoal): string {
  return t(g.t === 'score' ? 'goal.score' : g.t === 'gray' ? 'goal.gray' : 'goal.survive');
}
export function unlockText(u: UnlockRule): string {
  switch (u.t) {
    case 'free': return '';
    case 'runs': return t('unlock.runs', { n: u.count });
    case 'stage': return t('unlock.stage', { n: u.reach + 1 });
    case 'wins': return t('unlock.wins', { n: u.count });
  }
}
