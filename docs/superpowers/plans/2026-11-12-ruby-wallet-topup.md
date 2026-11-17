# Ví Ruby + nạp bằng QR, quản trị duyệt tay — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tài khoản có ví Ruby; người chơi chọn gói, quét QR VietQR (BIDV 6353025859) có mã nạp riêng, bấm "Tôi đã chuyển khoản"; quản trị `phuoc_2005` duyệt trong game và Ruby vào ví ngay.

**Architecture:** Bảng giá + mã nạp + URL QR dùng chung ở `shared/src/ruby.ts`. Dữ liệu ví tách sang `server/src/walletStore.ts` (Memory + Mongo, dùng chung kết nối của `MongoStore`). Lệnh ví/quản trị qua Socket.IO trong `server/src/wallet.ts`; đẩy `wallet:update` tới mọi socket của tài khoản bằng EventEmitter như `auth.profiles`. App thêm `Wallet.tsx` và `Admin.tsx`.

**Tech Stack:** Node 20 + TypeScript, Socket.IO 4, MongoDB driver 7, vitest 5, Expo 58 / React Native Web.

**Spec:** `docs/superpowers/specs/2026-11-12-ruby-wallet-topup-design.md`

**Phụ thuộc:** làm sau kế hoạch tài khoản (`docs/superpowers/plans/2026-11-12-accounts-email-otp.md`); dùng `Store` với `createUser` trả kiểu mới.

## Global Constraints

- Gói (đồng → Ruby): 10.000→100, 20.000→200, 50.000→550, 100.000→1.150, 200.000→2.400, 500.000→6.250. Không khớp gói → `floor(amount/1000)*10`; dưới 1.000đ → 0 (không cộng). Lần được cộng đầu tiên của tài khoản → ×2.
- Ngân hàng: `{ bank: 'BIDV', bin: '970418', account: '6353025859', name: 'BUI LE HUY PHUOC' }`.
- Mã nạp: `XL` + 6 ký tự từ `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`; tìm trong văn bản bằng `/XL[0-9A-Z]{6}/` sau khi in hoa và bỏ khoảng trắng, `-`, `.`, `_`.
- QR: `https://img.vietqr.io/image/970418-6353025859-compact2.png?amount=<số tiền>&addInfo=<mã>&accountName=BUI%20LE%20HUY%20PHUOC`.
- Ruby chỉ ở tài khoản; khách gọi lệnh ví → `{ ok: false, error: 'need_account' }`. Không bao giờ dùng Ruby trong Bầu cua/Tỷ phú, không đổi ra xu/tiền.
- Server chỉ cộng Ruby khi quản trị duyệt (`admin:approve`, `admin:creditCode`) hoặc `admin:adjust`; số dư không âm; mọi thay đổi ghi sổ `ruby_ledger`.
- Tối đa 3 yêu cầu `pending` mỗi tài khoản; `wallet:request` chỉ nhận đúng giá một gói.
- Quản trị = `username ∈ ADMIN_USERNAMES` (phân cách dấu phẩy, trim, chữ thường), kiểm tra ở server cho từng lệnh; người khác → `forbidden`.
- Doanh thu tính theo giờ Việt Nam (UTC+7).

## Review Focus

- Quản trị bấm "Đã nhận" hai lần hoặc hai máy quản trị cùng bấm → chỉ cộng một lần (Task 3, test song song).
- Duyệt yêu cầu của tài khoản đã bị xóa / không tìm thấy user → báo lỗi, không ghi doanh thu, yêu cầu vẫn `pending` (Task 3).
- Người chơi đang mở game ở 2 máy → cả hai nhận `wallet:update` với cùng số dư (Task 3).
- `admin:adjust` trừ nhiều hơn số dư → từ chối, số dư không đổi, không ghi sổ (Task 2, 3).
- Tài khoản cũ chưa có mã nạp mở ví lần đầu ở 2 máy cùng lúc → cùng một mã (Task 2: `ensureTopupCode` nguyên tử, Mongo `findOneAndUpdate` với `topupCode: { $exists: false }` rồi đọc lại).

