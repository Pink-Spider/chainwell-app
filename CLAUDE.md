# Chainwell — 작업 컨텍스트

줄 소거 + 색 소거 하이브리드 낙하 블록 퍼즐 로그라이크. iOS/Android 글로벌 출시 목표, 1–2인 인디.
기획서(Notion): https://app.notion.com/p/3eb8c64c55438113870dd80dcb4b6867
디자인(Figma): https://www.figma.com/design/DjG3AKO1p5BJDUXBMJDyax

## 구조
- `packages/core` — 순수 TS 게임 로직. DOM/Phaser 의존 금지. `pnpm test`로 vitest + fast-check.
- `apps/game` — Phaser 4 + Vite 웹 프로토타입. `pnpm dev` → :5173. 씬: `BootScene`(아이콘) → `HomeScene` → `CharacterScene` / `SettingsScene` / `PlayScene`(Run 소유·HUD·입력), 오버레이 `PerkScene`·`PauseScene`·`ResultScene`. UI 텍스트는 `perkText.ts`, 컴포넌트 헬퍼는 `ui.ts`, 저장은 `save.ts`(localStorage, 키 `chainwell.save.v1`; 설정은 `settings()`/`setSetting()`으로 캐시 경유). dev에서 `window.cw`로 Phaser 인스턴스 접근 가능.
- 설정 중 실제 동작: 효과음, 햅틱, 색 기호 표시, 손 떼면 드롭, 조작 힌트, 드래그 감도(low 1.0 / normal 0.8 / high 0.6칸). 저장만 되는 것: 음악(트랙 없음), 큰 글씨. 비활성: 색상 팔레트·언어·개인정보·구매 복원.
- 오디오(`audio.ts`): 효과음 15종을 에셋 없이 부트 시 합성해 `cache.audio`에 AudioBuffer로 등록, Phaser WebAudio로 재생. 연쇄음은 `rate`로 반음씩 상승. 재생 지점: `PlayScene.act`(입력, 실제로 움직였을 때만), `drainEvents`(lock/clear, 연쇄는 110ms 간격으로 스태거), `checkPhase`(stageClear/gameOver), `ui.button`(tap), `PerkScene.confirm`(perk). `music()`은 스텁. 실기 지연이 크면 `@capacitor-community/native-audio`로 교체 검토.
- `apps/mobile` — Capacitor 8 래퍼. `android/`·`ios/`는 커밋됨(SPM 기반, Podfile 없음). 아이콘은 `resources/mark.mjs` → `pnpm assets`. 배포 lane은 `fastlane/Fastfile`(`ios beta`, `android internal|aab`), 절차는 `apps/mobile/README.md`. 서명 비밀(`upload-keystore.jks`, `keystore.properties`)은 gitignore.
- `apps/server` (2차) — 랭킹·리플레이 검증.

## core 불변 규칙
- 정수 연산만. 부동소수점 금지 (기기·서버 간 결정론).
- `Math.random` 금지. `Rng`(mulberry32)만 사용.
- 60Hz 고정 틱. 모든 입력은 `(tick, action)`으로 `Game.log`에 기록되어 `replay()`로 재현되어야 함.
- 규칙을 바꾸면 `test/` 속성 테스트가 통과해야 함. 특히 "같은 시드+입력 → 같은 결과".

## 로그라이크 메타 (core `run.ts` / `perks.ts` / `stages.ts`)
- `Run(seed)` = 스테이지 9개(8 + 보스). 스테이지마다 새 `Game`, 시드는 런 Rng에서 파생. 목표 3종: 점수 / 회색 N개 제거 / 생존 틱.
- 스테이지 사이 퍽 3택1 (`Run.pick`). 퍽은 `Config` 순수 변환이라 순서대로 fold. 홀드·3개 미리보기는 퍽으로만 해금(런 기본은 off).
- 퍽이 바꾸는 소거·점수 규칙은 `Rules`(types.ts)에 모여 `resolveBoard(b, rules)`로 주입. 보스: 주기적 회색 줄 상승 + 런 Rng로 뽑은 색 1개 봉인(`randomSealCount`).
- 퍽 선택까지 `Run.log`에 기록 → `replayRun(seed, log)`로 런 전체 재현. 스테이지 커브(`STAGES`)는 초기 추정치, 플레이테스트로 튜닝.
- 캐릭터(`characters.ts`) = 시작 퍽 세트 + 해금 조건(`isUnlocked(def, stats)`). `Run` 옵션 `startPerks`로 전달되며 로그가 아니라 옵션이므로 리플레이 시 같이 넘겨야 함. 이름·능력은 자리표시자(기획서 §10).
- 미구현: 특수 블록 퍽(폭탄·무지개), 보스 7열 보드, 퍽 풀 확장 해금.

