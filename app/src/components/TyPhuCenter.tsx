import { Image, Pressable, StyleSheet, View } from 'react-native';
import {
  TYPHU_BOARD, TYPHU_GROUPS, TYPHU_JAIL_FINE, type TyPhuGroup,
} from '../../../shared/src/typhu';
import type { TyPhuLogKind, TyPhuView } from '../../../shared/src/types';
import { C } from '../theme';
import { Button, T } from '../ui';
import { FX_ICON, ICON_BY_CELL, iconUri } from '../typhuCellIcons';
import { shortCellName } from '../typhuNames';
import type { CenterLayout, Rect } from '../typhuLayout';
import type { DiceRollView, ThrowImpulse } from '../../../shared/src/dice';
import { TyPhuDice3D } from './TyPhuDice3D';

const fmt = (n: number) => n.toLocaleString('vi-VN');
const abs = (r: Rect) => ({ position: 'absolute' as const, left: r.x, top: r.y, width: r.w, height: r.h });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

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
  onAct: (a: 'roll' | 'buy' | 'skip' | 'endTurn' | 'payJail') => void;
  onCell: (i: number) => void;
  onPlayer: (id: string) => void;
}

function PlayerCard({ id, rect, p }: { id: string; rect: Rect; p: CenterProps }) {
  const { g } = p;
  const color = p.colorOf(id);
  const out = g.bankrupt.includes(id);
  const cur = id === g.currentPlayerId;
  const lands = Object.values(g.owners).filter((o) => o === id).length;
  const fl = p.flash[id];
  return (
    <Pressable
      testID={`wealth-card-${id}`}
      accessibilityRole="button"
      accessibilityLabel={`${p.nameOf(id)}: ${fmt(g.cash[id] ?? 0)} xu, ${lands} đất`}
      onPress={() => p.onPlayer(id)}
      style={[
        abs(rect), styles.wealth,
        { borderColor: cur ? C.ink : '#E8D5B0', backgroundColor: fl === 'gain' ? '#D3F9D8' : fl === 'loss' ? '#FFE0E0' : '#FFFFFF', opacity: out ? 0.45 : 1 },
        cur && styles.wealthCur,
      ]}
    >
      <View style={{ width: rect.h - 4, height: rect.h - 4 }}>
        <View style={[styles.wAvatar, { borderColor: color, backgroundColor: p.lightColorOf(id), width: rect.h - 8, height: rect.h - 8, borderRadius: rect.h }]}>
          <Image source={{ uri: p.portraitUriOf(id) }} style={{ width: '100%', height: '100%' }} />
        </View>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={styles.rowC}>
          <T numberOfLines={1} style={styles.wName}>{p.nameOf(id)}</T>
          {id in g.jail && <Image source={{ uri: FX_ICON.police }} style={styles.tiny} />}
          {cur && <Image source={{ uri: FX_ICON.dice }} style={styles.tiny} />}
        </View>
        <View style={styles.rowC}>
          {out ? (
            <T style={[styles.wCash, { color: '#6B2B2B' }]}>Phá sản</T>
          ) : (
            <>
              <Image source={{ uri: FX_ICON.coin }} style={styles.tiny} />
              <T style={styles.wCash}>{fmt(g.cash[id] ?? 0)}</T>
            </>
          )}
        </View>
      </View>
      <View style={[styles.landChip, { backgroundColor: color }]}>
        <T style={styles.landTxt}>{lands}</T>
        <Image source={{ uri: FX_ICON.house }} style={{ width: 10, height: 10 }} />
      </View>
    </Pressable>
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
  const t = p.reducedMotion ? 10_000 : p.now - c.at;
  const flip = clamp(t / 550, 0, 1);
  const dock = p.reducedMotion ? 1 : clamp((t - 3000) / 450, 0, 1);
  const e = dock * dock * (3 - 2 * dock);
  const big = layout.cardBig;
  const bw = Math.min(big.w, 190);
  const bh = Math.min(big.h, 124);
  const bigR: Rect = { x: big.x + (big.w - bw) / 2, y: big.y + (big.h - bh) / 2, w: bw, h: bh };
  const d = layout.cardDock;
  const r: Rect = {
    x: bigR.x + (d.x - bigR.x) * e, y: bigR.y + (d.y - bigR.y) * e,
    w: bigR.w + (d.w - bigR.w) * e, h: bigR.h + (d.h - bigR.h) * e,
  };
  const angle = (1 - flip) * 180;
  const faceUp = angle < 90;
  const chance = c.title === 'CƠ HỘI';
  const bg = chance ? '#FFE066' : '#FFB3D6';
  const docked = e > 0.6;
  return (
    <View
      testID="typhu-card"
      pointerEvents="none"
      style={[
        abs(r), styles.card,
        { backgroundColor: faceUp ? bg : C.son, opacity: t < 0 ? 0 : 1, zIndex: 20 },
        { transform: [{ perspective: 600 }, { rotateY: `${angle}deg` }] } as object,
      ]}
    >
      {faceUp ? (
        docked ? (
          <T numberOfLines={2} style={styles.cardDock}>{c.text}</T>
        ) : (
          <View style={{ alignItems: 'center', gap: 4, transform: [{ scaleX: 1 }] }}>
            <T style={styles.cardTitle}>{c.title}</T>
            <Image source={{ uri: iconUri(chance ? '2753' : '1f381') }} style={{ width: 26, height: 26 }} />
            <T style={styles.cardText}>{c.text}</T>
          </View>
        )
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
  const showRoll = idle && p.myTurn && g.step === 'roll';
  const showBuy = idle && p.myTurn && g.step === 'buy' && p.buyable;
  const showEnd = idle && p.myTurn && g.step === 'manage';
  const timeTotal = Math.max(1, g.turnSeconds);
  const hot = !p.paused && p.left <= 5;
  const logs = L.logRows > 0 ? g.log.slice(-L.logRows) : [];
  const trayH = L.action.h - 44;
  const canThrow = showRoll && !p.dice.animating;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* đầu: tên game + nút phụ */}
      <View style={[abs(L.header), styles.head]}>
        <Image source={{ uri: FX_ICON.bag }} style={{ width: 18, height: 18 }} />
        <T numberOfLines={1} style={styles.logo}>TỶ PHÚ XÓM LẦY</T>
        <View style={{ flex: 1 }} />
        {p.isHost && (
          <Pressable testID="end-open" accessibilityRole="button" onPress={p.onEnd} hitSlop={8} style={[styles.miniBtn, { backgroundColor: C.paper }]}>
            <T style={styles.miniTxt}>Tổng kết</T>
          </Pressable>
        )}
      </View>

      {/* người đang chơi */}
      <View style={[abs(L.banner), styles.banner, { borderColor: cur ? p.colorOf(cur) : C.ink }]}>
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
      </View>

      {/* khay xúc xắc 3D + nút hành động */}
      <View style={[abs(L.action), styles.actionBox]}>
        <View
          testID={`dice-phase-${p.dice.phase}`}
          accessibilityLabel={`Xúc xắc: ${p.dice.phase}`}
          style={{ width: L.action.w - 4, height: trayH, borderRadius: 12, overflow: 'hidden', alignSelf: 'center' }}
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
            <>
              {p.inJail && <Button testID="pay-jail" small variant="paper" title={`Nộp ${TYPHU_JAIL_FINE} xu ra tù`} style={styles.fillBtn} onPress={() => p.onAct('payJail')} />}
              <Button testID="roll-btn" small title="Đổ xúc xắc" icon="🎲" style={styles.fillBtn} onPress={() => p.onAct('roll')} />
            </>
          ) : showBuy ? (
            <>
              <Button testID="skip-btn" small variant="paper" title="Bỏ qua" style={styles.fillBtn} onPress={() => p.onAct('skip')} />
              <Button testID="buy-btn" small variant="jade" title={`Mua giá ${fmt(p.buyable!.price)}`} style={styles.fillBtn} onPress={() => p.onAct('buy')} />
            </>
          ) : showEnd ? (
            <>
              <T style={[styles.hint, { flex: 1 }]}>Chạm ô đất của bạn để xây nhà</T>
              <Button testID="end-turn" small variant="gold" title="Xong lượt" icon="✓" style={styles.fillBtn} onPress={() => p.onAct('endTurn')} />
            </>
          ) : (
            <T style={[styles.hint, { flex: 1 }]}>{p.moving ? 'Đang đi...' : cur && cur !== p.me ? `Chờ ${p.nameOf(cur)}...` : 'Chờ chút...'}</T>
          )}
        </View>
        {p.error && <T style={styles.error}>{p.error}</T>}
      </View>

      {g.order.map((id, i) => (
        <PlayerCard key={id} id={id} rect={L.wealth[i]} p={p} />
      ))}

      <MyLands rect={L.chips} p={p} />

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

      {p.card && g.card?.id === p.card.id && <CardView p={p} layout={L} />}
    </View>
  );
}

