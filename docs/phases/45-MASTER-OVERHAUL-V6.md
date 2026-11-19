# Master Overhaul V6 — Không Gian Chơi Toàn Màn Hình (Zero-Scroll), Kho Từ & Câu Hỏi Mở Rộng, Lô Tô 6×9 1.5s, Sửa Sạch Ma Sói / Gián Điệp / Boom / Ếch (Phases 45–55)

Tài liệu đặc tả và danh sách kiểm tra chi tiết cho bản đại tu V6 dựa trên phản hồi thực chiến của người chơi:

1. **Vẽ & Đoán (`ve_doan`)**: Mở rộng kho từ `614` từ chuẩn hóa không trùng lặp, nâng mặc định 1 trận lên 4 vòng (`8` lượt cho 2 người, `12` lượt cho 3 người, tối đa 24 lượt), loại bỏ hoàn toàn hàng avatar & cuộn trang (`scroll={false}`), phóng đại khung bảng vẽ và tách memo `VeDoanGuessDock` gõ từ không lag trên Mobile.
2. **Đố Vui (`do_vui`)**: Mở rộng ngân hàng câu hỏi Intern–Junior thêm +294 câu chính xác theo 7 chuyên đề CNTT & Tiếng Anh (`546` câu tổng, 0 trùng lặp), giữ cân bằng độ dài 4 phương án (`18.3%`), hỗ trợ chọn `20` câu, sắp xếp lại bố cục zero-scroll hiển thị trọn vẹn **Câu hỏi + Cả 4 Đáp án** cùng lúc ngay cả trên màn nhỏ `360×640`.
3. **Global Chat & Keyboard Performance**: Chống forced-reflow `ResizeObserver(document.body)` + rAF throttle trong `web.ts`/`hooks.ts`/`KeyboardLift.tsx`, thêm `scroll={false}` + `stickyBottom` cho `Sheet.tsx`, memo hóa `ChatInputBar` + `ChatMessageList` trong `Fun.tsx`.
4. **Ma Sói (`masoi`)**: Thêm `canRoomChat` chặn người chết & ban đêm chat phòng chung, Sói không cắn đồng đội, multi-Wolf cần đồng thuận mới kết đêm sớm, xóa `wolfVotes` khi qua đêm, Phù Thủy không tự đầu độc, `role_reveal` sẵn sàng sớm, unified `checkPhaseAdvance` khi thoát/disconnect + kích hoạt chuỗi Cặp Đôi - Thợ Săn, sửa bot treo pha `day_discuss` + ngẫu nhiên hóa Cupid/Thám Tử, timestamp từ server `publicLog.at`, tách memo `MaSoiChatInputBar` + pinned `masoi-intel-banner`.
5. **Ai Là Gián Điệp (`giandiep`)**: Kéo dài thời gian các pha (`10, 40, 45, 35, 28, 22, 25, 25, 12`), thêm **Thanh Tiến Trình Pha (`gd-phase-stepper`)**, thẻ **Hành Động Rõ Ràng (`gd-phase-callout`)** + khung chọn vote trực quan (`gd-vote-panel`), khung chat dạng bong bóng Messenger, memo `GianDiepBottomDock` + `GianDiepBody`, **không cuộn trang**.
6. **Cờ Caro (`caro`)**: Ẩn hàng Avatar cồng kềnh của `Shell`, thu gọn HUD & dải phe ngang, đo động `onLayout` khung chứa bàn cờ để bàn cờ chiếm trọn không gian màn hình với 0 outer scroll.
7. **Lô Tô (`loto`) + Toàn Hệ Thống Zero-Scroll**: Tăng tốc độ gọi số Lô Tô lên `1.5s` (`1500ms`), nâng vé từ `3×9` (15 số) lên **`6×9` (30 số độc nhất trong 2 khung Gale-Ryser 3×9)** kèm 6 nút KINH + `<Sheet>` soi vé hàng xóm + `LotoCallBar` cô lập re-render; đồng bộ `scroll={false} hideStrip` + `<CompactPlayerStrip>` cho `WordChainScreen`, `BomTuScreen`, `BauCuaScreen`.
8. **Đặt Bom Tử Chiến (`boom_online`) & Đầm Lầy Quái Chiêu (`croaksquad`)**: Sửa kẹt D-Pad & mở Corner-Sliding Assist trên cả hướng thẳng lẫn chéo (`0.50` tolerance) + đồng bộ bomb overlap `0.86` + reconciliation deadzone `0.18`; sửa dư trớn +160ms khi nhả thumbpad `CroakSquadScreen` + siết bám bệ gỗ di động (`f.vy >= 0`) & đẩy ngang fallback trong `shared/src/croaksquad.ts`.

---

## Phân Chia Các Phase Thực Thi

- [x] **Phase 45**: Tài liệu thiết kế V6, component `<CompactPlayerStrip>` và tinh chỉnh `Shell` khi `!scroll`.
- [x] **Phase 46 / 46b (`ve_doan`)**: 614 từ vựng mới (`shared/src/vedoan.ts`), mặc định `veDoanRounds = 4`, `usedWords`, `VeDoanScreen.tsx` không avatar strip & memo `VeDoanGuessDock`.
- [x] **Phase 47 (`do_vui`)**: `shared/src/dovui-extra.ts` (546 câu Intern–Junior), tùy chọn 20 câu, `DoVuiScreen.tsx` Zero-Scroll.
- [x] **Phase 48 (Global Keyboard/Chat Perf)**: `web.ts`, `hooks.ts`, `KeyboardLift.tsx`, `Sheet.tsx`, `Fun.tsx`.
- [x] **Phase 49 (`masoi`)**: `canRoomChat`, toàn bộ 8 bugfixes backend + bot AI (`masoi.ts`) và UI (`MaSoiScreen.tsx`).
- [x] **Phase 50 (`giandiep`)**: Mở rộng timer 9 pha, `gd-phase-stepper`, `gd-phase-callout`, `gd-vote-panel`, Messenger bubbles, memo `GianDiepBottomDock` & `GianDiepBody`.
- [x] **Phase 51 (`caro`)**: Ẩn `Shell` strip, HUD gọn, đo động `onLayout` phóng to tối đa bàn cờ `CaroScreen.tsx`, Zero-Scroll.
- [x] **Phase 52 (`loto` 1.5s & 6×9 30 số + `WordChain`/`BomTu`/`BauCua` Zero-Scroll)**: `shared/src/loto.ts`, `server/src/games/loto.ts`, `LotoScreen.tsx`, `WordChainScreen.tsx`, `BomTuScreen.tsx`, `BauCuaScreen.tsx`.
- [x] **Phase 53 (`boom_online` & `croaksquad`)**: Sửa D-Pad/Corner-Slide/reconciliation `boom_online` & sửa overshoot thumbpad/moving platform `croaksquad`.
- [x] **Phase 54 (Tests, Lint & Playwright E2E Audit)**: Viết `server/test/v6-overhaul.test.ts`, chạy toàn bộ Vitest + TypeScript + Expo Lint, chạy Playwright `e2e/audit-v6.mjs` kiểm chứng `scrollHeight <= innerHeight + 2` ở `360×640`, `390×844`, `1280×800`, soi toàn bộ ảnh chụp màn hình.
- [x] **Phase 55 (Cleanup & Ship)**: Dọn `app/dist-e2e`, kiểm tra lần cuối, cập nhật `walkthrough.md`, commit & push lên `origin/main` (giữ nguyên `docs/HANDOFF-tai-khoan-ruby.md`).
