// Kiểm tra nhanh server thật: 2 người chơi qua WebSocket, thử cả 4 game, ném/đánh nhau, trò chuyện và tài khoản.
// Mỗi lần chạy tạo 1 tài khoản thử tên smoke_xxxx trong CSDL.
// Chạy (dùng socket.io-client có sẵn trong app/node_modules):
//   PowerShell:  $env:NODE_PATH="$PWD\app\node_modules"; node e2e\smoke-prod.cjs https://noi-tu-server.onrender.com
//   bash:        NODE_PATH=app/node_modules node e2e/smoke-prod.cjs https://noi-tu-server.onrender.com
const { io } = require('socket.io-client');
const URL = process.argv[2] || 'https://noi-tu-server.onrender.com';
const opts = { transports: ['websocket'], forceNew: true, reconnection: false };

function connect() {
  const s = io(URL, opts);
  s.state = null;
  s.fun = [];
  s.on('room:state', (st) => (s.state = st));
  s.chat = [];
  s.on('fun:event', (e) => s.fun.push(e));
  s.on('chat:msg', (m) => s.chat.push(m));
  return new Promise((res, rej) => {
    s.on('connect', () => res(s));
    s.on('connect_error', rej);
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (ok, msg) => {
  console.log(ok ? 'OK  ' : 'FAIL', msg);
  if (!ok) fails++;
};

(async () => {
  const t0 = Date.now();
  const health = await fetch(URL + '/health').then((r) => r.json());
  console.log('health:', JSON.stringify(health));
  const a = await connect();
  const b = await connect();
  console.log('kết nối WebSocket:', Date.now() - t0, 'ms');

  // tài khoản
  const username = 'smoke_' + Date.now().toString(36);
  const reg = await a.emitWithAck('auth:register', { username, password: 'smoke-' + Math.random(), displayName: 'Kiểm tra A' });
  check(reg.ok, `đăng ký tài khoản ${username}${reg.ok ? '' : ': ' + reg.error}`);
  if (reg.ok) {
    const x = await connect();
    const res = await x.emitWithAck('auth:resume', { token: reg.token });
    check(res.ok && res.user.username === username, 'dùng lại phiên đăng nhập trên kết nối khác');
    x.close();
  }
  const c = await a.emitWithAck('room:create', { name: 'Kiểm tra A' });
  const j = await b.emitWithAck('room:join', { code: c.code, name: 'Kiểm tra B' });
  check(c.ok && j.ok, `tạo phòng ${c.code} và vào phòng`);

  // ném dép
  check((await b.emitWithAck('fun:send', { kind: 'throw', to: c.playerId, item: 'dep' })).ok, 'ném dép');
  await wait(300);
  check(a.fun.some((f) => f.kind === 'throw' && f.item === 'dep'), 'người bị ném nhận được sự kiện');
  check(c.playerId.startsWith('u-') === !!reg.ok, 'người có tài khoản dùng id theo tài khoản');
  check((await b.emitWithAck('fun:send', { kind: 'hit', to: c.playerId, move: 'dam' })).ok, 'đấm');
  check((await b.emitWithAck('chat:send', { text: 'xin chào' })).ok, 'gửi tin nhắn');
  await wait(300);
  const hit = a.fun.find((f) => f.kind === 'hit');
  check(hit && hit.damage > 0, `bị đấm mất ${hit && hit.damage} máu`);
  check(a.chat.some((m) => m.text === 'xin chào'), 'nhận được tin nhắn');

  // Nối từ
  check((await a.emitWithAck('game:start')).ok, 'bắt đầu Nối từ');
  await wait(400);
  const g = a.state.game;
  check(g && g.type === 'wordchain' && g.nextCount > 0, `từ mở đầu: ${g && g.currentWord}, còn ${g && g.nextCount} từ`);
  const cur = g.currentPlayerId === c.playerId ? a : b;
  const hint = await cur.emitWithAck('game:action', { type: 'hint' });
  check(hint.ok && hint.hint, `cứu trợ gợi ý: ${hint.hint}`);
  check((await cur.emitWithAck('game:action', { type: 'submit', word: hint.hint })).ok, 'nối đúng bằng từ gợi ý');

  // đổi sang Nối từ Anh: phải rời ván rồi tạo phòng mới cho nhanh
  await a.emitWithAck('room:leave');
  await b.emitWithAck('room:leave');
  const c2 = await a.emitWithAck('room:create', { name: 'A', gameType: 'wordchain_en' });
  await b.emitWithAck('room:join', { code: c2.code, name: 'B' });
  check((await a.emitWithAck('game:start')).ok, 'bắt đầu Nối từ Anh');
  await wait(400);
  const eg = a.state.game;
  check(eg && eg.type === 'wordchain_en' && eg.nextCount > 0, `từ mở đầu tiếng Anh: ${eg && eg.currentWord}`);
  const ecur = eg.currentPlayerId === c2.playerId ? a : b;
  const ehint = await ecur.emitWithAck('game:action', { type: 'hint' });
  check(ehint.ok && ehint.hint, `cứu trợ tiếng Anh: ${ehint.hint}`);
  check((await ecur.emitWithAck('game:action', { type: 'submit', word: ehint.hint })).ok, 'nối đúng từ tiếng Anh');

  // Bầu cua
  await a.emitWithAck('room:leave');
  await b.emitWithAck('room:leave');
  const c3 = await a.emitWithAck('room:create', { name: 'A', gameType: 'baucua' });
  const j3 = await b.emitWithAck('room:join', { code: c3.code, name: 'B' });
  check((await a.emitWithAck('game:start')).ok, 'bắt đầu Bầu cua');
  check((await b.emitWithAck('game:action', { type: 'bet', symbol: 'cua', amount: 100 })).ok, 'đặt 100 xu vào Cua');
  check((await a.emitWithAck('game:action', { type: 'shake' })).ok === false, 'không còn lắc tay');
  // hết 20 giây cược máy tự lắc (2,6 giây) rồi mở bát
  for (let i = 0; i < 60 && b.state.game.step !== 'result'; i++) await wait(500);
  const bg = b.state.game;
  check(bg.step === 'result' && bg.dice.length === 3, `mở bát: ${bg.dice && bg.dice.join(', ')}, B ${bg.lastDeltas && bg.lastDeltas[j3.playerId]} xu`);
  await a.emitWithAck('room:leave');
  await b.emitWithAck('room:leave');

  // Cờ tỷ phú
  const c4 = await a.emitWithAck('room:create', { name: 'A', gameType: 'typhu' });
  await b.emitWithAck('room:join', { code: c4.code, name: 'B' });
  check((await a.emitWithAck('game:start')).ok, 'bắt đầu Cờ tỷ phú');
  await wait(400);
  const tg = a.state.game;
  check(tg.type === 'typhu' && tg.cash[c4.playerId] === 1500, 'mỗi người 1.500 xu');
  const tcur = tg.currentPlayerId === c4.playerId ? a : b;
  check((await tcur.emitWithAck('game:action', { type: 'roll' })).ok, 'đổ 2 xúc xắc');
  await wait(400);
  const tg2 = a.state.game;
  check(tg2.dice && tg2.dice.length === 2, `xúc xắc ra ${tg2.dice && tg2.dice.join(' + ')}, bước: ${tg2.step}`);
  await a.emitWithAck('room:leave');
  await b.emitWithAck('room:leave');
  a.close();
  b.close();
  console.log(fails ? `\n${fails} kiểm tra THẤT BẠI` : '\nTẤT CẢ ĐỀU QUA');
  process.exit(fails ? 1 : 0);
})().catch((e) => {
  console.error('LỖI', e.message);
  process.exit(1);
});
