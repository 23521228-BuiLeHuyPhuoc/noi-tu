# Thiết kế & Kế hoạch tích hợp (Spec V3 — 3D) — Sàn Diễn Xóm Lầy (`thoitrang`)

## 1. Tổng quan & Định danh
- **Tên hiển thị:** `Sàn Diễn Xóm Lầy` (emoji: `👗`, tagline: *"Phối đồ 3D theo 628+ chủ đề cực lầy, sải bước sàn diễn & chấm sao 0,5 cùng Giám khảo Máy!"*).
- **Game ID:** `thoitrang` (`GAME_INFO`: `{ name: 'Sàn Diễn Xóm Lầy', min: 2, max: 12 }`, chơi được với Bot qua `room.addBot`, thưởng/trừ Ruby & bảng xếp hạng tự động qua `onFinish` như `giandiep`/`whoisit`).
- **Tích hợp không phá vỡ:** Giữ nguyên 17 game hiện có; `ThoiTrangScreen` dùng `React.lazy` tách chunk riêng (Three.js chỉ tải khi vào game); toàn bộ tủ đồ chọn qua **lưới icon trực quan**, **tuyệt đối không có bộ sưu tập phối sẵn (no full-outfit presets)**.

## 2. Kế thừa từ V2 & Thay đổi trọng tâm sang 3D
- **Giữ nguyên từ V2:** Kiến trúc phòng/socket (`perPlayerView = true`, `game:action` + `game:input` + kênh nhẹ `'thoitrang:pose'`), gom broadcast `500ms` khi phối đồ, luật chấm `1,0–5,0★` bước `0,5★` (`halfStars: 2..10`), phá hòa 5 tầng, xử lý AFK/mất mạng/rời phòng, `FreshDeck` chống lặp chủ đề, cache `immutable` trên `render.yaml`.
- **Thay đổi mới ở V3:**
  1. **Thay toàn bộ ULPC pixel 2D bằng Engine 3D `proto-v2`** (Three.js `0.170.0`, 124 món gốc → **1.186.864 biến thể trung thực**, 3 dáng đa giới `female`/`male`/`curvy` + chiều cao `0,90–1,10`, mọi món mặc được trên mọi dáng không lỗi tương thích).
  2. **Chỉ chọn đồ bằng lưới Icon WebP Atlas** theo từng danh mục, bỏ hoàn toàn tab "Bộ sưu tập" / preset cả bộ.
  3. **Thêm Giám khảo Máy (`thoitrang-judge.ts`)** chạy tất định trên server, tính đúng bằng **1 phiếu ngang hàng người chơi** trong điểm trung bình và kèm nhận xét 1 dòng tiếng Việt.
  4. **Ngân hàng ≥ 628 chủ đề đặc sắc** (văn hóa Việt + pop culture + prompt lầy lội) bám sát 124 món 3D.

## 3. Kế hoạch chuyển đổi Engine 3D (`proto-v2` → ESM)
- Chuyển 17 module lõi của `proto-v2` (loại bỏ `ui.js`, `main.js`, `presets.js` khỏi bundle game) từ `P.def(...)` sang ES modules tại `app/src/thoitrang3d/` (`.js` kèm `// @ts-nocheck` + file `index.ts` khai báo kiểu TypeScript sạch):
  - Nhóm lõi: `geo.js`, `mats.js`, `stage.js`, `skeleton.js`, `body.js`, `face.js`, `hair.js`, `garment_util.js`, `tops_outer.js`, `bottoms_dresses.js`, `shoes.js`, `headwear.js`, `accessories.js`, `anim.js`, `engine.js`.
  - Dữ liệu `catalog` không copy lại mà import trực tiếp từ `../../../shared/src/thoitrang-catalog`.
- **Sửa bắt buộc khi port (khắc phục singleton của `proto-v2`):**
  1. Đóng gói vào factory `createThoiTrangEngine(hostEl, opts)` thay vì singleton cấp module (`mats`, `stage`, `anim`), kèm `dispose()` dọn triệt để `ResizeObserver`, `window` resize listener, `OrbitControls`, `EffectComposer`, `envRT`, textures/materials và `renderer.dispose()`.
  2. **1 WebGL Context duy nhất cho cả Stage và Snapshot:** Không tạo `WebGLRenderer` thứ 2 như `proto-v2/engine.js` (tránh nhân đôi VRAM, biên dịch shader 2 lần và rớt context trên iOS Safari). Dùng chính `stage.renderer` vẽ `snapScene` + `snapCamera` vào 1 `WebGLRenderTarget(160, 160)` tái sử dụng (`readRenderTargetPixels` → lật dọc sang 1 canvas 2D dùng lại → `toDataURL('image/webp', 0.82)`), bọc `try/finally` khôi phục `mats.skin`/`hair`/`lip`.
  3. Gắn listener `webglcontextlost` / `webglcontextrestored` để tự dựng lại scene nếu OS thu hồi GPU.
- **Component `<DollCanvas>` (`app/src/components/ThoiTrangDollCanvas.tsx`):** Web-only (`Platform.OS === 'web'`); bản native hiển thị fallback thông báo mở bản Web. Thêm `"three": "0.170.0"` vào `app/package.json` (`dependencies`) và `"@types/three": "0.170.0"` (`devDependencies`).

