// Kiểm tra nhanh server thật: 2 người chơi qua WebSocket, tạo phòng, vào phòng, bắt đầu, nối 1 từ.
// Chạy trong thư mục app/ (để dùng socket.io-client có sẵn):  node ../e2e/smoke-prod.cjs https://noi-tu-server.onrender.com
const { io } = require('socket.io-client');
const URL = process.argv[2] || 'https://noi-tu-server.onrender.com';
const opts = { transports: ['websocket'], forceNew: true, reconnection: false };

function connect() {
  const s = io(URL, opts);
  s.state = null;
  s.on('room:state', (st) => (s.state = st));
  return new Promise((res, rej) => {
    s.on('connect', () => res(s));
    s.on('connect_error', rej);
  });
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const t0 = Date.now();
  const a = await connect();
  const b = await connect();
  console.log('kết nối WebSocket:', Date.now() - t0, 'ms');
  const c = await a.emitWithAck('room:create', { name: 'Kiểm tra A' });
  const j = await b.emitWithAck('room:join', { code: c.code, name: 'Kiểm tra B' });
  console.log('tạo phòng', c.ok, c.code, '| vào phòng', j.ok);
  console.log('bắt đầu', (await a.emitWithAck('game:start')).ok);
  await wait(500);
  const st = a.state;
  console.log('từ mở đầu:', st.currentWord, '| còn', st.nextCount, 'từ nối được');
  const cur = st.currentPlayerId === c.playerId ? a : b;
  const bad = await cur.emitWithAck('word:submit', { word: st.currentWord.split(' ')[1] + ' xyzt' });
  console.log('gửi từ sai ->', JSON.stringify(bad));
  await a.emitWithAck('room:leave');
  await b.emitWithAck('room:leave');
  a.close();
  b.close();
  console.log('XONG');
})().catch((e) => {
  console.error('LỖI', e.message);
  process.exit(1);
});
