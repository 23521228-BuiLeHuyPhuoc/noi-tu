import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import {
  CROAK_DT, CROAK_FROG_H, CROAK_FROG_W, CROAK_STAGES,
  computeSpitArc, platformRectAt,
  type CroakInput, type CroakSoundFx, type CroakSquadView, type CroakTickPayload,
} from '../../../shared/src/croaksquad';
import { PLAYER_COLORS, type PublicPlayer, type RoomState } from '../../../shared/src/types';
import type { Game } from '../useGame';
import { isMuted } from '../sound';
import { useStableWindow } from '../hooks';
import { C, FONT, sticker } from '../theme';
import { Button, T } from '../ui';
import { Shell, type StripOptions } from '../components/Shell';
import { EmojiIcon, UiIcon } from '../components/Icons';
import { Confetti } from '../components/Fun';

function playCroakSfx(sfx: CroakSoundFx): void {
  if (Platform.OS !== 'web' || isMuted()) return;
  try {
    const AudioCtx = (globalThis as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (sfx === 'jump') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.11);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (sfx === 'tongue' || sfx === 'swallow') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(sfx === 'swallow' ? 190 : 380, now);
      osc.frequency.exponentialRampToValueAtTime(sfx === 'swallow' ? 440 : 210, now + 0.13);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      osc.start(now);
      osc.stop(now + 0.14);
    } else if (sfx === 'spit' || sfx === 'bounce') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(760, now + 0.16);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);
      osc.start(now);
      osc.stop(now + 0.17);
    } else if (sfx === 'switch' || sfx === 'key' || sfx === 'checkpoint' || sfx === 'stage_clear') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(660, now + 0.07);
      osc.frequency.setValueAtTime(sfx === 'stage_clear' ? 880 : 784, now + 0.14);
      gain.gain.setValueAtTime(0.11, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (sfx === 'die') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(95, now + 0.2);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);
      osc.start(now);
      osc.stop(now + 0.21);
    }
    setTimeout(() => void ctx.close().catch(() => {}), 400);
  } catch {
    // WebAudio bị trình duyệt chặn trước tương tác đầu tiên: bỏ qua an toàn
  }
}

const AIM_PRESETS: { id: string; label: string; angleRight: number; angleLeft: number; power: number }[] = [
  { id: 'high_left', label: '↖ Cao Trái', angleRight: -Math.PI * 0.68, angleLeft: -Math.PI * 0.68, power: 0.88 },
  { id: 'up', label: '↑ Thẳng Lên', angleRight: -Math.PI * 0.5, angleLeft: -Math.PI * 0.5, power: 0.92 },
  { id: 'high_right', label: '↗ Cao Phải', angleRight: -Math.PI * 0.32, angleLeft: -Math.PI * 0.32, power: 0.88 },
  { id: 'far_fwd', label: '➡ Bắn Xa', angleRight: -Math.PI * 0.2, angleLeft: -Math.PI * 0.8, power: 0.96 },
];

