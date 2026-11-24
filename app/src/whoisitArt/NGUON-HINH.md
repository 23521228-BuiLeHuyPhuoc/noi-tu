# Nguồn hình ảnh & Giấy phép — Game "Đoán Ai Đây?" (`who_is_it`)

Mỗi ván game chọn ngẫu nhiên 1 trong 7 bộ nét vẽ chân dung mã nguồn mở dưới đây và sinh hoàn toàn mới bảng 30–54 khuôn mặt theo seed. **Dự án không vẽ lại hay sử dụng bất kỳ nhân vật nào từ các trò chơi thương mại.**

## Danh sách 7 gói nét vẽ nhân vật

| Gói nét vẽ | Tác giả thiết kế | Nguồn thiết kế | Repo GitHub | Giấy phép thiết kế | Cách sử dụng trong dự án |
| --- | --- | --- | --- | --- | --- |
| **Hoạt hình Avataaars** (`avataaars`) | Pablo Stanley | https://avataaars.com/ | https://github.com/dicebear/dicebear | Free for personal and commercial use | Render qua `@dicebear/core` + `@dicebear/avataaars` (mã DiceBear: MIT) kèm lớp phủ SVG tự vẽ (bông tai, má hồng, tàn nhang, vết sẹo, nơ cài). |
| **Nhân vật Personas** (`personas`) | Draftbit | https://personas.draftbit.com/ | https://github.com/dicebear/dicebear | CC BY 4.0 | Render nguyên bản qua `@dicebear/core` + `@dicebear/personas` (mã DiceBear: MIT), khóa tham số khớp 1:1 với đặc điểm câu hỏi; ghi công tác giả trong giao diện. |
| **Nét vẽ Micah** (`micah`) | Micah Lanier | https://www.figma.com/community/file/829741575478342595 | https://github.com/dicebear/dicebear | CC BY 4.0 | Render nguyên bản qua `@dicebear/core` + `@dicebear/micah` (mã DiceBear: MIT), khóa tham số khớp đặc điểm; ghi công tác giả trong giao diện. |
| **Phác họa Open Peeps** (`openPeeps`) | Pablo Stanley | https://www.openpeeps.com/ | https://github.com/dicebear/dicebear | CC0 1.0 | Render nguyên bản qua `@dicebear/core` + `@dicebear/open-peeps` (mã DiceBear: MIT), bỏ qua biến thể không phù hợp (`cyclops`, `monster`, `hatHip`). |
| **Hoạt hình ToonHead** (`toonHead`) | Johan Melin | https://www.figma.com/community/file/1589627891082866389 | https://github.com/dicebear/dicebear | CC BY 4.0 | Render nguyên bản qua `@dicebear/core` + `@dicebear/toon-head` (mã DiceBear: MIT), khóa kiểu tóc/râu/biểu cảm/màu áo; ghi công tác giả trong giao diện. |
| **Biểu cảm Big Smile** (`bigSmile`) | Ashley Seo | https://www.figma.com/community/file/881358461963645496 | https://github.com/dicebear/dicebear | CC BY 4.0 | Render nguyên bản qua `@dicebear/core` + `@dicebear/big-smile` (mã DiceBear: MIT), chỉ dùng kính từ ô phụ kiện; ghi công tác giả trong giao diện. |
| **Tối giản Nice Avatar** (`niceAvatar`) | Chill Lab | https://github.com/dapi-labs/react-nice-avatar | https://github.com/dapi-labs/react-nice-avatar | MIT | Port phẳng sang 1 file SVG duy nhất trong `niceAvatar.ts` (giữ nguyên thông báo bản quyền tại `LICENSE-react-nice-avatar.txt`), bổ sung tròng kính tối cho kính râm. |

## Thư viện biểu tượng & mã nguồn hỗ trợ

- **DiceBear** (`@dicebear/core`, `@dicebear/avataaars`, `@dicebear/personas`, `@dicebear/micah`, `@dicebear/open-peeps`, `@dicebear/toon-head`, `@dicebear/big-smile`): https://github.com/dicebear/dicebear — Giấy phép **MIT** (mã nguồn).
- **Microsoft Fluent Emoji** (`EmojiIcon` dùng trong popup/HUD): https://github.com/microsoft/fluentui-emoji — Giấy phép **MIT**.
- **Lucide Icons** (`UiIcon`): https://github.com/lucide-icons/lucide — Giấy phép **ISC**.
