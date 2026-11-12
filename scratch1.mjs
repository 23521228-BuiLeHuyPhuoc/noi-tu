import { edit } from './scratch-lib.mjs';
edit('server/src/fun.ts', [
[`  if (f.kind === 'charm') return { kind: 'charm' };`, `  if (f.kind === 'charm') return { kind: 'charm' };
  if ((SKILL_IDS as readonly string[]).includes(f.kind as string) && typeof f.to === 'string') {
    return { kind: f.kind as SkillId, to: f.to };
  }
  if (f.kind === 'gift' && typeof f.to === 'string' && (GIFT_IDS as readonly string[]).includes(f.gift as string)) {
    return { kind: 'gift', to: f.to, gift: f.gift as GiftId };
  }`],
[`import {
  DISRUPT_LIMIT`, `import { GIFT_IDS, SKILL_IDS, type GiftId, type SkillId } from '../../shared/src/shop';
import {
  DISRUPT_LIMIT`],
]);
edit('server/src/room.ts', [
[`  account: boolean;
  /** người chơi đã tự chỉnh`, `  account: boolean;
  /** trang trí đã trang bị (tài khoản) */
  cosmetics?: PlayerCosmetics;
  /** người chơi đã tự chỉnh`],
[`profile?: { avatar?: number; avatarUrl?: string; account?: boolean }): Result<{ playerId: string }> {`, `profile?: { avatar?: number; avatarUrl?: string; account?: boolean; cosmetics?: PlayerCosmetics }): Result<{ playerId: string }> {`],
[`    if (existing) {
      this.setConnected(existing.id, true);
      return { ok: true, playerId: existing.id };`, `    if (existing) {
      if (account) this.setCosmetics(existing.id, profile?.cosmetics);
      this.setConnected(existing.id, true);
      return { ok: true, playerId: existing.id };`],
[`avatarUrl: profile?.avatarUrl, character, account });`, `avatarUrl: profile?.avatarUrl, character, account, ...(profile?.cosmetics ? { cosmetics: profile.cosmetics } : {}) });`],
[`  /** người chơi dính chiêu làm rung`, `  /** trang trí vừa đổi (trang bị / gỡ): cập nhật cho cả phòng */
  setCosmetics(playerId: string, cosmetics: PlayerCosmetics | undefined): void {
    const p = this.find(playerId);
    if (!p) return;
    if (JSON.stringify(p.cosmetics ?? null) === JSON.stringify(cosmetics ?? null)) return;
    if (cosmetics) p.cosmetics = cosmetics;
    else delete p.cosmetics;
    this.changed();
  }

  /** người chơi dính chiêu làm rung`],
[`        ...(p.account ? { account: true } : {}),
        ...(p.bot`, `        ...(p.account ? { account: true } : {}),
        ...(p.cosmetics ? { cosmetics: p.cosmetics } : {}),
        ...(p.bot`],
]);