export function CroakSquadScreen({ game, room }: { game: Game; room: RoomState }) {
  const baseView = room.game as CroakSquadView;
  const [liveTick, setLiveTick] = useState<CroakTickPayload | null>(null);
  const [fullMap, setFullMap] = useState(false);
  const [aimAngle, setAimAngle] = useState<number>(-Math.PI * 0.32);
  const [aimPower, setAimPower] = useState<number>(0.86);
  const [toastText, setToastText] = useState<string | null>(null);

  const lastEventIdRef = useRef<number>(0);
  const moveDirRef = useRef<-1 | 0 | 1>(0);
  const keysDownRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });
  const seqRef = useRef<number>(1);

  const { width } = useStableWindow();
  const wide = width >= 760;
  const me = game.me ?? '';
  const isHost = room.hostId === me;

  useEffect(() => {
    return game.onCroakTick((payload) => {
      setLiveTick(payload);
      if (payload.events.length > 0) {
        for (const ev of payload.events) {
          if (ev.id > lastEventIdRef.current) {
            lastEventIdRef.current = ev.id;
            playCroakSfx(ev.sfx);
            if (ev.text) setToastText(ev.text);
          }
        }
      }
    });
  }, [game]);

  useEffect(() => {
    if (!toastText) return;
    const t = setTimeout(() => setToastText(null), 2600);
    return () => clearTimeout(t);
  }, [toastText]);

  const effectiveTick = liveTick && liveTick.stageIndex === baseView.stageIndex && liveTick.tick >= baseView.tick
    ? liveTick
    : null;

  const stageIndex = effectiveTick?.stageIndex ?? baseView.stageIndex;
  const stage = CROAK_STAGES[Math.max(0, Math.min(CROAK_STAGES.length - 1, stageIndex))];
  const tick = effectiveTick?.tick ?? baseView.tick;
  const elapsedSec = tick * CROAK_DT;
  const switchesOn = effectiveTick?.switchesOn ?? baseView.switchesOn;
  const keysCollected = effectiveTick?.keysCollected ?? baseView.keysCollected;
  const activeCheckpointId = effectiveTick?.activeCheckpointId ?? baseView.activeCheckpointId;
  const frogs = effectiveTick?.frogs ?? baseView.frogs;

  const colorMap = useMemo(() => {
    const m = new Map<string, string>();
    room.players.forEach((p, idx) => {
      const cIdx = p.character?.color ?? idx;
      m.set(p.id, PLAYER_COLORS[cIdx % PLAYER_COLORS.length].hex);
    });
    return m;
  }, [room.players]);

  const myFrog = useMemo(() => frogs.find((f) => f.id === me) ?? null, [frogs, me]);
  const isSpectator = !myFrog;

  const sendInput = useCallback((patch: Partial<CroakInput>) => {
    const payload: CroakInput = {
      seq: seqRef.current++,
      moveX: patch.moveX ?? moveDirRef.current,
      aimAngle: patch.aimAngle ?? aimAngle,
      aimPower: patch.aimPower ?? aimPower,
      ...(patch.jump ? { jump: true } : {}),
      ...(patch.tongue ? { tongue: true } : {}),
      ...(patch.spit ? { spit: true } : {}),
    };
    void game.act({ type: 'cs_input', input: payload });
  }, [aimAngle, aimPower, game]);

  const setMoveDir = useCallback((dir: -1 | 0 | 1) => {
    moveDirRef.current = dir;
    if (dir === 1 && Math.cos(aimAngle) < -0.25) {
      const flipped = -Math.PI - aimAngle;
      setAimAngle(flipped);
      void game.act({ type: 'cs_input', input: { seq: seqRef.current++, moveX: dir, aimAngle: flipped, aimPower } });
      return;
    }
    if (dir === -1 && Math.cos(aimAngle) > 0.25) {
      const flipped = -Math.PI - aimAngle;
      setAimAngle(flipped);
      void game.act({ type: 'cs_input', input: { seq: seqRef.current++, moveX: dir, aimAngle: flipped, aimPower } });
      return;
    }
    void game.act({ type: 'cs_input', input: { seq: seqRef.current++, moveX: dir, aimAngle, aimPower } });
  }, [aimAngle, aimPower, game]);

  // Điều khiển bàn phím trên Web (WASD / Phím mũi tên / Space / J / Q / E)
  useEffect(() => {
    if (Platform.OS !== 'web' || isSpectator) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (!keysDownRef.current.left) {
          keysDownRef.current.left = true;
          setMoveDir(-1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (!keysDownRef.current.right) {
          keysDownRef.current.right = true;
          setMoveDir(1);
        }
      } else if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        e.preventDefault();
        sendInput({ jump: true });
      } else if (e.key === 'j' || e.key === 'J' || e.key === 'Enter') {
        e.preventDefault();
        if (myFrog?.state === 'carrying') sendInput({ spit: true });
        else sendInput({ tongue: true });
      } else if (e.key === 'q' || e.key === 'Q') {
        setAimAngle((prev) => {
          const next = Math.max(-Math.PI * 0.92, prev - 0.14);
          void game.act({ type: 'cs_input', input: { seq: seqRef.current++, moveX: moveDirRef.current, aimAngle: next, aimPower } });
          return next;
        });
      } else if (e.key === 'e' || e.key === 'E') {
        setAimAngle((prev) => {
          const next = Math.min(-Math.PI * 0.08, prev + 0.14);
          void game.act({ type: 'cs_input', input: { seq: seqRef.current++, moveX: moveDirRef.current, aimAngle: next, aimPower } });
          return next;
        });
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        keysDownRef.current.left = false;
        setMoveDir(keysDownRef.current.right ? 1 : 0);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        keysDownRef.current.right = false;
        setMoveDir(keysDownRef.current.left ? -1 : 0);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [aimPower, game, isSpectator, myFrog?.state, sendInput, setMoveDir]);

  // Tính camera thông minh bám nhân vật (hoặc người đang ngậm mình)
  const focusFrog = useMemo(() => {
    if (!myFrog) return frogs[0] ?? null;
    if (myFrog.state === 'swallowed' && myFrog.carrierId) {
      return frogs.find((f) => f.id === myFrog.carrierId) ?? myFrog;
    }
    return myFrog;
  }, [frogs, myFrog]);

  const cam = useMemo(() => {
    if (fullMap) {
      return { x: 0, y: 0, w: stage.width, h: stage.height };
    }
    const viewW = wide ? Math.min(stage.width, 1080) : Math.min(stage.width, 680);
    const viewH = wide ? Math.min(stage.height, 600) : Math.min(stage.height, 490);
    const cx = focusFrog ? focusFrog.x + CROAK_FROG_W * 0.5 : stage.spawn.x;
    const cy = focusFrog ? focusFrog.y + CROAK_FROG_H * 0.5 : stage.spawn.y;
    const x = Math.max(0, Math.min(stage.width - viewW, Math.round(cx - viewW * 0.45)));
    const y = Math.max(0, Math.min(stage.height - viewH, Math.round(cy - viewH * 0.56)));
    return { x, y, w: viewW, h: viewH };
  }, [focusFrog, fullMap, stage, wide]);

  // Đường ngắm quỹ đạo khi có bất kỳ ếch nào đang ngậm đồng đội
  const activeArcs = useMemo(() => {
    return frogs
      .filter((f) => f.state === 'carrying' && f.bellyId)
      .map((f) => ({
        carrierId: f.id,
        color: colorMap.get(f.bellyId!) ?? '#FDE047',
        pts: computeSpitArc(
          f.x,
          f.y,
          f.id === me ? aimAngle : f.aimAngle,
          f.id === me ? aimPower : f.aimPower,
          stage,
          switchesOn,
          keysCollected,
          elapsedSec,
          22,
        ),
      }));
  }, [aimAngle, aimPower, colorMap, elapsedSec, frogs, keysCollected, me, stage, switchesOn]);

  const connectedFrogs = frogs.filter((f) => f.connected);
  const finishedCount = connectedFrogs.filter((f) => f.state === 'finished').length;

  const strip: StripOptions = useMemo(
    () => ({
      order: baseView.order,
      dim: (p: PublicPlayer) => !p.connected,
      ring: (p: PublicPlayer) => {
        const f = frogs.find((x) => x.id === p.id);
        if (f?.state === 'finished') return '#FACC15';
        if (f?.state === 'carrying') return '#EC4899';
        return undefined;
      },
      sub: (p: PublicPlayer) => {
        const f = frogs.find((x) => x.id === p.id);
        if (!f) return undefined;
        if (f.state === 'finished') return 'Về đích!';
        if (f.state === 'carrying') return 'Ngậm bạn';
        if (f.state === 'swallowed') return 'Trong bụng';
        if (f.state === 'dead') return 'Bong bóng';
        return f.spits > 0 ? `${f.spits} nhổ` : undefined;
      },
    }),
    [baseView.order, frogs],
  );

  const applyAimPreset = (p: typeof AIM_PRESETS[number]) => {
    const facing = myFrog?.facing ?? 1;
    const ang = facing >= 0 ? p.angleRight : p.angleLeft;
    setAimAngle(ang);
    setAimPower(p.power);
    void game.act({
      type: 'cs_input',
      input: { seq: seqRef.current++, moveX: moveDirRef.current, aimAngle: ang, aimPower: p.power },
    });
  };

  return (
    <Shell game={game} room={room} strip={strip} wide>
      {finishedCount > 0 && finishedCount >= connectedFrogs.length && <Confetti />}

      {/* Thanh tiêu đề Màn chơi & Gợi ý phối hợp */}
      <View style={[styles.stageBar, sticker(3)]} testID="croak-stage-bar">
        <View style={styles.stageTop}>
          <View style={styles.stageBadge}>
            <EmojiIcon emoji="🐸" size={18} />
            <T style={styles.stageBadgeTxt}>
              MÀN {stageIndex + 1}/{CROAK_STAGES.length}
            </T>
          </View>
          <T style={styles.stageTitle} numberOfLines={1}>
            {stage.name.replace(/^Màn \d+:\s*/, '')}
          </T>
          <View style={styles.goalCounter}>
            <EmojiIcon emoji="🪷" size={14} />
            <T style={styles.goalCounterTxt}>
              {finishedCount}/{Math.max(1, connectedFrogs.length)}
            </T>
          </View>
          <Pressable
            testID="croak-fullmap-toggle"
            onPress={() => setFullMap((v) => !v)}
            style={[styles.mapToggle, fullMap && styles.mapToggleActive]}
          >
            <UiIcon name={fullMap ? 'Minimize2' : 'Maximize2'} size={14} color={fullMap ? '#0F172A' : '#E2E8F0'} />
            <T style={[styles.mapToggleTxt, fullMap && { color: '#0F172A' }]}>{fullMap ? 'Cận cảnh' : 'Toàn cảnh'}</T>
          </Pressable>
        </View>
        <T style={styles.stageHint}>{toastText ?? stage.hint}</T>
      </View>

      {/* Khung Thế Giới Vật Lý 2D Đầm Lầy */}
      <View style={[styles.viewportWrap, sticker(4)]} testID="croak-viewport">
        <Svg
          width="100%"
          height={wide ? 390 : 275}
          viewBox={`${cam.x} ${cam.y} ${cam.w} ${cam.h}`}
          preserveAspectRatio="xMidYMid slice"
        >
          <Defs>
            <LinearGradient id="swampSky" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#071925" />
              <Stop offset="55%" stopColor="#0D333E" />
              <Stop offset="100%" stopColor="#134E4A" />
            </LinearGradient>
            <LinearGradient id="mossTop" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#4ADE80" />
              <Stop offset="100%" stopColor="#16A34A" />
            </LinearGradient>
            <LinearGradient id="earthBody" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#3F2E21" />
              <Stop offset="100%" stopColor="#1E1610" />
            </LinearGradient>
            <LinearGradient id="stoneBody" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#64748B" />
              <Stop offset="100%" stopColor="#334155" />
            </LinearGradient>
            <LinearGradient id="lotusGlow" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FEF08A" stopOpacity="0.9" />
              <Stop offset="100%" stopColor="#F59E0B" stopOpacity="0.2" />
            </LinearGradient>
          </Defs>

          {/* Nền trời đầm lầy & đom đóm phát sáng */}
          <Rect x={cam.x} y={cam.y} width={cam.w} height={cam.h} fill="url(#swampSky)" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
            const fx = ((i * 257 + 120) % stage.width);
            const fy = 90 + ((i * 97) % 280) + Math.sin(elapsedSec * 2 + i) * 12;
            return <Circle key={i} cx={fx} cy={fy} r={3.5} fill="#BEF264" opacity={0.55} />;
          })}

          {/* Bẫy bùn độc & gai nhọn */}
          {stage.hazards.map((hz) => (
            <G key={hz.id}>
              {hz.kind === 'swamp' ? (
                <>
                  <Rect x={hz.x} y={hz.y} width={hz.w} height={hz.h} rx={8} fill="#7E22CE" opacity={0.88} />
                  <Rect x={hz.x} y={hz.y} width={hz.w} height={9} rx={4} fill="#C084FC" opacity={0.85} />
                  <Circle cx={hz.x + hz.w * 0.28} cy={hz.y + 8 - ((tick + 5) % 10)} r={5} fill="#E9D5FF" opacity={0.8} />
                  <Circle cx={hz.x + hz.w * 0.72} cy={hz.y + 10 - ((tick + 11) % 12)} r={4} fill="#86EFAC" opacity={0.8} />
                </>
              ) : (
                <G>
                  <Rect x={hz.x} y={hz.y + hz.h - 8} width={hz.w} height={8} fill="#475569" />
                  {Array.from({ length: Math.max(2, Math.floor(hz.w / 18)) }, (_, idx) => {
                    const sx = hz.x + idx * 18;
                    return (
                      <Path
                        key={idx}
                        d={`M ${sx} ${hz.y + hz.h} L ${sx + 9} ${hz.y} L ${sx + 18} ${hz.y + hz.h} Z`}
                        fill="#F43F5E"
                        stroke="#FFE4E6"
                        strokeWidth={1.2}
                      />
                    );
                  })}
                </G>
              )}
            </G>
          ))}

          {/* Địa hình & Cầu gỗ / Nấm nhún / Bệ di động */}
          {stage.platforms.map((plat) => {
            const active = !plat.activeWhenSwitch || !!switchesOn[plat.activeWhenSwitch];
            const r = platformRectAt(plat, elapsedSec);
            if (!active) {
              return (
                <Rect
                  key={plat.id}
                  x={r.x}
                  y={r.y}
                  width={r.w}
                  height={r.h}
                  rx={6}
                  fill="rgba(251, 191, 36, 0.08)"
                  stroke="#FBBF24"
                  strokeWidth={2}
                  strokeDasharray="8,6"
                />
              );
            }
            if (plat.kind === 'bounce') {
              return (
                <G key={plat.id}>
                  <Rect x={r.x + r.w * 0.36} y={r.y + 10} width={r.w * 0.28} height={r.h - 6} rx={4} fill="#FDE68A" />
                  <Path
                    d={`M ${r.x} ${r.y + 14} Q ${r.x + r.w * 0.5} ${r.y - 12} ${r.x + r.w} ${r.y + 14} Z`}
                    fill="#EC4899"
                    stroke="#FBCFE8"
                    strokeWidth={2}
                  />
                  <Circle cx={r.x + r.w * 0.32} cy={r.y + 6} r={3.5} fill="#FDF2F8" />
                  <Circle cx={r.x + r.w * 0.66} cy={r.y + 7} r={3} fill="#FDF2F8" />
                </G>
              );
            }
            if (plat.kind === 'wood') {
              return (
                <G key={plat.id}>
                  <Rect x={r.x} y={r.y} width={r.w} height={r.h} rx={6} fill="#B45309" stroke="#FDE68A" strokeWidth={2} />
                  <Line x1={r.x + 8} y1={r.y + 7} x2={r.x + r.w - 8} y2={r.y + 7} stroke="#F59E0B" strokeWidth={2} />
                </G>
              );
            }
            if (plat.kind === 'stone') {
              return (
                <G key={plat.id}>
                  <Rect x={r.x} y={r.y} width={r.w} height={r.h} rx={6} fill="url(#stoneBody)" stroke="#94A3B8" strokeWidth={2} />
                  <Rect x={r.x + 4} y={r.y + 4} width={Math.max(8, r.w - 8)} height={5} rx={2} fill="#CBD5E1" opacity={0.45} />
                </G>
              );
            }
            return (
              <G key={plat.id}>
                <Rect x={r.x} y={r.y} width={r.w} height={r.h} rx={8} fill="url(#earthBody)" stroke="#14532D" strokeWidth={2} />
                <Rect x={r.x} y={r.y} width={r.w} height={Math.min(16, r.h)} rx={6} fill="url(#mossTop)" />
              </G>
            );
          })}

          {/* Công tắc giẫm mở cầu / mở cổng */}
          {stage.switches.map((sw) => {
            const on = !!switchesOn[sw.id];
            return (
              <G key={sw.id}>
                <Rect
                  x={sw.x}
                  y={on ? sw.y + 6 : sw.y}
                  width={sw.w}
                  height={on ? sw.h - 6 : sw.h}
                  rx={5}
                  fill={on ? '#22C55E' : '#EF4444'}
                  stroke="#FFFFFF"
                  strokeWidth={2}
                />
                {sw.label && (
                  <SvgText
                    x={sw.x + sw.w * 0.5}
                    y={sw.y - 8}
                    fill={on ? '#86EFAC' : '#FECACA'}
                    fontSize={12}
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {sw.label} {on ? '✓' : ''}
                  </SvgText>
                )}
              </G>
            );
          })}

          {/* Cổng đá chắn đường */}
          {stage.gates.map((gt) => {
            const opened = (gt.openBySwitch && switchesOn[gt.openBySwitch]) || (gt.openByKey && keysCollected[gt.openByKey]);
            if (opened) {
              return (
                <Rect
                  key={gt.id}
                  x={gt.x}
                  y={gt.y}
                  width={gt.w}
                  height={18}
                  rx={4}
                  fill="#22C55E"
                  opacity={0.45}
                />
              );
            }
            return (
              <G key={gt.id}>
                <Rect x={gt.x} y={gt.y} width={gt.w} height={gt.h} rx={6} fill="#7C2D12" stroke="#FBBF24" strokeWidth={2.5} />
                <Circle cx={gt.x + gt.w * 0.5} cy={gt.y + gt.h * 0.5} r={8} fill="#FACC15" />
              </G>
            );
          })}

          {/* Chìa khóa vàng lơ lửng */}
          {stage.keys.map((k) => {
            if (keysCollected[k.id]) return null;
            const bobY = k.y + Math.sin(elapsedSec * 4) * 5;
            return (
              <G key={k.id}>
                <Circle cx={k.x} cy={bobY} r={k.r + 5} fill="rgba(250, 204, 21, 0.24)" />
                <Circle cx={k.x} cy={bobY - 3} r={8} fill="#FACC15" stroke="#FEF08A" strokeWidth={2.5} />
                <Rect x={k.x - 2.5} y={bobY + 4} width={5} height={11} rx={2} fill="#FACC15" />
              </G>
            );
          })}

          {/* Cờ Checkpoint lồng đèn */}
          {stage.checkpoints.map((cp) => {
            const active = activeCheckpointId === cp.id;
            return (
              <G key={cp.id}>
                <Line x1={cp.x + 12} y1={cp.y + cp.h} x2={cp.x + 12} y2={cp.y + 8} stroke="#E2E8F0" strokeWidth={3.5} />
                <Path
                  d={`M ${cp.x + 14} ${cp.y + 8} L ${cp.x + 48} ${cp.y + 20} L ${cp.x + 14} ${cp.y + 32} Z`}
                  fill={active ? '#22C55E' : '#F59E0B'}
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
                {active && <Circle cx={cp.x + 12} cy={cp.y + 6} r={6} fill="#86EFAC" />}
              </G>
            );
          })}

          {/* Cổng Đích Hoa Sen Vàng */}
          <G>
            <Ellipse
              cx={stage.goal.x + stage.goal.w * 0.5}
              cy={stage.goal.y + stage.goal.h * 0.52}
              rx={stage.goal.w * 0.55}
              ry={stage.goal.h * 0.52}
              fill="url(#lotusGlow)"
              stroke="#FDE047"
              strokeWidth={3}
            />
            <Ellipse
              cx={stage.goal.x + stage.goal.w * 0.5}
              cy={stage.goal.y + stage.goal.h - 6}
              rx={stage.goal.w * 0.56}
              ry={9}
              fill="#22C55E"
              stroke="#BBF7D0"
              strokeWidth={2}
            />
            <SvgText
              x={stage.goal.x + stage.goal.w * 0.5}
              y={stage.goal.y - 10}
              fill="#FEF08A"
              fontSize={13}
              fontWeight="bold"
              textAnchor="middle"
            >
              ĐÍCH ({finishedCount}/{Math.max(1, connectedFrogs.length)})
            </SvgText>
          </G>

          {/* Đường ngắm bắn vòng cung trực quan (computeSpitArc) */}
          {activeArcs.map((arc) => (
            <G key={`arc-${arc.carrierId}`}>
              {arc.pts.map((pt, idx) => (
                <Circle
                  key={idx}
                  cx={pt.x}
                  cy={pt.y}
                  r={pt.hitWall ? 6.5 : Math.max(2.6, 5.2 - idx * 0.11)}
                  fill={pt.hitWall ? '#F43F5E' : arc.color}
                  stroke="#FFFFFF"
                  strokeWidth={pt.hitWall ? 2 : 1}
                  opacity={pt.hitWall ? 0.98 : 0.86}
                />
              ))}
            </G>
          ))}

          {/* Các chú Ếch Xóm Lầy (6 trạng thái trực quan) */}
          {frogs.map((f, fIdx) => {
            if (!f.connected) return null;
            const hex = colorMap.get(f.id) ?? '#22C55E';
            const name = baseView.names[f.id] ?? f.id;
            const cx = f.x + CROAK_FROG_W * 0.5;
            const cy = f.y + CROAK_FROG_H * 0.5;
            const crowdLift = frogs.some(
              (o, oIdx) =>
                oIdx < fIdx &&
                o.connected &&
                o.state !== 'swallowed' &&
                Math.abs(o.x - f.x) < 74 &&
                Math.abs(o.y - f.y) < 42,
            )
              ? 15
              : 0;

            if (f.state === 'swallowed') {
              return null; // Vẽ huy hiệu người trong bụng ngay trên đầu ếch đang ngậm bên dưới
            }

            if (f.state === 'dead') {
              return (
                <G key={f.id}>
                  <Circle cx={cx} cy={cy} r={20} fill="rgba(125, 211, 252, 0.28)" stroke="#BAE6FD" strokeWidth={2} strokeDasharray="4,3" />
                  <Circle cx={cx} cy={cy + 2} r={10} fill={hex} opacity={0.7} />
                  <SvgText x={cx} y={cy - 24} fill="#BAE6FD" fontSize={11} fontWeight="bold" textAnchor="middle">
                    🫧 {name}
                  </SvgText>
                </G>
              );
            }

            const isCarrying = f.state === 'carrying';
            const isLaunched = f.state === 'launched';
            const rx = isCarrying ? 21 : isLaunched ? 18 : 15.5;
            const ry = isCarrying ? 18 : isLaunched ? 11.5 : 13;
            const eyeOffsetX = f.facing * 5.5;
            const passengerName = f.bellyId ? (baseView.names[f.bellyId] ?? '') : '';

            return (
              <G key={f.id}>
                {/* Lưỡi hồng co giãn khi phóng lưỡi */}
                {f.tongueTicks > 0 && (
                  <G>
                    <Line
                      x1={cx + f.facing * 8}
                      y1={cy + 2}
                      x2={f.tongueEndX}
                      y2={f.tongueEndY}
                      stroke="#FB7185"
                      strokeWidth={6.5}
                      strokeLinecap="round"
                    />
                    <Circle cx={f.tongueEndX} cy={f.tongueEndY} r={6.5} fill="#F43F5E" stroke="#FFE4E6" strokeWidth={1.5} />
                  </G>
                )}

                {/* Vệt gió siêu tốc khi đang được nhổ bay */}
                {isLaunched && (
                  <Ellipse
                    cx={cx - Math.sign(f.vx || 1) * 14}
                    cy={cy}
                    rx={12}
                    ry={7}
                    fill="rgba(250, 204, 21, 0.35)"
                  />
                )}

                {/* Thân ếch tròn trịa (phình má to khi đang ngậm bạn!) */}
                <Ellipse
                  cx={cx}
                  cy={cy + (isCarrying ? -2 : 0)}
                  rx={rx}
                  ry={ry}
                  fill={hex}
                  stroke={f.id === me ? '#FEF08A' : '#FFFFFF'}
                  strokeWidth={f.id === me ? 3 : 2}
                />
                {/* Bụng kem xinh xắn */}
                <Ellipse
                  cx={cx + f.facing * 2}
                  cy={cy + 3}
                  rx={rx * 0.62}
                  ry={ry * 0.52}
                  fill="#FEF9C3"
                  opacity={0.9}
                />
                {/* Đôi mắt lồi ngộ nghĩnh */}
                <Circle cx={cx + eyeOffsetX - 4} cy={cy - ry + 2} r={5.2} fill="#FFFFFF" stroke="#0F172A" strokeWidth={1.5} />
                <Circle cx={cx + eyeOffsetX + 5} cy={cy - ry + 2} r={5.2} fill="#FFFFFF" stroke="#0F172A" strokeWidth={1.5} />
                <Circle cx={cx + eyeOffsetX - 3 + f.facing * 1.3} cy={cy - ry + 2} r={2.3} fill="#0F172A" />
                <Circle cx={cx + eyeOffsetX + 6 + f.facing * 1.3} cy={cy - ry + 2} r={2.3} fill="#0F172A" />
                {/* Má phính hồng hào */}
                <Circle cx={cx + f.facing * 8} cy={cy + 2} r={isCarrying ? 5 : 3} fill="#FB7185" opacity={0.85} />

                {/* Vương miện nhỏ khi đã chạm Cổng Hoa Sen */}
                {f.state === 'finished' && (
                  <Path
                    d={`M ${cx - 8} ${cy - ry - 5} L ${cx - 5} ${cy - ry - 14} L ${cx} ${cy - ry - 8} L ${cx + 5} ${cy - ry - 14} L ${cx + 8} ${cy - ry - 5} Z`}
                    fill="#FACC15"
                    stroke="#FEF08A"
                    strokeWidth={1.2}
                  />
                )}

                {/* Nhãn tên người chơi + báo hiệu đang ngậm ai */}
                <SvgText
                  x={cx}
                  y={cy - ry - (f.state === 'finished' ? 18 : 9) - crowdLift}
                  fill={f.id === me ? '#FDE047' : '#F8FAFC'}
                  fontSize={12}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {name}{isCarrying && passengerName ? ` (ngậm ${passengerName})` : ''}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Thanh chọn nhanh góc bắn khi đang ngậm đồng đội */}
      {myFrog?.state === 'carrying' && (
        <View style={[styles.aimBar, sticker(2)]} testID="croak-aim-bar">
          <T style={styles.aimTitle}>
            🎯 Đang ngậm {baseView.names[myFrog.bellyId ?? ''] ?? 'đồng đội'} — Chọn góc bắn:
          </T>
          <View style={styles.aimChips}>
            {AIM_PRESETS.map((p) => (
              <Pressable
                key={p.id}
                testID={`croak-aim-${p.id}`}
                onPress={() => applyAimPreset(p)}
                style={styles.aimChip}
              >
                <T style={styles.aimChipTxt}>{p.label}</T>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Bộ Tay Cầm Cảm Ứng Chuẩn Mobile & Desktop */}
      {!isSpectator ? (
        <View style={[styles.padWrap, sticker(3)]} testID="croak-controls">
          {/* Cụm di chuyển Trái / Phải */}
          <View style={styles.dpad}>
            <Pressable
              testID="croak-left"
              onPressIn={() => setMoveDir(-1)}
              onPressOut={() => setMoveDir(0)}
              style={({ pressed }) => [styles.dpadBtn, pressed && styles.dpadBtnActive]}
            >
              <UiIcon name="ChevronLeft" size={28} color="#FFFFFF" />
              <T style={styles.dpadLbl}>TRÁI</T>
            </Pressable>
            <Pressable
              testID="croak-right"
              onPressIn={() => setMoveDir(1)}
              onPressOut={() => setMoveDir(0)}
              style={({ pressed }) => [styles.dpadBtn, pressed && styles.dpadBtnActive]}
            >
              <UiIcon name="ChevronRight" size={28} color="#FFFFFF" />
              <T style={styles.dpadLbl}>PHẢI</T>
            </Pressable>
          </View>

          {/* Cụm hành động Nhảy + Phóng Lưỡi / Nhổ Bắn */}
          <View style={styles.actionCluster}>
            <Pressable
              testID="croak-jump"
              onPress={() => sendInput({ jump: true })}
              style={({ pressed }) => [styles.jumpBtn, pressed && styles.btnPressed]}
            >
              <EmojiIcon emoji="🐸" size={20} />
              <T style={styles.actionBtnTxt}>
                {myFrog?.state === 'swallowed' ? 'GIÃY THOÁT!' : 'NHẢY'}
              </T>
            </Pressable>

            {myFrog?.state === 'carrying' ? (
              <Pressable
                testID="croak-spit"
                onPress={() => sendInput({ spit: true })}
                style={({ pressed }) => [styles.spitBtn, pressed && styles.btnPressed]}
              >
                <EmojiIcon emoji="🚀" size={20} />
                <T style={[styles.actionBtnTxt, { color: '#0F172A' }]}>BẮN BẠN!</T>
              </Pressable>
            ) : (
              <Pressable
                testID="croak-tongue"
                onPress={() => sendInput({ tongue: true })}
                style={({ pressed }) => [styles.tongueBtn, pressed && styles.btnPressed]}
              >
                <EmojiIcon emoji="👅" size={20} />
                <T style={styles.actionBtnTxt}>NUỐT BẠN</T>
              </Pressable>
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.spectatorBanner, sticker(2)]}>
          <T style={styles.spectatorTxt}>Bạn đang theo dõi đội Ếch vượt đầm lầy ở chế độ Khán Giả.</T>
        </View>
      )}

      {/* Tiện ích Chủ Phòng: Chơi lại màn hiện tại nếu kẹt / Kết thúc sớm */}
      {isHost && (
        <View style={styles.hostRow}>
          <Button
            testID="croak-reset-stage"
            small
            variant="paper"
            icon="🔄"
            title="Đặt lại màn này"
            onPress={() => void game.act({ type: 'cs_reset_stage' })}
          />
          <Button
            testID="croak-end"
            small
            variant="ghost"
            title="Tổng kết ván"
            onPress={() => void game.act({ type: 'end' })}
          />
        </View>
      )}
    </Shell>
  );
}

const styles = StyleSheet.create({
  stageBar: {
    backgroundColor: '#0F292E',
    borderColor: '#2DD4BF',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 5,
  },
  stageTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  stageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#14B8A6',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  stageBadgeTxt: { fontSize: 11.5, fontWeight: '900', color: '#042F2E', fontFamily: FONT },
  stageTitle: { fontSize: 15, fontWeight: '900', color: '#F0FDFA', flex: 1, minWidth: 110, fontFamily: FONT },
  goalCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(250, 204, 21, 0.18)',
    borderWidth: 1,
    borderColor: '#FACC15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  goalCounterTxt: { fontSize: 12, fontWeight: '900', color: '#FEF08A' },
  mapToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  mapToggleActive: { backgroundColor: '#FACC15', borderColor: '#FEF08A' },
  mapToggleTxt: { fontSize: 11, fontWeight: '800', color: '#E2E8F0' },
  stageHint: { fontSize: 12, fontWeight: '700', color: '#99F6E4', lineHeight: 16 },

  viewportWrap: {
    backgroundColor: '#071925',
    borderColor: '#34D399',
    borderRadius: 20,
    overflow: 'hidden',
  },

  aimBar: {
    backgroundColor: '#31102F',
    borderColor: '#F472B6',
    borderRadius: 16,
    padding: 10,
    gap: 7,
  },
  aimTitle: { fontSize: 12.5, fontWeight: '900', color: '#FBCFE8' },
  aimChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  aimChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 114, 182, 0.22)',
    borderWidth: 1.5,
    borderColor: '#F472B6',
  },
  aimChipTxt: { fontSize: 12, fontWeight: '900', color: '#FDF2F8' },

  padWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#0F172A',
    borderColor: '#475569',
    borderRadius: 20,
    padding: 10,
  },
  dpad: { flexDirection: 'row', gap: 8 },
  dpadBtn: {
    width: 68,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    borderWidth: 2,
    borderColor: '#64748B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dpadBtnActive: { backgroundColor: '#334155', borderColor: '#38BDF8', transform: [{ scale: 0.96 }] },
  dpadLbl: { fontSize: 10, fontWeight: '900', color: '#CBD5E1' },

  actionCluster: { flexDirection: 'row', gap: 8, flex: 1, justifyContent: 'flex-end' },
  jumpBtn: {
    flex: 1,
    maxWidth: 118,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#16A34A',
    borderWidth: 2,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tongueBtn: {
    flex: 1,
    maxWidth: 126,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#DB2777',
    borderWidth: 2,
    borderColor: '#F9A8D4',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  spitBtn: {
    flex: 1,
    maxWidth: 132,
    height: 62,
    borderRadius: 16,
    backgroundColor: '#FACC15',
    borderWidth: 2.5,
    borderColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  btnPressed: { transform: [{ scale: 0.95 }], opacity: 0.9 },
  actionBtnTxt: { fontSize: 12, fontWeight: '900', color: '#FFFFFF', fontFamily: FONT },

  spectatorBanner: {
    backgroundColor: '#1E293B',
    borderColor: '#64748B',
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  spectatorTxt: { fontSize: 13, fontWeight: '800', color: C.paper, textAlign: 'center' },
  hostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
});
