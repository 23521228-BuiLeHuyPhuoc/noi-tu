# Phase 9 — Hệ Thống Thiết Kế, Icon Vector, Avatar Studio & Chuyển Động Chuyên Nghiệp (OSS Stack)

> Tài liệu chuẩn hóa toàn bộ giao diện **Xóm Lầy** bằng các thư viện mã nguồn mở hàng đầu trên GitHub, loại bỏ hoàn toàn SVG tự vẽ thủ công thô, emoji hệ điều hành không đồng nhất và khung viền hoạt hình đơn điệu.

---

## 1. Ngăn Xếp Thư Viện Mã Nguồn Mở (GitHub High-Star Stack)

| Lớp Hệ Thống | Thư Viện NPM | Repo GitHub Tiêu Biểu | Vai Trò Trong Dự Án |
|---|---|---|---|
| **UI Vector Icons** | `lucide-react-native` + `react-native-svg` | `lucide-icons/lucide` (16k+ ⭐) | Toàn bộ icon nét mảnh 2px cho nút bấm, thanh công cụ, sheet, input, tab, badge trạng thái |
| **Game & Item Emblems** | `@iconify-json/fluent-emoji-flat` | `microsoft/fluentui-emoji` (17k+ ⭐) | Bộ vector đa sắc phẳng chính chủ Microsoft cho 9 game, Ruby, huy chương, quà VIP, kỹ năng, thú cưng |
| **RPG & Role Emblems** | `@iconify-json/game-icons` | `game-icons/icons` (4.100+ RPG SVG) | Biểu tượng chuyên biệt cho 9 vai trò Ma Sói, Gián Điệp, Bom Chữ, giáp/khiên/vũ khí |
| **Studio Avatars** | `@dicebear/core` + `@dicebear/collection` | `dicebear/dicebear` (8.5k+ ⭐) | Động cơ render chân dung nhân vật chuyên nghiệp (`@dicebear/collection` — `avataaars`) kèm lớp vector phụ kiện (`nón lá`, `vương miện`, `tai mèo`, `tai thỏ`, `kính cyber`, v.v.), hỗ trợ 36 presets, tùy biến chi tiết & biểu cảm `Mood` |
| **Color Scales & Tokens** | `@radix-ui/colors` + `open-props` | `radix-ui/colors` (16k+ ⭐), `argyleink/open-props` (15k+ ⭐) | Thang màu chuẩn tương phản WCAG, biến CSS `--ease-spring`, bóng đổ nhiều lớp & gradient hiện đại |
| **Gradients & Glassmorphism** | `expo-linear-gradient` + `expo-blur` | `expo/expo` | Nút 3D gradient nhiều điểm dừng, bề mặt kính mờ Frosted Glass HUD & Sheet |
| **Typography Tiếng Việt** | `expo-font` + `@expo-google-fonts/be-vietnam-pro` | `expo/google-fonts` | Nạp đủ trọng lượng `500..900` của phông chữ `Be Vietnam Pro` đồng bộ Web & Mobile |
| **Motion & Physics FX** | `motion` + `animate.css` + `canvas-confetti` | `motiondivision/motion` (28k+ ⭐), `animate-css/animate.css` (81k+ ⭐), `catdad/canvas-confetti` (12k+ ⭐) | Chuyển động lò xo mượt 60fps trên Web, lật thẻ 3D Ma Sói/Gián Điệp, pháo hoa ăn mừng vật lý |

---

## 2. Kiến Trúc Biên Dịch Icon Ngoại Tuyến (Zero-Runtime-Network Icon Pack)

- Script [`app/scripts/sync-iconify-pack.mjs`](../../app/scripts/sync-iconify-pack.mjs) trích xuất trực tiếp SVG tối ưu từ `@iconify-json/fluent-emoji-flat` (`438` icon) và `@iconify-json/game-icons` (`24` RPG SVG) thành [`app/src/iconPack.generated.ts`](../../app/src/iconPack.generated.ts) (`FLUENT_ICONS`, `GAME_ICONS`, `EMOJI_TO_FLUENT` — `511` ánh xạ emoji, `0` unresolved).
- Lợi ích:
  1. **Không phụ thuộc CDN ngoài**: chạy offline 100% trong E2E, Android/iOS và production.
  2. **Đồng nhất hình khối trên mọi OS**: Windows, macOS, Android, iOS đều hiển thị cùng một artwork vector Microsoft Fluent Emoji & Game Icons sắc nét.
  3. **Sạch `innerText`**: các `<svg aria-hidden="true">` không chèn ký tự lạ vào DOM text nên các selector & đọc màn hình không bị nhiễu.

