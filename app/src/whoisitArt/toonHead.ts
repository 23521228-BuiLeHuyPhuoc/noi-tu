import { createAvatar, type Style } from '@dicebear/core';
import * as toonHead from '@dicebear/toon-head';
import { CLOTHES_HEX, HAIR_HEX, SKIN_HEX, type WhoIsItCharacter } from '../../../shared/src/whoisit';

type Opts = typeof toonHead extends Style<infer O> ? Partial<O> : never;
type HairKey = NonNullable<Opts['hair']>[number];
type RearHairKey = NonNullable<Opts['rearHair']>[number];
type BeardKey = NonNullable<Opts['beard']>[number];
type ClothesKey = NonNullable<Opts['clothes']>[number];
type EyesKey = NonNullable<Opts['eyes']>[number];
type BrowsKey = NonNullable<Opts['eyebrows']>[number];
type MouthKey = NonNullable<Opts['mouth']>[number];

function expressionOptions(exp: WhoIsItCharacter['expression']): {
  eyebrows: BrowsKey[];
  eyes: EyesKey[];
  mouth: MouthKey[];
} {
  switch (exp) {
    case 'happy':
      return { eyebrows: ['happy'], eyes: ['happy'], mouth: ['laugh', 'smile'] };
    case 'sad':
      return { eyebrows: ['sad'], eyes: ['humble', 'bow'], mouth: ['sad'] };
    case 'angry':
      return { eyebrows: ['angry'], eyes: ['bow'], mouth: ['angry'] };
    case 'surprised':
      return { eyebrows: ['raised'], eyes: ['wide'], mouth: ['agape'] };
    case 'cheeky':
      return { eyebrows: ['raised', 'happy'], eyes: ['wink'], mouth: ['smile', 'laugh'] };
  }
}

export function render(c: WhoIsItCharacter): string {
  const exp = expressionOptions(c.expression);

  let hair: HairKey[] | undefined;
  let hairProbability = 100;
  let rearHair: RearHairKey[] | undefined;
  let rearHairProbability = 0;

  if (c.hairStyle === 'bald') {
    hairProbability = 0;
    rearHairProbability = 0;
  } else if (c.hairStyle === 'long') {
    // Tóc dài chỉ dùng cho nữ; không dùng neckHigh cho tóc dài
    hair = ['sideComed', 'bun'];
    rearHair = ['longStraight', 'longWavy', 'shoulderHigh'];
    rearHairProbability = 100;
  } else {
    // short
    if (c.gender === 'female') {
      hair = ['sideComed'];
      rearHair = ['neckHigh'];
      rearHairProbability = 100;
    } else {
      hair = ['sideComed', 'undercut', 'spiky'];
      rearHairProbability = 0;
    }
  }

  let beard: BeardKey[] | undefined;
  if (c.facialHair === 'mustache') beard = ['moustacheTwirl'];
  else if (c.facialHair === 'beard') beard = ['fullBeard', 'longBeard'];

  const clothes: ClothesKey[] =
    c.gender === 'female'
      ? ['tShirt', 'turtleNeck', 'dress', 'openJacket']
      : ['tShirt', 'shirt', 'turtleNeck', 'openJacket'];

  const hairHex = c.hairColor !== 'none' ? HAIR_HEX[c.hairColor] : '2c1b18';

  const rawSvg = createAvatar(toonHead, {
    seed: c.seed,
    backgroundColor: [c.bg],
    skinColor: [SKIN_HEX[c.skin]],
    clothes,
    clothesColor: [CLOTHES_HEX[c.clothesColor]],
    hair,
    hairProbability,
    rearHair,
    rearHairProbability,
    hairColor: [hairHex],
    beard,
    beardProbability: beard ? 100 : 0,
    eyebrows: exp.eyebrows,
    eyes: exp.eyes,
    mouth: exp.mouth,
  }).toString();

  return rawSvg.replace(/<metadata[\s\S]*?<\/metadata>/, '');
}
