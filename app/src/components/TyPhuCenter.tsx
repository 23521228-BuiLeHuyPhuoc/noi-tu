import { Image, Platform, Pressable, StyleSheet, View, type TextStyle } from 'react-native';
import {
  TYPHU_BOARD, TYPHU_GROUPS, type TyPhuGroup,
} from '../../../shared/src/typhu';
import type { TyPhuLogKind, TyPhuView } from '../../../shared/src/types';
import { doodleUri } from '../avatars';
import { useFace } from '../funState';
import { C } from '../theme';
import { Button, T } from '../ui';
import { FX_ICON, ICON_BY_CELL, iconUri } from '../typhuCellIcons';
import { shortCellName } from '../typhuNames';
import { RISK_ICON } from '../typhuPictos';
import type { CenterLayout, Rect } from '../typhuLayout';
import type { DiceRollView, ThrowImpulse } from '../../../shared/src/dice';
import { useShellTools } from './Shell';
import { TyPhuDice3D } from './TyPhuDice3D';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const abs = (r: Rect) => ({ position: 'absolute' as const, left: r.x, top: r.y, width: r.w, height: r.h });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** web: tên dài liền một chữ vẫn xuống dòng được thay vì tràn */
const WRAP = (Platform.OS === 'web' ? { wordBreak: 'break-word' } : {}) as TextStyle;

/**
 * Cỡ chữ và số dòng để hiện ĐỦ tên người chơi trong khung rộng `w`, cao `h` (không cắt "…"):
 * vừa 1 dòng ở cỡ đủ đọc thì giữ 1 dòng, không thì xuống 2-3 dòng và thu nhỏ chữ.
 */
export function fitName(name: string, w: number, h: number, maxFs = 11): { fs: number; lh: number; lines: number } {
  const len = Math.max(1, [...name].length);
  const CH = 0.62; // bề rộng trung bình 1 ký tự in đậm so với cỡ chữ
  let best = { fs: 6, lh: 7, lines: 3 };
  for (const lines of [1, 2, 3]) {
    const byW = ((w * lines) / (len * CH)) * (lines > 1 ? 0.85 : 1); // xuống dòng theo từ thì hao chỗ
    const byH = h / (lines * 1.15);
    const fs = Math.min(maxFs, byW, byH);
    const cand = { fs: Math.max(6, Math.floor(fs * 2) / 2), lh: Math.ceil(Math.max(6, fs) * 1.15), lines };
    if (fs >= (lines === 1 ? 9 : 7)) return cand;
    if (fs > best.fs || lines === 1) best = cand;
  }
  return best;
}

const LOG_ICON: Record<TyPhuLogKind, string> = {
  buy: iconUri('1f3e0'), rent: iconUri('1f4b0'), jail: iconUri('1f694'), card: iconUri('2728'),
  bankrupt: iconUri('1f480'), start: iconUri('1f3c1'), build: iconUri('1f3d8'), tax: iconUri('1f4b8'), info: iconUri('2b50'),
};

export interface CardFx { id: number; text: string; title: string; at: number }

export interface CenterProps {
  layout: CenterLayout;
  size: { w: number; h: number };
  g: TyPhuView;
  me: string;
  now: number;
  nameOf: (id: string) => string;
  colorOf: (id: string) => string;
  lightColorOf: (id: string) => string;
  portraitUriOf: (id: string) => string;
  status: string;
  myTurn: boolean;
  moving: boolean;
  inJail: boolean;
  buyable: { name: string; price: number } | null;
  left: number;
  /** đồng hồ lượt chưa chạy (xúc xắc đang lăn / quân đang đi / đang chờ): hiện thanh đầy, không đếm */
  paused?: boolean;
  dice: { phase: 'roll' | 'bounce' | 'reveal'; animating: boolean; elapsed: number };
  playback: DiceRollView | null;
  clockOffset: number;
  onThrow: (impulse?: ThrowImpulse) => void;
  flash: Record<string, 'gain' | 'loss'>;
  card: CardFx | null;
  reducedMotion: boolean;
  error: string | null;
  isHost: boolean;
  onEnd: () => void;
  onAct: (a: 'roll' | 'buy' | 'skip' | 'endTurn') => void;
  /** câu cảm thán của từng người khi tiền thay đổi */
  speed?: number;
  onSpeed?: () => void;
  onRules?: () => void;
  /** đổi chế độ xem bàn cờ */
  onView?: () => void;
  viewLabel?: string;
  /** mở bảng chọn người để chọc / ném / đánh */
  onPoke?: () => void;
  reacts?: Record<string, { text: string; kind: 'gain' | 'loss'; from: number; until: number }>;
  onCell: (i: number) => void;
  onPlayer: (id: string) => void;
}

