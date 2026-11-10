/** 1.300 -> "1,3k"; 12.400 -> "12k" (gọn cho dòng dưới avatar) */
export const compactXu = (n: number) =>
  n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',').replace(/,0$/, '')}k` : String(n);
