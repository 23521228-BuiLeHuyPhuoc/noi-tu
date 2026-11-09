/** 16 avatar thú, mỗi con một màu nền. Server gán chỉ số không trùng trong phòng. */
export const AVATARS = [
  { emoji: '🐶', bg: '#FFD8A8' },
  { emoji: '🐱', bg: '#FFE066' },
  { emoji: '🐸', bg: '#B2F2BB' },
  { emoji: '🐼', bg: '#E9ECEF' },
  { emoji: '🦊', bg: '#FFC078' },
  { emoji: '🐷', bg: '#FCC2D7' },
  { emoji: '🐵', bg: '#D8C3A5' },
  { emoji: '🐯', bg: '#FFD43B' },
  { emoji: '🐰', bg: '#EEBEFA' },
  { emoji: '🐻', bg: '#E6C7A8' },
  { emoji: '🐨', bg: '#C5D3E8' },
  { emoji: '🐮', bg: '#D3F9D8' },
  { emoji: '🐔', bg: '#FFF3BF' },
  { emoji: '🐧', bg: '#A5D8FF' },
  { emoji: '🦄', bg: '#F3D9FA' },
  { emoji: '🐲', bg: '#C3FAE8' },
];

export function avatarOf(i: number) {
  return AVATARS[((i % AVATARS.length) + AVATARS.length) % AVATARS.length];
}
