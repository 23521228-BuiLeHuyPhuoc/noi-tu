import { Image, StyleSheet, View } from 'react-native';
import { C } from '../theme';
import { T } from '../ui';
import { FX_ICON, iconUri } from '../typhuCellIcons';

/** Thông báo lớn toàn màn hình (giống mở bát Bầu cua): xếp hàng, không chặn thao tác, bỏ qua khi giảm chuyển động. */
export type Announce = {
  id: number;
  kind: 'buy' | 'reward' | 'loss' | 'build' | 'bankrupt';
  /** mốc bắt đầu / kết thúc (Date.now) đã được xếp hàng */
  start: number;
  end: number;
  title: string;
  sub?: string;
  /** số xu (dương: nhận, âm: mất) */
  amount?: number;
  portrait?: string;
  color?: string;
  /** icon ô (data URI) */
  icon?: string;
  level?: number;
};

export const ANNOUNCE_MS: Record<Announce['kind'], number> = { buy: 2100, reward: 2100, loss: 2200, build: 1900, bankrupt: 2600 };
const ease = (t: number) => 1 - (1 - t) * (1 - t) * (1 - t);
const rnd = (id: number, i: number) => ((i * 7919 + id * 104729 + 13) % 1000) / 1000;
const fmt = (n: number) => n.toLocaleString('vi-VN');

function Rays({ now, size, color }: { now: number; size: number; color: string }) {
  const n = 14;
  const slice = 360 / n;
  const stops = Array.from({ length: n }, (_, i) => `${i % 2 ? 'transparent' : color} ${i * slice}deg ${(i + 1) * slice}deg`).join(',');
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', width: size, height: size, borderRadius: size, opacity: 0.55,
        backgroundImage: `conic-gradient(${stops})`, transform: [{ rotate: `${(now / 18) % 360}deg` }],
      } as object}
    />
  );
}

export function TyPhuAnnounce({ a, now, W, H }: { a: Announce; now: number; W: number; H: number }) {
  const dur = a.end - a.start;
  const el = now - a.start;
  if (el < 0 || el > dur) return null;
  const p = el / dur;
  const fadeIn = Math.min(1, el / 220);
  const fadeOut = Math.min(1, (dur - el) / 280);
  const op = Math.min(fadeIn, fadeOut);
  const pop = ease(Math.min(1, el / 420));
  const scale = 0.4 + 0.6 * pop + (el < 420 ? Math.sin((el / 420) * Math.PI) * 0.12 : 0);
  const k = Math.min(1, Math.max(0.75, H / 520)); // màn thấp (ngang): thu nhỏ nội dung cho vừa
  const cy = H < 500 ? H * 0.5 : H * 0.4;
  const loss = a.kind === 'loss';
  const bank = a.kind === 'bankrupt';
  const tint = loss ? 'rgba(14,38,32,0.8)' : bank ? 'rgba(30,24,28,0.86)' : a.kind === 'buy' ? 'rgba(42,10,16,0.72)' : 'rgba(60,30,0,0.74)';
  const portrait = a.portrait ? (
    <View style={[styles.portrait, { borderColor: a.color ?? C.gold, width: Math.min(110, W * 0.28), height: Math.min(110, W * 0.28), borderRadius: 60 }]}>
      <Image source={{ uri: a.portrait }} style={{ width: '100%', height: '100%' }} />
    </View>
  ) : null;

  return (
    <View testID={`announce-${a.kind}`} pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 60, opacity: op, overflow: 'hidden' }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: tint }]} />
      {!loss && !bank && (
        <View style={{ position: 'absolute', left: W / 2 - W, top: cy - W, width: W * 2, height: W * 2, alignItems: 'center', justifyContent: 'center' }}>
          <Rays now={now} size={W * 1.6} color={a.kind === 'buy' ? '#FFC21A' : '#FFE066'} />
          <View style={[styles.halo, { width: W * 0.7, height: W * 0.7, borderRadius: W }]} />
        </View>
      )}
      {loss && <Fog now={now} W={W} H={H} />}

      {/* nội dung giữa */}
      <View style={{ position: 'absolute', left: 0, right: 0, top: cy - 140, height: 280, justifyContent: 'center', alignItems: 'center', transform: [{ scale: scale * k }] }}>
        {a.kind === 'buy' && (
          <>
            {portrait}
            <View style={styles.cellRow}>
              {a.icon && <Image source={{ uri: a.icon }} style={{ width: 52, height: 52 }} />}
              <T style={styles.big}>{a.title}</T>
            </View>
            <T style={styles.sub}>{a.sub}</T>
            <View style={[styles.stamp, { borderColor: a.color ?? C.son, transform: [{ rotate: '-8deg' }, { scale: 1 + (1 - ease(Math.min(1, el / 380))) * 2.2 }] }]}>
              <T style={[styles.stampTxt, { color: a.color ?? C.son }]}>ĐÃ MUA!</T>
            </View>
          </>
        )}
        {a.kind === 'reward' && (
          <>
            {portrait}
            <T style={[styles.huge, { color: '#FFE066' }]}>{a.amount ? `+${fmt(a.amount)} xu` : a.title}</T>
            <T style={styles.sub}>{a.title}</T>
            {a.sub ? <T style={styles.sub2}>{a.sub}</T> : null}
          </>
        )}
        {loss && (
          <>
            <Image
              source={{ uri: iconUri('1f47b') }}
              style={{
                width: 96, height: 96, opacity: Math.min(1, el / 300) * (p > 0.8 ? (1 - p) / 0.2 : 1),
                transform: [{ translateY: -ease(p) * 36 }, { translateX: Math.sin(el / 140) * 16 }, { rotate: `${Math.sin(el / 170) * 12}deg` }],
              }}
            />
            <T style={[styles.huge, { color: '#B2F2BB', transform: [{ translateX: Math.sin(el / 45) * (p < 0.3 ? 4 : 1) }] }]}>
              {a.amount ? `-${fmt(Math.abs(a.amount))} xu` : a.title}
            </T>
            <T style={[styles.sub, { color: '#C0EBD0' }]}>{a.amount ? a.title : a.sub}</T>
            {a.amount && a.sub ? <T style={[styles.sub2, { color: '#8FD1AA' }]}>{a.sub}</T> : null}
            {portrait && <View style={{ marginTop: 6, opacity: 0.85 }}>{portrait}</View>}
          </>
        )}
        {a.kind === 'build' && (
          <>
            <Image source={{ uri: a.level && a.level >= 4 ? FX_ICON.hotel : FX_ICON.house }} style={{ width: 110, height: 110, transform: [{ translateY: -Math.sin(Math.min(1, el / 500) * Math.PI) * 24 }] }} />
            <T style={styles.huge}>{a.title}</T>
            <T style={styles.sub}>{a.sub}</T>
          </>
        )}
        {bank && (
          <>
            <Image source={{ uri: FX_ICON.skull }} style={{ width: 96, height: 96, marginBottom: 22, transform: [{ rotate: `${Math.sin(el / 120) * 10}deg` }] }} />
            <View style={[styles.stamp, { borderColor: '#6B2B2B', transform: [{ rotate: '-7deg' }, { scale: 1 + (1 - ease(Math.min(1, el / 380))) * 2.2 }] }]}>
              <T style={[styles.stampTxt, { color: '#6B2B2B', fontSize: 30 }]}>PHÁ SẢN</T>
            </View>
            <T style={[styles.sub, { color: '#E9D8D8' }]}>{a.title}</T>
            {portrait && <View style={{ marginTop: 6, opacity: 0.7 }}>{portrait}</View>}
          </>
        )}
      </View>

      {a.kind === 'reward' && <CoinBurst now={now} a={a} W={W} cy={cy} />}
      {bank && <Bills now={now} a={a} W={W} H={H} />}
    </View>
  );
}

