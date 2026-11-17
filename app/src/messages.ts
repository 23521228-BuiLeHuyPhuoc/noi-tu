import type { ShopError } from '../../shared/src/shop';
import type { ActionError, AuthError, WalletError, BauCuaSymbol, DoodleKind, ErrorCode, GameType, HitMove, NicknameId, TauntId, ThrowItem } from '../../shared/src/types';

export const errorText: Record<ErrorCode, string> = {
  invalid_name: 'Tên phải từ 1 đến 24 ký tự.',
  room_not_found: 'Không tìm thấy phòng. Kiểm tra lại mã phòng nhé.',
  room_full: 'Phòng đã đủ 12 người.',
  room_playing: 'Phòng đang chơi, đợi ván sau nhé.',
  not_host: 'Chỉ chủ phòng mới làm được việc này.',
  not_in_room: 'Bạn không còn ở trong phòng.',
  too_many_players: 'Game này không chơi được với nhiều người như vậy.',
  too_few_players: 'Chưa đủ người để chơi game này.',
  color_taken: 'Màu này đã có người trong phòng chọn rồi.',
  kicked: 'Bạn đã bị chủ phòng mời ra khỏi phòng này.',
  bad_request: 'Có lỗi xảy ra, thử lại nhé.',
};

export const walletText: Record<WalletError, string> = {
  need_account: 'Cần đăng nhập tài khoản để dùng Ruby.',
  bad_request: 'Thông tin chưa hợp lệ.',
  too_many: 'Bạn đang có 3 yêu cầu chờ duyệt, đợi quản trị duyệt xong nhé.',
  forbidden: 'Chỉ quản trị mới làm được việc này.',
  not_found: 'Không tìm thấy (mã nạp, yêu cầu hoặc tài khoản).',
  already_handled: 'Yêu cầu này đã được xử lý rồi.',
  insufficient: 'Không đủ Ruby để trừ.',
  rate_limited: 'Thao tác nhanh quá, đợi chút rồi thử lại.',
};

export const shopText: Record<ShopError, string> = {
  need_account: 'Cần đăng nhập tài khoản để dùng cửa hàng.',
  bad_request: 'Món này không mua được.',
  not_found: 'Không tìm thấy món này.',
  insufficient: 'Không đủ Ruby, nạp thêm nhé.',
  already_owned: 'Bạn đã có món này rồi.',
  not_owned: 'Bạn chưa mua món này.',
  already_claimed: 'Hôm nay bạn đã điểm danh rồi, mai quay lại nhé.',
  rate_limited: 'Thao tác nhanh quá, đợi chút rồi thử lại.',
};

export const authText: Record<AuthError, string> = {
  invalid_email: 'Email chưa đúng dạng (vd: ten@gmail.com).',
  email_taken: 'Email này đã dùng cho một tài khoản khác.',
  bad_code: 'Mã chưa đúng, kiểm tra lại thư nhé.',
  code_expired: 'Mã đã hết hạn hoặc nhập sai quá nhiều lần, gửi mã mới nhé.',
  mail_disabled: 'Server chưa bật gửi mail nên chưa lấy lại mật khẩu được.',
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
  spectating: 'Bạn vào sau nên đang ở chế độ xem, chờ ván kế tiếp nhé.',
  not_your_turn: 'Chưa tới lượt bạn.',
  bad_action: 'Thao tác không hợp lệ.',
  not_host: 'Chỉ chủ phòng mới làm được việc này.',
  format: 'Từ phải gồm đúng 2 chữ tiếng Việt.',
  chain: 'Chưa nối đúng chữ cuối.',
  used: 'Từ này đã có người dùng rồi.',
  not_in_dictionary: 'Từ này chưa có trong từ điển.',
  vi_keyboard: 'Bàn phím đang gõ dấu tiếng Việt (Telex/VNI) nên chữ bị đổi. Tắt bộ gõ tiếng Việt rồi gõ lại nhé.',
  timeout: 'Hết giờ mất rồi!',
  hint_used: 'Bạn đã hết quyền cứu trợ.',
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
  word_leaked: 'Không được nhắc thẳng từ khóa trong gợi ý nhé!',
  wrong_pos: 'Từ này chưa đúng từ loại / luật thử thách của ván!',
  kinh_false: 'Kinh hụt rồi! Chưa đủ 5 số trên hàng, bị phạt khóa hô Kinh 2 lượt bóng!',
  kinh_locked: 'Bạn đang bị khóa hô Kinh do báo nhầm trước đó, chờ đọc thêm số nhé!',
  cell_occupied: 'Ô này đã có người đánh rồi!',
};

