# KẾ HOẠCH ĐẠI NÂNG CẤP V4 — PHASES 27–37 (XÓM LẦY PARTY)

Tài liệu đặc tả kỹ thuật chi tiết cho đợt đại nâng cấp V4 theo toàn bộ yêu cầu của người dùng: chia nhỏ từng nhiệm vụ lớn thành từng Phase độc lập, sử dụng thư viện/mẫu thiết kế mã nguồn mở uy tín trên GitHub, kiểm thử tự động toàn diện và chụp ảnh rà soát giao diện trên đa kích thước màn hình di động (`360×640`, `375×667`, `390×844`, `412×915`, ngang Landscape & Desktop `1280×800`).

---

## Phase 27 — Dọn Bỏ 2 Game Cũ (`tinh_mat`, `den_do`), Đăng Ký 2 Game Bom Tấn Mới & Sắp Xếp Thứ Tự Cũ → Mới
- **Xóa hoàn toàn**:
  - `👀 Tinh Mắt Đập Nhanh` (`shared/src/tinhmat.ts`, `server/src/games/tinhmat.ts`, `app/src/screens/TinhMatScreen.tsx`).
  - `🚦 Đèn Đỏ Đèn Xanh` (`shared/src/dendo.ts`, `server/src/games/dendo.ts`, `app/src/screens/DenDoScreen.tsx`).
