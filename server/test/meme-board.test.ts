import { describe, expect, it, vi } from 'vitest';
import { MEME_LIST } from '../../shared/src/memes';
import { VOICE_PERSONA_IDS } from '../../shared/src/types';
import { groupsForVoice } from '../../app/src/memeBoard';
import { PREVIEW_ONLY_MEMES } from '../../app/src/memeMoods';
import { setup } from './helpers';

describe('Bảng giọng trong phòng', () => {
  it.each(VOICE_PERSONA_IDS)('%s: đủ nhóm, không thiếu câu hay lẫn giọng', (voice) => {
    const groups = groupsForVoice(voice);
    expect(groups.length).toBeGreaterThanOrEqual(6);
    const mine = MEME_LIST.filter((line) => line.persona === voice);
    expect(new Set(groups.flatMap((group) => group.lines))).toEqual(new Set(mine));
    for (const { lines } of groups) {
      expect(lines.length).toBeGreaterThan(0);
      expect(new Set(lines).size).toBe(lines.length);
    }
  });

  it('Cô Ba: giữ cả những câu chỉ được bấm tay', () => {
    const group = groupsForVoice('coba').find(({ label }) => label === 'Chửi tục + lầy lội');
    const preview = PREVIEW_ONLY_MEMES.filter((id) => id.startsWith('coba_'));
    expect(preview.length).toBeGreaterThan(0);
    expect(group?.lines.map((line) => line.id)).toEqual(expect.arrayContaining(preview));
  });

  it('kiểm tra người, giọng và mã trước khi tính thời gian chờ', () => {
    const { room, ids: [first, other] } = setup(['An', 'Bình']);
    const clock = vi.spyOn(Date, 'now');
    try {
      clock.mockReturnValue(10000);
      expect(room.takeMeme(first, 'linda_chao')).toBe(false);
      room.pickVoice(first, 'linda');
      room.pickVoice(other, 'coba');
      expect(room.takeMeme('unknown', 'linda_chao')).toBe(false);
      expect(room.takeMeme(first, null)).toBe(false);
      expect(room.takeMeme(first, 'linda_not_a_line')).toBe(false);
      expect(room.takeMeme(first, 'coba_muonchoi')).toBe(false);
      expect(room.takeMeme(first, 'linda_chao')).toBe(true);
      expect(room.takeMeme(other, 'coba_muonchoi')).toBe(true);
      clock.mockReturnValue(11999);
      expect(room.takeMeme(first, 'linda_level')).toBe(false);
      clock.mockReturnValue(12000);
      expect(room.takeMeme(first, 'linda_level')).toBe(true);
    } finally {
      clock.mockRestore();
      room.dispose();
    }
  });
});
