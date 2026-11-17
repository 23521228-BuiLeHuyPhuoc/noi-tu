/**
 * Kiểu dữ liệu, hằng số & bộ bài cho game Hội Bàn Tròn Vô Tri (`cah` — Cards Against Humanity VN Party Edition).
 * Thuần TypeScript, không phụ thuộc thư viện ngoài.
 */

export const CAH_HAND_SIZE = 7;
export const CAH_DEFAULT_ROUNDS = 8;

export type CahPhase = 'pick' | 'vote' | 'reveal';

export type CahCategory = 'xom_lay' | 'cong_so_it' | 'tinh_truong' | 'hoc_duong' | 'vo_tri';

export const CAH_CATEGORY_LABELS: Record<CahCategory, string> = {
  xom_lay: 'Xóm Lầy',
  cong_so_it: 'Công Sở & IT',
  tinh_truong: 'Tình Trường',
  hoc_duong: 'Học Đường',
  vo_tri: 'Vô Tri',
};

export interface CahBlackCard {
  id: string;
  text: string;
  /** có chứa {p} để điền tên người chơi thật trong phòng */
  usesPlayer?: boolean;
  category: 'xom_lay' | 'cong_so_it' | 'tinh_truong' | 'hoc_duong' | 'vo_tri';
}

export interface CahAnonEntry {
  slotId: string;
  text: string;
  votes: string[];
  /** chỉ mở ở phase === 'reveal' */
  authorId?: string;
  authorName?: string;
}

export interface CahView {
  type: 'cah';
  round: number;
  maxRounds: number;
  phase: CahPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  order: string[];
  names: Record<string, string>;
  scores: Record<string, number>;
  blackPrompt: string;
  blackCategory: string;
  targetPlayerId: string | null;
  submittedIds: string[];
  votedIds: string[];
  myHand: string[];
  myPicked: string | null;
  myVote: string | null;
  myMulliganLeft: number;
  entries: CahAnonEntry[];
  roundWinnerIds: string[];
}

/**
 * Điền tên người chơi vào lá Đen (thay `{p}` thành `@Tên`), giữ nguyên khoảng trống `___`.
 */
export function renderBlackCard(card: CahBlackCard, playerName: string): string {
  const clean = (playerName || 'Ai đó').trim().replace(/^@+/, '') || 'Ai đó';
  return card.text.replace(/\{p\}/g, `@${clean}`);
}

/**
 * Lắp nội dung lá Trắng vào chỗ trống `___` của lá Đen.
 */
export function fillBlackCard(prompt: string, whiteText: string): string {
  if (prompt.includes('___')) {
    return prompt.replace('___', `«${whiteText}»`);
  }
  return `${prompt} «${whiteText}»`;
}

function blackDeck(category: CahCategory, prefix: string, prompts: readonly string[]): CahBlackCard[] {
  return prompts.map((text, idx) => {
    const id = `${prefix}_${String(idx + 1).padStart(2, '0')}`;
    return text.includes('{p}')
      ? { id, text, usesPlayer: true, category }
      : { id, text, category };
  });
}

