# Tài khoản: email, nhập lại mật khẩu, quên mật khẩu bằng mã OTP (phần 1/5)

Ngày: 2026-11-12 · Trạng thái: chờ duyệt

## 1. Mục tiêu

Tài khoản Xóm Lầy sắp giữ Ruby mua bằng tiền thật (phần 2), nên người chơi phải lấy lại được tài khoản khi quên mật khẩu,
và đăng ký/đăng nhập phải dễ thấy. Thành công khi:

- Trang chủ có hai nút **Đăng nhập** / **Đăng ký** ở đầu trang (khách vẫn chơi được như cũ).
- Đăng ký có email bắt buộc và ô nhập lại mật khẩu; đăng nhập bằng tên đăng nhập hoặc email.
- Quên mật khẩu: nhận mã 6 số qua email, đặt mật khẩu mới, tự đăng nhập; các máy khác bị đăng xuất.
- Tài khoản cũ thêm được email; ai cũng đổi được mật khẩu trong hồ sơ.

### Quyết định của chủ dự án

| Mục | Quyết định |
|---|---|
| "Xác thực 2 lần mật khẩu" | Ô **nhập lại mật khẩu** khi đăng ký và khi đổi/đặt lại mật khẩu (không làm đăng nhập 2 bước) |
| Email | Ô email bắt buộc khi đăng ký; không bắt xác minh email lúc đăng ký |
| OTP | Chỉ dùng cho quên mật khẩu, gửi qua Gmail (mật khẩu ứng dụng) |
| Nút | Đăng nhập / Đăng ký ở đầu trang chủ, link Quên mật khẩu ở bảng đăng nhập |

### Ràng buộc

- Không ghi tài khoản/mật khẩu Gmail vào code hay repo (repo public). Chỉ đọc từ biến môi trường `SMTP_USER`, `SMTP_PASS`
  (tùy chọn `SMTP_FROM_NAME`, mặc định `Xóm Lầy`). Kiểm thử dùng bộ gửi giả, không gửi thư thật.
- Không để lộ email nào có tài khoản: mọi yêu cầu quên mật khẩu đều trả cùng một câu trả lời.
- Server chỉ lưu bản băm của mã OTP.

### Ngoài phạm vi

Đăng nhập 2 bước, đăng nhập bằng Google/Facebook, xác minh email khi đăng ký, đổi tên đăng nhập.

## 2. Dữ liệu

- `UserRecord` / `UserDoc` thêm `email?: string` (chữ thường, đã trim). Mongo: unique sparse index `{ email: 1 }`.
  `PublicUser` thêm `email?: string` (chỉ trả cho chính chủ trong phiên).
- Chuẩn hóa: `cleanEmail(raw): string | null` trong `server/src/auth.ts` — trim, chữ thường, độ dài 6–100,
  khớp `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`.
- Mã OTP: collection `password_resets` `{ userId, codeHash, expiresAt, attempts, createdAt }` (một bản ghi đang dùng mỗi tài khoản;
  tạo mã mới thì thay mã cũ). Mongo TTL index trên `expiresAt`. `codeHash = sha256(userId + ':' + code)`.
- Lịch sử gửi để giới hạn: tối đa 5 thư/giờ/tài khoản và 60 giây giữa hai lần gửi (lưu `sentAt[]` trong bản ghi reset).
- `Store` thêm (Mongo + Memory):
  `userByEmail(email)`, `setEmail(userId, email): Promise<'ok' | 'taken'>`, `setPassword(userId, passHash, salt)`,
  `deleteSessionsExcept(userId, keepToken?)`,
  `saveReset(userId, codeHash, expiresAt, sentAt: Date[])`, `getReset(userId)`, `bumpResetAttempts(userId): Promise<number>`, `deleteReset(userId)`.
- `createUser` nhận thêm `email`; trùng email → `null` kèm lý do (`username_taken` | `email_taken`).

## 3. Server

### Gửi thư (`server/src/mailer.ts`)

`interface Mailer { send(to: string, subject: string, text: string, html: string): Promise<void> }`.
- `gmailMailer(env)`: dùng `nodemailer` (`service: 'gmail'`, `auth: { user: SMTP_USER, pass: SMTP_PASS }`); thiếu biến → `undefined`.
- `createGameServer` nhận tùy chọn `mailer?: Mailer` (test truyền bộ giả ghi lại thư). `/health` thêm `mail: true|false`.
- Thư: tiêu đề `Mã đặt lại mật khẩu Xóm Lầy: 123456`; nội dung có tên hiển thị, mã, "hết hạn sau 10 phút",
  "nếu không phải bạn yêu cầu thì bỏ qua thư này".

### Lệnh socket (thêm vào `ClientToServerEvents`, xử lý trong `Auth` + `socket.ts`)

