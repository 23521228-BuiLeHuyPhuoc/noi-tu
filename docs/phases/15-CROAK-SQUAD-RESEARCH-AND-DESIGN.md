# Phase 15 — Nghiên Cứu Chuyên Sâu & Thiết Kế Game Co-op Vượt Màn `Đầm Lầy Quái Chiêu` (Lấy Cảm Hứng Từ *Croak Squad*)

> Tài liệu thực hiện đúng Bước 1 trong yêu cầu: nghiên cứu thực tế trò chơi gốc (*Croak Squad* — Steam App ID `3675400`), phân tích cơ chế điều khiển, vật lý, mạng, thiết kế màn chơi và tách bạch rõ **Thông tin đã kiểm chứng** với **Ý tưởng thiết kế cải tiến** trước khi lập trình.

---

## 1. Kết Quả Nghiên Cứu Trò Chơi Tham Khảo (*Croak Squad* — Steam `3675400`)

### 1.1. Thông tin đã kiểm chứng (Verified Facts)
- **Định danh & Quy mô**: *Croak Squad* (tên gốc trên Steam: *捣蛋蛙（Croak Squad）*, nhà phát triển BonkersLab, phát hành tháng 01/2026) là game co-op vượt chướng ngại vật trực tuyến và nội bộ dành cho **2–6 người chơi** (tối ưu ở nhóm 4–6 người).
- **Cơ chế trung tâm (Core Loop)**: Người chơi điều khiển những chú ếch đầy màu sắc, sử dụng chiếc lưỡi co giãn để **nuốt đồng đội vào bụng** rồi **nhổ/bắn họ bay theo quỹ đạo vòng cung (parabolic arc)** như những "viên đạn sống" qua vực sâu, lên bệ cao hoặc vượt bẫy chông để cả đội tới đích.
- **Điểm làm người chơi thích thú (từ mô tả & phản hồi cộng đồng Steam)**:
  - Tạo tiếng cười sảng khoái kiểu "tình anh em sứt mẻ" khi lỡ tay bắn bạn thẳng xuống hố hoặc phối hợp chuyền nhau trên không.
  - Bản sắc rõ nét: không dựa vào kỹ năng nhảy đơn lẻ thông thường mà buộc người chơi phải dùng chính cơ thể đồng đội làm công cụ mở đường.
- **Điểm gây ức chế thực tế khiến game gốc bị đánh giá trái chiều (~25% tích cực trên Steam)**:
  1. **Độ khó tăng đột ngột và đòi hỏi căn góc mù**: Thiếu đường ngắm trực quan khiến người chơi bắn trượt liên tục ở các màn sau, một người sai làm cả đội phải đi lại từ đầu.
  2. **Cảm giác điều khiển và đồng bộ mạng thiếu ổn định**: Độ trễ hoặc sai lệch va chạm vật lý giữa các máy dễ biến pha phối hợp vui nhộn thành ức chế vô lý; góc máy đôi khi làm khuất nhân vật.

### 1.2. Ý tưởng & giải pháp cải tiến của chúng tôi cho **Đầm Lầy Quái Chiêu (`croaksquad`)** (Proposed Design Improvements)
1. **Đường ngắm quỹ đạo chấm bi thời gian thực (Live Trajectory Arc Preview)**: Khi đang ngậm đồng đội trong bụng và giữ/chỉnh góc bắn, hệ thống vẽ sẵn đường cong vật lý (tính từ cùng hàm trọng lực của server) để người chơi học và căn lực chuẩn xác thay vì đoán mò.
2. **Cảm giác điều khiển nhạy (Coyote Time 110ms + Jump Buffer 100ms)**: Cho phép nhảy mượt ngay sát mép bục, tốc độ di chuyển ngang có gia tốc/ma sát dứt khoát.
3. **Checkpoint dày & Hồi sinh Bong Bóng 1,5 giây**: Rơi xuống đầm độc hoặc chạm gai sẽ nổ bọt hài hước và hồi sinh nhanh tại **Checkpoint gần nhất mà đội đã kích hoạt** (không bắt cả phòng chơi lại từ vạch xuất phát). Nếu người đang ngậm đồng đội bị chết hoặc mất kết nối, đồng đội bên trong lập tức **bật tung lên không trung an toàn** thay vì kẹt chết chung.
4. **Cân bằng động theo sĩ số kết nối thực tế (`2..6` người)**: Nút bấm đá, cổng khóa và vạch đích tự động tính theo số người đang online thực tế (`activeConnectedPlayers`), đảm bảo nếu đang chơi 4 người mà 1 người rớt mạng giữa màn thì 3 người còn lại vẫn qua màn trọn vẹn, không bao giờ bị khóa cứng (soft-lock).
5. **Phong cách hình ảnh & tên gọi riêng 100%**: Đặt tên **`Đầm Lầy Quái Chiêu`** (mã engine `croaksquad`), tự vẽ mới hoàn toàn bộ nhân vật **Ếch Xóm Lầy** bằng vector/canvas riêng: má phồng to tròn xoe khi ngậm bạn, mắt lồi biểu cảm theo trạng thái, lưỡi hồng co giãn, bệ đá rêu xanh, nấm nhún lò xo tím, bùn độc sủi bọt và cổng Lá Sen Vàng.

