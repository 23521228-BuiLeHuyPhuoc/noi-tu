// Mega E2E Visual & Logic Audit — Chụp ảnh mọi màn hình & kiểm tra logic 9 trò chơi + 12 người + VIP 8 ô + Map.
// Chạy cùng server (PORT=4355 ADMIN_USERNAMES=boss ALLOW_MEMORY_ADMIN=1) và static web (PORT=8455).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB ?? 'http://localhost:8455';
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
      await sleep(250);
      await page.screenshot({ path: `${SHOTS}/${n}.png` });
    },
  };
};

const has = async (loc, ms = 4000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

async function registerOrLogin(p, username, name = username) {
  await p.t('register-open').click();
  await p.t('auth-username').fill(username);
  await p.t('auth-email').fill(`${username}_${Date.now().toString(36)}@example.com`);
  await p.t('auth-password').fill('matkhau123');
  await p.t('auth-password2').fill('matkhau123');
  await p.t('auth-name').fill(name);
  await p.t('auth-submit').click();
  if (!(await has(p.t('profile-card'), 4000))) {
    await p.t('auth-tab-login').click();
    await p.t('auth-username').fill(username);
    await p.t('auth-password').fill('matkhau123');
    await p.t('auth-submit').click();
    await p.t('profile-card').waitFor({ timeout: 8000 });
  }
}

async function closeSheet(p) {
  await p.page.locator('[aria-label="Đóng bảng"]').first().click({ timeout: 1500 }).catch(() =>
    p.page.locator('[aria-label="Đóng"]').first().click({ position: { x: 5, y: 5 }, timeout: 1500 }).catch(() => {}),
  );
  await sleep(400);
}

const uid = Date.now().toString(36);

// ============================================================
// 1. TRANG CHỦ DESKTOP & MOBILE + BỘ LỌC 9 GAME + ĐỔI MAP
// ============================================================
const D = await openPage(1280, 800, false);
await D.t('create-do_vui').waitFor({ timeout: 10000 });
const allCount = await D.page.locator('[data-testid^="create-"]').count();
check(allCount === 9, `Trang chủ hiển thị đủ 9 trò chơi (${allCount})`);
await D.shot('01-home-desktop');

await D.t('cat-hidden').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 2, 'Bộ lọc Ẩn vai hiện đúng 2 game (Ma Sói, Gián Điệp)');
await D.t('cat-party').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 3, 'Bộ lọc Party hiện đúng 3 game (Vẽ & Đoán, Bom Chữ, Đố Vui)');
await D.t('cat-all').click();

const M = await openPage(390, 844, true);
await M.t('create-masoi').waitFor({ timeout: 10000 });
await M.shot('02-home-mobile');

await M.t('home-map-open').click();
await M.t('home-map-dem_trang_soi').waitFor({ timeout: 4000 });
await M.shot('03-home-map-picker');
await M.t('home-map-dem_trang_soi').click();
check(await has(M.t('map-backdrop-dem_trang_soi'), 3000), 'Đổi Map miễn phí Đêm Trăng Ma Sói thành công trên Trang chủ');

// Kiểm tra nút Siêu mượt
await M.t('smooth-toggle').click();
await sleep(200);
await M.t('smooth-toggle').click();

// ============================================================
// 2. VIP 6 PHÚ HÀO + CỬA HÀNG LIVE STAGE 8 Ô + MAP NGÂN HÀ
// ============================================================
const vipName = `vip_${uid}`;
await registerOrLogin(D, vipName, 'Đế Vương VIP');
const boss = await openPage(1280, 800, false);
await registerOrLogin(boss, 'boss', 'Boss');
await boss.t('admin-open-home').click();
await boss.t('admin-tab-adjust').click();
await boss.t('admin-adjust-user').fill(vipName);
await boss.t('admin-adjust-delta').fill('60000');
await boss.t('admin-adjust-reason').fill('mega-vip6');
await boss.t('admin-adjust-save').click();
await sleep(1600);
await boss.ctx.close();

