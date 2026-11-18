/**
 * Kiểu dữ liệu, luật thắng "chặn hai đầu", co giãn kích thước bàn cờ theo số phe & AI chiến thuật cho Cờ Caro Đại Chiến (`caro`, 2–4 người).
 * Thuần TypeScript, không phụ thuộc thư viện ngoài.
 */

export const CARO_SIZE = 15;
export const CARO_WIN_LEN = 5;

/** Chế độ kích thước bàn cờ: `auto` tự mở rộng theo số phe (15×15 → 22×22 → 28×28), `mega` siêu đại chiến (24×24 → 28×28 → 32×32) */
export type CaroSizeMode = 'auto' | 'mega';

/**
 * Tính kích thước cạnh bàn cờ theo số người tham chiến:
 * - 2 phe (`auto`): `15×15` (`225` ô — chuẩn Gomoku đối kháng)
 * - 3 phe (`auto`): `22×22` (`484` ô — rộng gấp `2.15×` bàn 2 người!)
 * - 4 phe (`auto`): `28×28` (`784` ô — rộng gấp `3.48×` bàn 2 người!)
 * - Chế độ `mega`: nâng lên `24×24` (`576` ô) cho 2 phe, `28×28` (`784` ô) cho 3 phe, `32×32` (`1024` ô) cho 4 phe!
 */
export function caroSizeForPlayers(playerCount: number, mode: CaroSizeMode = 'auto'): number {
  if (mode === 'mega') {
    if (playerCount <= 2) return 24;
    if (playerCount === 3) return 28;
    return 32;
  }
  if (playerCount <= 2) return CARO_SIZE;
  if (playerCount === 3) return 22;
  return 28;
}

/** X đỏ, O xanh dương, A tam giác vàng, D thoi ngọc (hỗ trợ cả solo 2 người lẫn Hỗn Chiến 3–4 người) */
export type CaroSymbol = 'X' | 'O' | 'A' | 'D';

export const CARO_SYMBOLS: readonly CaroSymbol[] = ['X', 'O', 'A', 'D'];

export interface CaroMove {
  row: number;
  col: number;
  playerId: string;
  symbol: CaroSymbol;
  moveNum: number;
}

export interface CaroView {
  type: 'caro';
  size: number;
  sizeMode?: CaroSizeMode;
  blockTwoEnds: boolean;
  order: string[];
  names: Record<string, string>;
  symbols: Record<string, CaroSymbol>;
  /** mảng phẳng length = size * size, rỗng là null */
  board: (CaroSymbol | null)[];
  currentPlayerId: string | null;
  turnEndsAt: number | null;
  turnSeconds: number;
  lastMove: CaroMove | null;
  moveCount: number;
  winLine: [number, number][] | null;
  winnerId: string | null;
  isDraw: boolean;
}

