# Tài khoản: email, nhập lại mật khẩu, quên mật khẩu bằng OTP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tài khoản có email; đăng ký có ô nhập lại mật khẩu; đăng nhập bằng tên hoặc email; quên mật khẩu nhận mã 6 số qua Gmail; đổi mật khẩu/email trong hồ sơ; nút Đăng nhập/Đăng ký ở đầu trang chủ.

**Architecture:** Server giữ mọi kiểm tra (Socket.IO, lớp `Auth` + `Store`). Gửi thư qua interface `Mailer` (Gmail bằng nodemailer khi có `SMTP_USER`/`SMTP_PASS`, bộ giả trong test). App (Expo web) chỉ thêm form và gọi lệnh socket mới.

**Tech Stack:** Node 20 + TypeScript, Socket.IO 4, MongoDB driver 7, vitest 5, nodemailer (mới), Expo 58 / React Native Web.

**Spec:** `docs/superpowers/specs/2026-11-12-accounts-email-otp-design.md`

## Global Constraints

- Không ghi tài khoản/mật khẩu Gmail vào code, test hay repo; chỉ đọc `process.env.SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME` (mặc định `Xóm Lầy`).
- Mã OTP: 6 chữ số (`crypto.randomInt(0, 1_000_000)`, đệm 0), hết hạn 10 phút, tối đa 5 lần nhập sai, 60 giây giữa hai thư, tối đa 5 thư/giờ/tài khoản; lưu `sha256(userId + ':' + code)`, so sánh `timingSafeEqual`.
- `auth:forgot` luôn trả `{ ok: true }` khi `who` đúng dạng (không lộ tài khoản tồn tại hay đang bị giới hạn); `mail_disabled` khi không có mailer.
- Email: trim + chữ thường, 6–100 ký tự, `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`, duy nhất.
- Mật khẩu 6–72 ký tự như hiện nay; ô nhập lại chỉ kiểm tra ở app.
- Đặt lại mật khẩu xóa mọi phiên; đổi mật khẩu xóa các phiên khác, giữ phiên hiện tại.
- Thông báo cho người dùng bằng tiếng Việt; code theo phong cách sẵn có (chú thích tiếng Việt).
- Chạy lệnh server trong `server/`, lệnh app trong `app/`.

## Review Focus

- Tài khoản cũ không có email gọi `auth:forgot` bằng tên đăng nhập → vẫn `{ ok: true }`, không thư, không lỗi server (Task 3 có test).
- Email khác hoa thường / có khoảng trắng (`  An@Gmail.com `) → coi là cùng email khi đăng ký trùng, đăng nhập và quên mật khẩu (Task 1, 3).
- Hai yêu cầu `auth:reset` đúng mã gửi gần như cùng lúc → chỉ một lần đổi mật khẩu thành công, mã không dùng lại được (Task 3: xóa mã trước khi đổi mật khẩu).
- Mailer ném lỗi (Gmail từ chối) → `auth:forgot` vẫn `{ ok: true }` với người dùng, ghi `console.error`, không làm sập server (Task 3).
- Người đang đăng nhập ở máy khác khi mật khẩu bị đặt lại → phiên cũ hết hiệu lực ngay (`auth:resume` → `session_expired`) (Task 3).

---

### Task 1: Lưu email và mã đặt lại mật khẩu trong Store

**Files:**
- Modify: `server/src/store.ts` (UserRecord, UserDoc, fromDoc, toPublic, interface Store, MemoryStore, MongoStore.connect indexes)
- Modify: `shared/src/types.ts` (`PublicUser.email?: string`)
- Test: `server/test/store-email.test.ts` (MemoryStore)

**Interfaces:**
- Produces:
  - `UserRecord.email?: string`; `createUser(u: Omit<UserRecord,'id'|'stats'>): Promise<UserRecord | 'username_taken' | 'email_taken'>` (thay `null` bằng lý do; cập nhật nơi gọi trong `auth.ts`)
  - `userByEmail(email: string): Promise<UserRecord | null>` (đầu vào đã chuẩn hóa)
  - `setEmail(userId: string, email: string): Promise<'ok' | 'taken'>`
  - `setPassword(userId: string, passHash: string, salt: string): Promise<void>`
  - `deleteSessionsExcept(userId: string, keepToken?: string): Promise<void>`
  - `interface ResetRecord { userId: string; codeHash: string; expiresAt: Date; attempts: number; sentAt: Date[] }`
  - `saveReset(r: ResetRecord): Promise<void>` (thay bản cũ của cùng user), `getReset(userId): Promise<ResetRecord | null>`,
    `bumpResetAttempts(userId): Promise<number>` (trả số lần sau khi tăng), `deleteReset(userId): Promise<boolean>` (true nếu đã xóa bản ghi — dùng làm khóa chống dùng mã hai lần)
