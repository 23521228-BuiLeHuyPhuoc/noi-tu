/**
 * Ví Ruby: chọn gói, quét QR chuyển khoản (BIDV), bấm "Tôi đã chuyển khoản" để chờ quản trị duyệt;
 * lịch sử Ruby; thông báo "+N 💎" ở mọi màn khi được duyệt.
 */
import { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { RUBY_PACKS, TOPUP_BANK, vietQrUrl } from '../../../shared/src/ruby';
import type { RubyLedgerRow } from '../../../shared/src/types';
import type { Game, WalletNotice } from '../useGame';
import { copyText } from '../web';
import { play } from '../sound';
import { C } from '../theme';
import { Button, T, useFeed } from '../ui';
import { Sheet } from './Sheet';
import { Confetti } from './Fun';

export const fmtVnd = (n: number) => `${n.toLocaleString('vi-VN')}đ`;
export const fmtRuby = (n: number) => n.toLocaleString('vi-VN');

const REASON_TEXT: Record<string, string> = { topup: 'Nạp Ruby', admin_adjust: 'Quản trị điều chỉnh' };

function CopyRow({ testID, label, value, copy }: { testID?: string; label: string; value: string; copy?: string }) {
  const feed = useFeed();
  return (
    <View style={styles.row}>
      <T style={styles.rowLabel}>{label}</T>
      <T testID={testID} selectable style={styles.rowValue}>{value}</T>
      {copy !== undefined && (
        <Pressable
          testID={testID ? `copy-${testID.replace('topup-', '')}` : undefined}
          accessibilityRole="button"
          accessibilityLabel={`Sao chép ${label}`}
          hitSlop={8}
          onPress={async () => (await copyText(copy)) && feed(`Đã sao chép ${label.toLowerCase()}`, 'info')}
        >
          <T style={styles.copy}>📋</T>
        </Pressable>
      )}
    </View>
  );
}

export function WalletSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const [amount, setAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const [history, setHistory] = useState<RubyLedgerRow[] | null>(null);
  const w = game.wallet;
  const { loadWallet } = game;

  useEffect(() => {
    void loadWallet().then((e) => e && setError(e));
  }, [loadWallet]);

  const sent = async () => {
    if (amount === null) return;
    setBusy(true);
    setError(null);
    const err = await game.requestTopup(amount);
    setBusy(false);
    if (err) setError(err);
    else setAmount(null);
  };

  const showHistory = async () => {
    const r = await game.rubyHistory();
    if (r.ok) setHistory(r.data);
    else setError(r.error);
  };

  const pack = RUBY_PACKS.find((p) => p.amount === amount);
  return (
    <Sheet title="Nạp Ruby 💎" onClose={onClose}>
      <View style={styles.balanceRow}>
        <T style={styles.balanceLabel}>Số dư</T>
        <T testID="ruby-balance" style={styles.balance}>💎 {fmtRuby(w?.ruby ?? game.user?.ruby ?? 0)}</T>
      </View>

      {!w ? (
        <T style={styles.muted}>{error ?? 'Đang tải ví…'}</T>
      ) : amount === null ? (
        <>
          <T style={styles.h3}>Chọn gói</T>
          <View style={styles.packs}>
            {RUBY_PACKS.map((p) => (
              <Pressable
                key={p.amount}
                testID={`pack-${p.amount}`}
                accessibilityRole="button"
                onPress={() => {
                  setAmount(p.amount);
                  setQrFailed(false);
                }}
                style={({ pressed }) => [styles.pack, pressed && { transform: [{ translateY: 2 }] }]}
              >
                <T style={styles.packRuby}>💎 {fmtRuby(w.firstTopupDone ? p.ruby : p.ruby * 2)}</T>
                {!w.firstTopupDone && <T style={styles.packOld}>{fmtRuby(p.ruby)}</T>}
                <T style={styles.packPrice}>{fmtVnd(p.amount)}</T>
                {p.bonus > 0 && <T style={styles.bonus}>+{p.bonus}%</T>}
                {!w.firstTopupDone && <T style={styles.x2}>x2 lần đầu</T>}
              </Pressable>
            ))}
          </View>
          {w.pending.length > 0 && (
            <View testID="topup-pending" style={styles.pendingBox}>
              <T style={styles.pendingTitle}>⏳ Đang chờ duyệt (thường trong ngày)</T>
              {w.pending.map((r) => (
                <T key={r.id} style={styles.pendingItem}>
                  {fmtVnd(r.amount)} · {new Date(r.createdAt).toLocaleString('vi-VN')}
                </T>
              ))}
            </View>
          )}
          {history ? (
            <View style={{ gap: 4 }}>
              <T style={styles.h3}>Lịch sử Ruby</T>
              {history.length === 0 && <T style={styles.muted}>Chưa có giao dịch nào.</T>}
              {history.map((h, i) => (
                <View key={i} style={styles.histRow}>
                  <T style={[styles.histDelta, { color: h.delta >= 0 ? C.jade : C.danger }]}>
                    {h.delta >= 0 ? '+' : ''}{fmtRuby(h.delta)}
                  </T>
                  <T style={{ flex: 1 }}>{REASON_TEXT[h.reason] ?? h.reason}{h.reason === 'admin_adjust' && h.ref ? `: ${h.ref}` : ''}</T>
                  <T style={styles.muted}>{new Date(h.at).toLocaleDateString('vi-VN')}</T>
                </View>
              ))}
            </View>
          ) : (
            <Button testID="ruby-history" small variant="ghost" icon="🧾" title="Lịch sử Ruby" onPress={showHistory} />
          )}
        </>
      ) : (
        <>
          <T style={styles.h3}>
            Chuyển {fmtVnd(amount)} để nhận 💎 {fmtRuby(w.firstTopupDone ? pack!.ruby : pack!.ruby * 2)}
          </T>
          {!qrFailed && (
            <Image
              testID="topup-qr"
              source={{ uri: vietQrUrl(amount, w.topupCode) }}
              onError={() => setQrFailed(true)}
              style={styles.qr}
              resizeMode="contain"
              accessibilityLabel="Mã QR chuyển khoản"
            />
          )}
          <View style={styles.info}>
            <CopyRow label="Ngân hàng" value={TOPUP_BANK.bank} />
            <CopyRow testID="topup-account" label="Số tài khoản" value={TOPUP_BANK.account} copy={TOPUP_BANK.account} />
            <CopyRow label="Chủ tài khoản" value={TOPUP_BANK.name} />
            <CopyRow testID="topup-amount" label="Số tiền" value={fmtVnd(amount)} copy={String(amount)} />
            <CopyRow testID="topup-code" label="Nội dung" value={w.topupCode} copy={w.topupCode} />
          </View>
          <T style={styles.warn}>⚠️ Giữ nguyên nội dung chuyển khoản {w.topupCode} để quản trị biết là bạn.</T>
          {Platform.OS === 'web' && !qrFailed && (
            <Button small variant="paper" icon="⬇️" title="Lưu ảnh QR" onPress={() => void Linking.openURL(vietQrUrl(amount, w.topupCode))} />
          )}
          {error && <T style={styles.error}>{error}</T>}
          <Button testID="topup-sent" icon="✅" title={busy ? 'Đang gửi…' : 'Tôi đã chuyển khoản'} disabled={busy} onPress={sent} />
          <Button small variant="ghost" title="‹ Chọn gói khác" onPress={() => setAmount(null)} />
        </>
      )}
      {amount === null && error && w && <T style={styles.error}>{error}</T>}
      <T style={styles.note}>Ruby chỉ dùng mua đồ vui trong game, không đổi ra tiền hay xu Bầu cua / Cờ tỷ phú.</T>
    </Sheet>
  );
}

/** Thông báo "+N 💎" kèm pháo giấy, hoặc báo bị từ chối — hiện ở mọi màn */
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
      <Pressable testID="ruby-toast" onPress={() => setNotice(null)} style={[styles.toast, notice.kind === 'rejected' && { backgroundColor: C.ink }]}>
        {notice.kind === 'update' ? (
          <>
            <T style={styles.toastBig}>+{fmtRuby(notice.delta)} 💎</T>
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
  balanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { color: C.muted, fontWeight: '800' },
  balance: { fontSize: 24, fontWeight: '900', color: C.son },
  h3: { fontSize: 16, fontWeight: '900' },
  muted: { color: C.muted, fontSize: 13 },
  packs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pack: {
    width: '47%', flexGrow: 1, backgroundColor: C.mist, borderRadius: 16, borderWidth: 2.5, borderColor: C.ink,
    paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 2,
  },
  packRuby: { fontSize: 20, fontWeight: '900', color: C.son },
  packOld: { fontSize: 12, color: C.muted, textDecorationLine: 'line-through' },
  packPrice: { fontSize: 15, fontWeight: '800' },
  bonus: { fontSize: 12, fontWeight: '900', color: C.jade },
  x2: {
    position: 'absolute', top: -10, right: -6, backgroundColor: C.gold, borderRadius: 8, borderWidth: 2, borderColor: C.ink,
    paddingHorizontal: 6, fontSize: 11, fontWeight: '900', overflow: 'hidden',
  },
  pendingBox: { backgroundColor: '#FFF3BF', borderRadius: 12, padding: 10, gap: 2 },
  pendingTitle: { fontWeight: '900' },
  pendingItem: { fontSize: 13 },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  histDelta: { width: 70, fontWeight: '900' },
  qr: { width: '100%', maxWidth: 300, aspectRatio: 0.84, alignSelf: 'center', backgroundColor: '#fff', borderRadius: 12 },
  info: { backgroundColor: C.mist, borderRadius: 12, padding: 10, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowLabel: { width: 108, color: C.muted, fontSize: 13, fontWeight: '700' },
  rowValue: { flex: 1, fontWeight: '900', fontSize: 15 },
  copy: { fontSize: 18 },
  warn: { color: C.danger, fontWeight: '800', fontSize: 13 },
  error: { color: C.ink, backgroundColor: '#FFD6D6', padding: 8, borderRadius: 10, fontWeight: '700', overflow: 'hidden' },
  note: { fontSize: 11, color: C.muted, textAlign: 'center' },
  noticeLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 95, alignItems: 'center', paddingTop: 70 },
  toast: {
    backgroundColor: C.paper, borderRadius: 18, borderWidth: 3, borderColor: C.ink, paddingVertical: 12, paddingHorizontal: 18,
    alignItems: 'center', gap: 4, maxWidth: 360, marginHorizontal: 16,
  },
  toastBig: { fontSize: 30, fontWeight: '900', color: C.son },
  toastSmall: { fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
