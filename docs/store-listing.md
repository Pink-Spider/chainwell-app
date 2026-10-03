# 스토어 등록 정보 (App Store Connect + Google Play Console)

콘솔에 붙여넣을 문구와 설문 답변. 앱 동작이 바뀌면 여기부터 고치고 개인정보처리방침과 맞춘다.
Sudoku 문서(`sudoku-app/docs/store-listing.md`)의 형식과 교훈을 따른다. 심사 제출 절차는 [release.md](./release.md).

## 공통

| | |
|---|---|
| 번들 ID / 패키지 | `io.pinkspider.chainwell` |
| 버전 | 1.0.0 (심사용 첫 빌드) |
| 개인정보처리방침 URL | https://pink-spider.github.io/chainwell-privacy/ (저장소 `Pink-Spider/chainwell-privacy`, 원본 `docs/privacy/index.html`) |
| 지원 URL | 위와 동일 (전용 페이지 생기면 교체) |
| 마케팅 URL / 개발자 웹사이트 | https://pink-spider.github.io |
| 지원 이메일 | Play 스토어 연락처 developer.ygpark@gmail.com / ASC 심사 연락처·IARC contact@pink-spider.io |
| 카테고리 | Play: 게임 → 퍼즐 / ASC: 게임, 퍼즐·보드 |
| 저작권 | 2026 Pink Spider |
| 가격 | 무료. 인앱결제 1종 `remove_ads`(비소모성, USD 2.99 티어, 전면광고 제거). **광고 있음**: AdMob 보상형(리롤·이어하기, 선택) + 런 종료 전면광고 |
| 기기 | iPhone 전용(`TARGETED_DEVICE_FAMILY = 1`), Android 휴대전화(태블릿 스크린샷 생략 가능 여부는 콘솔 안내 확인) |

## 에셋

| 파일 | 크기 | 어디에 |
|---|---|---|
| `apps/game/marketing/out/ios/<lang>-*.png` | 1290×2796 | ASC iPhone 6.9" (미디어 관리에서만 업로드 가능) |
| `apps/game/marketing/out/ios65/<lang>-*.png` | 1284×2778 | ASC iPhone 6.5" — 버전 페이지 기본 슬롯. `sips -z 2778 1284`로 리사이즈. **실제 등록에 사용** |
| `apps/game/marketing/out/play/<lang>-*.png` | 1080×1920 | Play 휴대전화 |
| `apps/game/marketing/out/feature-graphic.png` | 1024×500 | Play 피처 그래픽 |
| `apps/game/marketing/out/icon-512.png` | 512×512 | Play 아이콘 |

생성 절차: `apps/game/marketing/README.md`. 게임 화면은 Phaser 캔버스 스냅샷(DPR 3), 캡션 프레임은 `marketing/frame.html`을 Playwright로 찍는다.

| 장면 | en 캡션 | ko 캡션 |
|---|---|---|
| chain | Lines and colors clear together / TWO CLEARS, ONE BOARD | 줄과 색이 함께 터진다 / 한 보드, 두 가지 소거 |
| perk | Pick a perk between stages / EVERY RUN BUILDS DIFFERENTLY | 스테이지 사이 퍽을 고른다 / 매 런이 다른 빌드 |
| boss | 8 stages, then the boss / DIVE DOWN THE WELL | 8 스테이지, 그리고 보스 / 우물 아래로 |
| character | 5 characters, 5 starting kits / UNLOCKED BY PLAYING | 캐릭터 5종, 다른 시작 퍽 / 플레이로 해금 |
| home | Chain Block Puzzle Roguelike / CHAINWELL | 체인 블록 퍼즐 로그라이크 / CHAINWELL |

## App Store Connect

**이름 (30자)** `Chainwell: Chain Block Puzzle`
**부제 (30자)** `Line + color clears, roguelike`

**키워드 (100자)**
```
chain,block,puzzle,roguelike,tetris,puyo,match,color,combo,offline,arcade,falling,perk,run
```

**프로모션 텍스트 (170자)**
```
Clear lines, clear colors, and chain them together. Pick a perk between stages, pick a character per run, and dive for the boss at the bottom of the well.
```

