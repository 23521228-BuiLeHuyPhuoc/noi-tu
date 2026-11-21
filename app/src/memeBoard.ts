import { MEME_LIST, type MemeId } from '../../shared/src/memes';
import type { VoicePersonaId } from '../../shared/src/types';
import { MEME_MOODS, PREVIEW_ONLY_MEMES, type MemeMood } from './memeMoods';

const definitions = [
  ['Chào sân / Vào lượt', ['greet', 'ready', 'chill']],
  ['Gáy / Khoe giàu', ['brag', 'rich']],
  ['Vui / Cảm ơn', ['laugh', 'gift', 'saved', 'mercy']],
  ['Buồn / Cháy túi', ['sad', 'broke', 'plea', 'out']],
  ['Quê / Chống chế', ['flop', 'excuse']],
  ['Sốc / Căng', ['shock', 'panic', 'danger', 'twist']],
  ['Cà khịa / Gắt', ['taunt', 'threat', 'accuse', 'hurry']],
  ['Chửi tục + lầy lội', ['laugh']],
] as const satisfies readonly (readonly [string, readonly MemeMood[]])[];

const profanity = /(?:^|[\s.,;:!?…“”"'()/-])(?:đụ|đĩ|lồn|địt|đéo|cặc|cứt|mẹ mày|lũ chó|con chó|chó đẻ)(?=$|[\s.,;:!?…“”"'()/-])/i;
const groups = definitions.map(([label, moods]) => {
  const ids = new Set<MemeId>(moods.flatMap((mood) => MEME_MOODS[mood]));
  if (label === 'Chửi tục + lầy lội') {
    for (const id of PREVIEW_ONLY_MEMES) ids.add(id);
    for (const line of MEME_LIST) if (profanity.test(line.quote)) ids.add(line.id);
  }
  return { label, ids };
});

export function groupsForVoice(voice: VoicePersonaId) {
  const mine = MEME_LIST.filter((line) => line.persona === voice);
  return groups.map(({ label, ids }) => ({ label, lines: mine.filter((line) => ids.has(line.id)) }))
    .filter((group) => group.lines.length > 0);
}
