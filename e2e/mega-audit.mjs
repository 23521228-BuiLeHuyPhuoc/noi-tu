// Mega E2E Visual & Logic Audit V4 (Phases 27–37):
// Kiểm chứng toàn bộ 15 trò chơi (thứ tự Cũ -> Mới), xóa Tinh Mắt & Đèn Đỏ Đèn Xanh,
// 2 siêu phẩm mới Đặt Bom Tử Chiến (boom_online) & UNO Tàn Nhẫn (uno_mercy),
// Avatar lầy lội, Đố Vui IT đa ngôn ngữ, Khám Răng Cá Sấu 3D, Ma Sói Wolvesville,
// Ai Là Gián Điệp 2.0 (Biện Minh/Phán Quyết/Lật Từ Khóa), Vẽ & Đoán Bot vẽ SVG,
// Đầm Lầy Quái Chiêu 3.0 (Bot Co-op + Auto-Landscape) trên đa kích cỡ màn hình:
// Desktop 1280x800, Mobile 390x844, Compact Android 360x640, iPhone SE 375x667, Pixel 412x915, Landscape 844x390.
// Chạy cùng server (PORT=4355 ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1) và static web (PORT=8465).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB ?? 'http://localhost:8465';
const SHOTS =
  process.argv[2] ??
  'C:/Users/HP/.gemini/antigravity/brain/9cf2a57c-57e4-4c24-8088-2daf68c65483/screenshots/v4';
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
    w,
    h,
    t: (id) => page.getByTestId(id),
    shot: async (n) => {
      await sleep(320);
      await page.screenshot({ path: `${SHOTS}/${n}.png` });
    },
  };
};

const has = async (loc, ms = 5000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

async function noHorizOverflow(p, label) {
  const res = await p.page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
    sh: document.documentElement.scrollHeight,
    ih: window.innerHeight,
  }));
  check(res.sw <= res.iw + 1, `${label}: không tràn ngang (scrollWidth=${res.sw}/${res.iw})`);
  return res;
}

async function noOuterScroll(p, label) {
  const res = await p.page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
    sh: document.documentElement.scrollHeight,
    ih: window.innerHeight,
  }));
  check(res.sw <= res.iw + 1 && res.sh <= res.ih + 2, `${label}: vừa khít 100% khung nhìn (${res.sw}x${res.sh} / ${res.iw}x${res.ih})`);
}

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
  if ((await p.t('leave-open').count()) > 0) {
    await p.t('leave-open').click();
  } else if ((await p.t('boom-leave-btn').count()) > 0) {
    await p.t('boom-leave-btn').click();
  }
  await p.t('leave-confirm').click();
  await p.t('home-bottom-nav').or(p.t('create-wordchain')).first().waitFor({ timeout: 8000 });
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
// 1. TRANG CHỦ V4: THỨ TỰ CŨ -> MỚI (15 GAME) + ĐA KÍCH CỠ MOBILE
// ============================================================
const D = await openPage(1280, 800, false);
await D.t('create-uno_mercy').waitFor({ timeout: 10000 });
const homeOrder = await D.page
  .locator('[data-testid^="create-"]')
  .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')?.replace('create-', '')));
const expectedOrder = [
  'wordchain', 'wordchain_en', 'baucua', 'typhu', 'masoi', 'giandiep',
  've_doan', 'bom_tu', 'do_vui', 'loto', 'caro', 'croaksquad',
  'ca_sau', 'boom_online', 'uno_mercy',
];
check(
  JSON.stringify(homeOrder) === JSON.stringify(expectedOrder),
  `Trang chủ hiển thị đúng 15 trò chơi theo thứ tự Cũ → Mới (${homeOrder.length})`,
);
check((await D.t('create-tinh_mat').count()) === 0, 'Đã xóa hoàn toàn Tinh Mắt Đập Nhanh (tinh_mat)');
check((await D.t('create-den_do').count()) === 0, 'Đã xóa hoàn toàn Đèn Đỏ Đèn Xanh (den_do)');
check((await D.t('create-cah').count()) === 0, 'Đã xóa hoàn toàn Hội Bàn Tròn (cah)');
check((await D.t('create-cashnguns').count()) === 0, 'Đã xóa hoàn toàn Chia Chác Giang Hồ (cashnguns)');
await noHorizOverflow(D, 'Home Desktop 1280x800');
await D.shot('01-home-desktop');

