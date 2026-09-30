# @chainwell/mobile — Capacitor 8 wrapper

웹 빌드(`apps/game/dist`)를 그대로 감싸는 네이티브 셸. 게임 코드는 건드리지 않는다.
`android/`, `ios/`는 커밋 대상(서명 설정·아이콘·버전이 여기 있음). 비밀은 아래 gitignore 목록만.

## 개발 루프
```sh
pnpm --filter @chainwell/mobile sync          # 웹 빌드 + 네이티브 프로젝트에 복사
pnpm --filter @chainwell/mobile open:ios      # Xcode
pnpm --filter @chainwell/mobile open:android  # Android Studio
```

아이콘·스플래시는 `resources/mark.mjs`가 브랜드 마크에서 PNG를 만들고 `@capacitor/assets`가 각 플랫폼 세트를 생성한다:
```sh
node resources/mark.mjs && npx capacitor-assets generate --ios --android --iconBackgroundColor '#0E0F16' --splashBackgroundColor '#0E0F16'
```

## 테스터 배포 (Play 내부 테스트 · TestFlight)

### 0. 한 번만 준비
| 항목 | 위치 | 비고 |
|---|---|---|
| Android 업로드 키 | `android/upload-keystore.jks` + `android/keystore.properties` | 이미 생성됨, **gitignore**. 잃어버리면 같은 패키지로 다시 못 올림 → 비밀번호 관리자에 백업 |
| Play Console 앱 | play.google.com/console → 앱 만들기, 패키지 `io.pinkspider.chainwell` | Play 앱 서명(Google이 서명 키 관리) 사용 |
| Play 서비스 계정 | Play Console → 설정 → API 액세스 → 서비스 계정 → JSON 키 | `PLAY_JSON_KEY=/path/key.json`. 첫 AAB는 콘솔에서 수동 업로드해야 API가 열림 |
| App Store Connect 앱 | appstoreconnect.apple.com → 앱 → 새로운 앱, 번들 ID `io.pinkspider.chainwell` | 번들 ID는 developer.apple.com → Identifiers에 먼저 등록 |
| ASC API 키 | App Store Connect → 사용자 및 액세스 → 통합 → App Store Connect API (역할: App Manager) | `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_PATH=/path/AuthKey_XXXX.p8` |
| Apple 팀 | `FASTLANE_TEAM_ID=XXXXXXXXXX` | 이 맥에는 개발 인증서가 두 팀(R399G3B7MG, Z53YTTRR32) 있음. 앱을 올릴 팀 하나를 정할 것 |
| Xcode 로그인 | Xcode → Settings → Accounts | 자동 서명이 배포 인증서·프로비저닝을 만들려면 필요 |

### 1. Android → Play 내부 테스트
```sh
cd apps/mobile
fastlane android aab            # 첫 회: 서명된 AAB만 생성 → Play Console 내부 테스트 트랙에 수동 업로드
PLAY_JSON_KEY=~/keys/play.json fastlane android internal   # 이후: 자동 업로드 (versionCode는 트랙에서 읽어 +1)
```
수동 업로드 경로: Play Console → 테스트 → 내부 테스트 → 새 버전 만들기 → `android/app/build/outputs/bundle/release/app-release.aab`.
테스터는 이메일 목록 또는 링크로 초대.

### 2. iOS → TestFlight
```sh
cd apps/mobile
export FASTLANE_TEAM_ID=XXXXXXXXXX ASC_KEY_ID=… ASC_ISSUER_ID=… ASC_KEY_PATH=~/keys/AuthKey_….p8
fastlane ios beta               # 웹 빌드 → 아카이브(자동 서명) → TestFlight 업로드 (빌드 번호 자동 +1)
```
Transporter로 올리려면: `FASTLANE_TEAM_ID=… fastlane ios ipa` → `build/Chainwell.ipa`를 Transporter 앱(Mac App Store)에 드래그. Transporter도 같은 Apple ID로 로그인.
Fastlane 없이: `pnpm --filter @chainwell/mobile open:ios` → Product → Archive → Distribute App → TestFlight 또는 Export(IPA).

Apple ID 로그인·팀 선택 위치:
1. Xcode → Settings(⌘,) → Accounts → `+` → Apple ID. 로그인하면 소속 팀이 목록에 뜬다.
2. `open:ios` → 왼쪽 프로젝트 `App` → TARGETS `App` → Signing & Capabilities → Team 드롭다운에서 선택 (Automatically manage signing 체크 유지). 선택 값이 `DEVELOPMENT_TEAM`으로 프로젝트에 저장된다.
내부 테스터(팀 구성원)는 즉시, 외부 테스터는 첫 빌드에 한해 Apple 심사(보통 1일) 후 배포.

### 버전
- 마케팅 버전 `0.1.0`: `android/app/build.gradle`의 `versionName`, `ios/App/App.xcodeproj`의 `MARKETING_VERSION`. 릴리스마다 둘 다 올릴 것.
- 빌드 번호: Android `versionCode`는 `-PversionCode=N`으로 주입(기본 1), iOS `CURRENT_PROJECT_VERSION`은 fastlane이 TestFlight 최신 +1.

## 다음 단계 (미착수)
- AdMob: `@capacitor-community/admob` — UMP 동의 → 보상형/전면
- 결제: RevenueCat (`@revenuecat/purchases-capacitor`)
- 분석: Firebase (Analytics, Crashlytics, Remote Config)
- 저장: localStorage → `@capacitor/preferences`
