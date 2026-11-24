import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BGM_LIST, MEME_LIST, type BgmId, type BgmScene, type MemePersona } from '../audioAssets';
import {
  getActiveMeme,
  subscribeActiveMeme,
  getBgmScene,
  getBgmVolume,
  getCurrentBgmId,
  getManualBgmOverride,
  isBgmActive,
  isBgmEnabled,
  isGameBgmEnabled,
  isMemeEnabled,
  isMuted,
  nextBgmTrack,
  playMeme,
  playRandomMeme,
  setBgmEnabled,
  setBgmVolume,
  setGameBgmEnabled,
  setManualBgmOverride,
  setMemeEnabled,
  setMuted,
  subscribeAudioSettings,
} from '../sound';
import { C } from '../theme';
import { T } from '../ui';
import { UiIcon } from './Icons';
import { Sheet } from './Sheet';

const PERSONA_TABS: readonly { key: MemePersona; label: string }[] = [
  { key: 'linda', label: 'Cô Linda / Cẩm Lan' },
  { key: 'minhhieu', label: 'Cô Minh Hiếu' },
  { key: 'phuonghang', label: 'Cô Phương Hằng' },
  { key: 'chiphien', label: 'Chị Phiến' },
  { key: 'coba', label: 'Cô Ba Vàng Ngọc' },
  { key: 'tranmy', label: 'Trần My' },
  { key: 'game_fx', label: 'Hỗ trợ Game' },
];

const VOL_PRESETS: readonly { label: string; value: number }[] = [
  { label: 'Nhỏ 45%', value: 0.45 },
  { label: 'Chuẩn 80%', value: 0.8 },
  { label: 'To 100%', value: 1.0 },
];

interface Snapshot {
  muted: boolean;
  bgmScene: BgmScene;
  bgmActive: boolean;
  bgmOn: boolean;
  gameBgmOn: boolean;
  memeOn: boolean;
  bgmVol: number;
  manualBgm: BgmId | null;
  activeBgm: BgmId | null;
}

function readSnapshot(): Snapshot {
  return {
    muted: isMuted(),
    bgmScene: getBgmScene(),
    bgmActive: isBgmActive(),
    bgmOn: isBgmEnabled(),
    gameBgmOn: isGameBgmEnabled(),
    memeOn: isMemeEnabled(),
    bgmVol: getBgmVolume(),
    manualBgm: getManualBgmOverride(),
    activeBgm: getCurrentBgmId(),
  };
}

