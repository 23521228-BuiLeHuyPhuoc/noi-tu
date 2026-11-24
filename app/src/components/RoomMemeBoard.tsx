import { memo, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { VoicePersonaId } from '../../../shared/src/types';
import { VOICE_PERSONA_META } from '../audioAssets';
import { useStableWindow } from '../hooks';
import { groupsForVoice } from '../memeBoard';
import { isGameBgmEnabled, isMemeEnabled, setGameBgmEnabled, setMemeEnabled, subscribeAudioSettings } from '../sound';
import { C, sticker } from '../theme';
import { T } from '../ui';
import type { Game } from '../useGame';
import { UiIcon } from './Icons';

type Props = Pick<Game, 'sendMeme' | 'memeReadyAt'> & {
  playerId: string;
  voice?: VoicePersonaId;
  arcade: boolean;
  online: boolean;
};

function Lines({ voice, playerId, online, sendMeme, memeReadyAt }: Props & { voice: VoicePersonaId }) {
  const groups = useMemo(() => groupsForVoice(voice), [voice]);
  const [selected, select] = useState(0);
  const [quote, setQuote] = useState('');
  const [deadline, setDeadline] = useState(memeReadyAt);
  useEffect(() => {
    if (!deadline) return;
    const timer = setTimeout(() => setDeadline(0), Math.max(0, deadline - Date.now()));
    return () => clearTimeout(timer);
  }, [deadline]);
  const disabled = !online || deadline !== 0;
  return <>
    <View style={styles.heading}>
      <T numberOfLines={1} style={styles.title}>{VOICE_PERSONA_META[voice].name}</T>
      {disabled && <T style={styles.note}>{online ? 'Chờ một chút…' : 'Mất kết nối'}</T>}
    </View>
    <ScrollView horizontal style={styles.tabs} contentContainerStyle={styles.row} showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="always">
      {groups.map((group, index) => <Pressable key={group.label} accessibilityRole="tab" accessibilityState={{ selected: index === selected }}
        onPress={() => { select(index); setQuote(''); }} style={[styles.chip, index === selected && styles.selected]}>
        <T style={[styles.label, index === selected && styles.selectedLabel]}>{group.label}</T>
      </Pressable>)}
    </ScrollView>
    <ScrollView key={`${selected}:${!!quote}`} style={styles.list} keyboardShouldPersistTaps="always" contentContainerStyle={styles.grid}>
      {quote ? <Pressable accessibilityRole="button" accessibilityHint="Chạm để trở lại danh sách" onPress={() => setQuote('')} style={styles.quote}>
        <T style={styles.label}>“{quote}”</T><T style={styles.note}>Trở lại danh sách</T>
      </Pressable> : groups[selected]?.lines.map((line) => <Pressable key={line.id} testID={`room-meme-${line.id}`} accessibilityRole="button"
        accessibilityHint="Nhấn giữ để đọc cả câu" disabled={disabled} onLongPress={() => setQuote(line.quote)}
        onPress={() => { sendMeme(line.id, playerId); setDeadline(memeReadyAt()); }}
        style={({ pressed }) => [styles.pill, (pressed || disabled) && styles.dim]}>
        <T numberOfLines={1} style={styles.label}>{line.label}</T>
      </Pressable>)}
    </ScrollView>
  </>;
}

/** Meme tự phát khi làm hành động (mua nhà, đoán sai…) bật hay tắt; meme bấm tay luôn phát. */
const useAutoMeme = () => useSyncExternalStore(subscribeAudioSettings, isMemeEnabled, isMemeEnabled);
/** Nhạc nền phát tiếp trong ván (mặc định tắt). */
const useGameBgm = () => useSyncExternalStore(subscribeAudioSettings, isGameBgmEnabled, isGameBgmEnabled);

function AutoToggle() {
  const on = useAutoMeme();
  const color = on ? C.jadeDeep : C.danger;
  return <Pressable testID="room-meme-auto" accessibilityRole="switch" accessibilityState={{ checked: on }}
    accessibilityLabel="Giọng tự phát khi làm hành động" accessibilityHint="Câu bấm tay vẫn phát dù tắt"
    onPress={() => setMemeEnabled(!on)} style={({ pressed }) => [styles.auto, on ? styles.autoOn : styles.autoOff, pressed && styles.dim]}>
    <UiIcon name={on ? 'Volume2' : 'VolumeX'} size={14} color={color} />
    <T numberOfLines={1} style={[styles.autoText, { color }]}>Tự phát: {on ? 'Bật' : 'Tắt'}</T>
  </Pressable>;
}

function GameBgmToggle() {
  const on = useGameBgm();
  const color = on ? C.jadeDeep : C.danger;
  return <Pressable testID="room-bgm-game" accessibilityRole="switch" accessibilityState={{ checked: on }}
    accessibilityLabel="Nhạc trong ván" accessibilityHint="Bật hoặc tắt nhạc nền khi đang chơi"
    onPress={() => setGameBgmEnabled(!on)} style={({ pressed }) => [styles.auto, on ? styles.autoOn : styles.autoOff, pressed && styles.dim]}>
    <UiIcon name={on ? 'Music' : 'VolumeX'} size={14} color={color} />
    <T numberOfLines={1} style={[styles.autoText, { color }]}>Nhạc trong ván: {on ? 'Bật' : 'Tắt'}</T>
  </Pressable>;
}

export const RoomMemeBoard = memo(function RoomMemeBoard(props: Props) {
  const [open, setOpen] = useState(false);
  const autoOn = useAutoMeme();
  const { width, height } = useStableWindow();
  const right = props.arcade ? Math.min(124, width * 0.32) : 8;
  return <View pointerEvents="box-none" style={[styles.dock, { right }]}>
    {open && <View testID="room-meme-tray" style={[styles.tray, { width: Math.min(320, width - right - 12), maxHeight: Math.min(330, height * 0.45) }]}>
      <View style={styles.switches}>
        <AutoToggle />
        <GameBgmToggle />
      </View>
      {props.voice ? <Lines key={props.voice} {...props} voice={props.voice} /> : <T style={styles.label}>Chọn giọng ở sảnh để phát meme.</T>}
    </View>}
    <Pressable testID="room-meme-toggle" accessibilityRole="button" accessibilityLabel={open ? 'Đóng bảng giọng' : 'Mở bảng giọng'} accessibilityState={{ expanded: open }}
      onPress={() => setOpen((previous) => !previous)} style={({ pressed }) => [styles.toggle, open && styles.selected, pressed && styles.dim]}>
      <UiIcon name={open ? 'X' : 'Megaphone'} size={18} color={open ? C.paper : C.ink} />
      {!autoOn && !open && <View testID="room-meme-auto-off" pointerEvents="none" style={styles.offDot} />}
    </Pressable>
  </View>;
});

const styles = StyleSheet.create({
  dock: { position: 'absolute', bottom: 6, left: 8, top: 2, alignItems: 'flex-end', justifyContent: 'flex-end', gap: 5 },
  toggle: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.paper, alignItems: 'center', justifyContent: 'center', ...sticker(3) },
  tray: { flexShrink: 1, backgroundColor: C.paper, borderRadius: 14, padding: 8, gap: 5, overflow: 'hidden', ...sticker(4) },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  title: { flexShrink: 1, color: C.ink, fontSize: 13, fontWeight: '700' },
  note: { fontSize: 11, color: C.secondary },
  tabs: { flexGrow: 0, flexShrink: 0 },
  row: { gap: 4 },
  chip: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.mist },
  selected: { backgroundColor: C.ink, borderColor: C.ink },
  label: { fontSize: 12, color: C.ink, fontWeight: '600' },
  selectedLabel: { color: C.paper },
  list: { flexGrow: 0, minHeight: 0 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  pill: { maxWidth: '100%', minHeight: 32, justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: C.borderSubtle },
  dim: { opacity: 0.5 },
  quote: { flexShrink: 1, gap: 4, padding: 4 },
  switches: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  auto: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 32, paddingHorizontal: 9, borderRadius: 16, borderWidth: 1 },
  autoOn: { backgroundColor: C.jadeSoft, borderColor: 'rgba(21,128,61,0.35)' },
  autoOff: { backgroundColor: C.dangerSoft, borderColor: 'rgba(185,28,28,0.3)' },
  autoText: { flexShrink: 1, fontSize: 12, fontWeight: '700' },
  offDot: { position: 'absolute', top: 3, right: 3, width: 10, height: 10, borderRadius: 5, backgroundColor: C.danger, borderWidth: 1.5, borderColor: C.paper },
});