## 4. Danh mục dùng chung (`shared/src/thoitrang-catalog.ts`)
- Chứa thuần dữ liệu & hàm kiểm tra (0 dòng Three.js) để **Server** (validate + Giám khảo Máy + Bot) và **App** (3D + UI) dùng chung 1 nguồn sự thật:
  - `CATALOG` (124 món gốc + `bald`), `SLOTS` (14 ô đồ), `PALETTES` (`fashion` 24, `hair` 16, `metal` 12, `skin` 8, `eye` 8, `lip` 10), `PATTERNS` (15 hoạ tiết), `BODY_TYPES` (`female`, `male`, `curvy`), `FACE_OPTS`, `BASE_OUTFIT`, `POSES` (10 pose từ `anim.js`).
  - **Mở rộng bộ thẻ từ 15 → 28 thẻ (`THOI_TRANG_TAGS`):** Giữ 15 thẻ chính (`da_hoi`, `duong_pho`, `cong_so`, `the_thao`, `co_trang`, `ky_ao`, `kinh_di`, `mua_he`, `mua_dong`, `de_thuong`, `lay_loi`, `hoang_gia`, `cuoi_hoi`, `hai_tac`, `scifi`) + bổ sung 13 thẻ ngữ nghĩa (`van_hoa_vn`, `hoc_duong`, `am_nhac`, `bi_an`, `ngot_ngao`, `ca_tinh`, `sang_chanh`, `bien_dao`, `dong_vat`, `tinh_yeu`, `hanh_dong`, `retro`, `toi_gian`) gắn phủ lên 124 món sẵn có (3–6 thẻ/món) để 628 chủ đề phân tách rõ khi lọc & chấm điểm.
  - Hàm dùng chung: `validateOutfit(raw)` (ràng buộc `dress` loại trừ `top`/`bottom`, giới hạn `height ∈ [0.9, 1.1]`, mã hex hợp lệ, làm sạch trường lạ), `setSlot()`, `countVariants()` (`1.186.864`), `getCoveredGroups()`, `outfitHash()`.
- **Schema `ThoiTrangOutfit` (~450–750 bytes/người):** Giữ đúng cấu trúc gọn của `proto-v2`: `{ body, skin, height, face: { eyes, eyeColor, brows, lips, lipColor, blush, freckles }, hair: { id, c, c2, v }, slots: Partial<Record<ThoiTrangSlotId, { id, c, c2, p, v }>> }`.

## 5. Pipeline dựng Atlas Icon WebP (`app/scripts/build-thoitrang-icons.mjs`)
- **Đầu ra commit sẵn vào repo:** `app/public/thoitrang/icons.webp` + `app/public/thoitrang/icons.json` (tổng dự kiến **300–550 KB**, 1 HTTP request duy nhất, CDN cache `immutable`).
- **Quy trình chạy (Claude chạy qua Playwright):**
  1. Script mở trang harness nội bộ tải `app/src/thoitrang3d/` và `shared/src/thoitrang-catalog.ts` trên Chromium headless.
  2. Dựng **125 icon món đồ** (124 base items + `bald`) + **19 icon mặt/dáng** (`body` 3 + `eyes` 4 + `brows` 4 + `lips` 4 + `blush` 4) = **144 ô (lưới 12×12, mỗi ô 128×128 px → 1536×1536 px)**.
  3. **Màu & khung hình trung tính cho từng nhóm:** Món mặc được sơn màu chuẩn sáng trung tính (`#ece7f2` vải / `#e7b75a` nhấn / `#d9d4e3` kim loại) đặt trên ma-nơ-canh bóng mờ tối (`#2b253a`, `roughness: 0.92`) để nổi rõ phom dáng; mỗi nhóm có camera preset riêng (`head`, `face`, `ear`, `neck`, `torso`, `legs`, `full`, `waist`, `feet`, `prop`, `back`).
  4. Ghép 144 ô thành `icons.webp` (lossy q=88 + alpha) và xuất `icons.json` dạng `{ tile: 128, cols: 12, rows: 12, map: { "top:tee": [col, row], ... } }`.
- **Hiển thị trên App:** Component `<ItemIcon id="top:tee" size={56} />` dùng CSS `backgroundImage` + `backgroundPosition` từ 1 file WebP (không tạo canvas phụ, không lag khi cuộn).

## 6. Bố cục Tủ đồ (ASCII Layout — Mobile & Desktop)
- **12 Tab danh mục** phủ trọn 100% 14 ô + cơ thể/tóc/mặt (không bỏ sót `belt`!):
  `Cơ thể & Mặt` | `Tóc` | `Đầm` | `Áo` | `Quần/Váy` | `Khoác` | `Giày` | `Mũ` | `Kính` | `Trang sức & Đai` (`necklace`, `earrings`, `belt`) | `Túi & Cầm tay` (`bag`, `held`) | `Cánh & Đuôi` (`back`, `tail`).
- **Không có tab Bộ sưu tập / Preset cả bộ.** Chỉ có nút `🎲 Ô này` (random riêng ô đang chọn), `🚫 Gỡ món`, `↩ Undo / ↪ Redo` (25 bước). Không dùng `FlatList` ảo hóa cho 7–17 icon/tab (dùng lưới flex/CSS + `React.memo` để tránh giật cuộn trên RN Web).

