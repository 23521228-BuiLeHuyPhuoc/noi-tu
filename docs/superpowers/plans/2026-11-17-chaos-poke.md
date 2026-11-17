# Chọc loạn xạ (admin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin bấm 🌪️ trên thanh trên là mọi người khác trong phòng dính một món chọc ngẫu nhiên, trừ 💎20 mỗi lần bấm.

**Architecture:** Lệnh socket mới `fun:chaos` ở server (kiểm tra admin, giới hạn tốc độ, trừ Ruby một lần, phát loạt `fun:event` kiểu `poke` có `chaos: true`). App thêm icon trên thanh trên của `Shell` và nút nhỏ trong hàng nút của Tỷ phú. `PokeLayer` hiện hiệu ứng như cũ nhưng bớt thông báo/tiếng cho người đứng xem.

**Tech Stack:** Node + socket.io + vitest (server), Expo React Native Web (app), TypeScript dùng chung `shared/src`.

**Spec:** `docs/superpowers/specs/2026-11-17-chaos-poke-design.md`

## Global Constraints
- Chỉ tài khoản có `isAdmin(user.username)` (biến `ADMIN_USERNAMES`) gọi được; app chỉ hiện nút khi `game.user?.admin`.
- Giá: `CHAOS_POKE_RUBY = 20`, trừ một lần mỗi lần bấm qua `chargeRuby(ctx, userId, 20, 'skill', 'chaos')`.
- Người bị chọc: mọi người khác trong phòng có `connected === true` (kể cả máy), không có người bấm.
- Người đang chạm giới hạn `room.disruptLimiter` chỉ nhận món không phủ màn hình (`!isHardPoke`), món gây rung thì gắn `soft: true`.
- Giới hạn tốc độ người bấm: `new RateLimiter(3, 333)` mỗi socket.
- Icon 🌪️ đặt sau tên trò chơi, trước ✏️; ở Tỷ phú đặt ngay sau 😈.
- Lint React Compiler của app phải qua; không thêm thư viện.

## Review Focus
- Admin bấm khi phòng chỉ còn mình (người khác mất mạng): phải trả `empty`, không trừ Ruby. Test ở Task 2.
- Admin đang là người xem (spectator) giữa ván: vẫn dùng được, vì đây là công cụ admin. Test ở Task 2.
- Người thường/khách tự gửi `fun:chaos` qua socket: trả `forbidden`, không ai nhận sự kiện. Test ở Task 2.
- Bấm dồn dập 5 lần liền: 3 lần đầu qua, sau đó `busy`, chỉ trừ Ruby cho lần qua. Test ở Task 2.
- Người đứng xem trong phòng 8 người khi admin spam: không bị dồn 7 dòng thông báo mỗi lần bấm. Kiểm bằng mắt ở Task 3 (PokeLayer chỉ báo cho người bị chọc).

---

### Task 1: Kiểu dữ liệu chung + hàm bốc món

**Files:**
- Modify: `shared/src/shop.ts` (sau `POKE_OVERFLOW_RUBY`)
- Modify: `shared/src/types.ts` (`FunEvent`, `FunAck` khu vực ~520–545, `ClientToServerEvents` ~675)
- Modify: `server/src/fun.ts`
- Test: `server/test/pokes.test.ts`

**Interfaces:**
- Produces:
  - `export const CHAOS_POKE_RUBY = 20;` (`shared/src/shop.ts`)
  - `export type ChaosAck = { ok: true; hit: number; cost: number; balance: number } | { ok: false; reason: 'forbidden' | 'empty' | 'need_ruby' | 'busy' };`
  - `FunEvent.chaos?: true`
  - `ClientToServerEvents['fun:chaos']: (ack: (r: ChaosAck) => void) => void`
  - `export function pickChaosPoke(limited: boolean, rng: () => number = Math.random): PokeItem` (`server/src/fun.ts`)

- [ ] **Step 1: Viết test hỏng** trong `server/test/pokes.test.ts`:

