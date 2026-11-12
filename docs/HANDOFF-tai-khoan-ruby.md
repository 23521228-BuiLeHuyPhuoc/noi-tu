# Bàn giao: Tài khoản (email, quên mật khẩu OTP) + Ví Ruby nạp bằng QR

Người làm: Astra (Codex). Người review: Claude. Làm trên nhánh mới `feature/tai-khoan-ruby` cắt từ `main`;
commit theo từng task của kế hoạch, KHÔNG merge vào `main`, KHÔNG push/deploy khi chủ dự án chưa đồng ý; xong thì báo lại để review.
Không sửa các file Cờ tỷ phú (`TyPhuScreen.tsx`, `TyPhuCell.tsx`, `TyPhuCenter.tsx`, `TyPhuAnnounce.tsx`, `TyPhuFx.tsx`, `typhu*.ts`,
`server/src/games/typhu.ts`, `server/test/typhu*.test.ts`): một phiên khác đang làm phần đó.

## Làm theo thứ tự (đã được chủ dự án duyệt)

1. **Tài khoản**
   - Spec: `docs/superpowers/specs/2026-11-12-accounts-email-otp-design.md`
   - Kế hoạch (5 task, TDD, có lệnh kiểm tra và kết quả mong đợi từng bước): `docs/superpowers/plans/2026-11-12-accounts-email-otp.md`
2. **Ví Ruby + nạp QR, quản trị duyệt tay** (làm sau phần 1, dùng `Store` đã đổi ở phần 1)
   - Spec: `docs/superpowers/specs/2026-11-12-ruby-wallet-topup-design.md`
   - Kế hoạch: `docs/superpowers/plans/2026-11-12-ruby-wallet-topup.md`

Spec là căn cứ cao nhất; kế hoạch là cách làm. Gặp chỗ kế hoạch mâu thuẫn spec thì theo spec và ghi lại quyết định
(chỗ nào, chọn gì, vì sao) trong báo cáo cuối.

## Quyết định của chủ dự án (đừng đổi)

- Đăng ký: email bắt buộc + ô **nhập lại mật khẩu** (chỉ kiểm ở app). Đăng nhập bằng tên đăng nhập hoặc email. Không làm đăng nhập 2 bước.
- Quên mật khẩu: mã 6 số gửi qua Gmail, hết hạn 10 phút, sai tối đa 5 lần, 60 giây giữa hai thư, tối đa 5 thư/giờ;
  `auth:forgot` luôn trả `{ ok: true }` (không lộ tài khoản nào tồn tại).
- Trang chủ: hai nút **Đăng nhập** / **Đăng ký** ở đầu trang; link **Quên mật khẩu?** trong bảng đăng nhập.
- Ruby: gói 10k→100, 20k→200, 50k→550, 100k→1.150, 200k→2.400, 500k→6.250; lần được cộng đầu tiên ×2.
  Nhận tiền: BIDV · 6353025859 · BUI LE HUY PHUOC (QR VietQR có mã nạp `XL……` riêng mỗi tài khoản).
  Người chơi bấm "Tôi đã chuyển khoản" → quản trị (`ADMIN_USERNAMES=phuoc_2005`) duyệt trong game. Không có SePay ở giai đoạn này.
- Ruby tách hẳn khỏi xu Bầu cua / Cờ tỷ phú: không cược, không đổi ra xu hay tiền.

## Bảo mật (bắt buộc)

- **Không ghi tài khoản/mật khẩu Gmail vào bất kỳ file nào** (repo GitHub đang public). Code chỉ đọc biến môi trường
  `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_NAME`; chủ dự án tự đặt trên Render. Test dùng bộ gửi thư giả, không gửi thư thật.
  `MAIL_DEBUG=1` chỉ dùng khi chạy thử trên máy.
- Server mới là nơi kiểm tra mọi quyền (quản trị kiểm ở server cho từng lệnh), mọi số dư; app không tự tính số dư.

## Môi trường máy này (Windows 11)

- Node 24, Python 3.14, Git Bash có sẵn; mạng chậm (~100 KB/s) nên tránh cài thêm gói không có trong kế hoạch
  (kế hoạch chỉ thêm `nodemailer` + `@types/nodemailer` cho `server/`).
- Lệnh: trong `server/`: `npx vitest run`, `npx tsc --noEmit`, `npm run build`. Trong `app/`: `npx tsc --noEmit`, `npx expo lint`.
  Trước khi bàn giao: toàn bộ test server qua (hiện 171 test), typecheck + lint app sạch.
- E2E: theo mẫu `e2e/en-rules.mjs` (playwright-core, `CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe"`, biến `WEB`).
  Build web: `cd app && EXPO_PUBLIC_SERVER_URL=http://localhost:<cổng> npx expo export -p web --output-dir <thư mục tạm>`,
  phục vụ bằng `python -m http.server <cổng>`; server: `cd server && npm run build && PORT=<cổng> node dist/server.js`.
  **Cổng 3999 và 8081 có thể đang bị tiến trình khác dùng — chọn cổng khác (vd 4320/8395), không tắt tiến trình của người khác.**
  Không xuất web đè vào thư mục đang được `http.server` phục vụ (Windows khóa thư mục → `EBUSY`).
- Không cần MongoDB để chạy test (dùng `MemoryStore`); code Mongo vẫn phải viết đủ theo kế hoạch.

## Báo cáo khi xong

- Danh sách commit theo từng task, kết quả lệnh test/typecheck/lint/e2e (dán phần cuối kết quả).
- Các quyết định đã tự đưa ra khi kế hoạch chưa rõ, và rủi ro nếu quyết định đó sai.
- Việc chủ dự án cần làm trên Render: `SMTP_USER`, `SMTP_PASS`, `ADMIN_USERNAMES`, kiểm tra `DATABASE` đã đặt.
