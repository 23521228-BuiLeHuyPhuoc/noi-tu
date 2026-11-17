# Phase 7 — Báo Cáo Kiểm Thử Toàn Diện, Chụp Ảnh Màn Hình & Rà Soát Lỗi

> Cập nhật theo kết quả chạy thực tế sau các vòng sửa lỗi hiển thị và logic.

---

## 1. Kết Quả Kiểm Thử Tự Động

1. **Server TypeScript & Build**: `cd server && npm run typecheck && npm run build` → pass sạch `0` lỗi (`dist/server.js`).
2. **Server Unit & Integration Tests (`vitest`)**:
   - Bộ test mới bổ sung:
     - `server/test/secret-view.test.ts` (3 tests): phòng 12 người, 12 màu đại diện, `winnerIds` theo phe, cô lập `perPlayerView` trên Socket.IO.
     - `server/test/prestige-themes.test.ts` (3 tests): cấp VIP 0–6, điểm Phú Hào `rubySpent`, trang bị đủ 8 ô (`pet`, `title`, `chatBubble`, `roomTheme`), Map Ruby, kỹ năng VIP & siêu quà `5000💎`.
     - `server/test/masoi.test.ts` (5 tests): 9 vai trò, Kênh Sói ban đêm, Bảo Vệ chống trùng, Phù Thủy cứu/độc, Cupid cặp đôi thắng Top 2, Thợ Săn bắn kéo theo, Kẻ Ngố thắng độc lập, full ván 10 bot.
     - `server/test/giandiep.test.ts` (4 tests): 160 cặp từ, ẩn `myWord` theo máy, Mr. White không nói đầu vòng 1, chặn `word_leaked`, hòa phiếu, Mr. White đoán từ lật kèo, full ván 8 bot.
     - `server/test/party-games.test.ts` (6 tests): `ve_doan` (180+ từ khóa, mask chữ, vẽ/hoàn tác/xóa, đoán trúng, 4 bot), `bom_tu` (từ điển 79k + fallback, lỗi `chain`/`used`/`format`, nổ bom trừ tim, 4 bot), `do_vui` (200 câu hỏi, ẩn `correctIndex` ở pha `question`, streak + `x2` 2 câu cuối, 4 bot).
   - Toàn bộ suite cũ + mới (`fun.test.ts`, `lobby.test.ts`, `room.test.ts`, `shop.test.ts`, `typhu-full.test.ts`, v.v.) đều xanh 100%.
3. **App TypeScript & Expo Lint**: `cd app && npx tsc --noEmit && npm run lint` → pass sạch `0` errors, `0` warnings.
4. **E2E Trình Duyệt Thật (`playwright-core` với Chrome)**:
   - `e2e/smoke-new.mjs` (regression cho Điểm danh, Cửa hàng, Admin cấp Ruby, Bot Nối từ, Quà/Bảng chọc, Sticker khóa, Cờ tỷ phú 844×390): **`ALL OK` (`0 failures`, `0 pageerror`)**.
   - `e2e/mega-audit.mjs` (Desktop `1280×800` + Mobile `390×844`): **`MEGA AUDIT ALL OK` (`0 failures`, `0 pageerror`)**.

---

## 2. Bộ Ảnh Chụp Màn Hình Đã Rà Soát Trực Tiếp (`screenshots/`)

