# App Nối Từ — Thiết kế

Ngày: 2026-11-09

## Mục tiêu
App điện thoại chơi nối từ tiếng Việt với bạn bè (1–6 người/phòng: chủ phòng + tối đa 5 người mời).
Lý do: các game hiện có thiếu từ → cần kho từ lớn, có thể tự bổ sung.

## Quyết định đã chốt
- Kiểu chơi: tiếng Việt, từ ghép đúng 2 chữ; chữ đầu của từ mới = chữ cuối của từ trước. (Tiếng Anh để sau — code tách phần luật/từ điển theo ngôn ngữ để dễ thêm.)
- Kiểm tra từ: chỉ dùng từ điển (không bỏ phiếu).
- Vào phòng: mã phòng 6 ký tự, không đăng nhập, chỉ nhập tên.
- Mỗi lượt 30 giây. Gõ sai được gõ lại trong thời gian còn lại. Hết 30 giây chưa có từ đúng → bị loại.
- Người cuối cùng còn lại thắng. Chơi 1 mình: chơi tới khi bị loại, tính số từ nối được.
- Màn hình chơi hiện số từ còn nối được (bắt đầu bằng chữ cuối, chưa dùng trong ván). Khi số này là 0 vẫn chờ đủ 30 giây mới loại.
- Ngõ cụt: sau khi loại người gặp ngõ cụt, server đổi sang một từ ngẫu nhiên mới (có thể nối tiếp) cho người kế tiếp.
- Công nghệ: Expo (React Native, TypeScript) + server Node.js + Socket.IO, server là trọng tài duy nhất.

## Kiến trúc
```
noi-tu/
  shared/   kiểu dữ liệu + tên sự kiện dùng chung
  server/   Node + Socket.IO
  app/      Expo
```

### Server
| Khối | Trách nhiệm |
|---|---|
| `rules` | chuẩn hóa từ (NFC, chữ thường, gộp khoảng trắng, đưa dấu kiểu cũ/mới về một dạng), tách chữ, kiểm tra nối |
| `dictionary` | nạp kho từ; `has(word)`; `countNext(syllable, used)`; `randomStart(used)` |
| `room` | máy trạng thái lobby → playing → finished; người chơi, lượt, từ đã dùng, hạn chót lượt |
| `roomManager` | tạo mã phòng, tìm phòng, dọn phòng trống |
| `socket` | ánh xạ sự kiện ↔ hành động của room, phát `room:state` |

Phòng lưu trong bộ nhớ, không có database.

### Sự kiện
App → server (đều dùng ack callback `{ ok, error? , ... }`):
- `room:create { name, playerId? }` → `{ ok, code, playerId }`
- `room:join { code, name, playerId? }` → `{ ok, code, playerId }` (playerId cũ + phòng còn → vào lại đúng chỗ)
- `game:start`, `word:submit { word }`, `game:restart`, `room:leave`

Server → app:
- `room:state` — toàn bộ trạng thái phòng (đã lọc cho client), gửi mỗi khi thay đổi
- Từ bị từ chối được báo qua ack của `word:submit` (chỉ người gửi nhận), kèm lý do
- Lịch sử ván lưu kèm tên người chơi để vẫn hiển thị đúng sau khi họ rời phòng

### Trình tự ván
1. Chủ phòng bấm Bắt đầu → xáo thứ tự, chọn từ mở đầu ngẫu nhiên có thể nối tiếp.
2. Mỗi lượt: hạn chót = now + 30s (gửi `turnEndsAt` và `serverNow` để app tự bù lệch giờ).
3. Gửi từ: chuẩn hóa → đúng 2 chữ → chữ đầu khớp → chưa dùng → có trong từ điển.
   - Hợp lệ: thêm vào chuỗi, chuyển lượt, đặt lại 30s.
   - Không hợp lệ: `word:rejected`, đồng hồ chạy tiếp.
4. Hết giờ: loại; nếu từ hiện tại hết đường nối → đổi từ mới ngẫu nhiên; người kế tiếp 30s mới.
5. Còn 1 người (hoặc 0 khi chơi 1 mình) → finished. Chơi lại → về lobby, giữ người chơi.

### Tình huống đặc biệt
- Rớt mạng giữa ván: giữ chỗ; đồng hồ vẫn chạy; app lưu `playerId` và tự vào lại.
- Rớt mạng ở lobby/finished: xóa sau 30s nếu không quay lại.
- Chủ phòng thoát → chuyển cho người kế tiếp.
- Vào phòng đang chơi → từ chối. Phòng đầy (6) → từ chối.
- Trùng tên → thêm số ("Phước 2").
- Phòng không còn ai kết nối → xóa sau 60s.

## Kho từ
Script `server/scripts/build-dictionary.ts` gộp:
- Viet74K (duyet/vietnamese-wordlist, từ dự án FVDP của Hồ Ngọc Đức, GPL)
- vntk/dictionary (Từ điển tiếng Việt thông dụng)

Chỉ giữ mục đúng 2 chữ, toàn chữ cái tiếng Việt, viết thường (bỏ tên riêng), chuẩn hóa dấu, khử trùng → `server/data/words.txt`.
Thêm `server/data/extra-words.txt` và `server/data/banned-words.txt` để sửa tay; nạp lúc server khởi động.

## Xử lý lỗi
- Server kiểm tra mọi sự kiện (đúng dạng, đúng lượt, quyền chủ phòng); sai → ack lỗi.
- Từ đến sau hạn chót → tính hết giờ.
- App: banner "Đang kết nối lại…"; trang chủ hiện "Đang khởi động server…" khi server ngủ; phòng không còn → về trang chủ.

## Kiểm thử
- Vitest unit: rules, dictionary, room (fake timers).
- Integration: server thật + 3 `socket.io-client`.
- E2E giao diện: bản web của app + Chrome headless, nhiều người chơi một ván thật.
- Script kho từ tự kiểm tra.

## Phát hành
- Server: Docker / Render (render.yaml).
- App: APK qua EAS Build (`eas.json` profile `preview`), địa chỉ server qua `EXPO_PUBLIC_SERVER_URL`.
