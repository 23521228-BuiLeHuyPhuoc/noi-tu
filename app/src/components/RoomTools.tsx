/**
 * Sảnh "Phòng đang mở", bảng xếp hạng, và bảng quản lý phòng của chủ phòng (công khai / riêng tư, mời ra).
 */
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { GAME_INFO, type GameType, type LeaderRow, type PublicPlayer, type RoomState, type RoomSummary } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { GAME_META } from '../messages';
import { C, sticker } from '../theme';
import { Button, Card, T, useFeed } from '../ui';
import { Portrait } from './Avatar';
import { Sheet } from './Sheet';

const GAME_TYPES = Object.keys(GAME_INFO) as GameType[];
const MEDALS = ['🥇', '🥈', '🥉'];
const PHASE: Record<RoomSummary['phase'], { text: string; color: string }> = {
  lobby: { text: 'Đang chờ người', color: C.jade },
  playing: { text: 'Đang chơi · vào xem', color: '#E67700' },
  finished: { text: 'Vừa xong ván', color: C.muted },
};

/** Danh sách phòng công khai đang mở; tự làm mới mỗi 5 giây */
export function OpenRooms({ game, disabled, onJoin }: { game: Game; disabled: boolean; onJoin: (code: string) => void }) {
  const [rooms, setRooms] = useState<RoomSummary[] | null>(null);
  const online = game.status === 'online';
  const { listRooms } = game;
  const [tick, setTick] = useState(0);
  const refresh = useCallback(() => setTick((t) => t + 1), []);
  useEffect(() => {
    if (!online) return;
    let alive = true;
    const load = () => listRooms().then((r) => { if (alive && r) setRooms(r); });
    void load();
    const t = setInterval(() => void load(), 5000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [online, listRooms, tick]);

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.headRow}>
        <T style={styles.h2}>Phòng đang mở</T>
        <Pressable testID="rooms-refresh" accessibilityRole="button" onPress={refresh} hitSlop={8}>
          <T style={styles.link}>Làm mới</T>
        </Pressable>
      </View>
      {rooms === null ? (
        <ActivityIndicator color={C.son} />
      ) : rooms.length === 0 ? (
        <T testID="rooms-empty" style={styles.muted}>Chưa có phòng công khai nào. Tạo phòng mới để người khác vào chơi cùng nhé!</T>
      ) : (
        rooms.map((r) => {
          const full = r.players >= r.maxPlayers;
          const ph = PHASE[r.phase];
          return (
            <View key={r.code} testID={`open-room-${r.code}`} style={styles.roomRow}>
              <Portrait p={{ avatar: r.hostAvatar, avatarUrl: r.hostAvatarUrl }} size={44} />
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <T numberOfLines={1} style={styles.roomTitle}>
                  {GAME_META[r.gameType].emoji} {GAME_INFO[r.gameType].name} · {r.hostName}
                </T>
                <T numberOfLines={1} style={styles.muted}>{r.names.join(', ')}</T>
                <T style={[styles.badge, { color: ph.color }]}>
                  {ph.text} · {r.players}/{r.maxPlayers} người
                </T>
              </View>
              <Button
                testID={`join-room-${r.code}`}
                small
                variant={r.phase === 'lobby' ? 'gold' : 'paper'}
                title={full ? 'Đầy' : r.phase === 'lobby' ? 'Vào' : 'Xem'}
                disabled={disabled || full}
                onPress={() => onJoin(r.code)}
              />
            </View>
          );
        })
      )}
    </Card>
  );
}

