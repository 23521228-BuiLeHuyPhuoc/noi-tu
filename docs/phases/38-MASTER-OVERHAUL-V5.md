# Master Overhaul V5 (Phases 38–44) — Nâng Cấp Trải Nghiệm Chơi, Vật Lý & Hiệu Ứng Đa Game

Tài liệu đặc tả kỹ thuật cho đợt đại nâng cấp V5 trên nền tảng **Xóm Lầy**, giải quyết triệt để 6 nhóm phản hồi trải nghiệm trực tiếp từ người chơi.

---

## Phase 38 — ⭕ Cờ Caro (`caro`): Hiển Thị Đường 5 Quân Chiến Thắng Trước Bảng Tổng Kết
- **Vấn đề cũ**: Ngay khi đánh đủ 5 quân, `CaroGame.applyMove()` gọi `finishGame()` -> `ctx.finish()`, chuyển thẳng sang `ResultScreen` nên không ai kịp nhìn đường 5 quân thắng.
- **Giải pháp**:
  - Thêm trạng thái `win_reveal` (~4.2s trong phòng thực tế; tôn trọng `ctx.settings.caroRevealMs` hoặc tự bỏ qua khi test dùng `turnMs < 1500` để giữ tốc độ Vitest) với `CaroView.revealEndsAt`.
  - Hỗ trợ action `{ type: 'caro_finish_reveal' }` + nút `"🏆 Xem bảng tổng kết ngay"` (`testID="caro-finish-reveal"`).
  - Trên `CaroScreen`: tự động cuộn (`focusBoardCell`) về quân chính giữa của `view.winLine`, vẽ **đường tia laser phát sáng** nối từ tâm ô đầu đến tâm ô thứ 5, nhấp nháy 5 quân thắng và hiển thị banner vinh danh (`testID="caro-win-reveal-banner"`).

## Phase 39 — 🕵️ Ai Là Gián Điệp (`giandiep`): Kịch Tính Nhiều Vòng & Thẻ Từ Khóa Cỡ Lớn
- **Vấn đề cũ**:
  1. Điều kiện thắng `danAlive <= hiddenAlive` làm bàn 3–4 người kết thúc ngay ở Vòng 1 sau 1 lần loại nhầm Dân hoặc bắt trúng Gián Điệp.
  2. Thẻ từ khóa (`gd-secret-card`) nằm ép góc với chữ `12px`, khó quan sát.
- **Giải pháp**:
  - **Luật nhiều vòng chuẩn Undercover**: Phe Gián Điệp/Mr. White chỉ thắng theo số lượng khi **`danAlive <= 1`** (trụ tới tận 2 người cuối cùng hoặc chỉ còn 1 Dân cô độc). Nhờ đó ván 4–12 người luôn kéo dài qua nhiều vòng căng não.
  - **Pha Phản Đòn Lật Kèo (12s)**: Khi Gián Điệp cuối cùng bị loại sớm (`hiddenAlive === 0` nhưng còn nhiều người chơi), cho phép Gián Điệp phản đòn đoán từ khóa của Dân Thường (`gd_mrwhite_guess`) trong 12 giây trước khi quyết định phe thắng.
  - **Role Distribution & Summary**: Thêm `roleSummary` và `aliveCounts` vào `GianDiepView` để hiển thị rõ cơ cấu vai & luật thắng trong trận.
  - **Hero Secret Keyword Card**: Đưa `gd-secret-card` lên vị trí trung tâm ngay dưới header, từ khóa (`gd-secret-word`) cỡ **22–24px** in đậm phát sáng kèm nút chạm ẩn/hiện chống nhìn trộm.

## Phase 40 — 🎨 Vẽ & Đoán (`ve_doan`): Đổ Màu Flood-Fill, Tẩy, Hình Học & Tính Điểm Công Bằng
- **Vấn đề cũ**: Chỉ có bút vẽ tự do; Họa sĩ chỉ nhận phẳng 45đ/người khiến việc vẽ đẹp, rõ chữ bị thiệt điểm so với người đoán nhanh (200+đ).
- **Giải pháp**:
  - Mở rộng `VeDoanStroke` với `tool?: 'pen' | 'eraser' | 'fill' | 'line' | 'rect' | 'circle'`.
  - Viết hàm hình học **`computeFloodFillPolygon(strokes, fx, fy)`** bắn 72 tia tìm biên bao đóng gần nhất từ điểm chạm để đổ màu chính xác trong hệ tọa độ chuẩn `0..1000` (hoạt động cả Web SVG lẫn Native SVG URI).
  - Thêm bộ công cụ: `✏️ Bút`, `🪣 Đổ màu`, `🧹 Tẩy`, `📏 Đường thẳng`, `▭ Hình vuông`, `◯ Hình tròn`.
  - **Tính điểm công bằng Gartic/Skribbl**:
    - Người đoán: hạng 1 (`110..200đ`), hạng 2 (`95..170đ`), hạng 3+ (`80..140đ`), trừ nhẹ theo số chữ gợi ý đã lộ.
    - Họa sĩ: nhận **Thưởng Truyền Đạt Tức Thì (`85 + 65 * remRatio` = `85..150đ`)** ở người đoán trúng đầu tiên + **`35đ`** mỗi người đoán thêm + **`35đ` Thưởng Cả Phòng Đoán Trúng (`100%`)**; `0đ` nếu không ai đoán trúng (chống vẽ bậy/AFK).

