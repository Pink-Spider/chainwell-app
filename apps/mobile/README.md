# @chainwell/mobile — Capacitor 8 wrapper

웹 빌드(`apps/game/dist`)를 그대로 감싸는 네이티브 셸. 게임 코드는 건드리지 않는다.
`android/`, `ios/`는 커밋 대상(서명 설정·아이콘·버전이 여기 있음). iOS는 SPM 기반이라 Podfile이 없다.

**스토어 업로드(TestFlight · Play 내부 테스트), 자격 증명 위치, 트러블슈팅은 [`docs/release.md`](../../docs/release.md).**

## 개발 루프
```sh
pnpm --filter @chainwell/mobile sync          # 웹 빌드 + 네이티브 프로젝트에 복사
pnpm --filter @chainwell/mobile open:ios      # Xcode
pnpm --filter @chainwell/mobile open:android  # Android Studio
pnpm --filter @chainwell/mobile run:android   # 연결된 기기/에뮬레이터에 바로 실행
```

## 아이콘·스플래시
브랜드 마크(2×2 블록)를 `resources/mark.mjs`가 PNG로 렌더링하고 `@capacitor/assets`가 플랫폼별 세트를 만든다.
```sh
pnpm --filter @chainwell/mobile assets
```
`resources/concepts.mjs`는 아이콘 후보 비교 시트를 만든다(A 현재 마크 · B 우물 구도 · C 체인 링크). B는 스토어 피처 그래픽 후보.

## Fastlane lane 요약
| 명령 | 하는 일 |
|---|---|
| `fastlane ios beta` | 웹 빌드 → 아카이브(수동 서명) → TestFlight 업로드, 빌드 번호 자동 +1 |
| `fastlane ios ipa` | 아카이브까지만 → `build/Chainwell.ipa` (Transporter용) |
| `fastlane android internal` | 웹 빌드 → AAB(versionCode 트랙 최신 +1) → Play 내부 테스트 업로드 |
| `fastlane android aab version_code:N` | AAB만 생성 (콘솔 수동 업로드용) |

## 설정 파일
- `capacitor.config.ts` — appId `io.pinkspider.chainwell`, webDir `../game/dist`, 상태 바 오버레이.
- `android/app/build.gradle` — `versionName`, 릴리스 서명(`keystore.properties`가 있을 때만), `-PversionCode`.
- `ios/App/App.xcodeproj` — `MARKETING_VERSION`, `DEVELOPMENT_TEAM=Z53YTTRR32`, 세로 고정, `ITSAppUsesNonExemptEncryption=false`.

## 다음 단계 (미착수)
- AdMob: `@capacitor-community/admob` — UMP 동의 → 보상형/전면
- 결제: RevenueCat (`@revenuecat/purchases-capacitor`)
- 분석: Firebase (Analytics, Crashlytics, Remote Config)
- 저장: localStorage → `@capacitor/preferences`
- 오디오 지연이 크면 `@capacitor-community/native-audio`