---

### Task 1: Bảng giá, mã nạp, URL QR dùng chung

**Files:**
- Create: `shared/src/ruby.ts`
- Test: `server/test/ruby.test.ts`

**Interfaces:**
- Produces:
  - `RUBY_PACKS: readonly { amount: number; ruby: number; bonus: number }[]` (bonus là % để hiện nhãn: 0, 0, 10, 15, 20, 25)
  - `rubyForAmount(amount: number, first: boolean): number`
  - `TOPUP_BANK`, `TOPUP_CODE_ALPHABET`, `TOPUP_CODE_RE`
  - `newTopupCode(rand: () => number = Math.random): string`
  - `normalizeTopupCode(text: string): string | null`
  - `vietQrUrl(amount: number | null, memo: string): string` (bỏ `amount` khi `null`; `encodeURIComponent` cho `memo`)

- [ ] **Step 1: Write the failing test** `server/test/ruby.test.ts`: mỗi gói → đúng Ruby; `rubyForAmount(50_000, true) === 1100`; `rubyForAmount(35_500, false) === 350`; `rubyForAmount(999, true) === 0`; `newTopupCode()` khớp `/^XL[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{6}$/` 200 lần; `normalizeTopupCode('chuyen tien xl 8f3-k2q')` → `'XL8F3K2Q'`; `normalizeTopupCode('khong co ma')` → `null`; `vietQrUrl(50000, 'XL8F3K2Q')` === URL ở Global Constraints với `amount=50000&addInfo=XL8F3K2Q`.
- [ ] **Step 2: Run** `npx vitest run test/ruby.test.ts` (trong `server/`) → FAIL.
- [ ] **Step 3: Implement** `shared/src/ruby.ts`.
- [ ] **Step 4: Run** lại → PASS.
- [ ] **Step 5: Commit** `git add shared/src/ruby.ts server/test/ruby.test.ts && git commit -m "Ruby: bảng giá, mã nạp, QR VietQR"`

### Task 2: WalletStore (bộ nhớ + MongoDB)

**Files:**
- Create: `server/src/walletStore.ts`
- Modify: `server/src/store.ts` (`UserRecord.ruby: number` mặc định 0, `topupCode?: string`, `firstTopupAt?: Date`; `PublicUser` qua `toPublic` thêm `ruby`; `MongoStore` thêm getter `get database(): Db`; `MemoryStore` thêm `wallet(): MemoryWalletStore` dùng chung map users)
- Modify: `shared/src/types.ts` (`PublicUser.ruby: number`, `PublicUser.admin?: true`, `TopupRequest`, `RubyLedgerRow`)
- Test: `server/test/walletStore.test.ts`

**Interfaces:**
- Produces (`interface WalletStore`):
  - `ensureTopupCode(userId: string): Promise<string>`; `userIdByTopupCode(code: string): Promise<string | null>`
  - `createRequest(userId: string, username: string, code: string, amount: number): Promise<TopupRequest | 'too_many'>`
  - `listRequests(status: TopupRequest['status'], limit: number): Promise<TopupRequest[]>` (mới nhất trước); `requestById(id: string): Promise<TopupRequest | null>`
  - `resolveRequest(id: string, status: 'approved' | 'rejected', by: string, ruby?: number, amount?: number): Promise<TopupRequest | null>` — chỉ khi đang `pending`
  - `setRequestRuby(id: string, ruby: number): Promise<void>`
  - `addApproved(userId: string, username: string, code: string, amount: number, by: string, ruby: number): Promise<TopupRequest>`
  - `markFirstTopup(userId: string): Promise<boolean>`
  - `creditRuby(userId: string, delta: number, reason: 'topup' | 'admin_adjust', ref?: string, by?: string): Promise<number | null>`
  - `balance(userId: string): Promise<number>`; `history(userId: string, limit: number): Promise<RubyLedgerRow[]>`
  - `revenue(now?: Date): Promise<{ today: number; month: number; total: number }>`
  - `pendingOf(userId: string): Promise<TopupRequest[]>`
