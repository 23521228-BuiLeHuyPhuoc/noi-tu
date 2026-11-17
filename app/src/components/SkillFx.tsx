import { useMeasuredView, viewRect } from '../viewMeasurements';
/**
 * Hiệu ứng của kỹ năng chọc trả Ruby, quà tặng và hiệu ứng vào phòng.
 * - sét / băng / bánh kem / nước / chó / paparazzi / hù ma / ấn ký / thiên thạch / hố đen / rồng thần: phủ lên màn hình người bị chọc
 * - tên lửa / hôn gió / mũi tên ái tình / cá mập: bay từ người gửi tới avatar người nhận
 * - quà: hiệu ứng tràn màn hình cho cả phòng, không chặn thao tác (tới Cung Điện Ngân Hà 5000💎)
 * - vào phòng: 7 mẫu hiệu ứng khi vào phòng
 * Chỉ để vui, không ảnh hưởng ván chơi.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Dimensions,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { shopItem } from "../../../shared/src/shop";
import type { FunEvent, PublicPlayer } from "../../../shared/src/types";
import type { Game } from "../useGame";
import { ViewportContext } from "../hooks";
import { setMood, setTint, setWobble } from "../funState";
import { play } from "../sound";
import { vibrate } from "../web";
import { C, FONT } from "../theme";
import { T, useFeed } from "../ui";
import { Confetti, rectOf, useShake, type Rect } from "./Fun";
import { ComicSkillFx, type ComicKind } from "./ComicSkillFx";
import { getSmoothModeSync } from "../smoothMode";

type Size = { w: number; h: number };
const ReducedMotion = createContext(false);
const EASE_IN = Easing.in(Easing.quad);
const EASE_OUT = Easing.out(Easing.quad);
/** giữ callback mới nhất mà không làm hiệu ứng chạy lại */
function useLatest<T>(v: T) {
  const r = useRef(v);
  useEffect(() => {
    r.current = v;
  }, [v]);
  return r;
}

/** chạy một Animated.Value 0 -> 1 trong `ms`, xong thì gọi onDone */
function useRun(
  ms: number,
  onDone: () => void,
  easing: (x: number) => number = Easing.linear,
) {
  const t = useState(() => new Animated.Value(0))[0];
  const [deadline] = useState(() => Date.now() + ms);
  const done = useLatest(onDone);
  const reduced = useContext(ReducedMotion);
  useEffect(() => {
    if (reduced) {
      t.setValue(0.45);
      const timer = setTimeout(
        () => done.current(),
        Math.max(0, Math.min(deadline - Date.now(), 1200)),
      );
      return () => clearTimeout(timer);
    }
    const a = Animated.timing(t, {
      toValue: 1,
      duration: Math.max(0, deadline - Date.now()),
      easing,
      useNativeDriver: false,
    });
    a.start(({ finished }) => finished && done.current());
    return () => a.stop();
  }, [t, ms, done, easing, reduced, deadline]);
  return t;
}

// ---------- bay từ người gửi tới người nhận ----------

type Flight = {
  id: number;
  emoji: string;
  from: Rect;
  to: Rect;
  ms: number;
  arc: boolean;
  after?: () => void;
};

function FlightFx({ f, onDone }: { f: Flight; onDone: () => void }) {
  const finish = useCallback(() => {
    f.after?.();
    onDone();
  }, [f, onDone]);
  const t = useRun(f.ms, finish, EASE_IN);
  const fx = f.from.x + f.from.w / 2 - 22;
  const fy = f.from.y + f.from.h / 2 - 22;
  const tx = f.to.x + f.to.w / 2 - 22;
  const ty = f.to.y + f.to.h / 2 - 22;
  // biểu tượng hướng lên (🚀 chếch 45°): quay về hướng bay
  const ang = (Math.atan2(ty - fy, tx - fx) * 180) / Math.PI + 45;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        zIndex: 90,
        left: t.interpolate({ inputRange: [0, 1], outputRange: [fx, tx] }),
        top: t.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [fy, f.arc ? Math.min(fy, ty) - 70 : (fy + ty) / 2, ty],
        }),
      }}
    >
      {!f.arc &&
        [1, 2, 3, 4, 5, 6, 7].map((i) => (
          <View
            key={i}
            style={{
              position: "absolute",
              left:
                20 -
                ((tx - fx) / Math.max(1, Math.hypot(tx - fx, ty - fy))) * i * 9,
              top:
                20 -
                ((ty - fy) / Math.max(1, Math.hypot(tx - fx, ty - fy))) * i * 9,
              width: 17 - i,
              height: 17 - i,
              borderRadius: 12,
              backgroundColor: i % 2 ? "#FFBA4A" : "#F67842",
              opacity: 1 - i / 9,
            }}
          />
        ))}
      <Animated.Text
        style={{
          fontSize: 44,
          transform: f.arc
            ? [
                {
                  rotate: t.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ]
            : [{ rotate: `${ang}deg` }],
        }}
      >
        {f.emoji}
      </Animated.Text>
    </Animated.View>
  );
}

