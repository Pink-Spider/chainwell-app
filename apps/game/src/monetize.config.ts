/**
 * AdMob and RevenueCat identifiers.
 *
 * The AdMob *ad unit* ids are deliberately not in this file or anywhere else in the repo. A unit
 * id is only an identifier, but anyone who has it can serve our units from their own app, and the
 * invalid traffic that produces gets OUR publisher account — shared by every Pink Spider app —
 * suspended. `vite.config.ts` bakes them in from ~/.pink-spider/secrets/chainwell/ad-units.env at
 * build time, and a production build without that file fails. See docs/ad-units.md.
 *
 * What is fine to keep here:
 *  - AdMob *app* ids (`~`). They have to sit in strings.xml / Info.plist for the SDK to start and
 *    cannot request ads on their own. Listed for reference; the SDK reads the native copies.
 *  - RevenueCat public SDK keys (appl_… / goog_…). Designed to ship in the client; the secret
 *    keys (sk_…) never leave the RevenueCat dashboard.
 *
 * Consoles: AdMob → apps.admob.com, account developer.ygpark@gmail.com (not the Play Console one).
 *           RevenueCat → app.revenuecat.com → Project → API keys.
 */
export const ADMOB = {
  android: {
    appId: 'ca-app-pub-6329038356545416~2674013726',
    rewardedReroll: import.meta.env.VITE_ADMOB_ANDROID_REWARDED_REROLL,
    rewardedContinue: import.meta.env.VITE_ADMOB_ANDROID_REWARDED_CONTINUE,
    interstitial: import.meta.env.VITE_ADMOB_ANDROID_INTERSTITIAL,
  },
  ios: {
    appId: 'ca-app-pub-6329038356545416~5120962095',
    rewardedReroll: import.meta.env.VITE_ADMOB_IOS_REWARDED_REROLL,
    rewardedContinue: import.meta.env.VITE_ADMOB_IOS_REWARDED_CONTINUE,
    interstitial: import.meta.env.VITE_ADMOB_IOS_INTERSTITIAL,
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
  androidKey: 'goog_BMBoJfourXHvXFyqYKDSMILqQOU',
  /** Entitlement id configured in RevenueCat; the product `remove_ads` grants it on both stores. */
  entitlement: 'remove_ads',
  productId: 'chainwell_remove_ads',
} as const;

/** Interstitial cadence: none during the first `freeRuns`, then one every `every` finished runs. */
export const INTERSTITIAL = { freeRuns: 3, every: 2 } as const;
