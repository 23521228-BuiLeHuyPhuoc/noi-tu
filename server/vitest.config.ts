import { defineConfig } from 'vitest/config';

// Một số test đọc code thuần của app (app/src/memeBoard.ts); dùng tsconfig của server để không cần
// cài gói của app (tsconfig app kế thừa expo/tsconfig.base).
export default defineConfig({ tsconfig: 'tsconfig.json' });
