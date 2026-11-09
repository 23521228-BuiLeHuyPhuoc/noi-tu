/**
 * Địa chỉ server. Đặt khi build/chạy app:
 *   EXPO_PUBLIC_SERVER_URL=https://noi-tu.onrender.com npx expo start
 * hoặc ghi vào file app/.env
 */
export const SERVER_URL = process.env.EXPO_PUBLIC_SERVER_URL ?? 'http://localhost:3000';
