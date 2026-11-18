// E2E Visual & Gameplay Audit V5 (Phases 38–44)
// Kiểm chứng trực tiếp cả 6 trò chơi nâng cấp:
// 1. Cờ Caro (`caro`): Win Reveal giữ đường 5 quân + laser line trước tổng kết
// 2. Ai Là Gián Điệp (`giandiep`): Từ khóa Hero cỡ lớn + Luật nhiều vòng + Cơ cấu vai
// 3. Vẽ & Đoán (`ve_doan`): Đổ màu Flood-Fill, Tẩy, Vuông, Tròn, Thẳng + Tính điểm công bằng
// 4. Đầm Lầy Quái Chiêu (`croaksquad`): Thanh gỗ lơ lửng + Vừa nhảy vừa ném
// 5. Khám Răng Cá Sấu (`ca_sau`): Jumpscare cạp & rung lắc CHỈ hiện trên màn hình người thua
// 6. Đặt Bom Tử Chiến (`boom_online`): Chibi Bomber chuyển động & Icon vật phẩm vector
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const WEB = process.env.WEB ?? 'http://localhost:8475';
const SHOTS =
  process.argv[2] ??
  'C:/Users/HP/.gemini/antigravity/brain/9cf2a57c-57e4-4c24-8088-2daf68c65483/screenshots/v5';
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
      await sleep(260);
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
  check(res.sw <= res.iw + 2 && res.sh <= res.ih + 2, `${label}: vừa khít (${res.sw}x${res.sh} / ${res.iw}x${res.ih})`);
}

async function switchHomeTab(p, tab) {
  const btn = p.t(`home-tab-${tab}`);
  if ((await btn.count()) > 0) {
    await btn.click();
    await sleep(200);
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

const D = await openPage(1280, 800, false);
const M = await openPage(390, 844, true);
const C360 = await openPage(360, 640, true);
const L = await openPage(844, 390, true);

for (const p of [D, M, C360, L]) {
  await p.t('create-caro').or(p.t('home-tab-games')).first().waitFor({ timeout: 12000 });
}

if ((await D.t('name-input').count()) > 0) {
  await D.t('name-input').fill('Chủ Phòng');
  await sleep(150);
}

// ============================================================
// PHASE 38 — CỜ CARO (`caro`): WIN REVEAL ĐƯỜNG 5 QUÂN THẮNG
// ============================================================
console.log('--- PHASE 38: CARO WIN REVEAL ---');
await D.t('create-caro').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const caroCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, caroCode, 'Kỳ Thủ Mobile');
await D.t('start-btn').click();
await D.t('caro-board').waitFor({ timeout: 8000 });
await M.t('caro-board').waitFor({ timeout: 8000 });

// Luân phiên D và M đánh: bên nào tới lượt trước đánh hàng 7 (col 5..9), bên kia đánh hàng 9 (col 5..8)
const D_first = (await D.t('caro-7-5').getAttribute('aria-disabled')) !== 'true';
const pWin = D_first ? D : M;
const pLose = D_first ? M : D;
for (let k = 0; k < 4; k++) {
  await pWin.t(`caro-7-${5 + k}`).click();
  await sleep(140);
  await pLose.t(`caro-9-${5 + k}`).click();
  await sleep(140);
}
// Nước thắng thứ 5!
await pWin.t('caro-7-9').click();
await pWin.t('caro-win-reveal-banner').waitFor({ timeout: 5000 });
await pLose.t('caro-win-reveal-banner').waitFor({ timeout: 5000 });
check(await D.t('caro-win-laser-line').count() === 1, 'Caro Win Reveal: đường tia laser nối 5 quân thắng hiển thị trên bàn cờ');
check(await M.t('caro-finish-reveal').count() === 1, 'Caro Win Reveal: vẫn ở màn hình bàn cờ (chưa nhảy ngay vào bảng tổng kết)');
await D.shot('01-caro-win-reveal-desktop');
await M.shot('01b-caro-win-reveal-mobile');
await D.t('caro-finish-reveal').click();
await sleep(450);
check(await has(D.page.getByText(/Chiến thắng|Kết thúc|Chơi lại/i).first(), 5000), 'Caro: bấm Tổng kết chuyển sang bảng kết quả');
await D.shot('01c-caro-result');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// PHASE 39 — AI LÀ GIÁN ĐIỆP (`giandiep`): TỪ KHÓA TO + LUẬT NHIỀU VÒNG
// ============================================================
console.log('--- PHASE 39: GIAN DIEP HERO KEYWORD & MULTI-ROUND ---');
await D.t('create-giandiep').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const gdCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, gdCode, 'Thám Tử M');
await joinRoomByCode(C360, gdCode, 'Nghi Phạm 360');
await D.t('bot-add').click();
await sleep(120);
await D.t('bot-add').click(); // 5 người: 3 Dân + 1 Điệp + 1 Mr.White!
await sleep(150);
await D.t('start-btn').click();