---

## 2. Máy Trạng Thái Nhân Vật & Xử Lý Tình Huống Biên

### 2.1. 6 Trạng thái rõ ràng của mỗi chú ếch
1. `normal`: Tự do chạy, nhảy, đạp công tắc, phóng lưỡi.
2. `tongue`: Phóng lưỡi dài `110px` trong `180ms` theo hướng nhìn/góc ngắm để bắt đồng đội gần nhất đang ở trạng thái `normal` hoặc `launched`.
3. `carrying`: Đang ngậm 1 đồng đội trong bụng (`bellyId !== null`). Má/bụng phồng to gấp 1,35 lần, di chuyển chậm hơn 15% (nặng bụng!), hiện mũi tên & đường cong quỹ đạo ngắm bắn (`aimAngle`, `aimPower`), tự nhả nhẹ sau `10s` nếu giữ quá lâu để chống troll nhốt bạn mãi mãi.
4. `swallowed`: Đang nằm gọn trong bụng của `carrierId`. Tọa độ khóa theo người ngậm; hiển thị bong bóng nhỏ trên đầu người ngậm; có thể bấm `Nhảy` liên tục để giãy giụa thoát ra sớm (chống bị đồng đội giam lỏng!).
5. `launched`: Vừa được nhả/bắn ra khỏi miệng đồng đội với vận tốc lớn `(vx, vy)` theo góc ngắm + lực nạp; có vệt khói sao hài hước, có thể bay vượt vực rộng hoặc lên tầng cao gấp 2,5 lần cú nhảy thường.
6. `dead` → `respawning`: Chạm gai/nước độc hoặc rơi khỏi đáy bản đồ → hiện biểu cảm choáng váng `1,4s` rồi bung bong bóng xuất hiện lại tại Checkpoint hiện tại của đội.
7. `finished`: Đã chạm Cổng Lá Sen Vàng (vẫn có thể đi lại quanh đích đón bạn; khi tất cả người chơi đang kết nối cùng đứng trong vùng đích hoặc chạm cổng đích thì hoàn thành màn!).

### 2.2. Ma trận tình huống biên bắt buộc xử lý
- **Hai người cùng phóng lưỡi nuốt nhau trong cùng 1 tick**: Server xử lý tuần tự theo thứ tự định sẵn trong mảng `players` nhưng kiểm tra `target.state === 'normal' && target.bellyId === null`; người khớp trước nuốt thành công, cú lưỡi của người kia tự thu về an toàn (không bao giờ xảy ra chu trình A ngậm B đồng thời B ngậm A).
- **Nhả/bắn đồng đội ngay sát tường đặc**: Điểm xuất phát khi bắn được kiểm tra va chạm hộp AABB với mọi khối tường; nếu phía trước mặt sát tường thì tự lùi tâm xuất phát về tâm người bắn và bật nảy nhẹ thay vì xuyên vào trong lòng tường.
- **Người đang ngậm đồng đội bị chết / rơi vực / thoát phòng / mất kết nối**: Hàm `releaseBellySafely(carrier, upwardBoost)` lập tức giải phóng người bị ngậm với xung lực nhảy lên `(vy = -420)` ngay tại vị trí an toàn trước khi xử lý cái chết/rời phòng của người ngậm.
- **Chuỗi chuyền trên không (Relay)**: Ếch C ở bệ giữa có thể phóng lưỡi bắt Ếch B đang ở trạng thái `launched` bay ngang qua rồi bắn tiếp lên bệ đỉnh!

