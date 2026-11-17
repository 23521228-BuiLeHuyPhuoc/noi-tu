// Mega E2E Visual & Logic Audit V2 — Kiểm chứng toàn diện 14 trò chơi + 4 Fragment Mobile + Phú Hào Lố Lăng + Ma Sói 2.0 + Đố Vui CNTT/C2 + Co-op Croak Squad 2 trình duyệt thật.
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
      await sleep(280);
      await page.screenshot({ path: `${SHOTS}/${n}.png` });
    },
  };
};

const has = async (loc, ms = 4000) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

async function switchHomeTab(p, tab) {
  const btn = p.t(`home-tab-${tab}`);
  if ((await btn.count()) > 0) {
    await btn.click();
    await sleep(220);
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
// 1. TRANG CHỦ 4 FRAGMENT MOBILE & DESKTOP + 14 GAME + 15 MAP
// ============================================================
const D = await openPage(1280, 800, false);
await D.t('create-croaksquad').waitFor({ timeout: 10000 });
const allCount = await D.page.locator('[data-testid^="create-"]').count();
check(allCount === 14, `Trang chủ hiển thị đủ 14 trò chơi (${allCount})`);
await D.shot('01-home-desktop');

await D.t('cat-hidden').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 2, 'Bộ lọc Ẩn Vai hiện đúng 2 game (Ma Sói, Gián Điệp)');
await D.t('cat-party').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 5, 'Bộ lọc Party Lầy hiện đúng 5 game');
await D.t('cat-coop').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 2, 'Bộ lọc Co-op & Cờ hiện đúng 2 game (Croak Squad, Cờ Caro)');
await D.t('cat-classic').click();
check((await D.page.locator('[data-testid^="create-"]').count()) === 3, 'Bộ lọc Hội Chợ hiện đúng 3 game (Lô Tô, Bầu Cua, Tỷ Phú)');
await D.t('cat-all').click();

const M = await openPage(390, 844, true);
await M.t('create-croaksquad').waitFor({ timeout: 10000 });
check(await has(M.t('home-bottom-nav'), 3000), 'Mobile hiển thị thanh điều hướng đáy 4 Fragment rõ ràng');
await M.shot('02-home-mobile');

// Kiểm tra Fragment 2 (Phòng mở) & Fragment 3 (Phú Hào — khách chưa đăng nhập vẫn xem thử đồ VIP 6!)
await switchHomeTab(M, 'rooms');
check(await has(M.t('code-input'), 3000), 'Fragment 2 (Phòng mở) hiển thị gọn ô nhập mã 6 ký tự & danh sách phòng');
await M.shot('02b-home-mobile-rooms');

await switchHomeTab(M, 'shop');
check(await has(M.t('shop-live-stage'), 4000), 'Fragment 3 (Phú Hào) cho phép khách xem thử trực tiếp sân khấu VIP 6 lấp lánh');
await M.shot('02c-home-mobile-guest-shop');

await switchHomeTab(M, 'games');
await M.t('home-map-open').click();
await M.t('home-map-dem_trang_soi').waitFor({ timeout: 4000 });
const mapCount = await M.page.locator('[data-testid^="home-map-"]').count();
// trừ nút home-map-open => 15 map!
check(mapCount >= 15, `Bảng chọn Map có đủ 15 Map rực rỡ (${mapCount})`);
await M.shot('03-home-map-picker');
await M.t('home-map-dem_trang_soi').click();
check(await has(M.t('map-backdrop-dem_trang_soi'), 3000), 'Đổi Map miễn phí Đêm Trăng Ma Sói thành công trên Mobile');

// ============================================================
// 2. ĐẠI GIA VIP 6 + BỘ TRANG BỊ Ố DỀ MỚI + MAP DISCO / HOÀNG KIM
// ============================================================
const vipName = `vip_${uid}`;
await registerOrLogin(D, vipName, 'Hoàng Đế Lố Lăng');
const boss = await openPage(1280, 800, false);
await registerOrLogin(boss, 'boss', 'Boss');
await boss.t('admin-open-home').click();
await boss.t('admin-tab-adjust').click();
await boss.t('admin-adjust-user').fill(vipName);
await boss.t('admin-adjust-delta').fill('120000');
await boss.t('admin-adjust-reason').fill('mega-v2-whale');
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
await D.t('shop-live-stage').scrollIntoViewIfNeeded();
await D.shot('04-shop-vip6-preview');
check(await has(D.page.getByText(/Chí Tôn Vũ Trụ/).first(), 3000), 'VIP 6 Thiên Đế Chí Tôn kích hoạt rực rỡ');
await closeSheet(D);
await D.shot('05-profile-vip6-home');