## Phase 41 — 🐸 Đầm Lầy Quái Chiêu (`croaksquad`): Sửa Triệt Để Bug Thanh Gỗ Lơ Lửng & Vừa Nhảy Vừa Ném
- **Vấn đề cũ**:
  1. Trục X chạy trước trục Y không có bước đệm chân nên khi đứng/đi trên thanh gỗ lơ lửng hay thang máy di chuyển lên xuống (`p3_elevator`, `p2_mover1`), va chạm X coi sàn nhà dưới chân là tường bên và đẩy văng ếch khỏi bệ gỗ; cũng thiếu `vyPlatform` carry nên `onGround` bị ngắt quãng.
  2. Client dùng chung một biến `lastPointerActionAtRef` khóa `340ms` giữa nút Nhảy và Bắn/Nuốt khiến bấm *"vừa nhảy vừa ném"* bị mất nút thứ 2; gói `jump` gửi nhầm `aimAngle` làm quay mặt và bắn lưỡi lệch hướng.
  3. Một số bệ công tắc/chìa khóa trên cao vượt tầm nhảy/bắn thực tế.
- **Giải pháp**:
  - Hợp nhất logic `moveAndCollideFrog` trong `shared/src/croaksquad.ts` (dùng chung cho cả Client & Server) với **Sticky Moving Platform Carry (`vxPlatform` + `vyPlatform`)** và **Step-Up Margin (`7px`)** ngăn tuyệt đối lỗi đẩy ngang khỏi thanh gỗ lơ lửng.
  - Hỗ trợ `jump + spit` và `jump + tongue` đồng thời cả ở Server (thêm xung lực khi đang nhảy bay lên) lẫn Client (tách riêng debounce từng nút `jump` / `spit` / `tongue`, chỉ gửi `aimAngle` khi thật sự ngắm hoặc bắn).
  - Cân chỉnh độ cao nền/nấm nhún/thang máy của cả 3 màn (`Màn 1`, `Màn 2`, `Màn 3`) vượt 100% kiểm thử mô phỏng.

## Phase 42 — 🐊 Khám Răng Cá Sấu (`ca_sau`): Jumpscare Hù Dọa & Rung Lắc Riêng Cho Người Bị Cạp
- **Giải pháp**:
  - Phân biệt `isMeBitten` (`view.bittenPlayerId === me`) và `isOtherBitten`.
  - **Chỉ trên màn hình người bấm trúng răng bom (`isMeBitten`)**: Kích hoạt **Rung lắc 2D cực mạnh (`±26px` X, `±18px` Y)**, hàm cá sấu **nhào phóng to `1.36×`**, lớp phủ **`casau-jumpscare-overlay`** chớp đỏ máu + 2 hàm răng nanh ngoạm từ 2 đầu màn hình + âm thanh gầm cắn đa tần WebAudio!
  - Người chơi an toàn chỉ thấy cá sấu đóng hàm bình thường + banner trêu chọc (`casau-safe-tease-banner`).

## Phase 43 — 💣 Đặt Bom Tử Chiến (`boom_online`): Chibi Bomber & 9 Vật Phẩm Vector Sắc Nét
- **Giải pháp**:
  - Mở rộng `BoomItemKind` lên **9 vật phẩm**: `bomb`, `range`, `max_range` (⚡ Siêu Thuốc Nước MAX 7 ô), `speed`, `kick`, `glove`, `needle`, `shield` (🛡️ Khiên Hộ Mệnh đỡ 1 phát nổ / 7s giáp vàng), `treasure` (💎 Kim Cương +25đ).
  - Thay ô chữ `"+B"`, `"+T"` bằng **9 biểu tượng vector 3D đa lớp** vẽ tay trên `<canvas>` trong viên ngọc pha lê lơ lửng.
  - Nâng cấp `drawBomberPlayer` theo chuẩn Chibi Crazy Arcade (Bazzi/Dao): tay đeo găng vung vẩy & chân bước chạy theo `walkPhase`, vệt bụi khi tăng tốc, má hồng, mắt long lanh, bình nước phản lực đeo lưng khi quay lên (`dir === 3`) và vòng giáp lục giác khi có khiên.

## Phase 44 — Kiểm Thử, Playwright Multi-Viewport Audit & Git Push
- Chạy `npm --workspace=server test`, `tsc --noEmit`, `expo lint`.
- Chụp và kiểm tra trực tiếp bằng `read_file` ảnh chụp cả 6 game ở `360×640`, `390×844`, `844×390`, `1280×800`.
- Cập nhật `walkthrough.md` và push lên `origin/main` (giữ nguyên `docs/HANDOFF-tai-khoan-ruby.md` untracked).
