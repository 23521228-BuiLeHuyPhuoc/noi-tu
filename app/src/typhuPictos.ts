/**
 * Biểu tượng ô đặc biệt của Cờ tỷ phú theo lối bàn cờ in cổ điển: hình phẳng, viền mực đen dày,
 * ít màu, nhìn rõ ở cỡ nhỏ. Tự vẽ bằng SVG (không dùng hình của hãng nào).
 */
import { TYPHU_BOARD, type TyPhuCell } from '../../shared/src/typhu';
import { PACK } from './typhuIconPack';

const K = '#111';
const svg = (body: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g stroke="${K}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">${body}</g></svg>`,
  )}`;

/** Dấu hỏi uốn cong, viền đen bao quanh nét màu. */
const QPATH = 'M17 21C17 11 25 5 34 5C44 5 50 11 50 19C50 27 44 30 39 33C35 35 34 38 34 43';
const question = (c: string) =>
  svg(`<g transform="translate(5 5) scale(0.86)"><path d="${QPATH}" fill="none" stroke="${K}" stroke-width="15"/>
       <path d="${QPATH}" fill="none" stroke="${c}" stroke-width="9"/>
       <circle cx="34" cy="55" r="6" fill="${c}" stroke-width="3"/></g>`);

const PICTO = {
  chanceA: question('#F7941D'),
  chanceB: question('#1E90D6'),
  chanceC: question('#D6338A'),
  // Rương báu mở nắp, nhìn chéo
  community: svg(`
    <path d="M22 24L54 30L56 10L24 4Z" fill="#5BC0EB"/>
    <path d="M27 9L51 13M27 15L51 19" fill="none" stroke="#FFD43B" stroke-width="2.5"/>
    <path d="M6 32L22 24L54 30L40 38Z" fill="#1D3F5E"/>
    <circle cx="24" cy="30" r="3" fill="#FFD43B" stroke-width="1.5"/><circle cx="33" cy="31" r="3" fill="#FFD43B" stroke-width="1.5"/><circle cx="41" cy="32" r="3" fill="#FFD43B" stroke-width="1.5"/>
    <path d="M6 32L40 38V58L6 52Z" fill="#5BC0EB"/>
    <path d="M40 38L54 30V50L40 58Z" fill="#2B8CC4"/>
    <path d="M14 34V54M32 37V57M47 34V54" fill="none" stroke="#FFD43B" stroke-width="3"/>
    <path d="M6 32L40 38V58L6 52ZM40 38L54 30V50L40 58Z" fill="none"/>
    <rect x="20" y="41" width="7" height="8" fill="#FFD43B" stroke-width="2"/>`),
  // Đầu máy hơi nước, bóng đen nhìn ngang
  station: svg(`
    <g fill="${K}" stroke="none">
      <path d="M14 21L11 9H24L21 21Z"/>
      <rect x="11" y="20" width="29" height="14" rx="4"/>
      <path d="M26 20a5 5 0 0 1 10 0Z"/>
      <rect x="39" y="13" width="17" height="23"/>
      <rect x="36" y="9" width="23" height="5" rx="1"/>
      <rect x="6" y="34" width="52" height="5"/>
      <path d="M9 37L2 50H12L15 39Z"/>
    </g>
    <rect x="43" y="17" width="9" height="8" fill="#fff" stroke="none"/>
    <g fill="${K}" stroke="#fff" stroke-width="2.5">
      <circle cx="21" cy="47" r="8"/><circle cx="38" cy="47" r="8"/><circle cx="53" cy="49" r="6"/>
    </g>
    <circle cx="21" cy="47" r="2" fill="#fff" stroke="none"/><circle cx="38" cy="47" r="2" fill="#fff" stroke="none"/>`),
  // Bóng đèn tròn có dây tóc, đế xoáy, tia sáng
  electric: svg(`
    <path d="M7 12L12 15M57 12L52 15M4 26H10M54 26H60M15 3L18 8M49 3L46 8" fill="none" stroke-width="3"/>
    <path d="M32 6C20 6 13 14 13 24C13 32 19 36 22 41C23 43 23 44 23 46H41C41 44 41 43 42 41C45 36 51 32 51 24C51 14 44 6 32 6Z" fill="#FFE34D"/>
    <path d="M26 46L24 30L28 34L32 28L36 34L40 30L38 46" fill="none" stroke-width="2.5"/>
    <rect x="22" y="46" width="20" height="5" rx="1.5" fill="#C9CED6"/>
    <rect x="23" y="51" width="18" height="5" rx="1.5" fill="#C9CED6"/>
    <path d="M27 56H37L34 61H30Z" fill="${K}"/>`),
  // Vòi nước có tay vặn chữ thập, giọt nước
  water: svg(`
    <rect x="3" y="25" width="19" height="11" fill="#fff"/>
    <path d="M3 25V36" fill="none" stroke-width="5"/>
    <path d="M22 21H42V40H22Z" fill="#fff"/>
    <path d="M42 25H50C56 25 59 29 59 35V44H49V36H42Z" fill="#fff"/>
    <rect x="29" y="12" width="6" height="9" fill="#fff"/>
    <rect x="18" y="7" width="28" height="6" rx="3" fill="#fff"/>
    <circle cx="18" cy="10" r="4" fill="#fff"/><circle cx="46" cy="10" r="4" fill="#fff"/>
    <path d="M54 48C54 48 49 54 49 57A5 5 0 0 0 59 57C59 54 54 48 54 48Z" fill="#3FA9F5"/>`),
  // Túi tiền buộc dây
  taxIncome: svg(`
    <path d="M22 6H42L37 16H27Z" fill="#D9A066"/>
    <path d="M27 16C13 22 8 32 8 42C8 54 18 59 32 59S56 54 56 42C56 32 51 22 37 16Z" fill="#EBC08C"/>
    <path d="M25 16H39" fill="none" stroke-width="4"/>
    <path d="M32 26V52M39 31C37 28 25 28 25 34S39 38 39 44S27 50 25 47" fill="none" stroke-width="4"/>`),
  // Nhẫn vàng gắn kim cương
  taxLuxury: svg(`
    <path fill-rule="evenodd" d="M32 22C45 22 56 30 56 41S45 60 32 60S8 52 8 41S19 22 32 22ZM32 30C23 30 16 35 16 41S23 52 32 52S48 47 48 41S41 30 32 30Z" fill="#F5C518"/>
    <path d="M24 13H40L46 20L32 34L18 20Z" fill="#EAF6FF"/>
    <path d="M18 20H46M28 13L26 20L32 34L38 20L36 13" fill="none" stroke-width="2"/>`),
  // Mũi tên đỏ dài
  start: svg(`
    <path d="M60 26H24V14L3 32L24 50V38H60Z" fill="#E03131"/>`),
  // Ô cam: người sau song sắt
  jail: svg(`
    <rect x="5" y="5" width="54" height="54" fill="#F7941D"/>
    <circle cx="32" cy="24" r="9" fill="#FFD6A5"/>
    <path d="M28 23h1M35 23h1M29 28c2 1 4 1 6 0" fill="none" stroke-width="2.5"/>
    <path d="M16 59C16 44 22 36 32 36S48 44 48 59Z" fill="#fff"/>
    <path d="M18 47H46M17 53H47" fill="none" stroke-width="3"/>
    <path d="M14 5V59M25 5V59M39 5V59M50 5V59" fill="none" stroke-width="4"/>
    <rect x="5" y="5" width="54" height="54" fill="none"/>`),
  // Ô tô đỏ kiểu cũ
  rest: svg(`
    <path d="M4 44V34C4 31 6 29 9 29H15L22 17H42L50 29H55C58 29 60 31 60 34V44Z" fill="#E03131"/>
    <path d="M24 21H31V29H18ZM35 21H41L47 29H35Z" fill="#CFE8FF"/>
    <path d="M4 36H9M55 36H60" fill="none"/>
    <circle cx="17" cy="45" r="7" fill="${K}"/><circle cx="47" cy="45" r="7" fill="${K}"/>
    <circle cx="17" cy="45" r="2.5" fill="#ccc" stroke="none"/><circle cx="47" cy="45" r="2.5" fill="#ccc" stroke="none"/>`),
  // Cảnh sát đội mũ, tay chỉ
  gotojail: svg(`
    <path d="M6 62C6 48 12 42 24 42S42 48 42 62Z" fill="#1F4FA3"/>
    <path d="M36 48L54 38" fill="none" stroke="${K}" stroke-width="10"/>
    <path d="M36 48L54 38" fill="none" stroke="#1F4FA3" stroke-width="5"/>
    <circle cx="57" cy="36" r="5" fill="#FFD6A5"/>
    <circle cx="24" cy="30" r="11" fill="#FFD6A5"/>
    <path d="M20 29h1M27 29h1M21 35c2 1 4 1 6 0" fill="none" stroke-width="2.5"/>
    <path d="M10 20C10 10 16 6 24 6S38 10 38 20Z" fill="#1F4FA3"/>
    <path d="M8 20H40V24H8Z" fill="${K}"/>
    <path d="M24 10L27 13L24 16L21 13Z" fill="#FFD43B" stroke-width="1.5"/>`),
};

let chanceCount = 0;
let trainCount = 0;
const TRAINS = [PACK.train1, PACK.train2, PACK.train3, PACK.train4];
function pictoOf(c: TyPhuCell): string {
  switch (c.kind) {
    case 'chance': {
      const n = chanceCount++ % 3;
      return n === 0 ? PACK.chanceOrange : n === 1 ? PACK.chanceBlue : PACK.chancePink;
    }
    case 'community': return PACK.chest;
    case 'station': return TRAINS[trainCount++ % 4];
    case 'utility': return c.name.includes('nước') ? PACK.tap : PACK.bulb;
    case 'tax': return c.name.includes('xa xỉ') ? PACK.ring : PACK.taxIncome;
    case 'start': return PACK.goArrow;
    case 'jail': return PICTO.jail;
    case 'rest': return PACK.car;
    case 'gotojail': return PICTO.gotojail;
    default: return '';
  }
}

/** biểu tượng theo vị trí ô (rỗng với ô đất) */
export const PICTO_BY_CELL: string[] = TYPHU_BOARD.map(pictoOf);