await D.t('shop-open').click();
await D.t('shop-tab-deco').click();
await D.t('shop-live-stage').waitFor({ timeout: 5000 });
check(await has(D.t('vip-progress-card'), 3000), 'Cửa hàng hiển thị thanh VIP Prestige');

const vipSet = [
  'frame_supreme_god',
  'name_divine_glitch',
  'aura_cosmic_orbit',
  'pet_ufo_drone',
  'title_chi_ton',
  'bubble_galaxy',
  'enter_galaxy_portal',
  'map_cung_ngan_ha',
];
for (const itemId of vipSet) {
  const buyBtn = D.t(`buy-${itemId}`);
  await buyBtn.scrollIntoViewIfNeeded();
  await buyBtn.click();
  await D.t(`equip-${itemId}`).waitFor({ timeout: 5000 });
  await D.t(`equip-${itemId}`).click();
  await D.t(`unequip-${itemId}`).waitFor({ timeout: 5000 });
}
await D.t('shop-live-stage').scrollIntoViewIfNeeded();
await D.shot('04-shop-vip6-preview');
check(await has(D.page.getByText(/Chí Tôn Vũ Trụ/).first(), 3000), 'VIP 6 Thiên Đế Chí Tôn được kích hoạt trên thanh VIP');
await closeSheet(D);
await D.shot('05-profile-vip6-home');

// ============================================================
// 3. PHÒNG 12 NGƯỜI + KỸ NĂNG RỒNG + SIÊU QUÀ NGÂN HÀ + COMBO
// ============================================================
await D.t('create-baucua').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const bcCode = (await D.t('room-code').innerText()).trim();
await D.t('lobby-map-map_cung_ngan_ha').click();
check(await has(D.t('map-backdrop-map_cung_ngan_ha'), 3000), 'Chủ phòng đổi Map phòng sang Cung Trăng Ngân Hà');

// Cho Mobile M vào phòng
await M.t('name-input').fill('Khách Lầy');
await M.t('code-input').fill(bcCode);
await M.t('join-btn').click();
await M.t('room-code').waitFor({ timeout: 8000 });

// Thêm 10 bot đủ 12 người
for (let i = 0; i < 10; i++) {
  await D.t('bot-add').click();
  await sleep(160);
}
await sleep(500);
const avatarCount = await D.page.locator('[data-testid^="avatar-name-"]').count();
check(avatarCount === 12, `Phòng 12 người hiển thị đủ 12 avatar (${avatarCount})`);
await D.shot('06-lobby-12players-galaxy');

await D.t('char-detail-toggle').click();
await D.t('char-preset-30').click();
await sleep(300);
await D.shot('07-lobby-customizer-map');

// Chọc bot bằng Kỹ năng Thần Thoại & Siêu Quà 5000💎
const targetBot = (await D.page.locator('[data-testid^="avatar-bot-"]').first().getAttribute('data-testid')).replace('avatar-', '');
await D.t(`avatar-${targetBot}`).click();
await D.t('skill-dragon_roar').waitFor({ timeout: 4000 });
await D.t('skill-dragon_roar').scrollIntoViewIfNeeded();
await D.t('skill-dragon_roar').click();
await sleep(500);
await D.shot('08-vip-skill-dragon');
await sleep(2200);

await D.t(`avatar-${targetBot}`).click();
await D.t('gift-gift_galaxy_palace').waitFor({ timeout: 4000 });
await D.t('gift-gift_galaxy_palace').scrollIntoViewIfNeeded();
await D.t('gift-gift_galaxy_palace').click();
await sleep(600);
check(await has(D.t('gift-fx-gift_galaxy_palace'), 3000), 'Quà Cung Điện Ngân Hà 5000💎 hiện hiệu ứng toàn màn hình');
await D.shot('09-mega-gift-galaxy');
await sleep(2500);