- `type TopupRequest = { id: string; userId: string; username: string; code: string; amount: number; status: 'pending' | 'approved' | 'rejected'; createdAt: number; handledAt?: number; handledBy?: string; ruby?: number }`
- `type RubyLedgerRow = { delta: number; balance: number; reason: string; ref?: string; at: number }`
- Mongo: `users` unique sparse `{ topupCode: 1 }`; `topup_requests` index `{ status: 1, createdAt: -1 }`, `{ userId: 1, status: 1 }`; `ruby_ledger` index `{ userId: 1, at: -1 }`. `creditRuby` = `users.findOneAndUpdate({ _id, ...(delta < 0 ? { ruby: { $gte: -delta } } : {}) }, { $inc: { ruby: delta } }, { returnDocument: 'after' })` rồi chèn sổ. Trùng mã khi cấp (lỗi 11000) → sinh mã khác, thử lại tối đa 5 lần.
- `createGameServer` tạo `wallet` từ `store` (`store instanceof MongoStore ? new MongoWalletStore(store.database) : store.wallet()`); `GameServer` thêm `wallet: WalletStore`.

- [ ] **Step 1: Write the failing test** `server/test/walletStore.test.ts` (MemoryStore): `ensureTopupCode` hai lần cùng mã, hai lời gọi song song cùng mã, khác giữa hai user; `userIdByTopupCode`; `createRequest` lần thứ 4 khi 3 cái đang chờ → `'too_many'`; `resolveRequest` lần hai → `null`; `markFirstTopup` true rồi false; `creditRuby(+550)` → 550, `creditRuby(-600)` → `null` và số dư vẫn 550, `history` có 1 dòng `{ delta: 550, balance: 550, reason: 'topup' }`; `revenue(new Date('2026-11-12T10:00:00+07:00'))` cộng đúng các yêu cầu `approved` hôm nay/tháng này/tổng, bỏ `rejected`.
- [ ] **Step 2: Run** `npx vitest run test/walletStore.test.ts` → FAIL.
- [ ] **Step 3: Implement** `walletStore.ts` + thay đổi `store.ts`, `types.ts`, `app.ts`.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** `git add server/src/walletStore.ts server/src/store.ts server/src/app.ts shared/src/types.ts server/test/walletStore.test.ts && git commit -m "Ruby: ví, sổ Ruby, yêu cầu nạp (bộ nhớ + MongoDB)"`

### Task 3: Lệnh ví và quản trị qua Socket.IO

**Files:**
- Create: `server/src/wallet.ts` (`attachWalletHandlers(socket, ctx)`; `isAdmin(username, env = process.env)`; `WalletEvents` EventEmitter: `'update'(userId, { ruby, delta, reason })`, `'rejected'(userId, { amount })`)
- Modify: `server/src/socket.ts` (gọi `attachWalletHandlers` với `getUser: () => user`; nghe `WalletEvents` để `socket.emit('wallet:update' | 'wallet:rejected')` khi `user?.id` khớp; gỡ listener khi ngắt), `server/src/auth.ts` (`AuthAck.user.admin = true` khi `isAdmin`)
- Modify: `shared/src/types.ts` (`ClientToServerEvents` + `ServerToClientEvents` cho các lệnh dưới; `WalletError = 'need_account' | 'bad_request' | 'too_many' | 'forbidden' | 'not_found' | 'already_handled' | 'insufficient' | 'rate_limited'`)
- Test: `server/test/wallet.test.ts`

