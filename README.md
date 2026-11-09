# Nối Từ

App nối từ tiếng Việt chơi cùng bạn bè. Phòng tối đa 6 người, vào phòng bằng mã, kho từ hơn 45.000 từ ghép 2 chữ.

```
noi-tu/
  shared/   kiểu dữ liệu + chuẩn hóa tiếng Việt (dùng chung app & server)
  server/   Node.js + Socket.IO — trọng tài của mọi ván chơi
  app/      Expo (React Native) — app điện thoại
  e2e/      test giao diện tự động (3 trình duyệt chơi 1 ván thật)
  docs/     thiết kế
```

## Luật chơi
- Mỗi từ gồm đúng 2 chữ. Chữ đầu của từ mới phải trùng chữ cuối của từ trước.
- Mỗi lượt có 30 giây. Gõ sai thì được gõ lại trong thời gian còn lại. Hết giờ mà chưa nối được thì bị loại.
- Không được dùng lại từ đã dùng trong ván.
- Màn hình hiện số từ còn có thể nối. Nếu số đó là 0, người chơi vẫn phải chờ hết giờ (bị "chặn đường"). Sau đó người kế tiếp nhận một từ mới ngẫu nhiên.
- Người còn lại cuối cùng thắng. Chơi một mình thì tính số từ nối được.
- Gõ dấu kiểu cũ hay kiểu mới đều được (hoà = hòa, thuỷ = thủy), không phân biệt hoa thường.

---

## 1. Chạy thử trên máy tính + điện thoại (cùng Wi-Fi)

Cần Node.js 20 trở lên.

**Server:**
```bash
cd server
npm install
npm run dev            # chạy ở cổng 3000
```

**App:** cài **Expo Go** trên điện thoại, sau đó:
```bash
cd app
npm install
# thay 192.168.1.10 bằng IP máy tính của bạn (ipconfig trên Windows)
set EXPO_PUBLIC_SERVER_URL=http://192.168.1.10:3000     # Windows CMD
# $env:EXPO_PUBLIC_SERVER_URL="http://192.168.1.10:3000"  # PowerShell
npx expo start
```
Quét mã QR bằng Expo Go. Muốn có thêm người chơi thì mở thêm trên điện thoại khác, hoặc nhấn `w` để mở bản web trên máy tính.

> Nếu Windows Firewall hỏi quyền cho Node.js thì chọn **Allow**, không thì điện thoại sẽ không kết nối được tới server.

## 2. Đưa server lên mạng (miễn phí, Render)

1. Đẩy thư mục `noi-tu` lên một repo GitHub.
2. Vào <https://render.com> → **New → Blueprint**, chọn repo đó. Render tự đọc file `render.yaml` và tạo service `noi-tu-server`.
3. Deploy xong sẽ có địa chỉ dạng `https://noi-tu-server.onrender.com`. Mở `/health` trên địa chỉ đó để kiểm tra, kết quả có dạng `{"ok":true,"words":45570,...}`.

Gói miễn phí sẽ "ngủ" sau 15 phút không có ai dùng. Người đầu tiên mở app sẽ phải chờ khoảng 1 phút, app có hiện thông báo trong lúc chờ. Trong lúc đang có người chơi, server không ngủ.

## 3. Build file APK để gửi bạn bè

1. Sửa địa chỉ server trong `app/eas.json` (mục `EXPO_PUBLIC_SERVER_URL`) cho đúng địa chỉ Render của bạn.
2. Build trên cloud của Expo (miễn phí, cần tài khoản expo.dev):
   ```bash
   cd app
   npx eas-cli@latest login
   npx eas-cli@latest build -p android --profile preview
   ```
3. Build xong (khoảng 10–20 phút), Expo sẽ đưa link tải file `.apk`. Gửi link đó cho bạn bè cài. Lúc cài, Android sẽ hỏi cho phép cài từ nguồn không xác định, chọn đồng ý.

## 4. Thêm hoặc bớt từ

- `server/data/extra-words.txt`: thêm từ (mỗi dòng một từ 2 chữ)
- `server/data/banned-words.txt`: loại từ sai hoặc từ không muốn cho dùng

Sửa xong thì khởi động lại server (trên Render: push lên GitHub là tự deploy lại). **Không cần build lại app.**

Muốn tạo lại toàn bộ `words.txt` từ nguồn:
```bash
cd server
npm run build:dict -- Viet74K.txt dictionary.json
```
Nguồn:
- [Viet74K](https://github.com/duyet/vietnamese-wordlist): dựa trên dự án từ điển của Hồ Ngọc Đức, GPL
- [vntk/dictionary](https://github.com/vntk/dictionary): Từ điển tiếng Việt thông dụng

Script chỉ giữ từ đúng 2 chữ, đúng cấu trúc âm tiết tiếng Việt, và bỏ tên riêng.

## 5. Test

```bash
cd server && npm test        # 38 test: chuẩn hóa, từ điển, luật chơi, Socket.IO
cd server && npm run typecheck
cd app && npx tsc --noEmit
```
Test giao diện (`e2e/`): build bản web của app, chạy server, rồi để 3 trình duyệt Chrome tự chơi một ván. Xem đầu các file `e2e/*.mjs` để biết cách chạy.

## Cấu hình server (biến môi trường)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | 3000 | cổng |
| `TURN_SECONDS` | 30 | số giây mỗi lượt |
| `DATA_DIR` | `server/data` | thư mục kho từ |