```text
MOBILE (< 768px)                            DESKTOP (>= 768px)
+------------------------------------+      +---------------------------------------------------------+
| [👗 Chủ đề (bấm xem gợi ý)] [⏱02:45]|      | [👗 Chủ đề — mô tả · 🏷 Tag · ●●● Bảng màu]  [⏱ 02:45] |
| [P1][P2][P3][P4][P5]... (ảnh 64px) |      +------------------------+--------------------------------+
+------------------------------------+      | CẢ PHÒNG (8/12)        | [Cơ thể][Tóc][Đầm][Áo][Quần]... |
|      +------------------+ [↩][↪]   |      | [P1][P2][P3][P4]...    +--------------------------------+
|      |  SÂN KHẤU 3D     | [🎲Ô]    |      |  +------------------+  | [🔍Tìm] [✨Hợp chủ đề ✓] [🏷]  |
|      |  (kéo xoay/zoom) | [✅Xong] |      |  |  SÂN KHẤU 3D     |  +--------------------------------+
|      +------------------+          |      |  |  (kéo xoay/zoom) |  | [🚫Gỡ][✨Icon][ Icon][ Icon]  |
+------------------------------------+      |  |  [Pose thử ▾]    |  | [ Icon][✨Icon][ Icon][ Icon]  |
| [Cơ thể][Tóc][Đầm][Áo][Quần]... →  |      |  +------------------+  | [ Icon][ Icon ][ Icon][ Icon]  |
| [🔍Tìm] [✨Hợp CĐ ✓] [🏷Thẻ...]    |      | [↩Undo][↪Redo][🎲Ô]    +--------------------------------+
| [🚫Gỡ][✨Icon][Icon][Icon] (lưới 4c)|      | [  ✅ XONG — LÊN SÀN ] | TUỲ CHỈNH MÓN ĐANG CHỌN:       |
| -- Tuỳ chỉnh món đang chọn --      |      |                        | Chính: ●●●●●● [🎨] Nhấn: ●●●●● |
| [Màu chính][Màu nhấn][Phom][Hoạ tiết]      |                        | Phom: [Ngắn][Dài] Hoạ tiết:... |
+------------------------------------+      +------------------------+--------------------------------+
```

## 7. Luồng ván chơi, Đồng hồ & Thời điểm mở điểm Giám khảo Máy
| Pha (`ThoiTrangPhase`) | Thời lượng | Diễn biến & Điều kiện chuyển pha |
| --- | --- | --- |
| `theme_reveal` | **6s** | Hiện tên chủ đề, mô tả hài hước, 3–5 thẻ gợi ý và 3–4 màu gợi ý; cấp cho mỗi người bộ `BASE_OUTFIT` sạch (khác màu da/tóc nhẹ theo phòng). |
| `dressing` | Sảnh chọn: **120 / 180 / 240 / 300 / 420s** *(mặc định **240s** — 4 phút, vì tủ đồ rất lớn)* | Phối đồ bằng lưới icon + xem mini-preview cả phòng. Nút **"Xong"** (`tt_ready`, bấm lại để hủy); khi **100% người thật đang kết nối** sẵn sàng → rút đồng hồ còn **5s**. |
| `runway` | **14s/người** (2–6 người) hoặc **11s/người** (7–12 người) | Thứ tự ngẫu nhiên. Nhân vật tự đi `catwalk` (~5s) → `finale`; chủ nhân bấm 9 nút pose (`flex`, `trip`, `dance`, `wave`, `blow_kiss`, `superhero`, `selfie`, `finale`, `catwalk`). Khán giả chấm `1,0–5,0★` (bước `0,5★`) & thả cổ vũ. Qua `≥7s` và đủ phiếu người thật đang kết nối → rút còn **2s**. |
| `reveal` | **12s** (nút **"Tiếp tục"** / `tt_skip_reveal` cho chủ phòng hoặc đa số) | Bục vinh quang Top 3 + bảng chi tiết từng người (Điểm tổng, Khán giả, **Giám khảo Máy + 1 dòng nhận xét**) → gọi `ctx.finish(result)` sang `ResultScreen`. |

- **Quyết định thời điểm công bố Giám khảo Máy — CHỈ mở ở pha `reveal` (ẩn trong `runway`):**
  1. **Tránh hiệu ứng neo điểm (anchoring bias):** Nếu máy mở `4,5★` hay `1,5★` sau từng lượt đi, khán giả sẽ chấm các lượt sau bị lệch theo máy hoặc bấm ăn theo.
  2. **Giữ kịch tính tới phút chót:** Không làm lộ sớm quán quân ở giữa show 10–12 người.
  3. **Gọn nhịp sàn diễn:** Tiết kiệm 3–4s/người (~36–48s ở phòng 12 người) để dồn trọn niềm vui so sánh "Máy chấm vs Bạn bè chấm" vào màn `reveal`.

## 8. Chấm điểm, Luật hòa & Giám khảo Máy (`shared/src/thoitrang-judge.ts`)
- **Cơ chế phiếu bầu:** Mỗi khán giả chấm số nguyên `halfStars ∈ [2..10]` (`1,0★..5,0★`, cấm tự chấm, đổi điểm được tới hết lượt, AFK/mất mạng không tính vào mẫu số). **Giám khảo Máy tính đúng bằng 1 phiếu ngang hàng người chơi:**
  `avgStars = ((sumHumanHalfStars + machineHalfStars) / 2) / (nHumanVoters + 1)`
  *(Kể cả phòng 2 người hay mọi khán giả AFK, vẫn luôn có ít nhất 1 phiếu công bằng từ Máy; phá vỡ tình trạng 2 người tự chấm nhau 1★!)*
