# 스토어 에셋 생성

`shots/` — 게임 화면 원본(1170×2532, `?dpr=3`로 띄운 Phaser 캔버스 스냅샷). `out/` — 콘솔에 올리는 결과물.

| 결과물 | 크기 | 용도 |
|---|---|---|
| `out/ios/<lang>-N-<scene>.png` | 1290×2796 | App Store Connect iPhone 6.9" |
| `out/play/<lang>-N-<scene>.png` | 1080×1920 | Play 휴대전화 |
| `out/feature-graphic.png` | 1024×500 | Play 피처 그래픽 |
| `out/icon-512.png` | 512×512 | Play 아이콘 |

장면 5개: chain(3연쇄 팝업) · perk · boss · character · home. 캡션은 `frame.html`의 쿼리로 넘긴다.

## 절차 (Playwright)
1. `pnpm dev` 로 :5173 실행.
2. 게임 화면: 뷰포트 1170×2532, `http://localhost:5173/?dpr=3` 접속. localStorage `chainwell.save.v1`의 `settings.lang`을 `en`/`ko`로 바꾸고 새로고침. `window.cw`로 씬을 띄우고 보드를 채운 뒤(`run.stage.goal.target`을 먼저 키워야 퍽 화면으로 넘어가지 않음) 캔버스를 `page.screenshot({clip})` 또는 `cw.renderer.snapshot()`으로 저장 → `shots/<lang>-<scene>.png`.
3. 프레임: 뷰포트를 결과 크기로 맞추고 `/marketing/frame.html?w=&h=&lang=&img=/marketing/shots/<lang>-<scene>.png&title=&sub=` 을 열어 `page.screenshot`.
4. 피처 그래픽: 뷰포트 1024×500, `/marketing/feature.html`.
5. 아이콘 512: `sharp(resources/icon-only.png).resize(512)`.

캡션(en/ko)은 `docs/store-listing.md`의 스크린샷 표를 따른다. 이 폴더의 HTML은 앱 번들에 포함되지 않는다(`public/` 밖).
