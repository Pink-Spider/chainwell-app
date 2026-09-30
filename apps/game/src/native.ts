/** Thin adapter over Capacitor plugins; every call is a no-op on plain web. */
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { settings } from './save';

export const isNative = Capacitor.isNativePlatform();

export async function initNative(): Promise<void> {
  if (!isNative) return;
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch { /* plugin missing on this platform */ }
}

/** Chain feedback: stronger with longer chains. */
export function hapticChain(chain: number): void {
  if (!settings().haptics) return;
  if (isNative) {
    const style = chain >= 4 ? ImpactStyle.Heavy : chain >= 2 ? ImpactStyle.Medium : ImpactStyle.Light;
    void Haptics.impact({ style });
  } else if ('vibrate' in navigator) {
    navigator.vibrate?.(Math.min(10 * chain, 60));
  }
}

export function hapticLock(): void {
  if (!settings().haptics) return;
  if (isNative) void Haptics.impact({ style: ImpactStyle.Light });
}