const AXES: readonly [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function inBounds(size: number, r: number, c: number): boolean {
  return r >= 0 && r < size && c >= 0 && c < size;
}

/**
 * Kiểm tra nước đi tại `(row, col)` có tạo thành hàng thắng trên bàn cờ `size × size` hay không.
 * - Quét cả 4 trục `(0,1), (1,0), (1,1), (1,-1)`.
 * - Nếu `blockTwoEnds === true`: dãy **đúng 5 quân** bị chặn sát ngay 2 đầu bởi 2 quân khác phe (`!== null && !== sym`)
 *   sẽ **không được tính thắng** (luật Caro Việt Nam "chặn hai đầu"). Biên bàn cờ không phải quân địch nên không tính là đầu chặn.
 * - Trả về mảng tọa độ `[row, col][]` của đường thắng, hoặc `null` nếu chưa thắng.
 */
export function checkCaroWin(
  board: readonly (CaroSymbol | null)[],
  size: number,
  row: number,
  col: number,
  blockTwoEnds: boolean,
): [number, number][] | null {
  if (!inBounds(size, row, col)) return null;
  const sym = board[row * size + col];
  if (!sym) return null;

  for (const [dr, dc] of AXES) {
    const backCells: [number, number][] = [];
    let br = row - dr;
    let bc = col - dc;
    while (inBounds(size, br, bc) && board[br * size + bc] === sym) {
      backCells.push([br, bc]);
      br -= dr;
      bc -= dc;
    }
    backCells.reverse();

    const frontCells: [number, number][] = [];
    let fr = row + dr;
    let fc = col + dc;
    while (inBounds(size, fr, fc) && board[fr * size + fc] === sym) {
      frontCells.push([fr, fc]);
      fr += dr;
      fc += dc;
    }

    const line: [number, number][] = [...backCells, [row, col], ...frontCells];
    if (line.length < CARO_WIN_LEN) continue;

    if (blockTwoEnds && line.length === CARO_WIN_LEN) {
      const backEnemy = inBounds(size, br, bc) && board[br * size + bc] !== null && board[br * size + bc] !== sym;
      const frontEnemy = inBounds(size, fr, fc) && board[fr * size + fc] !== null && board[fr * size + fc] !== sym;
      if (backEnemy && frontEnemy) {
        continue;
      }
    }

    return line;
  }

  return null;
}

/**
 * Đếm số điểm thắng ngay ở lượt kế tiếp dọc theo 1 trục sau khi đã đặt thử `sym` vào `(r, c)`.
 */
function countAxisNextWins(
  workBoard: (CaroSymbol | null)[],
  size: number,
  r: number,
  c: number,
  dr: number,
  dc: number,
  negLimit: number,
  posLimit: number,
  sym: CaroSymbol,
  blockTwoEnds: boolean,
): number {
  let winSpots = 0;
  for (let step = -negLimit; step <= posLimit; step++) {
    if (step === 0) continue;
    const nr = r + step * dr;
    const nc = c + step * dc;
    const idx = nr * size + nc;
    if (workBoard[idx] !== null) continue;

    workBoard[idx] = sym;
    const won = checkCaroWin(workBoard, size, nr, nc, blockTwoEnds) !== null;
    workBoard[idx] = null;
    if (won) winSpots++;
  }
  return winSpots;
}

/**
 * Chấm điểm thế cờ nếu `sym` đánh vào ô trống `(r, c)`.
 * Phát hiện: Tứ Mở (Open-4), Tứ Kín / Tứ Nhảy (Split-4), Tam Mở (Open-3), Tam Nhảy Mở (Split Open-3), Đôi Tam / Tứ-Tam.
 */
function evaluateSymbolMove(
  workBoard: (CaroSymbol | null)[],
  size: number,
  r: number,
  c: number,
  sym: CaroSymbol,
  blockTwoEnds: boolean,
): number {
  const centerIdx = r * size + c;
  workBoard[centerIdx] = sym;

  let total = 0;
  let strongAxes = 0;

  for (const [dr, dc] of AXES) {
    let negLimit = 0;
    for (let k = 1; k <= 4; k++) {
      const nr = r - k * dr;
      const nc = c - k * dc;
      if (!inBounds(size, nr, nc)) break;
      const cell = workBoard[nr * size + nc];
      if (cell !== null && cell !== sym) break;
      negLimit = k;
    }
    const backOutR = r - (negLimit + 1) * dr;
    const backOutC = c - (negLimit + 1) * dc;
    const enemyBack =
      inBounds(size, backOutR, backOutC) &&
      workBoard[backOutR * size + backOutC] !== null &&
      workBoard[backOutR * size + backOutC] !== sym;

    let posLimit = 0;
    for (let k = 1; k <= 4; k++) {
      const nr = r + k * dr;
      const nc = c + k * dc;
      if (!inBounds(size, nr, nc)) break;
      const cell = workBoard[nr * size + nc];
      if (cell !== null && cell !== sym) break;
      posLimit = k;
    }
    const frontOutR = r + (posLimit + 1) * dr;
    const frontOutC = c + (posLimit + 1) * dc;
    const enemyFront =
      inBounds(size, frontOutR, frontOutC) &&
      workBoard[frontOutR * size + frontOutC] !== null &&
      workBoard[frontOutR * size + frontOutC] !== sym;

    const span = negLimit + 1 + posLimit;
    if (span < CARO_WIN_LEN) continue;
    if (blockTwoEnds && span === CARO_WIN_LEN && enemyBack && enemyFront) continue;

    // Kiểm tra nước này có tạo Tứ Mở (2 đầu thắng ngay) hoặc Tứ Kín / Tứ Nhảy (1 điểm thắng ngay) không
    const nextWinSpots = countAxisNextWins(workBoard, size, r, c, dr, dc, negLimit, posLimit, sym, blockTwoEnds);
    if (nextWinSpots >= 2) {
      total += 120_000;
      strongAxes++;
      continue;
    }
    if (nextWinSpots === 1) {
      total += 16_000;
      strongAxes++;
      continue;
    }

    // Đo chuỗi liên tiếp đi qua (r, c)
    let runNeg = 0;
    while (runNeg < negLimit && workBoard[(r - (runNeg + 1) * dr) * size + (c - (runNeg + 1) * dc)] === sym) {
      runNeg++;
    }
    let runPos = 0;
    while (runPos < posLimit && workBoard[(r + (runPos + 1) * dr) * size + (c + (runPos + 1) * dc)] === sym) {
      runPos++;
    }

    const contig = runNeg + 1 + runPos;
    const openBack = runNeg < negLimit;
    const openFront = runPos < posLimit;

    if (contig === 3) {
      if (openBack && openFront) {
        // Kiểm tra ít nhất 1 trong 2 đầu trống có thể phát triển thành Tứ Mở không
        let canMakeOpen4 = false;
        const ends: [number, number][] = [
          [r - (runNeg + 1) * dr, c - (runNeg + 1) * dc],
          [r + (runPos + 1) * dr, c + (runPos + 1) * dc],
        ];
        for (const [er, ec] of ends) {
          const eIdx = er * size + ec;
          workBoard[eIdx] = sym;
          const winsFromEnd = countAxisNextWins(workBoard, size, r, c, dr, dc, negLimit, posLimit, sym, blockTwoEnds);
          workBoard[eIdx] = null;
          if (winsFromEnd >= 2) {
            canMakeOpen4 = true;
            break;
          }
        }
        if (canMakeOpen4) {
          total += 12_000;
          strongAxes++;
        } else {
          total += 2_500;
        }
      } else if (openBack || openFront) {
        total += 1_200;
      }
      continue;
    }

    // Kiểm tra Tam Nhảy Mở (. X . X X . hoặc . X X . X .): thử điền vào 2 ô trống sát cạnh chuỗi hiện tại
    let madeSplitOpen3 = false;
    const gapCandidates: [number, number][] = [];
    if (openBack) gapCandidates.push([r - (runNeg + 1) * dr, c - (runNeg + 1) * dc]);
    if (openFront) gapCandidates.push([r + (runPos + 1) * dr, c + (runPos + 1) * dc]);

    for (const [gr, gc] of gapCandidates) {
      const gIdx = gr * size + gc;
      workBoard[gIdx] = sym;
      const winsIfFilled = countAxisNextWins(workBoard, size, r, c, dr, dc, negLimit, posLimit, sym, blockTwoEnds);
      workBoard[gIdx] = null;
      if (winsIfFilled >= 2) {
        madeSplitOpen3 = true;
        break;
      }
    }

    if (madeSplitOpen3) {
      total += 10_500;
      strongAxes++;
      continue;
    }

    if (contig === 2) {
      if (openBack && openFront) {
        total += 450;
      } else if (openBack || openFront) {
        total += 90;
      }
    } else if (openBack && openFront) {
      // Kiểm tra Nhị Nhảy Mở (. X . X .)
      let splitTwo = false;
      if (runNeg + 2 <= negLimit && workBoard[(r - (runNeg + 2) * dr) * size + (c - (runNeg + 2) * dc)] === sym) {
        splitTwo = true;
      }
      if (runPos + 2 <= posLimit && workBoard[(r + (runPos + 2) * dr) * size + (c + (runPos + 2) * dc)] === sym) {
        splitTwo = true;
      }
      total += splitTwo ? 300 : 25;
    }
  }

  workBoard[centerIdx] = null;

  // Điểm thưởng lớn cho nước đôi (Đôi Tam, Tứ-Tam, Đôi Tứ)
  if (strongAxes >= 2) {
    total += (strongAxes - 1) * 45_000;
  }

  return total;
}

function proximityBonus(
  board: readonly (CaroSymbol | null)[],
  size: number,
  r: number,
  c: number,
  mySymbol: CaroSymbol,
): number {
  let score = 0;
  for (let dr = -2; dr <= 2; dr++) {
    for (let dc = -2; dc <= 2; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (!inBounds(size, nr, nc)) continue;
      const cell = board[nr * size + nc];
      if (!cell) continue;
      const dist = Math.max(Math.abs(dr), Math.abs(dc));
      if (dist === 1) {
        score += cell === mySymbol ? 32 : 24;
      } else {
        score += cell === mySymbol ? 10 : 7;
      }
    }
  }
  const mid = (size - 1) / 2;
  const centerDist = Math.abs(r - mid) + Math.abs(c - mid);
  score += Math.max(0, size - centerDist) * 1.5;
  return score;
}

function safeJitter(rng: () => number): number {
  const v = rng();
  if (!Number.isFinite(v) || v < 0) return 0;
  return Math.min(0.999999, v) * 2;
}

/**
 * AI chiến thuật chọn nước đi tối ưu cho `mySymbol`:
 * 1. Đánh ngay ô trung tâm nếu bàn cờ đang trống.
 * 2. Thắng ngay lập tức nếu có nước tạo 5 quân hợp lệ (`checkCaroWin`).
 * 3. Chặn ngay lập tức mọi nước thắng trực tiếp (4 quân nối tiếp hoặc 4 quân nhảy `XX_XX`, `X_XXX`) của bất kỳ đối thủ nào.
 * 4. Tấn công & phòng thủ Tam Mở (`open-3`), Tứ Nhảy (`split-4`), Đôi Tam / Tứ-Tam; phá hòa ưu tiên gần các quân đã đánh.
 */
export function pickCaroBotMove(
  board: readonly (CaroSymbol | null)[],
  size: number,
  mySymbol: CaroSymbol,
  blockTwoEnds: boolean,
  rng: () => number,
): { row: number; col: number } {
  const mid = Math.floor(size / 2);
  const totalCells = size * size;

  let stoneCount = 0;
  const oppSet = new Set<CaroSymbol>();
  for (let i = 0; i < totalCells; i++) {
    const s = board[i];
    if (s !== null) {
      stoneCount++;
      if (s !== mySymbol) oppSet.add(s);
    }
  }

  // 1. Bàn cờ trống -> đánh chính giữa
  if (stoneCount === 0) {
    return { row: mid, col: mid };
  }

  if (oppSet.size === 0) {
    for (const s of CARO_SYMBOLS) {
      if (s !== mySymbol) {
        oppSet.add(s);
        break;
      }
    }
  }
  const opponents = Array.from(oppSet);
  const workBoard: (CaroSymbol | null)[] = board.slice();

  // Gom danh sách ô trống lân cận bán kính 2 quanh các quân đã có (kèm ô trung tâm nếu trống)
  const candidateMask = new Uint8Array(totalCells);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r * size + c] === null) continue;
      const rMin = Math.max(0, r - 2);
      const rMax = Math.min(size - 1, r + 2);
      const cMin = Math.max(0, c - 2);
      const cMax = Math.min(size - 1, c + 2);
      for (let nr = rMin; nr <= rMax; nr++) {
        for (let nc = cMin; nc <= cMax; nc++) {
          if (board[nr * size + nc] === null) {
            candidateMask[nr * size + nc] = 1;
          }
        }
      }
    }
  }
  if (inBounds(size, mid, mid) && board[mid * size + mid] === null) {
    candidateMask[mid * size + mid] = 1;
  }

  const candidates: [number, number][] = [];
  for (let i = 0; i < totalCells; i++) {
    if (candidateMask[i]) {
      candidates.push([Math.floor(i / size), i % size]);
    }
  }

  // Dự phòng trường hợp bàn cờ đặc biệt
  if (candidates.length === 0) {
    for (let i = 0; i < totalCells; i++) {
      if (board[i] === null) {
        candidates.push([Math.floor(i / size), i % size]);
      }
    }
    if (candidates.length === 0) {
      return { row: 0, col: 0 };
    }
  }

  // 2. Ưu tiên tuyệt đối: nước thắng ngay lập tức (5 quân hợp lệ)
  const winningMoves: [number, number][] = [];
  for (const [r, c] of candidates) {
    const idx = r * size + c;
    workBoard[idx] = mySymbol;
    const won = checkCaroWin(workBoard, size, r, c, blockTwoEnds) !== null;
    workBoard[idx] = null;
    if (won) winningMoves.push([r, c]);
  }
  if (winningMoves.length > 0) {
    const pick = winningMoves[Math.min(winningMoves.length - 1, Math.floor((safeJitter(rng) / 2) * winningMoves.length))];
    return { row: pick[0], col: pick[1] };
  }

  // 3. Chặn khẩn cấp: mọi ô mà đối thủ đặt vào là thắng ngay lập tức (kể cả Tứ Kín, Tứ Mở, Tứ Nhảy XX_XX)
  const urgentBlocks: { row: number; col: number; threatsBlocked: number; tieScore: number }[] = [];
  for (const [r, c] of candidates) {
    const idx = r * size + c;
    let threatsBlocked = 0;
    for (const opp of opponents) {
      workBoard[idx] = opp;
      if (checkCaroWin(workBoard, size, r, c, blockTwoEnds) !== null) {
        threatsBlocked++;
      }
      workBoard[idx] = null;
    }
    if (threatsBlocked > 0) {
      const myAttack = evaluateSymbolMove(workBoard, size, r, c, mySymbol, blockTwoEnds);
      const prox = proximityBonus(board, size, r, c, mySymbol) + safeJitter(rng);
      urgentBlocks.push({ row: r, col: c, threatsBlocked, tieScore: myAttack + prox });
    }
  }
  if (urgentBlocks.length > 0) {
    urgentBlocks.sort((a, b) => b.threatsBlocked - a.threatsBlocked || b.tieScore - a.tieScore);
    return { row: urgentBlocks[0].row, col: urgentBlocks[0].col };
  }

  // 4. Đánh giá chiến thuật toàn diện (Tấn công + Phòng thủ Tam Mở / Tứ Nhảy / Đôi Tam + Vị trí gần quân)
  // Trên bàn đại chiến 28×28 / 32×32 giai đoạn cuối ván (>90 ô trống lân cận), lọc 90 điểm nóng nhất theo mật độ quân để giữ <2ms/nước!
  const evalPool =
    candidates.length > 90
      ? [...candidates]
          .sort(
            (a, b) =>
              proximityBonus(board, size, b[0], b[1], mySymbol) -
              proximityBonus(board, size, a[0], a[1], mySymbol),
          )
          .slice(0, 90)
      : candidates;

  let bestRow = evalPool[0][0];
  let bestCol = evalPool[0][1];
  let bestScore = -Infinity;

  for (const [r, c] of evalPool) {
    const myScore = evaluateSymbolMove(workBoard, size, r, c, mySymbol, blockTwoEnds);

    let maxOppScore = 0;
    let otherOppSum = 0;
    for (const opp of opponents) {
      const s = evaluateSymbolMove(workBoard, size, r, c, opp, blockTwoEnds);
      if (s > maxOppScore) {
        otherOppSum += maxOppScore;
        maxOppScore = s;
      } else {
        otherOppSum += s;
      }
    }

    const posScore = proximityBonus(board, size, r, c, mySymbol);
    const score = myScore * 1.08 + maxOppScore + otherOppSum * 0.25 + posScore + safeJitter(rng);

    if (score > bestScore) {
      bestScore = score;
      bestRow = r;
      bestCol = c;
    }
  }

  return { row: bestRow, col: bestCol };
}
