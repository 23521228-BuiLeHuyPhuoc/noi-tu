# Nút "Chọc loạn xạ" cho admin (thiết kế ngắn)

## Mục đích
Chủ dự án (tài khoản admin, hiện là `phuoc_2005`) muốn có một nút bấm là chọc ngẫu nhiên tất cả mọi người trong phòng cùng lúc, cho vui. Bấm liên tục được, mỗi lần tốn Ruby, và không làm vướng ván chơi của chính mình.

## Mục tiêu
- Chỉ tài khoản quản trị dùng được: tên đăng nhập nằm trong `ADMIN_USERNAMES` (cơ chế có sẵn ở `server/src/admin.ts`, app biết qua `user.admin`). Người khác không thấy nút, server cũng từ chối lệnh.
- Mỗi lần bấm, mọi người khác trong phòng đang kết nối dính một món ngẫu nhiên trong kho chọc ghẹo (`shared/src/pokes.ts`). Món của mỗi người bốc riêng.
- Trừ Ruby một lần cho mỗi lần bấm, giá cố định 💎20 (`CHAOS_POKE_RUBY` trong `shared/src/shop.ts`). Không đủ Ruby thì không chọc.
- Bấm là chọc ngay, không có bảng xác nhận.

## Không làm
- Không có nút cho người thường, không bán trong cửa hàng.
- Không có bảng chọn món: món nào là do server bốc ngẫu nhiên.

## Điều phải tránh
- Phá trải nghiệm người bị chọc: vẫn giữ giới hạn mỗi người chỉ bị phủ màn hình 3 lần / 15 giây. Ai đã chạm giới hạn thì vẫn bị chọc, nhưng server bốc lại một món nhẹ (chỉ bay vào avatar) và đánh dấu `soft`, nên màn hình họ không rung.
- Làm nghẽn phòng: server chỉ nhận tối đa khoảng 3 lần bấm mỗi giây từ một máy. Phía app, mỗi máy giữ tối đa 8 cảnh hiệu ứng như hiện nay.
- Spam thông báo: người đứng xem không nhận thông báo cho từng món của lần chọc loạn xạ. Chỉ người bị chọc thấy dòng thông báo của mình.
- Trừ Ruby khi không chọc được ai: phòng không có ai khác đang kết nối thì từ chối và không trừ.

## Các cách đã cân nhắc (chỗ đặt nút)
1. Bong bóng nổi kéo được: có ở mọi màn, nhưng phải làm thêm phần kéo thả.
2. **Icon trên thanh trên (đã chọn)**: không bao giờ đè lên bàn chơi. Để không bấm nhầm 🚪, icon 🌪️ đặt ngay sau tên trò chơi, trước ✏️, xa nút rời phòng.
3. Cố định ở một góc: nhanh nhất, nhưng che ô nhập của Nối từ và ô cược của Bầu cua.

Tỷ phú không có thanh trên (bàn cờ chiếm cả màn hình), nên 🌪️ nằm trong hàng nút nhỏ của bàn, ngay sau 😈.

## Cách làm
- **Server** (`server/src/socket.ts`, phần chọn món tách ra hàm thuần trong `server/src/fun.ts` để test):
  - Thêm lệnh socket mới `fun:chaos`, có trả lời (ack).
  - Kiểm tra theo thứ tự: đã đăng nhập và là admin → đang ở trong phòng → còn giới hạn tốc độ → có ít nhất một người khác đang kết nối → đủ Ruby. Sau đó trừ Ruby bằng `chargeRuby(..., 'skill', 'chaos')`.
  - Với mỗi người bị chọc: bốc món. Nếu người đó đang chạm giới hạn và món phủ màn hình thì bốc lại món nhẹ. Áp giới hạn và bù giờ lượt Nối từ giống `fun:send`, rồi phát `fun:event` kiểu `poke`, có thêm `chaos: true`.
  - Lỗi trả về: `forbidden`, `empty`, `need_ruby`, `busy`.
- **Kiểu dữ liệu chung** (`shared/src/types.ts`): thêm `'fun:chaos'` vào `ClientToServerEvents`, thêm `chaos?: boolean` vào `FunEvent`, thêm kiểu trả lời `ChaosAck`.
- **App**:
  - `useGame` có thêm `sendChaos()`.
  - `Shell` hiện `IconButton` 🌪️ khi `game.user?.admin`, đồng thời đưa `chaos` vào `ShellTools` để `TyPhuCenter` vẽ `MiniBtn` (đếm vào `toolCount`).
  - Bấm thành công: chữ "-💎20" bay lên từ icon rồi mờ dần. Thất bại: một dòng thông báo (hết Ruby / phòng trống / bấm chậm lại).
- **Hiệu ứng** (`PokeLayer`): với sự kiện `chaos`, chỉ người bị chọc mới nhận dòng thông báo. Người đứng xem chỉ nghe tiếng tối đa một lần mỗi 300 ms.
- **Test**: thêm vào bộ vitest của server: người thường bị từ chối; admin bị trừ đúng một lần và mọi người khác nhận sự kiện; phòng trống không trừ Ruby; người đã chạm giới hạn nhận món nhẹ.

## Để người làm tự quyết
Tên `testID`, cách vẽ chữ "-💎20", và chữ trong các dòng thông báo lỗi.
