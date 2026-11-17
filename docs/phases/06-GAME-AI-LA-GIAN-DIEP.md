# Phase 4 — Thiết Kế Game 6: Ai Là Gián Điệp (`giandiep`)

## 1. Tổng Quan & Luật Chơi

- **Mã game**: `'giandiep'` (`name: 'Ai là gián điệp'`, `min: 3`, `max: 12`).
- **Tỷ lệ phân vai mặc định** (tùy chỉnh được trong Lobby `giandiepMrWhite` & `giandiepSpies`):
  - 3–4 người: `1 Gián điệp` (không hoặc có Mr. White tùy chọn).
  - 5–7 người: `1 Gián điệp` + `1 Mr. White` (hoặc `2 Gián điệp`).
  - 8–12 người: `2 Gián điệp` + `1 Mr. White` (hoặc `3 Gián điệp`).
- **Bí mật tuyệt đối (`perPlayerView = true`)**:
  - **Dân thường (`dan`)**: Nhận từ khóa A (`wordA`, ví dụ `"Phở bò"`). *Không biết* mình là Dân hay Gián điệp.
  - **Gián điệp (`giandiep`)**: Nhận từ khóa B gần nghĩa (`wordB`, ví dụ `"Bún bò"`). *Không biết* mình là Gián điệp hay Dân.
  - **Mr. White (`mrwhite`)**: Nhận `myWord = null` và cờ `isMrWhite = true` (phải lắng nghe gợi ý của mọi người để đoán từ khóa chung!).

---

## 2. Kho Dữ Liệu 150+ Cặp Từ Việt Nam Chất Lượng (`shared/src/giandiep.ts`)

Mỗi phần tử trong `GIANDIEP_PAIRS` có cấu trúc:
```ts
export interface SpyWordPair {
  category: string;
  wordA: string;
  wordB: string;
  cluesA: readonly string[]; // Gợi ý thông minh cho Bot khi giữ từ A
  cluesB: readonly string[]; // Gợi ý thông minh cho Bot khi giữ từ B
}
```
Phân bổ đều **8 chủ đề gần gũi**:
1. 🍜 Ẩm thực Việt & Đồ uống (Phở bò / Bún bò, Trà sữa / Cà phê sữa, Bánh mì / Xôi mặn, Lẩu thái / Nướng BBQ, Bún đậu mắm tôm / Bún chả...)
2. 📱 Giải trí & MXH (TikTok / YouTube Shorts, Netflix / Rạp chiếu phim, Liên Quân / Tốc Chiến, Karaoke / Quán bar...)
3. 🏫 Trường học & Công sở (Giáo viên / Gia sư, Kiểm tra miệng / Thi cuối kỳ, Họp lớp / Teambuilding, Deadline / Tăng ca...)
4. 🏠 Đồ vật quen thuộc (Quạt máy / Điều hòa, Nồi cơm điện / Nồi chiên không dầu, Xe máy / Xe đạp điện, Tai nghe / Loa bluetooth...)
5. 🌍 Địa điểm & Du lịch (Đà Lạt / Sa Pa, Phú Quốc / Nha Trang, Quán nét / Thư viện, Bãi biển / Hồ bơi...)
6. 🐾 Động vật (Chó Shiba / Mèo Anh, Cá mập / Cá heo, Chim cánh cụt / Gấu Bắc Cực...)
7. 💼 Nghề nghiệp (Bác sĩ / Y tá, Phi công / Tiếp viên hàng không, Ca sĩ / DJ, Đầu bếp / Bartender...)
8. ❤️ Đời sống & Tình yêu (Người yêu cũ / Bạn thân khác giới, Hẹn hò đầu tiên / Kỷ niệm 1 năm, Tỏ tình / Cầu hôn, Mùng 1 Tết / Đêm Giao Thừa...)

---

## 3. Luồng Trận Đấu & Quy Tắc Chống Lộ Từ (`server/src/games/giandiep.ts`)

```
[word_reveal (5s)] -> [describe (mỗi người 22s/lượt)] -> [vote (25s)]
                              ▲                             │
                              │              ┌──────────────┴──────────────┐
                              │         (Hòa phiếu)                 (1 người bị loại)
                              │              │                             │
                              └───[round_end (4s)]◄── Chưa kết thúc ◄──────┤
                                                                           ▼
                                                        (Nếu người bị loại là Mr. White)
                                                                  [mrwhite_guess (15s)]
```

### Quy tắc quan trọng rà soát kỹ để tránh bug:
1. **Mr. White không bao giờ đi đầu tiên ở Vòng 1**: Khi sắp `turnOrder`, nếu `turnOrder[0]` là `mrwhite`, hoán đổi với một người chơi khác ở giữa hoặc cuối hàng để Mr. White có ít nhất 1 gợi ý nghe lén trước khi nói dối!
2. **Chống gõ trực tiếp từ mật (`word_leaked`)**:
   - Trước khi nhận `gd_clue`, chuẩn hóa `clue` và `playerWord` (lowercase, NFC, bỏ dấu câu thừa).
   - Nếu người chơi gõ nguyên cụm `playerWord` vào câu mô tả -> từ chối `{ ok: false, reason: 'word_leaked' }`, KHÔNG mất lượt, hiện nhắc nhở rõ ràng để họ nhập mô tả khác!
   - Nếu hết giờ lượt mà chưa nhập gợi ý -> ghi `"(Im lặng đáng ngờ... 🤐)"` và tự động chuyển người kế tiếp.
3. **Bỏ phiếu & Giải quyết Hòa**:
   - Đếm phiếu tất cả người còn sống (`target | 'skip'`).
   - Chỉ loại người khi có đúng 1 ứng viên nhiều phiếu nhất và nhiều hơn số phiếu `'skip'` (hoặc nếu phiếu hợp lệ lớn nhất là duy nhất > 0). Nếu hòa phiếu -> không ai bị loại, sang Vòng kế tiếp.
4. **Cơ hội cuối của Mr. White (`mrwhite_guess`)**:
   - Ngay khi Mr. White bị vote loại, game tạm dừng `15s` cho Mr. White nhập 1 từ đoán từ khóa của Phe Dân Thường.
   - So sánh không phân biệt hoa thường (và chấp nhận bỏ khoảng trắng thừa / kiểm tra trùng khớp chính xác tiếng Việt chuẩn hóa). Nếu đoán đúng -> **Mr. White lật kèo thắng độc lập!**
5. **Điều kiện thắng chung**:
   - Toàn bộ `giandiep` + `mrwhite` bị loại -> **Phe Dân Thường thắng!** (`winnerIds = tất cả dan`, kèm công bố cả 2 từ khóa).
   - Số kẻ ẩn thân còn sống (`giandiep + mrwhite`) `>=` số `dan` còn sống, HOẶC kết thúc hết Vòng 4 mà vẫn còn ít nhất 1 Gián điệp/Mr. White sống -> **Phe Gián Điệp thắng!** (`winnerIds = tất cả giandiep + mrwhite`).
   - Nếu ngắt kết nối hoặc rời phòng giữa lượt đang mô tả -> tự động đẩy sang người kế tiếp để không bao giờ kẹt bàn chơi!
