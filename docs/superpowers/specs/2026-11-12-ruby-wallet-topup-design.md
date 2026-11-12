# Ví Ruby và nạp tiền bằng QR, quản trị duyệt tay (phần 1/3 của hệ thống kiếm tiền)

Ngày: 2026-11-12 · Trạng thái: chờ duyệt (bản 2 — đổi từ SePay tự động sang duyệt tay)

## 1. Mục tiêu

Người chơi Xóm Lầy chuyển khoản vào tài khoản BIDV của chủ dự án để nhận **Ruby** (tiền tệ trong game, "cho vui" ở giai đoạn này).
Chủ dự án xem biến động số dư trên app BIDV SmartBanking rồi bấm duyệt trong game; Ruby vào ví người chơi ngay khi duyệt.
Đây là phần nền móng; hai phần sau dùng Ruby:

- Phần 2: điểm danh hằng ngày, tặng quà trong phòng.
- Phần 3: cửa hàng (kỹ năng chọc mới, hiệu ứng, khung avatar, sticker), giới hạn lượt dùng của gói miễn phí.

Thành công khi: người chơi chọn gói, quét QR là chuyển được đúng tài khoản, đúng số tiền, đúng nội dung; chủ dự án duyệt được trong
vài chạm; không bao giờ cộng trùng hay cộng sai người. Sau này có thể gắn SePay để tự động mà người chơi không thấy gì thay đổi.

### Quyết định của chủ dự án

| Mục | Quyết định |
|---|---|
| Xác nhận tiền vào | **Duyệt tay**: chủ dự án đối chiếu app BIDV rồi bấm duyệt trong trang quản trị. SePay để sau. |
| Tài khoản nhận | BIDV · 6353025859 · BUI LE HUY PHUOC |
| Giá | Theo gói (bảng ở mục 3), gói lớn được tặng thêm |
| Khuyến mãi | Nạp lần đầu nhân đôi Ruby (mỗi tài khoản một lần) — chủ dự án có thể yêu cầu bỏ |
| Quản trị | Tài khoản game `phuoc_2005` (biến môi trường `ADMIN_USERNAMES`) |

### Ràng buộc bắt buộc

- **Ruby tách hẳn khỏi xu Bầu cua / Cờ tỷ phú**: không đặt cược bằng Ruby, không đổi Ruby ra xu hay ra tiền, không rút tiền.
- Ruby chỉ có ở **tài khoản** (khách phải tạo tài khoản mới nạp/giữ Ruby). Ruby không hết hạn.
- Server không bao giờ tự cộng Ruby chỉ vì người chơi bấm "Tôi đã chuyển" — chỉ cộng khi quản trị duyệt.
- Thông tin ngân hàng là thông tin công khai để nhận tiền nên được ghi trong code; không có khóa bí mật mới nào.
- Ghi chú pháp lý cho chủ dự án (đã báo, không phải ý kiến luật sư): bán vật phẩm ảo thu tiền thật thuộc diện quản lý game
  online (Nghị định 147/2024/NĐ-CP).

### Ngoài phạm vi phần này

Tự động xác nhận qua SePay (để sau), điểm danh, quà, cửa hàng, giới hạn gói miễn phí, hoàn tiền thật
(xử lý ngoài hệ thống; quản trị trừ Ruby bằng tay).

## 2. Cách làm đã chọn

Mỗi tài khoản có **mã nạp cố định** nằm sẵn trong nội dung QR. Người chơi bấm **"Tôi đã chuyển khoản"** để tạo một yêu cầu chờ duyệt;
quản trị thấy danh sách yêu cầu (mã, gói, số tiền, giờ), đối chiếu app BIDV và bấm **Đã nhận tiền** hoặc **Không thấy tiền**.
Ai chuyển mà quên bấm thì quản trị vẫn cộng được bằng cách nhập mã + số tiền thấy trong app BIDV.
Đã cân nhắc và để sau: SePay/Casso tự động (tốn phí, phải đăng ký); chuyển tiếp SMS ngân hàng (dễ trục trặc, rủi ro bảo mật).

## 3. Bảng giá (dùng chung app + server, `shared/src/ruby.ts`)

| Gói | Ruby | Thưởng |
|---|---|---|
| 10.000đ | 100 | — |
| 20.000đ | 200 | — |
| 50.000đ | 550 | +10% |
| 100.000đ | 1.150 | +15% |
| 200.000đ | 2.400 | +20% |
| 500.000đ | 6.250 | +25% |

- Số tiền quản trị xác nhận **đúng bằng** giá một gói → Ruby của gói đó.
- Không khớp gói nào → `floor(số tiền / 1.000) × 10` Ruby (không thưởng). Dưới 1.000đ → không cộng.
- Lần được cộng **đầu tiên** của tài khoản → nhân đôi.

