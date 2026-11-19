/**
 * Bộ render chân dung SVG siêu sắc nét cho game Đoán Ai Đây? (`who_is_it`)
 * dùng `@dicebear/core` + `@dicebear/collection` (`avataaars`) kèm lớp phủ chi tiết
 * (bông tai vàng, má hồng, tàn nhang) đồng bộ 100% với 32 đặc điểm câu hỏi.
 */
import { createAvatar, type Style } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';
import type { WhoIsItCharacter } from '../../shared/src/whoisit';

type AvataaarsOpts = typeof avataaars extends Style<infer O> ? Partial<O> : never;
type TopKey = NonNullable<AvataaarsOpts['top']>[number];
type ClothingKey = NonNullable<AvataaarsOpts['clothing']>[number];
type EyesKey = NonNullable<AvataaarsOpts['eyes']>[number];
type BrowsKey = NonNullable<AvataaarsOpts['eyebrows']>[number];
type MouthKey = NonNullable<AvataaarsOpts['mouth']>[number];
type AccKey = NonNullable<AvataaarsOpts['accessories']>[number];
type BeardKey = NonNullable<AvataaarsOpts['facialHair']>[number];

const portraitCache = new Map<string, string>();

function buildDetailOverlay(c: WhoIsItCharacter): string {
  const parts: string[] = [];
  if (c.earrings) {
    // Khuyên tai tròn vàng sáng rõ hai bên dái tai (viewBox 280x280)
    parts.push(
      `<circle cx="84" cy="142" r="5.5" fill="none" stroke="#F59E0B" stroke-width="3.2"/>`,
      `<circle cx="196" cy="142" r="5.5" fill="none" stroke="#F59E0B" stroke-width="3.2"/>`,
      `<circle cx="84" cy="147.5" r="2.2" fill="#FEF08A"/>`,
      `<circle cx="196" cy="147.5" r="2.2" fill="#FEF08A"/>`,
    );
  }
  if (c.blush) {
    parts.push(
      `<ellipse cx="101" cy="136" rx="9" ry="5" fill="#FB7185" opacity="0.58"/>`,
      `<ellipse cx="179" cy="136" rx="9" ry="5" fill="#FB7185" opacity="0.58"/>`,
    );
  }
  if (c.freckles) {
    parts.push(
      `<circle cx="103" cy="133" r="2.1" fill="#92400E" opacity="0.72"/>`,
      `<circle cx="110" cy="136" r="2" fill="#92400E" opacity="0.72"/>`,
      `<circle cx="106" cy="140" r="2" fill="#92400E" opacity="0.72"/>`,
      `<circle cx="177" cy="133" r="2.1" fill="#92400E" opacity="0.72"/>`,
      `<circle cx="170" cy="136" r="2" fill="#92400E" opacity="0.72"/>`,
      `<circle cx="174" cy="140" r="2" fill="#92400E" opacity="0.72"/>`,
    );
  }
  if (c.scar) {
    // Vết sẹo ngang má trái (rất rõ kể cả khi thu nhỏ trên lưới 48 thẻ)
    parts.push(
      `<path d="M98 144 L120 158" stroke="#991B1B" stroke-width="3.6" stroke-linecap="round"/>`,
      `<path d="M103 142 L100 150 M111 147 L108 155 M118 152 L115 160" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round"/>`,
    );
  }
  if (c.bow) {
    // Nơ đỏ/hồng nổi bật cài bên mái tóc
    parts.push(
      `<path d="M186 72 L168 58 L168 82 Z" fill="#F43F5E" stroke="#881337" stroke-width="2.4" stroke-linejoin="round"/>`,
      `<path d="M186 72 L205 60 L203 84 Z" fill="#F43F5E" stroke="#881337" stroke-width="2.4" stroke-linejoin="round"/>`,
      `<circle cx="186" cy="72" r="5" fill="#FDA4AF" stroke="#881337" stroke-width="2.2"/>`,
    );
  }
  return parts.join('');
}

export function whoIsItPortraitUri(c: WhoIsItCharacter): string {
  const hit = portraitCache.get(c.id);
  if (hit) return hit;

  const v = c.visual;
  const rawSvg = createAvatar(avataaars, {
    seed: c.id,
    style: ['default'],
    backgroundColor: [v.bgColor],
    skinColor: [v.skinColor],
    top: [v.top as TopKey],
    topProbability: v.bald ? 0 : 100,
    hairColor: [v.hairColor],
    hatColor: [v.hatColor ?? '262e33'],
    clothing: [v.clothing as ClothingKey],
    clothesColor: [v.clothesColor],
    clothingGraphic: ['diamond'],
    accessories: v.accessories ? [v.accessories as AccKey] : undefined,
    accessoriesProbability: v.accessories ? 100 : 0,
    facialHair: v.facialHair ? [v.facialHair as BeardKey] : undefined,
    facialHairProbability: v.facialHair ? 100 : 0,
    facialHairColor: [v.facialHairColor ?? '2c1b18'],
    eyes: [v.eyes as EyesKey],
    eyebrows: [v.eyebrows as BrowsKey],
    mouth: [v.mouth as MouthKey],
  }).toString();

  const cleanSvg = rawSvg.replace(/<metadata[\s\S]*?<\/metadata>/, '');
  const overlay = buildDetailOverlay(c);
  const finalSvg = overlay ? cleanSvg.replace('</svg>', `${overlay}</svg>`) : cleanSvg;
  const uri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(finalSvg)}`;

  portraitCache.set(c.id, uri);
  return uri;
}