**설명**
```
Chainwell is a falling-block puzzle with two ways to clear and a roguelike run on top.

TWO CLEARS, ONE BOARD
Fill a row of 8 to clear a line. Connect 4 of the same color to clear a group. Both happen at once, and when colors clear they pull the stack apart so the next clear falls into place. That is a chain, and chains are where the points are.

A RUN DOWN THE WELL
Eight stages and a boss, ten to fifteen minutes a run. Each stage asks for something different: a score, a number of gray blocks removed, or just surviving. The boss floods the well from below and seals a color.

PERKS SHAPE EVERY RUN
After each stage, pick one of three perks. Red clears score double. Blue clears with three. Preview three pieces ahead. Every run builds differently.

FIVE CHARACTERS
Each character starts with a different perk. Unlock them by playing. Nothing is sold.

MADE FOR ONE HAND
Drag anywhere to move, tap to rotate, flick down to drop. Haptics on every chain. Color symbols for color-blind play.

FREE AND OFFLINE
No account, no ads, no internet needed. Your progress stays on your device.
```

**심사 노트**
```
No login required. Single-player, fully offline. Settings > Language switches between English and Korean. Audio is synthesized at runtime (no media files).
```

**연령 등급**: 4+. 폭력·성적 콘텐츠·도박 없음, 광고 있음.
**앱 개인정보**: 수집함 — 식별자(기기 ID: 제3자 광고·추적), 사용 데이터(광고 데이터·제품 상호작용: 제3자 광고·분석), 진단(비정상 종료: 분석), 구매(구매 내역: 앱 기능). "사용자 추적" 예 (ATT 프롬프트 있음).
**연령 등급 설문의 "광고"**: 예.
**콘텐츠 권한**: 타사 콘텐츠 없음.
**수출 규정**: `ITSAppUsesNonExemptEncryption=false` (빌드에 포함).

## Google Play Console

**앱 이름 (30자)** `Chainwell: Chain Block Puzzle`

**간단한 설명 (80자)**
```
Clear lines and colors, chain them, pick perks, and dive for the boss.
```
> `new`, `best`, `free` 같은 홍보성 단어는 피한다(Play 경고).

**자세한 설명** — ASC 설명과 동일.

### 앱 콘텐츠 설문 (대시보드 → 앱 설정)

| 항목 | 답 |
|---|---|
| 개인정보처리방침 | 위 URL |
| 앱 액세스 권한 | 모든 기능이 제한 없이 사용 가능 (로그인 없음) |
| 광고 | **광고 있음** (AdMob) |
| 콘텐츠 등급 (IARC) | 카테고리 게임. 폭력·성·약물·도박·사용자 상호작용·위치 공유·개인정보 공유 모두 "아니요" → 전체이용가 예상 |
| 타겟층 및 콘텐츠 | 13세 이상 (아동 대상 아님). 아동 매력 요소 질문도 "아니요" |
| 뉴스 앱 | 아니요 |
| 데이터 보안 | AdMob SDK가 수집: 기기 ID 또는 기타 ID(광고), 앱 상호작용(분석·광고), 진단. 수집 목적 "광고 또는 마케팅", 제3자(Google)와 공유. RevenueCat: 구매 내역(앱 기능). 암호화 전송 예, 삭제 요청 불가(계정 없음) |
| 정부 앱 / 금융 / 건강 | 아니요 |
| 광고 ID | **사용함** (AdMob SDK가 AD_ID 권한 추가) |
| 앱 카테고리 | 게임 → 퍼즐 |
| 연락처 | developer.ygpark@gmail.com, 웹사이트 https://pink-spider.github.io |

### 인앱 상품 (양쪽 동일)
| | |
|---|---|
| 상품 ID | `chainwell_remove_ads` (Apple 팀 내 고유해야 해서 접두어 필요; entitlement는 `remove_ads`) |
| 유형 | 비소모성 (Play: 관리되는 제품 / ASC: Non-Consumable) |
| 이름 | Remove Interstitial Ads / 전면 광고 제거 |
| 설명 | No ads between runs. Reroll and continue ads stay optional. / 런 사이 광고가 사라집니다. 리롤·이어하기 광고는 선택 사항으로 남습니다. |
| 가격 | USD 2.99 티어 (KRW 4,400) |
| RevenueCat | Project Chainwell → Entitlement `remove_ads` ← Products `remove_ads` (App Store + Play Store) → Offering default, package `$rc_lifetime` |

### 프로덕션 출시
- `fastlane android production` → 프로덕션 트랙에 **초안**으로 올라감.
- 프로덕션 → 국가/지역 탭에서 전체 선택 후 저장 (내부 테스트 설정은 상속되지 않음).
- 출시 노트 입력 후 하단 "다음" → 미리보기 및 확인 → "저장"까지 해야 게시 개요의 제출 버튼이 켜진다. 제출 버튼은 사람이 누른다.

