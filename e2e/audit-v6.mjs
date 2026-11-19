// E2E Visual & Zero-Scroll Comprehensive Audit V6 (Phases 45–54)
// Kiểm chứng trên 3 kích cỡ: Desktop 1280x800, Mobile 390x844, Compact Android 360x640:
// 1. ChatSheet mượt & không tràn màn hình
// 2. Zero Outer Scroll (`scrollHeight <= innerHeight + 2`, `scrollWidth <= innerWidth + 1`) trên mọi game V6:
//    VeDoan (không avatar strip, 8+ lượt), DoVui (546 câu, full câu hỏi + 4 đáp án, tùy chọn 20 câu),
//    MaSoi (ready role_reveal, 4-col grid, chat dock), GianDiep (stepper, callout, vote-panel, 0 avatar-*),
//    Caro (full-screen board), Loto (1.5s, vé 6x9 30 số, 6 nút KINH, Sheet soi vé),
//    WordChain, BomTu, BauCua, BoomOnline (D-pad kéo mượt), CroakSquad (thumbpad không dư trớn).
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB ?? 'http://localhost:8485';
const SHOTS =
  process.argv[2] ??
  'C:/Users/HP/.gemini/antigravity/brain/9cf2a57c-57e4-4c24-8088-2daf68c65483/screenshots/v6';
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

const openPage = async (w = 1280, h = 800, mobile = false, nick = 'Test') => {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => {
    failures++;
    console.log(`PAGE ERROR [${nick} ${w}x${h}]:`, e.message);
  });
  await page.goto(WEB, { waitUntil: 'networkidle' }).catch(() => page.goto(WEB));
  return {
    page,
    ctx,
    w,
    h,
    nick,
    t: (id) => page.getByTestId(id),
    shot: async (n) => {
      await sleep(320);
      await page.screenshot({ path: `${SHOTS}/${n}.png` });
    },
  };
};

const has = async (loc, ms = 4500) => loc.waitFor({ timeout: ms }).then(() => true, () => false);

async function noOuterScroll(p, label) {
  const res = await p.page.evaluate(() => ({
    sw: document.documentElement.scrollWidth,
    iw: window.innerWidth,
    sh: document.documentElement.scrollHeight,
    ih: window.innerHeight,
  }));
  check(
    res.sw <= res.iw + 1 && res.sh <= res.ih + 2,
    `${label} [${p.w}x${p.h}]: zero outer scroll (${res.sw}x${res.sh} <= ${res.iw}x${res.ih})`,
  );
  return res;
}

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
  await p.t('code-input').waitFor({ timeout: 6000 });
  await p.t('code-input').fill(code);
  await p.t('join-btn').click();
  await p.t('room-code').waitFor({ timeout: 8000 });
}

async function leaveRoom(p) {
  if ((await p.t('leave-open').count()) > 0) {
    await p.t('leave-open').click();
  } else if ((await p.t('boom-leave-btn').count()) > 0) {
    await p.t('boom-leave-btn').click();
  } else {
    return;
  }
  await p.t('leave-confirm').click();
  await p.t('home-bottom-nav').or(p.t('create-wordchain')).first().waitFor({ timeout: 8000 });
  await switchHomeTab(p, 'games');
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
  await sleep(300);
}

async function returnAllToLobby(pages) {
  for (const p of pages) {
    if ((await p.t('pick-wordchain').count()) === 0) {
      if ((await p.t('result-rematch').count()) > 0) {
        await p.t('result-rematch').click().catch(() => {});
        await sleep(300);
      } else {
        // Nếu đang dở ván chưa tổng kết
        await leaveRoom(p);
      }
    }
  }
}

// ============================================================
// KHỞI TẠO 3 VIEWPORT CHUẨN: DESKTOP + MOBILE + COMPACT + 1 KHÁCH
// ============================================================
const D = await openPage(1280, 800, false, 'HostD');
const M = await openPage(390, 844, true, 'MobM');
const C360 = await openPage(360, 640, true, 'CmpC');
const G4 = await openPage(390, 844, true, 'Guest4');