`shared/src/ruby.ts` xuất: `RUBY_PACKS` (`{ amount, ruby, bonus }[]`), `rubyForAmount(amount, first): number`,
`TOPUP_BANK` (`{ bank: 'BIDV', bin: '970418', account: '6353025859', name: 'BUI LE HUY PHUOC' }`),
`TOPUP_CODE_RE` (`/XL[0-9A-Z]{6}/`), `normalizeTopupCode(text): string | null` (in hoa, bỏ khoảng trắng và `-._`, tìm mã),
`vietQrUrl(amount: number | null, memo: string): string`.

## 4. Dữ liệu

### Người dùng (thêm vào `UserRecord` / `UserDoc`)

- `ruby: number` — số dư, mặc định 0, không bao giờ âm.
- `topupCode: string` — `XL` + 6 ký tự từ bảng `23456789ABCDEFGHJKLMNPQRSTUVWXYZ` (bỏ `0 O 1 I`), duy nhất (unique, sparse index).
  Cấp khi tạo tài khoản; tài khoản cũ được cấp khi mở ví lần đầu.
- `firstTopupAt?: Date` — đã nhận khuyến mãi lần đầu.
- `PublicUser` thêm `ruby: number` (chỉ trả cho chính chủ trong phiên đăng nhập).

### Sổ Ruby `ruby_ledger`

Mỗi thay đổi số dư một dòng: `{ userId, delta, balance, reason, ref?, by?, at }`.
`reason`: `topup` | `admin_adjust` (phần 2, 3 thêm `checkin`, `gift`, `shop`…). `ref` = mã yêu cầu nạp. Index `{ userId: 1, at: -1 }`.

### Yêu cầu nạp `topup_requests`

`{ id, userId, username, code, amount, status: 'pending' | 'approved' | 'rejected', createdAt, handledAt?, handledBy?, ruby? }`.
- Người chơi tạo khi bấm "Tôi đã chuyển khoản" (gói đã chọn). Tối đa 3 yêu cầu `pending` mỗi tài khoản; quá thì báo chờ duyệt.
- Quản trị cộng theo mã (người chơi quên bấm) cũng tạo một bản ghi `approved` để có lịch sử và tính doanh thu.
- Index `{ status: 1, createdAt: -1 }`.

### Thao tác lưu trữ (`WalletStore`, `server/src/walletStore.ts`, có `MemoryWalletStore` và `MongoWalletStore`)

Tách khỏi `store.ts` (file đã ~330 dòng); `MongoWalletStore` dùng chung kết nối của `MongoStore` (thêm getter `db`).
- `ensureTopupCode(userId): Promise<string>`
- `userIdByTopupCode(code): Promise<string | null>`
- `createRequest(userId, username, code, amount): Promise<TopupRequest | 'too_many'>`
- `listRequests(status, limit): Promise<TopupRequest[]>`, `requestById(id)`
- `resolveRequest(id, status, by, ruby?): Promise<TopupRequest | null>` — chỉ đổi khi đang `pending` (nguyên tử) → chống duyệt hai lần.
- `addApproved(userId, username, code, amount, by, ruby): Promise<TopupRequest>`
- `markFirstTopup(userId): Promise<boolean>` — đặt `firstTopupAt` nếu chưa có (nguyên tử), `true` nếu lần này là lần đầu.
- `creditRuby(userId, delta, reason, ref?, by?): Promise<number | null>` — cộng/trừ nguyên tử (Mongo `findOneAndUpdate` điều kiện
  `ruby >= -delta` khi trừ), ghi sổ; trả số dư mới, `null` nếu không đủ.
- `balance(userId)`, `history(userId, limit)`, `revenue(): Promise<{ today: number; month: number; total: number }>` (cộng `amount` các yêu cầu `approved`, theo giờ Việt Nam).

## 5. Luồng duyệt (server, `server/src/wallet.ts`)

**Duyệt yêu cầu** (`admin:approve { id, amount? }`, `amount` mặc định = số tiền trong yêu cầu, quản trị sửa được nếu thực nhận khác):
1. Kiểm tra quản trị. `resolveRequest(id, 'approved', admin)` — không còn `pending` → báo "đã xử lý" (không cộng lần hai).
2. `first = markFirstTopup(user)`, `ruby = rubyForAmount(amount, first)`, ghi `ruby` vào yêu cầu, `creditRuby(user, ruby, 'topup', id, admin)`.
3. Đẩy `wallet:update { ruby, delta, reason: 'topup' }` tới mọi socket đang đăng nhập tài khoản đó (EventEmitter như `auth.profiles`).

**Từ chối** (`admin:reject { id }`): chuyển `rejected`, đẩy `wallet:rejected { amount }` cho người chơi.

**Cộng theo mã** (`admin:creditCode { code, amount }`): `normalizeTopupCode` → tài khoản → như bước 2–3, tạo bản ghi `approved`.

**Cộng/trừ tay** (`admin:adjust { username, delta, reason }`): lý do bắt buộc (1–100 ký tự), không làm âm số dư, ghi sổ `admin_adjust`.

## 6. Socket cho app

