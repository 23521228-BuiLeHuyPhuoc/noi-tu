import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { PublicPlayer, RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { C, FONT } from '../theme';
import { T } from '../ui';
import { Portrait } from './Avatar';
import { useShellTools } from './Shell';

export interface CompactPlayerStripProps {
  room: RoomState;
  game: Game;
  order?: string[];
  activeId?: string | null;
  ring?: (p: PublicPlayer) => string | undefined;
  dim?: (p: PublicPlayer) => boolean;
  sub?: (p: PublicPlayer) => string | undefined;
  rank?: (p: PublicPlayer) => number | undefined;
  dark?: boolean;
  testID?: string;
}

/**
 * Dải người chơi siêu gọn (1 dòng ~34px): chân dung 20px, tên rút gọn và điểm/hạng chuẩn dossier.
 */
export function CompactPlayerStrip({
  room,
  game,
  order,
  activeId,
  ring,
  dim,
  sub,
  rank,
  dark = false,
  testID,
}: CompactPlayerStripProps) {
  const tools = useShellTools();
  const me = game.me ?? '';
  const meIsSpectator = room.players.find((p) => p.id === me)?.spectator === true;

  const players = order
    ? order.map((id) => room.players.find((p) => p.id === id)).filter((p): p is PublicPlayer => !!p)
    : [...room.players];
  for (const p of room.players) {
    if (!players.includes(p)) players.push(p);
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={testID ?? 'compact-player-strip'}
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {players.map((p) => {
        const isMe = p.id === me;
        const isActive = activeId === p.id;
        const isDim = !!dim?.(p) || p.spectator === true;
        const ringColor = ring?.(p);
        const subTxt = p.spectator ? 'Xem' : sub?.(p);
        const rk = p.spectator ? undefined : rank?.(p);

        return (
          <Pressable
            key={p.id}
            testID={`compact-player-${p.id}`}
            disabled={!isMe && meIsSpectator}
            onPress={() => {
              if (isMe) tools?.openProfile();
              else if (!meIsSpectator) tools?.openPlayer(p.id);
            }}
            style={[
              styles.pill,
              dark ? styles.pillDark : styles.pillLight,
              isMe && (dark ? styles.pillMeDark : styles.pillMeLight),
              isActive && styles.pillActive,
              ringColor ? { borderColor: ringColor, borderWidth: 1.5 } : null,
              isDim && styles.pillDim,
            ]}
          >
            {rk !== undefined && rk > 0 && (
              <T style={[styles.rkTxt, rk === 1 && styles.rkTxtGold]}>#{rk}</T>
            )}
            <Portrait p={p} size={20} border={1} />
            <T
              numberOfLines={1}
              style={[
                styles.name,
                dark ? styles.nameDark : styles.nameLight,
                isActive && styles.nameActive,
              ]}
            >
              {p.name}
            </T>
            {subTxt !== undefined && (
              <View style={[styles.subBadge, dark ? styles.subDark : styles.subLight]}>
                <T numberOfLines={1} style={[styles.subTxt, dark ? styles.subTxtDark : styles.subTxtLight]}>
                  {subTxt}
                </T>
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 0,
    flexShrink: 0,
    minHeight: 32,
    maxHeight: 36,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  pillLight: {
    backgroundColor: C.paper,
    borderColor: C.borderSubtle,
  },
  pillDark: {
    backgroundColor: C.darkSurface,
    borderColor: C.darkBorder,
  },
  pillMeLight: {
    backgroundColor: C.mist,
    borderColor: C.borderStrong,
  },
  pillMeDark: {
    backgroundColor: C.darkSubtle,
    borderColor: 'rgba(251, 249, 245, 0.24)',
  },
  pillActive: {
    backgroundColor: C.goldSoft,
    borderColor: C.goldDeep,
  },
  pillDim: {
    opacity: 0.45,
  },
  rkTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    color: C.muted,
    fontVariant: ['tabular-nums'],
  },
  rkTxtGold: {
    color: C.goldDeep,
  },
  name: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 72,
    fontFamily: FONT,
  },
  nameLight: {
    color: C.ink,
  },
  nameDark: {
    color: C.darkText,
  },
  nameActive: {
    color: C.ink,
    fontWeight: '600',
  },
  subBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  subLight: {
    backgroundColor: C.mist,
  },
  subDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
  },
  subTxt: {
    fontSize: 10.5,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  subTxtLight: {
    color: C.secondary,
  },
  subTxtDark: {
    color: C.darkText,
  },
});
