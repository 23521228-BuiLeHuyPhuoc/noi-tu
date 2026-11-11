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
  const [mode, setMode] = useState(initial);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(defaultName);
  const [avatar, setAvatar] = useState(() => Math.floor(Math.random() * AVATAR_PRESETS.length));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    const err =
      mode === 'login'
        ? await game.login(username.trim(), password)
        : await game.register({ username: username.trim(), password, displayName: displayName.trim(), avatar });
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };

  return (
    <Sheet title={mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} onClose={onClose}>
      <View style={styles.tabs}>
        {(['login', 'register'] as const).map((m) => (
          <Pressable
            key={m}
            testID={`auth-tab-${m}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: mode === m }}
            onPress={() => {
              setMode(m);
              setError(null);
            }}
            style={[styles.tab, mode === m && styles.tabOn]}
          >
            <T style={[styles.tabText, mode === m && { color: C.gold }]}>{m === 'login' ? 'Đăng nhập' : 'Tạo mới'}</T>
          </Pressable>
        ))}
      </View>
      <Field
        testID="auth-username"
        label="Tên đăng nhập"
        value={username}
        onChangeText={(t) => setUsername(t.toLowerCase().replace(/\s/g, ''))}
        placeholder="vd: phuoc_lay"
        maxLength={20}
      />
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
      {mode === 'register' && (
        <>
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
        disabled={busy || !username || !password || (mode === 'register' && !displayName.trim())}
        onPress={submit}
      />
      <T style={styles.note}>Tài khoản giúp lưu tên, mặt đại diện và thành tích các ván đã chơi.</T>
    </Sheet>
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

export function ProfileCard({ user, onEdit }: { user: PublicUser; onEdit: () => void }) {
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
  okNote: { color: C.ink, backgroundColor: '#D8F8E3', padding: 8, borderRadius: 10, fontWeight: '700', overflow: 'hidden' },
  guestAvatar: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  editBadge: { position: 'absolute', right: -4, bottom: -4, fontSize: 16 },
  pname: { fontSize: 20, fontWeight: '900' },
  puser: { fontSize: 13, color: C.muted, fontWeight: '600' },
  pstat: { fontSize: 13, color: C.jade, fontWeight: '800' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statChip: { fontSize: 12, fontWeight: '700', backgroundColor: C.mist, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
