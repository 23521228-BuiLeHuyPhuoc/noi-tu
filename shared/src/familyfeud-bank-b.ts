import type { FeudAnswer, FeudQuestion } from './familyfeud-types';

type AnswerRow = [text: string, points: number, aliases: string[], keywords: string[]];

function q(id: string, category: string, question: string, rows: AnswerRow[]): FeudQuestion {
  return {
    id,
    category,
    question,
    answers: rows.map(
      ([text, points, aliases, keywords]): FeudAnswer => ({
        text,
        points,
        aliases,
        keywords,
      }),
    ),
  };
}

const CAT_MONEY = 'Tiền bạc, Nợ nần & Sống ảo';
const CAT_FAMILY = 'Gia đình, Tết & Hàng xóm nhiều chuyện';
const CAT_GAMER = 'Game thủ, Net cỏ & Cú đêm';
const CAT_SCHOOL = 'Trường học, Thi cử & Tuổi thơ dữ dội';
const CAT_CHAOS = 'Tình huống dở khóc dở cười & Bựa xã hội';

/**
 * Ngân hàng B gồm 130 câu hỏi Khảo Sát Xóm Lầy (`ff_b001`–`ff_b130`) chia đều 5 chủ đề (26 câu/chủ đề).
 */
export const FAMILY_FEUD_BANK_B: FeudQuestion[] = [
  // =========================================================================
  // 1. TIỀN BẠC, NỢ NẦN & SỐNG ẢO (ff_b001 – ff_b026)
  // =========================================================================
  q('ff_b001', CAT_MONEY, 'Cuối tháng tài khoản còn đúng 12 nghìn, dân tình hay làm gì để sinh tồn?', [
    ['Úp mì tôm', 36, ['ăn mì tôm', 'an mi tom', 'mì gói', 'mi goi', 'ăn mì sống', 'mi hao hao'], ['mì tôm', 'mì gói', 'hảo hảo', 'úp mì']],
    ['Vay nóng bạn', 23, ['mượn tiền', 'muon tien', 'vay bạn', 'vay nong', 'xin ứng tiền', 'muon do'], ['vay tiền', 'mượn tiền', 'vay nóng', 'ứng lương']],
    ['Nhịn đói uống nước', 15, ['nhịn ăn', 'nhin an', 'uống nước lọc', 'uong nuoc loc', 'bỏ bữa', 'nhin doi'], ['nhịn ăn', 'nhịn đói', 'nước lọc', 'bỏ bữa']],
    ['Quẹt ví trả sau', 12, ['dùng thẻ tín dụng', 'the tin dung', 'momo trả sau', 'spaylater', 'vi tra sau', 'tra sau'], ['trả sau', 'tín dụng', 'quẹt thẻ', 'spaylater']],
    ['Ăn ké người quen', 8, ['ăn chực', 'an ke', 'qua nhà bạn ăn', 'bám cơm', 'an chuc', 'ké cơm'], ['ăn chực', 'ăn ké', 'ké cơm', 'bám cơm']],
    ['Bán đồ cũ', 6, ['thanh lý đồ', 'thanh ly do', 'cắm đồ', 'cam do', 'pass đồ', 'ban do cu'], ['bán đồ', 'thanh lý', 'cắm đồ', 'pass đồ']],
  ]),

  q('ff_b002', CAT_MONEY, 'Con nợ hẹn "mai trả" rồi lặn, nhưng trên Story vẫn chăm đăng gì nhất?', [
    ['Khoe đi du lịch', 34, ['di du lich', 'check in resort', 'đi chơi xa', 'khoe du lich', 'du lịch'], ['du lịch', 'đi chơi', 'resort']],
    ['Ăn nhà hàng sang', 24, ['an sang', 'ăn nhà hàng', 'check in quán xịn', 'khoe đồ ăn', 'đi ăn ngon'], ['nhà hàng', 'ăn sang', 'ăn ngon']],
    ['Viết đạo lý sống', 17, ['nói đạo lý', 'triet ly song', 'cap dao ly', 'đạo lý làm người', 'triết lý'], ['đạo lý', 'triết lý', 'sống đẹp']],
    ['Khoe mua đồ mới', 12, ['khoe đồ hiệu', 'dap hop', 'mua do moi', 'khoe điện thoại', 'khoe xe'], ['đồ mới', 'đập hộp', 'đồ hiệu']],
    ['Than ốm kể khổ', 8, ['than ngheo', 'kể khổ', 'benh vien', 'than om', 'than hết tiền'], ['than nghèo', 'kể khổ', 'ốm đau']],
    ['Share xin vía giàu', 5, ['xin via', 'bói toán', 'tarot', 'xem boi', 'chia sẻ xổ số'], ['xin vía', 'bói toán', 'tarot']],
  ]),

  q('ff_b003', CAT_MONEY, 'Món đồ phông bạt hội lương 7 triệu hay cố mua trả góp để ra vẻ giàu?', [
    ['iPhone đời mới', 38, ['iphone pro max', 'ip đời mới', 'tra gop iphone', 'điện thoại táo', 'iphone'], ['iphone', 'pro max', 'táo khuyết']],
    ['Xe SH trả góp', 22, ['xe sh', 'sh tra gop', 'xe tay ga xịn', 'mua xe sh', 'tay ga đắt'], ['xe sh', 'tay ga', 'lên đời xe']],
    ['Túi ví hàng fake', 15, ['túi hiệu', 'hang rep', 'do fake', 'tui gucci', 'ví hiệu rep'], ['túi hiệu', 'hàng fake', 'rep 1:1']],
    ['Ly cà phê Starbucks', 11, ['starbucks', 'cf sang chanh', 'ly cf', 'cốc starbucks', 'trà sữa đắt'], ['starbucks', 'sang chảnh', 'cốc nước']],
    ['Đồng hồ hàng hiệu', 8, ['đồng hồ xịn', 'rolex fake', 'apple watch', 'dong ho hieu', 'đồng hồ đắt'], ['đồng hồ', 'rolex', 'apple watch']],
    ['Giày sneaker đắt', 6, ['giay sneaker', 'jordan', 'giay hieu', 'giày nike rep', 'giay dat tien'], ['sneaker', 'jordan', 'giày hiệu']],
  ]),

  q('ff_b004', CAT_MONEY, 'Câu nói dối sặc mùi hết tiền khi bạn rủ đi ăn chỗ sang cuối tháng?', [
    ['Đang giảm cân', 33, ['ăn kiêng', 'giam can', 'an chay', 'đang diet', 'nhịn tối'], ['ăn kiêng', 'giảm cân', 'ăn chay', 'diet']],
    ['Nhà có việc bận', 24, ['bận việc nhà', 'ban viec', 'về quê gấp', 'việc gia đình', 'có việc rồi'], ['việc nhà', 'gia đình', 'về quê']],
    ['Đang bị đau bụng', 17, ['bị ốm rồi', 'dau bung', 'sốt rồi', 'mệt người', 'bi om'], ['đau bụng', 'bị ốm', 'mệt người']],
    ['Mới ăn no rồi', 12, ['ăn cơm rồi', 'an no roi', 'mới ăn xong', 'no bụng', 'ăn ở nhà rồi'], ['ăn no', 'mới ăn', 'căng bụng']],
    ['Đang kẹt deadline', 8, ['chạy deadline', 'chay dl', 'bận làm bài', 'ket deadline', 'làm không kịp'], ['deadline', 'chạy dl', 'bận làm']],
    ['App ngân hàng lỗi', 6, ['lỗi app ngân hàng', 'quen vi', 'quên mang ví', 'app loi', 'kẹt tiền mặt'], ['bảo trì', 'lỗi app', 'quên ví']],
  ]),

  q('ff_b005', CAT_MONEY, 'Dân sống ảo hết tiền đi du lịch hay làm trò gì để có ảnh sang chảnh?', [
    ['Chụp ké xe sang', 34, ['ké siêu xe', 'chup ke resort', 'sảnh khách sạn', 'ke xe sang', 'đứng cạnh xe lạ'], ['chụp ké', 'siêu xe', 'sảnh khách sạn']],
    ['Đăng lại ảnh cũ', 24, ['đi một lần đăng cả năm', 'dang anh cu', 'xài ảnh tồn kho', 'up anh cu', 'tích ảnh'], ['ảnh cũ', 'đăng cả năm', 'tồn kho']],
    ['Check-in ảo resort', 17, ['ở trọ check in resort', 'homestay re', 'ghép phòng', 'checkin ao', 'ở nhà nghỉ'], ['check-in', 'ở ghép', 'resort']],
    ['Thuê đồ chụp ảnh', 12, ['mượn đồ chụp', 'thue vay chup anh', 'thuê đồ sống ảo', 'còn nguyên mác', 'muon ao'], ['thuê đồ', 'mượn đồ', 'còn mác']],
    ['Cắt góc giấu cảnh', 8, ['crop ảnh', 'chụp mỗi cái ly', 'góc khuất', 'chup can canh', 'giấu cảnh bần'], ['cắt góc', 'góc hẹp', 'crop ảnh']],
    ['Ghép ảnh bằng app', 5, ['photoshop', 'ghép nền', 'ghép ảnh ai', 'chinh mau', 'pts'], ['ghép ảnh', 'photoshop', 'chỉnh màu']],
  ]),

  q('ff_b006', CAT_MONEY, 'Phản ứng đầu tiên khi lỡ chuyển khoản nhầm cho người lạ mất 5 triệu?', [
    ['Chửi thề hoảng loạn', 35, ['hoang loan', 'tăng xông', 'điên tiết', 'chửi bới', 'sốc nặng'], ['chửi thề', 'hoảng loạn', 'sốc nặng']],
    ['Gọi ngân hàng gấp', 24, ['báo ngân hàng', 'goi tong dai', 'tra soát', 'ngan hang', 'khóa giao dịch'], ['ngân hàng', 'tổng đài', 'tra soát']],
    ['Nhắn tin xin lại', 16, ['năn nỉ', 'nan ni', 'xin lại tiền', 'lạy lục', 'năn nỉ trả'], ['năn nỉ', 'xin lại', 'lạy lục']],
    ['Đăng phốt tìm người', 12, ['bóc phốt', 'boc phot', 'đăng bài tìm', 'chụp bill đăng mạng', 'công khai'], ['bóc phốt', 'đăng mạng', 'đăng bài']],
    ['Đi báo công an', 8, ['bao cong an', 'trình báo', 'khiếu nại', 'nhờ công an', 'báo cảnh sát'], ['công an', 'trình báo', 'khiếu nại']],
    ['Coi như mất trắng', 5, ['của đi thay người', 'cam chiu', 'mất trắng', 'xui chịu', 'bỏ luôn'], ['của đi thay người', 'mất trắng', 'cam chịu']],
  ]),

  q('ff_b007', CAT_MONEY, 'Lý do trời đánh nhất hội con nợ hay bịa ra để xin khất nợ thêm tháng nữa?', [
    ['Công ty chậm lương', 36, ['chưa có lương', 'chua nhan luong', 'sếp nợ lương', 'đợi lương về', 'chua co luong'], ['chưa lương', 'chậm lương', 'đợi lương']],
    ['Người nhà nhập viện', 22, ['bố mẹ ốm', 'nha co nguoi om', 'đang cấp cứu', 'nằm viện', 'lo tiền thuốc'], ['người ốm', 'nằm viện', 'cấp cứu']],
    ['Đang kẹt xoay vốn', 16, ['chưa thu hồi vốn', 'ket tien', 'khách chưa trả', 'chưa xoay kịp', 'hàng chưa về'], ['xoay vốn', 'kẹt tiền', 'chưa xoay kịp']],
    ['Thẻ ngân hàng khóa', 12, ['thẻ bị khóa', 'app loi', 'hết hạn mức', 'khoa tai khoan', 'không chuyển được'], ['khóa thẻ', 'lỗi app', 'hạn mức']],
    ['Bị phạt hư xe', 8, ['bị thổi phạt', 'hu xe', 'tai nạn nhẹ', 'sửa xe hết tiền', 'csgt phạt'], ['công an phạt', 'hư xe', 'sửa xe']],
    ['Chờ bán đất thưởng', 6, ['chờ bán đất', 'doi tien thuong', 'sắp chốt sổ đỏ', 'ban dat', 'chờ tiền về'], ['bán đất', 'tiền thưởng', 'sổ đỏ']],
  ]),

  q('ff_b008', CAT_MONEY, 'Mấy "chủ tịch giả vờ" hay khoe gì trên mạng để lùa gà bán khóa học?', [
    ['Chụp vô lăng xe', 34, ['vô lăng xe', 'chup vo lang', 'xe mercedes', 'chìa khóa ô tô', 'lái siêu xe'], ['vô lăng', 'xe hơi', 'mercedes']],
    ['Khoe cọc tiền mặt', 24, ['số dư tài khoản', 'so du ao', 'xấp tiền dày', 'chuyển khoản tiền tỷ', 'khoe tien'], ['cọc tiền', 'số dư', 'xấp tiền']],
    ['Hóa đơn tiền triệu', 17, ['bill tiền triệu', 'khoe bill', 'hoa don', 'bill nhà hàng', 'khoe hoa don'], ['hóa đơn', 'khoe bill', 'tiền triệu']],
    ['Mặc vest chụp ảnh', 11, ['doanh nhân', 'chup voi celeb', 'ảnh hội thảo', 'sự kiện lớn', 'mac vest'], ['mặc vest', 'hội thảo', 'doanh nhân']],
    ['Khoe sổ đỏ đất', 8, ['so do', 'giấy tờ đất', 'ký hợp đồng', 'chốt đất', 'hop dong'], ['sổ đỏ', 'hợp đồng', 'giấy tờ đất']],
    ['Dạy làm giàu 4.0', 6, ['đạo lý làm giàu', 'day lam giau', 'tự do tài chính', 'kinh doanh 4.0', 'chủ tịch'], ['làm giàu', 'tài chính', 'đạo lý']],
  ]),

  q('ff_b009', CAT_MONEY, 'Hậu quả thê thảm nhất của việc thức tới 2 giờ sáng săn sale 0 đồng?', [
    ['Cháy sạch ví tiền', 35, ['hết sạch tiền', 'chay vi', 'cạn tài khoản', 'sáng dậy khóc', 'het tien'], ['cháy ví', 'hết tiền', 'âm tiền']],
    ['Mua đống đồ rác', 23, ['mua đồ linh tinh', 'do vo dung', 'đồ không xài', 'mua rác', 'phi tien'], ['đồ vô dụng', 'đống rác', 'linh tinh']],
    ['Quên mình đặt gì', 16, ['quen dat hang', 'shipper gọi ngơ ngác', 'không nhớ đơn', 'tự tặng mình', 'ngo ngac'], ['quên đặt', 'không nhớ', 'ngơ ngác']],
    ['Shipper gọi sáng sớm', 12, ['shipper réo', 'mất ngủ vì shipper', 'dậy nhận hàng', 'goi som', 'sáng sớm gọi'], ['shipper gọi', 'dựng dậy', 'sáng sớm']],
    ['Nợ ví trả sau', 8, ['bẫy trả sau', 'no tra sau', 'nợ thẻ tín dụng', 'gánh nợ', 'no ngap dau'], ['trả sau', 'nợ ngập', 'tín dụng']],
    ['Hàng lỗi lệch pha', 6, ['hàng lệch hình', 'hang lech hinh', 'bị lừa hàng đểu', 'khác ảnh mẫu', 'đồ dỏm'], ['hàng lỗi', 'lệch hình', 'hàng đểu']],
  ]),

  q('ff_b010', CAT_MONEY, 'Khoản chi nào khiến dân tình "đau thận" nhất mỗi khi móc ví trả?', [
    ['Tiền mừng đám cưới', 36, ['thiệp cưới', 'thiep cuoi', 'đi đám cưới', 'mừng cưới', 'tien cuoi'], ['thiệp cưới', 'đám cưới', 'mừng cưới']],
    ['Nộp phạt giao thông', 23, ['bị công an phạt', 'tien phat', 'thổi phạt', 'phạt nguội', 'csgt phạt'], ['tiền phạt', 'giao thông', 'phạt nguội']],
    ['Lì xì đám cháu', 16, ['lì xì tết', 'li xi', 'tiền mừng tuổi', 'phát lì xì', 'mừng tuổi'], ['lì xì', 'mừng tuổi', 'đám cháu']],
    ['Sửa xe hư đồ', 11, ['sửa xe', 'sua xe', 'hư điện thoại', 'thay linh kiện', 'hỏng xe'], ['sửa xe', 'hư đồ', 'hỏng máy']],
    ['Khám bệnh nhổ răng', 8, ['đi bệnh viện', 'kham benh', 'tiền thuốc', 'nhổ răng khôn', 'viện phí'], ['khám bệnh', 'viện phí', 'nhổ răng']],
    ['Đóng quỹ hội nhóm', 6, ['tiền quỹ', 'dong quy', 'quỹ chung', 'chia tiền hội', 'thu quỹ'], ['tiền quỹ', 'đóng quỹ', 'góp quỹ']],
  ]),

  q('ff_b011', CAT_MONEY, 'Tuyệt chiêu giấu quỹ đen kinh điển của hội sợ vợ hoặc sợ mẹ tịch thu?', [
    ['Nhét ốp điện thoại', 34, ['giấu ốp đt', 'op dien thoai', 'kẹp sau điện thoại', 'op lung', 'nhét ốp'], ['ốp điện thoại', 'ốp lưng', 'kẹp sau']],
    ['Chuyển tài khoản phụ', 24, ['chuyển momo', 'tai khoan an', 'cất vào thẻ', 'vi dien tu', 'ngân hàng ẩn'], ['tài khoản ẩn', 'ví điện tử', 'momo']],
    ['Kẹp trong sách cũ', 17, ['khe tủ sách', 'kep sach', 'giấu trong vở', 'hộc tủ bí mật', 'kẹp trang'], ['sách cũ', 'khe tủ', 'giấu vở']],
    ['Giấu dưới nệm giường', 12, ['giấu dưới gối', 'duoi nem', 'gầm giường', 'khe tủ quần áo', 'nhét gối'], ['dưới nệm', 'dưới gối', 'gầm giường']],
    ['Đổi sang chỉ vàng', 8, ['mua chỉ vàng', 'mua vang', 'đổi đô la', 'cất vàng', 'doi tien do'], ['chỉ vàng', 'mua vàng', 'tiền đô']],
    ['Nhờ bạn giữ hộ', 5, ['gửi đứa bạn', 'nho ban giu', 'nhờ giữ hộ', 'cất nhà bạn', 'gui ban'], ['bạn giữ', 'gửi nhờ', 'giữ hộ']],
  ]),

  q('ff_b012', CAT_MONEY, 'Dấu hiệu tố cáo một đứa đang "sống ảo quá lố" trên Facebook/TikTok?', [
    ['Chỉnh méo cột điện', 35, ['bóp mặt méo tường', 'photoshop quá đà', 'meo cot dien', 'kéo chân 2m', 'chinh anh lo'], ['méo cột điện', 'méo tường', 'kéo chân']],
    ['Khác xa cam thường', 23, ['mở filter ảo', 'khac ngoai doi', 'app gánh còng lưng', 'cam thường vỡ mộng', 'lọc mặt'], ['filter ảo', 'cam thường', 'ngoài đời']],
    ['Viết cap tiếng Anh', 16, ['caption triết lý', 'viet dao ly', 'cap sến', 'copy google dịch', 'cap tieng anh'], ['caption', 'tiếng anh', 'sáo rỗng']],
    ['Đồ fake gắn tag', 12, ['gắn tag hàng hiệu', 'khoe do fake', 'hang fake tag real', 'tag gucci', 'đồ dỏm'], ['đồ fake', 'gắn tag', 'hàng hiệu']],
    ['Khoe cọc tiền lẻ', 8, ['kẹp tờ 500k ngoài', 'tien don giay', 'cọc tiền giả', 'khoe tien ao', 'kẹp tiền'], ['tiền lẻ', 'độn giấy', 'tiền giả']],
    ['Lấy ảnh mạng đăng', 6, ['xài ảnh cũ', 'anh pinterest', 'cóp ảnh người khác', 'anh mang', 'check in ảo'], ['ảnh mạng', 'pinterest', 'cóp ảnh']],
  ]),

  q('ff_b013', CAT_MONEY, 'Món đồ nào dân nghiện mua sắm hay chốt đơn về rồi vứt xó đóng bụi?', [
    ['Máy chạy bộ', 35, ['máy tập thể dục', 'may chay bo', 'dụng cụ tập gym', 'tạ tay tại nhà', 'máy đạp xe'], ['chạy bộ', 'tập gym', 'máy tập']],
    ['Đàn guitar cũ', 23, ['đàn guitar', 'dan piano', 'nhạc cụ', 'đàn ukulele', 'sáo trúc'], ['guitar', 'nhạc cụ', 'ukulele']],
    ['Sách tự học', 16, ['sách tiếng anh', 'sach day lam giau', 'sách mua về ngắm', 'sach cu', 'truyện chưa đọc'], ['sách', 'tiếng anh', 'chưa đọc']],
    ['Thảm tập yoga', 12, ['đồ tập yoga', 'tham yoga', 'vòng lắc eo', 'dây nhảy thể dục', 'dụng cụ yoga'], ['yoga', 'thảm tập', 'lắc eo']],
    ['Nồi chiên không dầu', 8, ['nồi chiên', 'noi chien khong dau', 'lò nướng mini', 'máy làm bánh', 'đồ bếp'], ['nồi chiên', 'lò nướng', 'máy làm bánh']],
    ['Máy ép trái cây', 6, ['máy xay sinh tố', 'may ep cham', 'máy làm sữa hạt', 'may ep', 'máy pha cà phê'], ['máy ép', 'sinh tố', 'sữa hạt']],
  ]),

  q('ff_b014', CAT_MONEY, 'Món đồ đắt tiền nào dân mình hay mua trả góp 12 tháng dù lương bèo?', [
    ['Điện thoại iPhone', 38, ['iphone', 'điện thoại xịn', 'smartphone', 'sắm táo', 'dien thoai'], ['iphone', 'điện thoại', 'smartphone']],
    ['Xe máy tay ga', 22, ['xe máy', 'mua xe ga', 'xe sh', 'exciter', 'xe may'], ['xe máy', 'tay ga', 'xe sh']],
    ['Laptop cấu hình cao', 15, ['máy tính', 'mua laptop', 'build pc', 'macbook', 'laptop'], ['laptop', 'macbook', 'build pc']],
    ['Tivi máy lạnh', 11, ['đồ điện máy', 'may lanh', 'tủ lạnh', 'tivi to', 'điều hòa'], ['tivi', 'tủ lạnh', 'máy lạnh']],
    ['Robot hút bụi', 8, ['máy rửa bát', 'nồi chiên', 'gia dụng', 'may hut bui', 'đồ nhà bếp'], ['robot hút bụi', 'máy rửa bát', 'gia dụng']],
    ['Đồng hồ trang sức', 6, ['nhẫn vàng', 'mua vang', 'đồng hồ đắt', 'dây chuyền', 'dong ho'], ['trang sức', 'đồng hồ', 'nhẫn vàng']],
  ]),

  q('ff_b015', CAT_MONEY, 'Lý do ngớ ngẩn nhất khiến lương vừa về 3 ngày đã bay sạch không còn xu?', [
    ['Trả nợ tháng trước', 35, ['trả nợ cũ', 'tra gop', 'đóng tiền nợ', 'trả thẻ tín dụng', 'tra no'], ['trả nợ', 'trả góp', 'nợ cũ']],
    ['Săn sale chốt đơn', 24, ['mua đồ shopee', 'san sale', 'đặt hàng online', 'tiktok shop', 'mua sam'], ['săn sale', 'chốt đơn', 'shopee']],
    ['Ăn sang bù đói', 16, ['ăn uống thả ga', 'an sang bu', 'đi ăn buffet', 'tự thưởng đồ ăn', 'ăn ngon'], ['ăn sang', 'bù đói', 'buffet']],
    ['Đóng tiền nhà trọ', 11, ['tiền phòng', 'tien dien nuoc', 'hóa đơn tháng', 'tiền mạng', 'tien nha'], ['tiền trọ', 'điện nước', 'tiền phòng']],
    ['Trà sữa cà phê', 8, ['uống trà sữa', 'tra sua', 'đặt nước mỗi ngày', 'nghiện trà sữa', 'ca phe'], ['trà sữa', 'cà phê', 'uống nước']],
    ['Nạp game mua skin', 6, ['nạp thẻ game', 'nap game', 'mua skin', 'quay gacha', 'nạp quân huy'], ['nạp game', 'mua skin', 'gacha']],
  ]),

  q('ff_b016', CAT_MONEY, 'Dân sống ảo hay chọn địa điểm nào để check-in tỏ vẻ thượng lưu?', [
    ['Trung tâm thương mại', 33, ['vincom', 'tttm', 'takashimaya', 'landmark 81', 'sảnh mall'], ['trung tâm thương mại', 'vincom', 'landmark']],
    ['Quán cà phê sang', 25, ['quán cafe đẹp', 'cf sang chanh', 'cà phê rooftop', 'quán trà chiều', 'cafe view'], ['cà phê', 'rooftop', 'trà chiều']],
    ['Bãi đỗ siêu xe', 17, ['cạnh siêu xe', 'hầm gửi xe', 'showroom ô tô', 'bai do xe', 'chụp ké ô tô'], ['bãi đỗ', 'siêu xe', 'showroom']],
    ['Hồ bơi resort', 11, ['bể bơi vô cực', 'ho boi khach san', 'resort 5 sao', 'bồn tắm khách sạn', 'ho boi'], ['hồ bơi', 'bể bơi', 'resort']],
    ['Cửa hàng đồ hiệu', 8, ['tiệm gucci', 'shop đồ hiệu', 'cửa hàng luxury', 'thử đồ sang', 'store hiệu'], ['đồ hiệu', 'luxury', 'gucci']],
    ['Sân bay máy bay', 6, ['check in sân bay', 'san bay', 'cửa sổ máy bay', 'phòng chờ thương gia', 'may bay'], ['sân bay', 'máy bay', 'thương gia']],
  ]),

  q('ff_b017', CAT_MONEY, 'Nhận phong bì lì xì mỏng dính từ người giàu nứt vách, bạn thầm nghĩ gì?', [
    ['Keo kiệt vãi chưởng', 35, ['keo kiệt', 'keo kiet', 'ki bo', 'bủn xỉn', 'giàu mà kẹo'], ['keo kiệt', 'ki bo', 'bủn xỉn']],
    ['Méo mó hơn không', 23, ['có còn hơn không', 'co con hon khong', 'đỡ hơn không có', 'lấy hên', 'thôi kệ'], ['méo mó', 'hơn không', 'lấy hên']],
    ['Mong tờ 500k gấp', 16, ['hy vọng tờ to', 'mong 500k', 'biết đâu tờ xanh', 'gấp nhỏ bên trong', 'cầu tờ 500'], ['tờ 500k', 'tờ to', 'gấp nhỏ']],
    ['Thất vọng hụt hẫng', 12, ['hụt hẫng', 'that vong', 'tụt mood', 'buồn thúi ruột', 'tưởng nhiều'], ['thất vọng', 'hụt hẫng', 'tụt mood']],
    ['Chắc đang thua lỗ', 8, ['chắc đang kẹt', 'thua lo', 'năm nay khó khăn', 'làm ăn kém', 'hết tiền'], ['thua lỗ', 'khó khăn', 'làm ăn kém']],
    ['Ghi thù lần sau', 6, ['bài học nhớ đời', 'lần sau lì xì ít', 'biết mặt nhau', 'để bụng', 'nhớ mặt'], ['ghi thù', 'để bụng', 'nhớ mặt']],
  ]),

  q('ff_b018', CAT_MONEY, 'Cái bẫy tài chính nào khiến giới trẻ đâm đầu vào rồi khóc ròng vì nợ?', [
    ['Ví trả sau', 35, ['mua trước trả sau', 'vi tra sau', 'spaylater', 'momo trả sau', 'kredivo'], ['trả sau', 'spaylater', 'kredivo']],
    ['Quẹt thẻ tín dụng', 23, ['the tin dung', 'nợ thẻ', 'rút tiền thẻ', 'credit card', 'vung tay'], ['thẻ tín dụng', 'quẹt thẻ', 'credit']],
    ['Tiền ảo lùa gà', 16, ['chơi coin', 'tien ao', 'chứng khoán lùa gà', 'crypto', 'sàn bo'], ['tiền ảo', 'chơi coin', 'crypto']],
    ['Vay app tín dụng', 12, ['vay app', 'tin dung den', 'vay nóng online', 'lãi cắt cổ', 'app đòi nợ'], ['vay app', 'tín dụng đen', 'lãi cắt cổ']],
    ['Chơi hụi vỡ nợ', 8, ['chơi hụi', 'choi hui', 'bể hụi', 'đóng hụi', 'gop ho'], ['chơi hụi', 'bể hụi', 'góp họ']],
    ['Độ xe nuôi boss', 6, ['độ xe', 'do xe', 'nuôi mèo cảnh', 'nuôi chó đắt', 'sưu tầm mô hình'], ['độ xe', 'mô hình', 'nuôi mèo']],
  ]),

  q('ff_b019', CAT_MONEY, 'Hành động keo kiệt đi vào lòng đất khi đi ăn nhóm khiến cả hội muốn đuổi?', [
    ['Chia lẻ từng 500đ', 33, ['tính từng đồng', 'chia le 500d', 'so đo từng nghìn', 'chia bill chi li', 'chia tiền lẻ'], ['tiền lẻ', 'từng đồng', '500đ', 'chi li']],
    ['Ăn xong lặn quỵt', 25, ['ăn chùa', 'quyt tien', 'lờ phần mình', 'trốn đóng tiền', 'ăn xong chuồn'], ['quỵt tiền', 'ăn chùa', 'ăn xong chuồn']],
    ['Quên chuyển khoản', 17, ['hứa ck xong bơ', 'quen chuyen khoan', 'bùng tiền nhóm', 'lờ chuyển khoản', 'chuyển sau'], ['chuyển khoản', 'quên trả', 'bùng tiền']],
    ['Ăn ké không mời', 11, ['chỉ nhận không cho', 'chua bao gio moi', 'bào bạn', 'ăn bám nhóm', 'kẹo kéo'], ['ăn ké', 'không mời', 'bào bạn']],
    ['Mang nước riêng vào', 8, ['lén đem nước riêng', 'khong goi mon', 'uống nước lọc', 'né góp tiền món', 'mang đồ ăn theo'], ['nước riêng', 'không gọi', 'né góp']],
    ['Ăn chặn tiền dư', 6, ['ôm bill ăn chênh lệch', 'lay ma giam gia', 'thu dư tiền bạn', 'tính khống tiền', 'an chan'], ['ăn chặn', 'tính khống', 'thu dư']],
  ]),

  q('ff_b020', CAT_MONEY, 'Trên livestream bán hàng, chiêu trò phông bạt nào khiến người xem ngứa mắt?', [
    ['Chốt đơn ảo giả', 34, ['đơn hàng giả', 'bom hàng giả', 'chất đống hộp rỗng', 'don ao', 'tự đặt tự chốt'], ['đơn ảo', 'hộp rỗng', 'tự chốt']],
    ['Khóc lóc giả trân', 23, ['khóc giả', 'khoc loc', 'kể khổ bán lỗ', 'làm lố xin tim', 'diễn sâu khóc'], ['khóc lóc', 'giả trân', 'diễn sâu']],
    ['Bấm nhầm giá lỗ', 17, ['nhầm giá', 'bán lỗ vốn', 'gõ nhầm số 0', 'sập sàn giả', 'giam gia ao'], ['nhầm giá', 'lỗ vốn', 'sập sàn']],
    ['Đeo vàng giả lòe', 12, ['khoe vàng giả', 'vang gia', 'đeo dây chuyền to', 'hột xoàn giả', 'đồ mỹ ký'], ['vàng giả', 'mỹ ký', 'hột xoàn']],
    ['Đếm tiền âm phủ', 8, ['tiền giả', 'tien am phu', 'cầm xấp tiền quay clip', 'tiền đạo cụ', 'khoe cọc tiền'], ['tiền giả', 'âm phủ', 'đạo cụ']],
    ['Nổ doanh thu tỷ', 6, ['nổ doanh thu', 'chém gió tiền tỷ', 'bốc phét nghìn đơn', 'no doanh thu', 'thu nhập tỷ đồng'], ['doanh thu', 'tiền tỷ', 'bốc phét']],
  ]),

  q('ff_b021', CAT_MONEY, 'Bỗng dưng được trả món nợ cũ từ 3 năm trước tưởng mất trắng, bạn làm gì?', [
    ['Đi ăn mừng ngay', 33, ['ăn ngon tự thưởng', 'an mung', 'khao bản thân', 'đi ăn lẩu nướng', 'làm bữa linh đình'], ['ăn mừng', 'tự thưởng', 'lẩu nướng']],
    ['Đơ người tưởng nhầm', 24, ['tưởng bị lừa', 'ngo ngang', 'kiểm tra kỹ tài khoản', 'tưởng tin nhắn giả', 'sốc nặng'], ['chuyển nhầm', 'ngỡ ngàng', 'kiểm tra']],
    ['Cất tiết kiệm liền', 17, ['bỏ ống tiết kiệm', 'cat ky', 'gửi tiết kiệm', 'cất vào két', 'để dành'], ['tiết kiệm', 'cất kỹ', 'để dành']],
    ['Mua món đồ thèm', 12, ['chốt đơn ngay', 'mua do moi', 'mua món thích', 'sắm đồ mới', 'vung tiền mua'], ['mua đồ', 'chốt đơn', 'sắm đồ']],
    ['Nghi sắp vay tiếp', 8, ['nghi có âm mưu', 'sap vay nua', 'đề phòng mượn tiếp', 'tưởng sắp nhờ vả', 'cảnh giác cao'], ['âm mưu', 'vay tiếp', 'cảnh giác']],
    ['Chụp bill khoe mạng', 6, ['khoe lên mạng', 'chup man hinh', 'đăng story ăn mừng', 'phép màu có thật', 'khoe kỳ tích'], ['chụp bill', 'kỳ tích', 'story']],
  ]),

  q('ff_b022', CAT_MONEY, 'Câu nói tự tẩy não kinh điển nhất giúp bạn vung tiền chốt đơn không chớp?', [
    ['Sắp hết sale rồi', 35, ['không mua hết sale', 'het size', 'chỉ còn 1 cái cuối', 'giá chỉ hôm nay', 'cháy hàng'], ['hết sale', 'hết size', 'cháy hàng']],
    ['Thanh xuân mấy khi', 23, ['sống cho hiện tại', 'thanh xuan', 'đời có mấy khi', 'hưởng thụ đi', 'yolo'], ['thanh xuân', 'hiện tại', 'yolo']],
    ['Đầu tư bản thân', 16, ['đầu tư cho mình', 'dau tu ban than', 'tiền mua tri thức', 'nâng cấp bản thân', 'khong lo'], ['bản thân', 'đầu tư', 'tri thức']],
    ['Tiền kiếm lại được', 12, ['tien kiem lai', 'tiêu đi rồi cày lại', 'hết rồi kiếm', 'cày lại mấy hồi', 'tiền làm ra'], ['kiếm lại', 'cày lại', 'làm ra']],
    ['Cơ hội có một', 8, ['cơ hội vàng', 'co hoi doi doi', 'chốt lẹ kẻo lỡ', 'bỏ lỡ hối hận', 'đổi đời'], ['cơ hội', 'kẻo lỡ', 'hối hận']],
    ['Tự thưởng xứng đáng', 6, ['mình xứng đáng', 'minh xung dang', 'cả tháng vất vả rồi', 'chiều chuộng bản thân', 'tự thưởng đi'], ['xứng đáng', 'tự thưởng', 'vất vả']],
  ]),

  q('ff_b023', CAT_MONEY, 'Khi bị chủ nợ réo tên đòi tiền dưới bài sống ảo, con nợ lầy làm gì?', [
    ['Xóa bình luận block', 36, ['xóa cmt', 'xoa binh luan', 'block chủ nợ', 'chặn ngay lập tức', 'ẩn bình luận'], ['xóa bình luận', 'block', 'ẩn comment']],
    ['Giả ngơ nhầm người', 22, ['giả vờ không quen', 'nham nguoi', 'hỏi ai vậy', 'đổ thừa bị hack', 'chối bay biến'], ['nhầm người', 'giả ngơ', 'ai vậy']],
    ['Chửi ngược mất mặt', 16, ['chửi ngược lại', 'chui chu no', 'trách làm mất mặt', 'nổi điên cãi lộn', 'dọa không trả'], ['chửi ngược', 'mất mặt', 'dọa không trả']],
    ['Khóa trang cá nhân', 12, ['khóa facebook', 'an bai dang', 'chuyển riêng tư', 'tạm khóa nick', 'khoa trang'], ['khóa trang', 'ẩn bài', 'riêng tư']],
    ['Kêu bị vu khống', 8, ['vu khong', 'bịa chuyện', 'diễn vai nạn nhân', 'chơi xấu nhau', 'bôi nhọ'], ['vu khống', 'bịa chuyện', 'nạn nhân']],
    ['Chuyển vội 100k', 6, ['trả vội một ít', 'xin go bai', 'chuyen 100k', 'năn nỉ xóa cmt', 'trả tạm ít'], ['100k', 'xin gỡ', 'trả vội']],
  ]),

  q('ff_b024', CAT_MONEY, 'Lúc hết sạch tiền nhưng vẫn sĩ diện với người yêu mới, đàn ông làm trò gì?', [
    ['Vay nóng bạn bè', 35, ['mượn tiền bạn', 'vay nong', 'vay nóng anh em', 'nhắn bạn bắn gấp', 'muon tien'], ['vay nóng', 'mượn bạn', 'bắn gấp']],
    ['Quẹt thẻ tín dụng', 23, ['cà thẻ', 'the tin dung', 'dùng thẻ trả sau', 'spaylater', 'credit'], ['thẻ tín dụng', 'quẹt thẻ', 'cà thẻ']],
    ['Chọn quán giá rẻ', 16, ['rủ ăn vỉa hè', 'an cho re', 'kêu quán này ngon lắm', 'né nhà hàng sang', 'chọn quán bình dân'], ['giá rẻ', 'vỉa hè', 'bình dân']],
    ['Vờ mới ăn no', 12, ['nói ăn rồi', 'moi an no', 'kêu không đói', 'nhường người yêu ăn', 'ngồi nhìn uống nước'], ['ăn no', 'không đói', 'uống nước']],
    ['Cắm xe cắm máy', 8, ['cầm đồ', 'cam xe', 'cắm điện thoại', 'bốc bát họ', 'tiệm cầm đồ'], ['cầm đồ', 'cắm xe', 'cắm máy']],
    ['Bán đồ cũ lấp', 6, ['pass đồ gấp', 'ban do cu', 'thanh lý giày đồng hồ', 'bán acc game', 'bán đồ'], ['bán đồ', 'pass đồ', 'thanh lý']],
  ]),

  q('ff_b025', CAT_MONEY, 'Bị lừa mất tiền qua mạng nhưng ngại không dám kể ai, thường vì lý do gì?', [
    ['Sợ bị chửi ngu', 36, ['sợ quê', 'so bi chui ngu', 'mất mặt với mọi người', 'ngại bạn bè cười', 'chửi ngu'], ['chửi ngu', 'mất mặt', 'sợ quê']],
    ['Dính bẫy gạ tình', 22, ['lừa tình', 'ga tinh', 'clip nhạy cảm', 'tống tiền ảnh nóng', 'gái lạ gạ'], ['gạ tình', 'lừa tình', 'tống tiền']],
    ['Ham việc nhẹ lương', 16, ['việc nhẹ lương cao', 'viec nhe luong cao', 'tham hoa hồng', 'làm nhiệm vụ chốt đơn', 'tham tiền'], ['việc nhẹ', 'lương cao', 'hoa hồng']],
    ['Mất ít ngại báo', 12, ['tiền ít quá', 'mat it', 'coi như bài học', 'làm biếng trình báo', 'ngại phiền'], ['mất ít', 'bài học', 'ngại phiền']],
    ['Dính web cờ bạc', 8, ['cá độ online', 'co bac mang', 'tài xỉu nổ hũ', 'đánh bạc', 'web lậu'], ['cờ bạc', 'cá độ', 'tài xỉu']],
    ['Sợ gia đình mắng', 6, ['sợ bố mẹ biết', 'so me mang', 'giấu vợ giấu chồng', 'sợ bị chửi ở nhà', 'sợ vợ biết'], ['gia đình mắng', 'bố mẹ biết', 'sợ vợ']],
  ]),

  q('ff_b026', CAT_MONEY, 'Đầu tháng vừa ting ting tiền lương, phản ứng chân thật của dân văn phòng?', [
    ['Chuyển trả nợ hết', 35, ['trả nợ ngay', 'tra no', 'thanh toán thẻ tín dụng', 'đóng tiền trọ nợ nần', 'tra gop'], ['trả nợ', 'thanh toán', 'đóng tiền']],
    ['Đặt đồ ăn mừng', 23, ['order trà sữa', 'dat do an', 'khao bản thân bữa ngon', 'đi ăn buffet', 'ăn lẩu nướng'], ['ăn mừng', 'trà sữa', 'buffet']],
    ['Chốt hết giỏ hàng', 16, ['thanh toán shopee', 'chot don', 'mua sạch giỏ hàng', 'sắm đồ mới', 'tiktok shop'], ['giỏ hàng', 'chốt đơn', 'shopee']],
    ['Gửi tiền cho mẹ', 12, ['chuyển về quê', 'gui me', 'biếu bố mẹ', 'phụ gia đình', 'cho mẹ'], ['gửi mẹ', 'biếu bố mẹ', 'về quê']],
    ['Chụp số dư khoe', 8, ['chup man hinh', 'khoe lương', 'đăng story ting ting', 'ngắm số dư 5 phút', 'ting ting'], ['số dư', 'ting ting', 'khoe lương']],
    ['Chớp mắt hết tiền', 6, ['lương đi qua ví', 'het sach tien', '5 phút về 0 đồng', 'một tiếng bay sạch', 'lại ăn mì'], ['hết tiền', 'bay sạch', '0 đồng']],
  ]),

  // =========================================================================
  // 2. GIA ĐÌNH, TẾT & HÀNG XÓM NHIỀU CHUYỆN (ff_b027 – ff_b052)
  // =========================================================================
  q('ff_b027', CAT_FAMILY, 'Câu hỏi "tử thần" của họ hàng ngày Tết khiến đám trẻ chỉ muốn độn thổ?', [
    ['Bao giờ kết hôn?', 38, ['bao giờ lấy vợ', 'lay chong', 'chừng nào cưới', 'khi nào lập gia đình', 'bao giờ cưới'], ['lấy vợ', 'lấy chồng', 'kết hôn', 'cưới']],
    ['Lương tháng bao nhiêu?', 22, ['lương bao nhiêu', 'luong thang', 'kiếm mấy chục củ', 'thưởng tết nhiều không', 'thu nhập'], ['lương tháng', 'thưởng tết', 'thu nhập']],
    ['Có người yêu chưa?', 15, ['có bồ chưa', 'co nguoi yeu chua', 'ra mắt đi', 'ế tới bao giờ', 'có mối chưa'], ['người yêu', 'có bồ', 'ra mắt']],
    ['Sao dạo này mập?', 11, ['béo lên thế', 'dao nay map', 'gầy thế', 'đen đi nhiều', 'xuống sắc'], ['mập', 'béo', 'xuống sắc']],
    ['Mua nhà xe chưa?', 8, ['sắm nhà chưa', 'mua o to chua', 'có đất chưa', 'tậu xe chưa', 'mua nhà'], ['mua nhà', 'mua xe', 'ô tô']],
    ['Bao giờ sinh con?', 6, ['khi nào có bầu', 'bao gio de', 'làm tập hai đi', 'sinh cháu đi', 'bao giờ đẻ'], ['sinh con', 'đẻ thêm', 'có bầu']],
  ]),

  q('ff_b028', CAT_FAMILY, 'Mẹ gọi dậy dọn nhà Tết từ 6 giờ sáng, chiêu trốn việc kinh điển nhất là gì?', [
    ['Giả vờ ngủ say', 35, ['nằm lì trên giường', 'gia vo ngu', 'kéo chăn trùm đầu', 'ngủ nướng', 'không thưa'], ['ngủ say', 'ngủ nướng', 'trùm chăn']],
    ['Ôm máy giả bận', 23, ['vờ chạy deadline', 'gia vo hoc', 'bận làm việc', 'ôm laptop trốn', 'đang họp'], ['giả vờ học', 'ôm máy', 'deadline']],
    ['Giả đau bụng ốm', 16, ['đau bụng', 'gia om', 'mệt trong người', 'chóng mặt', 'đau đầu'], ['giả ốm', 'đau bụng', 'chóng mặt']],
    ['Xung phong đi chợ', 12, ['chạy đi mua đồ', 'di cho giup', 'lấy cớ ra ngoài', 'đi cắt tóc', 'đi rửa xe'], ['đi chợ', 'mua đồ', 'cắt tóc']],
    ['Chuồn ra ngoài chơi', 9, ['đi chơi sáng sớm', 'tron biet', 'qua nhà bạn trốn', 'trưa mới về', 'lượn phố'], ['trốn biệt', 'qua nhà bạn', 'lượn phố']],
    ['Đùn đẩy anh em', 5, ['sai em làm', 'dun day', 'kêu anh làm đi', 'tị nạnh việc', 'đổ cho đứa khác'], ['đùn đẩy', 'tị nạnh', 'sai em']],
  ]),

  q('ff_b029', CAT_FAMILY, '"Vũ khí sát thương" kinh dị nhất của bà hàng xóm nhiều chuyện đầu ngõ?', [
    ['Soi mói cả ngày', 35, ['camera chạy bằng cơm', 'soi moi', 'nhìn trộm', 'ngồi canh trước cửa', 'dòm ngó'], ['camera', 'soi mói', 'dòm ngó']],
    ['Bịa chuyện đồn bậy', 24, ['nói xấu sau lưng', 'buon dua le', 'đồn bậy', 'miệng lưỡi điêu ngoa', 'nói móc'], ['đồn bậy', 'nói xấu', 'bịa chuyện']],
    ['Hát loa kẹo kéo', 16, ['hát karaoke', 'loa keo keo', 'mở nhạc ầm ĩ', 'tra tấn lỗ tai', 'karaoke'], ['karaoke', 'loa kẹo kéo', 'ầm ĩ']],
    ['Khoe con so sánh', 11, ['khoe con', 'so sanh', 'con nhà người ta', 'khoe lương con', 'gáy thành tích'], ['khoe con', 'so sánh', 'thành tích']],
    ['Nuôi chó ị bậy', 8, ['chó thả rông', 'cho i bay', 'chó sủa ầm', 'chó phóng uế', 'cho hang xom'], ['chó thả rông', 'ị bậy', 'phóng uế']],
    ['Quét rác sang nhà', 6, ['quét rác sang', 'vut rac', 'đổ nước bẩn', 'lấn chiếm lối đi', 'hất rác'], ['quét rác', 'hất rác', 'nước bẩn']],
  ]),

  q('ff_b030', CAT_FAMILY, 'Lúc mẹ đang nổi điên cầm chổi, câu nói nào của bạn khiến đòn roi nặng gấp đôi?', [
    ['Cãi tay đôi lại', 34, ['cãi lại', 'cai tay doi', 'trả treo', 'lý sự cùn', 'cãi ngang'], ['cãi lại', 'cãi tay đôi', 'trả treo']],
    ['Đổ lỗi tại mẹ', 24, ['tại mẹ chứ ai', 'con co lam gi dau', 'tại mẹ đẻ con ra', 'không phải lỗi con', 'tai me'], ['tại mẹ', 'đổ lỗi', 'làm gì đâu']],
    ['Cười khẩy nhếch mép', 17, ['thai do loi lom', 'liếc xéo', 'nhếch mép', 'lườm mẹ', 'mặt câng câng'], ['nhếch mép', 'cười khẩy', 'lồi lõm']],
    ['Thách đánh bỏ nhà', 12, ['thách đánh', 'bo nha di', 'ngon đánh đi', 'dọa bỏ đi', 'đánh chết đi'], ['bỏ nhà đi', 'thách đánh', 'ngon đánh']],
    ['So sánh mẹ bạn', 8, ['mẹ người ta hiền hơn', 'so sanh me', 'khen mẹ bạn', 'chê mẹ', 'so bì'], ['so sánh mẹ', 'mẹ bạn', 'chê mẹ']],
    ['Im lặng bấm máy', 5, ['bấm điện thoại', 'bam dt', 'lơ mẹ luôn', 'đeo tai nghe', 'quay lưng đi'], ['điện thoại', 'lơ luôn', 'tai nghe']],
  ]),

  q('ff_b031', CAT_FAMILY, 'Món ăn ngày Tết nào cứ tới mùng 4 là cả nhà nhìn thấy chỉ muốn bỏ chạy?', [
    ['Thịt kho hột vịt', 36, ['thịt kho tàu', 'thit kho hot vit', 'nồi thịt kho', 'thịt kho trứng', 'thit kho'], ['thịt kho', 'hột vịt', 'kho tàu']],
    ['Bánh chưng rán mỡ', 24, ['bánh chưng', 'banh tet', 'bánh chưng chiên', 'bánh tét rán', 'ngấy bánh chưng'], ['bánh chưng', 'bánh tét', 'rán mỡ']],
    ['Gà luộc chặt sẵn', 16, ['gà luộc', 'ga luoc', 'gà cúng', 'gà xé phay', 'thịt gà khô'], ['gà luộc', 'gà cúng', 'gà khô']],
    ['Giò chả cắt khoanh', 11, ['chả lụa', 'gio lua', 'giò thủ', 'giò xào', 'gio cha'], ['giò chả', 'chả lụa', 'giò thủ']],
    ['Canh khổ qua măng', 8, ['canh khổ qua', 'canh mang', 'măng khô', 'canh bóng', 'kho qua'], ['khổ qua', 'canh măng', 'măng khô']],
    ['Mứt Tết ngọt gắt', 5, ['mứt dừa', 'mut tet', 'mứt bí', 'kẹo mứt', 'mut gung'], ['mứt tết', 'mứt dừa', 'mứt bí']],
  ]),

  q('ff_b032', CAT_FAMILY, '"Siêu năng lực" vô lý nhưng có thật 100% của các bà mẹ Việt Nam?', [
    ['Tìm đồ thấy ngay', 36, ['tìm đồ siêu nhanh', 'tim do', 'kiếm đồ thần thánh', 'chỉ phát thấy luôn', 'mắt thần'], ['tìm đồ', 'thấy ngay', 'mắt thần']],
    ['Nhớ dai lỗi cũ', 22, ['nhớ dai', 'nho lau', 'nhớ lỗi 10 năm', 'nhắc lỗi xưa', 'kể lại chuyện cũ'], ['nhớ dai', 'lỗi cũ', 'chuyện xưa']],
    ['Vừa chửi vừa lo', 16, ['miệng chửi tay gọt trái cây', 'got hoa qua', 'nấu cơm cho ăn', 'khẩu xà tâm phật', 'gọt trái cây'], ['gọt trái cây', 'vừa chửi', 'khẩu xà']],
    ['Nghe tiếng xe biết', 12, ['nghe tiếng bô xe', 'tieng xe may', 'tai thính như radar', 'nghe bước chân', 'tiếng cửa'], ['tiếng xe', 'tai thính', 'bước chân']],
    ['Nắm hết tin xóm', 8, ['đi chợ biết hết', 'tin tuc xom', 'hóng chuyện siêu nhanh', 'mạng lưới tình báo', 'tình báo'], ['tin xóm', 'đi chợ', 'tình báo']],
    ['Đau khớp báo bão', 6, ['dự báo thời tiết', 'du bao', 'đau lưng báo mưa', 'khớp gối báo bão', 'đoán nắng mưa'], ['thời tiết', 'đau khớp', 'báo mưa']],
  ]),

  q('ff_b033', CAT_FAMILY, 'Thứ gì trong nhà mẹ cấm tuyệt đối không được xài trừ khi có khách quý?', [
    ['Bộ ấm chén xịn', 35, ['bộ bát đĩa xịn', 'am chen', 'chén dĩa đẹp', 'đồ sứ tủ kính', 'bat dia'], ['ấm chén', 'bát đĩa', 'tủ kính']],
    ['Bánh kẹo rượu ngoại', 23, ['bánh kẹo ngoại', 'ruou ngoai', 'hộp bánh danisa', 'giỏ quà tết', 'banh keo'], ['bánh kẹo', 'rượu ngoại', 'danisa']],
    ['Ga giường khăn mới', 16, ['chăn ga gối mới', 'khan tam moi', 'chiếu mới', 'ga trải giường', 'do moi'], ['ga giường', 'khăn tắm', 'chăn ga']],
    ['Ghế sofa phòng khách', 12, ['ghế sofa mới', 'ghe phong khach', 'bọc nilon ghế', 'khăn trải bàn', 'sofa'], ['ghế sofa', 'bọc nilon', 'phòng khách']],
    ['Trái cây bàn thờ', 8, ['đồ cúng bàn thờ', 'trai cay cung', 'xoài ngon', 'hoa quả ngon', 'lộc bàn thờ'], ['bàn thờ', 'trái cây', 'đồ cúng']],
    ['Thùng bia nước ngọt', 6, ['thùng bia tết', 'nuoc ngot', 'coca pepsi', 'nước yến', 'bia ngon'], ['nước ngọt', 'thùng bia', 'nước yến']],
  ]),

  q('ff_b034', CAT_FAMILY, 'Đứa "con nhà người ta" trong miệng phụ huynh hay có thành tích hư cấu nào?', [
    ['Lương trăm triệu', 35, ['kiếm nhiều tiền', 'kiem nhieu tien', 'nuôi cả nhà', 'giàu nứt vách', 'thu nhập khủng'], ['trăm triệu', 'lương khủng', 'nuôi nhà']],
    ['Học bổng du học', 23, ['học giỏi top 1', 'hoc gioi', 'thủ khoa', 'bằng giỏi trường top', 'du học sinh'], ['học bổng', 'thủ khoa', 'du học']],
    ['Ngoan làm việc nhà', 16, ['ngoan ngoãn', 'lam viec nha', 'nấu ăn ngon', 'hiếu thảo số 1', 'chăm chỉ'], ['ngoan hiền', 'việc nhà', 'hiếu thảo']],
    ['Sắp cưới nhà giàu', 12, ['lấy chồng giàu', 'cuoi nha giau', 'người yêu hoàn hảo', 'chồng đại gia', 'cưới giàu'], ['cưới giàu', 'đại gia', 'hoàn hảo']],
    ['Mua nhà mua xe', 8, ['mua nhà sớm', 'mua o to', '25 tuổi mua chung cư', 'tậu xe hơi', 'có nhà riêng'], ['mua nhà', 'mua xe', 'chung cư']],
    ['Không chơi game đêm', 6, ['không chơi game', 'khong di choi dem', 'sống lành mạnh', 'ngủ sớm dậy sớm', 'trai ngoan'], ['không game', 'lành mạnh', 'ngủ sớm']],
  ]),

  q('ff_b035', CAT_FAMILY, 'Hàng xóm mở loa kẹo kéo tra tấn lúc 10 giờ đêm, cả xóm thầm cầu mong điều gì?', [
    ['Mất điện cả khu', 34, ['cúp điện', 'mat dien', 'mất điện ngay', 'rớt cầu dao', 'cup dien'], ['mất điện', 'cúp điện', 'cầu dao']],
    ['Cháy loa hết pin', 23, ['hỏng loa', 'chay loa', 'micro hết pin', 'loa tắt ngúm', 'đứt dây điện'], ['cháy loa', 'hết pin', 'hỏng loa']],
    ['Công an tới hốt', 17, ['công an phường', 'cong an phuong', 'dân phòng dẹp', 'bị phạt tiếng ồn', 'tịch thu loa'], ['công an', 'dân phòng', 'tịch thu']],
    ['Trời đổ mưa bão', 12, ['trời mưa to', 'mua bao', 'sấm sét đánh', 'mưa giông ập tới', 'mua to'], ['mưa to', 'mưa bão', 'sấm sét']],
    ['Khàn giọng tắt tiếng', 8, ['mất giọng', 'khan tieng', 'đau họng nghỉ hát', 'hụt hơi', 'tắt tiếng'], ['khàn giọng', 'mất giọng', 'tắt tiếng']],
    ['Bị vợ ra chửi', 6, ['vợ ra chửi', 'bà vợ tắt loa', 'rút phích cắm', 'bị vợ mắng', 'vo chui'], ['vợ chửi', 'tắt loa', 'rút phích']],
  ]),

  q('ff_b036', CAT_FAMILY, 'Món đồ nào hay mất tích bí ẩn lúc dọn nhà Tết rồi tự dưng lòi ra sau rằm?', [
    ['Điều khiển tivi', 33, ['remote tivi', 'dieu khien', 'cái bấm tivi', 'remote điều hòa', 'remote'], ['điều khiển', 'remote', 'máy lạnh']],
    ['Chìa khóa xe tủ', 24, ['chìa khóa', 'chia khoa xe', 'chùm chìa khóa', 'chìa khóa nhà', 'chia khoa'], ['chìa khóa', 'chùm chìa', 'khóa xe']],
    ['Một chiếc tất dép', 17, ['chiếc dép', 'chiec tat', 'vớ mất một chiếc', 'dép lào', 'mất dép'], ['chiếc dép', 'chiếc tất', 'mất một chiếc']],
    ['Tiền lẻ túi quần', 12, ['tiền bỏ quên', 'tien trong tui ao', 'tờ tiền cũ', 'phong bì quên mở', 'tien le'], ['tiền lẻ', 'túi quần', 'bỏ quên']],
    ['Cây kéo bấm móng', 8, ['cái kéo', 'bam mong tay', 'đồ cắt móng', 'nhíp nhổ lông', 'cai keo'], ['cây kéo', 'bấm móng', 'cắt móng']],
    ['Cục sạc điện thoại', 6, ['dây sạc', 'cuc sac', 'sạc dự phòng', 'cáp sạc', 'day sac'], ['cục sạc', 'dây sạc', 'cáp sạc']],
  ]),

  q('ff_b037', CAT_FAMILY, 'Cách đối phó lầy lội nhất khi họ hàng hỏi "Tháng này lương nhiêu, thưởng mấy củ?"?', [
    ['Cười trừ lảng đi', 34, ['đánh trống lảng', 'cuoi tru', 'bỏ đi rót trà', 'né câu hỏi', 'lảng đi'], ['cười trừ', 'lảng đi', 'né câu hỏi']],
    ['Than nghèo sắp nghỉ', 23, ['than ít lắm', 'sap bi duoi viec', 'lương ba cọc', 'nợ ngập đầu', 'than ngheo'], ['than nghèo', 'thất nghiệp', 'ba cọc']],
    ['Hỏi vặn xin thêm', 17, ['bác cho cháu thêm à', 'bac cho them a', 'hỏi lương con bác', 'lì xì mấy củ', 'hỏi ngược'], ['cho thêm', 'hỏi ngược', 'lương con bác']],
    ['Chém gió trăm triệu', 12, ['nổ trăm triệu', 'chem gio', 'nói quá cho sợ', 'bịa lương tỷ', 'nổ tung trời'], ['chém gió', 'trăm triệu', 'nổ tung']],
    ['Trả lời đủ sống', 8, ['đủ ăn thôi', 'du song', 'tàm tạm ạ', 'cũng bình thường', 'đủ tiêu'], ['đủ sống', 'tàm tạm', 'đủ tiêu']],
    ['Cắm đầu lo ăn', 6, ['giả vờ bận ăn', 'gap do an', 'nhai liên tục', 'nhìn bát cơm', 'lo an'], ['bận ăn', 'cắm đầu', 'bát cơm']],
  ]),

  q('ff_b038', CAT_FAMILY, 'Khi mẹ bất ngờ kiểm tra phòng ngủ, thứ gì dễ khiến bạn "toát mồ hôi" bị chửi nhất?', [
    ['Quần áo bừa bộn', 35, ['phòng bừa bộn', 'quan ao bua bon', 'ổ chuột', 'quần áo chất đống', 'chăn không gấp'], ['bừa bộn', 'ổ chuột', 'chất đống']],
    ['Vỏ ly trà sữa', 23, ['vỏ đồ ăn', 'ly tra sua', 'rác gầm giường', 'bát đũa bẩn', 'vo snack'], ['trà sữa', 'vỏ snack', 'gầm giường']],
    ['Đống hộp hàng Shopee', 16, ['hộp shopee', 'hop hang online', 'quần áo nguyên mác', 'đống đồ mới sắm', 'don hang'], ['shopee', 'đơn hàng', 'hộp hàng']],
    ['Bài kiểm tra 0đ', 12, ['điểm kém', 'diem kem', 'giấy báo nợ', 'giấy mời phụ huynh', 'bao diem'], ['điểm kém', 'báo điểm', '0đ']],
    ['Thuốc lá vỏ bia', 9, ['bao thuốc lá', 'vape pod', 'chai bia vỏ lon', 'bật lửa', 'thuoc la'], ['thuốc lá', 'vape', 'vỏ lon']],
    ['Màn hình web 18+', 5, ['tab nhạy cảm', 'lich su web', 'phim 18+', 'game chưa tắt', 'web đen'], ['web đen', 'nhạy cảm', '18+']],
  ]),

  q('ff_b039', CAT_FAMILY, 'Thói quen "khó đỡ" nào của ông bố Việt Nam mỗi tối khiến cả nhà vừa bực vừa cười?', [
    ['Bật tivi rồi ngủ', 36, ['tivi xem bố', 'bat tivi roi ngu', 'cấm tắt tivi', 'ngáy khò khò', 'xem thời sự ngủ'], ['tivi', 'thời sự', 'ngáy']],
    ['Chửi trọng tài bóng', 22, ['xem đá bóng chửi', 'chui trong tai', 'la hét bóng đá', 'đá banh', 'binh luan vien'], ['bóng đá', 'trọng tài', 'đá banh']],
    ['Gửi tin giả Zalo', 16, ['chia sẻ tin giả', 'gui link tin gia', 'nhóm zalo gia đình', 'video nhảm', 'spam link'], ['tin giả', 'zalo', 'spam link']],
    ['Mở nhạc sáng sớm', 12, ['dậy sớm mở loa', 'nhac vang', 'bật thời sự 5h sáng', 'tập thể dục ồn', 'nhạc đỏ'], ['sáng sớm', 'nhạc vàng', 'mở loa']],
    ['Ốm lì không khám', 8, ['lì không đi khám', 'so benh vien', 'không uống thuốc', 'tự kêu khỏe lắm', 'li don'], ['đi khám', 'bệnh viện', 'uống thuốc']],
    ['Tắt đèn tiết kiệm', 6, ['tắt đèn tiết kiệm', 'tat quat', 'cằn nhằn tốn điện', 'tiết kiệm điện', 'tat dieu hoa'], ['tiết kiệm', 'tắt đèn', 'tốn điện']],
  ]),

  q('ff_b040', CAT_FAMILY, 'Khách tới chơi nhà mà bố mẹ bắt ra chào hỏi, cảnh sượng trân nào hay xảy ra nhất?', [
    ['Kể chuyện tè dầm', 33, ['kể chuyện hồi bé', 'te dam', 'chuyện ở truồng', 'bế hồi nhỏ', 'chuyen xua'], ['tè dầm', 'ở truồng', 'hồi bé']],
    ['Mẹ kể tật xấu', 25, ['bị mẹ bêu rếu', 'me beu reu', 'nói con lười biếng', 'chê con trước khách', 'ke xau'], ['kể xấu', 'bêu rếu', 'chê con']],
    ['Ngồi cười gượng đơ', 17, ['cười trừ sượng trân', 'cuoi guong', 'ngồi đơ như tượng', 'không biết nói gì', 'suong tran'], ['cười gượng', 'sượng trân', 'đứng đơ']],
    ['Quên cách xưng hô', 11, ['không biết gọi gì', 'quen ten khach', 'gọi nhầm chú bác', 'chào đại', 'xung ho'], ['xưng hô', 'quên tên', 'gọi nhầm']],
    ['Đẩy qua lại tiền', 8, ['khách cho lì xì', 'me bat tu choi', 'giả vờ không nhận', 'nhận tiền ngại', 'đẩy qua đẩy lại'], ['đẩy qua', 'lì xì', 'từ chối']],
    ['Chào xong chuồn lẹ', 6, ['chào 3 giây rồi biến', 'chui vao phong', 'trốn lẹ vào phòng', 'cúi đầu rồi chạy', 'chao le'], ['chuồn lẹ', 'vào phòng', 'chạy biến']],
  ]),

  q('ff_b041', CAT_FAMILY, 'Câu cửa miệng kinh điển của mẹ mỗi khi bạn lỡ tay làm vỡ bát hay hỏng đồ?', [
    ['Mắt để trên trán?', 34, ['mắt để đâu', 'mat de tren tran', 'mắt để sau gáy', 'mù à', 'mat mui'], ['mắt mũi', 'trên trán', 'để đâu']],
    ['Cắm đầu điện thoại', 24, ['suốt ngày điện thoại', 'bam dien thoai', 'cắm mặt vô máy', 'tại cái điện thoại', 'dien thoai'], ['điện thoại', 'cắm đầu', 'dán mắt']],
    ['Đẻ trứng vịt hơn', 17, ['đẻ trứng vịt lộn còn hơn', 'trung vit lon', 'nuôi tốn cơm', 'vô tích sự', 'ăn hại'], ['trứng vịt', 'tốn cơm', 'ăn hại']],
    ['Làm gì chẳng xong', 12, ['không ra hồn', 'khong ra hon', 'đụng đâu bể đó', 'phá gia chi tử', 'hậu đậu'], ['ra hồn', 'hậu đậu', 'phá gia']],
    ['Mai mốt ai lấy', 8, ['ế cả đời', 'ai them lay', 'nhà chồng trả về', 'không ai rước', 'ai lay'], ['ai lấy', 'trả về', 'ai rước']],
    ['Đứng đó còn cãi?', 5, ['cãi nhem nhẻm', 'con dung do cai', 'làm sai còn lì', 'im mồm ngay', 'cai lai'], ['còn cãi', 'im mồm', 'còn lì']],
  ]),

  q('ff_b042', CAT_FAMILY, 'Trong nhóm chat Zalo gia đình, nội dung nào xuất hiện nhiều đến mức ám ảnh?', [
    ['Tin giả ung thư', 35, ['bài báo tin giả', 'tin gia suc khoe', 'cảnh báo ung thư', 'mẹo chữa bệnh bậy', 'tin giật gân'], ['tin giả', 'ung thư', 'chữa bệnh']],
    ['Ảnh hoa chào sáng', 23, ['ảnh hoa sen', 'chuc ngay moi', 'ảnh bình minh', 'hoa hồng ngủ ngon', 'chao buoi sang'], ['hoa sen', 'chào sáng', 'ngủ ngon']],
    ['Video hài nhảm', 16, ['clip hài nhảm', 'video tiktok', 'tin tai nạn', 'clip đạo lý', 'video câu view'], ['hài nhảm', 'câu view', 'tiktok']],
    ['Ảnh cháu ăn học', 12, ['khoe ảnh cháu', 'anh tre con', 'cháu tập đi', 'cháu ăn giỏi', 'clip em bé'], ['ảnh cháu', 'em bé', 'tập đi']],
    ['Nhắc mặc ấm ngủ', 8, ['nhắc ngủ sớm', 'nhac ngu som', 'nhớ ăn uống đủ', 'trời trở gió', 'uống nhiều nước'], ['mặc ấm', 'ngủ sớm', 'trở gió']],
    ['Tin giỗ chạp họp', 6, ['tin đám giỗ', 'hop ho', 'nhắn đi ăn cỗ', 'đóng quỹ họ', 'gio chap'], ['đám giỗ', 'họp họ', 'ăn cỗ']],
  ]),

  q('ff_b043', CAT_FAMILY, 'Hàng xóm có trò gì mất dạy nhất khiến bạn chỉ muốn chuyển nhà ngay trong đêm?', [
    ['Hát karaoke tới khuya', 36, ['karaoke ầm ĩ', 'hat karaoke', 'loa kẹo kéo', 'hát đêm khuya', 'nhạc sàn đùng đùng'], ['karaoke', 'loa kẹo kéo', 'ầm ĩ']],
    ['Khoan tường Chủ Nhật', 22, ['khoan 7h sáng', 'khoan cat be tong', 'sửa nhà ồn ào', 'gõ búa cuối tuần', 'sua nha'], ['khoan tường', 'đục tường', 'chủ nhật']],
    ['Để rác bốc mùi', 16, ['vứt rác bừa bãi', 'rac boc mui', 'giày dép đầy hành lang', 'đổ nước bẩn', 'hôi thối'], ['bốc mùi', 'vứt rác', 'hôi thối']],
    ['Bịa chuyện nói xấu', 12, ['đặt điều nói xấu', 'bia chuyen', 'bà tám xóm', 'đồn nhảm', 'soi mói đời tư'], ['bịa chuyện', 'nói xấu', 'đồn nhảm']],
    ['Chửi nhau nửa đêm', 8, ['cãi nhau ầm ĩ', 'chui con mang chong', 'đập đồ chửi thề', 'la hét nửa đêm', 'gây gổ'], ['chửi nhau', 'la hét', 'nửa đêm']],
    ['Đậu xe chắn cổng', 6, ['đậu xe chắn cửa', 'chan cong', 'để xe ngang ngược', 'lấn sân chung', 'dau xe'], ['đậu xe', 'chắn cửa', 'chắn cổng']],
  ]),

  q('ff_b044', CAT_FAMILY, 'Dắt người yêu về ra mắt lần đầu, bố mẹ hay làm trò gì khiến bạn muốn độn thổ?', [
    ['Khoe ảnh hồi nhỏ', 33, ['album ảnh ngố', 'anh ngo tau', 'ảnh cởi truồng nhỏ', 'kể chuyện hồi bé', 'album anh'], ['ảnh hồi nhỏ', 'album', 'ngố tàu']],
    ['Kể tật ở bẩn', 25, ['kể tật xấu', 'boc phot o ban', 'chê con lười', 'nói con ngủ nướng', 'bêu rếu con'], ['tật xấu', 'ở bẩn', 'chê lười']],
    ['Tra hỏi gia cảnh', 17, ['hỏi cung', 'tra hoi luong', 'hỏi nhà mấy tầng', 'hỏi quê quán', 'phỏng vấn gắt'], ['tra hỏi', 'hỏi cung', 'gia cảnh']],
    ['Ép ăn ép uống', 11, ['gắp đầy bát', 'ep an', 'bắt ăn hết', 'ép uống rượu bố', 'chén tạc chén thù'], ['ép ăn', 'ép uống', 'gắp đầy']],
    ['Bắt rửa núi bát', 8, ['bắt rửa bát', 'rua bat ra mat', 'thử thách nấu ăn', 'bắt gọt hoa quả', 'rua chen'], ['rửa bát', 'rửa chén', 'thử thách']],
    ['Hỏi bao giờ cưới', 6, ['hối cưới ngay', 'hoi bao gio cuoi', 'ép cưới luôn', 'tính ngày lành', 'chot ngay cuoi'], ['hối cưới', 'bao giờ cưới', 'ép cưới']],
  ]),

  q('ff_b045', CAT_FAMILY, 'Giao thừa năm nay được ước một điều thực tế cho gia đình, bạn ước ngay điều gì?', [
    ['Bớt hỏi cưới lương', 36, ['đừng hỏi lương', 'bot hoi cuoi', 'họ hàng im lặng', 'không bị tra khảo', 'ngưng hỏi ế'], ['họ hàng', 'bớt hỏi', 'tra khảo']],
    ['Mẹ bớt càm ràm', 22, ['mẹ bớt mắng', 'bot cam ram', 'đừng so sánh nữa', 'mẹ hiền hơn', 'không bị la'], ['càm ràm', 'bớt mắng', 'so sánh']],
    ['Không phải rửa bát', 16, ['khong rua bat', 'bot rua chen', 'có máy rửa bát', 'ăn hàng đỡ dọn', 'đỡ dọn nhà'], ['rửa bát', 'rửa chén', 'máy rửa']],
    ['Hàng xóm dẹp loa', 12, ['xóm yên tĩnh', 'dep loa keo keo', 'hàng xóm bớt ồn', 'không karaoke', 'được ngủ yên'], ['dẹp loa', 'yên tĩnh', 'bớt ồn']],
    ['Tự giữ lì xì', 8, ['không bị thu lì xì', 'khong bi thu li xi', 'mẹ không giữ hộ', 'lì xì tờ to', 'giu het'], ['giữ lì xì', 'không thu', 'giữ hộ']],
    ['Cả nhà trúng số', 6, ['trúng số cả nhà', 'giau len', 'hết nợ nần', 'trúng vietlott', 'phát tài'], ['trúng số', 'vietlott', 'phát tài']],
  ]),

  q('ff_b046', CAT_FAMILY, 'Dấu hiệu cảnh báo cơn bão tố "mẹ sắp chửi từ chuyện nhỏ sang chuyện lớn"?', [
    ['Mặt hầm hầm im', 34, ['im re mặt nặng', 'mat ham ham', 'lườm nguýt', 'không nói lời nào', 'sát khí đùng đùng'], ['hầm hầm', 'im re', 'sát khí']],
    ['Đóng cửa đánh rầm', 24, ['đóng cửa rầm', 'quang noi nieu', 'chén bát va mạnh', 'ném chổi', 'đập bàn'], ['đóng cửa', 'đánh rầm', 'quăng nồi']],
    ['Gọi đủ họ tên', 17, ['kêu cả họ tên', 'goi full name', 'gào tên đầy đủ', 'hét tên ra', 'gọi thẳng tên'], ['họ tên', 'full name', 'tên đầy đủ']],
    ['Thở dài lẩm bẩm', 11, ['thở dài', 'lam bam mot minh', 'lắc đầu ngao ngán', 'chép miệng liên tục', 'chửi đổng'], ['thở dài', 'lẩm bẩm', 'chửi đổng']],
    ['Lôi lỗi cũ ra', 8, ['lôi chuyện cũ', 'nhac loi xua', 'ôn lại tội trạng', 'kể công nuôi dạy', 'bới móc'], ['lỗi xưa', 'chuyện cũ', 'bới móc']],
    ['Gọi mách họ hàng', 6, ['méc dì bác', 'goi dien ke xau', 'tâm sự với dì', 'nói xấu con qua máy', 'gọi điện'], ['mách dì', 'kể xấu', 'gọi điện']],
  ]),

  q('ff_b047', CAT_FAMILY, 'Thứ gì trong tủ lạnh nhà mẹ có thể tồn tại qua nhiều mùa không ai dám vứt?', [
    ['Túi thịt đông cổ', 34, ['đồ đông lạnh cổ', 'thit ca cu', 'cục đá bí ẩn', 'túi đen ngăn đá', 'do dong lanh'], ['đông lạnh', 'ngăn đá', 'túi đen']],
    ['Hộp kem đựng cá', 23, ['hộp kem giả', 'hop kem dung thit', 'cú lừa hộp kem', 'hộp đựng hành tỏi', 'tưởng kem hóa cá'], ['hộp kem', 'đựng cá', 'cú lừa']],
    ['Lọ dưa mắm mốc', 17, ['lọ dưa muối', 'hu mam', 'cà pháo mốc', 'tương ớt hết hạn', 'do het han'], ['dưa muối', 'lọ mắm', 'hết hạn']],
    ['Thuốc nam rượu ngâm', 12, ['thuốc bắc', 'thuoc nam', 'rượu thuốc', 'chai mật ong cổ', 'thuốc nhỏ mắt cũ'], ['thuốc nam', 'thuốc bắc', 'rượu thuốc']],
    ['Đồ ăn thừa nguội', 8, ['đồ ăn thừa', 'thuc an thua', 'bát canh thừa', 'cơm nguội cất tủ', 'món thừa'], ['đồ thừa', 'ăn thừa', 'cơm nguội']],
    ['Bánh chưng tới hè', 6, ['bánh chưng cổ', 'banh chung cat tu', 'bánh tét đông đá', 'mứt tết dư', 'banh tet'], ['bánh chưng', 'bánh tét', 'mùa hè']],
  ]),

  q('ff_b048', CAT_FAMILY, 'Anh chị em ruột cãi nhau chí chóe, chiêu đe dọa nào giải tán nhanh nhất?', [
    ['Tao mách mẹ ngay', 36, ['mách mẹ', 'mach bo me', 'gọi mẹ ra xử', 'kể tội mẹ', 'méc mẹ'], ['mách mẹ', 'méc mẹ', 'gọi mẹ']],
    ['Dọa méc người yêu', 22, ['mách bồ nó', 'boc phot bi mat', 'tung ảnh dìm', 'kể tật xấu với bồ', 'kể bồ nó'], ['người yêu', 'ảnh dìm', 'méc bồ']],
    ['Dọa lao vào đấm', 16, ['đếm 1 2 3', 'doan quyen', 'cầm chổi rượt', 'xắn tay áo lên', 'chuẩn bị đấm'], ['dọa đánh', 'đấm', 'cầm chổi']],
    ['Rút dây tắt wifi', 12, ['tắt wifi', 'rut day mang', 'cắt mạng', 'đổi mật khẩu wifi', 'tat mang'], ['tắt wifi', 'dây mạng', 'cắt mạng']],
    ['Giấu điện thoại nó', 8, ['làm con tin', 'dọa đập đồ', 'tịch thu tai nghe', 'giấu dép nó', 'cầm đồ quý'], ['con tin', 'đập đồ', 'giấu máy']],
    ['Cấm mượn xe tiền', 6, ['cắt viện trợ', 'khong cho muon xe', 'nghỉ cho vay', 'từ mặt', 'khong cho tien'], ['mượn xe', 'mượn tiền', 'viện trợ']],
  ]),

  q('ff_b049', CAT_FAMILY, 'Trò bựa nào lũ trẻ con hàng xóm sang chơi hay làm khiến bạn muốn đá đít ra ngoài?', [
    ['Phá mô hình chơi', 35, ['lục tung phòng', 'luc tung phong', 'làm gãy mô hình', 'xé sách truyện', 'pha hoai'], ['phá đồ', 'mô hình', 'lục phòng']],
    ['Bôi bẩn sofa nệm', 23, ['tay dính đồ ăn', 'boi ban sofa', 'đổ nước ngọt', 'giẫm giày lên nệm', 'trét kẹo tường'], ['bôi bẩn', 'sofa', 'ga giường']],
    ['Khóc đòi điện thoại', 16, ['đòi chơi game', 'khoc an va', 'nằm lăn ra sàn', 'giật máy tính bảng', 'an va'], ['ăn vạ', 'điện thoại', 'giật máy']],
    ['Đòi xin mang về', 12, ['xin đồ về', 'doi mang ve', 'bắt cho luôn', 'vòi vĩnh xin xỏ', 'xin mo hinh'], ['đòi xin', 'mang về', 'vòi vĩnh']],
    ['Nghịch bấm loạn máy', 8, ['bấm loạn nút', 'la het om som', 'chạy rầm rầm', 'tắt bật tivi', 'gõ bàn phím'], ['bấm loạn', 'la hét', 'nghịch máy']],
    ['Tự ý lục tủ', 6, ['mở tủ lạnh', 'luc do an', 'ăn sạch bánh kẹo', 'lấy đồ không hỏi', 'mo tu'], ['tủ lạnh', 'tự ý', 'ăn sạch']],
  ]),

  q('ff_b050', CAT_FAMILY, 'Bố mẹ phát hiện bạn nói dối đi học nhóm để đi chơi đêm, cái kết nào ập tới?', [
    ['Nghe chửi 3 tiếng', 34, ['bị chửi tới sáng', 'giang dao duc', 'nghe thuyết giáo', 'mắng té tát', 'lên lớp'], ['giảng đạo', 'thuyết giáo', 'mắng']],
    ['Cắt tiền thu xe', 24, ['cắt tiêu vặt', 'thu xe', 'tịch thu điện thoại', 'cấm vận', 'cat tien'], ['cắt tiền', 'thu xe', 'tịch thu']],
    ['Khóa cổng nhốt ngoài', 17, ['nhốt ngoài cửa', 'khoa cong', 'ngủ ngoài hiên', 'đứng ngoài cổng', 'ra đường ở'], ['nhốt ngoài', 'khóa cửa', 'khóa cổng']],
    ['Gọi điện tra hỏi', 12, ['gọi từng đứa bạn', 'tra hoi ban be', 'điều tra tận gốc', 'gọi phụ huynh', 'check chéo'], ['tra hỏi', 'gọi bạn', 'điều tra']],
    ['Giới nghiêm 9 giờ', 8, ['cấm túc đi chơi', 'cam tuc di choi', 'khóa chân ở nhà', 'quản thúc', 'cam cua'], ['giới nghiêm', 'cấm túc', 'cấm cửa']],
    ['Tới tận nơi lôi', 5, ['lôi cổ về', 'bat ve ngay', 'quê mặt trước bạn', 'đến đón tại chỗ', 'gọi về gấp'], ['lôi về', 'tận nơi', 'quê mặt']],
  ]),

  q('ff_b051', CAT_FAMILY, 'Việc dọn nhà Tết "khổ sai" nhất mà đứa con nào trong nhà cũng tìm cách đùn đẩy?', [
    ['Lau bàn ghế gỗ', 35, ['ghế chạm trổ', 'ban ghe cham tro', 'cọ từng khe gỗ', 'lau tủ thờ', 'ghế rồng phượng'], ['bàn ghế gỗ', 'chạm trổ', 'rồng phượng']],
    ['Quét mạng nhện trần', 23, ['lau quạt trần', 'quet mang nhen', 'tháo cánh quạt', 'leo thang lau trần', 'lau quat'], ['mạng nhện', 'quạt trần', 'trần nhà']],
    ['Đánh bóng lư đồng', 16, ['đánh lư đồng', 'danh bong lu dong', 'chùi đồ thờ', 'đánh bát hương', 'lau bàn thờ'], ['lư đồng', 'đánh bóng', 'bàn thờ']],
    ['Rửa núi bát cỗ', 12, ['rửa chén tất niên', 'rua nui bat', 'rửa bát mâm cỗ', 'dọn mâm cỗ', 'rua bat'], ['rửa bát', 'rửa chén', 'tất niên']],
    ['Giặt rèm cửa chăn', 8, ['giặt rèm cửa', 'giat chan ga', 'tháo rèm giặt', 'chà thảm', 'giat man'], ['rèm cửa', 'chăn ga', 'giặt giũ']],
    ['Lau hàng chục kính', 6, ['lau cửa kính', 'chui cua so', 'lau cửa gỗ', 'cọ khung cửa', 'lau cua'], ['cửa kính', 'cửa sổ', 'lau kính']],
  ]),

  q('ff_b052', CAT_FAMILY, 'Câu nói "lươn lẹo" kinh điển của bố mẹ mỗi khi thu sạch tiền lì xì của con?', [
    ['Mẹ giữ hộ trả', 38, ['mẹ giữ hộ', 'me cat giup', 'lớn lên mẹ trả', 'cất giùm con', 'mẹ giữ giùm'], ['giữ hộ', 'lớn trả', 'cất giùm']],
    ['Bỏ lợn tiết kiệm', 21, ['bỏ ống heo', 'bo lon dat', 'gửi tiết kiệm giùm', 'đút lợn', 'nuôi heo đất'], ['lợn đất', 'ống heo', 'tiết kiệm']],
    ['Đóng tiền học phí', 15, ['đóng học', 'mua sach vo', 'lo ăn học', 'tiền sữa tiền ăn', 'dong tien hoc'], ['tiền học', 'học phí', 'sách vở']],
    ['Trẻ con cầm hư', 12, ['cầm tiền dễ hư', 'cam tien de hu', 'còn nhỏ xài gì', 'làm mất bây giờ', 'con nit'], ['dễ hư', 'trẻ con', 'làm mất']],
    ['Đi trả lễ lại', 9, ['trả lễ người ta', 'tra le nguoi ta', 'có qua có lại', 'lì xì lại con họ', 'co qua co lai'], ['trả lễ', 'có qua có lại', 'lì xì lại']],
    ['Đổi tiền lẻ tiêu', 5, ['đổi sang tờ nhỏ', 'doi tien le', 'lấy 500k đưa 20k', 'đổi tờ mới', 'doi tien'], ['tiền lẻ', 'đổi tiền', 'tờ nhỏ']],
  ]),

  // =========================================================================
  // 3. GAME THỦ, NET CỎ & CÚ ĐÊM (ff_b053 – ff_b078)
  // =========================================================================
  q('ff_b053', CAT_GAMER, 'Câu đổ lỗi kinh điển nhất của game thủ mỗi khi chết ngu hoặc feed 0/10 trong rank?', [
    ['Đổ thừa do lag', 36, ['mạng lag', 'ping cao', 'đứt cáp', 'giật lag', 'ping 999', 'rot mang'], ['lag', 'ping', 'mạng lag', 'giật lag']],
    ['Tại đồng đội ngu', 22, ['tại đồng đội', 'dong doi ngu', 'rừng không gank', 'sp không bảo kê', 'do team'], ['đồng đội', 'rừng không gank', 'do team']],
    ['Chuột kẹt liệt phím', 16, ['liệt phím', 'chuot ket', 'màn hình đơ', 'cảm ứng loạn', 'bấm không ăn'], ['chuột kẹt', 'liệt phím', 'cảm ứng']],
    ['Địch hack tướng lỗi', 12, ['địch hack', 'tuong loi', 'tướng mất cân bằng', 'bật tool', 'hack map'], ['hack map', 'tướng lỗi', 'bật tool']],
    ['Bị gọi che màn', 8, ['bị gọi điện', 'tin nhan che man', 'mẹ sai việc', 'rớt mạng cuộc gọi', 'che nút bấm'], ['gọi điện', 'tin nhắn', 'che màn']],
    ['Chưa kịp nóng tay', 6, ['chưa khởi động', 'test tuong', 'nháy tay', 'nhầm bảng ngọc', 'mắt mờ'], ['nóng tay', 'bảng ngọc', 'test tướng']],
  ]),

  q('ff_b054', CAT_GAMER, 'Kiểu đồng đội "rác rưởi" nào trong game khiến bạn muốn đấm xuyên màn hình?', [
    ['Tranh lane rồi feed', 34, ['tranh lane', 'pick 2 ad', 'test tướng trong rank', 'feed liên tục', 'chan tuong'], ['tranh lane', 'feed', 'test tướng']],
    ['Bật mic chửi om', 24, ['vừa ngu vừa chửi', 'bat mic chui', 'gáy to đánh dở', 'sủa trong mic', 'toxic'], ['bật mic', 'gáy to', 'toxic']],
    ['AFK treo máy chửi', 17, ['afk đứng tế đàn', 'anh hung ban phim', 'bỏ chơi chat chửi', 'treo máy', 'afk'], ['afk', 'treo máy', 'tế đàn']],
    ['Mải farm bỏ combat', 11, ['mải farm bỏ team', 'khong ho tro', 'đi lẻ chết ngu', 'cắm đầu farm rừng', 'farm linh'], ['farm lính', 'đi lẻ', 'bỏ team']],
    ['Cố tình phá game', 8, ['nộp mạng', 'nop mang', 'bán đồ mua giày', 'chạy thẳng trụ địch', 'troll game'], ['phá game', 'nộp mạng', 'troll']],
    ['Chuyên cướp mạng ks', 6, ['ks mạng', 'ks mang', 'ham giết quên trụ', 'tham mạng', 'ks'], ['ks mạng', 'cướp mạng', 'tham mạng']],
  ]),

  q('ff_b055', CAT_GAMER, 'Mùi hương "đặc sản" nồng nặc nhất khi bước vào quán net cỏ lúc nửa đêm?', [
    ['Khói thuốc mồ hôi', 36, ['khói thuốc lá', 'mui thuoc la', 'mồ hôi nách', 'hôi nách', 'khói thuốc mù mịt'], ['thuốc lá', 'mồ hôi', 'khói thuốc']],
    ['Mì tôm xúc xích', 23, ['mùi mì tôm', 'mi tom trung', 'mùi đồ ăn đêm', 'xúc xích chiên', 'mì xào'], ['mì tôm', 'xúc xích', 'mì trứng']],
    ['Mùi tất thối chân', 16, ['mùi thối chân', 'tat thoi', 'giày dép bốc mùi', 'chân thúi', 'hoi chan'], ['tất thối', 'thối chân', 'chân hôi']],
    ['Điều hòa ẩm mốc', 11, ['mùi ẩm mốc', 'dieu hoa am', 'phòng kín bí bách', 'mùi thảm cũ', 'am moc'], ['ẩm mốc', 'điều hòa', 'bí bách']],
    ['Nước tăng lực Sting', 8, ['mùi sting', 'bo huc', 'nước ngọt đổ bàn', 'mùi nước tăng lực', 'sting dau'], ['sting', 'bò húc', 'tăng lực']],
    ['Dầu mỡ bám chuột', 6, ['chuột dính mỡ', 'ban phim ban', 'bàn nhớp nháp', 'mùi dầu mỡ', 'dau mo'], ['dầu mỡ', 'dính nhớp', 'bàn phím bẩn']],
  ]),

  q('ff_b056', CAT_GAMER, 'Món ăn thức uống "chống đói xuyên đêm" huyền thoại của dân cày net cỏ?', [
    ['Mì tôm hai trứng', 38, ['mì tôm trứng', 'mi tom xuc xich', 'mì úp', 'combo mì tôm', 'mi trung'], ['mì tôm', 'mì trứng', 'mì úp']],
    ['Sting dâu bò húc', 22, ['bo huc', 'redbull', 'nước tăng lực', 'sting vàng', 'uong sting'], ['sting', 'bò húc', 'redbull']],
    ['Cơm rang dưa bò', 15, ['cơm rang', 'com chien trung', 'cơm gà xối mỡ', 'com rang dua bo', 'đĩa cơm rang'], ['cơm rang', 'cơm chiên', 'dưa bò']],
    ['Trà đá ca to', 11, ['trà đá', 'tra da', 'nước lọc free', 'trà chanh', 'ly tra da'], ['trà đá', 'ca to', 'trà chanh']],
    ['Bánh mì xôi mặn', 8, ['bánh mì', 'banh mi thit', 'xôi xéo', 'bánh bao', 'banh mi op la'], ['bánh mì', 'xôi mặn', 'bánh bao']],
    ['Snack khô gà', 6, ['bim bim', 'kho ga', 'bò khô', 'hạt hướng dương', 'snack'], ['snack', 'bim bim', 'khô gà']],
  ]),

  q('ff_b057', CAT_GAMER, 'Thứ gì dễ bị game thủ đập nát đầu tiên khi thua chuỗi 10 trận rank?', [
    ['Bàn phím cơ', 35, ['đập bàn phím', 'ban phim', 'gõ nát bàn phím', 'rơi nút space', 'đập phím'], ['bàn phím', 'đập phím', 'phím cơ']],
    ['Chuột máy tính', 24, ['đập chuột', 'nem chuot', 'vỡ chuột', 'đập nát con chuột', 'con chuot'], ['đập chuột', 'ném chuột', 'vỡ chuột']],
    ['Điện thoại màn hình', 16, ['ném điện thoại', 'dap dien thoai', 'vỡ màn hình', 'đập dế yêu', 'man hinh'], ['điện thoại', 'màn hình', 'ném máy']],
    ['Tai nghe chụp tai', 11, ['ném tai nghe', 'tai nghe', 'bẻ gãy tai nghe', 'quăng headphone', 'headphone'], ['tai nghe', 'headphone', 'ném tai']],
    ['Bàn gỗ ghế gaming', 8, ['đấm bàn', 'dap ban', 'đạp ghế', 'đấm mặt bàn', 'tay ghe'], ['đấm bàn', 'đập bàn', 'ghế gaming']],
    ['Cái gối vô tội', 6, ['đấm gối', 'nem goi', 'cắn gối gào thét', 'đập nệm', 'cai goi'], ['cái gối', 'đấm gối', 'cắn gối']],
  ]),

  q('ff_b058', CAT_GAMER, 'Giấu người yêu nạp tiền triệu quay gacha, lý do nào hay dùng để giải thích?', [
    ['Cho bạn vay gấp', 34, ['bạn mượn tiền', 'cho ban vay', 'đỡ đần bạn thân', 'ứng giùm bạn', 'cho vay'], ['bạn vay', 'mượn gấp', 'cho vay']],
    ['Đóng phạt sửa xe', 23, ['bị công an bắt', 'sua xe', 'hỏng xe tốn tiền', 'đóng phạt nguội', 'phat giao thong'], ['sửa xe', 'tiền phạt', 'hỏng xe']],
    ['Tiền trọ điện nước', 17, ['tiền học phí', 'tien nha tro', 'tiền điện nước tăng', 'nộp quỹ lớp', 'dong tien'], ['tiền trọ', 'điện nước', 'học phí']],
    ['Nâng cấp phụ kiện', 12, ['mua linh kiện', 'nang cap may', 'hư tai nghe mua mới', 'sửa điện thoại', 'mua phu kien'], ['linh kiện', 'nâng cấp', 'phụ kiện']],
    ['Rơi ví bị lừa', 8, ['rơi tiền', 'bi lua', 'làm mất ví', 'chuyển nhầm tiền', 'mat tien'], ['rơi ví', 'bị lừa', 'mất ví']],
    ['Gửi về cho mẹ', 6, ['gửi tiền về nhà', 'gui bo me', 'mua quà cho mẹ', 'giúp gia đình', 'gui ve que'], ['gửi mẹ', 'bố mẹ', 'về quê']],
  ]),

  q('ff_b059', CAT_GAMER, 'Câu nói dối kinh điển nhất của thằng bạn khi rủ thức đêm cày game lúc 11 giờ?', [
    ['Nốt ván thắng ngủ', 36, ['thắng một trận nghỉ', 'not van nay ngu', 'chơi nốt trận', 'làm ván cuối', 'mot van nua'], ['nốt ván', 'trận cuối', 'thắng ngủ']],
    ['Thiếu đúng 1 slot', 22, ['đủ 5 người thiếu mày', 'thieu 1 slot', 'vào nhanh anh em đợi', 'cần mày gánh', 'thieu slot'], ['1 slot', 'thiếu slot', 'anh em đợi']],
    ['Chơi nhanh 15 phút', 16, ['chơi giải trí nhẹ', '15 phut xong', 'đánh thường cho vui', 'nhẹ nhàng thôi', 'chơi lướt'], ['15 phút', 'giải trí', 'nhẹ nhàng']],
    ['Mai cuối tuần nghỉ', 12, ['mai được nghỉ', 'mai chu nhat', 'sáng mai ngủ bù', 'trưa dậy cũng được', 'khong phai di lam'], ['cuối tuần', 'ngủ bù', 'mai nghỉ']],
    ['Tao kéo lên rank', 8, ['tao gánh cho', 'keo len rank', 'trận này auto win', 'lên cao thủ luôn', 'kéo rank'], ['kéo rank', 'auto win', 'gánh team']],
    ['Mới 11 giờ mà', 6, ['còn sớm chán', 'moi 11 gio', 'bình thường 2h mới ngủ', 'giờ này ai ngủ', 'som chan'], ['còn sớm', '11 giờ', 'đêm dài']],
  ]),

  q('ff_b060', CAT_GAMER, 'Nỗi đau thấu trời của game thủ mobile đúng lúc đang combat tổng căng thẳng?', [
    ['Có người gọi tới', 35, ['cuộc gọi đến', 'co nguoi goi', 'tin nhắn che màn', 'bạn gọi', 'shipper gọi'], ['gọi tới', 'cuộc gọi', 'che màn']],
    ['Pin yếu tụt FPS', 23, ['pin yếu 5%', 'tut fps', 'giật khung hình', 'sập nguồn giữa trận', 'het pin'], ['pin yếu', 'tụt fps', 'sập nguồn']],
    ['Mất wifi nhảy ping', 16, ['rớt mạng', 'rot mang', 'đứng hình kết nối lại', '4g chập chờn', 'lag tung chảo'], ['rớt mạng', 'mất wifi', 'nhảy ping']],
    ['Nóng máy bỏng tay', 12, ['nóng máy', 'dien thoai nong', 'máy lag quá nhiệt', 'giảm độ sáng màn', 'qua nhiet'], ['nóng máy', 'quá nhiệt', 'bỏng tay']],
    ['Mồ hôi trượt nút', 8, ['ra mồ hôi tay', 'truot nut', 'bấm nhầm tốc biến', 'màn hình trơn', 'mo hoi tay'], ['mồ hôi tay', 'trượt nút', 'tốc biến']],
    ['Mẹ sai việc gấp', 6, ['bị sai đi việc', 'me keu xuong an com', 'nhờ nhận hàng', 'bắt tắt máy ngay', 'me goi'], ['sai việc', 'mẹ gọi', 'tắt máy']],
  ]),

  q('ff_b061', CAT_GAMER, 'Trong voice chat game online, câu chửi gạ kèo "mất dạy" nào hay vang lên nhất?', [
    ['Ra solo 1v1', 34, ['gạ solo', 'solo 1v1', 'ra solo yasuo', 'solo flo không', 'ra đấu trường'], ['solo', '1v1', 'đấu trường']],
    ['Biết bố là ai?', 23, ['biết bố mày là ai không', 'bo may la ai', 'hỏi thăm phụ huynh', 'lôi bố mẹ chửi', 'xưng bố'], ['bố mày', 'biết ai', 'phụ huynh']],
    ['Cho xin địa chỉ', 17, ['đọc địa chỉ', 'doc dia chi', 'hẹn ra cổng trường', 'qua tận nhà', 'gap ngoai doi'], ['địa chỉ', 'tận nhà', 'hẹn gặp']],
    ['Về bú sữa mẹ', 12, ['xóa game đi', 'xoa game', 'chơi pikachu đi', 'đánh với máy đi', 'gà vãi'], ['xóa game', 'bú sữa', 'pikachu']],
    ['Đánh bằng chân à', 8, ['tay tàn tật', 'tay tan tat', 'não úng thủy', 'chơi bằng đầu gối', 'ngu thế'], ['bằng chân', 'tàn tật', 'đầu gối']],
    ['Nhớ mặt trận sau', 6, ['gặp lại ăn hành', 'trận sau tao phá', 'cút sang server khác', 'report chết mẹ', 'gap lai'], ['trận sau', 'nhớ mặt', 'report']],
  ]),

  q('ff_b062', CAT_GAMER, 'Nghe tiếng bước chân phụ huynh tới lúc 3 giờ sáng vẫn cày PC, bạn phản ứng sao?', [
    ['Alt+Tab sang học bài', 35, ['đổi tab học tập', 'alt tab', 'bật word excel giả', 'mở bài giảng', 'chuyen tab'], ['alt+tab', 'học tập', 'đổi tab']],
    ['Tắt màn hình ngủ', 23, ['tat man hinh', 'nằm gục lên bàn', 'giả ngủ tại ghế', 'ngắt nguồn màn', 'gia ngu'], ['tắt màn hình', 'ngủ gục', 'giả ngủ']],
    ['Nhảy giường trùm chăn', 16, ['chui lên giường', 'trum chan gia ngu', 'nhắm mắt thở đều', 'giấu điện thoại gối', 'gia vo ngu'], ['trùm chăn', 'lên giường', 'dưới gối']],
    ['Rút vội tai nghe', 12, ['tắt tiếng', 'rut tai nghe', 'giảm âm lượng', 'bấm mute', 'tat loa'], ['tai nghe', 'tắt tiếng', 'mute']],
    ['Vờ chuẩn bị ngủ', 8, ['giả vờ mới tắt máy', 'vua tat may', 'nói đang lưu file', 'giả bộ uống nước', 'sap ngu'], ['tắt máy', 'lưu file', 'uống nước']],
    ['Ngồi im nín thở', 6, ['nín thở', 'nin tho', 'tắt hết đèn phòng', 'trốn sau cửa', 'im re'], ['nín thở', 'tắt đèn', 'im re']],
  ]),

  q('ff_b063', CAT_GAMER, 'Thứ gì khiến dân chơi gacha khóc ròng cháy túi nhưng vẫn đâm đầu quay tiếp?', [
    ['Lệch rate ra rác', 36, ['lệch rate', 'lech banner', 'ra qiqi', 'trượt bảo hiểm', 'xịt kèo'], ['lệch rate', 'lệch banner', 'rác']],
    ['Skin giới hạn đẹp', 22, ['skin bậc ss', 'skin ss', 'vẽ bùa sập sàn', 'vòng quay trang phục', 'trang phuc hiem'], ['skin', 'giới hạn', 'vẽ bùa']],
    ['Sát nút bảo hiểm', 16, ['còn 10 roll nữa', 'bao hiem', 'pity cao rồi', 'nốt phát nữa ra', 'gan no roi'], ['bảo hiểm', '10 roll', 'pity']],
    ['Thấy bạn quay trúng', 12, ['bị bạn thuốc', 'ban quay trung', 'cay cú đua đòi', 'tưởng mình cũng đỏ', 'ghen ăn tức ở'], ['bạn trúng', 'cay cú', 'đua đòi']],
    ['Thiếu vũ khí trấn', 8, ['vũ khí trấn', 'tran phai', 'có nhân vật thiếu đồ', 'nâng cung mệnh', 'thieu do'], ['vũ khí trấn', 'cung mệnh', 'thiếu đồ']],
    ['Khuyến mãi nạp x2', 6, ['nap lan dau', 'gói vé tháng hời', 'sự kiện hoàn tiền', 'giảm giá nạp', 'khuyen mai'], ['nạp x2', 'lần đầu', 'vé tháng']],
  ]),

  q('ff_b064', CAT_GAMER, 'Hành động "bựa" của dân cày net cỏ làm chủ quán chỉ muốn đuổi thẳng cổ?', [
    ['Ngủ chiếm hai ghế', 33, ['ngủ ở quán net', 'ngu o quan net', 'gác chân lên bàn', 'nằm xoài hai ghế', 'ngáy ầm quán'], ['chiếm ghế', 'ngủ ngáy', 'gác chân']],
    ['Đập phím chửi om', 25, ['đập bàn đập ghế', 'chui the am i', 'la hét mất trật tự', 'đập nát chuột', 'on ao'], ['đập phím', 'chửi thề', 'la hét']],
    ['Cởi giày thối chân', 17, ['tháo giày bốc mùi', 'chan thoi', 'mùi tất nồng nặc', 'cởi tất', 'hoi chan'], ['chân thối', 'cởi giày', 'tất thối']],
    ['Hút thuốc khu cấm', 11, ['hút thuốc bừa bãi', 'hut thuoc', 'tàn thuốc rơi phím', 'nhả khói vào mặt', 'khoi thuoc'], ['hút thuốc', 'tàn thuốc', 'cấm hút']],
    ['Chơi chịu rồi chuồn', 8, ['bùng tiền net', 'choi thieu chuon', 'lẻn trốn về', 'nợ tiền máy', 'tron tien net'], ['chơi chịu', 'bùng tiền', 'lén chuồn']],
    ['Mang đồ mùi nồng', 6, ['đem mắm tôm sầu riêng', 'mang do an ngoai', 'vứt rác gầm bàn', 'đổ nước ra bàn', 'do an ngoai'], ['đồ ăn ngoài', 'mùi nồng', 'rác gầm bàn']],
  ]),

  q('ff_b065', CAT_GAMER, 'Dấu hiệu nhận diện một "cú đêm chính hiệu" lúc 3 giờ sáng khi cả nhà ngủ say?', [
    ['Mắt thâm dán màn', 34, ['mắt gấu trúc', 'mat tham quang', 'thức trắng mắt đỏ', 'vẫn tỉnh như sáo', 'thuc dem'], ['thâm quầng', 'gấu trúc', 'tỉnh như sáo']],
    ['Lục tủ ăn đêm', 24, ['đói bụng ăn đêm', 'luc tu lanh', 'úp mì 3h sáng', 'đặt đồ ăn đêm', 'an dem'], ['ăn đêm', 'lục tủ', 'đói bụng']],
    ['Lướt TikTok nốt clip', 17, ['not clip nay ngu', 'xem reels tới sáng', 'quên thời gian', 'cuộn không ngừng', 'xem youtube'], ['tiktok', 'nốt clip', 'reels']],
    ['Đeo tai nghe cười', 12, ['cười một mình', 'cuoi khuc khich', 'xem hài cười thầm', 'nói chuyện voice', 'cuoi tham'], ['cười một mình', 'khùng khục', 'tủm tỉm']],
    ['Nghe chim hót sáng', 8, ['trời sáng luôn rồi', 'nghe tieng ga gay', 'thấy mặt trời mọc', 'quên cả giờ giấc', 'troi sang'], ['chim hót', 'trời sáng', 'mặt trời']],
    ['Overthinking hối hận', 5, ['suy ngẫm cuộc đời', 'hoi han khong ngu', 'buồn đời lúc 3h', 'tự hứa ngủ sớm', 'triết lý'], ['overthinking', 'hối hận', 'ngủ sớm']],
  ]),

  q('ff_b066', CAT_GAMER, 'Tự tin gáy khét trước trận "Kèo này tao gánh", kết cục thảm hại nào hay ập tới?', [
    ['Chết ngay phút đầu', 35, ['lên bảng đầu tiên', 'first blood', 'chet dau tran', 'chưa ra lính đã chết', 'die som'], ['phút đầu', 'first blood', 'mạng đầu']],
    ['Feed 0/7 nát bét', 23, ['bị camp chết lên xuống', 'bi camp', 'kda âm vô cực', 'bị hành ra bã', 'feed mang'], ['0/7', 'feed', 'bị camp']],
    ['Đánh hụt chiêu cuối', 16, ['miss chiêu cuối', 'hut ulti', 'tốc biến đập tường', 'hụt chiêu quan trọng', 'miss chieu'], ['hụt chiêu', 'chiêu cuối', 'ulti']],
    ['Tắt mic im re', 12, ['tắt mic im lặng', 'im re khong dam noi', 'câm nín luôn', 'quê độ im thin thít', 'tat mic'], ['tắt mic', 'im re', 'câm nín']],
    ['Bị chụp KDA bêu', 8, ['chụp màn hình', 'cap man hinh khia', 'team bóc phốt', 'cà khịa suốt tuần', 'bi beu reu'], ['chụp kda', 'bêu rếu', 'bóc phốt']],
    ['Địch chat all khịa', 6, ['địch gáy ngược', 'chat all khia', 'nhá thông thạo trêu', 'nhục ê chề', 'chat all'], ['chat all', 'gáy ngược', 'thông thạo']],
  ]),

  q('ff_b067', CAT_GAMER, 'Lý do ngớ ngẩn khiến game thủ sẵn sàng hủy kèo đi chơi ngoài đời phút chót?', [
    ['Cày rank cuối mùa', 34, ['sắp reset rank', 'kay rank', 'lên cao thủ', 'đánh chuỗi thăng hạng', 'cuoi mua'], ['cày rank', 'cuối mùa', 'thăng hạng']],
    ['Săn boss sự kiện', 23, ['sự kiện giới hạn', 'san boss', 'giờ vàng x2', 'event cuối tuần', 'event game'], ['sự kiện', 'săn boss', 'giờ vàng']],
    ['Hẹn kèo team 5', 17, ['lập kèo anh em', 'team 5 nguoi', 'thiếu tao tụi nó thua', 'kèo đấu giải', 'team da du'], ['team 5', 'lập kèo', 'đấu giải']],
    ['Tiếc tiền nạp game', 12, ['để tiền nạp thẻ', 'tiet kiem nap the', 'tiền mua skin rồi', 'cháy túi vì game', 'nap game'], ['tiếc tiền', 'nạp thẻ', 'nạp game']],
    ['Lười thay đồ mưa', 8, ['lười ra đường', 'luoi thay do', 'ngoài trời nóng quá', 'mưa làm biếng đi', 'luoi di'], ['lười', 'thay đồ', 'ra đường']],
    ['Cay chuỗi thua gỡ', 6, ['đang chuỗi thua', 'cay cu go gac', 'chưa thắng chưa ra nhà', 'gỡ rank', 'go thua'], ['chuỗi thua', 'gỡ rank', 'cay cú']],
  ]),

  q('ff_b068', CAT_GAMER, 'Phụ kiện thiết bị nào game thủ nào cũng thèm sắm nhưng nhìn giá xong lại quay xe?', [
    ['Card đồ họa VGA', 34, ['card màn hình', 'rtx 4090', 'vga xịn', 'dàn pc trăm triệu', 'card do hoa'], ['card đồ họa', 'vga', 'rtx']],
    ['Ghế gaming êm mông', 24, ['ghế công thái học', 'ghe cong thai hoc', 'ghế secretlab', 'ghế ngồi không đau lưng', 'ghe choi game'], ['ghế gaming', 'công thái học', 'secretlab']],
    ['Màn hình cong xịn', 17, ['màn hình 240hz', 'man hinh 240hz', 'màn oled', 'hai màn hình', 'man hinh choi game'], ['màn hình', 'màn cong', 'oled']],
    ['Bàn phím cơ custom', 12, ['keycap đắt', 'ban phim co xin', 'phím cơ mấy triệu', 'ban phim co', 'custom phím'], ['bàn phím', 'custom', 'keycap']],
    ['Tai nghe chống ồn', 8, ['tai nghe không dây', 'headset gaming', 'mic thu âm streamer', 'tai nghe chong on', 'tai nghe'], ['tai nghe', 'chống ồn', 'headset']],
    ['Tay cầm máy PS5', 5, ['tay cầm xbox', 'tay cam xbox', 'máy chơi game ps5', 'nintendo switch', 'tay cam'], ['tay cầm', 'ps5', 'xbox']],
  ]),

  q('ff_b069', CAT_GAMER, 'Treo máy tải game trăm GB qua đêm, sáng dậy bạn sợ nhất nhìn thấy cảnh gì?', [
    ['Đứng hình 99%', 36, ['đứng ở 99%', 'dung hinh 99', 'mất mạng giữa chừng', 'rớt wifi', 'dung tai'], ['99%', 'đứng hình', 'rớt mạng']],
    ['Full ổ lỗi file', 22, ['hết dung lượng', 'het o cung', 'lỗi giải nén', 'corrupt file', 'full disk'], ['ổ cứng', 'dung lượng', 'lỗi file']],
    ['Mất điện tắt máy', 16, ['cúp điện đêm qua', 'cup dien', 'máy tắt ngúm', 'chưa tải được gì', 'tat may'], ['mất điện', 'cúp điện', 'máy tắt']],
    ['Mẹ rút phích cắm', 12, ['mẹ tắt máy', 'me rut phich cam', 'bố tắt cầu dao', 'ngắt điện tiết kiệm', 'rut dien'], ['rút phích', 'mẹ tắt', 'ngắt điện']],
    ['Windows tự update', 8, ['may tu khoi dong lai', 'cập nhật win', 'tự restart', 'màn hình xanh', 'update'], ['update', 'windows', 'restart']],
    ['Tải nhầm virus', 6, ['dính virus', 'tai nham link', 'file rác', 'tải nhầm bản', 'virus'], ['virus', 'nhầm link', 'file rác']],
  ]),

  q('ff_b070', CAT_GAMER, 'Chiêu trò bẩn bựa nào bọn lừa đảo hay dùng để lùa game thủ nhẹ dạ cả tin?', [
    ['Bán acc lấy lại', 35, ['bán acc giá rẻ', 'ban acc gia re', 'đổi pass lấy lại', 'cướp acc trắng trợn', 'lua ban acc'], ['bán acc', 'đổi pass', 'lấy lại']],
    ['Link nhận skin hack', 23, ['link nhận code', 'tang skin mien phi', 'web giả mạo', 'nhập mật khẩu mất nick', 'code free'], ['code free', 'skin miễn phí', 'hack nick']],
    ['Cày thuê cuỗm đồ', 16, ['cày thuê lừa đảo', 'cay thue', 'lột sạch đồ acc', 'ôm tiền chạy mất', 'cuom do'], ['cày thuê', 'cuỗm đồ', 'lột đồ']],
    ['Giả gái xin thẻ', 12, ['cú có gai xin thẻ', 'gia gai', 'mỹ nhân kế', 'xin skin xong block', 'dao mo'], ['giả gái', 'xin thẻ', 'cú có gai']],
    ['Web quay thưởng lậu', 8, ['vòng quay lừa đảo', 'web nap lau', 'nạp thẻ cào mất trắng', 'shop acc dỏm', 'web lau'], ['web lậu', 'quay thưởng', 'shop dỏm']],
    ['Trung gian giả mạo', 6, ['giả danh admin', 'giao dich trung gian', 'fake nick uy tín', 'lừa tiền cọc', 'trung gian ao'], ['trung gian', 'giả mạo', 'tiền cọc']],
  ]),

  q('ff_b071', CAT_GAMER, 'Bị đối thủ giết xong còn đứng nhá đèn nhảy múa chat "ez", bạn phản ứng ra sao?', [
    ['Cay cú trả thù', 35, ['săn bằng được nó', 'san bang duoc no', 'dồn ulti giết nó', 'ghim vào sổ thù', 'tra thu'], ['cay cú', 'trả thù', 'dồn chiêu']],
    ['Chat all gạ solo', 23, ['chửi lại', 'chat all', 'cà khịa lại', 'gáy trả', 'khau chien'], ['chat all', 'gạ solo', 'chửi lại']],
    ['Lật kèo nhảy lại', 16, ['thắng ngược nhảy lại', 'lat keo', 'nhá đèn trả đũa', 'cười người hôm trước', 'gay nguoc'], ['lật kèo', 'thắng ngược', 'nhảy lại']],
    ['Mute tắt chat ngay', 12, ['mute đối thủ', 'tat chat', 'chặn chat all', 'tập trung đánh không rep', 'tat nhay den'], ['tắt chat', 'mute', 'chặn chat']],
    ['Đập bàn hít thở', 8, ['hít thở sâu', 'dap ban', 'kìm nén cơn giận', 'chửi thầm', 'nhin nhuc'], ['đập bàn', 'hít thở', 'kiềm chế']],
    ['Report thẳng tay', 6, ['bấm tố cáo', 'to cao', 'báo cáo hành vi xấu', 'mong khóa acc', 'report'], ['report', 'tố cáo', 'khóa acc']],
  ]),

  q('ff_b072', CAT_GAMER, 'Khi thức tới 5 giờ sáng làm cú đêm, sáng hôm sau bạn gánh hậu quả nào?', [
    ['Ngủ quên trễ giờ', 36, ['trễ làm trễ thi', 'tre gio lam', 'cúp học bất đắc dĩ', 'tắt báo thức', 'ngu quen'], ['ngủ quên', 'trễ làm', 'trễ thi']],
    ['Đau đầu hoa mắt', 22, ['đau đầu chóng mặt', 'dau dau', 'hoa mắt', 'nhức hốc mắt', 'chong mat'], ['đau đầu', 'hoa mắt', 'chóng mặt']],
    ['Lờ đờ như zombie', 16, ['như xác sống', 'zombie', 'ngáp ngắn ngáp dài', 'mất tập trung', 'buon ngu'], ['zombie', 'xác sống', 'lờ đờ']],
    ['Ngủ tới 2h chiều', 12, ['ngủ tới chiều', 'ngu toi 2h chieu', 'mất trắng một ngày', 'bỏ bữa sáng trưa', 'toi chieu'], ['2 giờ chiều', 'ngủ tới chiều', 'lỡ ngày']],
    ['Tối lại thức tiếp', 8, ['tự hứa ngủ sớm', 'hua suong', 'vòng lặp cú đêm', 'nói xạo bản thân', 'khong cai duoc'], ['vẫn thức', 'ngủ sớm', 'vòng lặp']],
    ['Đau dạ dày mụn', 6, ['miệng đắng ngắt', 'mieng dang', 'trào ngược dạ dày', 'mặt nổi mụn', 'dau bao tu'], ['dạ dày', 'miệng đắng', 'nổi mụn']],
  ]),

  q('ff_b073', CAT_GAMER, 'Trong các quán net ngày xưa (Audition, Đột Kích...), ký ức huy hoàng nhất là gì?', [
    ['Mẹ cầm roi lôi', 34, ['mẹ ra quán net bắt', 'me cam roi', 'bị kéo tai lôi về', 'nhảy cửa sổ trốn mẹ', 'bat tai net'], ['mẹ ra quán', 'cầm roi', 'lôi về']],
    ['Ba thằng một máy', 24, ['ngồi chung một máy', 'chi dao am i', 'đứng sau chém gió', 'hò hét cổ vũ', 'co vu'], ['một máy', 'chỉ đạo', 'đứng sau']],
    ['Đập gãy phím Space', 17, ['đập nút space', 'gay ban phim', 'nhảy au 188', 'gõ cạch cạch điên cuồng', 'nhay au'], ['space', 'audition', 'gãy phím']],
    ['Combo thâu đêm 15k', 12, ['cày đêm giá rẻ', 'combo thau dem', 'chơi từ 10h tới 6h', 'đấu chế mạng lan', 'thau dem'], ['thâu đêm', 'combo', 'mạng lan']],
    ['Trốn tiết ra net', 8, ['cúp học thêm', 'tron tiet', 'mặc đồng phục ngồi net', 'cúp học cả nhóm', 'cup hoc'], ['trốn tiết', 'cúp học', 'đồng phục']],
    ['Ghi sổ nợ nét', 5, ['vay tiền nét chịu', 'no tien net', 'canh chủ quán ngủ', 'cắm cặp sách', 'no chu quan'], ['ghi sổ', 'nợ nét', 'cắm cặp']],
  ]),

  q('ff_b074', CAT_GAMER, 'Nick game cày 5 năm tự dưng bị khóa vĩnh viễn oan uổng, game thủ làm gì ngay?', [
    ['Buồn mất sổ gạo', 34, ['đơ người sốc nặng', 'mat so gao', 'tiếc công cày cuốc', 'ngồi thẫn thờ', 'suy sup'], ['mất sổ gạo', 'đơ người', 'thẫn thờ']],
    ['Gửi ticket khiếu nại', 24, ['khiếu nại NPH', 'gui ticket', 'nhắn tin admin', 'xin mở khóa acc', 'giai ban'], ['ticket', 'khiếu nại', 'mở khóa']],
    ['Lên group chửi NPH', 17, ['đăng bài bóc phốt', 'chui nph', 'lên group kêu oan', 'đánh giá 1 sao', 'keu oan'], ['kêu oan', '1 sao', 'chửi nph']],
    ['Lập acc cày lại', 12, ['thề bỏ rồi chơi tiếp', 'lap acc moi', 'hôm sau cày lại', 'không bỏ được', 'choi lai'], ['acc mới', 'cày lại', 'chơi lại']],
    ['Xóa game giải nghệ', 8, ['bỏ game vĩnh viễn', 'xoa game', 'bán máy nghỉ chơi', 'cai nghiện thành công', 'nghi choi'], ['xóa game', 'giải nghệ', 'cai nghiện']],
    ['Đi mua acc khác', 5, ['mua acc mới', 'xin acc cu', 'mượn acc bạn', 'mua nick chơi đỡ', 'mua acc'], ['mua acc', 'xin acc', 'mượn acc']],
  ]),

  q('ff_b075', CAT_GAMER, 'Câu nói cửa miệng của mấy streamer game khiến người xem cười ra nước mắt?', [
    ['Lag quá đứng hình', 33, ['đổ tại lag', 'do may lag', 'ping cao quá anh em', 'rớt khung hình rồi', 'lag qua'], ['lag quá', 'đứng hình', 'ping cao']],
    ['Không gánh chặt đầu', 24, ['gáy trước trận', 'khong ganh chat dau', 'tin tôi đi', 'auto thắng', 'bao win'], ['chặt đầu', 'auto thắng', 'tin tôi']],
    ['Nhớ like đăng ký', 18, ['xin like sub', 'dang ky kenh', 'nhớ bấm chuông', 'cảm ơn donate', 'bam like'], ['đăng ký', 'like sub', 'donate']],
    ['Lỡ nháy chuột thôi', 11, ['lỡ tay bấm nhầm', 'nhay chuot', 'test xem địch mạnh không', 'tạo content thôi', 'tao content'], ['nháy chuột', 'bấm nhầm', 'content']],
    ['Xử lý lòng đất', 8, ['xử lý cồng kềnh', 'di vao long dat', 'toang rồi anh em', 'chết lãng xẹt', 'toang roi'], ['lòng đất', 'cồng kềnh', 'toang']],
    ['Out trình quá đỉnh', 6, ['tự khen mình hay', 'thay hay khong', 'đẳng cấp chưa', 'đỉnh cao kỹ năng', 'out trinh'], ['out trình', 'đẳng cấp', 'kỹ năng']],
  ]),

  q('ff_b076', CAT_GAMER, 'Đang chơi game kinh dị lúc nửa đêm, điều gì làm bạn giật bắn mình rớt tim?', [
    ['Địch bắn lén sau', 34, ['bị địch bắn', 'ban len sau lung', 'tiếng súng bất ngờ', 'đạp mìn nổ', 'tieng no'], ['bắn lén', 'sau lưng', 'tiếng nổ']],
    ['Người nhà vỗ vai', 24, ['mẹ vỗ vai', 'nguoi nha do', 'bố đứng sau lưng', 'mở cửa bất thình lình', 'vo vai'], ['vỗ vai', 'người nhà', 'đứng sau']],
    ['Ma nhảy ra jumpscare', 17, ['ma hù', 'jumpscare', 'mặt ma phóng to', 'tiếng hét thất thanh', 'ma nhay ra'], ['ma hù', 'jumpscare', 'mặt ma']],
    ['Gián bay lên phím', 12, ['con gián', 'gian bay', 'thằn lằn rớt tay', 'nhện rớt', 'con trung'], ['con gián', 'thằn lằn', 'bàn phím']],
    ['Mất điện tối om', 8, ['cúp điện tối thui', 'mat dien', 'đèn nhấp nháy', 'tối om xung quanh', 'toi thui'], ['mất điện', 'tối om', 'cúp điện']],
    ['Tai nghe tiếng lạ', 5, ['tai nghe rè to', 'tieng re to', 'tiếng gió rít', 'cửa sổ tự đập', 'tieng la'], ['tai nghe rè', 'tiếng rít', 'cửa đập']],
  ]),

  q('ff_b077', CAT_GAMER, 'Lỡ đổ nước vào laptop hay rơi hỏng đồ công nghệ, phản ứng đầu tiên là gì?', [
    ['Đứng hình cầu trời', 34, ['đơ người cầu nguyện', 'dung hinh', 'mong máy không sao', 'tim ngừng đập', 'cau troi'], ['đứng hình', 'cầu trời', 'tim ngừng']],
    ['Bỏ vào thùng gạo', 23, ['lấy máy sấy', 'say kho', 'dốc ngược máy', 'lấy khăn thấm gấp', 'thung gao'], ['thùng gạo', 'máy sấy', 'dốc ngược']],
    ['Bấm nguồn thử bật', 17, ['bật thử lại', 'bam nut nguon', 'kiểm tra màn hình', 'thử sạc lại', 'thu bat'], ['nút nguồn', 'bật thử', 'sạc lại']],
    ['Nghĩ tiền sửa xót', 12, ['sợ tốn tiền sửa', 'so me chui', 'xót ví tiền', 'chuẩn bị nghe chửi', 'ton tien sua'], ['tiền sửa', 'xót ví', 'mẹ chửi']],
    ['Tra Google cấp cứu', 8, ['lên mạng tìm cách sửa', 'tra google', 'xem youtube sửa', 'tìm tiệm sửa', 'google'], ['google', 'youtube', 'tiệm sửa']],
    ['Giả vờ không biết', 6, ['đổ thừa tự hỏng', 'gia ngo', 'lắp lại im re', 'cất đi giấu nhẹm', 'do thua'], ['giả vờ', 'tự hỏng', 'giấu nhẹm']],
  ]),

  q('ff_b078', CAT_GAMER, 'Câu nói quen thuộc của hội "nghiện" nâng cấp PC khi vợ hoặc mẹ hỏi giá?', [
    ['Rẻ bèo mấy trăm', 36, ['nói giảm 10 lần', 're beo', 'hàng thanh lý rẻ lắm', 'có mấy trăm k', 'noi xao gia'], ['rẻ bèo', 'mấy trăm', 'thanh lý']],
    ['Đồ bạn cho mượn', 22, ['bạn cho mượn', 'muon cua ban', 'cầm hộ cho bạn', 'bạn tặng sinh nhật', 'ban tang'], ['cho mượn', 'cầm hộ', 'bạn tặng']],
    ['Mua lâu mới lôi', 16, ['đồ cũ mua lâu rồi', 'mua lau roi', 'cất trong tủ lâu nay', 'hàng tồn kho', 'co tu lau'], ['mua lâu', 'cất tủ', 'tồn kho']],
    ['Phục vụ công việc', 12, ['làm việc mới mua', 'lam viec moi mua', 'đầu tư kiếm tiền', 'cần cho học tập', 'phuc vu cong viec'], ['công việc', 'kiếm tiền', 'đầu tư']],
    ['Trúng thưởng minigame', 8, ['bốc thăm trúng', 'trung giveaway', 'quà tặng sự kiện', 'trúng quà miễn phí', 'trung thuong'], ['trúng thưởng', 'giveaway', 'minigame']],
    ['Mua hộ cho khách', 6, ['order hộ thằng em', 'mua gium', 'đặt giùm đồng nghiệp', 'mai giao khách', 'dat ho'], ['mua hộ', 'đặt giùm', 'order hộ']],
  ]),

  // =========================================================================
  // 4. TRƯỜNG HỌC, THI CỬ & TUỔI THƠ DỮ DỘI (ff_b079 – ff_b104)
  // =========================================================================
  q('ff_b079', CAT_SCHOOL, 'Vị trí ngồi "chiến lược" trong lớp dành cho hội chuyên ngủ gật và ăn vụng?', [
    ['Bàn cuối sát tường', 37, ['bàn cuối', 'ban cuoi lop', 'cuối lớp góc khuất', 'dãy cuối cùng', 'ngoi cuoi'], ['bàn cuối', 'cuối lớp', 'dãy cuối']],
    ['Sau đứa cao to', 22, ['sau lưng bạn cao', 'nap sau lung ban', 'bạn cao che cho', 'ngồi sau thằng mập', 'sau lung ban'], ['sau lưng', 'cao to', 'che chắn']],
    ['Góc sát cửa sổ', 15, ['cạnh cửa sổ', 'goc cua so', 'dãy ngoài cùng', 'ngắm trời ngủ', 'cua so'], ['cửa sổ', 'góc khuất', 'dãy ngoài']],
    ['Sát cửa sau chuồn', 12, ['gần cửa sau', 'sat cua sau', 'tiện trốn tiết', 'lẻn ra ngoài dễ', 'cua sau'], ['cửa sau', 'chuồn', 'trốn tiết']],
    ['Dựng chồng sách che', 8, ['chồng sách che mặt', 'dung sach cao', 'xây tường sách', 'lấp sau cặp sách', 'che sach'], ['chồng sách', 'che mặt', 'tường sách']],
    ['Góc chết camera', 6, ['góc mù camera', 'khuat camera', 'ngay dưới camera', 'điểm mù', 'goc mu'], ['camera', 'góc chết', 'góc mù']],
  ]),

  q('ff_b080', CAT_SCHOOL, 'Thầy cô gọi lên bảng kiểm tra bài cũ mà đầu trống rỗng, chiêu câu giờ kinh điển?', [
    ['Đi chậm gãi đầu', 34, ['gãi đầu gãi tai', 'di cham rai', 'đứng đơ trên bảng', 'câu giờ đi bộ', 'gai dau'], ['gãi đầu', 'chậm rãi', 'đứng đơ']],
    ['Lật sách tìm trang', 24, ['lật vở tìm bài', 'lat sach', 'mở sách thật lâu', 'hỏi trang nào ạ', 'tim bai'], ['lật sách', 'tìm bài', 'lật vở']],
    ['Xin đi xóa bảng', 17, ['xin xóa bảng', 'xoa bang', 'xin đi vệ sinh', 'giặt giẻ lau bảng', 'lau bang'], ['xóa bảng', 'giặt giẻ', 'lau bảng']],
    ['Đổ thừa ốm quên', 11, ['nhà mất điện', 'hom qua bi om', 'quên mang vở', 'chưa chép bài kịp', 'quen vo'], ['quên vở', 'mất điện', 'hôm qua ốm']],
    ['Xin gợi ý đầu', 8, ['xin gợi ý', 'goi y chu dau', 'nhờ nhắc mở bài', 'cầu cứu lớp nhắc', 'nhac bai'], ['gợi ý', 'chữ đầu', 'nhắc bài']],
    ['Đọc bừa mong trúng', 6, ['nói bừa đại đi', 'doc dai', 'chém gió lạc đề', 'đọc bài tuần trước', 'chem gio'], ['đọc bừa', 'chém gió', 'lạc đề']],
  ]),

  q('ff_b081', CAT_SCHOOL, 'Tuyệt chiêu quay cóp "táo bạo" thời đi học đứa nào cũng từng nghe hoặc thử?', [
    ['Giấu hộp bút chai', 34, ['dán vào chai nước', 'giau trong hop but', 'kẹp giấy trong thước', 'nhãn chai nước', 'hop but'], ['hộp bút', 'chai nước', 'kẹp thước']],
    ['Viết lên đùi tay', 24, ['viết lên tay', 'viet len dui', 'ghi lên lòng bàn tay', 'vén váy xem đùi', 'ghi len tay'], ['lên đùi', 'lên tay', 'bắp chân']],
    ['Kẹp phao ngăn bàn', 17, ['kẹp dưới đề thi', 'giau ngan ban', 'lật vở dưới hộc bàn', 'tài liệu dưới mông', 'ngan ban'], ['ngăn bàn', 'hộc bàn', 'kẹp đề']],
    ['Liếc bài bạn cạnh', 12, ['nhìn bài bạn', 'liec bai', 'xin bài đứa giỏi', 'trao đổi giấy nháp', 'nhin bai'], ['liếc bài', 'nhìn bài', 'giấy nháp']],
    ['Tra Google điện thoại', 8, ['giấu điện thoại hộc bàn', 'giau dien thoai', 'nhắn tin hỏi bài', 'chụp đề gửi ngoài', 'tra mang'], ['google', 'điện thoại', 'chụp đề']],
    ['Phao nhét tay áo', 5, ['phao ruột mèo', 'nhet tay ao', 'giấy nhét trong tất', 'cuộn giấy tí hon', 'tay ao'], ['tay áo', 'ruột mèo', 'nhét tất']],
  ]),

  q('ff_b082', CAT_SCHOOL, 'Thầy cô báo cuối tuần họp phụ huynh, học sinh lo sợ bí mật nào bị khui nhất?', [
    ['Điểm 0 trứng ngỗng', 36, ['điểm kém', 'diem 0', 'trứng ngỗng', 'bảng điểm thê thảm', 'toàn điểm liệt'], ['điểm kém', '0 điểm', 'trứng ngỗng']],
    ['Ghi sổ đầu bài', 22, ['lưu danh sổ đỏ', 'so dau bai', 'cô ghi tên nhiều lần', 'hạnh kiểm yếu', 'bi ghi so'], ['sổ đầu bài', 'hạnh kiểm', 'sổ đỏ']],
    ['Trốn tiết đi trễ', 16, ['cúp học', 'di hoc muon', 'bỏ tiết ra net', 'nghỉ không phép', 'tron tiet'], ['cúp học', 'trốn tiết', 'đi trễ']],
    ['Nói chuyện ngủ gật', 12, ['mất trật tự', 'ngu gat trong lop', 'ăn vụng bị bắt', 'làm việc riêng', 'noi chuyen'], ['ngủ gật', 'nói chuyện', 'trật tự']],
    ['Nợ quỹ hỏng đồ', 8, ['làm vỡ đồ trường', 'chua dong quy', 'ỉm tiền học phí', 'phá hoại bàn ghế', 'no quy lop'], ['quỹ lớp', 'học phí', 'ỉm tiền']],
    ['Lộ giả chữ ký', 6, ['tin nhắn cô giáo', 'co nhan me', 'cô mách tội qua zalo', 'phát hiện giả chữ ký', 'gia chu ky'], ['giả chữ ký', 'mách tội', 'tin nhắn']],
  ]),

  q('ff_b083', CAT_SCHOOL, 'Món ăn vặt huyền thoại trước cổng trường khiến học sinh móc sạch từng đồng lẻ?', [
    ['Bánh tráng trộn', 35, ['bánh tráng nướng', 'banh trang nuong', 'bánh tráng bơ', 'bánh tráng cuộn', 'banh trang'], ['bánh tráng', 'trộn', 'nướng']],
    ['Cá viên xiên bẩn', 24, ['xiên bẩn', 'ca vien chien', 'bò viên chiên', 'xúc xích rán', 'xien que'], ['cá viên', 'xiên bẩn', 'xúc xích']],
    ['Trà sữa trà chanh', 16, ['trà sữa 10k', 'tra sua', 'nước mía', 'siro đá bào', 'tra tac'], ['trà sữa', 'trà chanh', 'nước mía']],
    ['Xoài cóc muối ớt', 11, ['xoài lắc', 'coc dam', 'ổi lắc muối tôm', 'me ngào đường', 'xoai lac'], ['xoài lắc', 'cóc dầm', 'muối ớt']],
    ['Xôi mặn bánh mì', 8, ['bánh mì que', 'xoi man', 'xôi xéo', 'bánh bao nóng', 'xoi'], ['xôi mặn', 'bánh mì', 'xôi xéo']],
    ['Kem ống kẹo kéo', 6, ['kem chuối', 'kem ong', 'kẹo bông gòn', 'kẹo mút', 'kem'], ['kem ống', 'kẹo kéo', 'kẹo bông']],
  ]),

  q('ff_b084', CAT_SCHOOL, 'Làm bài tập nhóm 5 người, kiểu thành viên "ăn hại" nào đáng bị đá khỏi nhóm nhất?', [
    ['Mất tích tới deadline', 35, ['lặn mất tăm', 'mat tich', 'không rep tin nhắn', 'chỉ hỏi xong chưa', 'bơ nhóm'], ['mất tích', 'lặn mất', 'không rep']],
    ['Copy nguyên ChatGPT', 23, ['copy google', 'ai viet', 'làm qua loa cho có', 'không sửa font chữ', 'đạo văn'], ['chatgpt', 'copy', 'google']],
    ['Chỉ góp tên bìa', 17, ['ăn bám nhóm', 'an bam nhom', 'hưởng ké điểm', 'không làm bất cứ gì', 'gop ten'], ['góp tên', 'trang bìa', 'ăn bám']],
    ['Trễ hạn kéo chết', 11, ['trễ deadline', 'tre hen', 'hứa suông không giao', 'bùng kèo phút cuối', 'tre bai'], ['trễ deadline', 'hứa suông', 'phút cuối']],
    ['Phá hỏng file chung', 8, ['sửa lung tung', 'sua lung tung', 'format nhảy tùm lum', 'xóa nhầm phần chung', 'hong file'], ['hỏng file', 'sửa lung tung', 'xóa nhầm']],
    ['Đọc slide như vẹt', 6, ['thuyết trình như máy', 'doc slide', 'không hiểu mình nói gì', 'bị thầy hỏi đứng hình', 'khong hieu bai'], ['đọc slide', 'thuyết trình', 'như vẹt']],
  ]),

  q('ff_b085', CAT_SCHOOL, 'Chiêu giả bệnh kinh điển thời học sinh để xin nghỉ học ở nhà cày game?', [
    ['Kẹp nóng nhiệt kế', 35, ['nhiệt kế nước nóng', 'on nhiet ke', 'ngậm nước nóng giả sốt', 'giả sốt cao', 'nhiet ke'], ['nhiệt kế', 'giả sốt', 'nước nóng']],
    ['Ôm bụng kêu đau', 23, ['đau bụng quằn quại', 'dau bung quan quai', 'lăn lộn trên giường', 'giả trúng thực', 'om bung'], ['đau bụng', 'quằn quại', 'ôm bụng']],
    ['Giả ho khàn tiếng', 16, ['ho sặc sụa', 'gia ho', 'nói thều thào mất tiếng', 'sụt sịt sổ mũi', 'khan tieng'], ['ho sặc sụa', 'khàn tiếng', 'mất tiếng']],
    ['Giả chóng mặt ói', 12, ['buồn nôn', 'buon non', 'móc họng giả ói', 'đau đầu búa bổ', 'chong mat'], ['chóng mặt', 'buồn nôn', 'đau đầu']],
    ['Bôi phấn mặt xanh', 8, ['làm mặt tái', 'boi phan', 'bôi nước giả mồ hôi', 'đánh quầng mắt', 'mat xanh xao'], ['xanh xao', 'bôi phấn', 'mặt tái']],
    ['Đơn giả chữ ký', 6, ['tự viết đơn xin nghỉ', 'viet giay nghi om', 'nhờ bạn giả giọng bố', 'giấy phép giả', 'gia chu ky'], ['giả chữ ký', 'đơn xin nghỉ', 'giả giọng']],
  ]),

  q('ff_b086', CAT_SCHOOL, 'Trong giờ kiểm tra mà giám thị đứng sát bên nhìn chằm chằm, học sinh làm gì?', [
    ['Tim đập mồ hôi', 34, ['đổ mồ hôi hột', 'do mo hoi hot', 'run cầm cập', 'hồi hộp muốn xỉu', 'tim dap'], ['đổ mồ hôi', 'tim đập', 'run']],
    ['Đơ não quên sạch', 24, ['đơ đầu óc', 'quen het kien thuc', 'não trắng xóa', 'chữ nghĩa bay sạch', 'do nguoi'], ['đơ não', 'trắng xóa', 'quên sạch']],
    ['Cắn bút nhìn trần', 17, ['nhìn lên trần nhà', 'gia vo suy nghi', 'gãi đầu suy nghĩ', 'tỏ vẻ nghiêm túc', 'can but'], ['trần nhà', 'cắn bút', 'suy nghĩ']],
    ['Che kín giấu phao', 12, ['che bài kín mít', 'che bai kin mit', 'cúi sát xuống bàn', 'sợ rớt phao', 'che phao'], ['che bài', 'giấu phao', 'rớt phao']],
    ['Mong thầy đi qua', 8, ['cầu thầy đi chỗ khác', 'cau troi thay di', 'ước thầy ra bàn khác', 'nhẩm cầu nguyện', 'di cho khac'], ['đi qua', 'chỗ khác', 'cầu trời']],
    ['Nháy mắt cầu cứu', 5, ['cầu cứu bạn', 'cau cuu ban', 'bất lực nhìn sang', 'ra ký hiệu dừng', 'nhay mat'], ['cầu cứu', 'nháy mắt', 'bất lực']],
  ]),

  q('ff_b087', CAT_SCHOOL, 'Trò nghịch dại "tuổi thơ dữ dội" nào đứa trẻ Việt nào cũng từng làm rồi chạy?', [
    ['Bấm chuông bỏ chạy', 34, ['bấm chuông nhà người ta', 'bam chuong cua', 'gõ cửa trêu chạy', 'phá chuông hàng xóm', 'bam chuong'], ['bấm chuông', 'gõ cửa', 'bỏ chạy']],
    ['Hái trộm trái cây', 25, ['hái trộm xoài ổi', 'hai trom xoai', 'trèo tường trộm ổi', 'bị chủ nhà rượt', 'trom trai cay'], ['hái trộm', 'xoài ổi', 'trái cây']],
    ['Chọc chó tổ ong', 17, ['trêu chó dữ', 'treu cho du', 'ném đá tổ ong', 'bị chó rượt cắn', 'choc cho'], ['tổ ong', 'trêu chó', 'chó rượt']],
    ['Đốt pháo đốt rơm', 11, ['nghịch lửa', 'nghich lua', 'đốt pháo tự chế', 'châm lửa đống lá', 'dot phao'], ['đốt rơm', 'đốt pháo', 'nghịch lửa']],
    ['Ném đá vỡ kính', 8, ['bắn ná vỡ kính', 'nem da', 'đá bóng bể kính', 'chọi đá mái tôn', 'vo kinh'], ['vỡ kính', 'ném đá', 'bắn ná']],
    ['Ở truồng tắm mưa', 5, ['tắm mưa tắm sông', 'tam song', 'nhảy mương bùn', 'lội ruộng bắt cá', 'tam muong'], ['tắm mưa', 'tắm sông', 'ở truồng']],
  ]),

  q('ff_b088', CAT_SCHOOL, 'Câu nói "lừa tình" kinh điển nhất của thầy cô trước mỗi kỳ thi hoặc kiểm tra?', [
    ['Đề dễ cơ bản', 36, ['cơ bản thôi', 'bai thi nhe', 'học trong vở là làm', 'không đánh đố đâu', 'de nhe nhang'], ['đề dễ', 'cơ bản', 'trong vở']],
    ['Lên đại học nhàn', 22, ['cố nốt đi', 'len dai hoc nhan lam', 'thi xong tha hồ chơi', 'đậu cấp 3 là sướng', 'dai hoc nhan'], ['đại học', 'nhàn lắm', 'cố nốt']],
    ['Phần này không thi', 16, ['không ra thi đâu', 'khong thi dau', 'bỏ qua phần này', 'đọc cho biết thôi', 'khong cho thi'], ['không thi', 'bỏ qua', 'tham khảo']],
    ['Lớp tệ nhất trường', 12, ['lớp tệ nhất', 'lop te nhat', 'mấy khóa trước giỏi hơn', 'lớp cá biệt', 'te nhat truong'], ['tệ nhất', 'khóa trước', 'cá biệt']],
    ['Không lấy điểm đâu', 8, ['hỏi vui thôi', 'khong lay diem', 'kiểm tra cho vui', 'không trừ điểm', 'khong tinh diem'], ['không lấy điểm', 'hỏi vui', 'không tính']],
    ['Thầy thấy hết đấy', 6, ['tôi thấy hết', 'thay het day', 'camera chạy bằng mắt', 'ngồi trên nhìn rõ lắm', 'nhin ro lam'], ['thấy hết', 'nhìn rõ', 'bục giảng']],
  ]),

  q('ff_b089', CAT_SCHOOL, 'Khi trốn tiết trèo tường cúp học ra ngoài chơi, học sinh sợ đụng mặt ai nhất?', [
    ['Bố mẹ đi ngang', 35, ['gặp bố mẹ', 'bo me chay ngang', 'phụ huynh bắt gặp', 'đụng trúng mẹ đi chợ', 'gap phu huynh'], ['bố mẹ', 'phụ huynh', 'bắt gặp']],
    ['Giám thị chủ nhiệm', 23, ['thầy giám thị', 'giao vien chu nhiem', 'cô chủ nhiệm', 'sao đỏ', 'giam thi'], ['giám thị', 'chủ nhiệm', 'sao đỏ']],
    ['Bác bảo vệ trường', 16, ['bác bảo vệ', 'bao ve truong', 'bảo vệ cầm gậy', 'bị chặn ngay cổng', 'bao ve'], ['bảo vệ', 'chặn cổng', 'cầm gậy']],
    ['Đứa lớp trưởng mách', 12, ['đứa hay mách lẻo', 'lop truong', 'chụp ảnh gửi cô', 'kẻ chỉ điểm', 'mach leo'], ['lớp trưởng', 'mách lẻo', 'chỉ điểm']],
    ['Thầy hiệu trưởng', 8, ['ban giám hiệu', 'hieu truong', 'cô hiệu phó', 'sếp lớn của trường', 'ban giam hieu'], ['hiệu trưởng', 'hiệu phó', 'giám hiệu']],
    ['Người quen hàng xóm', 6, ['cô bán hàng quen', 'co ban nuoc', 'hàng xóm gần trường', 'người quen mách mẹ', 'hang xom'], ['quen mặt', 'hàng xóm', 'người quen']],
  ]),

  q('ff_b090', CAT_SCHOOL, 'Thứ gì trong cặp sách học sinh cấp 2-3 hay bị tịch thu khi kiểm tra đột xuất?', [
    ['Điện thoại giấu đáy', 38, ['điện thoại', 'dien thoai', 'smartphone', 'máy chơi game', 'giấu máy'], ['điện thoại', 'smartphone', 'giấu máy']],
    ['Son phấn gương lược', 21, ['son môi', 'guong luoc', 'phấn trang điểm', 'nước hoa', 'do trang diem'], ['son', 'gương lược', 'trang điểm']],
    ['Truyện tranh ngôn tình', 15, ['truyện tranh', 'truyen ngon tinh', 'manga', 'doraemon conan', 'sach doc trom'], ['truyện tranh', 'ngôn tình', 'manga']],
    ['Bộ bài tây Uno', 12, ['bài tú lơ khơ', 'bo bai', 'bài uno', 'bài ma sói', 'bai tu lo kho'], ['bộ bài', 'uno', 'ma sói']],
    ['Đồ ăn vặt kẹo', 8, ['bánh kẹo', 'banh keo', 'bánh tráng trộn', 'trà sữa', 'do an'], ['bánh kẹo', 'đồ ăn vặt', 'trà sữa']],
    ['Phao tài liệu nhỏ', 6, ['phao thi', 'tai lieu quay cop', 'máy nghe nhạc', 'tai nghe', 'phao'], ['phao', 'tài liệu', 'tai nghe']],
  ]),

  q('ff_b091', CAT_SCHOOL, 'Lý do "trời đánh" nhất sinh viên hay bịa ra để xin nghỉ học hoặc dời deadline?', [
    ['Thủng lốp chết máy', 34, ['hư xe', 'thung lop', 'xịt lốp xe', 'xe chết máy', 'xe hong'], ['thủng lốp', 'hư xe', 'chết máy']],
    ['Đau bụng cấp cứu', 24, ['ngộ độc thực phẩm', 'ngo doc thuc pham', 'nằm viện truyền nước', 'sốt xuất huyết', 'cap cuu'], ['ngộ độc', 'cấp cứu', 'nằm viện']],
    ['Mất điện mất wifi', 17, ['mất mạng', 'cup dien', 'file bị lỗi', 'sập hệ thống nộp bài', 'mat mang'], ['mất điện', 'mất mạng', 'lỗi file']],
    ['Quê có đám giỗ', 12, ['về quê đám giỗ', 'nha co viec', 'có tang người thân', 'đám cưới người nhà', 'dam gio'], ['đám giỗ', 'có tang', 'về quê']],
    ['Kẹt xe ngập đường', 8, ['kẹt xe cứng', 'ngap duong', 'mưa bão ngập lụt', 'kẹt thang máy', 'ket xe'], ['kẹt xe', 'ngập đường', 'thang máy']],
    ['Ngủ quên tắt chuông', 5, ['hỏng báo thức', 'ngu quen', 'điện thoại hết pin', 'không nghe chuông', 'bao thuc'], ['ngủ quên', 'báo thức', 'hết pin']],
  ]),

  q('ff_b092', CAT_SCHOOL, 'Đang ngủ gật trên bàn bỗng nghe thầy gọi tên đọc bài, bạn chữa cháy thế nào?', [
    ['Ngơ ngác chờ nhắc', 35, ['đứng dậy ngơ ngác', 'cho ban nhac', 'hỏi bạn đọc tới đâu', 'nhìn bạn cầu cứu', 'ngo ngac'], ['ngơ ngác', 'chờ nhắc', 'cầu cứu']],
    ['Hỏi nhắc lại đề', 23, ['thầy nhắc lại câu hỏi', 'em chua nghe ro', 'giả vờ không nghe thấy', 'câu giờ định thần', 'nhac lai'], ['nhắc lại', 'chưa nghe rõ', 'câu hỏi']],
    ['Cúi lật vội sách', 16, ['tìm dòng đọc', 'tim dong doc', 'nhìn vào vở nói bừa', 'vờ nãy giờ theo dõi', 'lat sach'], ['tìm dòng', 'lật sách', 'nhìn vở']],
    ['Em đồng ý bạn', 12, ['đồng ý với bạn trước', 'dong y y kien', 'chọn bừa đáp án c', 'nói bừa một câu', 'noi bua'], ['đồng ý', 'ý kiến', 'nói bừa']],
    ['Quệt vội nước dãi', 8, ['lau nước dãi', 'chui nuoc mieng', 'vuốt mặt cho tỉnh', 'lấy tay dụi mắt', 'nuoc dai'], ['nước dãi', 'nước miếng', 'dụi mắt']],
    ['Thú nhận chưa làm', 6, ['nhận tội luôn', 'em khong biet', 'chịu phạt đứng', 'thú thật không thuộc', 'em chiu'], ['nhận tội', 'không biết', 'chịu phạt']],
  ]),

  q('ff_b093', CAT_SCHOOL, 'Cơn ác mộng thời đi học nào khiến nhiều người đi làm rồi vẫn hay nằm mơ thấy?', [
    ['Chưa học vào thi', 35, ['chưa ôn bài', 'chua hoc gi', 'trắng giấy thi', 'đọc đề toàn chữ giun', 'trang giay'], ['chưa học', 'phòng thi', 'trắng giấy']],
    ['Quên bút máy tính', 23, ['quên bút', 'quen may tinh', 'quên thẻ sinh viên', 'rớt bút hết mực', 'mat but'], ['quên bút', 'máy tính', 'thẻ thi']],
    ['Rớt môn học lại', 16, ['trượt đại học', 'rot mon', 'thi lại', 'học lại khóa dưới', 'truot tot nghiep'], ['rớt môn', 'học lại', 'thi lại']],
    ['Đi trễ đứng cổng', 12, ['đi học muộn', 'di tre', 'bị ghi sổ đầu bài', 'quên đồng phục', 'dung cong'], ['đi trễ', 'cổng trường', 'đồng phục']],
    ['Học tủ bị lệch', 8, ['trúng chỗ mình bỏ', 'trung ngay cho bo', 'trả bài miệng đầu giờ', 'lên bảng đứng đơ', 'lech tu'], ['lệch tủ', 'học tủ', 'chỗ bỏ']],
    ['Đứng lớp đọc sai', 6, ['nói vấp trước lớp', 'bi ca lop cuoi', 'quên lời thuyết trình', 'quê giữa lớp', 'bi cuoi'], ['bị cười', 'văn mẫu', 'quê giữa lớp']],
  ]),

  q('ff_b094', CAT_SCHOOL, 'Món đồ dùng học tập nào biến mất bí ẩn nhất trên bàn chỉ sau giờ ra chơi?', [
    ['Cây bút bi xanh', 38, ['cây bút bi', 'but bi', 'cây viết', 'mất bút', 'bút xóa'], ['bút bi', 'cây viết', 'bút xóa']],
    ['Cục tẩy gôm chì', 21, ['cục tẩy', 'cuc gom', 'gôm tẩy chì', 'rớt xuống đất mất tiêu', 'cuc tay'], ['cục tẩy', 'cục gôm', 'tẩy chì']],
    ['Thước kẻ compa', 15, ['thước kẻ', 'thuoc ke', 'compa', 'ê ke', 'cay thuoc'], ['thước kẻ', 'compa', 'ê-ke']],
    ['Giấy kiểm tra nháp', 12, ['giấy kiểm tra', 'giay doi', 'tờ giấy nháp', 'tập vở để quên', 'giay kiem tra'], ['giấy kiểm tra', 'giấy đôi', 'giấy nháp']],
    ['Băng dính cây kéo', 8, ['cuộn băng keo', 'bang dinh', 'kéo cắt giấy', 'hồ dán', 'keo cat'], ['băng dính', 'băng keo', 'hồ dán']],
    ['Ngòi chì máy tính', 6, ['ruột bút chì bấm', 'ruot but chi', 'bút chì bấm', 'máy tính casio', 'casio'], ['bút chì', 'ruột chì', 'casio']],
  ]),

  q('ff_b095', CAT_SCHOOL, 'Lén ăn vặt trong giờ học, dấu hiệu nào làm thầy cô phát hiện ra nhanh nhất?', [
    ['Mùi thức ăn nồng', 36, ['mùi bánh tráng trộn', 'mui do an', 'mùi mắm ruốc', 'mùi mì tôm khô', 'mui thuc an'], ['mùi thức ăn', 'bánh tráng', 'mắm ruốc']],
    ['Miệng nhai phồng má', 22, ['miệng đang nhai', 'nhai nhop nhep', 'má phồng cứng đơ', 'nuốt vội mắc nghẹn', 'phong ma'], ['nhai', 'nhóp nhép', 'phồng má']],
    ['Tiếng sột soạt nilon', 16, ['tiếng bịch nilon', 'sot soat', 'xé gói snack kêu to', 'bóc kẹo lách cách', 'tui nilon'], ['sột soạt', 'túi nilon', 'xé gói']],
    ['Cả lũ cười lén', 12, ['cả đám cười khúc khích', 'ban be chi diem', 'xì xào chia nhau ăn', 'tố cáo bằng mắt', 'cuoi khuc khich'], ['cười khúc khích', 'cả lũ', 'chia nhau']],
    ['Vỏ rác dưới chân', 8, ['vỏ kẹo dưới sàn', 'rac duoi chan', 'trà sữa đổ sàn', 'vụn bánh trên bàn', 'vo banh'], ['vỏ bánh', 'vụn bánh', 'dưới chân']],
    ['Xuống bắt quả tang', 6, ['bắt tại trận', 'khong kip giau', 'tay vẫn cầm xiên que', 'lúng túng cất đồ', 'bat qua tang'], ['bắt quả tang', 'không kịp giấu', 'cầm tay']],
  ]),

  q('ff_b096', CAT_SCHOOL, 'Trò chơi "cổ lỗ sĩ" nào học sinh hay bày ra trên mặt bàn lúc chán tiết học?', [
    ['Đánh cờ caro giấy', 36, ['chơi caro', 'co caro', 'vẽ bàn cờ giấy', 'đấu caro bạn cùng bàn', 'caro'], ['caro', 'cờ caro', 'bàn cờ']],
    ['Vẽ bậy sách vở', 22, ['chế ảnh sách giáo khoa', 've bay', 'vẽ râu danh nhân', 'vẽ góc vở', 'che anh'], ['vẽ bậy', 'sách giáo khoa', 'vẽ râu']],
    ['Truyền thư giấy tay', 16, ['truyền giấy', 'viet thu tay', 'nhắn tin giấy qua lại', 'chat bằng giấy', 'truyen giay'], ['truyền giấy', 'thư tay', 'chat giấy']],
    ['Xếp máy bay giấy', 12, ['máy bay giấy', 'may bay giay', 'búng nắp bút', 'gấp hạc giấy', 'bung nap but'], ['máy bay giấy', 'búng nắp', 'gấp giấy']],
    ['Oẳn tù tì búng', 8, ['oẳn tù tì', 'oan tu ti', 'đánh tay đỏ ửng', 'búng trán phạt', 'dap tay'], ['oẳn tù tì', 'đập tay', 'búng tai']],
    ['Bói tên với crush', 6, ['bói tình duyên', 'boi tinh duyen', 'cộng nét chữ tên', 'viết tên người thích', 'boi bai'], ['bói tên', 'tình duyên', 'crush']],
  ]),

  q('ff_b097', CAT_SCHOOL, 'Sinh viên ở trọ gần trường thường sống sót qua mùa thi cử bằng tuyệt chiêu gì?', [
    ['Ôn tủ trắng đêm', 34, ['nước tới chân nhảy', 'on tu cap toc', 'học dồn 1 đêm', 'cày đề cương đêm', 'hoc dem'], ['ôn tủ', 'cấp tốc', 'đề cương']],
    ['Cà phê bò húc', 24, ['uống cà phê đen', 'ca phe den', 'nước tăng lực', 'nốc cà phê chống ngủ', 'uong bo huc'], ['cà phê', 'bò húc', 'tăng lực']],
    ['Đi chùa cầu qua', 17, ['thắp hương qua môn', 'di chua', 'ăn xôi đỗ đỏ', 'xin vía thủ khoa', 'cau qua mon'], ['đi chùa', 'thắp hương', 'qua môn']],
    ['Học nhóm nói chuyện', 11, ['toàn tám chuyện', 'hoc nhom tam chuyen', 'ra quán cà phê lướt đt', 'học 15p chơi 2 tiếng', 'ra quan cf'], ['học nhóm', 'tám chuyện', 'chuyện phiếm']],
    ['In phao mini phòng', 8, ['chuẩn bị phao', 'chuan bi phao', 'photo tài liệu bỏ túi', 'lưu slide điện thoại', 'tai lieu'], ['in phao', 'photo', 'mini']],
    ['Cầu chấm nương tay', 6, ['cầu 4 điểm qua', 'cau nuong tay', 'đủ điểm d thôi', 'mong thầy cho vớt', 'qua mon'], ['nương tay', '4 điểm', 'cho vớt']],
  ]),

  q('ff_b098', CAT_SCHOOL, 'Trò đùa "mất dạy" hay làm với đứa bạn cùng bàn khiến nó tức điên lên?', [
    ['Kéo ghế lúc ngồi', 35, ['kéo ghế', 'keo ghe', 'rút ghế té ngửa', 'chơi khăm dập mông', 'rut ghe'], ['kéo ghế', 'rút ghế', 'té ngửa']],
    ['Giấu cặp hộp bút', 23, ['giấu cặp sách', 'giau hop but', 'lấy bút không trả', 'giấu dép dưới bàn', 'giau do'], ['giấu cặp', 'hộp bút', 'giấu dép']],
    ['Dán giấy sau lưng', 16, ['bôi mực lên áo', 'boi muc', 'ghi chữ bậy dán lưng', 'vẩy mực vào vở', 'dan giay'], ['dán giấy', 'sau lưng', 'bôi mực']],
    ['Đẩy tay lúc viết', 12, ['đẩy khuỷu tay', 'day khuyu tay', 'chọc nguệch ngoạc', 'kéo vở lúc chép', 'day tay'], ['đẩy tay', 'khuỷu tay', 'nguệch ngoạc']],
    ['Vẽ mặt lúc ngủ', 8, ['vẽ bậy lên tay', 've len tay', 'buộc dây giày vào bàn', 'thắt nút cặp', 'buoc day giay'], ['vẽ mặt', 'buộc dây', 'lúc ngủ']],
    ['Hô thầy nhìn kìa', 6, ['dọa thầy tới', 'thay nhin kia', 'la to giật mình', 'báo động giả', 'giat minh'], ['giật mình', 'thầy nhìn', 'báo động']],
  ]),

  q('ff_b099', CAT_SCHOOL, 'Cầm tờ đề thi dài 3 trang toàn chữ mà mình chỉ ôn mỗi phần đầu, bạn làm gì?', [
    ['Cười trừ nhìn trần', 34, ['cười bất lực', 'cuoi tru', 'ngồi ngắm giám thị', 'thở dài nhìn trời', 'cuoi bat luc'], ['cười trừ', 'ngắm giám thị', 'bất lực']],
    ['Tìm câu dễ vớt', 24, ['đọc lướt tìm câu', 'doc luot de', 'kiếm điểm lẻ', 'vớt vát nửa điểm', 'tim cau de'], ['vớt vát', 'câu dễ', 'kiếm điểm']],
    ['Liếc bài đứa giỏi', 17, ['chờ bạn làm liếc', 'nhin bai ban', 'nhìn bài bên cạnh', 'khều bạn hỏi đáp án', 'liec bai'], ['liếc bài', 'đứa giỏi', 'bên cạnh']],
    ['Chém gió viết dài', 12, ['viết dài kín giấy', 'chem gio', 'chép lại đề văn', 'bịa công thức', 'viet dai'], ['chém gió', 'viết dài', 'chép đề']],
    ['Tính tiền học lại', 8, ['vẽ bậy lên nháp', 'tinh tien hoc lai', 'tính điểm đỡ liệt', 'tính tổng kết', 've nhap'], ['vẽ nháp', 'học lại', 'tính điểm']],
    ['Hẹn môn kỳ sau', 5, ['chấp nhận rớt môn', 'hen ky sau', 'nộp bài sớm đi ngủ', 'từ bỏ cuộc chơi', 'rot mon roi'], ['kỳ sau', 'rớt môn', 'nộp sớm']],
  ]),

  q('ff_b100', CAT_SCHOOL, 'Điều gì thời đi học khiến học sinh sướng vỡ òa ngang ngửa trúng độc đắc?', [
    ['Thầy bận cho nghỉ', 38, ['thầy cô ốm họp', 'nghi tiet', 'tiết trống được chơi', 'được nghỉ môn khó', 'cho nghi'], ['nghỉ tiết', 'bận họp', 'tiết trống']],
    ['Mất điện về sớm', 21, ['cúp điện về sớm', 'mat dien', 'trường cho tan sớm', 'không có tiết 5', 've som'], ['mất điện', 'về sớm', 'tan học']],
    ['Nghỉ bão ngập đường', 15, ['nghỉ bão lụt', 'nghi hoc vi bao', 'mưa bão toàn trường nghỉ', 'ngập đường nghỉ', 'nghi bao'], ['bão lụt', 'nghỉ bão', 'ngập đường']],
    ['Thoát trả bài miệng', 12, ['thầy quên kiểm tra', 'khong tra bai', 'tên sát nút hết giờ', 'thoát nạn đầu giờ', 'thoat nan'], ['trả bài', 'thoát nạn', 'quên kiểm tra']],
    ['Lụi trúng điểm cao', 8, ['điểm cao bất ngờ', 'diem cao', 'lụi trắc nghiệm trúng', 'vượt mặt lớp trưởng', 'trung tui'], ['điểm cao', 'trúng tủ', 'vượt mặt']],
    ['Ra chơi lố giờ', 6, ['ra chơi thêm 10p', 'ra choi lau', 'trống trường bị hư', 'cô đến muộn', 'co den muon'], ['ra chơi', 'trống hư', 'đến muộn']],
  ]),

  q('ff_b101', CAT_SCHOOL, 'Nếu được quay lại năm cấp 3 đúng một ngày, việc đầu tiên bạn làm cho bõ tức?', [
    ['Tỏ tình với crush', 35, ['nói thích crush', 'to tinh', 'hôn trộm crush', 'không bỏ lỡ tình đầu', 'gap crush'], ['tỏ tình', 'crush', 'tình đầu']],
    ['Nhắc bố mua đất', 23, ['mua đất', 'mua bitcoin', 'bảo bố mẹ mua vàng', 'đọc kết quả xổ số', 'mua dat'], ['bitcoin', 'mua đất', 'mua vàng']],
    ['Bật đứa bắt nạt', 16, ['trả đũa bắt nạt', 'bat lai', 'chửi thẳng mặt đứa ghét', 'đánh nhau một trận', 'tra dua'], ['bắt nạt', 'bật lại', 'trả đũa']],
    ['Học chăm bớt dốt', 12, ['học hành tử tế', 'hoc tu te', 'cày tiếng anh sớm', 'chọn đúng ngành học', 'hoc cham'], ['học tử tế', 'bớt dốt', 'chọn ngành']],
    ['Chơi hết mình bạn', 8, ['tụ tập với bạn', 'choi voi ban', 'chụp nhiều ảnh kỷ yếu', 'đi ăn cùng cả lớp', 'choi het minh'], ['chơi hết mình', 'kỷ yếu', 'tụ tập']],
    ['Cúp học một bữa', 6, ['trốn tiết ra net', 'cup hoc', 'quậy phá một bữa', 'nghịch dại tuổi trò', 'quay pha'], ['cúp học', 'quậy phá', 'trốn tiết']],
  ]),

  q('ff_b102', CAT_SCHOOL, 'Câu mắng "đi vào tiềm thức" của thầy cô khi cả lớp ồn ào mất trật tự?', [
    ['Ồn như chợ vỡ', 36, ['cả lớp như cái chợ', 'cai cho vo', 'chợ cá ngoài đường à', 'mất trật tự quá', 'cho vo'], ['chợ vỡ', 'cái chợ', 'chợ cá']],
    ['Như cái máy nói', 22, ['độc thoại một mình à', 'cai may noi', 'coi tôi không khí à', 'nói đầu gối nghe à', 'noi mot minh'], ['máy nói', 'độc thoại', 'không khí']],
    ['Lên giảng thay tôi', 16, ['lên đây dạy thay', 'len day giang thay', 'giỏi lên bục giảng', 'nhường bảng cho nói', 'giang thay'], ['giảng thay', 'dạy thay', 'lên bục']],
    ['Ghi sổ đầu bài', 12, ['im ngay tôi ghi sổ', 'ghi so dau bai', 'trừ điểm hạnh kiểm', 'cấm thi cả lớp', 'tru diem'], ['sổ đầu bài', 'hạnh kiểm', 'cấm thi']],
    ['Lớp tệ nhất trường', 8, ['lớp tệ nhất', 'te nhat truong', 'vô ý thức hết nói', 'lớp cá biệt', 'vo y thuc'], ['tệ nhất', 'vô ý thức', 'cá biệt']],
    ['Không học ra ngoài', 6, ['mời ra khỏi lớp', 'di ra ngoai', 'đứng ngoài hành lang', 'xách cặp ra ngoài', 'ra khoi lop'], ['ra ngoài', 'khỏi lớp', 'hành lang']],
  ]),

  q('ff_b103', CAT_SCHOOL, 'Nỗi ám ảnh lớn nhất của sinh viên mỗi khi nhận thông báo từ phòng đào tạo?', [
    ['Đóng tăng học phí', 36, ['tăng học phí', 'dong hoc phi', 'nộp tiền học kỳ mới', 'trễ hạn khóa môn', 'hoc phi'], ['học phí', 'tăng học phí', 'khóa môn']],
    ['Sập web tín chỉ', 22, ['cổng đăng ký sập', 'dang ky tin chi', 'rớt mạng mất slot', 'canh 12h đêm giành môn', 'tin chi'], ['tín chỉ', 'sập web', 'giành môn']],
    ['Rớt môn học lại', 16, ['đóng tiền học lại', 'rot mon', 'học cải thiện', 'nợ môn ra trường', 'hoc lai'], ['rớt môn', 'học lại', 'nợ môn']],
    ['Thi dồn nhiều môn', 12, ['lịch thi dày đặc', 'thi don', 'sáng thi chiều thi', 'trùng lịch thi', 'lich thi'], ['lịch thi', 'thi dồn', 'trùng lịch']],
    ['Cảnh báo học vụ', 8, ['điểm rèn luyện thấp', 'diem ren luyen', 'thiếu chứng chỉ anh', 'rớt chuẩn đầu ra', 'canh bao hoc vu'], ['học vụ', 'rèn luyện', 'chứng chỉ']],
    ['Đổi lịch 7h sáng', 6, ['học 7 giờ sáng', 'doi phong thi', 'tiết 1 ngày mưa', 'đổi phòng đột xuất', 'tiet 1'], ['7 giờ', 'đổi phòng', 'tiết 1']],
  ]),

  q('ff_b104', CAT_SCHOOL, 'Hồi nhỏ đi mẫu giáo tiểu học, lý do gì làm trẻ con khóc thét nhất trước cổng trường?', [
    ['Sợ xa bố mẹ', 36, ['bám chặt bố mẹ', 'so xa bo me', 'khóc đòi về nhà', 'ôm chân mẹ khóc', 'doi ve'], ['xa bố mẹ', 'ôm chân', 'đòi về']],
    ['Sợ cô giáo mắng', 22, ['bị ép ăn ép ngủ', 'ep an com', 'sợ cô cầm thước', 'không thích ngủ trưa', 'so co'], ['cô giáo', 'ép ăn', 'ngủ trưa']],
    ['Chưa làm bài sợ', 16, ['quên làm bài tập', 'chua lam bai tap', 'sợ đánh thước kẻ', 'thiếu vở bài tập', 'so bi phat'], ['bài tập', 'bị phạt', 'thước kẻ']],
    ['Bị bạn đánh trêu', 12, ['bị bạn bắt nạt', 'giat do choi', 'giật đồ chơi', 'cãi nhau với bạn', 'bi bat nat'], ['bắt nạt', 'bạn đánh', 'giật đồ']],
    ['Buồn vệ sinh tè', 8, ['đau bụng mắc tiểu', 'dau bung', 'tè dầm ra quần', 'sợ toilet trường', 'te dam'], ['tè dầm', 'đau bụng', 'vệ sinh']],
    ['Quên cặp bị trêu', 6, ['quên mang đồ', 'quen do', 'mới cắt tóc đầu nấm', 'mất bình nước', 'quen mang do'], ['quên đồ', 'đầu nấm', 'mất bình']],
  ]),

  // =========================================================================
  // 5. TÌNH HUỐNG DỞ KHÓC DỞ CƯỜI & BỰA XÃ HỘI (ff_b105 – ff_b130)
  // =========================================================================
  q('ff_b105', CAT_CHAOS, 'Đang chạy xe ngon trớn bỗng thấy chú CSGT ngoắc gậy vào lề, suy nghĩ đầu tiên?', [
    ['Bay nửa tháng lương', 35, ['mất tiền phạt', 'mat tien phat', 'lại tốn tiền rồi', 'chết mẹ toang', 'bay tien'], ['nửa tháng lương', 'tiền phạt', 'toang']],
    ['Có lỗi gì đâu', 23, ['tôi làm gì sai đâu', 'vi pham gi dau', 'bắt nhầm người rồi', 'kiểm tra xi nhan', 'khong co loi'], ['vi phạm', 'lỗi gì', 'bắt nhầm']],
    ['Vờ chỉ xe sau', 16, ['ngoắc xe sau', 'chac bat xe sau', 'đánh liều rồ ga đi', 'vờ không thấy', 'ngoac xe sau'], ['xe sau', 'người sau', 'rồ ga']],
    ['Quên mang giấy tờ', 12, ['quên bằng lái', 'quen bang lai', 'hết hạn bảo hiểm', 'không mang căn cước', 'mat giay to'], ['bằng lái', 'giấy tờ', 'bảo hiểm']],
    ['Gọi điện người thân', 8, ['gọi điện cầu cứu', 'goi nguoi than', 'tấp lề bấm máy', 'nhờ người quen xin', 'goi dien'], ['người thân', 'cầu cứu', 'gọi điện']],
    ['Xin tha sinh viên', 6, ['năn nỉ xin tha', 'sinh vien ngheo', 'giả khờ xin bỏ qua', 'mới đi làm ngày đầu', 'nan ni'], ['sinh viên', 'năn nỉ', 'xin tha']],
  ]),

  q('ff_b106', CAT_CHAOS, 'Nỗi thất vọng "sốc tận óc" khi gặp mặt đối tượng quẹt trên app hẹn hò ngoài đời?', [
    ['Khác xa ảnh mạng', 38, ['lừa tình filter', 'anh mang lua tinh', 'ảnh 360 ngoài đời 180', 'vỡ mộng nhan sắc', 'khac anh'], ['khác ảnh', 'vỡ mộng', 'filter']],
    ['Gạ bán bảo hiểm', 21, ['đa cấp lừa đảo', 'da cap', 'rủ đầu tư tiền ảo', 'gạ mở thẻ ngân hàng', 'lua dao'], ['đa cấp', 'bảo hiểm', 'tiền ảo']],
    ['Quên ví bắt bao', 15, ['bắt mình trả hết', 'quen vi', 'gọi món đắt rồi chuồn', 'lợi dụng ăn chùa', 'an chua'], ['quên ví', 'trả hết', 'ăn chùa']],
    ['Nói chuyện vô duyên', 12, ['nói chuyện nhạt nhẽo', 'vo duyen', 'cắm đầu bấm điện thoại', 'thô lỗ khoe khoang', 'nhat nheo'], ['vô duyên', 'nhạt nhẽo', 'thô lỗ']],
    ['Lùn béo hơn ảnh', 8, ['chiều cao khiêm tốn', 'beo hon anh', 'lùn hơn khai báo', 'gầy trơ xương', 'lun hon'], ['lùn hơn', 'béo hơn', 'ngoại hình']],
    ['Đã có vợ chồng', 6, ['có gia đình rồi', 'co bo roi', 'đeo nhẫn cưới đi hẹn', 'lén nghe vợ gọi', 'da ket hon'], ['gia đình', 'nhẫn cưới', 'có bồ']],
  ]),

  q('ff_b107', CAT_CHAOS, 'Cảnh tượng "dở khóc dở cười" nhất khi khui hộp hàng đặt mua online giá rẻ?', [
    ['Hàng như giẻ lau', 36, ['khác xa ảnh mẫu', 'nhu gie lau nha', 'hàng chợ vải mỏng tang', 'lệch pha 180 độ', 'hang re rach'], ['giẻ lau', 'khác mẫu', 'lệch pha']],
    ['Giao nhầm lệch size', 22, ['sai kích thước', 'nham size', 'đặt size s gửi khổng lồ', 'rộng thùng thình', 'sai size'], ['nhầm size', 'sai size', 'thùng thình']],
    ['Bé tí đồ chơi', 16, ['nhỏ xíu như đồ chơi', 'be ti teo', 'mua cái nồi nhận cái chén', 'mô hình mini', 'be xiu'], ['bé tí', 'đồ chơi', 'tí hon']],
    ['Bên trong toàn gạch', 12, ['hộp toàn gạch đá', 'gach da', 'shop nhét rác', 'mở ra chai nước lọc', 'bi lua'], ['gạch đá', 'nhét rác', 'tráo hàng']],
    ['Vỡ nát móp méo', 8, ['bể nát bét', 'vo nat', 'đổ tràn hết ra hộp', 'gãy đôi không dùng', 'mop meo'], ['vỡ nát', 'móp méo', 'bể nát']],
    ['Thiếu đồ hàng cũ', 6, ['thiếu phụ kiện', 'thieu phu kien', 'giao thiếu số lượng', 'hàng xài rồi bám bụi', 'hang cu'], ['thiếu phụ kiện', 'hàng cũ', 'thiếu đồ']],
  ]),

  q('ff_b108', CAT_CHAOS, 'Đứng giữa ngã tư kẹt xe giờ tan tầm trời nắng gắt, bạn hay thấy cảnh bựa gì?', [
    ['Xe leo vỉa hè', 35, ['leo lề đường', 'leo via he', 'chạy ngược chiều vỉa hè', 'bóp còi điếc tai', 'chay tren le'], ['vỉa hè', 'leo lề', 'ngược chiều']],
    ['Chen lấn khóa cứng', 23, ['không nhường nhau', 'co lach', 'chèn đầu ô tô', 'khóa cứng cả ngã tư', 'chen lan'], ['chen lấn', 'khóa cứng', 'không nhường']],
    ['Bấm còi liên tục', 16, ['bóp còi vô nghĩa', 'bam coi lien tuc', 'đứng sau thúc còi giục', 'nhấn còi chói tai', 'bam coi'], ['bấm còi', 'bóp còi', 'chói tai']],
    ['Quẹt xe chửi nhau', 12, ['va quẹt cãi lộn', 'chui nhau giua duong', 'cãi tay đôi giữa phố', 'xô xát nhẹ', 'quet xe'], ['cãi lộn', 'quẹt xe', 'chửi nhau']],
    ['Vượt đèn đỏ ẩu', 8, ['vượt đèn đỏ', 'vuot den do', 'chạy ẩu ngang ngã tư', 'chưa xanh đã phóng', 'chay au'], ['đèn đỏ', 'vượt đèn', 'chạy ẩu']],
    ['Mưa ập ướt sũng', 6, ['trời đổ mưa rào', 'mua ap toi', 'kẹt xe gặp mưa ngập', 'nước cống dâng lên', 'mua ngap'], ['mưa rào', 'ướt sũng', 'áo mưa']],
  ]),

  q('ff_b109', CAT_CHAOS, 'Shipper gọi điện lúc bạn đang ngủ say hay nói câu gì khiến bạn bật dậy gấp?', [
    ['Xuống lấy tới cổng', 36, ['alo tới cổng rồi', 'toi cong roi', 'đứng dưới nhà rồi', 'ra nhận hàng gấp', 'xuong lay'], ['tới cổng', 'xuống lấy', 'nhận hàng']],
    ['Không nghe bom à', 22, ['gọi 5 cuộc không nghe', 'goi khong nghe may', 'định bom hàng à', 'hủy đơn bây giờ', 'bom hang'], ['bom hàng', 'không nghe', 'hủy đơn']],
    ['Chuyển khoản bảo vệ', 16, ['để sảnh lễ tân nhé', 'de o bao ve', 'ck trước đi em', 'quét mã qr trước', 'de bao ve'], ['bảo vệ', 'lễ tân', 'chuyển khoản']],
    ['Nhanh còn giao đơn', 12, ['em đang vội lắm', 'đang gấp', 'chờ 15 phút rồi đấy', 'không xuống em đi đây', 'cho lau'], ['đang gấp', 'giao đơn', 'chờ lâu']],
    ['Thu hộ tiền lẻ', 8, ['chuẩn bị tiền mặt', 'chuan bi tien le', 'không có tiền thối', 'đơn thu hộ 500k', 'tien mat'], ['thu hộ', 'tiền lẻ', 'tiền thối']],
    ['Giao nhầm mai lại', 6, ['giao nhầm quận', 'mai giao lai', 'đi lộn đường rồi', 'hẹn mai giao lại', 'giao nham'], ['nhầm quận', 'mai giao', 'lộn đường']],
  ]),

  q('ff_b110', CAT_CHAOS, 'Thảm họa kinh điển trong buổi phỏng vấn xin việc khiến bạn biết chắc mình tạch ngay?', [
    ['Không biết công ty', 34, ['chưa tìm hiểu công ty', 'khong biet cong ty', 'hỏi tên sếp không biết', 'nhầm tên đối thủ', 'nham cong ty'], ['tìm hiểu', 'công ty', 'nhầm tên']],
    ['Tới trễ quên CV', 24, ['đi phỏng vấn muộn', 'toi tre', 'đầu tóc bù xù', 'mặc quần đùi dép lê', 'di muon'], ['tới trễ', 'đi muộn', 'quên cv']],
    ['Nói xấu sếp cũ', 17, ['chửi công ty cũ', 'noi xau sep cu', 'kể tội đồng nghiệp cũ', 'chê lương cũ bèo', 'noi xau'], ['sếp cũ', 'công ty cũ', 'nói xấu']],
    ['Đòi lương trên trời', 11, ['hét lương quá cao', 'lo mom noi bay', 'lỡ mồm nói bậy', 'nói lắp bắp trống rỗng', 'doi luong cao'], ['mức lương', 'lỡ mồm', 'nói bậy']],
    ['Rớt mạng chó sủa', 8, ['phỏng vấn online lỗi', 'cho sua', 'người nhà đi ngang', 'mở nhầm filter mèo', 'rot mang'], ['rớt mạng', 'chó sủa', 'online']],
    ['Chuông điện thoại reo', 6, ['quên tắt chuông', 'quen tat chuong', 'nhạc chuông bựa kêu', 'ngáp ngủ trước hr', 'reo am i'], ['chuông điện thoại', 'nhạc chuông', 'tắt chuông']],
  ]),

  q('ff_b111', CAT_CHAOS, 'Đang xem phim 18+ mà Bluetooth tự kết nối ra loa phòng khách, bạn xử lý sao?', [
    ['Tắt nguồn điện thoại', 37, ['tắt máy gấp', 'tat nguon', 'bấm tắt bluetooth', 'ném điện thoại gối', 'tat bluetooth'], ['tắt nguồn', 'tắt bluetooth', 'tắt máy']],
    ['Rút phích cắm loa', 22, ['rút dây loa', 'rut phich cam', 'tắt công tắc loa', 'giật dây nguồn', 'tat loa'], ['rút phích', 'dây loa', 'tắt loa']],
    ['Trốn phòng giả chết', 15, ['trốn biệt trong phòng', 'gia chet', 'nhục không dám ra', 'cố thủ khóa cửa', 'tron trong phong'], ['giả chết', 'trốn phòng', 'khóa cửa']],
    ['Đổ thừa dính virus', 12, ['nói quảng cáo nhảy', 'quang cao virus', 'kêu bị hack máy', 'đổ tại bạn gửi link', 'do thua'], ['quảng cáo', 'virus', 'bị hack']],
    ['Bật clip hài át', 8, ['bật nhạc át tiếng', 'bat nhac at tieng', 'cười lớn xem tiktok', 'ho thật to che tiếng', 'at tieng'], ['clip hài', 'át tiếng', 'tiktok']],
    ['Độn thổ ở riêng', 6, ['dọn đồ ra ở riêng', 'don ra o rieng', 'mất mặt cả năm', 'mua vé đi trốn', 'mat mat'], ['ở riêng', 'độn thổ', 'mất mặt']],
  ]),

  q('ff_b112', CAT_CHAOS, '"Cú lừa lịch sử" nào hay xảy ra khi vào tiệm cắt tóc nói "Cắt ngắn gọn thôi anh ơi"?', [
    ['Cắt trọc đầu đinh', 36, ['cắt ngắn như đi tù', 'cat ngan cun', 'cạo sát trắng hếu', 'tưởng cắt gọn hóa hết', 'dau troc'], ['trọc lốc', 'đầu đinh', 'cạo sát']],
    ['Đầu nấm mái ngố', 22, ['cắt mái ngố', 'dau nam', 'tóc mái cụt lủn', 'như cái bát úp đầu', 'mai ngo'], ['đầu nấm', 'mái ngố', 'bát úp']],
    ['Khác xa ảnh mẫu', 16, ['khác ảnh mẫu', 'khac hinh mau', 'đưa ảnh idol thành thảm họa', 'thợ cắt theo ý thợ', 'sai kieu'], ['ảnh mẫu', 'khác mẫu', 'thảm họa']],
    ['Tóc xù tổ quạ', 12, ['đội mũ cả tháng', 'xù nhu to qua', 'uốn xong thành bà thím', 'tóc cháy xơ xác', 'doi non'], ['tổ quạ', 'đội mũ', 'tóc xù']],
    ['Xén lẹm mất mai', 8, ['lẹm tóc mai', 'xen lem', 'cạo trúng lông mày', 'hai bên lệch hẳn nhau', 'cat lech'], ['xén lẹm', 'tóc mai', 'lông mày']],
    ['Chặt chém thêm tiền', 6, ['tính thêm tiền gội ép', 'tinh them tien', 'vào 50k ra bill 1 triệu', 'ép mua thuốc dưỡng', 'chat chem'], ['tính thêm', 'chặt chém', 'bill triệu']],
  ]),

  q('ff_b113', CAT_CHAOS, 'Gặp người quen ngoài đường nhưng quên sạch tên tuổi là ai, bạn chữa cháy thế nào?', [
    ['Cười chào khỏe không', 35, ['hỏi thăm chung chung', 'dao nay khoe khong', 'cười giả lả chào', 'gọi đại anh chị bạn', 'chao hoi chung'], ['khỏe không', 'cười chào', 'chung chung']],
    ['Vờ bận chạy gấp', 24, ['kêu có việc gấp', 'hen hom nao cafe', 'bảo đang vội chạy ngay', 'hẹn hôm nào cà phê', 'bận chạy gấp'], ['chạy gấp', 'việc gấp', 'cà phê']],
    ['Cúi bấm điện thoại', 16, ['giả mù không thấy', 'bam dien thoai ne', 'kéo khẩu trang kính râm', 'lơ luôn đi thẳng', 'ne mat'], ['không thấy', 'khẩu trang', 'lơ luôn']],
    ['Hỏi dò đi đâu', 12, ['hỏi đi đâu đấy', 'di dau day', 'dạo này làm đâu rồi', 'nói vòng vo dò info', 'hoi do'], ['đi đâu đấy', 'hỏi dò', 'làm đâu']],
    ['Quay xe né gấp', 8, ['rẽ ngã khác', 'ne duong khac', 'nấp sau kệ hàng', 'tạt vô quán ven đường', 're ngang'], ['quay xe', 'né mặt', 'rẽ ngã']],
    ['Thú nhận quên tên', 5, ['não cá vàng', 'nao ca vang', 'hỏi thẳng tên gì thế', 'cười trừ nhận lỗi quên', 'quen mat'], ['não cá vàng', 'quên tên', 'thú nhận']],
  ]),

  q('ff_b114', CAT_CHAOS, 'Tình huống "dở khóc dở cười" nhất khi đi ăn đám cưới của người quen xã giao?', [
    ['Ngồi bàn toàn lạ', 34, ['không quen ai chung bàn', 'ngoi ban nguoi la', 'ngồi đơ ăn không dám gắp', 'cả mâm nhìn nhau sượng', 'mâm toàn lạ'], ['người lạ', 'toàn lạ', 'ngồi đơ']],
    ['Bỏ ít tiền mừng', 24, ['tiền mừng ít hơn mâm', 'bo it tien', 'quê vì mừng mỏng', 'thấy đồ sang muốn nhét thêm', 'mung it'], ['tiền mừng', 'bỏ ít', 'mừng mỏng']],
    ['Cỗ lên chậm ít', 17, ['đợi cỗ đói meo', 'co len cham', 'bàn kế bên ăn gần hết', 'đồ ăn nguội ngắt ít xỉn', 'doi meo'], ['cỗ chậm', 'đói meo', 'lên chậm']],
    ['Gặp người yêu cũ', 12, ['đụng mặt nyc', 'gap nyc', 'ngồi chung mâm tình cũ', 'nhìn người cũ tay trong tay', 'tinh cu'], ['người yêu cũ', 'tình cũ', 'đụng mặt']],
    ['Bị ép uống say', 8, ['bị chuốc rượu liên tục', 'ep uong ruou', 'dzô 100 phần trăm sấp mặt', 'say quắc không về nổi', 'chuoc ruou'], ['ép uống', 'chuốc rượu', 'say quắc']],
    ['Vào nhầm rạp cưới', 5, ['đi nhầm sảnh tiệc', 'nham dam cuoi', 'mừng nhầm phong bì nhà bên', 'ngơ ngác đứng dậy đi ra', 'nham rap'], ['nhầm rạp', 'nhầm sảnh', 'nhầm phong bì']],
  ]),

  q('ff_b115', CAT_CHAOS, 'Kiểu khách hàng "hãm tài" nhất khiến nhân viên phục vụ chỉ muốn đấm vào mặt?', [
    ['Hách dịch chửi bới', 35, ['thượng đế hách dịch', 'chui nhan vien', 'coi mình ông hoàng', 'đập bàn quát tháo', 'hach dich'], ['hách dịch', 'chửi bới', 'quát tháo']],
    ['Ngồi lì quá giờ', 23, ['sắp đóng cửa không về', 'ngoi li', 'tới sát giờ nghỉ gọi món', 'câu giờ không trả bàn', 'sap dong cua'], ['đóng cửa', 'ngồi lì', 'quá giờ']],
    ['Mặc cả từng nghìn', 16, ['trả giá chỗ niêm yết', 'mac ca', 'xin bớt vài nghìn', 'đòi giảm giá hết hạn', 'tra gia'], ['mặc cả', 'trả giá', 'từng nghìn']],
    ['Thử hết không mua', 12, ['sai chạy tới lui', 'khong mua gi', 'thử 10 đôi rồi thôi', 'lật tung quán rồi chuồn', 'thu het roi di'], ['không mua', 'sai chạy', 'lật tung']],
    ['Xả rác bừa bãi', 8, ['kêu tao trả tiền mà', 'xa rac', 'bôi bẩn bàn rồi về', 'dẫn con chạy phá quán', 'bày bừa'], ['xả rác', 'bôi bẩn', 'phá quán']],
    ['Ăn thử rồi chuồn', 6, ['khui đồ ăn thử', 'an thu', 'bóc tem dùng lén', 'xin đồ miễn phí liên tục', 'dung thu'], ['ăn thử', 'dùng thử', 'bóc tem']],
  ]),

  q('ff_b116', CAT_CHAOS, 'Đi khám răng hoặc khám bệnh tổng quát, điều gì làm người lớn to đầu cũng sợ xanh mặt?', [
    ['Hóa đơn tiền triệu', 35, ['viện phí đắt đỏ', 'hoa don vien phi', 'đơn thuốc dài sọc', 'không có bảo hiểm y tế', 'ton tien'], ['viện phí', 'tiền triệu', 'đơn thuốc']],
    ['Tiếng máy khoan răng', 23, ['nằm ghế nha khoa', 'may khoan rang', 'mùi thuốc tê phòng răng', 'nhổ răng khôn', 'khoan rang'], ['khoan răng', 'nha khoa', 'răng khôn']],
    ['Bác sĩ nhíu mày', 16, ['nhíu mày im lặng', 'nhiu may im lang', 'gọi thêm bác sĩ xem', 'mặt nghiêm trọng', 'ket qua xau'], ['nhíu mày', 'im lặng', 'nghiêm trọng']],
    ['Mũi kim lấy máu', 12, ['sợ kim tiêm', 'kim tiem', 'chích thuốc tê vào lợi', 'y tá lấy ven trượt', 'lay mau'], ['kim tiêm', 'lấy máu', 'lấy ven']],
    ['Người trước la hét', 8, ['tiếng hét thảm thiết', 'la het tham thiet', 'tiếng khóc phòng khám', 'người ra mặt tái mét', 'nguoi truoc la'], ['la hét', 'thảm thiết', 'tái mét']],
    ['Phán phải mổ gấp', 6, ['nhập viện ngay', 'phai mo', 'cấm ăn thịt rượu cà phê', 'ra đống bệnh nền', 'nhap vien'], ['mổ gấp', 'nhập viện', 'bệnh nền']],
  ]),

  q('ff_b117', CAT_CHAOS, 'Điều bựa nhất hay gặp khi hào hứng đi xem bói hoặc rút quẻ đầu năm?', [
    ['Phán đại hạn ế', 33, ['năm nay ế bền vững', 'e ben vung', 'tình duyên lận đận', 'mất tiền mất tình', 'dai han'], ['đại hạn', 'ế bền', 'lận đận']],
    ['Gạ mua bùa giải', 25, ['cúng giải hạn tiền triệu', 'cung giai han', 'cắt duyên âm vài triệu', 'hù dọa moi tiền', 'moi tien'], ['giải hạn', 'mua bùa', 'moi tiền']],
    ['Nói chung chung huề', 17, ['nói nước đôi huề vốn', 'hay suy nghi nhieu', 'hay suy nghĩ nhiều', 'nói câu nào cũng trúng', 'noi chung chung'], ['chung chung', 'nước đôi', 'suy nghĩ nhiều']],
    ['Đoán sai bét nghề', 11, ['phán sai hoàn toàn', 'phan sai bet', 'bảo bác sĩ trong khi it', 'bốc phét trắng trợn', 'sai het'], ['sai bét', 'đoán sai', 'bốc phét']],
    ['Phán có duyên âm', 8, ['bị vong theo', 'duyen am', 'tiền kiếp nặng nợ', 'căn cao số nặng', 'vong theo'], ['duyên âm', 'vong theo', 'căn số']],
    ['Rút quẻ đại hung', 6, ['quẻ hạ hạ', 'que ha ha', 'bốc trúng thẻ xấu', 'rút lại quẻ khác', 'que xau'], ['đại hung', 'quẻ xấu', 'hạ hạ']],
  ]),

  q('ff_b118', CAT_CHAOS, 'Trong rạp chiếu phim tối om, hành động vô duyên nào của người ngồi cạnh làm bạn phát điên?', [
    ['Đạp rung ghế trước', 35, ['đạp lưng ghế', 'dap ghe', 'gác chân lên ghế mình', 'nhún rung cả hàng', 'da ghe'], ['đạp ghế', 'rung ghế', 'gác chân']],
    ['Nói chuyện spoil phim', 23, ['kể trước kết phim', 'noi chuyen on ao', 'bình luận to tiếng', 'nghe điện thoại trong rạp', 'noi chuyen'], ['spoil', 'nói chuyện', 'kể trước']],
    ['Bật màn hình sáng', 16, ['lướt điện thoại chói mắt', 'man hinh sang', 'chụp flash check in', 'quay lén màn hình', 'bat den'], ['điện thoại', 'sáng chói', 'flash']],
    ['Cởi giày hôi chân', 12, ['tháo tất bốc mùi', 'coi tat', 'mùi chân thối khắp hàng', 'gác chân trần tay vịn', 'thoi chan'], ['cởi giày', 'thối chân', 'tháo tất']],
    ['Hôn hít sờ soạng', 8, ['ôm hôn phản cảm', 'hon hit', 'làm chuyện nhạy cảm ghế đôi', 'coi rạp như nhà nghỉ', 'om ap'], ['hôn hít', 'sờ soạng', 'phản cảm']],
    ['Nhai bắp rào rạo', 6, ['nhai bắp ồn ào', 'nhai bap rang', 'hút nước kêu rột rột', 'sột soạt túi nilon', 'sot soat'], ['bắp rang', 'rào rạo', 'sột soạt']],
  ]),

  q('ff_b119', CAT_CHAOS, 'Chiêu trò "lừa đảo qua điện thoại" khét tiếng khiến dân tình vừa bực vừa trêu lại?', [
    ['Giả công an dọa', 36, ['dính đường dây rửa tiền', 'gia cong an', 'dọa lệnh bắt giữ', 'gọi mặc cảnh phục giả', 'vien kiem sat'], ['công an', 'rửa tiền', 'lệnh bắt']],
    ['Mời CTV chốt đơn', 22, ['cộng tác viên tiktok', 'ctv tiktok', 'việc nhẹ lương cao', 'làm nhiệm vụ nhận tiền', 'chốt đơn ảo'], ['cộng tác viên', 'chốt đơn', 'hoa hồng']],
    ['Dọa khóa sim VNeID', 16, ['khóa sim sau 2h', 'khoa sim', 'cập nhật định danh vneid', 'giả nhân viên nhà mạng', 'vneid'], ['khóa sim', 'vneid', 'nhà mạng']],
    ['Báo trúng thưởng ảo', 12, ['trúng thưởng tri ân', 'trung thuong', 'đóng phí nhận quà', 'trúng iphone 0 đồng', 'qua tri an'], ['trúng thưởng', 'quà tri ân', 'đóng phí']],
    ['Giả người thân vay', 8, ['giả giọng người nhà', 'gia nguoi than', 'cấp cứu chuyển gấp', 'dùng ai ghép mặt', 'vay cap cuu'], ['giả giọng', 'người thân', 'cấp cứu']],
    ['Dọa phạt nguội xe', 6, ['báo phạt nguội', 'phat nguoi', 'nợ cước viễn thông', 'cài app dịch vụ giả', 'cai app'], ['phạt nguội', 'app giả', 'nợ cước']],
  ]),

  q('ff_b120', CAT_CHAOS, 'Đi xe buýt hoặc xe khách đường dài, nỗi ám ảnh kinh dị nhất ai cũng sợ gặp?', [
    ['Ngồi cạnh người ói', 36, ['say xe nôn tháo', 'say xe non mua', 'mùi dầu gió nồng', 'nôn ra túi nilon', 'oi mua'], ['say xe', 'nôn', 'dầu gió']],
    ['Mùi hôi nách nồng', 22, ['hôi nách nồng nặc', 'hoi nach', 'mùi mồ hôi chua lòm', 'ngộp thở mùi cơ thể', 'mui co the'], ['hôi nách', 'mồ hôi', 'ngộp thở']],
    ['Bật loa ngoài TikTok', 16, ['mở loa ngoài to', 'bat loa ngoai', 'gọi điện oang oang', 'trẻ con khóc suốt tuyến', 'loa ngoai'], ['loa ngoài', 'tiktok', 'oang oang']],
    ['Tài xế thắng gấp', 12, ['lái xe lạng lách', 'chay au thang gap', 'xóc va đầu vào kính', 'vượt ẩu hú hồn', 'thang gap'], ['thắng gấp', 'chạy ẩu', 'lạng lách']],
    ['Gặp biến thái móc', 8, ['bị móc túi', 'moc tui', 'sàm sỡ lúc đông', 'mất điện thoại ví', 'bien thai'], ['móc túi', 'biến thái', 'sàm sỡ']],
    ['Nhồi nhét ghế nhựa', 6, ['ngồi ghế nhựa lối đi', 'nhoi nhet', 'hỏng máy lạnh nóng hầm', 'xe hư giữa đèo', 'ghe nhua'], ['nhồi nhét', 'ghế nhựa', 'điều hòa']],
  ]),

  q('ff_b121', CAT_CHAOS, 'Chạy xe máy giữa trời mưa bão ngập ngang bánh, thảm họa nào dễ ập tới nhất?', [
    ['Chết máy dắt bộ', 37, ['xe chết máy', 'chet may', 'lội nước đẩy xe', 'ngập bô tắt máy', 'dat bo'], ['chết máy', 'dắt bộ', 'ngập bô']],
    ['Ô tô tạt nước', 22, ['sóng nước tạt mặt', 'o to tat nuoc', 'xe buýt tạt ướt sũng', 'bị tạt từ đầu chân', 'song nuoc'], ['tạt nước', 'sóng nước', 'xe buýt']],
    ['Sụp ổ gà té', 15, ['sụp hố ga', 'sup o ga', 'trượt bánh té lộn nhào', 'đường ngập mất nắp', 'ho ga'], ['ổ gà', 'hố ga', 'trượt bánh']],
    ['Áo mưa trùm mặt', 12, ['áo mưa rách toạc', 'ao mua rach', 'gió tốc áo mưa', 'vướng tà vào bánh xe', 'ao mua'], ['áo mưa', 'trùm mặt', 'vướng bánh']],
    ['Kẹt cứng giữa mưa', 8, ['kẹt xe trời mưa', 'ket xe mua', 'đứng chôn chân ngập', 'tắc đường ngập lụt', 'chon chan'], ['kẹt xe', 'chôn chân', 'tắc đường']],
    ['Nước cống trôi dép', 6, ['nước cống đen hôi', 'nuoc cong', 'ngâm nước bẩn ngứa', 'trôi mất chiếc dép', 'troi dep'], ['nước cống', 'trôi dép', 'ngứa']],
  ]),

  q('ff_b122', CAT_CHAOS, 'Đặt đồ ăn trên app lúc đang đói meo, cái kết đắng lòng nào hay xảy ra nhất?', [
    ['Bị quán hủy đơn', 34, ['chờ 45 phút báo hết', 'huy don', 'tài xế hủy phút chót', 'quán tắt app', 'cho mon moi'], ['hủy đơn', 'hết món', 'tắt app']],
    ['Ít khác ảnh mẫu', 24, ['đồ ăn ít xỉn', 'khac anh quang cao', 'cơm độn toàn rau', 'thịt lèo tèo vài miếng', 'treo dau de'], ['ít xỉn', 'khác ảnh', 'độn rau']],
    ['Shipper làm đổ nước', 17, ['đổ nước lèo tràn túi', 'do nuoc leo', 'bịch bún vỡ nát', 'trà sữa đổ nửa ly', 'do ra tui'], ['đổ nước', 'nước lèo', 'trà sữa']],
    ['Quên bỏ đũa thìa', 12, ['không có đũa muỗng', 'khong co dua', 'thiếu nước chấm tương ớt', 'ngồi ăn bốc bằng tay', 'quen nuoc cham'], ['đũa thìa', 'nước chấm', 'tương ớt']],
    ['Đồ ăn nguội ngắt', 8, ['đồ ăn nguội lạnh', 'nguoi ngat', 'khoai mềm nhũn', 'đá tan nhạt toẹt', 'da tan'], ['nguội ngắt', 'đá tan', 'mềm nhũn']],
    ['Đặt nhầm địa chỉ', 5, ['nhầm địa chỉ cũ', 'dat nham dia chi', 'quên đổi map công ty', 'tốn ship hai lần', 'sai dia chi'], ['nhầm địa chỉ', 'quên đổi', 'sai địa chỉ']],
  ]),

  q('ff_b123', CAT_CHAOS, 'Ra quán cà phê ngồi làm việc chạy deadline, kiểu người nào làm bạn ức chế nhất?', [
    ['Gọi điện oang oang', 35, ['nói chuyện to tiếng', 'noi chuyen oang oang', 'họp online không tai nghe', 'cười hô hố cả quán', 'on ao'], ['oang oang', 'to tiếng', 'không tai nghe']],
    ['Trẻ con la hét', 23, ['trẻ con chạy nhảy', 'tre con la het', 'đụng trúng bàn làm đổ', 'phụ huynh mặc kệ con', 'pha phach'], ['trẻ con', 'la hét', 'chạy nhảy']],
    ['Chiếm hết ổ cắm', 16, ['cắm sạc cả dàn máy', 'chiem o cam', 'kéo dây chằng chịt', 'ngồi chắn hết chỗ sạc', 'o dien'], ['ổ cắm', 'ổ điện', 'chiếm chỗ']],
    ['Ngồi lì một ly', 12, ['1 ly ngồi cả ngày', 'ngoi li ca ngay', 'chiếm bàn lớn một mình', 'nhân viên liếc không về', 'ngoi lau'], ['ngồi lì', 'một ly', 'cả ngày']],
    ['Mở loa ngoài TikTok', 8, ['xem video max tiếng', 'loa ngoai', 'không đeo tai nghe', 'nghe nhạc xập xình', 'xem tiktok'], ['loa ngoài', 'max tiếng', 'tai nghe']],
    ['Nhìn lén màn hình', 6, ['liếc trộm màn hình', 'nhin len man hinh', 'soi người bên cạnh làm', 'ké ghế sát sạt', 'soi moi'], ['nhìn lén', 'liếc trộm', 'soi màn hình']],
  ]),

  q('ff_b124', CAT_CHAOS, 'Nhắn nhầm tin nói xấu một người thẳng vào chính cuộc chat với họ, bạn xử lý sao?', [
    ['Thu hồi trong 1s', 38, ['gỡ tin nhắn ngay', 'thu hoi tin nhan', 'cầu trời chưa đọc', 'xóa tin tốc độ ánh sáng', 'go tin nhan'], ['thu hồi', 'gỡ tin', 'chưa đọc']],
    ['Vờ trêu đùa nhầm', 21, ['nói đùa thôi mà', 'chua chay treu', 'bịa cớ trùng tên', 'đang tập thoại phim', 'gia vo dua'], ['trêu đùa', 'trùng tên', 'tập thoại']],
    ['Đổ tại bạn nghịch', 15, ['thằng bạn cầm máy', 'ban cam nham may', 'kêu bị hack nick', 'em nhỏ bấm bậy', 'do ban nghich'], ['bạn cầm máy', 'hack nick', 'em nhỏ']],
    ['Khóa nick tắt máy', 12, ['tắt mạng trốn luôn', 'khoa nick', 'block luôn đỡ nhục', 'biến mất khỏi mạng', 'tat mang'], ['khóa nick', 'tắt máy', 'block']],
    ['Spam sticker trôi tin', 8, ['gửi loạt meme lấp liếm', 'gui sticker', 'nhắn vô nghĩa trôi tin', 'gửi link bài báo', 'troi tin nhan'], ['sticker', 'meme', 'trôi tin']],
    ['Xin lỗi nói thẳng', 6, ['lỡ rồi nói thẳng', 'toi dau thi toi', 'nhận lỗi cho nhẹ', 'nghỉ chơi luôn', 'xin loi'], ['xin lỗi', 'nói thẳng', 'nhận lỗi']],
  ]),

  q('ff_b125', CAT_CHAOS, 'Thứ gì thường xuyên xuất hiện trong các bài "bóc phốt" hot nhất trên mạng Việt Nam?', [
    ['Ảnh chụp tin nhắn', 36, ['chup man hinh', 'cap tin nhan', 'tin nhắn gạ gẫm quỵt nợ', 'bill chuyển khoản giả', 'tin nhan'], ['chụp màn hình', 'tin nhắn', 'cap màn']],
    ['Shop bán hàng giả', 22, ['phốt shop lừa đảo', 'hang gia', 'chủ quán chửi khách', 'treo đầu dê bán thịt chó', 'shop lua dao'], ['hàng giả', 'shop lừa', 'chửi khách']],
    ['Hóa đơn chặt chém', 16, ['bill chặt chém', 'hoa don chat chem', 'đĩa rau muống trăm nghìn', 'tính tiền láo', 'bill gia cao'], ['hóa đơn', 'chặt chém', 'bill cao']],
    ['Clip cãi nhau đường', 12, ['clip đánh lộn', 'clip cai nhau', 'va chạm giao thông chửi', 'camera hành trình', 'danh ghen'], ['cãi nhau', 'va chạm', 'đánh ghen']],
    ['Camera bắt trộm cắp', 8, ['clip camera an ninh', 'camera bat qua tang', 'trộm đồ trong shop', 'giúp việc ăn cắp', 'camera'], ['camera', 'trộm cắp', 'quả tang']],
    ['Cam thường vỡ mộng', 6, ['ảnh trước sau sống ảo', 'anh truoc sau', 'hotgirl dùng app lố', 'nhan sắc thật', 'cam thuong'], ['cam thường', 'vỡ mộng', 'trước sau']],
  ]),

  q('ff_b126', CAT_CHAOS, 'Bước nhầm vào quán cà phê/nhà hàng giá trên trời bằng nửa ngày lương, bạn xử lý sao?', [
    ['Gọi ly rẻ nhất', 35, ['gọi nước suối trà đá', 'goi nuoc suoi', 'cười gượng chọn món rẻ', 'cả bàn gọi 1 ly', 'mon re nhat'], ['rẻ nhất', 'nước suối', 'trà đá']],
    ['Vờ nghe máy chuồn', 24, ['có việc gấp đi ra', 'gia vo nghe dien thoai', 'nói nhầm quán rồi chạy', 'xin lỗi đi nhầm chỗ', 'chuon thang'], ['chuồn thẳng', 'việc gấp', 'nhầm quán']],
    ['Ngồi lì gỡ wifi', 17, ['ngồi lì gỡ vốn', 'go von wifi', 'sạc đầy pin laptop đt', 'lấy hết khăn giấy về', 'ngoi lau'], ['gỡ vốn', 'wifi', 'sạc pin']],
    ['Chụp trăm ảnh bù', 11, ['chụp ảnh sống ảo bù', 'chup anh song ao', 'check in mọi góc quán', 'quay tiktok bõ công', 'chup anh'], ['chụp ảnh', 'sống ảo', 'bõ công']],
    ['Nháy mắt chia đôi', 8, ['chia đôi tiền', 'chia doi tien', 'hỏi thầm còn tiền không', 'cầu cứu người đi cùng', 'hoi tham'], ['chia đôi', 'nháy mắt', 'còn tiền']],
    ['Khép menu đi thẳng', 5, ['hỏi menu khác rồi rút', 'hoi menu khac', 'bảo hết món thích', 'lặng lẽ đứng dậy đi', 'khep menu'], ['menu khác', 'khép menu', 'đi thẳng']],
  ]),

  q('ff_b127', CAT_CHAOS, 'Lỡ đăng nhầm ảnh dìm hoặc ảnh nhạy cảm lên Story 10 phút mới biết, bạn làm gì?', [
    ['Xóa vội trong 1s', 36, ['xóa ngay lập tức', 'xoa voi', 'cầu chưa ai chụp màn hình', 'tim đập xóa bài', 'chup man hinh'], ['xóa vội', 'chụp màn hình', 'screenshot']],
    ['Crush đã xem rồi', 22, ['thấy sếp đã xem', 'sep da xem', 'người quan trọng xem hết', 'muốn độn thổ luôn', 'nguoi quen xem'], ['crush', 'sếp', 'đã xem']],
    ['Đổ thừa bị hack', 16, ['bị bạn hack máy', 'bi ban hack may', 'nói thằng bạn đăng trêu', 'kêu bị cướp điện thoại', 'do thua'], ['hack máy', 'bạn trêu', 'đổ thừa']],
    ['Đăng thêm che lấp', 12, ['up chục ảnh khác', 'dang anh danh lac huong', 'spam story cho trôi', 'làm loãng sự chú ý', 'up lien tuc'], ['đăng thêm', 'lạc hướng', 'spam story']],
    ['Nhắn xin đừng lưu', 8, ['van xin đừng lưu ảnh', 'nan ni dung luu', 'nhắn từng đứa xóa giùm', 'dọa nếu phát tán', 'dung luu'], ['năn nỉ', 'đừng lưu', 'phát tán']],
    ['Tắt máy trùm chăn', 6, ['tắt mạng khóa nick', 'quang dien thoai', 'tự kỷ cả đêm', 'ngủ luôn cho quên', 'khoa nick'], ['trùm chăn', 'khóa nick', 'tự kỷ']],
  ]),

  q('ff_b128', CAT_CHAOS, 'Kiểu người nào ở phòng tập Gym khiến mọi người xung quanh vừa ngứa mắt vừa mắc cười?', [
    ['Nâng nhẹ hét to', 34, ['rên la như sắp đẻ', 'ren la am i', 'thả tạ đánh rầm', 'gào thét gây chú ý', 'het to'], ['rên la', 'hét to', 'thả tạ']],
    ['Chụp ảnh soi gương', 25, ['cởi áo gồng cơ chụp', 'chup anh soi guong', 'tập 5p chụp ảnh 45p', 'quay tiktok chắn lối', 'soi guong'], ['soi gương', 'chụp ảnh', 'gồng cơ']],
    ['Chiếm máy lướt mạng', 17, ['ôm máy bấm điện thoại', 'chiem may', 'lướt tiktok cả buổi', 'không tập không nhường', 'luot dien thoai'], ['chiếm máy', 'bấm điện thoại', 'không nhường']],
    ['Vứt tạ bừa bãi', 11, ['không dọn tạ', 'vut ta bua bai', 'lấy hết đĩa nặng bỏ đi', 'lười trả tạ về giá', 'khong cat ta'], ['vứt tạ', 'bừa bãi', 'không dọn']],
    ['Không lau mồ hôi', 8, ['mồ hôi ướt đẫm ghế', 'mo hoi uot ghe', 'để vũng nước trên yên', 'mùi hôi nách nồng', 'uot dam'], ['mồ hôi', 'ướt ghế', 'không lau']],
    ['Hay đi dạy khôn', 5, ['thích làm pt miễn phí', 'day khon nguoi khac', 'nhìn chằm chằm đánh giá', 'tán tỉnh gạ gẫm', 'soi moi'], ['dạy khôn', 'pt miễn phí', 'tán tỉnh']],
  ]),

  q('ff_b129', CAT_CHAOS, 'Nuôi chó mèo trong phòng trọ chung cư, pha "hú hồn" nào dễ làm bạn khóc ròng nhất?', [
    ['Cắn nát dây sạc', 35, ['cắn nát đồ đạc', 'can day sac', 'gặm rách giày hiệu', 'phá banh tai nghe', 'can do'], ['cắn nát', 'dây sạc', 'giày hiệu']],
    ['Ị bậy hành lang', 23, ['tè lên nệm giường', 'i bay', 'bôi phân khắp sàn', 'chủ trọ bắt phạt tiền', 'phong ue'], ['ị bậy', 'tè lên nệm', 'phóng uế']],
    ['Xổng chuồng chạy mất', 16, ['chạy mất hút', 'xong chuong', 'nhảy ban công mất dạng', 'đăng tìm chó mèo lạc', 'di lac'], ['xổng chuồng', 'mất hút', 'đi lạc']],
    ['Cào rách sofa rèm', 12, ['cào rách rèm cửa', 'cao rach rem', 'mài móng nát tủ gỗ', 'đền tiền cọc trọ', 'cao do'], ['cào rách', 'sofa', 'đền cọc']],
    ['Sủa gào nửa đêm', 8, ['sủa ầm ĩ đêm', 'sua nua dem', 'mèo gào đực 2h sáng', 'hàng xóm gõ cửa mắng', 'keu am i'], ['sủa gào', 'nửa đêm', 'gào đực']],
    ['Nhập viện thú y', 6, ['nuốt dị vật đi mổ', 'di thu y', 'ngộ độc tốn tiền triệu', 'nằm viện thú y đắt', 'ton tien thu y'], ['thú y', 'dị vật', 'nhập viện']],
  ]),

  q('ff_b130', CAT_CHAOS, 'Ra đường gặp "Ninja Lead" trùm kín từ đầu tới chân, pha xử lý huyền thoại nào hay gặp nhất?', [
    ['Xi nhan rẽ ngược', 38, ['xi nhan trái rẽ phải', 'xi nhan trai re phai', 'bật đèn quên tắt', 'đá xi nhan loạn xạ', 'xi nhan ao'], ['xi nhan', 'rẽ ngược', 'trái rẽ phải']],
    ['Tạt đầu bất ngờ', 22, ['tạt đầu xe khác', 'tat dau', 'sang đường không nhìn', 'cúp đầu ô tô tải', 'sang duong au'], ['tạt đầu', 'sang đường', 'cúp đầu']],
    ['Dừng xe nghe máy', 15, ['dừng giữa ngã tư', 'dung giua duong', 'bấm điện thoại giữa phố', 'tấp vào đột ngột', 'nghe dien thoai'], ['dừng xe', 'nghe máy', 'giữa đường']],
    ['Quên gạt chân chống', 11, ['chân chống quẹt đất', 'quen gat chan chong', 'chạy tóe lửa mặt đường', 'chân chống kêu kẹt', 'chan chong'], ['chân chống', 'quên gạt', 'quẹt đất']],
    ['Trùm áo chống nắng', 8, ['áo kín như ninja', 'ao chong nang', 'che kín tầm nhìn', 'đeo khẩu trang 3 lớp', 'trum kin'], ['chống nắng', 'trùm kín', 'ninja']],
    ['Đi rùa làn nhanh', 6, ['chạy chậm làn ô tô', 'di cham lan nhanh', 'dàn hàng ngang tám chuyện', 'không chịu nhường đường', 'chan duong'], ['làn nhanh', 'chạy chậm', 'dàn hàng']],
  ]),
];
