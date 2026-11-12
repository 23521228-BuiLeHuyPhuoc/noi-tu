/**
 * Trang quản trị (chỉ ADMIN_USERNAMES): duyệt yêu cầu nạp sau khi đối chiếu app BIDV, cộng theo mã nạp,
 * xem doanh thu, cộng/trừ Ruby có lý do. Server kiểm tra quyền cho từng lệnh.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import type { TopupRequest } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT } from '../theme';
import { Button, T } from '../ui';
import { Sheet } from './Sheet';
import { fmtRuby, fmtVnd } from './Wallet';

type Tab = 'pending' | 'code' | 'revenue' | 'adjust';
const TABS: { id: Tab; label: string }[] = [
  { id: 'pending', label: 'Chờ duyệt' },
  { id: 'code', label: 'Theo mã' },
  { id: 'revenue', label: 'Doanh thu' },
  { id: 'adjust', label: 'Cộng/trừ' },
];

function Input(props: React.ComponentProps<typeof TextInput>) {
  return <TextInput placeholderTextColor={C.muted} autoCorrect={false} autoCapitalize="none" {...props} style={[styles.input, props.style]} />;
}

const digits = (t: string) => Number(t.replace(/\D/g, '')) || 0;
/** mã ngẫu nhiên cho một lần cộng theo mã: bấm lại (mạng chậm) gửi đúng mã cũ nên server không cộng trùng */
const newNonce = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

function PendingRow({ game, r, onDone }: { game: Game; r: TopupRequest; onDone: (msg: string) => void }) {
  const [amount, setAmount] = useState(String(r.amount));
  const [busy, setBusy] = useState(false);
  const approve = async () => {
    setBusy(true);
    const res = await game.adminApprove(r.id, digits(amount));
    setBusy(false);
    onDone(res.ok ? `Đã cộng 💎 ${fmtRuby(res.data.ruby)} cho ${r.username}` : res.error);
  };
  const reject = async () => {
    setBusy(true);
    const res = await game.adminReject(r.id);
    setBusy(false);
    onDone(res.ok ? `Đã từ chối yêu cầu của ${r.username}` : res.error);
  };
  return (
    <View style={styles.card}>
      <T style={styles.cardTitle}>{r.username} · <T style={styles.code}>{r.code}</T></T>
      <T style={styles.muted}>Gói {fmtVnd(r.amount)} · {new Date(r.createdAt).toLocaleString('vi-VN')}</T>
      <View style={styles.inline}>
        <T style={styles.muted}>Thực nhận</T>
        <Input value={amount} onChangeText={setAmount} keyboardType="number-pad" style={{ flex: 1 }} />
      </View>
      <View style={styles.inline}>
        <Button testID={`admin-approve-${r.id}`} small title="Đã nhận tiền" variant="jade" disabled={busy} style={{ flex: 1 }} onPress={approve} />
        <Button testID={`admin-reject-${r.id}`} small title="Không thấy" variant="paper" disabled={busy} style={{ flex: 1 }} onPress={reject} />
      </View>
    </View>
  );
}

