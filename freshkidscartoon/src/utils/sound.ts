import { Howl, Howler } from 'howler';

// Placeholder URLs for sound effects and music
const SOUNDS = {
  pop: 'https://actions.google.com/sounds/v1/cartoon/pop.ogg',
  whack: 'https://actions.google.com/sounds/v1/cartoon/whack.ogg',
  catch: 'https://actions.google.com/sounds/v1/cartoon/ding.ogg',
  bomb: 'https://actions.google.com/sounds/v1/cartoon/explosion.ogg',
  music: 'https://actions.google.com/sounds/v1/cartoon/music.ogg',
};

export const soundManager = {
  effects: {
    pop: new Howl({ src: [SOUNDS.pop] }),
    whack: new Howl({ src: [SOUNDS.whack] }),
    catch: new Howl({ src: [SOUNDS.catch] }),
    bomb: new Howl({ src: [SOUNDS.bomb] }),
  },
  music: new Howl({ src: [SOUNDS.music], loop: true, volume: 0.3 }),
  
  playEffect(name: keyof typeof soundManager.effects) {
    this.effects[name].play();
  },
  
  toggleMute(muted: boolean) {
    Howler.mute(muted);
  }
};