export function AudioSheet({ onClose }: { onClose: () => void }) {
  const [snap, setSnap] = useState<Snapshot>(readSnapshot);
  const [tab, setTab] = useState<MemePersona>(() => getActiveMeme()?.persona ?? 'linda');
  const [activeMeme, setActiveMeme] = useState(getActiveMeme);
  useEffect(() => subscribeActiveMeme(() => {
    const active = getActiveMeme();
    setActiveMeme(active);
    if (active) setTab(active.persona);
  }), []);

  useEffect(() => subscribeAudioSettings(() => setSnap(readSnapshot())), []);

  const visibleMemes = MEME_LIST.filter((m) => m.persona === tab);
  const enableCurrentSceneBgm = () => {
    if (snap.bgmScene === 'game') {
      if (!snap.gameBgmOn) setGameBgmEnabled(true);
    } else if (!snap.bgmOn) {
      setBgmEnabled(true);
    }
  };
  const idleBgmNote = snap.muted
    ? 'Đang tắt tiếng'
    : snap.bgmScene === 'game'
      ? 'Nhạc trong ván đang tắt'
      : snap.bgmScene === 'lobby'
        ? 'Nhạc phòng chờ đang tắt'
        : 'Nhạc phát khi vào phòng';

  return (
    <Sheet title="Nhạc nền & Bảng Lầy Lội" onClose={onClose}>
      <View style={styles.togglesRow}>
        <Pressable
          testID="audio-toggle-mute"
          onPress={() => setMuted(!snap.muted)}
          style={[styles.toggleChip, !snap.muted ? styles.chipActiveJade : styles.chipDanger]}
        >
          <UiIcon name={snap.muted ? 'VolumeX' : 'Volume2'} size={14} color={snap.muted ? C.danger : C.jadeDeep} />
          <T style={[styles.chipTxt, { color: snap.muted ? C.danger : C.jadeDeep }]}>
            {snap.muted ? 'Đang tắt tiếng' : 'Âm thanh: Bật'}
          </T>
        </Pressable>

        <Pressable
          testID="audio-toggle-bgm"
          onPress={() => setBgmEnabled(!snap.bgmOn)}
          style={[styles.toggleChip, snap.bgmOn && !snap.muted ? styles.chipActiveGold : styles.chipIdle]}
        >
          <UiIcon name="Music" size={14} color={C.ink} />
          <T style={[styles.chipTxt, { color: C.ink }]}>Nhạc phòng chờ: {snap.bgmOn ? 'Bật' : 'Tắt'}</T>
        </Pressable>

        <Pressable
          testID="audio-toggle-bgm-game"
          onPress={() => setGameBgmEnabled(!snap.gameBgmOn)}
          style={[styles.toggleChip, snap.gameBgmOn && !snap.muted ? styles.chipActiveGold : styles.chipIdle]}
        >
          <UiIcon name="Music" size={14} color={C.ink} />
          <T style={[styles.chipTxt, { color: C.ink }]}>Nhạc trong ván: {snap.gameBgmOn ? 'Bật' : 'Tắt'}</T>
        </Pressable>

        <Pressable
          testID="audio-toggle-meme"
          onPress={() => setMemeEnabled(!snap.memeOn)}
          style={[styles.toggleChip, snap.memeOn && !snap.muted ? styles.chipActiveGold : styles.chipIdle]}
        >
          <UiIcon name="Megaphone" size={14} color={C.ink} />
          <T style={[styles.chipTxt, { color: C.ink }]}>Meme tự phát: {snap.memeOn ? 'Bật' : 'Tắt'}</T>
        </Pressable>
      </View>

      <View style={styles.sectionBox}>
        <View style={styles.sectionHeader}>
          <T style={styles.sectionTitle}>Nhạc nền</T>
          <View style={styles.volRow}>
            {VOL_PRESETS.map((p) => {
              const selected = Math.abs(snap.bgmVol - p.value) < 0.04;
              return (
                <Pressable
                  key={p.label}
                  onPress={() => setBgmVolume(p.value)}
                  style={[styles.volBtn, selected && styles.volBtnOn]}
                >
                  <T style={[styles.volTxt, selected && styles.volTxtOn]}>{p.label}</T>
                </Pressable>
              );
            })}
          </View>
        </View>

        <T style={styles.subLabel}>
          {snap.bgmActive ? (
            <>
              {snap.manualBgm ? 'Đang phát cố định 1 bài:' : `Đang xoay vòng ${BGM_LIST.length} bài:`}{' '}
              <T style={{ fontWeight: '600', color: C.ink }}>
                {BGM_LIST.find((b) => b.id === snap.activeBgm)?.name ?? 'Chưa phát'}
              </T>
            </>
          ) : (
            <>
              {idleBgmNote}
              {snap.manualBgm
                ? ` · Đã chọn: ${BGM_LIST.find((b) => b.id === snap.manualBgm)?.name ?? ''}`
                : ''}
            </>
          )}
        </T>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bgmRow}>
          <Pressable
            onPress={() => setManualBgmOverride(null)}
            style={[styles.bgmChip, snap.manualBgm === null && styles.bgmChipOn]}
          >
            <T style={[styles.bgmChipTxt, snap.manualBgm === null && styles.bgmChipTxtOn]}>Xoay vòng {BGM_LIST.length} bài</T>
          </Pressable>
          <Pressable
            onPress={() => {
              enableCurrentSceneBgm();
              nextBgmTrack();
            }}
            style={styles.bgmChip}
          >
            <T style={styles.bgmChipTxt}>Bài tiếp ⏭</T>
          </Pressable>
          {BGM_LIST.map((b) => {
            const on = snap.manualBgm === b.id || (snap.manualBgm === null && snap.activeBgm === b.id);
            return (
              <Pressable
                key={b.id}
                onPress={() => {
                  enableCurrentSceneBgm();
                  setManualBgmOverride(b.id);
                }}
                style={[styles.bgmChip, on && styles.bgmChipOn]}
              >
                <T style={[styles.bgmChipTxt, on && styles.bgmChipTxtOn]}>{b.name.split(' (')[0]}</T>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.sectionBox}>
        <View style={styles.sectionHeader}>
          <T style={styles.sectionTitle}>Thử & phát giọng lầy lội ({MEME_LIST.length} câu)</T>
          <Pressable
            onPress={() => {
              if (snap.muted) setMuted(false);
              playRandomMeme({ force: true, speakerId: null });
            }}
            style={[styles.volBtn, styles.volBtnOn]}
          >
            <T style={[styles.volTxt, styles.volTxtOn]}>Ngẫu nhiên 1/{MEME_LIST.length}</T>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabRow}>
          {PERSONA_TABS.map((pt) => {
            const active = tab === pt.key;
            const count = MEME_LIST.filter((m) => m.persona === pt.key).length;
            return (
              <Pressable
                key={pt.key}
                onPress={() => setTab(pt.key)}
                style={[styles.tabPill, active && styles.tabPillOn]}
              >
                <T style={[styles.tabTxt, active && styles.tabTxtOn]}>
                  {pt.label} ({count})
                </T>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.memeGrid}>
          {visibleMemes.map((m) => {
            const active = activeMeme?.id === m.id;
            return (
              <Pressable
                key={m.id}
                testID={`meme-pad-${m.id}`}
                onPress={() => {
                  if (snap.muted) setMuted(false);
                  playMeme(m.id, { force: true, speakerId: null, persona: m.persona });
                }}
                style={({ pressed }) => [
                  styles.memeCard,
                  active && styles.memeCardActive,
                  pressed && { opacity: 0.78 },
                ]}
              >
                <View style={styles.memeTop}>
                  <T numberOfLines={1} style={styles.memeTitle}>
                    {m.label}
                  </T>
                  <UiIcon name="Play" size={13} color={C.goldDeep} />
                </View>
                <T numberOfLines={2} style={styles.memeQuote}>
                  “{m.quote}”
                </T>
                <T numberOfLines={1} style={styles.memeCtx}>
                  {m.context}
                </T>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  togglesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipActiveJade: { backgroundColor: C.jadeSoft, borderColor: 'rgba(21,128,61,0.35)' },
  chipActiveGold: { backgroundColor: C.goldSoft, borderColor: 'rgba(180,83,9,0.35)' },
  chipDanger: { backgroundColor: C.dangerSoft, borderColor: 'rgba(185,28,28,0.3)' },
  chipIdle: { backgroundColor: C.mist, borderColor: C.borderSubtle },
  chipTxt: { fontSize: 12.5, fontWeight: '600' },

  sectionBox: {
    backgroundColor: C.mist,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    padding: 10,
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionTitle: { fontSize: 13.5, fontWeight: '600', color: C.ink },
  subLabel: { fontSize: 12, color: C.secondary },
  volRow: { flexDirection: 'row', gap: 5 },
  volBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  volBtnOn: { backgroundColor: C.gold, borderColor: C.goldDeep },
  volTxt: { fontSize: 11.5, fontWeight: '600', color: C.secondary, fontVariant: ['tabular-nums'] },
  volTxtOn: { color: C.ink },

  bgmRow: { gap: 6, paddingVertical: 2 },
  bgmChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  bgmChipOn: { backgroundColor: C.gold, borderColor: C.goldDeep },
  bgmChipTxt: { fontSize: 12, fontWeight: '600', color: C.ink },
  bgmChipTxtOn: { color: C.ink },

  tabRow: { gap: 6 },
  tabPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: C.paper,
    borderWidth: 1,
    borderColor: C.borderSubtle,
  },
  tabPillOn: { backgroundColor: C.ink, borderColor: C.ink },
  tabTxt: { fontSize: 12, fontWeight: '600', color: C.secondary },
  tabTxtOn: { color: '#FFFFFF' },

  memeGrid: { gap: 7 },
  memeCard: {
    backgroundColor: C.paper,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.borderSubtle,
    padding: 9,
    gap: 3,
  },
  memeCardActive: { borderColor: C.goldDeep, backgroundColor: '#FFFBEB' },
  memeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  memeTitle: { flex: 1, fontSize: 13, fontWeight: '600', color: C.ink },
  memeQuote: { fontSize: 12, color: C.secondary },
  memeCtx: { fontSize: 11, color: C.muted },
});