function MiniBtn({ icon, label, onPress, testID, badge, size = 30 }: { icon: string; label: string; onPress: () => void; testID?: string; badge?: number; size?: number }) {
  return (
    <Pressable testID={testID} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={6} style={[styles.mini, size !== 30 && { width: size, height: size, borderRadius: size / 2 }]}>
      <T style={{ fontSize: Math.round((icon.startsWith('x') ? 13 : 15) * size / 30), fontWeight: '900', color: C.ink }}>{icon}</T>
      {!!badge && badge > 0 && <View style={styles.miniBadge}><T style={styles.miniBadgeTxt}>{badge > 9 ? '9+' : badge}</T></View>}
    </Pressable>
  );
}

function PlayerCard({ id, rect, p }: { id: string; rect: Rect; p: CenterProps }) {
  const { g } = p;
  const face = useFace(id);
  const color = p.colorOf(id);
  const out = g.bankrupt.includes(id);
  const cur = id === g.currentPlayerId;
  const lands = Object.values(g.owners).filter((o) => o === id).length;
  const fl = p.flash[id];
  const rc = p.reacts?.[id];
  const showRc = rc && p.now >= rc.from && p.now < rc.until;
  const wobbleDeg = face.wobble === 'spin' ? `${Math.round(Math.sin(p.now / 65) * 28)}deg` : face.wobble ? `${Math.round(Math.sin(p.now / 35) * 14)}deg` : '0deg';
  const wobbleX = face.wobble ? Math.round(Math.cos(p.now / 40) * 4) : 0;
  const name = p.nameOf(id);
  const tix = g.tickets?.[id] ?? 0;
  const icons = (id in g.jail ? 15 : 0) + (cur ? 15 : 0);
  // chỗ cho tên: trừ avatar, khoảng cách, viền; chừa 1 dòng tiền ở dưới
  const textW = rect.w - (rect.h - 4) - 14 - icons;
  const fit = fitName(name, Math.max(24, textW), Math.max(10, rect.h - 6 - 15));
  // thẻ hẹp (bàn nghiêng trên màn nhỏ, 5-6 người): bỏ icon đồng xu, thu chữ tiền, ẩn số đất cho khỏi tràn
  const tight = textW < 92;
  const veryTight = textW < 70;
  const nameless = textW < 46; // thẻ siêu hẹp: chỉ còn avatar + tiền (tên vẫn có trong nhãn truy cập)
  const cashStyle = veryTight ? { fontSize: 10.5, lineHeight: 13 } : tight ? { fontSize: 11.5, lineHeight: 14 } : null;
  return (
    <>
    <Pressable
      testID={`wealth-card-${id}`}
      accessibilityRole="button"
      accessibilityLabel={`${p.nameOf(id)}: ${fmt(g.cash[id] ?? 0)}$, ${lands} đất${tix ? `, ${tix} vé ra tù` : ''}`}
      onPress={() => p.onPlayer(id)}
      style={[
        abs(rect), styles.wealth,
        { borderColor: cur ? C.ink : '#E8D5B0', backgroundColor: fl === 'gain' ? '#D3F9D8' : fl === 'loss' ? '#FFE0E0' : '#FFFFFF', opacity: out ? 0.45 : 1 },
        cur && styles.wealthCur,
      ]}
    >
      <View style={{ width: rect.h - 4, height: rect.h - 4 }}>
        <View
          testID={`avatar-${id}`}
          style={[
            styles.wAvatar,
            {
              borderColor: color,
              backgroundColor: p.lightColorOf(id),
              width: rect.h - 8,
              height: rect.h - 8,
              borderRadius: rect.h,
              transform: [{ translateX: wobbleX }, { rotate: wobbleDeg }],
            },
          ]}
        >
          <Image source={{ uri: p.portraitUriOf(id) }} style={{ width: '100%', height: '100%' }} />
          {face.doodle && (
            <Image testID={`doodle-${id}`} source={{ uri: doodleUri(face.doodle) }} pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} resizeMode="cover" />
          )}
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
        {!nameless && <View style={styles.rowC}>
          <T testID={`wealth-name-${id}`} numberOfLines={fit.lines} style={[styles.wName, { fontSize: fit.fs, lineHeight: fit.lh }, WRAP]}>{name}</T>
          {id in g.jail && <Image source={{ uri: FX_ICON.police }} style={styles.tiny} />}
          {cur && <Image source={{ uri: FX_ICON.dice }} style={styles.tiny} />}
        </View>}
        <View style={styles.rowC}>
          {out ? (
            <T style={[styles.wCash, { color: '#6B2B2B' }]}>Phá sản</T>
          ) : (
            <>
              {!tight && <Image source={{ uri: FX_ICON.coin }} style={styles.tiny} />}
              {/* số tiền không được co lại (trước đây có lúc bị co về 0 px nên mất chữ) */}
              <T testID={`wealth-cash-${id}`} numberOfLines={1} style={[styles.wCash, cashStyle, { flexShrink: 0 }]}>{fmt(g.cash[id] ?? 0)}$</T>
              {tix > 0 && <T testID={`ticket-${id}`} style={styles.wCash}> 🎫{tix > 1 ? tix : ''}</T>}
            </>
          )}
          <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 2 }} />
          {!veryTight && (
            <View style={[styles.landChip, { backgroundColor: color, flexShrink: 0 }]}>
              <T style={styles.landTxt}>{lands}</T>
              <Image source={{ uri: FX_ICON.house }} style={{ width: 10, height: 10 }} />
            </View>
          )}
        </View>
      </View>
    </Pressable>
    {showRc && (() => {
      // thẻ hàng trên: bong bóng nằm phía trên thẻ; thẻ hàng dưới: nằm đè lên chính thẻ đó (không che tiền người khác)
      const topRow = rect.y <= Math.min(...p.layout.wealth.map((r) => r.y)) + 1;
      const right = rect.x + rect.w / 2 > p.size.w * 0.6;
      const tone = rc.kind === 'loss' ? C.danger : C.jade;
      const bg = rc.kind === 'loss' ? '#FFF0F0' : '#EBFBEE';
      return (
        <View
          testID="react-bubble"
          pointerEvents="none"
          style={[
            styles.react,
            right ? { right: Math.max(0, p.size.w - rect.x - rect.w) + 4 } : { left: rect.x + 4 },
            topRow ? { top: rect.y - 30, maxWidth: Math.min(260, p.size.w - 8) } : { top: rect.y + (rect.h - 24) / 2, maxWidth: Math.max(60, rect.w - 8) },
            { borderColor: tone, backgroundColor: bg },
          ]}
        >
          <T numberOfLines={1} style={[styles.reactTxt, { color: rc.kind === 'loss' ? '#C92A2A' : '#2B8A3E' }]}>{rc.text}</T>
          {topRow && <View style={[styles.reactTail, right && { left: undefined, right: 16 }, { borderColor: tone, backgroundColor: bg }]} />}
        </View>
      );
    })()}
    </>
  );
}

