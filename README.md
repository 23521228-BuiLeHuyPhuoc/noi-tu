# Xóm Lầy

Game party đa người chơi ngay trên trình duyệt điện thoại & máy tính: **9 trò chơi** hỗ trợ tới **12 người / phòng**, mời bằng link hoặc mã 6 ký tự:
- 🔤 **Nối từ** (1–8 người) & 🇬🇧 **Nối từ Anh** (1–8 người)
- 🦀 **Bầu cua** (1–12 người) & 🏦 **Cờ tỷ phú** (2–6 người)
- 🐺 **Ma Sói / Werewolf** (4–12 người — 9 vai trò, Kênh Sói ban đêm, Cặp Đôi, Thợ Săn, Kẻ Ngố)
- 🕵️ **Ai là gián điệp** (3–12 người — 160 cặp từ, vai Mr. White, chống lộ từ)
- 🎨 **Vẽ & Đoán** (2–12 người — Bảng vẽ vector, 180+ từ, bot biết vẽ nét mẫu)
- 💣 **Bom Chữ** (2–12 người — Gõ từ chứa âm tiết trước khi bom phát nổ)
- 🧠 **Đấu Trường Đố Vui** (1–12 người — 200 câu hỏi, chuỗi streak, câu cuối x2)

**Chơi ngay: <https://noi-tu-web.onrender.com>**

- **Hệ thống Nhân vật, Chọc lầy, VIP Phú Hào & Map Phòng**:
  - 36 nhân vật mẫu + tùy biến sâu tóc, mắt, mũi, miệng, trang phục, phụ kiện, hình xăm và 12 màu đại diện.
  - 11 **Map / Chủ đề màu phòng** (5 miễn phí + 6 Map động hiệu ứng Ruby: Tết Cổ Truyền, Hoa Anh Đào, Phố Ẩm Thực, Sòng Bài Hoàng Gia, Long Cung, Cung Trăng Ngân Hà).
  - **8 ô trang bị VIP** (`frame`, `nameFx`, `aura`, `entrance`, `pet`, `title`, `chatBubble`, `roomTheme`) + **Cấp bậc VIP Phú Hào 1→6** (lên tới *Thiên Đế Chí Tôn*), 19 kỹ năng chọc trả Ruby, 10 quà đại gia (tới 5.000 💎) và bộ Sticker Chữ Lầy.
  - **Tối ưu chống lag phòng 12 người**: Cache SVG 300 ảnh (LRU), tách tick bộ đếm giây từng widget, đăng ký trạng thái chọc theo từng avatar (`funState`), đồng bộ shader GPU CSS 60fps trên web và chế độ **⚡ Siêu mượt**.
- Cài như app: Android (Chrome) → menu ⋮ → **Thêm vào màn hình chính**. iPhone (Safari) → nút Chia sẻ → **Thêm vào MH chính**.

```
noi-tu/
  shared/   kiểu dữ liệu, từ vựng, bộ vai Ma Sói / Gián Điệp / Đố Vui / Vẽ & Đoán / Map / Shop VIP
  server/   Node.js + Socket.IO, trọng tài & bảo mật perPlayerView cho mọi game
    src/games/   wordchain.ts, baucua.ts, typhu.ts, masoi.ts, giandiep.ts, vedoan.ts, bomtu.ts, dovui.ts
  app/      giao diện React Native Web (Expo) — DiceBear Studio, Lucide, Fluent Emoji Flat, Game Icons, Be Vietnam Pro, Motion, Radix Colors & Open Props
  e2e/      test trình duyệt thật (Playwright đa màn hình & kiểm tra hình ảnh)
  docs/     tài liệu thiết kế các phase (00–09)
```

## Tóm tắt 9 trò chơi