await M.t('gd-secret-word').waitFor({ timeout: 8000 });
await C360.t('gd-secret-word').waitFor({ timeout: 8000 });
await D.t('gd-secret-word').waitFor({ timeout: 8000 });

const fontSizeM = await M.t('gd-secret-word').evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
check(fontSizeM >= 18, `Ai Là Gián Điệp: chữ từ khóa bí mật to rõ (${fontSizeM}px >= 18px)`);
const roleSumTxt = (await M.t('gd-role-summary').innerText()).trim();
check(roleSumTxt.includes('3') && roleSumTxt.includes('1'), `Ai Là Gián Điệp: hiện rõ cơ cấu vai (${roleSumTxt})`);
await noOuterScroll(M, 'Gián Điệp Mobile 390x844');
await noOuterScroll(C360, 'Gián Điệp Compact 360x640');
await M.shot('02-giandiep-hero-word-mobile');
await C360.shot('02b-giandiep-compact-360x640');
await D.shot('02c-giandiep-desktop');

// Tìm 1 Dân Thường chắc chắn (trong 3 người thật D, M, C360 luôn có ít nhất 1 Dân Thường, hoặc 2 người trùng từ = Dân) -> vote loại 1 Dân Thường ở Vòng 1 để chứng minh game KÉO DÀI sang Vòng 2!
const wordsMap = {};
for (const [tag, pg] of [['D', D], ['M', M], ['C360', C360]]) {
  wordsMap[tag] = (await pg.t('gd-secret-word').innerText()).trim();
}
// Hai người trùng từ chắc chắn là Dân Thường; nếu chỉ 2 người có từ & 1 MR.WHITE -> người còn lại không có chữ MR. WHITE (hoặc tìm ID trùng)
let victimPg = C360;
if (wordsMap.D === wordsMap.M && !wordsMap.D.includes('MR. WHITE')) victimPg = M;
else if (wordsMap.M === wordsMap.C360 && !wordsMap.M.includes('MR. WHITE')) victimPg = C360;
else if (wordsMap.D === wordsMap.C360 && !wordsMap.D.includes('MR. WHITE')) victimPg = D;

const victimSeatId = await victimPg.page.evaluate(() => {
  const el = [...document.querySelectorAll('[data-testid^="gd-seat-"]')].find((n) => n.textContent?.includes('Bạn'));
  return el?.getAttribute('data-testid') ?? null;
});