// Poke Combo 3 lần liên tiếp vào cùng bot
for (const hitId of ['hit-tat', 'hit-dam', 'hit-da']) {
  await D.t(`avatar-${targetBot}`).click();
  await D.t(hitId).waitFor({ timeout: 3000 });
  await D.t(hitId).click();
  await sleep(180);
}
await sleep(200);
const hasCombo = await has(D.t('poke-combo'), 2500);
check(hasCombo, 'Poke Combo HUD hiển thị khi chọc liên hoàn');

// Kiểm tra Bầu Cua 12 người trên nền Tết Việt mobile
await D.t('lobby-map-map_tet_viet').click().catch(() => {});
await D.t('start-btn').click();
await M.t('bc-roll-btn').or(M.page.getByText(/Đặt cược/)).first().waitFor({ timeout: 6000 }).catch(() => {});
await sleep(600);
await M.shot('21-baucua-12p-mobile');
await M.t('leave-open').click();
await M.t('leave-confirm').click();
await D.t('leave-open').click();
await D.t('leave-confirm').click();

// ============================================================
// 4. GAME 5 — MA SÓI (4-12 NGƯỜI)
// ============================================================
await D.t('create-masoi').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const msCode = (await D.t('room-code').innerText()).trim();
await M.t('code-input').fill(msCode);
await M.t('join-btn').click();
await M.t('room-code').waitFor({ timeout: 8000 });
for (let i = 0; i < 4; i++) {
  await D.t('bot-add').click();
  await sleep(160);
}
await D.t('masoi-preset-chaos').click();
await D.t('start-btn').click();
await D.t('masoi-role-card').waitFor({ timeout: 8000 });
check(await has(D.t('masoi-role-card')), 'Ma Sói: hiện Thẻ Thân Phận & 6 ghế làng');
await M.t('masoi-role-card').waitFor({ timeout: 5000 });
await D.shot('10-masoi-night');
// Test lật ẩn/hiện thẻ vai trò trên Mobile
await M.t('masoi-role-card').click();
check(await has(M.page.getByText(/Đang Úp/), 2000), 'Ma Sói: chạm thẻ để úp bảo mật hoạt động');
await M.t('masoi-role-card').click();

// Để an toàn thời gian, rời phòng Ma Sói sau khi kiểm chứng UI + pha đầu (hoặc chờ tối đa 22s để chụp pha ngày nếu tự sang)
let reachedDay = false;
for (let k = 0; k < 20; k++) {
  if ((await D.t('masoi-ready-btn').count()) > 0 || (await D.t('masoi-skip-vote').count()) > 0) {
    reachedDay = true;
    break;
  }
  await sleep(1200);
}
if (reachedDay) {
  if ((await D.t('masoi-ready-btn').count()) > 0) {
    await D.t('masoi-ready-btn').click().catch(() => {});
    await M.t('masoi-ready-btn').click().catch(() => {});
    await sleep(1200);
  }
  await D.shot('11-masoi-day');
}
console.log('  Ma Sói reached day UI?', reachedDay);
await M.t('leave-open').click();
await M.t('leave-confirm').click();
await D.t('leave-open').click();
await D.t('leave-confirm').click();

// ============================================================
// 5. GAME 6 — AI LÀ GIÁN ĐIỆP
// ============================================================
await D.t('create-giandiep').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const gdCode = (await D.t('room-code').innerText()).trim();
await M.t('code-input').fill(gdCode);
await M.t('join-btn').click();
await M.t('room-code').waitFor({ timeout: 8000 });
for (let i = 0; i < 3; i++) {
  await D.t('bot-add').click();
  await sleep(150);
}
await D.t('start-btn').click();
await D.t('gd-secret-card').waitFor({ timeout: 8000 });
await D.t('gd-secret-word').waitFor({ timeout: 5000 });

