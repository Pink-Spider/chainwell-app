# Chainwell

**Chain Block Puzzle Roguelike** — 줄 소거와 색 소거를 섞은 독자 룰의 낙하 블록 퍼즐. 런은 "우물(well) 아래로 내려가는 여정"이고, 스테이지 사이 퍽을 골라 매 판 다른 빌드를 만든다.

- 플랫폼: iOS / Android (Capacitor), 웹은 마케팅 채널
- 팀: 1–2인 인디
- 기획서: [Notion](https://app.notion.com/p/3eb8c64c55438113870dd80dcb4b6867) · 디자인: [Figma](https://www.figma.com/design/DjG3AKO1p5BJDUXBMJDyax)
- 작업 컨텍스트(Claude Code용): [`CLAUDE.md`](./CLAUDE.md)

## 저장소 구조

pnpm 모노레포. 게임 로직과 렌더링을 분리해 같은 core를 클라이언트·서버가 공유한다.

| 경로 | 역할 | 상태 |
|---|---|---|
| `packages/core` | 순수 TS 게임 로직. DOM·Phaser 의존 없음. 결정론 보장 | ✅ 룰 + 로그라이크 메타, 테스트 27개 |
| `apps/game` | Phaser 4 + Vite 웹 프로토타입. 렌더링·입력·연출 | ✅ 단일 `Game` 플레이. `Run` 전환 예정 |
| `apps/mobile` | Capacitor 8 네이티브 셸. `apps/game/dist`를 감쌈 | 🟡 설정만. `cap add` 미실행 |
| `apps/server` | 랭킹·리플레이 검증 (2차) | ⬜ |

## 시작하기

요구: Node 22, pnpm 9 (`packageManager` 필드로 고정).

```sh
pnpm install
pnpm test          # core: vitest + fast-check
pnpm typecheck     # 모든 패키지 tsc --noEmit
pnpm dev           # 웹 프로토타입 → http://localhost:5173 (LAN에도 열림: 폰에서 접속 가능)
pnpm build         # 모든 패키지 빌드
```

> node_modules를 다른 OS에서 옮겨왔다면(예: 샌드박스에서 생성) rollup/esbuild 네이티브 바이너리가 맞지 않는다. `CI=true pnpm install --force`로 재설치.

### 모바일

```sh
pnpm --filter @chainwell/mobile add:android   # android/ 생성 (gitignore)
pnpm --filter @chainwell/mobile add:ios       # ios/ 생성 — Xcode 필요
pnpm --filter @chainwell/mobile sync          # 웹 빌드 + 네이티브 프로젝트에 복사
pnpm --filter @chainwell/mobile open:ios      # 또는 open:android
```

자세한 내용은 [`apps/mobile/README.md`](./apps/mobile/README.md).

## 게임 룰 요약

**보드** 8×16. **블록** 3칸짜리 2종 I3(일자), L3(꺾임), 칸마다 개별 색. 색은 4종(후반 5종) + 회색 방해 블록.

**소거** (착지할 때마다 동시 판정)

| 조건 | 내용 |
|---|---|
| 줄 소거 | 가로 8칸이 채워지면 소거 |
| 색 소거 | 같은 색 4칸 이상이 상하좌우로 연결되면 소거 |
| 회색 | 색 소거로는 안 사라짐. 줄 소거에 포함되거나 인접 칸에서 색 소거가 일어날 때 제거 |

소거 → 셀 단위 중력(칸이 개별로 낙하) → 다시 판정. 한 바퀴마다 chain +1.
연쇄는 **색 소거가 받침을 빼앗아** 블록이 서로 다른 거리로 떨어질 때 생긴다. 줄 소거만으로는 상대 위치가 안 바뀌어 연쇄가 나지 않는다.

**점수** = 소거 칸 × 10 × 2^(chain−1). 같은 단계에 줄+색이 동시에 터지면 ×1.5.

## 로그라이크 메타 (`packages/core/src/run.ts`)

- **런** = 스테이지 8개 + 보스 1개. 스테이지당 1–2분, 런 10–15분.
- **스테이지 목표** 셋 중 하나: 점수 달성 / 회색 N개 제거 / 제한 시간 생존. 스테이지마다 새 보드.
- **퍽** 스테이지 사이 3개 중 1개 선택. 종류는 `perks.ts`:

| 분류 | 퍽 |
|---|---|
| 점수 | 빨강 색 소거 ×2 · 3연쇄 이상 배율 +1 |
| 조작 | 홀드 슬롯 · 다음 블록 3개 미리보기 · 낙하 속도 −20% |
| 룰 | 파랑은 3개만 연결돼도 소거 · 줄 소거 시 회색 1개 추가 제거 |

- **보스** 바닥에서 회색 줄이 주기적으로 올라오고 특정 색이 봉인된다.
- 스테이지 커브는 `stages.ts`의 `STAGES`. 현재 값은 초기 추정치라 플레이테스트로 튜닝.
- 미구현: 특수 블록 퍽(폭탄·무지개), 보스 7열 보드, 영구 해금(퍽 풀 확장·캐릭터).

## core 설계 규칙

이 규칙이 데일리 시드, 비동기 대전 리플레이, 서버 치트 검증을 core 수정 없이 가능하게 한다.

1. **정수 연산만.** 부동소수점 금지. 색별 점수 배율 같은 것도 "10분의 1 단위 정수"로 센다.
2. **`Math.random` 금지.** `Rng`(mulberry32)만 사용. 시드는 `hashSeed('2026-09-30')`처럼 문자열에서 결정론적으로 만든다.
3. **60Hz 고정 틱 + 입력 로그.** 모든 입력은 `(tick, action)`으로 기록되고 `replay()` / `replayRun()`이 같은 결과를 재현해야 한다.
4. **퍽은 `Config → Config` 순수 함수.** 순서대로 접기만 하면 되므로 리플레이가 단순하고, 새 퍽을 추가해도 `Run`은 손댈 게 없다.
5. **규칙을 바꾸면 속성 테스트를 통과해야 한다.** 특히 "같은 시드 + 같은 입력 → 같은 결과".

### core 공개 API

```ts
import { Game, Run, replay, replayRun, hashSeed, STAGES, PERKS } from '@chainwell/core';

// 단일 판
const g = new Game(hashSeed('2026-09-30'), { previewCount: 3 });
g.input({ t: 'rotate' });   // 로그에 기록
g.step();                   // 1틱 전진
g.ghost(); g.previewClear(); g.events;

// 로그라이크 런
const r = new Run(seed);
r.step(); r.input({ t: 'hard' });
if (r.phase === 'pick') r.pick(0);      // r.offer[0] 선택 → 다음 스테이지
r.progress();                           // [현재, 목표]
const again = replayRun(seed, r.log);   // 런 전체 재현
```

## 조작 (세로 화면, 한 손)

| 입력 | 동작 |
|---|---|
| 보드 아래 좌우 드래그 | 칸 단위 이동 (상대 좌표, 0.8칸/열) |
| 탭 | 회전 |
| 아래로 빠르게 플릭 (60px · 250ms) | 하드드롭 |
| 천천히 아래로 드래그 | 소프트드롭 |
| 우하단 버튼 | 홀드 (퍽으로 해금) |

임계값은 `apps/game/src/PlayScene.ts` 상수. 실기 검증 후 조정 필요.

## 디자인 토큰

`apps/game/src/theme.ts`가 Figma Color 변수와 1:1 대응. 색을 바꿀 땐 둘 다 바꾼다.

## 커밋 규칙

Conventional Commits (`feat(core): …`, `fix(game): …`, `docs: …`). 작업 단위로 작게.

## 로드맵

- **1차 출시:** 하이브리드 코어 룰 + 로그라이크 메타 + 드래그 조작 · 광고(보상형·전면) + 비소모성 인앱결제 · Firebase 분석. 자체 서버 없음.
- **2차:** 데일리 시드 챌린지 + 랭킹 · 비동기 대전 · 백엔드(Cloud Run + PostgreSQL).