**Interfaces:**
- Consumes: Task 1, Task 2.
- Produces (ack dạng `{ ok: true, ... } | { ok: false, error: WalletError }`):
  - `'wallet:get'` → `{ ruby, topupCode, firstTopupDone: boolean, pending: TopupRequest[] }`
  - `'wallet:request' { amount }` → `{ request: TopupRequest }`
  - `'wallet:history'` → `{ rows: RubyLedgerRow[] }` (30 dòng)
  - `'admin:requests' { status }` → `{ requests: TopupRequest[] }` (50 dòng)
  - `'admin:approve' { id, amount? }` → `{ request, ruby, balance }`
  - `'admin:reject' { id }` → `{ request }`
  - `'admin:creditCode' { code, amount }` → `{ request, ruby, balance }` (`code` qua `normalizeTopupCode`; không thấy tài khoản → `not_found`)
  - `'admin:adjust' { username, delta, reason }` → `{ balance }` (`delta` số nguyên khác 0, |delta| ≤ 1.000.000; `reason` 1–100 ký tự; âm quá số dư → `insufficient`)
  - `'admin:revenue'` → `{ today, month, total }`
  - Server → app: `'wallet:update': (p: { ruby: number; delta: number; reason: string }) => void`, `'wallet:rejected': (p: { amount: number }) => void`
- Duyệt (thứ tự quan trọng để hai lần duyệt song song không làm sai khuyến mãi lần đầu): tìm request (không có → `not_found`, không `pending` → `already_handled`) → `amount` (mặc định của request) phải ≥ 1.000 (không → `bad_request`) → tìm user (không có → `not_found`) → **giành quyền xử lý** `resolveRequest(id, 'approved', admin, undefined, amount)` (null → `already_handled`) → `first = markFirstTopup(user)` → `ruby = rubyForAmount(amount, first)` → `setRequestRuby(id, ruby)` → `creditRuby(user, ruby, 'topup', id, admin)` → phát `update`. `admin:creditCode` theo cùng thứ tự với `addApproved` thay cho bước giành quyền.

- [ ] **Step 1: Write the failing tests** `server/test/wallet.test.ts` (Socket.IO thật, `process.env.ADMIN_USERNAMES='boss'` trong test, đăng ký tài khoản `boss` và `an`):
  - `guest gets need_account`; `wallet:get` trả mã `XL…`, `ruby: 0`, `firstTopupDone: false`.
  - `request rejects non-pack amount`; `4th pending request -> too_many`.
  - `non-admin calling admin:* -> forbidden`.
  - `approve credits 1100 ruby for first 50k pack, an's two sockets both get wallet:update`; `second approval of same id -> already_handled`, số dư vẫn 1100.
  - `two concurrent approves -> exactly one ok`.
  - `second top-up is not doubled`; `approve with amount 35000 -> 350 ruby`.
  - `reject -> wallet:rejected to an, no credit`.
  - `creditCode with spaced lowercase code credits the right user; unknown code -> not_found`.
  - `adjust cannot make balance negative -> insufficient`; `adjust requires reason`.
  - `revenue sums approved amounts`.
  - `auth:login as boss returns user.admin true; as an has no admin`.
- [ ] **Step 2: Run** `npx vitest run test/wallet.test.ts` → FAIL.
- [ ] **Step 3: Implement** `wallet.ts`, nối vào `socket.ts`, `auth.ts`, `types.ts`. Giới hạn tần suất: `RateLimiter(6, 2000)` riêng cho lệnh ví/quản trị.
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** `git add server/src/wallet.ts server/src/socket.ts server/src/auth.ts shared/src/types.ts server/test/wallet.test.ts && git commit -m "Ruby: lệnh ví, yêu cầu nạp, quản trị duyệt/cộng/trừ, doanh thu"`

### Task 4: Giao diện ví và quản trị

