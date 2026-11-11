# Xóm Lầy

Game chơi cùng bạn bè ngay trên trình duyệt điện thoại: **Nối từ**, **Nối từ Anh**, **Bầu cua**, **Cờ tỷ phú**. Phòng tối đa 6 người, mời bằng link hoặc mã phòng.

**Chơi ngay: <https://noi-tu-web.onrender.com>**

- Nhập tên (chơi khách) hoặc **tạo tài khoản** để giữ tên, mặt đại diện và thành tích các ván đã chơi.
- **Đổi tên, mặt đại diện, tải ảnh của mình ở bất cứ đâu**: trang chủ (chạm vào ảnh cạnh ô tên), phòng chờ hay giữa ván (nút ✏️ trên thanh trên, hoặc chạm vào avatar của chính mình). Khách cũng tải ảnh được. Tên hiện đầy đủ dưới avatar, dài thì xuống dòng.
- Chạm vào game muốn chơi để tạo phòng → **Gửi link mời bạn bè** qua Zalo/Messenger. Bạn bè bấm link là vào thẳng phòng.
- Chủ phòng đổi game được ngay trong phòng chờ hoặc sau mỗi ván.
- Nút 💬: **trò chuyện**, thả emoji bay lên, câu khịa có sẵn và 9 mẫu sticker Quỳnh Aka. Tin nhắn hiện thành bong bóng dưới avatar người gửi.
- Chạm vào avatar bạn bè để **đánh nhau** (tát 🖐️, đấm 👊, đá 🦶, chưởng 🌀; máu ảo, K.O. thì hồi đầy, không ảnh hưởng ván chơi), **ném** 🩴🍅🥚💩🌹💖 hoặc **hối** (rung máy họ).
- Các chiêu làm rung/xoay/che màn hình (động đất, xoay màn hình, sụp nguồn, gián, mực, hối) **mỗi người chỉ dính tối đa 3 lần trong 15 giây**; đánh/ném quá giới hạn vẫn bay tới avatar nhưng không rung màn hình. Bị chọc đúng lúc đang tới lượt Nối từ thì **được bù lại thời gian** (sụp nguồn +4,5s, xoay +3,5s…, tối đa 15s mỗi lượt).
- Cài như app: Android (Chrome) → menu ⋮ → **Thêm vào màn hình chính**. iPhone (Safari) → nút Chia sẻ → **Thêm vào MH chính**.
- Lần đầu mở sau một lúc không ai chơi, server miễn phí cần khoảng 1 phút để thức dậy.

```
noi-tu/
  shared/   kiểu dữ liệu + chuẩn hóa tiếng Việt & tiếng Anh (dùng chung app & server)
  server/   Node.js + Socket.IO, trọng tài của mọi ván chơi
    src/games/   wordchain.ts, baucua.ts, typhu.ts (luật từng game)
  app/      giao diện (React Native Web qua Expo), xuất ra trang web cho điện thoại
  e2e/      test giao diện tự động (nhiều trình duyệt chơi thật với nhau)
  docs/     thiết kế
```

## Luật chơi

**Nối từ** (1–6 người)
- Mỗi từ gồm đúng 2 chữ. Chữ đầu của từ mới phải trùng chữ cuối của từ trước. Không dùng lại từ đã dùng.
- Chữ đầu được điền sẵn và khóa lại, chỉ cần gõ chữ thứ hai.
- Mỗi lượt 30 giây, gõ sai được gõ lại. Hết giờ thì bị loại; người còn lại cuối cùng thắng.
- Màn hình hiện số từ còn nối được. Mỗi người có 1 quyền **Cứu trợ**: bấm là server nối hộ luôn một từ hợp lệ (không cần điền rồi bấm Gửi).
- Từ có nghĩa mà kho từ chưa có: bấm **Xin cả phòng duyệt** (mỗi lượt 1 lần). Đồng hồ tạm dừng 12 giây cho mọi người bỏ phiếu; đồng ý nhiều hơn phản đối thì từ được tính, thêm vào kho từ và lưu vào CSDL cho các ván sau.
- Kho từ ~79.600 từ 2 chữ, gộp từ 13 nguồn (từ điển Việt–Việt, Việt–Anh, Wiktionary, lời giải nghĩa Anh–Việt, lượng từ + danh từ như "cái bàn", "quả cam"). Xem `server/scripts/build-dictionary.ts`.
- Có 25.976 giải nghĩa kèm nguồn; từ chưa có định nghĩa hiện **Chưa có giải nghĩa**.
- Gõ dấu kiểu cũ hay mới đều được (hoà = hòa, thuỷ = thủy).

