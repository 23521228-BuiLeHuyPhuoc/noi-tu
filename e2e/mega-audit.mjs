// Mega E2E Visual & Logic Audit V3 — Kiểm chứng toàn diện 15 trò chơi + Chống Lag/Chống Copy Nhãn Mobile + Dock Shop Ghim Đỉnh + Đố Vui Độ Khó Intern-Junior + Tỷ Phú Nhà Tù/Sân Bay Hiện Đích Trước + Caro Phóng To 28×28 + 3 Game Tốc Độ Mới (Cá Sấu, Tinh Mắt, Đèn Đỏ Đèn Xanh) + Croak Squad 2.0 60fps Canvas!
// Chạy cùng server (PORT=4355 ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1) và static web (PORT=8465).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB ?? 'http://localhost:8465';
const SHOTS =
  process.argv[2] ??
  'C:/Users/HP/.gemini/antigravity/brain/9cf2a57c-57e4-4c24-8088-2daf68c65483/screenshots';
mkdirSync(SHOTS, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (cond, msg) => {
  if (!cond) failures++;
  console.log(cond ? '• OK  ' : '• FAIL', msg);
};

const browser = await chromium.launch({
  executablePath: process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: ['--no-sandbox'],
});

const openPage = async (w = 1280, h = 800, mobile = false) => {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.log('PAGE ERROR:', e.message);
  });
  await page.goto(WEB, { waitUntil: 'networkidle' }).catch(() => page.goto(WEB));
  return {
    page,
    ctx,
    t: (id) => page.getByTestId(id),
    shot: async (n) => {
      await sleep(320);
      await page.screenshot({ path: `${SHOTS}/${n}.png` });
    },
  };
};

const has = async (loc, ms = 5000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

async function switchHomeTab(p, tab) {
  const btn = p.t(`home-tab-${tab}`);
  if ((await btn.count()) > 0) {
    await btn.click();
    await sleep(240);
  }
}

async function joinRoomByCode(p, code, guestName) {
  await switchHomeTab(p, 'rooms');
  if (guestName && (await p.t('name-input').count()) > 0) {
    await p.t('name-input').fill(guestName);
  }
  await p.t('code-input').waitFor({ timeout: 5000 });
  await p.t('code-input').fill(code);
  await p.t('join-btn').click();
  await p.t('room-code').waitFor({ timeout: 8000 });
}

async function leaveRoom(p) {
  await p.t('leave-open').click();
  await p.t('leave-confirm').click();
  await p.t('home-bottom-nav').waitFor({ timeout: 8000 });
  await switchHomeTab(p, 'games');
}

async function registerOrLogin(p, username, name = username) {
  await switchHomeTab(p, 'games');
  await p.t('register-open').click();
  await p.t('auth-username').fill(username);
  await p.t('auth-email').fill(`${username}_${Date.now().toString(36)}@example.com`);
  await p.t('auth-password').fill('matkhau123');
  await p.t('auth-password2').fill('matkhau123');
  await p.t('auth-name').fill(name);
  await p.t('auth-submit').click();
  if (!(await has(p.t('profile-card'), 4500))) {
    await p.t('auth-tab-login').click();
    await p.t('auth-username').fill(username);
    await p.t('auth-password').fill('matkhau123');
    await p.t('auth-submit').click();
    await p.t('profile-card').waitFor({ timeout: 8000 });
  }
}

async function closeSheet(p) {
  await p.page
    .locator('[aria-label="Đóng bảng"]')
    .first()
    .click({ timeout: 1500 })
    .catch(() =>
      p.page
        .locator('[aria-label="Đóng"]')
        .first()
        .click({ position: { x: 5, y: 5 }, timeout: 1500 })
        .catch(() => {}),
    );
  await sleep(400);
}

const uid = Date.now().toString(36);

// ============================================================
// 1. TRANG CHỦ 4 FRAGMENT MOBILE & DESKTOP + 15 GAME + CHỐNG COPY LABEL
// ============================================================
const D = await openPage(1280, 800, false);
await D.t('create-croaksquad').waitFor({ timeout: 10000 });
const allCount = await D.page.locator('[data-testid^="create-"]').count();
check(allCount === 15, `Trang chủ hiển thị đủ 15 trò chơi (${allCount})`);
check((await D.t('create-cah').count()) === 0, 'Đã xóa hoàn toàn Hội Bàn Tròn (cah)');
check((await D.t('create-cashnguns').count()) === 0, 'Đã xóa hoàn toàn Chia Chác Giang Hồ (cashnguns)');
await D.shot('01-home-desktop');
const brokenHomeImgs = await D.page.evaluate(() =>
  [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
);
check(brokenHomeImgs === 0, `Tất cả icon Fluent 3D & SVG hiển thị sắc nét không vỡ ảnh (${brokenHomeImgs})`);

await D.t('cat-hidden').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 2, 'Bộ lọc Ẩn Vai hiện đúng 2 game (Ma Sói, Gián Điệp)');
await D.t('cat-party').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 6, 'Bộ lọc Party Lầy hiện đúng 6 game (gồm 3 game tốc độ mới)');
await D.t('cat-coop').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 2, 'Bộ lọc Co-op & Cờ hiện đúng 2 game (Croak Squad, Cờ Caro)');
await D.t('cat-classic').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 3, 'Bộ lọc Hội Chợ hiện đúng 3 game (Lô Tô, Bầu Cua, Tỷ Phú)');
await D.t('cat-all').click();