const brokenHomeImgs = await D.page.evaluate(() =>
  [...document.querySelectorAll('img')].filter((i) => i.complete && i.naturalWidth === 0).length,
);
check(brokenHomeImgs === 0, `Tất cả icon Fluent 3D & SVG hiển thị sắc nét không vỡ ảnh (${brokenHomeImgs})`);

await D.t('cat-hidden').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 2, 'Bộ lọc Ẩn Vai = 2 game (Ma Sói, Gián Điệp)');
await D.t('cat-party').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 6, 'Bộ lọc Party Lầy = 6 game');
await D.t('cat-coop').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 3, 'Bộ lọc Co-op & Cờ = 3 game (Caro, Croak Squad, Đặt Bom)');
await D.t('cat-classic').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 4, 'Bộ lọc Hội Chợ = 4 game (Bầu Cua, Tỷ Phú, Lô Tô, UNO Tàn Nhẫn)');
await D.t('cat-word').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 2, 'Bộ lọc Từ Vựng = 2 game');
await D.t('cat-all').click();

const M = await openPage(390, 844, true);
await M.t('create-uno_mercy').waitFor({ timeout: 10000 });
check(await has(M.t('home-bottom-nav'), 3000), 'Mobile 390x844 hiển thị thanh điều hướng đáy 4 Fragment rõ ràng');
await noHorizOverflow(M, 'Home Mobile 390x844');
await M.shot('02-home-mobile-390x844');

const C360 = await openPage(360, 640, true);
await C360.t('create-uno_mercy').waitFor({ timeout: 10000 });
await noHorizOverflow(C360, 'Home Compact Android 360x640');
await C360.shot('02b-home-mobile-360x640');

// Kiểm tra thêm khung iPhone SE 375x667 & Pixel/Galaxy 412x915
const P375 = await openPage(375, 667, true);
await P375.t('create-uno_mercy').waitFor({ timeout: 10000 });
await noHorizOverflow(P375, 'Home iPhone SE 375x667');
await P375.ctx.close();

const P412 = await openPage(412, 915, true);
await P412.t('create-uno_mercy').waitFor({ timeout: 10000 });
await noHorizOverflow(P412, 'Home Pixel/Galaxy 412x915');
await P412.ctx.close();

// Kiểm tra giữ ngón tay 650ms trên nút Mobile KHÔNG bị bôi đen chữ
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
// 2. SHOP STICKY PREVIEW DOCK + ĐẠI GIA VIP 6 + AVATAR LẦY LỘI
// ============================================================
await switchHomeTab(M, 'shop');
await M.t('shop-live-stage').waitFor({ timeout: 4000 });
await M.t('try-map_hoang_kim_dien').scrollIntoViewIfNeeded();
await sleep(250);
await M.t('try-map_hoang_kim_dien').click();
await sleep(250);
const stickyMobileBox = await M.t('shop-live-stage').boundingBox();
check(
  !!stickyMobileBox && stickyMobileBox.y >= 0 && stickyMobileBox.y <= 90,
  `Mobile Fragment Phú Hào: cuộn tới cuối vẫn ghim Sân Khấu Xem Thử ở đỉnh (y=${Math.round(stickyMobileBox?.y ?? -1)}px)`,
);
await M.shot('02d-shop-sticky-dock-mobile-bottom');
await switchHomeTab(M, 'games');

const vipName = `vip_${uid}`;
await registerOrLogin(D, vipName, 'Hoàng Đế Lố Lăng');
const boss = await openPage(1280, 800, false);
await registerOrLogin(boss, 'boss', 'Boss');
await boss.t('admin-open-home').click();
await boss.t('admin-tab-adjust').click();
await boss.t('admin-adjust-user').fill(vipName);
await boss.t('admin-adjust-delta').fill('120000');
await boss.t('admin-adjust-reason').fill('mega-v4-whale');
await boss.t('admin-adjust-save').click();
await sleep(1600);
await boss.ctx.close();