/** Ghép nhóm đất của tôi: chạm để xem chi tiết / xây nhà */
function MyLands({ rect, p }: { rect: Rect; p: CenterProps }) {
  const mine = Object.entries(p.g.owners).filter(([, o]) => o === p.me).map(([i]) => Number(i));
  const groupOrder = (i: number) => {
    const c = TYPHU_BOARD[i];
    return c.kind === 'land' ? (Object.keys(TYPHU_GROUPS) as TyPhuGroup[]).indexOf(c.group) : 20;
  };
  mine.sort((a, b) => groupOrder(a) - groupOrder(b) || a - b);
  const max = rect.w > 300 ? 12 : 8;
  const shown = mine.slice(0, max);
  return (
    <View style={[abs(rect), styles.chipsBox]}>
      <T style={styles.chipsTitle}>Đất của bạn</T>
      {mine.length === 0 ? (
        <T style={styles.chipsEmpty}>Chưa có miếng đất nào. Mua một ô để bắt đầu!</T>
      ) : (
        <View style={styles.chipsWrap}>
          {shown.map((i) => {
            const c = TYPHU_BOARD[i];
            const col = c.kind === 'land' ? TYPHU_GROUPS[c.group].color : '#5C6B8C';
            const h = p.g.houses[i] ?? 0;
            return (
              <Pressable key={i} testID={`my-land-${i}`} accessibilityRole="button" accessibilityLabel={c.name} onPress={() => p.onCell(i)} style={[styles.chip, { borderColor: col, backgroundColor: col + '33' }]}>
                <Image source={{ uri: ICON_BY_CELL[i] }} style={{ width: 14, height: 14 }} />
                <T style={styles.chipTxt}>{shortCellName(c.name)}{h >= 4 ? ' KS' : h > 0 ? ` ${h}` : ''}</T>
              </Pressable>
            );
          })}
          {mine.length > max && <T style={styles.chipMore}>+{mine.length - max}</T>}
        </View>
      )}
    </View>
  );
}

