# @chainwell/mobile — Capacitor 8 wrapper

웹 빌드(`apps/game/dist`)를 그대로 감싸는 네이티브 셸. 게임 코드는 건드리지 않는다.

## 최초 1회
```
pnpm install
pnpm --filter @chainwell/mobile add:android   # android/ 생성 (gitignore됨)
pnpm --filter @chainwell/mobile add:ios       # ios/ 생성 — Xcode 필요
```

## 개발 루프
```
pnpm --filter @chainwell/mobile sync          # 웹 빌드 + 네이티브 프로젝트에 복사
pnpm --filter @chainwell/mobile open:android  # Android Studio
pnpm --filter @chainwell/mobile open:ios      # Xcode
```

## 다음 단계 (미착수)
- AdMob: `@capacitor-community/admob` — UMP 동의 → 보상형/전면
- 결제: RevenueCat (`@revenuecat/purchases-capacitor`)
- 분석: Firebase (Analytics, Crashlytics, Remote Config)