export const HITS: { move: HitMove; emoji: string; name: string }[] = [
  { move: 'tat', emoji: '🖐️', name: 'Tát' },
  { move: 'dam', emoji: '👊', name: 'Đấm' },
  { move: 'da', emoji: '🦶', name: 'Đá' },
  { move: 'chuong', emoji: '🌀', name: 'Chưởng' },
];

export const GAME_META: Record<GameType, { emoji: string; tagline: string; players: string }> = {
  wordchain: { emoji: '🔤', tagline: 'con mèo → mèo mướp → mướp đắng…', players: '1–8 người' },
  wordchain_en: { emoji: '🇬🇧', tagline: 'art → tits → sex… nối chữ cái cuối', players: '1–8 người' },
  baucua: { emoji: '🦀', tagline: 'Đặt cược, máy lắc bát, mở bát. Xu ảo thôi!', players: '1–12 người' },
  typhu: { emoji: '🏦', tagline: 'Mua đất Sài Gòn, Hà Nội, xây khách sạn, thu tiền thuê', players: '2–6 người' },
  masoi: { emoji: '🐺', tagline: 'Đêm nhắm mắt bắt Sói, ngày suy luận treo cổ!', players: '4–12 người' },
  giandiep: { emoji: '🕵️', tagline: 'Ai cầm từ khác? Lắng nghe gợi ý để lật mặt gián điệp!', players: '3–12 người' },
  ve_doan: { emoji: '🎨', tagline: 'Vẽ hình siêu lầy cho cả xóm đua nhau đoán từ khóa!', players: '2–12 người' },
  bom_tu: { emoji: '💣', tagline: 'Gõ nhanh từ có tiếng bom đang cháy để chuyền trước khi nổ!', players: '2–12 người' },
  do_vui: { emoji: '🧠', tagline: 'Đấu trường kiến thức CNTT, OOP, DSA, JS/TS & Tiếng Anh C1-C2 cực gắt!', players: '1–12 người' },
  cah: { emoji: '🃏', tagline: 'Ghép thẻ trắng mất não vào câu khuyết tên bạn bè trong phòng!', players: '3–12 người' },
  cashnguns: { emoji: '🔫', tagline: 'Chĩa súng đạn thật/giả, đấu trí đầu hàng và chia chác kim cương!', players: '3–12 người' },
  loto: { emoji: '🎱', tagline: 'Rao vè 90 số rộn ràng, dò vé giấy 3×9 và hô KINH giật giải!', players: '2–12 người' },
  caro: { emoji: '⭕', tagline: 'Cờ Caro 15×15 đại chiến 2–4 phe, hỗ trợ luật chặn hai đầu!', players: '2–4 người' },
  croaksquad: { emoji: '🐸', tagline: 'Ếch co-op nuốt đồng đội rồi nhổ bắn vượt vực thẳm & mở cổng!', players: '2–6 người thật' },
};

