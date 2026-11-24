import { createAvatar, type Style } from '@dicebear/core';
import * as openPeeps from '@dicebear/open-peeps';
import { CLOTHES_HEX, SKIN_HEX, type WhoIsItCharacter } from '../../../shared/src/whoisit';

type Opts = typeof openPeeps extends Style<infer O> ? Partial<O> : never;
type HeadKey = NonNullable<Opts['head']>[number];
type FaceKey = NonNullable<Opts['face']>[number];
type AccKey = NonNullable<Opts['accessories']>[number];
type BeardKey = NonNullable<Opts['facialHair']>[number];

const HAT_COLORS = ['e03131', '2563eb', '16a34a', '9333ea', 'eab308', 'f97316', 'db2777'];

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function headOptions(c: WhoIsItCharacter): HeadKey[] {
  if (c.hairStyle === 'bald') return ['noHair1', 'noHair2'];
  if (c.hairStyle === 'covered') {
    if (c.hat === 'beanie') return ['hatBeanie'];
    return c.gender === 'female' ? ['turban', 'hijab'] : ['turban'];
  }
  if (c.hairStyle === 'short') {
    return c.gender === 'female'
      ? ['bangs2']
      : ['flatTop', 'flatTopLong', 'pomp', 'shaved1', 'shaved2', 'shaved3', 'short1', 'short2', 'short3', 'short5', 'twists', 'twists2', 'mohawk', 'mohawk2'];
  }
  if (c.hairStyle === 'long') {
    return c.gender === 'female'
      ? ['long', 'longBangs', 'mediumStraight', 'medium3', 'mediumBangs', 'mediumBangs3', 'bun', 'bun2', 'buns', 'cornrows', 'cornrows2']
      : ['cornrows', 'cornrows2', 'bun'];
  }
  return c.gender === 'female' ? ['afro', 'longAfro', 'longCurly'] : ['afro', 'dreads1', 'dreads2'];
}

function faceOptions(exp: WhoIsItCharacter['expression']): FaceKey[] {
  switch (exp) {
    case 'happy':
      return ['smile', 'smileBig', 'smileLOL', 'lovingGrin1', 'lovingGrin2', 'cute'];
    case 'sad':
      return ['concerned', 'solemn', 'tired'];
    case 'angry':
      return ['angryWithFang', 'rage', 'veryAngry'];
    case 'surprised':
      return ['awe', 'fear', 'concernedFear'];
    case 'cheeky':
      return ['cheeky', 'contempt', 'suspicious'];
  }
}

export function render(c: WhoIsItCharacter): string {
  const isCovered = c.hairStyle === 'covered';
  const headColor = isCovered
    ? HAT_COLORS[hashSeed(c.seed) % HAT_COLORS.length]
    : '2c1b18';

  let accessories: AccKey[] | undefined;
  if (c.glasses === 'clear') accessories = ['glasses', 'glasses2', 'glasses3', 'glasses4', 'glasses5'];
  else if (c.glasses === 'sunglasses') accessories = ['sunglasses', 'sunglasses2'];
  else if (c.glasses === 'eyepatch') accessories = ['eyepatch'];

  // Khi đội mũ (headContrastColor là màu mũ), loại bỏ full4/moustache9 vốn ăn theo headContrastColor để râu luôn màu đen tự nhiên
  let facialHair: BeardKey[] | undefined;
  if (c.facialHair === 'mustache') {
    facialHair = isCovered
      ? ['moustache1', 'moustache2', 'moustache3', 'moustache4', 'moustache5', 'moustache6', 'moustache7', 'moustache8']
      : ['moustache1', 'moustache2', 'moustache3', 'moustache4', 'moustache5', 'moustache6', 'moustache7', 'moustache8', 'moustache9'];
  } else if (c.facialHair === 'beard') {
    facialHair = isCovered
      ? ['chin', 'full', 'full2', 'full3', 'goatee1', 'goatee2']
      : ['chin', 'full', 'full2', 'full3', 'full4', 'goatee1', 'goatee2'];
  }

  const rawSvg = createAvatar(openPeeps, {
    seed: c.seed,
    backgroundColor: [c.bg],
    skinColor: [SKIN_HEX[c.skin]],
    clothingColor: [CLOTHES_HEX[c.clothesColor]],
    head: headOptions(c),
    headContrastColor: [headColor],
    face: faceOptions(c.expression),
    accessories,
    accessoriesProbability: accessories ? 100 : 0,
    facialHair,
    facialHairProbability: facialHair ? 100 : 0,
    maskProbability: 0,
  }).toString();

  return rawSvg.replace(/<metadata[\s\S]*?<\/metadata>/, '');
}
