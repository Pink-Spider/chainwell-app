/**
 * AdMob and RevenueCat identifiers. All of these are public client-side ids (they ship in the app);
 * secrets never live here. AdMob apps live under developer.ygpark@gmail.com
 * (apps 2674013726 Android / 5120962095 iOS).
 *
 * Replace: AdMob → apps.admob.com → 앱 → 앱 설정 (app id) / 광고 단위 (unit ids).
 *          RevenueCat → app.revenuecat.com → Project → API keys (public SDK keys per platform).
 */
export const ADMOB = {
  android: {
    appId: 'ca-app-pub-6329038356545416~2674013726',
    rewardedReroll: 'ca-app-pub-6329038356545416/1169360361',
    rewardedContinue: 'ca-app-pub-6329038356545416/7579779489',
    interstitial: 'ca-app-pub-6329038356545416/3412380322',
  },
  ios: {
    appId: 'ca-app-pub-6329038356545416~5120962095',
    rewardedReroll: 'ca-app-pub-6329038356545416/3804186006',
    rewardedContinue: 'ca-app-pub-6329038356545416/3616308738',
    interstitial: 'ca-app-pub-6329038356545416/7160053645',
  },
  /**
   * Google test ads instead of live ones. Dev builds use test ads (never click your own live ads);
   * production builds serve live units. Android units may take up to an hour after creation to fill.
   */
  testing: import.meta.env.DEV,
} as const;

export const REVENUECAT = {
  /** Public SDK keys (appl_… / goog_…). Empty string disables purchases on that platform. */
  iosKey: 'appl_yGuwSsLVOZLBoZqQZMIHxpnQFYK',
  androidKey: '',
  /** Entitlement id configured in RevenueCat; the product `remove_ads` grants it on both stores. */
  entitlement: 'remove_ads',
  productId: 'remove_ads',
} as const;

/** Interstitial cadence: none during the first `freeRuns`, then one every `every` finished runs. */
export const INTERSTITIAL = { freeRuns: 3, every: 2 } as const;