- Mongo: `users` unique sparse index `{ email: 1 }`; collection `password_resets` index unique `{ userId: 1 }` và TTL `{ expiresAt: 1 }, { expireAfterSeconds: 0 }`; `sessions` cần lưu `userId` (đã có) để `deleteSessionsExcept` lọc `{ userId, token: { $ne: hashToken(keep) } }`.

- [ ] **Step 1: Write the failing test** `server/test/store-email.test.ts`:
  `createUser` với email → `userByEmail('an@gmail.com')` trả đúng user; tạo user thứ hai cùng email → `'email_taken'`, cùng username → `'username_taken'`;
  `setEmail` sang email người khác → `'taken'`, sang email mới → `'ok'` và `toPublic(u).email` đúng;
  `setPassword` đổi `passHash`/`salt`;
  tạo 3 phiên, `deleteSessionsExcept(id, t2)` → chỉ `t2` còn `userBySession`;
  `saveReset` / `getReset` / `bumpResetAttempts` → 1, 2; `deleteReset` lần đầu `true`, lần hai `false`.
- [ ] **Step 2: Run** `npx vitest run test/store-email.test.ts` → FAIL (thiếu hàm).
- [ ] **Step 3: Implement** các hàm trên cho `MemoryStore` và `MongoStore` (Mongo: `createUser` bắt lỗi 11000 và đọc `keyPattern` để phân biệt `email`/`username`; `deleteReset` dùng `deleteOne(...).deletedCount === 1`). Sửa `Auth.register` để nhận kiểu trả về mới (tạm thời chưa có email → không đổi hành vi).
- [ ] **Step 4: Run** `npx vitest run` và `npx tsc --noEmit` → PASS (toàn bộ test cũ vẫn qua).
- [ ] **Step 5: Commit** `git add server/src/store.ts shared/src/types.ts server/src/auth.ts server/test/store-email.test.ts && git commit -m "Tài khoản: lưu email và mã đặt lại mật khẩu"`

### Task 2: Bộ gửi thư

**Files:**
- Create: `server/src/mailer.ts`
- Modify: `server/package.json` (thêm `nodemailer`, dev `@types/nodemailer`), `server/src/app.ts` (`GameServerOptions.mailer?: Mailer | null`; mặc định `gmailMailer() ?? debugMailer()`; `/health` thêm `mail: boolean`)
- Test: `server/test/mailer.test.ts`

**Interfaces:**
- Produces:
  - `interface Mailer { send(to: string, subject: string, text: string, html: string): Promise<void> }`
  - `gmailMailer(env = process.env): Mailer | undefined` — `nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })`, `from: "<SMTP_FROM_NAME|Xóm Lầy>" <SMTP_USER>`
  - `debugMailer(env = process.env): Mailer | undefined` — chỉ khi `MAIL_DEBUG === '1'`: `console.log` người nhận + tiêu đề (để chạy e2e trên máy)
  - `resetMail(displayName: string, code: string): { subject: string; text: string; html: string }` — tiêu đề `Mã đặt lại mật khẩu Xóm Lầy: <code>`; nội dung có tên, mã, "hết hạn sau 10 phút", "Nếu không phải bạn yêu cầu, hãy bỏ qua thư này." (html escape tên)
  - `createGameServer(dict, { mailer: null })` tắt hẳn gửi thư (test dùng để kiểm `mail_disabled`).

- [ ] **Step 1: Write the failing test** `server/test/mailer.test.ts`: `gmailMailer({})` → `undefined`; `gmailMailer({ SMTP_USER: 'a@b.co', SMTP_PASS: 'x' })` → có `send`; `debugMailer({})` → `undefined`; `resetMail('<An>', '012345')` → `subject` chứa `012345`, `text` chứa `10 phút`, `html` chứa `&lt;An&gt;`; `/health` của server tạo với `{ mailer: null }` trả `mail: false`.
- [ ] **Step 2: Run** `npx vitest run test/mailer.test.ts` → FAIL.
- [ ] **Step 3: Implement** `server/src/mailer.ts`, thêm dependency (`npm i nodemailer && npm i -D @types/nodemailer`), nối vào `app.ts`.
- [ ] **Step 4: Run** `npx vitest run test/mailer.test.ts && npx tsc --noEmit && npm run build` → PASS (esbuild bundle vẫn build vì `--packages=external`).
- [ ] **Step 5: Commit** `git add server/src/mailer.ts server/src/app.ts server/package.json server/package-lock.json server/test/mailer.test.ts && git commit -m "Tài khoản: bộ gửi thư Gmail (nodemailer)"`