/** nổ / tim bay lên tại avatar */
function Burst({
  emoji,
  at,
  big,
  onDone,
}: {
  emoji: string;
  at: Rect;
  big?: boolean;
  onDone: () => void;
}) {
  const t = useRun(big ? 1100 : 1800, onDone, EASE_OUT);
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: at.x + at.w / 2,
        top: at.y + at.h / 2,
        zIndex: 92,
      }}
    >
      {Array.from({ length: big ? 12 : 8 }, (_, i) => {
        const angle = (i * Math.PI * 2) / (big ? 12 : 8);
        return (
          <Animated.Text
            key={i}
            style={{
              position: "absolute",
              fontSize: big ? 19 : 23,
              color: i % 2 ? "#F1A62F" : "#E76751",
              opacity: t.interpolate({
                inputRange: [0, 0.65, 1],
                outputRange: [1, 1, 0],
              }),
              transform: [
                {
                  translateX: t.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, Math.cos(angle) * (big ? 95 : 65)],
                  }),
                },
                {
                  translateY: t.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      0,
                      Math.sin(angle) * (big ? 95 : 55) - (big ? 0 : 65),
                    ],
                  }),
                },
                { rotate: `${i * 32}deg` },
              ],
            }}
          >
            {big ? (i % 2 ? "◆" : "✦") : "♥"}
          </Animated.Text>
        );
      })}
      <Animated.Text
        style={{
          fontSize: big ? 65 : 38,
          marginLeft: big ? -32 : -19,
          marginTop: big ? -32 : -19,
          opacity: t.interpolate({
            inputRange: [0, 0.7, 1],
            outputRange: [1, 1, 0],
          }),
          transform: [
            {
              scale: t.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0.3, 1.3, 0.8],
              }),
            },
          ],
        }}
      >
        {emoji}
      </Animated.Text>
    </View>
  );
}

// ---------- quà tặng ----------

type GiftShow = { id: number; gift: string; from: string; to: string };

const GIFT_MS: Record<string, number> = {
  gift_rose: 3200,
  gift_cake: 4000,
  gift_diamond_ring: 3800,
  gift_car: 3600,
  gift_yacht: 4600,
  gift_private_jet: 4200,
  gift_castle: 5200,
  gift_golden_dragon: 5000,
  gift_island: 5200,
  gift_galaxy_palace: 5800,
};