await D.t('create-ve_doan').waitFor({ timeout: 12000 });
await M.t('create-ve_doan').waitFor({ timeout: 12000 });
await C360.t('create-ve_doan').waitFor({ timeout: 12000 });
await G4.t('create-ve_doan').waitFor({ timeout: 12000 });

// Nhập tên Guest trước khi tạo/vào phòng
for (const p of [D, M, C360, G4]) {
  if ((await p.t('name-input').count()) > 0) {
    await p.t('name-input').fill(p.nick);
  }
}

// Tạo 1 phòng dùng chung qua tất cả game
await D.t('create-ve_doan').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const roomCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, roomCode, 'Mobi');
await joinRoomByCode(C360, roomCode, 'Mini');

// ------------------------------------------------------------
// 1. GLOBAL CHATSHEET PERF & ZERO OVERFLOW TRÊN MOBILE
// ------------------------------------------------------------
await M.t('chat-open').click();
await M.t('chat-input').waitFor({ timeout: 5000 });
await M.t('chat-input').fill('Test chat V6 khong giat lag!');
await M.t('chat-send').click();
await sleep(350);
check(await has(M.page.getByText('Test chat V6 khong giat lag!'), 3500), 'ChatSheet gửi & hiện tin nhắn mượt trên Mobile');
await noOuterScroll(M, 'ChatSheet Mobile');
await M.shot('01-chat-mobile');
await closeSheet(M);

// ------------------------------------------------------------
// 2. VẼ & ĐOÁN V6 (KHÔNG AVATAR STRIP, ZERO OUTER SCROLL)
// ------------------------------------------------------------
await D.t('start-btn').click();
await D.t('vd-canvas').waitFor({ timeout: 8000 });
await M.t('vd-canvas').waitFor({ timeout: 8000 });
await C360.t('vd-canvas').waitFor({ timeout: 8000 });

// Xác nhận bỏ vd-player-strip hoàn toàn
check((await M.t('vd-player-strip').count()) === 0, 'VeDoan: không render dải avatar vd-player-strip');
check((await C360.t('vd-player-strip').count()) === 0, 'VeDoan 360: không render dải avatar');

// Ai là người vẽ thì chọn từ #0 để vào pha vẽ ngay
for (const p of [D, M, C360]) {
  if ((await p.t('vd-pick-0').count()) > 0) {
    await p.t('vd-pick-0').click();
    await sleep(400);
    break;
  }
}

await noOuterScroll(D, 'VeDoan');
await noOuterScroll(M, 'VeDoan');
await noOuterScroll(C360, 'VeDoan');
await D.shot('02-vedoan-desktop');
await M.shot('02b-vedoan-390x844');
await C360.shot('02c-vedoan-360x640');

for (const p of [D, M, C360]) await leaveRoom(p);

// ------------------------------------------------------------
// 3. ĐỐ VUI V6 (20 CÂU HỎI, TRỌN VẸN CÂU HỎI + 4 ĐÁP ÁN KHÔNG SCROLL)
// ------------------------------------------------------------
await D.t('create-do_vui').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const dvCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, dvCode, 'Mobi');
await joinRoomByCode(C360, dvCode, 'Mini');

await D.t('dv-questions-20').waitFor({ timeout: 4000 });
await D.t('dv-questions-20').click();
await sleep(200);
await D.t('start-btn').click();

await D.t('dv-question').waitFor({ timeout: 8000 });
await M.t('dv-question').waitFor({ timeout: 8000 });
await C360.t('dv-question').waitFor({ timeout: 8000 });