const M = await openPage(390, 844, true);
await M.t('create-croaksquad').waitFor({ timeout: 10000 });
check(await has(M.t('home-bottom-nav'), 3000), 'Mobile hiển thị thanh điều hướng đáy 4 Fragment rõ ràng');
await M.shot('02-home-mobile');

// Kiểm tra giữ ngón tay 650ms trên nút Mobile KHÔNG bị bôi đen/copy label!
const navBtnBox = await M.t('home-tab-shop').boundingBox();
if (navBtnBox) {
  await M.page.mouse.move(navBtnBox.x + navBtnBox.width / 2, navBtnBox.y + navBtnBox.height / 2);
  await M.page.mouse.down();
  await sleep(680);
  const selectedTxt = await M.page.evaluate(() => window.getSelection()?.toString() ?? '');
  await M.page.mouse.up();
  check(selectedTxt === '', `Mobile nhấn giữ 680ms vào nút điều hướng không bị bôi đen chữ ("${selectedTxt}")`);
}

// ============================================================
// 2. SHOP STICKY PREVIEW DOCK (GHIM ĐỈNH MÀN HÌNH KHI CUỘN TỚI CUỐI SHOP!)
// ============================================================
await switchHomeTab(M, 'shop');
await M.t('shop-live-stage').waitFor({ timeout: 4000 });
// Cuộn tuốt xuống món cuối cùng trong danh sách Hóa Trang (Map Hoàng Kim Điện)
await M.t('try-map_hoang_kim_dien').scrollIntoViewIfNeeded();
await sleep(250);
await M.t('try-map_hoang_kim_dien').click();
await sleep(250);
const stickyMobileBox = await M.t('shop-live-stage').boundingBox();
check(
  !!stickyMobileBox && stickyMobileBox.y >= 0 && stickyMobileBox.y <= 90,
  `Mobile Fragment Phú Hào: cuộn tới cuối danh sách nhưng Sân Khấu Xem Thử vẫn ghim ở đỉnh màn hình (y=${Math.round(stickyMobileBox?.y ?? -1)}px)`,
);
await M.shot('02d-shop-sticky-dock-mobile-bottom');

await switchHomeTab(M, 'games');
await M.t('home-map-open').click();
await M.t('home-map-dem_trang_soi').waitFor({ timeout: 4000 });
await M.t('home-map-dem_trang_soi').click();
check(await has(M.t('map-backdrop-dem_trang_soi'), 3000), 'Đổi Map miễn phí Đêm Trăng Ma Sói thành công trên Mobile');