```ts
describe('pickChaosPoke', () => {
  it('chưa chạm giới hạn: bốc đều trên cả kho (rng 0 → món đầu, rng gần 1 → món cuối)', () => {
    expect(pickChaosPoke(false, () => 0)).toBe(POKES[0]);
    expect(pickChaosPoke(false, () => 0.999999)).toBe(POKES[POKES.length - 1]);
  });
  it('đã chạm giới hạn: không bao giờ ra món phủ màn hình', () => {
    for (let i = 0; i < 200; i++) expect(isHardPoke(pickChaosPoke(true, () => i / 200))).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy** `cd server && npx vitest run test/pokes.test.ts` → FAIL (`pickChaosPoke` chưa có).
- [ ] **Step 3: Thêm hằng, kiểu và `pickChaosPoke`** (danh sách món nhẹ tính một lần ở cấp module: `POKES.filter((p) => !isHardPoke(p))`).
- [ ] **Step 4: Chạy lại** cùng lệnh → PASS; `npx tsc --noEmit` trong `server` → không lỗi.

### Task 2: Lệnh socket `fun:chaos`

**Files:**
- Modify: `server/src/socket.ts` (cạnh `fun:send`, ~dòng 240)
- Create: `server/test/chaos.test.ts` (chép khung khởi động/`account`/`fund`/`balance`/`client` từ `server/test/shop.test.ts`; `ADMIN_USERNAMES='boss'`, `ALLOW_MEMORY_ADMIN='1'`)

**Interfaces:**
- Consumes: `pickChaosPoke`, `CHAOS_POKE_RUBY`, `ChaosAck`, `isAdmin` (`server/src/admin.ts`), `isDisruptive`, `isHardFx`, `pauseMsOf`, `trollExtras`, `chargeRuby`.

Thứ tự xử lý trong handler: `user && isAdmin(user.username)` ? → `currentRoom()` có ? (không thì `empty`) → `chaosLimiter.take()` ? (không thì `busy`) → có người khác `connected` ? (không thì `empty`) → `wallet.balance >= 20` ? (không thì `need_ruby`) → lấy lại phòng + danh sách người bị chọc (đồng bộ) → với từng người: `limited = room.disruptLimiter.wait(id) > 0`, `item = pickChaosPoke(limited)`, `f = { kind: 'poke', to: id, poke: item.id }`, nếu `isDisruptive(f)`: chưa limited thì `disruptLimiter.take(id)` và `pausedMs = room.disrupt(id, pauseMsOf(f))`, limited thì `soft: true` → `chargeRuby` (null thì `need_ruby`) → phát từng `fun:event` `{ ...f, ...trollExtras(f), chaos: true, id: ++funSeq, from }` → `ack({ ok: true, hit, cost: 20, balance })`. Lỗi bất ngờ: log và `ack({ ok: false, reason: 'busy' })`.

- [ ] **Step 1: Viết test hỏng** trong `server/test/chaos.test.ts`:
  - `'người thường và khách bị từ chối, không ai nhận sự kiện'`: khách và `anvui` gửi `fun:chaos` → `{ ok: false, reason: 'forbidden' }`; sau `wait(50)` mọi client có `funs.length === 0`.
  - `'admin chọc cả phòng: trừ 20 một lần, mỗi người khác nhận đúng một món'`: `boss` tạo phòng, `an`, `bi` vào; `fund(boss,'boss',100)`; ack `toMatchObject({ ok: true, hit: 2, cost: 20, balance: 80 })`; sự kiện `chaos` nhận được có `to` là `{an.pid, bi.pid}` (mỗi người một lần, không có `boss.pid`), mọi sự kiện `from === boss.pid`, `kind === 'poke'`, `pokeItem(e.poke)` có giá trị; `balance(boss) === 80`.
  - `'phòng chỉ còn admin: empty, không trừ'`: `boss` một mình (hoặc `bi` đã ngắt kết nối và chờ 50 ms) → `{ ok: false, reason: 'empty' }`, số dư giữ 100.
  - `'thiếu Ruby: need_ruby, không ai bị chọc'`: số dư 10 → `need_ruby`, không có sự kiện.
  - `'người đã chạm giới hạn chỉ nhận món nhẹ'`: gọi `server.manager.get(code)!.disruptLimiter.take(an.pid)` 3 lần; bấm → sự kiện tới `an` có `isHardPoke(pokeItem(e.poke)!) === false` và không có `pausedMs`.
  - `'bấm dồn 5 lần: 3 lần qua rồi busy, chỉ trừ cho lần qua'`: 5 ack gửi song song → đúng 3 `ok`, 2 `busy`; số dư `100 - 60`.
  - `'admin đang là người xem vẫn chọc được'`: dùng phòng đang chơi, admin vào sau thành người xem → `ok: true`.
- [ ] **Step 2: Chạy** `cd server && npx vitest run test/chaos.test.ts` → FAIL.
- [ ] **Step 3: Viết handler** theo thứ tự ở trên; `chaosLimiter = new RateLimiter(3, 333)` khai báo cạnh các limiter khác trong `io.on('connection')`.
- [ ] **Step 4: Chạy** `npx vitest run` (toàn bộ) + `npx tsc --noEmit` + `npm run build` trong `server` → tất cả PASS.

### Task 3: Nút trong app + hiệu ứng gọn

**Files:**
- Modify: `app/src/useGame.ts` (khai báo `Game` ~dòng 68, cài đặt ~dòng 511)
- Modify: `app/src/components/Shell.tsx` (`ShellTools`, thanh trên)
- Modify: `app/src/components/TyPhuCenter.tsx` (`toolCount` ~dòng 310, hàng `MiniBtn`)
- Modify: `app/src/components/PokeFx.tsx` (`PokeLayer`, ~dòng 772–795)

**Interfaces:**
- Consumes: `ChaosAck`, `CHAOS_POKE_RUBY`, `FunEvent.chaos`.
- Produces: `Game.sendChaos(): Promise<ChaosAck>` (mất kết nối → `{ ok: false, reason: 'busy' }`); `ShellTools.chaos?: () => void` (chỉ có khi admin).

- [ ] **Step 1: `sendChaos`** trong `useGame` theo mẫu `sendFun` (`emitWithAck('fun:chaos')`).
- [ ] **Step 2: Thanh trên của `Shell`**: khi `game.user?.admin`, chèn `IconButton testID="chaos-btn" icon="🌪️" label="Chọc loạn xạ cả phòng (💎20)"` ngay sau tên/biểu tượng trò chơi, trước ✏️. Hàm `chaos` dùng chung cho cả `ShellTools.chaos`: gọi `sendChaos`; `ok` → tăng một bộ đếm để hiện chữ `-💎20` bay lên từ icon (Animated, ~700 ms, `pointerEvents="none"`, không chặn lần bấm sau); lỗi → `feed`: `need_ruby` "Không đủ 💎20 để chọc loạn xạ", `empty` "Phòng chưa có ai để chọc", `forbidden` "Chỉ admin dùng được", `busy` không báo.
- [ ] **Step 3: Tỷ phú**: `toolCount` cộng 1 khi `tools?.chaos`; thêm `MiniBtn testID="chaos-btn" icon="🌪️"` ngay sau 😈.
- [ ] **Step 4: `PokeLayer`**: với `e.chaos`, chỉ `feed` khi `toMe` (chữ mở đầu `🌪️`). Người không phải người bị chọc chỉ nghe tiếng nếu đã qua 300 ms kể từ lần phát tiếng chaos trước (`useRef` lưu mốc thời gian).
- [ ] **Step 5: Kiểm tra** `cd app && npx tsc --noEmit && CI=1 EXPO_OFFLINE=1 npx expo lint` → không lỗi.
- [ ] **Step 6: Xem thật trên trình duyệt**: server local (`ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1`), web local. Tài khoản `boss` tự cộng Ruby, tạo phòng Nối từ, thêm 2 máy, bấm 🌪️ liên tục. Kết quả đúng: icon nằm trước ✏️ ở 390×844 và 360×640, chữ `-💎20` hiện, số dư giảm, máy bị chọc có hiệu ứng, màn admin không rung. Làm lại ở Tỷ phú (nút trong hàng nhỏ không tràn). Tài khoản thường không thấy icon.
