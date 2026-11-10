# Bàn giao: Cờ tỷ phú (nhánh `redo/typhu`)

Người làm: GPT 5.6 (Codex), mức high/max. Người review: Claude. Làm xong thì commit lên nhánh này, KHÔNG merge vào main, KHÔNG deploy; báo lại để review.

## Trạng thái khi bàn giao
- Base: `main` @ `ca94604` (đang chạy trên Render).
- Đã xong (đã commit, đã kiểm tra): `f7c4406` ô bàn cờ dạng thẻ phẳng + icon Twemoji (`app/assets/typhu-icons/`, `app/src/typhuIcons.ts`, `app/src/typhuLayout.ts`); `b3dfa3f` giữa bàn có nội dung (`app/src/components/TyPhuCenter.tsx`), quân cờ có mặt người chơi, hiệu ứng; `044f0cd` e2e + ghi nguồn Twemoji trong README.
- ĐANG DỞ (commit "WIP" cuối cùng, mới chỉ typecheck + vitest 119/119 qua, CHƯA chạy e2e, CHƯA xem giao diện):
  - `server/src/games/dice3d.ts`, `shared/src/dice.ts`: mô phỏng vật lý 2 xúc xắc phía server.
  - `app/src/components/TyPhuDice3D.tsx`: phát lại khung hình xúc xắc 3D.
  - `app/src/components/TyPhuAnnounce.tsx`: thông báo toàn màn hình.
  - Sửa nhịp `shared/src/typhu.ts`, `server/src/games/typhu.ts`, `engine.ts`.

## Yêu cầu của chủ dự án (phải đạt hết)
1. Bàn cờ đẹp, dễ nhìn, không rối: mỗi ô một icon phù hợp, chữ ≥10px ở 390px, không bị "…"; giữa bàn không trống (xúc xắc lớn, người đang tới lượt, nút hành động, thẻ tiền, nhật ký sự kiện, "đất của bạn").
2. Nhịp chậm lại: xúc xắc lăn ~1,6–2 s, quân đi ~350–450 ms/ô; đồng hồ lượt chỉ chạy SAU khi quân đi xong (server và client cùng mốc thời gian).
3. Thông báo lớn kiểu "mở bát" của Bầu cua (xem `Reveal` trong `app/src/screens/BauCuaScreen.tsx`), mọi người đều thấy, ~2–2,5 s, không chặn thao tác, xếp hàng không chồng nhau:
   - Ai mua đất: mặt người mua + icon ô + "ĐÃ MUA <tên> – <giá> xu" + con dấu.
   - Nhận thưởng (qua Xuất phát, thẻ tốt, thu tiền thuê): hào quang vàng, tia sáng xoay, xu nổ "+X xu".
   - Bị trừ tiền (trả thuê, thuế, thẻ xấu, vào tù): màn tối ám xanh, con ma 👻 lơ lửng hiện lên, "-X xu", nhạc xui.
   - Xây nhà/khách sạn, phá sản: biến thể riêng.
4. Xúc xắc 3D theo vật lý: người chơi vuốt/tung (hướng + lực = xung lực), chạm = tung mặc định (giữ `roll-btn`). Server là trọng tài: kiểm tra và giới hạn xung lực, cộng nhiễu rất nhỏ phía server (chống luyện cú tung, ghi chú trong code), mô phỏng đến khi dừng, mặt trên = kết quả, gửi khung hình (vị trí + quaternion ~30–40 fps) cho mọi client phát lại giống hệt. Client vẽ khối lập phương thật có chấm, bóng đổ, khay nỉ; kết thúc đúng mặt server.
5. Quân cờ và thẻ tiền to, rõ.
6. Hiệu năng: ô bàn cờ (`TyPhuCell`, React.memo) không render lại theo nhịp 32 ms.

## Ràng buộc kỹ thuật
- Monorepo: `shared/` (types), `server/` (Node + Socket.IO, esbuild, vitest), `app/` (Expo SDK 58 + React Native Web, xuất web tĩnh), `e2e/` (Playwright).
- Không đổi luật chơi. Không đưa secret/URI vào repo (repo public). Không thêm thư viện client nếu không cần.
- Lint React Compiler (`CI=1 EXPO_OFFLINE=1 npx expo lint`): không đọc/ghi `ref.current` lúc render (dùng `useState(() => new Animated.Value(0))[0]`); không setState đồng bộ trong thân useEffect (điều chỉnh lúc render theo prev-key, hoặc set trong callback/rAF/timer). Ref của `Animated.View` trên web không phải DOM, đo bằng ref của `View` thường.
- Phong cách: sticker (`app/src/theme.ts`: `C.son`, `C.gold`, `C.ink`, `C.paper`, `sticker(n)`), font Be Vietnam Pro, chữ tiếng Việt ngắn gọn, vui.
- Giữ testID: roll-btn, buy-btn, skip-btn, build-btn, end-turn, pay-jail, end-open, end-confirm, die-1, die-2, dice-phase-*, typhu-card, typhu-status, cell-${i}, token-${id}, wealth-card-${id}, rotate-toggle.

## Kiểm tra bắt buộc trước khi báo xong
1. `cd server && npx tsc --noEmit && npx vitest run && npm run build`
2. `cd app && npx tsc --noEmit && CI=1 EXPO_OFFLINE=1 npx expo lint`
3. Chạy local: server `PORT=3999 TURN_SECONDS=8 node server/dist/server.js`; web `cd app && EXPO_OFFLINE=1 EXPO_PUBLIC_SERVER_URL=http://localhost:3999 npx expo export --platform web --output-dir dist-local` rồi phục vụ thư mục đó ở cổng 8081.
4. E2E: `e2e/typhu.mjs`, `E2E_WEB=http://localhost:8081 node e2e/v2.mjs`, và `play/games/edge/social.mjs` đều qua (cần playwright-core + Chrome; trên Windows đặt `E2E_BROWSER`).
5. Chụp màn hình 390×844, 360×640, 844×390: lúc bắt đầu, đang lăn xúc xắc, từng loại thông báo, sau khi mua vài ô, sheet chi tiết ô. Tự xem lại, sửa đến khi không còn chữ bị cắt/chồng.
6. Báo lại: danh sách thay đổi, hash commit, kết quả test, đường dẫn ảnh chụp.
