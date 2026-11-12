/**
 * Cửa hàng Ruby (kỹ năng chọc, trang trí avatar, sticker, quà) và bảng điểm danh 7 ngày.
 * Mọi quyền và số dư do server kiểm tra; app chỉ hiện và gọi lệnh.
 */
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import {
  CHECKIN_REWARDS, FREE_POKES_PER_DAY, itemsOfKind, type CheckinStatus, type CosmeticSlot, type ShopItem, type ShopKind,
} from '../../../shared/src/shop';
import type { Game } from '../useGame';
import { CHU_LAY_STICKERS } from '../stickers';
import { play } from '../sound';
import { C } from '../theme';
import { Button, T, useFeed } from '../ui';
import { Sheet } from './Sheet';
import { WalletSheet, fmtRuby } from './Wallet';
import { Confetti } from './Fun';
import { NameText } from './Cosmetics';
import { Portrait } from './Avatar';

type Tab = 'skill' | 'deco' | 'sticker' | 'gift';
const TABS: { id: Tab; label: string }[] = [
  { id: 'skill', label: '⚡ Kỹ năng' },
  { id: 'deco', label: '🖼️ Trang trí' },
  { id: 'sticker', label: '🔤 Sticker' },
  { id: 'gift', label: '🎁 Quà' },
];
const DECO: { slot: CosmeticSlot; title: string }[] = [
  { slot: 'frame', title: 'Khung avatar' },
  { slot: 'nameFx', title: 'Hiệu ứng tên' },
  { slot: 'aura', title: 'Hào quang khi tới lượt' },
  { slot: 'entrance', title: 'Vào phòng' },
];

