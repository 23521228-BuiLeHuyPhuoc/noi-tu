# Cửa hàng Ruby, kỹ năng chọc mới, trang trí avatar, sticker, điểm danh, quà tặng (phần 3 + 4)

Ngày: 2026-11-12 · Chủ dự án yêu cầu làm hết, giá và danh sách là mặc định do Claude chọn (sửa được trong `shared/src/shop.ts`).

## Ràng buộc
- Ruby chỉ trừ/cộng qua `WalletStore.creditRuby` (nguyên tử, không âm, ghi sổ). Lý do sổ mới: `shop`, `skill`, `gift`, `checkin`.
- Ruby không bao giờ chuyển sang người khác, không đổi ra xu Bầu cua / Cờ tỷ phú, không ảnh hưởng thắng thua.
- Server là nơi kiểm tra mọi quyền và số dư. Khách (không tài khoản) không mua được; có lượt miễn phí như tài khoản.
- Danh mục dữ liệu nằm ở `shared/src/shop.ts` (app + server dùng chung): `id`, `kind`, `name`, `emoji`, `price`.

## 1. Lượt chọc miễn phí mỗi ngày
- Mỗi người (tài khoản theo id; khách theo playerId) có **30 lượt chọc miễn phí mỗi ngày** (giờ Việt Nam), tính chung mọi chiêu hiện có (đánh, ném, khịa, hối, chọc mất dạy…, trừ thả emoji và chat).
- Hết lượt: tài khoản trả **1 Ruby mỗi lần chọc**; không đủ Ruby hoặc là khách → `fun:send` trả `{ ok: false, reason: 'quota' }`, app báo "Hết 30 lượt chọc miễn phí hôm nay — nạp Ruby để chọc tiếp" (khách: "đăng ký tài khoản…").
- Lưu đếm trong bộ nhớ server (Map key `id|ngàyVN`), mất khi khởi động lại là chấp nhận được. App hiện "còn N lượt miễn phí" trong bảng chọc (`fun:quota` → `{ free, left }`).

## 2. Kỹ năng chọc mới (trả Ruby mỗi lần dùng, không tính lượt miễn phí)
| id | Tên | Giá | Hiệu ứng (trên máy người bị chọc; người khác thấy trên avatar + thông báo) |
|---|---|---|---|
| `lightning` | ⚡ Sét đánh | 10 | chớp trắng màn hình, avatar cháy đen 5 giây |
| `freeze` | 🧊 Đóng băng | 10 | viền băng phủ mép màn hình 4 giây, avatar xanh băng |
| `cake` | 🎂 Úp bánh kem | 15 | bánh kem dính một góc màn hình, chạm để lau (như mực) |
| `water` | 💦 Tạt nước | 8 | giọt nước chảy dọc màn hình 3 giây |
| `dog` | 🐕 Thả chó | 12 | chú chó chạy ngang màn hình kèm tiếng sủa |
| `rocket` | 🚀 Tên lửa | 20 | tên lửa bay từ người gửi tới avatar rồi nổ |
| `kiss` | 😘 Hôn gió | 5 | tim bay, avatar đỏ mặt (không làm phiền) |
- `lightning`, `freeze`, `cake`, `water`, `dog` là chiêu phá màn hình: theo giới hạn 3 lần/15 giây và bù giờ Nối từ như các chiêu hiện có (thêm vào `HARD_DISRUPT_KINDS`, `DISRUPT_PAUSE_MS`: 2000/3000/2000/2000/2500).
- Server trừ Ruby trước khi phát sự kiện; thiếu → `{ ok: false, reason: 'need_ruby' }`; khách → `reason: 'need_account'`.

## 3. Trang trí (mua một lần, dùng mãi, trang bị 1 món mỗi ô)
| ô | id | Tên | Giá |
|---|---|---|---|
| khung avatar `frame` | `frame_gold` 💛 Viền vàng 100 · `frame_fire` 🔥 Viền lửa 200 · `frame_rainbow` 🌈 Viền cầu vồng 300 · `frame_neon` ✨ Viền neon nhấp nháy 400 · `frame_dragon` 🐉 Viền rồng 500 |
| hiệu ứng tên `nameFx` | `name_rainbow` 🌈 Tên cầu vồng 150 · `name_sparkle` ✨ Tên lấp lánh 250 |
| hào quang `aura` | `aura_glow` 💫 Hào quang nhấp nháy khi tới lượt 300 · `aura_fire` 🔥 Lửa quanh avatar khi tới lượt 400 |
| vào phòng `entrance` | `enter_star` 🌟 Vào phòng có sao rơi + câu "X đã xuất hiện" 200 |
- `UserRecord` thêm `owned?: string[]`, `equipped?: { frame?: string; nameFx?: string; aura?: string; entrance?: string }`; `PublicUser` trả cả hai; `PublicPlayer` thêm `cosmetics?: { frame?; nameFx?; aura? }` (Room lấy từ tài khoản khi vào phòng và khi trang bị đổi).
- Vẽ trong `Avatar.tsx` (dải avatar mọi game) và `Portrait`: khung = viền/gradient quanh vòng tròn; neon/aura dùng `Animated` nhấp nháy; tên cầu vồng/lấp lánh ở dòng tên. Hào quang chỉ hiện khi `active` (đang tới lượt).
- Lệnh: `shop:buy { itemId }` → trừ Ruby rồi thêm vào `owned` (đã có → `already_owned`, không trừ); `shop:equip { slot, itemId | null }` (chưa sở hữu → `not_owned`).

