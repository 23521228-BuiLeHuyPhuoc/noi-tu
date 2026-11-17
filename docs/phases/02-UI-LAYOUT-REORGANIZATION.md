# Phase 2 — Sắp Xếp Lại Giao Diện, Icon & Bố Cục Hợp Lý

## 1. Mục Tiêu Thiết Kế Lại UX/UI

Khắc phục tình trạng hiện tại khi danh sách nút chức năng, icon trên thanh trên, bảng chọn nhân vật dài dằng dặc và bảng chọc ghẹo bị trải dàn hàng ngang/dọc hỗn độn:
- **Nguyên tắc 3 giây**: Mở Trang chủ, Phòng chờ hay Bảng chọc, người chơi nhìn thấy ngay mục tiêu chính trong 3 giây đầu.
- **Không cắt/tràn chữ trên Mobile (`390×844`)** và **không rỗng/mất cân đối trên Desktop (`1280×800`)**.
- **Bảo toàn 100% `testID` hiện có** để toàn bộ kịch bản E2E cũ (`play.mjs`, `smoke-new.mjs`, `effects.mjs`, `typhu-play.mjs`, v.v.) và mới chạy thông suốt.

---

## 2. Thiết Kế Bố Cục Chi Tiết Từng Màn Hình

### 2.1 Trang Chủ (`HomeScreen.tsx`)
Thay vì một cột dài với các nút rải rác:
1. **Header Bar Gọn Đẹp**:
   - Trái: Logo `Xóm Lầy` + Tagline ngắn gọn (kèm badge Map đang chọn).
   - Phải (khi chưa đăng nhập): 2 nút `Đăng nhập` (`auth-open`), `Đăng ký` (`register-open`).
   - Phải (khi đã đăng nhập): Thẻ `ProfileCard` nâng cấp gọn gàng với Huy hiệu VIP (`vipTier`), số dư `💎` (`home-ruby`), nút nhanh 1 chạm: `🛍️ Cửa hàng` (`shop-open`), `🎁 Điểm danh` (`checkin-open` + chấm đỏ `checkin-dot`), `💰 Ví` (`wallet-open`), `🛠 Quản trị` (`admin-open-home` nếu admin).
   - Thanh công cụ phụ 1 hàng gọn: `🎨 Đổi Map / Màu`, `🏆 Bảng xếp hạng` (`leaderboard-open`), `⚡ Siêu mượt`.
2. **Khu Nhập Tên & Vào Nhanh Bằng Mã**:
   - Ô tên + avatar cạnh nhau (`name-input`, `guest-profile-edit`) và thẻ vào phòng (`code-input`, `join-btn`) gộp mạch lạc ngay phần trên màn hình (không cần cuộn mới thấy ô nhập mã).
3. **Kho Game 9 Trò Chơi (Bộ Lọc + Lưới 2 Cột)**:
   - Thanh tab lọc nhóm: `Tất cả (9)` · `🕵️ Suy luận` · `🎉 Tiệc tùng` · `🔤 Đấu trí`.
   - Lưới responsive 2 cột (`gameCard` với `testID="create-${g}"`): mỗi thẻ có icon lớn, tên game, tag số người (`4–12 người`), huy hiệu `MỚI` / `HOT`, mô tả ngắn 1–2 dòng sắc nét.
4. **Phòng Đang Mở** (`OpenRooms`) nằm ngay bên dưới lưới game.

### 2.2 Thanh Công Cụ & Hàng Avatar (`Shell.tsx`)
- **Top Bar chia 2 nhóm rõ ràng**:
  - **Cụm Trái (Ngữ cảnh phòng)**: Nút sao chép mã phòng (`room-chip`) + Tên/Biểu tượng game + Badge Map hiện tại.
  - **Cụm Phải (Hành động — tối đa 5 icon gọn)**:
    - Nếu là màn hẹp `< 440px`: nhóm phụ (`🎨 Map & Mượt`, `🌪️ Chọc loạn xạ` nếu admin) có thể mở nhanh gọn hoặc giữ nút nhỏ cân đối với `gap: 5`, tách biệt nút `🚪 Rời phòng` (`leave-open`) ở ngoài cùng bên phải (viền đỏ nhẹ để tránh bấm nhầm).
    - Thứ tự ổn định: `[Mã phòng] [Game]  ···  [🌪️?] [🎨] [✏️] [💬(badge)] [🔊] | [🚪]`
    - Bấm `🎨` mở `RoomVisualSheet` nhanh gọn ngay trong phòng: cho phép người chơi chọn Map/Màu cá nhân, bật tắt `⚡ Siêu mượt`, hoặc (nếu là Chủ phòng) đổi Map cho cả phòng!
