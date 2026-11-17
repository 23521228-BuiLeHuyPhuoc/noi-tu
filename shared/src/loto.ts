/**
 * Kiểu dữ liệu, vè hô 90 con số & bộ sinh vé chuẩn cho game Lô Tô Hội Chợ Xóm Lầy (`loto`).
 * Thuần TypeScript, không phụ thuộc thư viện ngoài.
 */

export const LOTO_MIN = 1;
export const LOTO_MAX = 90;

export type LotoTicketColor = 'rose' | 'gold' | 'jade' | 'sky' | 'violet';

export const LOTO_TICKET_COLORS: readonly LotoTicketColor[] = ['rose', 'gold', 'jade', 'sky', 'violet'];

/** 3 hàng × 9 cột; ô trống là null, ô có số là 1..90 */
export type LotoGrid = (number | null)[][];

export interface LotoRhyme {
  num: number;
  chant: string;
  title: string;
}

export interface LotoView {
  type: 'loto';
  status: 'calling' | 'ended';
  callIntervalMs: number;
  nextCallAt: number | null;
  order: string[];
  names: Record<string, string>;
  ticketColors: Record<string, LotoTicketColor>;
  tickets: Record<string, LotoGrid>;
  /** các số người chơi đã chấm trên tờ vé của họ */
  marked: Record<string, number[]>;
  /** người đang "Đợi!" (có ít nhất 1 hàng đã trúng 4/5 số thật) */
  waitingIds: string[];
  /** bị phạt khóa bấm Kinh 2 lượt gọi do hô Kinh sai (kinh hụt quê độ!) */
  penaltyUntilCount: Record<string, number>;
  called: number[];
  currentNum: number | null;
  currentChant: string | null;
  remainingCount: number;
  autoMark: boolean;
  winnerId: string | null;
  winningRow: number | null;
  lastEvent: string | null;
}

/**
 * Trọn bộ 90 câu vè Lô Tô Hội Chợ Xóm Lầy (từ 1 đến 90), gieo vần rộn ràng, hài hước.
 */