function GiftFx({
  g,
  size,
  onDone,
}: {
  g: GiftShow;
  size: Size;
  onDone: () => void;
}) {
  const item = shopItem(g.gift);
  const ms = GIFT_MS[g.gift] ?? 3500;
  const t = useRun(ms, onDone);
  const emoji = item?.emoji ?? "🎁";
  const flyAcross =
    g.gift === "gift_car" ||
    g.gift === "gift_yacht" ||
    g.gift === "gift_private_jet" ||
    g.gift === "gift_golden_dragon";
  const grandStage =
    g.gift === "gift_castle" ||
    g.gift === "gift_island" ||
    g.gift === "gift_galaxy_palace" ||
    g.gift === "gift_diamond_ring";
  const isGalaxy = g.gift === "gift_galaxy_palace";
  const count = getSmoothModeSync() ? 8 : 16;
  const [hearts] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      x: Math.random() * Math.max(40, size.w - 40),
      d: Math.random() * 0.4,
      s: 24 + Math.random() * 22,
      e:
        g.gift === "gift_diamond_ring"
          ? i % 2 === 0 ? "💍" : "💎"
          : g.gift === "gift_galaxy_palace"
            ? i % 3 === 0 ? "🌌" : i % 3 === 1 ? "⭐" : "💎"
            : i % 3 === 0 ? "🌹" : "❤️",
      i,
    })),
  );
  const banner = (
    <Animated.View
      style={[
        styles.giftBanner,
        isGalaxy && { backgroundColor: "rgba(25,10,55,0.92)", borderColor: "#E879F9" },
        {
          opacity: t.interpolate({
            inputRange: [0, 0.08, 0.85, 1],
            outputRange: [0, 1, 1, 0],
          }),
          transform: [
            {
              scale: t.interpolate({
                inputRange: [0, 0.1, 1],
                outputRange: [0.6, 1.08, 1],
              }),
            },
          ],
        },
      ]}
    >
      <T style={[styles.giftText, isGalaxy && { color: "#F5D0FE" }]}>
        {isGalaxy ? "🌌 CHÍ TÔN TẶNG QUÀ: " : ""}
        {g.from} tặng {g.to} {emoji} {item?.name ?? "quà"}
      </T>
    </Animated.View>
  );
  return (
    <View
      testID={`gift-fx-${g.gift}`}
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {isGalaxy && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: "rgba(18, 8, 48, 0.55)",
              opacity: t.interpolate({ inputRange: [0, 0.12, 0.85, 1], outputRange: [0, 1, 1, 0] }),
            },
          ]}
        />
      )}
      {(g.gift === "gift_rose" || g.gift === "gift_diamond_ring" || isGalaxy) &&
        hearts.map((h) => (
          <Animated.Text
            key={h.i}
            style={{
              position: "absolute",
              left: h.x,
              fontSize: h.s,
              top: t.interpolate({
                inputRange: [h.d, 1],
                outputRange: [size.h + 20, -50],
                extrapolate: "clamp",
              }),
              opacity: t.interpolate({
                inputRange: [0, 0.8, 1],
                outputRange: [1, 1, 0],
              }),
            }}
          >
            {h.e}
          </Animated.Text>
        ))}
      {g.gift === "gift_cake" && (
        <>
          <Confetti />
          <Animated.View
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: size.h * 0.3,
              alignItems: "center",
              transform: [
                {
                  scale: t.interpolate({
                    inputRange: [0, 0.15, 0.5, 1],
                    outputRange: [0.2, 1.2, 1, 1.05],
                  }),
                },
              ],
              opacity: t.interpolate({
                inputRange: [0, 0.8, 1],
                outputRange: [1, 1, 0],
              }),
            }}
          >
            <Text style={{ fontSize: 110 }}>🎂</Text>
            <Text style={{ fontSize: 40, marginTop: -150, marginLeft: 6 }}>
              🕯️
            </Text>
          </Animated.View>
        </>
      )}
      {(flyAcross || grandStage) && (
        <>
          {(g.gift === "gift_castle" || g.gift === "gift_golden_dragon" || g.gift === "gift_island" || isGalaxy) && <Confetti />}
          <Animated.Text
            style={{
              position: "absolute",
              fontSize: isGalaxy ? 156 : grandStage ? 140 : 126,
              top: size.h * 0.33,
              left: grandStage
                ? size.w * 0.5 - (isGalaxy ? 78 : 70)
                : t.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-200, size.w + 60],
                  }),
              opacity: grandStage
                ? t.interpolate({
                    inputRange: [0, 0.12, 0.85, 1],
                    outputRange: [0, 1, 1, 0],
                  })
                : 1,
              transform: grandStage
                ? [
                    {
                      scale: t.interpolate({
                        inputRange: [0, 0.2, 1],
                        outputRange: [0.3, 1.15, 1],
                      }),
                    },
                  ]
                : [],
            }}
          >
            {isGalaxy ? "🏰" : emoji}
          </Animated.Text>
          {[0, 1, 2, 3].map((k) => (
            <Animated.Text
              key={k}
              style={{
                position: "absolute",
                fontSize: 28,
                top: size.h * 0.34 + 20 + (k % 2) * 70,
                left: t.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-200 - k * 40, size.w + 60 - k * 40],
                }),
                opacity: t.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.2, 1, 0.2],
                }),
              }}
            >
              {isGalaxy ? "🪐" : "✨"}
            </Animated.Text>
          ))}
        </>
      )}
      {banner}
    </View>
  );
}