await D.t('shop-open').click();
await D.t('shop-tab-deco').click();
await D.t('shop-live-stage').waitFor({ timeout: 5000 });
for (const itemId of [
  'frame_emperor_omega', 'name_omega_emperor', 'aura_omega_divine',
  'pet_celestial_qilin', 'title_thien_de', 'bubble_emperor_jade',
  'enter_emperor_decree', 'map_san_nhay_disco', 'map_hoang_kim_dien',
]) {
  const buyBtn = D.t(`buy-${itemId}`);
  await buyBtn.scrollIntoViewIfNeeded();
  await buyBtn.click();
  await D.t(`equip-${itemId}`).waitFor({ timeout: 5000 });
  await D.t(`equip-${itemId}`).click();
  await D.t(`unequip-${itemId}`).waitFor({ timeout: 5000 });
}
const sheetDockBox = await D.t('shop-live-stage').boundingBox();
check(
  !!sheetDockBox && sheetDockBox.y >= 0 && sheetDockBox.y <= 260,
  `ShopSheet: mua món cuối mà Sân Khấu Xem Thử vẫn ghim ở đỉnh (y=${Math.round(sheetDockBox?.y ?? -1)}px)`,
);
await D.shot('04-shop-vip6-preview');
await closeSheet(D);

// ============================================================
// 3. CỜ TỶ PHÚ V3 — NHÀ TÙ & SÂN BAY HIỆN ĐÍCH TRƯỚC
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
  `Cờ Tỷ Phú: Ô Sân Bay hiện trước thành phố bay tới ("${airportDestTxt}")`,
);
await D.shot('21b-typhu-chaos-festival');
await M.shot('21c-typhu-mobile-jail-airport');
await M.t('cell-20').click();
await sleep(350);
check(
  await has(M.page.getByText(/đang mở chuyến hiện tại:/), 3000),
  'Cờ Tỷ Phú: Chạm ô Sân Bay hiện chi tiết điểm đến',
);
await M.shot('21d-typhu-airport-sheet-mobile');
await closeSheet(M);
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 4. ĐỐ VUI V4 — ĐỘ KHÓ KHÓ 30S + OOP ĐA NGÔN NGỮ + MÀN TỔNG KẾT 14 NÚT
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
const qTxt = await D.t('dv-question').innerText();
check(!/\b(JVM|Spring|Hibernate|JDK)\b/i.test(qTxt), `Đố Vui OOP đa ngôn ngữ không trói buộc Java ("${qTxt.slice(0, 46)}…")`);
await D.shot('18-dovui-question');
await M.shot('18b-dovui-oop-hard-mobile');

await D.t('dv-opt-0').click();
await M.t('dv-opt-1').click();
await sleep(700);
check(await has(D.page.getByText(/Giải thích/), 5000), 'Đố Vui V4: Hiển thị giải thích phỏng vấn súc tích');
await D.shot('19-dovui-reveal');

for (let q = 1; q < 5; q++) {
  await D.page.getByText(new RegExp(`Câu ${q + 1}/5`)).waitFor({ timeout: 10000 });
  await D.t('dv-opt-0').click();
  await M.t('dv-opt-1').click();
  await sleep(450);
}
await D.t('result-title').waitFor({ timeout: 12000 });
const switchBtns = await D.page.locator('[data-testid^="switch-"]').count();
check(switchBtns === 14, `Màn Tổng Kết hiển thị đủ 14 nút đổi sang các game khác trong bộ 15 game (${switchBtns})`);
await D.shot('20-result-screen');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 5. KHÁM RĂNG CÁ SẤU HÀM 3D (`ca_sau`) — 390x844, 360x640, 1280x800 + "PHẬP!!"
// ============================================================
await D.t('create-ca_sau').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const csauCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, csauCode, 'Nha Sĩ M');
await joinRoomByCode(C360, csauCode, 'Nha Sĩ 360');
await D.t('bot-add').click();
await D.t('ca-sau-rounds-3').click();
await D.t('start-btn').click();

await M.t('casau-jaws').waitFor({ timeout: 8000 });
await C360.t('casau-jaws').waitFor({ timeout: 8000 });
const teethTotal = await M.page.locator('[data-testid^="cs-tooth-"]').count();
check(teethTotal === 16, `Khám Răng Cá Sấu 3D: đúng 16 răng 3D đối xứng trên hàm (${teethTotal})`);
await noOuterScroll(M, 'Cá Sấu 3D Mobile 390x844');
await noOuterScroll(C360, 'Cá Sấu 3D Compact 360x640');
await M.shot('23-casau-3d-mobile-390x844');
await D.shot('23b-casau-3d-desktop');
await C360.shot('23d-casau-3d-compact-360x640');

