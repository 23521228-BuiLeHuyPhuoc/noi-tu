import type { ActionError, AuthError, BauCuaSymbol, ErrorCode, GameType, HitMove, TauntId, ThrowItem } from '../../shared/src/types';

export const errorText: Record<ErrorCode, string> = {
  invalid_name: 'Tên phải từ 1 đến 24 ký tự.',
  room_not_found: 'Không tìm thấy phòng. Kiểm tra lại mã phòng nhé.',
  room_full: 'Phòng đã đủ 6 người.',
  room_playing: 'Phòng đang chơi, đợi ván sau nhé.',
  not_host: 'Chỉ chủ phòng mới làm được việc này.',
  not_in_room: 'Bạn không còn ở trong phòng.',
  too_many_players: 'Game này không chơi được với nhiều người như vậy.',
  too_few_players: 'Chưa đủ người để chơi game này.',
  color_taken: 'Màu này đã có người trong phòng chọn rồi.',
  bad_request: 'Có lỗi xảy ra, thử lại nhé.',
};

export const authText: Record<AuthError, string> = {
  invalid_username: 'Tên đăng nhập 3–20 ký tự: chữ không dấu, số, dấu chấm hoặc gạch dưới.',
  invalid_password: 'Mật khẩu từ 6 đến 72 ký tự.',
  invalid_name: 'Tên hiển thị từ 1 đến 24 ký tự.',
  username_taken: 'Tên đăng nhập này có người dùng rồi.',
  wrong_credentials: 'Sai tên đăng nhập hoặc mật khẩu.',
  session_expired: 'Phiên đăng nhập đã hết, đăng nhập lại nhé.',
  rate_limited: 'Thử nhiều quá, đợi vài giây rồi thử lại.',
  server_error: 'Server đang trục trặc, thử lại sau nhé.',
};

export const actionText: Record<ActionError, string> = {
  not_playing: 'Ván chơi đã kết thúc.',
  not_your_turn: 'Chưa tới lượt bạn.',
  bad_action: 'Thao tác không hợp lệ.',
  not_host: 'Chỉ chủ phòng mới làm được việc này.',
  format: 'Từ phải gồm đúng 2 chữ tiếng Việt.',
  chain: 'Chưa nối đúng chữ cuối.',
  used: 'Từ này đã có người dùng rồi.',
  not_in_dictionary: 'Từ này chưa có trong từ điển.',
  timeout: 'Hết giờ mất rồi!',
  hint_used: 'Bạn đã dùng quyền cứu trợ rồi.',
  no_hint: 'Hết đường rồi, cứu trợ cũng chịu.',
  cannot_appeal: 'Không xin duyệt được từ này (mỗi lượt chỉ xin 1 lần, và từ phải nối đúng).',
  no_voters: 'Không còn ai online để bỏ phiếu.',
  not_voting: 'Cuộc bỏ phiếu đã kết thúc.',
  illegal_move: 'Con ngựa này không đi được.',
  not_betting: 'Đã hết giờ đặt cược.',
  insufficient: 'Không đủ xu để đặt thêm.',
  loan_denied: 'Còn xu thì chưa được vay đâu.',
  cannot_build: 'Chưa xây được ở đây (cần đủ bộ màu và đủ tiền).',
  no_money: 'Không đủ tiền.',
};

export const HITS: { move: HitMove; emoji: string; name: string }[] = [
  { move: 'tat', emoji: '🖐️', name: 'Tát' },
  { move: 'dam', emoji: '👊', name: 'Đấm' },
  { move: 'da', emoji: '🦶', name: 'Đá' },
  { move: 'chuong', emoji: '🌀', name: 'Chưởng' },
];

export const GAME_META: Record<GameType, { emoji: string; tagline: string; players: string }> = {
  wordchain: { emoji: '🔤', tagline: 'con mèo → mèo mướp → mướp đắng…', players: '1–6 người' },
  ludo: { emoji: '🐴', tagline: 'Đổ xúc xắc, đá ngựa nhau về chuồng', players: '2–4 người' },
  baucua: { emoji: '🦀', tagline: 'Đặt cược, máy lắc bát, mở bát. Xu ảo thôi!', players: '1–6 người' },
  typhu: { emoji: '🏦', tagline: 'Mua đất Sài Gòn, Hà Nội, xây khách sạn, thu tiền thuê', players: '2–6 người' },
};