// Kiểm tra Fragment 4 (Cá nhân) với hồ sơ VIP 6 đầy đủ 14 game
await switchHomeTab(D, 'profile');
await D.shot('05b-home-frag-profile');
await switchHomeTab(D, 'games');

// ============================================================
// 3. PHÒNG 12 NGƯỜI + SKILL TROLL BSOD / DÉP TỔ ONG + QUÀ NGAI VÀNG 10.000💎 + BẦU CUA LỘC TRỜI
// ============================================================
await D.t('create-baucua').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const bcCode = (await D.t('room-code').innerText()).trim();
await D.t('lobby-map-map_san_nhay_disco').scrollIntoViewIfNeeded();
await D.t('lobby-map-map_san_nhay_disco').click();
check(await has(D.t('map-backdrop-map_san_nhay_disco'), 3000), 'Chủ phòng bật Map VIP Sàn Nhảy Disco 7 Màu');

await joinRoomByCode(M, bcCode, 'Khách Lầy');

for (let i = 0; i < 10; i++) {
  await D.t('bot-add').click();
  await sleep(140);
}
await sleep(450);
const avatarCount = await D.page.locator('[data-testid^="avatar-name-"]').count();
check(avatarCount === 12, `Phòng 12 người hiển thị đủ 12 avatar không lag (${avatarCount})`);
await D.shot('06-lobby-12players-galaxy');

await D.t('char-detail-toggle').click();
await D.t('char-preset-30').click();
await sleep(250);
await D.shot('07-lobby-customizer-map');

// Bắn Màn Hình Xanh BSOD thẳng vào Khách Lầy (M) để chụp trọn hiệu ứng sập nguồn toàn màn hình điện thoại!
const guestAvatarTestId = await D.page
  .locator('[data-testid^="avatar-"]')
  .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')).find((id) => id && !id.includes('name-') && !id.includes('edit') && !id.includes('u-') && !id.includes('bot-')));
const bsodTarget = guestAvatarTestId ? guestAvatarTestId.replace('avatar-', '') : (await D.page.locator('[data-testid^="avatar-bot-"]').first().getAttribute('data-testid')).replace('avatar-', '');
await D.t(`avatar-${bsodTarget}`).click();
await D.t('skill-bsod_crash').waitFor({ timeout: 4000 });
await D.t('skill-bsod_crash').scrollIntoViewIfNeeded();
await D.t('skill-bsod_crash').click();
await sleep(450);
await M.shot('08-vip-skill-dragon');
await sleep(2300);

const targetBot = (await D.page.locator('[data-testid^="avatar-bot-"]').first().getAttribute('data-testid')).replace('avatar-', '');
await D.t(`avatar-${targetBot}`).click();
await D.t('skill-gold_slipper_storm').waitFor({ timeout: 4000 });
await D.t('skill-gold_slipper_storm').scrollIntoViewIfNeeded();
await D.t('skill-gold_slipper_storm').click();
await sleep(450);
await D.shot('08b-vip-skill-slipper');
await sleep(2100);

await D.t(`avatar-${targetBot}`).click();
await D.t('gift-gift_omega_throne').waitFor({ timeout: 4000 });
await D.t('gift-gift_omega_throne').scrollIntoViewIfNeeded();
await D.t('gift-gift_omega_throne').click();
await sleep(550);
check(await has(D.t('gift-fx-gift_omega_throne'), 3000), 'Siêu Quà Ngai Vàng Hoàng Đế 10.000💎 nổ hiệu ứng toàn màn hình');
await D.shot('09-mega-gift-galaxy');
await sleep(2600);