1. **Nối từ (1–8 người)**: Nối từ 2 chữ tiếng Việt từ kho ~79.600 từ, 30s/lượt, có Cứu trợ & Xin duyệt từ mới.
2. **Nối từ Anh (1–8 người)**: Nối từ tiếng Anh từ kho 210.987 từ (SCOWL/ENABLE1/WordNet), dịch ngược bộ gõ Telex/VNI, giải nghĩa tiếng Việt + IPA, thời gian co dần từ 30s xuống 15s theo chuỗi.
3. **Bầu cua (1–12 người, xu ảo)**: 1.000 xu, cược 6 linh vật trong 20s, mở bát 3D, vay nóng 500 xu khi cháy túi, tổng kết theo số ván 10–30.
4. **Cờ tỷ phú (2–6 người)**: Bàn 40 ô Việt Nam, mua đất, nâng 3 nhà + khách sạn, bến ga, công ty tiện ích, Cơ hội/Khí vận, bán tài sản tránh phá sản.
5. **Ma Sói (4–12 người)**: 9 vai trò (`Sói`, `Tiên Tri`, `Bảo Vệ`, `Phù Thủy`, `Thợ Săn`, `Thần Tình Yêu`, `Kẻ Ngố`, `Thám Tử`, `Dân Làng`), bot thông minh & Kênh Sói ban đêm.
6. **Ai là gián điệp (3–12 người)**: 160 cặp từ tiếng Việt 8 chủ đề, chặn tự động lỗi nhắc từ khóa (`word_leaked`), Mr. White đoán từ lật kèo khi bị loại.
7. **Vẽ & Đoán (2–12 người)**: Bảng vẽ SVG đa màu mượt mà (`0..1000`), gợi ý chữ cái dần theo giờ, 25+ bộ nét vẽ mẫu cho Bot.
8. **Bom Chữ (2–12 người)**: Quả bom hẹn giờ chuyền tay đòi từ 2 chữ hợp lệ chứa âm tiết bom; mất hết 3 tim là bị loại.
9. **Đấu Trường Đố Vui (1–12 người)**: 200 câu hỏi trắc nghiệm A/B/C/D đa lĩnh vực, thưởng tốc độ + streak + x2 điểm ở 2 câu cuối.

---

## 1. Chạy thử trên máy tính

Cần Node.js 20 trở lên. Mở 2 cửa sổ terminal:

```bash
cd server && npm install && npm run dev          # server ở cổng 3000
cd app && npm install && npx expo start --web    # mở giao diện trên trình duyệt
```
Muốn thử trên điện thoại cùng Wi-Fi: chạy app với `EXPO_PUBLIC_SERVER_URL=http://<IP máy tính>:3000`, rồi mở `http://<IP máy tính>:8081` trên điện thoại.

## Đang chạy
- Web: <https://noi-tu-web.onrender.com>
- Server: <https://noi-tu-server.onrender.com> (kiểm tra: `/health`)
- Cả hai được tạo từ `render.yaml`. Mỗi lần push lên nhánh `main`, GitHub Actions kiểm tra code; nếu toàn bộ CI thành công, Render tự động deploy lại cả server lẫn web.

## 2. Đưa server lên mạng (miễn phí, Render)

1. Đẩy thư mục `noi-tu` lên một repo GitHub.
2. Vào <https://render.com> → **New → Blueprint**, kết nối GitHub và chọn repo đó. Render tự đọc file `render.yaml`, rồi tạo `noi-tu-server` và `noi-tu-web`.
3. Deploy xong sẽ có `https://noi-tu-server.onrender.com` và `https://noi-tu-web.onrender.com`. Mở `/health` trên địa chỉ server để kiểm tra, kết quả có dạng `{"ok":true,"words":79569,...}`.

Pipeline nằm ở `.github/workflows/ci-cd.yml`. `render.yaml` dùng `autoDeployTrigger: checksPass`, nên Render chỉ deploy commit mới sau khi type-check, test, lint và build đều thành công; không cần Deploy Hook hay Render API key trong GitHub.

Gói miễn phí sẽ "ngủ" sau 15 phút không có ai dùng. Người đầu tiên mở app sẽ phải chờ khoảng 1 phút, app có hiện thông báo trong lúc chờ. Trong lúc đang có người chơi, server không ngủ.

## Tài khoản & cơ sở dữ liệu (MongoDB)

Server đọc chuỗi kết nối MongoDB từ biến môi trường `DATABASE` (tên CSDL: biến `DATABASE_NAME`, mặc định `xomlay`). Trong đó có 3 bảng: `users` (mật khẩu băm scrypt), `sessions` (tự hết hạn sau 180 ngày), `words` (từ được người chơi duyệt).

- **Không** ghi chuỗi kết nối vào code hay file trong repo (repo đang public). Trên Render: **noi-tu-server → Environment → Add Environment Variable**, key `DATABASE`, value là chuỗi `mongodb://...` → Save, Render tự khởi động lại.
- MongoDB Atlas: mục **Network Access** phải cho phép IP của Render (đơn giản nhất là `0.0.0.0/0`), và nên dùng mật khẩu mạnh.
- Kiểm tra: `/health` trả về `"db":"mongo"`. Nếu thấy `"db":"memory"` nghĩa là chưa đặt biến hoặc không kết nối được (xem log), tài khoản chỉ lưu tạm và mất khi server khởi động lại.
- Chạy thử trên máy: `DATABASE='mongodb://...' npm run dev` trong thư mục `server`.