function CoinBurst({ now, a, W, cy }: { now: number; a: Announce; W: number; cy: number }) {
  const el = now - a.start;
  return (
    <>
      {Array.from({ length: 16 }, (_, k) => {
        const t = Math.max(0, Math.min(1, (el - 120 - k * 25) / 1100));
        if (t <= 0 || t >= 1) return null;
        const ang = (k / 16) * Math.PI * 2 + rnd(a.id, k);
        const d = ease(t) * (90 + rnd(a.id, k + 5) * 90);
        return (
          <Image
            key={k}
            source={{ uri: FX_ICON.coin }}
            style={{
              position: 'absolute', width: 26, height: 26, left: W / 2 - 13 + Math.cos(ang) * d, top: cy - 13 + Math.sin(ang) * d * 0.8 + t * t * 80,
              opacity: 1 - t * t, transform: [{ rotate: `${t * 540}deg` }],
            }}
          />
        );
      })}
    </>
  );
}

function Bills({ now, a, W, H }: { now: number; a: Announce; W: number; H: number }) {
  const el = now - a.start;
  return (
    <>
      {Array.from({ length: 22 }, (_, k) => {
        const t = Math.max(0, Math.min(1, (el - rnd(a.id, k) * 500) / 1900));
        if (t <= 0 || t >= 1) return null;
        return (
          <Image
            key={k}
            source={{ uri: k % 5 === 0 ? FX_ICON.skull : FX_ICON.bill }}
            style={{
              position: 'absolute', width: 30, height: 30, left: rnd(a.id, k + 40) * (W - 30) + Math.sin(t * 8 + k) * 16, top: -30 + t * (H + 40),
              transform: [{ rotate: `${t * 600 * (k % 2 ? 1 : -1)}deg` }],
            }}
          />
        );
      })}
    </>
  );
}

/** sương mù xanh xám lờ mờ cho cảnh xui xẻo */
function Fog({ now, W, H }: { now: number; W: number; H: number }) {
  return (
    <>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            position: 'absolute', width: W * 0.9, height: H * 0.28, borderRadius: W, backgroundColor: 'rgba(120,200,160,0.12)',
            left: -W * 0.2 + ((now / (28 + i * 9) + i * 140) % (W * 1.3)), top: H * (0.18 + i * 0.2),
          }}
        />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  halo: { position: 'absolute', backgroundColor: 'rgba(255,224,102,0.35)' },
  portrait: { borderWidth: 5, overflow: 'hidden', backgroundColor: '#fff', marginBottom: 8 },
  cellRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  big: { fontSize: 28, fontWeight: '900', color: '#fff', textShadowColor: C.ink, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
  huge: { fontSize: 42, fontWeight: '900', color: '#fff', textShadowColor: C.ink, textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 0 },
  sub: { fontSize: 16, fontWeight: '800', color: '#FFE7C2', marginTop: 2, textAlign: 'center', paddingHorizontal: 20 },
  sub2: { fontSize: 13, fontWeight: '700', color: '#FFE7C2', opacity: 0.85, textAlign: 'center', paddingHorizontal: 20 },
  stamp: {
    marginTop: 10, borderWidth: 5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 4, backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: C.ink, shadowOffset: { width: 3, height: 4 }, shadowOpacity: 1, shadowRadius: 0,
  },
  stampTxt: { fontSize: 34, fontWeight: '900', letterSpacing: 2 },
});
