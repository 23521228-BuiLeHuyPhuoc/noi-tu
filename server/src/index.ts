import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { Dictionary } from './dictionary';
import { createGameServer } from './app';
import { MemoryStore, MongoStore, type Store } from './store';

// data/ nằm cạnh src/ khi chạy dev, hoặc cạnh dist/ khi chạy bản build
const here = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ?? [join(here, '..', 'data'), join(here, 'data')].find((d) => existsSync(d))!;

const dict = Dictionary.load(dataDir);
const port = Number(process.env.PORT ?? 3000);
// TURN_SECONDS (tùy chọn): ép thời gian mỗi lượt cho mọi game, chủ yếu để test nhanh
const turnSeconds = process.env.TURN_SECONDS ? Number(process.env.TURN_SECONDS) : undefined;

/** DATABASE: chuỗi kết nối MongoDB (đặt trong biến môi trường, KHÔNG ghi vào mã nguồn) */
async function openStore(): Promise<Store> {
  const uri = process.env.DATABASE;
  if (!uri) {
    console.warn('Chưa có DATABASE: tài khoản chỉ lưu tạm trong bộ nhớ');
    return new MemoryStore();
  }
  try {
    const store = await MongoStore.connect(uri, process.env.DATABASE_NAME || 'xomlay');
    const words = await store.listWords();
    let added = 0;
    for (const w of words) if (dict.add(w)) added++;
    console.log(`Đã kết nối MongoDB, nạp ${added} từ do người chơi duyệt`);
    return store;
  } catch (e) {
    console.error('Không kết nối được MongoDB, dùng bộ nhớ tạm:', (e as Error).message);
    return new MemoryStore();
  }
}

const store = await openStore();
const server = createGameServer(dict, { store, room: { turnMs: turnSeconds ? turnSeconds * 1000 : undefined } });
server.http.listen(port, () => {
  console.log(`Game server: cổng ${port}, ${dict.size} từ, lưu trữ: ${store.kind}${turnSeconds ? `, ${turnSeconds}s/lượt` : ''}`);
});