**Files:**
- Create: `app/src/components/Wallet.tsx` (`WalletSheet({ game, onClose })`: lưới gói → màn chuyển khoản → chờ duyệt; `RubyHistory`), `app/src/components/Admin.tsx` (`AdminSheet({ game, onClose })`: tab Chờ duyệt / Cộng theo mã / Doanh thu / Cộng-trừ)
- Modify: `app/src/useGame.ts` (state `wallet: { ruby; topupCode; firstTopupDone; pending } | null`; `loadWallet()`, `requestTopup(amount)`, `rubyHistory()`, admin: `adminRequests(status)`, `adminApprove(id, amount?)`, `adminReject(id)`, `adminCreditCode(code, amount)`, `adminAdjust(username, delta, reason)`, `adminRevenue()`; nghe `wallet:update` → cập nhật `user.ruby` + gọi listener để hiện chúc mừng; `wallet:rejected`)
- Modify: `app/src/components/Account.tsx` (`ProfileCard`: `💎 <ruby>` + nút `wallet-open` "Nạp Ruby"; `ProfileSheet`: mục Ví Ruby + nút `admin-open` khi `user.admin`), `app/src/screens/HomeScreen.tsx` (khách bấm nạp → mở `AuthSheet` đăng ký), `app/App.tsx` hoặc `Shell.tsx` (lớp chúc mừng `+N 💎` pháo giấy khi `wallet:update`, ở mọi màn)
- Modify: `app/src/messages.ts` (`walletText: Record<WalletError, string>`)

**Interfaces:**
- Consumes: Task 1 (`RUBY_PACKS`, `vietQrUrl`, `TOPUP_BANK`), Task 3 events.
- testID: `wallet-open`, `pack-<amount>`, `topup-qr`, `topup-code`, `copy-account`, `copy-code`, `topup-sent`, `topup-pending`, `ruby-balance`, `ruby-toast`, `admin-open`, `admin-tab-pending`, `admin-approve-<id>`, `admin-reject-<id>`, `admin-code`, `admin-code-amount`, `admin-code-credit`, `admin-revenue`.
- Màn chuyển khoản: ảnh `topup-qr` = `vietQrUrl(amount, topupCode)` (lỗi tải → ẩn ảnh, giữ chữ); dòng BIDV / 6353025859 / BUI LE HUY PHUOC / số tiền / mã, nút sao chép dùng `copyText` từ `web.ts`; cảnh báo "Giữ nguyên nội dung chuyển khoản"; nút Lưu ảnh QR (web: mở ảnh trong tab mới để lưu).

- [ ] **Step 1: Implement** các thay đổi trên.
- [ ] **Step 2: Run** `npx tsc --noEmit && npx expo lint` trong `app/` → không lỗi.
- [ ] **Step 3: Commit** `git add app/src app/App.tsx && git commit -m "Ruby: bảng nạp QR, ví, trang quản trị"`

### Task 5: Kiểm thử thật + hướng dẫn

**Files:**
- Create: `e2e/wallet.mjs`
- Modify: `README.md` (mục Ruby: bảng gói, quy trình duyệt cho chủ dự án, biến `ADMIN_USERNAMES`, cần MongoDB)

- [ ] **Step 1: Write** `e2e/wallet.mjs` (mẫu `e2e/en-rules.mjs`; server chạy với `ADMIN_USERNAMES=boss`): 2 trình duyệt; đăng ký `an` và `boss`; `an` mở `wallet-open` → `pack-50000` → thấy `topup-qr` (src chứa `amount=50000` và mã) và `topup-code` → `topup-sent` → thấy `topup-pending`; `boss` mở `admin-open` → `admin-approve-<id>` → `an` thấy `ruby-toast` chứa `1.100` và `ruby-balance` = `1.100`.
- [ ] **Step 2: Run** (cổng trống, không dùng 3999/8081 nếu bận) → `Tất cả OK`.
- [ ] **Step 3: Update** README; chạy lại `npx vitest run` ở `server/`.
- [ ] **Step 4: Commit** `git add e2e/wallet.mjs README.md && git commit -m "Ruby: e2e nạp + duyệt, hướng dẫn"`
