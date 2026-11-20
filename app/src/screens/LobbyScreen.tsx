import { Image } from '../components/Image';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import {
  AVATAR_PRESET_NAMES, AVATAR_PRESETS,
} from '../../../shared/src/avatars';
import {
  BAUCUA_DEFAULT_ROUNDS, BAUCUA_ROUND_OPTIONS, GAME_INFO, PLAYER_COLORS, VOICE_PERSONA_IDS,
  type CharacterConfig, type CharacterLook, type GameType, type RoomState, type TeamId,
} from '../../../shared/src/types';
import { ROOM_THEMES } from '../../../shared/src/themes';
import { DO_VUI_DIFFICULTIES, DO_VUI_TOPICS, type DoVuiDifficulty } from '../../../shared/src/dovui';
import { caroSizeForPlayers } from '../../../shared/src/caro';
import { CA_SAU_ROUND_OPTIONS } from '../../../shared/src/casau';
import { FAMILY_FEUD_ROUND_OPTIONS } from '../../../shared/src/familyfeud-types';
import { whoIsItBoardSize } from '../../../shared/src/whoisit';
import { WORDCHAIN_DIFFICULTIES, WORDCHAIN_RULES, type WordChainDifficulty, type WordChainRule } from '../../../shared/src/pos';
import { CROAK_STAGES } from '../../../shared/src/croaksquad';
import type { Game } from '../useGame';
import {
  ACCESSORY_OPTIONS, AGE_OPTIONS, BROW_OPTIONS, BUILD_OPTIONS, DETAIL_OPTIONS,
  EYE_OPTIONS, FACE_OPTIONS, GENDER_OPTIONS, HAIR_OPTIONS, OUTFIT_OPTIONS,
  SKIN_NAMES, SKIN_PALETTE, characterSvgUri, playerColorOf, randomCharacter,
} from '../avatars';
import { shareInvite } from '../web';
import { VOICE_PERSONA_META } from '../audioAssets';
import { DivaBadge } from '../components/MemeSpeakerFocus';
import { playMemePool, playPersonaPreview } from '../sound';
import { GAME_META, RULES } from '../messages';
import { RoomManageCard } from '../components/RoomTools';
import { C, backdropPalette, sticker } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Shell } from '../components/Shell';
import { EmojiIcon, RubyIcon, UiIcon, splitEdgeEmoji } from '../components/Icons';

const GAMES: GameType[] = [
  'wordchain', 'wordchain_en', 'baucua', 'typhu',
  'masoi', 'giandiep', 've_doan', 'bom_tu', 'do_vui',
  'loto', 'caro', 'croaksquad', 'ca_sau', 'boom_online', 'uno_mercy',
  'family_feud', 'who_is_it',
];

