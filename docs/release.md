# 스토어 업로드 — Play 내부 테스트 · TestFlight

Chainwell 빌드를 테스터에게 보내는 절차와 그에 필요한 계정·비밀·콘솔 상태를 한곳에 정리한다.
명령은 전부 `apps/mobile`에서 실행한다. 환경변수는 필요 없다(비밀은 홈 디렉터리의 고정 경로에서 읽음).

```sh
cd apps/mobile
fastlane ios beta           # TestFlight — 아카이브(수동 서명) → 업로드, 빌드 번호 자동 +1
fastlane android internal   # Play 내부 테스트 — AAB(versionCode 자동 +1) → 트랙 업로드
```

두 lane 모두 먼저 `pnpm --filter @chainwell/game build` + `cap sync`를 돌리므로 웹 코드만 바꿨어도 그대로 쓴다.

## 1. 앱 식별 정보

| | Android | iOS |
|---|---|---|
| 패키지 / 번들 ID | `io.pinkspider.chainwell` | `io.pinkspider.chainwell` |
| 스토어 앱 이름 | Chainwell | Chainwell: Chain Block Puzzle ("Chainwell" 단독은 타 개발자 선점) |
| 콘솔 | Play Console 조직 Pink Spider (계정 8732421573193870105), 앱 4973758453803994746 | App Store Connect 팀 Z53YTTRR32, 앱 6817754795 |
| 테스트 트랙 | 내부 테스트 (트랙 4700760323471381942) | TestFlight 내부 그룹 "Pink Spider Internal" (자동 배포 켬) |
| 테스터 참여 | https://play.google.com/apps/internaltest/4700760323471381942 · 이메일 목록 "Sudoku Daily 테스터" | 그룹 멤버 4명(ASC 사용자)에게 TestFlight 초대 발송됨 |
| 마케팅 버전 | `android/app/build.gradle` → `versionName` | `ios/App/App.xcodeproj` → `MARKETING_VERSION` |
| 빌드 번호 | `versionCode`, `-PversionCode=N`으로 주입 (Fastlane이 트랙 최신 +1) | `CURRENT_PROJECT_VERSION`, Fastlane이 TestFlight 최신 +1 |

## 2. 자격 증명 인벤토리

전부 **저장소 밖**에 있다. 이 표가 비밀의 위치 지도다. 새 맥으로 옮길 때 이 파일들을 함께 옮긴다.

| 용도 | 무엇 | 위치 | 만료 / 메모 |
|---|---|---|---|
| Android 업로드 서명 | 키스토어 `upload` 별칭 + 비밀번호 | `apps/mobile/android/upload-keystore.jks`, `apps/mobile/android/keystore.properties` (gitignore) | 2054년. 잃으면 같은 패키지로 다시 못 올림 → 비밀번호 관리자에 백업 필수 |
| Play API 업로드 | 조직 공용 서비스 계정 `play-publisher@pink-spider-play.iam.gserviceaccount.com` (GCP `pink-spider-play`) | `~/.pink-spider/secrets/play-publisher-key.json` (Sudoku와 같은 키) | Chainwell에 "앱 정보 보기 + 테스트 트랙 출시"만 부여(2026-10-01). 프로덕션 권한 없음 |
| iOS 배포 서명 | 인증서 "Apple Distribution: Yungoo Park (Z53YTTRR32)" (ID 59P6HSNBS2) | 로그인 키체인 (개인키 포함) | **2027-09-30 만료** → 그 전에 §6으로 재발급 |
| iOS 프로비저닝 | App Store 프로파일 "Chainwell App Store" | `~/Library/Developer/Xcode/UserData/Provisioning Profiles/6c90071e-….mobileprovision` | 인증서와 같은 날 만료. 인증서 바꾸면 프로파일도 다시 |
| App Store Connect API | 팀 키 ASC-API-KEY (키 ID 8FZTAA3T77, 앱 관리), Issuer `fe387068-11c4-467b-b275-c7ba5d54a813` | `~/.appstoreconnect/private_keys/AuthKey_8FZTAA3T77.p8` | 만료 없음. .p8은 재다운로드 불가 |

