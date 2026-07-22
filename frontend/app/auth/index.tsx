import { useState } from "react";
import { StyleSheet, View, Text, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, font, fontSize, spacing, radius, shadow } from "@/src/theme";
import { useAuth } from "@/src/AuthContext";

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onGoogle = async () => {
    setBusy(true);
    setErr(null);
    const r = await signInWithGoogle();
    setBusy(false);
    if (!r.ok && r.error && r.error !== "cancelled") setErr(r.error);
  };

  return (
    <GridPaper style={styles.container} variant="warm">
      <View style={[styles.top, { paddingTop: insets.top + spacing.xl }]}>
        <Animated.View entering={FadeInUp.duration(500)}>
          <View style={styles.brandBadge}>
            <Text style={styles.brandBadgeText}>MV</Text>
          </View>
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(500).delay(150)}>
          <Text style={styles.brand}>VELORA</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(250)} style={styles.headline}>
          <Text style={styles.hero}>
            Design the life
            {"\n"}you actually want.
          </Text>
          <Text style={styles.sub}>
            An AI companion that helps you discover careers, universities, scholarships and side quests you'd never find on your own.
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(600).delay(400)} style={styles.stickers}>
          <View style={[styles.chip, { backgroundColor: colors.paperWarm, transform: [{ rotate: "-3deg" }] }]}>
            <Text style={styles.chipText}>hidden careers</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.accentPink + "60", transform: [{ rotate: "2deg" }] }]}>
            <Text style={styles.chipText}>scholarships</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.accentBlue + "80", transform: [{ rotate: "-1.5deg" }] }]}>
            <Text style={styles.chipText}>side quests</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.accentYellow + "b0", transform: [{ rotate: "3deg" }] }]}>
            <Text style={styles.chipText}>dream boards</Text>
          </View>
        </Animated.View>
      </View>

      <Animated.View
        entering={FadeInUp.duration(600).delay(550)}
        style={[styles.bottom, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <Pressable
          testID="google-signin-btn"
          onPress={onGoogle}
          disabled={busy}
          style={({ pressed }) => [
            styles.googleBtn,
            pressed && { opacity: 0.9, transform: [{ scale: 0.99 }] },
            busy && { opacity: 0.7 },
          ]}
        >
          {busy ? (
            <ActivityIndicator color={colors.paper} />
          ) : (
            <>
              <View style={styles.googleG}>
                <Ionicons name="logo-google" size={16} color={colors.ink} />
              </View>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        {err && (
          <Text testID="auth-error" style={styles.err}>
            Couldn't sign in ({err}). Try again in a moment.
          </Text>
        )}

        <Text style={styles.finePrint}>
          By continuing you agree to our{" "}
          <Text style={styles.finePrintLink}>terms</Text> and{" "}
          <Text style={styles.finePrintLink}>privacy</Text> policy.
        </Text>
      </Animated.View>
    </GridPaper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "space-between" },
  top: { paddingHorizontal: spacing.xl, alignItems: "flex-start", gap: spacing.md },
  brandBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.paperWarm,
    ...shadow.soft,
  },
  brandBadgeText: {
    color: colors.paperWarm,
    fontFamily: font.display,
    fontStyle: "italic",
    fontSize: 20,
  },
  brand: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    letterSpacing: 3.5,
    color: colors.ink,
    fontWeight: "700",
    marginTop: spacing.sm,
  },
  headline: { marginTop: spacing.xxl, gap: spacing.md },
  hero: {
    fontFamily: font.display,
    fontSize: 40,
    lineHeight: 46,
    color: colors.ink,
    fontWeight: "500",
  },
  sub: {
    fontFamily: font.text,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.inkSoft,
    maxWidth: 320,
  },
  stickers: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.xl,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  chipText: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  bottom: {
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  googleBtn: {
    backgroundColor: colors.ink,
    height: 56,
    borderRadius: radius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    borderWidth: 2,
    borderColor: colors.navyDark,
    ...shadow.lift,
  },
  googleG: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  googleBtnText: {
    fontFamily: font.text,
    color: colors.paper,
    fontSize: fontSize.lg,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  err: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: "center",
  },
  finePrint: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    textAlign: "center",
  },
  finePrintLink: {
    color: colors.navy,
    textDecorationLine: "underline",
  },
});