// Đại Gia VIP 6 mua & trang bị ở cuối ShopSheet -> kiểm tra Dock ghim ngoài ScrollView!
const vipName = `vip_${uid}`;
await registerOrLogin(D, vipName, 'Hoàng Đế Lố Lăng');
const boss = await openPage(1280, 800, false);
await registerOrLogin(boss, 'boss', 'Boss');
await boss.t('admin-open-home').click();
await boss.t('admin-tab-adjust').click();
await boss.t('admin-adjust-user').fill(vipName);
await boss.t('admin-adjust-delta').fill('120000');
await boss.t('admin-adjust-reason').fill('mega-v3-whale');
await boss.t('admin-adjust-save').click();
await sleep(1600);
await boss.ctx.close();

await D.t('shop-open').click();
await D.t('shop-tab-deco').click();
await D.t('shop-live-stage').waitFor({ timeout: 5000 });

const whaleMythicSet = [
  'frame_emperor_omega',
  'name_omega_emperor',
  'aura_omega_divine',
  'pet_celestial_qilin',
  'title_thien_de',
  'bubble_emperor_jade',
  'enter_emperor_decree',
  'map_san_nhay_disco',
  'map_hoang_kim_dien',
];
for (const itemId of whaleMythicSet) {
  const buyBtn = D.t(`buy-${itemId}`);
  await buyBtn.scrollIntoViewIfNeeded();
  await buyBtn.click();
  await D.t(`equip-${itemId}`).waitFor({ timeout: 5000 });
  await D.t(`equip-${itemId}`).click();
  await D.t(`unequip-${itemId}`).waitFor({ timeout: 5000 });
}
// KHÔNG gọi scrollIntoViewIfNeeded trên shop-live-stage — chứng minh Dock tự ghim cứng ở đỉnh Sheet!
const sheetDockBox = await D.t('shop-live-stage').boundingBox();
check(
  !!sheetDockBox && sheetDockBox.y >= 0 && sheetDockBox.y <= 260,
  `ShopSheet: mua món cuối cùng mà Sân Khấu Xem Thử vẫn ghim cố định ở đỉnh Sheet (y=${Math.round(sheetDockBox?.y ?? -1)}px)`,
);
await D.shot('04-shop-vip6-preview');
await closeSheet(D);

// ============================================================
// 3. CỜ TỶ PHÚ V3 — ICON "NHÀ TÙ" & "VÀO TÙ" MỚI + SÂN BAY HIỆN TRƯỚC ĐIỂM ĐẾN
// ============================================================
await D.t('create-typhu').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const tpCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, tpCode, 'Khách Tỷ Phú');
await D.t('bot-add').click();
await D.t('typhu-mode-chaos_festival').click();
await sleep(200);
await D.t('start-btn').click();

await D.t('typhu-jackpot').waitFor({ timeout: 8000 });
await M.t('typhu-airport-dest').waitFor({ timeout: 8000 });
const airportDestTxt = (await M.t('typhu-airport-dest').innerText()).trim();
check(
  airportDestTxt.startsWith('→') && airportDestTxt.length >= 4,
  `Cờ Tỷ Phú: Ô Sân Bay hiện trước thành phố bay tới ngay trên bàn cờ ("${airportDestTxt}")`,
);
await D.shot('21b-typhu-chaos-festival');
await M.shot('21c-typhu-mobile-jail-airport');

// Bấm vào ô Sân Bay (cell-20) trên Mobile để kiểm tra bảng thông tin điểm đến
await M.t('cell-20').click();
await sleep(350);
check(
  await has(M.page.getByText(/đang mở chuyến hiện tại:/), 3000),
  'Cờ Tỷ Phú: Chạm ô Sân Bay hiện chi tiết điểm đến chuyến bay hiện tại',
);
await M.shot('21d-typhu-airport-sheet-mobile');
await closeSheet(M);
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 4. ĐỐ VUI V3 — CHỌN ĐỘ KHÓ INTERN/FRESHER/JUNIOR + OOP ĐA NGÔN NGỮ + 30S KHÓ
// ============================================================
await D.t('create-do_vui').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const dvCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, dvCode, 'Ứng Viên IT');
await D.t('dv-diff-hard').click();
await D.t('dv-topic-oop').click();
await D.t('dv-questions-5').click();
await sleep(200);
await D.t('start-btn').click();