export function ShopSheet({ game, onClose, initialTab = 'skill' }: { game: Game; onClose: () => void; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [walletOpen, setWalletOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ frame?: string; nameFx?: string }>({});
  const feed = useFeed();
  const user = game.user;
  const { loadShop } = game;
  useEffect(() => {
    void loadShop();
  }, [loadShop]);

  if (walletOpen) return <WalletSheet game={game} onClose={() => setWalletOpen(false)} />;
  if (!user) {
    return (
      <Sheet title="Cửa hàng 🛍️" onClose={onClose}>
        <T style={styles.note}>Cần đăng nhập tài khoản để mua đồ bằng Ruby.</T>
      </Sheet>
    );
  }
  const ruby = user.ruby ?? 0;
  const owned = new Set(user.owned ?? []);
  const equipped = user.equipped ?? {};

  const buy = async (item: ShopItem) => {
    setBusy(item.id);
    setError(null);
    const err = await game.buyItem(item.id);
    setBusy(null);
    if (err) return setError(err);
    play('coin');
    feed(`Đã mua ${item.emoji} ${item.name}`, 'good');
  };
  const equip = async (slot: CosmeticSlot, id: string | null) => {
    setBusy(id ?? slot);
    setError(null);
    const err = await game.equipItem(slot, id);
    setBusy(null);
    if (err) setError(err);
    else {
      setPreview({});
      play('sparkle');
    }
  };

  /** nút mua: đủ Ruby thì "Mua", thiếu thì "Nạp thêm" mở ví */
  const buyButton = (item: ShopItem) =>
    ruby >= item.price ? (
      <Button testID={`buy-${item.id}`} small variant="gold" title={`Mua 💎${fmtRuby(item.price)}`} disabled={busy !== null} onPress={() => buy(item)} />
    ) : (
      <Button testID={`topup-${item.id}`} small variant="paper" title={`Thiếu ${fmtRuby(item.price - ruby)} · Nạp thêm`} onPress={() => setWalletOpen(true)} />
    );

  const row = (item: ShopItem, action: React.ReactNode, extra?: React.ReactNode) => (
    <View key={item.id} testID={`shop-item-${item.id}`} style={styles.item}>
      <T style={styles.itemEmoji}>{item.emoji}</T>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <T style={styles.itemName}>{item.name}</T>
        {item.desc ? <T style={styles.itemDesc}>{item.desc}</T> : null}
        {extra}
      </View>
      <View style={styles.itemAct}>
        <T style={styles.price}>💎 {fmtRuby(item.price)}</T>
        {action}
      </View>
    </View>
  );

  const frameNow = preview.frame ?? equipped.frame;
  const fxNow = preview.nameFx ?? equipped.nameFx;
  const section = (kind: ShopKind) => itemsOfKind(kind);

  return (
    <Sheet title="Cửa hàng 🛍️" onClose={onClose}>
      <View style={styles.balanceRow}>
        <T testID="shop-balance" style={styles.balance}>💎 {fmtRuby(ruby)}</T>
        <Button testID="shop-topup" small variant="gold" title="Nạp thêm" onPress={() => setWalletOpen(true)} />
      </View>
      <View style={styles.tabs}>
        {TABS.map((x) => (
          <Pressable key={x.id} testID={`shop-tab-${x.id}`} accessibilityRole="tab" accessibilityState={{ selected: tab === x.id }} onPress={() => setTab(x.id)} style={[styles.tab, tab === x.id && styles.tabOn]}>
            <T style={[styles.tabText, tab === x.id && { color: C.gold }]}>{x.label}</T>
          </Pressable>
        ))}
      </View>
      {error && <T testID="shop-error" style={styles.error}>{error}</T>}

      {tab === 'skill' && (
        <>
          <T style={styles.note}>
            Mỗi ngày bạn có {FREE_POKES_PER_DAY} lượt chọc miễn phí (đánh, ném, khịa, hối…), hết thì 1 Ruby / lần. Kỹ năng dưới đây trả Ruby mỗi lần dùng, chọn trong bảng chọc khi chạm vào avatar bạn bè. Chỉ để vui, không ảnh hưởng thắng thua.
          </T>
          {section('skill').map((it) => row(it, null))}
        </>
      )}

      {tab === 'deco' && (
        <>
          <View style={styles.preview}>
            <Portrait p={{ avatar: user.avatar, avatarUrl: user.avatarUrl }} size={72} frame={frameNow} />
            <NameText fx={fxNow} style={styles.previewName}>{user.displayName}</NameText>
          </View>
          <T style={styles.note}>Mua một lần, dùng mãi; mỗi ô trang bị một món. Bấm “Xem thử” để xem trước khung và tên.</T>
          {DECO.map(({ slot, title }) => (
            <View key={slot} style={{ gap: 8 }}>
              <T style={styles.sectionLabel}>{title}</T>
              {section(slot).map((it) => {
                const has = owned.has(it.id);
                const on = equipped[slot] === it.id;
                const tryable = slot === 'frame' || slot === 'nameFx';
                const action = has ? (
                  on ? (
                    <Button testID={`unequip-${it.id}`} small variant="paper" title="Gỡ" disabled={busy !== null} onPress={() => equip(slot, null)} />
                  ) : (
                    <Button testID={`equip-${it.id}`} small variant="jade" title="Trang bị" disabled={busy !== null} onPress={() => equip(slot, it.id)} />
                  )
                ) : (
                  <>
                    {tryable && <Button testID={`try-${it.id}`} small variant="paper" title="Xem thử" onPress={() => setPreview((p) => ({ ...p, [slot]: it.id }))} />}
                    {buyButton(it)}
                  </>
                );
                return row(it, action, has ? <T style={[styles.itemDesc, { color: C.jade, fontWeight: '800' }]}>{on ? '✔ Đang dùng' : 'Đã có'}</T> : undefined);
              })}
            </View>
          ))}
        </>
      )}

      {tab === 'sticker' && (
        <>
          <T style={styles.note}>Bộ “Chữ Lầy” 12 sticker chữ to viền đậm. Mua một lần, gửi trong khung trò chuyện.</T>
          <View style={styles.stickerGrid}>
            {CHU_LAY_STICKERS.map((s) => (
              <Image key={s.id} source={s.source} accessibilityLabel={s.alt} style={styles.stickerThumb} resizeMode="contain" />
            ))}
          </View>
          {itemsOfKind('sticker').map((it) => row(it, owned.has(it.id) ? <T testID="sticker-owned" style={styles.owned}>✔ Đã có</T> : buyButton(it)))}
        </>
      )}

      {tab === 'gift' && (
        <>
          <T style={styles.note}>
            Quà tặng trong phòng: chạm vào avatar bạn bè rồi chọn “Tặng quà”. Bạn trả Ruby, cả phòng thấy hiệu ứng, người nhận được điểm quà 💝 (không nhận Ruby).
          </T>
          {section('gift').map((it) => row(it, null))}
          <T style={styles.note}>Điểm quà của bạn: 💝 {fmtRuby(user.giftPoints ?? 0)}</T>
        </>
      )}
    </Sheet>
  );
}

// ---------- điểm danh ----------

export function CheckinSheet({ game, onClose, onChanged }: { game: Game; onClose: () => void; onChanged?: () => void }) {
  const [st, setSt] = useState<CheckinStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const { checkinStatus } = game;
  useEffect(() => {
    void checkinStatus().then((r) => (r.ok ? setSt(r.data) : setError(r.error)));
  }, [checkinStatus]);

  const claim = async () => {
    setBusy(true);
    setError(null);
    const r = await game.checkinClaim();
    if (r.ok) {
      play('cash');
      setWon(r.data.reward);
      const s = await checkinStatus();
      if (s.ok) setSt(s.data);
      onChanged?.();
    } else setError(r.error);
    setBusy(false);
  };

  const rewards = st?.rewards ?? CHECKIN_REWARDS;
  const done = st ? st.nextDay - 1 : 0;
  return (
    <Sheet title="Điểm danh hằng ngày 🎁" onClose={onClose}>
      {won !== null && <Confetti />}
      {won !== null && <T testID="checkin-won" style={styles.won}>+{won} 💎</T>}
      <T style={styles.note}>Vào mỗi ngày để nhận Ruby. Điểm danh liên tiếp 7 ngày nhận quà lớn; bỏ lỡ một ngày thì quay về ngày 1.</T>
      <View style={styles.days}>
        {rewards.map((r, i) => {
          const day = i + 1;
          const isDone = day <= done;
          const today = !!st?.canClaim && day === st.nextDay;
          return (
            <View key={day} testID={`checkin-day-${day}`} style={[styles.day, isDone && styles.dayDone, today && styles.dayToday, day === 7 && styles.dayBig]}>
              <T style={styles.dayNum}>Ngày {day}</T>
              <T style={styles.dayEmoji}>{isDone ? '✅' : day === 7 ? '🎁' : '💎'}</T>
              <T style={styles.dayReward}>+{r}</T>
            </View>
          );
        })}
      </View>
      {error && <T testID="checkin-error" style={styles.error}>{error}</T>}
      {st && (st.canClaim ? (
        <Button testID="checkin-claim" title={busy ? 'Đang nhận…' : `Nhận +${st.nextReward} 💎`} disabled={busy} onPress={claim} />
      ) : (
        <T testID="checkin-done" style={styles.note}>Hôm nay bạn đã điểm danh rồi. Ngày mai nhận +{st.nextReward} 💎 nhé!</T>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: C.muted, lineHeight: 18 },
  error: { color: C.ink, backgroundColor: '#FFD6D6', padding: 8, borderRadius: 10, fontWeight: '700', overflow: 'hidden' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  balance: { fontSize: 22, fontWeight: '900', color: C.son },
  tabs: { flexDirection: 'row', backgroundColor: C.mist, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  tabOn: { backgroundColor: C.ink },
  tabText: { fontWeight: '800', fontSize: 12, textAlign: 'center' },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: C.muted },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.mist, borderRadius: 14, padding: 10 },
  itemEmoji: { fontSize: 30 },
  itemName: { fontSize: 15, fontWeight: '800' },
  itemDesc: { fontSize: 12, color: C.muted, lineHeight: 15 },
  itemAct: { alignItems: 'flex-end', gap: 4, maxWidth: 170 },
  price: { fontSize: 13, fontWeight: '900', color: C.son },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 16, backgroundColor: C.ink, borderRadius: 14, padding: 14 },
  previewName: { fontSize: 18, fontWeight: '800', color: C.gold, flexShrink: 1 },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  stickerThumb: { width: 76, height: 58 },
  owned: { fontSize: 13, fontWeight: '800', color: C.jade },
  won: { fontSize: 34, fontWeight: '900', color: C.son, textAlign: 'center' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  day: { width: '23%', minWidth: 68, alignItems: 'center', backgroundColor: C.mist, borderRadius: 12, paddingVertical: 8, borderWidth: 2, borderColor: 'transparent' },
  dayDone: { opacity: 0.6 },
  dayToday: { borderColor: C.gold, backgroundColor: '#FFF3C4', transform: [{ scale: 1.06 }] },
  dayBig: { width: '48%' },
  dayNum: { fontSize: 11, fontWeight: '800', color: C.muted },
  dayEmoji: { fontSize: 24 },
  dayReward: { fontSize: 14, fontWeight: '900', color: C.son },
});
