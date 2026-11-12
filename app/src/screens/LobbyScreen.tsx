import { useState, type ReactNode } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  AVATAR_PRESET_NAMES, AVATAR_PRESETS,
} from '../../../shared/src/avatars';
import {
  BAUCUA_DEFAULT_ROUNDS, BAUCUA_ROUND_OPTIONS, GAME_INFO, PLAYER_COLORS,
  type CharacterConfig, type CharacterLook, type GameType, type RoomState,
} from '../../../shared/src/types';
import type { Game } from '../useGame';
import {
  ACCESSORY_OPTIONS, AGE_OPTIONS, BROW_OPTIONS, BUILD_OPTIONS, DETAIL_OPTIONS,
  EYE_OPTIONS, FACE_OPTIONS, GENDER_OPTIONS, HAIR_OPTIONS, OUTFIT_OPTIONS,
  SKIN_NAMES, SKIN_PALETTE, characterSvgUri, playerColorOf, randomCharacter,
} from '../avatars';
import { shareInvite } from '../web';
import { GAME_META, RULES } from '../messages';
import { RoomManageCard } from '../components/RoomTools';
import { C, sticker } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';

const GAMES: GameType[] = ['wordchain', 'wordchain_en', 'baucua', 'typhu'];

const PRESET_ORDER: number[] = [
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

type SectionId = 'mat' | 'da' | 'matmay' | 'muimieng' | 'toc' | 'rau' | 'trangphuc' | 'phukien' | 'hinhxam';

export function LobbyScreen({ game, room }: { game: Game; room: RoomState }) {
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    mat: true,
    da: false,
    matmay: false,
    muimieng: false,
    toc: false,
    rau: false,
    trangphuc: false,
    phukien: true,
    hinhxam: false,
  });
  const feed = useFeed();
  const isHost = room.hostId === game.me;
  const info = GAME_INFO[room.gameType];
  const n = room.players.length;
  const tooFew = n < info.min;
  const tooMany = n > info.max;

  const mePlayer = room.players.find((p) => p.id === game.me);
  const myChar: CharacterConfig = mePlayer?.character ?? { gender: 'nam', age: 'tre', hair: 'han', color: 0 };
  const myLook: CharacterLook = myChar.look ?? {};
  const myColor = playerColorOf(myChar.color);

  const toggleSection = (sec: SectionId) => {
    setOpenSections((prev) => ({ ...prev, [sec]: !prev[sec] }));
  };

  const updateChar = async (patch: Partial<CharacterConfig>) => {
    const err = await game.customize(patch);
    if (err) feed(err, 'bad');
  };

  const updateLook = async <K extends keyof CharacterLook>(key: K, val: NonNullable<CharacterLook[K]>) => {
    await updateChar({ look: { ...myLook, [key]: val } });
  };

  const applyFullChar = async (target: CharacterConfig) => {
    await updateChar({
      gender: target.gender,
      age: target.age,
      hair: target.hair,
      skin: target.skin ?? 1,
      face: target.face ?? 'xoan',
      build: target.build ?? 'vua',
      eyes: target.eyes ?? 'macdinh',
      brows: target.brows ?? 'macdinh',
      outfit: target.outfit ?? 'none',
      detail: target.detail ?? 'none',
      accessory: target.accessory ?? 'none',
      color: myChar.color,
      look: target.look ?? {},
    });
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

      <RoomManageCard game={game} room={room} />

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
          <Button
            testID="char-random"
            small
            variant="gold"
            title="🎲 Ngẫu nhiên"
            style={{ paddingHorizontal: 10, minHeight: 40, marginBottom: 0 }}
            onPress={() => applyFullChar(randomCharacter(myChar.color))}
          />
        </View>

        <View style={{ gap: 6 }}>
          <T style={styles.optLabel}>🎭 Nhân vật mẫu (chọn nhanh rồi chỉnh thêm)</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={styles.presetRow}>
            {PRESET_ORDER.map((idx) => {
              const p = AVATAR_PRESETS[idx];
              const isMeme = idx >= 16;
              return (
                <Pressable
                  key={idx}
                  testID={`char-preset-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={AVATAR_PRESET_NAMES[idx]}
                  onPress={() => applyFullChar(p)}
                  style={[styles.presetCard, isMeme && styles.presetCardMeme]}
                >
                  <View style={[styles.presetAvatar, { borderColor: myColor.hex, backgroundColor: myColor.light }]}>
                    <Image source={{ uri: characterSvgUri(p) }} style={styles.charPreviewImg} />
                  </View>
                  <T numberOfLines={2} style={styles.presetName}>{AVATAR_PRESET_NAMES[idx]}</T>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <SectionBox id="mat" title="😊 Mặt (khuôn mặt, hàm, cằm, má, dáng)" open={openSections.mat} onToggle={() => toggleSection('mat')}>
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

          <LookRow
            label="Đường hàm"
            prefix="jaw"
            value={myLook.jaw ?? 'mem'}
            color={myColor.hex}
            options={[{ id: 'mem', label: 'Hàm mềm' }, { id: 'ro', label: 'Hàm góc rõ' }]}
            onPick={(v) => updateLook('jaw', v)}
          />
          <LookRow
            label="Cằm"
            prefix="chin"
            value={myLook.chin ?? 'bo'}
            color={myColor.hex}
            options={[{ id: 'bo', label: 'Cằm bo tròn' }, { id: 'nho', label: 'Cằm nhọn' }, { id: 'rong', label: 'Cằm rộng' }]}
            onPick={(v) => updateLook('chin', v)}
          />
          <LookRow
            label="Gò má"
            prefix="cheek"
            value={myLook.cheek ?? 'day'}
            color={myColor.hex}
            options={[
              { id: 'thon', label: 'Má thon' },
              { id: 'day', label: 'Má đầy' },
              { id: 'phinh', label: 'Má phính' },
              { id: 'go', label: 'Gò má rõ' },
            ]}
            onPick={(v) => updateLook('cheek', v)}
          />
          <LookRow
            label="Trán"
            prefix="forehead"
            value={myLook.forehead ?? 'vua'}
            color={myColor.hex}
            options={[{ id: 'vua', label: 'Trán vừa' }, { id: 'rong', label: 'Trán cao rộng' }]}
            onPick={(v) => updateLook('forehead', v)}
          />
          <LookRow
            label="Cổ"
            prefix="neck"
            value={myLook.neck ?? 'vua'}
            color={myColor.hex}
            options={[{ id: 'thon', label: 'Cổ thon' }, { id: 'vua', label: 'Cổ vừa' }, { id: 'day', label: 'Cổ đầy' }]}
            onPick={(v) => updateLook('neck', v)}
          />
          <LookRow
            label="Độ nghiêng đầu"
            prefix="tilt"
            value={myLook.tilt ?? 'thang'}
            color={myColor.hex}
            options={[{ id: 'thang', label: 'Đầu thẳng' }, { id: 'trai', label: 'Nghiêng trái' }, { id: 'phai', label: 'Nghiêng phải' }]}
            onPick={(v) => updateLook('tilt', v)}
          />
          <LookRow
            label="Dáng nửa người"
            prefix="pose"
            value={myLook.pose ?? 'thang'}
            color={myColor.hex}
            options={[
              { id: 'thang', label: 'Hạ tay tự nhiên' },
              { id: 'baochan', label: 'Khoanh tay' },
              { id: 'chongcam', label: 'Chống cằm' },
              { id: 'chumnguc', label: 'Chắp tay trước ngực' },
            ]}
            onPick={(v) => updateLook('pose', v)}
          />
        </SectionBox>

        <SectionBox id="da" title="🎨 Da (tông da, dáng người, má hồng, nốt ruồi)" open={openSections.da} onToggle={() => toggleSection('da')}>
          <View style={{ gap: 4 }}>
            <T style={styles.optLabel}>Màu da (11 sắc độ tự nhiên)</T>
            <View style={styles.colorRow}>
              {SKIN_PALETTE.map((hex, i) => {
                const active = (myChar.skin ?? 1) === i;
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
                    {active && <T style={[styles.swatchMark, i < 4 && { color: C.ink }]}>✓</T>}
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

          <LookRow
            label="Má hồng trang điểm"
            prefix="maphan"
            value={myLook.maphan ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Tự nhiên' }, { id: 'co', label: 'Má hồng phấn 🌸' }]}
            onPick={(v) => updateLook('maphan', v)}
          />
          <LookRow
            label="Nếp cười hai bên miệng"
            prefix="nepcuoi"
            value={myLook.nepcuoi ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Không' }, { id: 'co', label: 'Có nếp cười rõ' }]}
            onPick={(v) => updateLook('nepcuoi', v)}
          />

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

          <LookRow
            label="Vị trí nốt ruồi duyên"
            prefix="molepos"
            value={myLook.molepos ?? 'ma'}
            color={myColor.hex}
            options={[{ id: 'ma', label: 'Trên má' }, { id: 'moi', label: 'Gần khóe môi' }, { id: 'cam', label: 'Dưới cằm' }]}
            onPick={(v) => updateLook('molepos', v)}
          />
        </SectionBox>

        <SectionBox id="matmay" title="👀 Mắt & mày (dáng mắt, mí, mi, lông mày)" open={openSections.matmay} onToggle={() => toggleSection('matmay')}>
          <View style={{ gap: 4 }}>
            <T style={styles.optLabel}>Biểu cảm mắt</T>
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

          <LookRow
            label="Dáng mắt chi tiết"
            prefix="eyeshape"
            value={myLook.eyeshape ?? 'hanhnhan'}
            color={myColor.hex}
            options={[
              { id: 'hanhnhan', label: 'Hạnh nhân' },
              { id: 'hanhhep', label: 'Hạnh nhân hẹp' },
              { id: 'tron', label: 'Tròn to' },
              { id: 'nho', label: 'Nhỏ nheo' },
              { id: 'hip', label: 'Cười híp' },
            ]}
            onPick={(v) => updateLook('eyeshape', v)}
          />
          <LookRow
            label="Mí mắt"
            prefix="lid"
            value={myLook.lid ?? 'hai'}
            color={myColor.hex}
            options={[{ id: 'hai', label: 'Mí đôi rõ' }, { id: 'mot', label: 'Mí lót / một mí' }]}
            onPick={(v) => updateLook('lid', v)}
          />
          <LookRow
            label="Độ mở mắt"
            prefix="open"
            value={myLook.open ?? 'mo'}
            color={myColor.hex}
            options={[{ id: 'mo', label: 'Mở to tỉnh táo' }, { id: 'tru', label: 'Lim dim ngái ngủ' }, { id: 'nheo', label: 'Nheo lại' }]}
            onPick={(v) => updateLook('open', v)}
          />
          <LookRow
            label="Kẻ mắt & hàng mi"
            prefix="liner"
            value={myLook.liner ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Tự nhiên' }, { id: 'co', label: 'Kẻ mắt đậm + mi cong' }]}
            onPick={(v) => updateLook('liner', v)}
          />
          <LookRow
            label="Màu mắt"
            prefix="eyecolor"
            value={myLook.eyecolor ?? 'den'}
            color={myColor.hex}
            options={[{ id: 'den', label: 'Đen láy' }, { id: 'nau', label: 'Nâu sẫm ấm' }]}
            onPick={(v) => updateLook('eyecolor', v)}
          />
          <LookRow
            label="Hướng nhìn"
            prefix="gaze"
            value={myLook.gaze ?? 'thang'}
            color={myColor.hex}
            options={[{ id: 'thang', label: 'Nhìn thẳng' }, { id: 'trai', label: 'Liếc trái' }, { id: 'phai', label: 'Liếc phải' }]}
            onPick={(v) => updateLook('gaze', v)}
          />
          <LookRow
            label="Độ cân đối tự nhiên"
            prefix="asym"
            value={myLook.asym ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Cân đối' }, { id: 'co', label: 'Bất đối xứng nhẹ tự nhiên' }]}
            onPick={(v) => updateLook('asym', v)}
          />

          <View style={{ gap: 4 }}>
            <T style={styles.optLabel}>Kiểu lông mày</T>
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

          <LookRow
            label="Dáng mày chi tiết"
            prefix="browshape"
            value={myLook.browshape ?? 'cong'}
            color={myColor.hex}
            options={[
              { id: 'ngang', label: 'Mày ngang' },
              { id: 'cong', label: 'Cong nhẹ ở đuôi' },
              { id: 'mem', label: 'Đầu dày đuôi thon' },
              { id: 'gap', label: 'Gấp khúc sắc' },
              { id: 'lieu', label: 'Mày lá liễu' },
            ]}
            onPick={(v) => updateLook('browshape', v)}
          />
          <LookRow
            label="Độ dày lông mày"
            prefix="browthick"
            value={myLook.browthick ?? 'vua'}
            color={myColor.hex}
            options={[{ id: 'mong', label: 'Mảnh' }, { id: 'vua', label: 'Vừa' }, { id: 'day', label: 'Rậm sắc nét' }]}
            onPick={(v) => updateLook('browthick', v)}
          />
        </SectionBox>

        <SectionBox id="muimieng" title="👄 Mũi & miệng (sống mũi, môi, nụ cười)" open={openSections.muimieng} onToggle={() => toggleSection('muimieng')}>
          <LookRow
            label="Sống mũi"
            prefix="nose"
            value={myLook.nose ?? 'vua'}
            color={myColor.hex}
            options={[{ id: 'thap', label: 'Mũi thấp' }, { id: 'vua', label: 'Sống mũi vừa' }, { id: 'ro', label: 'Sống mũi cao rõ' }]}
            onPick={(v) => updateLook('nose', v)}
          />
          <LookRow
            label="Đầu mũi"
            prefix="nosetip"
            value={myLook.nosetip ?? 'tron'}
            color={myColor.hex}
            options={[{ id: 'nho', label: 'Đầu mũi nhỏ' }, { id: 'tron', label: 'Đầu mũi tròn' }, { id: 'day', label: 'Đầu mũi đầy' }]}
            onPick={(v) => updateLook('nosetip', v)}
          />
          <LookRow
            label="Cánh mũi"
            prefix="nostril"
            value={myLook.nostril ?? 'vua'}
            color={myColor.hex}
            options={[{ id: 'hep', label: 'Cánh mũi gọn' }, { id: 'vua', label: 'Vừa' }, { id: 'rong', label: 'Cánh mũi nở' }]}
            onPick={(v) => updateLook('nostril', v)}
          />
          <LookRow
            label="Biểu cảm miệng"
            prefix="mouth"
            value={myLook.mouth ?? 'khep'}
            color={myColor.hex}
            options={[
              { id: 'khep', label: 'Mỉm cười khép môi' },
              { id: 'cuoirang', label: 'Cười lộ răng' },
              { id: 'cuoitu', label: 'Cười tươi rộng' },
              { id: 'he', label: 'Môi hé nhẹ' },
            ]}
            onPick={(v) => updateLook('mouth', v)}
          />
          <LookRow
            label="Độ dày môi"
            prefix="lipthick"
            value={myLook.lipthick ?? 'duoi'}
            color={myColor.hex}
            options={[{ id: 'mong', label: 'Môi mỏng' }, { id: 'duoi', label: 'Môi dưới đầy' }, { id: 'day', label: 'Cả hai môi đầy' }]}
            onPick={(v) => updateLook('lipthick', v)}
          />
          <LookRow
            label="Sắc môi"
            prefix="lipcolor"
            value={myLook.lipcolor ?? 'hongnau'}
            color={myColor.hex}
            options={[{ id: 'hongnau', label: 'Hồng nâu tự nhiên' }, { id: 'cam', label: 'Hồng cam ấm' }, { id: 'do', label: 'Đỏ hồng tươi' }]}
            onPick={(v) => updateLook('lipcolor', v)}
          />
        </SectionBox>

        <SectionBox id="toc" title="💇 Tóc (18 kiểu tóc, ngôi, độ phồng, màu tóc)" open={openSections.toc} onToggle={() => toggleSection('toc')}>
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

          <LookRow
            label="Màu tóc"
            prefix="haircolor"
            value={myLook.haircolor ?? 'den'}
            color={myColor.hex}
            options={[
              { id: 'den', label: 'Đen tự nhiên' },
              { id: 'nauden', label: 'Nâu đen' },
              { id: 'nau', label: 'Nâu hạt dẻ' },
              { id: 'highlight', label: 'Gẩy light sáng' },
            ]}
            onPick={(v) => updateLook('haircolor', v)}
          />
          <LookRow
            label="Ngôi tóc"
            prefix="part"
            value={myLook.part ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Không rẽ ngôi' }, { id: 'lech', label: 'Ngôi lệch rõ' }]}
            onPick={(v) => updateLook('part', v)}
          />
          <LookRow
            label="Độ phồng đỉnh đầu"
            prefix="volume"
            value={myLook.volume ?? 'vua'}
            color={myColor.hex}
            options={[{ id: 'sat', label: 'Ôm sát đầu' }, { id: 'vua', label: 'Phồng vừa' }, { id: 'cao', label: 'Phồng cao dày' }]}
            onPick={(v) => updateLook('volume', v)}
          />
          <LookRow
            label="Hai bên mai"
            prefix="sides"
            value={myLook.sides ?? 'gon'}
            color={myColor.hex}
            options={[{ id: 'gon', label: 'Mai gọn' }, { id: 'sat', label: 'Fade cạo sát' }]}
            onPick={(v) => updateLook('sides', v)}
          />
          <LookRow
            label="Tóc con / tóc mai"
            prefix="babyhair"
            value={myLook.babyhair ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Không' }, { id: 'co', label: 'Có sợi tóc con viền trán' }]}
            onPick={(v) => updateLook('babyhair', v)}
          />
        </SectionBox>

        <SectionBox id="rau" title="🧔 Râu (ria mép, râu cằm, râu quai nón)" open={openSections.rau} onToggle={() => toggleSection('rau')}>
          <LookRow
            label="Ria mép"
            prefix="ria"
            value={myLook.ria ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Không có' }, { id: 'manh', label: 'Ria mảnh' }, { id: 'vua', label: 'Ria rõ từng sợi' }]}
            onPick={(v) => updateLook('ria', v)}
          />
          <LookRow
            label="Râu cằm"
            prefix="raucam"
            value={myLook.raucam ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Không có' }, { id: 'manh', label: 'Lún phún' }, { id: 'vua', label: 'Chòm râu cằm rõ' }]}
            onPick={(v) => updateLook('raucam', v)}
          />
          <LookRow
            label="Râu quai nón / dọc hàm"
            prefix="rauham"
            value={myLook.rauham ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Không có' }, { id: 'manh', label: 'Mảnh dọc hàm' }, { id: 'vua', label: 'Rõ dọc quai hàm' }]}
            onPick={(v) => updateLook('rauham', v)}
          />
        </SectionBox>

        <SectionBox id="trangphuc" title="👕 Trang phục (13 kiểu áo & màu áo)" open={openSections.trangphuc} onToggle={() => toggleSection('trangphuc')}>
          <View style={{ gap: 4 }}>
            <T style={styles.optLabel}>Kiểu trang phục</T>
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

          <LookRow
            label="Màu áo thun"
            prefix="outfitcolor"
            value={myLook.outfitcolor ?? 'xanhrung'}
            color={myColor.hex}
            options={[
              { id: 'xanhrung', label: '🌲 Xanh lá đậm' },
              { id: 'mau', label: '🎨 Theo màu đại diện' },
              { id: 'den', label: '⬛ Đen' },
              { id: 'trang', label: '⬜ Trắng kem' },
              { id: 'do', label: '🟥 Đỏ đô' },
              { id: 'vang', label: '🟨 Vàng nghệ' },
              { id: 'xam', label: '🩶 Xám ghi' },
            ]}
            onPick={(v) => updateLook('outfitcolor', v)}
          />
        </SectionBox>

        <SectionBox id="phukien" title="😎 Phụ kiện (kính, mũ, hoa tai, nhẫn, đồng hồ, cờ cầu vồng)" open={openSections.phukien} onToggle={() => toggleSection('phukien')}>
          <View style={{ gap: 4 }}>
            <T style={styles.optLabel}>Phụ kiện đầu, kính & cầu vồng 🏳️‍🌈</T>
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

          <LookRow
            label="Hoa tai"
            prefix="earring"
            value={myLook.earring ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Không đeo' }, { id: 'da', label: '💎 Đính đá sáng' }, { id: 'hoa', label: '🌸 Cụm hoa đá' }]}
            onPick={(v) => updateLook('earring', v)}
          />
          <LookRow
            label="Nhẫn"
            prefix="ring"
            value={myLook.ring ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Không đeo' }, { id: 'hoa', label: '💍 Nhẫn cụm hoa' }]}
            onPick={(v) => updateLook('ring', v)}
          />
          <LookRow
            label="Đồng hồ đeo tay"
            prefix="watch"
            value={myLook.watch ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Không đeo' }, { id: 'bac', label: '⌚ Mặt bạc bản lớn' }, { id: 'toi', label: '⌚ Mặt tối thể thao' }]}
            onPick={(v) => updateLook('watch', v)}
          />
          <LookRow
            label="Găng tay (chống dính đồ ăn)"
            prefix="glove"
            value={myLook.glove ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Tay trần' }, { id: 'co', label: '🧤 Găng nilon trong suốt' }]}
            onPick={(v) => updateLook('glove', v)}
          />
          <LookRow
            label="Tư thế tay"
            prefix="pose"
            value={myLook.pose ?? 'thang'}
            color={myColor.hex}
            options={[
              { id: 'thang', label: 'Bình thường' },
              { id: 'chongcam', label: '💁 Chống cằm' },
              { id: 'chumnguc', label: '🙏 Đan tay trước ngực' },
              { id: 'baochan', label: '💪 Khoanh tay' },
            ]}
            onPick={(v) => updateLook('pose', v)}
          />
        </SectionBox>

        <SectionBox id="hinhxam" title="🐉 Hình xăm (bờ vai & bắp tay)" open={openSections.hinhxam} onToggle={() => toggleSection('hinhxam')}>
          <LookRow
            label="Hình xăm nghệ thuật"
            prefix="tattoo"
            value={myLook.tattoo ?? 'khong'}
            color={myColor.hex}
            options={[{ id: 'khong', label: 'Không xăm' }, { id: 'co', label: 'Có hình xăm mực xanh xám' }]}
            onPick={(v) => updateLook('tattoo', v)}
          />
          <LookRow
            label="Bên vai xăm"
            prefix="tattooside"
            value={myLook.tattooside ?? 'trai'}
            color={myColor.hex}
            options={[{ id: 'trai', label: 'Vai trái' }, { id: 'phai', label: 'Vai phải' }]}
            onPick={(v) => updateLook('tattooside', v)}
          />
          <LookRow
            label="Độ phủ hình xăm"
            prefix="tattoosize"
            value={myLook.tattoosize ?? 'vaibap'}
            color={myColor.hex}
            options={[{ id: 'vai', label: 'Đầu vai' }, { id: 'vaibap', label: 'Từ vai xuống bắp tay trên' }]}
            onPick={(v) => updateLook('tattoosize', v)}
          />
        </SectionBox>

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

function SectionBox({
  id, title, open, onToggle, children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <View style={styles.secBox}>
      <Pressable
        testID={`char-sec-${id}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={styles.secHeader}
      >
        <T style={styles.secTitle}>{title}</T>
        <T style={styles.secArrow}>{open ? '▾' : '▸'}</T>
      </Pressable>
      {open && <View style={styles.secBody}>{children}</View>}
    </View>
  );
}

function LookRow<TVal extends string>({
  label, prefix, value, color, options, onPick,
}: {
  label: string;
  prefix: string;
  value: TVal;
  color: string;
  options: { id: TVal; label: string }[];
  onPick: (val: TVal) => void;
}) {
  return (
    <View style={{ gap: 4 }}>
      <T style={styles.optLabel}>{label}</T>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value === opt.id;
          return (
            <Pressable
              key={opt.id}
              testID={`char-look-${prefix}-${opt.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onPick(opt.id)}
              style={[styles.optChip, active && { backgroundColor: color, borderColor: C.ink }]}
            >
              <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
            </Pressable>
          );
        })}
      </View>
    </View>
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
  charHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  charPreviewWrap: {
    width: 68, height: 68, borderRadius: 34, borderWidth: 3.5, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  charPreviewImg: { width: '100%', height: '100%' },
  charSub: { fontSize: 12, color: C.muted, fontWeight: '600' },
  presetRow: { gap: 8, paddingVertical: 2 },
  presetCard: {
    width: 78, alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 4,
    borderRadius: 12, backgroundColor: C.mist, borderWidth: 1.5, borderColor: '#D0C9B8',
  },
  presetCardMeme: {
    backgroundColor: '#FFF5D6', borderColor: '#D8A21A',
  },
  presetAvatar: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 2, overflow: 'hidden',
  },
  presetName: {
    fontSize: 11, fontWeight: '800', color: C.ink, textAlign: 'center', lineHeight: 13,
  },
  secBox: {
    borderRadius: 14, borderWidth: 1.5, borderColor: '#D8D0C0', backgroundColor: '#FAF6EE', overflow: 'hidden',
  },
  secHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F2EBDC',
  },
  secTitle: { fontSize: 13, fontWeight: '900', color: C.ink, flex: 1 },
  secArrow: { fontSize: 15, fontWeight: '900', color: C.muted, marginLeft: 8 },
  secBody: { padding: 10, gap: 10 },
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
