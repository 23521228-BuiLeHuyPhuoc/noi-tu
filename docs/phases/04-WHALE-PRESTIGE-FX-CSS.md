# Phase 2C — Hiệu Ứng Đẳng Cấp Đại Gia (Pay Nhiều = Đẹp & Hoành Tráng Nhất Xóm)

## 1. Triết Lý Thiết Kế "Pay-to-Flex" (Đẹp & Đã Mắt, Tuyệt Đối Công Bằng Thắng Thua)

Người chơi tiêu nhiều Ruby (mua khung đắt, kỹ năng VIP, tặng siêu quà, sở hữu map) được tưởng thưởng bằng **hiệu ứng thị giác vượt trội**, **shader CSS 60fps** và **hệ thống Cấp Bậc Danh Giá** để nổi bật ngay khi bước vào phòng — trong khi không bao giờ can thiệp vào xác suất hay thắng thua của bất kỳ game nào.

---

## 2. Hệ Thống Cấp Bậc Đại Gia (`vipTier` 0..6)

- **Cách tính điểm Uy Tín (`prestigePoints`)**:
  - Cộng dồn `user.rubySpent` mỗi khi người chơi trừ Ruby qua `shop:buy`, `fun:send` (kỹ năng/quà/vượt 30 lượt), hoặc `fun:chaos`.
  - Đối với tài khoản cũ đã mua đồ trước khi có `rubySpent`, lấy `Math.max(user.rubySpent ?? 0, totalOwnedCatalogValue)` để quyền lợi không bị mất!
- **7 Bậc Danh Giá (`VIP_TIERS` trong `shared/src/shop.ts`)**:
  - `VIP 0` (`0`): Dân Chơi Xóm (mặc định)
  - `VIP 1` (`200+ 💎`): `🥉 Đồng Lầy` — Huy hiệu đồng cạnh tên
  - `VIP 2` (`600+ 💎`): `🥈 Bạc Sành Điệu` — Huy hiệu bạc + viền thẻ nổi bật
  - `VIP 3` (`1.500+ 💎`): `👑 Vàng Quý Tộc` — Vương miện vàng + ánh kim thẻ hồ sơ
  - `VIP 4` (`3.500+ 💎`): `💎 Kim Cương Đại Gia` — Lấp lánh lăng kính xanh dương
  - `VIP 5` (`7.500+ 💎`): `🐉 Huyền Thoại Thần Long` — Hào quang rồng vàng rực
  - `VIP 6` (`15.000+ 💎`): `🌌 Chí Tôn Vũ Trụ` — Gradient cực quang động toàn thẻ hồ sơ + vương miện thiên hà!

---

## 3. Bộ 8 Ô Trang Bị & Hiệu Ứng CSS Thuần GPU (`FxStyles.tsx`, `Cosmetics.tsx`)

### 3.1 Bộ CSS `@keyframes` Tối Ưu GPU (`app/src/components/FxStyles.tsx`)
Inject duy nhất 1 thẻ `<style id="xomlay-fx-css">` trên Web (trên Native rơi về `Animated` tối giản):
- `xl-spin` / `xl-spin-rev`: Xoay vòng halo viền cầu vồng, kiếm bay, thiên hà bằng `transform: rotate()` (chạy hoàn toàn trên GPU compositor).
- `xl-shimmer`: Chạy dải sáng gradient chữ VIP (`background-position`).
- `xl-float`: Nhún nhảy êm ái cho **Thú Cưng Trên Vai (`pet`)**.
- `xl-pulse-glow`: Nhịp thở hào quang neon/lửa/cánh thiên thần.
- `xl-petal-fall` / `xl-star-twinkle`: Hiệu ứng hạt môi trường cho **Map Phòng**.
- `xl-glitch`: Hiệu ứng chớp nhiễu Cyberpunk cho danh hiệu/tên tối thượng.