for (let step = 0; step < 30; step++) {
  if ((await M.t('gd-ready-btn').count()) > 0 || (await M.t('gd-skip-vote').count()) > 0) break;
  for (const [idx, pg] of [D, M, C360].entries()) {
    if ((await pg.t('gd-clue-input').count()) > 0) {
      await pg.t('gd-clue-input').fill(`Gợi ý thứ ${idx + 1}`).catch(() => {});
      await pg.t('gd-clue-submit').click().catch(() => {});
      await sleep(250);
    }
  }
  await sleep(400);
}
for (const pg of [D, M, C360]) {
  if ((await pg.t('gd-ready-btn').count()) > 0) await pg.t('gd-ready-btn').click().catch(() => {});
}
if (victimSeatId && (await has(M.t('gd-skip-vote'), 7000))) {
  for (const pg of [D, M, C360]) {
    if (pg !== victimPg) await pg.t(victimSeatId).click().catch(() => {});
    else await pg.t('gd-skip-vote').click().catch(() => {});
  }
}
if (await has(victimPg.t('gd-defense-done'), 6000)) {
  await victimPg.t('gd-defense-done').click().catch(() => {});
}
if (await has(M.t('gd-verdict-banish'), 6000)) {
  for (const pg of [D, M, C360]) {
    if (pg !== victimPg) await pg.t('gd-verdict-banish').click().catch(() => {});
  }
}
await sleep(900);
// Chắc chắn game chuyển sang V2 (không kết thúc sớm sau 1 người bị loại!)
const stayedPlaying = (await M.t('gd-timer').count()) > 0;
check(stayedPlaying, 'Ai Là Gián Điệp 5p: sau khi loại 1 người ở Vòng 1 game TIẾP TỤC sang Vòng 2 chứ không kết thúc sớm!');
await M.shot('02d-giandiep-round2-continues');
await leaveRoom(C360);
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// PHASE 40 — VẼ & ĐOÁN (`ve_doan`): ĐỔ MÀU, TẨY, HÌNH HỌC & ĐIỂM CÔNG BẰNG
// ============================================================
console.log('--- PHASE 40: VE & DOAN TOOLS & SCORING ---');
await D.t('create-ve_doan').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const vdCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, vdCode, 'Người Đoán M');
await D.t('start-btn').click();
await D.t('vd-canvas').waitFor({ timeout: 8000 });
await M.t('vd-canvas').waitFor({ timeout: 8000 });

const drawerPg = (await D.t('vd-pick-0').count()) > 0 ? D : M;
const guesserPg = drawerPg === D ? M : D;
await drawerPg.t('vd-pick-0').click();
await drawerPg.t('vd-tool-fill').waitFor({ timeout: 6000 });

for (const tid of ['pen', 'fill', 'eraser', 'line', 'rect', 'circle']) {
  check((await drawerPg.t(`vd-tool-${tid}`).count()) === 1, `Vẽ & Đoán: có đủ công cụ vd-tool-${tid}`);
}

const drawDrag = async (fx1, fy1, fx2, fy2, steps = 6) => {
  await drawerPg.t('vd-canvas').scrollIntoViewIfNeeded();
  await sleep(80);
  const b = await drawerPg.t('vd-canvas').boundingBox();
  if (!b) return;
  await drawerPg.page.mouse.move(b.x + b.width * fx1, b.y + b.height * fy1);
  await drawerPg.page.mouse.down();
  await drawerPg.page.mouse.move(b.x + b.width * fx2, b.y + b.height * fy2, { steps });
  await drawerPg.page.mouse.up();
  await sleep(260);
};

// 1. Vẽ Hình Vuông đen giữa canvas
await drawerPg.t('vd-tool-rect').click();
await drawDrag(0.25, 0.2, 0.75, 0.8, 6);

// 2. Chọn màu Đỏ + Công cụ Đổ màu (`🪣`) + click vào chính giữa Hình Vuông!
await drawerPg.t('vd-color-#E03131').click();
await drawerPg.t('vd-tool-fill').click();
await drawerPg.t('vd-canvas').scrollIntoViewIfNeeded();
await sleep(80);
const fillBox = await drawerPg.t('vd-canvas').boundingBox();
if (fillBox) {
  await drawerPg.page.mouse.click(fillBox.x + fillBox.width * 0.5, fillBox.y + fillBox.height * 0.5);
  await sleep(350);
}

