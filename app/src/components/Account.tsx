/** Đăng nhập / tạo tài khoản / sửa hồ sơ (lưu thành tích trên server) */
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { GAME_INFO, type GameType, type PublicUser } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { AVATARS, avatarOf } from '../avatars';
import { C, FONT, sticker } from '../theme';
import { Button, Card, T } from '../ui';
import { Sheet } from './Sheet';

function AvatarPicker({ value, onChange, disabled = false }: { value: number; onChange: (i: number) => void; disabled?: boolean }) {
  return (
    <View style={styles.avatars}>
      {AVATARS.map((a, i) => (
        <Pressable
          key={i}
          testID={`avatar-pick-${i}`}
          accessibilityRole="button"
          accessibilityState={{ selected: value === i, disabled }}
          disabled={disabled}
          onPress={() => onChange(i)}
          style={[styles.pick, { backgroundColor: a.bg }, value === i && styles.pickOn, disabled && { opacity: 0.45 }]}
        >
          <Text style={{ fontSize: 22 }}>{a.emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function UserAvatar({ avatar, avatarUrl, size = 60 }: { avatar: number; avatarUrl?: string; size?: number }) {
  const fallback = avatarOf(avatar);
  return (
    <View style={[styles.userAvatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: fallback.bg }]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={{ width: '100%', height: '100%', borderRadius: size / 2 }} resizeMode="cover" />
      ) : (
        <Text style={{ fontSize: size * 0.56 }}>{fallback.emoji}</Text>
      )}
    </View>
  );
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
  const [avatar, setAvatar] = useState(() => Math.floor(Math.random() * AVATARS.length));
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
      </View>
      <T style={styles.label}>Hoặc dùng mặt đại diện có sẵn</T>
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

const ORDER: GameType[] = ['wordchain', 'baucua', 'typhu', 'ludo'];

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
  pick: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  pickOn: { ...sticker(2), transform: [{ scale: 1.12 }] },
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
