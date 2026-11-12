import { edit } from './scratch-lib.mjs';
edit('server/src/room.ts', [[`import { AVATAR_PRESETS } from '../../shared/src/avatars';`, `import { AVATAR_PRESETS } from '../../shared/src/avatars';\nimport type { PlayerCosmetics } from '../../shared/src/shop';`]]);
edit('server/src/app.ts', [
[`import { WalletEvents } from './wallet';`, `import { WalletEvents } from './wallet';\nimport { FunQuota } from './shop';`],
[`  wallet?: WalletStore;
}`, `  wallet?: WalletStore;
  /** đồng hồ (ms) cho điểm danh và lượt chọc miễn phí; mặc định Date.now (test thay được) */
  now?: () => number;
}`],
[`  attachSocketHandlers(io, manager, auth, photos, { wallet, store, events: new WalletEvents() });`, `  const now = opts.now ?? Date.now;
  attachSocketHandlers(io, manager, auth, photos, { wallet, store, events: new WalletEvents(), now, quota: new FunQuota(now) });`],
]);
edit('server/src/socket.ts', [
[`import { attachWalletHandlers, type WalletContext } from './wallet';`, `import { attachWalletHandlers } from './wallet';
import { attachShopHandlers, chargeRuby, cosmeticsOf, type ShopContext } from './shop';
import { POKE_OVERFLOW_RUBY, STICKER_PACK_ID, isPaidSticker, shopItem, skillPrice } from '../../shared/src/shop';`],
[`photos: PhotoService = new PhotoService(), walletCtx?: WalletContext)`, `photos: PhotoService = new PhotoService(), walletCtx?: ShopContext)`],
[`        ? { avatar: user.avatar, avatarUrl: user.avatarUrl, account: true }`, `        ? { avatar: user.avatar, avatarUrl: user.avatarUrl, account: true, cosmetics: cosmeticsOf(user.equipped) }`],
[`      // vào socket room trước để nhận được room:state ngay sau khi thêm người chơi
      socket.join(room.code);`, `      // vào socket room trước để nhận được room:state ngay sau khi thêm người chơi
      const already = !!wanted && room.has(wanted);
      socket.join(room.code);`],
[`      socket.emit('chat:history', room.chatLog);
      return`, `      socket.emit('chat:history', room.chatLog);
      // hiệu ứng vào phòng (chỉ lần đầu vào, không phát lại khi nối lại)
      const fx = user?.equipped?.entrance;
      if (user && fx && !already) io.to(room.code).emit('fun:event', { kind: 'entrance', fx, id: ++funSeq, from: res.playerId });
      return`],
]);