## Ruby (nạp bằng QR, quản trị duyệt tay)

Ruby là tiền trong game, chỉ dùng mua đồ vui; **không** cược trong Bầu cua / Cờ tỷ phú, **không** đổi ra xu hay tiền. Cần tài khoản.

| Gói | 10.000đ | 20.000đ | 50.000đ | 100.000đ | 200.000đ | 500.000đ |
|---|---|---|---|---|---|---|
| Ruby | 100 | 200 | 550 (+10%) | 1.150 (+15%) | 2.400 (+20%) | 6.250 (+25%) |

Lần được cộng **đầu tiên** của mỗi tài khoản nhân đôi. Số tiền không khớp gói: 1.000đ = 10 Ruby.

**Người chơi:** nạp Ruby bằng chuyển khoản **đang tạm ngưng** (đã gỡ QR và số tài khoản khỏi web); bảng **Nạp Ruby** chỉ còn số dư, yêu cầu cũ đang chờ và lịch sử. Ruby miễn phí vẫn nhận qua 🎁 Điểm danh.

**Quản trị** (tài khoản có tên trong `ADMIN_USERNAMES`, mở nút **🛠 Quản trị** ở trang chủ hoặc bảng ✏️):
- *Chờ duyệt*: mở app BIDV SmartBanking, thấy tiền về đúng mã thì bấm **Đã nhận tiền** (sửa ô "Thực nhận" nếu số tiền khác gói), không thấy thì **Không thấy**. Mỗi yêu cầu chỉ duyệt được một lần.
- *Theo mã*: nhập mã `XL……` + số tiền để cộng Ruby cho tài khoản có mã đó.
- *Doanh thu*: hôm nay / tháng này / tổng (giờ Việt Nam). *Cộng/trừ*: theo tên đăng nhập, bắt buộc ghi lý do, không làm âm số dư.

Trên Render (**noi-tu-server → Environment**): `ADMIN_USERNAMES=<tên đăng nhập tài khoản quản trị>` (nhiều người thì phân cách bằng dấu phẩy; tạo tài khoản đó trước). Cần `DATABASE` (MongoDB) để Ruby không mất khi server khởi động lại; nếu server lỡ chạy bộ nhớ tạm (`/health` → `"db":"memory"`) thì mọi lệnh quản trị bị chặn để người lạ không đăng ký trước tên quản trị (chỉ khi chạy thử trên máy mới đặt `ALLOW_MEMORY_ADMIN=1`). Đổi email cần nhập mật khẩu hiện tại; đổi/đặt lại mật khẩu thì các máy khác bị đăng xuất ngay.

## Gửi mã quên mật khẩu (Gmail)

Trong **noi-tu-server → Environment** trên Render đặt:

| Biến | Ý nghĩa |
|---|---|
| `SMTP_USER` | Địa chỉ Gmail gửi mã |
| `SMTP_PASS` | **Mật khẩu ứng dụng** Gmail 16 ký tự (Google Account → Bảo mật → Xác minh 2 bước → Mật khẩu ứng dụng), không phải mật khẩu Gmail |
| `SMTP_FROM_NAME` | Tên người gửi, mặc định `Xóm Lầy` (tùy chọn) |

**Không** ghi các giá trị này vào code hay repo. Thiếu biến thì nút Quên mật khẩu báo "Server chưa bật gửi mail", phần còn lại vẫn chạy (`/health` → `"mail": false`).
Mã hết hạn sau 10 phút, sai tối đa 5 lần, mỗi tài khoản tối đa 5 thư/giờ (cách nhau 60 giây). Đặt lại mật khẩu thì mọi máy khác bị đăng xuất.
`MAIL_DEBUG=1` chỉ dùng khi chạy thử trên máy (ghi thư ra log thay vì gửi), **không** đặt trên Render.

## Ảnh đại diện (Cloudinary)

Trong **noi-tu-server → Environment** trên Render, nhập đủ `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` từ tài khoản Cloudinary. `render.yaml` để cả ba biến ở `sync: false` để nhập riêng khi deploy. Chạy trên máy thì đặt các biến này trong môi trường của terminal chạy server.