- **Phá hòa 5 tầng (gồm cả phiếu Máy):** (1) Trung bình chính xác `sumA * countB` vs `sumB * countA` → (2) Nhiều phiếu `5,0★` (`10`) hơn → (3) Trung vị (`median`) cao hơn → (4) Ít phiếu `1,0★` (`2`) hơn → (5) Đồng giải Nhất (`winnerIds`).
- **Công thức Giám khảo Máy (thuần hàm, tất định, thang 0–100 điểm):**
  - **Trọng số ô đồ:** `dress=3.0` | `top=1.6, bottom=1.6` | `outer=1.2` | `shoes=1.0, hair=1.0, hat=1.0, back=1.0` | `held=0.9, glasses=0.8, tail=0.8, bag=0.7` | `necklace=0.6, belt=0.5, earrings=0.5`.
  1. **Khớp thẻ chủ đề (`themeMatch`, tối đa 42đ):** Mỗi món khớp ≥2 thẻ chủ đề = `1.0`, khớp 1 thẻ = `0.78`, không khớp = `0`. Tỉ lệ `R = Σ(w_i × credit_i) / max(4.5, Σw_i)` (mẫu tối thiểu `4.5` chống mặc 1 cái mũ để ăn điểm). `themeMatch = round(42 × min(1, R))`.
  2. **Độ phủ thẻ gợi ý (`tagCoverage`, tối đa 16đ):** `round(16 × số_thẻ_chủ_đề_được_phủ / theme.tags.length)` (+3đ trong trần 16 nếu đạt `theme.mustHave` nếu có).
  3. **Độ hợp tông màu (`palette`, tối đa 20đ):** Tính khoảng cách màu cảm nhận `redmean` giữa màu chính `c` (và nhấn `c2` trọng số `0.35`) của quần áo đang mặc tới màu gần nhất trong `theme.palette`: `sim = clamp(1 - minDist / 0.42, 0, 1)` (màu trung tính đen/trắng sàn `0.35`). `palette = round(20 × avgSim)`.
  4. **Độ hoàn chỉnh (`completeness`, tối đa 14đ):** Đủ thân+chân (`dress` hoặc `top+bottom`) `+7đ` (chỉ 1 phần `+3đ`, trống thân dưới/trên: khóa trần `1,5★`) + có `shoes` `+3đ` + tóc phù hợp `+2đ` + ≥2 phụ kiện `+2đ` (1 phụ kiện `+1đ`).
  5. **Sáng tạo & Chăm chút (`styling`, tối đa 8đ):** Đã thay khỏi `BASE_OUTFIT` `+2đ` (nếu giữ nguyên y hệt mặc định: khóa trần `2,0★`), dùng màu nhấn `c2 !== c` ở ≥2 món `+2đ`, dùng hoạ tiết `p !== 'solid'` hoặc chỉnh phom/trang điểm `+2đ`, phối màu hài hòa ≤4 tông chủ đạo (hoặc chủ đề `lay_loi`) `+2đ`.
  - **Quy đổi sang sao 0,5:** `halfStars = clamp(round(2 + (total / 100) * 8), 2, 10)` (`0–6 → 1,0★`, …, `57–68 → 3,5★`, `69–81 → 4,0★`, `82–93 → 4,5★`, `94–100 → 5,0★`).
  - **Sinh câu nhận xét 1 dòng tiếng Việt:** Ghép từ 3 cụm trạng thái (món hợp chủ đề `X/Y`, tông màu, điểm cộng/thiếu sót).
- **3 Ví dụ kiểm chứng (chủ đề *«Met Gala Xóm Lầy»* — `da_hoi, hoang_gia, ky_ao, sang_chanh`, màu `#b3122e, #e7b75a, #17151c, #9b72cf`):**
  - *Ví dụ A (AFK mặc nguyên `BASE_OUTFIT` áo thun + jeans + sneaker):* `themeMatch=0, tagCoverage=0, palette=4, completeness=12, styling=0` → `16đ` → **`1,5★`** — *"Lạc chủ đề 0/4 món · chưa đổi đồ mặc định · lệch tông màu"*.
  - *Ví dụ B (Đầm lụa đen + cao gót đỏ + kính mắt mèo + tóc dài thẳng, thiếu phụ kiện hoàng gia):* `themeMatch=31, tagCoverage=8, palette=18, completeness=13, styling=5` → `75đ` → **`4,0★`** — *"Hợp chủ đề 4/5 món · chuẩn tông màu · thêm phụ kiện sẽ cháy hơn"*.
  - *Ví dụ C (Đầm `ballgown` đỏ kim sa viền vàng + `stiletto` vàng + `tiara` + `pearl_strand` + `pearl_drop` + `clutch_bag` + `long_wavy`):* `themeMatch=42, tagCoverage=16, palette=19, completeness=14, styling=8` → `99đ` → **`5,0★`** — *"Hợp chủ đề 7/7 món · chuẩn tông màu · phối hoạ tiết & phụ kiện xuất sắc"*.