Fastfile이 읽는 기본 경로를 바꾸려면 환경변수로 덮는다: `PLAY_JSON_KEY`, `ASC_KEY_ID` / `ASC_ISSUER_ID` / `ASC_KEY_PATH`, `FASTLANE_TEAM_ID`, `IOS_PROFILE`.

## 3. 릴리스 절차

1. **버전 결정.** 마케팅 버전을 올릴 때만 `versionName`과 `MARKETING_VERSION`을 둘 다 수정하고 커밋. 빌드 번호는 손대지 않는다(Fastlane이 올림).
2. **업로드.** 위 두 명령. iOS는 아카이브 약 1분 + 업로드 1~10분. Android는 2분 안팎.
   - iOS 로그 끝에 `GET BUILD UPLOAD STATE … 500`이 떠도 App Store Connect에 빌드가 보이면 성공이다(Apple 상태 조회 서버 문제).
3. **Android 반영 확인.** Play Console → 테스트 → 내부 테스트 → 출시 탭에 새 버전 코드. 자동 업로드는 아티팩트와 트랙만 갱신한다. 출시 노트를 남기려면 콘솔에서 버전을 열어 적는다.
4. **iOS 처리 대기.** App Store Connect → TestFlight → iOS 빌드가 "처리 중" → "제출 준비 완료"(5~15분). Info.plist에 `ITSAppUsesNonExemptEncryption=false`가 있어 수출 규정 질문은 뜨지 않는다. 내부 그룹은 자동 배포라 처리 완료 즉시 테스터에게 열린다.
5. **커밋.** Fastlane이 올린 `CURRENT_PROJECT_VERSION`을 커밋해 둔다(`git add apps/mobile/ios && git commit`).

### 테스터 추가
- **Android**: Play Console → 내부 테스트 → 테스터 탭 → 이메일 목록 체크 또는 "이메일 목록 만들기" → 저장. 테스터는 참여 링크로 수락 후 Play 스토어에서 설치. 최대 100명.
- **iOS 내부(팀 구성원)**: ASC 사용자여야 함. TestFlight → 내부 테스팅 → Pink Spider Internal → 테스터 → `+`. 즉시 설치 가능, 최대 100명.
- **iOS 외부(팀 외 인원)**: TestFlight → 외부 테스팅 → 그룹 생성 → 이메일로 초대 또는 공개 링크. **첫 빌드는 Apple 베타 심사(보통 1일)** 를 거친다. 최대 10,000명.

## 4. 수동 경로 (Fastlane이 안 될 때)

- **Android AAB만 만들기**: `fastlane android aab version_code:N` → `android/app/build/outputs/bundle/release/app-release.aab`를 Play Console → 내부 테스트 → 새 버전 만들기에 드래그. 12MB라 브라우저 자동화의 10MB 한도를 넘으므로 손으로 끌어야 한다.
- **iOS IPA만 만들기 → Transporter**: `fastlane ios ipa` → `build/Chainwell.ipa`를 Transporter 앱(Mac App Store)에 드래그. Transporter는 같은 Apple ID로 로그인.
- **Xcode에서 직접**: `pnpm --filter @chainwell/mobile open:ios` → Product → Archive → Distribute App. 이 경로만 Xcode에 Apple ID 로그인이 필요하다(Fastlane 수동 서명 경로는 불필요).

## 5. 겪은 문제와 해법

