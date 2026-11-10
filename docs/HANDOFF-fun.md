# Bàn giao: Avatar lầy, chọc nhau, chat, bàn phím, đồng xu (nhánh `redo/fun`)

Người làm: Argon (Antigravity), mức high/max. Người review: Claude. Làm xong thì commit lên nhánh này, KHÔNG merge vào main, KHÔNG deploy; báo lại để review. Không sửa các file Cờ tỷ phú (`TyPhuScreen.tsx`, `TyPhuCell.tsx`, `TyPhuCenter.tsx`, `typhu*.ts`, `server/src/games/typhu.ts`): nhánh `redo/typhu` đang làm phần đó.

## Trạng thái khi bàn giao
- Base: `main` @ `ca94604` (đang chạy trên Render).
- Đã xong (đã commit + test + e2e): `45e8b31`, `c499f67`, `96c54bf`:
  - Bong bóng chat đúng dưới người gửi, không chồng nhau.
  - Phụ kiện avatar (13 loại), biểu cảm theo sự kiện (`portraitUri(character, mood)`, `setMood` trong `app/src/funState.ts`).
  - Trò chọc mới: vẽ bậy, gián, mực, biệt danh, bóp còi, khóc thuê, xin vía; giới hạn tần suất ở server.
  - Câu khịa mới.
- ĐANG DỞ (commit "WIP" cuối cùng; typecheck qua nhưng vitest còn 3 test hỏng trong `server/test/fun.test.ts` về whitelist các trường mới; CHƯA chạy e2e, CHƯA xem giao diện):
  - `KeyboardLift.tsx`, `app/public/index.html` (bàn phím).
  - `app/src/coins.ts` (đồng xu 3D).
  - Các trường mới trong `shared/src/avatars.ts`, `shared/src/types.ts`, `server/src/room.ts`.
  - `e2e/keyboard.mjs`.

## Yêu cầu của chủ dự án (phải đạt hết)
1. **Nối từ trên điện thoại**: khi bấm vào ô nhập, bàn phím phải ĐÈ lên, cả game KHÔNG bị dồn/đẩy lên. Ô nhập vẫn nổi ngay trên bàn phím nhờ VisualViewport, chỉ dịch ô nhập. Có thể dùng `interactive-widget=overlays-content` trong viewport meta. Chiều cao gốc không phụ thuộc cửa sổ bị co. Kiểm tra cả khung chat.
2. **Avatar to hơn**: khoảng 56–64px ở 390×844, nhỏ lại hợp lý ở máy thấp/ngang. Không đẩy nội dung ra khỏi màn hình (Bầu cua vẫn thấy đủ 6 ô không cần cuộn; ô nhập Nối từ vẫn thấy).
3. **Đồng xu Bầu cua**: thay xu "nhựa" bằng xu kim loại 3D.
   - Mặt vàng/bạc có gradient ánh kim, viền nổi, cạnh có vân nhìn thấy được, ký hiệu khắc, điểm sáng, bóng đổ.
   - Chồng xu như thật: lệch/xoay nhẹ từng đồng, bóng dưới chồng. Mỗi người phân biệt bằng vòng màu.
   - Xu bay lật 3D, nảy nhẹ, tiếng "keng". SVG tạo một lần rồi cache.
   - Giữ testID `pile-*`, `mybet-*`.