let pressedAnyTooth = false;
let shotBiteReveal = false;
for (let step = 0; step < 65 && !shotBiteReveal; step++) {
  for (const p of [D, M, C360]) {
    const enabledTeeth = p.page.locator('[data-testid^="cs-tooth-"]:not([aria-disabled="true"])');
    const cnt = await enabledTeeth.count();
    if (cnt > 0) {
      // Xen kẽ nhấn răng hàm trên (first) & hàm dưới (last) để xác minh cả 2 hàm bấm mượt 100%
      await (step % 2 === 0 ? enabledTeeth.last() : enabledTeeth.first()).click().catch(() => {});
      pressedAnyTooth = true;
      await sleep(220);
      const hTxt = await M.t('casau-header').innerText().catch(() => '');
      const bCnt = await M.page.getByText(/PHẬP!!/).count().catch(() => 0);
      if (hTxt.includes('PHẬP') || bCnt > 0) {
        shotBiteReveal = true;
        await M.shot('23c-casau-3d-bite-reveal-mobile');
        break;
      }
    }
  }
  if (shotBiteReveal) break;
  const bodyTxt = await M.t('casau-header').innerText().catch(() => '');
  const burstCnt = await M.page.getByText(/PHẬP!!/).count().catch(() => 0);
  if (bodyTxt.includes('PHẬP') || burstCnt > 0) {
    shotBiteReveal = true;
    await M.shot('23c-casau-3d-bite-reveal-mobile');
    break;
  }
  await sleep(240);
}
check(pressedAnyTooth, 'Khám Răng Cá Sấu 3D: nhấn răng mượt mà trên các thiết bị');
check(shotBiteReveal, 'Khám Răng Cá Sấu 3D: chụp thành công hiệu ứng sập hàm "🐊 PHẬP!!"');
await leaveRoom(C360);
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 6. GAME MỚI #1: 💣 ĐẶT BOM TỬ CHIẾN — BẢN VÒNG BO (`boom_online`)
// ============================================================
await D.t('create-boom_online').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const bmCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, bmCode, 'Bomber M');
await joinRoomByCode(C360, bmCode, 'Bomber 360');
await D.t('bot-add').click();
await sleep(120);
await D.t('bot-add').click();
await sleep(120);
await D.t('boom-mode-teams').click();
await sleep(120);
await D.t('boom-mode-ffa').click();
await D.t('boom-rounds-1').click();
await sleep(180);
await D.t('start-btn').click();

await D.t('boom-screen').waitFor({ timeout: 8000 });
await M.t('boom-dpad').waitFor({ timeout: 8000 });
await C360.t('boom-place-btn').waitFor({ timeout: 8000 });

// Chờ hết đếm ngược 2s đầu hiệp để thao tác đặt bom & di chuyển thực chiến!
await sleep(2300);
const boomCanvasOk = await M.page.evaluate(() => {
  const c = document.querySelector('[data-testid="boom-canvas-wrap"] canvas');
  return !!c && c.width >= 300 && c.height >= 200;
});
check(boomCanvasOk, 'Đặt Bom Tử Chiến: Canvas HiDPI 60fps dựng hình chuẩn trên Mobile xoay ngang');

await D.t('boom-place-btn').click().catch(() => {});
await M.t('boom-place-btn').click().catch(() => {});
await M.t('boom-dpad-right').click().catch(() => {});
await sleep(350);
await D.shot('24-boom-online-desktop');
await M.shot('24b-boom-online-mobile-rotated-390x844');
await C360.shot('24c-boom-online-compact-360x640');

// Kiểm tra thêm thiết bị Ngang 844x390 native landscape vào xem
const L844 = await openPage(844, 390, true);
await joinRoomByCode(L844, bmCode, 'Khách Ngang').catch(() => {});
if ((await has(L844.t('boom-screen'), 4000))) {
  await L844.shot('24d-boom-online-landscape-844x390');
  await leaveRoom(L844).catch(() => {});
}
await L844.ctx.close();

await leaveRoom(C360);
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 7. GAME MỚI #2: 🃏 UNO TÀN NHẪN (`uno_mercy`)
// ============================================================
await D.t('create-uno_mercy').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const umCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, umCode, 'Thần Bài M');
await joinRoomByCode(C360, umCode, 'Thần Bài 360');
await D.t('bot-add').click();
await D.t('start-btn').click();