| 증상 | 원인 | 해법 |
|---|---|---|
| `No Account for Team` / `No profiles for 'io.pinkspider.chainwell'` | 자동 서명은 Xcode 로그인이 있어야 프로파일을 만듦 | 배포 인증서·프로파일을 developer.apple.com에서 직접 발급해 설치하고 **수동 서명**(`CODE_SIGN_STYLE=Manual`)으로 아카이브 — Fastfile의 `MANUAL_SIGNING` |
| App Store Connect에서 앱 이름 "Chainwell" 거부 | 이름은 전 세계 유일, 타 개발자 선점 | 부제를 붙여 "Chainwell: Chain Block Puzzle"(29자)로 등록. 이름은 이후 변경 가능 |
| TestFlight 빌드가 "수출 규정 관련 문서 누락" | 암호화 사용 여부 미응답 | 빌드 1은 콘솔에서 "해당 없음" 선택. 이후 `Info.plist`에 `ITSAppUsesNonExemptEncryption=false` |
| 업로드 전에 만든 TestFlight 그룹에 빌드가 안 들어감 | 자동 배포는 그룹 생성 이후 빌드에만 적용 | 그룹 → 빌드 탭에서 수동 추가(수출 규정 답변 후 자동 배포가 동작함) |
| Play 서비스 계정 API `The caller does not have permission` | Play Console 사용자 권한에 해당 앱이 없음 | 사용자 및 권한 → 서비스 계정 → 애플리케이션 추가 → 권한 체크 → 변경사항 저장 → **확인 대화상자 "예"까지** 눌러야 저장됨 |
| Fastlane `sh`에서 `cap sync`가 package.json을 못 찾음 | `sh`는 `fastlane/` 폴더에서 실행됨 | `sh("cd .. && …")` |
| Capacitor iOS에 Podfile이 없음 | Capacitor 8은 SPM 사용 | 정상. `.xcworkspace`가 아니라 `.xcodeproj`를 빌드 대상으로 |
| ASC 버전 페이지 iPhone 슬롯이 6.5"(1284×2778)만 받음 | 6.9" 1290×2796은 미디어 관리에서만 | `sips -z 2778 1284`로 리사이즈한 `marketing/out/ios65/` 사용. 여러 장을 한 번에 올리면 순서가 섞이므로 한 장씩 업로드 |
| Play Console에 "API 액세스" 메뉴가 없음 | 2025년 이후 제거됨 | 서비스 계정은 Cloud Console에서 만들고, Play Console → 사용자 및 권한에 이메일을 사용자로 추가 |

## 6. 재구축 절차

### iOS 배포 인증서·프로파일 (만료 또는 새 맥)
```sh
openssl req -new -newkey rsa:2048 -nodes -keyout dist.key -out Chainwell.certSigningRequest \
  -subj "/emailAddress=developer.ygpark@gmail.com/CN=Pink Spider/C=KR"
```
1. developer.apple.com → Certificates → `+` → Apple Distribution → CSR 업로드 → Download(`distribution.cer`).
2. `security import distribution.cer -k ~/Library/Keychains/login.keychain-db` 와 `security import dist.key -k … -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/xcodebuild`.
3. Profiles → `+` → App Store Connect → App ID `Chainwell` → 새 인증서 선택 → 이름 `Chainwell App Store` → Download.
4. `security cms -D -i <file> | plutil -extract UUID raw -o - -` 로 UUID를 얻어 `~/Library/Developer/Xcode/UserData/Provisioning Profiles/<UUID>.mobileprovision`으로 복사.
5. `security find-identity -v -p codesigning`에 "Apple Distribution: … (Z53YTTRR32)"가 보이면 끝. 프로파일 이름이 달라졌으면 `IOS_PROFILE`로 넘기거나 Fastfile 기본값 수정.

### Play 서비스 계정 (키 유출·분실)
Sudoku 프로젝트 문서가 원본이다: `sudoku-app/docs/play-api-automation.md`. 요약: Cloud Console(`pink-spider-play`) → IAM → 서비스 계정 → 키 → 새 JSON 키 → `~/.pink-spider/secrets/play-publisher-key.json`으로 저장(Sudoku 경로에도 같은 키). 기존 키는 `gcloud iam service-accounts keys delete`로 폐기. Play Console 권한은 그대로 유효하다(계정 단위).

