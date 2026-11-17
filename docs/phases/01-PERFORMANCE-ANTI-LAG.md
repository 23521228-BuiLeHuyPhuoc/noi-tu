# Phase 1 — Chống Lag Khi Nhiều Người Chơi & Mở Rộng Phòng 12 Người

## 1. Phân Tích Nguyên Nhân Gây Lag Hiện Tại Trong Code

Qua kiểm tra trực tiếp mã nguồn hiện tại (`app/src/`, `server/src/`), có **6 điểm nghẽn hiệu năng lớn** khiến game bị giật/lag rõ rệt khi phòng có 6–12 người hoặc khi mọi người chọc ghẹo nhau liên tục:

1. **Vẽ lại SVG Chân Dung (~8KB XML + `encodeURIComponent`) mỗi lần render (`app/src/avatars.ts`)**:
   - `presetCache` hiện tại chỉ chạy khi `p.character` không tồn tại. Tuy nhiên `Room.addPlayer()` luôn gán `p.character`, khiến `portraitOf(p, mood)` luôn rơi vào nhánh `portraitUri(p.character, mood)`.
   - Tệ hơn, `Avatar` gọi `portraitOf(player, face.mood)` một lần và `PortraitImage` bên trong gọi `portraitOf(p, mood)` lần thứ hai! Mỗi lần có bất kỳ state nào ở màn hình cha thay đổi (kể cả đồng hồ tick 4 lần/giây), 6–12 avatar đều tạo lại 12–24 chuỗi Data URI SVG khổng lồ.
2. **Đồng hồ đếm ngược ép toàn màn hình re-render 4 lần/giây (`app/src/hooks.ts`)**:
   - `useSecondsLeft` gọi `setNow(Date.now())` mỗi `250ms` không điều kiện. Ngay cả khi số giây hiển thị (`Math.ceil(...)`) chưa hề đổi (ví dụ vẫn là `29s`), toàn bộ Screen (và toàn bộ Avatar Strip + Game Board) vẫn bị React re-render 4 lần mỗi giây!
3. **`useFace(id)` phát tín hiệu toàn cục cho MỌI avatar (`app/src/funState.ts`)**:
   - Mọi avatar dùng chung một `Set<() => void>()` và `useFace()` luôn trả về object literal mới `{ mood, doodle, ... }`. Khi một người bị chọc, toàn bộ tất cả các avatar khác cũng đọc lại map và re-render.
4. **Không memoize `Avatar` và `Portrait` (`app/src/components/Avatar.tsx`)**:
   - Không có `React.memo`, nên mỗi thay đổi nhỏ ở Chat/Board kéo theo re-render cả danh sách người chơi.
5. **Layout Thrashing từ `getBoundingClientRect()` khi chọc nhiều người (`app/src/components/Fun.tsx`)**:
   - Khi admin bấm "Chọc loạn xạ" (`🌪️`) hoặc có 5–10 hiệu ứng bay cùng lúc trong phòng 12 người, mỗi `FunLayer` / `PokeLayer` / `SkillLayer` gọi `rectOf()` truy vấn DOM liên tục gây ép trình duyệt tính lại Layout (reflow).
6. **Hiệu ứng JS `Animated.loop` với `useNativeDriver: false` chạy đồng thời (`Cosmetics.tsx`, `Fun.tsx`)**:
   - Nhiều khung viền/hào quang và 70 mảnh pháo giấy tạo hàng chục `requestAnimationFrame` callback bằng JS thread thay vì đẩy sang CSS Compositor GPU.

---

## 2. Danh Sách Nhiệm Vụ & Giải Pháp Triển Khai

### Task 1.1: Mở rộng lõi phòng chơi lên 12 người & `winnerIds` theo phe
- `shared/src/types.ts`:
  - `MAX_PLAYERS = 12`
  - Mở rộng `PLAYER_COLORS` từ 8 lên 12 màu sắc nét, độ tương phản cao.
  - Cập nhật `GAME_INFO` cho đủ 9 game (`min`/`max`: Nối từ 1–8, Bầu cua 1–12, Tỷ phú 2–6, Ma sói 4–12, Gián điệp 3–12, Vẽ & Đoán 2–12, Bom chữ 2–12, Đố vui 1–12).
  - Thêm `winnerIds?: string[]` vào `GameResult`.