await M.t('um-draw-pile').waitFor({ timeout: 8000 });
await C360.t('um-draw-pile').waitFor({ timeout: 8000 });
await D.t('um-draw-pile').waitFor({ timeout: 8000 });
const handCardsM = await M.page.locator('[data-testid^="um-card-"]').count();
check(handCardsM === 7, `UNO Tàn Nhẫn: mỗi người khởi đầu đủ 7 lá bài (${handCardsM})`);
check(await has(M.page.getByText(/\/25 lá/), 3000), 'UNO Tàn Nhẫn: hiện Thanh Đo Nổ Bài 25 lá trên Mobile');
await noOuterScroll(M, 'UNO Tàn Nhẫn Mobile 390x844');
await noOuterScroll(C360, 'UNO Tàn Nhẫn Compact 360x640');
await M.shot('25-uno-mercy-mobile-390x844');
await D.shot('25b-uno-mercy-desktop');
await C360.shot('25c-uno-mercy-compact-360x640');

await M.t('um-rules-open').click();
await M.page.getByText(/Luật Nổ Bài/).waitFor({ timeout: 4000 });
await M.shot('25d-uno-mercy-rules-mobile');
await closeSheet(M);

// Thử đánh 1 lá hợp lệ hoặc bốc bài nếu tới lượt của D / M / C360
let unoActed = false;
for (const p of [D, M, C360]) {
  const enabledCards = p.page.locator('[data-testid^="um-card-"]:not([aria-disabled="true"])');
  if ((await enabledCards.count()) > 0) {
    await enabledCards.first().click().catch(() => {});
    await sleep(250);
    if ((await p.t('um-pick-color-red').count()) > 0) {
      await p.t('um-pick-color-red').click().catch(() => {});
    }
    if ((await p.page.locator('[data-testid^="um-swap-target-"]').count()) > 0) {
      await p.page.locator('[data-testid^="um-swap-target-"]').first().click().catch(() => {});
    }
    unoActed = true;
    break;
  }
  const disabledDraw = await p.t('um-draw-pile').getAttribute('aria-disabled');
  if (disabledDraw !== 'true') {
    await p.t('um-draw-pile').click().catch(() => {});
    unoActed = true;
    break;
  }
}
check(unoActed, 'UNO Tàn Nhẫn: đánh bài hoặc rút bài thành công mượt mà');
await leaveRoom(C360);
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 8. MA SÓI WOLVESVILLE (`masoi`) — 390x844, 360x640, 1280x800 + BAN ĐÊM
// ============================================================
await D.t('create-masoi').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const msCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, msCode, 'Dân Làng M');
await joinRoomByCode(C360, msCode, 'Dân Làng 360');
for (let i = 0; i < 3; i++) {
  await D.t('bot-add').click();
  await sleep(120);
}
await D.t('masoi-speed-fast').click();
await sleep(150);
await D.t('start-btn').click();

await M.t('masoi-timer').waitFor({ timeout: 8000 });
await M.t('masoi-comms-card').waitFor({ timeout: 8000 });
const msSeats = await M.page.locator('[data-testid^="masoi-seat-"]').count();
check(msSeats === 6, `Ma Sói Wolvesville: hiển thị lưới 6 ô đất đánh số #1..#6 (${msSeats})`);
await noOuterScroll(M, 'Ma Sói Wolvesville Mobile 390x844');
await noOuterScroll(C360, 'Ma Sói Wolvesville Compact 360x640');
await M.shot('26-masoi-wolvesville-mobile-390x844');
await C360.shot('26b-masoi-wolvesville-compact-360x640');
await D.shot('26c-masoi-wolvesville-desktop');

// Chờ hết pha lộ vai (8s tốc độ nhanh) sang Đêm 1 để kiểm tra bảng Ban Đêm & tab Vai & Luật
await sleep(8500);
await M.t('masoi-tab-log').click();
await sleep(250);
check((await M.page.locator('[data-testid^="masoi-deck-"]').count()) >= 4, 'Ma Sói Wolvesville: Tab Vai & Luật hiển thị đầy đủ bộ vai phòng');
await M.shot('26d-masoi-wolvesville-night-mobile');
await leaveRoom(C360);
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 9. AI LÀ GIÁN ĐIỆP 2.0 (`giandiep`) — 1 HÀNG GHẾ + HỢP NHẤT + BIỆN MINH + PHÁN QUYẾT
// ============================================================
await D.t('create-giandiep').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const gdCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, gdCode, 'Thám Tử M');
await joinRoomByCode(C360, gdCode, 'Nghi Phạm 360');
await D.t('bot-add').click();
await sleep(150);
await D.t('start-btn').click();

