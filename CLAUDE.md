# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Chainwell — 작업 컨텍스트

줄 소거 + 색 소거 하이브리드 낙하 블록 퍼즐 로그라이크. iOS/Android 글로벌 출시(1.0.0 — Google Play 게시됨, App Store 심사 중), 1–2인 인디.
기획서(Notion): https://app.notion.com/p/3eb8c64c55438113870dd80dcb4b6867
디자인(Figma): https://www.figma.com/design/DjG3AKO1p5BJDUXBMJDyax
라이선스 GPL-3.0-or-later(`LICENSE`), 이름·아이콘은 브랜드로 제외. 번들 의존성을 추가하면 `THIRD_PARTY_NOTICES.md` 갱신.
룰·core API 예시는 `README.md`, 스토어 업로드·자격 증명·릴리스 기록은 `docs/release.md`, 스토어 등록정보는 `docs/store-listing.md`.

## 명령어
pnpm 모노레포(Node 22, pnpm 9). 린터·포매터 없음 — `pnpm typecheck`가 유일한 정적 검사(strict + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`).

```sh
pnpm install
pnpm test                                                   # core: vitest + fast-check (현재 40개)
pnpm --filter @chainwell/core test -- test/run.test.ts      # 파일 하나
pnpm --filter @chainwell/core test -- -t "run determinism"  # describe/it 이름으로 필터
pnpm --filter @chainwell/core test:watch
pnpm typecheck                                              # 전 패키지 tsc --noEmit
pnpm dev                                                    # :5173, --host라 폰에서 LAN 접속 가능. 데스크톱 확인은 ?dpr=3
pnpm build                                                  # game만 빌드됨(core는 build 스크립트 없음)

pnpm --filter @chainwell/mobile sync                        # 웹 빌드 + cap sync
pnpm --filter @chainwell/mobile open:ios | open:android | run:android
pnpm --filter @chainwell/mobile assets                      # 아이콘·스플래시 재생성 (resources/mark.mjs → @capacitor/assets)
cd apps/mobile && fastlane ios beta                         # TestFlight, 빌드 번호 자동 +1
cd apps/mobile && fastlane android internal                 # Play 내부 테스트, versionCode 자동
cd apps/mobile && fastlane android production               # Play 프로덕션 초안(롤아웃 없음, 콘솔에서 사람이 제출)
cd apps/mobile && fastlane android aab version_code:N       # AAB만 / fastlane ios ipa → Transporter용
```

- core는 빌드 없이 `main: ./src/index.ts`로 TS 소스를 그대로 export. game이 `workspace:*`로 쓰므로 `pnpm dev` 중 core 수정이 즉시 반영됨.
- 테스트는 `vitest`에서 `describe/it/expect`를 명시적으로 import(글로벌 아님). 결정론 검증은 fast-check 속성 테스트.
- node_modules를 다른 OS에서 옮겨왔으면 네이티브 바이너리가 안 맞음 → `CI=true pnpm install --force`.

## 구조
- `packages/core` — 순수 TS 게임 로직. DOM/Phaser 의존 금지. `board.ts`(소거·중력·점수) `piece.ts` `game.ts`(단일 판, 틱·입력 로그) `run.ts`(런) `perks.ts` `stages.ts` `characters.ts` `rng.ts` `types.ts`(`Rules`·`Config`·`Action`).
- `apps/game` — Phaser 4 + Vite 웹 프로토타입. 씬: `BootScene`(아이콘) → `HomeScene` → `CharacterScene` / `SettingsScene` / `PlayScene`(Run 소유·HUD·입력), 오버레이 `PerkScene`·`PauseScene`·`ResultScene`. UI 텍스트는 `i18n.ts`(ko/en 사전, `t(key)`·`perkName()`·`charName()` 등; 한국어 리터럴을 씬에 직접 쓰지 말 것), 컴포넌트 헬퍼는 `ui.ts`, 저장은 `save.ts`(localStorage, 키 `chainwell.save.v1`; 설정은 `settings()`/`setSetting()`으로 캐시 경유, 런 통계는 `recordRun`). `native.ts`는 Capacitor 플러그인(햅틱·상태 바) 얇은 어댑터로 웹에서는 no-op. `main.ts`는 폰트(Chakra Petch·Noto Sans KR, fontsource 번들) 로딩을 기다린 뒤 Phaser를 띄움. dev에서 `window.cw`로 Phaser 인스턴스 접근 가능.
- 설정 중 실제 동작: 효과음, 음악, 햅틱, 색 기호 표시, 손 떼면 드롭, 조작 힌트, 드래그 감도(low 1.0 / normal 0.8 / high 0.6칸), 언어(시스템/한국어/English, 바꾸면 설정 씬 재시작). 저장만 되는 것: 큰 글씨. 설정의 SHOP 그룹(전면 광고 제거·구매 복원)과 개인정보(UMP 옵션 폼, 해당 지역만)는 `monetize.ts` 경유. 비활성: 색상 팔레트(미리보기만). 설정 목록은 844를 넘으면 드래그/휠 스크롤(`enableScroll`), 버튼·토글은 `ui.isTap`으로 스크롤 중 탭 무시.
- 언어 결정: `settings.lang`이 ko/en이면 그대로, system이면 `navigator.language`가 ko로 시작할 때만 한국어, 나머지는 영어. 기존 저장은 `lang: 'ko'`로 남아 있을 수 있음(이전 기본값).
- 오디오(`audio.ts`): 효과음 15종을 에셋 없이 부트 시 합성해 `cache.audio`에 AudioBuffer로 등록, Phaser WebAudio로 재생. 연쇄음은 `rate`로 반음씩 상승. 재생 지점: `PlayScene.act`(입력, 실제로 움직였을 때만), `drainEvents`(lock/clear, 연쇄는 110ms 간격으로 스태거), `checkPhase`(stageClear/gameOver), `ui.button`(tap), `PerkScene.confirm`(perk). BGM도 제너러티브: `music('home'|'run'|'boss')`가 Web Audio 오실레이터를 50ms 룩어헤드로 시퀀싱(드론 + 아르페지오 + 베이스), 무드 전환은 1초 크로스페이드, `intensity`(스테이지 깊이)로 런 템포 상승, `musicAccent(chain)`은 한 마디 장조 색. 음악 토글은 매 틱 마스터 게인에 반영. 실기 지연이 크면 `@capacitor-community/native-audio`로 교체 검토.
- 수익화(`monetize.ts` + `monetize.config.ts`): AdMob(`@capacitor-community/admob`) 보상형 광고 2곳(퍽 리롤 `run.reroll()`, 런 종료 이어하기 `run.revive()` — 둘 다 core에 로그되어 리플레이됨, 퍽당 리롤 1회·런당 이어하기 1회), 런 종료 전면광고(`INTERSTITIAL` 첫 3런 제외·2런마다, 결과 화면을 떠날 때). RevenueCat(`@revenuecat/purchases-capacitor`) 비소모성 `chainwell_remove_ads` = entitlement `remove_ads` → `save.adsRemoved` 캐시, 전면광고만 제거(보상형 유지). 웹(`Capacitor.isNativePlatform()` false)에서는 전부 성공으로 시뮬레이션. ID는 실제 운영 ID가 들어가 있고 `testing: import.meta.env.DEV`라 dev 빌드만 Google 테스트 광고를 받음 — 프로덕션 빌드에서 자기 광고를 클릭하지 말 것. 앱 ID는 `monetize.config.ts`, Android `strings.xml admob_app_id`, iOS `Info.plist GADApplicationIdentifier` 세 곳을 같이 바꿀 것. 런 기록(`recordRun`)은 결과 화면을 떠날 때 하므로 이어하기 후 중복 집계되지 않음.
- `apps/mobile` — Capacitor 8 래퍼(appId `io.pinkspider.chainwell`, webDir `../game/dist`). `android/`·`ios/`는 커밋됨(SPM 기반, Podfile 없음). 아이콘은 `resources/mark.mjs` → `pnpm assets`. 배포 lane은 `fastlane/Fastfile`. `apps/mobile/README.md` 하단 "다음 단계" 목록은 AdMob·RevenueCat 구현 이전 상태라 오래됨.
- `apps/server` (2차, 디렉터리 없음) — 랭킹·리플레이 검증.

## 버전·릴리스
- 마케팅 버전은 `apps/mobile/android/app/build.gradle`의 `versionName`과 `ios/App/App.xcodeproj/project.pbxproj`의 `MARKETING_VERSION`(2곳) 둘 다 수정. 빌드 번호(iOS `CURRENT_PROJECT_VERSION`, Android versionCode)는 Fastlane이 올리므로 손대지 않고, iOS 업로드 뒤 바뀐 pbxproj를 커밋. `package.json`의 `version`은 스토어와 무관(0.1.0 그대로).
- 빌드를 올린 뒤 `docs/release.md` §7 릴리스 기록 표에 한 줄 추가.
- 비밀은 레포 밖: ASC 키 `~/.appstoreconnect`, Play 서비스 계정 `~/.pink-spider/secrets`, Android 서명은 `apps/mobile/android/keystore.properties`·`upload-keystore.jks`(gitignore). `docs/admob-ids.local.txt`도 gitignore. 레포에 있는 AdMob/RevenueCat 키는 공개 클라이언트 ID.

## core 불변 규칙
- 정수 연산만. 부동소수점 금지 (기기·서버 간 결정론). 배율 같은 것은 "10분의 1 단위 정수"(`scoreTenths`)로.
- `Math.random` 금지. `Rng`(mulberry32)만 사용. 시드는 `hashSeed('문자열')`.
- 60Hz 고정 틱(`TICKS_PER_SEC`). 모든 입력은 `(tick, action)`으로 `Game.log`에 기록되어 `replay()`로 재현되어야 함.
- 규칙을 바꾸면 `test/` 속성 테스트가 통과해야 함. 특히 "같은 시드+입력 → 같은 결과".

## 로그라이크 메타 (core `run.ts` / `perks.ts` / `stages.ts`)
- `Run(seed)` = 스테이지 9개(8 + 보스). 스테이지마다 새 `Game`, 시드는 런 Rng에서 파생. 목표 3종: 점수 / 회색 N개 제거 / 생존 틱.
- 스테이지 사이 퍽 3택1 (`Run.pick`). 퍽은 `Config` 순수 변환이라 순서대로 fold(`applyPerks`). 홀드·3개 미리보기는 퍽으로만 해금(런 기본은 off).
- 퍽이 바꾸는 소거·점수 규칙은 `Rules`(types.ts)에 모여 `resolveBoard(b, rules)`로 주입. 보스: 주기적 회색 줄 상승 + 런 Rng로 뽑은 색 1개 봉인(`randomSealCount`).
- 퍽 선택·리롤·이어하기까지 `Run.log`에 기록 → `replayRun(seed, log, opts)`로 런 전체 재현. 스테이지 커브(`STAGES`)는 초기 추정치, 플레이테스트로 튜닝.
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
- 화면 7종(홈·캐릭터·설정·인게임·퍽 선택·일시정지·런 종료)은 Figma Screens 페이지 프레임 좌표를 그대로 옮김. 각 씬 파일 상단 주석에 노드 id. 아이콘은 Figma에서 내보낸 `apps/game/public/icons/*.svg`를 `BootScene`이 4배로 래스터라이즈(`ic-<name>`), 목록은 `ui.ICONS`.
- `ui.ts`가 Figma 컴포넌트에 대응: `caps`(HUD/Label Caps) `val`(Value/*) `kr`(KR/Caption) `panel` `block`(bevel) `glyph`(색약 마크) `tag`(Tag) `button`(Button Primary/Secondary) `iconButton` `stageTrack` `perkGlyph` `toggle` `toast` `scrim`.
- 해상도: 캔버스는 `W×DPR`(최대 3배)로 만들고 각 씬이 `fitCamera(this)`로 카메라 줌 = DPR, 논리 좌표는 390×844 유지. 텍스트는 반드시 `resolution: DPR`(ui.ts 헬퍼가 넣음, 직접 `add.text`하면 꼭 추가). 포인터는 `p.x`가 아니라 `p.worldX/worldY`. 데스크톱 확인은 `?dpr=3`.
- Phaser 4 주의: `fillRoundedRect` 반지름이 높이/2보다 크면 깨짐(pill은 h/2). 나중에 만든 GameObject가 위에 그려지므로 프레임마다 그리는 Graphics는 정적 패널 뒤에 만들거나 `bringToTop`.
- 시안에 있으나 미구현(disabled로 표시): 공유·리플레이 보기(결과 화면), 인게임 사운드 버튼, 색상 팔레트(설정), 데일리 챌린지(2차). 상점·리롤·이어하기는 구현됨.
- Phaser `ScenePlugin.launch`는 자기 자신 키를 무시함. 오버레이가 자신을 다시 띄우려면 다른 씬의 플러그인(`scene.get('play').scene.launch`)을 써야 함.

## 조작 (프로토타입 기준, 실기 튜닝 필요)
상대 드래그 0.8칸/열(설정 `dragSensitivity`로 1.0/0.8/0.6), 탭 회전, 아래 플릭(60px·250ms) 하드드롭, 천천히 아래 드래그 소프트드롭, 우하단 탭 홀드. 상수는 `PlayScene.ts` 상단.

## 다음 할 일
1. 실기 피드백으로 `PlayScene.ts` 조작 상수 조정. 빌드 업로드는 `fastlane ios beta` / `fastlane android internal` 한 줄씩(환경변수 불필요)
2. 실기에서 효과음 지연·BGM 음량 밸런스 확인. 스테이지 커브(`STAGES`)·캐릭터 능력 플레이테스트 튜닝
3. 실기 광고·결제 테스트(ID는 이미 운영 값). 로컬 저장을 localStorage → `@capacitor/preferences`로 이전
4. App Store 심사 결과·AdMob app-ads.txt 검증 상태는 `docs/release.md`·`docs/store-listing.md` 등록 상태 참조

## 커밋
Conventional Commits. 쓰이는 scope: `core` `game` `mobile` `android` `ios` `monetize` `release`, 문서는 `docs:`. 작업 단위로 작게.