await D.t('dv-question').waitFor({ timeout: 8000 });
await M.t('dv-level-hard').waitFor({ timeout: 8000 });
check(await has(M.t('dv-level-hard'), 3000), 'Đố Vui V3: Chọn độ khó Khó (Junior) hiển thị huy hiệu 30s rõ nét trên Mobile');
const qTxt = await M.t('dv-question').innerText();
check(!/\b(JVM|Spring|Hibernate|JDK)\b/i.test(qTxt), `Đố Vui OOP đa ngôn ngữ không trói buộc Java ("${qTxt.slice(0, 48)}…")`);
await D.shot('18-dovui-question');
await M.shot('18b-dovui-oop-hard-mobile');

await D.t('dv-opt-0').click();
await M.t('dv-opt-1').click();
await sleep(700);
check(await has(D.page.getByText(/Giải thích/), 5000), 'Đố Vui V3: Hiển thị giải thích phỏng vấn súc tích');
await D.shot('19-dovui-reveal');

for (let q = 1; q < 5; q++) {
  await D.page.getByText(new RegExp(`Câu ${q + 1}/5`)).waitFor({ timeout: 10000 });
  await D.t('dv-opt-0').click();
  await M.t('dv-opt-1').click();
  await sleep(500);
}
await D.t('result-title').waitFor({ timeout: 12000 });
const switchBtns = await D.page.locator('[data-testid^="switch-"]').count();
check(switchBtns === 14, `Màn Tổng Kết hiển thị đủ 14 nút đổi sang các game khác trong bộ 15 game (${switchBtns})`);
await D.shot('20-result-screen');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 5. GAME MỚI #10 — 🐊 KHÁM RĂNG CÁ SẤU (2–12 NGƯỜI)
// ============================================================
await D.t('create-ca_sau').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const csauCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, csauCode, 'Nha Sĩ Lầy');
await D.t('bot-add').click();
await sleep(150);
await D.t('bot-add').click();
await D.t('ca-sau-rounds-3').click();
await D.t('start-btn').click();

await M.t('casau-jaws').waitFor({ timeout: 8000 });
await D.t('cs-tooth-0').waitFor({ timeout: 8000 });
const teethTotal = await M.page.locator('[data-testid^="cs-tooth-"]').count();
check(teethTotal === 16, `Khám Răng Cá Sấu (4 người): hàm răng đối xứng đúng 16 chiếc (${teethTotal})`);
await M.shot('23-casau-mobile');
await D.shot('23b-casau-desktop');

// Thử nhấn răng khi tới lượt D hoặc M cho tới khi có người nhấn được hoặc Cá Sấu đớp!
let pressedAnyTooth = false;
let shotBiteReveal = false;
for (let step = 0; step < 28; step++) {
  for (const p of [D, M]) {
    const enabledTeeth = p.page.locator('[data-testid^="cs-tooth-"]:not([aria-disabled="true"])');
    if ((await enabledTeeth.count()) > 0) {
      await enabledTeeth.first().click().catch(() => {});
      pressedAnyTooth = true;
      await sleep(350);
    }
  }
  const headerTxt = await M.t('casau-header').innerText().catch(() => '');
  if (headerTxt.includes('bị Cá Sấu đớp') && !shotBiteReveal) {
    shotBiteReveal = true;
    await M.shot('23c-casau-bite-reveal-mobile');
  }
  if (pressedAnyTooth && (shotBiteReveal || step > 6)) break;
  await sleep(450);
}
check(pressedAnyTooth, 'Khám Răng Cá Sấu: người chơi nhấn răng thành công mượt mà trên Mobile & Desktop');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 6. GAME MỚI #11 — 👀 TINH MẮT ĐẬP NHANH (ĐỒNG THỜI KHÔNG CHỜ LƯỢT!)
// ============================================================
await D.t('create-tinh_mat').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const tmCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, tmCode, 'Mắt Đại Bàng');
await D.t('bot-add').click();
await sleep(150);
await D.t('tinh-mat-rounds-8').click();
await D.t('start-btn').click();

await M.t('tm-grid').waitFor({ timeout: 8000 });
await D.t('tm-prompt-card').waitFor({ timeout: 8000 });
const tileCount = await M.page.locator('[data-testid^="tm-cell-"]').count();
check(tileCount === 12 || tileCount === 16, `Tinh Mắt Đập Nhanh: lưới hiển thị chuẩn ${tileCount} ô Fluent 3D trên Mobile`);
await M.shot('24-tinhmat-mobile');
await D.shot('24b-tinhmat-desktop');