const ENTRANCE_CFG: Record<string, { glyphA: string; glyphB: string; text: (n: string) => string; bg?: string; border?: string }> = {
  enter_star: { glyphA: "⭐", glyphB: "🌟", text: (n) => `🌟 ${n} đã xuất hiện!` },
  enter_red_carpet: { glyphA: "🌹", glyphB: "🟥", text: (n) => `🟥 Trải thảm đỏ đón ${n}!`, bg: "rgba(130,10,16,0.92)", border: "#FFD43B" },
  enter_supercar: { glyphA: "🏎️", glyphB: "💨", text: (n) => `🏎️ ${n} đánh siêu xe tới sảnh!`, bg: "rgba(15,23,42,0.9)", border: "#38BDF8" },
  enter_thunder_god: { glyphA: "⚡", glyphB: "🌩️", text: (n) => `🌩️ Lôi Thần ${n} giáng lâm!`, bg: "rgba(25,18,55,0.92)", border: "#38BDF8" },
  enter_fireworks: { glyphA: "🎆", glyphB: "🎇", text: (n) => `🎆 Pháo hoa rực rỡ đón ${n}!`, bg: "rgba(40,10,35,0.9)", border: "#FF6FA5" },
  enter_dragon_descent: { glyphA: "🐉", glyphB: "🔥", text: (n) => `🐉 Thần Long ${n} xuất thế!`, bg: "rgba(65,12,12,0.94)", border: "#FACC15" },
  enter_galaxy_portal: { glyphA: "🌀", glyphB: "🌌", text: (n) => `🌌 Chí Tôn ${n} bước ra từ Ngân Hà!`, bg: "rgba(22,8,55,0.95)", border: "#E879F9" },
};

/** hiệu ứng vào phòng đa dạng theo trang bị entrance */
function EntranceFx({
  name,
  fx,
  size,
  onDone,
}: {
  name: string;
  fx?: string;
  size: Size;
  onDone: () => void;
}) {
  const cfg = ENTRANCE_CFG[fx ?? "enter_star"] ?? ENTRANCE_CFG.enter_star;
  const t = useRun(3400, onDone);
  const count = getSmoothModeSync() ? 7 : 16;
  const [stars] = useState(() =>
    Array.from({ length: count }, (_, i) => ({
      x: Math.random() * Math.max(40, size.w - 30),
      d: Math.random() * 0.4,
      s: 22 + Math.random() * 20,
      i,
    })),
  );
  return (
    <View
      testID="entrance-fx"
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
    >
      {stars.map((s) => (
        <Animated.Text
          key={s.i}
          style={{
            position: "absolute",
            left: s.x,
            fontSize: s.s,
            top: t.interpolate({
              inputRange: [s.d, Math.min(1, s.d + 0.55)],
              outputRange: [-40, size.h * 0.72],
              extrapolate: "clamp",
            }),
            opacity: t.interpolate({
              inputRange: [0, 0.75, 1],
              outputRange: [1, 1, 0],
            }),
          }}
        >
          {s.i % 2 ? cfg.glyphA : cfg.glyphB}
        </Animated.Text>
      ))}
      <Animated.View
        style={[
          styles.giftBanner,
          cfg.bg ? { backgroundColor: cfg.bg } : null,
          cfg.border ? { borderColor: cfg.border } : null,
          {
            top: size.h * 0.22,
            opacity: t.interpolate({
              inputRange: [0, 0.1, 0.8, 1],
              outputRange: [0, 1, 1, 0],
            }),
          },
        ]}
      >
        <T style={styles.giftText}>{cfg.text(name)}</T>
      </Animated.View>
    </View>
  );
}

type VipScreenKind = "paparazzi" | "ghost_scare" | "royal_seal" | "blackhole" | "dragon_roar" | "meteor";