function CardView({ p, layout }: { p: CenterProps; layout: CenterLayout }) {
  const c = p.card!;
  const dur = Math.round(2200 / (p.speed ?? 1));
  const t = p.reducedMotion ? 600 : p.now - c.at;
  if (!p.reducedMotion && (t < 0 || t >= dur)) return null;
  const flip = clamp(t / 450, 0, 1);
  const out = p.reducedMotion ? 0 : clamp((t - (dur - 350)) / 350, 0, 1);
  const big = layout.cardBig;
  const bw = Math.min(big.w, 190);
  const bh = Math.min(big.h, 124);
  const r: Rect = { x: big.x + (big.w - bw) / 2, y: big.y + (big.h - bh) / 2, w: bw, h: bh };
  const angle = (1 - flip) * 180;
  const faceUp = angle < 90;
  const chance = c.title === 'CƠ HỘI';
  const bg = chance ? '#B2F2BB' : '#FFC9C9';
  return (
    <View
      testID="typhu-card"
      pointerEvents="none"
      style={[
        abs(r), styles.card,
        { backgroundColor: faceUp ? bg : C.son, opacity: 1 - out, zIndex: 20 },
        { transform: [{ perspective: 600 }, { rotateY: `${angle}deg` }, { scale: 1 - out * 0.15 }] } as object,
      ]}
    >
      {faceUp ? (
        <View style={{ alignItems: 'center', gap: 4, transform: [{ scaleX: 1 }] }}>
          <T style={styles.cardTitle}>{c.title}</T>
          <Image source={{ uri: chance ? iconUri('2753') : RISK_ICON }} style={{ width: 26, height: 26 }} />
          <T style={styles.cardText}>{c.text}</T>
        </View>
      ) : (
        <Image source={{ uri: FX_ICON.star }} style={{ width: 34, height: 34, transform: [{ scaleX: -1 }] }} />
      )}
    </View>
  );
}