## 한국어 현지화

- 이름 `체인웰: 체인 블록 퍼즐`
- 부제 `줄과 색을 터뜨리는 로그라이크`
- 간단한 설명 `줄과 색을 터뜨려 연쇄를 만들고, 퍽을 고르며 보스까지 내려가세요.`
- 키워드 `체인,블록,퍼즐,로그라이크,테트리스,뿌요,색,연쇄,콤보,오프라인,낙하,퍽`
- 프로모션 텍스트 `줄 소거와 색 소거를 한 보드에서. 스테이지 사이 퍽을 고르고, 런마다 캐릭터를 바꿔 우물 바닥의 보스까지 내려가세요.`

```
체인웰은 소거 방식이 두 가지인 낙하 블록 퍼즐에 로그라이크 런을 얹은 게임입니다.

한 보드, 두 가지 소거
가로 8칸을 채우면 줄이 사라집니다. 같은 색 4개를 이으면 색 그룹이 사라집니다. 둘은 동시에 판정되고, 색이 사라지면 쌓인 블록이 서로 다른 거리로 떨어지며 다음 소거를 만듭니다. 그것이 연쇄이고, 점수는 거기서 나옵니다.

우물 아래로 내려가는 런
스테이지 8개와 보스, 한 런에 10~15분. 스테이지마다 요구가 다릅니다. 점수를 내거나, 회색 블록을 치우거나, 버티거나. 보스는 바닥에서 회색 줄을 밀어 올리고 색 하나를 봉인합니다.

런을 바꾸는 퍽
스테이지를 마칠 때마다 셋 중 하나를 고릅니다. 빨강 점수 두 배, 파랑은 셋이면 소거, 다음 블록 셋 미리보기. 같은 런은 없습니다.

캐릭터 5종
시작 퍽이 다른 캐릭터를 플레이로 해금합니다. 판매하지 않습니다.

한 손 조작
아무 데나 드래그해 이동, 탭으로 회전, 아래로 플릭해 드롭. 연쇄마다 햅틱. 색각 보정용 기호 표시.

무료, 오프라인
계정도 광고도 인터넷도 필요 없습니다. 진행 상황은 기기에만 저장됩니다.
```

## 등록 상태

