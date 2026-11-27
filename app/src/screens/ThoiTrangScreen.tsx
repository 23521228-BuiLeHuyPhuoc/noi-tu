/**
 * Màn chơi chính "Sàn Diễn Xóm Lầy" (`thoitrang`, thiết kế v4):
 * - Toàn màn hình pastel ở Phòng thử đồ (`ui-desktop.png` / `ui-mobile.png`) và spotlight tối ở Sàn diễn.
 * - Đồng bộ tủ đồ lên server, hiển thị ảnh chân dung bong bóng trực tiếp của các người chơi trong phòng.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, View } from 'react-native';
import type {
  ThoiTrangCheerId,
  ThoiTrangOutfit,
  ThoiTrangPoseId,
  ThoiTrangView,
  ThoiTrangWardrobeTab,
} from '../../../shared/src/thoitrang';
import {
  BASE_OUTFIT,
  BODY_TYPES,
  CATALOG,
  DEFAULT_FACE,
  FACE_OPTS,
  PALETTES,
  PATTERNS,
  cloneOutfit,
  validateOutfit,
} from '../../../shared/src/thoitrang-catalog';
import type { RoomState } from '../../../shared/src/types';
import { Shell, useShellTools } from '../components/Shell';
import { ThoiTrangDollCanvas, useThoiTrangSnapshots } from '../components/ThoiTrangDollCanvas';
import { ThoiTrangReveal } from '../components/ThoiTrangReveal';
import { ThoiTrangRunway, type ThoiTrangCheerBubble } from '../components/ThoiTrangRunway';
import { ThoiTrangCategoryRail, ThoiTrangWardrobe } from '../components/ThoiTrangWardrobe';
import { TAG_LABELS, V4 } from '../components/ThoiTrangWardrobeControls';
import { useStableWindow } from '../hooks';
import { T } from '../ui';
import type { Game } from '../useGame';

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

function formatClock(msLeft: number): string {
  const sec = Math.max(0, Math.ceil(msLeft / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function buildRandomV4Outfit(): ThoiTrangOutfit {
  const body = pick(BODY_TYPES)[0];
  const isM = body === 'nam_thu_sinh' || body === 'nam_vam_vo';
  const eq = (cat: 'top' | 'outer' | 'bottom' | 'dress' | 'shoes' | 'hat' | 'glasses' | 'acc') => {
    const m = pick(CATALOG[cat]);
    return {
      id: m.id,
      c: pick(PALETTES.fashion),
      c2: pick(PALETTES.fashion),
      p: m.pat && Math.random() < 0.35 ? pick(PATTERNS)[0] : 'plain' as const,
    };
  };
  const h = pick(CATALOG.hair);
  const useDress = Math.random() < 0.34;
  return validateOutfit({
    body,
    skin: pick(PALETTES.skin),
    height: +(0.92 + Math.random() * 0.16).toFixed(2),
    face: {
      ...DEFAULT_FACE,
      eyes: pick(FACE_OPTS.eyes)[0],
      eyeColor: pick(PALETTES.eye),
      brows: isM ? pick(['straight', 'thick', 'sharp'] as const) : pick(FACE_OPTS.brows)[0],
      mouth: pick(FACE_OPTS.mouths)[0],
      lipColor: pick(PALETTES.lip),
      nose: pick(FACE_OPTS.noses)[0],
      blush: isM ? 'none' : pick(['soft', 'peach', 'none'] as const),
      eyeliner: isM ? 'none' : pick(['none', 'classic', 'wing'] as const),
      beard: isM && Math.random() < 0.4 ? pick(['stubble', 'moustache', 'goatee'] as const) : 'none',
      expression: pick(['neutral', 'happy', 'wink', 'confident', 'cool'] as const),
    },
    hair: {
      id: h.id,
      c: pick(PALETTES.hair),
      c2: pick(PALETTES.hair),
      twoTone: Math.random() < 0.35 ? (Math.random() < 0.5 ? 'tips' : 'streaks') : 'none',
    },
    slots: {
      ...(useDress ? { dress: eq('dress') } : { top: eq('top'), bottom: eq('bottom') }),
      ...(Math.random() < 0.45 ? { outer: eq('outer') } : {}),
      shoes: eq('shoes'),
      ...(Math.random() < 0.5 ? { hat: eq('hat') } : {}),
      ...(Math.random() < 0.35 ? { glasses: eq('glasses') } : {}),
    },
    acc: Math.random() < 0.72 ? [eq('acc')] : [],
  }).outfit;
}

function RoomMiniTools({ dark = false }: { dark?: boolean }) {
  const tools = useShellTools();
  if (!tools) return null;
  const bg = dark ? 'rgba(255,255,255,0.14)' : V4.glass;
  const txtColor = dark ? '#ffffff' : V4.ink;
  return (
    <View style={styles.miniTools}>
      <Pressable testID="tt-chat-btn" accessibilityRole="button" onPress={tools.openChat} style={[styles.miniBtn, { backgroundColor: bg }]}>
        <T style={[styles.miniBtnTxt, { color: txtColor }]}>💬</T>
        {tools.unread > 0 && <View style={styles.miniDot} />}
      </Pressable>
      <Pressable testID="tt-mute-btn" accessibilityRole="button" onPress={tools.toggleMute} style={[styles.miniBtn, { backgroundColor: bg }]}>
        <T style={[styles.miniBtnTxt, { color: txtColor }]}>{tools.muted ? '🔇' : '🔊'}</T>
      </Pressable>
      <Pressable testID="tt-leave-btn" accessibilityRole="button" onPress={tools.leave} style={[styles.miniBtn, { backgroundColor: bg }]}>
        <T style={[styles.miniBtnTxt, { color: V4.pink }]}>✕</T>
      </Pressable>
    </View>
  );
}

function ThoiTrangInner({ game, room, view }: { game: Game; room: RoomState; view: ThoiTrangView }) {
  const { width } = useStableWindow();
  const mobile = width <= 760;
  const me = game.me;
  const isSpectator = !me || !view.order.includes(me);
  const myReady = Boolean(me && view.ready.includes(me));

  // Clock tick for phaseEndsAt
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);
  const countdownText = formatClock(view.phaseEndsAt ? view.phaseEndsAt - nowMs : view.phaseSeconds * 1000);

  // Local dressing draft keyed by themeId (React 19 compiler safe)
  const serverMyOutfit = (me && view.outfits[me]) || BASE_OUTFIT;
  const [draftState, setDraftState] = useState<{
    themeId: string;
    outfit: ThoiTrangOutfit;
    undo: ThoiTrangOutfit[];
  }>(() => ({ themeId: view.theme.id, outfit: cloneOutfit(serverMyOutfit), undo: [] }));

  const activeDraft = draftState.themeId === view.theme.id ? draftState.outfit : serverMyOutfit;
  const activeUndo = useMemo(
    () => (draftState.themeId === view.theme.id ? draftState.undo : []),
    [draftState.themeId, draftState.undo, view.theme.id],
  );

  const [tab, setTab] = useState<ThoiTrangWardrobeTab>('top');
  const [skippedKey, setSkippedKey] = useState<string | null>(null);
  const skipped = skippedKey === view.theme.id;

  // Throttle tt_outfit socket sends cleanly
  const sendTimerRef = useRef<number | null>(null);
  const pendingOutfitRef = useRef<ThoiTrangOutfit | null>(null);
  const flushOutfit = useCallback(() => {
    if (sendTimerRef.current !== null) {
      window.clearTimeout(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    if (pendingOutfitRef.current) {
      const toSend = pendingOutfitRef.current;
      pendingOutfitRef.current = null;
      void game.act({ type: 'tt_outfit', outfit: toSend });
    }
  }, [game]);

  useEffect(() => () => {
    if (sendTimerRef.current !== null) window.clearTimeout(sendTimerRef.current);
  }, []);

  const handleOutfitChange = useCallback((next: ThoiTrangOutfit, recordUndo = true) => {
    if (isSpectator || view.phase !== 'dressing') return;
    const clean = validateOutfit(next).outfit;
    setDraftState((prev) => {
      const cur = prev.themeId === view.theme.id ? prev.outfit : cloneOutfit(serverMyOutfit);
      const prevUndo = prev.themeId === view.theme.id ? prev.undo : [];
      return {
        themeId: view.theme.id,
        outfit: clean,
        undo: recordUndo ? [...prevUndo.slice(-19), cur] : prevUndo,
      };
    });
    pendingOutfitRef.current = clean;
    if (sendTimerRef.current === null) {
      sendTimerRef.current = window.setTimeout(() => {
        sendTimerRef.current = null;
        flushOutfit();
      }, 180);
    }
  }, [flushOutfit, isSpectator, serverMyOutfit, view.phase, view.theme.id]);

  const handleUndo = useCallback(() => {
    if (isSpectator || view.phase !== 'dressing' || activeUndo.length === 0) return;
    const prevOutfit = activeUndo[activeUndo.length - 1];
    setDraftState((prev) => ({
      themeId: view.theme.id,
      outfit: prevOutfit,
      undo: prev.themeId === view.theme.id ? prev.undo.slice(0, -1) : [],
    }));
    pendingOutfitRef.current = prevOutfit;
    flushOutfit();
  }, [activeUndo, flushOutfit, isSpectator, view.phase, view.theme.id]);

  const handleToggleReady = useCallback(() => {
    if (isSpectator || view.phase !== 'dressing') return;
    flushOutfit();
    void game.act({ type: 'tt_ready', ready: !myReady });
  }, [flushOutfit, game, isSpectator, myReady, view.phase]);

  // Runway pose & cheer live stream
  const runwayKey = `${view.theme.id}:${view.runwayIndex}:${view.walkerId ?? ''}`;
  const [poseState, setPoseState] = useState<{ key: string; pose: ThoiTrangPoseId; nonce: number }>({
    key: runwayKey,
    pose: view.lastPose || 'catwalk',
    nonce: 0,
  });
  const [cheers, setCheers] = useState<ThoiTrangCheerBubble[]>([]);
  const cheerSeqRef = useRef(1);

  useEffect(() => {
    return game.onThoiTrangPose((payload) => {
      if (payload.kind === 'pose') {
        setPoseState((prev) => ({ key: runwayKey, pose: payload.pose, nonce: prev.nonce + 1 }));
      } else {
        const id = cheerSeqRef.current++;
        setCheers((prev) => [...prev.slice(-6), { id, name: payload.name, cheer: payload.cheer }]);
      }
    });
  }, [game, runwayKey]);

  const activeRunwayPose = poseState.key === runwayKey ? poseState.pose : (view.lastPose || 'catwalk');
  const activePoseNonce = poseState.key === runwayKey ? poseState.nonce : 0;

  // Live portraits of other players during dressing room
  const otherPlayers = useMemo(
    () => view.order.filter((id) => id !== me),
    [view.order, me],
  );
  const otherOutfits = useMemo(() => {
    const map: Record<string, ThoiTrangOutfit> = {};
    for (const id of otherPlayers) {
      if (view.outfits[id]) map[id] = view.outfits[id];
    }
    return map;
  }, [otherPlayers, view.outfits]);
  const portraits = useThoiTrangSnapshots(
    view.phase === 'dressing' ? otherOutfits : {},
    'portrait',
    112,
    112,
  );

  // ---------- Phase 4: Reveal ----------
  if (view.phase === 'reveal' && view.scores) {
    return (
      <View style={styles.bleed}>
        <ThoiTrangReveal
          theme={view.theme}
          scores={view.scores}
          outfits={view.outfits}
          me={me}
          countdownText={countdownText}
          skipped={skipped}
          mobile={mobile}
          topRightTools={<RoomMiniTools />}
          onSkip={() => {
            setSkippedKey(view.theme.id);
            void game.act({ type: 'tt_skip_reveal' });
          }}
        />
      </View>
    );
  }

  // ---------- Phase 3: Runway ----------
  if (view.phase === 'runway' && view.walkerId) {
    const walkerOutfit = view.outfits[view.walkerId] ?? BASE_OUTFIT;
    const walkerName = view.names[view.walkerId] ?? room.players.find((p) => p.id === view.walkerId)?.name ?? 'Thí sinh';
    const isWalker = me === view.walkerId;
    return (
      <View style={styles.bleed}>
        <ThoiTrangRunway
          theme={view.theme}
          walkerName={walkerName}
          walkerOutfit={walkerOutfit}
          runwayIndex={view.runwayIndex}
          totalWalkers={view.order.length}
          isWalker={isWalker}
          isSpectator={isSpectator}
          activePose={activeRunwayPose}
          poseNonce={activePoseNonce}
          catwalkNonce={view.runwayIndex + 1}
          myRating={view.myRating}
          ratedCount={view.ratedBy.length}
          cheers={cheers}
          countdownText={countdownText}
          mobile={mobile}
          topRightTools={<RoomMiniTools dark />}
          onPose={(pose: ThoiTrangPoseId) => {
            setPoseState((prev) => ({ key: runwayKey, pose, nonce: prev.nonce + 1 }));
            void game.act({ type: 'tt_pose', pose });
          }}
          onRate={(halfStars: number) => void game.act({ type: 'tt_rate', halfStars })}
          onCheer={(cheer: ThoiTrangCheerId) => void game.act({ type: 'tt_cheer', cheer })}
        />
      </View>
    );
  }

  // ---------- Phase 1 & 2: Theme Reveal & Dressing Room (v4 full-bleed pastel studio) ----------
  const isRevealBanner = view.phase === 'theme_reveal';
  return (
    <View testID={isRevealBanner ? 'tt-theme-reveal' : 'tt-dressing'} style={styles.bleed}>
      {/* Full-bleed pastel 3D doll stage */}
      <View style={StyleSheet.absoluteFill}>
        <ThoiTrangDollCanvas
          outfit={activeDraft}
          mode="wardrobe"
          interactive={!isRevealBanner}
          viewOffset={isRevealBanner ? 'none' : 'auto'}
          testID="tt-stage-canvas"
        />
      </View>

      {isRevealBanner ? (
        <View style={styles.revealOverlay}>
          <View style={styles.revealTopTools}><RoomMiniTools /></View>
          <View style={styles.revealCard}>
            <T style={styles.revealKicker}>✦ CHỦ ĐỀ SÀN DIỄN</T>
            <T style={styles.revealTitle}>{view.theme.title}</T>
            <T style={styles.revealDesc}>{view.theme.desc}</T>
            <View style={styles.revealTags}>
              {view.theme.tags.map((tg) => (
                <View key={tg} style={styles.revealTagPill}>
                  <T style={styles.revealTagTxt}>#{TAG_LABELS[tg] ?? tg}</T>
                </View>
              ))}
            </View>
            <View style={styles.revealPalRow}>
              {view.theme.palette.map((hex) => (
                <View key={hex} style={[styles.revealPalDot, { backgroundColor: hex }]} />
              ))}
            </View>
            <View style={styles.timerPill}>
              <T testID="tt-timer" style={styles.timerTxt}>Vào phòng thử đồ sau {countdownText}</T>
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Top theme banner + timer */}
          <View style={[styles.topBar, mobile ? styles.topBarMobile : styles.topBarDesktop]}>
            {!mobile && (
              <View style={styles.brandPill}>
                <T style={styles.brandTxt}>✦ Sàn Diễn</T>
              </View>
            )}
            <View style={styles.themePill}>
              <T style={styles.themeSmall}>CHỦ ĐỀ</T>
              <T numberOfLines={1} style={[styles.themeTitle, mobile && styles.themeTitleMobile]}>
                {view.theme.title}
              </T>
              {!mobile && <T numberOfLines={1} style={styles.themeDesc}>{view.theme.desc}</T>}
            </View>
            <View style={styles.timerPill}>
              <T testID="tt-timer" style={[styles.timerTxt, mobile && styles.timerTxtMobile]}>
                ⏱ {countdownText}
              </T>
            </View>
            <RoomMiniTools />
          </View>

          {/* Live room portrait strip (top-right row on desktop, right vertical stack on mobile) */}
          {otherPlayers.length > 0 && (
            <View
              testID="tt-room-strip"
              style={[styles.playersWrap, mobile ? styles.playersMobile : styles.playersDesktop]}
            >
              {otherPlayers.slice(0, mobile ? 5 : 6).map((pid) => {
                const isOk = view.ready.includes(pid);
                const shot = portraits[pid];
                const pname = view.names[pid] ?? pid;
                return (
                  <View key={pid} style={[styles.playerBubble, mobile && styles.playerBubbleMobile]}>
                    {shot ? (
                      Platform.OS === 'web' ? (
                        <img src={shot} alt={pname} title={pname} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Image source={{ uri: shot }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
                      )
                    ) : (
                      <T style={styles.playerInitial}>{pname.slice(0, 1).toUpperCase()}</T>
                    )}
                    {isOk && (
                      <View style={styles.playerOk}><T style={styles.playerOkTxt}>✓</T></View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Desktop left category rail */}
          {!mobile && (
            <View style={styles.railAnchor}>
              <ThoiTrangCategoryRail tab={tab} onSelectTab={setTab} />
            </View>
          )}

          {/* Closet panel (right glass panel desktop / bottom 46% sheet mobile) */}
          <View style={mobile ? styles.closetMobileAnchor : styles.closetDesktopAnchor}>
            <ThoiTrangWardrobe
              outfit={activeDraft}
              theme={view.theme}
              tab={tab}
              mobile={mobile}
              disabled={isSpectator}
              onSelectTab={setTab}
              onChangeOutfit={handleOutfitChange}
            />
          </View>

          {/* Bottom center Undo / Random / ✨ Xong! dock */}
          {!isSpectator && (
            <View style={[styles.dock, mobile ? styles.dockMobile : styles.dockDesktop]}>
              <Pressable
                testID="tt-undo"
                accessibilityRole="button"
                disabled={activeUndo.length === 0}
                onPress={handleUndo}
                style={[styles.roundBtn, mobile && styles.roundBtnMobile, activeUndo.length === 0 && styles.btnDim]}
              >
                <T style={styles.roundBtnTxt}>↶</T>
              </Pressable>
              <Pressable
                testID="tt-random"
                accessibilityRole="button"
                onPress={() => handleOutfitChange(buildRandomV4Outfit())}
                style={[styles.roundBtn, mobile && styles.roundBtnMobile]}
              >
                <T style={styles.roundBtnTxt}>🎲</T>
              </Pressable>
              <Pressable
                testID="tt-ready-btn"
                accessibilityRole="button"
                onPress={handleToggleReady}
                style={[styles.doneBtn, mobile && styles.doneBtnMobile, myReady && styles.doneBtnReady]}
              >
                <T style={[styles.doneBtnTxt, mobile && styles.doneBtnTxtMobile]}>
                  {myReady ? '✓ Đã xong!' : '✨ Xong!'}
                </T>
              </Pressable>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export function ThoiTrangScreen({ game, room }: { game: Game; room: RoomState }) {
  const view = room.game?.type === 'thoitrang' ? room.game : null;
  if (!view) return null;
  return (
    <Shell game={game} room={room} bare fullscreen scroll={false} hideStrip>
      <ThoiTrangInner game={game} room={room} view={view} />
    </Shell>
  );
}

const styles = StyleSheet.create({
  bleed: {
    flex: 1,
    marginHorizontal: -4,
    marginTop: -6,
    marginBottom: -4,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#f7e9f5',
  },
  topBar: { position: 'absolute', flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 4 },
  topBarDesktop: { top: 14, left: 96, right: 420 },
  topBarMobile: { top: 10, left: 10, right: 10, gap: 6 },
  brandPill: { paddingVertical: 9, paddingHorizontal: 15, borderRadius: 999, backgroundColor: V4.glass },
  brandTxt: { fontSize: 16, fontWeight: '800', color: V4.pink },
  themePill: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: V4.glass,
  },
  themeSmall: { fontSize: 10, fontWeight: '800', letterSpacing: 1.1, color: V4.pink },
  themeTitle: { fontSize: 15, fontWeight: '800', color: V4.ink },
  themeTitleMobile: { fontSize: 13 },
  themeDesc: { fontSize: 11.5, color: V4.ink2 },
  timerPill: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, backgroundColor: V4.pink },
  timerTxt: { fontSize: 15.5, fontWeight: '800', color: '#ffffff', fontVariant: ['tabular-nums'] },
  timerTxtMobile: { fontSize: 13 },
  miniTools: { flexDirection: 'row', gap: 5 },
  miniBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniBtnTxt: { fontSize: 14, fontWeight: '800' },
  miniDot: { position: 'absolute', top: 5, right: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: V4.pink },
  playersWrap: { position: 'absolute', zIndex: 4 },
  playersDesktop: { top: 14, right: 16, width: 392, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  playersMobile: { top: 68, right: 8, flexDirection: 'column', gap: 5 },
  playerBubble: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#ffffff',
    borderWidth: 3,
    borderColor: '#ffffff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  playerBubbleMobile: { width: 38, height: 38, borderRadius: 19, borderWidth: 2 },
  playerInitial: { fontSize: 16, fontWeight: '800', color: V4.pink },
  playerOk: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: V4.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerOkTxt: { fontSize: 10, fontWeight: '800', color: '#ffffff' },
  railAnchor: { position: 'absolute', left: 14, top: 14, bottom: 14, justifyContent: 'center', zIndex: 4 },
  closetDesktopAnchor: { position: 'absolute', right: 16, top: 76, bottom: 14, width: 392, zIndex: 4 },
  closetMobileAnchor: { position: 'absolute', left: 6, right: 6, bottom: 0, height: '48%', zIndex: 4 },
  dock: { position: 'absolute', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, zIndex: 4 },
  dockDesktop: { bottom: 20, left: 96, right: 420 },
  dockMobile: { bottom: '49.5%', left: 0, right: 0 },
  roundBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: V4.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundBtnMobile: { width: 40, height: 40, borderRadius: 20 },
  roundBtnTxt: { fontSize: 19, fontWeight: '800', color: V4.ink },
  btnDim: { opacity: 0.45 },
  doneBtn: { paddingVertical: 14, paddingHorizontal: 34, borderRadius: 999, backgroundColor: V4.pink },
  doneBtnMobile: { paddingVertical: 10, paddingHorizontal: 22 },
  doneBtnReady: { backgroundColor: '#2fb886' },
  doneBtnTxt: { fontSize: 16.5, fontWeight: '800', color: '#ffffff' },
  doneBtnTxtMobile: { fontSize: 14 },
  revealOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(253,228,241,0.35)',
    zIndex: 5,
  },
  revealTopTools: { position: 'absolute', top: 14, right: 16 },
  revealCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  revealKicker: { fontSize: 11.5, fontWeight: '800', letterSpacing: 1.5, color: V4.pink },
  revealTitle: { fontSize: 22, fontWeight: '800', color: V4.ink, textAlign: 'center' },
  revealDesc: { fontSize: 14, color: V4.ink2, textAlign: 'center', lineHeight: 20 },
  revealTags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  revealTagPill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, backgroundColor: V4.soft },
  revealTagTxt: { fontSize: 12, fontWeight: '700', color: V4.pink },
  revealPalRow: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  revealPalDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ffffff' },
});