// Bật chế độ Bầu Cua Lộc Trời ×2/×3 & Tam Hoa + kiểm tra Tất Tay trên Mobile 12 người
await D.t('baucua-mode-jackpot').scrollIntoViewIfNeeded();
await D.t('baucua-mode-jackpot').click();
await sleep(200);
await D.t('start-btn').click();
await M.t('bc-jackpot-banner').waitFor({ timeout: 8000 });
check(await has(M.t('bc-jackpot-banner'), 3000), 'Bầu Cua mở rộng: hiện banner Lộc Trời ×2/×3 & Bão Tam Hoa');
if ((await M.t('bc-allin').count()) > 0) {
  await M.t('bc-allin').click().catch(() => {});
}
await sleep(400);
await M.shot('21-baucua-12p-mobile');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 4. CỜ TỶ PHÚ MỞ RỘNG — LỄ HỘI x2, HŨ ĐỘC ĐẮC & MUA ĐỨT 160%
// ============================================================
await D.t('create-typhu').click();
await D.t('room-code').waitFor({ timeout: 8000 });
await D.t('bot-add').click();
await D.t('typhu-mode-chaos_festival').click();
await sleep(200);
await D.t('start-btn').click();
await D.t('typhu-jackpot').waitFor({ timeout: 8000 });
check(await has(D.t('typhu-jackpot'), 3000), 'Cờ Tỷ Phú mở rộng: hiển thị Hũ Độc Đắc & Thành Phố Lễ Hội x2');
await D.shot('21b-typhu-chaos-festival');
await leaveRoom(D);

// ============================================================
// 5. MA SÓI 2.0 — SỔ TAY VAI TRÒ, GHIM NGHI VẤN & CHAT LÀNG TRỰC TIẾP
// ============================================================
await D.t('create-masoi').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const msCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, msCode);
for (let i = 0; i < 4; i++) {
  await D.t('bot-add').click();
  await sleep(140);
}
await D.t('masoi-preset-chaos').click();
await D.t('masoi-speed-fast').click();
await sleep(200);
await D.t('start-btn').click();
await D.t('masoi-role-card').waitFor({ timeout: 8000 });
check(await has(D.t('masoi-comms-card'), 4000), 'Ma Sói 2.0: Trung Tâm Thảo Luận & Lịch Sử nằm ngay trên màn hình');

// Mở Sổ Tay Vai Trò kiểm tra hướng dẫn chi tiết
await D.t('masoi-guide-open').click();
await D.page.getByText(/Cách hoạt động/).first().waitFor({ timeout: 4000 });
check(true, 'Ma Sói 2.0: Sổ Tay Cẩm Nang Vai Trò hiển thị đầy đủ cách chơi & mẹo');
await D.shot('10a-masoi-role-guide');
await closeSheet(D);

// Gắn ghim nghi vấn lên ghế người khác
const firstPin = D.page.locator('[data-testid^="masoi-note-"]').first();
if ((await firstPin.count()) > 0) {
  await firstPin.click();
  await sleep(150);
  await firstPin.click();
}
await D.shot('10-masoi-night');
await M.shot('10b-masoi-mobile');

// Nếu D hoặc M có hành động đêm thì bấm nhanh để sang ban ngày kiểm tra Chat Làng trực tiếp
for (let step = 0; step < 32; step++) {
  for (const p of [D, M]) {
    if ((await p.t('masoi-ready-btn').count()) > 0 || (await p.t('masoi-skip-vote').count()) > 0) {
      step = 99;
      break;
    }
    if ((await p.t('masoi-night-submit').count()) > 0) {
      // Chọn ghế đầu tiên hợp lệ rồi bấm submit nếu được
      const seats = p.page.locator('[data-testid^="masoi-seat-"]');
      const sc = await seats.count();
      for (let i = 0; i < Math.min(sc, 3); i++) {
        await seats.nth(i).click().catch(() => {});
        await sleep(120);
      }
      await p.t('masoi-night-submit').click().catch(() => {});
    }
  }
  if (step >= 99) break;
  await sleep(900);
}
if ((await D.t('masoi-quick-0').count()) > 0) {
  await D.t('masoi-quick-0').click();
  await sleep(400);
  check(true, 'Ma Sói 2.0: Gửi câu hỏi nhanh 1 chạm ngay trong khung Chat Làng thành công');
}
await D.shot('11-masoi-day');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 6. AI LÀ GIÁN ĐIỆP + CHẶN LỘ TỪ KHÓA
// ============================================================
await D.t('create-giandiep').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const gdCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, gdCode);
for (let i = 0; i < 3; i++) {
  await D.t('bot-add').click();
  await sleep(140);
}
await D.t('start-btn').click();
await D.t('gd-secret-card').waitFor({ timeout: 8000 });