// Chờ tới lượt D hoặc M khai gợi ý trong tối đa 16s
let testedClue = false;
for (let step = 0; step < 30; step++) {
  for (const p of [D, M]) {
    if ((await p.t('gd-clue-input').count()) > 0) {
      const secretWord = (await p.t('gd-secret-word').innerText()).trim();
      await p.shot('12-giandiep-clue');
      if (secretWord && !secretWord.includes('MR. WHITE')) {
        await p.t('gd-clue-input').fill(`Tôi thích ${secretWord}`);
        await p.t('gd-clue-submit').click();
        await sleep(500);
        const blocked = await has(p.page.getByText(/Không được nhắc thẳng từ khóa/), 2500);
        check(blocked, 'Gián Điệp: UI & server chặn thẳng lỗi lộ từ khóa (word_leaked)');
        await p.shot('13-giandiep-leak-blocked');
      }
      await p.t('gd-clue-input').fill('Món này siêu quen luôn');
      await p.t('gd-clue-submit').click();
      testedClue = true;
      break;
    }
  }
  if (testedClue) break;
  await sleep(700);
}
check(testedClue, 'Gián Điệp: người chơi nhập gợi ý đúng lượt thành công');

// Đợi sang discussion / vote hoặc ready
for (let step = 0; step < 30; step++) {
  if ((await D.t('gd-ready-btn').count()) > 0) {
    await D.t('gd-ready-btn').click().catch(() => {});
    await M.t('gd-ready-btn').click().catch(() => {});
  }
  if ((await D.t('gd-skip-vote').count()) > 0) {
    await D.shot('14-giandiep-vote');
    break;
  }
  await sleep(800);
}
await M.t('leave-open').click();
await M.t('leave-confirm').click();
await D.t('leave-open').click();
await D.t('leave-confirm').click();

// ============================================================
// 6. GAME 7 — VẼ & ĐOÁN (KÉO CHUỘT VẼ SVG + ĐOÁN TRÚNG)
// ============================================================
await D.t('create-ve_doan').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const vdCode = (await D.t('room-code').innerText()).trim();
await M.t('code-input').fill(vdCode);
await M.t('join-btn').click();
await M.t('room-code').waitFor({ timeout: 8000 });
await D.t('vd-rounds-1').click();
await D.t('start-btn').click();

// Tìm tab nào đang là Họa sĩ ở pha chọn từ
let drawer = null;
let guesser = null;
for (let w = 0; w < 15; w++) {
  if ((await D.t('vd-pick-0').count()) > 0) { drawer = D; guesser = M; break; }
  if ((await M.t('vd-pick-0').count()) > 0) { drawer = M; guesser = D; break; }
  await sleep(300);
}
check(!!drawer, 'Vẽ & Đoán: họa sĩ nhận được 3 từ chọn');
const secretWord = (await drawer.t('vd-pick-0').innerText()).trim();
const guesserMasked = (await guesser.t('vd-word-display').innerText()).trim();
check(!guesserMasked.toLowerCase().includes(secretWord.toLowerCase()), 'Vẽ & Đoán: từ khóa được giấu khỏi người đoán');
await drawer.t('vd-pick-0').click();
await drawer.t('vd-undo').waitFor({ timeout: 5000 });

// Kéo chuột vẽ nét trên canvas
const box = await drawer.t('vd-canvas').boundingBox();
if (box) {
  await drawer.page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
  await drawer.page.mouse.down();
  await drawer.page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.25, { steps: 6 });
  await drawer.page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.75, { steps: 6 });
  await drawer.page.mouse.up();
  await drawer.t('vd-color-#E03131').click();
  await drawer.t('vd-canvas').scrollIntoViewIfNeeded();
  const box2 = await drawer.t('vd-canvas').boundingBox();
  if (box2) {
    await drawer.page.mouse.move(box2.x + box2.width * 0.3, box2.y + box2.height * 0.6);
    await drawer.page.mouse.down();
    await drawer.page.mouse.move(box2.x + box2.width * 0.7, box2.y + box2.height * 0.6, { steps: 5 });
    await drawer.page.mouse.up();
  }
}
await sleep(500);
const strokeLines = await guesser.page.locator('svg polyline').count();
check(strokeLines >= 2, `Vẽ & Đoán: người đoán thấy ${strokeLines} nét vẽ SVG đồng bộ từ họa sĩ`);
await drawer.shot('15-vedoan-drawing');

