# AdMob 광고 단위 ID

실제 단위 ID는 **리포에 없다.** `apps/game/vite.config.ts`가 빌드할 때 리포 밖의 파일을 읽어
`import.meta.env.VITE_ADMOB_*`로 번들에 박아 넣는다. 따로 넘길 환경변수는 없다.

```sh
pnpm build                                  # vite build → 파일을 읽어 실제 단위로 번들
pnpm --filter @chainwell/mobile sync        # 위 빌드 + cap sync
cd apps/mobile && fastlane android internal # 모든 lane이 sync_web으로 같은 빌드를 돈다
```

## 왜 뺐나

단위 ID는 비밀번호가 아니라 **식별자**여서 그 자체로는 아무 권한이 없다.
문제는 방향이다. 남이 이 ID를 자기 앱에 박아 넣고 봇으로 노출·클릭을 만들면,
그 무효 트래픽은 **우리 게시자 계정에 쌓이고 정지되는 것도 우리 계정이다.**
게시자 계정(`pub-6329038356545416`)은 Sudoku 등 Pink Spider 앱 전부가 같이 쓴다.

앱 바이너리를 뜯으면 어차피 나오지만, 그건 한 명씩 하는 일이고
공개 리포는 크롤러가 긁어간다. 난이도의 차이가 크다.

**AdMob 앱 ID**(`ca-app-pub-…~…`, 물결표)는 뺄 수 없다.
`strings.xml`과 `Info.plist`에 있어야 SDK가 초기화된다.
앱 ID만으로는 광고를 요청할 수 없어서 위험도가 다르다.
RevenueCat의 `appl_`/`goog_` 키는 클라이언트에 실리도록 설계된 공개 SDK 키라 그대로 둔다.

## 파일

```
~/.pink-spider/secrets/chainwell/ad-units.env    (600)
```

Play 서비스 계정 키와 같은 곳이다([release.md](release.md) §2).
`git clean -xdf`에 날아가지 않고 실수로 커밋할 수도 없다.

```properties
VITE_ADMOB_ANDROID_REWARDED_REROLL=ca-app-pub-<publisher>/<id>
VITE_ADMOB_ANDROID_REWARDED_CONTINUE=...
VITE_ADMOB_ANDROID_INTERSTITIAL=...
VITE_ADMOB_IOS_REWARDED_REROLL=...
VITE_ADMOB_IOS_REWARDED_CONTINUE=...
VITE_ADMOB_IOS_INTERSTITIAL=...
```

`$CHAINWELL_SECRETS/ad-units.env`가 있으면 그쪽을 먼저 쓴다(CI용).
잃어버렸으면 AdMob 콘솔 → 앱 → 광고 단위에서 다시 읽으면 된다.
**계정은 `developer.ygpark@gmail.com`이다**(Play Console과 다르다).
단위 이름은 플랫폼마다 rewarded_reroll, rewarded_continue, interstitial_run_end.

## 없을 때 어떻게 되나

- `pnpm dev`(개발 서버): 파일을 읽지 않고 항상 Google 샘플 단위를 쓴다. dev 빌드는
  `ADMOB.testing`이 켜져 있어 어차피 테스트 광고만 요청하고, `--host`로 LAN에 열어도 샐 것이 없다.
- `pnpm build`(프로덕션): **빌드가 실패한다.** `cap sync`와 fastlane lane 전부가 이 빌드를
  거치므로, 수익이 0인 테스트 단위가 스토어에 올라가는 일은 여기서 막힌다.
- 일부러 실제 ID 없이 빌드하려면(새 클론, CI): `CHAINWELL_AD_UNITS=test pnpm build`.
  경고가 찍히고 샘플 단위로 번들된다. 올리지 말 것.
- 파일은 있는데 키가 빠졌으면 모드와 무관하게 실패한다.

## 자기 클릭 주의

프로덕션 빌드를 실기기에 올리면 실제 광고가 나온다. **직접 탭하지 말 것.**
무효 트래픽으로 계정이 정지될 수 있다. 광고 플로우 확인은 `pnpm dev`를 LAN으로 폰에서 열거나,
dev 빌드를 올려서 한다. 실제 단위로 기기를 테스트 기기로 등록하려면
`AdMob.initialize({ testingDevices: [...] })`를 쓰면 되는데 아직 배선되어 있지 않다.
