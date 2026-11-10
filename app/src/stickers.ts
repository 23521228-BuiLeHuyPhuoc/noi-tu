import type { ImageSourcePropType } from 'react-native';
import type { StickerId } from '../../shared/src/types';

// Bundled crops from the public Quỳnh Aka preview (Zalo pack 934a1d8821cdc89391dc).
export const STICKERS: readonly { id: StickerId; alt: string; source: ImageSourcePropType }[] = [
  { id: 'quynh-01', alt: 'Buồn ngủ', source: require('../assets/stickers/quynh-01.png') },
  { id: 'quynh-02', alt: 'Khóc nhè', source: require('../assets/stickers/quynh-02.png') },
  { id: 'quynh-03', alt: 'Choáng váng', source: require('../assets/stickers/quynh-03.png') },
  { id: 'quynh-04', alt: 'Ngơ ngác', source: require('../assets/stickers/quynh-04.png') },
  { id: 'quynh-05', alt: 'Hờn dỗi', source: require('../assets/stickers/quynh-05.png') },
  { id: 'quynh-06', alt: 'Liếc mắt', source: require('../assets/stickers/quynh-06.png') },
  { id: 'quynh-07', alt: 'Thơm má', source: require('../assets/stickers/quynh-07.png') },
  { id: 'quynh-08', alt: 'Bối rối', source: require('../assets/stickers/quynh-08.png') },
  { id: 'quynh-09', alt: 'Cười tươi', source: require('../assets/stickers/quynh-09.png') },
];

export const stickerOf = (id: StickerId) => STICKERS.find((item) => item.id === id);