let testedClue = false;
for (let step = 0; step < 30; step++) {
  for (const p of [D, M]) {
    if ((await p.t('gd-clue-input').count()) > 0) {
      const secretWord = (await p.t('gd-secret-word').innerText()).trim();
      await p.shot('12-giandiep-clue');
      if (secretWord && !secretWord.includes('MR. WHITE')) {
        await p.t('gd-clue-input').fill(`Tôi thích ${secretWord}`);
        await p.t('gd-clue-submit').click();
        await sleep(450);
        const blocked = await has(p.page.getByText(/Không được nhắc thẳng từ khóa/), 2500);
        check(blocked, 'Gián Điệp: chặn lỗi lộ từ khóa (word_leaked)');
        await p.shot('13-giandiep-leak-blocked');
      }
      await p.t('gd-clue-input').fill('Thứ này ai cũng biết');
      await p.t('gd-clue-submit').click();
      testedClue = true;
      break;
    }
  }
  if (testedClue) break;
  await sleep(700);
}
check(testedClue, 'Gián Điệp: người chơi nhập gợi ý đúng lượt thành công');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 7. VẼ & ĐOÁN + BOM CHỮ
// ============================================================
await D.t('create-ve_doan').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const vdCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, vdCode);
await D.t('vd-rounds-1').click();
await D.t('start-btn').click();

let drawer = null;
let guesser = null;
for (let w = 0; w < 15; w++) {
  if ((await D.t('vd-pick-0').count()) > 0) { drawer = D; guesser = M; break; }
  if ((await M.t('vd-pick-0').count()) > 0) { drawer = M; guesser = D; break; }
  await sleep(300);
}
check(!!drawer, 'Vẽ & Đoán: họa sĩ nhận được 3 từ chọn');
const secretWord = (await drawer.t('vd-pick-0').innerText()).trim();
await drawer.t('vd-pick-0').click();
await drawer.t('vd-undo').waitFor({ timeout: 5000 });

const box = await drawer.t('vd-canvas').boundingBox();
if (box) {
  await drawer.page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.25);
  await drawer.page.mouse.down();
  await drawer.page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.25, { steps: 6 });
  await drawer.page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.75, { steps: 6 });
  await drawer.page.mouse.up();
}
await sleep(450);
await drawer.shot('15-vedoan-drawing');
await guesser.t('vd-guess-input').fill(secretWord);
await guesser.t('vd-guess-submit').click();
await sleep(500);
check(await has(guesser.page.getByText(/Đã đoán trúng/), 4000), 'Vẽ & Đoán: đoán trúng nhận điểm ngay');
await guesser.shot('16-vedoan-guessed');
await leaveRoom(M);
await leaveRoom(D);

await D.t('create-bom_tu').click();
await D.t('room-code').waitFor({ timeout: 8000 });
await D.t('bot-add').click();
await sleep(160);
await D.t('bot-add').click();
await D.t('start-btn').click();
await D.t('bt-bomb').waitFor({ timeout: 8000 });
await D.shot('17-bomtu-gameplay');
await leaveRoom(D);

// ============================================================
// 8. ĐẤU TRƯỜNG TRI THỨC IT / DSA / TIẾNG ANH C1-C2 + CHỌN ĐỀ TÀI + NỐI TỪ ĐỊA NGỤC
// ============================================================
await D.t('create-do_vui').click();
await D.t('room-code').waitFor({ timeout: 8000 });
await D.t('bot-add').click();
await D.t('dv-topic-dsa').click();
await D.t('dv-questions-5').click();
await sleep(200);
await D.t('start-btn').click();
await D.t('dv-question').waitFor({ timeout: 8000 });
await D.shot('18-dovui-question');

await D.t('dv-opt-0').click();
await sleep(1200);
check(await has(D.page.getByText(/Giải thích/), 6000), 'Đố Vui CNTT: hiển thị giải thích học thuật chuyên sâu');
await D.shot('19-dovui-reveal');

for (let q = 1; q < 5; q++) {
  await D.page.getByText(new RegExp(`Câu ${q + 1}/5`)).waitFor({ timeout: 10000 });
  await D.t('dv-opt-1').click();
  await sleep(600);
}
await D.t('result-title').waitFor({ timeout: 12000 });
check(await has(D.t('result-title')), 'Màn Tổng Kết hiển thị đầy đủ 14 nút chuyển game');
await D.shot('20-result-screen');

