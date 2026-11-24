import { createAvatar, type Style } from '@dicebear/core';
import * as avataaars from '@dicebear/avataaars';
import { CLOTHES_HEX, HAIR_HEX, SKIN_HEX, type WhoIsItCharacter } from '../../../shared/src/whoisit';

type Opts = typeof avataaars extends Style<infer O> ? Partial<O> : never;
type TopKey = NonNullable<Opts['top']>[number];
type ClothingKey = NonNullable<Opts['clothing']>[number];
type EyesKey = NonNullable<Opts['eyes']>[number];
type BrowsKey = NonNullable<Opts['eyebrows']>[number];
type MouthKey = NonNullable<Opts['mouth']>[number];
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

function buildDetailOverlay(c: WhoIsItCharacter): string {
  const parts: string[] = [];
  if (c.earrings) {
    parts.push(
      '<circle cx="84" cy="142" r="5.5" fill="none" stroke="#F59E0B" stroke-width="3.2"/>',
      '<circle cx="196" cy="142" r="5.5" fill="none" stroke="#F59E0B" stroke-width="3.2"/>',
      '<circle cx="84" cy="147.5" r="2.2" fill="#FEF08A"/>',
      '<circle cx="196" cy="147.5" r="2.2" fill="#FEF08A"/>',
    );
  }
  if (c.blush) {
    parts.push(
      '<ellipse cx="101" cy="136" rx="9" ry="5" fill="#FB7185" opacity="0.58"/>',
      '<ellipse cx="179" cy="136" rx="9" ry="5" fill="#FB7185" opacity="0.58"/>',
    );
  }
  if (c.freckles) {
    parts.push(
      '<circle cx="103" cy="133" r="2.1" fill="#92400E" opacity="0.72"/>',
      '<circle cx="110" cy="136" r="2" fill="#92400E" opacity="0.72"/>',
      '<circle cx="106" cy="140" r="2" fill="#92400E" opacity="0.72"/>',
      '<circle cx="177" cy="133" r="2.1" fill="#92400E" opacity="0.72"/>',
      '<circle cx="170" cy="136" r="2" fill="#92400E" opacity="0.72"/>',
      '<circle cx="174" cy="140" r="2" fill="#92400E" opacity="0.72"/>',
    );
  }
  if (c.scar) {
    parts.push(
      '<path d="M98 144 L120 158" stroke="#991B1B" stroke-width="3.6" stroke-linecap="round"/>',
      '<path d="M103 142 L100 150 M111 147 L108 155 M118 152 L115 160" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round"/>',
    );
  }
  if (c.bow) {
    parts.push(
      '<path d="M186 72 L168 58 L168 82 Z" fill="#F43F5E" stroke="#881337" stroke-width="2.4" stroke-linejoin="round"/>',
      '<path d="M186 72 L205 60 L203 84 Z" fill="#F43F5E" stroke="#881337" stroke-width="2.4" stroke-linejoin="round"/>',
      '<circle cx="186" cy="72" r="5" fill="#FDA4AF" stroke="#881337" stroke-width="2.2"/>',
    );
  }
  return parts.join('');
}

function topOptions(c: WhoIsItCharacter): TopKey[] {
  if (c.hairStyle === 'covered') {
    if (c.hat === 'cap') return ['hat'];
    if (c.hat === 'beanie') return ['winterHat1', 'winterHat02', 'winterHat03', 'winterHat04'];
    return c.gender === 'female' ? ['hijab'] : ['turban'];
  }
  if (c.hairStyle === 'short') {
    return c.gender === 'female'
      ? ['bob', 'miaWallace']
      : ['shortFlat', 'shortRound', 'shortWaved', 'theCaesar', 'theCaesarAndSidePart', 'shavedSides', 'sides'];
  }
  if (c.hairStyle === 'long') {
    return c.gender === 'female'
      ? ['longButNotTooLong', 'straight01', 'straight02', 'straightAndStrand', 'curvy', 'bun', 'frida']
      : ['dreads', 'dreads01', 'dreads02', 'shaggy', 'shaggyMullet'];
  }
  if (c.hairStyle === 'curly') {
    return c.gender === 'female' ? ['curly', 'bigHair', 'froBand'] : ['shortCurly', 'fro', 'frizzle'];
  }
  return ['shortFlat'];
}