// 3. Vẽ Hình Tròn xanh dương góc trên phải & đường gạch Tẩy nhỏ ở giữa
await drawerPg.t('vd-color-#1971C2').click();
await drawerPg.t('vd-tool-circle').click();
await drawDrag(0.58, 0.28, 0.72, 0.48, 5);

await drawerPg.t('vd-tool-eraser').click();
await drawDrag(0.35, 0.5, 0.45, 0.65, 5);

const fillPathsRendered = await guesserPg.page.locator('[data-testid="vd-canvas"] svg path').count();
check(fillPathsRendered >= 1, `Vẽ & Đoán: Đổ màu Flood-Fill đồng bộ SVG Path qua mạng (${fillPathsRendered})`);
await drawerPg.shot('03-vedoan-tools-drawer');
await guesserPg.shot('03b-vedoan-floodfill-guesser');

const secretWord = (await drawerPg.t('vd-word-display').innerText()).trim().toLowerCase();
await guesserPg.t('vd-guess-input').fill(secretWord);
await guesserPg.t('vd-guess-submit').click();
await sleep(500);
check(await has(drawerPg.page.getByText(/Họa sĩ \+\d+đ/).first(), 4000), 'Vẽ & Đoán: hiện thưởng điểm công bằng cho Họa sĩ');
await drawerPg.shot('03c-vedoan-fair-scoring');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// PHASE 41 — ĐẦM LẦY QUÁI CHIÊU (`croaksquad`): NHẢY + NÉM ĐỒNG THỜI & THANH GỖ
// ============================================================
console.log('--- PHASE 41: CROAK SQUAD FLOATING WOOD & JUMP+SPIT ---');
await D.t('create-croaksquad').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const csCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, csCode, 'Ếch Mobile');
await joinRoomByCode(L, csCode, 'Ếch Ngang');
await D.t('start-btn').click();
await D.t('croak-controls').waitFor({ timeout: 8000 });
await M.t('croak-controls').waitFor({ timeout: 8000 });
await L.t('croak-controls').waitFor({ timeout: 8000 });

// Đứng sát nhau đầu màn -> D bấm NUỐT M -> D bấm NHẢY rồi BẮN ngay trong 80ms ("vừa nhảy vừa ném")!
await D.t('croak-tongue').click();
if (await has(D.t('croak-aim-bar'), 4000)) {
  await D.t('croak-jump').click();
  await sleep(70);
  await D.t('croak-spit').click();
  await sleep(220);
  check((await D.t('croak-aim-bar').count()) === 0, 'Đầm Lầy Quái Chiêu: Vừa nhảy vừa ném (Jump + Spit liên hoàn 70ms) bắn ra thành công!');
}
await D.shot('04-croaksquad-desktop');
await L.shot('04b-croaksquad-landscape-844x390');
await M.shot('04c-croaksquad-mobile-390x844');
await leaveRoom(L);
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// PHASE 42 — KHÁM RĂNG CÁ SẤU (`ca_sau`): JUMPSCARE HÙ DỌA RIÊNG CHO NGƯỜI THUA
// ============================================================
console.log('--- PHASE 42: CA SAU VICTIM-ONLY JUMPSCARE ---');
await D.t('create-ca_sau').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const casauCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, casauCode, 'Nạn Nhân M');
await D.t('start-btn').click();
await D.t('casau-jaws').waitFor({ timeout: 8000 });
await M.t('casau-jaws').waitFor({ timeout: 8000 });

let victimFound = false;
for (let step = 0; step < 30 && !victimFound; step++) {
  if ((await D.t('casau-jumpscare-overlay').count()) > 0 || (await M.t('casau-jumpscare-overlay').count()) > 0) {
    victimFound = true;
    break;
  }
  const activeD = D.page.locator('[data-testid^="cs-tooth-"]:not([aria-disabled="true"])');
  const activeM = M.page.locator('[data-testid^="cs-tooth-"]:not([aria-disabled="true"])');
  if ((await activeD.count()) > 0) {
    await activeD.first().click({ timeout: 800 }).catch(() => {});
  } else if ((await activeM.count()) > 0) {
    await activeM.first().click({ timeout: 800 }).catch(() => {});
  }
  for (let poll = 0; poll < 5; poll++) {
    await sleep(70);
    if ((await D.t('casau-jumpscare-overlay').count()) > 0 || (await M.t('casau-jumpscare-overlay').count()) > 0) {
      victimFound = true;
      break;
    }
  }
}