export const CAH_BLACK_CARDS: CahBlackCard[] = [
  ...blackDeck('xom_lay', 'xl', [
    'Lý do cả xóm họp khẩn lúc 11 giờ đêm là vì bắt gặp {p} đang ___.',
    'Camera chạy bằng cơm đầu ngõ vừa ghi nhận {p} lén lút mang ___ về phòng trọ.',
    'Trong đám cưới thằng bạn thân, {p} đã cướp mic trên sân khấu chỉ để tuyên bố về ___.',
    'Bí kíp giúp {p} mặc cả ngoài chợ từ 200 nghìn xuống còn 15 nghìn chính là ___.',
    'Khi chủ trọ gõ cửa đòi tiền nhà tháng thứ ba, {p} liền tung tuyệt chiêu ___.',
    'Món gia truyền duy nhất mà {p} định để lại trong di chúc cho con cháu là ___.',
    'Hàng xóm đồn rằng cứ mỗi đêm rằm, từ phòng của {p} lại vang lên tiếng ___.',
    'Thứ duy nhất ngăn cản {p} trở thành tỷ phú tự thân ở tuổi 25 là ___.',
    'Lúc bị CSGT tuýt còi vì vượt đèn vàng, {p} đã rưng rưng nước mắt giải thích bằng ___.',
    'Đi nhậu tăng 3 xong, sáng hôm sau {p} tỉnh dậy thấy mình đang ôm chặt ___.',
    'Bí mật đen tối đằng sau nụ cười hiền lành của {p} mỗi khi mượn tiền không trả là ___.',
    'Tổ trưởng tổ dân phố vừa trao tặng {p} bằng khen "Tấm gương tiêu biểu" nhờ thành tích ___.',
    'Trong buổi họp mặt họ hàng ngày Tết, câu hỏi duy nhất khiến {p} tắt nụ cười là ___.',
    'Mỗi khi mất điện giữa mùa hè 40 độ, thú vui tao nhã của {p} là ___.',
    'Vũ khí tối thượng của các cô hàng xóm đầu hẻm vào lúc 6 giờ sáng là ___.',
    'Đỉnh cao của văn hóa giao thông giờ cao điểm chính là ___.',
    'Thứ nguy hiểm hơn cả loa kẹo kéo hát lệch tông lúc trưa nắng là ___.',
    'Dấu hiệu rõ ràng nhất chứng tỏ cuối tháng ví bạn đã chạm đáy nỗi đau là ___.',
    'Bí quyết sống sót qua 3 ngày Tết trước hàng chục câu hỏi bao giờ lấy chồng là ___.',
    'Món quà tân gia khiến chủ nhà vừa mở hộp ra đã muốn tuyệt giao ngay lập tức là ___.',
    'Chuyện tâm linh không đùa được đâu: cứ hễ rửa xe sạch bóng là kiểu gì cũng gặp ___.',
    'Đặc sản không thể thiếu trong mọi cuộc cãi nhau trên mạng xã hội Việt Nam là ___.',
    'Khi đi ăn buffet lẩu nướng cùng hội bạn thân, tội ác lớn nhất của {p} là ___.',
    'Thứ mà {p} luôn giấu kỹ dưới gầm giường như báu vật quốc gia thực ra là ___.',
  ]),

  ...blackDeck('cong_so_it', 'it', [
    'Lý do thực sự khiến {p} rớt phỏng vấn vị trí Senior trong vòng 5 phút là ___.',
    'Trong CV xin việc, {p} tự hào ghi kỹ năng xuất sắc nhất của mình là ___.',
    'Lúc 4h55 chiều thứ Sáu, {p} lỡ tay bấm nhầm nút gửi ___ cho toàn bộ công ty.',
    'Khi sếp hỏi vì sao trễ deadline 2 tuần, {p} bình thản đổ lỗi cho ___.',
    'Màn hình chia sẻ trong cuộc họp Google Meet của {p} vô tình để lộ tab ___.',
    'Để xin nghỉ phép ngày thứ Hai một cách thuyết phục, {p} đã bịa ra lý do ___.',
    'Thứ duy nhất giữ cho {p} chưa nộp đơn xin nghỉ việc vào sáng thứ Hai là ___.',
    'Bí quyết giúp {p} trông cực kỳ bận rộn suốt 8 tiếng trên văn phòng thực chất là ___.',
    'Khi server sập lúc nửa đêm, người ta thấy {p} bình tĩnh mở máy lên để ___.',
    'Trong tiệc tất niên công ty, {p} đã uống 2 lon nước ngọt rồi lên bàn sếp biểu diễn ___.',
    'Câu nói cửa miệng của {p} mỗi khi code chạy đúng mà không hiểu tại sao là ___.',
    'Đồng nghiệp ngồi cạnh phát hiện tai nghe chống ồn của {p} suốt ngày chỉ bật tiếng ___.',
    'KPI quý này của {p} đạt 200% hoàn toàn là nhờ ma thuật của ___.',
    'Thứ đáng sợ hơn cả dòng tin nhắn "Em ơi anh nhờ tí" lúc 10 giờ tối là ___.',
    'Câu nói dối kinh điển nhất lịch sử ngành công nghệ thông tin chính là ___.',
    'Phần thưởng thực sự sau 6 tháng cày dự án xuyên đêm của cả team là ___.',
    'Tính năng mới nhất mà AI vẫn chưa bao giờ thay thế được con người ở công sở là ___.',
    'Trong bản mô tả công việc ghi "Môi trường năng động, trẻ trung", dịch sang tiếng người nghĩa là ___.',
    'Cách nhanh nhất để biến một bug nhỏ thành tính năng độc quyền là ___.',
    'Cuộc họp kéo dài 3 tiếng đồng hồ cuối cùng chốt lại bằng một quyết định lịch sử: ___.',
    'Lương chưa kịp ấm chỗ trong tài khoản đã bốc hơi sạch chỉ trong 15 phút vì ___.',
    'Khi khách hàng bảo "Em thiết kế cho chị cái logo nhìn đơn giản mà phải sang, nổi bật nhưng trầm lắng", thứ họ thực sự cần là ___.',
    'Bí mật giúp {p} sống sót qua 4 cuộc họp liên tiếp không ngủ gật là ___.',
  ]),

  ...blackDeck('tinh_truong', 'tt', [
    'Khi đi xem mắt lần đầu, {p} đã lỡ miệng khoe khả năng đặc biệt là ___.',
    'Lý do người yêu cũ chặn sạch mọi mặt trận mạng xã hội của {p} là vì ___.',
    'Câu thả thính đi vào lòng đất khiến crush block {p} trong một nốt nhạc là ___.',
    'Tiêu chuẩn chọn nửa kia của {p} nghe thì đơn giản nhưng thực ra chỉ cần ___.',
    'Lúc 2 giờ sáng nhớ người yêu cũ, {p} thường trùm chăn làm trò ___.',
    'Trong buổi hẹn hò lãng mạn dưới ánh nến, {p} bất ngờ rút từ trong túi áo ra ___.',
    'Thầy bói phán đường tình duyên năm nay của {p} chỉ gói gọn trong cụm từ: ___.',
    'Bằng chứng thép chứng minh {p} đã ế bền vững suốt nhiều năm liền là ___.',
    'Nếu {p} mở lớp dạy tán tỉnh, bài học đầu tiên chắc chắn sẽ là ___.',
    'Điều lãng mạn nhất mà {p} từng làm cho crush chỉ nhận lại câu "Cảm ơn bạn tốt" là ___.',
    'Profile hẹn hò trên app quẹt phải của {p} chỉ viết vỏn vẹn một dòng: ___.',
    'Khi bị crush hỏi "Anh thấy em hôm nay có gì khác không?", {p} hồn nhiên đáp là ___.',
    'Món quà kỷ niệm 100 ngày yêu nhau khiến đối phương đứng hình 5 giây của {p} là ___.',
    'Cờ đỏ (Red flag) to như cái mền nhưng ai đang yêu cũng mù quáng bỏ qua là ___.',
    'Sự khác biệt lớn nhất giữa lúc mới tán tỉnh và sau khi yêu nhau 3 năm là ___.',
    'Lý do thực sự khiến 90% các cặp đôi giận nhau lúc đi ăn tối là ___.',
    'Đỉnh cao của sự trưởng thành trong tình yêu hiện đại chính là ___.',
    'Câu nói "Anh ăn gì cũng được" thực chất là mật mã báo hiệu cho ___.',
    'Cách nhanh nhất để quên đi mối tình sâu đậm kéo dài 3 ngày là ___.',
    'Bí kíp giữ lửa tình yêu khi cả hai đều lười ra đường vào cuối tuần là ___.',
    'Khi đi coi tarot hỏi bao giờ thoát ế, bà bói lật lá bài lên rồi thở dài chỉ vào ___.',
    'Phản ứng đầu tiên của {p} khi vô tình chạm mặt người yêu cũ lúc mình đang mặc đồ bộ đi đổ rác là ___.',
    'Thứ duy nhất luôn chung thủy ở bên {p} qua bao mùa Valentine lạnh giá là ___.',
  ]),

  ...blackDeck('hoc_duong', 'hd', [
    'Trong sổ đầu bài năm cấp 3, tên của {p} được ghi bằng mực đỏ vì tội ___.',
    'Bí mật động trời trong lịch sử tìm kiếm lúc thi học kỳ của {p} là ___.',
    'Khi thầy giáo gọi lên bảng kiểm tra miệng bất ngờ, {p} đã diễn sâu màn ___.',
    'Tài năng thiên bẩm duy nhất giúp {p} qua môn ở trường đại học là ___.',
    'Trong buổi họp phụ huynh cuối năm, cô chủ nhiệm chỉ biết lắc đầu khi nhắc tới chuyện {p} hay ___.',
    'Làm bài tập nhóm 5 người, vai trò đóng góp quan trọng nhất của {p} là ___.',
    'Thứ từng được {p} giấu tinh vi bên trong hộp bút suốt những năm đi học là ___.',
    'Ước mơ hồi mẫu giáo của {p} là làm siêu nhân, nhưng lớn lên lại thành chuyên gia ___.',
    'Ngày chụp kỷ yếu tốt nghiệp, {p} đã tạo dáng để đời với đạo cụ là ___.',
    'Lúc phát đề thi tự luận 90 phút, {p} nhìn đề 5 phút rồi dành 85 phút còn lại để ___.',
    'Kỷ niệm quê độ nhất thời đi học của {p} trước toàn trường giờ chào cờ là ___.',
    'Bữa tối sang chảnh nhất thời sinh viên ngày 29 cuối tháng của {p} gồm có ___.',
    'Ác mộng kinh hoàng nhất của mọi thế hệ học sinh vào mỗi sáng thứ Hai là ___.',
    'Phương pháp chọn đáp án trắc nghiệm có độ tâm linh chính xác cao nhất là ___.',
    'Câu nói kinh điển của giáo viên khiến cả lớp lạnh sống lưng là ___.',
    'Thứ luôn biến mất một cách bí ẩn khỏi bàn học chỉ sau 3 giây rơi xuống đất là ___.',
    'Sự thật phũ phàng mà trường học không dạy bạn nhưng bước ra đời ngày đầu tiên đã vả vào mặt là ___.',
    'Trong nhóm làm đồ án tốt nghiệp, kiểu thành viên đáng sợ hơn cả kẻ lặn mất tăm là ___.',
    'Bí thuật quay cóp thất truyền từ thời ông bà anh để lại chính là ___.',
    'Mùi hương đặc trưng của phòng thi vào những ngày nắng nóng đỉnh điểm là sự hòa quyện của ___.',
    'Khi bạn cùng bàn hỏi câu dễ nhất đề mà {p} vẫn tự tin chỉ sai, tất cả là tại ___.',
    'Lý do {p} đăng ký học tiếng Anh giao tiếp 7 lần vẫn chỉ nói được "Hello, how are you" là ___.',
  ]),

  ...blackDeck('vo_tri', 'vt', [
    'Bí mật động trời trong lịch sử duyệt web lúc 2h sáng của {p} là ___.',
    'Nếu cuộc đời của {p} được dựng thành phim chiếu rạp, tựa đề phim sẽ là ___.',
    'Các nhà khoa học vừa quét não của {p} và phát hiện 99% dung lượng bên trong chứa ___.',
    'Khi người ngoài hành tinh bắt cóc {p}, chỉ sau 10 phút họ vội trả về Trái Đất vì không chịu nổi ___.',
    'Siêu năng lực vô dụng nhất vũ trụ mà {p} vô tình thức tỉnh được là ___.',
    'Nếu ngày mai tận thế, việc đầu tiên {p} làm trong 5 phút cuối cùng chắc chắn là ___.',
    'Ở kiếp trước, {p} từng là một nhân vật lừng lẫy chuyên hành nghề ___.',
    'Thần Đèn hiện lên cho 3 điều ước, nhưng vừa nghe điều ước đầu tiên của {p} là ___ liền tự chui tọt lại vào đèn.',
    'Trong bảo tàng lịch sử năm 3000, bức tượng sáp của {p} sẽ được trưng bày kèm chú thích: ___.',
    'Thứ duy nhất có thể triệu hồi {p} dậy ngay lập tức lúc 6 giờ sáng Chủ nhật là ___.',
    'Giữa dòng đời xô đẩy, phương châm sống bất diệt của {p} vẫn luôn là ___.',
    'Khi bị lạc trên đảo hoang không bóng người, {p} đã sinh tồn suốt 1 tháng nhờ ___.',
    'Bác sĩ tâm lý sau khi nghe {p} tâm sự 30 phút đã lặng lẽ đi kê đơn thuốc cho chính mình vì ___.',
    'Bí mật đằng sau vẻ mặt trầm tư như triết gia của {p} ở quán cà phê thực chất là đang nghĩ về ___.',
    'Thứ duy nhất ngăn loài người tiến hóa lên nền văn minh bậc cao hơn là ___.',
    'Giải pháp triệt để nhất cho mọi vấn đề khó khăn trong cuộc sống trưởng thành là ___.',
    'Điều kỳ diệu xảy ra vào đúng khoảnh khắc bạn vừa đặt lưng xuống giường định đi ngủ sớm là ___.',
    'Thành tựu vĩ đại nhất của loài người trong thế kỷ 21 hóa ra lại là ___.',
    'Triết lý tối thượng của hội người chơi hệ tâm linh khi gặp chuyện xui là ___.',
    'Dấu hiệu tuổi già ập đến không báo trước dù mới ngoài đôi mươi chính là ___.',
    'Âm thanh êm dịu nhất thế gian có thể chữa lành mọi tổn thương tâm hồn là ___.',
    'Khi mở ví ra thấy chỉ còn đúng tờ 2 nghìn nhăn nhúm, tiếng nói nội tâm liền thì thầm: ___.',
    'Lý do tối qua {p} trằn trọc tới 4 giờ sáng không chợp mắt được chỉ vì chợt nhớ lại ___.',
  ]),
];

