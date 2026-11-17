/**
 * Biên dịch kho icon vector SVG ngoại tuyến từ @iconify-json/fluent-emoji-flat và @iconify-json/game-icons.
 * Tự động quét mọi emoji đang dùng trong shared/src và app/src để tạo `app/src/iconPack.generated.ts`.
 * Chạy: npm run sync:icons (trong thư mục app/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(import.meta.dirname, '..');
const REPO = path.resolve(ROOT, '..');

const fluent = require('@iconify-json/fluent-emoji-flat/icons.json');
const fluentChars = require('@iconify-json/fluent-emoji-flat/chars.json');
const gameIcons = require('@iconify-json/game-icons/icons.json');

const FLUENT_VB = `0 0 ${fluent.width ?? 32} ${fluent.height ?? 32}`;
const GAME_VB = `0 0 ${gameIcons.width ?? 512} ${gameIcons.height ?? 512}`;

/** Ánh xạ tường minh cho chuỗi ghép, ký tự đặc biệt hoặc icon cần bản sắc đẹp hơn */
const FLUENT_OVERRIDES = {
  '🇬🇧': 'globe-showing-europe-africa',
  '🔤': 'input-latin-letters',
  '🏦': 'bank',
  '👑': 'crown',
  '💎': 'gem-stone',
  '🪙': 'coin',
  '⚜️': 'fleur-de-lis',
  '⚜': 'fleur-de-lis',
  '♂️': 'male-sign',
  '♂': 'male-sign',
  '♀️': 'female-sign',
  '♀': 'female-sign',
  '🏳️‍🌈': 'rainbow-flag',
  '🏳‍🌈': 'rainbow-flag',
  '🏳️': 'white-flag',
  '🏴‍☠️': 'pirate-flag',
  '🏴‍☠': 'pirate-flag',
  '●': 'red-circle',
  '•': 'black-circle',
  '✦': 'sparkles',
  '★': 'star',
  '◆': 'diamond-with-a-dot',
  '▲': 'red-triangle',
  '♥': 'heart-suit',
  '♥️': 'heart-suit',
  '♦️': 'diamond-suit',
  '♠️': 'spade-suit',
  '✔': 'check-mark-button',
  '▶': 'play-button',
  '◀': 'reverse-button',
  '❤': 'red-heart',
  '❤️': 'red-heart',
  '❤️‍🔥': 'heart-on-fire',
  '🌤️': 'sun-behind-small-cloud',
  '🏘️': 'houses',
  '🗝️': 'old-key',
  '🖼': 'framed-picture',
  '🖼️': 'framed-picture',
  '🗺': 'world-map',
  '🗺️': 'world-map',
  '🕵': 'detective',
  '🕵️': 'detective',
  '🗣': 'speaking-head',
  '⚖': 'balance-scale',
  '⚖️': 'balance-scale',
  '🏴': 'black-flag',
  '☠': 'skull-and-crossbones',
  '☠️': 'skull-and-crossbones',
  '⏭': 'next-track-button',
  '⏭️': 'next-track-button',
  '⏸': 'pause-button',
  '⏱': 'stopwatch',
  '⏱️': 'stopwatch',
  '🖍': 'crayon',
  '🖍️': 'crayon',
  '🖌': 'paintbrush',
  '🖌️': 'paintbrush',
  '👁': 'eye',
  '👁️': 'eye',
  '🌪': 'tornado',
  '🌪️': 'tornado',
  '🗑': 'wastebasket',
  '🗑️': 'wastebasket',
  '🌡': 'thermometer',
  '🏷': 'label',
  '🏷️': 'label',
  '🕷': 'spider',
  '🕷️': 'spider',
  '🕸': 'spider-web',
  '🕸️': 'spider-web',
  '🌩': 'cloud-with-lightning',
  '🌩️': 'cloud-with-lightning',
  '⛈': 'cloud-with-lightning-and-rain',
  '⛈️': 'cloud-with-lightning-and-rain',
  '🌧': 'cloud-with-rain',
  '🌧️': 'cloud-with-rain',
  '☀': 'sun',
  '☀️': 'sun',
  '❄': 'snowflake',
  '❄️': 'snowflake',
  '☃': 'snowman',
  '☃️': 'snowman',
  '⚔': 'crossed-swords',
  '⚔️': 'crossed-swords',
  '🛡': 'shield',
  '🛡️': 'shield',
  '🕯': 'candle',
  '🕯️': 'candle',
  '🕶': 'sunglasses',
  '🕶️': 'sunglasses',
  '🛍': 'shopping-bags',
  '🛍️': 'shopping-bags',
  '🛠': 'hammer-and-wrench',
  '🛠️': 'hammer-and-wrench',
  '🏍': 'motorcycle',
  '🏍️': 'motorcycle',
  '🏎': 'racing-car',
  '🏎️': 'racing-car',
  '🛩': 'small-airplane',
  '✈': 'airplane',
  '✈️': 'airplane',
  '🗞': 'rolled-up-newspaper',
  '🗞️': 'rolled-up-newspaper',
  '🎖': 'military-medal',
  '🎖️': 'military-medal',
  '🏵': 'rosette',
  '🏟': 'stadium',
  '🏘': 'houses',
  '🖐': 'hand-with-fingers-splayed',
  '🖐️': 'hand-with-fingers-splayed',
  '☺': 'smiling-face',
  '☺️': 'smiling-face',
  '♨': 'hot-springs',
  '⛱': 'umbrella-on-ground',
  '⛱️': 'umbrella-on-ground',
  '⛩': 'shinto-shrine',
  '🏔': 'snow-capped-mountain',
  '🏔️': 'snow-capped-mountain',
  '🏛': 'classical-building',
  '🏛️': 'classical-building',
  '🏙': 'cityscape',
  '🏙️': 'cityscape',
  '🏖': 'beach-with-umbrella',
  '🏖️': 'beach-with-umbrella',
  '🕳': 'hole',
  '🕳️': 'hole',
  '🗳': 'ballot-box-with-ballot',
  '🗳️': 'ballot-box-with-ballot',
  '🗒': 'spiral-notepad',
  '🗒️': 'spiral-notepad',
  '☄': 'comet',
  '☄️': 'comet',
  '🌶': 'hot-pepper',
  '🌶️': 'hot-pepper',
  '🌬': 'wind-face',
  '🧜‍♀️': 'mermaid',
  '🧑‍🚀': 'astronaut',
};

