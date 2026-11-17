import { Image } from './Image';
/**
 * Cửa hàng Ruby (kỹ năng chọc, 8 ô trang trí VIP, sticker, quà đại gia) & điểm danh 7 ngày.
 * Vector icons Fluent Emoji Flat + gradient VIP cards.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  CHECKIN_REWARDS, FREE_POKES_PER_DAY, VIP_TIERS, itemsOfKind, prestigePoints, vipOf,
  type CheckinStatus, type CosmeticSlot, type ShopItem, type ShopKind,
} from '../../../shared/src/shop';
import { themeById } from '../../../shared/src/themes';
import type { Game } from '../useGame';
import { CHU_LAY_STICKERS } from '../stickers';
import { play } from '../sound';
import { C, GRADS } from '../theme';
import { Button, T, useFeed } from '../ui';
import { Sheet } from './Sheet';
import { WalletSheet, fmtRuby } from './Wallet';
import { Confetti } from './Fun';
import { NameText, TitleBadge, VipBadge, chatBubbleStyleOf, chatBubbleTextColorOf } from './Cosmetics';
import { Portrait } from './Avatar';
import { EmojiIcon, RubyIcon, UiIcon } from './Icons';

type Tab = 'skill' | 'deco' | 'sticker' | 'gift';
const TABS: { id: Tab; emoji: string; label: string }[] = [
  { id: 'skill', emoji: '⚡', label: 'Kỹ năng' },
  { id: 'deco', emoji: '🖼️', label: 'Trang trí' },
  { id: 'sticker', emoji: '🔤', label: 'Sticker' },
  { id: 'gift', emoji: '🎁', label: 'Quà' },
];
const DECO: { slot: CosmeticSlot; title: string; short: string }[] = [
  { slot: 'frame', title: '👑 Khung avatar', short: 'Khung' },
  { slot: 'nameFx', title: '✨ Hiệu ứng tên', short: 'Tên' },
  { slot: 'aura', title: '🌟 Hào quang tới lượt', short: 'Hào quang' },
  { slot: 'pet', title: '🐾 Thú cưng kề vai', short: 'Thú cưng' },
  { slot: 'title', title: '🎖️ Danh hiệu Phú Hào', short: 'Danh hiệu' },
  { slot: 'chatBubble', title: '💬 Bong bóng chat VIP', short: 'Chat' },
  { slot: 'entrance', title: '🚪 Hiệu ứng vào phòng', short: 'Vào phòng' },
  { slot: 'roomTheme', title: '🗺️ Map & Chủ đề phòng', short: 'Map' },
];

export function ShopSheet({ game, onClose, initialTab = 'skill' }: { game: Game; onClose: () => void; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [decoFilter, setDecoFilter] = useState<'all' | CosmeticSlot>('all');
  const [walletOpen, setWalletOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Partial<Record<CosmeticSlot, string>>>({});
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

  const pts = prestigePoints(user.rubySpent, user.owned);
  const vip = vipOf(pts);
  const nextVip = VIP_TIERS.find((t) => t.tier === vip.tier + 1) ?? null;
  const vipPct = nextVip
    ? Math.max(0.04, Math.min(1, (pts - vip.minPoints) / Math.max(1, nextVip.minPoints - vip.minPoints)))
    : 1;

  const buy = async (item: ShopItem) => {
    setBusy(item.id);
    setError(null);
    const err = await game.buyItem(item.id);
    setBusy(null);
    if (err) return setError(err);
    play('coin');
    feed(`Đã mua ${item.name}`, 'good');
  };
  const equip = async (slot: CosmeticSlot, id: string | null) => {
    setBusy(id ?? slot);
    setError(null);
    const err = await game.equipItem(slot, id);
    setBusy(null);
    if (err) setError(err);
    else {
      setPreview((prev) => ({ ...prev, [slot]: undefined }));
      play('sparkle');
    }
  };

  const buyButton = (item: ShopItem) =>
    ruby >= item.price ? (
      <Button testID={`buy-${item.id}`} small variant="gold" title={`Mua 💎${fmtRuby(item.price)}`} disabled={busy !== null} onPress={() => buy(item)} />
    ) : (
      <Button testID={`topup-${item.id}`} small variant="paper" title={`Thiếu ${fmtRuby(item.price - ruby)} · Nạp thêm`} onPress={() => setWalletOpen(true)} />
    );

  const row = (item: ShopItem, action: ReactNode, extra?: ReactNode) => (
    <View key={item.id} testID={`shop-item-${item.id}`} style={[styles.item, item.price >= 1000 && styles.itemVip]}>
      <View style={[styles.itemIconWrap, item.price >= 1000 && styles.itemIconVip]}>
        <EmojiIcon emoji={item.emoji} size={28} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T style={styles.itemName}>{item.name}</T>
        {item.desc ? <T style={styles.itemDesc}>{item.desc}</T> : null}
        {extra}
      </View>
      <View style={styles.itemAct}>
        <View style={styles.pricePill}>
          <RubyIcon size={13} />
          <T style={styles.price}>{fmtRuby(item.price)}</T>
        </View>
        {action}
      </View>
    </View>
  );

  const frameNow = preview.frame ?? equipped.frame;
  const fxNow = preview.nameFx ?? equipped.nameFx;
  const auraNow = preview.aura ?? equipped.aura;
  const petNow = preview.pet ?? equipped.pet;
  const titleNow = preview.title ?? equipped.title;
  const bubbleNow = preview.chatBubble ?? equipped.chatBubble;
  const themeNow = themeById(preview.roomTheme ?? equipped.roomTheme);
  const bStyle = chatBubbleStyleOf(bubbleNow);
  const bColor = chatBubbleTextColorOf(bubbleNow);

  const section = (kind: ShopKind) => itemsOfKind(kind);
  const visibleDeco = decoFilter === 'all' ? DECO : DECO.filter((d) => d.slot === decoFilter);

  return (
    <Sheet title="Cửa hàng Phú Hào 🛍️" onClose={onClose}>
      <View style={styles.balanceRow}>
        <View style={styles.rubyInline}>
          <RubyIcon size={22} />
          <T testID="shop-balance" style={styles.balance}>{fmtRuby(ruby)}</T>
        </View>
        <Button testID="shop-topup" small variant="gold" iconNode={<UiIcon name="Plus" size={14} color="#271400" />} title="Nạp thêm" onPress={() => setWalletOpen(true)} />
      </View>

      {/* Thanh Đẳng Cấp VIP Prestige */}
      <LinearGradient colors={[...GRADS.vipDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} testID="vip-progress-card" style={styles.vipCard}>
        <View style={styles.vipTop}>
          <VipBadge tier={vip.tier} />
          <T style={styles.vipTitle}>{vip.tier > 0 ? vip.name : 'Chưa vào bảng VIP'}</T>
          <T style={styles.vipPts}>{fmtRuby(pts)} điểm</T>
        </View>
        <View style={styles.vipTrack}>
          <View style={[styles.vipFill, { width: `${vipPct * 100}%`, backgroundColor: vip.color }]} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {nextVip ? (
            <>
              <T style={styles.vipSub}>Còn</T>
              <RubyIcon size={12} />
              <T style={styles.vipSub}>{fmtRuby(Math.max(0, nextVip.minPoints - pts))} nữa lên</T>
              <EmojiIcon emoji={nextVip.badge} size={13} />
              <T style={styles.vipSub}>{nextVip.name}!</T>
            </>
          ) : (
            <>
              <EmojiIcon emoji="🔱" size={14} />
              <T style={styles.vipSub}>Đã chạm đỉnh Thiên Đế Chí Tôn (VIP Tối Thượng)!</T>
            </>
          )}
        </View>
      </LinearGradient>

      <View style={styles.tabs}>
        {TABS.map((x) => {
          const on = tab === x.id;
          return (
            <Pressable key={x.id} testID={`shop-tab-${x.id}`} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(x.id)} style={[styles.tab, on && styles.tabOn]}>
              <EmojiIcon emoji={x.emoji} size={15} />
              <T style={[styles.tabText, on && { color: C.gold }]}>{x.label}</T>
            </Pressable>
          );
        })}
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
          {/* Sân Khấu Xem Thử Trực Tiếp 8 Ô + Map */}
          <View testID="shop-live-stage" style={[styles.preview, { backgroundColor: themeNow.bg, borderColor: themeNow.accent }]}>
            <Portrait
              p={{ avatar: user.avatar, avatarUrl: user.avatarUrl }}
              size={70}
              frame={frameNow}
              aura={auraNow}
              pet={petNow}
              active={true}
            />
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {vip.tier > 0 && <VipBadge tier={vip.tier} compact />}
                <NameText fx={fxNow} style={[styles.previewName, { color: themeNow.accent }]}>{user.displayName}</NameText>
              </View>
              {titleNow && <TitleBadge title={titleNow} />}
              <View style={[styles.previewBubble, bStyle]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <EmojiIcon emoji={themeNow.emoji} size={14} />
                  <T style={[{ fontSize: 12, fontWeight: '800', color: C.ink }, bColor ? { color: bColor } : null]}>
                    {themeNow.name}
                  </T>
                </View>
              </View>
            </View>
            {Object.values(preview).some(Boolean) && (
              <Button testID="preview-reset" small variant="paper" iconNode={<UiIcon name="RotateCcw" size={14} color={C.ink} />} title="Đặt lại" onPress={() => setPreview({})} />
            )}
          </View>

          <T style={styles.note}>Mua một lần, dùng mãi · 8 ô trang bị riêng biệt + tích điểm VIP Phú Hào!</T>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.filterRow}>
            <Pressable
              testID="deco-filter-all"
              onPress={() => setDecoFilter('all')}
              style={[styles.filterPill, decoFilter === 'all' && styles.filterOn]}
            >
              <T style={[styles.filterTxt, decoFilter === 'all' && { color: C.gold }]}>Tất cả (8)</T>
            </Pressable>
            {DECO.map((d) => (
              <Pressable
                key={d.slot}
                testID={`deco-filter-${d.slot}`}
                onPress={() => setDecoFilter(d.slot)}
                style={[styles.filterPill, decoFilter === d.slot && styles.filterOn]}
              >
                <T style={[styles.filterTxt, decoFilter === d.slot && { color: C.gold }]}>{d.short}</T>
              </Pressable>
            ))}
          </ScrollView>

          {visibleDeco.map(({ slot, title }) => {
            const parts = title.split(' ');
            const slotEmoji = parts[0];
            const slotLabel = parts.slice(1).join(' ');
            return (
              <View key={slot} style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <EmojiIcon emoji={slotEmoji} size={18} />
                  <T style={styles.sectionLabel}>{slotLabel}</T>
                </View>
                {section(slot).map((it) => {
                  const has = owned.has(it.id);
                  const on = equipped[slot] === it.id;
                  const action = has ? (
                    on ? (
                      <Button testID={`unequip-${it.id}`} small variant="paper" title="Gỡ" disabled={busy !== null} onPress={() => equip(slot, null)} />
                    ) : (
                      <Button testID={`equip-${it.id}`} small variant="jade" title="Trang bị" disabled={busy !== null} onPress={() => equip(slot, it.id)} />
                    )
                  ) : (
                    <>
                      <Button
                        testID={`try-${it.id}`}
                        small
                        variant="paper"
                        title={preview[slot] === it.id ? 'Đang thử' : 'Xem thử'}
                        onPress={() => setPreview((p) => ({ ...p, [slot]: p[slot] === it.id ? undefined : it.id }))}
                      />
                      {buyButton(it)}
                    </>
                  );
                  return row(
                    it,
                    action,
                    has ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <UiIcon name="CheckCircle2" size={13} color={C.jadeDeep} />
                        <T style={[styles.itemDesc, { color: C.jadeDeep, fontWeight: '800' }]}>{on ? 'Đang dùng' : 'Đã có'}</T>
                      </View>
                    ) : undefined,
                  );
                })}
              </View>
            );
          })}
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
          {itemsOfKind('sticker').map((it) => row(
            it,
            owned.has(it.id) ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <UiIcon name="CheckCircle2" size={14} color={C.jadeDeep} />
                <T testID="sticker-owned" style={styles.owned}>Đã có</T>
              </View>
            ) : buyButton(it),
          ))}
        </>
      )}

      {tab === 'gift' && (
        <>
          <T style={styles.note}>
            Quà tặng trong phòng: chạm vào avatar bạn bè rồi chọn “Tặng quà”. Bạn trả Ruby, cả phòng thấy siêu hiệu ứng, người nhận được điểm quà và bạn tăng cấp VIP!
          </T>
          {section('gift').map((it) => row(it, null))}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <EmojiIcon emoji="💝" size={15} />
            <T style={styles.note}>Điểm quà của bạn: {fmtRuby(user.giftPoints ?? 0)}</T>
          </View>
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
      {won !== null && (
        <View style={[styles.rubyInline, { justifyContent: 'center' }]}>
          <T testID="checkin-won" style={styles.won}>+{won}</T>
          <RubyIcon size={28} />
        </View>
      )}
      <T style={styles.note}>Vào mỗi ngày để nhận Ruby. Điểm danh liên tiếp 7 ngày nhận quà lớn; bỏ lỡ một ngày thì quay về ngày 1.</T>
      <View style={styles.days}>
        {rewards.map((r, i) => {
          const day = i + 1;
          const isDone = day <= done;
          const today = !!st?.canClaim && day === st.nextDay;
          return (
            <View key={day} testID={`checkin-day-${day}`} style={[styles.day, isDone && styles.dayDone, today && styles.dayToday, day === 7 && styles.dayBig]}>
              <T style={styles.dayNum}>Ngày {day}</T>
              <View style={{ height: 28, justifyContent: 'center', alignItems: 'center' }}>
                {isDone ? (
                  <UiIcon name="CheckCircle2" size={24} color={C.jadeDeep} />
                ) : day === 7 ? (
                  <EmojiIcon emoji="🎁" size={24} />
                ) : (
                  <RubyIcon size={22} />
                )}
              </View>
              <T style={styles.dayReward}>+{r}</T>
            </View>
          );
        })}
      </View>
      {error && <T testID="checkin-error" style={styles.error}>{error}</T>}
      {st && (st.canClaim ? (
        <Button testID="checkin-claim" title={busy ? 'Đang nhận…' : `Nhận +${st.nextReward} 💎`} disabled={busy} onPress={claim} />
      ) : (
        <T testID="checkin-done" style={styles.note}>Hôm nay bạn đã điểm danh rồi. Ngày mai nhận +{st.nextReward} Ruby nhé!</T>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: C.muted, lineHeight: 18 },
  error: { color: '#FFFFFF', backgroundColor: C.danger, padding: 8, borderRadius: 10, fontWeight: '700', overflow: 'hidden' },
  balanceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'space-between',
    backgroundColor: C.mist, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 16,
  },
  rubyInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balance: { fontSize: 22, fontWeight: '900', color: C.son },
  vipCard: { borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,197,61,0.55)', padding: 12, gap: 7 },
  vipTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vipTitle: { color: '#FEF08A', fontWeight: '900', fontSize: 13, flex: 1 },
  vipPts: { color: '#CBD5E1', fontWeight: '800', fontSize: 11 },
  vipTrack: { height: 7, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.16)', overflow: 'hidden' },
  vipFill: { height: '100%', borderRadius: 99 },
  vipSub: { color: '#E2E8F0', fontSize: 11, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: C.mist, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, minHeight: 40, borderRadius: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4 },
  tabOn: { backgroundColor: C.ink },
  tabText: { fontWeight: '800', fontSize: 12, textAlign: 'center', color: C.ink },
  filterRow: { gap: 6, paddingVertical: 2 },
  filterPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: C.mist, borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.1)' },
  filterOn: { backgroundColor: C.ink, borderColor: C.ink },
  filterTxt: { fontSize: 12, fontWeight: '800', color: C.ink },
  sectionLabel: { fontSize: 14, fontWeight: '900', color: C.ink },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.mist, borderRadius: 16, padding: 10 },
  itemVip: { backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#F59E0B' },
  itemIconWrap: {
    width: 46, height: 46, borderRadius: 14, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: 'rgba(15,23,42,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  itemIconVip: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  itemName: { fontSize: 15, fontWeight: '800', color: C.ink },
  itemDesc: { fontSize: 12, color: C.muted, lineHeight: 15 },
  itemAct: { alignItems: 'flex-end', gap: 4, maxWidth: 175 },
  pricePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontSize: 13, fontWeight: '900', color: C.son },
  preview: {
    flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 18,
    borderWidth: 2, padding: 14, overflow: 'visible',
  },
  previewName: { fontSize: 18, fontWeight: '900', flexShrink: 1 },
  previewBubble: {
    alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, backgroundColor: '#FFFDF8', borderWidth: 1.5, borderColor: 'rgba(15,23,42,0.16)',
  },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  stickerThumb: { width: 76, height: 58 },
  owned: { fontSize: 13, fontWeight: '800', color: C.jadeDeep },
  won: { fontSize: 34, fontWeight: '900', color: C.son, textAlign: 'center' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  day: { width: '22.5%', minWidth: 68, alignItems: 'center', backgroundColor: C.mist, borderRadius: 14, paddingVertical: 9, borderWidth: 1.5, borderColor: 'transparent', gap: 2 },
  dayDone: { opacity: 0.65 },
  dayToday: { borderColor: C.gold, backgroundColor: '#FEF9C3', transform: [{ scale: 1.05 }] },
  dayBig: { width: '48%' },
  dayNum: { fontSize: 11, fontWeight: '800', color: C.muted },
  dayReward: { fontSize: 14, fontWeight: '900', color: C.son },
});