Người chơi (đã đăng nhập; khách nhận `{ ok: false, error: 'need_account' }`):
- `wallet:get` → `{ ruby, topupCode, firstTopupDone, pending: TopupRequest[] }` (cấp mã nếu chưa có).
- `wallet:request { amount }` → tạo yêu cầu; `amount` phải đúng giá một gói trong `RUBY_PACKS` (sai → `bad_request`).
  Giới hạn tần suất như các lệnh khác.
- `wallet:history` → 30 dòng sổ gần nhất.
- Server → app: `wallet:update`, `wallet:rejected`.

Quản trị (`username ∈ ADMIN_USERNAMES`, kiểm tra ở server cho từng lệnh; người khác nhận `{ ok: false, error: 'forbidden' }`):
`admin:requests { status }`, `admin:approve`, `admin:reject`, `admin:creditCode`, `admin:adjust`, `admin:revenue`.
`PublicUser` thêm `admin?: true` để app biết hiện nút Quản trị.

## 7. Giao diện (app)

- **Trang chủ**: thẻ tài khoản hiện `💎 <số dư>` + nút **Nạp Ruby**. Khách bấm nạp → mời tạo tài khoản.
- **Bảng hồ sơ ✏️** (mở được trong phòng, giữa ván): mục **Ví Ruby** (số dư, Nạp, Lịch sử); quản trị thấy nút **Quản trị**.
- **Bảng "Nạp Ruby"** (`app/src/components/Wallet.tsx`):
  1. Lưới 6 gói: giá, Ruby, nhãn thưởng, nhãn **x2 lần đầu** khi chưa được cộng lần nào.
  2. Màn chuyển khoản: ảnh QR `vietQrUrl(amount, code)` =
     `https://img.vietqr.io/image/970418-6353025859-compact2.png?amount=<số tiền>&addInfo=<mã>&accountName=BUI%20LE%20HUY%20PHUOC`
     (ảnh lỗi thì chỉ còn phần chữ); dòng Ngân hàng / STK / Chủ TK / Số tiền / Nội dung, mỗi dòng có nút sao chép;
     cảnh báo "Giữ nguyên nội dung chuyển khoản"; nút **Lưu ảnh QR**.
  3. Nút **Tôi đã chuyển khoản** → "Đang chờ duyệt (thường trong ngày)". Yêu cầu chờ hiện ở mục Ví Ruby, đóng bảng không mất.
  4. Nhận `wallet:update` (ở bất kỳ màn nào) → thông báo `+550 💎` + pháo giấy; `wallet:rejected` → thông báo "Chưa thấy khoản chuyển … liên hệ quản trị".
- **Lịch sử Ruby**: dòng `+550 Nạp gói 50.000đ` kèm ngày giờ.
- **Quản trị** (`app/src/components/Admin.tsx`): tab **Chờ duyệt** (mã, tên, số tiền, giờ; ô số tiền thực nhận; nút Đã nhận / Không thấy),
  **Cộng theo mã** (mã + số tiền), **Doanh thu** (hôm nay / tháng / tổng), **Cộng-trừ Ruby** (tên đăng nhập, số, lý do).
- Số dư luôn đọc từ server khi mở ví / kết nối lại; app không tự tính số dư.

## 8. Cấu hình

| Biến (Render → noi-tu-server → Environment) | Ý nghĩa |
|---|---|
| `ADMIN_USERNAMES` | Tên đăng nhập quản trị, phân cách bởi dấu phẩy: `phuoc_2005` |

Cần MongoDB (`DATABASE`) để Ruby không mất khi server khởi động lại; thiếu DB thì `/health` báo `db: memory` như hiện nay.
README có hướng dẫn quy trình duyệt cho chủ dự án.

## 9. Kiểm thử

- Đơn vị (`server/test/ruby.test.ts`): `rubyForAmount` mọi gói, số lẻ, dưới 1.000đ, nhân đôi lần đầu; `normalizeTopupCode` với
  khoảng trắng / chữ thường / ký tự lạ; `vietQrUrl` mã hóa đúng tham số; `creditRuby` không cho âm, ghi sổ đúng số dư;
  `resolveRequest` chỉ đổi được một lần.
- Tích hợp (`server/test/wallet.test.ts`, Socket.IO thật): khách gọi ví → `need_account`; tạo yêu cầu, quá 3 yêu cầu chờ → `too_many`;
  quản trị duyệt → người chơi nhận `wallet:update` và số dư đúng; duyệt lần hai / duyệt song song → chỉ cộng một lần;
  lần nạp thứ hai không nhân đôi; duyệt với số tiền khác gói → cộng theo tỉ lệ; từ chối → `wallet:rejected`, không cộng;
  cộng theo mã; người thường gọi lệnh quản trị → `forbidden`; `admin:adjust` không làm âm số dư; doanh thu cộng đúng.
- E2E (`e2e/wallet.mjs`): đăng ký tài khoản thường và tài khoản quản trị, mở bảng nạp thấy QR + mã, bấm "Tôi đã chuyển",
  quản trị duyệt → người chơi thấy `+… 💎` và số dư mới.
- `npx tsc --noEmit`, `npx expo lint`, toàn bộ test server phải qua.