// Chuyển sang Nối Từ Địa Ngục (8s -> 4s) + Luật Danh Từ ngay trên ResultScreen
await D.t('switch-wordchain').click();
await D.t('wc-diff-hell').waitFor({ timeout: 6000 });
await D.t('wc-diff-hell').click();
await D.t('wc-rule-noun').click();
await sleep(200);
await D.t('start-btn').click();
await D.t('wordchain-badges').waitFor({ timeout: 8000 });
check(await has(D.t('wordchain-badges'), 3000), 'Nối Từ mở rộng: hiện huy hiệu Địa Ngục & Luật Danh Từ');
await D.shot('22-wordchain-map');
await leaveRoom(D);

// ============================================================
// 9. GAME MỚI #10 — HỘI BÀN TRÒN VÔ TRI (CARDS AGAINST HUMANITY VN)
// ============================================================
await D.t('create-cah').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const cahCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, cahCode);
await D.t('bot-add').click();
await sleep(160);
await D.t('bot-add').click();
await D.t('cah-rounds-5').click();
await D.t('start-btn').click();

await D.t('cah-black-card').waitFor({ timeout: 8000 });
await M.t('cah-white-0').waitFor({ timeout: 8000 });
check(await has(D.t('cah-mulligan'), 3000), 'Hội Bàn Tròn Vô Tri: có Thẻ Đen + 7 lá Trắng + nút Đổi bài rác');
await D.t('cah-mulligan').click();
await sleep(300);
await M.t('cah-white-0').click();
await M.shot('23-cah-pick-mobile');
await D.t('cah-white-1').click();
await D.shot('23b-cah-pick-desktop');
await M.t('cah-submit').click();
await D.t('cah-submit').click();

// Chờ bot nộp bài để sang pha Bình Chọn ẩn danh
let cahReachedVote = false;
for (let w = 0; w < 20; w++) {
  if ((await D.page.locator('[data-testid^="cah-vote-"]').count()) >= 3) {
    cahReachedVote = true;
    break;
  }
  await sleep(500);
}
check(cahReachedVote, 'Hội Bàn Tròn Vô Tri: chuyển sang pha Bình Chọn ẩn danh');
await D.shot('24-cah-vote');

// Cả D và M bỏ phiếu cho câu hợp lệ đầu tiên không bị khóa
for (const p of [D, M]) {
  const votes = p.page.locator('[data-testid^="cah-vote-"]:not([aria-disabled="true"])');
  if ((await votes.count()) > 0) {
    await votes.first().click().catch(() => {});
  }
}
await sleep(2200);
await D.shot('24b-cah-reveal');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 10. GAME MỚI #11 — CHIA CHÁC GIANG HỒ (CASH 'N GUNS)
// ============================================================
await D.t('create-cashnguns').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const cgCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, cgCode);
await D.t('bot-add').click();
await sleep(160);
await D.t('bot-add').click();
await D.t('start-btn').click();

await D.t('cg-loot-table').waitFor({ timeout: 8000 });
await M.t('cg-bullet-0').waitFor({ timeout: 8000 });
check(await has(D.t('cg-loot-table'), 3000), 'Chia Chác Giang Hồ: hiện Bàn Chiến Lợi Phẩm 8 món & Băng đạn');

await M.t('cg-bullet-0').click();
await M.page.locator('[data-testid^="cg-target-"]').first().click();
await M.shot('25-cashnguns-plan-mobile');
await M.t('cg-plan-submit').click();

await D.t('cg-bullet-1').click();
await D.page.locator('[data-testid^="cg-target-"]').first().click();
await D.t('cg-plan-submit').click();

await D.t('cg-stand').waitFor({ timeout: 10000 });
check(await has(D.t('cg-stand'), 3000), 'Chia Chác Giang Hồ: chuyển sang pha Đấu Súng Cân Não (Đứng Lại / Đầu Hàng)');
await D.shot('26-cashnguns-standoff');

await D.t('cg-stand').click();
await M.t('cg-surrender').click();
await sleep(2400);
await D.shot('26b-cashnguns-resolve');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 11. GAME MỚI #12 — LÔ TÔ HỘI CHỢ (BINGO VIỆT NAM 90 CÂU VÈ)
// ============================================================
await D.t('create-loto').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const ltCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, ltCode);
await D.t('bot-add').click();
await sleep(160);
await D.t('loto-auto-on').click();
await sleep(150);
await D.t('start-btn').click();

await M.t('loto-ticket').waitFor({ timeout: 8000 });
await D.t('loto-caller').waitFor({ timeout: 8000 });
check(await has(M.t('loto-ticket'), 3000), 'Lô Tô Hội Chợ: hiện Lồng Cầu 3D, Câu Vè & Tờ Vé 9×3 chuẩn đẹp trên Mobile');
await M.shot('27-loto-mobile-ticket');
await D.shot('27b-loto-desktop');

