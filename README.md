# Xóm Lầy

Ba game chơi cùng bạn bè ngay trên trình duyệt điện thoại: **Nối từ**, **Cờ cá ngựa**, **Bầu cua**. Phòng tối đa 6 người, mời bằng link hoặc mã phòng.

**Chơi ngay: <https://noi-tu-web.onrender.com>**

- Nhập tên → chạm vào game muốn chơi để tạo phòng → **Gửi link mời bạn bè** qua Zalo/Messenger. Bạn bè bấm link là vào thẳng phòng.
- Chủ phòng đổi game được ngay trong phòng chờ hoặc sau mỗi ván.
- Chạm vào avatar bạn bè để **ném** 🩴🍅🥚💩🌹💖 hoặc **hối** (rung máy họ). Nút 💬 để khịa cả phòng.
- Cài như app: Android (Chrome) → menu ⋮ → **Thêm vào màn hình chính**. iPhone (Safari) → nút Chia sẻ → **Thêm vào MH chính**.
- Lần đầu mở sau một lúc không ai chơi, server miễn phí cần khoảng 1 phút để thức dậy.

```
noi-tu/
  shared/   kiểu dữ liệu + chuẩn hóa tiếng Việt (dùng chung app & server)
  server/   Node.js + Socket.IO, trọng tài của mọi ván chơi
    src/games/   wordchain.ts, ludo.ts, baucua.ts (luật từng game)
  app/      giao diện (React Native Web qua Expo), xuất ra trang web cho điện thoại
  e2e/      test giao diện tự động (nhiều trình duyệt chơi thật với nhau)
  docs/     thiết kế
```

## Luật chơi

**Nối từ** (1–6 người)
- Mỗi từ gồm đúng 2 chữ. Chữ đầu của từ mới phải trùng chữ cuối của từ trước. Không dùng lại từ đã dùng.
- Mỗi lượt 30 giây, gõ sai được gõ lại. Hết giờ thì bị loại; người còn lại cuối cùng thắng.
- Màn hình hiện số từ còn nối được. Mỗi người có 1 quyền **Cứu trợ** xem gợi ý.
- Gõ dấu kiểu cũ hay mới đều được (hoà = hòa, thuỷ = thủy).

**Cờ cá ngựa** (2–4 người, chọn 2 hoặc 4 ngựa)
- Đổ 1 hoặc 6 mới được ra quân. Đổ 6 được đổ thêm; 3 lần 6 liên tiếp thì mất lượt.
- Không được đi qua đầu ngựa khác. Dừng đúng ô ngựa đối thủ là đá về chuồng.
- Về đích phải đổ vừa đủ. Ai đưa hết ngựa về đích trước thì thắng. Hết giờ (15 giây) thì máy tự đi thay.

**Bầu cua** (1–6 người, xu ảo)
- Mỗi người 1.000 xu. Chọn chip rồi chạm vào con vật để đặt cược trong 20 giây; chủ phòng bấm **Lắc!** để lắc sớm.
- Mở bát 3 con: trúng mấy con ăn gấp bấy nhiêu lần tiền cược, trượt thì mất.
- Cháy túi thì **vay nóng** 500 xu (bị ghi nợ). Chủ phòng bấm **Tổng kết** để xếp hạng theo xu trừ nợ.

---

## 1. Chạy thử trên máy tính

Cần Node.js 20 trở lên. Mở 2 cửa sổ terminal:

```bash
cd server && npm install && npm run dev          # server ở cổng 3000
cd app && npm install && npx expo start --web    # mở giao diện trên trình duyệt
```
Muốn thử trên điện thoại cùng Wi-Fi: chạy app với `EXPO_PUBLIC_SERVER_URL=http://<IP máy tính>:3000`, rồi mở `http://<IP máy tính>:8081` trên điện thoại.

## Đang chạy
- Web: <https://noi-tu-web.onrender.com>
- Server: <https://noi-tu-server.onrender.com> (kiểm tra: `/health`)
- Cả hai được tạo từ `render.yaml`. Sửa code xong, push lên GitHub rồi vào Render bấm **Manual Deploy** cho service tương ứng.

## 2. Đưa server lên mạng (miễn phí, Render)

1. Đẩy thư mục `noi-tu` lên một repo GitHub.
2. Vào <https://render.com> → **New → Blueprint**, chọn repo đó. Render tự đọc file `render.yaml` và tạo service `noi-tu-server`. (Repo public có thể dán thẳng link vào mục *Public Git Repository*; khi đó sửa code xong phải vào Render bấm **Manual Deploy**.)
3. Deploy xong sẽ có địa chỉ dạng `https://noi-tu-server.onrender.com`. Mở `/health` trên địa chỉ đó để kiểm tra, kết quả có dạng `{"ok":true,"words":45570,...}`.

Gói miễn phí sẽ "ngủ" sau 15 phút không có ai dùng. Người đầu tiên mở app sẽ phải chờ khoảng 1 phút, app có hiện thông báo trong lúc chờ. Trong lúc đang có người chơi, server không ngủ.

## 3. Thêm hoặc bớt từ

- `server/data/extra-words.txt`: thêm từ (mỗi dòng một từ 2 chữ)
- `server/data/banned-words.txt`: loại từ sai hoặc từ không muốn cho dùng

Sửa xong thì khởi động lại server (trên Render: push lên GitHub rồi bấm Manual Deploy cho `noi-tu-server`). **Không cần build lại app.**

Muốn tạo lại toàn bộ `words.txt` từ nguồn:
```bash
cd server
npm run build:dict -- Viet74K.txt dictionary.json
```
Nguồn:
- [Viet74K](https://github.com/duyet/vietnamese-wordlist): dựa trên dự án từ điển của Hồ Ngọc Đức, GPL
- [vntk/dictionary](https://github.com/vntk/dictionary): Từ điển tiếng Việt thông dụng

Script chỉ giữ từ đúng 2 chữ, đúng cấu trúc âm tiết tiếng Việt, và bỏ tên riêng.

## 4. Test

```bash
cd server && npm test        # 66 test: chuẩn hóa, từ điển, luật 3 game, phòng, Socket.IO
cd server && npm run typecheck
cd app && npx tsc --noEmit && npx expo lint
```
Test giao diện (`e2e/`): build bản web của app, chạy server, rồi để nhiều trình duyệt Chrome (khung điện thoại) tự chơi với nhau: `play.mjs` (Nối từ), `edge.mjs` (tình huống đặc biệt), `games.mjs` (Cờ cá ngựa, Bầu cua, ném/khịa/hối). Xem đầu file `play.mjs` để biết cách chạy.

## Cấu hình server (biến môi trường)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | 3000 | cổng |
| `TURN_SECONDS` | (theo từng game) | ép số giây mỗi lượt cho mọi game, dùng khi test |
| `DATA_DIR` | `server/data` | thư mục kho từ |

> Không bắt buộc: muốn đóng gói thành file APK thì `app/eas.json` đã có sẵn cấu hình (`npx eas-cli build -p android --profile preview`).
