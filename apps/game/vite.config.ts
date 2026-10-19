import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { defineConfig } from 'vite';

/**
 * Real AdMob ad unit ids are NOT in the repo. A unit id is only an identifier, but anyone who has
 * it can serve our units from their own app, and the resulting invalid traffic suspends OUR
 * publisher account — the one every Pink Spider app shares. The ids live next to the other
 * release secrets and are baked into the bundle here, at build time. See docs/ad-units.md.
 *
 * Lookup order (production builds only):
 *   1. $CHAINWELL_SECRETS/ad-units.env
 *   2. ~/.pink-spider/secrets/chainwell/ad-units.env
 *
 * Missing file: a production build FAILS, because `vite build` is what every `cap sync` and
 * fastlane lane runs and a store upload must never ship earning-nothing test units.
 * `CHAINWELL_AD_UNITS=test pnpm build` opts into Google's sample units on purpose (fresh clone, CI).
 * The dev server never reads the file: dev builds request test ads regardless (ADMOB.testing),
 * so it always serves the sample units and there is nothing to leak over `pnpm dev --host`.
 */
const AD_UNIT_KEYS = [
  'VITE_ADMOB_ANDROID_REWARDED_REROLL',
  'VITE_ADMOB_ANDROID_REWARDED_CONTINUE',
  'VITE_ADMOB_ANDROID_INTERSTITIAL',
  'VITE_ADMOB_IOS_REWARDED_REROLL',
  'VITE_ADMOB_IOS_REWARDED_CONTINUE',
  'VITE_ADMOB_IOS_INTERSTITIAL',
] as const;
type AdUnitKey = (typeof AD_UNIT_KEYS)[number];

/** Google's published sample units: https://developers.google.com/admob/android/test-ads */
const SAMPLE_UNITS: Record<AdUnitKey, string> = {
  VITE_ADMOB_ANDROID_REWARDED_REROLL: 'ca-app-pub-3940256099942544/5224354917',
  VITE_ADMOB_ANDROID_REWARDED_CONTINUE: 'ca-app-pub-3940256099942544/5224354917',
  VITE_ADMOB_ANDROID_INTERSTITIAL: 'ca-app-pub-3940256099942544/1033173712',
  VITE_ADMOB_IOS_REWARDED_REROLL: 'ca-app-pub-3940256099942544/1712485313',
  VITE_ADMOB_IOS_REWARDED_CONTINUE: 'ca-app-pub-3940256099942544/1712485313',
  VITE_ADMOB_IOS_INTERSTITIAL: 'ca-app-pub-3940256099942544/4411468910',
};

function loadAdUnits(mode: string): Record<AdUnitKey, string> {
  if (mode !== 'production') return SAMPLE_UNITS;

  const candidates = [
    process.env.CHAINWELL_SECRETS ? join(process.env.CHAINWELL_SECRETS, 'ad-units.env') : null,
    join(homedir(), '.pink-spider', 'secrets', 'chainwell', 'ad-units.env'),
  ];
  const file = candidates.find((f): f is string => f !== null && existsSync(f));

  if (!file) {
    if (process.env.CHAINWELL_AD_UNITS !== 'test') {
      throw new Error(
        [
          'ad-units.env not found — refusing to build a production bundle with test ad units.',
          `  Expected at ${candidates[1]} (format: docs/ad-units.md; re-read the ids in the AdMob console).`,
          '  To build without the real ids on purpose:  CHAINWELL_AD_UNITS=test pnpm build',
        ].join('\n'),
      );
    }
    console.warn('[ad-units] CHAINWELL_AD_UNITS=test: bundling Google sample units. This build earns nothing — do not upload it.');
    return SAMPLE_UNITS;
  }

  const vars: Record<string, string> = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m) continue;
    const [, key, raw = ''] = m;
    if (key) vars[key] = raw.replace(/^(["'])(.*)\1$/, '$2');
  }
  const missing = AD_UNIT_KEYS.filter((k) => !vars[k]);
  if (missing.length > 0) throw new Error(`${file}: missing ${missing.join(', ')}`);
  return vars as Record<AdUnitKey, string>;
}

export default defineConfig(({ mode }) => {
  const units = loadAdUnits(mode);
  return {
    server: { port: 5173 },
    build: { target: 'es2022' },
    // Vite only auto-exposes VITE_* from .env files inside the project; this file is kept outside
    // the repo on purpose, so the values go in as build-time constants instead.
    define: Object.fromEntries(AD_UNIT_KEYS.map((k) => [`import.meta.env.${k}`, JSON.stringify(units[k])])),
  };
});
