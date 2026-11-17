# Phase 2B — Hệ Thống Chọc Ghẹo, Avatar Đa Dạng, Vật Phẩm Ruby & Đổi Map/Màu

## 1. Mở Rộng Ngoại Hình Avatar (`shared/src/types.ts`, `shared/src/avatars.ts`, `app/src/avatars.ts`)

### 1.1 Các đặc điểm mới bổ sung
- **+8 Kiểu tóc mới** (`CHARACTER_HAIRS` tổng cộng **26 kiểu**):
  - `twintails` (Buộc hai chùm đáng yêu)
  - `wolfcut` (Tóc layer sói cá tính)
  - `mullet` (Mullet gáy dài chất chơi)
  - `tetbim` (Tết bím hai bên)
  - `pompadour` (Vuốt phồng cổ điển)
  - `tocvan` (Tóc vấn / búi truyền thống)
  - `xoanxu` (Xoăn xù mì retro)
  - `hime` (Tóc công chúa Nhật Hime cut)
- **+12 Phụ kiện khuôn mặt & đầu** (`CHARACTER_ACCESSORIES` tổng cộng **29 món**):
  - `vuongmien` (👑 Vương miện vàng)
  - `kinhcyber` (🕶️ Kính Cyber phát sáng)
  - `taimeo` (🐱 Bờm tai mèo)
  - `sungquy` (😈 Sừng quỷ)
  - `vongthienthan` (😇 Vòng thiên thần)
  - `matnasoi` (🐺 Mặt nạ sói)
  - `kinhdiepvien` (🕵️ Kính điệp viên 007)
  - `hoacaitoc` (🌸 Hoa cài tóc)
  - `tainghe` (🎧 Tai nghe Gaming RGB)
  - `keomut` (🍭 Ngậm kẹo mút)
  - `matnaho` (🐯 Mặt nạ hổ)
  - `docnhan` (🏴‍☠️ Băng bịt mắt hải tặc)
- **+8 Trang phục** (`CHARACTER_OUTFITS` tổng cộng **21 bộ**):
  - `hoangbao` (Hoàng bào rồng vàng)
  - `aochoangsoi` (Áo choàng lông sói)
  - `thamtu` (Áo khoác thám tử cổ bẻ)
  - `hoodiergb` (Hoodie Gaming phát sáng)
  - `kimono` (Kimono hoa anh đào)
  - `giapvang` (Giáp chiến thần)
  - `vesttrang` (Vest trắng sang trọng)
  - `hiphop` (Áo phông Hip-hop dây xích)
- **+10 Nhân vật mẫu mới** (`AVATAR_PRESETS` tăng từ 26 lên **36 mẫu**):
  - 26: *Thám Tử Lừng Danh* (kính điệp viên, áo khoác thám tử, tóc vuốt)
  - 27: *Sói Đầu Đàn* (mặt nạ sói, áo choàng sói, tóc wolfcut)
  - 28: *Tiên Tri Vũ Trụ* (vòng thiên thần, tóc dài, vest trắng)
  - 29: *Phú Bà Kim Cương* (vương miện, trang sức kim cương, tóc xoăn)
  - 30: *Pháp Sư Hắc Ám* (sừng quỷ, tóc mullet, áo cổ cao)
  - 31: *Chiến Thần Gaming* (tai nghe RGB, hoodie RGB, kính cyber)
  - 32: *Tiểu Thư Anh Đào* (hoa cài tóc, kimono, tóc hime)
  - 33: *Điệp Viên 007* (kính râm điệp viên, vest, sẹo/nốt ruồi)
  - 34: *Hoàng Đế Đại Gia* (hoàng bào, vương miện, râu hoàng gia)
  - 35: *Idol Tóp Tóp* (tai mèo, buộc hai chùm, kẹo mút)

---

## 2. Hệ Thống Đổi Map & Màu Phòng (`shared/src/themes.ts`)

Mỗi `RoomTheme` gồm: `id`, `name`, `emoji`, `price` (`0` = miễn phí), `desc`, bảng màu (`bg`, `bgAlt`, `cardBg`, `cardBorder`, `textOnBg`, `accent`, `accentText`), và `particleFx` (hiệu ứng hạt CSS nền chạy GPU).

