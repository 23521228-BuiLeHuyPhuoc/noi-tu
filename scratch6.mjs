import { edit } from './scratch-lib.mjs';
edit('server/src/shop.ts', [[`new RateLimiter(6, 1500)`, `new RateLimiter(12, 600)`]]);
edit('server/src/socket.ts', [[`      if (cost > 0) {
        if (!user || !walletCtx) return`, `      if (cost > 0) {
        // người nhận không hợp lệ thì từ chối ngay, không đụng tới ví
        const r0 = currentRoom();
        if (!r0 || !session || r0.isSpectator(session.playerId) || ('to' in f && (!r0.has(f.to) || f.to === session.playerId))) return reply({ ok: false });
        if (!user || !walletCtx) return`]]);
