/**
 * Kiểu dữ liệu & ngân hàng 160 cặp từ tiếng Việt cho game "Ai Là Gián Điệp" (Undercover / Mr. White, 3–12 người).
 */

export type GianDiepRole = 'dan' | 'giandiep' | 'mrwhite';

export type GianDiepPhase =
  | 'word_reveal'
  | 'clue_turn'
  | 'discussion'
  | 'vote'
  | 'mrwhite_guess';

export interface GianDiepWordPair {
  category: string;
  wordA: string;
  wordB: string;
  cluesA: string[];
  cluesB: string[];
}

export interface GianDiepClue {
  id: number;
  round: number;
  playerId: string;
  name: string;
  text: string;
}

export interface GianDiepView {
  type: 'giandiep';
  round: number;
  phase: GianDiepPhase;
  phaseEndsAt: number | null;
  phaseSeconds: number;
  category: string;
  order: string[];
  names: Record<string, string>;
  alive: string[];
  eliminated: { id: string; role: GianDiepRole; round: number }[];
  currentSpeakerId: string | null;
  speakerOrder: string[];
  clues: GianDiepClue[];
  readySkip: string[];
  votes: Record<string, string | 'skip'>;
  mrWhiteId: string | null;
  /** Chỉ gửi riêng cho đúng viewerId */
  myRole: GianDiepRole | null;
  myWord: string | null;
}

export const GIAN_DIEP_ROLE_META: Record<GianDiepRole, { name: string; emoji: string; color: string; desc: string }> = {
  dan: {
    name: 'Dân Thường',
    emoji: '🧑',
    color: '#2B8A3E',
    desc: 'Mô tả từ khóa khéo léo để đồng đội nhận ra nhau nhưng đừng quá lộ!',
  },
  giandiep: {
    name: 'Gián Điệp',
    emoji: '🕵️',
    color: '#D9480F',
    desc: 'Từ của bạn hơi khác đa số! Hãy lắng nghe, trà trộn và trụ tới cuối.',
  },
  mrwhite: {
    name: 'Mr. White',
    emoji: '🤍',
    color: '#495057',
    desc: 'Bạn KHÔNG có từ khóa! Nghe lỏm để chém gió và đoán đúng từ nếu bị loại.',
  },
};

export const MR_WHITE_GENERIC_CLUES = [
  'Món này quen lắm luôn á',
  'Hồi nhỏ hay gặp cái này',
  'Nhiều người thích lắm nè',
  'Để mô tả sao cho khỏi lộ đây ta',
  'Nhắc tới là thấy quen thuộc ghê',
  'Tùy người thích hoặc không thích',
  'Gần gũi với đời sống hằng ngày',
  'Ở đâu cũng có thể bắt gặp',
];

type CompactPair = [string, string, string, string, string, string];

function pack(category: string, rows: CompactPair[]): GianDiepWordPair[] {
  return rows.map(([wordA, wordB, cA1, cA2, cB1, cB2]) => ({
    category,
    wordA,
    wordB,
    cluesA: [cA1, cA2, `Thường thấy ở ngoài đời`, `Ai cũng từng nghe qua`],
    cluesB: [cB1, cB2, `Khá phổ biến ở Việt Nam`, `Có nét riêng khá đặc trưng`],
  }));
}

