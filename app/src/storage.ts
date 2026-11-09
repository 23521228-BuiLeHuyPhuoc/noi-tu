import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = { name: 'noitu.name', playerId: 'noitu.playerId', room: 'noitu.room' } as const;

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
};