### Task 3: Lệnh tài khoản mới trên server

**Files:**
- Modify: `server/src/auth.ts` (`cleanEmail`, register/login/forgot/reset/setEmail/changePassword; `Auth` nhận `mailer?: Mailer`)
- Modify: `server/src/socket.ts` (handlers `auth:forgot`, `auth:reset`, `auth:setEmail`, `auth:changePassword` qua `handleAuth`)
- Modify: `shared/src/types.ts` (`AuthError` += `invalid_email`, `email_taken`, `bad_code`, `code_expired`, `mail_disabled`; `ClientToServerEvents` += 4 lệnh; `auth:register` thêm `email: string`)
- Test: `server/test/password-reset.test.ts`, sửa `server/test/accounts.test.ts` (mọi chỗ đăng ký thêm `email`)

**Interfaces:**
- Consumes: Task 1 Store methods; Task 2 `Mailer`, `resetMail`.
- Produces (socket, tất cả ack `AuthAck` trừ `auth:forgot`):
  - `'auth:register': (p: { username; password; displayName; email; avatar? }, ack)`
  - `'auth:login'`: `username` chứa `@` → tìm bằng `userByEmail(cleanEmail(username))`
  - `'auth:forgot': (p: { who: string }, ack: (r: { ok: true } | { ok: false; error: 'mail_disabled' | 'invalid_username' | 'rate_limited' }) => void)` — `rate_limited` chỉ từ `authLimiter` theo socket (không phụ thuộc tài khoản)
  - `'auth:reset': (p: { who: string; code: string; password: string }, ack)`
  - `'auth:setEmail': (p: { email: string }, ack)`; `'auth:changePassword': (p: { oldPassword: string; password: string }, ack)`
  - `export function cleanEmail(raw: unknown): string | null`

Luồng `reset`: tìm user theo `who` → không có / không có reset → `code_expired`; quá hạn → `deleteReset`, `code_expired`; sai mã → `bumpResetAttempts`, nếu ≥ 5 thì `deleteReset` + `code_expired`, ngược lại `bad_code`; đúng mã → `if (!(await deleteReset(id))) return code_expired` (chống dùng hai lần) → `setPassword` → `deleteSessionsExcept(id)` → tạo phiên mới, trả `AuthAck`.

- [ ] **Step 1: Write the failing tests** `server/test/password-reset.test.ts` (Socket.IO thật; server tạo với `{ store, mailer: fakeMailer }`, `fakeMailer.sent: { to, subject, text }[]`, đọc mã bằng `/(\d{6})/` từ `subject`):
  - `forgot sends one mail with a 6-digit code by email and by username` — 1 thư tới `an@gmail.com`.
  - `forgot for unknown or email-less account returns ok without mail`.
  - `forgot again within 60s returns ok but sends no new mail` (dùng `vi.setSystemTime` hoặc truyền `now` — chọn giả đồng hồ bằng `vi.useFakeTimers({ toFake: ['Date'] })`).
  - `reset with wrong code -> bad_code; 5 wrong -> code_expired; right code afterwards -> code_expired`.
  - `reset after 10 minutes -> code_expired`.
  - `reset with right code logs in, old password fails, other socket session expires, code cannot be reused`.
  - `two concurrent resets with the right code: exactly one ok`.
  - `mailer throwing still returns ok` (mailer ném lỗi).
  - `forgot with mailer null -> mail_disabled`.
  - `setEmail: invalid -> invalid_email, other user's email (different case) -> email_taken, ok updates user.email`.
  - `changePassword: wrong old -> wrong_credentials; ok keeps current session, expires other sessions`.
  Trong `accounts.test.ts` thêm: `register without email -> invalid_email`, `register with taken email (case-insensitive) -> email_taken`, `login by email works`.
- [ ] **Step 2: Run** `npx vitest run test/password-reset.test.ts test/accounts.test.ts` → FAIL.
- [ ] **Step 3: Implement** trong `auth.ts` + `socket.ts` + `types.ts` theo luồng trên (gửi thư không `await` trong đường trả lời: `void mailer.send(...).catch(console.error)`).
- [ ] **Step 4: Run** `npx vitest run && npx tsc --noEmit` → PASS.
- [ ] **Step 5: Commit** `git add server/src/auth.ts server/src/socket.ts shared/src/types.ts server/test/password-reset.test.ts server/test/accounts.test.ts && git commit -m "Tài khoản: đăng ký có email, đăng nhập bằng email, quên/đổi mật khẩu"`