const styles = StyleSheet.create({
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
  trayHint: { position: 'absolute', left: 0, right: 0, bottom: 2, textAlign: 'center', fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.9)' },
  sumPill: {
    position: 'absolute', right: 6, top: 4, minWidth: 28, height: 24, borderRadius: 12, backgroundColor: C.gold, borderWidth: 2, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  sumTxt: { fontWeight: '900', fontSize: 14, color: C.ink },
  fillBtn: { flex: 1, minHeight: 34 },
  hint: { fontSize: 11, fontWeight: '700', color: C.muted, textAlign: 'center' },
  error: { fontSize: 11, fontWeight: '800', color: C.ink, backgroundColor: C.gold, borderRadius: 6, padding: 3, textAlign: 'center' },
  wealth: {
    flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 2, borderRadius: 11, paddingLeft: 3, paddingRight: 4,
  },
  wealthCur: {
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 0,
  },
  wAvatar: { borderWidth: 3, overflow: 'hidden' },
  rowC: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  wName: { fontSize: 11, fontWeight: '800', color: C.ink, flexShrink: 1 },
  wCash: { fontSize: 13, fontWeight: '900', color: '#B45309', lineHeight: 16 },
  tiny: { width: 12, height: 12 },
  landChip: { position: 'absolute', right: 3, top: 3, flexDirection: 'row', alignItems: 'center', gap: 1, borderRadius: 7, paddingHorizontal: 3, height: 15, borderWidth: 1.5, borderColor: C.ink },
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