const PRESET_ORDER: number[] = [
  26, 27, 28, 29, 30, 31, 32, 33, 34, 35,
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

type SectionId = 'mat' | 'da' | 'matmay' | 'muimieng' | 'toc' | 'rau' | 'trangphuc' | 'phukien' | 'hinhxam';

export function LobbyScreen({ game, room }: { game: Game; room: RoomState }) {
  const [error, setError] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
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
  const activeThemeId = room.settings.roomTheme ?? game.user?.equipped?.roomTheme ?? 'son_mac_dinh';
  const pal = backdropPalette(activeThemeId);
  const ownedSet = new Set(game.user?.owned ?? []);

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

  const isTeamGame =
    room.gameType === 'family_feud' ||
    room.gameType === 'who_is_it' ||
    (room.gameType === 'boom_online' && room.settings.boomMode === 'teams');
  const teamCap = Math.ceil(Math.max(2, n) / 2);
  const redTeam = room.players.filter((p) => p.team === 'red');
  const blueTeam = room.players.filter((p) => p.team === 'blue');
  const unassignedTeam = room.players.filter((p) => !p.team);
  const myTeam: TeamId | null = mePlayer?.team ?? null;

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
              variant="ink"
              iconNode={<UiIcon name="Play" size={16} color={tooFew || tooMany ? C.muted : C.onSon} strokeWidth={1.65} />}
              title={startLabel}
              disabled={tooFew || tooMany}
              onPress={async () => setError(await game.start())}
            />
          ) : (
            <T style={[styles.wait, { color: pal.muted }]}>Chờ chủ phòng bắt đầu</T>
          )}
        </>
      }
    >
      <Card style={styles.invite}>
        <T style={styles.label}>Mã phòng</T>
        <T testID="room-code" selectable style={styles.code}>{room.code}</T>
        <Button
          testID="share-btn"
          iconNode={<UiIcon name="Share2" size={15} color={C.ink} strokeWidth={1.65} />}
          title="Gửi link mời bạn bè"
          variant="paper"
          onPress={share}
        />
        <T style={styles.hint}>
          {n}/{room.maxPlayers} người trong phòng · Chạm avatar để tương tác
        </T>
      </Card>

      <Card style={{ gap: 6 }}>
        <T style={styles.label}>Chọn nhân vật meme</T>
        <T style={styles.hint}>Ai chọn trước được trước. Chạm lại để nhả giọng.</T>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 }}>
          {VOICE_PERSONA_IDS.map((id) => {
            const owner = room.players.find((player) => player.voice === id);
            const mine = !!owner && owner.id === game.me;
            const disabled = !!owner && !mine;
            const meta = VOICE_PERSONA_META[id];
            return <Pressable key={id} testID={`pick-voice-${id}`} accessibilityRole="button" accessibilityLabel={meta.name}
              accessibilityState={{ disabled, selected: mine }} disabled={disabled} onPress={async () => {
                const error = await game.pickVoice(mine ? null : id);
                if (error) feed(error, 'bad');
                else if (!mine) playPersonaPreview(id, game.me);
              }} style={{ width: '32%', alignItems: 'center', paddingVertical: 6, gap: 2, borderRadius: 10, borderWidth: 1, borderColor: mine ? meta.accent : C.borderSubtle, backgroundColor: mine ? meta.badgeBg : C.paper, opacity: disabled ? 0.65 : 1 }}>
              <DivaBadge persona={id} size={30} />
              <T numberOfLines={1} style={{ fontSize: 12, color: C.ink, fontWeight: '700' }}>{meta.shortName}</T>
              <T numberOfLines={1} style={styles.hint}>{mine ? 'Bạn đã chọn' : owner?.name ?? 'Còn trống'}</T>
            </Pressable>;
          })}
        </View>
      </Card>

      <RoomManageCard game={game} room={room} />

      {/* Hỗ trợ thêm máy chơi cùng trên toàn bộ 15 game */}
      {(isHost || room.players.some((p) => p.bot)) && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <UiIcon name="Bot" size={16} color={C.secondary} strokeWidth={1.65} />
            <T style={styles.h3}>Chơi với máy</T>
          </View>
          {room.players.filter((p) => p.bot).map((p) => (
            <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <T style={{ flex: 1, fontWeight: '500', fontSize: 14 }}>{p.name}</T>
              {isHost && <Button testID={`bot-remove-${p.id}`} small variant="paper" title="Bỏ" onPress={async () => { const e = await game.removeBot(p.id); if (e) feed(e, 'bad'); else playMemePool('eliminated', { speakerId: game.me, cooldownMs: 2000 }); }} />}
            </View>
          ))}
          {isHost && (
            <Button
              testID="bot-add"
              small
              variant="paper"
              iconNode={<UiIcon name="Plus" size={15} color={n >= Math.min(room.maxPlayers, info.max) ? C.muted : C.ink} strokeWidth={1.65} />}
              title={n >= Math.min(room.maxPlayers, info.max) ? `Đã đủ tối đa ${Math.min(room.maxPlayers, info.max)} người` : 'Thêm máy chơi cùng'}
              disabled={n >= Math.min(room.maxPlayers, info.max)}
              onPress={async () => { const e = await game.addBot(); if (e) feed(e, 'bad'); else playMemePool('welcome', { speakerId: game.me, cooldownMs: 2000 }); }}
            />
          )}
        </Card>
      )}

      {isTeamGame && (
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <View style={styles.headIconRow}>
              <UiIcon name="Users" size={16} color={C.ink} strokeWidth={1.65} />
              <T style={styles.h3}>Chọn Đội (Ai bấm sớm vào trước)</T>
            </View>
            {isHost && n >= 2 && (
              <Button
                testID="shuffle-teams-btn"
                small
                variant="paper"
                title="🎲 Trộn đội"
                onPress={async () => {
                  const e = await game.shuffleTeams();
                  if (e) feed(e, 'bad');
                  else playMemePool('turn_move', { speakerId: game.me, cooldownMs: 1200 });
                }}
              />
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {([
              { id: 'red' as const, label: 'ĐỘI ĐỎ', list: redTeam, bg: '#FEF2F2', border: '#DC2626', accent: '#B91C1C' },
              { id: 'blue' as const, label: 'ĐỘI XANH', list: blueTeam, bg: '#EFF6FF', border: '#2563EB', accent: '#1D4ED8' },
            ]).map((tm) => {
              const joined = myTeam === tm.id;
              const full = !joined && tm.list.length >= teamCap;
              return (
                <View key={tm.id} style={{ flex: 1, backgroundColor: tm.bg, borderColor: tm.border, borderWidth: 1.5, borderRadius: 12, padding: 8, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <T style={{ fontSize: 12, fontWeight: '800', color: tm.accent }}>{tm.label}</T>
                    <T style={{ fontSize: 11.5, fontWeight: '800', color: tm.accent }}>{tm.list.length}/{teamCap}</T>
                  </View>
                  <View style={{ gap: 3, minHeight: 28 }}>
                    {tm.list.length === 0 ? (
                      <T style={{ fontSize: 11.5, color: C.muted, fontStyle: 'italic' }}>Chưa có ai…</T>
                    ) : (
                      tm.list.map((p) => (
                        <T key={p.id} numberOfLines={1} style={{ fontSize: 12.5, fontWeight: p.id === game.me ? '800' : '600', color: C.ink }}>
                          {p.id === game.me ? '★ ' : '• '}{p.name}
                        </T>
                      ))
                    )}
                  </View>
                  <Button
                    testID={`pick-team-${tm.id}`}
                    small
                    variant={joined ? 'ink' : 'paper'}
                    disabled={full}
                    title={joined ? '✓ Đang ở đội (Rời)' : full ? 'Đã đủ chỗ' : `Vào ${tm.label}`}
                    onPress={async () => {
                      const e = await game.pickTeam(joined ? null : tm.id);
                      if (e) feed(e, 'bad');
                      else playMemePool('turn_move', { speakerId: game.me, cooldownMs: 1200 });
                    }}
                  />
                </View>
              );
            })}
          </View>
          {unassignedTeam.length > 0 && (
            <T style={{ fontSize: 11.5, color: C.secondary }}>
              Chưa chọn đội ({unassignedTeam.map((p) => p.name).join(', ')}) — sẽ tự chia đều vào 2 đội khi bắt đầu!
            </T>
          )}
        </Card>
      )}

      {(room.gameType === 'wordchain' || room.gameType === 'wordchain_en') && (
        <Card style={{ gap: 10 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META[room.gameType].emoji} size={18} />
            <T style={styles.h3}>Độ khó thời gian & Luật từ loại</T>
          </View>
          <View style={styles.roundRow}>
            {(['easy', 'normal', 'hard', 'hell'] as WordChainDifficulty[]).map((diff) => {
              const m = WORDCHAIN_DIFFICULTIES[diff];
              const active = (room.settings.wordchainDifficulty ?? 'normal') === diff;
              return (
                <Button
                  key={diff}
                  testID={`wc-diff-${diff}`}
                  small
                  variant={active ? 'ink' : 'paper'}
                  title={`${m.emoji} ${m.name}`}
                  disabled={!isHost}
                  style={{ flex: 1, minWidth: 96 }}
                  onPress={() => game.configure({ settings: { wordchainDifficulty: diff } })}
                />
              );
            })}
          </View>
          <View style={styles.roundRow}>
            {(['free', 'noun', 'verb', 'adj', 'no_repeat'] as WordChainRule[]).map((r) => {
              const m = WORDCHAIN_RULES[r];
              const active = (room.settings.wordchainRule ?? 'free') === r;
              return (
                <Button
                  key={r}
                  testID={`wc-rule-${r}`}
                  small
                  variant={active ? 'jade' : 'paper'}
                  title={`${m.emoji} ${m.name}`}
                  disabled={!isHost}
                  style={{ flexGrow: 1, minWidth: 96 }}
                  onPress={() => game.configure({ settings: { wordchainRule: r } })}
                />
              );
            })}
          </View>
        </Card>
      )}

      {room.gameType === 'baucua' && (
        <Card style={{ gap: 10 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.baucua.emoji} size={18} />
            <T style={styles.h3}>Chế độ Bầu Cua & Số ván</T>
          </View>
          <View style={styles.roundRow}>
            {(['classic', 'jackpot'] as const).map((m) => {
              const active = (room.settings.baucuaMode ?? 'classic') === m;
              return (
                <Button
                  key={m}
                  testID={`baucua-mode-${m}`}
                  small
                  variant={active ? 'gold' : 'paper'}
                  title={m === 'classic' ? '🎲 Cổ điển' : '🎰 Lộc Trời ×2/×3 & Tam Hoa'}
                  disabled={!isHost}
                  style={{ flex: 1 }}
                  onPress={() => game.configure({ settings: { baucuaMode: m } })}
                />
              );
            })}
          </View>
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

      {room.gameType === 'typhu' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.typhu.emoji} size={18} />
            <T style={styles.h3}>Chế độ Cờ tỷ phú</T>
          </View>
          <View style={styles.roundRow}>
            {(['classic', 'chaos_festival'] as const).map((m) => {
              const active = (room.settings.typhuMode ?? 'classic') === m;
              return (
                <Button
                  key={m}
                  testID={`typhu-mode-${m}`}
                  small
                  variant={active ? 'ink' : 'paper'}
                  title={m === 'classic' ? '🏛️ Cổ điển truyền thống' : '🔥 Lễ Hội x2, Nổ Hũ & Mua Đứt 160%'}
                  disabled={!isHost}
                  style={{ flex: 1 }}
                  onPress={() => game.configure({ settings: { typhuMode: m } })}
                />
              );
            })}
          </View>
        </Card>
      )}

      {room.gameType === 'masoi' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.masoi.emoji} size={18} />
            <T style={styles.h3}>Bộ vai trò & Nhịp độ Ma sói</T>
          </View>
          <View style={styles.roundRow}>
            {(['classic', 'chaos'] as const).map((preset) => {
              const active = (room.settings.masoiPreset ?? 'classic') === preset;
              return (
                <Button
                  key={preset}
                  testID={`masoi-preset-${preset}`}
                  small
                  variant={active ? 'ink' : 'paper'}
                  title={preset === 'classic' ? '⚖️ Cổ điển cân bằng' : '🔥 Hỗn loạn (có Kẻ Ngố)'}
                  disabled={!isHost}
                  style={{ flex: 1 }}
                  onPress={() => game.configure({ settings: { masoiPreset: preset } })}
                />
              );
            })}
          </View>
          <View style={styles.roundRow}>
            {([
              { id: 'slow', label: '🐢 Thong thả (90s)' },
              { id: 'normal', label: '⚖️ Chuẩn (65s)' },
              { id: 'fast', label: '⚡ Nhanh (40s)' },
            ] as const).map((sp) => {
              const active = (room.settings.masoiSpeed ?? 'normal') === sp.id;
              return (
                <Button
                  key={sp.id}
                  testID={`masoi-speed-${sp.id}`}
                  small
                  variant={active ? 'jade' : 'paper'}
                  title={sp.label}
                  disabled={!isHost}
                  style={{ flex: 1 }}
                  onPress={() => game.configure({ settings: { masoiSpeed: sp.id } })}
                />
              );
            })}
          </View>
        </Card>
      )}

      {room.gameType === 'giandiep' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.giandiep.emoji} size={18} />
            <T style={styles.h3}>Tùy chọn Ai là gián điệp</T>
          </View>
          <View style={styles.roundRow}>
            <Button
              testID="gd-toggle-mrwhite"
              small
              variant={(room.settings.giandiepMrWhite ?? n >= 5) ? 'jade' : 'paper'}
              title={(room.settings.giandiepMrWhite ?? n >= 5) ? 'Mr. White: Bật' : 'Mr. White: Tắt'}
              disabled={!isHost}
              style={{ flex: 1 }}
              onPress={() => game.configure({ settings: { giandiepMrWhite: !(room.settings.giandiepMrWhite ?? n >= 5) } })}
            />
            {([1, 2, 3] as const).map((cnt) => (
              <Button
                key={cnt}
                testID={`gd-spies-${cnt}`}
                small
                variant={(room.settings.giandiepSpies ?? 1) === cnt ? 'ink' : 'paper'}
                title={`${cnt} Điệp`}
                disabled={!isHost}
                onPress={() => game.configure({ settings: { giandiepSpies: cnt } })}
              />
            ))}
          </View>
        </Card>
      )}

      {room.gameType === 've_doan' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.ve_doan.emoji} size={18} />
            <T style={styles.h3}>Số vòng Vẽ & Đoán ({room.players.length} người = {Math.min(24, Math.max(2, room.players.length * (room.settings.veDoanRounds ?? 4)))} lượt)</T>
          </View>
          <View style={styles.roundRow}>
            {[2, 3, 4, 5].map((r) => (
              <Button
                key={r}
                testID={`vd-rounds-${r}`}
                small
                variant={(room.settings.veDoanRounds ?? 4) === r ? 'ink' : 'paper'}
                title={`${r} vòng`}
                disabled={!isHost}
                style={{ flex: 1 }}
                onPress={() => game.configure({ settings: { veDoanRounds: r } })}
              />
            ))}
          </View>
        </Card>
      )}

      {room.gameType === 'do_vui' && (
        <Card style={{ gap: 10 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.do_vui.emoji} size={18} />
            <T style={styles.h3}>Chuyên đề, Độ khó & Số câu</T>
          </View>
          <View style={styles.roundRow}>
            {(['easy', 'medium', 'hard', 'mixed'] as DoVuiDifficulty[]).map((df) => {
              const meta = DO_VUI_DIFFICULTIES[df];
              const active = (room.settings.doVuiDifficulty ?? 'mixed') === df;
              return (
                <Button
                  key={df}
                  testID={`dv-diff-${df}`}
                  small
                  variant={active ? 'gold' : 'paper'}
                  title={`${meta.emoji} ${meta.shortName}`}
                  disabled={!isHost}
                  style={{ flexGrow: 1, minWidth: 96 }}
                  onPress={() => game.configure({ settings: { doVuiDifficulty: df } })}
                />
              );
            })}
          </View>
          <View style={styles.roundRow}>
            {DO_VUI_TOPICS.map((tp) => {
              const active = (room.settings.doVuiTopic ?? 'all') === tp.id;
              return (
                <Button
                  key={tp.id}
                  testID={`dv-topic-${tp.id}`}
                  small
                  variant={active ? 'jade' : 'paper'}
                  title={`${tp.emoji} ${tp.shortName}`}
                  disabled={!isHost}
                  style={{ flexGrow: 1, minWidth: 108 }}
                  onPress={() => game.configure({ settings: { doVuiTopic: tp.id } })}
                />
              );
            })}
          </View>
          <View style={styles.roundRow}>
            {([5, 10, 15, 20] as const).map((q) => (
              <Button
                key={q}
                testID={`dv-questions-${q}`}
                small
                variant={(room.settings.doVuiQuestions ?? 10) === q ? 'ink' : 'paper'}
                title={`${q} câu`}
                disabled={!isHost}
                style={{ flex: 1 }}
                onPress={() => game.configure({ settings: { doVuiQuestions: q } })}
              />
            ))}
          </View>
        </Card>
      )}

      {room.gameType === 'ca_sau' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.ca_sau.emoji} size={18} />
            <T style={styles.h3}>Số hiệp Khám răng cá sấu</T>
          </View>
          <View style={styles.roundRow}>
            {CA_SAU_ROUND_OPTIONS.map((r) => (
              <Button
                key={r}
                testID={`ca-sau-rounds-${r}`}
                small
                variant={(room.settings.caSauRounds ?? 4) === r ? 'ink' : 'paper'}
                title={`${r} hiệp`}
                disabled={!isHost}
                style={{ flex: 1 }}
                onPress={() => game.configure({ settings: { caSauRounds: r } })}
              />
            ))}
          </View>
        </Card>
      )}

      {room.gameType === 'boom_online' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.boom_online.emoji} size={18} />
            <T style={styles.h3}>Chế độ Đặt bom tử chiến</T>
          </View>
          <View style={styles.roundRow}>
            {[
              { mode: 'ffa' as const, label: 'Đấu đơn sinh tồn' },
              { mode: 'teams' as const, label: 'Đấu đội (Đỏ vs Xanh)' },
            ].map((opt) => {
              const active = (room.settings.boomMode ?? 'ffa') === opt.mode;
              return (
                <Button
                  key={opt.mode}
                  testID={`boom-mode-${opt.mode}`}
                  small
                  variant={active ? 'jade' : 'paper'}
                  title={opt.label}
                  disabled={!isHost}
                  style={{ flex: 1 }}
                  onPress={() => game.configure({ settings: { boomMode: opt.mode } })}
                />
              );
            })}
          </View>
          <View style={styles.roundRow}>
            {([1, 3, 5] as const).map((r) => (
              <Button
                key={r}
                testID={`boom-rounds-${r}`}
                small
                variant={(room.settings.boomRounds ?? 3) === r ? 'ink' : 'paper'}
                title={`${r} hiệp`}
                disabled={!isHost}
                style={{ flex: 1 }}
                onPress={() => game.configure({ settings: { boomRounds: r } })}
              />
            ))}
          </View>
        </Card>
      )}

      {room.gameType === 'loto' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.loto.emoji} size={18} />
            <T style={styles.h3}>Kiểu dò vé Lô tô</T>
          </View>
          <View style={styles.roundRow}>
            {[
              { auto: false, label: 'Tự tay chấm số' },
              { auto: true, label: 'Máy tự chấm hộ' },
            ].map((opt) => {
              const active = (room.settings.lotoAutoMark ?? false) === opt.auto;
              return (
                <Button
                  key={String(opt.auto)}
                  testID={`loto-auto-${opt.auto ? 'on' : 'off'}`}
                  small
                  variant={active ? 'ink' : 'paper'}
                  title={opt.label}
                  disabled={!isHost}
                  style={{ flex: 1 }}
                  onPress={() => game.configure({ settings: { lotoAutoMark: opt.auto } })}
                />
              );
            })}
          </View>
        </Card>
      )}

      {room.gameType === 'family_feud' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.family_feud.emoji} size={18} />
            <T style={styles.h3}>Số vòng Khảo sát Xóm Lầy</T>
          </View>
          <View style={styles.roundRow}>
            {FAMILY_FEUD_ROUND_OPTIONS.map((r) => (
              <Button
                key={r}
                testID={`ff-rounds-${r}`}
                small
                variant={(room.settings.familyFeudRounds ?? 3) === r ? 'ink' : 'paper'}
                title={`${r} vòng`}
                disabled={!isHost}
                style={{ flex: 1 }}
                onPress={() => game.configure({ settings: { familyFeudRounds: r } })}
              />
            ))}
          </View>
        </Card>
      )}

      {room.gameType === 'who_is_it' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.who_is_it.emoji} size={18} />
            <T style={styles.h3}>
              Số nhân vật ({whoIsItBoardSize(Math.max(2, n), room.settings.whoIsItDifficulty ?? 'auto')} thẻ)
            </T>
          </View>
          <View style={styles.roundRow}>
            {[
              { mode: 'auto' as const, label: 'Tự động theo người' },
              { mode: 'large' as const, label: 'Bảng lớn (+1 bậc)' },
            ].map((opt) => {
              const active = (room.settings.whoIsItDifficulty ?? 'auto') === opt.mode;
              return (
                <Button
                  key={opt.mode}
                  testID={`wi-mode-${opt.mode}`}
                  small
                  variant={active ? 'ink' : 'paper'}
                  title={opt.label}
                  disabled={!isHost}
                  style={{ flex: 1 }}
                  onPress={() => game.configure({ settings: { whoIsItDifficulty: opt.mode } })}
                />
              );
            })}
          </View>
        </Card>
      )}

      {room.gameType === 'caro' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.caro.emoji} size={18} />
            <T style={styles.h3}>
              Bàn Cờ caro ({Math.min(4, Math.max(2, n))} phe ·{' '}
              {caroSizeForPlayers(Math.min(4, Math.max(2, n)), room.settings.caroSizeMode ?? 'auto')}×
              {caroSizeForPlayers(Math.min(4, Math.max(2, n)), room.settings.caroSizeMode ?? 'auto')})
            </T>
          </View>
          <View style={styles.roundRow}>
            {[
              { mode: 'auto' as const, label: 'Tự mở rộng theo số phe' },
              { mode: 'mega' as const, label: 'Bàn lớn (24 – 32)' },
            ].map((opt) => {
              const active = (room.settings.caroSizeMode ?? 'auto') === opt.mode;
              return (
                <Button
                  key={opt.mode}
                  testID={`caro-size-${opt.mode}`}
                  small
                  variant={active ? 'jade' : 'paper'}
                  title={opt.label}
                  disabled={!isHost}
                  style={{ flex: 1 }}
                  onPress={() => game.configure({ settings: { caroSizeMode: opt.mode } })}
                />
              );
            })}
          </View>
          <View style={styles.roundRow}>
            {[
              { block: true, label: 'Chặn 2 đầu: Bật' },
              { block: false, label: 'Tự do (đủ 5 là thắng)' },
            ].map((opt) => {
              const active = (room.settings.caroBlockTwoEnds ?? true) === opt.block;
              return (
                <Button
                  key={String(opt.block)}
                  testID={`caro-block-${opt.block ? 'on' : 'off'}`}
                  small
                  variant={active ? 'ink' : 'paper'}
                  title={opt.label}
                  disabled={!isHost}
                  style={{ flex: 1 }}
                  onPress={() => game.configure({ settings: { caroBlockTwoEnds: opt.block } })}
                />
              );
            })}
          </View>
        </Card>
      )}

      {room.gameType === 'croaksquad' && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <EmojiIcon emoji={GAME_META.croaksquad.emoji} size={18} />
            <T style={styles.h3}>Màn xuất phát Đầm lầy quái chiêu</T>
          </View>
          <View style={styles.roundRow}>
            {CROAK_STAGES.map((st) => {
              const idx = st.index as 0 | 1 | 2;
              const active = (room.settings.croakStage ?? 0) === idx;
              return (
                <Button
                  key={st.id}
                  testID={`croak-stage-${idx}`}
                  small
                  variant={active ? 'jade' : 'paper'}
                  title={st.name}
                  disabled={!isHost}
                  style={{ flex: 1, minWidth: 120 }}
                  onPress={() => game.configure({ settings: { croakStage: idx } })}
                />
              );
            })}
          </View>
        </Card>
      )}

      <T style={[styles.section, { color: pal.text }]}>{isHost ? 'Chọn game (15 trò chơi)' : 'Game của phòng'}</T>
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
                style={[styles.pick, sticker(on ? 2 : 1), on && styles.pickOn]}
              >
                <View style={[styles.pickIconBox, on && styles.pickIconBoxOn]}>
                  <EmojiIcon emoji={GAME_META[g].emoji} size={24} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T numberOfLines={1} style={[styles.pickName, on && styles.pickNameOn]}>{GAME_INFO[g].name}</T>
                  <T style={[styles.pickPlayers, on && styles.pickPlayersOn]}>{GAME_META[g].players}</T>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <Card style={styles.chosen}>
          <View style={styles.pickIconBox}>
            <EmojiIcon emoji={GAME_META[room.gameType].emoji} size={26} />
          </View>
          <T style={styles.chosenName}>{info.name}</T>
        </Card>
      )}

      {/* Map & Chủ đề màu phòng */}
      {isHost && (
        <Card style={{ gap: 8 }}>
          <View style={styles.headIconRow}>
            <UiIcon name="Map" size={16} color={C.secondary} strokeWidth={1.65} />
            <T style={styles.h3}>Chủ đề bàn chơi</T>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
            {ROOM_THEMES.map((t) => {
              const unlocked = t.price === 0 || ownedSet.has(t.id);
              const selected = activeThemeId === t.id;
              const isDefault = t.id === 'son_mac_dinh';
              return (
                <Pressable
                  key={t.id}
                  testID={`lobby-map-${t.id}`}
                  disabled={!unlocked}
                  onPress={async () => {
                    const e = await game.configure({ settings: { roomTheme: t.id } });
                    if (e) feed(e, 'bad');
                  }}
                  style={[
                    styles.mapChip,
                    {
                      backgroundColor: isDefault ? C.mist : t.bg,
                      borderColor: selected ? (isDefault ? C.ink : t.accent) : (isDefault ? C.borderSubtle : 'rgba(255,255,255,0.22)'),
                    },
                    selected && { borderWidth: 2 },
                    !unlocked && { opacity: 0.45 },
                  ]}
                >
                  <View
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: 5,
                      backgroundColor: isDefault ? C.son : t.accent,
                    }}
                  />
                  <T style={{ fontSize: 12, fontWeight: selected ? '600' : '500', color: isDefault ? C.ink : C.darkText }}>{t.name}</T>
                  {!unlocked && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                      <RubyIcon size={11} />
                      <T style={{ fontSize: 11, fontWeight: '600', color: C.gold, fontVariant: ['tabular-nums'] }}>{t.price}</T>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
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
          <T style={styles.optLabel}>36 nhân vật mẫu (chọn nhanh)</T>
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

        <Button
          testID="char-detail-toggle"
          small
          variant="paper"
          iconNode={<UiIcon name={showDetail ? 'ChevronUp' : 'SlidersHorizontal'} size={15} color={C.ink} />}
          title={showDetail ? 'Thu gọn tủ đồ chi tiết' : 'Mở tủ đồ chi tiết (Mặt, Tóc, Áo, Phụ kiện…)'}
          onPress={() => setShowDetail((v) => !v)}
        />

        {showDetail && (
        <>
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
                    <View style={styles.chipIconRow}>
                      <EmojiIcon emoji={opt.icon} size={15} />
                      <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
                    </View>
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
                    <View style={styles.chipIconRow}>
                      <EmojiIcon emoji={opt.icon} size={15} />
                      <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
                    </View>
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
              { id: 'oicauvong', label: '🤮 Ói cầu vồng' },
              { id: 'rangsun', label: '😬 Nhe răng khịa' },
              { id: 'leluoi', label: '😛 Lè lưỡi trêu' },
              { id: 'hetlon', label: '😱 Hét toáng' },
              { id: 'nhai', label: '😋 Nhai nhồm nhoàm' },
              { id: 'hahoc', label: '😮 Há hốc mồm' },
              { id: 'cuoitu', label: '😁 Cười gian tà' },
              { id: 'cuoirang', label: '😄 Cười lộ răng' },
              { id: 'khep', label: '🙂 Khép môi' },
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
                    <View style={styles.chipIconRow}>
                      <EmojiIcon emoji={opt.icon} size={15} />
                      <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
                    </View>
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
                    <View style={styles.chipIconRow}>
                      <EmojiIcon emoji={opt.icon} size={15} />
                      <T style={[styles.optChipText, active && { color: '#FFF' }]}>{opt.label}</T>
                    </View>
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
                  <T style={styles.swatchMark}>
                    {active ? <UiIcon name="Check" size={14} color="#FFFFFF" strokeWidth={2.2} /> : null}
                  </T>
                  {takenBy && <UiIcon name="Lock" size={12} color="#FFFFFF" strokeWidth={2} />}
                </Pressable>
              );
            })}
          </View>
        </View>
        </>
        )}
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
  const parsed = splitEdgeEmoji(title);
  return (
    <View style={styles.secBox}>
      <Pressable
        testID={`char-sec-${id}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={styles.secHeader}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 }}>
          {parsed.leading && <EmojiIcon emoji={parsed.leading} size={16} />}
          <T style={styles.secTitle}>{parsed.text || title}</T>
        </View>
        <UiIcon name={open ? 'ChevronDown' : 'ChevronRight'} size={16} color={C.muted} />
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
  label: { color: C.secondary, fontWeight: '500', fontSize: 13, textAlign: 'center' },
  code: { fontSize: 38, fontWeight: '600', letterSpacing: 6, textAlign: 'center', color: C.ink, lineHeight: 46, fontVariant: ['tabular-nums'] },
  hint: { color: C.muted, fontSize: 12.5, textAlign: 'center', fontVariant: ['tabular-nums'] },
  section: { color: C.ink, fontWeight: '600', fontSize: 15 },
  games: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 },
  pick: {
    width: '48.8%',
    backgroundColor: C.paper,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickOn: { backgroundColor: C.ink, borderColor: C.ink },
  pickIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: C.mist,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickIconBoxOn: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
  },
  pickName: { fontSize: 14, fontWeight: '600', color: C.ink, flexShrink: 1 },
  pickNameOn: { color: C.onSon },
  pickPlayers: { fontSize: 11, fontWeight: '500', color: C.muted, fontVariant: ['tabular-nums'] },
  pickPlayersOn: { color: C.darkMuted },
  chosen: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chosenName: { fontSize: 17, fontWeight: '600', color: C.ink },
  h3: { fontSize: 15, fontWeight: '600', color: C.ink },
  headIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipIconRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  row: { flexDirection: 'row', gap: 10 },
  roundRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  charHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  charPreviewWrap: {
    width: 60, height: 60, borderRadius: 30, borderWidth: 2, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  charPreviewImg: { width: '100%', height: '100%' },
  charSub: { fontSize: 12.5, color: C.secondary, fontWeight: '400' },
  presetRow: { gap: 8, paddingVertical: 2 },
  presetCard: {
    width: 76, alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 4,
    borderRadius: 10, backgroundColor: C.mist, borderWidth: 1, borderColor: C.borderSubtle,
  },
  presetCardMeme: {
    backgroundColor: C.goldSoft, borderColor: 'rgba(180, 83, 9, 0.25)',
  },
  presetAvatar: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, overflow: 'hidden',
  },
  presetName: {
    fontSize: 11, fontWeight: '500', color: C.ink, textAlign: 'center', lineHeight: 14,
  },
  secBox: {
    borderRadius: 12, borderWidth: 1, borderColor: C.borderSubtle, backgroundColor: C.paper, overflow: 'hidden',
  },
  secHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10, backgroundColor: C.mist,
  },
  secTitle: { fontSize: 13.5, fontWeight: '600', color: C.ink, flex: 1 },
  secBody: { padding: 10, gap: 10 },
  optLabel: { fontSize: 12.5, fontWeight: '600', color: C.secondary },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  optChip: {
    paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: C.mist,
    borderWidth: 1, borderColor: C.borderSubtle,
  },
  optChipText: { fontSize: 13, fontWeight: '500', color: C.ink },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 2 },
  colorSwatch: {
    width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, borderColor: C.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchActive: {
    borderWidth: 2.5, borderColor: C.ink,
  },
  colorSwatchTaken: { opacity: 0.35 },
  swatchMark: { color: '#FFF', fontWeight: '600', fontSize: 14 },
  rule: { fontSize: 14, lineHeight: 20, color: C.secondary },
  wait: { textAlign: 'center', fontWeight: '500', fontSize: 14, paddingVertical: 12 },
  error: { color: '#FFFFFF', backgroundColor: C.danger, padding: 10, borderRadius: 10, fontWeight: '600', textAlign: 'center', fontSize: 13 },
  mapChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: 10, borderWidth: 1,
  },
});
