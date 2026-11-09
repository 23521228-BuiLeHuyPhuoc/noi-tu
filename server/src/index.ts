import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { Dictionary } from './dictionary';
import { createGameServer } from './app';

// data/ nằm cạnh src/ khi chạy dev, hoặc cạnh dist/ khi chạy bản build
const here = dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.DATA_DIR ?? [join(here, '..', 'data'), join(here, 'data')].find((d) => existsSync(d))!;

const dict = Dictionary.load(dataDir);
const port = Number(process.env.PORT ?? 3000);
// TURN_SECONDS (tùy chọn): ép thời gian mỗi lượt cho mọi game, chủ yếu để test nhanh
const turnSeconds = process.env.TURN_SECONDS ? Number(process.env.TURN_SECONDS) : undefined;

const server = createGameServer(dict, { room: { turnMs: turnSeconds ? turnSeconds * 1000 : undefined } });
server.http.listen(port, () => {
  console.log(`Game server: cổng ${port}, ${dict.size} từ${turnSeconds ? `, ${turnSeconds}s/lượt` : ''}`);
});