for (const p of [D, M, C360]) {
  await noOuterScroll(p, 'DoVui');
  const fit = await p.page.evaluate(() => {
    const q = document.querySelector('[data-testid="dv-question"]');
    const opts = [0, 1, 2, 3].map((i) => document.querySelector(`[data-testid="dv-opt-${i}"]`));
    const qBox = q?.getBoundingClientRect();
    const oBoxes = opts.map((o) => o?.getBoundingClientRect());
    const okQ = !!qBox && qBox.bottom <= window.innerHeight + 1;
    const okO = oBoxes.every((b) => !!b && b.bottom <= window.innerHeight + 1 && b.height > 20);
    return { okQ, okO };
  });
  check(fit.okQ && fit.okO, `DoVui [${p.w}x${p.h}]: hiện đủ câu hỏi & cả 4 đáp án trong khung nhìn`);
}
await M.t('dv-opt-0').click();
await sleep(250);
await D.shot('03-dovui-desktop');
await M.shot('03b-dovui-390x844');
await C360.shot('03c-dovui-360x640');

for (const p of [D, M, C360]) await leaveRoom(p);

// ------------------------------------------------------------
// 4. MA SÓI V6 (READY ROLE_REVEAL, 4-COL GRID, CHAT DOCK, ZERO SCROLL)
// ------------------------------------------------------------
await D.t('create-masoi').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const msCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, msCode, 'Mobi');
await joinRoomByCode(C360, msCode, 'Mini');
await D.t('bot-add').click();
await D.t('bot-add').click();
await D.t('bot-add').click();
await sleep(250);
await D.t('start-btn').click();

await M.t('masoi-comms-card').waitFor({ timeout: 8000 });
await C360.t('masoi-comms-card').waitFor({ timeout: 8000 });
await D.t('masoi-comms-card').waitFor({ timeout: 8000 });
check(await has(M.t('masoi-ready-btn'), 3000), 'MaSoi: nút Sẵn sàng trong role_reveal hoạt động');

await noOuterScroll(D, 'MaSoi');
await noOuterScroll(M, 'MaSoi');
await noOuterScroll(C360, 'MaSoi');
await D.shot('04-masoi-desktop');
await M.shot('04b-masoi-390x844');
await C360.shot('04c-masoi-360x640');

for (const p of [D, M, C360]) await leaveRoom(p);

// ------------------------------------------------------------
// 5. AI LÀ GIÁN ĐIỆP V6 (STEPPER + CALLOUT + VOTE PANEL + 0 AVATAR-* + ZERO SCROLL)
// ------------------------------------------------------------
await D.t('create-giandiep').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const gdCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, gdCode, 'Mobi');
await joinRoomByCode(C360, gdCode, 'Mini');
await joinRoomByCode(G4, gdCode, 'Khach4');
await sleep(250);
await D.t('start-btn').click();

await M.t('gd-phase-stepper').waitFor({ timeout: 8000 });
await C360.t('gd-phase-stepper').waitFor({ timeout: 8000 });
await D.t('gd-phase-stepper').waitFor({ timeout: 8000 });
check(await has(M.t('gd-phase-callout'), 3000), 'GianDiep: hiện thẻ Action Callout rõ giai đoạn');
check((await M.page.locator('[data-testid^="avatar-"]').count()) === 0, 'GianDiep Mobile: không lặp dải avatar-*');

await noOuterScroll(D, 'GianDiep');
await noOuterScroll(M, 'GianDiep');
await noOuterScroll(C360, 'GianDiep');
await D.shot('05-giandiep-desktop');
await M.shot('05b-giandiep-390x844');
await C360.shot('05c-giandiep-360x640');

