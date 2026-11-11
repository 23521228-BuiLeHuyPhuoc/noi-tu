/** Đăng nhập / tạo tài khoản / sửa hồ sơ (lưu thành tích trên server) */
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GAME_INFO, type GameType, type PublicUser } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { AVATAR_PRESETS } from '../avatars';
import { Portrait } from './Avatar';
import { SERVER_URL } from '../config';
import { C, FONT } from '../theme';
import { Button, Card, T } from '../ui';
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
      .then((j: { avatarUploads?: unknown }) => {
        if (alive && j.avatarUploads === false) setOk(false);
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

export function ProfileSheet({ game, user, onClose }: { game: Game; user: PublicUser; onClose: () => void }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatar, setAvatar] = useState(user.avatar);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl);
  const [removePhoto, setRemovePhoto] = useState(false);
  const canUpload = useAvatarUploads();
  const save = async () => {
    setBusy(true);
    let err = removePhoto ? await game.removeAvatar() : null;
    if (!err) err = await game.updateProfile({ displayName: displayName.trim(), avatar });
    setBusy(false);
    if (err) setError(err);
    else onClose();
  };
  const choosePhoto = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    const err = await game.uploadAvatar({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      file: asset.file,
    });
    setUploading(false);
    if (err) setError(err);
    else {
      setAvatarPreview(asset.uri);
      setRemovePhoto(false);
    }
  };
  return (
    <Sheet title="Sửa hồ sơ" onClose={onClose}>
      <Field testID="profile-name" label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} autoCapitalize="words" maxLength={24} />
      <View style={styles.photoRow}>
        <UserAvatar avatar={avatar} avatarUrl={avatarPreview} size={72} />
        {canUpload ? (
          <View style={{ flex: 1, gap: 4 }}>
            <Button
              testID="avatar-upload"
              small
              variant="paper"
              title={uploading ? 'Đang tải ảnh…' : 'Chọn ảnh của bạn'}
              disabled={uploading || busy}
              onPress={choosePhoto}
            />
            <T style={styles.photoNote}>JPG, PNG hoặc WebP, tối đa 5 MB. Ảnh được cắt vuông.</T>
          </View>
        ) : (
          <T style={[styles.photoNote, { flex: 1 }]}>Chọn một chân dung bên dưới làm mặt đại diện.</T>
        )}
      </View>
      <T style={styles.label}>{canUpload ? 'Hoặc dùng mặt đại diện có sẵn' : 'Mặt đại diện'}</T>
      <AvatarPicker disabled={uploading || busy} value={avatar} onChange={(value) => {
        setAvatar(value);
        if (avatarPreview) {
          setAvatarPreview(undefined);
          setRemovePhoto(true);
        }
      }} />
      {removePhoto && <T style={styles.photoNote}>Ảnh đã tải sẽ được bỏ khi bạn nhấn Lưu.</T>}
      {error && <T style={styles.error}>{error}</T>}
      <Button testID="profile-save" title="Lưu" disabled={busy || uploading || !displayName.trim()} onPress={save} />
      <Button
        testID="logout-btn"
        title="Đăng xuất"
        variant="paper"
        disabled={busy || uploading}
        onPress={async () => {
          await game.logout();
          onClose();
        }}
      />
    </Sheet>
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
          <T numberOfLines={1} style={styles.pname}>{user.displayName}</T>
          <T numberOfLines={1} style={styles.puser}>@{user.username}</T>
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
  pname: { fontSize: 20, fontWeight: '900' },
  puser: { fontSize: 13, color: C.muted, fontWeight: '600' },
  pstat: { fontSize: 13, color: C.jade, fontWeight: '800' },
  statRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statChip: { fontSize: 12, fontWeight: '700', backgroundColor: C.mist, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, overflow: 'hidden' },
});