function VipSkillScreenFx({
  kind,
  size,
  onDone,
}: {
  kind: VipScreenKind;
  size: Size;
  onDone: () => void;
}) {
  const dur = kind === "blackhole" ? 3600 : kind === "dragon_roar" ? 3400 : 2800;
  const t = useRun(dur, onDone);
  if (kind === "paparazzi") {
    return (
      <Animated.View
        testID="skill-fx-paparazzi"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "#FFFFFF",
            alignItems: "center",
            justifyContent: "center",
            opacity: t.interpolate({ inputRange: [0, 0.08, 0.16, 0.28, 0.4, 0.85, 1], outputRange: [0, 0.95, 0.15, 0.9, 0.25, 0.2, 0] }),
          },
        ]}
      >
        <View style={[styles.giftBanner, { top: size.h * 0.32, backgroundColor: "#B5121B" }]}>
          <T style={styles.giftText}>📸 TÁCH! LÊN TRANG NHẤT BÁO LÁ CẢI!</T>
        </View>
      </Animated.View>
    );
  }
  if (kind === "ghost_scare") {
    return (
      <Animated.View
        testID="skill-fx-ghost_scare"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "rgba(10, 5, 25, 0.72)",
            alignItems: "center",
            justifyContent: "center",
            opacity: t.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 1, 0.9, 0] }),
          },
        ]}
      >
        <Animated.Text
          style={{
            fontSize: 130,
            transform: [{ scale: t.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.4, 1.35, 1.1] }) }],
          }}
        >
          👻
        </Animated.Text>
        <T style={[styles.giftText, { marginTop: 12 }]}>HÚ HỒN CHƯA?! 👻</T>
      </Animated.View>
    );
  }
  if (kind === "blackhole") {
    return (
      <Animated.View
        testID="skill-fx-blackhole"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: "rgba(18, 4, 42, 0.65)",
            alignItems: "center",
            justifyContent: "center",
            opacity: t.interpolate({ inputRange: [0, 0.15, 0.82, 1], outputRange: [0, 1, 1, 0] }),
          },
        ]}
      >
        <Animated.Text
          style={{
            fontSize: 150,
            transform: [
              { rotate: t.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "720deg"] }) },
              { scale: t.interpolate({ inputRange: [0, 0.3, 0.8, 1], outputRange: [0.2, 1.3, 1.1, 0.2] }) },
            ],
          }}
        >
          🌀
        </Animated.Text>
        <T style={[styles.giftText, { color: "#E879F9", marginTop: 10 }]}>🕳️ HỐ ĐEN VŨ TRỤ HÚT SẠCH!</T>
      </Animated.View>
    );
  }
  if (kind === "royal_seal") {
    return (
      <Animated.View
        testID="skill-fx-royal_seal"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            alignItems: "center",
            justifyContent: "center",
            opacity: t.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
          },
        ]}
      >
        <Animated.View
          style={{
            borderWidth: 5,
            borderColor: "#FFD43B",
            backgroundColor: "rgba(155, 14, 22, 0.92)",
            borderRadius: 18,
            paddingHorizontal: 22,
            paddingVertical: 14,
            transform: [
              { rotate: "-9deg" },
              { scale: t.interpolate({ inputRange: [0, 0.14, 0.25, 1], outputRange: [2.4, 0.95, 1, 1] }) },
            ],
          }}
        >
          <T style={{ color: "#FFD43B", fontSize: 24, fontWeight: "900", textAlign: "center" }}>🏮 TRẪM CHỈ ĐỊNH! 🏮</T>
        </Animated.View>
      </Animated.View>
    );
  }
  const isDragon = kind === "dragon_roar";
  return (
    <Animated.View
      testID={`skill-fx-${kind}`}
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          backgroundColor: isDragon ? "rgba(60, 10, 10, 0.45)" : "rgba(70, 20, 0, 0.35)",
          opacity: t.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] }),
        },
      ]}
    >
      <Animated.Text
        style={{
          position: "absolute",
          fontSize: 120,
          top: isDragon ? size.h * 0.28 : t.interpolate({ inputRange: [0, 1], outputRange: [-60, size.h * 0.65] }),
          left: isDragon ? t.interpolate({ inputRange: [0, 1], outputRange: [-140, size.w + 40] }) : t.interpolate({ inputRange: [0, 1], outputRange: [size.w * 0.8, size.w * 0.15] }),
        }}
      >
        {isDragon ? "🐉" : "☄️"}
      </Animated.Text>
      <View style={[styles.giftBanner, { top: size.h * 0.16 }]}>
        <T style={styles.giftText}>{isDragon ? "🐉 RỒNG THẦN GẦM THÉT!" : "☄️ THIÊN THẠCH GIÁNG THẾ!"}</T>
      </View>
    </Animated.View>
  );
}

// ---------- lớp gắn vào Shell ----------

type Screen = { id: number; kind: ComicKind; player?: PublicPlayer };
type VipScreen = { id: number; kind: VipScreenKind };
type Show =
  | { id: number; kind: "gift"; g: GiftShow }
  | { id: number; kind: "entrance"; name: string; fx?: string };

const SKILL_LINE: Record<string, (from: string, to: string) => string> = {
  duck: (a, b) => `${a} cử đàn vịt đòi nợ ${b}!`,
  ufo: (a, b) => `${a} gọi UFO đón ${b}!`,
  disco: (a, b) => `${a} mời ${b} lên sàn nhảy!`,
  money: (a, b) => `${a} rải tiền giấy cho ${b} (chỉ để vui)!`,
  lightning: (a, b) => `⚡ ${a} đánh sét ${b}!`,
  freeze: (a, b) => `🧊 ${a} đóng băng ${b}!`,
  cake: (a, b) => `🎂 ${a} úp bánh kem vào mặt ${b}!`,
  water: (a, b) => `💦 ${a} tạt nước ${b}!`,
  dog: (a, b) => `🐕 ${a} thả chó đuổi ${b}!`,
  rocket: (a, b) => `🚀 ${a} bắn tên lửa vào ${b}!`,
  kiss: (a, b) => `😘 ${a} gửi nụ hôn gió cho ${b}`,
  paparazzi: (a, b) => `📸 ${a} chụp lén paparazzi ${b}!`,
  cupid_arrow: (a, b) => `💘 ${a} bắn mũi tên ái tình vào ${b}!`,
  ghost_scare: (a, b) => `👻 ${a} thả ma hù ${b} giữa đêm!`,
  shark: (a, b) => `🦈 ${a} gọi cá mập cắn ${b}!`,
  royal_seal: (a, b) => `🏮 ${a} đóng Ấn Ký Hoàng Gia lên ${b}!`,
  meteor: (a, b) => `☄️ ${a} triệu hồi thiên thạch dội xuống ${b}!`,
  blackhole: (a, b) => `🕳️ ${a} mở hố đen vũ trụ hút ${b}!`,
  dragon_roar: (a, b) => `🐉 ${a} gọi Rồng Thần gầm thét vào ${b}!`,
};

