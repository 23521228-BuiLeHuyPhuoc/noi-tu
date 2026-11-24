import type { WhoIsItArtPackId, WhoIsItCharacter } from '../../../shared/src/whoisit';
import { render as renderAvataaars } from './avataaars';
import { render as renderBigSmile } from './bigSmile';
import { render as renderMicah } from './micah';
import { render as renderNiceAvatar } from './niceAvatar';
import { render as renderOpenPeeps } from './openPeeps';
import { render as renderPersonas } from './personas';
import { render as renderToonHead } from './toonHead';

const RENDERERS: Record<WhoIsItArtPackId, (c: WhoIsItCharacter) => string> = {
  avataaars: renderAvataaars,
  personas: renderPersonas,
  micah: renderMicah,
  openPeeps: renderOpenPeeps,
  toonHead: renderToonHead,
  bigSmile: renderBigSmile,
  niceAvatar: renderNiceAvatar,
};

export function whoIsItPortraitSvg(c: WhoIsItCharacter, pack: WhoIsItArtPackId): string {
  const fn = RENDERERS[pack] ?? renderAvataaars;
  return fn(c);
}