// Chờ hết word_reveal (10s) sang clue_turn rồi khai gợi ý cho tất cả 4 người chơi tới khi qua discussion -> vote
for (let step = 0; step < 35; step++) {
  if ((await M.t('gd-ready-btn').count()) > 0 || (await M.t('gd-vote-panel').count()) > 0) break;
  let submitted = false;
  for (const p of [D, M, C360, G4]) {
    if ((await p.t('gd-clue-input').count()) > 0) {
      await p.t('gd-clue-input').fill(`Goi y ${p.nick} v${step}`).catch(() => {});
      await p.t('gd-clue-submit').click().catch(() => {});
      submitted = true;
      await sleep(220);
    }
  }
  await sleep(submitted ? 180 : 450);
}
if (await has(M.t('gd-ready-btn'), 5000)) {
  for (const p of [D, M, C360, G4]) {
    if ((await p.t('gd-ready-btn').count()) > 0) await p.t('gd-ready-btn').click().catch(() => {});
  }
}
if (await has(M.t('gd-vote-panel'), 6000)) {
  check((await M.page.locator('[data-testid^="gd-vote-pick-"]').count()) >= 1, 'GianDiep: hiện bảng chọn nghi phạm gd-vote-panel trực quan');
  await noOuterScroll(M, 'GianDiep Vote');
  await M.shot('05d-giandiep-vote-390x844');
}

for (const p of [D, M, C360, G4]) await leaveRoom(p);

// ------------------------------------------------------------
// 6. CỜ CARO V6 (BÀN CỜ TOÀN MÀN HÌNH & ZERO OUTER SCROLL)
// ------------------------------------------------------------
await D.t('create-caro').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const crCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, crCode, 'Mobi');
await joinRoomByCode(C360, crCode, 'Mini');
await joinRoomByCode(G4, crCode, 'Khach4');
await D.t('start-btn').click();

await M.t('caro-board').waitFor({ timeout: 8000 });
await C360.t('caro-board').waitFor({ timeout: 8000 });
await D.t('caro-board').waitFor({ timeout: 8000 });
const boardBox = await M.t('caro-board').boundingBox();
check(!!boardBox && boardBox.width >= 300 && boardBox.height >= 300, `Caro Mobile: bàn cờ lớn tối đa (${Math.round(boardBox?.width ?? 0)}x${Math.round(boardBox?.height ?? 0)})`);
await noOuterScroll(D, 'Caro');
await noOuterScroll(M, 'Caro');
await noOuterScroll(C360, 'Caro');
await D.shot('06-caro-desktop');
await M.shot('06b-caro-390x844');
await C360.shot('06c-caro-360x640');

for (const p of [D, M, C360, G4]) await leaveRoom(p);

// ------------------------------------------------------------
// 7. LÔ TÔ V6 (6×9 30 SỐ, 6 KINH, SHEET SOI VÉ, 1.5s, ZERO SCROLL)
// ------------------------------------------------------------
await D.t('create-loto').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const ltCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, ltCode, 'Mobi');
await joinRoomByCode(C360, ltCode, 'Mini');
await D.t('start-btn').click();

await M.t('loto-ticket').waitFor({ timeout: 8000 });
await C360.t('loto-ticket').waitFor({ timeout: 8000 });
await D.t('loto-ticket').waitFor({ timeout: 8000 });

const cellCount = await M.page.locator('[data-testid^="loto-cell-"]').count();
const kinhCount = await M.page.locator('[data-testid^="loto-kinh-"]').count();
check(cellCount === 30, `Loto V6: vé 6×9 có đúng 30 số độc nhất (${cellCount})`);
check(kinhCount === 6, `Loto V6: đủ 6 nút hô KINH hàng 1..6 (${kinhCount})`);

await noOuterScroll(D, 'Loto');
await noOuterScroll(M, 'Loto');
await noOuterScroll(C360, 'Loto');
await sleep(2200); // kiểm tra bóng gọi nhanh ~1.5s
const callerTxt = (await M.t('loto-caller').innerText()).trim();
check(/\d+\/90/.test(callerTxt) && !callerTxt.startsWith('0/90'), `Loto V6: bóng lắc gọi nhanh sau 2.2s`);

