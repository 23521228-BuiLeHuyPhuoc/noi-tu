import { Image } from './Image';
/**
 * Cửa hàng Ruby (kỹ năng chọc lố lăng, 8 ô trang trí VIP Đại Gia, sticker, siêu quà) & điểm danh 7 ngày.
 * - Tích hợp **Sân Khấu Xem Thử Ghim Đỉnh Màn Hình (`ShopPreviewDock`)**:
 *   + Trong `ShopSheet`: ghim cứng bên ngoài `<ScrollView>` (`Sheet.stickyTop`).
 *   + Trong Fragment `Phú Hào` ở Trang chủ Mobile: ghim `position: sticky; top: 6px` ngay trên cùng.
 *   -> Người dùng cuộn xuống tận món đồ cuối cùng bấm Mua / Trang bị / Xem thử vẫn thấy ngay sự thay đổi trực tiếp trên đỉnh màn hình mà không phải cuộn ngược lên!
 */
import { useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  CHECKIN_REWARDS,
  FREE_POKES_PER_DAY,
  VIP_TIERS,
  itemsOfKind,
  prestigePoints,
  vipOf,
  type CheckinStatus,
  type CosmeticSlot,
  type ShopItem,
  type ShopKind,
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
import {
  NameText,
  TitleBadge,
  VipBadge,
  chatBubbleStyleOf,
  chatBubbleTextColorOf,
} from './Cosmetics';
import { Portrait } from './Avatar';
import { EmojiIcon, RubyIcon, UiIcon } from './Icons';

export type ShopTabId = 'skill' | 'deco' | 'sticker' | 'gift';

export type ShopPreviewState = Partial<Record<CosmeticSlot, string>>;

export interface ShopSpotlight {
  emoji: string;
  label: string;
}

const TABS: { id: ShopTabId; emoji: string; label: string }[] = [
  { id: 'deco', emoji: '👑', label: 'Hóa Trang VIP' },
  { id: 'skill', emoji: '⚡', label: 'Chiêu Lầy' },
  { id: 'gift', emoji: '🎁', label: 'Siêu Quà' },
  { id: 'sticker', emoji: '🔤', label: 'Sticker' },
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

function defaultGuestPreview(hasUser: boolean): ShopPreviewState {
  if (hasUser) return {};
  return {
    frame: 'frame_emperor_omega',
    nameFx: 'name_omega_emperor',
    aura: 'aura_omega_divine',
    pet: 'pet_celestial_qilin',
    title: 'title_thien_de',
    chatBubble: 'bubble_emperor_jade',
    roomTheme: 'map_hoang_kim_dien',
  };
}

/**
 * Sân Khấu Xem Thử Ghim Trên Cùng (`shop-live-stage`):
 * Hiển thị Avatar + 8 ô phụ kiện + Map nền + Số dư Ruby theo thời gian thực ngay đỉnh màn hình!
 */
export function ShopPreviewDock({
  game,
  preview,
  setPreview,
  spotlight,
  setSpotlight,
  stickyCss = false,
  onOpenWallet,
}: {
  game: Game;
  preview: ShopPreviewState;
  setPreview: Dispatch<SetStateAction<ShopPreviewState>>;
  spotlight: ShopSpotlight | null;
  setSpotlight: Dispatch<SetStateAction<ShopSpotlight | null>>;
  stickyCss?: boolean;
  onOpenWallet?: () => void;
}) {
  const [compact, setCompact] = useState(false);
  const user = game.user;
  const equipped = user?.equipped ?? {};
  const pts = user ? prestigePoints(user.rubySpent, user.owned) : 0;
  const vip = vipOf(pts);

  const frameNow = preview.frame ?? equipped.frame;
  const fxNow = preview.nameFx ?? equipped.nameFx;
  const auraNow = preview.aura ?? equipped.aura;
  const petNow = preview.pet ?? equipped.pet;
  const titleNow = preview.title ?? equipped.title;
  const bubbleNow = preview.chatBubble ?? equipped.chatBubble;
  const entranceNow = preview.entrance ?? equipped.entrance;
  const themeNow = themeById(preview.roomTheme ?? equipped.roomTheme);
  const bStyle = chatBubbleStyleOf(bubbleNow);
  const bColor = chatBubbleTextColorOf(bubbleNow);

  const hasPreview = Object.values(preview).some(Boolean) || spotlight !== null;

  return (
    <View
      testID="shop-live-stage"
      style={[
        styles.dockOuter,
        { backgroundColor: themeNow.bg, borderColor: themeNow.accent },
        compact && styles.dockOuterCompact,
        stickyCss && Platform.OS === 'web'
          ? ({
              position: 'sticky',
              top: 6,
              zIndex: 55,
              boxShadow: '0 10px 28px rgba(15, 23, 42, 0.36)',
            } as object)
          : null,
      ]}
    >
      <View style={styles.dockTopMeta}>
        <View style={styles.dockPinPill}>
          <UiIcon name="Sparkles" size={11} color="#FDE047" />
          <T style={styles.dockPinTxt}>
            {spotlight
              ? spotlight.label
              : hasPreview
                ? 'SÂN KHẤU XEM THỬ TRỰC TIẾP'
                : 'DIỆN MẠO ĐANG TRANG BỊ'}
          </T>
        </View>

        <View style={styles.dockTopActions}>
          {user && (
            <Pressable
              onPress={() => onOpenWallet?.()}
              style={styles.dockRubyChip}
              accessibilityRole="button"
              accessibilityLabel="Số dư Ruby"
            >
              <RubyIcon size={13} />
              <T style={styles.dockRubyTxt}>{fmtRuby(user.ruby)}</T>
            </Pressable>
          )}
          {hasPreview && (
            <Pressable
              testID="preview-reset"
              onPress={() => {
                play('pop');
                setPreview({});
                setSpotlight(null);
              }}
              style={styles.dockResetBtn}
              accessibilityRole="button"
            >
              <UiIcon name="RotateCcw" size={11} color="#1E293B" />
              <T style={styles.dockResetTxt}>Gốc</T>
            </Pressable>
          )}
          <Pressable
            testID="shop-dock-collapse"
            onPress={() => setCompact((c) => !c)}
            style={styles.dockCollapseBtn}
            accessibilityRole="button"
            accessibilityLabel={compact ? 'Mở rộng sân khấu' : 'Thu gọn sân khấu'}
          >
            <UiIcon name={compact ? 'ChevronDown' : 'ChevronUp'} size={14} color="#F8FAFC" />
          </Pressable>
        </View>
      </View>

      <View style={styles.dockMainRow}>
        <Portrait
          p={{
            avatar: user?.avatar ?? game.guest.avatar ?? 0,
            avatarUrl: user?.avatarUrl ?? game.guest.avatarUrl,
          }}
          size={compact ? 44 : 62}
          frame={frameNow}
          aura={auraNow}
          pet={petNow}
          active={true}
        />

        <View style={{ flex: 1, minWidth: 0, gap: compact ? 2 : 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {(user ? vip.tier > 0 : true) && <VipBadge tier={user ? vip.tier : 6} compact />}
            <NameText
              fx={fxNow}
              style={[
                styles.previewName,
                compact && { fontSize: 15 },
                { color: themeNow.accent },
              ]}
            >
              {user?.displayName ?? 'Đại Gia Xóm Lầy'}
            </NameText>
          </View>

          {!compact && titleNow && (
            <View style={{ alignSelf: 'flex-start', maxWidth: '100%' }}>
              <TitleBadge title={titleNow} />
            </View>
          )}

          <View style={[styles.previewBubble, compact && { paddingVertical: 3 }, bStyle]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
              <EmojiIcon emoji={spotlight ? spotlight.emoji : themeNow.emoji} size={14} />
              <T
                numberOfLines={1}
                style={[
                  { fontSize: 11.5, fontWeight: '800', color: C.ink },
                  bColor ? { color: bColor } : null,
                ]}
              >
                {spotlight
                  ? spotlight.label
                  : entranceNow
                    ? `${themeNow.name} · Vào phòng VIP`
                    : themeNow.name}
              </T>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function ShopBody({
  game,
  initialTab = 'skill',
  onRequestAuth,
  onOpenWallet,
  externalDock = false,
  previewState,
  setPreviewState,
  spotlightState,
  setSpotlightState,
}: {
  game: Game;
  initialTab?: ShopTabId;
  onRequestAuth?: () => void;
  onOpenWallet?: () => void;
  externalDock?: boolean;
  previewState?: ShopPreviewState;
  setPreviewState?: Dispatch<SetStateAction<ShopPreviewState>>;
  spotlightState?: ShopSpotlight | null;
  setSpotlightState?: Dispatch<SetStateAction<ShopSpotlight | null>>;
}) {
  const [tab, setTab] = useState<ShopTabId>(initialTab);
  const [decoFilter, setDecoFilter] = useState<'all' | CosmeticSlot>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [internalPreview, setInternalPreview] = useState<ShopPreviewState>(() =>
    defaultGuestPreview(!!game.user),
  );
  const [internalSpotlight, setInternalSpotlight] = useState<ShopSpotlight | null>(null);

  const preview = previewState ?? internalPreview;
  const setPreview = setPreviewState ?? setInternalPreview;
  const spotlight = spotlightState !== undefined ? spotlightState : internalSpotlight;
  const setSpotlight = setSpotlightState ?? setInternalSpotlight;

  const feed = useFeed();
  const user = game.user;
  const userId = user?.id;
  const { loadShop } = game;

  useEffect(() => {
    if (userId) void loadShop();
  }, [loadShop, userId]);

  const ruby = user?.ruby ?? 0;
  const owned = new Set(user?.owned ?? []);
  const equipped = user?.equipped ?? {};

  const pts = user ? prestigePoints(user.rubySpent, user.owned) : 0;
  const vip = vipOf(pts);
  const nextVip = VIP_TIERS.find((t) => t.tier === vip.tier + 1) ?? null;
  const vipPct = nextVip
    ? Math.max(0.05, Math.min(1, (pts - vip.minPoints) / Math.max(1, nextVip.minPoints - vip.minPoints)))
    : 1;

  const isDecoSlot = (k: ShopKind): k is CosmeticSlot =>
    k !== 'skill' && k !== 'sticker' && k !== 'gift';

  const buy = async (item: ShopItem) => {
    if (!user) {
      onRequestAuth?.();
      return;
    }
    setBusy(item.id);
    setError(null);
    const err = await game.buyItem(item.id);
    setBusy(null);
    if (err) return setError(err);
    play('coin');
    // Hiển thị xem trước ngay trên Dock ghim đỉnh màn hình, bấm "Trang bị" là mặc luôn không cần cuộn lên!
    if (isDecoSlot(item.kind)) {
      setPreview((prev) => ({ ...prev, [item.kind]: item.id }));
      setSpotlight({ emoji: item.emoji, label: `Đã mua: ${item.name} · Bấm Trang bị để mặc!` });
    } else {
      setSpotlight({ emoji: item.emoji, label: `Đã sở hữu: ${item.name}!` });
    }
    feed(`🎉 Đã tậu siêu phẩm ${item.name}!`, 'good');
  };

  const equip = async (slot: CosmeticSlot, id: string | null, item?: ShopItem) => {
    if (!user) return;
    setBusy(id ?? slot);
    setError(null);
    const err = await game.equipItem(slot, id);
    setBusy(null);
    if (err) setError(err);
    else {
      setPreview((prev) => ({ ...prev, [slot]: undefined }));
      setSpotlight(
        id && item
          ? { emoji: item.emoji, label: `Đang mặc: ${item.name}` }
          : { emoji: '✨', label: 'Đã gỡ phụ kiện về mặc định' },
      );
      play('sparkle');
    }
  };

  const buyButton = (item: ShopItem) => {
    if (!user) {
      return (
        <Button
          testID={`guest-buy-${item.id}`}
          small
          variant="gold"
          title={`Đăng ký mua 💎${fmtRuby(item.price)}`}
          onPress={() => onRequestAuth?.()}
        />
      );
    }
    return ruby >= item.price ? (
      <Button
        testID={`buy-${item.id}`}
        small
        variant="gold"
        title={`Mua 💎${fmtRuby(item.price)}`}
        disabled={busy !== null}
        onPress={() => void buy(item)}
      />
    ) : (
      <Button
        testID={`topup-${item.id}`}
        small
        variant="paper"
        title={`Thiếu ${fmtRuby(item.price - ruby)} · Nạp thêm`}
        onPress={() => onOpenWallet?.()}
      />
    );
  };

  const row = (item: ShopItem, action: ReactNode, extra?: ReactNode) => {
    const isMythic = item.price >= 2000;
    const isVip = item.price >= 800 && !isMythic;
    return (
      <View
        key={item.id}
        testID={`shop-item-${item.id}`}
        // @ts-expect-error RN-Web class hook cho content-visibility: auto (tắt layout offscreen 146 món đồ)
        dataSet={{ class: 'xl-shop-row' }}
        style={[
          styles.item,
          isVip && styles.itemVip,
          isMythic && styles.itemMythic,
        ]}
      >
        <View style={[styles.itemIconWrap, isVip && styles.itemIconVip, isMythic && styles.itemIconMythic]}>
          <EmojiIcon emoji={item.emoji} size={30} glow={isMythic} />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <T style={[styles.itemName, isMythic && { color: '#FEF08A' }]}>{item.name}</T>
            {isMythic && (
              <View style={styles.mythicTag}>
                <T style={styles.mythicTagTxt}>🔱 THẦN THOẠI</T>
              </View>
            )}
            {isVip && (
              <View style={styles.vipTag}>
                <T style={styles.vipTagTxt}>👑 ĐẠI GIA</T>
              </View>
            )}
          </View>
          {item.desc ? <T style={[styles.itemDesc, isMythic && { color: '#E9D5FF' }]}>{item.desc}</T> : null}
          {extra}
        </View>
        <View style={styles.itemAct}>
          <View style={styles.pricePill}>
            <RubyIcon size={13} />
            <T style={[styles.price, isMythic && { color: '#FDE047' }]}>{fmtRuby(item.price)}</T>
          </View>
          {action}
        </View>
      </View>
    );
  };

  const section = (kind: ShopKind) => itemsOfKind(kind);
  const visibleDeco = decoFilter === 'all' ? DECO : DECO.filter((d) => d.slot === decoFilter);

  return (
    <View style={{ gap: 10 }}>
      {/* DOCK XEM THỬ GHIM TRÊN CÙNG KHI NHÚNG TRONG TRANG CHỦ MOBILE */}
      {!externalDock && (
        <ShopPreviewDock
          game={game}
          preview={preview}
          setPreview={setPreview}
          spotlight={spotlight}
          setSpotlight={setSpotlight}
          stickyCss={true}
          onOpenWallet={onOpenWallet}
        />
      )}

      {user ? (
        <View style={styles.balanceRow}>
          <View style={styles.rubyInline}>
            <RubyIcon size={22} />
            <T testID="shop-balance" style={styles.balance}>{fmtRuby(ruby)}</T>
          </View>
          <Button
            testID="shop-topup"
            small
            variant="gold"
            iconNode={<UiIcon name="Plus" size={14} color="#271400" />}
            title="Nạp thêm Ruby"
            onPress={() => onOpenWallet?.()}
          />
        </View>
      ) : (
        <LinearGradient colors={['#4C1D95', '#831843', '#B45309']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.guestWhaleBanner}>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={{ color: '#FEF08A', fontWeight: '900', fontSize: 15 }}>💎 ĐẶC QUYỀN ĐẠI GIA XÓM LẦY</T>
            <T style={{ color: '#F8FAFC', fontSize: 12, fontWeight: '700' }}>
              Thử miễn phí mọi Khung 3 Vòng, Hào Quang Cầu Vồng, Màn Hình Xanh BSOD & Quà Ngai Vàng 10.000💎 ngay trên thanh Dock phía trên!
            </T>
          </View>
          <Button small variant="gold" title="Đăng ký ngay" onPress={() => onRequestAuth?.()} />
        </LinearGradient>
      )}

      {/* Thanh Đẳng Cấp VIP Prestige */}
      <LinearGradient colors={[...GRADS.vipDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} testID="vip-progress-card" style={styles.vipCard}>
        <View style={styles.vipTop}>
          <VipBadge tier={user ? vip.tier : 6} />
          <T style={styles.vipTitle}>
            {user ? (vip.tier > 0 ? vip.name : 'Chưa vào bảng VIP Phú Hào') : 'Xem trước cấp Chí Tôn Vũ Trụ (VIP 6)'}
          </T>
          <T style={styles.vipPts}>{fmtRuby(pts)} điểm</T>
        </View>
        <View style={styles.vipTrack}>
          <View style={[styles.vipFill, { width: `${(user ? vipPct : 1) * 100}%`, backgroundColor: user ? vip.color : '#F472B6' }]} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          {nextVip ? (
            <>
              <T style={styles.vipSub}>Còn</T>
              <RubyIcon size={12} />
              <T style={styles.vipSub}>{fmtRuby(Math.max(0, nextVip.minPoints - pts))} nữa thăng cấp</T>
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
            <Pressable
              key={x.id}
              testID={`shop-tab-${x.id}`}
              accessibilityRole="tab"
              accessibilityState={{ selected: on }}
              onPress={() => setTab(x.id)}
              style={[styles.tab, on && styles.tabOn]}
            >
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
            Mỗi ngày có {FREE_POKES_PER_DAY} lượt chọc cơ bản miễn phí. 28 Tuyệt Kỹ Đại Gia dưới đây trả Ruby mỗi lần tung chiêu — phủ kín màn hình đối thủ bằng Màn Hình Xanh BSOD, Mưa Dép Vàng 24K, Còi Cảnh Sát, Búa Ban Vĩnh Viễn & Thiên Đế Phán Quyết!
          </T>
          {section('skill').map((it) =>
            row(
              it,
              <Button
                testID={`try-${it.id}`}
                small
                variant="paper"
                title={spotlight?.label === `Chiêu: ${it.name}` ? 'Đang ngắm' : 'Ngắm thử'}
                onPress={() => {
                  play('pop');
                  setSpotlight((cur) =>
                    cur?.label === `Chiêu: ${it.name}`
                      ? null
                      : { emoji: it.emoji, label: `Chiêu: ${it.name}` },
                  );
                }}
              />,
            ),
          )}
        </>
      )}

      {tab === 'deco' && (
        <>
          <T style={styles.note}>
            Mua 1 lần sở hữu & tự trang bị ngay · Thanh Sân Khấu trên đỉnh màn hình luôn cập nhật tức thì dù bạn đang cuộn ở tận cuối trang!
          </T>

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
                      <Button
                        testID={`unequip-${it.id}`}
                        small
                        variant="paper"
                        title="Gỡ"
                        disabled={busy !== null}
                        onPress={() => void equip(slot, null, it)}
                      />
                    ) : (
                      <Button
                        testID={`equip-${it.id}`}
                        small
                        variant="jade"
                        title="Trang bị"
                        disabled={busy !== null}
                        onPress={() => void equip(slot, it.id, it)}
                      />
                    )
                  ) : (
                    <>
                      <Button
                        testID={`try-${it.id}`}
                        small
                        variant="paper"
                        title={preview[slot] === it.id ? 'Đang thử' : 'Xem thử'}
                        onPress={() => {
                          play('pop');
                          const turningOff = preview[slot] === it.id;
                          setPreview((p) => ({ ...p, [slot]: turningOff ? undefined : it.id }));
                          setSpotlight(
                            turningOff ? null : { emoji: it.emoji, label: `Đang thử: ${it.name}` },
                          );
                        }}
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
                        <T style={[styles.itemDesc, { color: C.jadeDeep, fontWeight: '800' }]}>
                          {on ? 'Đang dùng' : 'Đã có'}
                        </T>
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
          <T style={styles.note}>Bộ “Chữ Lầy” 12 sticker chữ to viền đậm. Mua một lần, gửi thả ga trong khung chat.</T>
          <View style={styles.stickerGrid}>
            {CHU_LAY_STICKERS.map((s) => (
              <Image key={s.id} source={s.source} accessibilityLabel={s.alt} style={styles.stickerThumb} resizeMode="contain" />
            ))}
          </View>
          {itemsOfKind('sticker').map((it) =>
            row(
              it,
              owned.has(it.id) ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <UiIcon name="CheckCircle2" size={14} color={C.jadeDeep} />
                  <T testID="sticker-owned" style={styles.owned}>Đã có</T>
                </View>
              ) : (
                buyButton(it)
              ),
            ),
          )}
        </>
      )}

      {tab === 'gift' && (
        <>
          <T style={styles.note}>
            15 Siêu Quà Đại Gia (tới 10.000💎 Ngai Vàng Vũ Trụ Chí Tôn!): chạm avatar bạn bè trong phòng rồi bấm “Tặng quà” để nổ pháo hoa toàn màn hình & vinh danh Phú Hào!
          </T>
          {section('gift').map((it) =>
            row(
              it,
              <Button
                testID={`try-${it.id}`}
                small
                variant="paper"
                title={spotlight?.label === `Quà: ${it.name}` ? 'Đang ngắm' : 'Ngắm thử'}
                onPress={() => {
                  play('pop');
                  setSpotlight((cur) =>
                    cur?.label === `Quà: ${it.name}`
                      ? null
                      : { emoji: it.emoji, label: `Quà: ${it.name}` },
                  );
                }}
              />,
            ),
          )}
          {user && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <EmojiIcon emoji="💝" size={15} />
              <T style={styles.note}>Điểm quà bạn đã nhận: {fmtRuby(user.giftPoints ?? 0)}</T>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export function ShopSheet({
  game,
  onClose,
  initialTab = 'deco',
}: {
  game: Game;
  onClose: () => void;
  initialTab?: ShopTabId;
}) {
  const [walletOpen, setWalletOpen] = useState(false);
  const [preview, setPreview] = useState<ShopPreviewState>(() =>
    defaultGuestPreview(!!game.user),
  );
  const [spotlight, setSpotlight] = useState<ShopSpotlight | null>(null);

  if (walletOpen) return <WalletSheet game={game} onClose={() => setWalletOpen(false)} />;
  return (
    <Sheet
      title="Cửa hàng Phú Hào 🛍️"
      onClose={onClose}
      stickyTop={
        <ShopPreviewDock
          game={game}
          preview={preview}
          setPreview={setPreview}
          spotlight={spotlight}
          setSpotlight={setSpotlight}
          onOpenWallet={() => setWalletOpen(true)}
        />
      }
    >
      <ShopBody
        game={game}
        initialTab={initialTab}
        externalDock={true}
        previewState={preview}
        setPreviewState={setPreview}
        spotlightState={spotlight}
        setSpotlightState={setSpotlight}
        onOpenWallet={() => setWalletOpen(true)}
      />
    </Sheet>
  );
}

// ---------- điểm danh ----------

export function CheckinSheet({
  game,
  onClose,
  onChanged,
}: {
  game: Game;
  onClose: () => void;
  onChanged?: () => void;
}) {
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
      <T style={styles.note}>
        Vào mỗi ngày để nhận Ruby. Điểm danh liên tiếp 7 ngày nhận quà lớn; bỏ lỡ một ngày thì quay về ngày 1.
      </T>
      <View style={styles.days}>
        {rewards.map((r, i) => {
          const day = i + 1;
          const isDone = day <= done;
          const today = !!st?.canClaim && day === st.nextDay;
          return (
            <View
              key={day}
              testID={`checkin-day-${day}`}
              style={[
                styles.day,
                isDone && styles.dayDone,
                today && styles.dayToday,
                day === 7 && styles.dayBig,
              ]}
            >
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
      {st &&
        (st.canClaim ? (
          <Button
            testID="checkin-claim"
            title={busy ? 'Đang nhận…' : `Nhận +${st.nextReward} 💎`}
            disabled={busy}
            onPress={claim}
          />
        ) : (
          <T testID="checkin-done" style={styles.note}>
            Hôm nay bạn đã điểm danh rồi. Ngày mai nhận +{st.nextReward} Ruby nhé!
          </T>
        ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 13, color: C.muted, lineHeight: 18 },
  error: {
    color: '#FFFFFF',
    backgroundColor: C.danger,
    padding: 8,
    borderRadius: 10,
    fontWeight: '700',
    overflow: 'hidden',
  },
  dockOuter: {
    borderRadius: 18,
    borderWidth: 2.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
    overflow: 'visible',
  },
  dockOuterCompact: {
    paddingVertical: 7,
    gap: 4,
  },
  dockTopMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  dockPinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.45)',
    flexShrink: 1,
  },
  dockPinTxt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FEF08A',
    letterSpacing: 0.3,
  },
  dockTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dockRubyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  dockRubyTxt: {
    fontSize: 11.5,
    fontWeight: '900',
    color: C.son,
  },
  dockResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: '#FEF9C3',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  dockResetTxt: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#1E293B',
  },
  dockCollapseBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dockMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  guestWhaleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#FACC15',
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    justifyContent: 'space-between',
    backgroundColor: C.mist,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
  },
  rubyInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balance: { fontSize: 22, fontWeight: '900', color: C.son },
  vipCard: {
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(255,197,61,0.55)',
    padding: 12,
    gap: 7,
  },
  vipTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  vipTitle: { color: '#FEF08A', fontWeight: '900', fontSize: 13, flex: 1 },
  vipPts: { color: '#CBD5E1', fontWeight: '800', fontSize: 11 },
  vipTrack: {
    height: 7,
    borderRadius: 99,
    backgroundColor: 'rgba(255,255,255,0.16)',
    overflow: 'hidden',
  },
  vipFill: { height: '100%', borderRadius: 99 },
  vipSub: { color: '#E2E8F0', fontSize: 11, fontWeight: '700' },
  tabs: { flexDirection: 'row', backgroundColor: C.mist, borderRadius: 14, padding: 4, gap: 4 },
  tab: {
    flex: 1,
    minHeight: 40,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  tabOn: { backgroundColor: C.ink },
  tabText: { fontWeight: '800', fontSize: 11.5, textAlign: 'center', color: C.ink },
  filterRow: { gap: 6, paddingVertical: 2 },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.mist,
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.1)',
  },
  filterOn: { backgroundColor: C.ink, borderColor: C.ink },
  filterTxt: { fontSize: 12, fontWeight: '800', color: C.ink },
  sectionLabel: { fontSize: 14, fontWeight: '900', color: C.ink },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.mist,
    borderRadius: 16,
    padding: 10,
  },
  itemVip: { backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#F59E0B' },
  itemMythic: { backgroundColor: '#1E1136', borderWidth: 2, borderColor: '#FACC15' },
  itemIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15,23,42,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemIconVip: { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
  itemIconMythic: { backgroundColor: '#3B0764', borderColor: '#F472B6', borderWidth: 1.5 },
  mythicTag: { backgroundColor: '#EC4899', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 6 },
  mythicTagTxt: { fontSize: 9.5, fontWeight: '900', color: '#FEF08A' },
  vipTag: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#D97706',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  vipTagTxt: { fontSize: 9.5, fontWeight: '900', color: '#92400E' },
  itemName: { fontSize: 15, fontWeight: '900', color: C.ink },
  itemDesc: { fontSize: 12, color: C.muted, lineHeight: 16 },
  itemAct: { alignItems: 'flex-end', gap: 4, maxWidth: 175 },
  pricePill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontSize: 13, fontWeight: '900', color: C.son },
  previewName: { fontSize: 18, fontWeight: '900', flexShrink: 1 },
  previewBubble: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FFFDF8',
    borderWidth: 1.5,
    borderColor: 'rgba(15,23,42,0.16)',
    maxWidth: '100%',
  },
  stickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' },
  stickerThumb: { width: 76, height: 58 },
  owned: { fontSize: 13, fontWeight: '800', color: C.jadeDeep },
  won: { fontSize: 34, fontWeight: '900', color: C.son, textAlign: 'center' },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  day: {
    width: '22.5%',
    minWidth: 68,
    alignItems: 'center',
    backgroundColor: C.mist,
    borderRadius: 14,
    paddingVertical: 9,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 2,
  },
  dayDone: { opacity: 0.65 },
  dayToday: { borderColor: C.gold, backgroundColor: '#FEF9C3', transform: [{ scale: 1.05 }] },
  dayBig: { width: '48%' },
  dayNum: { fontSize: 11, fontWeight: '800', color: C.muted },
  dayReward: { fontSize: 14, fontWeight: '900', color: C.son },
});
