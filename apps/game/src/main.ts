import Phaser from 'phaser';
import { HomeScene } from './HomeScene';
import { CharacterScene } from './CharacterScene';
import { PlayScene } from './PlayScene';
import { PerkScene } from './PerkScene';
import { PauseScene } from './PauseScene';
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
  scene: [HomeScene, CharacterScene, PlayScene, PerkScene, PauseScene, ResultScene],
});

// Dev hook: inspect scenes / run from the console (e.g. cw.scene.getScene('play')).
if (import.meta.env.DEV) (window as unknown as { cw: Phaser.Game }).cw = game;
