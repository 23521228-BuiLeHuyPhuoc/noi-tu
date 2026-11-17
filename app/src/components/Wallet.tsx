/**
 * Ví Ruby: số dư, yêu cầu đang chờ, lịch sử Ruby; thông báo "+N 💎" ở mọi màn khi được cộng.
 * Nạp bằng chuyển khoản đang tạm ngưng: đã gỡ QR và số tài khoản khỏi web.
 */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { RubyLedgerRow } from '../../../shared/src/types';
import type { Game, WalletNotice } from '../useGame';
import { play } from '../sound';
import { C, sticker } from '../theme';
import { Button, T } from '../ui';
import { Sheet } from './Sheet';
import { Confetti } from './Fun';
import { EmojiIcon, RubyIcon, UiIcon } from './Icons';

export const fmtVnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
export const fmtRuby = (n: number) => n.toLocaleString('vi-VN');

const REASON_TEXT: Record<string, string> = {
  topup: 'Nạp Ruby', admin_adjust: 'Quản trị điều chỉnh', shop: 'Mua ở cửa hàng', skill: 'Dùng kỹ năng chọc', gift: 'Tặng quà', checkin: 'Điểm danh',
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

  return (
    <Sheet title="Nạp Ruby 💎" onClose={onClose}>
      <View style={styles.balanceRow}>
        <T style={styles.balanceLabel}>Số dư khả dụng</T>
        <View style={styles.rubyInline}>
          <RubyIcon size={22} />
          <T testID="ruby-balance" style={styles.balance}>{fmtRuby(w?.ruby ?? game.user?.ruby ?? 0)}</T>
        </View>
      </View>

      {!w ? (
        <T style={styles.muted}>{error ?? 'Đang tải ví…'}</T>
      ) : (
        <>
          <View testID="topup-paused" style={styles.pendingBox}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <UiIcon name="Info" size={16} color="#92400E" />
              <T style={styles.pendingTitle}>Nạp Ruby đang tạm ngưng</T>
            </View>
            <T style={styles.pendingItem}>Bạn vẫn nhận Ruby miễn phí qua Điểm danh mỗi ngày.</T>
          </View>
          {w.pending.length > 0 && (
            <View testID="topup-pending" style={styles.pendingBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <UiIcon name="Timer" size={16} color="#92400E" />
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
                  <T style={{ flex: 1 }}>{REASON_TEXT[h.reason] ?? h.reason}{h.reason === 'admin_adjust' && h.ref ? `: ${h.ref}` : ''}</T>
                  <T style={styles.muted}>{new Date(h.at).toLocaleDateString('vi-VN')}</T>
                </View>
              ))}
            </View>
          ) : (
            <Button testID="ruby-history" small variant="paper" iconNode={<UiIcon name="History" size={16} color={C.ink} />} title="Lịch sử Ruby" onPress={showHistory} />
          )}
        </>
      )}
      {error && w && <T style={styles.error}>{error}</T>}
      <T style={styles.note}>Ruby chỉ dùng mua đồ vui trong game, không đổi ra tiền hay xu Bầu cua / Cờ tỷ phú.</T>
    </Sheet>
  );
}

/** Thông báo "+N Ruby" kèm pháo giấy, hoặc báo bị từ chối — hiện ở mọi màn */
export function WalletNoticeLayer({ game }: { game: Game }) {
  const [notice, setNotice] = useState<(WalletNotice & { id: number }) | null>(null);
  const { onWallet } = game;
  useEffect(() => {
    let seq = 0;
    return onWallet((n) => {
      if (n.kind === 'update' && n.delta <= 0) return;
      play(n.kind === 'update' ? 'win' : 'lose');
      setNotice({ ...n, id: ++seq });
    });
  }, [onWallet]);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  if (!notice) return null;
  return (
    <View pointerEvents="box-none" style={styles.noticeLayer}>
      {notice.kind === 'update' && <Confetti key={notice.id} />}
      <Pressable testID="ruby-toast" onPress={() => setNotice(null)} style={[styles.toast, sticker(4), notice.kind === 'rejected' && { backgroundColor: C.ink }]}>
        {notice.kind === 'update' ? (
          <>
            <View style={styles.rubyInline}>
              <T style={styles.toastBig}>+{fmtRuby(notice.delta)}</T>
              <EmojiIcon emoji="💎" size={26} />
            </View>
            <T style={styles.toastSmall}>{notice.reason === 'topup' ? 'Đã nhận tiền nạp, cảm ơn bạn!' : 'Quản trị vừa cộng Ruby cho bạn'} · Số dư {fmtRuby(notice.ruby)}</T>
          </>
        ) : (
          <T style={[styles.toastSmall, { color: C.gold }]}>
            Chưa thấy khoản chuyển {fmtVnd(notice.amount)}. Nếu bạn đã chuyển, hãy liên hệ quản trị kèm mã nạp nhé.
          </T>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.mist, padding: 12, borderRadius: 14 },
  balanceLabel: { color: C.muted, fontWeight: '800' },
  rubyInline: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  balance: { fontSize: 24, fontWeight: '900', color: C.son },
  h3: { fontSize: 16, fontWeight: '900' },
  muted: { color: C.muted, fontSize: 13 },
  pendingBox: { backgroundColor: '#FEF3C7', borderRadius: 14, padding: 12, gap: 4, borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)' },
  pendingTitle: { fontWeight: '900', color: '#92400E' },
  pendingItem: { fontSize: 13, color: '#78350F' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(15,23,42,0.06)' },
  histDelta: { width: 70, fontWeight: '900' },
  error: { color: '#FFFFFF', backgroundColor: C.danger, padding: 8, borderRadius: 10, fontWeight: '700', overflow: 'hidden' },
  note: { fontSize: 11.5, color: C.muted, textAlign: 'center' },
  noticeLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 95, alignItems: 'center', paddingTop: 70 },
  toast: {
    backgroundColor: C.paper, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 22,
    alignItems: 'center', gap: 4, maxWidth: 360, marginHorizontal: 16,
  },
  toastBig: { fontSize: 30, fontWeight: '900', color: C.son },
  toastSmall: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