export function SkillLayer({
  game,
  players,
}: {
  game: Game;
  players: PublicPlayer[];
}) {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [vipScreens, setVipScreens] = useState<VipScreen[]>([]);
  const [reduced, setReduced] = useState(false);
  const reducedRef = useLatest(reduced);
  const shake = useShake();
  const shakeRef = useLatest(shake);
  useEffect(() => {
    let alive = true;
    const update = (value: boolean) => {
      if (alive) setReduced(value);
    };
    void AccessibilityInfo.isReduceMotionEnabled()
      .then(update)
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      update,
    );
    const media =
      typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    const webUpdate = () => update(!!media?.matches);
    if (media) webUpdate();
    media?.addEventListener?.("change", webUpdate);
    return () => {
      alive = false;
      subscription.remove();
      media?.removeEventListener?.("change", webUpdate);
    };
  }, []);
  const [shows, setShows] = useState<Show[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bursts, setBursts] = useState<
    { id: number; emoji: string; at: Rect; big?: boolean }[]
  >([]);
  const [size, setSize] = useState<Size>(() => ({
    w: Math.min(Dimensions.get('window').width, 520),
    h: Dimensions.get('window').height,
  }));
  const layer = useMeasuredView();
  const seq = useRef(0);
  const feed = useFeed();
  const vp = useContext(ViewportContext);
  const rotatedRef = useLatest(!!vp?.rotated);
  const playersRef = useLatest(players);

  const dropScreen = useCallback(
    (id: number) => setScreens((xs) => xs.filter((x) => x.id !== id)),
    [],
  );
  const dropVipScreen = useCallback(
    (id: number) => setVipScreens((xs) => xs.filter((x) => x.id !== id)),
    [],
  );
  const dropShow = useCallback(
    (id: number) => setShows((xs) => xs.filter((x) => x.id !== id)),
    [],
  );
  const dropFlight = useCallback(
    (id: number) => setFlights((xs) => xs.filter((x) => x.id !== id)),
    [],
  );
  const dropBurst = useCallback(
    (id: number) => setBursts((xs) => xs.filter((x) => x.id !== id)),
    [],
  );

  useEffect(() => {
    const nameOf = (id: string) =>
      id === game.me
        ? "bạn"
        : (playersRef.current.find((p) => p.id === id)?.name ?? "?");
    return game.onFun((e: FunEvent) => {
      const origin = viewRect(layer.current);
      const rot = rotatedRef.current;
      if (e.kind === "entrance") {
        play("sparkle");
        setShows((xs) => [
          ...xs.slice(-2),
          {
            id: ++seq.current,
            kind: "entrance",
            fx: e.fx,
            name: nameOf(e.from) === "bạn" ? "Bạn" : nameOf(e.from),
          },
        ]);
        return;
      }
      if (e.kind === "gift") {
        const item = shopItem(e.gift);
        const toMe = e.to === game.me;
        play(e.gift === "gift_rose" ? "sparkle" : "win");
        if (toMe) vibrate([60, 40, 120]);
        setShows((xs) => [
          ...xs.slice(-2),
          {
            id: ++seq.current,
            kind: "gift",
            g: {
              id: 0,
              gift: e.gift,
              from: e.from === game.me ? "Bạn" : nameOf(e.from),
              to: toMe ? "bạn" : nameOf(e.to),
            },
          },
        ]);
        feed(
          `🎁 ${e.from === game.me ? "Bạn" : nameOf(e.from)} tặng ${toMe ? "bạn" : nameOf(e.to)} ${item?.emoji ?? ""} ${item?.name ?? "quà"}`,
          toMe ? "good" : "fun",
        );
        return;
      }
      if (!("to" in e)) return;
      const k = e.kind;
      if (!(k in SKILL_LINE)) return;
      const toMe = e.to === game.me;
      const from = nameOf(e.from);
      feed(
        SKILL_LINE[k](
          from === "bạn" ? "Bạn" : from,
          toMe ? "bạn" : nameOf(e.to),
        ),
        toMe && k !== "kiss" && k !== "cupid_arrow" ? "bad" : "fun",
      );
      if (k === "duck" || k === "ufo" || k === "disco" || k === "money") {
        setMood(e.to, k === "disco" || k === "money" ? "smug" : "shock", 2500);
        play(k === "ufo" ? "whoosh" : "pop");
        if (toMe && !e.soft) {
          const target = playersRef.current.find((p) => p.id === e.to);
          const player = target
            ? {
                ...target,
                character: target.character
                  ? { ...target.character }
                  : undefined,
              }
            : undefined;
          setScreens((xs) => [
            ...xs.slice(-3),
            { id: ++seq.current, kind: k, player },
          ]);
        }
      } else if (k === "lightning") {
        setTint(e.to, "burnt", 5000);
        setMood(e.to, "shock", 3000);
        setWobble(e.to, "shake", 1200);
        play("zap");
        if (toMe && !e.soft) {
          vibrate([60, 30, 200]);
          setScreens((xs) => [
            ...xs.slice(-3),
            { id: ++seq.current, kind: "lightning" },
          ]);
        }
      } else if (k === "freeze") {
        setTint(e.to, "ice", 4000);
        setMood(e.to, "shock", 2500);
        play("sad");
        if (toMe && !e.soft) {
          vibrate(150);
          setScreens((xs) => [
            ...xs.filter((x) => x.kind !== "freeze").slice(-3),
            { id: ++seq.current, kind: "freeze" },
          ]);
        }
      } else if (k === "cake") {
        setMood(e.to, "shock", 3000);
        play("splat");
        if (toMe && !e.soft) {
          vibrate(100);
          setScreens((xs) => [
            ...xs.slice(-3),
            { id: ++seq.current, kind: "cake" },
          ]);
        }
      } else if (k === "water") {
        setMood(e.to, "shock", 2500);
        play("splat");
        if (toMe && !e.soft)
          setScreens((xs) => [
            ...xs.filter((x) => x.kind !== "water").slice(-3),
            { id: ++seq.current, kind: "water" },
          ]);
      } else if (k === "dog") {
        setMood(e.to, "shock", 2500);
        play("bark");
        if (toMe && !e.soft) {
          vibrate([80, 60, 80]);
          setScreens((xs) => [
            ...xs.slice(-3),
            { id: ++seq.current, kind: "dog" },
          ]);
        }
      } else if (k === "rocket" || k === "kiss") {
        const fromR = rectOf(`avatar-${e.from}`, origin, rot);
        const toR = rectOf(`avatar-${e.to}`, origin, rot);
        const rocket = k === "rocket";
        const land = () => {
          if (rocket) {
            setMood(e.to, "dizzy", 3000);
            setWobble(e.to, "shake", 1500);
            play("boom");
            if (toMe) vibrate([120, 50, 200]);
          } else {
            setTint(e.to, "blush", 3000);
            setMood(e.to, "smug", 3000);
            play("sparkle");
          }
          if (toR)
            setBursts((xs) => [
              ...xs.slice(-6),
              {
                id: ++seq.current,
                emoji: rocket ? "💥" : "❤️",
                at: toR,
                big: rocket,
              },
            ]);
        };
        play(rocket ? "rocket" : "whoosh");
        if (fromR && toR && !reducedRef.current)
          setFlights((xs) => [
            ...xs.slice(-6),
            {
              id: ++seq.current,
              emoji: rocket ? "🚀" : "😘",
              from: fromR,
              to: toR,
              ms: rocket ? 900 : 700,
              arc: !rocket,
              after: land,
            },
          ]);
        else land();
      } else if (k === "cupid_arrow" || k === "shark") {
        const fromR = rectOf(`avatar-${e.from}`, origin, rot);
        const toR = rectOf(`avatar-${e.to}`, origin, rot);
        const isCupid = k === "cupid_arrow";
        const land = () => {
          if (isCupid) {
            setTint(e.to, "blush", 3500);
            setMood(e.to, "smug", 3000);
            play("sparkle");
          } else {
            setMood(e.to, "shock", 3000);
            setWobble(e.to, "shake", 1600);
            play("boom");
            if (toMe && !e.soft) {
              vibrate([120, 60, 160]);
              shakeRef.current("normal");
            }
          }
          if (toR)
            setBursts((xs) => [
              ...xs.slice(-6),
              { id: ++seq.current, emoji: isCupid ? "💖" : "💥", at: toR, big: !isCupid },
            ]);
        };
        play("whoosh");
        if (fromR && toR && !reducedRef.current)
          setFlights((xs) => [
            ...xs.slice(-6),
            { id: ++seq.current, emoji: isCupid ? "💘" : "🦈", from: fromR, to: toR, ms: 750, arc: isCupid, after: land },
          ]);
        else land();
      } else if (k === "paparazzi" || k === "ghost_scare" || k === "royal_seal" || k === "meteor" || k === "blackhole" || k === "dragon_roar") {
        setMood(e.to, k === "blackhole" ? "dizzy" : "shock", 3400);
        setWobble(e.to, k === "blackhole" ? "spin" : "shake", k === "blackhole" ? 3200 : 1800);
        play(k === "dragon_roar" || k === "meteor" ? "boom" : k === "paparazzi" ? "zap" : "siren");
        const toR = rectOf(`avatar-${e.to}`, origin, rot);
        if (toR)
          setBursts((xs) => [
            ...xs.slice(-6),
            { id: ++seq.current, emoji: k === "paparazzi" ? "📸" : k === "ghost_scare" ? "👻" : k === "royal_seal" ? "🏮" : k === "meteor" ? "💥" : k === "blackhole" ? "🌀" : "🐉", at: toR, big: true },
          ]);
        if (toMe && !e.soft) {
          vibrate([140, 60, 200]);
          if (k === "royal_seal" || k === "meteor" || k === "dragon_roar") shakeRef.current("quake");
          setVipScreens((xs) => [...xs.slice(-2), { id: ++seq.current, kind: k }]);
        }
      }
    });
  }, [game, feed, playersRef, rotatedRef, reducedRef, shakeRef, layer]);

  return (
    <ReducedMotion.Provider value={reduced}>
      {/* bay / nổ: nằm trên cùng, không bắt chạm */}
      <View
        ref={layer} collapsable={false}
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
        onLayout={(e) =>
          setSize({
            w: e.nativeEvent.layout.width,
            h: e.nativeEvent.layout.height,
          })
        }
      >
        {flights.map((f) => (
          <FlightFx key={f.id} f={f} onDone={() => dropFlight(f.id)} />
        ))}
        {bursts.map((b) => (
          <Burst
            key={b.id}
            emoji={b.emoji}
            at={b.at}
            big={b.big}
            onDone={() => dropBurst(b.id)}
          />
        ))}
      </View>
      {shows.length > 0 && (
        <View pointerEvents="none" style={styles.layer}>
          {shows.map((s) =>
            s.kind === "gift" ? (
              <GiftFx
                key={s.id}
                g={s.g}
                size={size}
                onDone={() => dropShow(s.id)}
              />
            ) : (
              <EntranceFx
                key={s.id}
                name={s.name}
                fx={s.fx}
                size={size}
                onDone={() => dropShow(s.id)}
              />
            ),
          )}
        </View>
      )}
      {vipScreens.length > 0 && (
        <View pointerEvents="none" style={styles.layer}>
          {vipScreens.map((v) => (
            <VipSkillScreenFx key={v.id} kind={v.kind} size={size} onDone={() => dropVipScreen(v.id)} />
          ))}
        </View>
      )}
      {screens.length > 0 && (
        <View
          pointerEvents="box-none"
          style={styles.layer}
          onLayout={(e) =>
            setSize({
              w: e.nativeEvent.layout.width,
              h: e.nativeEvent.layout.height,
            })
          }
        >
          {reduced && <View testID="reduced-motion-fx" pointerEvents="none" />}
          {screens.map((s) => (
            <ComicSkillFx
              key={s.id}
              kind={s.kind}
              player={s.player}
              reduced={reduced}
              size={size}
              onDone={() => dropScreen(s.id)}
            />
          ))}
        </View>
      )}
    </ReducedMotion.Provider>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 86,
    overflow: "hidden",
  },
  hint: {
    position: "absolute",
    alignSelf: "center",
    top: "44%",
    fontFamily: FONT,
    fontWeight: "900",
    fontSize: 13,
    color: "rgba(60,40,30,0.6)",
  },
  giftBanner: {
    position: "absolute",
    top: "12%",
    alignSelf: "center",
    maxWidth: "92%",
    backgroundColor: "rgba(30,10,10,0.82)",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 3,
    borderColor: C.gold,
  },
  giftText: {
    color: C.gold,
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
});