**Nối từ Anh** (1–6 người)
- Mỗi từ là 1 từ đơn tiếng Anh (`a–z`, tối thiểu 2 ký tự). Chữ cái đầu của từ mới phải trùng chữ cái cuối của từ trước (ví dụ: `art` → `tits` → `sex`). Không dùng lại từ đã dùng.
- Chữ cái đầu được điền sẵn và khóa lại, người chơi chỉ cần gõ phần còn lại của từ (hoặc gõ cả từ cũng được). Gạch nối được bỏ qua (`x-ray` = `xray`).
- Quên tắt bộ gõ tiếng Việt cũng không sao: Telex biến `xmas` thành `xmá`, `box` thành `bõ`… server tự dịch ngược; nếu không đoán ra thì nhắc tắt bộ gõ.
- **Thời gian mỗi lượt giảm dần theo từng người**: 30 giây lúc đầu, mỗi từ tự nối đúng bớt 0,5 giây, tới 30 từ thì còn 15 giây và giữ ở đó.
- **Cứu trợ**: 1 lần mỗi ván, cứ mỗi 30 từ tự nối đúng được thêm 1 lần; bấm là nối hộ luôn (từ nhờ cứu trợ không tính vào số từ tự nối đúng).
- **Xin cả phòng duyệt** và **chú thích nghĩa tiếng Việt theo từ loại + phiên âm IPA** giống game Nối từ tiếng Việt; dạng biến đổi ghi rõ gốc (`took` → "quá khứ của take").
- Kho từ **210.987 từ tiếng Anh** chỉ lấy từ nguồn uy tín: **SCOWL** (bộ từ của aspell/hunspell), **ENABLE1**, **WordNet**, **Wiktionary tiếng Việt** và **Từ điển Anh–Việt FVDP** (Hồ Ngọc Đức); bỏ tên riêng và viết tắt. **130.549 mục giải nghĩa** (khoảng 98% từ thông dụng). Chi tiết: `server/data/DEFINITIONS-SOURCES.md`, cách dựng lại: `server/scripts/build-en-dictionary.py`.

**Bầu cua** (1–6 người, xu ảo)
- Mỗi người 1.000 xu. Chọn chip rồi chạm vào con vật để đặt cược trong 20 giây. Tiền của mọi người vun thành chồng xu trên từng ô (mỗi người một màu). Hết giờ **máy tự lắc**, không ai lắc tay.
- Bát úp ngay trên bàn khi lắc, rồi mở ra để lộ 3 con. Con nào trúng ô mình đặt thì bay vào ô đó và ô sáng lên; trật hết thì… mưa rơi. Trúng mấy con ăn gấp bấy nhiêu lần tiền cược, trượt thì mất.
- Cháy túi thì **vay nóng** 500 xu (bị ghi nợ). Chủ phòng bấm **Tổng kết** để xếp hạng theo xu trừ nợ.

**Cờ tỷ phú** (2–6 người)
- Bàn 40 ô, đất là các tỉnh thành, chia 8 bộ màu, cùng các ga và công ty tiện ích. Mỗi người 1.500 xu.
- Đổ 2 xúc xắc, quân di chuyển từng bước trên bàn. Dừng ở đất trống thì mua hoặc bỏ qua; dừng ở đất người khác thì trả tiền thuê (gấp đôi nếu họ có đủ bộ màu).
- Có đủ bộ màu thì chạm vào ô đất để xây nhà (tối đa 3 nhà + khách sạn), tiền thuê tăng mạnh.
- Ga tính tiền thuê theo số ga sở hữu; tiện ích tính theo tổng xúc xắc và số công ty sở hữu.
- Đi qua Xuất phát nhận 200 xu. Ô Cơ hội và Khí vận rút thẻ, ô Thuế nộp tiền, ô Vào tù thì vào tù (đổ đôi hoặc nộp 50 xu để ra).
- Đổ đôi được đổ tiếp, 3 lần đôi liên tiếp thì vào tù. Hết tiền tự bán nhà/đất, vẫn thiếu thì phá sản.
- Người trụ lại cuối cùng thắng; chủ phòng có thể **Tổng kết** sớm (xếp theo tổng tài sản).

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
3. Deploy xong sẽ có địa chỉ dạng `https://noi-tu-server.onrender.com`. Mở `/health` trên địa chỉ đó để kiểm tra, kết quả có dạng `{"ok":true,"words":79569,...}`.