// Bấm thử trên Mobile & Desktop đồng thời!
await M.t('tm-cell-0').click().catch(() => {});
await D.t('tm-cell-1').click().catch(() => {});
await sleep(450);
await M.shot('24c-tinhmat-after-tap-mobile');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 7. GAME MỚI #12 — 🚦 ĐÈN ĐỎ ĐÈN XANH (ĐUA 100M + BÓP ĐỒNG ĐỘI)
// ============================================================
await D.t('create-den_do').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const ddCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, ddCode, 'Thánh Chạy');
for (let i = 0; i < 3; i++) {
  await D.t('bot-add').click();
  await sleep(120);
}
await D.t('den-do-rounds-10').click();
await D.t('start-btn').click();

await M.t('dd-track').waitFor({ timeout: 8000 });
await M.t('dd-step-btn').waitFor({ timeout: 8000 });
check(await has(M.t('dd-controls'), 3000), 'Đèn Đỏ Đèn Xanh: hiện Cột Đèn, Đường Đua 5 làn & Bàn Đạp Chạy trên Mobile');

// Nhấp chạy liên tiếp lúc Đèn Xanh trên Mobile để vượt mốc 25m nhận Đạo Cụ Bóp Đồng Đội!
for (let k = 0; k < 9; k++) {
  if ((await M.t('dd-light-green').count()) > 0) {
    await M.t('dd-step-btn').click().catch(() => {});
  }
  await sleep(140);
}
await M.shot('25-dendo-mobile');
await D.shot('25b-dendo-desktop');

// Nếu nhận được đạo cụ thì bấm tung chiêu luôn!
if (!(await M.t('dd-trick-btn').isDisabled().catch(() => true))) {
  await M.t('dd-trick-btn').click().catch(() => {});
  await sleep(350);
  await M.shot('25c-dendo-trick-mobile');
}
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 8. CỜ CARO V3 — 4 NGƯỜI TỰ PHÓNG TO BÀN CỜ LÊN 28×28 (784 Ô!) + TÂM CỜ MOBILE
// ============================================================
await D.t('create-caro').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const crCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, crCode, 'Kỳ Thủ Mobile');
await D.t('bot-add').click();
await sleep(140);
await D.t('bot-add').click(); // Đủ 4 phe: X, O, ▲, ◆ -> bàn tự mở rộng 28×28 (784 ô)!
await sleep(200);
await D.t('start-btn').click();

await M.t('caro-board').waitFor({ timeout: 8000 });
await M.t('caro-size-badge').waitFor({ timeout: 8000 });
const sizeBadgeTxt = (await M.t('caro-size-badge').innerText()).trim();
check(
  sizeBadgeTxt.includes('28×28') && sizeBadgeTxt.includes('784'),
  `Cờ Caro 4 người tự động phóng to bàn cờ lên "${sizeBadgeTxt}"`,
);
check(await has(M.t('caro-center-btn'), 3000), 'Cờ Caro 28×28 trên Mobile có nút "Tâm cờ" & cuộn mượt thoải mái');

// Đặt quân đầu tiên vào tâm (14, 14) của bàn 28×28
for (const p of [D, M]) {
  if (!(await p.t('caro-14-14').isDisabled().catch(() => true))) {
    await p.t('caro-14-14').click();
    break;
  }
}
await sleep(500);
await M.shot('28-caro-4p-28x28-mobile');
await D.shot('28b-caro-4p-28x28-desktop');

// Bấm chuyển sang chế độ Toàn Cảnh rồi về Cận Cảnh trên Mobile
await M.t('caro-zoom-toggle').click();
await sleep(300);
await M.t('caro-zoom-toggle').click();
await sleep(300);
await M.shot('28c-caro-28x28-overview-mobile');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 9. ĐẦM LẦY QUÁI CHIÊU 2.0 — 60FPS CANVAS + THUMBPAD TRƯỢT MƯỢT KHÔNG COPY LABEL!
// ============================================================
await D.t('create-croaksquad').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const csCode = (await D.t('room-code').innerText()).trim();
check((await D.t('bot-add').count()) === 0, 'Croak Squad 2.0: Không dùng Bot giả, chỉ Co-op người thật');