export const RULES: Record<GameType, string[]> = {
  wordchain: [
    'Nối từ 2 chữ: chữ đầu phải trùng chữ cuối của từ trước.',
    'Mỗi lượt 30 giây, gõ sai được gõ lại. Hết giờ thì bay màu.',
    'Mỗi người có 1 quyền Cứu trợ để xem gợi ý.',
    'Từ đúng mà từ điển chưa có? Bấm "Xin duyệt", cả phòng đồng ý là được tính và lưu luôn.',
  ],
  ludo: [
    'Đổ 1 hoặc 6 mới được ra quân. Đổ 6 được đổ thêm.',
    'Không được nhảy qua đầu ngựa khác. Dừng đúng ô đối thủ là đá về chuồng.',
    'Về đích phải đổ vừa đủ. Ai đưa hết ngựa về trước thì thắng.',
  ],
  baucua: [
    'Mỗi người có 1.000 xu ảo. Chạm vào con vật để đặt cược. Hết 20 giây máy tự lắc.',
    'Mở bát ra 3 con: trúng mấy con thì ăn gấp bấy nhiêu lần.',
    'Cháy túi thì vay nóng 500 xu, nhưng bị gắn mác con nợ.',
    'Hết số ván đã chọn (10–30 ván) sòng tự tổng kết: ai nhiều xu nhất (trừ nợ) là người chiến thắng.',
  ],
  typhu: [
    'Mỗi người 1.500 xu. Đổ 2 xúc xắc, dừng ở đất trống thì được mua.',
    'Dừng ở đất người khác phải trả tiền thuê. Có đủ bộ màu thì xây nhà, lên khách sạn.',
    'Đi qua Xuất phát nhận 200 xu. Hết tiền là phá sản, người trụ lại cuối cùng thắng.',
  ],
};

export const SYMBOL: Record<BauCuaSymbol, { emoji: string; name: string; bg: string }> = {
  nai: { emoji: '🦌', name: 'Nai', bg: '#FFE3C2' },
  bau: { emoji: '🍐', name: 'Bầu', bg: '#D8F5A2' },
  ga: { emoji: '🐓', name: 'Gà', bg: '#FFE8E8' },
  ca: { emoji: '🐟', name: 'Cá', bg: '#D0EBFF' },
  cua: { emoji: '🦀', name: 'Cua', bg: '#FFD8D0' },
  tom: { emoji: '🦐', name: 'Tôm', bg: '#FFF0D6' },
};

export const THROWS: { item: ThrowItem; emoji: string; name: string }[] = [
  { item: 'dep', emoji: '🩴', name: 'Dép' },
  { item: 'cachua', emoji: '🍅', name: 'Cà chua' },
  { item: 'trung', emoji: '🥚', name: 'Trứng' },
  { item: 'phan', emoji: '💩', name: 'Bãi…' },
  { item: 'hoa', emoji: '🌹', name: 'Hoa' },
  { item: 'tim', emoji: '💖', name: 'Thả tim' },
];

export const TAUNTS: { id: TauntId; text: string }[] = [
  { id: 'nhanh', text: 'Nhanh lên ông ơi!' },
  { id: 'ga', text: 'Gà quá 🐔' },
  { id: 'anmay', text: 'Ăn may thôi 😏' },
  { id: 'run', text: 'Run chưa? 😈' },
  { id: 'huhon', text: 'Hú hồn 😱' },
  { id: 'dinh', text: 'Đỉnh của chóp 🔥' },
  { id: 'khoc', text: 'Khóc đi 😭' },
  { id: 'cuu', text: 'Cứu tui với 🆘' },
  { id: 'denlai', text: 'Đền lại đây 😤' },
  { id: 'gg', text: 'GG 🤝' },
];

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Câu bình luận "lầy" cho các sự kiện */
export const quip = {
  eliminated: (n: string) => pick([`${n} đã bay màu 💨`, `${n} cạn chữ, về quê nuôi cá 🐟`, `${n} ra đê rồi 🌾`, `${n} tắt điện 🔌`]),
  left: (n: string) => `${n} đã chuồn khỏi phòng 🏃`,
  capture: (a: string, b: string) => pick([`${a} đá ngựa ${b} về chuồng 🦵`, `${b} bị ${a} tiễn về quê 🚌`, `${a} vừa "chào hỏi" ngựa của ${b} 👋`]),
  threeSixes: (n: string) => `${n} đổ 3 lần 6, tham quá mất lượt 🤡`,
  finish: (n: string) => `Một con ngựa của ${n} đã về đích 🏁`,
  bigWin: (n: string, x: string) => pick([`${n} húp đậm ${x} xu 🤑`, `${n} trúng mánh ${x} xu 💰`]),
  broke: (n: string) => pick([`${n} cháy túi rồi 🔥`, `${n} trắng tay, về đi bộ 🚶`]),
  loan: (n: string) => `${n} vừa vay nóng, chính thức thành con nợ 💸`,
  hint: (n: string) => `${n} gọi cứu trợ 🆘`,
};
