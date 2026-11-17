# Phase 0 — Tổng Quan Lộ Trình Nâng Cấp Toàn Diện Xóm Lầy (Mega Upgrade)

Tài liệu thiết kế tổng thể cho đợt nâng cấp lớn của **Xóm Lầy** (`noi-tu`), biến ứng dụng thành nền tảng **Party Game 12 người chơi** mượt mà, giao diện gọn gàng hiện đại, hệ thống hiệu ứng & vật phẩm Ruby đẳng cấp, cùng **9 trò chơi hoàn chỉnh** chơi trực tuyến đa thiết bị (Mobile Web + Desktop + Expo Native).

---

## 1. Bảng Danh Mục 9 Trò Chơi Sau Nâng Cấp

| STT | `GameType` | Tên hiển thị | Số người | Nhóm | Ghi chú kỹ thuật |
|---|---|---|---|---|---|
| 1 | `wordchain` | 🔤 Nối từ | 1–8 | Đấu trí | Từ điển 79.569 từ 2 chữ, Cứu trợ, Xin duyệt |
| 2 | `wordchain_en` | 🇬🇧 Nối từ Anh | 1–8 | Đấu trí | 210.987 từ Anh, giải mã Telex, giảm thời gian |
| 3 | `baucua` | 🦀 Bầu cua | 1–12 | Tiệc tùng | Đặt cược xu ảo, bát lắc, tổng kết nhiều ván |
| 4 | `typhu` | 🏦 Cờ tỷ phú | 2–6 | Chiến thuật | Bàn 40 ô 3D/2D, nhà/khách sạn, thẻ Cơ hội/Rủi ro |
| 5 | `masoi` | 🐺 Ma sói (Werewolf) | 4–12 | Suy luận | 9 vai trò, Đêm/Ngày, kênh chat Sói bí mật, cách ly view |
| 6 | `giandiep` | 🕵️ Ai là gián điệp | 3–12 | Suy luận | 150+ cặp từ, Dân/Gián điệp/Mr. White, chống lộ từ |
| 7 | `ve_doan` | 🎨 Vẽ & Đoán | 2–12 | Tiệc tùng | Bảng vẽ vector mượt, gợi ý chữ cái, Bot vẽ hình |
| 8 | `bom_tu` | 💣 Bom chữ tích tắc | 2–12 | Tốc độ | 3 tim sinh tồn, từ điển thật 79k từ, bom nổ dây chuyền |
| 9 | `do_vui` | 🧠 Đấu trường đố vui | 1–12 | Tiệc tùng | 200+ câu hỏi trắc nghiệm, chuỗi streak, câu cuối x2 |

---

## 2. Cấu Trúc 8 Phase Triển Khai

1. **Phase 0 (`docs/phases/`)**: Lập bộ 9 tài liệu thiết kế kiến trúc, mô hình dữ liệu, giao thức Socket.IO, state machine và danh sách task/test case chi tiết cho từng yêu cầu lớn.
2. **Phase 1 (Kiến trúc lõi & Chống Lag 12 người)**:
   - Mở rộng `MAX_PLAYERS = 12`, `PLAYER_COLORS` lên 12 màu, `BOT_NAMES` lên 12 bot.
   - Cơ chế `perPlayerView` trong `GameEngine` / `Room` / `Socket.IO`: bảo mật tuyệt đối dữ liệu bí mật từng người (vai trò Ma Sói, từ khóa Gián Điệp, từ đang vẽ của Vẽ & Đoán, đáp án Đố Vui).
   - Hỗ trợ thắng theo phe (`winnerIds`) để toàn bộ thành viên phe thắng đều được ghi nhận thành tích `won + 1`.
   - Tối ưu hiệu năng Client triệt để: Memo hóa SVG Portrait (cache 300 mục), tách subscription `useFace(playerId)` theo từng ID, cô lập tick đồng hồ `useSecondsLeft` ở mức giây nguyên, `React.memo(Avatar)`, cache `rectOf()` theo frame, và chế độ **⚡ Siêu mượt** (`smoothMode`).
3. **Phase 2 (Avatar, Map/Màu Phòng, Kho Chọc Ghẹo, VIP Prestige & CSS Shader)**:
   - Mở rộng tạo hình nhân vật: +8 kiểu tóc, +12 phụ kiện, +8 trang phục, 36 nhân vật mẫu.
   - Hệ thống **11 Map / Chủ đề màu phòng** (`5 miễn phí` + `6 Map động Ruby`).
   - Hệ thống **Cấp bậc Đại Gia (`vipTier` 0..6)** dựa trên Ruby đã tiêu & giá trị kho đồ.
   - Mở rộng lên **8 ô trang bị** (`frame`, `nameFx`, `aura`, `entrance`, `pet`, `title`, `chatBubble`, `roomTheme`).
   - **Shader CSS thuần GPU** (`FxStyles.tsx`) cho khung, tên, hào quang, thú cưng bay trên vai, bong bóng chat, +8 kỹ năng VIP, +5 siêu quà tặng (lên tới 5.000 💎), và **Combo Chọc Ghẹo** (`x2 .. x10`).
4. **Phase 3 (Game 5: Ma Sói — Werewolf)**: `shared/src/masoi.ts`, `server/src/games/masoi.ts`, `app/src/screens/MaSoiScreen.tsx`, test mô phỏng đầy đủ + Bot AI.
5. **Phase 4 (Game 6: Ai là gián điệp)**: `shared/src/giandiep.ts`, `server/src/games/giandiep.ts`, `app/src/screens/GianDiepScreen.tsx`, test mô phỏng đầy đủ + chống lộ từ + Bot AI.
6. **Phase 5 (Game 7, 8, 9: Party Games Pack)**: Vẽ & Đoán (`ve_doan`), Bom Chữ Tích Tắc (`bom_tu`), Đấu Trường Đố Vui (`do_vui`).
7. **Phase 6 (Tái cấu trúc & Sắp xếp Giao diện)**: Gọn gàng, khoa học trên cả Mobile (`390×844`) và Desktop/Ngang, bảo toàn 100% `testID` hiện có.
8. **Phase 7 & 8 (Kiểm thử E2E, Chụp ảnh màn hình, Rà soát lỗi, Commit & Push)**: Chạy Unit Test + Typecheck + Lint + Playwright nhiều trình duyệt, chụp & xem trực tiếp từng ảnh PNG, sửa triệt để mọi lỗi giao diện/logic, rồi commit & push lên `origin main`.

---

## 3. Nguyên Tắc Ràng Buộc Bảo Mật & Ổn Định

- Không thêm gói npm mới để đảm bảo CI (`npm ci`) chạy nhanh và ổn định.
- Không sửa hoặc commit file `docs/HANDOFF-tai-khoan-ruby.md` đang tồn tại sẵn.
- Không lưu bất kỳ mật khẩu, chuỗi DB hay secret nào trong code.
- Bảo toàn 100% dữ liệu tài khoản cũ trên MongoDB (`users` schema chỉ bổ sung trường tùy chọn như `rubySpent`).