| STT | File Ảnh | Màn Hình / Luồng Kiểm Tra | Trạng Thái Sau Rà Soát |
|---|---|---|---|
| 01 | `01-home-desktop.png` | Trang chủ PC `1280×800`: 9 game 2 cột, bộ lọc, thanh công cụ | Đạt (đã nâng tương phản nút `Nạp Ruby`) |
| 02 | `02-home-mobile.png` | Trang chủ Mobile `390×844`: gọn, không tràn mép ngang | Đạt |
| 03 | `03-home-map-picker.png` | Hộp thoại chọn nhanh 11 Map tại Trang chủ | Đạt |
| 04 | `04-shop-vip6-preview.png` | Cửa hàng VIP 6 (`Chí Tôn Vũ Trụ`) + Live Stage 8 ô | Đạt |
| 05 | `05-profile-vip6-home.png` | Thẻ hồ sơ VIP 6 + danh hiệu + khung + thú cưng trên Map Ngân Hà | Đạt (đã tăng viền tối `NameText`) |
| 06 | `06-lobby-12players-galaxy.png` | Phòng 12 người đủ 12 avatar trên thanh ngang, nút `Bắt đầu` | Đạt |
| 07 | `07-lobby-customizer-map.png` | Tùy biến nhân vật 36 presets + tủ đồ thu/mở chi tiết | Đạt |
| 08 | `08-vip-skill-dragon.png` | Kỹ năng Thần Thoại `Rồng Thần Gầm Thét` | Đạt |
| 09 | `09-mega-gift-galaxy.png` | Siêu quà 5.000 💎 `Cung Điện Ngân Hà` + Combo HUD | Đạt |
| 10 | `10-masoi-night.png` | Ma Sói: thẻ vai trò lật ẩn/hiện, 6 ghế, Kênh Sói, đồng hồ đêm | Đạt (đã bật `lightText` đồng hồ) |
| 12 | `12-giandiep-clue.png` | Ai Là Gián Điệp: hồ sơ bí mật + nhập gợi ý vòng 1 | Đạt |
| 13 | `13-giandiep-leak-blocked.png` | Chặn tự động lỗi nhắc thẳng từ khóa (`word_leaked`) trên UI | Đạt |
| 15 | `15-vedoan-drawing.png` | Vẽ & Đoán: họa sĩ vẽ nhiều nét SVG (đen + đỏ) hiển thị sắc nét | Đạt (đã chuyển sang DOM `<svg>` + Pointer Events trên Web) |
| 16 | `16-vedoan-guessed.png` | Vẽ & Đoán trên Mobile: đồng bộ 2 nét SVG & báo đoán trúng | Đạt |
| 17 | `17-bomtu-gameplay.png` | Bom Chữ: bom rung, âm tiết nổi bật, tim sinh tồn, báo lỗi | Đạt (đã bật `lightText` & `theme.onBg`) |
| 18 | `18-dovui-question.png` | Đấu Trường Đố Vui: 4 nút đáp án A/B/C/D & BXH trực tiếp | Đạt |
| 19 | `19-dovui-reveal.png` | Mở đáp án đúng/sai + hộp giải thích kiến thức | Đạt |
| 20 | `20-result-screen.png` | Màn Tổng Kết pháo giấy + bảng xếp hạng + nút chuyển 9 game | Đạt |
| 21 | `21-baucua-12p-mobile.png` | Bầu cua 12 người trên Mobile `390×844` nền Map Ngân Hà | Đạt |
| 22 | `22-wordchain-map.png` | Nối từ trên nền Map Ngân Hà từ nút chuyển nhanh | Đạt |

---

## 3. Nhật Ký Lỗi Phát Hiện & Đã Khắc Phục Trong Quá Trình Audit

1. **Tốc độ bot ở game nhiều pha (`Room.scheduleBots`)**: Ban đầu `BOT_THINK_MS.masoi` là `[800, 1500]` ms và không co theo `turnMs` kiểm thử, khiến ván nhiều bot dễ hết giờ bỏ phiếu mà không ai bị treo cổ. Đã điều chỉnh `BOT_THINK_MS` linh hoạt & tự động co theo `turnMs` trong `server/src/room.ts`.
2. **Vòng lặp khi RNG cố định trong `VeDoanGame.startTurn()`**: Dùng `while (picks.size < 3)` sẽ lặp vô tận nếu `ctx.rng()` trả hằng số trong unit test. Đã thay bằng Fisher-Yates shuffle có giới hạn trong `server/src/games/vedoan.ts`.
3. **Bảng vẽ `VeDoanScreen` trắng trên Web vòng chụp 1**: `RN Image` với `data:image/svg+xml` không cập nhật tức thì trên `<Image style={StyleSheet.absoluteFill}>` khi vẽ từng nét và `PanResponder` bị lệch tọa độ sau khi cuộn. Đã sửa dứt điểm bằng DOM `<svg viewBox="0 0 1000 1000">` + `Pointer Events` (`getBoundingClientRect()`) trên Web và giữ `<Image>` với `width/height="1000"` trên Native.
4. **Độ tương phản chữ (`HomeScreen`, `NameText`, `TimerBar`, `waitNote`)**:
   - Nút `Nạp Ruby (cần tài khoản)` đổi từ `variant="ghost"` (chữ vàng nhạt trên nền trắng) sang `variant="paper"`.
   - Thêm viền bóng tối cho `NameText` (`GRAD_TEXT`, `name_divine_glitch`, `name_neon_pulse`, `name_royal_3d`) giúp tên VIP nổi bật trên cả thẻ sáng lẫn nền tối.
   - Bổ sung `lightText` cho `CountdownBar` và áp `theme.onBg` cho `waitNote` dưới đáy màn hình.
5. **Khớp các test cũ sau khi mở rộng lên 12 người & 36 mẫu nhân vật**: Cập nhật assertion trong `server/test/lobby.test.ts` (`maxPlayers: 12`) và `server/test/fun.test.ts` (`36` mẫu nhân vật, danh sách tóc/phụ kiện/áo mở rộng).