function expressionOptions(exp: WhoIsItCharacter['expression']): {
  eyes: EyesKey[];
  eyebrows: BrowsKey[];
  mouth: MouthKey[];
} {
  switch (exp) {
    case 'happy':
      return {
        eyes: ['happy', 'default'],
        eyebrows: ['defaultNatural', 'raisedExcitedNatural'],
        mouth: ['smile', 'twinkle'],
      };
    case 'sad':
      return {
        eyes: ['cry', 'default'],
        eyebrows: ['sadConcernedNatural', 'sadConcerned'],
        mouth: ['sad', 'concerned'],
      };
    case 'angry':
      return {
        eyes: ['squint'],
        eyebrows: ['angryNatural', 'frownNatural', 'angry'],
        mouth: ['serious', 'grimace'],
      };
    case 'surprised':
      return {
        eyes: ['surprised'],
        eyebrows: ['raisedExcitedNatural', 'raisedExcited'],
        mouth: ['screamOpen', 'disbelief'],
      };
    case 'cheeky':
      return {
        eyes: ['wink', 'winkWacky'],
        eyebrows: ['upDownNatural', 'upDown'],
        mouth: ['tongue'],
      };
  }
}

function clothingOptions(cl: WhoIsItCharacter['clothing']): ClothingKey[] {
  switch (cl) {
    case 'hoodie':
      return ['hoodie'];
    case 'blazer':
      return ['blazerAndShirt', 'blazerAndSweater'];
    case 'overall':
      return ['overall'];
    case 'tshirt':
    default:
      return ['shirtCrewNeck', 'shirtVNeck', 'shirtScoopNeck', 'collarAndSweater', 'graphicShirt'];
  }
}

export function render(c: WhoIsItCharacter): string {
  const exp = expressionOptions(c.expression);
  const hatColor = HAT_COLORS[hashSeed(c.seed) % HAT_COLORS.length];

  let accessories: AccKey[] | undefined;
  if (c.glasses === 'clear') accessories = ['prescription01', 'prescription02', 'round', 'kurt'];
  else if (c.glasses === 'sunglasses') accessories = ['sunglasses', 'wayfarers'];
  else if (c.glasses === 'eyepatch') accessories = ['eyepatch'];

  let facialHair: BeardKey[] | undefined;
  if (c.facialHair === 'mustache') facialHair = ['moustacheFancy', 'moustacheMagnum'];
  else if (c.facialHair === 'beard') facialHair = ['beardLight', 'beardMedium', 'beardMajestic'];

  const rawSvg = createAvatar(avataaars, {
    seed: c.seed,
    style: ['default'],
    backgroundColor: [c.bg],
    skinColor: [SKIN_HEX[c.skin]],
    top: topOptions(c),
    topProbability: c.hairStyle === 'bald' ? 0 : 100,
    hairColor: [HAIR_HEX[c.hairColor]],
    hatColor: [hatColor],
    clothing: clothingOptions(c.clothing),
    clothesColor: [CLOTHES_HEX[c.clothesColor]],
    clothingGraphic: ['bat', 'bear', 'deer', 'diamond', 'pizza'],
    accessories,
    accessoriesProbability: accessories ? 100 : 0,
    facialHair,
    facialHairProbability: facialHair ? 100 : 0,
    facialHairColor: [c.hairColor !== 'none' ? HAIR_HEX[c.hairColor] : '2c1b18'],
    eyes: exp.eyes,
    eyebrows: exp.eyebrows,
    mouth: exp.mouth,
  }).toString();

  const cleanSvg = rawSvg.replace(/<metadata[\s\S]*?<\/metadata>/, '');
  const overlay = buildDetailOverlay(c);
  return overlay ? cleanSvg.replace('</svg>', `${overlay}</svg>`) : cleanSvg;
}