- **Hàng Avatar Thích Ứng 1–12 Người**:
  - `1–6 người`: dải cuộn ngang rộng rãi `size 52–60px`, hiện đủ khung VIP, hào quang, thú cưng bay trên vai, danh hiệu nhỏ dưới tên.
  - `7–12 người`: dải gọn thông minh `size 44px` có chỉ số đếm `👥 10/12`, hỗ trợ cuộn mượt hoặc lưới 2 hàng khi ở phòng chờ.
  - Các game tự vẽ sân chơi (như Cờ tỷ phú, hoặc màn hình ẩn strip khi màn quá thấp) vẫn giữ nút mở danh sách chọc nhanh không che bàn cờ.

### 2.3 Phòng Chờ (`LobbyScreen.tsx`)
Chia rõ cấu trúc thành **2 Tab chính** + **Header tóm tắt nhân vật luôn hiển thị**:
- **Thẻ Mã Phòng & Trạng Thái** gọn gàng: Mã phòng lớn (`room-code`), nút chia sẻ (`share-btn`), nút Công khai/Riêng tư (`visibility-public`, `visibility-private`).
- **Thanh chuyển 2 Tab**:
  - **Tab 1 (`🎮 Sảnh & Game`)**:
    - Bộ chọn 9 game dạng lưới chip có icon đẹp (`pick-${g}`) + Luật chơi tóm tắt 3 dòng.
    - Bảng **Cài đặt ván** động theo game đang chọn (Bầu cua: số ván; Ma sói: chế độ Cổ điển / Hỗn loạn; Gián điệp: bật/tắt Mr. White & số gián điệp; Vẽ & Đoán: số vòng; Đố vui: 5/10/15 câu).
    - Bảng **🗺️ Map Phòng** (Chủ phòng chọn 1 trong 5 map miễn phí hoặc map Ruby mình sở hữu).
    - Thẻ **Người chơi & Máy** (`bot-add`, `bot-remove-${id}`, nút mời ra cho chủ phòng).
  - **Tab 2 (`🎭 Nhân Vật & Trang Bị`)**:
    - Lưu ý tương thích E2E: giữ `character-customizer`, thanh chọn nhanh **36 Nhân vật mẫu** (`char-preset-*`), nút `🎲 Ngẫu nhiên` (`char-random`) ở vùng hiển thị rõ ràng, cùng các nhóm accordion (Mặt, Da, Mắt/Mày, Mũi/Miệng, Tóc, Râu, Trang phục, Phụ kiện, Hình xăm) và nút mở thẳng `🛍️ Cửa hàng Ruby`.

### 2.4 Bảng Chọc Ghẹo (`ThrowSheet` trong `Fun.tsx`)
- Thanh đầu: Thông báo lượt miễn phí (`poke-quota`), bộ lọc nhanh 6 nhóm:
  `✨ Tất cả` · `👊 Đánh/Ném` · `🎪 Kho 270+` · `😈 Chọc bựa` · `⚡ Kỹ năng VIP` · `🎁 Tặng quà`
- Mặc định mở ở **`✨ Tất cả`** để mọi thao tác 1-chạm và toàn bộ `testID` hiện có (`hit-*`, `throw-*`, `troll-*`, `skill-*`, `gift-*`, `poke-btn`, `poke-kho-open`) có mặt tức thì, nhưng từng nhóm được đóng khung Card có tiêu đề màu sắc, badge giá `💎` rõ ràng, không còn dính chùm.

### 2.5 Cửa Hàng Ruby (`ShopSheet` trong `Shop.tsx`)
- Thanh **VIP Prestige Banner** trên cùng: Hiển thị cấp VIP hiện tại (`VIP 0..6`), thanh tiến độ tới cấp tiếp theo, tổng Ruby đã tiêu.
- Sân khấu **Xem Thử Trực Tiếp (Live Preview Stage)**: Hiển thị Avatar + Khung + Hào quang + Thú cưng + Danh hiệu + Hiệu ứng tên + Bong bóng chat + Nền Map đang chọn ngay trong Cửa hàng!
- Tab rõ ràng có thể cuộn ngang: `🖼️ Khung`, `✨ Tên & Danh hiệu`, `💫 Hào quang & Vào phòng`, `🐾 Thú cưng & Chat`, `🗺️ Map Phòng`, `⚡ Kỹ năng & Quà`, `🔤 Sticker`.