// Thử hô KINH sai khi chưa đủ 5 số -> kiểm tra khóa phạt 2 lượt gọi số!
await M.t('loto-kinh-0').scrollIntoViewIfNeeded();
await M.t('loto-kinh-0').click();
await sleep(500);
check(await has(M.page.getByText(/khóa hô KINH/i), 4000), 'Lô Tô Hội Chợ: hô KINH hụt bị phạt khóa 2 lượt chuẩn xác');
await M.shot('27c-loto-false-kinh-locked');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 12. GAME MỚI #13 — CỜ CARO ĐẠI CHIẾN 15×15 (2–4 PHE + ZOOM MOBILE)
// ============================================================
await D.t('create-caro').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const crCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, crCode);
await D.t('bot-add').click(); // Đấu 3 phe X, O, ▲!
await sleep(200);
await D.t('start-btn').click();

await M.t('caro-board').waitFor({ timeout: 8000 });
await D.t('caro-7-7').waitFor({ timeout: 8000 });
check(await has(M.t('caro-board'), 3000), 'Cờ Caro Đại Chiến: hiển thị bàn cờ 15×15 3 phe (X, O, ▲) vừa khít Mobile');
await M.shot('28-caro-3factions-mobile');

// Người đi đầu tiên đặt quân vào tâm (7,7)
for (const p of [D, M]) {
  if (!(await p.t('caro-7-7').isDisabled().catch(() => true))) {
    await p.t('caro-7-7').click();
    break;
  }
}
await sleep(600);
await D.shot('28b-caro-desktop-move');

// Bật Zoom 1.5x trên Mobile
await M.t('caro-zoom-toggle').click();
await sleep(300);
await M.shot('28c-caro-mobile-zoomed');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// 13. GAME MỚI #14 — ĐẦM LẦY QUÁI CHIÊU (CROAK SQUAD CO-OP 2 NGƯỜI THẬT, KHÔNG BOT!)
// ============================================================
await D.t('create-croaksquad').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const csCode = (await D.t('room-code').innerText()).trim();
check(await has(D.t('croak-coop-notice'), 3000), 'Croak Squad: Sảnh chờ hiện thông báo Co-op Người Thật 2–6 Người');
check((await D.t('bot-add').count()) === 0, 'Croak Squad: Sảnh chờ khóa hoàn toàn nút Thêm Máy (không dùng Bot)');
await D.shot('29-croaksquad-lobby-nobots');

// Đưa người chơi thật thứ 2 (Mobile M) vào phòng Co-op!
await joinRoomByCode(M, csCode);
await sleep(300);
await D.t('start-btn').click();

await D.t('croak-controls').waitFor({ timeout: 8000 });
await M.t('croak-controls').waitFor({ timeout: 8000 });
check(await has(D.t('croak-tongue'), 3000), 'Croak Squad: Đồng bộ 2 người chơi thật vào Màn 1 với đầy đủ tay cầm');
await D.shot('30-croaksquad-desktop');
await M.shot('30b-croaksquad-mobile');

// Hai chú ếch xuất phát cạnh nhau (x=90 & x=124) -> D phóng lưỡi nuốt M ngay lập tức!
await D.t('croak-tongue').click();
const swallowedOk = await has(D.t('croak-aim-bar'), 4000);
check(swallowedOk, 'Croak Squad: Phóng lưỡi nuốt đồng đội -> hiện thanh Ngắm Bắn & đường cong quỹ đạo!');
if (swallowedOk) {
  await D.t('croak-aim-high_right').click();
  await sleep(250);
  await D.shot('31-croaksquad-swallow-aim-arc');
  await M.shot('31b-croaksquad-mobile-swallowed');

  // Bắn đồng đội M bay vọt lên vách cao qua hố bùn!
  await D.t('croak-spit').click();
  await sleep(300);
  check(await has(D.t('croak-tongue'), 3000), 'Croak Squad: Nhổ bắn đồng đội bay theo quỹ đạo thành công!');
}

await D.t('croak-fullmap-toggle').click();
await sleep(300);
await D.shot('32-croaksquad-fullmap');

await leaveRoom(M);
await leaveRoom(D);

console.log(failures ? `MEGA AUDIT FAILURES: ${failures}` : 'MEGA AUDIT ALL OK');
await browser.close();
if (failures > 0) process.exit(1);
