# Chainwell

Chain block puzzle roguelike — 줄 소거 + 색 소거 하이브리드 낙하 블록 퍼즐.

```
packages/core   순수 TS 게임 로직 (결정론, DOM/Phaser 의존 없음)
apps/game       Phaser 4 렌더링 · 입력 (Vite)  — 웹 프로토타입
apps/mobile     Capacitor 8 래퍼 (2단계)
apps/server     랭킹 · 리플레이 검증 (2차)
```

## 시작

```
pnpm install
pnpm test        # core 결정론/규칙 테스트
pnpm dev         # 웹 프로토타입 (http://localhost:5173)
```

## core 설계 규칙
- 정수 연산만 사용 (부동소수점 금지)
- 시드 RNG 직접 구현, `Math.random` 금지
- 고정 틱 + 입력 로그 `(tick, action)` → 리플레이 재현 가능
