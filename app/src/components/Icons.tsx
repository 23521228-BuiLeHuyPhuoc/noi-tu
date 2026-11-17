/**
 * Hệ thống Icon Vector chuẩn Studio cho Xóm Lầy:
 * - Lucide Icons (`lucide-icons/lucide`): UI controls nét mảnh thống nhất (2px).
 * - Microsoft Fluent Emoji Flat (`microsoft/fluentui-emoji`) & Game Icons (`game-icons/icons`):
 *   tải sẵn ngoại tuyến trong `iconPack.generated.ts`, hiển thị sắc nét đồng bộ trên mọi OS.
 */
import { memo, createElement } from 'react';
import { Platform, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import {
  AlertTriangle,
  Award,
  Bomb,
  BookOpen,
  Bot,
  Brush,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Crown,
  Dices,
  Eraser,
  Eye,
  EyeOff,
  Fingerprint,
  Flame,
  Gauge,
  Gift,
  Globe,
  Heart,
  HeartOff,
  HelpCircle,
  History,
  Info,
  KeyRound,
  Layers,
  Lightbulb,
  Lock,
  LockOpen,
  LogIn,
  LogOut,
  Map,
  Megaphone,
  MessageCircle,
  Moon,
  Palette,
  PartyPopper,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings2,
  Share2,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Skull,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Star,
  Sun,
  Swords,
  Timer,
  Trash2,
  Trophy,
  Undo2,
  Unlock,
  User,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  X,
  XCircle,
  Zap,
  LayoutGrid,
} from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { EMOJI_TO_FLUENT, FLUENT_ICONS, GAME_ICONS, type VectorDef } from '../iconPack.generated';

const LUCIDE_MAP = {
  AlertTriangle,
  Award,
  Bomb,
  BookOpen,
  Bot,
  Brush,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Crown,
  Dices,
  Eraser,
  Eye,
  EyeOff,
  Fingerprint,
  Flame,
  Gauge,
  Gift,
  Globe,
  Heart,
  HeartOff,
  HelpCircle,
  History,
  Info,
  KeyRound,
  Layers,
  LayoutGrid,
  Lightbulb,
  Lock,
  LockOpen,
  LogIn,
  LogOut,
  Map,
  Megaphone,
  MessageCircle,
  Moon,
  Palette,
  PartyPopper,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings2,
  Share2,
  Shield,
  ShieldAlert,
  ShoppingBag,
  Skull,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Star,
  Sun,
  Swords,
  Timer,
  Trash2,
  Trophy,
  Undo2,
  Unlock,
  User,
  UserPlus,
  Users,
  Volume2,
  VolumeX,
  Wallet,
  X,
  XCircle,
  Zap,
} as const;

export type UiIconName = keyof typeof LUCIDE_MAP;

export const UiIcon = memo(function UiIcon({
  name,
  size = 18,
  color = '#1C2024',
  strokeWidth = 2.2,
}: {
  name: UiIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  const Comp = LUCIDE_MAP[name];
  return <Comp size={size} color={color} strokeWidth={strokeWidth} />;
});

/** Render một định nghĩa SVG từ iconPack trên cả Web (DOM <svg> nhẹ 0ms) & Native (SvgXml) */
export const PackSvg = memo(function PackSvg({
  def,
  size = 20,
  color,
  style,
}: {
  def: VectorDef;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const body = color ? def.b.replace(/currentColor/gi, color) : def.b;
  if (Platform.OS === 'web') {
    return (
      <View pointerEvents="none" style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, style]}>
        {createElement('svg', {
          viewBox: def.v,
          width: size,
          height: size,
          'aria-hidden': true,
          style: { display: 'block', width: size, height: size, overflow: 'visible' },
          dangerouslySetInnerHTML: { __html: body },
        })}
      </View>
    );
  }
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${def.v}">${body}</svg>`;
  return (
    <View pointerEvents="none" style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }, style]}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
});

export function fluentKeyOf(emoji: string): string | undefined {
  const trimmed = emoji.trim();
  const stripped = trimmed.replace(/\uFE0F/g, '');
  return EMOJI_TO_FLUENT[trimmed] ?? EMOJI_TO_FLUENT[stripped];
}

export const FluentIcon = memo(function FluentIcon({
  name,
  size = 20,
  style,
}: {
  name: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const def = FLUENT_ICONS[name] ?? FLUENT_ICONS.sparkles;
  return <PackSvg def={def} size={size} style={style} />;
});

export const GameIcon = memo(function GameIcon({
  name,
  size = 22,
  color = '#F8FAFC',
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const def = GAME_ICONS[name];
  if (!def) return <UiIcon name="Sparkles" size={size} color={color} />;
  return <PackSvg def={def} size={size} color={color} style={style} />;
});

export const EmojiIcon = memo(function EmojiIcon({
  emoji,
  size = 20,
  color,
  style,
}: {
  emoji: string;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const key = fluentKeyOf(emoji);
  if (key && FLUENT_ICONS[key]) {
    return <PackSvg def={FLUENT_ICONS[key]} size={size} color={color} style={style} />;
  }
  return <UiIcon name="Sparkles" size={Math.round(size * 0.85)} color={color ?? '#F59E0B'} />;
});

export const RubyIcon = memo(function RubyIcon({ size = 16, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <FluentIcon name="gem-stone" size={size} style={style} />;
});

export const CoinIcon = memo(function CoinIcon({ size = 16, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return <FluentIcon name="coin" size={size} style={style} />;
});

export const RankMedal = memo(function RankMedal({ rank, size = 22 }: { rank: number; size?: number }) {
  if (rank === 1) return <FluentIcon name="1st-place-medal" size={size} />;
  if (rank === 2) return <FluentIcon name="2nd-place-medal" size={size} />;
  if (rank === 3) return <FluentIcon name="3rd-place-medal" size={size} />;
  return (
    <View style={styles.rankPill}>
      <Text style={styles.rankText}>#{rank}</Text>
    </View>
  );
});

/**
 * Tách emoji đứng đầu hoặc cuối chuỗi (vd: "⚡ Kỹ năng" hoặc "Cửa hàng Phú Hào 🛍️")
 * để render bằng Fluent Emoji SVG đồng nhất, giữ nguyên text thuần không đổi ngữ nghĩa.
 */
export function splitEdgeEmoji(raw: string): { leading?: string; trailing?: string; text: string } {
  const s = raw.trim();
  if (!s) return { text: '' };
  const parts = s.split(/\s+/);
  let leading: string | undefined;
  let trailing: string | undefined;
  if (parts.length >= 2 && fluentKeyOf(parts[0])) {
    leading = parts.shift();
  }
  if (parts.length >= 2 && fluentKeyOf(parts[parts.length - 1])) {
    trailing = parts.pop();
  }
  // Nếu chuỗi chỉ có đúng 1 token là emoji (vd: nút `big` chỉ hiện icon)
  if (!leading && !trailing && parts.length === 1 && fluentKeyOf(parts[0])) {
    return { leading: parts[0], text: '' };
  }
  return { leading, trailing, text: parts.join(' ') };
}

const styles = StyleSheet.create({
  rankPill: {
    minWidth: 24,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(28,32,36,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  rankText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1C2024',
  },
});