export const RULES: Record<GameType, string[]> = {
  wordchain: [
    'Nối từ 2 chữ: chữ đầu phải trùng chữ cuối của từ trước.',
    'Mỗi lượt 30 giây, gõ sai được gõ lại. Hết giờ thì bay màu.',
    'Mỗi người có 1 quyền Cứu trợ để xem gợi ý.',
    'Từ đúng mà từ điển chưa có? Bấm "Xin duyệt", cả phòng đồng ý là được tính và lưu luôn.',
  ],
  wordchain_en: [
    'Nối từ đơn tiếng Anh: chữ cái đầu của từ sau phải trùng chữ cái cuối của từ trước (vd: art → tits → sex).',
    'Mỗi lượt 30 giây, gõ sai được gõ lại. Hết giờ thì bay màu.',
    'Có chú thích nghĩa tiếng Việt cho từng từ. Mỗi người có 1 quyền Cứu trợ để xem gợi ý.',
    'Từ đúng mà từ điển chưa có? Bấm "Xin duyệt", cả phòng đồng ý là được tính và lưu luôn.',
  ],
  baucua: [
    'Mỗi người có 1.000 xu ảo. Chạm vào con vật để đặt cược. Hết 20 giây máy tự lắc.',
    'Mở bát ra 3 con: trúng mấy con thì ăn gấp bấy nhiêu lần.',
    'Cháy túi thì vay nóng 500 xu, nhưng bị gắn mác con nợ.',
    'Hết số ván đã chọn (10–30 ván) sòng tự tổng kết: ai nhiều xu nhất (trừ nợ) là người chiến thắng.',
  ],
  typhu: [
    'Mỗi người 1.500$. Đổ 2 xúc xắc, dừng ở đất trống thì được mua.',
    'Dừng ở đất người khác phải trả tiền thuê (đủ bộ cùng màu thì x2). Dừng ở đất của mình thì nâng nhà, lên khách sạn.',
    'Đi vượt qua Xuất phát nhận 500$. Thiếu tiền thì tự chọn bán từng lô; bán hết vẫn thiếu mới phá sản. Người trụ lại cuối cùng thắng.',
  ],
  masoi: [
    'Mỗi người nhận một vai trò bí mật (Ma Sói, Tiên Tri, Bảo Vệ, Phù Thủy, Thợ Săn, Thần Tình Yêu, Kẻ Ngố, Thám Tử, Dân Làng).',
    'Ban đêm: Sói bàn bạc trong Kênh Sói và cắn 1 người; Tiên Tri soi thân phận; Bảo Vệ canh gác; Phù Thủy quyết định cứu hoặc đầu độc.',
    'Ban ngày: Cả làng thảo luận và bỏ phiếu treo cổ kẻ khả nghi. Phe Dân thắng khi diệt hết Sói; Phe Sói thắng khi số Sói ≥ số Dân.',
  ],
  giandiep: [
    'Đa số người chơi (Dân Thường) giữ cùng 1 từ khóa; Gián Điệp giữ từ gần giống; Mr. White không có từ nào.',
    'Mỗi vòng lần lượt từng người nói 1 câu mô tả (cấm nhắc thẳng từ khóa của mình).',
    'Sau đó cả phòng bỏ phiếu loại 1 kẻ khả nghi. Mr. White bị loại được đoán từ khóa của Dân để lật kèo thắng!',
  ],
  ve_doan: [
    'Mỗi lượt 1 họa sĩ chọn từ bí mật và vẽ bằng ngón tay hoặc chuột trong 55 giây.',
    'Người đoán đúng càng sớm càng được nhiều điểm; họa sĩ cũng được cộng điểm theo số người đoán đúng.',
    'Từ khóa sẽ tự hé lộ vài chữ cái theo thời gian để gợi ý cho cả phòng.',
  ],
  bom_tu: [
    'Mỗi người có 3 tim ❤️. Quả bom mang 1 tiếng ngẫu nhiên đếm ngược rất nhanh!',
    'Đến lượt cầm bom phải gõ ngay 1 từ tiếng Việt 2 chữ có chứa tiếng đó để chuyền qua người kế tiếp.',
    'Bom nổ trên tay ai thì mất 1 tim; người sống sót cuối cùng giành chiến thắng!',
  ],
  do_vui: [
    'Chọn chuyên đề chuyên sâu (OOP, DSA, JS/TS, Node/Backend, React Native/FE, Fullstack/System, Tiếng Anh C1–C2) hoặc Tổng hợp.',
    'Trả lời nhanh 4 đáp án A/B/C/D trong 15 giây; giữ chuỗi đúng (streak) nhận thêm điểm thưởng.',
    '2 câu cuối nhân đôi điểm số (x2) kèm giải thích kỹ thuật chi tiết sau mỗi câu!',
  ],
  cah: [
    'Mỗi vòng lật 1 Thẻ Đen khuyết chỗ trống (tự động điểm mặt tên thật người chơi trong phòng!).',
    'Mỗi người bí mật chọn 1 Thẻ Trắng bựa nhất trên tay nộp ẩn danh (có 1 quyền Đổi Bài mới mỗi ván).',
    'Cả phòng bình chọn câu ghép "mất não" nhất (không tự bầu mình) để trao điểm vô địch!',
  ],
  cashnguns: [
    'Mỗi tay anh chị có 3 máu ❤️ và băng đạn 8 viên (5 Đạn Giả Click! + 3 Đạn Thật Bang!).',
    'Bí mật nạp đạn và chĩa súng vào 1 người khác; Bố Già có quyền ép 1 người đổi hướng súng.',
    '15 giây Cân Não: bấm Đầu Hàng để né đạn (nhịn chia tiền), hoặc Đứng Lại ăn đạn / chia chiến lợi phẩm & Kim Cương!',
  ],
  loto: [
    'Mỗi người nhận 1 tờ vé Lô Tô 3×9 chuẩn hội chợ (mỗi hàng 5 số từ 1–90).',
    'Nhà cái rao vè tiếng Việt từng con số; dò và chấm các số đã gọi trên vé của bạn (ai đạt 4/5 số sẽ báo ĐỢI!).',
    'Đủ 5 số trên 1 hàng ngang thì bấm HÔ KINH ngay! Báo nhầm Kinh hụt sẽ bị phạt khóa nút 2 lượt số!',
  ],
  caro: [
    'Bàn cờ 15×15 hỗ trợ từ 2 đến 4 người chơi cùng lúc (X, O, ▲, ◆).',
    'Ai xếp được 5 quân liên tiếp theo hàng ngang, dọc hoặc chéo trước là thắng.',
    'Khi bật luật "Chặn hai đầu": chuỗi đúng 5 quân bị đối phương chặn sát cả 2 đầu sẽ chưa được tính thắng.',
  ],
  croaksquad: [
    'Game đi cảnh giải đố phối hợp 2–6 người chơi thật (không dùng máy): cả đội cùng nhau vượt 3 màn đầm lầy.',
    'Phóng lưỡi nuốt đồng đội vào bụng rồi ngắm đường cong quỹ đạo để nhổ/bắn bạn qua vực sâu hoặc lên vách cao!',
    'Phối hợp dẫm công tắc giữ cầu, nhặt chìa khóa mở cổng đá và đưa cả đội chạm Cổng Đích để qua màn!',
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
  { item: 'phan', emoji: '💩', name: 'Bãi bậy' },
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
  { id: 'xiu', text: 'Xỉu ngang 🥱' },
  { id: 'bayma', text: 'Bay màu nha 👋' },
  { id: 'tuoi', text: 'Tuổi gì chơi với tui 😏' },
  { id: 'ngoan', text: 'Ngoan, anh thương 🥰' },
  { id: 'chaybai', text: 'Chạy đi con trai 🏃' },
  { id: 'hetthuoc', text: 'Hết thuốc chữa 🤡' },
];

/** Biệt danh tạm thời (60 giây): chọn từ danh sách vui và vô hại */
export const NICK_TEXT: Record<NicknameId, string> = {
  game: 'Gà Mờ 🐔',
  nho: 'Thánh Nhọ 🍀',
  lidon: 'Vua Lì Đòn 🛡️',
  hexe: 'Chúa Hề 🤡',
  amvon: 'Đại Gia Âm Vốn 💸',
  anhoi: 'Thần Ăn Hôi 🍗',
  ruabo: 'Rùa Bò Hạng Nhất 🐢',
  ngugat: 'Chúa Tể Ngủ Gật 😴',
  khocnhe: 'Thánh Khóc Nhè 😭',
  angian: 'Vua Ăn Gian 🕵️',
  nhaybom: 'Trùm Nhây 🤪',
  tuonglai: 'Tỷ Phú Tương Lai 🤑',
};
export const nickText = (n: NicknameId) => NICK_TEXT[n] ?? '';
export const NICK_IDS = Object.keys(NICK_TEXT) as NicknameId[];

export const DOODLE_OPTIONS: { doodle: DoodleKind; emoji: string; name: string }[] = [
  { doodle: 'ria', emoji: '👨', name: 'Vẽ ria' },
  { doodle: 'sung', emoji: '😈', name: 'Vẽ sừng' },
  { doodle: 'muihe', emoji: '🤡', name: 'Mũi hề' },
  { doodle: 'mattim', emoji: '😍', name: 'Mắt tim' },
];

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Câu bình luận "lầy" cho các sự kiện */
export const quip = {
  eliminated: (n: string) => pick([
    `${n} đã bay màu 💨`, `${n} cạn chữ, về quê nuôi cá 🐟`, `${n} ra đê rồi 🌾`, `${n} tắt điện 🔌`,
    `${n} hết pin, xin phép đi sạc 🔋`, `${n} out trình, mời ngồi ghế dự bị 🪑`, `${n} bị "ủa alo" đuổi khỏi sân 📞`,
    `${n} đã hóa thành meme 🫠`, `${n} ngã ngựa, đứng dậy rồi lại ngã 🐴`,
  ]),
  left: (n: string) => pick([`${n} đã chuồn khỏi phòng 🏃`, `${n} bỏ chạy, để lại đôi dép 🩴`, `${n} đi mua đồ ăn, không bao giờ trở lại 🍜`]),
  capture: (a: string, b: string) => pick([
    `${a} đá ngựa ${b} về chuồng 🦵`, `${b} bị ${a} tiễn về quê 🚌`, `${a} vừa "chào hỏi" ngựa của ${b} 👋`,
    `${a} ra đòn, ngựa ${b} bay màu 🚀`, `Ngựa ${b} bị ${a} gửi về cho mẹ 📦`, `${a} đạp đổ giấc mơ của ${b} 💔`,
  ]),
  threeSixes: (n: string) => pick([`${n} đổ 3 lần 6, tham quá mất lượt 🤡`, `${n} tham thì thâm: 3 lần 6 thành 0 🎲`]),
  finish: (n: string) => pick([`Một con ngựa của ${n} đã về đích 🏁`, `Ngựa nhà ${n} về tới đích, nhanh hơn xe ôm 🏍️`]),
  bigWin: (n: string, x: string) => pick([
    `${n} húp đậm ${x} xu 🤑`, `${n} trúng mánh ${x} xu 💰`, `${n} ăn ${x} xu, cả xóm nghe tiếng cười 😏`,
    `${n} hốt ${x} xu, chuẩn bị bao cả phòng trà sữa 🧋`, `${n} ngủ dậy được thần tài gõ cửa: +${x} xu 🍀`,
  ]),
  broke: (n: string) => pick([
    `${n} cháy túi rồi 🔥`, `${n} trắng tay, về đi bộ 🚶`, `${n} sạch túi, còn mỗi cái nết 🫥`,
    `${n} tay trắng, đi vay nóng đi 💸`, `Ví ${n} giờ chỉ còn mạng nhện 🕸️`,
  ]),
  loan: (n: string) => pick([`${n} vừa vay nóng, chính thức thành con nợ 💸`, `${n} cắm cả cái nết để vay 500 xu 🏦`]),
  hint: (n: string) => pick([`${n} gọi cứu trợ 🆘`, `${n} phải hỏi đáp án, thôi cho qua 🙈`]),
  roach: (a: string, b: string) => `🪳→ ${a} thả gián vào máy ${b}`,
  ink: (a: string, b: string) => `🦑 ${a} tạt mực vào mặt ${b}`,
  doodle: (a: string, b: string, what: string) => `🖍️ ${a} vẽ bậy ${what} lên mặt ${b}`,
  nick: (a: string, b: string, nick: string) => `🏷️ ${a} đặt biệt danh cho ${b}: ${nick}`,
  honk: (a: string, b: string) => `📢 ${a} bật loa vào máy ${b}`,
  cry: (a: string, b: string) => `😭 ${a} khóc thuê hộ ${b}`,
  charm: (a: string) => `✨ ${a} xin vía, đang tỏa hào quang`,
  blackout: (a: string, b: string) => `🔌 ${a} dập cầu dao, sụp nguồn sáng máy ${b}!`,
  spin: (a: string, b: string) => `🌀 ${a} xoay mòng mòng màn hình của ${b}!`,
  fart: (a: string, b: string) => `💨 ${a} thả bom thối vào ${b}, PHỤT!`,
  slipper: (a: string, b: string) => `🩴 ${a} phóng dép liên hoàn vào ${b}!`,
  chicken: (a: string, b: string) => `🐔 ${a} thả gà đi mổ trên máy ${b}`,
  bigface: (a: string, b: string) => `🤪 ${a} thổi mặt ${b} to gấp đôi!`,
  banana: (a: string, b: string) => `🍌 ${a} đặt vỏ chuối cho ${b}, coi chừng BỊCH!`,
  mirror: (a: string, b: string) => `🪞 ${a} lật ngược màn hình của ${b}!`,
  quake: (a: string, b: string) => `🌋 ${a} tạo động đất rung lắc máy ${b}!`,
};