/** Bộ RPG Game Icons chọn lọc cho Ma Sói, Bom Chữ, Đấu Trường & Badges */
const CURATED_GAME_ICONS = [
  'wolf-head',
  'wolf-howl',
  'crystal-ball',
  'shield',
  'magic-potion',
  'potion-ball',
  'cauldron',
  'archer',
  'crosshair',
  'pierced-heart',
  'jester-hat',
  'farmer',
  'moon',
  'sun',
  'tombstone',
  'crown',
  'gem-pendant',
  'carnival-mask',
  'crowned-explosion',
  'time-bomb',
  'sword-brandish',
  'skull-crossed-bones',
  'treasure-map',
  'trophy-cup',
];

function stripVs(s) {
  return s.replace(/\uFE0F/g, '');
}

function toHexSequence(str) {
  return [...str].map((ch) => ch.codePointAt(0).toString(16)).join('-');
}

function resolveFluentKey(emoji) {
  const clean = emoji.trim();
  if (FLUENT_OVERRIDES[clean]) {
    const key = FLUENT_OVERRIDES[clean];
    if (fluent.icons[key]) return key;
  }
  const stripped = stripVs(clean);
  if (FLUENT_OVERRIDES[stripped]) {
    const key = FLUENT_OVERRIDES[stripped];
    if (fluent.icons[key]) return key;
  }
  const candidates = [
    toHexSequence(clean),
    toHexSequence(stripped),
    // Một số glyph có ZWJ hoặc FE0F ở giữa
    [...stripped].map((c) => c.codePointAt(0).toString(16)).filter((h) => h !== '200d').join('-'),
  ];
  for (const hex of candidates) {
    if (fluentChars[hex] && fluent.icons[fluentChars[hex]]) return fluentChars[hex];
  }
  return null;
}

const SCAN_DIRS = [path.join(REPO, 'shared/src'), path.join(REPO, 'app/src')];
const EMOJI_RE =
  /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}\uFE0F?)*|[🇦-🇿]{2}|[♠♥♦♣]\uFE0F?|[✦◆★▲△●◈✔▶◀♂♀☺☠♨⛩⛱⛈⛷⛏⚔⚖⚒⚗⚙⚛⚜⚠⚡❇❄☄✨⭐🌟🎀🎁🎂🎃🎄🎆🎇🎈🎉🎊🎋🎍🎎🎏🎐🎑🎒🎓🎙🎚🎛🎟🎠🎡🎢🎣🎤🎥🎦🎧🎨🎩🎪🎫🎬🎭🎮🎯🎰🎱🎲🎳🎴🎵🎶🎷🎸🎹🎺🎻🎼🎽🎾🎿🏀🏁🏂🏃🏄🏅🏆🏇🏈🏉🏊🏋🏌🏍🏎🏏🏐🏑🏒🏓🏔🏕🏖🏗🏘🏙🏚🏛🏜🏝🏞🏟🏠🏡🏢🏣🏤🏥🏦🏧🏨🏩🏪🏫🏬🏭🏮🏯🏰🏳🏴🏵🏷🏸🏹🏺🏻🏼🏽🏾🏿]+/gu;

