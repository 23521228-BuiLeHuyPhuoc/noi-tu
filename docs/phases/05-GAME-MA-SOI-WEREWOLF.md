# Phase 3 — Thiết Kế Game 5: Ma Sói (`masoi` / Werewolf)

## 1. Tổng Quan & Quy Tắc Cân Bằng

- **Mã game**: `'masoi'` (`name: 'Ma sói'`, `min: 4`, `max: 12`).
- **Tính chất bảo mật**: `perPlayerView = true` (mỗi người chơi và khán giả nhận bản chiếu riêng từ server; không bao giờ lộ vai trò người khác hay chat Sói ra ngoài).

---

## 2. Danh Sách 9 Vai Trò (`MaSoiRole`)

| Vai trò (`id`) | Tên hiển thị | Phe | Năng lực đặc biệt |
|---|---|---|---|
| `soi` | 🐺 Ma Sói | Phe Sói | Thấy đồng đội Sói, có kênh **Chat Đêm Sói**, mỗi đêm cùng bỏ phiếu cắn 1 người. |
| `tientri` | 🔮 Tiên Tri | Phe Dân | Mỗi đêm soi 1 người để biết **Có phải Ma Sói hay không** (trả về `isWolf: boolean`). |
| `baove` | 🛡️ Bảo Vệ | Phe Dân | Mỗi đêm bảo vệ 1 người (được tự bảo vệ mình, **không được bảo vệ cùng 1 người 2 đêm liên tiếp**). |
| `phuthuy` | 🧪 Phù Thủy | Phe Dân | Có **1 bình Thuốc Cứu** (thấy nạn nhân sắp bị Sói cắn ở pha Đêm Phù Thủy và chọn cứu) + **1 bình Thuốc Độc** (giết 1 người bất kỳ). |
| `thosan` | 🏹 Thợ Săn | Phe Dân | Khi chết (bị Sói cắn, bị Phù thủy độc hoặc bị làng treo cổ), được kích hoạt pha `hunter_shot` (12s) để **bắn kéo theo 1 người** (hoặc bỏ qua). |
| `cupid` | 💘 Thần Tình Yêu | Phe Dân (hoặc Cặp Đôi) | Đêm đầu tiên (`night_cupid`), ghép đôi 2 người thành **Cặp Đôi Định Mệnh**. Nếu 1 người chết, người kia chết theo vì đau khổ. Nếu 1 Sói + 1 Dân ghép đôi và cả 2 trụ tới top 2 -> thắng riêng! |
| `kengo` | 🤡 Kẻ Ngố (Jester) | Độc lập | Nếu bị Dân Làng **treo cổ vào ban ngày**, Kẻ Ngố **thắng một mình ngay lập tức!** (bị Sói cắn đêm thì thua). |
| `thamtu` | 🕵️ Thám Tử | Phe Dân | Mỗi đêm chọn 2 người (`a`, `b`), biết được hai người đó **Có cùng phe (Sói vs Không Sói) hay không**. |
| `dan` | 👨‍🌾 Dân Làng | Phe Dân | Không có kỹ năng đêm; suy luận, phát biểu và bỏ phiếu treo cổ ban ngày. |

### Bộ bài tự động cân bằng theo số người (`buildMaSoiDeck`)
- **4 người**: `soi, tientri, baove, dan`
- **5 người**: `soi, tientri, baove, dan, dan`
- **6 người**: `soi, soi, tientri, baove, phuthuy, dan`
- **7 người**: `soi, soi, tientri, baove, phuthuy, thosan, cupid`
- **8 người**: `soi, soi, tientri, baove, phuthuy, thosan, cupid, kengo`
- **9 người**: `soi, soi, soi, tientri, baove, phuthuy, thosan, cupid, thamtu`
- **10 người**: `soi, soi, soi, tientri, baove, phuthuy, thosan, cupid, thamtu, dan`
- **11 người**: `soi, soi, soi, tientri, baove, phuthuy, thosan, cupid, thamtu, kengo, dan`
- **12 người**: `soi, soi, soi, soi, tientri, baove, phuthuy, thosan, cupid, thamtu, kengo, dan` (hoặc tùy chỉnh theo preset `'classic' | 'chaos'` trong Lobby).

