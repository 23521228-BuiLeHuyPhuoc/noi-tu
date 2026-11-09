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
const turnSeconds = Number(process.env.TURN_SECONDS ?? 30);

const server = createGameServer(dict, { room: { turnMs: turnSeconds * 1000 } });
server.http.listen(port, () => {
  console.log(`Nối Từ server: cổng ${port}, ${dict.size} từ, ${turnSeconds}s/lượt`);
});
