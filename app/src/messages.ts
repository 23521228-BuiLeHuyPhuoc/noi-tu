import type { ErrorCode, RejectReason } from '../../shared/src/types';

export const errorText: Record<ErrorCode, string> = {
  invalid_name: 'Tên phải từ 1 đến 20 ký tự.',
  room_not_found: 'Không tìm thấy phòng. Kiểm tra lại mã phòng nhé.',
  room_full: 'Phòng đã đủ người.',
  room_playing: 'Phòng đang chơi, đợi ván sau nhé.',
  not_host: 'Chỉ chủ phòng mới làm được việc này.',
  not_in_room: 'Bạn không còn ở trong phòng.',
  bad_request: 'Có lỗi xảy ra, thử lại nhé.',
};

export const rejectText: Record<RejectReason, string> = {
  format: 'Từ phải gồm đúng 2 chữ tiếng Việt.',
  chain: 'Chưa nối đúng chữ cuối.',
  used: 'Từ này đã được dùng trong ván rồi.',
  not_in_dictionary: 'Từ này không có trong từ điển.',
  not_your_turn: 'Chưa tới lượt bạn.',
  timeout: 'Hết giờ mất rồi!',
  not_playing: 'Ván chơi đã kết thúc.',
};