export const LOTO_RHYMES: Record<number, LotoRhyme> = {
  1: { num: 1, title: 'Độc nhất vô nhị', chant: 'Đứng đầu bảng vàng, độc nhất vô nhị, cờ ra con mấy, con số 1!' },
  2: { num: 2, title: 'Vịt bầu bơi ao', chant: 'Con vịt bầu bơi lội trên ao, nhìn sao giống quá, con số 2!' },
  3: { num: 3, title: 'Ba chìm bảy nổi', chant: 'Ba chìm bảy nổi chín lênh đênh, thương thân bánh trôi nước, con số 3!' },
  4: { num: 4, title: 'Bốn mùa xuân hạ', chant: 'Xuân hạ thu đông bốn mùa tươi tốt, hốt lẹ bà con ơi, con số 4!' },
  5: { num: 5, title: 'Năm ngón tay ngoan', chant: 'Năm ngón tay trên một bàn tay, chấm ngay kẻo lỡ, con số 5!' },
  6: { num: 6, title: 'Lộc phát đầu năm', chant: 'Sáu câu vọng cổ ngọt ngào miền Tây, lộc về đầy túi, con số 6!' },
  7: { num: 7, title: 'Cầu vồng bảy sắc', chant: 'Mưa tạnh trời quang bảy sắc cầu vồng, ai đang ngóng trông, con số 7!' },
  8: { num: 8, title: 'Bát tiên quá hải', chant: 'Hội bà tám đầu xóm xôn xao, phát tài phát lộc, con số 8!' },
  9: { num: 9, title: 'Chín nhánh Cửu Long', chant: 'Chín nhánh sông rồng phù sa bát ngát, hát vang lên nào, con số 9!' },
  10: { num: 10, title: 'Mười phân vẹn mười', chant: 'Điểm mười đỏ chói trong trang vở mới, tròn trĩnh làm sao, con số 10!' },

  11: { num: 11, title: 'Hai cây gậy trúc', chant: 'Hai cẳng chân đi khắp nẻo đường xa, song song đứng thẳng, con mười một (11)!' },
  12: { num: 12, title: 'Mười hai bến nước', chant: 'Mười hai con giáp xoay vòng năm tháng, sáng đèn hội chợ, con mười hai (12)!' },
  13: { num: 13, title: 'Thứ Sáu tâm linh', chant: 'Người ta sợ xui chứ tui thấy hên, lên luôn cho nóng, con mười ba (13)!' },
  14: { num: 14, title: 'Lễ tình nhân đỏ', chant: 'Mười bốn tháng Hai ai có đôi có cặp, tui ngồi dò vé, con mười bốn (14)!' },
  15: { num: 15, title: 'Trăng rằm vằng vặc', chant: 'Rằm tháng Tám trăng tròn vành vạnh, rước đèn phá cỗ, con mười lăm (15)!' },
  16: { num: 16, title: 'Trăng tròn mười sáu', chant: 'Tuổi trăng tròn mười sáu mộng mơ, ai chờ ai đợi, con mười sáu (16)!' },
  17: { num: 17, title: 'Bẻ gãy sừng trâu', chant: 'Mười bảy bẻ gãy sừng trâu, sức trai tráng kiện, con mười bảy (17)!' },
  18: { num: 18, title: 'Đôi mươi xuân sắc', chant: 'Mười tám đôi mươi nụ cười tỏa nắng, thắng lớn đêm nay, con mười tám (18)!' },
  19: { num: 19, title: 'Một chín một mười', chant: 'Kẻ tám lạng người nửa cân, một chín một mười, tươi rói con mười chín (19)!' },
  20: { num: 20, title: 'Hai mươi tháng Mười', chant: 'Tôn vinh chị em phụ nữ đảm đang, dịu dàng duyên dáng, con hai mươi (20)!' },

  21: { num: 21, title: 'Tuổi mới vào đời', chant: 'Hai mốt tuổi xanh bước chân lập nghiệp, chấm kịp tay nha, con hai mươi mốt (21)!' },
  22: { num: 22, title: 'Song nga bơi lội', chant: 'Đôi thiên nga trắng bơi giữa mặt hồ, vỗ tay rần rần, con hai mươi hai (22)!' },
  23: { num: 23, title: 'Ông Táo về trời', chant: 'Hai ba tháng Chạp cưỡi cá chép vàng, lên thiên đình tâu, con hai mươi ba (23)!' },
  24: { num: 24, title: 'Giáng sinh an lành', chant: 'Đêm hai tư chuông ngân đầu ngõ, ông già Noel gõ cửa, con hai mươi tư (24)!' },
  25: { num: 25, title: 'Một phần tư thế kỷ', chant: 'Hai lăm năm lưng bắt đầu kêu rắc, mắt sáng dò bài, con hai mươi lăm (25)!' },
  26: { num: 26, title: 'Thanh niên xung kích', chant: 'Hai sáu tháng Ba sức trẻ dâng trào, cờ bay phấp phới, con hai mươi sáu (26)!' },
  27: { num: 27, title: 'Uống nước nhớ nguồn', chant: 'Hai bảy tháng Bảy nghĩa tình sâu nặng, lặng lòng tri ân, con hai mươi bảy (27)!' },
  28: { num: 28, title: 'Tháng Hai năm thường', chant: 'Hai tám Tết gói nồi bánh tét, thơm lừng cả xóm, con hai mươi tám (28)!' },
  29: { num: 29, title: 'Cuối tháng mì tôm', chant: 'Ngày hai chín ví tiền mỏng dính, úp mì chờ lương, con hai mươi chín (29)!' },
  30: { num: 30, title: 'Đêm giao thừa Tết', chant: 'Ba mươi Tết pháo hoa rực rỡ, mở cửa đón xuân, con ba mươi (30)!' },

  31: { num: 31, title: 'Ngày cuối tháng dài', chant: 'Tháng đủ ba mốt ngày mong ngóng, ting ting lương về, con ba mươi mốt (31)!' },
  32: { num: 32, title: 'Hàm răng trắng bóng', chant: 'Ba mươi hai chiếc răng đều tăm tắp, cười tươi hết cỡ, con ba mươi hai (32)!' },
  33: { num: 33, title: 'Con rùa mai cứng', chant: 'Chậm mà chắc như rùa bò về đích, nhích từng bước một, con ba mươi ba (33)!' },
  34: { num: 34, title: 'Ba tư chú tiểu', chant: 'Chuông chùa ngân vang khói sương bảng lảng, thanh thản tâm hồn, con ba mươi tư (34)!' },
  35: { num: 35, title: 'Dê núi ăn lá', chant: 'Con dê ăn lá trên đồi đá cao, kêu be be vui, con ba mươi lăm (35)!' },
  36: { num: 36, title: 'Ba sáu phố phường', chant: 'Hà Nội cổ kính ba sáu phố phường, tấp nập người qua, con ba mươi sáu (36)!' },
  37: { num: 37, title: 'Thân nhiệt chuẩn chỉnh', chant: 'Ba bảy độ C người khỏe phơi phới, không sốt không cảm, con ba mươi bảy (37)!' },
  38: { num: 38, title: 'Ông Địa bụng bự', chant: 'Ông Địa phe phẩy quạt mo cười hiền, rước tiền vào nhà, con ba mươi tám (38)!' },
  39: { num: 39, title: 'Thần Tài nhỏ gõ cửa', chant: 'Thần Tài nhỏ mang vàng mang bạc, ai đợi hàng nào, con ba mươi chín (39)!' },
  40: { num: 40, title: 'Tứ tuần phong độ', chant: 'Bốn mươi tuổi đời trà thơm cờ tướng, chững chạc đàng hoàng, con bốn mươi (40)!' },

  41: { num: 41, title: 'Cá trắng quẫy đuôi', chant: 'Con cá trắng lội dòng nước trong, quẫy đuôi cái bõm, con bốn mươi mốt (41)!' },
  42: { num: 42, title: 'Đáp án vũ trụ', chant: 'Bốn mươi hai giải mã thiên hà, ốc bươu bò chậm, con bốn mươi hai (42)!' },
  43: { num: 43, title: 'Sông Hàn Đà Nẵng', chant: 'Cầu Rồng phun lửa bên bờ sông Hàn, rộn ràng biển xanh, con bốn mươi ba (43)!' },
  44: { num: 44, title: 'Song tứ vững chãi', chant: 'Hai chiếc ghế tựa đặt cạnh bên nhau, vững như bàn thạch, con bốn mươi tư (44)!' },
  45: { num: 45, title: 'Một tiết học trò', chant: 'Bốn lăm phút ngồi nghe thầy giảng, mắt ngó đồng hồ, con bốn mươi lăm (45)!' },
  46: { num: 46, title: 'Hổ vàng xuống núi', chant: 'Chúa sơn lâm oai phong lẫm liệt, bước ra hội làng, con bốn mươi sáu (46)!' },
  47: { num: 47, title: 'Cao nguyên nắng gió', chant: 'Ly cà phê Ban Mê đậm đặc, tỉnh táo dò tiếp, con bốn mươi bảy (47)!' },
  48: { num: 48, title: 'Hai ngày trọn vẹn', chant: 'Bốn tám giờ nghỉ cuối tuần ngắn ngủi, chớp mắt hết veo, con bốn mươi tám (48)!' },
  49: { num: 49, title: 'Chưa qua đã tới', chant: 'Bốn chín bước qua bình an vô sự, cười xòa lấy hên, con bốn mươi chín (49)!' },
  50: { num: 50, title: 'Năm mươi xuống biển', chant: 'Năm mươi con theo cha xuống biển, năm mươi lên non, tròn chẵn năm mươi (50)!' },

  51: { num: 51, title: 'Cún con giữ nhà', chant: 'Con cún vẫy đuôi mừng chủ đi về, ngoan hiền dễ thương, con năm mươi mốt (51)!' },
  52: { num: 52, title: 'Bộ bài tây đủ', chant: 'Năm mươi hai lá xào chẻ điệu nghệ, sảnh rồng tới trắng, con năm mươi hai (52)!' },
  53: { num: 53, title: 'Bình tĩnh vượt dốc', chant: 'Đường xa dốc cao cứ đi từ từ, ai có trên vé, con năm mươi ba (53)!' },
  54: { num: 54, title: 'Năm tư dân tộc', chant: 'Năm mươi tư dân tộc anh em, sum vầy đoàn kết, con năm mươi tư (54)!' },
  55: { num: 55, title: 'Song ngũ cười vang', chant: 'Haha năm năm tiếng cười sảng khoái, vận may nhân đôi, con năm mươi lăm (55)!' },
  56: { num: 56, title: 'Ong mật chăm chỉ', chant: 'Con ong làm mật yêu hoa đầu cành, ngọt lành giọt nắng, con năm mươi sáu (56)!' },
  57: { num: 57, title: 'Hạc trắng tung cánh', chant: 'Cánh hạc bay cao giữa trời mây trắng, thanh tao thoát tục, con năm mươi bảy (57)!' },
  58: { num: 58, title: 'Mèo mướp phơi nắng', chant: 'Con mèo mướp nằm lười trên mái ngói, liếm chân lim dim, con năm mươi tám (58)!' },
  59: { num: 59, title: 'Bướm vàng lượn hoa', chant: 'Bướm vàng đậu nhánh mù u, ai đang chờ đợi, con năm mươi chín (59)!' },
  60: { num: 60, title: 'Lục tuần hoa giáp', chant: 'Sáu mươi năm cuộc đời rực rỡ, con cháu sum vầy, con sáu mươi (60)!' },

  61: { num: 61, title: 'Nghỉ hưu an nhàn', chant: 'Sáng tập dưỡng sinh chiều chăm cây cảnh, thong dong tuổi già, con sáu mươi mốt (61)!' },
  62: { num: 62, title: 'Chim câu đưa thư', chant: 'Bồ câu tung cánh mang tin vui về, quê nhà mở hội, con sáu mươi hai (62)!' },
  63: { num: 63, title: 'Khắp miền đất nước', chant: 'Bắc Trung Nam nối liền một dải, đi dọc Việt Nam, con sáu mươi ba (63)!' },
  64: { num: 64, title: 'Bàn cờ vua rộng', chant: 'Sáu mươi tư ô đen trắng đan xen, tốt nhập phong hậu, con sáu mươi tư (64)!' },
  65: { num: 65, title: 'Cần Thơ gạo trắng', chant: 'Cần Thơ gạo trắng nước trong, ai đi đến đó, con sáu mươi lăm (65)!' },
  66: { num: 66, title: 'Song lộc đại cát', chant: 'Lộc chồng thêm lộc xuôi chèo mát mái, đại cát đại lợi, con sáu mươi sáu (66)!' },
  67: { num: 67, title: 'Chiếc xe huyền thoại', chant: 'Chiếc xe sáu bảy chạy khắp đường quê, pô nổ giòn tan, con sáu mươi bảy (67)!' },
  68: { num: 68, title: 'Lộc phát vinh hoa', chant: 'Sáu tám lộc phát cả phòng reo hò, ai sắp kinh rồi, con sáu mươi tám (68)!' },
  69: { num: 69, title: 'Âm dương hòa hợp', chant: 'Đất trời xoay chuyển âm dương cân bằng, lật xuôi lật ngược, con sáu mươi chín (69)!' },
  70: { num: 70, title: 'Thất thập cổ lai hy', chant: 'Bảy mươi tuổi chẵn tóc bạc phơ phơ, tinh thần phơi phới, con bảy mươi (70)!' },

  71: { num: 71, title: 'Tôm càng xanh búng', chant: 'Con tôm càng xanh búng càng tanh tách, nướng mọi thơm lừng, con bảy mươi mốt (71)!' },
  72: { num: 72, title: 'Phép thần biến hóa', chant: 'Tôn Ngộ Không bảy hai phép biến, cân đẩu vân bay, con bảy mươi hai (72)!' },
  73: { num: 73, title: 'Nhện giăng tơ bạc', chant: 'Nhện con khéo léo giăng tơ đầu hồi, sương mai lấp lánh, con bảy mươi ba (73)!' },
  74: { num: 74, title: 'Nai vàng ngơ ngác', chant: 'Con nai vàng ngơ ngác đạp trên lá khô, vô ngay hàng giữa, con bảy mươi tư (74)!' },
  75: { num: 75, title: 'Mùa xuân thống nhất', chant: 'Bảy lăm lịch sử rạng rỡ non sông, cờ hoa ngập tràn, con bảy mươi lăm (75)!' },
  76: { num: 76, title: 'Mía ngọt Quảng Ngãi', chant: 'Ly nước mía đá mát lạnh ngày hè, ngọt lịm đầu môi, con bảy mươi sáu (76)!' },
  77: { num: 77, title: 'Song thất cầu may', chant: 'Hai cây rìu bạc sáng loáng trên tay, may mắn ngập tràn, con bảy mươi bảy (77)!' },
  78: { num: 78, title: 'Ông Địa lớn cười', chant: 'Ông Địa lớn vỗ bụng cười vang, rước lộc đầu đình, con bảy mươi tám (78)!' },
  79: { num: 79, title: 'Thần Tài lớn giáng', chant: 'Thần Tài lớn vác thỏi vàng ròng, gõ cửa từng nhà, con bảy mươi chín (79)!' },
  80: { num: 80, title: 'Bát tuần thượng thọ', chant: 'Tám mươi tuổi thọ con cháu mừng xuân, áo gấm khăn đóng, con tám mươi (80)!' },

  81: { num: 81, title: 'Chín chín tám mốt', chant: 'Bảng cửu chương đọc thuộc làu làu, chín lần chín chẵn, con tám mươi mốt (81)!' },
  82: { num: 82, title: 'Ốc sên đội vỏ', chant: 'Ốc sên vác nhà đi dạo vườn rau, mưa rào mát mẻ, con tám mươi hai (82)!' },
  83: { num: 83, title: 'Phát tài rực rỡ', chant: 'Tám ba phát tài tiền vô như nước, phước lộc đầy nhà, con tám mươi ba (83)!' },
  84: { num: 84, title: 'Mã vùng Tổ quốc', chant: 'Cộng tám tư gọi về quê mẹ, tiếng nói thân thương, con tám mươi tư (84)!' },
  85: { num: 85, title: 'Gió lộng cánh diều', chant: 'Cánh diều no gió bay tít trời xanh, sáo vi vu thổi, con tám mươi lăm (85)!' },
  86: { num: 86, title: 'Phát lộc vạn niên', chant: 'Tám sáu phát lộc buôn may bán đắt, tiền chặt đầy rương, con tám mươi sáu (86)!' },
  87: { num: 87, title: 'Heo hồng no tròn', chant: 'Ống heo đất nuôi suốt cả năm, đập ra đếm mỏi, con tám mươi bảy (87)!' },
  88: { num: 88, title: 'Song phát đại phát', chant: 'Hai còng số tám phát lộc nhân đôi, ai kinh hô lẹ, con tám mươi tám (88)!' },
  89: { num: 89, title: 'Trâu vàng kéo cày', chant: 'Con trâu là đầu cơ nghiệp nhà nông, đồng sâu lúa tốt, con tám mươi chín (89)!' },
  90: { num: 90, title: 'Đại thọ trăm năm', chant: 'Chín mươi tuổi thọ bách niên giai lão, trùm cuối ra lò, con số chín mươi (90)!' },
};

