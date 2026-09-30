import Phaser from 'phaser';
import { ICONS } from './ui';

/** Loads the Figma icon set (public/icons/*.svg, rasterized at 4×) then hands off to home. */
export class BootScene extends Phaser.Scene {
  constructor() { super('boot'); }
  preload() {
    for (const k of ICONS) this.load.svg(`ic-${k}`, `icons/${k}.svg`, { scale: 4 });
  }
  create() { this.scene.start('home'); }
}