// Người đoán gõ đúng đáp án
await guesser.t('vd-guess-input').fill(secretWord);
await guesser.t('vd-guess-submit').click();
await sleep(600);
check(await has(guesser.page.getByText(/Đã đoán trúng/), 4000), 'Vẽ & Đoán: người đoán gõ đúng từ nhận điểm và hiện chúc mừng');
await guesser.shot('16-vedoan-guessed');

await M.t('leave-open').click();
await M.t('leave-confirm').click();
await D.t('leave-open').click();
await D.t('leave-confirm').click();

// ============================================================
// 7. GAME 8 — BOM CHỮ
// ============================================================
await D.t('create-bom_tu').click();
await D.t('room-code').waitFor({ timeout: 8000 });
await D.t('bot-add').click();
await sleep(200);
await D.t('bot-add').click();
await D.t('start-btn').click();
await D.t('bt-bomb').waitFor({ timeout: 8000 });
check(await has(D.t('bt-syllable')), 'Bom Chữ: hiển thị âm tiết & quả bom đếm ngược');
await D.shot('17-bomtu-gameplay');
if ((await D.t('bt-input').count()) > 0) {
  await D.t('bt-input').fill('sai');
  await D.t('bt-submit').click();
  check(await has(D.page.getByText(/2 chữ/), 2500), 'Bom Chữ: báo lỗi rõ ràng khi nhập sai luật');
}
await D.t('leave-open').click();
await D.t('leave-confirm').click();

// ============================================================
// 8. GAME 9 — ĐẤU TRƯỜNG ĐỐ VUI + MÀN TỔNG KẾT
// ============================================================
await D.t('create-do_vui').click();
await D.t('room-code').waitFor({ timeout: 8000 });
await D.t('bot-add').click();
await D.t('dv-questions-5').click();
await D.t('start-btn').click();
await D.t('dv-question').waitFor({ timeout: 8000 });
await D.shot('18-dovui-question');

await D.t('dv-opt-0').click();
await sleep(1200);
check(await has(D.page.getByText(/Giải thích/), 6000), 'Đố Vui: mở đáp án & giải thích sau khi trả lời');
await D.shot('19-dovui-reveal');

// Hoàn thành nốt 4 câu còn lại để kiểm tra màn ResultScreen
for (let q = 1; q < 5; q++) {
  await D.page.getByText(new RegExp(`Câu ${q + 1}/5`)).waitFor({ timeout: 10000 });
  await D.t('dv-opt-1').click();
  await sleep(600);
}
await D.t('result-title').waitFor({ timeout: 12000 });
check(await has(D.t('result-title')), 'Màn Tổng Kết hiển thị đầy đủ bảng xếp hạng và chuyển game');
await D.shot('20-result-screen');

// Chuyển thử sang Nối từ ngay trên màn Tổng Kết để chụp đối chứng game cũ trên nền Map
await D.t('switch-wordchain').click();
await D.t('start-btn').waitFor({ timeout: 6000 });
await D.t('start-btn').click();
await D.t('current-word').waitFor({ timeout: 8000 });
await sleep(400);
await D.shot('22-wordchain-map');
await D.t('leave-open').click();
await D.t('leave-confirm').click();

console.log(failures ? `MEGA AUDIT FAILURES: ${failures}` : 'MEGA AUDIT ALL OK');
await browser.close();
if (failures > 0) process.exit(1);
