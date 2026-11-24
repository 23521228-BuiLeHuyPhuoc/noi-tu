import { createAvatar, type Style } from '@dicebear/core';
import * as bigSmile from '@dicebear/big-smile';
import { HAIR_HEX, SKIN_HEX, type WhoIsItCharacter } from '../../../shared/src/whoisit';

type Opts = typeof bigSmile extends Style<infer O> ? Partial<O> : never;
type HairKey = NonNullable<Opts['hair']>[number];
type AccKey = NonNullable<Opts['accessories']>[number];
type EyesKey = NonNullable<Opts['eyes']>[number];
type MouthKey = NonNullable<Opts['mouth']>[number];

function hairOptions(c: WhoIsItCharacter): HairKey[] {
  if (c.hairStyle === 'short') {
    return c.gender === 'female'
      ? ['bowlCutHair', 'shortHair']
      : ['shortHair', 'mohawk', 'halfShavedHead'];
  }
  if (c.hairStyle === 'long') {
    return c.gender === 'female'
      ? ['straightHair', 'braids', 'bangs', 'bunHair']
      : ['straightHair', 'braids'];
  }
  return c.gender === 'female' ? ['curlyBob', 'froBun'] : ['curlyShortHair'];
}

function expressionOptions(exp: WhoIsItCharacter['expression']): {
  eyes: EyesKey[];
  mouth: MouthKey[];
} {
  switch (exp) {
    case 'happy':
      return {
        eyes: ['cheery', 'normal', 'starstruck'],
        mouth: ['openedSmile', 'teethSmile', 'kawaii'],
      };
    case 'sad':
      return {
        eyes: ['sad', 'sleepy'],
        mouth: ['openSad'],
      };
    case 'angry':
      return {
        eyes: ['angry'],
        mouth: ['unimpressed'],
      };
    case 'cheeky':
      return {
        eyes: ['winking'],
        mouth: ['awkwardSmile', 'gapSmile', 'braces'],
      };
    default:
      return {
        eyes: ['normal'],
        mouth: ['openedSmile'],
      };
  }
}

export function render(c: WhoIsItCharacter): string {
  const exp = expressionOptions(c.expression);
  let accessories: AccKey[] | undefined;
  if (c.glasses === 'clear') accessories = ['glasses'];
  else if (c.glasses === 'sunglasses') accessories = ['sunglasses'];

  const rawSvg = createAvatar(bigSmile, {
    seed: c.seed,
    backgroundColor: [c.bg],
    skinColor: [SKIN_HEX[c.skin]],
    hair: hairOptions(c),
    hairColor: [HAIR_HEX[c.hairColor]],
    accessories,
    accessoriesProbability: accessories ? 100 : 0,
    eyes: exp.eyes,
    mouth: exp.mouth,
  }).toString();

  return rawSvg.replace(/<metadata[\s\S]*?<\/metadata>/, '');
}