## 9. Ngân hàng ≥ 628 Chủ đề (`shared/src/thoitrang-themes.ts`)
- **Định dạng nén (giống `giandiep-words.ts`, ~65 KB):** Chuỗi `id|Tiêu đề|Mô tả hài hước|tag1,tag2,tag3,tag4|#hex1,#hex2,#hex3[|mustHaveSlot]` phân vào **16 nhóm (`THOI_TRANG_THEME_GROUPS`)**: `viet_nam` (Văn hóa Việt), `lay_loi` (Xóm Lầy & Meme), `da_tiec` (Thảm đỏ & Dạ tiệc), `duong_pho` (Đường phố & Gen Z), `cong_so` (Công sở & Tổng tài), `co_trang` (Cổ trang & Cung đấu), `ky_ao` (Phép thuật & Kỳ ảo), `kinh_di` (Kinh dị & Halloween), `scifi` (Cyberpunk & Tương lai), `mua_he` (Mùa hè & Biển đảo), `mua_dong` (Mùa đông & Noel), `am_nhac` (Idol & Sân khấu), `hoc_duong` (Học đường & Thanh xuân), `cuoi_hoi` (Cưới hỏi & Lãng mạn), `phieu_luu` (Hải tặc & Phiêu lưu), `thu_thach` (Thử thách Màu & Hoạ tiết).
- **Chủ phòng chọn trong sảnh:** `thoiTrangThemeGroup`: `'random'` (*Ngẫu nhiên*) hoặc 1 trong 16 nhóm; bốc không lặp qua `FreshDeck` (`THOI_TRANG_DECK`).
- **20 chủ đề mẫu đại diện:**
  1. `vn_dam_cuoi_que` — **Đi ăn cưới quê gặp cả họ** | *Mặc sao vừa lễ phép vừa né câu hỏi bao giờ lấy chồng* (`cuoi_hoi,da_hoi,van_hoa_vn,sang_chanh` · `#b3122e,#f7f3eb,#e8c15a`)
  2. `vn_mung1_tet` — **Mùng 1 đi chúc Tết hốt lì xì** | *Đỏ rực lấy vía đầu năm, cười tươi nhận phong bao* (`van_hoa_vn,co_trang,hoang_gia,de_thuong` · `#b3122e,#e8c15a,#f6b4c8`)
  3. `vn_dalat_may` — **Nàng thơ săn mây Đà Lạt** | *Sáng 14 độ trưa 26 độ, vẫn phải có ảnh sống ảo* (`mua_dong,de_thuong,ngot_ngao,van_hoa_vn` · `#f7f3eb,#c46233,#d9b56c,#8ad0ad`)
  4. `lay_gap_nyc` — **Đi chợ mua rau gặp người yêu cũ** | *Giả vờ mặc đại mà vẫn chặt đẹp không kịp trở tay* (`lay_loi,duong_pho,sang_chanh,ca_tinh` · `#17151c,#e65c7b,#f7f3eb`)
  5. `lay_3h_mi_goi` — **3h sáng chạy ra tiệm mua mì gói** | *Phối đồ mắt nhắm mắt mở, miễn có đồ che thân* (`lay_loi,duong_pho,mua_dong,the_thao` · `#8ec2f0,#f6b4c8,#c8e64c`)
  6. `lay_chu_tich` — **Chủ tịch giả nghèo đi thử lòng** | *Tưởng bình dân nhưng phụ kiện lấp lánh không giấu nổi* (`lay_loi,cong_so,hoang_gia,sang_chanh` · `#383842,#e7b75a,#f7f3eb`)
  7. `dt_met_gala` — **Met Gala Xóm Lầy** | *Càng lố càng sang, bước ra là đèn flash nổ tanh tách* (`da_hoi,hoang_gia,ky_ao,sang_chanh` · `#b3122e,#e7b75a,#17151c,#9b72cf`)
  8. `dp_y2k_sg` — **Y2K phố đi bộ Nguyễn Huệ** | *Croptop, kính mắt ngầu, dây xích và vibe Gen Z* (`duong_pho,ca_tinh,retro,am_nhac` · `#e65c7b,#18c4b8,#17151c,#e6e8ec`)
  9. `cs_tong_tai` — **Sếp tổng đi ký hợp đồng trăm tỷ** | *Blazer sắc lẹm, thần thái lạnh lùng không ai dám cãi* (`cong_so,sang_chanh,toi_gian,ca_tinh` · `#1d346b,#f7f3eb,#17151c,#d9b56c`)
  10. `ct_hoang_hau` — **Hoàng hậu thắng màn cung đấu** | *Trâm vàng, áo choàng lộng lẫy, ánh mắt nhìn thấu tâm can* (`co_trang,hoang_gia,da_hoi,van_hoa_vn` · `#b3122e,#e7b75a,#165b45`)
  11. `ct_ho_ly` — **Hồ ly chín đuôi xuống núi** | *Cổ trang bay bổng cộng thêm chiếc đuôi xù mê hoặc* (`co_trang,ky_ao,dong_vat,ngot_ngao` · `#f7f3eb,#e65c7b,#e8c15a,#9b72cf`)
  12. `ka_tien_rung` — **Tiên nữ lạc giữa rừng phát sáng** | *Cánh tiên lung linh, đũa phép và váy bay như sương* (`ky_ao,de_thuong,ngot_ngao,mua_he` · `#8ad0ad,#f6b4c8,#f7f3eb,#e8c15a`)
  13. `kd_phu_thuy` — **Phù thủy nghiện trà sữa nửa đêm** | *Mũ chóp cao, cánh dơi và đầm tối màu đầy phép thuật* (`kinh_di,ky_ao,bi_an,lay_loi` · `#6e2c86,#17151c,#f6b4c8,#e8c15a`)
  14. `sf_hacker` — **Hacker Cyberpunk năm 2099** | *Áo giáp neon, kính visor phát sáng giữa thành phố đêm* (`scifi,ca_tinh,duong_pho,hanh_dong` · `#17151c,#18c4b8,#9b72cf,#e6e8ec`)
  15. `mh_phu_quoc` — **Ngắm hoàng hôn biển Phú Quốc** | *Mũ rộng vành, váy bay nhẹ và kính râm đón gió biển* (`mua_he,bien_dao,de_thuong,van_hoa_vn` · `#f2994a,#8ec2f0,#f7f3eb,#e8c15a`)
  16. `md_noel_sapa` — **Đón Giáng sinh săn tuyết Sapa** | *Áo phao hoặc áo lông ấm áp, khăn len đỏ rực trời đông* (`mua_dong,de_thuong,ngot_ngao,van_hoa_vn` · `#b3122e,#165b45,#f7f3eb,#e8c15a`)
  17. `an_concert` — **Lên đồ quẩy Concert thần tượng** | *Đèn neon, váy xếp ly hoặc khoác da, cầm micro cháy sân khấu* (`am_nhac,duong_pho,ca_tinh,de_thuong` · `#e65c7b,#17151c,#f6b4c8,#e6e8ec`)
  18. `hd_ky_yeu` — **Chụp kỷ yếu thanh xuân cuối cấp** | *Áo sơ mi, chân váy xếp ly hoặc áo dài trắng tinh khôi* (`hoc_duong,de_thuong,van_hoa_vn,ngot_ngao` · `#f7f3eb,#1d346b,#8ec2f0`)
  19. `ch_co_dau_chay` — **Cô dâu chạy trốn bằng sneaker** | *Váy cưới lộng lẫy nhưng chân đi giày chạy cho kịp chuyến xe* (`cuoi_hoi,lay_loi,tinh_yeu,hoang_gia` · `#f7f3eb,#f6b4c8,#e7b75a`)
  20. `pl_hai_tac` — **Thuyền trưởng săn kho báu Caribe** | *Mũ ba góc, bốt cao cổ, áo choàng và kính một mắt cực ngầu* (`hai_tac,hanh_dong,co_trang,bi_an` · `#721428,#4f2c1d,#e7b75a,#17151c`)

