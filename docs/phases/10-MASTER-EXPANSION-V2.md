# Phase 10–17 — Lộ Trình Đại Nâng Cấp Xóm Lầy V2 (14 Trò Chơi · Mobile-First 4 Fragments · Hiệu Ứng Ố Dề · QA 2.558 Kịch Bản)

> Tài liệu kiến trúc tổng thể và biên bản nghiệm thu cho đợt đại nâng cấp **Xóm Lầy V2**, hoàn thành trọn vẹn mọi yêu cầu về độ lố lăng/diêm dúa của hiệu ứng & màu sắc, cấu trúc 4 Fragment trên điện thoại, ngân hàng câu hỏi CNTT/Tiếng Anh C1–C2 chuyên sâu, thiết kế lại hoàn toàn Ma Sói 2.0, mở rộng 4 game kinh điển, bổ sung 5 trò chơi mới (tổng **14 game**) và hệ thống kiểm thử tự động `2.558` test case + Playwright E2E chụp rà soát từng màn hình.

---

## 1. Bảng Tiến Độ Hoàn Thành Các Giai Đoạn (`100% Completed`)

| Phase | Trạng Thái | Hạng Mục Trọng Tâm | Phạm Vi File Chính | Kết Quả Nghiệm Thu |
|---|---|---|---|---|
| **Phase 10** | `[x]` Hoàn tất | Nghiên cứu OSS & Tài liệu thiết kế (kể cả nghiên cứu sâu *Croak Squad* Steam `3675400`) | `docs/phases/10-*.md`, `docs/phases/15-*.md` | Phân định rõ dữ kiện kiểm chứng từ trang Steam `3675400` vs thiết kế cải tiến trước khi viết code |
| **Phase 11** | `[x]` Hoàn tất | Hệ thống Icon 3D Shaded Vector, 15 Map Rực Rỡ & Kho Ruby "Ố Dề / Lầy Lội" (146 vật phẩm) | `app/scripts/sync-iconify-pack.mjs`, `shared/src/shop.ts`, `shared/src/themes.ts`, `FxStyles.tsx`, `Cosmetics.tsx`, `SkillFx.tsx`, `Fun.tsx` | Đóng gói `473` vector 3D `@iconify-json/fluent-emoji`, `csshake` crazy/clown, shader Holofoil 3 vòng, `28` tuyệt kỹ Troll Ruby (BSOD, Bão Dép 24K, Còi Cảnh Sát, Búa Tạ, Thiên Đế Phán Quyết) & Quà Ngai Vàng `10.000💎` |
| **Phase 12** | `[x]` Hoàn tất | Kiến trúc Mobile-First 4 Fragments & Tối ưu hiển thị màn nhỏ (`360–390px`) | `HomeScreen.tsx`, `Sheet.tsx`, `Shop.tsx`, `ResultScreen.tsx` | Chia Trang chủ thành 4 Fragment (`🎮 Chơi ngay`, `🚪 Phòng mở`, `💎 Phú Hào`, `👑 Cá nhân`) với thanh đáy nổi chuẩn mobile, giữ 100% tương thích `smoke-new.mjs` |
| **Phase 13** | `[x]` Hoàn tất | Đấu Trường Đố Vui CNTT / CS & Tiếng Anh C1–C2 Khó + Chọn Chủ Đề | `shared/src/dovui.ts`, `server/src/games/dovui.ts`, `DoVuiScreen.tsx`, `LobbyScreen.tsx` | **252 câu hỏi khó/cực khó** kiểm chứng kỹ thuật thuộc 7 chuyên đề (`oop`, `dsa`, `js_ts`, `node_backend`, `mobile_fe`, `fullstack_it`, `english_adv`) + chọn chủ đề ở sảnh chờ |
| **Phase 14** | `[x]` Hoàn tất | Thiết Kế Lại Hoàn Toàn Game Ma Sói 2.0 + Mở Rộng 4 Game Kinh Điển | `shared/src/{masoi,pos}.ts`, `server/src/games/{masoi,wordchain,baucua,typhu}.ts`, `MaSoiScreen.tsx` | Ma Sói 2.0 có Chat Làng trực tiếp + Lịch sử cuộn + Câu hỏi nhanh, Sổ Tay Vai Trò, Ghim nghi vấn & Kết quả Tiên Tri trên ghế, nhịp 90s/65s/40s; Nối từ có Độ khó Địa Ngục 4s & Luật từ loại; Bầu cua có Lộc Trời ×2/×3 & Tam Hoa; Cờ tỷ phú có Lễ Hội x2, Hũ Độc Đắc & Mua đứt 160% |
| **Phase 15** | `[x]` Hoàn tất | Bộ 5 Trò Chơi Mới (`cah`, `cashnguns`, `loto`, `caro`, `croaksquad`) | `shared/src/{cah,cashnguns,loto,caro,croaksquad}.ts`, `server/src/games/*`, `app/src/screens/*` | Hoàn thiện 5 trò chơi mới nâng tổng số lên **14 game**; `croaksquad` chạy vật lý 2D `30Hz` đồng bộ mạng thật 2–6 người chơi (khóa hoàn toàn Bot giả) |
| **Phase 16** | `[x]` Hoàn tất | Automation Tester Toàn Diện (`2.558` test case + Multi-Browser Screenshot Audit) | `server/test/mega-v2-all-games.test.ts`, `e2e/mega-audit.mjs`, `e2e/smoke-new.mjs` | `36/36` file test server (`2.558 / 2.558` test case xanh 100%), `smoke-new.mjs` `ALL OK` & `mega-audit.mjs` `MEGA AUDIT ALL OK` kèm soi trực tiếp hơn 35 ảnh chụp màn hình |
| **Phase 17** | `[x]` Hoàn tất | Đóng gói, Kiểm tra CI sạch 0 lỗi, Commit & Push `origin main` | Toàn bộ workspace (bảo toàn file ngoài git `docs/HANDOFF-tai-khoan-ruby.md`) | `tsc`, `expo lint`, `vitest`, `esbuild`, `expo export` và Playwright E2E đạt 0 lỗi, 0 cảnh báo |

