# Phase 5 — Thiết Kế Gói 3 Game Party Mới (`ve_doan`, `bom_tu`, `do_vui`)

---

## Game 7: 🎨 Vẽ & Đoán (`ve_doan`, 2–12 Người)

### 1. Luật chơi & Cơ chế
- Mỗi người lần lượt làm **Họa sĩ** (mặc định mỗi người vẽ 1 hoặc 2 lượt tùy quy mô phòng / cài đặt `veDoanRounds`, tối đa 6 vòng để nhịp nhanh vui).
- **Pha `pick` (10 giây)**: Họa sĩ được server bốc 3 từ khóa ngẫu nhiên từ kho **180+ từ tiếng Việt dễ vẽ** (`shared/src/vedoan.ts`) và chọn 1 từ để vẽ (`vd_pick`). Hết giờ chưa chọn -> tự chọn từ đầu tiên.
- **Pha `draw` (60 giây)**:
  - Họa sĩ nhận `myWord` đầy đủ; người đoán chỉ nhận `wordMask` dạng `_ _ _   _ _ _` (giữ nguyên khoảng trắng phân tách chữ).
  - **Gợi ý mở dần**: Ở mốc `50%` thời gian còn lại mở 1 ký tự ngẫu nhiên; ở `25%` mở thêm 1 ký tự (không bao giờ mở hết toàn bộ từ).
  - **Nét vẽ vector (`DrawStroke`)**: `{ id, color, width, points: [number, number][] }` theo hệ tọa độ chuẩn hóa `[0..1000, 0..1000]`, tương thích mọi kích thước màn hình từ iPhone mini tới Desktop 4K! Tối đa `120` nét / vòng và `80` điểm / nét để nhẹ băng thông & chống lag.
  - **Đoán từ (`vd_guess`)**:
    - Nếu người đã đoán đúng hoặc chính là Họa sĩ -> chặn không spoil đáp án.
    - So khớp chuẩn hóa tiếng Việt (`NFC`, thường, gộp khoảng trắng). Nếu đúng -> cộng điểm theo tốc độ (`150` giảm dần về `60`) cho người đoán + `+40` cho Họa sĩ! Nếu tất cả người đoán đã giải được -> kết thúc vòng sớm ngay sau 1.5s!
    - **Gần đúng (`close`)**: Nếu đúng khi bỏ dấu tiếng Việt hoặc khoảng cách Levenshtein `<= 1` (với từ `>= 4` chữ cái) -> trả về riêng cho người đoán `{ ok: true, close: true }` để hiện banner `"🔥 Suýt trúng rồi! Chú ý dấu nhé!"` mà không phát lên bảng chat chung!
- **Pha `reveal` (5 giây)**: Công bố đáp án thật + danh sách điểm thưởng + tác phẩm vừa vẽ.
- **Bot Họa sĩ & Bot Người Đoán**:
  - 30+ từ khóa có sẵn **bản thiết kế nét vẽ vector (`BOT_SKETCHES`)** (mặt trời, ngôi nhà, con cá, mèo, tên lửa, bánh kem, ly trà sữa, trái tim, ô tô, kính râm...) nên khi Bot làm họa sĩ, Bot thực sự vẽ từng nét một trên bảng cho người chơi đoán!
  - Bot người đoán thỉnh thoảng đoán sai hài hước rồi có xác suất đoán đúng ở nửa sau vòng.

---

## Game 8: 💣 Bom Chữ Tích Tắc (`bom_tu`, 2–12 Người)

