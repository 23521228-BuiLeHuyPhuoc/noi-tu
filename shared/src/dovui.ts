/**
 * Kiểu dữ liệu & ngân hàng 200 câu hỏi trắc nghiệm Đấu Trường Đố Vui (`do_vui`, 1–12 người).
 */

export type DoVuiPhase = 'question' | 'reveal';

export interface DoVuiQuestion {
  category: string;
  q: string;
  options: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  explain: string;
}

export interface DoVuiView {
  type: 'do_vui';
  index: number;
  total: number;
  phase: DoVuiPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  category: string;
  question: string;
  options: [string, string, string, string];
  doublePoints: boolean;
  order: string[];
  names: Record<string, string>;
  scores: Record<string, number>;
  streaks: Record<string, number>;
  answeredIds: string[];
  myAnswer: number | null;
  /** Chỉ gửi ở phase === 'reveal' (chống gian lận soi đáp án khi đang trả lời) */
  correctIndex?: number | null;
  explain?: string | null;
  picks?: Record<string, number> | null;
}

type QRow = [string, string, string, string, string, string, 0 | 1 | 2 | 3, string];

function qs(cat: string, rows: Omit<QRow, 0> extends never ? never : [string, string, string, string, string, 0 | 1 | 2 | 3, string][]): DoVuiQuestion[] {
  return rows.map(([q, a, b, c, d, correct, explain]) => ({
    category: cat,
    q,
    options: [a, b, c, d],
    correct,
    explain,
  }));
}