export const GIAN_DIEP_WORDS: GianDiepWordPair[] = [
  ...pack('Ẩm thực', [
    ['Phở bò', 'Bún bò Huế', 'Nước dùng thanh ngọt mùi quế hồi', 'Sợi dẹt trắng ăn kèm quẩy', 'Cay nồng mùi mắm ruốc sả ớt', 'Có chân giò chả cua sợi tròn to'],
    ['Trà sữa', 'Cà phê sữa đá', 'Có trân châu dai dai uống ống hút to', 'Giới trẻ rất mê chiều chiều hay order', 'Đắng nhẹ thơm béo giúp tỉnh táo', 'Pha phin hoặc máy thêm đá mát lạnh'],
    ['Bánh mì', 'Xôi mặn', 'Vỏ giòn rụm kẹp pate dưa leo', 'Món ăn sáng quốc dân cầm tay', 'Hạt nếp dẻo thơm hành phi lạp xưởng', 'Gói lá chuối ăn rất chắc bụng'],
    ['Bánh chưng', 'Bánh tét', 'Hình vuông gói lá dong ngày Tết', 'Có nhân đậu xanh thịt mỡ', 'Hình trụ tròn cắt khoanh miền Nam', 'Luộc nhiều tiếng lửa củi thơm lừng'],
    ['Bún đậu mắm tôm', 'Bún chả Hà Nội', 'Chấm mắm tím đánh bông sủi bọt', 'Có đậu rán giòn chả cốm nem chua', 'Thịt nướng than thơm lừng nước mắm chua ngọt', 'Ăn cùng rau sống bún lá'],
    ['Cơm tấm', 'Cơm rang dưa bò', 'Hạt gạo vỡ ăn với sườn nướng bì chả', 'Chan nước mắm kẹo đồ chua', 'Xào nóng trên chảo với dưa cải chua', 'Có thịt bò xào thơm mùi hành'],
    ['Lẩu Thái', 'Lẩu riêu cua', 'Vị chua cay thơm lá chanh sả', 'Nhúng hải sản tôm mực nấm kim châm', 'Nước dùng gạch cua đồng ngọt thanh', 'Nhúng đậu phụ bắp bò mùng tơi'],
    ['Mì tôm', 'Phở ăn liền', 'Chế nước sôi ba phút là ăn đêm', 'Sợi vàng xoăn quen thuộc sinh viên', 'Gói tiện lợi sợi trắng mùi bò gà', 'Cũng pha nhanh khi lười nấu'],
    ['Gỏi cuốn', 'Chả giò', 'Bánh tráng mỏng cuốn tôm thịt sống', 'Chấm tương đen hoặc mắm nêm', 'Cuốn xong đem chiên giòn rụm', 'Bên trong có miến mộc nhĩ thịt băm'],
    ['Sầu riêng', 'Mít tố nữ', 'Vỏ đầy gai nhọn mùi nồng đặc trưng', 'Cơm vàng béo ngậy như bơ', 'Gai mềm hơn múi nhỏ ngọt thơm', 'Bóc múi ăn tới đâu hết tới đó'],
    ['Xoài xanh', 'Quả cóc', 'Vị chua giòn chấm muối ớt Tây Ninh', 'Quả to da trơn hay lắc bò khô', 'Quả nhỏ tròn hạt có xơ nhiều', 'Gọt vỏ ăn cả chùm giòn tan'],
    ['Bánh xèo', 'Bánh khọt', 'Chảo lớn đổ bột nghệ giòn rìa', 'Cuốn rau cải chấm mắm chua ngọt', 'Đổ khuôn nhỏ tròn từng cái một', 'Ở Vũng Tàu có con tôm trên mặt'],
    ['Chè thái', 'Tào phớ', 'Ngọt mát nhiều thạch mít sầu riêng', 'Ăn bằng ly đá bào béo nước cốt dừa', 'Mềm mịn tan trong miệng nước đường gừng', 'Thường ăn chén nóng hoặc đá'],
    ['Kem ốc quế', 'Bánh flan', 'Lạnh buốt ăn nhanh kẻo tan chảy', 'Vỏ nón giòn cầm trên tay', 'Mềm mịn vị trứng sữa caramen đắng nhẹ', 'Để trong hũ nhỏ úp ra dĩa'],
    ['Bò bít tết', 'Bò né', 'Thịt áp chảo cắt dao nĩa sang trọng', 'Ăn kèm khoai tây nghiền hoặc sốt tiêu', 'Dọn trên chảo gang xèo xèo nóng hổi', 'Có trứng ốp la pate chấm bánh mì'],
    ['Nước mía', 'Nước dừa', 'Ép từ cây thân đốt ngọt lịm', 'Hay cho thêm lát tắc cho thơm', 'Uống trực tiếp từ trái chặt vỏ', 'Mát lành có cả cùi trắng nạo'],
    ['Pizza', 'Bánh bao', 'Đế tròn nướng lò phủ phô mai kéo sợi', 'Cắt từng miếng tam giác chia nhau', 'Hấp nóng vỏ trắng xốp nhân thịt trứng cút', 'Cầm một chiếc ăn lót dạ rất tiện'],
    ['Bánh trung thu', 'Bánh pía', 'Vỏ nướng hoa văn nhân thập cẩm trứng muối', 'Hay tặng nhau dịp rằm tháng tám', 'Vỏ nhiều lớp mỏng Sóc Trăng sầu riêng', 'Ăn với trà nóng cực kỳ hợp vị'],
    ['Hủ tiếu', 'Miến gà', 'Nước ngọt xương ống có tóp mỡ hẹ', 'Ăn khô hay nước đều ngon lành', 'Sợi trong dai nấu nước luộc gà', 'Thêm măng khô hành phi thơm nức'],
    ['Bia', 'Rượu vang', 'Uống lạnh bật nắp cụng ly zô', 'Có bọt trắng sủi tăm vị đắng nhẹ', 'Ủ từ nho đỏ rót ly chân cao', 'Uống nhâm nhi kèm thịt đỏ sang chảnh'],
  ]),
  ...pack('Động vật', [
    ['Con chó', 'Con mèo', 'Trung thành hay vẫy đuôi giữ nhà', 'Thích gặm xương sủa gâu gâu', 'Chảnh chọe thích ngủ nắng bắt chuột', 'Kêu meo meo hay cào ghế'],
    ['Con hổ', 'Con sư tử', 'Chúa sơn lâm bộ lông vằn cam đen', 'Săn mồi đơn độc trong rừng sâu', 'Có bờm rậm quanh cổ sống theo đàn', 'Biểu tượng vua thảo nguyên châu Phi'],
    ['Con trâu', 'Con bò', 'Sức kéo khỏe cày ruộng sừng cong dài', 'Hay đằm mình dưới bùn ao quê', 'Hiền lành cho sữa hoặc kéo xe', 'Lông vàng hoặc khoang đen trắng'],
    ['Cá heo', 'Cá voi', 'Thông minh thân thiện hay biểu diễn nhào lộn', 'Sống theo bầy phát sóng âm dưới biển', 'Kích thước khổng lồ to nhất đại dương', 'Phun cột nước lớn trên đỉnh đầu'],
    ['Con vịt', 'Con ngan', 'Bơi giỏi dưới ao kêu cạp cạp', 'Món quay hay nấu cháo rất nổi', 'Thân nặng hơn có mào thịt đỏ quanh mắt', 'Ít kêu to hơn nhưng bay khỏe hơn'],
    ['Con bướm', 'Chuồn chuồn', 'Cánh sặc sỡ hút mật hoa mùa xuân', 'Biến hình từ kén sâu bướm', 'Thân dài mảnh hay bay là là mặt nước', 'Dân gian bảo bay thấp thì mưa'],
    ['Con muỗi', 'Con ruồi', 'Hút máu vo ve ban đêm truyền sốt xuất huyết', 'Thích núp góc tối làm ngứa da', 'Hay bu thức ăn đập rất khó trúng', 'Mắt kép to vo ve quanh bàn ăn'],
    ['Chim đại bàng', 'Chim cú mèo', 'Chúa bầu trời sải cánh lớn mắt tinh', 'Săn mồi ban ngày mỏ quặp sắc bén', 'Thức suốt đêm đầu xoay gần trọn vòng', 'Mắt tròn to kêu trong rừng khuya'],
    ['Con gấu trúc', 'Gấu Bắc Cực', 'Lông hai màu đen trắng mê ăn trúc', 'Dễ thương chậm chạp biểu tượng Trung Quốc', 'Lông trắng muốt sống nơi băng tuyết lạnh', 'Bơi giỏi săn hải cẩu trên băng'],
    ['Con kiến', 'Con ong', 'Chăm chỉ làm việc theo bầy dưới đất', 'Khiêng mồi nặng gấp nhiều lần cơ thể', 'Hút mật làm tổ sáp có ngòi châm đau', 'Siêng năng suốt ngày bay quanh hoa'],
    ['Con ếch', 'Con cóc', 'Da trơn láng sống cả dưới nước lẫn bờ', 'Trời mưa kêu ộp ộp inh ỏi', 'Da sần sùi tiết nhựa độc tự vệ', 'Nghiến răng báo hiệu trời sắp mưa'],
    ['Con tôm', 'Con cua', 'Thân cong nhiều đốt bật nhảy tanh tách', 'Luộc lên chuyển màu đỏ cam cong veo', 'Đi ngang có hai chiếc càng cứng cáp', 'Mai cứng sống vùng nước mặn lợ'],
    ['Con thỏ', 'Chuột hamster', 'Tai dài vểnh thích gặm cà rốt nhảy lò cò', 'Lông mềm mượt mắt đỏ hoặc đen', 'Nhỏ xíu nằm gọn trong lòng bàn tay', 'Thích chạy vòng xoay trong lồng kính'],
    ['Con rùa', 'Con ba ba', 'Mang chiếc mai cứng đi lại chậm chạp', 'Rút đầu vào trong khi gặp nguy hiểm', 'Mai mềm dẹt hơn hay sống sông bùn', 'Tích cực ẩn dưới nước ít bò lên cạn'],
    ['Ngựa vằn', 'Hươu cao cổ', 'Lông sọc trắng đen độc nhất vô nhị', 'Chạy nhanh theo bầy tránh thú dữ', 'Chiếc cổ dài vươn tới ngọn cây cao', 'Lông đốm vàng nâu trên thảo nguyên'],
    ['Khỉ', 'Đười ươi', 'Leo trèo chuyền cành láu lỉnh thích chuối', 'Hay bắt chước hành động con người', 'Thân hình to lớn cánh tay rất dài', 'Thông minh sống sâu trong rừng rậm nhiệt đới'],
    ['Cá sấu', 'Thằn lằn', 'Sống đầm lầy hàm răng nhọn lực cắn khủng', 'Nằm bất động ngụy trang như khúc gỗ', 'Nhỏ bé hay bò trên tường rình côn trùng', 'Đứt đuôi vẫn mọc lại được'],
    ['Chim cánh cụt', 'Hải cẩu', 'Chim không biết bay đi lạch bạch trên băng', 'Mặc bộ vest đen trắng đáng yêu', 'Không có cánh dùng vây bơi lội điêu luyện', 'Hay nằm phơi mình trên tảng băng trôi'],
    ['Con dơi', 'Chim én', 'Động vật có vú biết bay treo ngược ngủ', 'Hoạt động về đêm định vị bằng sóng âm', 'Báo hiệu mùa xuân làm tổ bằng nước bọt', 'Đuôi chẻ hình kéo bay lượn cực nhanh'],
    ['Bạch tuộc', 'Con mực', 'Có tám xúc tu giác hút không xương sống', 'Ngụy trang đổi màu phun mực trốn chạy', 'Thân hình thuôn có vây đuôi hay nướng ăn', 'Có mai cứng trắng bên trong thân'],
  ]),
  ...pack('Địa điểm', [
    ['Biển', 'Hồ bơi', 'Nước mặn có sóng vỗ rì rào cát vàng', 'Đi ngắm bình minh ăn hải sản', 'Nước ngọt mùi clo chia làn rõ ràng', 'Nhảy ùm tập bơi không lo bị cuốn'],
    ['Siêu thị', 'Chợ truyền thống', 'Điều hòa mát lạnh xếp hàng tính tiền quầy', 'Đồ niêm yết giá đẩy xe đi lựa', 'Nhộn nhịp sáng sớm mặc cả từng ngàn', 'Bán đồ tươi sống ngay sạp ngoài trời'],
    ['Rạp chiếu phim', 'Sân khấu kịch', 'Màn hình khổng lồ tắt đèn ăn bắp rang', 'Ngồi ghế dốc xem bom tấn mới ra rạp', 'Diễn viên diễn trực tiếp ngay trước mắt', 'Hết vở có màn cúi chào khán giả vỗ tay'],
    ['Thư viện', 'Quán cà phê', 'Im phăng phắc toàn kệ sách tra cứu', 'Mượn đọc học bài miễn phí có thẻ', 'Mở nhạc nhẹ vừa uống nước vừa làm việc', 'Chỗ hẹn tụ tập bạn bè cuối tuần'],
    ['Sân bay', 'Nhà ga tàu hỏa', 'Kiểm tra an ninh soi hành lý lên máy bay', 'Có cổng chờ quốc tế nội địa rộng lớn', 'Có đường ray sắt tiếng còi xình xịch', 'Mua vé lên toa nằm xuyên Việt ngắm cảnh'],
    ['Bệnh viện', 'Hiệu thuốc', 'Có bác sĩ y tá phòng cấp cứu nội trú', 'Mùi thuốc sát trùng khám chữa bệnh nặng', 'Mua đơn nhỏ lẻ viên cảm hạ sốt nhanh', 'Quầy nhỏ mặt phố không cần nằm giường'],
    ['Trường đại học', 'Trường mẫu giáo', 'Sinh viên tự học nghiên cứu chạy deadline', 'Giảng đường rộng tự do chọn tín chỉ', 'Các bé ngủ trưa múa hát cô dỗ ăn', 'Cổng trường chiều chiều phụ huynh đón bé'],
    ['Công viên', 'Sở thú', 'Nhiều cây xanh ghế đá đi bộ hít thở', 'Miễn phí vào cổng tập thể dục sáng chiều', 'Có chuồng nuôi voi hổ hươu cao cổ', 'Trẻ em cực thích cuối tuần vào ngắm thú'],
    ['Quán karaoke', 'Quán bar', 'Phòng riêng cầm mic hát hò chọn bài trên màn', 'Tụ tập sinh nhật hát khản cả cổ', 'Nhạc DJ xập xình đèn chớp pha chế cocktail', 'Đứng nhún nhảy sôi động tới khuya'],
    ['Núi Đà Lạt', 'Phố cổ Hội An', 'Sương mù thông reo mặc áo lạnh uống sữa đậu', 'Thung lũng hoa quanh năm khí hậu mát dịu', 'Đèn lồng rực rỡ thả hoa đăng sông Hoài', 'Nhà mái ngói tường vàng cổ kính'],
    ['Phòng gym', 'Sân bóng đá', 'Nhiều tạ sắt máy chạy bộ tập cơ bắp', 'Soi gương đếm set gập bụng trong nhà', 'Mặt cỏ xanh rộng chia đội sút vào khung thành', 'Chạy hết sân chín mươi phút thở dốc'],
    ['Tiệm cắt tóc', 'Tiệm spa', 'Ngồi ghế soi gương nghe tiếng kéo tông đơ', 'Tỉa gọn tạo kiểu gội đầu nhanh chóng', 'Ánh đèn dịu nhẹ mùi tinh dầu thư giãn', 'Đắp mặt nạ bấm huyệt chăm sóc cơ thể'],
    ['Bảo tàng', 'Đền chùa', 'Trưng bày hiện vật lịch sử cổ vật quý giá', 'Đi tham quan tìm hiểu quá khứ dân tộc', 'Thắp hương cầu bình an không gian trang nghiêm', 'Kiến trúc tâm linh mái cong chuông đồng'],
    ['Cắm trại', 'Ở khách sạn', 'Dựng lều giữa rừng nhóm lửa nướng thịt đêm', 'Gần thiên nhiên tự chuẩn bị đồ ăn ngủ', 'Phòng máy lạnh nệm êm có lễ tân phục vụ', 'Sáng dậy có buffet sẵn tiện nghi đầy đủ'],
    ['Nhà bếp', 'Phòng khách', 'Có bếp ga tủ lạnh bồn rửa xoong nồi', 'Nơi nấu nướng bay mùi thức ăn thơm lừng', 'Có sofa tivi bàn trà tiếp bạn bè tới chơi', 'Không gian sinh hoạt chung đầu tiên khi mở cửa'],
    ['Thang máy', 'Thang cuốn', 'Hộp kín bấm số tầng đứng chờ cửa mở', 'Di chuyển thẳng đứng rất nhanh nhà cao tầng', 'Bậc di chuyển liên tục đứng yên trôi lên', 'Hay gặp ngay sảnh trung tâm thương mại'],
    ['Cây xăng', 'Trạm thu phí', 'Bơm nhiên liệu không hút thuốc gây cháy nổ', 'Đổ đầy bình chạy xe tiếp đường dài', 'Cửa chắn barie trên cao tốc kiểm soát xe qua', 'Đóng tiền vé qua tuyến đường mới'],
    ['Bãi giữ xe', 'Sửa xe', 'Lấy thẻ bấm giữ an toàn khi đi ăn chơi', 'Xếp hàng ngay ngắn không lo mất cắp', 'Thay nhớt vá lốp cân chỉnh phanh xích', 'Thợ mặc đồ dính dầu mỡ loay hoay tua vít'],
    ['Hiệu sách', 'Tiệm tạp hóa', 'Bán vở bút tiểu thuyết truyện tranh thơm mùi giấy', 'Ngồi đọc ké hàng giờ rất yên tĩnh', 'Bán đủ thứ muối đường bánh kẹo nước ngọt', 'Mở ngay đầu ngõ tiện gì mua nấy'],
    ['Sân thượng', 'Tầng hầm', 'Cao nhất tòa nhà lộng gió phơi đồ trồng cây', 'Nhìn xuống đường phố lung linh ban đêm', 'Nằm sâu dưới mặt đất tối mát hay đậu xe', 'Mạng điện thoại xuống đây hay bị yếu'],
  ]),
  ...pack('Đồ vật', [
    ['Ô tô', 'Xe máy', 'Bốn bánh có mui che nắng mưa điều hòa mát', 'Vô lăng ngồi trong cabin an toàn đường dài', 'Hai bánh luồn lách ngõ nhỏ đội nón bảo hiểm', 'Phương tiện phổ biến nhất Việt Nam'],
    ['Tủ lạnh', 'Máy lạnh', 'Bảo quản rau thịt làm đá mát đồ uống', 'Mở cửa ra thấy hơi lạnh phả thức ăn', 'Treo trên tường làm mát cả căn phòng ngủ', 'Dùng remote chỉnh nhiệt độ khi trời nóng'],
    ['Bàn chải đánh răng', 'Lược chải đầu', 'Có lông nhỏ mềm dùng kem bọt mỗi sáng tối', 'Giúp răng trắng sạch thơm miệng trước khi ngủ', 'Răng lược gỡ rối tóc trước khi ra ngoài', 'Đặt cạnh gương soi làm đẹp mỗi ngày'],
    ['Ô che mưa', 'Áo mưa', 'Cầm tay bung tán tròn gấp gọn cho vào túi', 'Dùng được cả lúc nắng gắt lẫn mưa nhỏ', 'Trùm kín người mặc khi chạy xe trời bão', 'Mặc vào hơi vướng nhưng đỡ ướt ống quần'],
    ['Kính cận', 'Kính râm', 'Đeo giúp nhìn rõ chữ bảng đen không bị mờ', 'Tròng trong suốt đo độ theo mắt mỗi người', 'Tròng tối màu chống chói nắng đi biển cực ngầu', 'Không có độ chủ yếu bảo vệ mắt và thời trang'],
    ['Chăn', 'Gối', 'Đắp lên người giữ ấm khi ngủ bật điều hòa', 'Trải rộng che phủ toàn thân mùa đông', 'Kê dưới đầu cho êm cổ ngủ sâu giấc', 'Ôm gọn một chiếc ngủ mới yên tâm'],
    ['Đồng hồ đeo tay', 'Nhẫn', 'Xem giờ trên cổ tay phụ kiện lịch lãm', 'Có kim quay hoặc mặt điện tử tiện lợi', 'Đeo trên ngón tay hay gắn liền chuyện đính hôn', 'Nhỏ xíu sáng lấp lánh biểu tượng gắn kết'],
    ['Nồi cơm điện', 'Ấm siêu tốc', 'Cắm điện nấu hạt gạo chín dẻo thơm cho bữa cơm', 'Nấu xong tự bật nút giữ ấm chờ ăn', 'Đun nước sôi sùng sục trong hai phút pha trà', 'Chỉ nấu nước sôi không nấu đồ ăn được'],
    ['Máy giặt', 'Máy hút bụi', 'Quay lồng vắt khô quần áo bẩn hằng tuần', 'Đổ nước xả vải vô rồi bấm nút ngồi chơi', 'Hút sạch tóc bụi li ti trên sàn thảm sofa', 'Cầm tay đẩy khắp phòng phát tiếng rì rì'],
    ['Thìa', 'Đũa', 'Múc canh xúp cơm chan dễ dàng cho trẻ nhỏ', 'Làm bằng inox đầu tròn lõm sâu', 'Hai que dài cầm một tay gắp đồ khéo léo', 'Văn hóa bàn ăn đặc trưng châu Á'],
    ['Bút bi', 'Bút chì', 'Mực xanh đen viết rõ nét ký giấy tờ', 'Bấm cạch cạch hết mực thì thay ruột', 'Ngòi than viết sai dùng gôm tẩy sạch dễ dàng', 'Hay dùng vẽ phác thảo tô đáp án trắc nghiệm'],
    ['Sạc dự phòng', 'Ổ cắm điện', 'Mang theo balo cứu nguy điện thoại sập nguồn', 'Cần nạp pin trước khi đi du lịch xa', 'Cắm trực tiếp nguồn tường chia nhiều lỗ nối', 'Nằm cố định một chỗ không tích điện sẵn'],
    ['Giày thể thao', 'Dép lê', 'Buộc dây êm gót chạy bộ leo núi cực bền', 'Mang kèm tất bảo vệ ngón chân kín đáo', 'Xỏ chân cái một đi trong nhà ra ngõ tiện lợi', 'Thoáng mát nhưng chạy nhanh dễ tuột'],
    ['Mũ bảo hiểm', 'Mũ lưỡi trai', 'Vỏ cứng xốp dày bắt buộc đội khi chạy xe', 'Cài quai chắc chắn bảo vệ đầu khi va chạm', 'Vải nhẹ đội che nắng thời trang năng động', 'Hay đội ngược ra sau nhìn rất trẻ trung'],
    ['Chổi quét nhà', 'Cây lau nhà', 'Quét gom rác bụi khô lại một góc để hốt', 'Cần thêm ki hốt rác đi cặp mới xong việc', 'Nhúng nước vắt khô lau bóng sàn gạch sạch kin kít', 'Sau khi quét xong mới tới lượt nó ra tay'],
    ['Ba lô', 'Va li', 'Đeo hai vai gọn gàng đi học đi làm hàng ngày', 'Đựng laptop sách vở vừa vặn trên lưng', 'Có bánh xe tay kéo đi du lịch dài ngày', 'Đựng nhiều bộ đồ nặng kéo sàn lọc cọc'],
    ['Gương soi', 'Cửa sổ', 'Phản chiếu rõ khuôn mặt giúp chỉnh đầu tóc trang điểm', 'Vỡ ra người ta hay kiêng kỵ điều xui', 'Mở ra cho gió trời ánh nắng tràn vào phòng', 'Nhìn xuyên qua ngắm mưa nắng bên ngoài'],
    ['Khẩu trang', 'Khăn giấy', 'Đeo che mũi miệng chống bụi mịn vi khuẩn ra đường', 'Có dây quai đeo hai bên tai rất quen thuộc', 'Lau tay lau miệng sau khi ăn xong bỏ thùng rác', 'Mềm mịn thấm nước nhanh chóng'],
    ['Quạt máy', 'Quạt giấy', 'Cắm điện quay cánh vù vù thổi gió mát mùa hè', 'Xoay trái phải đều khắp phòng khi cúp nóng', 'Xếp nếp cầm tay phe phẩy khi mất điện', 'Gấp gọn nhét túi không tốn chút điện nào'],
    ['Cây đàn guitar', 'Đàn piano', 'Sáu dây gảy đệm hát bên đống lửa trại cực chill', 'Ôm gọn trước ngực bấm hợp âm bằng ngón tay', 'Phím trắng đen xếp hàng dài âm thanh sang trọng', 'Ngồi ghế đánh bằng cả hai bàn tay'],
  ]),
  ...pack('Nghề nghiệp', [
    ['Bác sĩ', 'Dược sĩ', 'Khám bệnh kê toa phẫu thuật mặc áo blouse trắng', 'Làm việc tại bệnh viện trực ca cấp cứu', 'Am hiểu thành phần thuốc bán theo đơn tại quầy', 'Tư vấn liều uống sáng chiều cho khách mua thuốc'],
    ['Giáo viên', 'Gia sư', 'Đứng lớp giảng bài cho hàng chục học sinh chấm thi', 'Gắn bó phấn trắng bảng đen cả năm học', 'Dạy kèm một một tại nhà ôn bài riêng từng em', 'Linh hoạt giờ giấc hay là sinh viên đi dạy thêm'],
    ['Ca sĩ', 'Nhạc sĩ', 'Cầm micro đứng sân khấu hát trước hàng ngàn fan', 'Luyện thanh giữ giọng rất kỹ trước show diễn', 'Ngồi viết giai điệu phối khí sáng tác bài hit', 'Thường đứng sau cánh gà ít khi hát trực tiếp'],
    ['Đầu bếp', 'Phục vụ bàn', 'Đội mũ cao nêm nếm đứng bếp lửa suốt buổi', 'Sáng tạo món ngon bày đĩa thật đẹp mắt', 'Ghi order bưng đồ ăn lên dọn dẹp tận tình', 'Luôn mỉm cười chào khách khi bước vào quán'],
    ['Công an', 'Bảo vệ', 'Giữ gìn an ninh điều tiết giao thông bắt tội phạm', 'Mặc sắc phục uy nghiêm làm việc cho nhà nước', 'Trông xe kiểm soát người ra vào cổng công ty', 'Ngồi bốt trực ca đêm quanh khu vực được thuê'],
    ['Lập trình viên', 'Thiết kế đồ họa', 'Gõ code sửa bug uống cà phê thâu đêm', 'Xây dựng website ứng dụng cho máy tính điện thoại', 'Chọn bảng màu vẽ logo poster cực kỳ thẩm mỹ', 'Sống cùng Photoshop Figma canh từng pixel'],
    ['Phi công', 'Tiếp viên hàng không', 'Ngồi buồng lái điều khiển máy bay cất hạ cánh', 'Chịu trách nhiệm toàn bộ đường bay trên trời', 'Chăm sóc hành khách phát suất ăn hướng dẫn an toàn', 'Nụ cười rạng rỡ đứng chào ngay cửa khoang'],
    ['Nhiếp ảnh gia', 'Người mẫu', 'Cầm máy ảnh bắt góc sáng tìm khoảnh khắc đẹp', 'Chỉnh đèn hậu kỳ ảnh cưới kỷ yếu nghệ thuật', 'Tạo dáng thần thái trước ống kính catwalk thời trang', 'Luôn giữ dáng chuẩn mặc đẹp thử bộ sưu tập mới'],
    ['Shipper', 'Tài xế công nghệ', 'Chở thùng hàng gọi điện giao tận cửa mọi thời tiết', 'Chạy khắp ngõ hẻm giao đồ ăn trà sữa hỏa tốc', 'Chở khách qua app tính cước theo cây số trên bản đồ', 'Luôn hỏi anh chị đang đứng ở đầu hẻm nào'],
    ['Kế toán', 'Thủ quỹ', 'Làm sổ sách thuế má cân đối bảng Excel mỗi cuối tháng', 'Sai một con số là ngồi dò tới tối mịt', 'Trực tiếp cầm giữ tiền mặt chi trả thu nộp thực tế', 'Quản lý két sắt phiếu thu phiếu chi hằng ngày'],
    ['Nông dân', 'Ngư dân', 'Chân lấm tay bùn cày cấy trồng lúa vườn cây ăn trái', 'Mong mưa thuận gió hòa tới mùa thu hoạch', 'Ra khơi đánh bắt tôm cá lênh đênh sóng biển', 'Đọc con nước dự báo gió bão ngoài đảo xa'],
    ['Streamer', 'YouTuber', 'Bật cam trò chuyện chơi game trực tiếp cùng người xem', 'Nhận donate đọc tên cảm ơn ngay trên sóng', 'Quay dựng video chỉnh sửa kỹ càng đăng kênh kiếm view', 'Viết kịch bản hậu kỳ mất mấy ngày mới lên clip'],
    ['Thợ điện', 'Thợ sửa ống nước', 'Kiểm tra dây pha aptomat nối điện khi bị chập cháy', 'Luôn đi giày cách điện dùng bút thử cẩn thận', 'Thông tắc bồn rửa hàn ống rò rỉ nước dưới sàn', 'Mang kìm cờ lê chui gầm tủ vặn van'],
    ['Luật sư', 'Thẩm phán', 'Nghiên cứu hồ sơ bào chữa bảo vệ quyền lợi cho thân chủ', 'Tranh luận sắc bén từng điều khoản trước tòa', 'Người cầm cân nảy mực gõ búa tuyên án cuối cùng', 'Ngồi vị trí cao nhất trong phòng xử án công minh'],
    ['Huấn luyện viên', 'Cầu thủ', 'Đứng ngoài đường biên vạch chiến thuật hò hét chỉ đạo', 'Chịu áp lực thành tích của cả đội bóng', 'Trực tiếp chạy trên sân sút bóng ghi bàn tranh cúp', 'Tập luyện thể lực hàng ngày dễ gặp chấn thương'],
    ['Thủ thư', 'Nhà văn', 'Sắp xếp mã sách giữ trật tự hướng dẫn người mượn', 'Biết rõ từng cuốn sách nằm ở kệ nào khu nào', 'Tự tưởng tượng viết nên tiểu thuyết truyện dài kỳ', 'Hay tìm cảm hứng ở những quán nhỏ yên tĩnh'],
    ['Chủ tịch', 'Thư ký', 'Người đứng đầu ra quyết định chiến lược lớn tập đoàn', 'Ký duyệt dự án ngân sách hàng trăm tỷ', 'Sắp xếp lịch họp nhắc việc soạn văn bản cho sếp', 'Theo sát hỗ trợ mọi chuyến công tác quan trọng'],
    ['Thợ kim hoàn', 'Thợ may', 'Chế tác nhẫn vàng cắt gọt đá quý tỉ mỉ từng ly', 'Làm việc với kính lúp đèn sáng rực đồ trang sức', 'Đo số cắt vải đạp máy khâu nên áo dài bộ vest', 'Xung quanh toàn thước dây phấn vẽ mẫu vải'],
    ['Diễn viên hài', 'Ảo thuật gia', 'Kể chuyện tấu mảng miếng khiến khán giả cười nghiêng ngả', 'Biểu cảm duyên dáng hóa thân đủ dạng vai lầy lội', 'Biến chim bồ câu xào bài khiến người xem tròn mắt', 'Luôn giữ bí mật mánh khóe sau màn trình diễn'],
    ['Kiến trúc sư', 'Thợ xây', 'Vẽ bản thiết kế 3D phối cảnh biệt thự công trình đẹp', 'Tính ánh sáng công năng trước khi khởi công', 'Trực tiếp trộn vữa xây gạch dựng tường ngoài nắng gió', 'Đội nón bảo hộ leo giàn giáo cả ngày vất vả'],
  ]),
  ...pack('Giải trí', [
    ['TikTok', 'YouTube', 'Video ngắn lướt dọc mười lăm giây gây nghiện cực nhanh', 'Hay tạo trend nhảy nhót nhạc remix bắt tai', 'Video dài xem hướng dẫn vlog nghe nhạc giải trí', 'Nền tảng video lớn lâu đời màn hình ngang'],
    ['Cờ vua', 'Cờ tướng', 'Quân vua hậu mã xe tượng trên bàn 64 ô đen trắng', 'Chiếu bí kiểu quốc tế rất hay thi Olympic', 'Tướng sĩ tượng pháo mã đặt trên giao điểm có sông', 'Chơi ngay vỉa hè trà đá cực kỳ đông người xem'],
    ['Ma Sói', 'Among Us', 'Đêm nhắm mắt nghe quản trò dẫn chuyện tìm Sói ẩn thân', 'Trò chơi giao tiếp suy luận quanh vòng tròn', 'Làm nhiệm vụ trên tàu vũ trụ tìm kẻ giả mạo đâm lén', 'Bấm chuông họp khẩn đẩy người nghi ngờ ra ngoài không gian'],
    ['Liên Quân', 'Free Fire', 'Phá trụ 5 đấu 5 chọn tướng chia đường Rừng Mid AD', 'Combat tổng cuối game tranh Caesar rất căng', 'Nhảy dù nhặt súng bo thu hẹp sinh tồn một trăm người', 'Chạy bo bắn tỉa ai sống cuối cùng là thắng'],
    ['Doraemon', 'Conan', 'Mèo máy túi thần kỳ bảo bối giúp cậu bạn hậu đậu', 'Bánh rán bảo bối chong chóng tre tuổi thơ ai cũng mê', 'Thám tử teo nhỏ phá án mạng gay cấn bằng nơ đổi giọng', 'Mỗi tập đều có hung thủ bất ngờ sau cánh cửa'],
    ['Harry Potter', 'Tây Du Ký', 'Phù thủy cưỡi chổi trường Hogwarts đũa phép đấu Chúa tể', 'Thư cú gửi nhập học chia bốn nhà phép thuật', 'Bốn thầy trò vượt tám mươi mốt kiếp nạn đi thỉnh kinh', 'Tôn Ngộ Không gậy Như Ý bảy mươi hai phép thần thông'],
    ['Sơn Tùng M-TP', 'Đen Vâu', 'Ca sĩ Thái Bình nổi tiếng Lạc Trôi Cơn Mưa Ngang Qua', 'Gu thời trang cá tính lượng fan Sky hùng hậu', 'Rapper viết lời mộc mạc chill chill đi trốn mang tiền về cho mẹ', 'Mỗi câu rap hay thành status triết lý mạng xã hội'],
    ['Bóng đá', 'Bóng rổ', 'Dùng chân chuyền sút lưới mười một người mỗi đội', 'Giải Ngoại hạng World Cup cả xóm thức đêm xem', 'Dùng tay dẫn đập bóng ném vào rổ treo cao', 'Ưu thế chiều cao bật nhảy úp rổ cực ngầu'],
    ['Cầu lông', 'Bóng bàn', 'Cầm vợt nhẹ đánh quả cầu lông vũ qua lưới cao', 'Đánh sân phong trào buổi chiều rất phổ biến', 'Đánh trái bóng nhựa nhỏ xíu nảy liên hồi trên mặt bàn', 'Phản xạ cực nhanh sát mặt bàn gỗ xanh'],
    ['Bơi lội', 'Chạy bộ', 'Vận động dưới nước sải bướm ếch ngửa mát rượi', 'Tốt cho cột sống chiều cao không ra mồ hôi rít', 'Mang giày sải bước ngoài công viên máy chạy', 'Đo cự ly năm cây mười cây marathon cuối tuần'],
    ['Lô tô', 'Xổ số kiến thiết', 'Vừa rao câu hát vè vừa dò số chờ hô Kinh cả hội chợ', 'Cuộc vui tụ tập Tết càng đông người dò càng vui', 'Mua tờ giấy dò chiều bốn giờ mười lăm chờ quay thưởng', 'Trúng giải độc đắc đổi đời ngay lập tức'],
    ['Nhảy dây', 'Đá cầu', 'Quay sợi dây vút qua chân nhảy nhịp đều giảm cân', 'Tập một mình hay nhiều người cùng nhảy đều được', 'Tâng quả cầu có cánh lông bằng mu bàn chân gót gối', 'Chơi vòng tròn ngoài sân trường giờ ra chơi'],
    ['Chụp ảnh selfie', 'Quay vlog', 'Giơ cam trước tạo dáng cười tươi đăng ngay story', 'Góc nghiêng thần thánh chỉnh filter mịn da', 'Kể chuyện dẫn dắt hành trình ăn chơi thành video dài', 'Hay nói câu chào các bạn đã quay trở lại kênh'],
    ['Netflix', 'Spotify', 'Cày phim bộ dài tập có phụ đề độ phân giải 4K', 'Cuối tuần trùm chăn xem nguyên mùa không chán', 'Nghe nhạc podcast danh sách phát cả ngày khi làm việc', 'Không có hình phim ảnh chỉ tập trung âm thanh'],
    ['Lego', 'Xếp hình Rubik', 'Lắp ghép hàng trăm mảnh nhựa thành lâu đài siêu xe', 'Đạp phải một mảnh nhỏ là thốn tận óc', 'Xoay sáu mặt khối vuông sao cho mỗi mặt đúng một màu', 'Cao thủ giải nhanh chỉ trong vài giây đồng hồ'],
    ['Tết Nguyên Đán', 'Lễ Giáng Sinh', 'Gói bánh nhận lì xì dọn nhà thăm họ hàng đầu năm', 'Hoa đào hoa mai pháo hoa giao thừa ấm cúng', 'Cây thông đèn nhấp nháy ông già mặc đồ đỏ phát quà', 'Trời se lạnh cuối năm vang nhạc Jingle Bells'],
    ['Đi phượt', 'Đi tour du lịch', 'Tự chạy xe máy đổ đèo khám phá cung đường bụi bặm', 'Tự do dừng chụp cảnh đẹp không gò bó giờ giấc', 'Có hướng dẫn viên lo sẵn xe khách sạn theo đoàn', 'Nhàn hạ lên xe xuống điểm chụp hình đúng lịch'],
    ['Bi-a', 'Bowling', 'Cầm cây cơ chọc bi vào lỗ trên bàn nỉ xanh', 'Nghe tiếng lách cách tính góc băng cực kỳ cân não', 'Ôm quả bóng nặng ném lăn trên sàn gỗ đổ hết pin', 'Xỏ đôi giày riêng của khu vui chơi để ném'],
    ['Hát xẩm', 'Cải lương', 'Nghệ thuật dân gian mộc mạc đàn nhị hát kể chuyện đời', 'Nghe mang đậm hồn quê Bắc Bộ xưa', 'Điệu vọng cổ mùi mẫn diễn tích tuồng sân khấu miền Nam', 'Ngân dài luyến láy sâu lắng dễ rơi nước mắt'],
    ['Đánh bài Tiến lên', 'Xì dách', 'Chặt heo tứ quý đôi thông ai hết trước là nhất', 'Sát phạt vui ngày lễ từng lá bài đánh theo vòng', 'Rút thêm bài sao cho tổng điểm gần hai mươi mốt nhất', 'Quá hai mươi mốt điểm là quắc thua ngay'],
  ]),
  ...pack('Đời sống', [
    ['Áo dài', 'Áo bà ba', 'Trang phục truyền thống thướt tha hai tà xẻ tà chụp Tết', 'Tôn dáng duyên dáng nữ sinh lễ cưới Việt Nam', 'Áo cổ tròn nút cài giản dị gắn với sông nước miền Tây', 'Mặc đi làm vườn chèo xuồng rất thoải mái'],
    ['Mưa rào', 'Bão lớn', 'Đổ xuống bất chợt chiều hè rồi tạnh nhanh có cầu vồng', 'Không khí dịu mát sau cơn mưa nhẹ', 'Gió giật mạnh cây đổ ngập đường phải đóng kín cửa', 'Theo dõi dự báo cấp gió tránh ra khỏi nhà'],
    ['Cơn buồn ngủ', 'Cơn đói bụng', 'Mắt díp lại ngáp ngắn ngáp dài sau bữa trưa', 'Chỉ muốn ngả lưng nhắm mắt mười lăm phút', 'Bụng réo ọc ọc tay chân bủn rủn mất sức', 'Nghĩ tới tô cơm hay ly trà sữa là chảy nước miếng'],
    ['Bình minh', 'Hoàng hôn', 'Mặt trời ló rạng phía đông trời sáng dần đón ngày mới', 'Sương sớm tinh khôi người dậy sớm mới ngắm được', 'Ánh nắng đỏ rực lặn dần phía tây cuối buổi chiều', 'Khoảnh khắc lãng mạn hay chụp ngược sáng trên cầu'],
    ['Nước mắm', 'Nước tương', 'Màu cánh gián vị đậm đà ủ từ cá biển mặn mà', 'Không thể thiếu trong mâm cơm gia đình Việt', 'Màu đen làm từ đậu nành ăn chay rất hợp', 'Hay chan cơm hoặc chấm đậu chiên dimsum'],
    ['Lì xì', 'Tiền lương', 'Phong bao đỏ may mắn trao tay dịp đầu xuân mới', 'Chúc nhau câu khỏe mạnh công danh nhận ngay tại chỗ', 'Chờ tin nhắn ting ting mỗi tháng sau bao ngày cày cuốc', 'Về tay một hôm xong trả hết tiền nhà tiền ăn'],
    ['Đám cưới', 'Sinh nhật', 'Cô dâu chú rể trao nhẫn mời tiệc họ hàng hai bên', 'Chuẩn bị thiệp hồng tiền mừng đi ăn cỗ lớn', 'Thổi nến cắt bánh kem nhận quà chúc tuổi mới', 'Tổ chức vui vẻ gọn nhẹ cùng nhóm bạn thân'],
    ['Tắc đường', 'Trễ giờ làm', 'Xe cộ nối đuôi nhích từng cen-ti-mét giờ tan tầm', 'Kẹt cứng ngã tư hít khói bấm còi inh ỏi', 'Chạy vội quẹt thẻ vân tay tim đập thình thịch', 'Sợ sếp nhìn đồng hồ nhắc nhở ngay cửa'],
    ['Cúp điện', 'Mất mạng Wi-Fi', 'Cả xóm tối om quạt đứng im nóng bức lục tìm đèn pin', 'Chờ điện lực khắc phục ngồi ra hiên hóng gió', 'Có đèn vẫn sáng nhưng không tải nổi tin nhắn video', 'Quay vòng loading phát cáu tắt router bật lại'],
    ['Học thuộc lòng', 'Học vẹt', 'Ghi nhớ kỹ kiến thức công thức chuẩn bị kiểm tra', 'Đọc đi đọc lại nhiều lần cho chắc chắn', 'Đọc làu làu nhưng hỏi hiểu gì không thì bó tay', 'Quên sạch sành sanh ngay sau khi bước ra khỏi phòng thi'],
    ['Mùa đông', 'Mùa thu', 'Lạnh buốt co ro áo phao khăn quàng chỉ muốn ôm chăn', 'Thở ra khói thích ăn đồ nướng lẩu nghi ngút', 'Trời se lạnh nắng vàng hanh lá rụng lãng mạn', 'Thời tiết dễ chịu nhất năm để đi dạo uống trà'],
    ['Nói dối', 'Nói đùa', 'Che giấu sự thật làm người khác hiểu sai vấn đề', 'Có thể gây mất lòng tin nếu bị phát hiện', 'Chọc cho mọi người cười vui rồi giải thích ngay', 'Không có ác ý chủ yếu tạo không khí hài hước'],
    ['Tình yêu', 'Tình bạn', 'Rung động ghen tuông nhớ nhung muốn gắn bó suốt đời', 'Thường có những buổi hẹn hò nắm tay lãng mạn', 'Vô tư thân thiết cà khịa thoải mái không ràng buộc', 'Giúp đỡ nhau vượt khó không cần danh phận đôi lứa'],
    ['Giấc mơ', 'Ác mộng', 'Cảnh tượng kỳ lạ hiện lên lúc đang ngủ say', 'Sáng dậy cố nhớ lại mà chẳng đầu chẳng đuôi', 'Cảm giác sợ hãi bị rượt đuổi giật mình tỉnh giấc giữa đêm', 'Tim đập nhanh toát mồ hôi không dám ngủ lại'],
    ['Tiết kiệm', 'Keo kiệt', 'Chi tiêu hợp lý để dành tiền cho tương lai phòng thân', 'Không mua đồ phung phí nhưng vẫn tử tế với bạn bè', 'Tính toán từng đồng không dám chi ngay cả cho bản thân', 'Đi ăn nhóm hay trốn trả tiền khiến mọi người ngại'],
    ['Bí mật', 'Tin đồn', 'Điều riêng tư giữ kín chỉ mình hoặc vài người tin tưởng biết', 'Lộ ra là coi như mất luôn lòng tin', 'Chuyện truyền tai chưa kiểm chứng lan khắp xóm nhanh như gió', 'Càng kể qua nhiều người càng thêm mắm dặm muối'],
    ['Thức khuya', 'Dậy sớm', 'Quá hai giờ sáng vẫn ôm điện thoại mắt thâm quầng', 'Hôm sau ngái ngủ lờ đờ cả buổi sáng', 'Năm giờ chuông reo đã bật dậy chạy bộ pha cà phê', 'Thói quen lành mạnh đón ngày mới nhiều năng lượng'],
    ['Ăn kiêng', 'Nhịn ăn sáng', 'Kiểm soát calo ăn nhiều rau ức gà để giữ dáng khỏe mạnh', 'Vẫn ăn đủ chất chỉ cắt giảm đường dầu mỡ', 'Vội quá bỏ bữa sáng dễ đau dạ dày tụt huyết áp', 'Trưa tới ăn bù gấp đôi lại càng mệt hơn'],
    ['Đèn đỏ', 'Vạch kẻ đường', 'Bắt buộc dừng xe lại chờ đủ giây mới được đi tiếp', 'Vượt qua là dễ bị phạt nặng cực kỳ nguy hiểm', 'Sơn trắng trên mặt đường dành cho người đi bộ băng qua', 'Thấy nó thì xe cộ phải giảm tốc nhường đường'],
    ['Bản đồ giấy', 'La bàn', 'Trải rộng khổ lớn tìm đường sông núi tên địa danh', 'Gấp lại hơi lỉnh kỉnh nhưng không sợ hết pin', 'Kim nam châm nhỏ chỉ đúng hướng Bắc Nam mọi nơi', 'Đi rừng lạc đường dùng kết hợp xác định phương hướng'],
  ]),
  ...pack('Công nghệ', [
    ['Điện thoại thông minh', 'Máy tính bảng', 'Nhét túi quần gọi điện nhắn tin màn hình nhỏ gọn', 'Đi đâu cũng cầm kè kè bấm suốt ngày', 'Màn hình to xem phim vẽ vời đọc tài liệu rất đã', 'Nhét túi quần không vừa phải cho vào túi xách'],
    ['Laptop', 'Máy tính bàn', 'Gập lại mang ra quán cà phê chạy deadline linh hoạt', 'Có sẵn pin bàn phím touchpad liền thân', 'Cắm dây cố định màn hình lớn tản nhiệt khỏe cày game', 'Cúp điện một phát là tắt phụt nếu không có lưu điện'],
    ['Tai nghe không dây', 'Loa Bluetooth', 'Đeo gọn hai bên tai nghe riêng tư trên xe buýt đi học', 'Có hộp sạc nhỏ xinh nhét gọn lòng bàn tay', 'Phát nhạc âm lượng lớn cho cả nhóm quẩy chung tiệc', 'Đặt giữa phòng vang âm bass ầm ầm'],
    ['Chuột máy tính', 'Touchpad', 'Cầm vừa tay rê trên lót chuột click cực nhanh chơi game', 'Có con lăn cuộn trang rất mượt', 'Bàn rê cảm ứng tích hợp sẵn dưới bàn phím laptop', 'Chữa cháy khi quên mang phụ kiện rời'],
    ['Mạng Wi-Fi', 'Mạng 4G/5G', 'Bắt sóng từ cục phát cố định ở nhà hay quán xá không giới hạn', 'Quên mật khẩu là đi xin chủ quán', 'Gắn SIM nhà mạng ra đường vẫn vào mạng phà phà', 'Hết dung lượng tốc độ cao là quay như rùa'],
    ['USB', 'Ổ cứng di động', 'Nhỏ xíu như ngón tay móc chìa khóa chép file thuyết trình', 'Dung lượng vừa phải hay bị bỏ quên ở quán in', 'Hộp to nặng chứa cả terabyte phim ảnh sao lưu nặng', 'Cắm dây cáp riêng truyền dữ liệu dung lượng lớn'],
    ['ChatGPT', 'Google Search', 'Trò chuyện hỏi đáp viết code làm thơ như trợ lý ảo', 'Trả lời tổng hợp thành đoạn văn ngay lập tức', 'Gõ từ khóa trả về hàng loạt trang web nguồn tự đọc chọn', 'Công cụ tìm đường tra cứu tin tức kinh điển nhất'],
    ['Mã QR', 'Mã vạch', 'Hình vuông chấm đen quét camera chuyển khoản kết bạn siêu nhanh', 'Dán đầy quầy thu ngân trà sữa quán ăn', 'Các sọc đứng dài ngắn in sau bao bì sản phẩm siêu thị', 'Thu ngân cầm máy chiếu tia đỏ quét tít tít tính tiền'],
    ['Mật khẩu', 'Vân tay', 'Gõ chuỗi ký tự chữ số bí mật để mở khóa tài khoản', 'Quên hoài phải bấm nút gửi mã khôi phục', 'Chạm đầu ngón tay một giây là mở khóa siêu tiện', 'Không cần nhớ dãy ký tự dài nhưng tay ướt hay lỗi'],
    ['Bluetooth', 'AirDrop', 'Kết nối không dây với tai nghe đồng hồ bàn phím loa', 'Bật lên ghép đôi thiết bị xung quanh', 'Bắn ảnh gốc tốc độ cao giữa điện thoại máy tính cùng hệ sinh thái', 'Không cần internet gửi vài chục ảnh chỉ mất vài giây'],
    ['Ảnh chụp màn hình', 'Tải ảnh về', 'Bấm tổ hợp nút lưu đúng những gì đang hiện trên máy', 'Hay dùng để lưu tin nhắn phốt hay bằng chứng nhanh', 'Nhấn giữ lưu file gốc sắc nét từ mạng về thư viện', 'Không dính thanh pin giờ giấc trên viền màn hình'],
    ['Cáp sạc', 'Củ sạc', 'Sợi dây dài nối truyền điện truyền dữ liệu hay bị gãy đầu', 'Hay quấn rối tung trong balo hoặc bị chó cắn đứt', 'Khối vuông cắm thẳng ổ điện chuyển dòng điện an toàn', 'Có loại công suất lớn hỗ trợ sạc siêu nhanh'],
    ['Smartwatch', 'Vòng tay đếm bước', 'Nghe gọi nhận thông báo màn hình đẹp như đồng hồ thật', 'Giá cao cài thêm được nhiều ứng dụng nhỏ', 'Nhẹ tênh pin cả tuần chủ yếu đo nhịp tim bước chân', 'Màn hình hẹp giá rẻ rất hợp tập thể dục'],
    ['Camera an ninh', 'Máy ảnh cơ', 'Treo góc nhà quan sát ghi hình 24/7 xem qua điện thoại', 'Phát hiện chuyển động chống trộm theo dõi thú cưng', 'Cầm tay thay ống kính bấm tách xóa phông nghệ thuật', 'Chuyên chụp chân dung phong cảnh độ nét cực cao'],
    ['Email', 'Tin nhắn SMS', 'Gửi thư công việc trang trọng đính kèm CV hợp đồng PDF', 'Có tiêu đề cc bcc lịch sự chuyên nghiệp', 'Tin nhắn ngắn theo số điện thoại tốn cước hoặc nhận mã OTP', 'Ít ai nhắn tâm sự dài trên đây nữa nhưng vẫn cần nhận code'],
    ['YouTube Shorts', 'Instagram Reels', 'Mục clip ngắn dọc nằm ngay trong ứng dụng xem video đỏ', 'Kéo xuống xem tiếp hết clip này tới clip khác', 'Clip ngắn nhiều filter đẹp nằm trong app mạng xã hội ảnh', 'Người trẻ hay đăng khoảnh khắc du lịch ăn uống bắt trend'],
    ['Pin tiểu', 'Pin điện thoại', 'Lắp vào điều khiển tivi đồ chơi hết thì vứt thay viên mới', 'Mua từng vỉ ngoài tiệm tạp hóa', 'Pin lithium liền khối sạc đi sạc lại hàng trăm lần', 'Chai pin thì phải mang ra tiệm tháo máy thay'],
    ['Máy in', 'Máy scan', 'Phun mực lên giấy trắng cho ra tài liệu bài tập hợp đồng', 'Hay kẹt giấy hết mực đúng lúc cần nộp gấp', 'Quét tờ giấy có sẵn đưa ngược thành file ảnh PDF vào máy', 'Không tốn giấy mới dùng để số hóa giấy tờ cũ'],
    ['Tivi thông minh', 'Máy chiếu', 'Màn hình lớn đặt phòng khách kết nối mạng xem đá bóng', 'Sáng rõ cả ban ngày điều khiển giọng nói tiện lợi', 'Chiếu hình khổng lồ lên tường trắng cảm giác như rạp phim', 'Phải tắt bớt đèn phòng tối mới nhìn rõ đẹp'],
    ['Trình duyệt Chrome', 'Ứng dụng Facebook', 'Dùng lướt đủ mọi trang web tìm kiếm mở hàng chục tab', 'Ăn RAM hơi mạnh nhưng tiện ích mở rộng cực nhiều', 'Vào xem bài đăng bạn bè bình luận kết bạn lướt bảng tin', 'Mỗi ngày mở ra lướt cả tiếng không hay'],
  ]),
];