### 1. Luật chơi & Cơ chế dùng Từ Điển Thật
- Khai thác trực tiếp kho **79.569 từ tiếng Việt 2 chữ** trong `ctx.dict` (`server/src/dictionary.ts`)!
- Lúc khởi tạo trận, engine dựng chỉ mục nhanh các âm tiết phổ biến (`>= 25` từ hợp lệ chứa âm tiết đó) — thao tác `O(N)` chỉ tốn ~15ms, hoặc cache sẵn theo đối tượng `Dictionary` bằng `WeakMap` để mọi ván sau khởi động tức thì `0ms`!
- Mỗi người chơi khởi đầu với **3 Trái Tim (`❤️❤️❤️`)**.
- Mỗi lượt có một **Thử thách Bom** (`Prompt`) kèm độ khó tăng dần:
  1. `contains`: *"Từ 2 chữ có tiếng `X`"* (vd `X = "nhà"` -> `nhà cửa`, `chủ nhà`).
  2. `starts`: *"Bắt đầu bằng `X`"* (vd `X = "bánh"` -> `bánh mì`, `bánh chưng`).
  3. `ends`: *"Kết thúc bằng `X`"* (vd `X = "hoa"` -> `vườn hoa`, `bông hoa`).
- **Đồng hồ Bom động**: Khởi điểm `12 giây` (giảm dần tới tối thiểu `7 giây` khi chuỗi chuyền bom dài ra), rung lắc và nháy đỏ khi còn `<= 4 giây`.
- Nhập đúng từ hợp lệ trong từ điển chưa từng dùng trong ván -> **Ném bom sang người kế tiếp** (`+1 điểm combo`)! Cứ mỗi 2 lần chuyền thành công (hoặc ngay nếu người trước nổ) sẽ đổi sang thử thách `Prompt` mới.
- Hết giờ -> **BÙM!! 💥**: Người giữ bom mất `1` tim; nếu còn `0` tim thì bị loại; người cuối cùng còn tim thắng!
- **Bot Bom Chữ**: Quét nhanh danh sách từ khớp thử thách trong chỉ mục `Dictionary` và gửi từ hợp lệ.

---

## Game 9: 🧠 Đấu Trường Đố Vui (`do_vui`, 1–12 Người)

### 1. Kho 200+ Câu Hỏi Việt Nam Đa Chủ Đề (`shared/src/dovui.ts`)
- 6 chủ đề hấp dẫn: **Đố mẹo Xóm Lầy**, **Việt Nam Quê Hương**, **Ẩm Thực Ba Miền**, **Khoa Học Tự Nhiên**, **Văn Hóa & Giải Trí**, **Lịch Sử & Địa Lý**.
- Đủ **200+ câu hỏi độc lập**, không trùng lặp, mỗi câu có `question`, `options: [string, string, string, string]`, `answerIndex: 0|1|2|3`, `category`, `explain` (giải thích ngắn vui nhộn sau khi mở đáp án).

### 2. Cơ chế `perPlayerView` & Tính Điểm Kịch Tính
- Cài đặt số câu mỗi trận trong Lobby: `5 / 10 / 15` câu (mặc định `10` câu).
- **Pha `question` (`15s`)**:
  - Tuyệt đối KHÔNG gửi `correctIndex` hay `explain` trong `DoVuiView` ở pha `question`!
  - Toàn bộ 1–12 người cùng chọn đáp án `A / B / C / D` đồng thời (`dv_answer`).
  - Có nút khóa đáp án sớm: ngay khi tất cả người chơi kết nối đã chọn xong, tự chuyển sang `reveal` không cần chờ hết 15s!
- **Tính điểm**:
  - Trả lời đúng: `500 + Math.round(500 * (timeLeftMs / totalMs))` điểm tốc độ + `(streak - 1) * 100` (tối đa `+500` streak).
  - **Câu cuối cùng (`questionIndex === total - 1`)**: **NHÂN ĐÔI ĐIỂM (`x2`)** giúp màn lật kèo cực gay cấn!
- **Pha `reveal` (`5s`)**: Hiện đáp án đúng xanh rực rỡ, số lượng & tên người chọn mỗi phương án `A/B/C/D`, hộp giải thích kiến thức + bảng biến động điểm.
- Kết thúc đủ số câu -> Xếp hạng tổng điểm, người cao điểm nhất thắng!