const ROW_SUBSETS_BY_COUNT: Record<number, readonly (readonly number[])[]> = {
  1: [[0], [1], [2]],
  2: [
    [0, 1],
    [0, 2],
    [1, 2],
  ],
  3: [[0, 1, 2]],
};

function safeIndex(rng: () => number, len: number): number {
  const v = rng();
  if (!Number.isFinite(v) || v <= 0) return 0;
  if (v >= 1) return len - 1;
  return Math.min(len - 1, Math.floor(v * len));
}

/**
 * Sinh tờ vé Lô Tô truyền thống 3×9 hợp lệ tuyệt đối:
 * - Cột 0: `1..9`, cột 1: `10..19`, ..., cột 7: `70..79`, cột 8: `80..90`.
 * - Mỗi hàng (`0..2`) có đúng **5 số** và **4 ô trống (`null`)**.
 * - Mỗi cột (`0..8`) có **từ 1 đến 3 số**, sắp xếp **tăng dần từ trên xuống dưới**.
 */
export function generateLotoTicket(rng: () => number): LotoGrid {
  // 1. Phân phối 15 con số vào 9 cột sao cho mỗi cột có 1..3 số
  const colCounts = [1, 1, 1, 1, 1, 1, 1, 1, 1];
  for (let extra = 0; extra < 6; extra++) {
    const eligible: number[] = [];
    for (let c = 0; c < 9; c++) {
      if (colCounts[c] < 3) eligible.push(c);
    }
    const pick = eligible[safeIndex(rng, eligible.length)];
    colCounts[pick]++;
  }

  // 2. Xáo thứ tự cột rồi sắp giảm dần theo colCounts để gán hàng theo điều kiện Gale-Ryser (không bao giờ tắc)
  const colOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let i = colOrder.length - 1; i > 0; i--) {
    const j = safeIndex(rng, i + 1);
    const tmp = colOrder[i];
    colOrder[i] = colOrder[j];
    colOrder[j] = tmp;
  }
  colOrder.sort((a, b) => colCounts[b] - colCounts[a]);

  const remRow = [5, 5, 5];
  const colRows: number[][] = Array.from({ length: 9 }, () => []);

  for (let idx = 0; idx < 9; idx++) {
    const c = colOrder[idx];
    const count = colCounts[c];
    const remColsAfter = 8 - idx;
    const candidates = ROW_SUBSETS_BY_COUNT[count];

    const validSubsets: (readonly number[])[] = [];
    for (const sub of candidates) {
      let ok = true;
      for (let r = 0; r < 3; r++) {
        const nextNeed = remRow[r] - (sub.includes(r) ? 1 : 0);
        if (nextNeed < 0 || nextNeed > remColsAfter) {
          ok = false;
          break;
        }
      }
      if (ok) validSubsets.push(sub);
    }

    const chosen = validSubsets[safeIndex(rng, validSubsets.length)];
    for (const r of chosen) {
      remRow[r]--;
    }
    colRows[c] = [...chosen];
  }

  // 3. Rút ngẫu nhiên các số thuộc dải của từng cột và xếp tăng dần từ trên xuống
  const grid: LotoGrid = [
    Array<number | null>(9).fill(null),
    Array<number | null>(9).fill(null),
    Array<number | null>(9).fill(null),
  ];

  for (let c = 0; c < 9; c++) {
    const min = c === 0 ? 1 : c * 10;
    const max = c === 8 ? 90 : c * 10 + 9;
    const pool: number[] = [];
    for (let n = min; n <= max; n++) {
      pool.push(n);
    }

    const count = colCounts[c];
    for (let i = 0; i < count; i++) {
      const j = i + safeIndex(rng, pool.length - i);
      const tmp = pool[i];
      pool[i] = pool[j];
      pool[j] = tmp;
    }

    const picked = pool.slice(0, count).sort((a, b) => a - b);
    const rows = colRows[c];
    for (let i = 0; i < count; i++) {
      grid[rows[i]][c] = picked[i];
    }
  }

  return grid;
}

/**
 * Kiểm tra một hàng trên tờ vé Lô Tô:
 * - Nếu truyền `markedSet`, mỗi con số phải vừa nằm trong `calledSet` vừa đã được người chơi đánh dấu trong `markedSet`.
 * - Nếu không truyền `markedSet`, chỉ cần nằm trong `calledSet`.
 * - `validKinh = true` khi hàng có đủ 5 số và cả 5 số đều trúng (`hits === 5`).
 */
export function checkLotoRow(
  grid: LotoGrid,
  row: number,
  calledSet: ReadonlySet<number>,
  markedSet?: ReadonlySet<number>,
): { validKinh: boolean; hits: number; nums: number[] } {
  const line = grid[row];
  if (!line) {
    return { validKinh: false, hits: 0, nums: [] };
  }

  const nums: number[] = [];
  let hits = 0;
  for (const cell of line) {
    if (typeof cell === 'number') {
      nums.push(cell);
      const hit = markedSet ? calledSet.has(cell) && markedSet.has(cell) : calledSet.has(cell);
      if (hit) hits++;
    }
  }

  return {
    validKinh: nums.length === 5 && hits === 5,
    hits,
    nums,
  };
}
