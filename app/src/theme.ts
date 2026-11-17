import { Platform } from 'react-native';
import { amber, crimson, cyan, gold as radixGold, jade, ruby, slate, violet } from '@radix-ui/colors';

/**
 * Hệ thống màu sắc & Design Tokens chuẩn hóa từ Radix UI Colors (@radix-ui/colors) + Open Props.
 * Giữ tinh thần Tết/Arcade Việt rực rỡ ("Xóm Lầy") với độ tương phản WCAG cao và bề mặt tinh tế.
 */
export const C = {
  son: ruby.ruby11, // #ca244d nền son chủ đạo tinh tế hơn
  sonDark: ruby.ruby12, // #64172b
  gold: amber.amber9, // #ffc53d nút chính rực rỡ
  goldDeep: amber.amber10, // #ffba18
  ink: slate.slate12, // #1c2024 chữ & đường viền chính
  paper: '#FFFFFF', // bề mặt thẻ chính
  mist: slate.slate3, // #f0f0f3 nền phụ dịu mắt
  muted: slate.slate10, // #80838d chữ phụ
  jade: jade.jade9, // #29a383 tới lượt / thắng
  jadeDeep: jade.jade11, // #208368
  lotus: crimson.crimson9, // #e93d82 hiệu ứng vui
  danger: ruby.ruby10, // #dc3b5d báo lỗi / loại
  violet: violet.violet9, // #6e56cf VIP / phép thuật
  cyan: cyan.cyan9, // #00a2c7 neon accent
  brass: radixGold.gold9, // #978365 kim loại dịu
  onSon: '#FFF7ED', // chữ sáng trên nền tối/đỏ
  glassDark: 'rgba(15, 23, 42, 0.56)',
  glassLight: 'rgba(255, 255, 255, 0.92)',
  borderSubtle: 'rgba(28, 32, 36, 0.14)',
};

export const GRADS = {
  gold: ['#FFE066', '#FFC53D', '#F59F00'] as const,
  paper: ['#FFFFFF', '#F8F9FB', '#F0F1F5'] as const,
  ink: ['#2D333B', '#1C2024', '#0F1317'] as const,
  jade: ['#34D399', '#29A383', '#168366'] as const,
  danger: ['#FB7185', '#E5484D', '#BE123C'] as const,
  royal: ['#A855F7', '#6E56CF', '#4338CA'] as const,
  vipDark: ['#1F162B', '#140F1D', '#2B193D'] as const,
};

export const FONT =
  Platform.OS === 'web'
    ? "'Be Vietnam Pro', 'BeVietnamPro_600SemiBold', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    : 'BeVietnamPro_600SemiBold';

export const FONT_BOLD = Platform.OS === 'web' ? FONT : 'BeVietnamPro_800ExtraBold';

/**
 * Bề mặt nổi đa lớp (tactile beveled elevation thay thế viền đen thô):
 * trên Web kết hợp đổ bóng mềm ambient + môi nhấn nhẹ; trên Native dùng shadow + hairline rim.
 */
export const sticker = (dy = 4): Record<string, unknown> => {
  const pressed = dy <= 1;
  if (Platform.OS === 'web') {
    return {
      borderWidth: 1.5,
      borderColor: 'rgba(28, 32, 36, 0.16)',
      boxShadow: pressed
        ? '0 1px 2px rgba(15, 23, 42, 0.18), 0 1px 0 rgba(15, 23, 42, 0.22)'
        : `0 ${Math.max(4, dy * 3)}px ${Math.max(10, dy * 5)}px -4px rgba(15, 23, 42, 0.22), 0 ${Math.max(2, dy)}px 0 rgba(15, 23, 42, 0.2)`,
    };
  }
  return {
    borderWidth: 1.5,
    borderColor: 'rgba(28, 32, 36, 0.16)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: pressed ? 1 : dy },
    shadowOpacity: pressed ? 0.12 : 0.22,
    shadowRadius: pressed ? 2 : Math.max(4, dy * 1.6),
    elevation: pressed ? 1 : Math.min(8, dy + 1),
  };
};