Gói miễn phí sẽ "ngủ" sau 15 phút không có ai dùng. Người đầu tiên mở app sẽ phải chờ khoảng 1 phút, app có hiện thông báo trong lúc chờ. Trong lúc đang có người chơi, server không ngủ.

## Tài khoản & cơ sở dữ liệu (MongoDB)

Server đọc chuỗi kết nối MongoDB từ biến môi trường `DATABASE` (tên CSDL: biến `DATABASE_NAME`, mặc định `xomlay`). Trong đó có 3 bảng: `users` (mật khẩu băm scrypt), `sessions` (tự hết hạn sau 180 ngày), `words` (từ được người chơi duyệt).

- **Không** ghi chuỗi kết nối vào code hay file trong repo (repo đang public). Trên Render: **noi-tu-server → Environment → Add Environment Variable**, key `DATABASE`, value là chuỗi `mongodb://...` → Save, Render tự khởi động lại.
- MongoDB Atlas: mục **Network Access** phải cho phép IP của Render (đơn giản nhất là `0.0.0.0/0`), và nên dùng mật khẩu mạnh.
- Kiểm tra: `/health` trả về `"db":"mongo"`. Nếu thấy `"db":"memory"` nghĩa là chưa đặt biến hoặc không kết nối được (xem log), tài khoản chỉ lưu tạm và mất khi server khởi động lại.
- Chạy thử trên máy: `DATABASE='mongodb://...' npm run dev` trong thư mục `server`.

## Ảnh đại diện (Cloudinary)

Trong **noi-tu-server → Environment** trên Render, nhập đủ `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` từ tài khoản Cloudinary. `render.yaml` để cả ba biến ở `sync: false` để nhập riêng khi deploy. Chạy trên máy thì đặt các biến này trong môi trường của terminal chạy server.

**Không** ghi API secret vào code, repo, biến `EXPO_PUBLIC_*` hay cấu hình app; thông tin Cloudinary chỉ đặt ở server.

## 3. Thêm hoặc bớt từ

- `server/data/extra-words.txt`, `server/data/extra-words-en.txt`: thêm từ tiếng Việt (2 chữ) hoặc tiếng Anh (1 từ đơn)
- `server/data/banned-words.txt`, `server/data/banned-words-en.txt`: loại từ sai hoặc từ không muốn cho dùng

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
cd server && npm test        # chuẩn hóa, từ điển Việt & Anh, luật 4 game, giới hạn chọc, hồ sơ, phòng, Socket.IO
cd server && npm run typecheck
cd app && npx tsc --noEmit && npx expo lint
```
Test giao diện (`e2e/`): build bản web của app, chạy server, rồi để nhiều trình duyệt Chrome (khung điện thoại) tự chơi với nhau: `play.mjs` (Nối từ), `edge.mjs` (tình huống đặc biệt), `games.mjs` (Nối từ Anh, Bầu cua, ném/khịa/hối), `typhu.mjs` (Cờ tỷ phú), `v2.mjs` (nghĩa từ, sticker Quỳnh Aka, bát Bầu cua, Cờ tỷ phú 40 ô), `en-rules.mjs` (Nối từ Anh: gõ Telex, cứu trợ nối hộ, thời gian giảm dần, đổi tên + ảnh giữa ván, giới hạn chọc, bù giờ). Xem đầu file `play.mjs` để biết cách chạy.

## Nguồn icon và ảnh (Cờ tỷ phú)
- Icon trên bàn cờ, bảng giữa và hiệu ứng là **Twemoji** (bản jdecked/twemoji, gói npm `@twemoji/svg`), giấy phép **CC-BY 4.0**, bản quyền (c) Twitter, Inc. và những người đóng góp: https://github.com/jdecked/twemoji. Chỉ các file SVG đang dùng được chép vào `app/assets/typhu-icons/`; chạy `node app/assets/typhu-icons/gen.mjs` để tạo lại `app/src/typhuIcons.ts` (data URI, không thêm thư viện lúc chạy).
- Ảnh địa danh trong bảng chi tiết ô lấy từ Wikimedia Commons / Wikipedia (xem `app/src/typhuArt.ts`). Trong game có dòng "Nguồn icon/ảnh" ở cuối bảng chi tiết mỗi ô.

## Cấu hình server (biến môi trường)
| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `PORT` | 3000 | cổng |
| `TURN_SECONDS` | (theo từng game) | ép số giây mỗi lượt cho mọi game, dùng khi test |
| `DATA_DIR` | `server/data` | thư mục kho từ |

> Không bắt buộc: muốn đóng gói thành file APK thì `app/eas.json` đã có sẵn cấu hình (`npx eas-cli build -p android --profile preview`).