## 10. AI Bot (`botAction` trong `server/src/games/thoitrang.ts`)
- **`BOT_THINK_MS.thoitrang = [900, 1800]`** (trong test tự rút ngắn theo `turnMs`).
- **Pha `dressing`:** Bot tự sinh 5 bộ ứng viên lọc theo `theme.tags` + chọn màu gần `theme.palette`, chấm bằng chính `judgeOutfit()` và chọn 1 trong 2 bộ cao nhất (pha chút ngẫu nhiên để mỗi bot có phong cách riêng từ 3,0–4,5★). Gửi `tt_outfit` (2 nhịp để người thật thấy bot thay đồ) rồi bấm `tt_ready`.
- **Pha `runway`:** Khi bot đang sải bước → tung 1–2 pose ngẫu nhiên (`tt_pose`, cách nhau ≥3s). Khi bot là khán giả → chấm `tt_rate` quanh điểm Giám khảo Máy `clamp(machineHalfStars + randInt(-1, 1), 2, 10)`.

## 11. Socket Events, State Server & `perPlayerView`
- **`RoomSettings` mới (`shared/src/types.ts`):** `thoiTrangDressSec?: 120 | 180 | 240 | 300`, `thoiTrangThemeGroup?: 'random' | ThoiTrangThemeGroupId`.
- **`game:action` (có ACK):**
  - `tt_outfit`: `{ type: 'tt_outfit'; outfit: ThoiTrangOutfit }` — client debounce **350ms** (maxWait 900ms, xả ngay khi bấm Xong); server validate qua `validateOutfit()` và gom broadcast **500ms coalescing**.
  - `tt_ready`: `{ type: 'tt_ready'; ready: boolean }` (đảo trạng thái sẵn sàng trong `dressing`).
  - `tt_rate`: `{ type: 'tt_rate'; halfStars: number }` (`2..10`, chỉ nhận ở `runway`, cấm tự chấm).
  - `tt_skip_reveal`: `{ type: 'tt_skip_reveal' }` (chủ phòng hoặc ≥50% người thật kết nối chuyển ngay sang `ResultScreen`).