| ID | Tên | Giá Ruby | Phong cách & Hiệu ứng nền |
|---|---|---|---|
| `son_mac_dinh` | 🏮 Đỏ Sơn Xóm Lầy | 0 (Free) | Nền đỏ son truyền thống, vàng kim rực rỡ |
| `dem_trang_soi` | 🌕 Đêm Trăng Ma Sói | 0 (Free) | Tím than đêm trăng, ánh trăng bạc & đom đóm nhẹ |
| `pho_dem_neon` | 🌃 Phố Đêm Cyberpunk | 0 (Free) | Xanh đen công nghệ, viền neon cyan & tím hồng |
| `rung_ngoc_bich` | 🎋 Rừng Trúc Ngọc Bích | 0 (Free) | Xanh ngọc sâu dịu mắt, kem ấm & vàng cổ điển |
| `bien_xanh_he` | 🏖️ Biển Xanh Nắng Vàng | 0 (Free) | Xanh đại dương tươi mát, san hô & nắng vàng |
| `map_tet_viet` | 🧧 Phố Ông Đồ Ngày Tết | 350 💎 | Hoa mai hoa đào rơi nhẹ + đèn lồng đung đưa |
| `map_sakura_kyoto` | 🌸 Vườn Anh Đào Đêm | 450 💎 | Trời hoàng hôn tím hồng + cánh hoa anh đào bay chéo |
| `map_am_thuc_cho_dem` | 🍜 Chợ Đêm Sài Gòn | 500 💎 | Đèn bokeh ấm áp nhấp nháy không khí lễ hội |
| `map_casino_royale` | 🎰 Sòng Bài Hoàng Gia | 800 💎 | Thảm nhung ngọc lục bảo + kim cương lấp lánh |
| `map_long_cung` | 🐉 Thủy Cung Thần Long | 1.500 💎 | Sóng ánh sáng đại dương + bong bóng ngọc trai trôi |
| `map_cung_ngan_ha` | 🌌 Cung Điện Ngân Hà | 3.000 💎 | Dải ngân hà cực quang + hàng chục ngôi sao lấp lánh & sao băng |

- **Cách áp dụng**:
  - Trong `Profile` / `Cửa hàng`, người chơi trang bị `roomTheme` làm giao diện cá nhân mặc định của mình.
  - Chủ phòng trong `LobbyScreen` hoặc nút `🎨` ở `Shell` có thể đặt `room.settings.roomTheme` (bất kỳ Map miễn phí nào, hoặc Map Ruby mà chủ phòng sở hữu) để **cả phòng cùng chiêm ngưỡng bản đồ VIP của chủ phòng!**

---

## 3. Mở Rộng Kho Chọc Ghẹo & Kỹ Năng Mới

### 3.1 Kỹ năng trả Ruby mới (`SKILL_IDS`)
| ID | Tên | Giá | Hiệu ứng hình ảnh & âm thanh |
|---|---|---|---|
| `paparazzi` | 📸 Chụp lén Paparazzi | 12 💎 | Nháy đèn flash trắng liên tiếp 4 phát + hiện khung ảnh báo lá cải `"TIN NÓNG!"` |
| `cupid_arrow` | 💘 Mũi tên Ái Tình | 15 💎 | Bắn cung tên tim hồng xoay vòng tới avatar + mưa cánh hoa hồng |
| `ghost_scare` | 👻 Hù ma nửa đêm | 15 💎 | Bóng ma to mờ ảo lướt qua màn hình + âm thanh rùng rợn |
| `shark` | 🦈 Cá mập cắn mông | 18 💎 | Vây cá mập lướt sóng dưới đáy màn hình rồi táp lên avatar |
| `royal_seal` | 🏮 Ấn Ký Hoàng Gia | 30 💎 | Đóng dấu triện vàng `"TRẪM CHỈ ĐỊNH!"` rung màn hình uy nghi |
| `meteor` | ☄️ Thiên thạch giáng thế | 35 💎 | Quả cầu lửa kéo đuôi thiên thạch từ góc trên lao thẳng xuống avatar nổ tung |
| `blackhole` | 🕳️ Hố đen vũ trụ | 40 💎 | Xoáy tím đen hút avatar méo xoắn lại 4 giây |
| `dragon_roar` | 🐉 Rồng Thần Gầm Thét | 50 💎 | Đầu rồng vàng lượn khắp màn hình + sét vàng chói lòa |

### 3.2 Quà tặng cao cấp mới (`GIFT_IDS`)
- `gift_diamond_ring` (💍 Nhẫn Kim Cương — 150 💎)
- `gift_private_jet` (🛩️ Chuyên Cơ Riêng — 800 💎)
- `gift_golden_dragon` (🐉 Rồng Vàng Phú Quý — 2.000 💎)
- `gift_island` (🏝️ Đảo Thiên Đường — 3.500 💎)
- `gift_galaxy_palace` (🌌 Cung Điện Ngân Hà — 5.000 💎)