export function TyPhuCenter(p: CenterProps) {
  const { layout: L, g } = p;
  const cur = g.currentPlayerId;
  const idle = !p.moving;
  const showRoll = idle && p.myTurn && g.step === 'roll' && !p.inJail;
  const showJail = idle && p.myTurn && g.step === 'roll' && p.inJail;
  const showTicket = idle && p.myTurn && g.step === 'ticket';
  const showBuy = idle && p.myTurn && g.step === 'buy' && p.buyable;
  const showEnd = idle && p.myTurn && (g.step === 'manage' || g.step === 'upgrade');
  const showDebt = idle && p.myTurn && g.step === 'debt';
  const timeTotal = Math.max(1, g.turnSeconds);
  const hot = !p.paused && p.left <= 5;
  const logs = L.logRows > 0 ? g.log.slice(-L.logRows) : [];
  const tools = useShellTools();
  const statusH = L.wide ? 30 : 0;
  // khung hành động: viền+đệm 8, khe 4 giữa các phần, hàng nút 38, hàng trạng thái (statusH - 4)
  const trayH = Math.max(40, L.action.h - (8 + (L.wide ? 8 : 4) + 38 + (L.wide ? statusH - 4 : 0)) - 1);
  const canThrow = showRoll && !p.dice.animating;
  // hàng nút nhỏ có tối đa 9 nút: bàn hẹp thì thu nhỏ nút cho vừa hàng, không tràn ra ô viền
  const toolCount = 3 + (p.onPoke ? 1 : 0) + (p.onView ? 1 : 0) + (p.onRules ? 1 : 0) + (p.onSpeed ? 1 : 0) + (p.isHost ? 1 : 0);
  const toolGap = 6;
  const toolSize = clamp(Math.floor((L.tools.w - toolGap * (toolCount - 1)) / toolCount), 22, 30);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* hàng nút nhỏ thay cho thanh trên cùng */}
      {L.tools.h > 0 && tools && (
        <View style={[abs(L.tools), styles.tools, { gap: toolGap }]}>
          <MiniBtn size={toolSize} testID="chat-open" label="Trò chuyện" icon="💬" onPress={tools.openChat} badge={tools.unread} />
          {p.onPoke && <MiniBtn size={toolSize} testID="poke-open" label="Chọc đối thủ" icon="😈" onPress={p.onPoke} />}
          {p.onView && <MiniBtn size={toolSize} testID="view-mode" label={`Chế độ xem: ${p.viewLabel ?? ''}, chạm để đổi`} icon={p.viewLabel?.startsWith('3D') ? '3D' : p.viewLabel?.includes('tràn') ? '⛶' : '2D'} onPress={p.onView} />}
          {p.onRules && <MiniBtn size={toolSize} testID="rules-open" label="Luật chơi" icon="📖" onPress={p.onRules} />}
          {p.onSpeed && <MiniBtn size={toolSize} testID="speed-btn" label={`Tốc độ x${p.speed ?? 1}, chạm để đổi`} icon={`x${p.speed ?? 1}`} onPress={p.onSpeed} />}
          <MiniBtn size={toolSize} label={tools.muted ? 'Bật âm thanh' : 'Tắt âm thanh'} icon={tools.muted ? '🔇' : '🔊'} onPress={tools.toggleMute} />
          {p.isHost && <MiniBtn size={toolSize} testID="end-open" label="Tổng kết" icon="🏁" onPress={p.onEnd} />}
          <MiniBtn size={toolSize} testID="leave-open" label="Rời phòng" icon="🚪" onPress={tools.leave} />
        </View>
      )}

      {/* đầu: tên game + nút phụ */}
      {L.header.h > 0 && <View style={[abs(L.header), styles.head]}>
        <Image source={{ uri: FX_ICON.bag }} style={{ width: 18, height: 18 }} />
        <T numberOfLines={1} style={styles.logo}>{L.wide ? 'TỶ PHÚ' : 'TỶ PHÚ XÓM LẦY'}</T>
        <View style={{ flex: 1 }} />
        {p.isHost && (
          <Pressable testID="end-open" accessibilityRole="button" onPress={p.onEnd} hitSlop={8} style={[styles.miniBtn, { backgroundColor: C.paper }]}>
            <T style={styles.miniTxt}>Tổng kết</T>
          </Pressable>
        )}
      </View>}

      {/* người đang chơi */}
      {L.banner.h > 0 && <View style={[abs(L.banner), styles.banner, { borderColor: cur ? p.colorOf(cur) : C.ink }]}>
        {cur && (
          <View style={[styles.bAvatar, { borderColor: p.colorOf(cur), backgroundColor: p.lightColorOf(cur) }]}>
            <Image source={{ uri: p.portraitUriOf(cur) }} style={{ width: '100%', height: '100%' }} />
          </View>
        )}
        <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <T testID="typhu-status" numberOfLines={2} style={[styles.status, p.myTurn && { color: '#C2410C' }]}>{p.status}</T>
          <View style={styles.timerRow}>
            <View style={styles.track}>
              <View style={{ height: '100%', width: `${p.paused ? 100 : clamp(p.left / timeTotal, 0, 1) * 100}%`, backgroundColor: hot ? C.danger : C.jade }} />
            </View>
            <T style={[styles.timerNum, hot && { color: C.danger }]}>{p.paused ? '…' : `${p.left}s`}</T>
          </View>
        </View>
      </View>}

      {/* khay xúc xắc 3D + nút hành động */}
      <View style={[abs(L.action), styles.actionBox]}>
        {L.wide && (
          <View style={[styles.statusRow, { height: statusH - 4 }]}>
            {/* trạng thái có tên người chơi: dài thì xuống 2 dòng chữ nhỏ hơn, không cắt tên */}
            <T testID="typhu-status" numberOfLines={2} style={[styles.status, { flex: 1 }, p.status.length * 6.4 > L.action.w - 12 && { fontSize: 10.5, lineHeight: 12 }, p.myTurn && { color: '#C2410C' }, WRAP]}>{p.status}</T>
          </View>
        )}
        <View
          testID={`dice-phase-${p.dice.phase}`}
          accessibilityLabel={`Xúc xắc: ${p.dice.phase}`}
          style={{ width: L.action.w - 4, height: trayH, borderRadius: 12, alignSelf: 'center', zIndex: 5 }}
        >
          <TyPhuDice3D
            width={L.action.w - 4}
            height={trayH}
            roll={p.playback}
            clockOffset={p.clockOffset}
            values={g.dice}
            canThrow={canThrow}
            onThrow={p.onThrow}
          />
          {canThrow && <T style={styles.trayHint}>Vuốt để tung, hoặc chạm</T>}
          {g.dice && !p.dice.animating && !p.moving && <View style={styles.sumPill}><T style={styles.sumTxt}>{g.dice[0] + g.dice[1]}</T></View>}
        </View>
        <View style={styles.btnRow}>
          {showRoll ? (
            <Button testID="roll-btn" small title="Đổ xúc xắc" icon="🎲" style={styles.fillBtn} onPress={() => p.onAct('roll')} />
          ) : showBuy || showEnd || showDebt || showJail || showTicket ? (
            <T style={[styles.hint, { flex: 1 }]}>
              {showBuy ? 'Chọn mua hay bỏ qua ở bảng thông tin' : showDebt ? 'Thiếu tiền: chọn nhà đất để bán ở bảng giữa'
                : showJail ? 'Đang ở tù: trả tiền / dùng vé để đổ, hoặc ở lại' : showTicket ? 'Mua vé ra tù không?' : 'Chọn nâng cấp ở bảng thông tin'}
            </T>
          ) : (
            <T style={[styles.hint, { flex: 1 }]}>{p.dice.animating ? 'Đang đổ xúc xắc...' : p.moving ? 'Đang đi...' : cur && cur !== p.me ? `Chờ ${p.nameOf(cur)}...` : 'Chờ chút...'}</T>
          )}
        </View>
        {p.error && <T numberOfLines={1} style={styles.error}>{p.error}</T>}
      </View>

      {g.order.map((id, i) => (
        <PlayerCard key={id} id={id} rect={L.wealth[i]} p={p} />
      ))}

      {L.chips.h > 0 && <MyLands rect={L.chips} p={p} />}

      {/* diễn biến gần nhất */}
      {L.log.h > 20 && (
        <View style={[abs(L.log), styles.log]}>
          {logs.length === 0 && <T style={styles.chipsEmpty}>Chưa có gì xảy ra. Đổ xúc xắc để bắt đầu nào!</T>}
          {logs.map((l, i) => (
            <View key={l.id} style={[styles.logRow, { opacity: 0.5 + 0.5 * ((i + 1) / logs.length) }]}>
              <Image source={{ uri: LOG_ICON[l.kind] ?? LOG_ICON.info }} style={styles.logIcon} />
              <T numberOfLines={2} style={styles.logTxt}>{l.text}</T>
            </View>
          ))}
        </View>
      )}

      {p.card && (p.reducedMotion ? g.card?.id === p.card.id : p.now < p.card.at + Math.round(2200 / (p.speed ?? 1))) && <CardView p={p} layout={L} />}
    </View>
  );
}

