# Chainwell — 작업 컨텍스트

줄 소거 + 색 소거 하이브리드 낙하 블록 퍼즐 로그라이크. iOS/Android 글로벌 출시 목표, 1–2인 인디.
기획서(Notion): https://app.notion.com/p/3eb8c64c55438113870dd80dcb4b6867
디자인(Figma): https://www.figma.com/design/DjG3AKO1p5BJDUXBMJDyax

## 구조
- `packages/core` — 순수 TS 게임 로직. DOM/Phaser 의존 금지. `pnpm test`로 vitest + fast-check.
- `apps/game` — Phaser 4 + Vite 웹 프로토타입. `pnpm dev` → :5173.
- `apps/mobile` (미착수) — Capacitor 8 래퍼. `apps/server` (2차) — 랭킹·리플레이 검증.

## core 불변 규칙
- 정수 연산만. 부동소수점 금지 (기기·서버 간 결정론).
- `Math.random` 금지. `Rng`(mulberry32)만 사용.
- 60Hz 고정 틱. 모든 입력은 `(tick, action)`으로 `Game.log`에 기록되어 `replay()`로 재현되어야 함.
- 규칙을 바꾸면 `test/` 속성 테스트가 통과해야 함. 특히 "같은 시드+입력 → 같은 결과".

## 핵심 룰 (기획서 3장 요약)
- 보드 8×16, 블록 I3/L3 (칸별 색), 색 4종(후반 5종) + 회색 방해 블록(6).
- 줄 소거(8칸 가득) + 색 소거(같은 색 4개 이상 상하좌우 연결) 동시 판정 → 제거 → 셀 단위 중력 → 반복. 루프마다 chain+1.
- 점수 = 소거 칸 × 10 × 2^(chain-1). 같은 단계에 줄+색 동시면 ×1.5.
- 회색은 줄 소거에 포함되거나 인접 색 소거 시 제거.
- 연쇄는 색 소거가 받침을 빼앗을 때 생김 (줄 소거는 상대 위치를 바꾸지 않음).

## 디자인 토큰
`apps/game/src/theme.ts`가 Figma Color 변수와 1:1. 색 바꿀 땐 둘 다.

## 조작 (프로토타입 기준, 실기 튜닝 필요)
상대 드래그 0.8칸/열, 탭 회전, 아래 플릭(60px·250ms) 하드드롭, 천천히 아래 드래그 소프트드롭, 우하단 탭 홀드.

## 다음 할 일
1. 실기(폰)에서 조작 임계값·프레임 검증 → `PlayScene.ts` 상수 조정
2. 사이드 패널 라벨(NEXT/HOLD), 로그라이크 메타(스테이지·퍽) core에 추가
3. Capacitor 래퍼 + AdMob(@capacitor-community/admob) + RevenueCat

## 커밋
Conventional Commits. 작업 단위로 작게.