const discovered = new Set([
  ...Object.keys(FLUENT_OVERRIDES),
  '💎', '🪙', '👑', '🥇', '🥈', '🥉', '🏆', '⚡', '🔥', '🌸', '🐉', '❄️', '💠', '🦅', '🌌',
  '🦋', '🪐', '🦊', '🐱', '🐶', '🦄', '🛸', '🐺', '🕵️', '🎨', '💣', '🧠', '🔤', '🇬🇧',
  '🦀', '🏦', '🎲', '🥣', '🎭', '✨', '🌟', '🎉', '🎊', '❤️', '💔', '🛡️', '🔮', '🧪', '🏹', '💘',
  '🤡', '👨‍🌾', '🌙', '☀️', '💀', '📜', '🔒', '✏️', '💤', '🐷', '👶', '🗿', '💨', '🔌', '🧊', '😘',
  '🗣️', '⏳', '🗺️', '🛍️', '🎁', '📅', '💬', '🚪', '🏅', '🎖️', '🚀', '🏎️', '🏰', '🏝️', '🛥️', '🛩️',
]);

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(ent.name) && !ent.name.endsWith('.generated.ts')) {
      const txt = fs.readFileSync(full, 'utf8');
      for (const m of txt.matchAll(EMOJI_RE)) discovered.add(m[0]);
    }
  }
}
SCAN_DIRS.forEach(walk);

const usedFluentKeys = new Set();
const emojiToKey = {};
const unresolved = [];

for (const em of [...discovered].sort()) {
  const key = resolveFluentKey(em);
  if (key) {
    usedFluentKeys.add(key);
    emojiToKey[stripVs(em)] = key;
    if (em !== stripVs(em)) emojiToKey[em] = key;
  } else {
    unresolved.push(em);
  }
}

// Thêm các biểu tượng cơ bản bổ sung phòng fallback
for (const extra of ['sparkles', 'star', 'crown', 'gem-stone', 'coin', 'trophy', 'game-die']) {
  if (fluent.icons[extra]) usedFluentKeys.add(extra);
}

const fluentEntries = {};
for (const k of [...usedFluentKeys].sort()) {
  const def = fluent.icons[k];
  if (def?.body) {
    fluentEntries[k] = { v: def.left || def.top || def.width || def.height ? `${def.left ?? 0} ${def.top ?? 0} ${def.width ?? 32} ${def.height ?? 32}` : FLUENT_VB, b: def.body };
  }
}

const gameEntries = {};
for (const k of CURATED_GAME_ICONS) {
  const def = gameIcons.icons[k];
  if (def?.body) {
    gameEntries[k] = { v: GAME_VB, b: def.body };
  } else {
    console.warn(`WARN: game-icons missing "${k}"`);
  }
}

const out = `// TỰ ĐỘNG SINH BỞI scripts/sync-iconify-pack.mjs — KHÔNG SỬA TRỰC TIẾP.
// Nguồn: @iconify-json/fluent-emoji-flat (MIT, Microsoft Fluent Emoji) & @iconify-json/game-icons (CC BY 3.0)

export interface VectorDef {
  /** viewBox "x y w h" */
  readonly v: string;
  /** nội dung SVG bên trong <svg> */
  readonly b: string;
}

export const FLUENT_ICONS: Record<string, VectorDef> = ${JSON.stringify(fluentEntries, null, 2)};

export const GAME_ICONS: Record<string, VectorDef> = ${JSON.stringify(gameEntries, null, 2)};

export const EMOJI_TO_FLUENT: Record<string, string> = ${JSON.stringify(emojiToKey, null, 2)};
`;

const outPath = path.join(ROOT, 'src', 'iconPack.generated.ts');
fs.writeFileSync(outPath, out, 'utf8');

console.log(`Generated ${outPath}`);
console.log(`Fluent icons bundled: ${Object.keys(fluentEntries).length}`);
console.log(`Game-icons bundled: ${Object.keys(gameEntries).length}`);
console.log(`Emoji mappings: ${Object.keys(emojiToKey).length}`);
if (unresolved.length) {
  console.log(`Unresolved emojis (${unresolved.length}):`, unresolved.join(' '));
} else {
  console.log('All discovered emojis resolved cleanly!');
}
