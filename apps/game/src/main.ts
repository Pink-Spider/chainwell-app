import Phaser from 'phaser';
import { PlayScene } from './PlayScene';
import { PerkScene } from './PerkScene';
import { ResultScene } from './ResultScene';
import { T } from './theme';
import { initNative } from './native';

void initNative();

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 390,
  height: 844,
  backgroundColor: T.bgApp,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [PlayScene, PerkScene, ResultScene],
});

// Dev hook: inspect scenes / run from the console (e.g. cw.scene.getScene('play')).
if (import.meta.env.DEV) (window as unknown as { cw: Phaser.Game }).cw = game;