### Task 4: Giao diện app

**Files:**
- Modify: `app/src/useGame.ts` (`register` nhận `email`; thêm `forgotPassword(who): Promise<string | null>`, `resetPassword(who, code, password): Promise<string | null>` (đăng nhập luôn qua `authCall`), `setEmail(email)`, `changePassword(oldPassword, password)`)
- Modify: `app/src/messages.ts` (`authText` cho 5 lỗi mới: email sai dạng, email đã dùng, "Mã chưa đúng", "Mã đã hết hạn, gửi mã mới nhé", "Server chưa bật gửi mail")
- Modify: `app/src/components/Account.tsx` (`AuthSheet`: thêm ô email + nhập lại mật khẩu ở tab Tạo mới; tab Đăng nhập: nhãn "Tên đăng nhập hoặc email", link `Quên mật khẩu?` mở chế độ `forgot`; chế độ `forgot` 2 bước + nút Gửi lại mã đếm ngược 60 giây; `ProfileSheet` cho tài khoản: dòng email / nhắc vàng thêm email + Sửa, mục Đổi mật khẩu)
- Modify: `app/src/screens/HomeScreen.tsx` (khách: hàng 2 nút `auth-open` "Đăng nhập" và `register-open` "Đăng ký" ở đầu trang, trên thẻ "Bạn tên gì?"; bỏ dòng link nhỏ)

**Interfaces:**
- Consumes: Task 3 socket events và `AuthError`.
- testID mới: `auth-email`, `auth-password2`, `auth-mismatch`, `forgot-link`, `forgot-who`, `forgot-send`, `forgot-code`, `forgot-password`, `forgot-password2`, `forgot-submit`, `forgot-resend`, `profile-email`, `profile-email-save`, `pw-old`, `pw-new`, `pw-new2`, `pw-save`.

- [ ] **Step 1: Implement** các thay đổi trên. Ô mật khẩu khác nhau → hiện `auth-mismatch` "Hai mật khẩu chưa khớp" và khóa nút gửi; ô email dùng `keyboardType="email-address"`, `autoCapitalize="none"`.
- [ ] **Step 2: Run** `npx tsc --noEmit && npx expo lint` trong `app/` → không lỗi.
- [ ] **Step 3: Commit** `git add app/src && git commit -m "Tài khoản: nút đăng nhập/đăng ký ở đầu trang, ô email, nhập lại mật khẩu, quên mật khẩu"`

### Task 5: Kiểm thử thật trên trình duyệt + hướng dẫn

**Files:**
- Create: `e2e/accounts.mjs`
- Modify: `README.md` (mục Tài khoản: email, quên mật khẩu, bảng biến `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM_NAME`, cách tạo mật khẩu ứng dụng Gmail; nhắc không đặt `MAIL_DEBUG` trên Render)

**Interfaces:**
- Consumes: testID ở Task 4; server chạy `MAIL_DEBUG=1` (đọc mã từ log server — script nhận đường dẫn file log làm tham số và tìm dòng có `Mã đặt lại mật khẩu Xóm Lầy: (\d{6})`).

- [ ] **Step 1: Write** `e2e/accounts.mjs` (theo mẫu `e2e/en-rules.mjs`: biến `WEB`, `CHROME`, đối số `<server-log> <shots>`): trang chủ có `auth-open` và `register-open`; đăng ký với hai mật khẩu khác nhau thấy `auth-mismatch` và nút bị khóa; đăng ký đúng → thẻ tài khoản; đăng xuất; Quên mật khẩu bằng email → đọc mã từ log → đặt mật khẩu mới → đã đăng nhập; đăng nhập bằng email + mật khẩu mới được.
- [ ] **Step 2: Run** server `MAIL_DEBUG=1 PORT=<cổng trống> node dist/server.js > <log>`, export web với `EXPO_PUBLIC_SERVER_URL` trỏ tới cổng đó, phục vụ bằng `python -m http.server <cổng trống>`, chạy `node e2e/accounts.mjs <log> <shots>` → in `Tất cả OK`. (Không dùng cổng 3999/8081 nếu đang có tiến trình khác.)
- [ ] **Step 3: Update** README, chạy lại `npx vitest run` ở `server/`.
- [ ] **Step 4: Commit** `git add e2e/accounts.mjs README.md && git commit -m "Tài khoản: e2e quên mật khẩu, hướng dẫn cấu hình Gmail"`