| Lệnh | Vào | Kết quả |
|---|---|---|
| `auth:register` | thêm `email` | lỗi mới `invalid_email`, `email_taken` |
| `auth:login` | `username` nhận cả email (có `@` → tìm theo email) | như cũ |
| `auth:forgot` | `{ who }` (email hoặc tên đăng nhập) | luôn `{ ok: true }` nếu `who` đúng dạng (kể cả khi không có tài khoản, hoặc đang trong 60 giây chờ / quá 5 thư mỗi giờ — khi đó lặng lẽ không gửi); `mail_disabled` nếu chưa cấu hình mail. App tự đếm ngược 60 giây trước khi cho gửi lại |
| `auth:reset` | `{ who, code, password }` | đúng mã → đổi mật khẩu, xóa mọi phiên cũ, trả `AuthAck` (đăng nhập luôn); sai → `bad_code`; quá 5 lần hoặc hết hạn → `code_expired` (xóa mã) |
| `auth:setEmail` | `{ email }` (đã đăng nhập) | `AuthAck` với `user.email` mới; `invalid_email`, `email_taken` |
| `auth:changePassword` | `{ oldPassword, password }` (đã đăng nhập) | `AuthAck`; sai mật khẩu cũ → `wrong_credentials`; xóa các phiên khác, giữ phiên hiện tại |

- Mã: 6 chữ số ngẫu nhiên (`crypto.randomInt`), hết hạn 10 phút, so sánh bằng `timingSafeEqual`.
- Ô "nhập lại mật khẩu" chỉ kiểm tra ở app (server nhận một mật khẩu, kiểm tra độ dài 6–72 như hiện nay).
- Giới hạn tần suất: dùng `authLimiter` hiện có cho mọi lệnh trên; `auth:reset` thêm giới hạn 5 lần sai/mã.
- `AuthError` thêm: `invalid_email`, `email_taken`, `bad_code`, `code_expired`, `mail_disabled`.

## 4. App

- **Trang chủ** (`HomeScreen.tsx`): khách thấy hàng nút **Đăng nhập** / **Đăng ký** ở đầu trang (trên ô tên); thay dòng link nhỏ hiện nay.
  Đã đăng nhập: thẻ tài khoản như hiện tại.
- **Bảng đăng nhập/đăng ký** (`Account.tsx`, `AuthSheet`):
  - Đăng ký: tên đăng nhập, email (bàn phím email), tên hiển thị, mật khẩu, **nhập lại mật khẩu**, chọn mặt.
    Hai mật khẩu khác nhau → dòng đỏ "Hai mật khẩu chưa khớp" và nút Tạo tài khoản bị khóa.
  - Đăng nhập: "Tên đăng nhập hoặc email", mật khẩu, link **Quên mật khẩu?**.
- **Quên mật khẩu** (màn trong cùng bảng): bước 1 ô email/tên đăng nhập → **Gửi mã**; bước 2 ô mã 6 số, mật khẩu mới,
  nhập lại → **Đặt lại mật khẩu**; nút **Gửi lại mã** đếm ngược 60 giây.
- **Hồ sơ** (`ProfileSheet`, chỉ tài khoản): dòng email (hoặc nhắc vàng "Thêm email để lấy lại mật khẩu khi quên") + nút Sửa;
  mục **Đổi mật khẩu** (cũ, mới, nhập lại).
- `useGame` thêm: `forgotPassword(who)`, `resetPassword(who, code, password)`, `setEmail(email)`, `changePassword(old, next)`;
  `register` nhận `email`. Thông báo lỗi tiếng Việt trong `authText` cho mọi `AuthError` mới.

## 5. Kiểm thử

- `server/test/accounts.test.ts` (thêm): đăng ký có email; email sai dạng → `invalid_email`; trùng email (khác hoa thường) → `email_taken`;
  đăng nhập bằng email.
- `server/test/password-reset.test.ts` (Socket.IO thật + bộ gửi giả): `auth:forgot` với email/tên đúng gửi đúng 1 thư có mã 6 số;
  với tài khoản không tồn tại trả cùng kết quả và không gửi thư; gửi lại trong 60 giây → vẫn `{ ok: true }` nhưng không có thư mới; `auth:reset` sai mã → `bad_code`,
  sai 5 lần → `code_expired`; mã quá 10 phút → `code_expired`; đúng mã → đăng nhập được bằng mật khẩu mới, phiên cũ ở socket khác
  hết hạn (`auth:resume` → `session_expired`), mật khẩu cũ không đăng nhập được; mã dùng xong không dùng lại được;
  chưa cấu hình mail → `mail_disabled`.
- `auth:setEmail`, `auth:changePassword` (sai mật khẩu cũ, xóa phiên khác giữ phiên hiện tại).
- E2E (`e2e/accounts.mjs`): hai nút ở đầu trang chủ; ô nhập lại mật khẩu chặn khi không khớp; quên mật khẩu với server chạy bộ gửi giả
  (biến `MAIL_DEBUG=1` thay Gmail bằng bộ gửi ghi thư ra log; chỉ dùng khi chạy thử trên máy, không đặt trên Render).
- `npx tsc --noEmit`, `npx expo lint`, toàn bộ test server phải qua.

## 6. Cấu hình (Render → noi-tu-server → Environment)

| Biến | Ý nghĩa |
|---|---|
| `SMTP_USER` | Địa chỉ Gmail gửi mã |
| `SMTP_PASS` | Mật khẩu ứng dụng Gmail (16 ký tự) |
| `SMTP_FROM_NAME` | Tên người gửi hiển thị, mặc định `Xóm Lầy` (tùy chọn) |
