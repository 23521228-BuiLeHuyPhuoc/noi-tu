import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  name: 'noitu.name', playerId: 'noitu.playerId', room: 'noitu.room', token: 'xomlay.token',
  avatar: 'xomlay.guestAvatar', photo: 'xomlay.guestPhoto',
} as const;

async function get(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

async function set(key: string, value: string | null): Promise<void> {
  try {
    if (value === null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  } catch {
    // lưu không được thì thôi, chỉ mất tính năng tự vào lại phòng
  }
}

export const storage = {
  getName: () => get(KEYS.name),
  setName: (v: string) => set(KEYS.name, v),
  /** mã người chơi cố định của máy này, dùng để vào lại phòng khi rớt mạng */
  getPlayerId: () => get(KEYS.playerId),
  setPlayerId: (v: string) => set(KEYS.playerId, v),
  /** mã phòng đang chơi dở */
  getRoom: () => get(KEYS.room),
  setRoom: (v: string | null) => set(KEYS.room, v),
  /** phiên đăng nhập tài khoản */
  getToken: () => get(KEYS.token),
  setToken: (v: string | null) => set(KEYS.token, v),
  /** khách: mặt đại diện có sẵn đã chọn (chỉ số) */
  getAvatar: async () => {
    const v = Number(await get(KEYS.avatar));
    return Number.isInteger(v) && v >= 0 ? v : null;
  },
  setAvatar: (v: number | null) => set(KEYS.avatar, v === null ? null : String(v)),
  /** khách: địa chỉ ảnh đại diện đã tải lên */
  getPhoto: () => get(KEYS.photo),
  setPhoto: (v: string | null) => set(KEYS.photo, v),
};