export const DO_VUI_QUESTIONS: DoVuiQuestion[] = [
  ...qs('Việt Nam', [
    ['Đỉnh núi nào được mệnh danh là “Nóc nhà Đông Dương”?', 'Ngọc Linh', 'Phan Xi Păng', 'Bà Đen', 'Pu Si Lung', 1, 'Phan Xi Păng cao 3.147m tại dãy Hoàng Liên Sơn, Lào Cai.'],
    ['Quốc kỳ Việt Nam có ngôi sao mấy cánh?', '4 cánh', '5 cánh', '6 cánh', '8 cánh', 1, 'Ngôi sao vàng 5 cánh đại diện cho 5 tầng lớp Sĩ - Nông - Công - Thương - Binh.'],
    ['Thành phố nào được gọi là “Thành phố ngàn hoa”?', 'Sa Pa', 'Huế', 'Đà Lạt', 'Đà Nẵng', 2, 'Đà Lạt (Lâm Đồng) nổi tiếng khí hậu mát mẻ và muôn loài hoa quanh năm.'],
    ['Việt Nam có bao nhiêu tỉnh và thành phố trực thuộc trung ương (trước 2025)?', '58', '61', '63', '64', 2, '63 đơn vị gồm 58 tỉnh và 5 thành phố trực thuộc Trung ương (trước khi sắp xếp lại từ 2025).'],
    ['Sông nào dài nhất chảy qua Đồng bằng sông Cửu Long?', 'Sông Hồng', 'Sông Cửu Long (Mê Kông)', 'Sông Đà', 'Sông Mã', 1, 'Sông Mê Kông vào Việt Nam chia làm sông Tiền và sông Hậu, gọi chung là Cửu Long.'],
    ['Cố đô của triều Nguyễn nằm ở tỉnh/thành nào?', 'Ninh Bình', 'Thanh Hóa', 'Thừa Thiên Huế', 'Bắc Ninh', 2, 'Kinh thành Huế là kinh đô triều Nguyễn từ 1802 đến 1945.'],
    ['Đặc sản “Bánh đậu xanh” trứ danh gắn liền với tỉnh nào?', 'Hải Dương', 'Hưng Yên', 'Nam Định', 'Hà Nam', 0, 'Bánh đậu xanh Hải Dương thơm bùi nổi tiếng từ thế kỷ 20.'],
    ['Đảo nào có diện tích lớn nhất Việt Nam?', 'Cát Bà', 'Côn Đảo', 'Phú Quốc', 'Lý Sơn', 2, 'Đảo Phú Quốc (Kiên Giang) rộng khoảng 574 km², lớn nhất cả nước.'],
    ['Lễ hội Đền Hùng diễn ra vào ngày nào âm lịch hằng năm?', '10 tháng 3', '15 tháng 8', '5 tháng 5', '3 tháng 3', 0, 'Dù ai đi ngược về xuôi / Nhớ ngày Giỗ Tổ mùng Mười tháng Ba.'],
    ['“Gành Đá Đĩa” kỳ thú nằm ở tỉnh ven biển nào?', 'Bình Định', 'Phú Yên', 'Khánh Hòa', 'Ninh Thuận', 1, 'Gành Đá Đĩa ở Tuy An, Phú Yên gồm hàng nghìn cột đá bazan hình lục giác.'],
    ['Con sông nào chảy qua giữa lòng phố cổ Hội An?', 'Sông Hương', 'Sông Hàn', 'Sông Hoài', 'Sông Nhật Lệ', 2, 'Sông Hoài (một nhánh sông Thu Bồn) lung linh hoa đăng mỗi tối tại Hội An.'],
    ['Đèo nào nằm trên ranh giới tự nhiên giữa Huế và Đà Nẵng?', 'Đèo Ngang', 'Đèo Cả', 'Đèo Hải Vân', 'Đèo Pha Đin', 2, 'Đèo Hải Vân dài ~20 km được mệnh danh là “Thiên hạ đệ nhất hùng quan”.'],
    ['Di sản nào sau đây của Việt Nam KHÔNG nằm ở miền Bắc?', 'Vịnh Hạ Long', 'Quần thể Tràng An', 'Phố cổ Hội An', 'Cao nguyên đá Đồng Văn', 2, 'Phố cổ Hội An nằm tại tỉnh Quảng Nam ở miền Trung.'],
    ['Chữ Quốc ngữ của tiếng Việt sử dụng bảng chữ cái nào?', 'Chữ Hán', 'Chữ Latinh', 'Chữ Nôm', 'Chữ Phạn', 1, 'Chữ Quốc ngữ dùng mẫu tự Latinh kết hợp hệ thống dấu thanh điệu.'],
    ['Tỉnh nào nằm ở cực Bắc của Tổ quốc Việt Nam?', 'Cao Bằng', 'Lạng Sơn', 'Hà Giang', 'Điện Biên', 2, 'Cột cờ Lũng Cú tại Đồng Văn, Hà Giang đánh dấu vùng cực Bắc Việt Nam.'],
    ['Nhã nhạc Cung đình Huế được UNESCO công nhận thuộc loại hình di sản nào?', 'Di sản thiên nhiên', 'Di sản văn hóa phi vật thể', 'Ký ức thế giới', 'Công viên địa chất', 1, 'Nhã nhạc cung đình Huế là kiệt tác di sản văn hóa phi vật thể nhân loại năm 2003.'],
    ['Ai là tác giả của tập thơ “Nhật ký trong tù”?', 'Tố Hữu', 'Hồ Chí Minh', 'Xuân Diệu', 'Hàn Mặc Tử', 1, 'Tập thơ chữ Hán gồm hơn 130 bài do Chủ tịch Hồ Chí Minh sáng tác năm 1942–1943.'],
    ['Cầu Rồng phun lửa, phun nước vào cuối tuần nằm ở thành phố nào?', 'Hải Phòng', 'Cần Thơ', 'Đà Nẵng', 'Nha Trang', 2, 'Cầu Rồng bắc qua sông Hàn, Đà Nẵng phun lửa và nước lúc 21h cuối tuần.'],
    ['Loài hoa nào thường được chọn làm biểu tượng của mùa xuân miền Nam?', 'Hoa đào', 'Hoa ban', 'Hoa mai vàng', 'Hoa sữa', 2, 'Miền Bắc chuộng hoa đào hồng, miền Nam chưng hoa mai vàng 5 cánh rực rỡ.'],
    ['Vườn Quốc gia Phong Nha – Kẻ Bàng nổi tiếng về hang động nằm ở đâu?', 'Quảng Trị', 'Quảng Bình', 'Nghệ An', 'Hà Tĩnh', 1, 'Quảng Bình sở hữu hệ thống hang động tráng lệ nhất thế giới như Sơn Đoòng.'],
    ['Tác phẩm “Truyện Kiều” của Nguyễn Du có bao nhiêu câu thơ lục bát?', '2.540', '3.000', '3.254', '3.524', 2, 'Truyện Kiều gồm chính xác 3.254 câu thơ viết bằng chữ Nôm theo thể lục bát.'],
    ['Làng gốm cổ truyền nổi tiếng ngay ven Hà Nội tên là gì?', 'Chu Đậu', 'Bát Tràng', 'Bầu Trúc', 'Thanh Hà', 1, 'Làng gốm Bát Tràng (Gia Lâm, Hà Nội) có lịch sử hơn 700 năm.'],
    ['Hồ nước ngọt tự nhiên lớn nhất Việt Nam tên là gì?', 'Hồ Hoàn Kiếm', 'Hồ Ba Bể', 'Hồ Tây', 'Hồ Tơ Nưng', 1, 'Hồ Ba Bể tại Bắc Kạn là hồ nước ngọt tự nhiên lớn nhất nước ta.'],
    ['Bánh phu thê (xu xê) đặc sản truyền thống nổi tiếng ở vùng nào?', 'Đình Bảng (Bắc Ninh)', 'Cần Giuộc', 'Tam Kỳ', 'Vĩnh Long', 0, 'Bánh phu thê Đình Bảng thường có trong mâm lễ ăn hỏi truyền thống miền Bắc.'],
    ['Nước ta đón Giao thừa theo loại lịch nào?', 'Lịch Maya', 'Âm lịch', 'Lịch Do Thái', 'Chỉ dùng Dương lịch', 1, 'Tết Nguyên Đán tính theo Âm lịch phương Đông, rơi vào ngày mùng 1 tháng Giêng.'],
  ]),
  ...qs('Khoa học', [
    ['Hành tinh nào gần Mặt Trời nhất trong Hệ Mặt Trời?', 'Sao Kim', 'Sao Thủy', 'Trái Đất', 'Sao Hỏa', 1, 'Thứ tự từ Mặt Trời ra ngoài: Thủy - Kim - Trái Đất - Hỏa - Mộc - Thổ - Thiên Vương - Hải Vương.'],
    ['Công thức hóa học của nước tinh khiết là gì?', 'CO2', 'O2', 'H2O', 'NaCl', 2, 'Mỗi phân tử nước gồm 2 nguyên tử Hydro liên kết với 1 nguyên tử Oxy.'],
    ['Kim loại nào ở trạng thái lỏng trong điều kiện nhiệt độ phòng?', 'Chì', 'Thủy ngân', 'Nhôm', 'Kẽm', 1, 'Thủy ngân (Hg) nóng chảy ở -38,8 °C nên luôn lỏng ở nhiệt độ phòng.'],
    ['Ánh sáng từ Mặt Trời mất khoảng bao lâu để đi tới Trái Đất?', '8 giây', '8 phút', '8 giờ', '8 ngày', 1, 'Khoảng cách 150 triệu km chia vận tốc ánh sáng 300.000 km/s ra ~499 giây (~8 phút 19 giây).'],
    ['Khí nào chiếm tỷ lệ lớn nhất (~78%) trong bầu khí quyển Trái Đất?', 'Oxy', 'Nitơ', 'Cacbonic', 'Argon', 1, 'Không khí khô gồm ~78% Nitơ, ~21% Oxy và ~1% khí khác.'],
    ['Cơ quan nào trong cơ thể người sản xuất ra mật để hỗ trợ tiêu hóa chất béo?', 'Dạ dày', 'Thận', 'Gan', 'Lá lách', 2, 'Gan tiết dịch mật rồi dự trữ tại túi mật trước khi đưa xuống tá tràng.'],
    ['Âm thanh KHÔNG thể truyền qua môi trường nào sau đây?', 'Nước biển', 'Thép đặc', 'Chân không', 'Không khí', 2, 'Sóng âm là sóng cơ học, cần có vật chất đàn hồi nên không truyền được trong chân không.'],
    ['Đơn vị đo cường độ dòng điện trong hệ SI là gì?', 'Vôn (V)', 'Ampe (A)', 'Ôm (Ω)', 'Oát (W)', 1, 'Ampe (A) là đơn vị đo cường độ dòng điện, đặt theo tên nhà vật lý André-Marie Ampère.'],
    ['Loài chim nào có thể bay lùi về phía sau một cách điêu luyện?', 'Chim sẻ', 'Chim ruồi', 'Chim bồ câu', 'Chim ưng', 1, 'Chim ruồi vỗ cánh cực nhanh theo hình số 8 giúp bay đứng yên và bay lùi.'],
    ['Vật liệu tự nhiên nào được xem là cứng nhất trên thang Mohs?', 'Thạch anh', 'Sắt', 'Kim cương', 'Bạch kim', 2, 'Kim cương đạt điểm 10 tối đa trên thang độ cứng Mohs.'],
    ['Thực vật hấp thụ khí gì để thực hiện quá trình quang hợp vào ban ngày?', 'Nitơ', 'Cacbonic (CO2)', 'Hydro', 'Mêtan', 1, 'Cây xanh hấp thụ CO2 + nước + ánh sáng mặt trời để tạo đường và nhả khí Oxy.'],
    ['Người trưởng thành bình thường có bao nhiêu chiếc răng vĩnh viễn (tính cả răng khôn)?', '28', '30', '32', '36', 2, 'Bộ răng người trưởng thành đầy đủ gồm 32 chiếc (kể cả 4 răng khôn).'],
    ['Máu chảy trong cơ thể có màu đỏ chủ yếu nhờ nguyên tố kim loại nào?', 'Đồng', 'Sắt', 'Canxi', 'Kẽm', 1, 'Sắt trong phân tử Hemoglobin gắn kết Oxy tạo nên sắc đỏ cho hồng cầu.'],
    ['Nhiệt độ sôi của nước tinh khiết ở áp suất tiêu chuẩn 1 atm là bao nhiêu?', '90 °C', '100 °C', '110 °C', '120 °C', 1, 'Ở mực nước biển, nước sôi tại 100 °C (373,15 K).'],
    ['Vệ tinh tự nhiên duy nhất quay quanh Trái Đất là gì?', 'Sao Bắc Đẩu', 'Mặt Trăng', 'Sao Băng', 'Trạm ISS', 1, 'Mặt Trăng là vệ tinh tự nhiên duy nhất của Trái Đất; ISS là trạm nhân tạo.'],
    ['Vitamin nào cơ thể tự tổng hợp nhiều nhất khi tiếp xúc ánh nắng sớm?', 'Vitamin A', 'Vitamin C', 'Vitamin D', 'Vitamin K', 2, 'Tia UVB giúp tiền chất dưới da tổng hợp thành Vitamin D giúp chắc xương.'],
    ['Hành tinh nào lớn nhất trong Hệ Mặt Trời?', 'Sao Thổ', 'Sao Mộc', 'Sao Hải Vương', 'Sao Thiên Vương', 1, 'Sao Mộc là hành tinh khí khổng lồ lớn gấp hơn 11 lần đường kính Trái Đất.'],
    ['Nhóm máu nào được mệnh danh là “người cho hồng cầu vạn năng”?', 'AB+', 'O-', 'A+', 'B-', 1, 'Hồng cầu nhóm O- không có kháng nguyên A, B và Rh nên ít gây phản ứng truyền máu nhất.'],
    ['Số lượng xương trong cơ thể một người trưởng thành là khoảng bao nhiêu?', '156', '206', '256', '300', 1, 'Trẻ sơ sinh có ~300 xương sụn, khi lớn sáp nhập lại còn 206 chiếc xương.'],
    ['Nhà bác học nào nổi tiếng với định luật vạn vật hấp dẫn và câu chuyện quả táo rơi?', 'Albert Einstein', 'Isaac Newton', 'Nikola Tesla', 'Galileo Galilei', 1, 'Isaac Newton công bố định luật vạn vật hấp dẫn năm 1687.'],
    ['Nước đá nổi được trên mặt nước lỏng vì sao?', 'Nước đá nhẹ hơn (khối lượng riêng nhỏ hơn)', 'Nước đá có không khí bên ngoài', 'Nước lỏng đẩy ngược lên vì nóng', 'Ánh sáng nâng lên', 0, 'Khi đóng băng thể tích nước tăng lên nên khối lượng riêng (~0,92 g/cm³) nhỏ hơn nước lỏng (~1 g/cm³).'],
    ['Cơ thể sinh vật nào được xem là động vật lớn nhất từng sống trên Trái Đất?', 'Khủng long bạo chúa', 'Voi châu Phi', 'Cá voi xanh', 'Cá mập megalodon', 2, 'Cá voi xanh có thể dài tới 30m và nặng trên 170 tấn.'],
    ['Nguyên tố có ký hiệu hóa học là “Au” chính là gì?', 'Bạc', 'Vàng', 'Nhôm', 'Đồng', 1, 'Au viết tắt từ tiếng Latinh Aurum, nghĩa là Vàng.'],
    ['Trong một vòng tròn, đường kính dài gấp mấy lần bán kính?', '2 lần', '3 lần', '3,14 lần', '4 lần', 0, 'Đường kính d = 2 × r (gấp đôi bán kính).'],
    ['Màu cầu vồng kinh điển gồm mấy sắc màu?', '5 màu', '6 màu', '7 màu', '9 màu', 2, 'Đỏ, cam, vàng, lục, lam, chàm, tím.'],
  ]),
  ...qs('Lịch sử', [
    ['Năm 938, Ngô Quyền đánh tan quân Nam Hán trên dòng sông nào?', 'Sông Hồng', 'Sông Bạch Đằng', 'Sông Cầu', 'Sông Cửu Long', 1, 'Ngô Quyền cắm cọc gỗ đầu nhọn xuống sông Bạch Đằng đánh tan thủy quân Nam Hán năm 938.'],
    ['Vị vua nào dời đô từ Hoa Lư ra thành Đại La và đổi tên thành Thăng Long năm 1010?', 'Đinh Tiên Hoàng', 'Lê Hoàn', 'Lý Thái Tổ', 'Trần Thái Tông', 2, 'Lý Công Uẩn (Lý Thái Tổ) ban Chiếu dời đô năm 1010 lập kinh đô Thăng Long.'],
    ['Hai vị nữ anh hùng khởi nghĩa năm 40 sau Công Nguyên là ai?', 'Triệu Thị Trinh', 'Hai Bà Trưng', 'Bùi Thị Xuân', 'Nguyên phi Ỷ Lan', 1, 'Trưng Trắc và Trưng Nhị phất cờ khởi nghĩa tại Hát Môn (Hà Nội ngày nay).'],
    ['Chiến thắng lịch sử Điện Biên Phủ “lừng lẫy năm châu, chấn động địa cầu” diễn ra năm nào?', '1945', '1950', '1954', '1975', 2, 'Ngày 7/5/1954 quân và dân ta giành thắng lợi quyết định tại Điện Biên Phủ.'],
    ['Triều đại nào ba lần đánh thắng quân xâm lược Nguyên – Mông?', 'Nhà Lý', 'Nhà Trần', 'Nhà Hồ', 'Nhà Hậu Lê', 1, 'Nhà Trần ba lần đại thắng (1258, 1285, 1288) dưới sự lãnh đạo của Hưng Đạo Vương Trần Quốc Tuấn.'],
    ['Ai là người anh hùng áo vải cờ đào lãnh đạo phong trào Tây Sơn đại phá quân Thanh năm 1789?', 'Lê Lợi', 'Nguyễn Huệ (Quang Trung)', 'Trần Hưng Đạo', 'Nguyễn Trãi', 1, 'Hoàng đế Quang Trung hành quân thần tốc đại thắng Ngọc Hồi – Đống Đa Tết Kỷ Dậu 1789.'],
    ['Nước Văn Lang cổ đại do các vị vua nào lập nên?', 'Vua Hùng', 'An Dương Vương', 'Triệu Đà', 'Lý Nam Đế', 0, 'Các Vua Hùng dựng nên nhà nước Văn Lang với 18 đời truyền thuyết.'],
    ['Bác Hồ đọc bản Tuyên ngôn Độc lập tại Quảng trường Ba Đình vào ngày nào?', '19/5/1945', '19/8/1945', '2/9/1945', '30/4/1975', 2, 'Ngày 2/9/1945 khai sinh nước Việt Nam Dân chủ Cộng hòa.'],
    ['Thành cổ nào có truyền thuyết thần Kim Quy giúp xây dựng với dáng xoắn ốc?', 'Thành Thăng Long', 'Thành Cổ Loa', 'Thành Nhà Hồ', 'Thành Quảng Trị', 1, 'Thành Cổ Loa (Đông Anh, Hà Nội) do An Dương Vương xây dựng thế kỷ 3 TCN.'],
    ['Ai là tác giả của bản “Bình Ngô đại cáo” bất hủ?', 'Lê Thánh Tông', 'Nguyễn Trãi', 'Nguyễn Du', 'Chu Văn An', 1, 'Nguyễn Trãi soạn Bình Ngô đại cáo năm 1428 mừng chiến thắng giặc Minh.'],
    ['Hội nghị nào đã diễn ra năm 1945 để chuẩn bị Tổng khởi nghĩa tại Tân Trào?', 'Hội nghị Diên Hồng', 'Hội nghị Tân Trào', 'Hội nghị Giơ-ne-vơ', 'Hội nghị Paris', 1, 'Tháng 8/1945 tại Tân Trào (Tuyên Quang) quyết định Tổng khởi nghĩa giành chính quyền.'],
    ['Vị trạng nguyên đầu tiên được phong danh hiệu “Trạng Lường” giỏi toán học nước ta là ai?', 'Nguyễn Hiền', 'Lương Thế Vinh', 'Mạc Đĩnh Chi', 'Nguyễn Bỉnh Khiêm', 1, 'Lương Thế Vinh tác giả cuốn Đại thành toán pháp thời Hồng Đức.'],
    ['Chiếc xe tăng húc đổ cổng Dinh Độc Lập trưa 30/4/1975 mang số hiệu nổi tiếng nào?', '390 và 843', '197 và 504', '304 và 105', '777 và 888', 0, 'Hai xe tăng 390 và 843 của Lữ đoàn Tăng Thiết giáp 203 tiến vào Dinh Độc Lập.'],
    ['Kim Tự Tháp Giza là kỳ quan cổ đại nổi tiếng của nền văn minh nào?', 'Lưỡng Hà', 'Hy Lạp', 'Ai Cập cổ đại', 'La Mã', 2, 'Đại Kim Tự Tháp Giza gần Cairo, Ai Cập được xây cách đây hơn 4.500 năm.'],
    ['Ai là phi hành gia đầu tiên trên thế giới bay vào vũ trụ năm 1961?', 'Neil Armstrong', 'Yuri Gagarin', 'Phạm Tuân', 'Buzz Aldrin', 1, 'Nhà du hành Liên Xô Yuri Gagarin thực hiện chuyến bay Vostok 1 ngày 12/4/1961.'],
    ['“Tiền giấy” đầu tiên lưu hành ở Việt Nam dưới triều đại nào?', 'Nhà Lý', 'Nhà Trần', 'Nhà Hồ', 'Nhà Nguyễn', 2, 'Hồ Quý Ly phát hành tiền giấy Thông bảo hội sao cuối thế kỷ 14 – đầu 15.'],
    ['Thành phố nào trước đây mang tên Sài Gòn và chính thức đổi tên năm 1976?', 'Cần Thơ', 'TP. Hồ Chí Minh', 'Vũng Tàu', 'Biên Hòa', 1, 'Ngày 2/7/1976 Sài Gòn – Gia Định chính thức mang tên Thành phố Hồ Chí Minh.'],
    ['Cố đô Hoa Lư xưa thuộc tỉnh nào hiện nay?', 'Nam Định', 'Thanh Hóa', 'Ninh Bình', 'Hòa Bình', 2, 'Hoa Lư (Ninh Bình) là kinh đô của nhà Đinh và nhà Tiền Lê thế kỷ 10.'],
    ['Lá cờ “Thêu sáu chữ vàng” gắn liền với thiếu niên anh hùng nào thời Trần?', 'Kim Đồng', 'Võ Thị Sáu', 'Trần Quốc Toản', 'Lê Văn Tám', 2, 'Trần Quốc Toản bóp nát quả cam, giương cao cờ “Phá cường địch, báo hoàng ân”.'],
    ['Phạm Tuân trở thành người Việt Nam (và châu Á) đầu tiên bay vào vũ trụ vào năm nào?', '1969', '1975', '1980', '1991', 2, 'Tháng 7/1980, anh hùng Phạm Tuân bay trên tàu Liên Hợp 37 (Soyuz 37).'],
    ['Thế vận hội Olympic cổ đại bắt nguồn từ quốc gia nào?', 'Ý', 'Hy Lạp', 'Pháp', 'Anh', 1, 'Thế vận hội ra đời tại vùng Olympia, Hy Lạp cổ đại từ năm 776 TCN.'],
    ['Bức tường nổi tiếng dài hàng nghìn km ở Trung Quốc tên là gì?', 'Tử Cấm Thành', 'Vạn Lý Trường Thành', 'Di Hòa Viên', 'Binh Mã Dũng', 1, 'Vạn Lý Trường Thành dài hơn 21.000 km xây qua nhiều triều đại.'],
    ['Trận “Bạch Đằng” nổi tiếng lần thứ ba vào năm 1288 do ai chỉ huy?', 'Ngô Quyền', 'Lê Hoàn', 'Trần Quốc Tuấn', 'Nguyễn Trãi', 2, 'Trần Hưng Đạo (Trần Quốc Tuấn) đánh tan hạm đội Ô Mã Nhi năm 1288.'],
    ['Chiến dịch Hồ Chí Minh lịch sử kết thúc thắng lợi trọn vẹn vào ngày nào?', '19/5/1975', '30/4/1975', '1/5/1975', '2/9/1975', 1, 'Ngày 30/4/1975 miền Nam hoàn toàn giải phóng, thống nhất đất nước.'],
    ['Con tàu huyền thoại bị chìm ngay chuyến vượt Đại Tây Dương đầu tiên năm 1912 là?', 'Titanic', 'Apollo', 'Queen Mary', 'Nautilus', 0, 'Tàu RMS Titanic đâm phải tảng băng trôi đêm 14–15/4/1912.'],
  ]),
  ...qs('Địa lý', [
    ['Châu lục nào có diện tích lớn nhất thế giới?', 'Châu Phi', 'Châu Mỹ', 'Châu Á', 'Châu Âu', 2, 'Châu Á chiếm gần 30% tổng diện tích đất nổi trên Trái Đất.'],
    ['Quốc gia nào có hình dáng tựa chiếc ủng trên bản đồ châu Âu?', 'Tây Ban Nha', 'Hy Lạp', 'Ý (Italy)', 'Bồ Đào Nha', 2, 'Bán đảo Ý trên Địa Trung Hải nhìn rất giống một chiếc ủng cao gót đá quả bóng (đảo Sicily).'],
    ['Thủ đô của nước Nhật Bản là thành phố nào?', 'Kyoto', 'Osaka', 'Tokyo', 'Sapporo', 2, 'Tokyo là thủ đô Nhật Bản từ năm 1868 (trước đó là Kyoto).'],
    ['Đại dương nào rộng và sâu nhất hành tinh?', 'Đại Tây Dương', 'Ấn Độ Dương', 'Thái Bình Dương', 'Bắc Băng Dương', 2, 'Thái Bình Dương chiếm gần 1/3 diện tích bề mặt Trái Đất và có rãnh Mariana sâu nhất.'],
    ['Sa mạc nóng lớn nhất thế giới nằm ở châu Phi tên là gì?', 'Gobi', 'Kalahari', 'Sahara', 'Atacama', 2, 'Sa mạc Sahara trải rộng hơn 9 triệu km² khắp Bắc Phi.'],
    ['Quốc gia nào vừa nằm ở châu Á vừa có một phần lãnh thổ ở châu Âu (nổi tiếng với Istanbul)?', 'Ai Cập', 'Thổ Nhĩ Kỳ', 'Iran', 'Hy Lạp', 1, 'Eo biển Bosphorus chia Istanbul của Thổ Nhĩ Kỳ nằm vắt qua hai châu lục Á – Âu.'],
    ['Thủ đô của nước Úc (Australia) là thành phố nào?', 'Sydney', 'Melbourne', 'Canberra', 'Perth', 2, 'Canberra là thủ đô được quy hoạch từ năm 1913 để dung hòa giữa Sydney và Melbourne.'],
    ['Đỉnh núi cao nhất thế giới hiện nay là?', 'K2', 'Everest', 'Kilimanjaro', 'Phú Sĩ', 1, 'Đỉnh Everest thuộc dãy Himalaya cao 8.848,86 m trên mực nước biển.'],
    ['Đất nước nào được mệnh danh là “Xứ sở Kim Chi”?', 'Nhật Bản', 'Trung Quốc', 'Hàn Quốc', 'Thái Lan', 2, 'Kim chi là món ăn quốc hồn quốc túy của người dân Hàn Quốc.'],
    ['Kênh đào nào nối liền Biển Đỏ và Địa Trung Hải giúp tàu biển không phải vòng qua châu Phi?', 'Kênh Panama', 'Kênh đào Suez', 'Kênh Kiel', 'Kênh Nhiêu Lộc', 1, 'Kênh đào Suez ở Ai Cập khai thông tuyến hàng hải Âu – Á cực kỳ quan trọng.'],
    ['Thủ đô của Canada là thành phố nào?', 'Toronto', 'Vancouver', 'Ottawa', 'Montreal', 2, 'Ottawa (thuộc bang Ontario) là thủ đô liên bang Canada.'],
    ['Dòng sông Amazon nổi tiếng nhiều nước nhất thế giới nằm ở châu lục nào?', 'Châu Phi', 'Nam Mỹ', 'Bắc Mỹ', 'Châu Á', 1, 'Sông Amazon chảy qua Brazil, Peru, Colombia ở khu vực Nam Mỹ.'],
    ['Nước láng giềng nào sau đây KHÔNG có đường biên giới đất liền chung với Việt Nam?', 'Trung Quốc', 'Lào', 'Campuchia', 'Thái Lan', 3, 'Việt Nam chỉ chung biên giới đất liền với Trung Quốc (Bắc), Lào và Campuchia (Tây).'],
    ['Quốc kỳ quốc gia nào có hình chiếc lá phong đỏ ở chính giữa?', 'Thụy Sĩ', 'Canada', 'Đan Mạch', 'New Zealand', 1, 'Cờ Canada gồm hai sọc đỏ hai bên và lá phong 11 cánh đỏ trên nền trắng.'],
    ['Thành phố nào được mệnh danh là “Thành phố không bao giờ ngủ” và có Tượng Nữ thần Tự do?', 'Chicago', 'Los Angeles', 'New York', 'Washington D.C.', 2, 'New York nổi tiếng với Times Square, phố Wall và Tượng Nữ thần Tự do.'],
    ['Đất nước nào nổi tiếng với những cánh đồng hoa tulip, cối xay gió và giày gỗ?', 'Bỉ', 'Hà Lan', 'Áo', 'Thụy Điển', 1, 'Hà Lan có diện tích lớn đất đai nằm dưới mực nước biển với biểu tượng cối xay gió & tulip.'],
    ['Biển Chết nằm giữa Israel và Jordan nổi tiếng vì điều gì?', 'Nước ngọt uống được luôn', 'Độ mặn cực cao khiến người tự nổi dễ dàng', 'Sâu nhất thế giới', 'Không có nắng bao giờ', 1, 'Độ mặn ~34% (gấp gần 10 lần biển thường) tạo lực đẩy khiến bạn nằm đọc báo trên mặt nước!'],
    ['Ngọn núi lửa hình nón cân đối là biểu tượng nước Nhật tên là gì?', 'Núi Phú Sĩ', 'Núi Thái Sơn', 'Núi Bạch Đầu', 'Núi Etna', 0, 'Núi Phú Sĩ (Fuji) cao 3.776 m là biểu tượng văn hóa và thiên nhiên Nhật Bản.'],
    ['Eo biển nào ngăn cách nước Anh và nước Pháp (nơi có đường hầm xuyên biển)?', 'Eo biển Gibraltar', 'Eo biển Malacca', 'Eo biển Manche (English Channel)', 'Eo biển Bering', 2, 'Đường hầm eo biển Manche dài 50,4 km nối Anh và Pháp.'],
    ['Bán đảo Đông Dương gồm 3 nước nào?', 'Việt Nam, Lào, Campuchia', 'Việt Nam, Thái Lan, Myanmar', 'Thái Lan, Malaysia, Singapore', 'Trung Quốc, Lào, Thái Lan', 0, 'Việt Nam, Lào và Campuchia nằm trên vùng đông bán đảo Đông Dương.'],
    ['Thủ đô của Thái Lan là thành phố nào?', 'Chiang Mai', 'Phuket', 'Bangkok', 'Pattaya', 2, 'Bangkok (Krung Thep) là thủ đô sôi động bên sông Chao Phraya.'],
    ['Quốc gia nào có diện tích nhỏ nhất thế giới?', 'Monaco', 'Singapore', 'Thành Vatican', 'San Marino', 2, 'Thành Vatican nằm gọn trong lòng Rome (Ý) chỉ rộng khoảng 0,44 km².'],
    ['Châu Nam Cực chủ yếu là nơi sinh sống hoang dã của loài chim nào?', 'Đà điểu', 'Chim cánh cụt', 'Hồng hạc', 'Đại bàng hói', 1, 'Chim cánh cụt Hoàng Đế và nhiều loài cánh cụt thích nghi tuyệt vời với băng Nam Cực.'],
    ['Thủ đô của nước Pháp nổi tiếng với Tháp Eiffel tên là gì?', 'Lyon', 'Nice', 'Marseille', 'Paris', 3, 'Paris – Kinh đô ánh sáng bên dòng sông Seine thơ mộng.'],
    ['Xứ sở “Vạn đảo” ở Đông Nam Á chỉ quốc gia nào?', 'Philippines', 'Indonesia', 'Malaysia', 'Brunei', 1, 'Indonesia trải dài trên hơn 17.000 hòn đảo lớn nhỏ.'],
  ]),
  ...qs('Đố mẹo', [
    ['Con gì đập thì sống, không đập thì chết?', 'Con muỗi', 'Con tim', 'Con cá', 'Con quay', 1, 'Trái tim phải đập liên tục để bơm máu nuôi cơ thể!'],
    ['Bệnh gì mà bác sĩ nào cũng phải bó tay?', 'Cảm cúm', 'Đau đầu', 'Gãy tay', 'Mất ngủ', 2, 'Gãy tay đương nhiên phải bó bột... bó tay luôn rồi!'],
    ['Cái gì càng rửa thì lại càng bẩn?', 'Cái bát', 'Nước', 'Đôi giày', 'Tấm thảm', 1, 'Rửa đồ xong thì nước đục ngầu, bẩn hết phần nước!'],
    ['Tháng nào trong năm có 28 ngày?', 'Chỉ tháng Hai', 'Tháng Một', 'Tháng Chạp', 'Tháng nào cũng có ít nhất 28 ngày', 3, 'Cẩn thận bị lừa nhé: cả 12 tháng tháng nào chả có ít nhất 28 ngày!'],
    ['Con đường nào dài nhất Việt Nam mà không ai đi hết nổi một ngày?', 'Đường Quốc lộ 1A', 'Đường đời', 'Đường cao tốc', 'Đường sắt', 1, 'Đường đời thênh thang đi hết kiếp người!'],
    ['Vua gọi Hoàng hậu bằng gì?', 'Bằng miệng', 'Bằng điện thoại', 'Ái phi', 'Hoàng thượng', 0, 'Thì gọi bằng... cái miệng chứ gọi bằng gì nữa!'],
    ['Cái gì mà đi đứng nằm ngồi đều đứng?', 'Cái ghế', 'Bàn chân', 'Bốn chân giường', 'Cái đồng hồ quả lắc', 0, 'Hỏi xoáy đáp xoay: cái ghế hay cái cột nhà đứng mãi không nằm!'],
    ['Có một đàn vịt đi qua cầu, con đi trước bảo có 2 con sau, con đi sau bảo có 2 con trước. Có mấy con vịt?', '2 con', '3 con', '4 con', '6 con', 1, 'Xếp hàng 1 thẳng tắp gồm 3 con vịt thôi: trước - giữa - sau!'],
    ['Trong một cuộc đua chạy, bạn vượt qua người thứ nhì thì bạn đứng thứ mấy?', 'Thứ nhất', 'Thứ nhì', 'Thứ ba', 'Cuối bảng', 1, 'Vượt người thứ nhì thì bạn thế vào đúng vị trí thứ nhì nhé (người thứ nhất vẫn ở trước)!'],
    ['Cây nến dài 10cm thắp 1 tiếng cháy hết 1cm, hỏi thắp 10 cây cùng lúc thì mấy tiếng cháy hết?', '100 tiếng', '50 tiếng', '10 tiếng', '1 tiếng', 2, 'Thắp cùng một lúc nên cả 10 cây cùng cháy hết sau đúng 10 tiếng!'],
    ['Cái gì của mình nhưng người khác lại dùng nhiều hơn mình?', 'Tiền bạc', 'Tên của mình', 'Cái ví', 'Số điện thoại', 1, 'Hằng ngày người khác gọi tên bạn suốt, còn bạn hiếm khi tự gọi tên mình!'],
    ['Cái gì có cổ mà không có miệng, mặc đồ mỗi ngày cho bạn?', 'Cái chai', 'Cái áo', 'Con hươu', 'Đàn guitar', 1, 'Áo có cổ áo, tay áo nhưng làm gì có miệng!'],
    ['Làm thế nào để bỏ một con voi vào tủ lạnh chỉ với 3 bước?', 'Băm nhỏ ra', 'Mở cửa tủ → Cho voi vào → Đóng cửa lại', 'Mua tủ công nghiệp', 'Không thể được', 1, 'Câu đố kinh điển: Mở tủ - Nhét voi - Đóng tủ (tủ to cỡ nào tính sau!).'],
    ['Chữ nào trong tiếng Việt mà 100 người viết thì cả 100 người viết... “sai”?', 'Chữ “Ngã”', 'Chữ “Sai”', 'Chữ “Khó”', 'Chữ “Quên”', 1, 'Chữ “Sai” thì ai viết đúng chính tả cũng vẫn là viết chữ... “Sai”!'],
    ['Bố của Tèo có 4 người con: Xuân, Hạ, Thu và ai nữa?', 'Đông', 'Tết', 'Tèo', 'Mùa', 2, 'Đọc kỹ đề bài: “Bố của TÈO có 4 người con...” -> người con thứ tư chính là Tèo!'],
    ['Ở Việt Nam có một con vật biết bay nhưng tên gọi lại chẳng liên quan tới chim, thậm chí sống dưới nước?', 'Chuồn chuồn', 'Cá chuồn', 'Ếch xanh', 'Rắn lục', 1, 'Cá chuồn có vây ngực lớn có thể lướt bay hàng chục mét trên mặt biển!'],
    ['Thứ gì càng cất kỹ, càng cho đi lại càng giữ được nhiều?', 'Vàng bạc', 'Niềm vui / Lời hứa', 'Thời gian', 'Nước đá', 1, 'Chuyện vui chia sẻ càng lan tỏa càng nhân đôi niềm vui (hoặc lời giữ kín là bí mật).'],
    ['Một người đàn ông đi dưới mưa không đội nón không mặc áo mưa mà đầu không ướt sợi tóc nào. Tại sao?', 'Anh ấy chạy siêu nhanh', 'Anh ấy bị hói trọc lóc', 'Mưa tạnh rồi', 'Dùng phép thuật', 1, 'Không có tóc thì làm sao ướt tóc được chứ!'],
    ['Quần rộng nhất mà chẳng ai mặc vừa là quần gì?', 'Quần ống loe', 'Quần đùi', 'Quần đảo', 'Quần thể', 2, 'Quần đảo Trường Sa, Hoàng Sa... rộng mênh mông giữa đại dương!'],
    ['Cái gì luôn ở phía trước nhưng bạn không bao giờ nhìn thấy được?', 'Quá khứ', 'Tương lai', 'Con đường', 'Ánh sáng', 1, 'Tương lai luôn ở phía trước mặt chúng ta nhưng chưa tới thì chưa thấy được.'],
    ['Ba thằng lùn xếp hàng đi qua cầu gãy. Người trước thấy sâu, người sau thấy nông, người cuối không thấy gì. Vì sao?', 'Sương mù', 'Người cuối nhắm mắt', 'Họ nói dối', 'Cây cầu bị gãy mất hai chữ nên hổng chỗ đi', 3, 'Đùa mẹo nhẹ: người cuối đứng sau lưng hai người trước che khuất hết tầm nhìn (hoặc nhắm mắt)!'],
    ['Cái gì có răng mà chẳng bao giờ biết cắn ai?', 'Con cá mập con', 'Cái lược / Cái cưa', 'Cái bàn chải', 'Hàm giả trong hộp', 1, 'Răng lược chải tóc, răng cưa xẻ gỗ đều không biết cắn!'],
    ['Mỗi ngày có một thứ càng cắt đi thì nó càng dài ra. Đố là gì?', 'Sợi dây thừng', 'Con mương / Quãng đường đào thêm', 'Móng tay', 'Tóc', 1, 'Đùa kinh điển: đào con mương hoặc rãnh càng “cắt” đất thì rãnh càng dài (hoặc cắt ống quần? Khoan: kéo cắt lỗ rách càng cắt càng to!).'],
    ['Khi mặt trời mọc ở hướng Đông thì cái bóng của bạn quay về hướng nào?', 'Hướng Đông', 'Hướng Nam', 'Hướng Tây', 'Hướng Bắc', 2, 'Ánh sáng chiếu từ Đông nên bóng đổ ngược về phía Tây.'],
    ['Nếu có 3 quả táo và bạn lấy đi 2 quả, hỏi BẠN có bao nhiêu quả táo?', '1 quả', '2 quả', '3 quả', '0 quả', 1, 'Chính bạn vừa lấy đi 2 quả thì trong tay bạn đương nhiên có 2 quả!'],
  ]),
  ...qs('Văn hóa & Giải trí', [
    ['“Kính vạn hoa” bộ truyện tuổi thơ đình đám Việt Nam là tác phẩm của nhà văn nào?', 'Tô Hoài', 'Nguyễn Nhật Ánh', 'Nam Cao', 'Sơn Nam', 1, 'Nhà văn Nguyễn Nhật Ánh với bộ ba Quý ròm, Tiểu Long, nhỏ Hạnh gắn liền nhiều thế hệ.'],
    ['Trong truyện Doremon, món bánh mà chú mèo máy mê nhất là gì?', 'Bánh mì chuyển ngữ', 'Bánh rán Dorayaki', 'Bánh bao', 'Bánh mochi', 1, 'Bánh rán nhân đậu đỏ (Dorayaki) luôn khiến Doraemon mất cảnh giác!'],
    ['Nhân vật Luffy trong bộ anime/manga nổi tiếng “One Piece” ước mơ trở thành gì?', 'Hokage', 'Vua Hải Tặc', 'Thần Chết', 'Siêu Xayda', 1, 'Monkey D. Luffy đặt mục tiêu tìm kho báu One Piece và trở thành Vua Hải Tặc.'],
    ['Bức họa “Nàng Mona Lisa” nổi tiếng được danh họa nào sáng tác?', 'Pablo Picasso', 'Vincent van Gogh', 'Leonardo da Vinci', 'Claude Monet', 2, 'Leonardo da Vinci vẽ nàng Mona Lisa (La Gioconda) vào đầu thế kỷ 16, đang trưng bày ở Louvre.'],
    ['Bài hát thiếu nhi “Chú voi con ở Bản Đôn” là sáng tác của nhạc sĩ nào?', 'Phạm Tuyên', 'Trịnh Công Sơn', 'Văn Cao', 'Phạm Duy', 0, 'Nhạc sĩ Phạm Tuyên sáng tác bài hát vui nhộn này năm 1983.'],
    ['Trong cờ vua, quân nào khi đi được phép nhảy qua đầu các quân khác?', 'Quân Xe', 'Quân Tượng', 'Quân Mã', 'Quân Hậu', 2, 'Quân Mã đi hình chữ L và là quân duy nhất nhảy qua quân cản.'],
    ['Trong bộ phim “Tây Du Ký” (1986), Tôn Ngộ Không có bao nhiêu phép biến hóa thần thông?', '36 phép', '72 phép', '81 phép', '108 phép', 1, 'Tôn Ngộ Không học được 72 phép Địa Sát từ Bồ Đề Tổ Sư; Trư Bát Giới học 36 phép.'],
    ['Lễ trao giải điện ảnh danh giá nhất nước Mỹ với tượng vàng nổi tiếng là giải nào?', 'Grammy', 'Oscar', 'Emmy', 'Cannes', 1, 'Giải Oscar (Academy Awards) do Viện Hàn lâm Khoa học & Nghệ thuật Điện ảnh Mỹ tổ chức.'],
    ['Loại nhạc cụ truyền thống chỉ có 1 sợi dây nhưng tạo đủ cung bậc cảm xúc của Việt Nam?', 'Đàn tranh', 'Đàn bầu', 'Đàn nhị', 'Đàn nguyệt', 1, 'Đàn bầu (độc huyền cầm) dùng kỹ thuật nhấn cần tạo âm bổng trầm cực kỳ điêu luyện.'],
    ['Màu áo truyền thống của nhân vật Son Goku trong “Bảy Viên Ngọc Rồng” là màu gì?', 'Xanh lá', 'Cam đỏ', 'Tím than', 'Vàng chanh', 1, 'Võ phục màu cam rực rỡ đặc trưng của Quy Phái.'],
    ['Bộ phim hoạt hình “Spirited Away” (Vùng đất linh hồn) giành Oscar là của hãng nào?', 'Pixar', 'DreamWorks', 'Studio Ghibli', 'Toei Animation', 2, 'Tác phẩm kinh điển của đạo diễn Hayao Miyazaki thuộc Studio Ghibli (2001).'],
    ['Trò chơi dân gian nào dùng các ô hình bán nguyệt và viên sỏi rải đều?', 'Nhảy dây', 'Ô ăn quan', 'Bịt mắt bắt dê', 'Đánh khăng', 1, 'Ô ăn quan với 10 ô dân và 2 ô quan hai đầu rất rèn tư duy tính nhẩm.'],
    ['Quốc hoa truyền thống được tôn vinh nhiều nhất của Việt Nam qua hình ảnh trên máy bay quốc gia?', 'Hoa hướng dương', 'Hoa sen', 'Hoa cúc', 'Hoa ban', 1, 'Bông sen vàng thanh khiết là biểu tượng tinh thần văn hóa Việt Nam.'],
    ['Nhạc sĩ Văn Cao sáng tác ca khúc nào trở thành Quốc ca nước Cộng hòa XHCN Việt Nam?', 'Giải phóng miền Nam', 'Tiến quân ca', 'Làng tôi', 'Trường ca Sông Lô', 1, '“Tiến quân ca” ra đời năm 1944 và trở thành Quốc ca từ năm 1945.'],
    ['Nhân vật thám tử lừng danh Conan thực chất là cậu học sinh trung học tên gì?', 'Hattori Heiji', 'Kudo Shinichi', 'Kaito Kid', 'Mori Kogoro', 1, 'Kudo Shinichi bị uống thuốc APTX 4869 nên bị teo nhỏ thành Edogawa Conan.'],
    ['Nhóm nhạc K-Pop nữ nổi tiếng với bản hit toàn cầu “DDU-DU DDU-DU” là?', 'TWICE', 'BLACKPINK', 'Red Velvet', 'NewJeans', 1, 'BLACKPINK gồm 4 thành viên Jisoo, Jennie, Rosé, Lisa thuộc YG Entertainment.'],
    ['Trong truyện cổ tích Việt Nam, Thánh Gióng nhổ bụi gì bên đường để đánh giặc Ân?', 'Cây đa', 'Tre ngà', 'Cây dừa', 'Cây chuối', 1, 'Khi roi sắt gãy, Thánh Gióng nhổ những bụi tre ngà bên đường quật tan quân giặc.'],
    ['Siêu anh hùng nào của Marvel dùng khiên tròn làm từ hợp kim Vibranium?', 'Iron Man', 'Thor', 'Captain America', 'Spider-Man', 2, 'Chiếc khiên sao tròn Vibranium là vũ khí thương hiệu của Steve Rogers (Captain America).'],
    ['“Áo dài” hiện đại với hai tà thướt tha gắn liền nhiều nhất với nghệ thuật truyền thống nào?', 'Tuồng', 'Cải lương & Ca Huế', 'Múa rối nước', 'Hát xoan', 1, 'Áo dài truyền thống tôn vinh vẻ đẹp duyên dáng Việt trong nhiều lễ hội & sân khấu.'],
    ['Đạo diễn lừng danh nào làm các bom tấn “Avatar” và “Titanic”?', 'Steven Spielberg', 'Christopher Nolan', 'James Cameron', 'Ridley Scott', 2, 'James Cameron đứng sau hàng loạt kỷ lục phòng vé thế giới như Titanic & Avatar.'],
    ['Món đồ chơi trí tuệ 6 mặt màu xoay nổi tiếng ra đời ở Hungary năm 1974 tên là?', 'Tangram', 'Sudoku', 'Lập phương Rubik', 'Domino', 2, 'Kiến trúc sư Ernő Rubik phát minh khối lập phương Rubik năm 1974.'],
    ['Trong bộ bài Tây 52 lá chuẩn, có tất cả bao nhiêu lá hình người (J, Q, K)?', '8 lá', '12 lá', '16 lá', '4 lá', 1, '4 chất × 3 quân (J, Q, K) = 12 lá bài hình.'],
    ['Hội Lim — nơi vang lên những câu hát Quan họ giao duyên nổi tiếng nằm ở tỉnh nào?', 'Thái Nguyên', 'Bắc Ninh', 'Bắc Giang', 'Vĩnh Phúc', 1, 'Quan họ Bắc Ninh được UNESCO công nhận là Di sản văn hóa phi vật thể đại diện nhân loại.'],
    ['Đội hình 5 thành viên trong phim Siêu Nhân (Power Rangers / Super Sentai) thường lấy nhân vật trung tâm mặc màu gì?', 'Màu vàng', 'Màu đỏ', 'Màu hồng', 'Màu xanh lá', 1, 'Chiến binh Đỏ (Red Ranger) thường là đội trưởng dẫn dắt cả đội!'],
    ['Tác phẩm “Dế Mèn phiêu lưu ký” gắn liền với tên tuổi của nhà văn nào?', 'Tô Hoài', 'Vũ Trọng Phụng', 'Kim Lân', 'Thạch Lam', 0, 'Nhà văn Tô Hoài viết Dế Mèn phiêu lưu ký lần đầu năm 1941.'],
  ]),
  ...qs('Ẩm thực', [
    ['Món ăn nào thường dùng kèm “mắm tôm đánh bông thêm chút quất/tắc ớt”?', 'Cơm tấm', 'Bún đậu mắm tôm', 'Bún bò Huế', 'Cao lầu', 1, 'Đậu rán giòn, chả cốm, thịt luộc chấm mắm tôm pha chanh ớt là combo kinh điển.'],
    ['Bánh chưng truyền thống ngày Tết thường được gói bằng loại lá nào phổ biến nhất ở miền Bắc?', 'Lá chuối', 'Lá dong', 'Lá sen', 'Lá mít', 1, 'Lá dong rừng giúp bánh chưng giữ được màu xanh ngọc đẹp mắt và hương thơm dẻo.'],
    ['Loại trái cây nào được mệnh danh là “Vua của các loại trái cây” ở Đông Nam Á dù có mùi cực nồng?', 'Mít', 'Măng cụt', 'Sầu riêng', 'Xoài', 2, 'Sầu riêng được gọi là Vua trái cây, còn Măng cụt thường được ví là Nữ hoàng!'],
    ['Đặc sản “Cao lầu” sợi mì dai vàng đậm vị phố cổ là của địa phương nào?', 'Nha Trang', 'Hội An', 'Quy Nhơn', 'Phan Thiết', 1, 'Cao lầu Hội An truyền thống dùng nước giếng Bá Lễ và tro củi tràm Cù Lao Chàm.'],
    ['Món Pizza nổi tiếng thế giới bắt nguồn từ thành phố nào của nước Ý?', 'Milan', 'Venice', 'Naples', 'Florence', 2, 'Pizza Neapolitan với cà chua, mozzarella và húng quế ra đời ở Naples.'],
    ['Thành phần chính làm nên món “Tào phớ” (tàu hũ) mềm mịn là gì?', 'Bột mì', 'Đậu nành (đậu tương)', 'Bột năng', 'Khoai môn', 1, 'Sữa đậu nành nấu với chút thạch cao phi hoặc đường nho giúp kết tụ mềm mịn.'],
    ['Để làm món “Cơm lam” thơm dẻo vùng núi Tây Bắc, người ta cho gạo nếp vào đâu để nướng?', 'Nồi đất', 'Ống tre / ống nứa', 'Lá cọ', 'Vỏ bưởi', 1, 'Ống tre nứa non giữ hơi nước làm hạt nếp chín quyện mùi tre thơm phức.'],
    ['Gia vị cay nồng màu xanh thường ăn kèm với Sushi / Sashimi Nhật Bản là gì?', 'Ớt bột', 'Mù tạt Wasabi', 'Tương đen', 'Tiêu sọ', 1, 'Rễ cây Wasabi mài tạo vị cay xộc lên mũi giúp khử tanh hải sản sống.'],
    ['Bánh “Croissant” hình sừng bò giòn xốp nhiều lớp là đặc sản nổi tiếng của nước nào?', 'Đức', 'Pháp', 'Tây Ban Nha', 'Thụy Sĩ', 1, 'Croissant ngàn lớp bơ thơm là biểu tượng bữa sáng nước Pháp.'],
    ['Món “Phở cuốn” Hà Nội dùng vỏ gì bọc thịt bò xào và rau thơm?', 'Bánh tráng khô Tây Ninh', 'Bánh phở tươi nguyên tấm chưa thái', 'Lá cải xanh', 'Vỏ hoành thánh', 1, 'Bánh phở trắng mịn tráng nguyên tấm cuốn chặt nhân bò xào, chấm mắm chua ngọt.'],
    ['Tỉnh nào được mệnh danh là “Thủ phủ Kẹo dừa” của Việt Nam?', 'Tiền Giang', 'Bến Tre', 'Trà Vinh', 'Sóc Trăng', 1, 'Xứ dừa Bến Tre nổi tiếng với kẹo dừa béo ngậy thơm lừng khắp cả nước.'],
    ['Trong phở bò truyền thống, gia vị nào tạo mùi thơm ấm đặc trưng cho nước dùng?', 'Bột nghệ và thì là', 'Hoa hồi, thảo quả, quế chi nướng', 'Mắm ruốc và sả băm', 'Lá mắc mật', 1, 'Hương thảo quả, hoa hồi, quế nướng quyện xương bò hầm tạo linh hồn cho bát phở.'],
    ['Trà sữa có hạt trân châu đen dai giòn xuất phát đầu tiên từ đâu?', 'Thái Lan', 'Đài Loan', 'Hồng Kông', 'Singapore', 1, 'Trà sữa trân châu (Bubble Tea) ra đời tại Đài Loan vào thập niên 1980.'],
    ['Món “Nem lụi” nướng sả thường cuốn bánh tráng và ăn với loại nước chấm sệt nào?', 'Nước mắm gừng', 'Tương đậu / nước lèo sệt gan thịt xay', 'Xì dầu tỏi', 'Muối tiêu chanh', 1, 'Nước lèo Huế làm từ gan heo, đậu phộng rang xay và thịt băm sánh béo khó cưỡng.'],
    ['Hạt điều xuất khẩu top đầu thế giới tại Việt Nam tập trung trồng nhiều nhất ở tỉnh nào?', 'Lâm Đồng', 'Bình Phước', 'Long An', 'Nghệ An', 1, 'Bình Phước được mệnh danh là thủ phủ hạt điều Việt Nam.'],
    ['Bánh “Macaron” nhiều màu sắc kẹp nhân kem ngọt ngào là món tráng miệng nước nào?', 'Anh', 'Pháp', 'Bỉ', 'Hà Lan', 1, 'Bánh Macaron làm từ lòng trắng trứng và bột hạnh nhân cực kỳ tinh tế kiểu Pháp.'],
    ['Khi làm “Bánh mì Việt Nam”, nguyên liệu nào giúp phần ruột rỗng giòn tan ngoài vỏ?', 'Bơ thực vật cực nhiều', 'Bột gạo trộn chung với men nhanh & xịt hơi nước khi nướng', 'Chiến thuật ủ 3 ngày', 'Luộc trước khi nướng', 1, 'Cách đánh bột mạnh tay, ủ nở nhanh và phun ẩm giúp bánh mì Việt có lớp vỏ mỏng giòn rộp.'],
    ['Củ gì thường được hầm với chân giò hoặc sườn tạo vị bùi ngọt ngày Tết ở Hà Nội?', 'Củ cải trắng', 'Su hào & bóng bì', 'Khoai lang', 'Củ dền', 1, 'Canh măng, bóng bì thả su hào cà rốt là món canh cổ điển mâm cỗ Tết Bắc.'],
    ['Món “Gỏi cá trích” ăn kèm dừa nạo chấm mắm đậu phộng là đặc sản nổi tiếng hòn đảo nào?', 'Cát Bà', 'Phú Quốc', 'Phú Quý', 'Bạch Long Vĩ', 1, 'Du khách đến Phú Quốc ít ai bỏ qua món gỏi cá trích tươi ngọt cuốn rau rừng.'],
    ['Chanh tươi vắt lên táo đã gọt vỏ giúp quả táo không bị gì?', 'Chua thêm', 'Bị thâm đen do oxy hóa', 'Mất vitamin', 'Bị đắng hạt', 1, 'Vitamin C (acid ascorbic) trong chanh ngăn enzyme oxy hóa làm thịt táo sẫm màu.'],
    ['Món “Takoyaki” viên tròn nóng hổi của Nhật Bản có nhân truyền thống là gì?', 'Thịt bò băm', 'Bạch tuộc thái hạt lựu', 'Phô mai lát', 'Cá ngừ', 1, 'Tako là bạch tuộc, Yaki là nướng — viên bột nhân bạch tuộc rưới sốt cực ngon!'],
    ['Quả gì vỏ xù xì màu xanh, khi ăn phải đục vỏ lấy nước trong mát lịm và cùi trắng?', 'Quả bưởi', 'Quả dừa tươi', 'Quả na', 'Quả dưa gang', 1, 'Dừa xiêm Bến Tre giải nhiệt số một mùa hè Việt Nam!'],
    ['Món ăn sáng trứ danh của Đà Lạt bán nhiều nhất khi trời lạnh gần Hồ Xuân Hương?', 'Bánh tráng nướng & sữa đậu nành nóng', 'Cháo lòng tiết canh', 'Cơm cháy chà bông', 'Mì Quảng ếch', 0, 'Vừa cầm ly sữa đậu nành nóng vừa cắn miếng bánh tráng nướng giòn rụm cực chuẩn bài Đà Lạt!'],
    ['Trong làm bánh, “Baking Soda” gặp thành phần chua sẽ tạo ra khí gì làm bánh nở xốp?', 'Khí Oxy', 'Khí Hydro', 'Khí CO2', 'Khí Nitơ', 2, 'Bọt khí CO2 bị giữ trong khung bột giúp bánh bông nở mềm mịn.'],
    ['Đồ uống truyền thống nào pha bằng phin nhôm nhỏ giọt chậm rãi từng giọt sánh đặc?', 'Trà sen', 'Cà phê phin Việt Nam', 'Matcha', 'Sâm dứa', 1, 'Ngồi ngắm cà phê phin nhỏ từng giọt với sữa đặc là nét văn hóa đặc trưng Việt Nam.'],
  ]),
  ...qs('Thể thao', [
    ['Mỗi đội bóng đá thi đấu chính thức trên sân có tối đa bao nhiêu cầu thủ (kể cả thủ môn)?', '9 người', '10 người', '11 người', '12 người', 2, 'Luật bóng đá FIFA quy định tối đa 11 cầu thủ mỗi đội trên sân, gồm 1 thủ môn.'],
    ['Mỗi hiệp đấu chính thức trong một trận bóng đá chuyên nghiệp kéo dài bao nhiêu phút?', '40 phút', '45 phút', '50 phút', '60 phút', 1, 'Hai hiệp 45 phút (tổng 90 phút) chưa tính thời gian bù giờ.'],
    ['Việt Nam từng lần đầu tiên vào tới trận Chung kết giải U23 Châu Á tuyết trắng ở đâu năm 2018?', 'Bắc Kinh', 'Thường Châu', 'Seoul', 'Bangkok', 1, 'Kỳ tích Thường Châu 2018 với hình ảnh “cầu vồng trong tuyết” không thể nào quên!'],
    ['Trong môn Cầu lông hiện đại, một ván đấu tiêu chuẩn đánh chạm tới bao nhiêu điểm thì thắng?', '11 điểm', '15 điểm', '21 điểm', '25 điểm', 2, 'Thể thức hiện nay đánh chạm 21 điểm (nếu hòa 20–20 thì phải hơn 2 điểm, tối đa 30).'],
    ['Năm vòng tròn đan xen trên lá cờ Thế vận hội Olympic tượng trưng cho điều gì?', '5 môn thi đấu đầu tiên', 'Sự đoàn kết của 5 châu lục', '5 vị thần Hy Lạp', '5 huy chương', 1, 'Năm vòng tròn xanh, vàng, đen, lục, đỏ tượng trưng cho 5 châu lục giao lưu tại Olympic.'],
    ['Siêu sao bóng đá nào từng giành tới 8 Quả bóng vàng (Ballon d’Or)?', 'Cristiano Ronaldo', 'Pelé', 'Lionel Messi', 'Kylian Mbappé', 2, 'Lionel Messi lập kỷ lục vô tiền khoáng hậu với 8 danh hiệu Quả bóng vàng.'],
    ['Trong môn Bóng rổ, một cú ném thành công từ ngoài vạch vòng cung được tính mấy điểm?', '1 điểm', '2 điểm', '3 điểm', '4 điểm', 2, 'Ném phạt 1 điểm, trong vạch 2 điểm, ngoài vòng cung 3 điểm!'],
    ['Vận động viên người Việt Nam nào giành tấm Huy chương Vàng Olympic đầu tiên cho thể thao Việt Nam?', 'Nguyễn Thị Ánh Viên', 'Hoàng Xuân Vinh', 'Trần Hiếu Ngân', 'Lê Văn Công', 1, 'Xạ thủ Hoàng Xuân Vinh giành HCV môn 10m súng ngắn hơi tại Olympic Rio 2016!'],
    ['Chạy Marathon chuẩn Olympic có cự ly dài chính xác bao nhiêu?', '21,1 km', '35 km', '42,195 km', '50 km', 2, 'Cự ly Marathon chính thức là 42,195 km (26,2 dặm).'],
    ['Trong môn Quần vợt (Tennis), thuật ngữ điểm “0” (không điểm) thường được trọng tài đọc là gì?', 'Zero', 'Nil', 'Love', 'Null', 2, 'Từ chữ “l’œuf” (quả trứng) trong tiếng Pháp đọc trại sang tiếng Anh thành “Love”.'],
    ['Đội tuyển bóng đá nam Việt Nam giành chức vô địch AFF Cup lần đầu tiên vào năm nào?', '1998', '2008', '2018', '2022', 1, 'Tháng 12/2008 với cú đánh đầu ngược lịch sử của Lê Công Vinh trước Thái Lan!'],
    ['Trong môn Bóng chuyền 6 người trong nhà, mỗi đội được chạm bóng tối đa mấy lần trước khi đưa sang sân đối phương?', '2 lần', '3 lần', '4 lần', '5 lần', 1, 'Tối đa 3 lần chạm bóng (không tính pha chắn bóng trên lưới).'],
    ['Vua tốc độ Usain Bolt nắm giữ kỷ lục thế giới chạy 100m với thành tích bao nhiêu giây?', '8,99 giây', '9,58 giây', '9,89 giây', '10,02 giây', 1, 'Kỷ lục 9,58 giây được Usain Bolt lập tại Berlin năm 2009 tới nay vẫn bất bại.'],
    ['Một trận quyền anh (Boxing) hạng chuyên nghiệp tranh đai thế giới thường kéo dài tối đa mấy hiệp?', '6 hiệp', '8 hiệp', '12 hiệp', '15 hiệp', 2, 'Luật Boxing chuyên nghiệp hiện đại giới hạn trận tranh đai ở mức tối đa 12 hiệp (mỗi hiệp 3 phút).'],
    ['Môn thể thao “Pickleball” đang cực hot hiện nay là sự kết hợp giữa các môn nào?', 'Bóng đá + Bóng ném', 'Quần vợt + Bóng bàn + Cầu lông', 'Bóng rổ + Bóng chuyền', 'Đấu kiếm + Bắn cung', 1, 'Pickleball dùng vợt đặc đánh bóng nhựa đục lỗ trên sân kích thước tương đương sân cầu lông đôi.'],
    ['Trong bóng đá, cầu thủ nhận hai thẻ vàng trong cùng 1 trận đấu thì sao?', 'Đá tiếp bình thường', 'Nhận 1 thẻ đỏ gián tiếp và phải rời sân', 'Bị phạt 11m', 'Chỉ cảnh cáo', 1, 'Hai thẻ vàng bằng 1 thẻ đỏ trực tiếp phải rời sân ngay lập tức!'],
    ['Kiểu bơi nào nhanh nhất trong 4 kiểu bơi thi đấu Olympic?', 'Bơi ếch', 'Bơi ngửa', 'Bơi bướm', 'Bơi tự do (bơi sải)', 3, 'Bơi sải (Freestyle) đạt tốc độ lướt nước nhanh nhất của con người.'],
    ['Giải đấu bóng đá cấp CLB danh giá nhất châu Âu gọi tắt là Cúp C1 tên chính thức là gì?', 'Europa League', 'UEFA Champions League', 'Premier League', 'Conference League', 1, 'UEFA Champions League quy tụ những CLB hùng mạnh nhất châu Âu hằng năm.'],
    ['Ở Việt Nam, môn võ cổ truyền phát triển rộng khắp thế giới mặc võ phục màu xanh lam là?', 'Karate', 'Taekwondo', 'Vovinam (Việt Võ Đạo)', 'Judo', 2, 'Vovinam – Việt Võ Đạo do võ sư Nguyễn Lộc sáng lập năm 1938 với võ phục xanh đặc trưng.'],
    ['Trong môn Bi-a 8 bóng (8-ball pool), quả bi cuối cùng phải đánh vào lỗ để thắng (bi số 8) có màu gì?', 'Trắng', 'Đen', 'Đỏ', 'Vàng', 1, 'Bi cái màu trắng; sau khi ăn hết nhóm trơn hoặc sọc thì phải đánh bi đen số 8 hợp lệ.'],
    ['Đất nước nào đã vô địch World Cup bóng đá nam nhiều lần nhất lịch sử (5 lần)?', 'Đức', 'Argentina', 'Brazil', 'Ý', 2, 'Seleção Brazil với các danh hiệu 1958, 1962, 1970, 1994, 2002 giữ kỷ lục 5 chức vô địch.'],
    ['Trong bóng đá, quả phạt đền (Penalty) được đặt cách khung thành bao xa?', '9 mét', '11 mét', '16,5 mét', '20 mét', 1, 'Chấm phạt đền nằm cách chính giữa vạch vôi cầu môn đúng 11 mét (12 yards).'],
    ['Giải đua xe Công thức 1 (Formula 1) sử dụng loại xe gì?', 'Xe địa hình SUV', 'Xe đua một chỗ ngồi bánh hở siêu khí động học', 'Xe mô tô phân khối lớn', 'Xe điện đô thị', 1, 'Xe F1 có thể đạt vận tốc trên 350 km/h với lực ép khí động học khổng lồ.'],
    ['Huyền thoại bóng rổ Michael Jordan gắn liền với số áo nào suốt đỉnh cao sự nghiệp tại Chicago Bulls?', 'Số 7', 'Số 10', 'Số 23', 'Số 99', 2, 'Áo đấu số 23 của Michael Jordan trở thành biểu tượng bất hủ trong làng thể thao.'],
    ['Môn thể thao nào đánh quả cầu trắng nhỏ bằng gậy sắt/gỗ vào các lỗ cờ trên sân cỏ rộng lớn?', 'Cricket', 'Golf', 'Hockey', 'Polo', 1, 'Mục tiêu trong Golf là đưa bóng vào các lỗ bằng càng ít gậy càng tốt!'],
  ]),
];