- **`game:input` (1 chiều không ACK, cập nhật `useGame.ts`) → kênh riêng `'thoitrang:pose'`:**
  - `tt_pose`: `{ type: 'tt_pose'; pose: ThoiTrangPoseId }` (chỉ walker, cooldown **700ms**).
  - `tt_cheer`: `{ type: 'tt_cheer'; cheer: ThoiTrangCheerId }` (khán giả, 6 emoji cố định `🔥👏😍💅😂👑`, cooldown **1200ms**).
  - Server phát qua `ctx.emitThoiTrangPose(payload)` → `io.to(room.code).emit('thoitrang:pose', payload)` (giống mẫu `croak:tick`/`boom:tick`), đồng thời lưu `lastPose` trong state để người nối lại thấy đúng dáng.
- **`ThoiTrangView` (`perPlayerView = true`):**
  ```ts
  export interface ThoiTrangView {
    type: 'thoitrang';
    phase: 'theme_reveal' | 'dressing' | 'runway' | 'reveal';
    phaseEndsAt: number | null; phaseSeconds: number;
    theme: ThoiTrangTheme;
    order: string[]; names: Record<string, string>;
    outfits: Record<string, ThoiTrangOutfit>;
    ready: string[];
    runwayIndex: number; walkerId: string | null; lastPose: ThoiTrangPoseId;
    ratedBy: string[];        // chỉ ai đã chấm, ẩn hoàn toàn số sao khi đang runway
    myRating: number | null;  // riêng viewerId (2..10)
    scores: ThoiTrangScoreRow[] | null; // chỉ gửi ở pha reveal (gồm humanAvg, machineHalfStars, machineReason, finalAvg, rank)
  }
  ```

## 12. Ngân sách hiệu năng (Mobile & Phòng 12 người)
- **Tam giác & Đồ họa:** Desktop `'high'` ≤ **45.000 tris** (shadow 1024, bloom bật); Mobile `'low'` ≤ **20.000 tris** (shadow 512, tắt bloom, DPR ≤ `1.5`, texture hoạ tiết `256px`).
- **1 WebGL Context duy nhất:** Stage + Snapshot dùng chung 1 `WebGLRenderer` (xem Mục 3), tránh tràn bộ nhớ GPU di động.
- **Hàng đợi Snapshot mini-preview:** Ảnh 160×160 WebP cache theo `outfitHash` (LRU 32), mỗi người làm mới tối đa **1 lần / 1,5s**, hàng đợi render tối đa **1 người / khung hình** (`requestAnimationFrame`) nên 12 người đổi đồ đồng loạt không gây khựng UI.
- **Băng thông:** 12 bộ đồ ≈ 6 KB/lần broadcast × tối đa 2 lần/s (`500ms` coalescing) = ≤ 12 KB/s lúc cao điểm; pose/cheer chỉ ~60 bytes qua `'thoitrang:pose'`.
- **Bundle & CDN:** Three.js nằm trọn trong chunk lazy của `ThoiTrangScreen`; `/thoitrang/*` đặt header `public, max-age=31536000, immutable` trong `render.yaml`.

## 13. Danh sách File thêm mới & Chỉnh sửa
- **Thêm mới:**
  - `shared/src/thoitrang-catalog.ts`, `shared/src/thoitrang-judge.ts`, `shared/src/thoitrang-themes.ts`, `shared/src/thoitrang.ts`
  - `server/src/games/thoitrang.ts`, `server/test/thoitrang.test.ts`
  - `app/src/thoitrang3d/{index.ts,engine.js,geo.js,mats.js,stage.js,skeleton.js,body.js,face.js,hair.js,garment_util.js,tops_outer.js,bottoms_dresses.js,shoes.js,headwear.js,accessories.js,anim.js}`
  - `app/scripts/build-thoitrang-icons.mjs`, `app/public/thoitrang/{icons.webp,icons.json}`
  - `app/src/components/{ThoiTrangDollCanvas,ThoiTrangWardrobe,ThoiTrangRunway,ThoiTrangReveal}.tsx`
  - `app/src/screens/ThoiTrangScreen.tsx`, `e2e/thoitrang.spec.mjs`
- **Chỉnh sửa đấu nối:**
  - `shared/src/types.ts` (`GameType`, `GAME_INFO`, `RoomSettings`, `GameView`, `GameAction`, `ServerToClientEvents['thoitrang:pose']`)
  - `server/src/games/engine.ts` (`emitThoiTrangPose`), `server/src/room.ts` (`configure`, `BOT_THINK_MS`, `createEngine`), `server/src/app.ts` (`freshDeck.load(THOI_TRANG_DECK)`, `onThoiTrangPose`)
  - `app/package.json` (`three`, `@types/three`, script `build:thoitrang:icons`), `app/App.tsx` (lazy `ThoiTrangScreen`), `app/src/useGame.ts` (`tt_pose`/`tt_cheer` qua `game:input` + `onThoiTrangPose`), `app/src/messages.ts` (`GAME_META`, `RULES`), `app/src/screens/{HomeScreen,LobbyScreen,ResultScreen}.tsx`, `render.yaml` (`/thoitrang/*`).

