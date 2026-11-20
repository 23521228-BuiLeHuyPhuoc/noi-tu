/**
 * Ví Ruby: số dư, yêu cầu đang chờ, lịch sử Ruby; thông báo "+N 💎" ở mọi màn khi được cộng.
 * Nạp bằng chuyển khoản đang tạm ngưng: đã gỡ QR và số tài khoản khỏi web.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { RubyLedgerRow } from '../../../shared/src/types';
import type { Game, WalletNotice } from '../useGame';
import { play, playMemePool } from '../sound';
import { C, sticker } from '../theme';
import { Button, T } from '../ui';
import { Sheet } from './Sheet';
import { Confetti } from './Fun';
import { RubyIcon, UiIcon } from './Icons';

export const fmtVnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
export const fmtRuby = (n: number) => n.toLocaleString('vi-VN');

const REASON_TEXT: Record<string, string> = {
  topup: 'Nạp Ruby',
  admin_adjust: 'Quản trị điều chỉnh',
  shop: 'Mua ở cửa hàng',
  skill: 'Dùng kỹ năng chọc',
  gift: 'Tặng quà',
  gift_receive: 'Nhận quà (70%)',
  checkin: 'Điểm danh',
  game_win: 'Thắng ván chơi',
  game_loss: 'Thua ván chơi',
};

export function WalletSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<RubyLedgerRow[] | null>(null);
  const w = game.wallet;
  const { loadWallet } = game;

  useEffect(() => {
    void loadWallet().then((e) => e && setError(e));
  }, [loadWallet]);

  const showHistory = async () => {
    const r = await game.rubyHistory();
    if (r.ok) setHistory(r.data);
    else setError(r.error);
  };

  const curBalance = w?.ruby ?? game.user?.ruby ?? 0;

  return (
    <Sheet title="Ví Ruby" onClose={onClose}>
      <View style={styles.balanceRow}>
        <T style={styles.balanceLabel}>Số dư khả dụng</T>
        <View style={styles.rubyInline}>
          <RubyIcon size={20} />
          <T testID="ruby-balance" style={[styles.balance, curBalance < 0 && { color: C.danger }]}>{fmtRuby(curBalance)}</T>
        </View>
      </View>

      {!w ? (
        <T style={styles.muted}>{error ?? 'Đang tải ví…'}</T>
      ) : (
        <>
          <View testID="topup-paused" style={styles.pendingBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <UiIcon name="Info" size={15} color={C.goldDeep} />
              <T style={styles.pendingTitle}>Nạp Ruby đang tạm ngưng</T>
            </View>
            <T style={styles.pendingItem}>Bạn vẫn nhận Ruby miễn phí qua Điểm danh mỗi ngày.</T>
          </View>
          {w.pending.length > 0 && (
            <View testID="topup-pending" style={styles.pendingBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <UiIcon name="Timer" size={15} color={C.goldDeep} />
                <T style={styles.pendingTitle}>Đang chờ duyệt (thường trong ngày)</T>
              </View>
              {w.pending.map((r) => (
                <T key={r.id} style={styles.pendingItem}>
                  {fmtVnd(r.amount)} · {new Date(r.createdAt).toLocaleString('vi-VN')}
                </T>
              ))}
            </View>
          )}
          {history ? (
            <View style={{ gap: 6 }}>
              <T style={styles.h3}>Lịch sử Ruby</T>
              {history.length === 0 && <T style={styles.muted}>Chưa có giao dịch nào.</T>}
              {history.map((h, i) => (
                <View key={i} style={styles.histRow}>
                  <T style={[styles.histDelta, { color: h.delta >= 0 ? C.jadeDeep : C.danger }]}>
                    {h.delta >= 0 ? '+' : ''}{fmtRuby(h.delta)}
                  </T>
                  <T style={{ flex: 1, fontSize: 13, color: C.ink }}>{REASON_TEXT[h.reason] ?? h.reason}{h.reason === 'admin_adjust' && h.ref ? `: ${h.ref}` : ''}</T>
                  <T style={styles.muted}>{new Date(h.at).toLocaleDateString('vi-VN')}</T>
                </View>
              ))}
            </View>
          ) : (
            <Button testID="ruby-history" small variant="paper" iconNode={<UiIcon name="History" size={15} color={C.ink} />} title="Lịch sử Ruby" onPress={showHistory} />
          )}
        </>
      )}
      {error && w && <T style={styles.error}>{error}</T>}
      <T style={styles.note}>Thắng ván +2.000 Ruby, thua ván -2.000 Ruby (có thể âm), nhận quà hưởng 70% Ruby; không đổi ra xu Bầu cua / Cờ tỷ phú.</T>
    </Sheet>
  );
}

/** Thông báo "+N / -N Ruby" kèm pháo giấy khi được cộng, hoặc báo bị từ chối — hiện ở mọi màn */
export function WalletNoticeLayer({ game }: { game: Game }) {
  const [notice, setNotice] = useState<(WalletNotice & { id: number }) | null>(null);
  const { onWallet } = game;
  useEffect(() => {
    let seq = 0;
    return onWallet((n) => {
      if (n.kind === 'update') {
        const showNegative = n.delta < 0 && (n.reason === 'game_loss' || n.reason === 'admin_adjust');
        if (n.delta <= 0 && !showNegative) return;
      }
      if (n.kind === 'update') {
        if (n.reason === 'game_win') playMemePool('win', { speakerId: game.me });
        else if (n.reason === 'game_loss' && n.ruby < 0) playMemePool('broke', { speakerId: game.me });
        else if (n.reason === 'gift_receive') playMemePool('gift_receive', { speakerId: game.me });
        else if (n.reason === 'checkin') playMemePool('money', { speakerId: game.me });
      }
      play(n.kind === 'update' && n.delta > 0 ? 'win' : 'lose', { speakerId: game.me });
      setNotice({ ...n, id: ++seq });
    });
  }, [onWallet, game.me]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  if (!notice) return null;
  const isGain = notice.kind === 'update' && notice.delta > 0;
  const isLoss = notice.kind === 'update' && notice.delta < 0;
  const updateReasonText =
    notice.kind === 'update'
      ? notice.reason === 'topup'
        ? 'Đã nhận tiền nạp, cảm ơn bạn'
        : notice.reason === 'game_win'
          ? 'Thắng ván chơi · Thưởng kim cương'
          : notice.reason === 'game_loss'
            ? 'Thua ván chơi · Trừ kim cương'
            : notice.reason === 'gift_receive'
              ? 'Nhận 70% kim cương từ quà tặng'
              : notice.reason === 'checkin'
                ? 'Điểm danh hằng ngày'
                : 'Quản trị vừa điều chỉnh Ruby cho bạn'
      : '';
  return (
    <View pointerEvents="box-none" style={styles.noticeLayer}>
      {isGain && <Confetti key={notice.id} />}
      <Pressable
        testID="ruby-toast"
        onPress={() => setNotice(null)}
        style={[
          styles.toast,
          sticker(2),
          notice.kind === 'rejected' && { backgroundColor: C.darkSurface, borderColor: C.darkBorder },
          isLoss && { backgroundColor: C.dangerSoft, borderColor: 'rgba(185, 28, 28, 0.35)' },
        ]}
      >
        {notice.kind === 'update' ? (
          <>
            <View style={styles.rubyInline}>
              <T style={[styles.toastBig, isLoss && { color: C.danger }]}>
                {notice.delta >= 0 ? '+' : ''}{fmtRuby(notice.delta)}
              </T>
              <RubyIcon size={24} />
            </View>
            <T style={styles.toastSmall}>{updateReasonText} · Số dư {fmtRuby(notice.ruby)}</T>
          </>
        ) : (
          <T style={[styles.toastSmall, { color: C.darkText }]}>
            Chưa thấy khoản chuyển {fmtVnd(notice.amount)}. Nếu bạn đã chuyển, hãy liên hệ quản trị kèm mã nạp nhé.
          </T>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.parchment, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.borderSubtle,
  },
  balanceLabel: { color: C.secondary, fontWeight: '500', fontSize: 13.5 },
  rubyInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balance: { fontSize: 22, fontWeight: '600', color: C.son, fontVariant: ['tabular-nums'] },
  h3: { fontSize: 15, fontWeight: '600', color: C.ink },
  muted: { color: C.muted, fontSize: 12.5, fontVariant: ['tabular-nums'] },
  pendingBox: { backgroundColor: C.goldSoft, borderRadius: 12, padding: 12, gap: 4, borderWidth: 1, borderColor: 'rgba(180,83,9,0.22)' },
  pendingTitle: { fontWeight: '600', color: C.goldDeep, fontSize: 13.5 },
  pendingItem: { fontSize: 12.5, color: C.ink, fontVariant: ['tabular-nums'] },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: C.borderSubtle },
  histDelta: { width: 70, fontWeight: '600', fontVariant: ['tabular-nums'] },
  error: { color: '#FFFFFF', backgroundColor: C.danger, padding: 8, borderRadius: 10, fontWeight: '500', overflow: 'hidden' },
  note: { fontSize: 11.5, color: C.muted, textAlign: 'center', fontWeight: '400' },
  noticeLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 95, alignItems: 'center', paddingTop: 70 },
  toast: {
    backgroundColor: C.paper, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 22,
    borderWidth: 1, borderColor: C.borderSubtle,
    alignItems: 'center', gap: 4, maxWidth: 360, marginHorizontal: 16,
  },
  toastBig: { fontSize: 26, fontWeight: '600', color: C.son, fontVariant: ['tabular-nums'] },
  toastSmall: { fontSize: 13, fontWeight: '500', textAlign: 'center', color: C.ink, fontVariant: ['tabular-nums'] },
});