| 날짜 | 내용 |
|---|---|
| 2026-10-01 | 문구·에셋·설문 답변 준비. 콘솔 입력은 release.md의 체크리스트대로 진행, **심사 제출 직전에서 멈춤** |
| 2026-10-01 | **Play Console 입력 완료** — 기본 스토어 등록정보 en-US + ko-KR (이름·설명·아이콘·피처 그래픽·휴대전화/7"/10" 태블릿 스크린샷 5장씩), 개인정보처리방침 URL, 로그인 세부정보(제한 없음), 광고 없음, 타겟층 13+, 데이터 보안(수집 안 함), 광고 ID 미사용, 정부/금융/건강 해당 없음, 카테고리 게임→퍼즐, 연락처, 프로덕션 국가 178개 전체, 출시 노트(en/ko). **남은 것: 콘텐츠 등급(IARC)** — 약관 동의 체크박스는 사람이 눌러야 함. 완료 후 게시 개요 → "검토를 위해 전송"은 사람이 누른다 |
| 2026-10-01 | **App Store Connect 입력 완료** — 앱 정보(부제, 게임→퍼즐·보드, 콘텐츠 권한 없음, 연령 등급 4+ / 172개 지역, 한국어 이름·부제), 가격 무료·175개 지역, 앱 개인정보 "수집 안 함" 게시, 버전 1.0.0(프로모션·설명·키워드·URL·저작권, 6.5" 스크린샷 en/ko 5장씩, 빌드 1.0.0 (3), 심사 연락처 contact@pink-spider.io + 전화, 메모). **"심사에 추가"는 누르지 않음.** 대한민국 등급은 Apple 자체 분류라 RCN 불필요 |

| 2026-10-02 | Play: 콘텐츠 등급(IARC) 완료(사람이 입력). 프로덕션 초안을 "미리보기 및 확인"까지 진행해 저장 → 게시 개요에 **"검토를 위해 변경사항 13개 제출" 활성화, 누르지 않음**. 남은 경고는 R8 가독화 파일 없음(정보성) |
| 2026-10-02 | **광고·결제 추가 후 재준비.** ASC: IAP `chainwell_remove_ads`(비소모성, $2.99, 175개 지역, en/ko 이름·설명, 심사 스크린샷·메모) "제출 준비 중" — 첫 비소모성 IAP라 버전과 함께 제출됨(심사 제출 시 항목으로 추가). 앱 개인정보 "수집함" 게시(기기 ID·광고 데이터 = 추적, 대략적 위치·구입 내역·제품 상호작용·충돌·실적·기타 진단 = 미연결). 연령 등급 광고 → 예(브라질 A12). 버전 1.0.0에 빌드 4 선택, 심사 메모에 광고·IAP 안내. Play: 광고 있음, 광고 ID 사용(광고·마케팅), 데이터 보안 7종(구매 내역=앱 기능·선택, 나머지 AdMob 6종=수집+공유·광고/애널리틱스). 개인정보처리방침 페이지 AdMob/RevenueCat 반영해 게시. RevenueCat Play 앱 연결(goog_ 키 → `monetize.config.ts`), Android versionCode 4 프로덕션 초안 저장, Play 일회성 상품 `chainwell_remove_ads`(구매 옵션 `buy`, USD 2.99 기준 → KRW 4,000) 활성화. **발견: 게시 개요에 이전 13개 변경(빌드 3, 광고 없음)이 이미 "검토 중" — 누군가 먼저 제출함. 빌드 4 출시는 별도 변경 1개로 미제출 상태.** |
| 2026-10-02 | **ASC 심사 제출 완료(16:34).** 사용자가 먼저 버전만 제출한 건(16:18, 1개 항목)은 IAP가 빠져 취소하고, IAP를 심사에 추가한 뒤 버전 1.0.0(빌드 4) + `chainwell_remove_ads` 2개 항목으로 재제출. 상태 "심사 대기 중". Play "검토를 위해 변경사항 1개 제출"은 사람이 결정 |
| 2026-10-02 | **Play: 빌드 4가 "검토 중"으로 확인(16:38).** 게시 개요에서 미제출 섹션이 사라지고 프로덕션 1.0.0(버전 코드 4)이 검토 중, 버전 코드 3 출시는 "다른 버전으로 대체됨". 광고 선언·데이터 보안 변경도 같은 검토 묶음에 포함됨. 양쪽 스토어 모두 심사 대기 상태 |
| 2026-10-02 | **Play 거부 → 수정 재제출(17:15).** 거부 사유 "혼동을 야기하는 주장: 설치된 아이콘이 스토어 아이콘과 다름". 원인은 Android 적응형 아이콘의 `ic_launcher_foreground.png`가 9/12자 옛 "X" 플레이스홀더였고 배경색이 흰색이었던 것(`ic_launcher.png`만 새 마크). `pnpm assets`로 재생성(배경 레이어 PNG + night 스플래시 추가, 배경색 #0E0F16), versionCode 5 업로드, 출시 노트 입력, AD_ID 경고(이전 번들 3) 무시 처리 후 저장, 13개 변경 재제출 |
| 2026-10-02 | **Play 게시 완료(21:16).** versionCode 5 승인, "Google Play에 제공됨". 정책 상태 "발견된 문제 없음". 스토어 페이지 https://play.google.com/store/apps/details?id=io.pinkspider.chainwell 공개(광고 포함·인앱 구매 표시). 14:03 거부 메일은 빌드 4 건으로 이미 해결됨. 다음: AdMob 앱 2개에 스토어 등록정보 연결 → 승인 |

### ASC 입력 체크리스트 (완료 — 재입력 시 참고)
1. 앱 정보: 부제, 카테고리 게임/퍼즐·보드, 콘텐츠 권한 없음, 연령 등급 4+.
2. 가격 및 사용 가능 여부: 무료, 전체 국가.
3. 앱 개인정보: "데이터를 수집하지 않음" → 게시.
4. 버전 1.0.0: 프로모션 텍스트, 설명, 키워드, 지원 URL(개인정보 URL), 마케팅 URL, 저작권 `2026 Pink Spider`, 6.9" 스크린샷(`marketing/out/ios/en-*.png`), 빌드 1.0.0 (3) 선택, 심사 연락처·노트.
5. 한국어 현지화 추가 후 위 문구의 ko 버전 입력 + `ko-*.png`.
6. **"심사 제출"은 누르지 않는다.**

### Play 콘텐츠 등급(IARC) 답변
이메일 `developer.ygpark@gmail.com`, 카테고리 **게임**. 폭력(만화적/사실적)·공포·성적 콘텐츠·노출·욕설·약물·도박(실제/모의)·사용자 상호작용·위치 공유·개인정보 공유·디지털 구매 **전부 "아니요"** → 전체이용가 / Everyone 예상.
