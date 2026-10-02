/**
 * AdMob and RevenueCat identifiers. All of these are public client-side ids (they ship in the app);
 * secrets never live here. Until real ids are issued the AdMob ones are Google's official test units,
 * which serve test ads on any device and never earn.
 *
 * Replace: AdMob → apps.admob.com → 앱 → 앱 설정 (app id) / 광고 단위 (unit ids).
 *          RevenueCat → app.revenuecat.com → Project → API keys (public SDK keys per platform).
 */
export const ADMOB = {
  android: {
    appId: 'ca-app-pub-3940256099942544~3347511713',          // test
    rewardedReroll: 'ca-app-pub-3940256099942544/5224354917',  // test rewarded
    rewardedContinue: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',    // test interstitial
  },
  ios: {
    appId: 'ca-app-pub-3940256099942544~1458002511',          // test
    rewardedReroll: 'ca-app-pub-3940256099942544/1712485313',  // test rewarded
    rewardedContinue: 'ca-app-pub-3940256099942544/1712485313',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',    // test interstitial
  },
  /** True while the unit ids above are Google's test units. Flip to false when real ids land. */
  testing: true,
} as const;

export const REVENUECAT = {
  /** Public SDK keys (appl_… / goog_…). Empty string disables purchases on that platform. */
  iosKey: '',
  androidKey: '',
  /** Entitlement id configured in RevenueCat; the product `remove_ads` grants it on both stores. */
  entitlement: 'remove_ads',
  productId: 'remove_ads',
} as const;

/** Interstitial cadence: none during the first `freeRuns`, then one every `every` finished runs. */
export const INTERSTITIAL = { freeRuns: 3, every: 2 } as const;
