/**
 * Biểu tượng ô đặc biệt của Cờ tỷ phú theo lối bàn cờ in: hình phẳng, nét mực đậm, ít màu.
 * Tự vẽ bằng SVG (không dùng hình của hãng nào).
 */
import { TYPHU_BOARD, type TyPhuCell } from '../../shared/src/typhu';

const INK = '#1B1B1B';
const svg = (body: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`,
  )}`;

const question = (color: string) =>
  svg(`<path d="M20 22c0-8 6-13 13-13s13 5 13 12c0 6-4 9-8 11-3 2-4 4-4 8v2" fill="none" stroke="${color}" stroke-width="9"/><circle cx="34" cy="53" r="5" fill="${color}" stroke="none"/>`);

const PICTO = {
  chanceA: question('#F76707'),
  chanceB: question('#1C7ED6'),
  community: svg(`
    <path d="M10 30h44v22H10z" fill="#4DABF7"/>
    <path d="M10 30c0-10 8-16 22-16s22 6 22 16z" fill="#74C0FC"/>
    <path d="M10 30h44M28 30v8h8v-8" fill="none"/>
    <rect x="28" y="36" width="8" height="6" fill="#FFD43B"/>
    <path d="M16 18l4 4M48 18l-4 4M32 9v5" fill="none" stroke="#FAB005"/>`),
  station: svg(`
    <path d="M10 18h26v20H10z" fill="${INK}"/>
    <path d="M36 24h14l4 14H36z" fill="${INK}"/>
    <rect x="15" y="10" width="7" height="8" fill="${INK}"/>
    <rect x="16" y="22" width="14" height="9" fill="#F1F3F5" stroke="none"/>
    <path d="M6 40h52" fill="none"/>
    <circle cx="18" cy="46" r="6" fill="${INK}"/><circle cx="34" cy="46" r="6" fill="${INK}"/><circle cx="48" cy="46" r="5" fill="${INK}"/>
    <path d="M54 38l6 4" fill="none"/>`),
  electric: svg(`
    <path d="M32 6c-11 0-18 8-18 17 0 7 4 10 7 14 2 3 2 5 2 8h18c0-3 0-5 2-8 3-4 7-7 7-14 0-9-7-17-18-17z" fill="#FFE066"/>
    <path d="M26 30l6 6 6-6M32 36v9" fill="none"/>
    <rect x="23" y="45" width="18" height="10" rx="2" fill="#ADB5BD"/>
    <path d="M23 50h18" fill="none"/>
    <path d="M8 14l5 3M56 14l-5 3M6 28h6M52 28h6" fill="none" stroke="#FAB005"/>`),
  water: svg(`
    <path d="M8 22h26v10H8z" fill="#E9ECEF"/>
    <path d="M34 18h10v34H34z" fill="#E9ECEF"/>
    <path d="M26 12h26" fill="none" stroke-width="5"/><path d="M39 12v6" fill="none"/>
    <path d="M44 32h8v8h-8" fill="#E9ECEF"/>
    <path d="M48 46c0 0-5 6-5 9a5 5 0 0 0 10 0c0-3-5-9-5-9z" fill="#4DABF7"/>`),
  taxIncome: svg(`
    <path d="M22 14h20l-4 8H26z" fill="#C49A6C"/>
    <path d="M26 22c-12 6-16 14-16 22 0 8 8 12 22 12s22-4 22-12c0-8-4-16-16-22z" fill="#E0B07B"/>
    <path d="M32 30v20M37 34c-2-2-10-2-10 2s10 3 10 7-8 4-10 2" fill="none" stroke-width="3.5"/>`),
  taxLuxury: svg(`
    <circle cx="32" cy="38" r="17" fill="none" stroke="#FAB005" stroke-width="7"/>
    <circle cx="32" cy="38" r="17" fill="none"/>
    <path d="M24 10h16l5 7-13 11-13-11z" fill="#A5D8FF"/>
    <path d="M19 17h26M28 10l-2 7 6 11 6-11-2-7" fill="none" stroke-width="2"/>`),
  start: svg(`
    <path d="M58 32H16" fill="none" stroke="#E03131" stroke-width="7"/>
    <path d="M22 18L6 32l16 14z" fill="#E03131"/>`),
  jail: svg(`
    <rect x="8" y="8" width="48" height="48" fill="#FF922B"/>
    <path d="M20 8v48M32 8v48M44 8v48M8 22h48" fill="none" stroke-width="4"/>`),
  rest: svg(`
    <path d="M10 36l6-14h32l6 14v10H10z" fill="#E03131"/>
    <path d="M20 24h24l4 10H16z" fill="#D0EBFF"/>
    <circle cx="20" cy="47" r="6" fill="${INK}"/><circle cx="44" cy="47" r="6" fill="${INK}"/>
    <path d="M10 40h6M48 40h6" fill="none"/>`),
  gotojail: svg(`
    <path d="M12 26c0-10 9-16 20-16s20 6 20 16z" fill="#1C3D8C"/>
    <path d="M8 26h48v6H8z" fill="${INK}"/>
    <path d="M26 16h12v6H26z" fill="#FFD43B" stroke-width="2"/>
    <circle cx="32" cy="44" r="10" fill="#FFD8A8"/>
    <path d="M28 44h1M35 44h1M29 49c2 1 4 1 6 0" fill="none" stroke-width="2.5"/>`),
};

let chanceCount = 0;
function pictoOf(c: TyPhuCell): string {
  switch (c.kind) {
    case 'chance':
      return chanceCount++ % 2 === 0 ? PICTO.chanceA : PICTO.chanceB;
    case 'community': return PICTO.community;
    case 'station': return PICTO.station;
    case 'utility': return c.name.includes('nước') ? PICTO.water : PICTO.electric;
    case 'tax': return c.name.includes('xa xỉ') ? PICTO.taxLuxury : PICTO.taxIncome;
    case 'start': return PICTO.start;
    case 'jail': return PICTO.jail;
    case 'rest': return PICTO.rest;
    case 'gotojail': return PICTO.gotojail;
    default: return '';
  }
}

/** biểu tượng theo vị trí ô (rỗng với ô đất) */
export const PICTO_BY_CELL: string[] = TYPHU_BOARD.map(pictoOf);
