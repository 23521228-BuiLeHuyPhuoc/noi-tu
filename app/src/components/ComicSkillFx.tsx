import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { PublicPlayer } from "../../../shared/src/types";
import { portraitOf } from "../avatars";
import { C, FONT } from "../theme";
import { play } from "../sound";

export type ComicKind =
  | "duck"
  | "ufo"
  | "disco"
  | "money"
  | "freeze"
  | "cake"
  | "water"
  | "dog"
  | "lightning";
const durations: Record<ComicKind, number> = {
  duck: 3500,
  ufo: 3500,
  disco: 4000,
  money: 3000,
  freeze: 4000,
  cake: 7000,
  water: 3200,
  dog: 2600,
  lightning: 900,
};
const captions: Record<ComicKind, string> = {
  duck: "Đội thu nợ: cạp cạp! Chạm để đuổi",
  ufo: "Hành tinh này hết từ rồi à?",
  disco: "Bí từ vẫn phải đúng nhịp!",
  money: "TIỀN GIẤY · Giàu trong tưởng tượng",
  freeze: "Não đóng đá? Chạm để phá băng!",
  cake: "Kem miễn phí. Lau thì tự túc!",
  water: "Rửa trôi bí từ… chưa chắc!",
  dog: "Trả xương đây, rồi nối từ tiếp!",
  lightning: "SÉT HỎI: nghĩ ra từ chưa?",
};

