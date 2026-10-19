/// <reference types="vite/client" />

// Baked in by vite.config.ts from ~/.pink-spider/secrets/chainwell/ad-units.env — see docs/ad-units.md.
interface ImportMetaEnv {
  readonly VITE_ADMOB_ANDROID_REWARDED_REROLL: string;
  readonly VITE_ADMOB_ANDROID_REWARDED_CONTINUE: string;
  readonly VITE_ADMOB_ANDROID_INTERSTITIAL: string;
  readonly VITE_ADMOB_IOS_REWARDED_REROLL: string;
  readonly VITE_ADMOB_IOS_REWARDED_CONTINUE: string;
  readonly VITE_ADMOB_IOS_INTERSTITIAL: string;
}