## 핵심 룰 (기획서 3장 요약)
- 보드 8×16, 블록 I3/L3 (칸별 색), 색 4종(후반 5종) + 회색 방해 블록(6).
- 줄 소거(8칸 가득) + 색 소거(같은 색 4개 이상 상하좌우 연결) 동시 판정 → 제거 → 셀 단위 중력 → 반복. 루프마다 chain+1.
- 점수 = 소거 칸 × 10 × 2^(chain-1). 같은 단계에 줄+색 동시면 ×1.5.
- 회색은 줄 소거에 포함되거나 인접 색 소거 시 제거.
- 연쇄는 색 소거가 받침을 빼앗을 때 생김 (줄 소거는 상대 위치를 바꾸지 않음).

## 디자인 토큰 / 시안
- `apps/game/src/theme.ts`가 Figma 변수(색·반지름·간격·폰트)와 1:1. 색 바꿀 땐 둘 다.
- 화면 6종(홈·캐릭터·인게임·퍽 선택·일시정지·런 종료)은 Figma Screens 페이지 프레임 좌표를 그대로 옮김. 각 씬 파일 상단 주석에 노드 id. 아이콘은 Figma에서 내보낸 `apps/game/public/icons/*.svg`를 `BootScene`이 4배로 래스터라이즈(`ic-<name>`).
- `ui.ts`가 Figma 컴포넌트에 대응: `caps`(HUD/Label Caps) `val`(Value/*) `kr`(KR/Caption) `panel` `block`(bevel) `glyph`(색약 마크) `tag`(Tag) `button`(Button Primary/Secondary) `iconButton` `stageTrack` `perkGlyph`.
- Phaser 4 주의: `fillRoundedRect` 반지름이 높이/2보다 크면 깨짐(pill은 h/2). 나중에 만든 GameObject가 위에 그려지므로 프레임마다 그리는 Graphics는 정적 패널 뒤에 만들거나 `bringToTop`.
- 시안에 있으나 미구현(비활성 표시): 상점·사운드 토글·리롤(광고)·이어하기(광고)·공유·리플레이 보기·데일리 챌린지.
- Phaser `ScenePlugin.launch`는 자기 자신 키를 무시함. 오버레이가 자신을 다시 띄우려면 다른 씬의 플러그인(`scene.get('play').scene.launch`)을 써야 함.

## 조작 (프로토타입 기준, 실기 튜닝 필요)
상대 드래그 0.8칸/열, 탭 회전, 아래 플릭(60px·250ms) 하드드롭, 천천히 아래 드래그 소프트드롭, 우하단 탭 홀드.

## 다음 할 일
1. 테스터 배포: Play Console 앱 생성 후 `fastlane android aab` 결과 수동 업로드 → 서비스 계정으로 `android internal`. iOS는 Xcode에 Apple ID 로그인 + 팀 선택(R399G3B7MG / Z53YTTRR32) + ASC API 키 → `fastlane ios beta`. 실기 피드백으로 `PlayScene.ts` 조작 상수 조정
2. 배경음악(홈·런·보스 루프, CC0 또는 제작) + 실기에서 효과음 지연 측정. 스테이지 커브(`STAGES`)·캐릭터 능력 플레이테스트 튜닝
3. AdMob(@capacitor-community/admob) + RevenueCat + 로컬 저장(Preferences)에 영구 해금

## 커밋
Conventional Commits. 작업 단위로 작게.