---

## 3. Kiến Trúc Đồng Bộ Mạng Multiplayer Thật (2–6 Người, Không Bot Giả)

- **Chính sách không dùng Bot thay người thật**: `Room.addBot` từ chối thẳng với mã lỗi khi `gameType === 'croaksquad'`, và `GAME_INFO.croaksquad = { name: 'Đầm Lầy Quái Chiêu', min: 2, max: 6 }`. Mọi ván chơi đều là 2–6 kết nối Socket.IO thật.
- **Mô hình Server-Authoritative Fixed-Timestep (`30Hz` = `33.33ms/tick`)**:
  - Mỗi client gửi ý định điều khiển (`cs_input`: `{ seq, moveX, jump, tongue, spit, aimAngle, aimPower }`) qua Socket.
  - Server chạy duy nhất một vòng mô phỏng vật lý tất định `stepCroakWorld(world, dt)` từ `shared/src/croaksquad.ts`, tính toán va chạm địa hình, bệ di động, công tắc, chìa khóa, cửa chắn, nuốt/nhả và đích đến.
  - Nhờ chỉ có một nguồn sự thật vật lý trên server, **không bao giờ xảy ra tình trạng máy A thấy cửa đã mở hay đã bắt được bạn còn máy B thấy rơi xuống vực**.
  - Để tránh nghẽn băng thông khi phát 30 lần/giây: Server phát gói nhẹ `'croak:tick'` (chỉ chứa tọa độ làm tròn 1 chữ số thập phân, vận tốc, trạng thái ếch, công tắc, cửa, checkpoint) tới phòng, trong khi client nội suy mượt `60fps` trên `requestAnimationFrame` và dùng chung hàm quỹ đạo `computeSpitArc` để vẽ đường ngắm tức thì 0ms độ trễ.

---

## 4. Thiết Kế 3 Màn Chơi Có Chủ Đích (Campaign 3 Stages)

1. **Màn 1 — Bờ Đầm Nhập Môn (Dạy cơ chế & mở cầu cho bạn)**:
   - Bậc thềm đầu dạy nhảy cơ bản → gặp **Hố Bùn Rộng** không thể tự nhảy qua → Người A nuốt Người B và ngắm bắn qua bờ bên kia (hoặc lên **Bệ Đá Cao**) nơi có **Công Tắc Đá Đỏ** → B giẫm công tắc làm **Cầu Gỗ** bắc ngang cho A đi qua → kích hoạt **Checkpoint #1** → phối hợp nhảy qua **Nấm Nhún Tím** tới **Cổng Lá Sen Đích**.
2. **Màn 2 — Thác Đá Chuyền Cành (Phối hợp 2 tầng & Cửa Đôi)**:
   - Cửa chắn lớn khóa đường chính, chìa khóa vàng nằm trên mỏm đá cao có gai chắn dưới chân → A bắn B lên mỏm đá lấy **Chìa Khóa Đầm Lầy** → qua Checkpoint #1 → gặp khu vực **Bệ Trượt Ngang + Hố Độc Dài** yêu cầu chuyền tiếp sức từ bệ giữa để mở công tắc giữ cửa cho đồng đội vượt qua.
3. **Màn 3 — Đền Cổ Xóm Lầy (Tổng hợp kỹ năng & Căn nhịp bẫy động)**:
   - Kết hợp bệ đá di chuyển ngược chiều, nấm đại lực, 2 công tắc mở cổng tháp cổ và pha bắn vượt tường chắn cao đòi hỏi ngắm góc `55°–70°` chính xác nhờ đường dẫn quỹ đạo trước khi cả đội hội tụ trên Đài Sen Vàng chiến thắng!