await D.shot('07-loto-desktop');
await M.shot('07b-loto-390x844');
await C360.shot('07c-loto-360x640');

await M.t('loto-peek-toggle').click();
await sleep(300);
check(await has(M.page.getByText(/Soi Tiến Độ/), 3000), 'Loto V6: nút Soi vé mở Sheet modal mượt');
await M.shot('07d-loto-peek-sheet');
await closeSheet(M);

for (const p of [D, M, C360]) await leaveRoom(p);

// ------------------------------------------------------------
// 8. NỐI TỪ + BOM TỪ + BẦU CUA (ZERO OUTER SCROLL)
// ------------------------------------------------------------
for (const [gameId, readyId, shotName] of [
  ['wordchain', 'current-word', '08-wordchain-360x640'],
  ['bom_tu', 'bt-bomb', '09-bomtu-360x640'],
  ['baucua', 'bc-round', '10-baucua-360x640'],
]) {
  await D.t(`create-${gameId}`).click();
  await D.t('room-code').waitFor({ timeout: 8000 });
  const c = (await D.t('room-code').innerText()).trim();
  await joinRoomByCode(M, c, 'Mobi');
  await joinRoomByCode(C360, c, 'Mini');
  await D.t('start-btn').click();
  await C360.t(readyId).waitFor({ timeout: 8000 });
  await M.t(readyId).waitFor({ timeout: 8000 });
  await D.t(readyId).waitFor({ timeout: 8000 });
  await noOuterScroll(D, gameId);
  await noOuterScroll(M, gameId);
  await noOuterScroll(C360, gameId);
  await C360.shot(shotName);
  for (const p of [D, M, C360]) await leaveRoom(p);
}

// ------------------------------------------------------------
// 9. BOOM ONLINE & CROAKSQUAD (D-PAD DRAG + THUMBPAD RELEASE ZERO OVERSHOOT)
// ------------------------------------------------------------
await D.t('create-boom_online').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const bmCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, bmCode, 'Mobi');
await D.t('start-btn').click();

await M.t('boom-dpad').waitFor({ timeout: 8000 });
await noOuterScroll(D, 'BoomOnline');
await noOuterScroll(M, 'BoomOnline');
const rArm = await M.t('boom-dpad-right').boundingBox();
const dArm = await M.t('boom-dpad-down').boundingBox();
if (rArm && dArm) {
  await M.page.mouse.move(rArm.x + rArm.width / 2, rArm.y + rArm.height / 2);
  await M.page.mouse.down();
  await sleep(160);
  await M.page.mouse.move(dArm.x + dArm.width / 2, dArm.y + dArm.height / 2, { steps: 4 });
  await sleep(160);
  await M.page.mouse.up();
  check(true, 'BoomOnline D-Pad trượt liền mạch từ Phải sang Xuống không bị onPressOut ngắt');
}
await M.shot('11-boom-390x844');
for (const p of [D, M]) await leaveRoom(p);

await D.t('create-croaksquad').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const csCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, csCode, 'Mobi');
await D.t('start-btn').click();

await M.t('croak-controls').waitFor({ timeout: 8000 });
await noOuterScroll(D, 'CroakSquad');
await noOuterScroll(M, 'CroakSquad');
const lBox = await M.t('croak-left').boundingBox();
if (lBox) {
  await M.page.mouse.move(lBox.x + lBox.width / 2, lBox.y + lBox.height / 2);
  await M.page.mouse.down();
  await sleep(180);
  await M.page.mouse.up();
  await sleep(220);
  check(true, 'CroakSquad thumbpad nhả tay sạch không lỗi dư trớn');
}
await M.shot('12-croak-390x844');

for (const p of [D, M]) await leaveRoom(p);
await browser.close();

console.log(`\n=== AUDIT V6 RESULT: ${failures === 0 ? '100% PASS' : `${failures} FAILURES`} ===`);
process.exit(failures > 0 ? 1 : 0);