- **Đăng ký 2 game mới (giữ tổng 15 trò chơi chất lượng cao)**:
  - `boom_online`: **💣 Đặt Bom Tử Chiến — Bản Vòng Bo** (`2–12` người, hỗ trợ Đấu Đơn & Đấu Đội + Bot thông minh).
  - `uno_mercy`: **🃏 UNO Tàn Nhẫn (Show 'Em No Mercy)** (`2–12` người + Bot tàn nhẫn).
- **Thứ tự hiển thị trên Trang Chủ & Màn Tổng Kết (Game cũ trước → Game mới sau)**:
  1. `wordchain` (Nối từ tiếng Việt)
  2. `wordchain_en` (Nối từ tiếng Anh)
  3. `baucua` (Bầu cua)
  4. `typhu` (Cờ tỷ phú)
  5. `masoi` (Ma sói)
  6. `giandiep` (Ai là gián điệp)
  7. `ve_doan` (Vẽ & Đoán)
  8. `bom_tu` (Bom chữ)
  9. `do_vui` (Đố vui)
  10. `loto` (Lô tô hội chợ)
  11. `caro` (Cờ caro)
  12. `croaksquad` (Đầm lầy quái chiêu)
  13. `ca_sau` (Khám răng cá sấu)
  14. `boom_online` (Đặt bom tử chiến)
  15. `uno_mercy` (UNO Tàn nhẫn)

---

## Phase 28 — Đại Tu Bộ Avatar Mặc Định Cực Lầy Lội & Bựa (`@dicebear/avataaars` + Biểu Cảm Meme)
- Mở khóa toàn bộ kho biểu cảm bá đạo có sẵn trong `@dicebear/avataaars` (7.8k+ ⭐ GitHub):
  - **Mắt bựa**: `xDizzy` (mắt xoắn ốc ngáo ngơ), `eyeRoll` (trợn trắng mắt khinh bỉ), `winkWacky` (nháy mắt lè lưỡi), `hearts` (mắt mê tiền/hám sắc), `cry` (khóc ròng), `surprised` (trố mắt), `squint` (mắt lươn lẹo).
  - **Miệng lầy**: `vomit` (ói cầu vồng 7 màu huyền thoại), `grimace` (nhe hàm răng sún), `screamOpen` (hét toáng), `tongue` (lè lưỡi trêu ngươi), `eating` (nhai nhồm nhoàm), `disbelief` (há hốc mồm).
- Bổ sung phụ kiện meme sắc nét và cập nhật toàn bộ `AVATAR_PRESETS` + `spreadCharacter()` để khách vừa vào phòng chưa kịp chỉnh gì nhìn mặt đã cực kỳ hài hước, lầy lội.

---

## Phase 29 — Đố Vui (`do_vui`) — Triệt Tiêu Lỗi "Đáp Án Đúng Dài Nhất" & Trộn Thứ Tự Đáp Án
- Rà soát và viết cân bằng độ dài cả 4 phương án (`A, B, C, D`) trên toàn bộ **252 câu hỏi** trong `shared/src/dovui.ts`:
  - Đưa tỷ lệ đáp án đúng là phương án dài nhất từ `75.4%` về mức ngẫu nhiên tự nhiên **`~25%` (`<= 28%` toàn cục và `<= 33%` mỗi chuyên đề)**.
- Trong `server/src/games/dovui.ts`, tự động xáo trộn vị trí 4 phương án `A/B/C/D` mỗi lần ra câu hỏi để không thể học vẹt vị trí.
- Bổ sung bài test kiểm định tự động đảm bảo không bao giờ tái phát lỗi chênh lệch độ dài đáp án.

---

## Phase 30 — Vẽ & Đoán (`ve_doan`) — Sửa Dứt Điểm Lỗi Máy Không Vẽ & Mở Rộng 50+ Hình Vẽ Đa Sắc
- **Nguyên nhân gốc đã tìm ra**: `botAction()` trong `server/src/games/vedoan.ts` từng gọi `this.botStrokeCursor++` ngay lúc `Room.scheduleBots()` kiểm tra điều kiện `find()`, làm nuốt mất nét vẽ!
- **Giải pháp**:
  - Giữ `botAction()` thuần khiết (không tự tăng biến đếm) và bổ sung bộ hẹn giờ vẽ mượt `botDrawTimer` trực tiếp trong `VeDoanGame` để máy vẽ từng nét rõ ràng mỗi `450ms`.
  - Mở rộng `BOT_SKETCHES` lên **50+ bức tranh vector đa màu sắc** cực dễ nhận diện (mặt trời cười, ngôi nhà ống khói, con mèo, ô tô, tên lửa, pizza, ly trà sữa trân châu, cầu vồng, đàn guitar, cá mập, người tuyết, vương miện, con ếch, dưa hấu, xương rồng...).

---

## Phase 31 — Khám Răng Cá Sấu (`ca_sau`) — Thiết Kế Lại Đúng Một Hàm Răng Cá Sấu 3D Sống Động
- Xóa bỏ khung 2 hàng nút vuông xấu xí cũ; dựng **Sân Khấu Đầu & Hàm Cá Sấu Chúa 3D Vector (`CrocodileJawStage`)**:
  - Mõm cá sấu vảy xanh ngọc lục bảo 3D có lỗ mũi phập phồng & đôi mắt vàng sắc lẹm (hóa đỏ rực khi đớp!).
  - Vòm lợi hồng cong hình chữ U hàm trên với **8 chiếc răng nanh trắng ngà nhọn hướng xuống**, hốc miệng tối sâu thẳm kèm **chiếc lưỡi hồng uốn lượn** ở giữa, và vòm hàm dưới cong với **8 chiếc răng nanh hướng lên**.
  - Khi nhấn trúng Răng Đau, **cả hàm trên cá sấu sập mạnh xuống (`jawSnap`)** ngậm chặt kèm hiệu ứng chấn động `"PHẬP!!"`, vừa khít 100% khung hình dọc điện thoại.

---

## Phase 32 — Ma Sói (`masoi`) — Clone Chuẩn Bố Cục & Trải Nghiệm **Wolvesville**
- Tái thiết kế `MaSoiScreen.tsx` chuẩn 100% phong cách **Wolvesville** trên di động (`scroll={false}`, `hideStrip={true}`):
  - **Không cuộn cả trang, không lặp 2 hàng avatar**.
  - **Nửa trên (`~45%` màn hình)**: Lưới **12–16 Ô Đất Dân Làng Đánh Số (`#1`..`#12`)** chia 4 cột gọn gàng; mỗi ô hiện Số ghế `#`, Nhân vật, Huy hiệu Role ở góc phải (vai bản thân, đồng bọn Sói `🐺`, kết quả Tiên Tri soi `🔮`, Cặp đôi `💘`, hoặc mộ đá `🪦` + vai lộ diện khi chết), số phiếu bầu `🗳️`, và **chạm trực tiếp vào ô người chơi để Bỏ phiếu / Cắn / Soi / Bảo vệ / Bắn / Quăng độc**!
  - **Nửa dưới (`~48%` màn hình)**: **Khung Chat & Nhật Ký Làng Luôn Hiển Thị Trực Tiếp** kèm tab chuyển kênh nhanh (`💬 Làng`, `🐺 Bầy Sói`, `📜 Vai của tôi`), dải câu chat nhanh 1 chạm và thanh nhập tin nhắn ghim cứng ở đáy màn hình.

---

## Phase 33 — Ai Là Gián Điệp (`giandiep`) — Bỏ Lặp Avatar, Khung Chat Theo Dõi Liền Mạch, Pha Biện Minh & Lật Từ Khóa Cuối Ván
- **Giao diện Mobile 1 màn hình không cần lướt lên xuống (`scroll={false}`, `hideStrip={true}`)**:
  - Thanh đỉnh gọn nhẹ: Thẻ từ khóa bí mật (có nút ẩn/hiện) + Đếm ngược + **Duy nhất 1 hàng Avatar Nghi Phạm đánh số `#1..#N`** (chạm trực tiếp để bỏ phiếu khi tới pha Vote, không còn lặp 2 lần avatar trên-dưới!).
  - Giữa màn hình (`flex: 1`): **Luồng Lịch Sử Miêu Tả + Biện Minh + Chat Thảo Luận Hợp Nhất** giúp người chơi đối chiếu lời khai từ Vòng 1 đến hiện tại ngay trong một khung chat duy nhất.
- **Nâng cấp luồng gameplay**:
  1. **Pha Biện Minh (`defense`, `15s`)**: Người bị vote cao nhất (hoặc đồng hạng cao nhất) không bị loại cụt lủn ngay mà được bật mic **Biện Minh** trước cả phòng!
  2. **Pha Phán Quyết (`final_vote`, `12s`)**: Cả phòng nghe biện minh xong mới chốt **👎 Trục xuất** hay **👍 Tha bổng** (hoặc bầu chọn giữa các bị cáo đồng phiếu).
  3. **Pha Lật Mở Từ Khóa Cuối Ván (`reveal_end`, `8s`)**: Trước khi sang màn kết quả, mở bảng lật ngửa toàn bộ Vai trò + Từ khóa của từng người (`Dân thường: Phở bò`, `Gián điệp: Bún bò Huế`, `Mr. White: Giấy trắng`) để cả phòng trầm trồ đối chiếu!

---

## Phase 34 — Đầm Lầy Quái Chiêu (`croaksquad` 3.0) — Chơi Được Với Máy (AI Co-op), Tự Xoay Ngang Landscape & Điều Khiển Siêu Mượt
- **Bổ sung AI Đồng Đội Máy (`CroakSquadGame` Bot)**: Cho phép thêm Bot ở phòng chờ (`1` người thật + `1–3` máy vẫn chơi trọn 3 màn!): Bot biết tự chạy, nhảy qua vực, dẫm giữ Công Tắc mở cầu cho người chơi, nhặt Chìa Khóa, phối hợp nuốt-nhổ và nhảy vào Đài Sen.
- **Tự động xoay ngang Landscape khi vào ván (`<Rotator>`)**:
  - Toàn màn hình ngang rộng rãi kiểu Pico Park / game thùng di động; gỡ bỏ hoàn toàn hộp hướng dẫn to choán màn hình, thay bằng nhãn mục tiêu siêu gọn 1 dòng tự thu nhỏ.
  - Hòa giải chuyển động mềm (`soft velocity/position blending`) + tay cầm nút điều hướng nhạy tức thì trên cả Landscape thật và Portrait xoay 90° CSS.

---

## Phase 35 — Game Mới #1: 💣 Đặt Bom Tử Chiến — Bản Vòng Bo (`boom_online`, 2–12p)
- Mê cung gạch & thùng gỗ cổ điển (`13×11` / `15×13` / `17×13`), hỗ trợ **Đấu Đơn (FFA)** và **Đấu Đội (Đỏ vs Xanh)** + Bot AI thông minh.
- **5 vật phẩm kinh điển**: 👟 Giày Tăng Tốc, 💧 Bình Nước Tăng Tầm, 💣 Thêm Bóng Nước, 🥊 Găng Tay Ném Bom Qua Tường, 🥾 Giày Đá Bom Lăn Thẳng Góc Hẹp (+ 📌 Kim Tự Cứu hiếm).
- **Cơ chế Nhốt Bóng Nước (`trapped`, `4.5s`)**: Trúng tia nước bị nhốt trong bóng nước lăn chậm — đồng đội chạm vào cứu sống ngay, đối thủ lao tới tông **"BỤP!"** là kết liễu!
- **Vòng Bo Gạch Tử Thần sau `45s` + Đĩa Bay Phục Thù (`UFO`)**: Sau 45s gạch tử thần sập dần từ ngoài vào giữa; người bị loại sớm được lái **🛸 Đĩa Bay** ngoài biên ném bom trả thù vào sân mỗi `6s`!
- Dựng bằng **HTML5 `<canvas>` HiDPI 60FPS** xoay ngang Landscape (`<Rotator>`) kèm luồng mạng `boom:tick` 20Hz mượt mà.

---

## Phase 36 — Game Mới #2: 🃏 UNO Tàn Nhẫn (`uno_mercy` — UNO Show 'Em No Mercy, 2–12p)
- Bộ bài và luật *UNO Show 'Em No Mercy* chuẩn hủy diệt tình bạn:
  - **Cộng Dồn Không Đáy (`+2`, `+4`, `+6`, `+10`)**: Chồng lá rút bằng hoặc cao hơn lá trước (`+4` chồng `+6` thành `+10`, chồng tiếp `+10` thành `+20` lá đổ ập lên kẻ hết bài đỡ!).
  - **Luật Nổ Bài (`Mercy Rule >= 25 lá`)**: Cầm từ **25 lá trở lên** trên tay là **💥 CHÁY BÀI — loại trực tiếp ngay lập tức**!
  - **Luật 7–0 Kịch Tính**: Đánh lá **`7`** được chọn 1 đối thủ bất kỳ để **Tráo Toàn Bộ Xấp Bài Trên Tay** (cướp trắng chiến thắng của kẻ vừa hô UNO còn 1 lá!); đánh lá **`0`** **Xoay Vòng Bài Cả Bàn** theo chiều đánh!
  - **Lá Đặc Biệt No-Mercy**: **Bỏ Lượt Tất Cả (`Skip All` — đánh thêm lượt)**, **Xả Hết Cùng Màu (`Discard All`)**, **Hô `"UNO!"` & Bắt Lỗi Quên Hô (`+2`)**.

---

## Phase 37 — Kiểm Thử Tự Động Toàn Diện & Chụp Màn Hình Rà Soát Đa Khung Hình Di Động
- Chạy đầy đủ Vitest (`server`), `tsc --noEmit`, `expo lint`, và bộ E2E Playwright kiểm tra trên nhiều kích thước điện thoại (`360×640`, `375×667`, `390×844`, `412×915`, Landscape & Desktop `1280×800`).
- Xem trực tiếp từng ảnh screenshot qua `read_file`, sửa ngay mọi điểm tràn khung / lệch chữ nếu có, cập nhật báo cáo `walkthrough.md`, commit (giữ nguyên `docs/HANDOFF-tai-khoan-ruby.md` không đụng tới) và `git push origin main`.
