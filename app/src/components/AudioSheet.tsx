import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { BGM_LIST, MEME_LIST, type BgmId, type MemeId, type MemePersona } from '../audioAssets';
import {
  getBgmVolume,
  getCurrentBgmId,
  getManualBgmOverride,
  isBgmEnabled,
  isMemeEnabled,
  isMuted,
  nextBgmTrack,
  playMeme,
  setBgmEnabled,
  setBgmVolume,
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
  { key: 'game_fx', label: 'Hỗ trợ Game' },
];

const VOL_PRESETS: readonly { label: string; value: number }[] = [
  { label: 'Nhỏ 18%', value: 0.18 },
  { label: 'Vừa 28%', value: 0.28 },
  { label: 'To 45%', value: 0.45 },
];

interface Snapshot {
  muted: boolean;
  bgmOn: boolean;
  memeOn: boolean;
  bgmVol: number;
  manualBgm: BgmId | null;
  activeBgm: BgmId | null;
}

function readSnapshot(): Snapshot {
  return {
    muted: isMuted(),
    bgmOn: isBgmEnabled(),
    memeOn: isMemeEnabled(),
    bgmVol: getBgmVolume(),
    manualBgm: getManualBgmOverride(),
    activeBgm: getCurrentBgmId(),
  };
}

export function AudioSheet({ onClose }: { onClose: () => void }) {
  const [snap, setSnap] = useState<Snapshot>(readSnapshot);
  const [tab, setTab] = useState<MemePersona>('linda');
  const [lastPlayedId, setLastPlayedId] = useState<MemeId | null>(null);

  useEffect(() => subscribeAudioSettings(() => setSnap(readSnapshot())), []);

  const visibleMemes = MEME_LIST.filter((m) => m.persona === tab);

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
          <T style={[styles.chipTxt, { color: C.ink }]}>Nhạc nền: {snap.bgmOn ? 'Bật' : 'Tắt'}</T>
        </Pressable>

        <Pressable
          testID="audio-toggle-meme"
          onPress={() => setMemeEnabled(!snap.memeOn)}
          style={[styles.toggleChip, snap.memeOn && !snap.muted ? styles.chipActiveGold : styles.chipIdle]}
        >
          <UiIcon name="Megaphone" size={14} color={C.ink} />
          <T style={[styles.chipTxt, { color: C.ink }]}>Giọng lầy: {snap.memeOn ? 'Bật' : 'Tắt'}</T>
        </Pressable>
      </View>

      <View style={styles.sectionBox}>
        <View style={styles.sectionHeader}>
          <T style={styles.sectionTitle}>Âm lượng nhạc nền</T>
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
          {snap.manualBgm ? 'Đang phát cố định 1 bài:' : 'Đang xoay vòng 6 bài:'}{' '}
          <T style={{ fontWeight: '600', color: C.ink }}>
            {BGM_LIST.find((b) => b.id === snap.activeBgm)?.name ?? 'Chưa phát'}
          </T>
        </T>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bgmRow}>
          <Pressable
            onPress={() => setManualBgmOverride(null)}
            style={[styles.bgmChip, snap.manualBgm === null && styles.bgmChipOn]}
          >
            <T style={[styles.bgmChipTxt, snap.manualBgm === null && styles.bgmChipTxtOn]}>Xoay vòng 6 bài</T>
          </Pressable>
          <Pressable
            onPress={() => {
              if (!snap.bgmOn) setBgmEnabled(true);
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
                  if (!snap.bgmOn) setBgmEnabled(true);
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
        <T style={styles.sectionTitle}>Thử & phát giọng lầy lội ({MEME_LIST.length} câu)</T>
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
            const active = lastPlayedId === m.id;
            return (
              <Pressable
                key={m.id}
                testID={`meme-pad-${m.id}`}
                onPress={() => {
                  if (snap.muted) setMuted(false);
                  if (!snap.memeOn) setMemeEnabled(true);
                  setLastPlayedId(m.id);
                  playMeme(m.id, { force: true });
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