## 14. Kế hoạch Kiểm thử
- **Unit & Coverage (Vitest — `server/test/thoitrang.test.ts`):**
  1. `thoitrang-catalog`: `countVariants().total === 1_186_864`, `validateOutfit` xử lý xung đột `dress` vs `top`/`bottom`, làm sạch input rác, 100% món có ≥3 thẻ hợp lệ.
  2. `thoitrang-judge`: tất định 100%, kiểm chứng 3 mốc (AFK default ≤ 2,0★, đồ khớp một nửa ~3,5–4,0★, đồ chuẩn chủ đề + màu + hoạ tiết ≥ 4,5★), luôn có câu nhận xét tiếng Việt không rỗng.
  3. `thoitrang-themes`: `>= 628` chủ đề, 0 trùng `id`/`title`, mọi chủ đề có **≥ 12 món khớp thẻ rải trên ≥ 4 ô đồ khác nhau**.
  4. `ThoiTrangGame` server flow: đầy đủ 4 pha, rút còn 5s khi 100% ready, coalescing `tt_outfit`, chặn tự chấm, tính điểm trung bình gồm 1 phiếu Máy, phá hòa 5 tầng, AFK/mất mạng/rời phòng giữa `runway`, `FreshDeck` không lặp, Bot tự phối đồ + pose + chấm sao.
- **E2E Smoke (Playwright — `e2e/thoitrang.spec.mjs`):**
  - 2 trình duyệt thật tạo & vào phòng `thoitrang` → chọn đồ bằng lưới icon + đổi màu → xác nhận trình duyệt kia cập nhật ảnh mini-preview → bấm Xong → vào `runway`, walker bấm pose, khán giả chấm `4,5★` → xem màn `reveal` có điểm & nhận xét Giám khảo Máy → chuyển sang `ResultScreen`. Kiểm tra thêm viewport mobile (`390×844`) không tràn ngang & 0 lỗi console.

## 15. 5 Pha triển khai & Tiêu chí Done (Claude duyệt sau mỗi pha)
1. **Pha 1 — Shared Catalog, Giám khảo Máy & 628+ Chủ đề:** Hoàn thiện `shared/src/thoitrang-{catalog,judge,themes}.ts`, `shared/src/thoitrang.ts` + bộ test Vitest phần shared.
   - *Done:* `cd server && npm run typecheck && npx vitest run test/thoitrang.test.ts` xanh 100%; đủ ≥ 628 chủ đề, 100% đạt ≥ 12 món / ≥ 4 ô, `countVariants() === 1_186_864`.
2. **Pha 2 — Server Engine & Đấu nối Room/Socket:** Viết `server/src/games/thoitrang.ts`, đấu nối `types.ts`, `engine.ts`, `room.ts`, `app.ts` (`FreshDeck` + `thoitrang:pose`) + bổ sung test full-flow/AFK/tie-break/bots.
   - *Done:* Toàn bộ `cd server && npm run typecheck && npm test` xanh 100%, không hồi quy 17 game cũ.
3. **Pha 3 — Port Engine 3D ESM & Pipeline Atlas Icon WebP:** Port `proto-v2` sang `app/src/thoitrang3d/` (1 WebGL context + `dispose()` sạch), thêm `three@0.170.0`, viết `build-thoitrang-icons.mjs` để Claude chạy sinh `app/public/thoitrang/icons.{webp,json}`.
   - *Done:* `icons.webp` ≤ 600 KB, đủ 144 ô trong `icons.json`, `tsc --noEmit` ở `app/` xanh, gắn/gỡ `<DollCanvas>` 10 lần không rò rỉ WebGL context.
4. **Pha 4 — Wardrobe Icon-Grid, Runway 3D, Reveal & Đấu nối App:** Hoàn thiện `ThoiTrangWardrobe` (không preset), `ThoiTrangRunway` (9 pose + thanh 0,5★ + cheer), `ThoiTrangReveal`, `ThoiTrangScreen` (lazy), đấu nối `App.tsx`, `useGame.ts`, `HomeScreen`, `LobbyScreen`, `ResultScreen`, `render.yaml`.
   - *Done:* `cd app && npx tsc --noEmit && npx expo export --platform web --output-dir dist` xanh, Three.js tách thành chunk riêng không phình bundle khởi động.
5. **Pha 5 — E2E Playwright, Kiểm tra tải 12 người & Bàn giao:** Chạy `e2e/thoitrang.spec.mjs` (desktop + mobile) và kiểm tra phòng 12 người (1 người + 11 bot), đo FPS & VRAM.
   - *Done:* E2E xanh, toàn bộ test server xanh, 0 lỗi console, mobile ổn định ≥ 30fps.

## 16. Quyết định chốt (Claude + Neon, 2026-11-26)
- Thời gian phối đồ: `120 / 180 / 240 / 300 / 420s`, **mặc định 240s** (người dùng yêu cầu "thời gian thích hợp"; tủ đồ ~1,19 triệu biến thể).
- `ResultScreen` giữ `Portrait` 2D mặc định; bục Top 3 bằng ảnh snapshot 3D nằm ở `ThoiTrangReveal`.
- Chiêu chọc `fun:send` gây che/rung màn hình (`quake`/`blackout`/`spin`) tự chuyển sang chế độ nhẹ trong `dressing` và `runway`.
- Icon atlas dựng bằng `app/scripts/build-thoitrang-icons.mjs` qua trang harness nội bộ + Playwright (Claude chạy); ghim `"three": "0.170.0"`.
- `min: 2` người, chơi được với Bot; Giám khảo Máy luôn góp đúng 1 phiếu.
- Không có bộ đồ dựng sẵn trong game: người chơi chọn từng món qua lưới icon (chỉ có 🎲 theo từng ô).