/** One clock per scene; interaction never restarts the server's visual budget. */
export function ComicSkillFx({
  kind,
  size,
  player,
  reduced,
  onDone,
}: {
  kind: ComicKind;
  size: { w: number; h: number };
  player?: PublicPlayer;
  reduced: boolean;
  onDone: () => void;
}) {
  const [t] = useState(() => new Animated.Value(0));
  const [deadline] = useState(() => Date.now() + durations[kind]);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  const [hits, setHits] = useState<number[]>([]);
  const [taps, setTaps] = useState(0);
  useEffect(() => {
    const animation = Animated.timing(t, {
      toValue: 1,
      duration: Math.max(
        0,
        Math.min(deadline - Date.now(), reduced ? 1200 : durations[kind]),
      ),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => animation.stop();
  }, [deadline, kind, reduced, t]);
  const curve = (values: number[], points = [0, 0.15, 0.75, 1]) =>
    t.interpolate({ inputRange: points, outputRange: values });
  const w = Math.max(1, size.w);
  const h = Math.max(1, size.h);
  const centerY = Math.max(30, Math.min(h * 0.32, h - 220));
  const hit = (i: number) => {
    play("pop");
    setHits((xs) => (xs.includes(i) ? xs : [...xs, i]));
  };
  const tap = () => {
    play("pop");
    setTaps((n) => Math.min(99, n + 1));
  };
  const portrait = player ? portraitOf(player) : null;
  const face = portrait ? (
    <Image source={{ uri: portrait.uri }} style={s.portrait} />
  ) : (
    <Text style={s.face}>😵</Text>
  );
  const motion = (values: number[], points?: number[]) =>
    reduced ? values[Math.floor(values.length / 2)] : curve(values, points);
  return (
    <Animated.View
      testID={kind === "cake" ? "cake-scene" : `${kind}-fx`}
      pointerEvents="box-none"
      style={[
        StyleSheet.absoluteFill,
        { opacity: reduced ? 1 : curve([0, 1, 1, 0]) },
      ]}
    >
      <View
        pointerEvents="none"
        style={[s.caption, { top: Math.min(h * 0.13, 100), maxWidth: w - 20 }]}
      >
        <Text style={s.captionText}>
          {kind === "duck" && hits.length
            ? `Đã đuổi ${hits.length}/5 · Cạp! Nhớ mặt đó!`
            : kind === "ufo" && taps
              ? "Đã cứu! Người Trái Đất khó bắt quá…"
              : kind === "disco" && taps
                ? `${taps} nhịp · Vũ công hệ nối từ!`
                : kind === "money" && hits.length
                  ? `BIÊN LAI: ${hits.length} tờ · Giá trị: 0 Ruby`
                  : captions[kind]}
        </Text>
      </View>
      {kind === "duck" && (
        <>
          {Array.from({ length: 10 }, (_, i) => (
            <Animated.Text
              key={`foot${i}`}
              pointerEvents="none"
              style={{
                position: "absolute",
                left: ((i + 1) * w) / 12,
                top: centerY + 95 + (i % 2) * 65,
                color: "#D48C27",
                opacity: curve([0, 0.6, 0.4, 0]),
                fontSize: 17,
              }}
            >
              ⋎ ⋎
            </Animated.Text>
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <Animated.View
              key={i}
              pointerEvents="box-none"
              style={{
                position: "absolute",
                left: 8 + (i * Math.max(0, w - 90)) / 5,
                top: centerY + (i % 2) * 75,
                opacity: hits.includes(i) ? 0.35 : 1,
                transform: [
                  { translateX: motion([-100 - i * 20, 0, 12, w]) },
                  {
                    translateY: hits.includes(i)
                      ? -45
                      : motion([0, -8, 0, -8, 0], [0, 0.25, 0.5, 0.75, 1]),
                  },
                  {
                    rotate: hits.includes(i)
                      ? "-25deg"
                      : i % 2
                        ? "8deg"
                        : "-8deg",
                  },
                ],
              }}
            >
              <Pressable
                testID={`duck-tap-${i}`}
                accessibilityRole="button"
                accessibilityLabel={`Đuổi vịt ${i + 1}`}
                disabled={hits.includes(i)}
                onPress={() => hit(i)}
                style={s.duck}
              >
                <View style={s.duckBody} />
                <View style={s.duckWing} />
                <View style={s.duckHead}>
                  <View style={s.eye} />
                </View>
                <View style={s.beak} />
                <Text style={s.duckSpeech}>
                  {hits.includes(i) ? "Á!" : "cạp"}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </>
      )}
      {kind === "ufo" && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: centerY,
            left: Math.max(0, (w - 220) / 2),
            width: 220,
            height: 220,
          }}
        >
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 40,
              top: 32,
              width: 140,
              height: 155,
              backgroundColor: "#9CF9BC44",
              borderLeftWidth: 2,
              borderRightWidth: 2,
              borderColor: "#9CF9BC",
              transform: [{ scaleX: motion([0.1, 1, 1.25, 0.1]) }],
            }}
          />
          <Animated.View
            pointerEvents="none"
            style={{
              alignItems: "center",
              transform: [{ translateY: motion([-130, 0, 0, -180]) }],
            }}
          >
            <View style={s.dome} />
            <View style={s.saucer}>
              <Text style={s.lights}>● ● ● ●</Text>
            </View>
          </Animated.View>
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 80,
              top: 115,
              transform: [
                { translateY: taps ? 25 : motion([30, 0, -75, 30]) },
                { rotate: taps ? "15deg" : "-12deg" },
              ],
            }}
          >
            {face}
          </Animated.View>
          <Pressable
            testID="ufo-rescue"
            accessibilityRole="button"
            onPress={tap}
            style={[s.button, { top: 195 }]}
          >
            <Text style={s.buttonText}>
              {taps ? "Đã hạ cánh!" : "Kéo tôi xuống!"}
            </Text>
          </Pressable>
        </View>
      )}
      {kind === "disco" && (
        <View
          pointerEvents="box-none"
          style={{
            position: "absolute",
            top: centerY - 15,
            left: Math.max(0, (w - 260) / 2),
            width: Math.min(w, 260),
            height: 250,
          }}
        >
          {[0, 1, 2].map((i) => (
            <Animated.View
              pointerEvents="none"
              key={i}
              style={{
                position: "absolute",
                top: 20,
                left: 80,
                width: 90,
                height: 160,
                backgroundColor: ["#FF608033", "#58DCD333", "#FFE58A44"][i],
                transform: [
                  {
                    rotate: reduced
                      ? `${i * 30 - 30}deg`
                      : t.interpolate({
                          inputRange: [0, 0.5, 1],
                          outputRange: [
                            `${i * 30 - 45}deg`,
                            `${45 - i * 30}deg`,
                            `${i * 30 - 45}deg`,
                          ],
                        }),
                  },
                ],
              }}
            />
          ))}
          <View pointerEvents="none" style={s.ball}>
            {Array.from({ length: 16 }, (_, i) => (
              <View
                key={i}
                style={[
                  s.mirror,
                  { backgroundColor: i % 3 ? "#F0FFFF" : "#7BBFC8" },
                ]}
              />
            ))}
          </View>
          <View pointerEvents="none" style={s.floor}>
            {Array.from({ length: 12 }, (_, i) => (
              <View
                key={i}
                style={[
                  s.tile,
                  { backgroundColor: ["#F29AAB", "#88CFC3", "#F6D577"][i % 3] },
                ]}
              />
            ))}
          </View>
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 83,
              left: 100,
              transform: [
                {
                  translateY: motion(
                    [0, -16, 0, -16, 0],
                    [0, 0.25, 0.5, 0.75, 1],
                  ),
                },
                {
                  rotate: reduced
                    ? "0deg"
                    : t.interpolate({
                        inputRange: [0, 0.25, 0.5, 0.75, 1],
                        outputRange: [
                          "-16deg",
                          "16deg",
                          "-16deg",
                          "16deg",
                          "-16deg",
                        ],
                      }),
                },
              ],
            }}
          >
            {face}
            <Text style={s.legs}>╱ ╲</Text>
          </Animated.View>
          <Pressable
            testID="disco-dance"
            accessibilityRole="button"
            onPress={tap}
            style={[s.button, { top: 211 }]}
          >
            <Text style={s.buttonText}>Bấm theo nhịp · {taps}</Text>
          </Pressable>
        </View>
      )}
      {kind === "money" &&
        Array.from({ length: 8 }, (_, i) => (
          <Animated.View
            key={i}
            pointerEvents="box-none"
            style={{
              position: "absolute",
              left: 8 + ((i % 4) * Math.max(0, w - 90)) / 4,
              top: centerY + Math.floor(i / 4) * 78,
              transform: [
                {
                  translateY: hits.includes(i)
                    ? -24
                    : motion([-140 - i * 8, 0, 25, 200]),
                },
                { rotate: `${i % 2 ? 12 : -12}deg` },
              ],
            }}
          >
            <Pressable
              testID={`money-tap-${i}`}
              accessibilityRole="button"
              accessibilityLabel="Nhặt tiền giấy"
              onPress={() => hit(i)}
              style={[
                s.note,
                hits.includes(i) && { backgroundColor: "#FFF6DE" },
              ]}
            >
              <Text style={s.noteText}>
                {hits.includes(i) ? "BIÊN LAI" : "TIEN GIAY"}
              </Text>
              <Text style={s.noteValue}>
                {hits.includes(i) ? "0 Ruby" : "100.000"}
              </Text>
              <Text style={s.noteText}>CHỈ ĐỂ VUI</Text>
            </Pressable>
          </Animated.View>
        ))}
      {kind === "freeze" &&
        [0, 1, 2, 3, 4, 5].map((i) => (
          <Pressable
            key={i}
            testID={`freeze-crack-${i}`}
            accessibilityRole="button"
            accessibilityLabel="Đập mảnh băng"
            onPress={() => hit(i)}
            style={[
              s.ice,
              {
                left: i % 2 ? undefined : 4,
                right: i % 2 ? 4 : undefined,
                top: h * (0.22 + Math.floor(i / 2) * 0.16),
                transform: [{ rotate: `${i % 2 ? 12 : -12}deg` }],
                opacity: hits.includes(i) ? 0.5 : 0.9,
              },
            ]}
          >
            <Text style={s.crack}>{hits.includes(i) ? "╱╲\n╲╱" : "◇"}</Text>
            <Text style={s.iceText}>{hits.includes(i) ? "RẮC!" : "CỐC"}</Text>
          </Pressable>
        ))}
      {kind === "cake" && (
        <Pressable
          testID="cake-fx"
          accessibilityRole="button"
          accessibilityLabel="Lau bánh kem ba lần"
          onPress={() => {
            tap();
            if (taps >= 2) done.current();
          }}
          style={{
            position: "absolute",
            left: 8,
            top: centerY,
            width: 150,
            height: 155,
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: (i % 3) * 35,
                top: Math.floor(i / 3) * 40,
                width: taps ? 72 : 88,
                height: taps ? 22 : 70,
                borderRadius: 40,
                backgroundColor: i % 2 ? "#FFE1E8" : "#FFF3CF",
                borderWidth: 2,
                borderColor: "#D4A185",
                opacity: i < taps * 2 ? 0.2 : 1,
                transform: [{ rotate: taps ? "-20deg" : "12deg" }],
              }}
            />
          ))}
          {[0, 1, 2, 3, 4].map((i) => (
            <View
              key={`crumb${i}`}
              style={{
                position: "absolute",
                left: i * 25,
                top: 100 + (i % 2) * 14,
                width: 7,
                height: 7,
                backgroundColor: "#9F663B",
                transform: [{ rotate: "30deg" }],
              }}
            />
          ))}
          <Text style={[s.captionText, { top: 125, fontSize: 13 }]}>
            {taps ? `Còn ${3 - taps} lượt lau!` : "Chạm 3 lần để lau"}
          </Text>
        </Pressable>
      )}
      {kind === "water" && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={`ring${i}`}
              style={{
                position: "absolute",
                left: w / 2 - 55,
                top: centerY + i * 28,
                width: 110,
                height: 38,
                borderRadius: 60,
                borderWidth: 3,
                borderColor: "#54C8E9",
                transform: [
                  { scale: motion([0.1, 1 + i * 0.3, 2 + i * 0.3, 3]) },
                ],
                opacity: curve([0, 0.8, 0.4, 0]),
              }}
            />
          ))}
          {Array.from({ length: 14 }, (_, i) => (
            <Animated.View
              key={i}
              style={{
                position: "absolute",
                left: ((i + 1) * w) / 15,
                top: motion([
                  -70 - i * 13,
                  centerY + (i % 3) * 20,
                  h * 0.65,
                  h + 40,
                ]),
                width: 7 + (i % 3) * 3,
                height: 28 + (i % 4) * 12,
                backgroundColor: "#65CEF0AA",
                borderRadius: 20,
                borderTopWidth: 3,
                borderColor: "#C5F7FF",
                transform: [{ rotate: "-12deg" }],
              }}
            />
          ))}
        </View>
      )}
      {kind === "dog" && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {Array.from({ length: 8 }, (_, i) => (
            <Text
              key={i}
              style={{
                position: "absolute",
                left: (i * w) / 9,
                top: centerY + 90 + (i % 2) * 12,
                fontSize: 17,
                opacity: 0.4,
              }}
            >
              🐾
            </Text>
          ))}
          <Animated.View
            style={{
              position: "absolute",
              top: centerY,
              left: motion([-130, w * 0.15, w * 0.7, w + 100]),
            }}
          >
            <Text style={{ fontSize: 65, transform: [{ scaleX: -1 }] }}>
              🐕
            </Text>
            <Text
              style={{ position: "absolute", left: 90, top: -15, fontSize: 36 }}
            >
              🦴
            </Text>
            <Text style={s.captionText}>GÂU! GÂU!</Text>
          </Animated.View>
        </View>
      )}
      {kind === "lightning" && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: centerY,
            left: w / 2 - 45,
            transform: [{ scale: motion([0.2, 1.1, 1, 0.8]) }],
          }}
        >
          <Text style={{ fontSize: 100, color: C.gold }}>ϟ</Text>
          <Text style={s.captionText}>ĐOÀNG!</Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  caption: {
    position: "absolute",
    alignSelf: "center",
    padding: 9,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: "#FFF5CF",
    borderRadius: 13,
    transform: [{ rotate: "-2deg" }],
  },
  captionText: {
    fontFamily: FONT,
    fontWeight: "900",
    fontSize: 16,
    color: C.ink,
    textAlign: "center",
  },
  duck: { width: 76, height: 83 },
  duckBody: {
    position: "absolute",
    width: 65,
    height: 43,
    top: 32,
    borderRadius: 35,
    backgroundColor: "#FFCF39",
    borderWidth: 2,
    borderColor: "#B5761B",
  },
  duckWing: {
    position: "absolute",
    top: 42,
    left: 10,
    width: 32,
    height: 20,
    borderRadius: 15,
    backgroundColor: "#FFE578",
    borderBottomWidth: 2,
    borderColor: "#DA9E20",
  },
  duckHead: {
    position: "absolute",
    top: 9,
    left: 38,
    width: 32,
    height: 34,
    borderRadius: 20,
    backgroundColor: "#FFDA46",
    borderWidth: 2,
    borderColor: "#B5761B",
  },
  eye: {
    width: 5,
    height: 6,
    borderRadius: 4,
    backgroundColor: C.ink,
    position: "absolute",
    right: 6,
    top: 9,
  },
  beak: {
    position: "absolute",
    top: 28,
    left: 65,
    width: 12,
    height: 9,
    borderRadius: 4,
    backgroundColor: "#F18732",
  },
  duckSpeech: {
    fontFamily: FONT,
    color: C.ink,
    fontWeight: "900",
    fontSize: 12,
  },
  portrait: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: C.ink,
  },
  face: { fontSize: 48 },
  dome: {
    width: 80,
    height: 38,
    backgroundColor: "#BCFBE4",
    borderTopLeftRadius: 50,
    borderTopRightRadius: 50,
    borderWidth: 3,
    borderColor: C.ink,
  },
  saucer: {
    width: 180,
    height: 38,
    borderRadius: 50,
    marginTop: -8,
    backgroundColor: "#7FA2AB",
    borderWidth: 3,
    borderColor: C.ink,
  },
  lights: { color: "#FFF29B", textAlign: "center", fontSize: 20 },
  button: {
    position: "absolute",
    alignSelf: "center",
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: 15,
    backgroundColor: "#FFF1A7",
    borderWidth: 2,
    borderColor: C.ink,
  },
  buttonText: {
    fontFamily: FONT,
    fontSize: 14,
    fontWeight: "900",
    color: C.ink,
  },
  ball: {
    position: "absolute",
    left: 100,
    width: 58,
    height: 58,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: C.ink,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  mirror: {
    width: 13.5,
    height: 13.5,
    borderWidth: 0.5,
    borderColor: "#448391",
  },
  floor: {
    position: "absolute",
    top: 155,
    left: 20,
    width: 220,
    flexDirection: "row",
    flexWrap: "wrap",
    transform: [{ rotate: "-3deg" }],
  },
  tile: { width: 55, height: 14, borderWidth: 1, borderColor: "#FFF7E1" },
  legs: { fontSize: 27, fontWeight: "900", textAlign: "center", color: C.ink },
  note: {
    width: 81,
    height: 53,
    backgroundColor: "#C6E6B5",
    borderWidth: 3,
    borderColor: "#628958",
    padding: 2,
  },
  noteText: {
    fontFamily: FONT,
    fontSize: 8,
    fontWeight: "900",
    textAlign: "center",
    color: "#345330",
  },
  noteValue: {
    fontFamily: FONT,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    color: "#345330",
  },
  ice: {
    position: "absolute",
    width: 65,
    height: 73,
    backgroundColor: "#BCEDFA",
    borderWidth: 3,
    borderColor: "#F0FDFF",
    borderRadius: 12,
  },
  crack: {
    color: "#2C8BA9",
    fontSize: 25,
    textAlign: "center",
    lineHeight: 24,
  },
  iceText: {
    fontFamily: FONT,
    fontWeight: "900",
    textAlign: "center",
    color: "#236F88",
    fontSize: 11,
  },
});
