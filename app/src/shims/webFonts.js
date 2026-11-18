// Trên Web, index.html & FxStyles.tsx đã nạp trực tiếp Google Fonts WOFF2 (subset tiếng Việt ~25KB),
// nên không cần đóng gói và tải thêm 18 file .ttf (~2.4MB) từ @expo-google-fonts/be-vietnam-pro.
export function useFonts() {
  return [true, null];
}

export const BeVietnamPro_500Medium = 'BeVietnamPro_500Medium';
export const BeVietnamPro_600SemiBold = 'BeVietnamPro_600SemiBold';
export const BeVietnamPro_700Bold = 'BeVietnamPro_700Bold';
export const BeVietnamPro_800ExtraBold = 'BeVietnamPro_800ExtraBold';
export const BeVietnamPro_900Black = 'BeVietnamPro_900Black';
