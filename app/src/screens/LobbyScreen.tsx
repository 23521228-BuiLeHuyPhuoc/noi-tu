import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import {
  BAUCUA_DEFAULT_ROUNDS, BAUCUA_ROUND_OPTIONS, GAME_INFO, PLAYER_COLORS,
  type CharacterConfig, type GameType, type RoomState,
} from '../../../shared/src/types';
import type { Game } from '../useGame';
import { ACCESSORY_OPTIONS, AGE_OPTIONS, BROW_OPTIONS, BUILD_OPTIONS, DETAIL_OPTIONS, EYE_OPTIONS, FACE_OPTIONS, GENDER_OPTIONS, OUTFIT_OPTIONS, SKIN_NAMES, SKIN_PALETTE, HAIR_OPTIONS, characterSvgUri, playerColorOf } from '../avatars';
import { shareInvite } from '../web';
import { GAME_META, RULES } from '../messages';
import { C, sticker } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';

const GAMES: GameType[] = ['wordchain', 'baucua', 'typhu', 'ludo'];

export function LobbyScreen({ game, room }: { game: Game; room: RoomState }) {
  const [error, setError] = useState<string | null>(null);
  const feed = useFeed();
  const isHost = room.hostId === game.me;
  const info = GAME_INFO[room.gameType];
  const n = room.players.length;
  const tooFew = n < info.min;
  const tooMany = n > info.max;

  const mePlayer = room.players.find((p) => p.id === game.me);
  const myChar: CharacterConfig = mePlayer?.character ?? { gender: 'nam', age: 'tre', hair: 'han', color: 0 };
  const myColor = playerColorOf(myChar.color);

  const updateChar = async (patch: Partial<CharacterConfig>) => {
    const err = await game.customize(patch);
    if (err) feed(err, 'bad');
  };

  const share = async () => {
    const r = await shareInvite(room.code);
    if (r === 'copied') feed('Đã sao chép link mời. Dán vào Zalo hoặc Messenger nhé', 'good');
  };

  const startLabel = tooFew
    ? `Cần ít nhất ${info.min} người`
    : tooMany
      ? `${info.name} tối đa ${info.max} người`
      : n === 1
        ? 'Chơi một mình'
        : `Bắt đầu ${info.name}`;

  return (
    <Shell
      game={game}
      room={room}
      bottom={
        <>
          {error && <T style={styles.error}>{error}</T>}
          {isHost ? (
            <Button
              testID="start-btn"
              title={startLabel}
              disabled={tooFew || tooMany}
              onPress={async () => setError(await game.start())}
            />
          ) : (
            <T style={styles.wait}>Chờ chủ phòng bắt đầu…</T>
          )}
        </>
      }
    >
      <Card style={styles.invite}>
        <T style={styles.label}>Mã phòng</T>
        <T testID="room-code" selectable style={styles.code}>{room.code}</T>
        <Button testID="share-btn" icon="📨" title="Gửi link mời bạn bè" variant="gold" onPress={share} />
        <T style={styles.hint}>
          {n}/{room.maxPlayers} người trong phòng. Chạm vào avatar của bạn bè để chọc họ.
        </T>
      </Card>

      <T style={styles.section}>{isHost ? 'Chọn game' : 'Game của phòng'}</T>
      {isHost ? (
        <View style={styles.games}>
          {GAMES.map((g) => {
            const on = g === room.gameType;
            return (
              <Pressable
                key={g}
                testID={`pick-${g}`}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => game.configure({ gameType: g })}
                style={[styles.pick, sticker(on ? 4 : 2), on && styles.pickOn]}
              >
                <T style={styles.pickEmoji}>{GAME_META[g].emoji}</T>
                <T numberOfLines={1} style={styles.pickName}>{GAME_INFO[g].name}</T>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Card style={styles.chosen}>
          <T style={styles.pickEmoji}>{GAME_META[room.gameType].emoji}</T>
          <T style={styles.chosenName}>{info.name}</T>
        </Card>
      )}

      {room.gameType === 'ludo' && (
        <Card style={{ gap: 10 }}>
          <T style={styles.h3}>Số ngựa mỗi người</T>
          <View style={styles.row}>
            {([2, 4] as const).map((k) => (
              <Button
                key={k}
                testID={`pieces-${k}`}
                small
                variant={room.settings.ludoPieces === k ? 'ink' : 'paper'}
                title={k === 2 ? '2 con (nhanh)' : '4 con (chuẩn)'}
                disabled={!isHost}
                style={{ flex: 1 }}
                onPress={() => game.configure({ settings: { ludoPieces: k } })}
              />
            ))}
          </View>
        </Card>
      )}

      {room.gameType === 'baucua' && (
        <Card style={{ gap: 10 }}>
          <T style={styles.h3}>Số ván chơi (ai nhiều xu nhất thắng)</T>
          <View style={styles.roundRow}>
            {BAUCUA_ROUND_OPTIONS.map((k) => {
              const active = (room.settings.baucuaRounds ?? BAUCUA_DEFAULT_ROUNDS) === k;
              return (
                <Button
                  key={k}
                  testID={`rounds-${k}`}
                  small
                  variant={active ? 'ink' : 'paper'}
                  title={`${k} ván`}
                  disabled={!isHost}
                  style={{ flex: 1, minWidth: 56, paddingHorizontal: 6 }}
                  onPress={() => game.configure({ settings: { baucuaRounds: k } })}
                />
              );
            })}
          </View>
        </Card>
      )}

      <Card style={{ gap: 10 }}>
        <View testID="character-customizer" style={styles.charHeader}>
          <View style={[styles.charPreviewWrap, { borderColor: myColor.hex, backgroundColor: myColor.light }]}>
            <Image source={{ uri: characterSvgUri(myChar) }} style={styles.charPreviewImg} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <T style={styles.h3}>Tạo hình nhân vật</T>
            <T style={styles.charSub}>
              Màu đại diện: <T style={{ fontWeight: '900', color: myColor.hex }}>{myColor.name}</T> (không trùng trong phòng)
            </T>
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Giới tính</T>
          <View style={styles.chipRow}>
            {GENDER_OPTIONS.map((opt) => {
              const active = myChar.gender === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`char-gender-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ gender: opt.id })}
                  style={[styles.optChip, active && { backgroundColor: myColor.hex, borderColor: C.ink }]}
                >
                  <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.icon} {opt.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Độ tuổi & Phong cách</T>
          <View style={styles.chipRow}>
            {AGE_OPTIONS.map((opt) => {
              const active = myChar.age === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`char-age-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ age: opt.id })}
                  style={[styles.optChip, active && { backgroundColor: myColor.hex, borderColor: C.ink }]}
                >
                  <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Kiểu tóc</T>
          <View style={styles.chipRow}>
            {HAIR_OPTIONS.map((opt) => {
              const active = myChar.hair === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`char-hair-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ hair: opt.id })}
                  style={[styles.optChip, active && { backgroundColor: myColor.hex, borderColor: C.ink }]}
                >
                  <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Màu da</T>
          <View style={styles.colorRow}>
            {SKIN_PALETTE.map((hex, i) => {
              const active = myChar.skin === i;
              return (
                <Pressable
                  key={hex}
                  testID={`char-skin-${i}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Da ${SKIN_NAMES[i]}`}
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ skin: i })}
                  style={[styles.colorSwatch, { backgroundColor: hex }, active && styles.colorSwatchActive]}
                >
                  {active && <T style={[styles.swatchMark, i < 3 && { color: C.ink }]}>✓</T>}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Khuôn mặt</T>
          <View style={styles.chipRow}>
            {FACE_OPTIONS.map((opt) => {
              const active = (myChar.face ?? 'xoan') === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`char-face-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ face: opt.id })}
                  style={[styles.optChip, active && { backgroundColor: myColor.hex, borderColor: C.ink }]}
                >
                  <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Dáng người</T>
          <View style={styles.chipRow}>
            {BUILD_OPTIONS.map((opt) => {
              const active = (myChar.build ?? 'vua') === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`char-build-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ build: opt.id })}
                  style={[styles.optChip, active && { backgroundColor: myColor.hex, borderColor: C.ink }]}
                >
                  <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Kiểu mắt</T>
          <View style={styles.chipRow}>
            {EYE_OPTIONS.map((opt) => {
              const active = (myChar.eyes ?? 'macdinh') === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`char-eyes-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ eyes: opt.id })}
                  style={[styles.optChip, active && { backgroundColor: myColor.hex, borderColor: C.ink }]}
                >
                  <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Lông mày</T>
          <View style={styles.chipRow}>
            {BROW_OPTIONS.map((opt) => {
              const active = (myChar.brows ?? 'macdinh') === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`char-brows-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ brows: opt.id })}
                  style={[styles.optChip, active && { backgroundColor: myColor.hex, borderColor: C.ink }]}
                >
                  <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Trang phục 👕</T>
          <View style={styles.chipRow}>
            {OUTFIT_OPTIONS.map((opt) => {
              const active = (myChar.outfit ?? 'none') === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`char-outfit-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ outfit: opt.id })}
                  style={[styles.optChip, active && { backgroundColor: myColor.hex, borderColor: C.ink }]}
                >
                  <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.icon} {opt.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Nét mặt riêng ✨</T>
          <View style={styles.chipRow}>
            {DETAIL_OPTIONS.map((opt) => {
              const active = (myChar.detail ?? 'none') === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`char-detail-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ detail: opt.id })}
                  style={[styles.optChip, active && { backgroundColor: myColor.hex, borderColor: C.ink }]}
                >
                  <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.icon} {opt.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Phụ kiện lầy 😎</T>
          <View style={styles.chipRow}>
            {ACCESSORY_OPTIONS.map((opt) => {
              const active = (myChar.accessory ?? 'none') === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  testID={`char-acc-${opt.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => updateChar({ accessory: opt.id })}
                  style={[styles.optChip, active && { backgroundColor: myColor.hex, borderColor: C.ink }]}
                >
                  <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.icon} {opt.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: 4 }}>
          <T style={styles.optLabel}>Màu sắc quân cờ & viền (mỗi người 1 màu riêng)</T>
          <View style={styles.colorRow}>
            {PLAYER_COLORS.map((c) => {
              const active = myChar.color === c.id;
              const takenBy = room.players.find((p) => p.id !== game.me && p.character?.color === c.id);
              return (
                <Pressable
                  key={c.id}
                  testID={`char-color-${c.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}${takenBy ? ` (đã chọn bởi ${takenBy.name})` : ''}`}
                  accessibilityState={{ selected: active, disabled: !!takenBy }}
                  disabled={!!takenBy}
                  onPress={() => updateChar({ color: c.id })}
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: c.hex },
                    active && styles.colorSwatchActive,
                    takenBy && styles.colorSwatchTaken,
                  ]}
                >
                  {active && <T style={styles.swatchMark}>✓</T>}
                  {takenBy && <T style={styles.swatchLock}>🔒</T>}
                </Pressable>
              );
            })}
          </View>
        </View>
      </Card>

      <Card style={{ gap: 8 }}>
        <T style={styles.h3}>Luật chơi</T>
        {RULES[room.gameType].map((r) => (
          <T key={r} style={styles.rule}>• {r}</T>
        ))}
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  invite: { gap: 8, alignItems: 'stretch' },
  label: { color: C.muted, fontWeight: '700', fontSize: 14, textAlign: 'center' },
  code: { fontSize: 46, fontWeight: '900', letterSpacing: 8, textAlign: 'center', color: C.son, lineHeight: 52 },
  hint: { color: C.muted, fontSize: 14, textAlign: 'center' },
  section: { color: C.onSon, fontWeight: '800', fontSize: 15 },
  games: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  pick: {
    width: '48%', backgroundColor: C.paper, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  pickOn: { backgroundColor: C.gold },
  pickEmoji: { fontSize: 30 },
  pickName: { fontSize: 15, fontWeight: '800', flexShrink: 1 },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chosenName: { fontSize: 22, fontWeight: '900' },
  h3: { fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10 },
  roundRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  charHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  charPreviewWrap: {
    width: 64, height: 64, borderRadius: 32, borderWidth: 3.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  charPreviewImg: { width: '100%', height: '100%' },
  charSub: { fontSize: 13, color: C.muted, fontWeight: '600' },
  optLabel: { fontSize: 12, fontWeight: '800', color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optChip: {
    paddingVertical: 6, paddingHorizontal: 11, borderRadius: 10, backgroundColor: C.mist,
    borderWidth: 1.5, borderColor: '#D0C9B8',
  },
  optChipText: { fontSize: 13, fontWeight: '800', color: C.ink },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingTop: 2 },
  colorSwatch: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 2.5, borderColor: C.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchActive: {
    borderWidth: 3.5, borderColor: C.ink, transform: [{ scale: 1.12 }],
  },
  colorSwatchTaken: { opacity: 0.35 },
  swatchMark: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  swatchLock: { fontSize: 13 },
  rule: { fontSize: 15, lineHeight: 22 },
  wait: { color: C.onSon, textAlign: 'center', fontWeight: '700', paddingVertical: 14 },
  error: { color: C.ink, backgroundColor: C.gold, padding: 8, borderRadius: 10, fontWeight: '700', textAlign: 'center' },
});