/** Bảng xếp hạng số lần thắng (chỉ tài khoản mới được lưu thành tích) */
export function LeaderboardSheet({ game, onClose, initial }: { game: Game; onClose: () => void; initial?: GameType }) {
  const tabs: (GameType | 'all')[] = GAME_TYPES.length > 1 ? ['all', ...GAME_TYPES] : GAME_TYPES;
  const [tab, setTab] = useState<GameType | 'all'>(initial ?? tabs[0]);
  // kết quả gắn với tab đã tải: đổi tab thì coi như đang tải cho tới khi có kết quả mới
  const [data, setData] = useState<{ tab: GameType | 'all'; rows: LeaderRow[] | null } | null>(null);
  const { leaderboard } = game;
  useEffect(() => {
    let alive = true;
    void leaderboard(tab).then((r) => {
      if (alive) setData({ tab, rows: r });
    });
    return () => {
      alive = false;
    };
  }, [tab, leaderboard]);
  const loaded = data && data.tab === tab ? data : null;
  const rows = loaded ? loaded.rows : null;
  const failed = !!loaded && loaded.rows === null;
  const myId = game.user?.id;

  return (
    <Sheet title="🏆 Bảng xếp hạng" onClose={onClose}>
      {tabs.length > 1 && (
        <View style={styles.tabs}>
          {tabs.map((t) => (
            <Button
              key={t}
              testID={`lb-tab-${t}`}
              small
              variant={t === tab ? 'ink' : 'paper'}
              title={t === 'all' ? 'Tất cả' : `${GAME_META[t].emoji} ${GAME_INFO[t].name}`}
              style={styles.tab}
              onPress={() => setTab(t)}
            />
          ))}
        </View>
      )}
      <T style={styles.muted}>Xếp theo số lần thắng; bằng nhau thì ai chơi ít ván hơn đứng trên. Chỉ tính người chơi có tài khoản.</T>
      {failed ? (
        <T style={styles.muted}>Không tải được bảng xếp hạng, thử lại sau nhé.</T>
      ) : rows === null ? (
        <ActivityIndicator color={C.son} />
      ) : rows.length === 0 ? (
        <T testID="lb-empty" style={styles.muted}>Chưa có ai trên bảng. Tạo tài khoản rồi chơi để ghi tên mình đầu tiên!</T>
      ) : (
        <View testID="lb-list" style={{ gap: 6 }}>
          {rows.map((r) => (
            <View key={r.id} testID={`lb-row-${r.rank}`} style={[styles.lbRow, r.id === myId && styles.lbMe]}>
              <T style={styles.rank}>{MEDALS[r.rank - 1] ?? `${r.rank}.`}</T>
              <Portrait p={{ avatar: r.avatar, avatarUrl: r.avatarUrl }} size={38} />
              <T numberOfLines={1} style={styles.lbName}>{r.displayName}{r.id === myId ? ' (bạn)' : ''}</T>
              <View style={{ alignItems: 'flex-end' }}>
                <T style={styles.wins}>{r.won} thắng</T>
                <T style={styles.muted}>{r.played} ván</T>
              </View>
            </View>
          ))}
        </View>
      )}
      <Button title="Đóng" variant="paper" onPress={onClose} />
    </Sheet>
  );
}

/** Phòng chờ: công khai / riêng tư, và chủ phòng mời người ra */
export function RoomManageCard({ game, room }: { game: Game; room: RoomState }) {
  const isHost = room.hostId === game.me;
  const feed = useFeed();
  const others = room.players.filter((p) => p.id !== game.me);
  const setPublic = async (v: boolean) => {
    const err = await game.setPublic(v);
    if (err) feed(err, 'bad');
  };
  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.headRow}>
        <T style={styles.h2}>{room.isPublic ? '🌐 Phòng công khai' : '🔒 Phòng riêng tư'}</T>
      </View>
      <T style={styles.muted}>
        {room.isPublic
          ? 'Ai cũng thấy phòng này trong mục "Phòng đang mở" ở trang chủ và vào được.'
          : 'Phòng không hiện ở trang chủ, chỉ vào được bằng mã phòng hoặc link mời.'}
      </T>
      {isHost && (
        <View style={styles.tabs}>
          <Button testID="visibility-public" small variant={room.isPublic ? 'ink' : 'paper'} title="🌐 Công khai" style={styles.tab} onPress={() => void setPublic(true)} />
          <Button testID="visibility-private" small variant={!room.isPublic ? 'ink' : 'paper'} title="🔒 Riêng tư" style={styles.tab} onPress={() => void setPublic(false)} />
        </View>
      )}
      {isHost && others.length > 0 && (
        <View style={{ gap: 6 }}>
          <T style={styles.sub}>Thành viên</T>
          {others.map((p) => <MemberRow key={p.id} game={game} player={p} />)}
        </View>
      )}
    </Card>
  );
}