### 3.2 Chi Tiết Các Ô Trang Bị Mở Rộng
1. **`frame` (14 mẫu tổng cộng)**:
   - Từ `frame_gold` (100💎) tới các siêu khung mới:
   - `frame_sakura` (250), `frame_thunder` (450), `frame_ice_crown` (550), `frame_cyber` (700), `frame_phoenix` (950), `frame_galaxy` (1500), `frame_jade_emperor` (2500), `frame_celestial_sword` (3800 — **4 thanh kiếm nhỏ xoay quanh vòng tròn avatar!**), `frame_supreme_god` (6000 — **2 vòng hào quang rune xoay ngược chiều + vương miện Chí Tôn!**).
2. **`nameFx` (10 mẫu)**:
   - `name_rainbow`, `name_sparkle` + 8 mẫu mới: `name_gold_liquid`, `name_fire_blaze`, `name_neon_pulse`, `name_ice_crystal`, `name_blood_moon`, `name_galaxy_shimmer`, `name_royal_3d`, `name_divine_glitch`.
3. **`aura` (9 mẫu)**:
   - Hiển thị tỏa sáng dịu liên tục nếu là aura cao cấp, và **bùng nổ rực rỡ khi `active` (tới lượt)**:
   - `aura_glow`, `aura_fire` + `aura_sakura` (350), `aura_lightning` (500), `aura_butterfly` (600), `aura_gold_coins` (800), `aura_dark_wolf` (900), `aura_holy_wings` (1600 — đôi cánh ánh sáng 2 bên avatar!), `aura_cosmic_orbit` (3200 — hành tinh quay quanh!).
4. **`entrance` (7 mẫu vào phòng)**:
   - `enter_star` + `enter_red_carpet` (350 — thảm đỏ + chữ đại gia), `enter_supercar` (600 — siêu xe chạy ngang), `enter_thunder_god` (900 — sấm chớp lóe màn hình), `enter_fireworks` (1200 — pháo hoa nổ tung), `enter_dragon_descent` (2500 — Rồng vàng giáng lâm), `enter_galaxy_portal` (4500 — Cổng không gian ngân hà toàn màn hình!).
5. **`pet` (7 Thú Cưng Bay Góc Avatar)**:
   - Đậu lơ lửng góc trên phải/trái avatar, nhún nhảy nhịp `xl-float`:
   - `pet_shiba` 🐕, `pet_cat_boba` 🐱, `pet_capybara` 🦫, `pet_ghost_cute` 👻, `pet_baby_dragon` 🐲, `pet_phoenix_chick` 🦅, `pet_ufo_drone` 🛸.
6. **`title` (7 Danh Hiệu Dưới Tên)**:
   - Pill nổi bật viền vàng/tím/cyber ngay trên tên: *Trùm Xóm*, *Thần Bài*, *Vua Nối Từ*, *Thám Tử Tài Ba*, *Sói Đầu Đàn*, *Phú Hào Đệ Nhất*, *Chí Tôn Xóm Lầy*.
7. **`chatBubble` (6 Kiểu Bong Bóng Chat Riêng)**:
   - Làm đẹp cho cả bóng chat nổi dưới avatar (`FunLayer`) lẫn khung tin nhắn trong `ChatSheet`: Anh Đào, Neon Tím, Cyber, Vàng Hoàng Gia, Cuộn Thư Rồng, Dải Ngân Hà.
8. **`roomTheme` (6 Map Động Ruby)**: Tích hợp chung kho đồ Cửa hàng.

---

## 4. Hệ Thống Combo Chọc Ghẹo Liên Hoàn (`Poke Combo HUD`)

- Trong `FunLayer`, theo dõi thời điểm 2 lần chọc/kỹ năng/tặng quà liên tiếp trong vòng `4 giây`.
- Hiển thị huy hiệu chữ Comic phóng to + rung nhẹ ở góc trên giữa:
  - 2–3 phát: `🔥 COMBO x2!` / `⚡ COMBO x3!`
  - 4–6 phát: `💥 LIÊN HOÀN x5!`
  - 7+ phát: `🌪️ SIÊU BÃO XÓM LẦY xN!`