---

## 2. Nguồn Thư Viện GitHub Nhiều Sao Tích Hợp Trong Hệ Thống Hiệu Ứng & UI

1. **`microsoft/fluentui-emoji` (`@iconify-json/fluent-emoji`, 17k+ ⭐)**: `473` biểu tượng SVG đa tầng đổ bóng 3D specular rực rỡ được biên dịch tĩnh vào `app/src/iconPack.generated.ts`.
2. **`elrumordelaluz/csshake` (`csshake`, 8.2k+ ⭐)**: Các chuỗi keyframe rung chấn cường điệu (`shake-crazy`, `shake-hard`, `shake-chunk`) cho đòn chọc ghẹo, nổ bom và tuyệt kỹ Đại Gia.
3. **`simeydotme/pokemon-cards-css` (6.2k+ ⭐)**: Hiệu ứng phủ **Holographic Prismatic Foil**, `conic-gradient` xoay 360° đa vòng và vân kim cương lấp lánh cho Khung Vô Cực Đế (`frame_emperor_omega`), Danh hiệu Thiên Đế (`title_thien_de`), Bong bóng Ngọc Tỷ và Thẻ Đen Hội Bàn Tròn.
4. **`motiondivision/motion` (28k+ ⭐) + `catdad/canvas-confetti` (12k+ ⭐) + `dicebear/dicebear` (8k+ ⭐) + `lucide-icons/lucide` (16k+ ⭐)**: Hệ sinh thái chuyển động lò xo, pháo giấy đa lớp, nhân vật 36 studio preset và hệ thống icon UI đồng bộ.