function MemberRow({ game, player }: { game: Game; player: PublicPlayer }) {
  const [confirm, setConfirm] = useState(false);
  const feed = useFeed();
  return (
    <View testID={`member-${player.id}`} style={styles.memberRow}>
      <Portrait p={player} size={34} />
      <T numberOfLines={1} style={[styles.lbName, !player.connected && { color: C.muted }]}>
        {player.name}
        {player.spectator ? ' · đang xem' : ''}
        {!player.connected ? ' · mất kết nối' : ''}
      </T>
      {confirm ? (
        <>
          <Button testID={`kick-confirm-${player.id}`} small variant="ink" title="Mời ra" onPress={() => void kickPlayer(game, player, () => setConfirm(false), feed)} />
          <Button small variant="paper" title="Thôi" onPress={() => setConfirm(false)} />
        </>
      ) : (
        <Button testID={`kick-${player.id}`} small variant="paper" title="🚪 Mời ra" onPress={() => setConfirm(true)} />
      )}
    </View>
  );
}

/** Mời một người ra khỏi phòng (dùng ở phòng chờ và trong bảng chọc bạn bè giữa ván) */
export async function kickPlayer(game: Game, player: PublicPlayer, done?: () => void, feed?: (t: string, k: 'good' | 'bad' | 'info') => void) {
  const err = await game.kick(player.id);
  done?.();
  if (feed) feed(err ?? `Đã mời ${player.name} ra khỏi phòng`, err ? 'bad' : 'info');
}

/** Nút mời ra có bước xác nhận, đặt trong bảng chọc bạn bè (chỉ chủ phòng thấy) */
export function KickInline({ game, player, onDone }: { game: Game; player: PublicPlayer; onDone: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const feed = useFeed();
  if (game.room?.hostId !== game.me || player.id === game.me) return null;
  return confirm ? (
    <View style={styles.tabs}>
      <Button testID="kick-confirm" small variant="ink" title={`Mời ${player.name} ra thật`} style={styles.tab} onPress={() => void kickPlayer(game, player, onDone, feed)} />
      <Button small variant="paper" title="Thôi" style={styles.tab} onPress={() => setConfirm(false)} />
    </View>
  ) : (
    <Button testID="kick-open" small variant="paper" icon="🚪" title={`Mời ${player.name} ra khỏi phòng`} onPress={() => setConfirm(true)} />
  );
}

const styles = StyleSheet.create({
  h2: { fontSize: 17, fontWeight: '800' },
  sub: { fontSize: 14, fontWeight: '800', color: C.ink },
  muted: { fontSize: 13, color: C.muted },
  link: { fontSize: 13, color: C.son, fontWeight: '800', textDecorationLine: 'underline' },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  roomRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.mist, borderRadius: 14, padding: 8 },
  roomTitle: { fontSize: 15, fontWeight: '900', color: C.ink },
  badge: { fontSize: 12, fontWeight: '800' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tab: { flexGrow: 1 },
  lbRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.mist, borderRadius: 14, paddingVertical: 6, paddingHorizontal: 10 },
  lbMe: { backgroundColor: '#FFF3BF', ...sticker(2) },
  rank: { width: 30, fontSize: 18, fontWeight: '900', textAlign: 'center', color: C.ink },
  lbName: { flex: 1, minWidth: 0, fontSize: 15, fontWeight: '800', color: C.ink },
  wins: { fontSize: 15, fontWeight: '900', color: C.jade },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
