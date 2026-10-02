// Self-hosted fonts (bundled by Vite) so native builds render correctly offline.
import '@fontsource/chakra-petch/600.css';
import '@fontsource/chakra-petch/700.css';
import '@fontsource/noto-sans-kr/500.css';
import '@fontsource/noto-sans-kr/700.css';
import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { HomeScene } from './HomeScene';
import { CharacterScene } from './CharacterScene';
import { PlayScene } from './PlayScene';
import { PerkScene } from './PerkScene';
import { PauseScene } from './PauseScene';
import { ResultScene } from './ResultScene';
import { SettingsScene } from './SettingsScene';
import { DPR, W, H } from './ui';
import { T } from './theme';
import { initNative } from './native';
import { initMonetize } from './monetize';

void initNative();
void initMonetize();

// Phaser rasterizes text on creation, so the web fonts must be ready before any scene runs.
const FONTS = ['600 11px "Chakra Petch"', '700 16px "Chakra Petch"', '500 11px "Noto Sans KR"', '700 11px "Noto Sans KR"'];
await Promise.all(FONTS.map((f) => document.fonts.load(f))).catch(() => undefined);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  // Render at device pixel ratio so text and edges stay sharp on Retina / phone screens.
  // Scenes keep 390×844 logical coordinates via fitCamera() (camera zoom = DPR).
  width: W * DPR,
  height: H * DPR,
  backgroundColor: T.bgApp,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, autoRound: true },
  scene: [BootScene, HomeScene, CharacterScene, PlayScene, PerkScene, PauseScene, ResultScene, SettingsScene],
});

// Dev hook: inspect scenes / run from the console (e.g. cw.scene.getScene('play')).
if (import.meta.env.DEV) (window as unknown as { cw: Phaser.Game }).cw = game;
