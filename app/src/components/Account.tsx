/** Đăng nhập / tạo tài khoản / sửa hồ sơ (lưu thành tích trên server) */
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GAME_INFO, MAX_NAME, type GameType, type PublicUser, type RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { AVATAR_PRESETS, type PortraitSource } from '../avatars';
import { Portrait } from './Avatar';
import { SERVER_URL } from '../config';
import { C, FONT } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Sheet } from './Sheet';
import { authText } from '../messages';
import { WalletSheet } from './Wallet';
import { AdminSheet } from './Admin';

function AvatarPicker({ value, onChange, disabled = false }: { value: number; onChange: (i: number) => void; disabled?: boolean }) {
  return (
    <View style={styles.avatars}>
      {AVATAR_PRESETS.map((_, i) => (
        <Pressable
          key={i}
          testID={`avatar-pick-${i}`}
          accessibilityRole="button"
          accessibilityLabel={`Chân dung ${i + 1}`}
          accessibilityState={{ selected: value === i, disabled }}
          disabled={disabled}
          onPress={() => onChange(i)}
          style={[styles.pick, value === i && styles.pickOn, disabled && { opacity: 0.45 }]}
        >
          <Portrait p={{ avatar: i }} size={46} border={value === i ? 3 : 1.5} />
        </Pressable>
      ))}
    </View>
  );
}

function UserAvatar({ avatar, avatarUrl, size = 60 }: { avatar: number; avatarUrl?: string; size?: number }) {
  return <Portrait p={{ avatar, avatarUrl }} size={size} />;
}