**Không** ghi API secret vào code, repo, biến `EXPO_PUBLIC_*` hay cấu hình app; thông tin Cloudinary chỉ đặt ở server.

## 3. Thêm hoặc bớt từ

- `server/data/extra-words.txt`, `server/data/extra-words-en.txt`: thêm từ tiếng Việt (2 chữ) hoặc tiếng Anh (1 từ đơn)
- `server/data/banned-words.txt`, `server/data/banned-words-en.txt`: loại từ sai hoặc từ không muốn cho dùng

Sửa xong thì push lên nhánh `main`; khi CI thành công, Render tự deploy lại `noi-tu-server`. **Không cần build lại app.**

Muốn tạo lại toàn bộ `words.txt` từ nguồn:
```bash
cd server
npm run build:dict -- Viet74K.txt dictionary.json
```
Nguồn:
- [Viet74K](https://github.com/duyet/vietnamese-wordlist): dựa trên dự án từ điển của Hồ Ngọc Đức, GPL
- [vntk/dictionary](https://github.com/vntk/dictionary): Từ điển tiếng Việt thông dụng

Script chỉ giữ từ đúng 2 chữ, đúng cấu trúc âm tiết tiếng Việt, và bỏ tên riêng.

## 4. Test

```bash
cd server && npm test        # chuẩn hóa, từ điển Việt & Anh, luật 4 game, giới hạn chọc, hồ sơ, phòng, Socket.IO
cd server && npm run typecheck
cd app && npx tsc --noEmit && npx expo lint
```
Test giao diện (`e2e/`): build bản web của app, chạy server, rồi để nhiều trình duyệt Chrome (khung điện thoại) tự chơi với nhau: `play.mjs` (Nối từ), `edge.mjs` (tình huống đặc biệt), `games.mjs` (Nối từ Anh, Bầu cua, ném/khịa/hối), `typhu.mjs` (Cờ tỷ phú), `v2.mjs` (nghĩa từ, sticker Quỳnh Aka, bát Bầu cua, Cờ tỷ phú 40 ô), `accounts.mjs` (đăng ký/quên mật khẩu), `wallet.mjs` (nạp Ruby + quản trị duyệt), `en-rules.mjs` (Nối từ Anh: gõ Telex, cứu trợ nối hộ, thời gian giảm dần, đổi tên + ảnh giữa ván, giới hạn chọc, bù giờ). Xem đầu file `play.mjs` để biết cách chạy.

## Nguồn icon và ảnh (Cờ tỷ phú)
- Icon trên bàn cờ, bảng giữa và hiệu ứng là **Twemoji** (bản jdecked/twemoji, gói npm `@twemoji/svg`), giấy phép **CC-BY 4.0**, bản quyền (c) Twitter, Inc. và những người đóng góp: https://github.com/jdecked/twemoji. Chỉ các file SVG đang dùng được chép vào `app/assets/typhu-icons/`; chạy `node app/assets/typhu-icons/gen.mjs` để tạo lại `app/src/typhuIcons.ts` (data URI, không thêm thư viện lúc chạy).
- Ảnh địa danh trong bảng chi tiết ô lấy từ Wikimedia Commons / Wikipedia (xem `app/src/typhuArt.ts`). Trong game có dòng "Nguồn icon/ảnh" ở cuối bảng chi tiết mỗi ô.

## Nguồn hình (Kho chọc ghẹo)
- Hình 3D của hơn 200 món chọc ghẹo là **Fluent Emoji** của Microsoft, giấy phép **MIT**, bản quyền (c) Microsoft Corporation: https://github.com/microsoft/fluentui-emoji. App tải từng hình lúc chạy qua jsDelivr (`https://cdn.jsdelivr.net/gh/microsoft/fluentui-emoji@main/assets/...`), không chép vào repo; mất mạng thì hiện emoji gốc. Danh sách món, giá và mẫu hiệu ứng nằm ở `shared/src/pokes.ts`; chạy `node e2e/poke-gallery.mjs` để chụp ảnh từng mẫu.

## Cấu hình server (biến môi trường)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | 3000 | cổng |
| `TURN_SECONDS` | (theo từng game) | ép số giây mỗi lượt cho mọi game, dùng khi test |
| `DATA_DIR` | `server/data` | thư mục kho từ |

> Không bắt buộc: muốn đóng gói thành file APK thì `app/eas.json` đã có sẵn cấu hình (`npx eas-cli build -p android --profile preview`).