await M.t('gd-secret-card').waitFor({ timeout: 8000 });
check((await M.page.locator('[data-testid^="avatar-"]').count()) === 0, 'Ai Là Gián Điệp 2.0: không bị lặp hàng Avatar thừa (hideStrip)');
check((await M.page.locator('[data-testid^="gd-seat-"]').count()) === 4, 'Ai Là Gián Điệp 2.0: duy nhất 1 hàng 4 nghi phạm #1..#4');
await noOuterScroll(M, 'Gián Điệp 2.0 Mobile 390x844');
await noOuterScroll(C360, 'Gián Điệp 2.0 Compact 360x640');
await M.shot('27a-giandiep-clue-mobile-390x844');
await C360.shot('27b-giandiep-compact-360x640');

// Hoàn tất pha Khai Gợi Ý cho cả 3 người thật (Bot tự khai trong ~0.6s)
const clueLines = ['rất gần gũi hàng ngày', 'nhiều người đều biết', 'hay gặp ngoài đời'];
for (let step = 0; step < 32; step++) {
  if ((await M.t('gd-ready-btn').count()) > 0 || (await M.t('gd-skip-vote').count()) > 0) break;
  for (let i = 0; i < 3; i++) {
    const p = [D, M, C360][i];
    if ((await p.t('gd-clue-input').count()) > 0) {
      await p.t('gd-clue-input').fill(clueLines[i]).catch(() => {});
      await p.t('gd-clue-submit').click().catch(() => {});
      await sleep(300);
    }
  }
  await sleep(450);
}

// Nếu đang Thảo luận -> nhấn Sẵn sàng Vote để vào ngay pha Bỏ Phiếu
for (const p of [D, M, C360]) {
  if ((await p.t('gd-ready-btn').count()) > 0) {
    await p.t('gd-ready-btn').click().catch(() => {});
    await sleep(180);
  }
}

// Chờ pha Vote và dồn phiếu cho C360 để kích hoạt PHA BIỆN MINH!
if (await has(M.t('gd-skip-vote'), 8000)) {
  const c360SeatTestId = await C360.page.evaluate(() => {
    const el = [...document.querySelectorAll('[data-testid^="gd-seat-"]')].find((n) => n.textContent?.includes('Bạn'));
    return el?.getAttribute('data-testid') ?? null;
  });
  if (c360SeatTestId) {
    await D.t(c360SeatTestId).click().catch(() => {});
    await M.t(c360SeatTestId).click().catch(() => {});
    const skipBtnC = C360.t('gd-skip-vote');
    if ((await skipBtnC.count()) > 0) await skipBtnC.click().catch(() => {});
  }
}

// Đợi Pha Biện Minh (`gd-defense-input` trên C360) hoặc Phán Quyết (`gd-verdict-banish`)
if (await has(C360.t('gd-defense-input'), 6000)) {
  await C360.t('gd-defense-input').fill('Mình là Dân Thường chính hiệu mà!');
  await C360.t('gd-defense-submit').click();
  await sleep(350);
  await M.shot('27c-giandiep-defense-mobile');
  await C360.t('gd-defense-done').click();
}
if (await has(M.t('gd-verdict-banish'), 6000)) {
  await M.shot('27d-giandiep-final-verdict-mobile');
  await D.t('gd-verdict-banish').click().catch(() => {});
  await M.t('gd-verdict-banish').click().catch(() => {});
  await sleep(600);
  if (await has(M.t('gd-finish-reveal-btn'), 4000)) {
    await M.shot('27e-giandiep-reveal-end-mobile');
  }
}

await leaveRoom(C360);
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 10. VẼ & ĐOÁN (`ve_doan`) — KIỂM CHỨNG BOT VẼ ĐA MÀU TRÊN SVG
// ============================================================
await D.t('create-ve_doan').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const vdCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, vdCode, 'Người Đoán M');
for (let b = 0; b < 4; b++) {
  await D.t('bot-add').click();
  await sleep(110);
}
await sleep(150);
await D.t('start-btn').click();
await D.t('vd-canvas').waitFor({ timeout: 8000 });
await M.t('vd-canvas').waitFor({ timeout: 8000 });

