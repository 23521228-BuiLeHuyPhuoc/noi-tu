import { edit } from './scratch-lib.mjs';
edit('server/src/app.ts', [
[`  now?: () => number;
}`, `  now?: () => number;
  /** số lượt chọc miễn phí mỗi ngày (mặc định 30; test hạ thấp cho nhanh) */
  freePokes?: number;
}`],
[`quota: new FunQuota(now) }`, `quota: new FunQuota(now, opts.freePokes) }`],
]);