---

## 3. Ánh Xạ Thành Phần UI Cốt Lõi

1. **Nguyên tử UI ([`app/src/ui.tsx`](../../app/src/ui.tsx), [`app/src/theme.ts`](../../app/src/theme.ts))**:
   - `C`, `GRADS`, `SHADOWS`: chuẩn hóa từ `@radix-ui/colors` (`amber`, `ruby`, `jade`, `violet`, `slate`, `crimson`, `cyan`, `gold`).
   - `Button`: dùng `LinearGradient` đa sắc + viền sáng cạnh trên + gờ nổi 3D đáy + tự động chuyển đổi mọi emoji trong `icon` hoặc đầu `title` sang `<EmojiIcon>`.
   - `IconButton`, `Card`, `FeedProvider`: đổ bóng mềm đa lớp theo `open-props`, icon Lucide đồng bộ theo trạng thái.
   - `Sheet` ([`app/src/components/Sheet.tsx`](../../app/src/components/Sheet.tsx)): nền kính mờ (`backdropFilter: blur`), thanh kéo tối giản, nút đóng tròn Lucide `X`.
2. **Nhân vật & Trang trí ([`app/src/avatars.ts`](../../app/src/avatars.ts), [`Avatar.tsx`](../../app/src/components/Avatar.tsx), [`Cosmetics.tsx`](../../app/src/components/Cosmetics.tsx))**:
   - Tái cấu trúc hoàn toàn bộ dựng SVG mặt người bằng `@dicebear/core` + `@dicebear/collection`, giữ tương thích 100% với `CharacterConfig`, 36 presets và 6 biểu cảm `Mood`.
   - Huy hiệu chủ phòng, bút chì sửa, hạng `1/2/3`, thú cưng, vương miện, hiệu ứng biến hình/dính đòn chuyển sang `<EmojiIcon>` / `<UiIcon>` / `<RankMedal>`.
3. **Chuyển động & Màn hình Game**:
   - [`MotionPrimitives.tsx`](../../app/src/components/MotionPrimitives.tsx): `MotionSurface` & `FlipCard` dùng `motion/react` trên Web (tôn trọng `smoothMode`) và `Animated` trên Native.
   - Toàn bộ 9 màn hình + Cửa hàng VIP + Bảng chọc + Kết quả nâng cấp đồng bộ phông `Be Vietnam Pro`, icon vector và pháo giấy `canvas-confetti`.

---

## 4. Các Tinh Chỉnh Hậu Kiểm Visual & Xác Minh

1. **Khắc phục lưới 2 cột Desktop (`MotionPrimitives.tsx`)**: Đặt `style` (`width: '48.8%'` của `HomeScreen`) lên `<View>` bọc ngoài và `width: '100%'` cho `<motion.div>` bên trong để thẻ game hiển thị đủ rộng hai cột trên màn hình `1280×800`.
2. **Nới thanh header Mobile (`Shell.tsx`)**: Thu gọn cụm nút công cụ phải khi `iconOnly` (`width < 440`, `iconTight: 34×34px`), giữ `chip` `flexShrink: 0` và `gameIconWrap` có `minWidth: 28` + đệm ngang để icon trò chơi không chạm viền mã phòng.
3. **Tăng độ tương phản VIP trên nền tối (`Cosmetics.tsx`, `FxStyles.tsx`)**: Điều chỉnh màu `name_divine_glitch` (`#F0ABFC`), `name_neon_pulse` (`#22D3EE`) và bóng chữ `xl-glitch` rõ nét trên cả thẻ sáng lẫn Map Cung Trăng Ngân Hà.
4. **Kết quả xác minh cuối cùng**: `app` đạt `tsc --noEmit` 0 lỗi & `expo lint` 0 lỗi / 0 cảnh báo; `server` đạt `35/35` test files (`330/330` tests); `expo export --platform web` & Playwright E2E (`mega-audit.mjs` + `smoke-new.mjs`) đạt `ALL OK` với 0 `pageerror`.
