// Kiểm tra nhanh server thật: 2 người chơi qua WebSocket, thử cả 3 game và tính năng ném.
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
  s.on('fun:event', (e) => s.fun.push(e));
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
  const a = await connect();
  const b = await connect();
  console.log('kết nối WebSocket:', Date.now() - t0, 'ms');
  const c = await a.emitWithAck('room:create', { name: 'Kiểm tra A' });
  const j = await b.emitWithAck('room:join', { code: c.code, name: 'Kiểm tra B' });
  check(c.ok && j.ok, `tạo phòng ${c.code} và vào phòng`);

  // ném dép
  check((await b.emitWithAck('fun:send', { kind: 'throw', to: c.playerId, item: 'dep' })).ok, 'ném dép');
  await wait(300);
  check(a.fun.some((f) => f.kind === 'throw' && f.item === 'dep'), 'người bị ném nhận được sự kiện');

  // Nối từ
  check((await a.emitWithAck('game:start')).ok, 'bắt đầu Nối từ');
  await wait(400);
  const g = a.state.game;
  check(g && g.type === 'wordchain' && g.nextCount > 0, `từ mở đầu: ${g && g.currentWord}, còn ${g && g.nextCount} từ`);
  const cur = g.currentPlayerId === c.playerId ? a : b;
  const hint = await cur.emitWithAck('game:action', { type: 'hint' });
  check(hint.ok && hint.hint, `cứu trợ gợi ý: ${hint.hint}`);
  check((await cur.emitWithAck('game:action', { type: 'submit', word: hint.hint })).ok, 'nối đúng bằng từ gợi ý');

  // đổi sang Cờ cá ngựa: phải rời ván rồi tạo phòng mới cho nhanh
  await a.emitWithAck('room:leave');
  await b.emitWithAck('room:leave');
  const c2 = await a.emitWithAck('room:create', { name: 'A', gameType: 'ludo' });
  await b.emitWithAck('room:join', { code: c2.code, name: 'B' });
  check((await a.emitWithAck('room:config', { settings: { ludoPieces: 2 } })).ok, 'Cờ cá ngựa: chọn 2 ngựa');
  check((await a.emitWithAck('game:start')).ok, 'bắt đầu Cờ cá ngựa');
  await wait(400);
  const lg = a.state.game;
  const lcur = lg.currentPlayerId === c2.playerId ? a : b;
  check((await lcur.emitWithAck('game:action', { type: 'roll' })).ok, 'đổ xúc xắc');
  await wait(400);
  check(a.state.game.dice >= 1 && a.state.game.dice <= 6, `xúc xắc ra ${a.state.game.dice}`);

  // Bầu cua
  await a.emitWithAck('room:leave');
  await b.emitWithAck('room:leave');
  const c3 = await a.emitWithAck('room:create', { name: 'A', gameType: 'baucua' });
  const j3 = await b.emitWithAck('room:join', { code: c3.code, name: 'B' });
  check((await a.emitWithAck('game:start')).ok, 'bắt đầu Bầu cua');
  check((await b.emitWithAck('game:action', { type: 'bet', symbol: 'cua', amount: 100 })).ok, 'đặt 100 xu vào Cua');
  check((await a.emitWithAck('game:action', { type: 'shake' })).ok, 'chủ phòng lắc');
  await wait(3500);
  const bg = b.state.game;
  check(bg.step === 'result' && bg.dice.length === 3, `mở bát: ${bg.dice && bg.dice.join(', ')}, B ${bg.lastDeltas && bg.lastDeltas[j3.playerId]} xu`);
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