/** Server cũ không có trường avatarUploads (hoặc không gọi được): vẫn hiện nút tải ảnh. */
function useAvatarUploads(): boolean {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    let alive = true;
    fetch(`${SERVER_URL}/health`)
      .then((r) => r.json())
      .then((j: { avatarUploads?: unknown; photoUploads?: unknown }) => {
        // photoUploads: server nhận ảnh của khách (giữ tạm nếu thiếu Cloudinary); server cũ chỉ có avatarUploads
        if (alive && j.avatarUploads === false && j.photoUploads !== true) setOk(false);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return ok;
}

function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const { label, style, ...rest } = props;
  return (
    <View style={{ gap: 4 }}>
      <T style={styles.label}>{label}</T>
      <TextInput placeholderTextColor={C.muted} autoCorrect={false} autoCapitalize="none" style={[styles.input, style]} {...rest} />
    </View>
  );
}

export function AuthSheet({ game, initial, defaultName, onClose }: {
  game: Game; initial: 'login' | 'register'; defaultName: string; onClose: () => void;
}) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initial);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [displayName, setDisplayName] = useState(defaultName);
  const [avatar, setAvatar] = useState(() => Math.floor(Math.random() * AVATAR_PRESETS.length));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // quên mật khẩu: bước 1 nhập email/tên, bước 2 nhập mã + mật khẩu mới
  const [who, setWho] = useState('');
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);
  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const mismatch = (mode === 'register' || (mode === 'forgot' && sent)) && password2.length > 0 && password !== password2;
  const switchMode = (m: 'login' | 'register' | 'forgot') => {
    setMode(m);
    setError(null);
    setPassword('');
    setPassword2('');
  };

  const submit = async () => {
    if (mode === 'register' && password !== password2) return setError('Hai mật khẩu chưa khớp.');
    setBusy(true);
    const err =
      mode === 'login'
        ? await game.login(username.trim(), password)
        : await game.register({ username: username.trim(), email: email.trim(), password, displayName: displayName.trim(), avatar });
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const err = await game.forgotPassword(who);
    setBusy(false);
    if (err) return setError(err);
    setSent(true);
    setWait(60);
  };

  const reset = async () => {
    if (password !== password2) return setError('Hai mật khẩu chưa khớp.');
    setBusy(true);
    setError(null);
    const err = await game.resetPassword(who, code, password);
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  if (mode === 'forgot') {
    return (
      <Sheet title="Quên mật khẩu" onClose={onClose}>
        <Field
          testID="forgot-who"
          label="Email hoặc tên đăng nhập"
          value={who}
          onChangeText={(t) => setWho(t.replace(/\s/g, ''))}
          placeholder="vd: ten@gmail.com"
          keyboardType="email-address"
          editable={!sent}
        />
        {!sent ? (
          <Button testID="forgot-send" title={busy ? 'Đang gửi…' : 'Gửi mã qua email'} disabled={busy || who.length < 3} onPress={sendCode} />
        ) : (
          <>
            <T testID="forgot-sent" style={styles.okNote}>
              Nếu thông tin đúng, mã 6 số đã được gửi tới email của tài khoản (hết hạn sau 10 phút). Xem cả hộp thư Spam nhé.
            </T>
            <Field
              testID="forgot-code"
              label="Mã trong thư"
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 chữ số"
              keyboardType="number-pad"
              maxLength={6}
            />
            <Field testID="forgot-password" label="Mật khẩu mới" value={password} onChangeText={setPassword} placeholder="ít nhất 6 ký tự" secureTextEntry maxLength={72} />
            <Field testID="forgot-password2" label="Nhập lại mật khẩu mới" value={password2} onChangeText={setPassword2} secureTextEntry maxLength={72} onSubmitEditing={reset} />
            {mismatch && <T testID="auth-mismatch" style={styles.mismatch}>Hai mật khẩu chưa khớp</T>}
            <Button
              testID="forgot-submit"
              title={busy ? 'Đang xử lý…' : 'Đặt lại mật khẩu'}
              disabled={busy || code.length !== 6 || password.length < 6 || password !== password2}
              onPress={reset}
            />
            <Button
              testID="forgot-resend"
              small
              variant="paper"
              title={wait > 0 ? `Gửi lại mã sau ${wait} giây` : 'Gửi lại mã'}
              disabled={busy || wait > 0}
              onPress={sendCode}
            />
          </>
        )}
        {error && <T testID="auth-error" style={styles.error}>{error}</T>}
        <Pressable testID="forgot-back" onPress={() => { setSent(false); setCode(''); switchMode('login'); }} hitSlop={6}>
          <T style={styles.link}>‹ Quay lại đăng nhập</T>
        </Pressable>
      </Sheet>
    );
  }

  return (
    <Sheet title={mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} onClose={onClose}>
      <View style={styles.tabs}>
        {(['login', 'register'] as const).map((m) => (
          <Pressable
            key={m}
            testID={`auth-tab-${m}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            onPress={() => switchMode(m)}
            style={[styles.tab, mode === m && styles.tabOn]}
          >
            <T style={[styles.tabText, mode === m && { color: C.gold }]}>{m === 'login' ? 'Đăng nhập' : 'Tạo mới'}</T>
          </Pressable>
        ))}
      </View>
      <Field
        testID="auth-username"
        label={mode === 'login' ? 'Tên đăng nhập hoặc email' : 'Tên đăng nhập'}
        value={username}
        onChangeText={(t) => setUsername(mode === 'login' ? t.replace(/\s/g, '') : t.toLowerCase().replace(/\s/g, ''))}
        placeholder={mode === 'login' ? 'vd: phuoc_lay hoặc ten@gmail.com' : 'vd: phuoc_lay'}
        maxLength={mode === 'login' ? 100 : 20}
        keyboardType={mode === 'login' ? 'email-address' : 'default'}
      />
      {mode === 'register' && (
        <Field
          testID="auth-email"
          label="Email (để lấy lại mật khẩu khi quên)"
          value={email}
          onChangeText={(t) => setEmail(t.replace(/\s/g, ''))}
          placeholder="vd: ten@gmail.com"
          keyboardType="email-address"
          maxLength={100}
        />
      )}
      <Field
        testID="auth-password"
        label="Mật khẩu"
        value={password}
        onChangeText={setPassword}
        placeholder="ít nhất 6 ký tự"
        secureTextEntry
        maxLength={72}
        onSubmitEditing={mode === 'login' ? submit : undefined}
      />
      {mode === 'login' && (
        <Pressable testID="forgot-link" onPress={() => { setWho(username); switchMode('forgot'); }} hitSlop={6} style={{ alignSelf: 'flex-end' }}>
          <T style={styles.link}>Quên mật khẩu?</T>
        </Pressable>
      )}
      {mode === 'register' && (
        <>
          <Field testID="auth-password2" label="Nhập lại mật khẩu" value={password2} onChangeText={setPassword2} secureTextEntry maxLength={72} />
          {mismatch && <T testID="auth-mismatch" style={styles.mismatch}>Hai mật khẩu chưa khớp</T>}
          <Field
            testID="auth-name"
            label="Tên hiển thị trong game"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="vd: Phước"
            autoCapitalize="words"
            maxLength={24}
          />
          <T style={styles.label}>Chọn mặt đại diện</T>
          <AvatarPicker value={avatar} onChange={setAvatar} />
        </>
      )}
      {error && <T testID="auth-error" style={styles.error}>{error}</T>}
      <Button
        testID="auth-submit"
        title={busy ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        disabled={
          busy || !username || !password ||
          (mode === 'register' && (!displayName.trim() || !email.includes('@') || password !== password2))
        }
        onPress={submit}
      />
      <T style={styles.note}>Tài khoản giúp lưu tên, mặt đại diện, Ruby và thành tích các ván đã chơi.</T>
    </Sheet>
  );
}

/** câu báo sai mật khẩu (đổi email cần mật khẩu hiện tại) */
const authTextWrong = authText.wrong_credentials;

/** Email và đổi mật khẩu trong hồ sơ (chỉ tài khoản) */
function AccountSecurity({ game, user }: { game: Game; user: PublicUser }) {
  const [email, setEmail] = useState(user.email ?? '');
  const [editing, setEditing] = useState(!user.email);
  const [emailPw, setEmailPw] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const saveEmail = async () => {
    setBusy(true);
    const err = await game.setEmail(email, user.email ? emailPw : undefined);
    setBusy(false);
    setMsg(err ? { ok: false, text: err === authTextWrong ? 'Mật khẩu chưa đúng.' : err } : { ok: true, text: 'Đã lưu email.' });
    if (!err) {
      setEditing(false);
      setEmailPw('');
    }
  };
  const savePw = async () => {
    if (pw !== pw2) return setMsg({ ok: false, text: 'Hai mật khẩu chưa khớp.' });
    setBusy(true);
    const err = await game.changePassword(oldPw, pw);
    setBusy(false);
    setMsg(err ? { ok: false, text: err } : { ok: true, text: 'Đã đổi mật khẩu. Các máy khác đã bị đăng xuất.' });
    if (!err) {
      setOldPw('');
      setPw('');
      setPw2('');
      setOpen(false);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {!user.email && <T testID="profile-email-missing" style={styles.warnNote}>Thêm email để lấy lại mật khẩu khi quên.</T>}
      {editing ? (
        <View style={{ gap: 6 }}>
          <Field testID="profile-email" label="Email" value={email} onChangeText={(t) => setEmail(t.replace(/\s/g, ''))} keyboardType="email-address" maxLength={100} />
          {user.email && (
            <Field testID="profile-email-password" label="Mật khẩu hiện tại (để đổi email)" value={emailPw} onChangeText={setEmailPw} secureTextEntry maxLength={72} />
          )}
          <Button testID="profile-email-save" small variant="paper" title="Lưu email" disabled={busy || !email.includes('@') || (!!user.email && emailPw.length < 6)} onPress={saveEmail} />
        </View>
      ) : (
        <View style={styles.emailRow}>
          <T style={{ flex: 1 }}>📧 {user.email}</T>
          <Button small variant="paper" title="Sửa" onPress={() => setEditing(true)} />
        </View>
      )}
      {open ? (
        <View style={{ gap: 6 }}>
          <Field testID="pw-old" label="Mật khẩu hiện tại" value={oldPw} onChangeText={setOldPw} secureTextEntry maxLength={72} />
          <Field testID="pw-new" label="Mật khẩu mới" value={pw} onChangeText={setPw} secureTextEntry maxLength={72} />
          <Field testID="pw-new2" label="Nhập lại mật khẩu mới" value={pw2} onChangeText={setPw2} secureTextEntry maxLength={72} />
          {pw2.length > 0 && pw !== pw2 && <T style={styles.mismatch}>Hai mật khẩu chưa khớp</T>}
          <Button testID="pw-save" small variant="paper" title="Đổi mật khẩu" disabled={busy || !oldPw || pw.length < 6 || pw !== pw2} onPress={savePw} />
        </View>
      ) : (
        <Button testID="pw-open" small variant="paper" icon="🔑" title="Đổi mật khẩu" onPress={() => setOpen(true)} />
      )}
      {msg && <T style={msg.ok ? styles.okNote : styles.error}>{msg.text}</T>}
    </View>
  );
}

/**
 * Sửa hồ sơ ở bất cứ đâu (trang chủ, phòng chờ, giữa ván): tên, ảnh tự tải lên, mặt đại diện có sẵn.
 * Dùng chung cho khách và người có tài khoản. Đổi ngay giữa ván cũng được, mọi người thấy liền.
 */
export function ProfileSheet({ game, room, initialName, onClose }: {
  game: Game; room?: RoomState | null; initialName?: string; onClose: () => void;
}) {
  const user = game.user;
  const mePlayer = room?.players.find((p) => p.id === game.me);
  const [displayName, setDisplayName] = useState(user?.displayName ?? mePlayer?.name ?? initialName ?? '');
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sub, setSub] = useState<'wallet' | 'admin' | null>(null);
  const canUpload = useAvatarUploads();
  const feed = useFeed();

  // chân dung đang dùng: trong phòng lấy đúng như mọi người đang thấy
  const portrait: PortraitSource = mePlayer
    ? mePlayer
    : user
      ? { avatar: user.avatar, avatarUrl: user.avatarUrl }
      : { avatar: game.guest.avatar ?? 0, avatarUrl: game.guest.avatarUrl };
  const avatarNow = mePlayer?.avatar ?? user?.avatar ?? game.guest.avatar ?? -1;
  const hasPhoto = !!portrait.avatarUrl;
  const playing = room?.phase === 'playing';

  const saveName = async () => {
    const name = displayName.trim();
    if (!name) return setError('Tên không được để trống.');
    setBusy(true);
    setError(null);
    const err = await game.saveProfile({ name });
    setBusy(false);
    if (err) setError(err);
    else {
      feed('Đã đổi tên ✏️', 'good');
      onClose();
    }
  };

  const pickAvatar = async (avatar: number) => {
    setBusy(true);
    setError(null);
    const err = await game.saveProfile({ avatar });
    setBusy(false);
    if (err) setError(err);
    else setNote('Đã đổi mặt đại diện.');
  };

  const choosePhoto = async () => {
    setError(null);
    setNote(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: Platform.OS !== 'web',
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    const err = await game.changePhoto({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      file: asset.file,
      base64: asset.base64,
    });
    setUploading(false);
    if (err) setError(err);
    else setNote('Đã đổi ảnh đại diện 📸');
  };

  const removePhoto = async () => {
    setBusy(true);
    setError(null);
    const err = await game.removePhoto();
    setBusy(false);
    if (err) setError(err);
    else setNote('Đã bỏ ảnh, dùng lại mặt đại diện.');
  };

  if (sub === 'wallet') return <WalletSheet game={game} onClose={() => setSub(null)} />;
  if (sub === 'admin') return <AdminSheet game={game} onClose={() => setSub(null)} />;

  return (
    <Sheet title="Sửa tên & ảnh" onClose={onClose}>
      <View testID="profile-sheet" style={styles.photoRow}>
        <Portrait p={portrait} size={76} />
        <View style={{ flex: 1, gap: 6 }}>
          {canUpload && (
            <Button
              testID="avatar-upload"
              small
              variant="gold"
              icon="📷"
              title={uploading ? 'Đang tải ảnh…' : hasPhoto ? 'Đổi ảnh khác' : 'Tải ảnh của bạn'}
              disabled={uploading || busy}
              onPress={choosePhoto}
            />
          )}
          {hasPhoto && (
            <Button testID="avatar-remove" small variant="paper" title="Bỏ ảnh" disabled={uploading || busy} onPress={removePhoto} />
          )}
          <T style={styles.photoNote}>
            {canUpload ? 'JPG, PNG hoặc WebP. Ảnh được cắt vuông, đổi lúc nào cũng được, kể cả giữa ván.' : 'Chọn một mặt đại diện bên dưới.'}
          </T>
        </View>
      </View>

      <Field
        testID="profile-name"
        label="Tên hiển thị"
        value={displayName}
        onChangeText={(t) => {
          setDisplayName(t);
          setError(null);
        }}
        autoCapitalize="words"
        maxLength={MAX_NAME}
        onSubmitEditing={saveName}
        returnKeyType="done"
      />

      <T style={styles.label}>{hasPhoto ? 'Hoặc dùng mặt đại diện có sẵn (sẽ thay ảnh)' : 'Mặt đại diện có sẵn'}</T>
      <AvatarPicker
        disabled={uploading || busy}
        value={hasPhoto ? -1 : avatarNow}
        onChange={async (value) => {
          if (hasPhoto) await game.removePhoto();
          await pickAvatar(value);
        }}
      />
      {room?.phase === 'lobby' && <T style={styles.photoNote}>Muốn chỉnh tóc, mặt, trang phục chi tiết? Dùng bảng “Tạo hình nhân vật” trong phòng chờ.</T>}
      {note && <T testID="profile-note" style={styles.okNote}>{note}</T>}
      {error && <T testID="profile-error" style={styles.error}>{error}</T>}
      <Button testID="profile-save" title={busy ? 'Đang lưu…' : 'Lưu tên'} disabled={busy || uploading || !displayName.trim()} onPress={saveName} />
      {user && (
        <View testID="profile-wallet" style={styles.rubyRow}>
          <T style={styles.rubyText}>💎 {(user.ruby ?? 0).toLocaleString('vi-VN')} Ruby</T>
          {user.admin && <Button testID="admin-open" small variant="ink" title="🛠 Quản trị" onPress={() => setSub('admin')} />}
          <Button testID="wallet-open-profile" small variant="gold" title="Nạp / lịch sử" onPress={() => setSub('wallet')} />
        </View>
      )}
      {user && <AccountSecurity game={game} user={user} />}
      {user && (
        <Button
          testID="logout-btn"
          title={room ? 'Đăng xuất (sẽ rời phòng)' : 'Đăng xuất'}
          variant="paper"
          disabled={busy || uploading || playing}
          onPress={async () => {
            await game.logout();
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

/** Thẻ của khách ở trang chủ: chân dung + nút sửa tên & ảnh */
export function GuestAvatarButton({ game, onPress }: { game: Game; onPress: () => void }) {
  return (
    <Pressable testID="guest-profile-edit" accessibilityRole="button" accessibilityLabel="Sửa tên và ảnh" onPress={onPress} style={styles.guestAvatar}>
      <Portrait p={{ avatar: game.guest.avatar ?? 0, avatarUrl: game.guest.avatarUrl }} size={52} />
      <T style={styles.editBadge}>✏️</T>
    </Pressable>
  );
}

const ORDER: GameType[] = ['wordchain', 'wordchain_en', 'baucua', 'typhu'];

export function ProfileCard({ user, onEdit, onWallet, onAdmin }: { user: PublicUser; onEdit: () => void; onWallet?: () => void; onAdmin?: () => void }) {
  const played = Object.values(user.stats).reduce((s, x) => s + (x?.played ?? 0), 0);
  const won = Object.values(user.stats).reduce((s, x) => s + (x?.won ?? 0), 0);
  return (
    <Card style={{ gap: 10 }}>
      <View testID="profile-card" style={styles.profileRow}>
        <UserAvatar avatar={user.avatar} avatarUrl={user.avatarUrl} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T style={styles.pname}>{user.displayName}</T>
          <T style={styles.puser}>@{user.username}</T>
          <T style={styles.pstat}>{played} ván · {won} lần thắng</T>
        </View>
        <Button testID="profile-edit" small variant="paper" title="Sửa" onPress={onEdit} />
      </View>
      {onWallet && (
        <View style={styles.rubyRow}>
          <T testID="home-ruby" style={styles.rubyText}>💎 {(user.ruby ?? 0).toLocaleString('vi-VN')} Ruby</T>
          {user.admin && onAdmin && <Button testID="admin-open-home" small variant="ink" title="🛠 Quản trị" onPress={onAdmin} />}
          <Button testID="wallet-open" small variant="gold" title="Nạp Ruby" onPress={onWallet} />
        </View>
      )}
      {played > 0 && (
        <View style={styles.statRow}>
          {ORDER.filter((g) => user.stats[g]?.played).map((g) => (
            <T key={g} style={styles.statChip}>
              {GAME_INFO[g].name}: {user.stats[g]!.won}/{user.stats[g]!.played}
            </T>
          ))}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', backgroundColor: C.mist, borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: C.ink },
  tabText: { fontWeight: '800', fontSize: 15 },
  label: { fontSize: 14, fontWeight: '800', color: C.muted },
  input: {
    fontFamily: FONT, backgroundColor: C.mist, borderRadius: 12, paddingHorizontal: 12, height: 48,
    fontSize: 17, color: C.ink, borderWidth: 2, borderColor: C.ink, fontWeight: '600',
  },
  error: { color: C.ink, backgroundColor: '#FFD6D6', padding: 8, borderRadius: 10, fontWeight: '700', overflow: 'hidden' },
  note: { fontSize: 12, color: C.muted, textAlign: 'center' },
  avatars: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  pick: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  pickOn: { transform: [{ scale: 1.12 }], shadowColor: C.ink, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 0 },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: C.ink },
  userAvatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2.5, borderColor: C.ink, overflow: 'hidden' },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoNote: { fontSize: 11, color: C.muted, lineHeight: 15 },
  mismatch: { color: C.danger, fontWeight: '800', fontSize: 13 },
  link: { color: C.son, fontWeight: '800', fontSize: 14, textDecorationLine: 'underline' },
  warnNote: { color: C.ink, backgroundColor: C.gold, padding: 8, borderRadius: 10, fontWeight: '700', overflow: 'hidden' },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rubyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  rubyText: { flex: 1, fontSize: 17, fontWeight: '900', color: C.son },
  okNote: { color: C.ink, backgroundColor: '#D8F8E3', padding: 8, borderRadius: 10, fontWeight: '700', overflow: 'hidden' },
  guestAvatar: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  editBadge: { position: 'absolute', right: -4, bottom: -4, fontSize: 16 },
  pname: { fontSize: 20, fontWeight: '900' },
  puser: { fontSize: 13, color: C.muted, fontWeight: '600' },
  pstat: { fontSize: 13, color: C.jade, fontWeight: '800' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statChip: { fontSize: 12, fontWeight: '700', backgroundColor: C.mist, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