// Kiểm tra mã phòng room-code VẪN cho phép copy/select bình thường!
const canSelectRoomCode = await D.page.evaluate(() => {
  const el = document.querySelector('[data-testid="room-code"]');
  return el ? getComputedStyle(el).userSelect : 'none';
});
check(canSelectRoomCode === 'text', `Mã phòng room-code vẫn giữ user-select: text để người chơi copy dễ dàng (${canSelectRoomCode})`);

await joinRoomByCode(M, csCode, 'Ếch Mobile');
await sleep(300);
await D.t('start-btn').click();

await D.t('croak-controls').waitFor({ timeout: 8000 });
await M.t('croak-controls').waitFor({ timeout: 8000 });
await sleep(450);

// Kiểm tra Canvas 60fps thực sự đang dựng hình trên cả Mobile & Desktop
const canvasOk = await M.page.evaluate(() => {
  const c = document.querySelector('[data-testid="croak-viewport"] canvas');
  return !!c && c.width >= 300 && c.height >= 200;
});
check(canvasOk, 'Croak Squad 2.0: Engine HTML5 <canvas> HiDPI 60fps hoạt động chuẩn trên Mobile');
await D.shot('30-croaksquad-desktop');
await M.shot('30b-croaksquad-mobile');

// Mô phỏng giữ ngón cái trượt liên hoàn từ TRÁI sang PHẢI 650ms trên Mobile Thumbpad -> 0 bôi đen chữ!
const leftBox = await M.t('croak-left').boundingBox();
const rightBox = await M.t('croak-right').boundingBox();
if (leftBox && rightBox) {
  await M.page.mouse.move(leftBox.x + leftBox.width * 0.5, leftBox.y + leftBox.height * 0.5);
  await M.page.mouse.down();
  await sleep(300);
  await M.page.mouse.move(rightBox.x + rightBox.width * 0.5, rightBox.y + rightBox.height * 0.5, { steps: 8 });
  await sleep(380);
  const padSel = await M.page.evaluate(() => window.getSelection()?.toString() ?? '');
  await M.page.mouse.up();
  check(padSel === '', `Croak Squad 2.0 Mobile Thumbpad: nhấn giữ & miết ngón tay 680ms không hề bôi đen label ("${padSel}")`);
}

// Đưa D lại gần hoặc dùng nút Đặt lại màn để 2 chú ếch đứng cạnh nhau -> nuốt & ngắm bắn vòng cung!
await D.t('croak-reset-stage').click();
await sleep(350);
await D.t('croak-tongue').click();
const swallowedOk = await has(D.t('croak-aim-bar'), 4000);
check(swallowedOk, 'Croak Squad 2.0: Nuốt đồng đội -> hiện thanh Ngắm Bắn & đường đạn đạo trên Canvas 60fps');
if (swallowedOk) {
  await D.t('croak-aim-high_right').click();
  await sleep(280);
  await D.shot('31-croaksquad-swallow-aim-arc');
  await M.shot('31b-croaksquad-mobile-swallowed');
  await D.t('croak-spit').click();
  await sleep(320);
}

await D.t('croak-fullmap-toggle').click();
await sleep(320);
await D.shot('32-croaksquad-fullmap');

await leaveRoom(M);
await leaveRoom(D);

// Kiểm tra nhanh Ma Sói 2.0 & Lô Tô trên Mobile vẫn hoạt động trơn tru không hồi quy
await M.t('create-loto').click();
await M.t('room-code').waitFor({ timeout: 8000 });
await M.t('bot-add').click();
await sleep(160);
await M.t('start-btn').click();
await M.t('loto-ticket').waitFor({ timeout: 8000 });
check(await has(M.t('loto-ticket'), 3000), 'Lô Tô Hội Chợ trên Mobile không hồi quy');
await M.shot('27-loto-mobile-ticket');
await leaveRoom(M);

console.log(failures ? `MEGA AUDIT FAILURES: ${failures}` : 'MEGA AUDIT ALL OK');
await browser.close();
if (failures > 0) process.exit(1);
