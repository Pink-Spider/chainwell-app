/**
 * Ads (AdMob via @capacitor-community/admob) and purchases (RevenueCat) behind one small API.
 * On plain web every call resolves as if the ad/purchase succeeded after a short delay, so the
 * flows can be exercised in the browser; nothing is earned or charged there.
 *
 * Rules the rest of the app relies on:
 *  - `adsRemoved()` is a cached flag in the save, refreshed from the RevenueCat entitlement at boot
 *    and after purchase/restore. Rewarded ads keep working after purchase; only interstitials stop.
 *  - `showRewarded()` resolves true only when the SDK reported a reward; dismiss/failed → false.
 *  - `maybeShowInterstitial()` never throws and never blocks longer than the ad itself.
 */
import { Capacitor } from '@capacitor/core';
import { AdMob, AdmobConsentStatus, RewardAdPluginEvents, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import type { PluginListenerHandle } from '@capacitor/core';
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import type { PurchasesStoreProduct } from '@revenuecat/purchases-capacitor';
import { ADMOB, REVENUECAT, INTERSTITIAL } from './monetize.config';
import { loadSave, writeSave } from './save';

const native = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
const ids = platform === 'ios' ? ADMOB.ios : ADMOB.android;
const rcKey = platform === 'ios' ? REVENUECAT.iosKey : platform === 'android' ? REVENUECAT.androidKey : '';

let adsReady = false;
let purchasesReady = false;
let privacyOptionsRequired = false;
let interstitialLoaded = false;
let cachedProduct: PurchasesStoreProduct | null = null;
const log = (...a: unknown[]) => { if (import.meta.env.DEV) console.log('[monetize]', ...a); };

// ── state ────────────────────────────────────────────────────────────────────
export function adsRemoved(): boolean { return loadSave().adsRemoved; }
export function purchasesAvailable(): boolean { return purchasesReady; }
export function privacyOptionsAvailable(): boolean { return privacyOptionsRequired; }

// ── init ─────────────────────────────────────────────────────────────────────
export async function initMonetize(): Promise<void> {
  if (!native) { log('web: simulated ads/purchases'); return; }
  await Promise.all([initAds(), initPurchases()]);
}

async function initAds(): Promise<void> {
  try {
    await AdMob.initialize({ initializeForTesting: ADMOB.testing });
    // Consent (UMP) first, then ATT on iOS. Both are no-ops where not required.
    let consent = await AdMob.requestConsentInfo();
    if (consent.isConsentFormAvailable && consent.status === AdmobConsentStatus.REQUIRED) consent = await AdMob.showConsentForm();
    privacyOptionsRequired = consent.privacyOptionsRequirementStatus === 'REQUIRED';
    if (platform === 'ios') {
      const att = await AdMob.trackingAuthorizationStatus();
      if (att.status === 'notDetermined') await AdMob.requestTrackingAuthorization();
    }
    adsReady = consent.canRequestAds;
    if (adsReady && !adsRemoved()) void preloadInterstitial();
  } catch (e) { log('ads init failed', e); adsReady = false; }
}

async function initPurchases(): Promise<void> {
  if (!rcKey) { log('no RevenueCat key for', platform); return; }
  try {
    if (import.meta.env.DEV) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
    await Purchases.configure({ apiKey: rcKey });
    purchasesReady = true;
    const { customerInfo } = await Purchases.getCustomerInfo();
    applyEntitlement(!!customerInfo.entitlements.active[REVENUECAT.entitlement]);
    void Purchases.addCustomerInfoUpdateListener((info) => applyEntitlement(!!info.entitlements.active[REVENUECAT.entitlement]));
  } catch (e) { log('purchases init failed', e); purchasesReady = false; }
}

function applyEntitlement(active: boolean): void {
  if (loadSave().adsRemoved !== active) writeSave({ adsRemoved: active });
}

// ── rewarded ─────────────────────────────────────────────────────────────────
export type RewardSlot = 'reroll' | 'continue';

/** Load and show a rewarded ad. Resolves true only if the user earned the reward. */
export async function showRewarded(slot: RewardSlot): Promise<boolean> {
  if (!native) { await sleep(600); return true; }
  if (!adsReady) return false;
  const adId = slot === 'reroll' ? ids.rewardedReroll : ids.rewardedContinue;
  const handles: PluginListenerHandle[] = [];
  try {
    let rewarded = false;
    const dismissed = new Promise<void>((res) => {
      void AdMob.addListener(RewardAdPluginEvents.Rewarded, () => { rewarded = true; }).then((h) => handles.push(h));
      void AdMob.addListener(RewardAdPluginEvents.Dismissed, () => res()).then((h) => handles.push(h));
      void AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => res()).then((h) => handles.push(h));
    });
    await AdMob.prepareRewardVideoAd({ adId, isTesting: ADMOB.testing });
    await AdMob.showRewardVideoAd();
    await Promise.race([dismissed, sleep(120_000)]);
    return rewarded;
  } catch (e) { log('rewarded failed', e); return false; }
  finally { for (const h of handles) void h.remove(); }
}