### Android 업로드 키 (분실)
Play 앱 서명을 쓰므로 Google에 **업로드 키 재설정**을 요청할 수 있다(Play Console → 설정 → 앱 무결성 → 업로드 키 재설정 요청). 새 키는 `keytool -genkeypair -keystore upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`으로 만들고 `keystore.properties`를 갱신.

## 6b. 수익화 계정 (AdMob · RevenueCat)

| | |
|---|---|
| AdMob 계정 | developer.ygpark@gmail.com (`?authuser=developer.ygpark@gmail.com`로 콘솔 전환) — 게시자 ID `pub-6329038356545416` |
| AdMob 앱 | Android `~2674013726`, iOS `~5120962095`. 광고 단위 3종씩: rewarded_reroll, rewarded_continue, interstitial_run_end. ID는 `apps/game/src/monetize.config.ts` |
| AdMob 스토어 연결 | 앱이 스토어에 게시된 뒤 AdMob → 앱 → 앱 설정 → "앱 스토어 추가"를 눌러야 광고 게재가 승인됨(며칠 소요). 그전까지는 제한된 광고만 |
| RevenueCat | ceo@pink-spider.io 계정, 프로젝트 **Chainwell** (`a73b5075`). App Store 앱 `appfcdbcede26`(IAP 키 THVD7K4SCM 공유, 팀 Z53YTTRR32), 엔타이틀먼트 `remove_ads`, 상품 `remove_ads`(비소모성) |
| RevenueCat Play 앱 | 서비스 계정 JSON(`~/.pink-spider/secrets/play-publisher-key.json`) 업로드 필요. Play Console → 사용자 및 권한에서 그 서비스 계정에 **재무 데이터 보기 + 주문 관리** 권한 추가 |
| 공개 SDK 키 | `monetize.config.ts` `REVENUECAT.iosKey` / `androidKey` (공개 키라 커밋 OK) |

## 7. 릴리스 기록

| 날짜 | 버전 | Android | iOS | 내용 |
|---|---|---|---|---|
| 2026-09-30 | 0.1.0 | 내부 테스트 v1 (수동 업로드) | TestFlight 빌드 1 | 코어 룰, 로그라이크 런, 퍽, 캐릭터, 설정 — 첫 테스터 빌드 |
| 2026-10-01 | 0.1.0 | 내부 테스트 v2 (수동 업로드) | TestFlight 빌드 2 | 효과음, 설정 화면, Figma 시안 반영. 이후부터 Android도 자동 업로드 |
| 2026-10-01 | 1.0.0 | 프로덕션 초안 versionCode 3 (`fastlane android production`) | TestFlight 빌드 3 (`fastlane ios beta`) | 다국어(ko/en), BGM, DPR 렌더링. 스토어 심사 제출 준비 완료 — 양쪽 콘솔 모두 제출 버튼 직전에서 멈춤 (store-listing.md 등록 상태 참조) |
| 2026-10-02 | 1.0.0 | 프로덕션 초안 versionCode 4 (`fastlane android production`; 출시 노트 광고 문구 갱신, 이전 번들 3의 AD_ID 오류는 "권한 없이 출시"로 무시). **Play 거부됨**: 설치 아이콘 ≠ 스토어 아이콘 | TestFlight 빌드 4 (`fastlane ios beta`) | AdMob 보상형(리롤·이어하기)+런 종료 전면 광고, RevenueCat 비소모성 `chainwell_remove_ads`. ASC 버전 1.0.0에 빌드 4 연결, 개인정보 라벨·연령 등급 갱신. Fastfile: 수동 서명을 App 타깃에만 적용(RevenueCat SPM이 프로필 지정 거부) |
| 2026-10-02 | 1.0.0 | 프로덕션 versionCode 5 — 적응형 런처 아이콘 재생성(`pnpm assets`; 옛 foreground/흰 배경이 거부 원인), 재제출 | (변경 없음, 빌드 4 심사 대기) | Play 거부 대응. ASC는 빌드 4 + IAP로 심사 대기 중 |