---

## 3. Máy Trạng Thái Vòng Lặp Đêm / Ngày (`MaSoiPhase`)

```
[role_reveal (6s)]
   │
   ├─► (Nếu có Cupid còn sống ở Đêm 1): [night_cupid (15s)]
   │
   ▼
[night_active (22s)]  <── Sói bỏ phiếu cắn & chat Sói | Tiên tri soi | Bảo vệ che | Thám tử điều tra
   │
   ├─► (Nếu Phù thủy còn sống & còn ít nhất 1 bình thuốc): [night_witch (14s)]
   │
   ▼
[Xử lý Bình Minh]
   ├── Tính nạn nhân Sói (nếu Bảo vệ trùng -> hụt; nếu Phù thủy cứu -> hụt)
   ├── Thêm nạn nhân Độc của Phù thủy
   ├── Dây chuyền Tình Yêu (Lover chết theo nếu nửa kia chết)
   ├── Nếu Thợ săn vừa chết -> [hunter_shot (12s)]
   └── Kiểm tra Điều kiện Thắng (xem mục 4)
   │
   ▼
[day_discuss (35s — tự chuyển sớm khi >= nửa số người sống bấm Sẵn sàng)]
   │
   ▼
[day_vote (25s — chuyển sớm khi tất cả người sống đã bỏ phiếu)]
   │
   ├── Phiếu nhiều nhất (không tính 'skip', không hòa) -> Treo cổ!
   │      ├── Nếu là Kẻ Ngố -> Kẻ Ngố thắng ngay!
   │      ├── Kiểm tra Tình Yêu chết theo
   │      └── Nếu là Thợ săn -> [hunter_shot (12s)]
   └── Kiểm tra Điều kiện Thắng -> nếu chưa ai thắng, tăng `day++` quay lại [night_active]
```

---

## 4. Điều Kiện Thắng & Ghi Nhận `winnerIds`

Kiểm tra theo thứ tự ưu tiên chặt chẽ:
1. **Kẻ Ngố (`kengo`)**: Thắng ngay lập tức nếu vừa bị treo cổ ở `day_vote` (`winnerIds = [jesterId]`).
2. **Cặp Đôi Khác Phe**: Nếu còn đúng `2` người sống sót, cả 2 là cặp đôi Cupid và gồm `1 Sói + 1 Không Sói` -> Hai người yêu nhau thắng (`winnerIds = lovers`).
3. **Phe Dân Làng**: Khi số Ma Sói còn sống `=== 0` -> Toàn bộ người thuộc phe Dân (`tất cả trừ soi và kengo`) thắng (`winnerIds = phe dân`).
4. **Phe Ma Sói**: Khi `wolvesAlive >= nonWolvesAlive` (và không còn Thợ săn đang chờ bắn) -> Toàn bộ `soi` thắng (`winnerIds = allWolves`).

---

## 5. Bảo Mật Dữ Liệu (`perPlayerView`) & Bot AI

- `MaSoiGame.view(viewerId)` chỉ điền `myRole`, `wolfPackIds`, `wolfVotes`, `wolfChat`, `seerHistory`, `detectiveHistory`, `guardLastId`, `witchState`, `myPartnerId` đúng với `viewerId`.
- Khán giả (`spectator`) nhận `myRole = null`, không thấy bất kỳ kênh Sói hay lịch sử Tiên tri nào cho tới khi ván kết thúc.
- **Bot AI**:
  - Đêm: Cupid bot ghép 2 người ngẫu nhiên; Bảo vệ bot chọn ngẫu nhiên hợp lệ (tránh lặp đêm trước); Sói bot ưu tiên nhắm người không phải Sói; Tiên tri bot soi người chưa biết; Phù thủy bot cứu người bị cắn bằng tỷ lệ hợp lý và không tự sát vô lý.
  - Ngày: Nếu Tiên tri bot soi ra Sói còn sống, ưu tiên vote Sói đó; Sói bot tránh vote đồng đội; Dân bot bỏ phiếu hợp lý dựa theo nghi ngờ; Bot tự bấm `ms_ready` để trận đấu trôi mượt khi test hoặc chơi cùng bot.