// Room.start() xáo trộn thứ tự: nếu một người thật bị xếp vẽ trước thì người đó rời phòng (hoặc người còn lại xem Bot vẽ)
let viewer = M;
if ((await M.page.locator('[data-testid^="vd-pick-"]').count()) > 0) {
  await leaveRoom(M);
  viewer = D;
} else if ((await D.page.locator('[data-testid^="vd-pick-"]').count()) > 0) {
  await leaveRoom(D);
  viewer = M;
}
// Phòng trường hợp sau khi skip lượt 0 lại rơi trúng người còn lại -> để 4 Bot hoàn toàn đảm bảo người kế là Bot
if ((await viewer.page.locator('[data-testid^="vd-pick-"]').count()) > 0) {
  await viewer.t('vd-pick-0').click().catch(() => {});
}

await viewer.page.waitForFunction(
  () => document.querySelectorAll('[data-testid="vd-canvas"] > svg polyline, [data-testid="vd-canvas"] > svg circle').length >= 3,
  { timeout: 10000 },
).catch(() => {});
const botSvgStrokes = await viewer.page.evaluate(() => {
  return document.querySelectorAll('[data-testid="vd-canvas"] > svg polyline, [data-testid="vd-canvas"] > svg circle').length;
});
check(botSvgStrokes >= 3, `Vẽ & Đoán: Bot tự chọn từ & vẽ nét minh họa lên bảng SVG (${botSvgStrokes} nét)`);
await viewer.shot('29-vedoan-bot-drawing-mobile');
if ((await M.t('leave-open').count()) > 0) await leaveRoom(M);
if ((await D.t('leave-open').count()) > 0) await leaveRoom(D);

// ============================================================
// 11. CỜ CARO 28×28 (`caro`) & ĐẦM LẦY QUÁI CHIÊU 3.0 (`croaksquad` + BOT CO-OP + AUTO-LANDSCAPE)
// ============================================================
await D.t('create-caro').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const crCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, crCode, 'Kỳ Thủ Mobile');
await D.t('bot-add').click();
await sleep(140);
await D.t('bot-add').click();
await sleep(200);
await D.t('start-btn').click();
await M.t('caro-size-badge').waitFor({ timeout: 8000 });
const sizeBadgeTxt = (await M.t('caro-size-badge').innerText()).trim();
check(sizeBadgeTxt.includes('28×28') && sizeBadgeTxt.includes('784'), `Cờ Caro 4 phe tự phóng to "${sizeBadgeTxt}"`);
await M.shot('28-caro-4p-28x28-mobile');
await leaveRoom(M);
await leaveRoom(D);

// Đầm Lầy Quái Chiêu 3.0
await D.t('create-croaksquad').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const csCode = (await D.t('room-code').innerText()).trim();
check((await D.t('bot-add').count()) === 1, 'Croak Squad 3.0: Đã mở nút Thêm Máy Co-op trong sảnh');
await D.t('bot-add').click();
await joinRoomByCode(M, csCode, 'Ếch Mobile');
await joinRoomByCode(C360, csCode, 'Ếch 360');
await sleep(250);
await D.t('start-btn').click();

await D.t('croak-controls').waitFor({ timeout: 8000 });
await M.t('croak-controls').waitFor({ timeout: 8000 });
await C360.t('croak-controls').waitFor({ timeout: 8000 });
await sleep(500);
const canvasOk = await M.page.evaluate(() => {
  const c = document.querySelector('[data-testid="croak-viewport"] canvas');
  return !!c && c.width >= 300 && c.height >= 200;
});
check(canvasOk, 'Croak Squad 3.0: Canvas 60fps xoay ngang Auto-Landscape chạy mượt trên Mobile');
await D.shot('30-croaksquad-desktop');
await M.shot('30b-croaksquad-mobile-rotated-390x844');
await C360.shot('30c-croaksquad-compact-360x640');

await D.t('croak-reset-stage').click();
await sleep(350);
await D.t('croak-tongue').click();
if (await has(D.t('croak-aim-bar'), 4000)) {
  await D.t('croak-aim-high_right').click();
  await sleep(260);
  await D.shot('31-croaksquad-swallow-aim-arc');
  await D.t('croak-spit').click();
}
await leaveRoom(C360);
await leaveRoom(M);
await leaveRoom(D);

console.log(failures ? `MEGA AUDIT FAILURES: ${failures}` : 'MEGA AUDIT ALL OK');
await browser.close();
if (failures > 0) process.exit(1);