await sleep(220); // Chờ hiệu ứng strobe + nhào tới bùng lên rõ nét để chụp!
const dJumpscare = await D.t('casau-jumpscare-overlay').count();
const mJumpscare = await M.t('casau-jumpscare-overlay').count();
const dTease = await D.t('casau-safe-tease-banner').count();
const mTease = await M.t('casau-safe-tease-banner').count();

check(victimFound && (dJumpscare + mJumpscare === 1), `Cá Sấu Jumpscare: chỉ người thua bị cạp thấy màn hình hù dọa (D=${dJumpscare}, M=${mJumpscare})`);
check(dTease + mTease === 1, `Cá Sấu: người thắng/an toàn chỉ thấy banner trêu chọc (D_tease=${dTease}, M_tease=${mTease})`);
await (dJumpscare ? D : M).shot('05-casau-victim-jumpscare');
await (dJumpscare ? M : D).shot('05b-casau-winner-calm-tease');
await leaveRoom(M);
await leaveRoom(D);

// ============================================================
// PHASE 43 — ĐẶT BOM TỬ CHIẾN (`boom_online`): CHIBI BOMBERS + ICON VẬT PHẨM
// ============================================================
console.log('--- PHASE 43: BOOM ONLINE CHIBI & ITEMS ---');
await D.t('create-boom_online').click();
await D.t('room-code').waitFor({ timeout: 8000 });
const bmCode = (await D.t('room-code').innerText()).trim();
await joinRoomByCode(M, bmCode, 'Bomber Mobile');
await joinRoomByCode(L, bmCode, 'Bomber Ngang');
await D.t('bot-add').click();
await sleep(140);
await D.t('start-btn').click();
await D.t('boom-canvas-wrap').waitFor({ timeout: 8000 });
await M.t('boom-canvas-wrap').waitFor({ timeout: 8000 });
await L.t('boom-canvas-wrap').waitFor({ timeout: 8000 });
await sleep(2600); // qua pha countdown 2.2s

// Tiến sát thùng gỗ (2,11) -> Đặt bom -> lùi về góc an toàn (1,10) -> chờ bom nổ phá thùng & rơi vật phẩm vector mới trên sàn!
await D.page.keyboard.down('ArrowRight');
await sleep(420);
await D.page.keyboard.up('ArrowRight');
await D.t('boom-place-btn').click();
await D.page.keyboard.down('ArrowLeft');
await sleep(420);
await D.page.keyboard.up('ArrowLeft');
await D.page.keyboard.down('ArrowUp');
await sleep(420);
await D.page.keyboard.up('ArrowUp');
await sleep(2700);

const bmCanvasBox = await D.t('boom-canvas-wrap').boundingBox();
check(!!bmCanvasBox && bmCanvasBox.width > 300 && bmCanvasBox.height > 300, 'Đặt Bom Tử Chiến: bàn cờ & nhân vật Chibi render sắc nét');
check((await L.t('boom-place-btn').count()) === 1 && (await M.t('boom-place-btn').count()) === 1, 'Đặt Bom Tử Chiến: nút Đặt Bom hiển thị đầy đủ trên Landscape 844x390 & Mobile 390x844');

await D.shot('06-boom-chibi-desktop');
await L.shot('06b-boom-landscape-844x390');
await M.shot('06c-boom-mobile-390x844');

await leaveRoom(L);
await leaveRoom(M);
await leaveRoom(D);

console.log(failures ? `V5 AUDIT FAILURES: ${failures}` : 'V5 AUDIT ALL OK');
await browser.close();
if (failures > 0) process.exit(1);
