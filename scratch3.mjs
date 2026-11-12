import { readFileSync, writeFileSync } from 'node:fs';
const p = 'server/src/socket.ts';
const raw = readFileSync(p, 'utf8');
const crlf = raw.includes('\r');
let s = raw.split('\r').join('');
const a = s.indexOf("    // ném dép, khịa, hối, thả emoji");
const b = s.indexOf("    // ---------- tài khoản ----------");
if (a < 0 || b < 0) throw new Error('markers');
const block = `    // khóa đếm lượt chọc miễn phí: id người chơi (tài khoản: "u-" + id)
    const quotaKey = () => (user ? ACCOUNT_PREFIX + user.id : session?.playerId ?? null);

    // ném dép, khịa, hối, thả emoji, đánh nhau, kỹ năng trả Ruby, tặng quà: phát cho cả phòng, có giới hạn tần suất chống spam
    socket.on('fun:send', (raw, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      sendFun(raw, reply).catch((e) => {
        console.error('fun error', e);
        reply({ ok: false });
      });
    });

    const sendFun = async (raw: unknown, reply: (r: FunAck) => void): Promise<void> => {
      const f = cleanFun(raw);
      if (!f) return reply({ ok: false });
      // phí: kỹ năng và quà trả Ruby mỗi lần; các chiêu còn lại (trừ emoji) có 30 lượt miễn phí mỗi ngày rồi 1 Ruby / lần
      const price = f.kind === 'gift' ? shopItem(f.gift)?.price : skillPrice(f.kind);
      const metered = price === undefined && f.kind !== 'emoji';
      const key = quotaKey();
      const free = metered && key !== null && !!walletCtx && walletCtx.quota.left(key) > 0;
      const cost = price ?? (metered && !free ? POKE_OVERFLOW_RUBY : 0);
      const noRuby = price !== undefined ? 'need_ruby' as const : 'quota' as const;
      if (cost > 0) {
        if (!user || !walletCtx) return reply({ ok: false, reason: price !== undefined ? 'need_account' : 'quota' });
        // kiểm tra số dư trước khi giữ lượt giới hạn của ai khác
        if ((await walletCtx.wallet.balance(user.id)) < cost) return reply({ ok: false, reason: noRuby });
      }
      // từ đây tới lúc phát là đồng bộ (trừ lần trừ Ruby cuối): kiểm tra lại phòng vì có thể đã đổi trong lúc chờ
      const room = currentRoom();
      if (!room || !session || room.isSpectator(session.playerId)) return reply({ ok: false });
      if ('to' in f && (!room.has(f.to) || f.to === session.playerId)) return reply({ ok: false });
      if (!limiter.take()) return reply({ ok: false, reason: 'busy' });
      // chiêu làm rung/lắc/che màn hình: mỗi người chỉ nhận 3 lần mỗi 15 giây, mỗi người gửi 3 lần mỗi 15 giây.
      // Quá giới hạn: chiêu chỉ để phá (rung, xoay, sụp nguồn, gián, mực, hối...) bị chặn; đánh/ném vẫn bay tới avatar nhưng không rung màn hình.
      const target = 'to' in f ? f.to : null;
      const disruptive = target !== null && isDisruptive(f);
      const hard = isHardDisrupt(f.kind);
      let soft = false;
      if (disruptive) {
        const wait = room.disruptLimiter.wait(target);
        if (hard) {
          const retryMs = Math.max(wait, disruptSender.wait('me'));
          if (retryMs > 0) return reply({ ok: false, reason: 'limited', retryMs });
        } else soft = wait > 0;
      }
      if (isTroll(f.kind)) {
        if (!trollLimiter.take()) return reply({ ok: false, reason: 'busy' });
        if (isScreenTroll(f.kind) && target && !room.screenCooldown.take(target)) return reply({ ok: false, reason: 'busy' });
      }
      if (disruptive && !soft) {
        room.disruptLimiter.take(target);
        if (hard) disruptSender.take('me');
      }
      const from = session.playerId;
      let left: number | undefined;
      if (metered && key !== null && walletCtx) {
        if (free) walletCtx.quota.consume(key);
        left = walletCtx.quota.left(key);
      }
      if (cost > 0 && user && walletCtx) {
        const ref = f.kind === 'gift' ? f.gift : price !== undefined ? f.kind : 'poke_' + f.kind;
        const balance = await chargeRuby(walletCtx, user.id, cost, f.kind === 'gift' ? 'gift' : 'skill', ref);
        if (balance === null) return reply({ ok: false, reason: noRuby });
      }
      const extra = f.kind === 'hit' ? room.hp.hit(f.to, f.move) : trollExtras(f);
      // người đang tới lượt Nối từ được bù lại thời gian bị phá
      const pausedMs = disruptive && !soft ? room.disrupt(target, pauseMsOf(f, extra)) : 0;
      io.to(room.code).emit('fun:event', {
        ...f, ...extra, ...(soft ? { soft: true } : {}), ...(pausedMs ? { pausedMs } : {}), id: ++funSeq, from,
      });
      // người nhận quà có tài khoản được cộng điểm quà (không nhận Ruby)
      if (f.kind === 'gift' && price !== undefined && f.to.startsWith(ACCOUNT_PREFIX)) {
        walletCtx?.store.addGiftPoints(f.to.slice(ACCOUNT_PREFIX.length), price).catch((e) => console.error('giftPoints', e));
      }
      reply({ ok: true, ...(left !== undefined ? { left } : {}) });
    };

    socket.on('fun:quota', (ack) => {
      if (typeof ack !== 'function') return;
      const key = quotaKey();
      const free = walletCtx?.quota.free ?? 0;
      ack({ free, left: key !== null && walletCtx ? walletCtx.quota.left(key) : free });
    });

    socket.on('chat:send', (p, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const room = currentRoom();
      if (!room || !session || !p || typeof p !== 'object' || room.isSpectator(session.playerId)) return reply({ ok: false });
      if (!chatLimiter.take()) return reply({ ok: false });
      const pid = session.playerId;
      const post = () => {
        const r = currentRoom();
        if (!r || session?.playerId !== pid) return reply({ ok: false });
        const msg = r.addChat(pid, p);
        if (!msg) return reply({ ok: false });
        io.to(r.code).emit('chat:msg', msg);
        reply({ ok: true });
      };
      // sticker của bộ trả phí: chỉ người đã mua bộ mới gửi được (kiểm tra theo kho mới nhất của tài khoản)
      if (p.kind === 'sticker' && isPaidSticker(String(p.stickerId))) {
        if (!user || !walletCtx) return reply({ ok: false });
        walletCtx.store.userById(user.id).then(
          (u) => (u?.owned?.includes(STICKER_PACK_ID) ? post() : reply({ ok: false })),
          () => reply({ ok: false }),
        );
        return;
      }
      post();
    });

`;
s = s.slice(0, a) + block + s.slice(b);
const rep = (x, y) => { if (!s.includes(x)) throw new Error('missing ' + x.slice(0, 50)); s = s.replace(x, () => y); };
rep(`import type { AuthAck, ClientToServerEvents, GameType, ServerToClientEvents }`, `import type { AuthAck, ClientToServerEvents, FunAck, GameType, ServerToClientEvents }`);
rep(`      if (room && session?.playerId === ACCOUNT_PREFIX + updated.id)
        room.updateProfile(session.playerId, updated.displayName, updated.avatar, updated.avatarUrl);`, `      if (room && session?.playerId === ACCOUNT_PREFIX + updated.id) {
        room.updateProfile(session.playerId, updated.displayName, updated.avatar, updated.avatarUrl);
        room.setCosmetics(session.playerId, cosmeticsOf(updated.equipped));
      }`);
rep(`    const detachWallet = walletCtx ? attachWalletHandlers(socket, walletCtx, () => user) : () => {};`, `    const detachWallet = walletCtx ? attachWalletHandlers(socket, walletCtx, () => user) : () => {};
    // cửa hàng + điểm danh: trang bị đổi thì báo mọi máy của tài khoản (cập nhật hồ sơ trong phòng)
    if (walletCtx) attachShopHandlers(socket, walletCtx, () => user, (u) => auth.profiles.emit('updated', u));`);
writeFileSync(p, crlf ? s.split('\n').join('\r\n') : s);