export function AdminSheet({ game, onClose }: { game: Game; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('pending');
  const [list, setList] = useState<TopupRequest[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [revenue, setRevenue] = useState<{ today: number; month: number; total: number } | null>(null);
  const [code, setCode] = useState('');
  const [codeAmount, setCodeAmount] = useState('');
  const [nonce, setNonce] = useState(newNonce);
  const [user, setUser] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const { adminRequests, adminRevenue } = game;

  const loadPending = useCallback(async () => {
    const r = await adminRequests('pending');
    if (r.ok) setList(r.data);
    else setMsg(r.error);
  }, [adminRequests]);

  useEffect(() => {
    if (tab === 'pending') void adminRequests('pending').then((r) => (r.ok ? setList(r.data) : setMsg(r.error)));
    if (tab === 'revenue') void adminRevenue().then((r) => (r.ok ? setRevenue(r.data) : setMsg(r.error)));
  }, [tab, adminRequests, adminRevenue]);

  const creditCode = async () => {
    setBusy(true);
    const r = await game.adminCreditCode(code, digits(codeAmount), nonce);
    setBusy(false);
    setMsg(r.ok ? `Đã cộng 💎 ${fmtRuby(r.data.ruby)} cho ${r.data.request.username} (số dư ${fmtRuby(r.data.balance)})` : r.error);
    if (r.ok) {
      setCode('');
      setCodeAmount('');
      setNonce(newNonce());
    }
  };
  const adjust = async () => {
    const n = Number(delta.replace(/[^\d-]/g, ''));
    setBusy(true);
    const r = await game.adminAdjust(user.trim().toLowerCase(), n, reason);
    setBusy(false);
    setMsg(r.ok ? `Xong, số dư của ${user} còn 💎 ${fmtRuby(r.data.balance)}` : r.error);
  };

  return (
    <Sheet title="Quản trị Ruby" onClose={onClose}>
      <View style={styles.tabs}>
        {TABS.map((t) => (
          <Pressable
            key={t.id}
            testID={`admin-tab-${t.id}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === t.id }}
            onPress={() => {
              setTab(t.id);
              setMsg(null);
            }}
            style={[styles.tab, tab === t.id && styles.tabOn]}
          >
            <T style={[styles.tabText, tab === t.id && { color: C.gold }]}>{t.label}</T>
          </Pressable>
        ))}
      </View>
      {msg && <T testID="admin-msg" style={styles.msg}>{msg}</T>}

      {tab === 'pending' && (
        <View style={{ gap: 10 }}>
          <T style={styles.muted}>Mở app BIDV, thấy tiền về đúng mã thì bấm “Đã nhận tiền”. Sửa ô “Thực nhận” nếu số tiền khác gói.</T>
          {list === null ? <T style={styles.muted}>Đang tải…</T> : list.length === 0 ? <T style={styles.muted}>Không có yêu cầu nào đang chờ.</T> : null}
          {list?.map((r) => (
            <PendingRow
              key={r.id}
              game={game}
              r={r}
              onDone={(m) => {
                setMsg(m);
                void loadPending();
              }}
            />
          ))}
          <Button small variant="paper" icon="🔄" title="Tải lại" onPress={loadPending} />
        </View>
      )}

      {tab === 'code' && (
        <View style={{ gap: 8 }}>
          <T style={styles.muted}>Người chơi chuyển khoản mà quên bấm “Tôi đã chuyển”: nhập mã XL… trong nội dung và số tiền thấy trên app BIDV.</T>
          <Input testID="admin-code" value={code} onChangeText={(t) => { setCode(t.toUpperCase()); setNonce(newNonce()); }} placeholder="Mã nạp, vd XL8F3K2Q" />
          <Input testID="admin-code-amount" value={codeAmount} onChangeText={(t) => { setCodeAmount(t); setNonce(newNonce()); }} keyboardType="number-pad" placeholder="Số tiền (đồng)" />
          <Button testID="admin-code-credit" small title="Cộng Ruby" disabled={busy || code.length < 8 || digits(codeAmount) < 1000} onPress={creditCode} />
        </View>
      )}

      {tab === 'revenue' && (
        <View testID="admin-revenue" style={{ gap: 6 }}>
          {revenue ? (
            <>
              <T style={styles.rev}>Hôm nay: <T style={styles.revNum}>{fmtVnd(revenue.today)}</T></T>
              <T style={styles.rev}>Tháng này: <T style={styles.revNum}>{fmtVnd(revenue.month)}</T></T>
              <T style={styles.rev}>Tổng: <T style={styles.revNum}>{fmtVnd(revenue.total)}</T></T>
            </>
          ) : (
            <T style={styles.muted}>Đang tải…</T>
          )}
        </View>
      )}

      {tab === 'adjust' && (
        <View style={{ gap: 8 }}>
          <Input testID="admin-adjust-user" value={user} onChangeText={setUser} placeholder="Tên đăng nhập" />
          <Input testID="admin-adjust-delta" value={delta} onChangeText={setDelta} keyboardType="numbers-and-punctuation" placeholder="Số Ruby (âm để trừ), vd 100 hoặc -50" />
          <Input testID="admin-adjust-reason" value={reason} onChangeText={setReason} placeholder="Lý do (bắt buộc)" maxLength={100} />
          <Button testID="admin-adjust-save" small title="Lưu" disabled={busy || !user.trim() || !reason.trim() || !/^-?\d+$/.test(delta.trim()) || Number(delta) === 0} onPress={adjust} />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: C.mist, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: C.ink },
  tabText: { fontWeight: '800', fontSize: 13 },
  muted: { color: C.muted, fontSize: 13 },
  msg: { backgroundColor: '#D8F8E3', padding: 8, borderRadius: 10, fontWeight: '700', overflow: 'hidden' },
  card: { backgroundColor: C.mist, borderRadius: 14, padding: 10, gap: 6, borderWidth: 2, borderColor: C.ink },
  cardTitle: { fontWeight: '900', fontSize: 15 },
  code: { fontWeight: '900', color: C.son },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    fontFamily: FONT, backgroundColor: C.paper, borderRadius: 10, paddingHorizontal: 10, height: 42, fontSize: 16, color: C.ink,
    borderWidth: 2, borderColor: C.ink, fontWeight: '600',
  },
  rev: { fontSize: 16 },
  revNum: { fontWeight: '900', color: C.son },
});