// ── interstitial ─────────────────────────────────────────────────────────────
async function preloadInterstitial(): Promise<void> {
  if (!native || !adsReady || interstitialLoaded) return;
  try { await AdMob.prepareInterstitial({ adId: ids.interstitial, isTesting: ADMOB.testing }); interstitialLoaded = true; }
  catch (e) { log('interstitial load failed', e); }
}

/** Interstitial cadence from the run count: skip the first few runs, then every N. */
export function interstitialDue(runsPlayed: number): boolean {
  if (adsRemoved()) return false;
  if (runsPlayed <= INTERSTITIAL.freeRuns) return false;
  return (runsPlayed - INTERSTITIAL.freeRuns) % INTERSTITIAL.every === 0;
}

/** Show an interstitial if one is due and loaded. Resolves when it is dismissed (or immediately). */
export async function maybeShowInterstitial(runsPlayed: number): Promise<void> {
  if (!interstitialDue(runsPlayed)) return;
  if (!native) { log('web: interstitial would show now'); await sleep(300); return; }
  if (!adsReady) return;
  if (!interstitialLoaded) { void preloadInterstitial(); return; }
  const handles: PluginListenerHandle[] = [];
  try {
    const done = new Promise<void>((res) => {
      void AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => res()).then((h) => handles.push(h));
      void AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, () => res()).then((h) => handles.push(h));
    });
    interstitialLoaded = false;
    await AdMob.showInterstitial();
    await Promise.race([done, sleep(60_000)]);
  } catch (e) { log('interstitial show failed', e); }
  finally { for (const h of handles) void h.remove(); void preloadInterstitial(); }
}

// ── purchases ────────────────────────────────────────────────────────────────
/** Localized price string for the remove-ads product, or null if unavailable. */
export async function removeAdsPrice(): Promise<string | null> {
  if (!native) return '$2.99';
  if (!purchasesReady) return null;
  try {
    if (!cachedProduct) {
      const { products } = await Purchases.getProducts({ productIdentifiers: [REVENUECAT.productId] });
      cachedProduct = products[0] ?? null;
    }
    return cachedProduct?.priceString ?? null;
  } catch (e) { log('price failed', e); return null; }
}

export type PurchaseResult = 'purchased' | 'cancelled' | 'unavailable' | 'error';

export async function purchaseRemoveAds(): Promise<PurchaseResult> {
  if (!native) { await sleep(600); writeSave({ adsRemoved: true }); return 'purchased'; }
  if (!purchasesReady) return 'unavailable';
  try {
    if (!cachedProduct) await removeAdsPrice();
    if (!cachedProduct) return 'unavailable';
    const { customerInfo } = await Purchases.purchaseStoreProduct({ product: cachedProduct });
    const active = !!customerInfo.entitlements.active[REVENUECAT.entitlement];
    applyEntitlement(active);
    return active ? 'purchased' : 'error';
  } catch (e) {
    const err = e as { userCancelled?: boolean | null };
    if (err?.userCancelled) return 'cancelled';
    log('purchase failed', e); return 'error';
  }
}

/** Restore; resolves true if the entitlement is active afterwards. */
export async function restorePurchases(): Promise<boolean> {
  if (!native) { await sleep(400); return adsRemoved(); }
  if (!purchasesReady) return false;
  try {
    const { customerInfo } = await Purchases.restorePurchases();
    const active = !!customerInfo.entitlements.active[REVENUECAT.entitlement];
    applyEntitlement(active);
    return active;
  } catch (e) { log('restore failed', e); return false; }
}

/** UMP privacy options form (GDPR regions). */
export async function showPrivacyOptions(): Promise<void> {
  if (!native || !privacyOptionsRequired) return;
  try { await AdMob.showPrivacyOptionsForm(); } catch (e) { log('privacy form failed', e); }
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