const styles = StyleSheet.create({
  tools: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  mini: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', borderWidth: 2, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  miniBadge: { position: 'absolute', top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.gold, borderWidth: 1.5, borderColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  miniBadgeTxt: { fontSize: 9, fontWeight: '900' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logo: { fontWeight: '900', fontSize: 14, color: C.son, letterSpacing: 0.6 },
  miniBtn: {
    backgroundColor: C.gold, borderWidth: 2, borderColor: C.ink, borderRadius: 9, paddingHorizontal: 8, height: 24, justifyContent: 'center',
  },
  miniTxt: { fontSize: 11, fontWeight: '900', color: C.ink },
  banner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 2.5, borderRadius: 14, paddingHorizontal: 7,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
  },
  bAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 3, overflow: 'hidden' },
  status: { fontWeight: '800', fontSize: 12, lineHeight: 14, color: C.ink },
  timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.mist, borderWidth: 1.5, borderColor: C.ink, overflow: 'hidden' },
  timerNum: { width: 30, textAlign: 'right', fontWeight: '900', fontSize: 12, color: C.ink },
  actionBox: {
    gap: 4, backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: 14, borderWidth: 2, borderColor: '#E8D5B0', padding: 2,
  },
  btnRow: { flexDirection: 'row', gap: 6, alignItems: 'center', height: 38, paddingHorizontal: 4 },
  trayHint: { position: 'absolute', alignSelf: 'center', bottom: 2, textAlign: 'center', fontSize: 11, fontWeight: '800', color: '#fff', backgroundColor: 'rgba(20,48,38,0.62)', borderRadius: 9, overflow: 'hidden', paddingHorizontal: 9, paddingVertical: 1 },
  sumPill: {
    position: 'absolute', right: 6, top: 4, minWidth: 28, height: 24, borderRadius: 12, backgroundColor: C.gold, borderWidth: 2, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  sumTxt: { fontWeight: '900', fontSize: 14, color: C.ink },
  fillBtn: { flex: 1, minHeight: 34 },
  react: { position: 'absolute', zIndex: 30, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 14, borderWidth: 2, boxShadow: '0px 3px 8px rgba(0,0,0,0.25)' },
  reactTxt: { fontSize: 13, lineHeight: 17, fontWeight: '900' },
  reactTail: { position: 'absolute', left: 16, bottom: -6, width: 10, height: 10, borderRightWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
  hint: { fontSize: 11, fontWeight: '700', color: C.muted, textAlign: 'center' },
  error: { position: 'absolute', left: 6, right: 6, bottom: 42, zIndex: 10, fontSize: 11, fontWeight: '800', color: C.ink, backgroundColor: C.gold, borderRadius: 6, padding: 3, textAlign: 'center', borderWidth: 1.5, borderColor: C.ink },
  wealth: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderRadius: 11, paddingLeft: 3, paddingRight: 4,
  },
  wealthCur: {
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
  },
  wAvatar: { borderWidth: 3, overflow: 'hidden' },
  rowC: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  wName: { fontSize: 11, fontWeight: '800', color: C.ink, flexShrink: 1, flexGrow: 1 },
  wCash: { fontSize: 13, fontWeight: '900', color: '#B45309', lineHeight: 16 },
  tiny: { width: 12, height: 12 },
  landChip: { flexDirection: 'row', alignItems: 'center', gap: 1, borderRadius: 7, paddingHorizontal: 3, height: 15, borderWidth: 1.5, borderColor: C.ink },
  landTxt: { color: '#fff', fontWeight: '900', fontSize: 11, lineHeight: 13 },
  chipsBox: { backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 11, paddingHorizontal: 6, paddingVertical: 3, overflow: 'hidden' },
  chipsTitle: { fontSize: 10, fontWeight: '900', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  chipsEmpty: { fontSize: 11, fontWeight: '700', color: C.muted, marginTop: 2 },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, marginTop: 2, alignItems: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 2, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 3, height: 20 },
  chipTxt: { fontSize: 10, fontWeight: '800', color: C.ink },
  chipMore: { fontSize: 11, fontWeight: '900', color: C.ink },
  log: { justifyContent: 'flex-start', overflow: 'hidden', gap: 2 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 24 },
  logIcon: { width: 16, height: 16 },
  logTxt: { flex: 1, fontSize: 11, lineHeight: 13, fontWeight: '700', color: C.ink },
  card: {
    alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.ink, borderRadius: 14, padding: 6, backfaceVisibility: 'hidden',
    shadowColor: C.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
  } as object,
  cardTitle: { fontWeight: '900', fontSize: 13, letterSpacing: 1.5, color: C.ink },
  cardText: { fontWeight: '800', fontSize: 13, lineHeight: 16, color: C.ink, textAlign: 'center' },
  cardDock: { fontWeight: '800', fontSize: 11, lineHeight: 13, color: C.ink, textAlign: 'center' },
});