4. **Bộ tạo nhân vật đầy đủ** (lựa chọn chung cho mọi người, KHÔNG tạo preset mô phỏng người thật cụ thể):
   - Mặt: tròn, oval ngắn đầy, oval, oval dài má đầy, oval pha vuông, trái xoan, mặt bầu, cằm nhọn; hàm mềm/rõ; cằm ngắn bo tròn/nhỏ bo mềm/rộng; má thon/đầy/phính, gò má nhô; trán rộng/vừa; cổ thon/vừa/dày; nếp cười; má hồng trang điểm.
   - Da: ≥6 tông, từ rất sáng tới nâu đậm, gồm sáng ấm, trung bình ấm hơi hồng, nâu vừa ấm. Không ám vàng/hồng quá.
   - Dáng người: gầy/vừa/mũm mĩm; tùy chọn vai rộng cơ bắp.
   - Mắt: hạnh nhân, hạnh nhân hẹp, nhỏ nheo, tròn, híp; một mí/hai mí; độ mở rõ/trĩu/nheo; viền mắt + mi đậm; màu nâu sẫm/đen; hướng nhìn thẳng/trái/phải; cho phép lệch nhẹ tự nhiên.
   - Mày: ngang, cong nhẹ đuôi, cong mềm đầu đầy đuôi thuôn, ngang gấp nhẹ ngoài, lá liễu; mỏng/vừa/rậm.
   - Mũi: sống mũi thấp/vừa/rõ; đầu mũi nhỏ/tròn/tròn đầy; cánh mũi hẹp/vừa/rộng.
   - Môi: mỏng, môi dưới đầy hơn, đầy. Màu hồng nâu tự nhiên, hồng nâu hơi cam, đỏ tươi viền rõ. Miệng khép hơi xuôi, cười lộ răng trên, cười tươi má nhô, hé như đang nói.
   - Chi tiết mặt: nốt ruồi (cạnh môi/má/cằm), tàn nhang, răng thỏ, má lúm.
   - Tóc, các kiểu: đầu đinh, mohican, búi củ hành, xù/afro, mái bằng, đầu nấm, dài ngang lưng, highlight, buộc thấp có tóc con, chải ngược phồng cao + lọn xoăn sau gáy, ngắn hai bên vuốt lệch phồng trước, rất ngắn dựng chỏm.
   - Tóc, chi tiết: ngôi lệch/không ngôi; độ phồng sát/vừa/cao; hai bên cắt gọn/sát; tóc con bật/tắt; màu đen/nâu đen/nâu/highlight.
   - Râu: ria mép, râu dưới môi/cằm, râu dọc đường hàm (bật riêng từng loại, mảnh/vừa, vẽ nét ngắn chứ không mảng đen).
   - Biểu cảm nền: bình thản, cười lộ răng, đang nói. Ngoài ra có tâm trạng theo sự kiện đã làm.
   - Giới tính: Nam, Nữ, Cá tính, LGBT+ (tôn trọng, không biến thành trò đùa). Phụ kiện cầu vồng (ghim, cờ, tóc light cầu vồng, băng đô) cho mọi người.
   - Trang phục: áo thun cổ tròn (chọn màu, có xanh rừng), áo trắng cổ đứng viền bèo + tay bèo nhiều tầng, sơ mi trắng/ngà cổ bẻ mở cúc xắn tay, áo ba lỗ đen khoét chữ U, áo hoa đi biển, đồ bộ, vest bóng, áo dài, đồng phục học sinh, áo mưa.
   - Phụ kiện: bông tai cụm đá/hoa, nhẫn cụm hoa, đồng hồ bạc lớn/tối màu, găng tay nhựa trong.
   - Hình xăm: bên trái/phải; vai hoặc vai + bắp tay; đen xám ám xanh, họa tiết trừu tượng (không chữ/biểu tượng).
   - Đầu nghiêng thẳng/trái/phải. Lưu sẵn trường tư thế (ngồi bắt chéo chân, tay nâng cằm, tay chụm trước ngực) cho chế độ nửa người sau này.
   - 8–10 nhân vật mẫu TỰ SÁNG TÁC chất meme, không theo người thật. Ví dụ "Bà trùm livestream", "Danh hài mặt lầy", "Chị đại chợ", "Thánh ăn", "Ông chú nhậu", "Học sinh trốn học", "Dân chơi phố cổ".
   - Cách dùng: chọn mẫu → áp toàn bộ → chỉnh từng chi tiết. Chia mục thu gọn (Mặt, Da, Mắt & mày, Mũi & miệng, Tóc, Râu, Trang phục, Phụ kiện, Hình xăm). Có nút 🎲 Ngẫu nhiên. Khách ngẫu nhiên phải đa dạng.
   - Không tự làm đẹp (V-line, nâng mũi, to mắt, trắng da). Phụ kiện không che mặt.
   - Kiểm tra bằng bảng ~30 nhân vật ngẫu nhiên + toàn bộ mẫu, CẢ bản đen trắng: phải khác nhau ở dáng mặt, khối tóc, biểu cảm.
   - KHÔNG làm: áo ngực/nội y, phóng đại bộ phận cơ thể, nhân vật giống hay mang tên người thật.
5. Mọi trường mới trong `CharacterConfig` phải tương thích ngược, có whitelist chặt ở server (`server/src/room.ts`) và có test. Payload vẫn nhỏ.

## Ràng buộc kỹ thuật
- Như `docs/HANDOFF-typhu.md` trên nhánh kia: lint React Compiler, phong cách sticker, không secret, không thêm thư viện không cần thiết.
- Chỉ THÊM case mới vào `app/src/sound.ts` (không định dạng lại), vì nhánh kia cũng thêm.

## Kiểm tra bắt buộc trước khi báo xong
1. `cd server && npx tsc --noEmit && npx vitest run && npm run build` (sửa 3 test đang hỏng)
2. `cd app && npx tsc --noEmit && CI=1 EXPO_OFFLINE=1 npx expo lint`
3. Chạy local (server 3999, web 8081 như hướng dẫn bên nhánh Tỷ phú). E2E `play, games, edge, social, v2, keyboard` đều qua.
4. Ảnh chụp 390×844 và 360×640: bàn phím mở ở Nối từ, Bầu cua có xu mới (cận cảnh), dải avatar to, bộ tạo nhân vật, bảng mẫu nhân vật (màu + đen trắng). Tự xem lại và sửa.
5. Báo lại: thay đổi, hash commit, kết quả test, đường dẫn ảnh.
