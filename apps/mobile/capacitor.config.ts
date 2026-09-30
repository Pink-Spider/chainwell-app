import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.pinkspider.chainwell',
  appName: 'Chainwell',
  webDir: '../game/dist',
  backgroundColor: '#0E0F16',
  ios: { contentInset: 'never', scrollEnabled: false },
  android: { allowMixedContent: false },
  plugins: {
    StatusBar: { style: 'DARK', backgroundColor: '#0E0F16', overlaysWebView: true },
  },
};

export default config;
