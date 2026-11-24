import { createAvatar, type Style } from '@dicebear/core';
import * as personas from '@dicebear/personas';
import { CLOTHES_HEX, HAIR_HEX, SKIN_HEX, type WhoIsItCharacter } from '../../../shared/src/whoisit';

type Opts = typeof personas extends Style<infer O> ? Partial<O> : never;
type HairKey = NonNullable<Opts['hair']>[number];
type EyesKey = NonNullable<Opts['eyes']>[number];
type MouthKey = NonNullable<Opts['mouth']>[number];
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

function hairOptions(c: WhoIsItCharacter): HairKey[] {
  if (c.hairStyle === 'bald') return ['bald'];
  if (c.hairStyle === 'covered') {
    return c.hat === 'cap' ? ['cap'] : ['beanie'];
  }
  if (c.hairStyle === 'short') {
    return c.gender === 'female'
      ? ['bobCut', 'bobBangs']
      : ['shortCombover', 'shortComboverChops', 'fade', 'mohawk'];
  }
  if (c.hairStyle === 'long') {
    return c.gender === 'female'
      ? ['long', 'extraLong', 'pigtails', 'straightBun']
      : ['bunUndercut', 'sideShave', 'long'];
  }
  return c.gender === 'female' ? ['curly', 'curlyBun'] : ['curlyHighTop', 'curly'];
}

function eyesOptions(c: WhoIsItCharacter): EyesKey[] {
  if (c.glasses === 'clear') return ['glasses'];
  if (c.glasses === 'sunglasses') return ['sunglasses'];
  switch (c.expression) {
    case 'happy':
      return ['happy', 'open'];
    case 'sad':
      return ['sleep', 'open'];
    case 'surprised':
      return ['open'];
    case 'cheeky':
      return ['wink'];
    default:
      return ['open'];
  }
}

function mouthOptions(exp: WhoIsItCharacter['expression']): MouthKey[] {
  switch (exp) {
    case 'happy':
      return ['smile', 'bigSmile'];
    case 'sad':
      return ['frown'];
    case 'surprised':
      return ['surprise'];
    case 'cheeky':
      return ['smirk'];
    default:
      return ['smile'];
  }
}

export function render(c: WhoIsItCharacter): string {
  let facialHair: BeardKey[] | undefined;
  if (c.facialHair === 'mustache') facialHair = ['walrus'];
  else if (c.facialHair === 'beard') facialHair = ['beardMustache', 'pyramid', 'goatee', 'shadow', 'soulPatch'];

  const hairHex = c.hairColor !== 'none' ? HAIR_HEX[c.hairColor] : '2c1b18';

  const rawSvg = createAvatar(personas, {
    seed: c.seed,
    backgroundColor: [c.bg],
    skinColor: [SKIN_HEX[c.skin]],
    clothingColor: [CLOTHES_HEX[c.clothesColor]],
    hair: hairOptions(c),
    hairColor: [hairHex],
    eyes: eyesOptions(c),
    mouth: mouthOptions(c.expression),
    facialHair,
    facialHairProbability: facialHair ? 100 : 0,
  }).toString();

  let cleanSvg = rawSvg.replace(/<metadata[\s\S]*?<\/metadata>/, '');
  if (c.hairStyle === 'covered') {
    // Cap (#F29C65) và beanie (#E15C66) trong personas có màu cố định; đổi sang màu mũ nổi bật theo seed mà không ảnh hưởng màu râu
    const hatHex = HAT_COLORS[hashSeed(c.seed) % HAT_COLORS.length];
    cleanSvg = cleanSvg
      .replace('fill="#F29C65"', `fill="#${hatHex}"`)
      .replace('fill="#E15C66"', `fill="#${hatHex}"`);
  }
  return cleanSvg;
}