## 4. Sticker mới
- Bộ **"Chữ Lầy"** 12 sticker tự vẽ (SVG tạo bằng code: chữ to viền đậm + emoji, nền màu): "GG EZ 😎", "Cay chưa 🌶️", "Đỉnh nóc kịch trần 🔥", "Ăn may thôi 🍀", "Gà quá 🐔", "Khóc tiếp đi 😭", "Từ từ thôi ⏳", "Xin vía 🙏", "Ảo thật đấy 🤯", "Thua tâm phục 🏳️", "Ai cho mà chơi 🙅", "Hên xui 🎲". Mua một lần 100 Ruby (id `pack_chu_lay`), người chưa mua thấy khóa 🔒.
- `STICKER_IDS` thêm `chu-01`…`chu-12`; server từ chối gửi sticker của bộ chưa sở hữu (`chat:send` → `{ ok: false }`).

## 5. Điểm danh hằng ngày (tài khoản)
- Chuỗi 7 ngày, thưởng Ruby: ngày 1–7 = 5, 5, 10, 10, 15, 15, 50. Ngày 8 quay lại ngày 1. Bỏ lỡ một ngày (giờ VN) → về ngày 1.
- `UserRecord` thêm `checkin?: { lastDay: string /* YYYY-MM-DD giờ VN */; streak: number }`.
- Lệnh `checkin:status` → `{ canClaim, streak, nextReward, rewards }`; `checkin:claim` → cộng Ruby (`reason: 'checkin'`), hôm nay đã nhận → `already_claimed`. Nhận nguyên tử (Mongo: cập nhật có điều kiện `checkin.lastDay != today`).
- App: nút **🎁 Điểm danh** ở trang chủ (chấm đỏ khi chưa nhận) mở bảng 7 ô ngày, ô hôm nay sáng lên, bấm Nhận → pháo giấy + `+N 💎`.

## 6. Quà tặng trong phòng
| id | Quà | Giá |
|---|---|---|
| `gift_rose` | 🌹 Hoa hồng | 10 |
| `gift_cake` | 🎂 Bánh sinh nhật | 30 |
| `gift_car` | 🏎️ Siêu xe | 200 |
| `gift_yacht` | 🛥️ Du thuyền | 500 |
| `gift_castle` | 🏰 Lâu đài | 1000 |
- `fun:send { kind: 'gift', to, gift }` (tài khoản; trừ Ruby người tặng). Người nhận **không** nhận Ruby; được cộng "điểm quà" (`UserRecord.giftPoints`, = giá quà) nếu có tài khoản, hiện trên thẻ hồ sơ ("💝 1.240 điểm quà").
- Mọi người trong phòng thấy hiệu ứng tràn màn hình theo mức quà (hoa: tim bay; bánh: nến + pháo; xe/du thuyền/lâu đài: biểu tượng to bay qua màn hình + chữ "X tặng Y 🏎️ Siêu xe"), 3–5 giây, không chặn thao tác.
- Mục **🎁 Tặng quà** trong bảng chọc (`ThrowSheet`).

## 7. Cửa hàng (app)
- `ShopSheet` mở từ trang chủ (nút **🛍️ Cửa hàng** cạnh Nạp Ruby) và từ bảng ✏️. Tab: Kỹ năng (xem giá, dùng trong bảng chọc), Trang trí (mua / trang bị / gỡ, xem trước khung trên chân dung của mình), Sticker, Quà. Số dư 💎 luôn hiện, thiếu Ruby thì nút "Nạp thêm" mở `WalletSheet`.

## 8. Kiểm thử
- Server: mua (đủ/thiếu Ruby, mua lại), trang bị (chưa sở hữu), kỹ năng trả phí (thiếu Ruby, khách), lượt miễn phí (31 lần → lần 31 trừ 1 Ruby / bị chặn với khách), điểm danh (nhận 2 lần cùng ngày, chuỗi liên tiếp, bỏ lỡ một ngày về 1, ngày 7 = 50), quà (trừ người tặng, cộng điểm quà người nhận, không cộng Ruby), sticker bộ khóa.
- `npx vitest run`, `npx tsc --noEmit` (server, app), `npx expo lint` phải sạch.
