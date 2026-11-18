/**
 * Biểu tượng ô đặc biệt của Cờ tỷ phú:
 * - Nhà tù (Prisoner behind iron bars — @iconify-json/game-icons, 3k+ ⭐)
 * - Vào tù (Police Officer 3D — @iconify-json/fluent-emoji, 17k+ ⭐)
 * - Sân bay (Airplane Departure 3D — @iconify-json/fluent-emoji, 17k+ ⭐)
 * - Rủi ro (Warning Sign 3D — @iconify-json/fluent-emoji, 17k+ ⭐)
 * - Bến ga / Tiện ích / Cơ hội / Thuế: lấy từ kho biểu tượng chuẩn PACK (`typhuIconPack`).
 */
import { TYPHU_BOARD, type TyPhuCell } from '../../shared/src/typhu';
import { fluentSvgUri, gameIconSvgUri } from './components/Icons';
import { PACK } from './typhuIconPack';

const PICTO = {
  airport: fluentSvgUri('airplane-departure'),
  risk: fluentSvgUri('warning'),
  jail: gameIconSvgUri('prisoner', '#0F172A', '#FB923C'),
  gotojail: fluentSvgUri('man-police-officer'),
};

/** icon theo đúng vị trí trên bàn 40 ô */
const BY_INDEX: Record<number, string> = {
  0: PACK.goArrow,
  2: PICTO.risk,
  4: PACK.taxIncome,
  5: PACK.trainReading,
  7: PACK.chancePink,
  10: PICTO.jail,
  12: PACK.bulb,
  15: PACK.trainPenn,
  17: PICTO.risk,
  20: PICTO.airport,
  22: PACK.chanceBlue,
  25: PACK.trainBo,
  28: PACK.tap,
  30: PICTO.gotojail,
  33: PICTO.risk,
  35: PACK.trainShort,
  36: PACK.chanceOrange,
  38: PACK.ring,
};

/** biểu tượng ô Sân bay và ô Rủi ro (dùng cả ở bảng chi tiết, thẻ rút) */
export const AIRPORT_ICON = PICTO.airport;
export const RISK_ICON = PICTO.risk;

function pictoOf(c: TyPhuCell, i: number): string {
  if (BY_INDEX[i]) return BY_INDEX[i];
  switch (c.kind) {
    case 'chance':
      return PACK.chanceOrange;
    case 'community':
      return PICTO.risk;
    case 'station':
      return PACK.trainReading;
    case 'utility':
      return c.name.includes('nước') ? PACK.tap : PACK.bulb;
    case 'tax':
      return c.name.includes('xa xỉ') ? PACK.ring : PACK.taxIncome;
    case 'start':
      return PACK.goArrow;
    case 'jail':
      return PICTO.jail;
    case 'airport':
      return PICTO.airport;
    case 'gotojail':
      return PICTO.gotojail;
    default:
      return '';
  }
}

/** biểu tượng theo vị trí ô (rỗng với ô đất) */
export const PICTO_BY_CELL: string[] = TYPHU_BOARD.map((c, i) => pictoOf(c, i));
