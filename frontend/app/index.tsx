import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, spacing, font, fontSize, radius } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";
import { api } from "@/src/api";

const FALLBACK = [
  "The first step is to try.",
  "You can do it — and today counts.",
  "Small moves stack into big lives.",
  "Start ugly. Refine later.",
];

export default function Splash() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { status, user } = useAuth();
  const [quote, setQuote] = useState<string>(
    () => FALLBACK[Math.floor(Math.random() * FALLBACK.length)]
  );
  const [ready, setReady] = useState(false);
  const didNav = useRef(false);

  useEffect(() => {
    api
      .quotes()
      .then((r) => {
        const list = r.quotes;
        if (list.length) setQuote(list[Math.floor(Math.random() * list.length)]);
      })
      .catch(() => {});
    const t = setTimeout(() => setReady(true), 2600);
    return () => clearTimeout(t);
  }, []);

  const go = () => {
    if (didNav.current) return;
    if (status === "loading") return;
    didNav.current = true;
    if (status !== "authenticated") router.replace("/auth");
    else if (!user?.onboarding_complete) router.replace("/onboarding");
    else router.replace("/(main)");
  };

  useEffect(() => {
    if (ready) go();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, status]);

  return (
    <GridPaper cell={28} color={colors.gridLine} bg={colors.paper}>
      <Pressable
        onPress={go}
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
        testID="splash-tap"
      >
        <Animated.View entering={FadeInDown.duration(500)} style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="planet" size={20} color={colors.paperWarm} />
          </View>
          <Text style={styles.brandName}>VELORA</Text>
        </Animated.View>

        <View style={styles.center}>
          <Animated.Text entering={FadeIn.duration(600).delay(200)} style={styles.mark}>
            &ldquo;
          </Animated.Text>
          <Animated.Text
            entering={FadeIn.duration(700).delay(300)}
            style={styles.quote}
            testID="splash-quote"
          >
            {quote}
          </Animated.Text>
          <Animated.View entering={FadeIn.duration(400).delay(700)} style={styles.dash} />
          <Animated.Text entering={FadeIn.duration(400).delay(800)} style={styles.sub}>
            an AI life architecture platform
          </Animated.Text>
        </View>

        {/* Scrapbook accents */}
        <View pointerEvents="none" style={styles.starTL}>
          <Ionicons name="star" size={22} color={colors.navy} />
        </View>
        <View pointerEvents="none" style={styles.tagTR}>
          <View style={styles.paperTag}>
            <Text style={styles.paperTagText}>hi ✦</Text>
          </View>
        </View>
        <View pointerEvents="none" style={styles.dotsBL}>
          <View style={styles.dot} />
          <View style={[styles.dot, { backgroundColor: colors.accentYellow }]} />
          <View style={[styles.dot, { backgroundColor: colors.accentPink }]} />
        </View>

        <Animated.Text
          entering={FadeIn.duration(400).delay(1400)}
          style={[styles.hint, { bottom: insets.bottom + spacing.xxl }]}
        >
          tap anywhere to continue
        </Animated.Text>
      </Pressable>
    </GridPaper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  brandBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    letterSpacing: 3,
    color: colors.ink,
    fontWeight: "700",
  },
  center: { alignItems: "center", justifyContent: "center", flex: 1 },
  mark: {
    fontFamily: font.display,
    fontSize: 90,
    lineHeight: 90,
    color: colors.navy,
    height: 68,
  },
  quote: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 40,
    color: colors.ink,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: spacing.md,
  },
  dash: {
    width: 48,
    height: 2,
    backgroundColor: colors.navy,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sub: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    letterSpacing: 2.5,
    color: colors.inkSoft,
    textTransform: "lowercase",
    fontWeight: "600",
  },
  starTL: { position: "absolute", top: 90, left: 24, transform: [{ rotate: "-14deg" }] },
  tagTR: { position: "absolute", top: 100, right: 20, transform: [{ rotate: "8deg" }] },
  paperTag: {
    backgroundColor: colors.paperWarm,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  paperTagText: {
    fontFamily: font.display,
    fontSize: fontSize.md,
    color: colors.ink,
    fontStyle: "italic",
  },
  dotsBL: {
    position: "absolute",
    bottom: 140,
    left: 32,
    flexDirection: "row",
    gap: 4,
    transform: [{ rotate: "-4deg" }],
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.navy,
  },
  hint: {
    position: "absolute",
    alignSelf: "center",
    fontFamily: font.text,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    letterSpacing: 1.5,
    left: 0,
    right: 0,
    textAlign: "center",
  },
});