export const CAH_WHITE_CARDS: string[] = [
  // Công sở & IT lầy lội
  'xóa nhầm database production lúc 4h59 chiều thứ Sáu',
  'code chạy mượt trên máy em nhưng nổ tung trên máy khách',
  'sếp bảo "cái này sửa 5 phút là xong ấy mà em"',
  'mở 47 tab StackOverflow chỉ để căn giữa một thẻ div',
  'họp 3 tiếng đồng hồ để thống nhất lịch họp tuần sau',
  'mức lương 3 cọc 3 đồng nhưng đòi hỏi tâm huyết như cổ đông sáng lập',
  'gật đầu lia lịa trong cuộc họp dù không hiểu một chữ tiếng Anh nào',
  'giả vờ gõ bàn phím cạch cạch cực căng khi sếp đi ngang qua',
  'ngồi khóc thầm 15 phút trong nhà vệ sinh công ty rồi ra làm tiếp',
  'tắt thông báo Slack rồi tự nhủ chuyện gì tới sẽ tới',
  'đặt tên biến là temp1, temp2, temp_final_thật_sự_cuối_cùng',
  'dùng ChatGPT viết đơn xin tăng lương gửi nhầm vào nhóm chung công ty',
  'lương tháng 7 triệu nhưng uống trà sữa full topping mỗi chiều',
  'đi làm vì đam mê chứ nhà làm gì có điều kiện',
  'bánh vẽ dự án triệu đô của sếp trong buổi nhậu',
  'nộp đơn xin nghỉ việc trong đầu 800 lần mỗi sáng thứ Hai',
  'combo đau lưng mỏi gối tê tay ở tuổi 23',
  'chuyển khoản nhầm cho sếp kèm nội dung "trả tiền bún đậu mắm tôm"',
  'bật filter làm đẹp hết cỡ khi họp camera buổi sáng',
  'file Excel kế hoạch làm giàu chưa bao giờ mở lại lần thứ hai',
  'cúp điện đúng lúc chưa kịp bấm Ctrl + S sau 4 tiếng gõ báo cáo',
  'trả lời tin nhắn khách hàng bằng một chiếc meme mèo khóc',
  'tinh thần đồng đội: có phúc cùng hưởng, có bug tự ai nấy sửa',
  'uống 3 ly cà phê sữa đá xong tim đập nhanh nhưng mắt vẫn díp lại',
  'lời hứa "cuối năm công ty thưởng to lắm" nghe quen quen từ 3 năm trước',
  'một chiếc CV viết toàn kỹ năng vũ trụ nhưng vào việc chỉ biết pha mì',
  'bấm Reply All gửi bức tâm thư nói xấu sếp cho cả tập đoàn',
  'chuyên gia tư vấn tình cảm cho cả phòng nhưng bản thân ế 10 năm',
  'đồng nghiệp mượn cái bật lửa từ đầu năm đến cuối năm chưa trả',
  'khởi động lại máy tính để giải quyết 99% bế tắc cuộc đời',

  // Xóm lầy & Đường phố Việt Nam
  'dàn karaoke loa kẹo kéo hát "Vùng Lá Me Bay" lệch 3 tông lúc 12h trưa',
  'chiến thần áo chống nắng bật xi nhan trái nhưng cua gắt sang phải',
  'camera chạy bằng cơm của các cô hàng xóm đầu ngõ',
  'đôi dép tổ ong huyền thoại mất một chiếc sau cơn mưa ngập phố',
  'chó nhà hàng xóm sủa nhầm người quen nhưng vẫy đuôi với kẻ lạ',
  'tiếng rao "Ai bánh bao nóng đây" vang vọng lúc 2 giờ đêm',
  'cú phanh gấp đi vào lòng đất trước vạch đèn vàng còn 1 giây',
  'tờ vé số chiều nay chưa dò nhưng đã lên sẵn danh sách mua biệt thự',
  'bát bún đậu mắm tôm thơm lừng giữa phòng máy lạnh kín mít',
  'cô bán hàng gọi "mình ơi" ngọt xớt trước khi hét giá gấp đôi',
  'mặc bộ đồ ngủ hoa nhí đi đổ rác vô tình gặp lại mối tình đầu',
  'xin vía thần tài online nhưng quên không mua vé số',
  'hộp bánh quy Danisa ngày Tết mở ra toàn kim chỉ của mẹ',
  'vỏ hộp kem Wall để trong ngăn đá nhưng mở ra là cá kho đông lạnh',
  'cảm giác quyền lực khi hô "Cho thêm bát hành trần nhiều béo"',
  'kẹt xe 45 phút dưới cơn mưa tầm tã trong chiếc áo mưa rách tà',
  'túi nilon đựng thêm 20 cái túi nilon khác cất kỹ dưới gầm bếp',
  'gọi điện cho mẹ hỏi chỗ để cái kéo dù nó đang nằm ngay trước mặt',
  'chiếc ghế nhựa đỏ huyền thoại cân mọi quán trà đá vỉa hè',
  'đi siêu thị chỉ định mua chai nước mắm nhưng thanh toán hết 2 triệu',
  'tiếng chổi quét nhà sột soạt đầy áp lực của mẹ lúc 7 giờ sáng Chủ nhật',
  'tranh nhau trả tiền hóa đơn ở quầy thu ngân như đóng phim hành động',
  'nồi thịt kho tàu ăn từ hai mươi chín Tết tới rằm tháng Giêng vẫn còn',
  'lời dặn "Mẹ giữ tiền lì xì hộ cho, lớn lên mẹ trả" từ năm 2008',
  'hàng xóm khoan tường đúng lúc vừa chợp mắt ngủ bù chiều thứ Bảy',
  'chạy xe máy vòng vòng 30 phút chỉ để trả lời câu hỏi "Tối nay ăn gì"',
  'ly nước mía siêu to khổng lồ cứu rỗi linh hồn giữa trưa tháng Năm',
  'màn trả giá điêu luyện bỏ đi 3 bước chờ chủ quán gọi giật ngược lại',
  'cây chổi lông gà quyền lực từng làm nên tuổi thơ dữ dội',
  'quán phở quen đầu ngõ cứ hôm nào thèm nhất thì treo biển nghỉ bán',

  // Tình trường, Crush & Người yêu cũ
  'nhắn tin "Anh ngủ chưa" lúc 1 giờ sáng rồi vội vàng thu hồi sau 3 giây',
  'gia trưởng mới lo được cho em nhưng tiền trà sữa anh quên mang ví',
  'đòi chia đôi 5 nghìn tiền gửi xe ngay trong buổi hẹn hò đầu tiên',
  'coi bói bài Tarot trên TikTok rồi tự suy diễn crush đang thầm thương mình',
  'người yêu cũ nhắn tin mời cưới kèm số tài khoản ngân hàng cực nét',
  'tình yêu sét đánh: đánh xong một cái tỉnh ra thấy mình bị lừa',
  'vào trang cá nhân của người yêu mới của người yêu cũ lỡ tay thả tim ảnh năm 2019',
  'đặt tên con tương lai với crush dù người ta còn chưa chấp nhận kết bạn',
  'câu thần chú "Em không giận đâu, anh cứ đi chơi với bạn đi"',
  'yêu xa qua màn hình điện thoại với một tài khoản dùng ảnh mạng',
  'bạn thân khác giới nhưng ngày nào cũng gọi video chúc ngủ ngon',
  'chiếc sừng dài 2 mét mọc xuyên qua trần nhà mà vẫn tin lời giải thích',
  'tập tành nấu ăn tặng crush và suýt gọi xe cứu hỏa tới chung cư',
  'trái tim băng giá nhưng ai rủ đi ăn ốc nóng là tan chảy ngay',
  'danh hiệu "Anh trai mưa" kiêm tài xế xe ôm miễn phí suốt 4 mùa',
  'soạn tin nhắn chia tay dài 3 trang giấy A4 chỉ nhận lại chữ "Ok"',
  'mẫu người lý tưởng: cao ráo, tinh tế, giàu có và bị cận nặng mới yêu mình',
  'kế hoạch thoát ế 5 năm lần thứ ba vẫn đang ở giai đoạn tìm đối tượng',
  'tự mua hoa tự viết thiệp tặng mình ngày 14/2 cho đỡ tủi thân',
  'nhìn hai con mèo hoang âu yếm nhau ngoài hiên mà chạnh lòng rớt nước mắt',
  'đi đám cưới bạn bè ăn cỗ nhiệt tình để gỡ vốn tiền mừng',
  'lời thề độc thân vui tính vừa thốt ra được 5 phút đã thấy trai đẹp đi ngang',
  'giả vờ trượt tay gửi nhầm ảnh tự sướng lung linh nhất cho crush',
  'kể chuyện cười nhạt như nước ốc nhưng crush vẫn lịch sự thả "Haha"',
  'tình đầu khắc cốt ghi tâm cho tới khi người ấy mượn 500 nghìn lặn mất tăm',
  'hội độc thân bền vững chuyên đi tư vấn hôn nhân gia đình cho thiên hạ',
  'bói cung hoàng đạo thấy không hợp nhau nên chủ động chia tay trong tưởng tượng',
  'ánh mắt phán xét của con boss mèo khi thấy chủ lụy tình lần thứ tám',
  'lưu tên người yêu cũ trong danh bạ là "Tổng đài đòi nợ" để khỏi bấm gọi',
  'đi xem phim kinh dị định giả vờ sợ ôm crush nhưng cuối cùng hét to hơn cả ma',

  // Học đường & Sinh viên
  'gói mì tôm Hảo Hảo bẻ vụn ăn sống dưới gầm bàn giờ ra chơi',
  'chép bài bạn bên cạnh nhiệt tình từ đầu đến cuối kể cả dòng họ và tên',
  'cơn đau bụng thần kỳ xuất hiện đúng 15 phút đầu giờ kiểm tra miệng',
  'ánh mắt chạm nhau đầy định mệnh với giám thị coi thi lúc đang cúi xuống gầm bàn',
  'tờ giấy nháp vẽ đầy hình siêu nhân thay vì công thức toán học',
  'học tủ 10 bài văn nhưng đề thi rơi đúng vào bài đọc thêm trang cuối',
  'cây bút bi hết sạch mực đúng lúc chuẩn bị viết câu kết luận tâm đắc',
  'nhóm thuyết trình 5 người: 1 người gánh còng lưng, 4 người vỗ tay phụ họa',
  'ngồi bàn đầu đối diện bàn giáo viên nhưng vẫn ăn hết bịch bánh tráng trộn',
  'dùng thước kẻ đo độ dài các câu A B C D để khoanh câu dài nhất',
  'xin cô đi vệ sinh thực chất là lượn xuống căng tin mua xúc xích rán',
  'sổ liên lạc điện tử báo tin dữ về máy mẹ nhanh hơn tốc độ ánh sáng',
  'hứa học hành chăm chỉ từ đầu học kỳ nhưng tuần thứ hai đã mất gốc',
  'mượn cục tẩy của bạn cùng bàn rồi lấy đầu bút đâm lỗ chỗ như tổ ong',
  'mì tôm úp hai vắt thêm quả trứng gà: yến tiệc hoàng gia ngày cuối tháng',
  'ngủ gật trong giờ Lịch sử mơ thấy mình đang cưỡi voi đánh giặc',
  'đứa bạn miệng than "Tao chưa ôn chữ nào" nhưng lúc trả bài được 9 rưỡi',
  'cảm giác phản bội khi cả lớp hẹn nhau nghỉ học nhưng chỉ có mình nghỉ thật',
  'nhặt được tờ 20 nghìn ép phẳng phiu trong túi quần áo mùa đông năm ngoái',
  'học thuộc lòng công thức hóa học bằng thơ lục bát tự chế cực kỳ vô nghĩa',
  'bài văn miêu tả con mèo nhà em có bộ lông vàng óng và sủa gâu gâu giữ nhà',
  'đồng phục thể dục mặc suốt 3 ngày mưa phùn phơi mãi không khô',
  'tiếng trống tan trường vang lên như bản giao hưởng cứu rỗi cuộc đời',
  'tung đồng xu chọn đáp án đúng mà đồng xu lăn thẳng xuống cống',
  'lời thề "Kỳ sau tao nhất định săn học bổng" vang lên sau mỗi kỳ thi lại',

  // Vô tri, Gen-Z & Plot Twist kịch tính
  'cười khằng khặc một mình trước màn hình điện thoại lúc 3 giờ sáng',
  'nội tâm gào thét dữ dội nhưng gương mặt vẫn giữ nét vô tri bình thản',
  'thở thôi cũng thấy tốn calo và mệt mỏi với nhân sinh quan',
  'tâm bất biến giữa dòng đời vạn biến vì tài khoản còn đúng 12 nghìn đồng',
  'bộ não cá vàng vừa bước chân vào phòng bếp đã quên sạch mình định lấy gì',
  'nằm trên giường lướt video dạy tập thể dục giảm cân vừa nhai bim bim',
  'một pha xử lý cồng kềnh đi thẳng vào sách giáo khoa của sự quê độ',
  'tự biên tự diễn cuộc cãi nhau cực gắt trong lúc tắm rồi tự thắng áp đảo',
  'vẫy tay chào lại cực kỳ thân thiện với một người đang vẫy người đứng sau lưng mình',
  'đeo tai nghe không bật nhạc để nghe lén drama bàn bên cạnh quán cà phê',
  'sự im lặng đáng sợ kéo dài 5 giây sau một câu đùa nhạt thếch',
  'khuôn mặt đầy sự phán xét của đứa trẻ 5 tuổi ngồi ghế đối diện trên xe buýt',
  'năng lượng tích cực duy nhất trong ngày đến từ thông báo "Đơn hàng đang giao"',
  'đặt 12 cái báo thức cách nhau 5 phút từ 6 giờ sáng để dậy lúc 9 giờ rưỡi',
  'nhìn chằm chằm vào khoảng không vô định như đang suy ngẫm vận mệnh vũ trụ',
  'cảm giác tội lỗi kéo dài 3 giây sau khi uống hết ly trà sữa trân châu đường đen',
  'hướng nội nửa mùa: ở nhà thì buồn chán, ra đường 15 phút lại muốn về nhà',
  'một kế hoạch hoàn hảo trên giấy nháp nhưng bước đầu tiên đã ngã sấp mặt',
  'tài năng thiên bẩm trong việc chọn đúng hàng thanh toán chậm nhất siêu thị',
  'giả vờ nghe điện thoại cực kỳ quan trọng để né người quen ngoài đường',
  'cú vấp ngã vào không khí trên mặt đường bằng phẳng rồi tự đứng dậy đi nhanh như gió',
  'lướt thực đơn trên app đặt đồ ăn 1 tiếng rưỡi rồi đứng dậy úp mì gói',
  'mua thẻ tập gym 1 năm nhưng mới đi được 2 buổi để chụp ảnh check-in',
  'sự tự tin mãnh liệt của một người hát sai lời nhưng luôn hát to nhất phòng karaoke',
  'kỹ năng đọc vị tâm lý người khác sai bét từ đầu chí cuối',
  'ánh nhìn bất lực của ví tiền mỗi dịp siêu sale ngày đôi hàng tháng',
  'khóc thét trong lòng khi thợ cắt tóc bảo "Anh chỉ tỉa nhẹ phần ngọn thôi"',
  'chiếc bụng mỡ trung thành tuyệt đối dù chủ nhân đã nhịn ăn tối được 1 hôm',
  'trí nhớ siêu phàm chỉ dùng để nhớ lại chuyện xấu hổ từ 7 năm trước lúc chuẩn bị ngủ',
  'một tâm hồn đẹp nhưng hơi thiếu nghị lực trước đồ chiên rán lúc nửa đêm',

  // Thêm các lá bài cực lầy, đa dụng, plot twist hài hước
  'bí kíp võ công thất truyền "Chạy là thượng sách"',
  'một ánh mắt ngây thơ vô số tội',
  'nụ cười công nghiệp đầy giả trân của nhân viên tư vấn',
  'tinh thần thép trước mọi lời giục lấy vợ lấy chồng của họ hàng',
  'bản hợp đồng hôn nhân viết tay trên tờ giấy lịch treo tường',
  'khoảnh khắc nhận ra mình chính là nhân vật phụ mờ nhạt trong câu chuyện của bạn thân',
  'chiếc điện thoại rơi úp mặt xuống sàn gạch và khoảnh khắc nín thở lật lên',
  'giấc mơ trưa kéo dài từ 1 giờ chiều đến 7 giờ tối không biết trời trăng gì',
  'hội chứng sợ nghe chuông điện thoại gọi đến từ số lạ',
  'bữa tiệc độc thân chỉ có mình tôi với con thú nhồi bông',
  'một pha quay xe khét lẹt hơn cả phim truyền hình dài tập',
  'lời xin lỗi chân thành kèm theo hành động tái phạm ngay ngày hôm sau',
  'gương mặt ngơ ngác của người tối cổ vừa mở mạng lên sau 2 tiếng ngủ trưa',
  'đam mê mãnh liệt với việc hóng chuyện thiên hạ dù chẳng liên quan tới mình',
  'sự kết hợp ẩm thực phản khoa học khiến đầu bếp Michelin khóc thét',
  'một rổ lý sự cùn không ai cãi lại nổi',
  'cơn buồn ngủ ập đến mãnh liệt cứ hễ cầm cuốn sách lên đọc được 2 dòng',
  'tiếng bụng kêu ọc ọc vang dội giữa phòng họp đang im phăng phắc',
  'kế hoạch tiết kiệm tiền mua nhà bắt đầu bằng việc bớt uống một ly trà chanh',
  'tâm lý bất ổn nhưng lúc nào cũng tỏ ra mình rất ổn',
  'chuyến du lịch chữa lành xong về nhà còn đau ví và trầm cảm hơn lúc chưa đi',
  'bài văn mẫu xin lỗi chép nguyên xi trên mạng quên chưa xóa dấu ngoặc kép',
  'vũ điệu ăn mừng sớm trước khi nhận ra kết quả bị lật kèo phút 89',
  'một giỏ hàng Shopee chất đầy 99 món đồ vô tri chỉ chờ ngày lĩnh lương',
  'khả năng biến mọi cuộc trò chuyện nghiêm túc thành tấu hài trong 30 giây',
  'bộ sưu tập ảnh dìm hàng đủ sức tống tiền cả hội bạn thân suốt đời',
  'thái độ ngẩng cao đầu bước tiếp dù vừa đẩy cửa kính có chữ "KÉO"',
  'cảm giác giàu sang phú quý kéo dài đúng 24 giờ sau khi nhận lương',
  'một bầu trời kiến thức mênh mông nhưng toàn những thứ không bao giờ dùng tới',
  'quyết tâm dậy sớm chạy bộ lúc 5 giờ sáng được thiết lập vào lúc 1 giờ đêm',

  // Đợt mở rộng lên 280+ lá Trắng siêu bựa
  'ông chú Viettel gọi nhầm số nhưng nói chuyện tâm đầu ý hợp suốt nửa tiếng',
  'một chiếc xe đạp điện hết bình giữa dốc cầu vượt nắng chang chang',
  'bí quyết giữ dáng thon gọn: hít không khí và uống nước lọc cầm hơi',
  'tờ giấy nợ viết bằng bút chì đã phai mờ theo năm tháng',
  'chú chó Corgi chân ngắn chạy hết tốc lực vẫn đứng yên một chỗ',
  'lời khen "Dạo này nhìn có da có thịt thế" đầy sát thương chí mạng',
  'chiếc quạt máy quay cót két như muốn rụng đầu bất cứ lúc nào',
  'tài khoản ngân hàng bật chế độ tàng hình số dư vì quá ít số không',
  'màn ảo thuật biến 500 nghìn tiền chẵn thành mấy tờ tiền lẻ chỉ sau một ly nước',
  'ngồi sau xe đứa bạn mới tập lái mà miệng niệm kinh cầu bình an liên tục',
  'bữa cơm gia đình đầm ấm bỗng biến thành đại hội chất vấn tương lai',
  'một chiếc meme chú hề tự trang điểm từng bước một',
  'đỉnh cao ẩm thực bóng đêm: cơm nguội trộn nước mắm tỏi ớt',
  'kỹ năng ngủ mở mắt đỉnh cao không một ai phát hiện',
  'người bạn thân luôn rủ giảm cân nhưng tay cầm hai bịch trà sữa kem trứng',
  'chiếc cân điện tử ở nhà chắc chắn đã bị hỏng nên mới hiện con số vô lý này',
  'cảm giác lạc lõng khi cả bàn nhậu bàn chuyện đất đai còn mình bàn chuyện săn mã giảm giá',
  'một cú hắt xì hơi long trời lở đất làm bay mất cả hình tượng thanh lịch',
  'sự cố rách đũng quần đúng lúc đang cúi xuống nhặt đồ trước đám đông',
  'bí mật quốc gia được kể đầu tiên bằng câu "Mày đừng nói cho ai biết nhé"',
  'lòng tin mong manh vào câu "Đợi tao 5 phút tao đang trên đường tới rồi"',
  'ngồi lọc từng cọng hành lá trong bát phở với sự tập trung của bác sĩ phẫu thuật',
  'cơn mưa rào ập tới đúng 3 phút sau khi vừa phơi xong đống chăn màn',
  'một nụ hôn gió gửi nhầm địa chỉ khiến cả khán phòng hóa đá',
  'giọng hát truyền cảm hứng cho khán giả đứng dậy đi về sớm',
  'tuyệt kỹ đọc tin nhắn từ màn hình khóa để không hiện chữ "Đã xem"',
  'chiếc ví da hàng hiệu sang trọng bên trong đựng toàn hóa đơn tiền điện',
  'ánh mắt cầu cứu tuyệt vọng khi bị họ hàng bắt lên hát văn nghệ đầu xuân',
  'sự thật đau lòng rằng ngày mai mới chỉ là thứ Ba chứ chưa phải thứ Sáu',
  'một pha tự hủy cực mạnh đi vào huyền thoại của nhóm chat',
  'tinh thần khởi nghiệp bất diệt từ vốn liếng là hai bàn tay trắng và một đống nợ môn',
  'câu chuyện ma đáng sợ nhất chỉ gồm 4 chữ: "Hết tiền tiêu rồi"',
  'điệu nhảy vô tri trên TikTok tập 3 ngày vẫn trông như robot hết pin',
  'bản năng sinh tồn trỗi dậy khi nghe tiếng bước chân mẹ tiến về phía phòng đang chơi game',
  'một tâm hồn ăn uống bất khuất trước mọi lời cảnh báo của bác sĩ dinh dưỡng',
  'cảm giác trống rỗng vô định sau khi xem hết bộ phim dài 60 tập lúc 5 giờ sáng',
  'chiếc áo trắng tinh khôi vừa mặc ra đường đã dính ngay một vệt bùn bánh xe',
  'nỗi ám ảnh mang tên gội đầu xong mới nhớ ra chưa cất quần áo ngoài dây phơi',
  'khuôn mặt tỉnh bơ như chưa hề có cuộc chia ly sau khi vừa làm vỡ cái bát quý của mẹ',
  'một tràng pháo tay lẻ loi giữa hội trường vì vỗ nhầm đoạn diễn giả đang lấy hơi',
  'chuyên gia bắt lỗi chính tả mỗi khi đuối lý trong một cuộc tranh luận',
  'niềm vui nhỏ nhoi khi phát hiện hôm nay được nghỉ lễ mà hôm qua quên mất',
  'lời khuyên chân thành "Đừng buồn nữa" vô tác dụng nhất lịch sử loài người',
  'bộ đồ pijama lụa bóng bẩy mặc đi siêu thị với thần thái catwalk Paris',
  'cú lừa ngoạn mục của hình ảnh minh họa trên bao bì mì gói',
  'trận cười sặc sụa không thể kìm nén đúng lúc không khí đang trang nghiêm nhất',
  'một quyết định bốc đồng lúc 1 giờ đêm mà sáng hôm sau nhìn lại chỉ muốn độn thổ',
  'hào quang nhân vật chính tự phong trong trí tưởng tượng lúc đeo tai nghe đi dưới mưa',
  'sự kiên nhẫn vô bờ bến khi gỡ cuộn dây sạc rối tinh rối mù trong ba lô',
  'tấm bằng khen "Bé khỏe bé ngoan" — đỉnh cao danh vọng cuối cùng đạt được trong đời',
  'một ly trà đá vỉa hè ngồi đồng suốt 4 tiếng bàn chuyện kinh tế thế giới',
  'chiếc khẩu trang cứu cánh che đi 80% sự lười trang điểm mỗi khi ra đường',
  'cú xoay người điệu nghệ né tờ rơi quảng cáo ngay ngã tư đèn đỏ',
  'nỗi đau thấu tận trời xanh khi ngón út bàn chân va thẳng vào cạnh chân bàn',
  'phép màu biến mọi cuộc hẹn 7 giờ tối thành 8 giờ rưỡi mới thấy mặt nhau',
  'kỹ năng nhìn mặt sếp đoán thời tiết văn phòng chuẩn hơn dự báo khí tượng',
  'một pha thả thính dạo khắp 10 người nhưng cả 10 người đều chỉ xem không rep',
  'tờ hóa đơn tiền điện tháng Sáu nhìn vào tưởng mã số trúng độc đắc',
  'cảm giác quyền lực tối thượng khi cầm điều khiển tivi lẫn điều khiển máy lạnh',
  'bữa sáng dinh dưỡng gồm một ngụm nước lọc và sự vội vã chấm công lúc 8h59',
  'tiếng ting ting thông báo trừ tiền phí duy trì tài khoản ngân hàng hàng tháng',
  'chiếc mũ bảo hiểm hồng cánh sen nổi bật nhất ngã tư giờ tan tầm',
  'kế hoạch đi ngủ lúc 10 giờ tối phá sản vì lỡ bấm vào video hướng dẫn sửa mái nhà',
  'ánh nhìn trìu mến dành cho anh shipper đứng dưới sảnh tòa nhà lúc 3 giờ chiều',
  'một cú ngáp sái quai hàm đúng lúc camera cuộc họp vừa bật lên',
  'sự im lặng đầy ám ảnh khi hỏi "Ai ăn miếng cuối cùng này không"',
  'đứa bạn thân chụp 100 tấm ảnh cho mình mà 99 tấm bị nhắm mắt hoặc mờ tịt',
  'tự thưởng cho bản thân một bữa lẩu hoành tráng chỉ vì hôm nay không đi làm muộn',
  'câu thần chú "Để mai tính" đã kéo dài sang năm thứ tư liên tiếp',
  'nỗi sợ vô hình mỗi khi thấy tin nhắn "Em rảnh không anh hỏi chút chuyện"',
  'một tâm hồn nghệ sĩ bay bổng bị nhốt trong cơ thể phải làm bảng tính Excel mỗi ngày',
  'kỹ năng nhét vừa 2 tuần quần áo vào chiếc ba lô nhỏ xíu để khỏi mua hành lý ký gửi',
  'chiếc ổ cắm điện luôn nằm ở vị trí xa giường ngủ nhất trong mọi khách sạn',
  'cảm giác hồi hộp như gỡ bom khi rút chiếc áo ở dưới cùng chồng quần áo mẹ vừa gấp',
  'bản lĩnh kiên cường ngồi ăn lẩu một mình giữa nhà hàng đông nghịt các cặp đôi',
  'một pha bấm nhầm thang máy lên hết các tầng rồi lặng lẽ đứng nép vào góc',
  'giọng đọc Google dịch vang lên giữa phòng yên tĩnh vì quên cắm tai nghe',
  'niềm tin bất diệt rằng uống trà sữa ít đường sẽ không làm tăng cân',
  'chuyến xe buýt lỡ mất đúng 2 giây vì mải buộc lại dây giày',
  'gương mặt nghiêm nghị như đi đàm phán quốc tế lúc đứng chọn dưa hấu ngoài chợ',
  'câu chuyện cười kể tới đoạn gay cấn nhất thì tự mình cười sặc không nói tiếp nổi',
  'một tờ giấy khen ép plastic treo trang trọng giữa phòng khách từ năm lớp Một',
  'thói quen mở tủ lạnh ra đứng nhìn 10 giây không lấy gì rồi đóng lại đi ra',
  'sự phản bội của chiếc ô gấp ngược tung bay ngay cơn gió đầu tiên',
  'lời hứa "Uống nốt ly này thôi rồi về" vào lúc 9 giờ tối cho tới 1 giờ sáng',
  'ánh mắt long lanh của đứa em họ khi nhìn thấy bộ sưu tập mô hình trên bàn',
  'một pha đoán tên người quen thất bại thảm hại nên đành gọi "Ê dạo này khỏe không"',
  'tiếng dép lê lẹt quẹt đặc trưng báo hiệu nhân vật quyền lực nhất nhà đang tới',
  'cảm giác thành tựu lớn lao khi tự lắp xong cái kệ nhựa mà chỉ dư ra 3 con ốc',
  'chiếc báo thức kêu inh ỏi suốt 15 phút đánh thức cả xóm trừ chính chủ nhân của nó',
  'tuyệt chiêu giả vờ buộc dây giày để khỏi phải đi song song với người quen sơ sơ',
  'một buổi chiều mưa ngồi bên cửa sổ suy tư xem tối nay ăn bún chả hay cơm tấm',
  'kỹ năng tính nhẩm tiền chia hóa đơn nhanh hơn máy tính bỏ túi nhưng tính toán cuộc đời lại trượt',
  'nỗi tuyệt vọng khi gắp miếng thịt bò cuối cùng trong nồi lẩu mà trượt đũa rơi mất',
  'sự xuất hiện đúng lúc của quảng cáo thuốc trị đau lưng ngay sau khi vừa than mỏi cột sống',
  'một chiếc tên ở nhà nghe cực kỳ đáng yêu như "Cún, Bống, Tèo" bị gọi to giữa chốn đông người',
  'tinh thần lạc quan yêu đời bỗng chốc tan biến khi nhìn thấy lịch cúp nước cuối tuần',
  'pha bắt tay hụt chuyển mượt mà sang động tác vuốt tóc đầy nghệ thuật',
  'chiếc ghế xoay văn phòng trôi tự do đưa cả người lẫn ly cà phê đi du lịch khắp phòng',
  'màn trình diễn ảo thuật của đôi tất: bỏ vào máy giặt hai chiếc, lấy ra chỉ còn một chiếc',
  'cảm giác sang chảnh tột bậc khi gọi thêm trứng trần mà không cần nhìn giá',
  'lời khuyên đầu tư tài chính đến từ đứa bạn đang mượn mình 50 nghìn ăn sáng',
  'một nụ cười mỉm đầy bí hiểm che giấu việc thực ra chẳng nghe rõ người kia vừa nói gì',
  'sự thật phũ phàng rằng "ngủ nướng thêm 5 phút" trên thực tế kéo dài đúng 2 tiếng đồng hồ',
  'khoảnh khắc huy hoàng duy nhất trong tháng khi vừa thanh toán sạch nợ thẻ tín dụng',
];
