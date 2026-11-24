import { createAvatar, type Style } from '@dicebear/core';
import * as micah from '@dicebear/micah';
import { CLOTHES_HEX, HAIR_HEX, SKIN_HEX, type WhoIsItCharacter } from '../../../shared/src/whoisit';

type Opts = typeof micah extends Style<infer O> ? Partial<O> : never;
type HairKey = NonNullable<Opts['hair']>[number];
type EyesKey = NonNullable<Opts['eyes']>[number];
type BrowsKey = NonNullable<Opts['eyebrows']>[number];
type MouthKey = NonNullable<Opts['mouth']>[number];
type BeardKey = NonNullable<Opts['facialHair']>[number];
type GlassesKey = NonNullable<Opts['glasses']>[number];
type EarringsKey = NonNullable<Opts['earrings']>[number];

const TURBAN_COLORS = ['e03131', '2563eb', '16a34a', '9333ea', 'eab308', 'f97316', 'db2777'];

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hairOptions(c: WhoIsItCharacter): HairKey[] {
  if (c.hairStyle === 'bald') return ['mrClean'];
  if (c.hairStyle === 'covered') return ['turban'];
  if (c.hairStyle === 'long') return ['full'];
  return c.gender === 'female' ? ['pixie'] : ['fonze', 'mrT', 'dannyPhantom'];
}

function expressionOptions(c: WhoIsItCharacter): {
  eyes: EyesKey[];
  eyebrows: BrowsKey[];
  mouth: MouthKey[];
} {
  const fem = c.gender === 'female';
  switch (c.expression) {
    case 'happy':
      return {
        eyes: fem ? ['smiling', 'smilingShadow'] : ['smiling', 'eyes'],
        eyebrows: fem ? ['eyelashesUp'] : ['up'],
        mouth: ['laughing', 'smile'],
      };
    case 'sad':
      return {
        eyes: fem ? ['eyes', 'eyesShadow'] : ['eyes'],
        eyebrows: fem ? ['eyelashesDown'] : ['down'],
        mouth: ['sad', 'frown'],
      };
    case 'surprised':
      return {
        eyes: ['round'],
        eyebrows: fem ? ['eyelashesUp'] : ['up'],
        mouth: ['surprised'],
      };
    case 'cheeky':
      return {
        eyes: fem ? ['smiling', 'eyesShadow'] : ['smiling', 'eyes'],
        eyebrows: fem ? ['eyelashesUp'] : ['up'],
        mouth: ['smirk', 'pucker'],
      };
    default:
      return {
        eyes: ['eyes'],
        eyebrows: fem ? ['eyelashesUp'] : ['up'],
        mouth: ['smile'],
      };
  }
}

export function render(c: WhoIsItCharacter): string {
  const exp = expressionOptions(c);
  const hairHex =
    c.hairStyle === 'covered'
      ? TURBAN_COLORS[hashSeed(c.seed) % TURBAN_COLORS.length]
      : HAIR_HEX[c.hairColor];

  const glasses: GlassesKey[] | undefined = c.glasses === 'clear' ? ['round', 'square'] : undefined;
  const facialHair: BeardKey[] | undefined = c.facialHair === 'beard' ? ['beard'] : undefined;
  const earrings: EarringsKey[] | undefined = c.earrings ? ['hoop', 'stud'] : undefined;

  const rawSvg = createAvatar(micah, {
    seed: c.seed,
    backgroundColor: [c.bg],
    baseColor: [SKIN_HEX[c.skin]],
    shirtColor: [CLOTHES_HEX[c.clothesColor]],
    hair: hairOptions(c),
    hairProbability: 100,
    hairColor: [hairHex],
    eyes: exp.eyes,
    eyebrows: exp.eyebrows,
    mouth: exp.mouth,
    glasses,
    glassesProbability: glasses ? 100 : 0,
    facialHair,
    facialHairProbability: facialHair ? 100 : 0,
    facialHairColor: [c.hairColor !== 'none' ? HAIR_HEX[c.hairColor] : '2c1b18'],
    earrings,
    earringsProbability: earrings ? 100 : 0,
  }).toString();

  return rawSvg.replace(/<metadata[\s\S]*?<\/metadata>/, '');
}