- `server/src/room.ts` & `server/src/app.ts` & `server/src/store.ts`:
  - `BOT_NAMES` đủ 12 tên (`Máy Tèo` .. `Máy Na`).
  - `onFinish` và `Store.recordGame()` hỗ trợ danh sách nhiều người thắng (`winnerIds`), đảm bảo game chia phe như Ma Sói và Gián Điệp cộng điểm thắng công bằng cho tất cả thành viên thắng cuộc.

### Task 1.2: Kiến trúc `perPlayerView` bảo mật cho Game suy luận & Party
- `server/src/games/engine.ts`: `readonly perPlayerView?: boolean;` và `view(viewerId?: string): GameView`.
- `server/src/room.ts`: `hasPerPlayerView`, `toPublic(viewerId?)`, `gameView(viewerId?)`.
- `server/src/socket.ts`: lưu `socket.data.playerId`. Khi `room.hasPerPlayerView === false` (Nối từ, Bầu cua, Tỷ phú), phát 1 gói JSON duy nhất tới `io.to(room.code)` để tiết kiệm CPU server. Khi `room.hasPerPlayerView === true` (Ma sói, Gián điệp, Vẽ & đoán, Đố vui), gửi `room.toPublic(s.data.playerId)` riêng từng socket để không bao giờ lộ vai trò/từ khóa mật qua DevTools/Network!

### Task 1.3: Memo hóa SVG Portrait Cache (LRU 300 mục)
- `app/src/avatars.ts`:
  - Tạo cache LRU 300 phần tử cho `characterSvgUri(cfg)` và `portraitUri(cfg, mood)` theo key `mood + '|' + stableKey(cfg)`.
  - Tách riêng `portraitOf(p, mood)` gọi đúng 1 lần ở `Avatar`, truyền URI xuống `PortraitImage` để loại bỏ 100% việc tạo trùng chuỗi Data URI.

### Task 1.4: Cô lập `useFace(playerId)` theo từng ID người chơi
- `app/src/funState.ts`:
  - Chuyển sang `Map<string, Set<() => void>>` theo `playerId` + `Map<string, number>` version từng người + `Map<string, Face>` snapshot bất biến.
  - Khi `setMood(id, ...)` hoặc `setMorph(id, ...)` chạy, CHỈ những component đăng ký `id` đó nhận thông báo thay đổi.

### Task 1.5: Cô lập Tick Đồng Hồ (`useSecondsLeft` & `CountdownBar`)
- `app/src/hooks.ts`: `useSecondsLeft` chỉ gọi `setState` khi giá trị giây nguyên (`Math.ceil(...)`) thực sự thay đổi (giảm 75% số lần re-render từ 4Hz xuống 1Hz).
- `app/src/components/TimerBar.tsx`: bổ sung `CountdownBar` tự quản lý `useSecondsLeft` bên trong, giúp các màn hình game mới không phải re-render toàn màn hình mỗi giây.

### Task 1.6: Cache `rectOf()` theo Frame & Bọc `React.memo`
- `app/src/components/Fun.tsx`: tạo cache `rectCache` có TTL `32ms` trong `rectOf()` để các hiệu ứng bay cùng lúc đọc chung tọa độ DOM trong 1 frame, tránh Layout Thrashing.
- `app/src/components/Avatar.tsx`: bọc `React.memo` cho `Avatar` và `Portrait` với comparator gọn nhẹ.

### Task 1.7: Chế độ "⚡ Siêu mượt" (`smoothMode`) cho máy yếu & phòng 12 người
- `app/src/storage.ts` & `app/src/components/Shell.tsx` & `app/src/components/MapBackdrop.tsx`:
  - Cho phép bật/tắt chế độ **⚡ Siêu mượt** (lưu vào AsyncStorage / localStorage).
  - Khi bật, giảm bớt hạt nền trang trí, giới hạn số hiệu ứng đồng thời tối đa 4 (thay vì 8–10), tắt `boxShadow`/`filter` nặng mà vẫn giữ nguyên toàn bộ hiệu ứng gameplay, khung VIP và nút bấm.

---

## 3. Tiêu Chí Nghiệm Thu Phase 1

- `server/test/room.test.ts` vượt qua test 12 người + `room_full` ở người thứ 13.
- `server/test/secret-view.test.ts` chứng minh Socket của Dân Làng không nhận được danh sách Sói / từ khóa mật của người khác.
- Kiểm tra bằng Playwright 12 trình duyệt/bot trong 1 phòng kèm `fun:chaos`: `0` `pageerror`, thao tác bấm nút phản hồi `< 100ms`, không giật đứng màn hình.
