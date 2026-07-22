import { useCallback, useEffect, useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, font, fontSize, spacing, radius, shadow } from "@/src/theme";
import { api, Blueprint } from "@/src/api";
import { useAuth } from "@/src/AuthContext";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut, refresh } = useAuth();
  const router = useRouter();

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [saves, setSaves] = useState<any[]>([]);
  const [tasksTotal, setTasksTotal] = useState(0);
  const [xp, setXp] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, s, p] = await Promise.all([
        api.blueprint().catch(() => null),
        api.collections().catch(() => ({ saves: [] })),
        api.planner().catch(() => ({ tasks: [] })),
      ]);
      if (b) setBlueprint(b.blueprint);
      setSaves(s?.saves || []);
      setTasksTotal((p?.tasks || []).length);
      setXp(
        (p?.tasks || [])
          .filter((t) => t.status === "done")
          .reduce((sum: number, t: any) => sum + (t.xp || 0), 0)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const level = 1 + Math.floor(xp / 100);
  const nextLevel = level * 100;

  const uploadPicture = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.55, base64: true,
    });
    if (r.canceled) return;
    setUploading(true);
    try {
      const b64 = `data:image/jpeg;base64,${r.assets[0].base64}`;
      await api.updatePicture(b64);
      await refresh();
    } finally { setUploading(false); }
  };

  const doReset = async () => {
    setResetting(true);
    try {
      await api.resetBlueprint();
      await refresh();
      router.replace("/onboarding");
    } finally { setResetting(false); }
  };
  const askReset = () => {
    if (Platform.OS === "web") {
      // Confirm-style modal via window.confirm on web
      // eslint-disable-next-line no-alert
      const ok = typeof window !== "undefined" && (window as any).confirm(
        "Reset your blueprint?\n\nWe understand you can change — this lets you retake the questionnaire with new answers.\n\nThis does NOT delete your planner, XP, saved items, or vision boards."
      );
      if (ok) doReset();
    } else {
      Alert.alert(
        "Reset your blueprint?",
        "We understand you can change — this lets you retake the questionnaire with new answers.\n\nThis does NOT delete your planner, XP, saved items, or vision boards.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Reset & redo", style: "destructive", onPress: doReset },
        ]
      );
    }
  };

  return (
    <GridPaper style={styles.container} variant="warm">
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <Animated.View entering={FadeInUp.duration(500)} style={styles.top}>
          <Pressable onPress={uploadPicture} style={styles.avatar} testID="profile-picture">
            {user?.picture_base64 ? (
              <Image source={user.picture_base64} style={styles.avatarImg} contentFit="cover" />
            ) : uploading ? <ActivityIndicator color={colors.paper} /> : (
              <Text style={styles.avatarText}>{(user?.name || "?").trim().slice(0, 1).toUpperCase()}</Text>
            )}
            <View style={styles.cameraBadge}><Ionicons name="camera" size={12} color={colors.paper} /></View>
          </Pressable>
          <Text style={styles.name} testID="profile-name">{user?.name || "You"}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </Animated.View>

        {/* Level & stats */}
        <View style={styles.statsCard}>
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{level}</Text>
            <Text style={styles.statLbl}>LEVEL</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{xp}</Text>
            <Text style={styles.statLbl}>XP EARNED</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCell}>
            <Text style={styles.statNum}>{saves.length}</Text>
            <Text style={styles.statLbl}>SAVED</Text>
          </View>
        </View>

        <View style={styles.progressBarWrap}>
          <View style={[styles.progressBarFill, { width: `${Math.min(100, (xp % 100))}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {Math.max(0, nextLevel - xp)} XP to level {level + 1}
        </Text>

        {/* Blueprint themes */}
        {blueprint && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>YOUR BLUEPRINT</Text>
            <Text style={styles.blueprintQuote}>&ldquo;{blueprint.one_line_summary}&rdquo;</Text>
            <View style={styles.themeRow}>
              {(blueprint.themes || []).map((t) => (
                <View key={t} style={styles.themeChip}>
                  <Text style={styles.themeChipText}>{t}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.blueprintSource}>
              generated by {blueprint._source || "AI"} · {new Date(blueprint.generated_at).toLocaleDateString()}
            </Text>
          </View>
        )}

        {/* Saved */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SAVED COLLECTIONS ({saves.length})</Text>
          {saves.length === 0 ? (
            <Text style={styles.emptyText}>
              Tap the save icon on any scholarship, university, or MUN to start collecting.
            </Text>
          ) : (
            saves.slice(0, 8).map((s) => (
              <Pressable
                key={s.id}
                onPress={() => router.push(`/detail/${s.kind}/${s.ref_id}`)}
                style={styles.savedRow}
                testID={`saved-${s.id}`}
              >
                <Ionicons name="bookmark" size={14} color={colors.navy} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.savedKind}>{s.kind.replace("_", " ")}</Text>
                  <Text style={styles.savedRef}>{s.ref_id}</Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={colors.inkMuted} />
              </Pressable>
            ))
          )}
        </View>

        {/* Your account */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>YOUR ACCOUNT</Text>
          <LinkRow icon="document-text-outline" title="Pregrad" sub="Two résumés — fun + formal" onPress={() => router.push("/pregrad")} testID="link-pregrad" />
          <LinkRow icon="book-outline" title="Digital Education" sub="Articles on cyber, AI, safety" onPress={() => router.push("/learn")} testID="link-learn" />
          <LinkRow icon="mail-outline" title="Reach out to us" sub="Team + email" onPress={() => router.push("/contact")} testID="link-contact" />
          <LinkRow
            icon="refresh-outline"
            title="Reset your blueprint"
            sub="Retake the questionnaire. Keeps your planner, XP + saves."
            onPress={askReset}
            testID="link-reset"
            danger
            busy={resetting}
          />
        </View>

        {/* Sign out */}
        <Pressable onPress={signOut} style={styles.signOut} testID="sign-out-btn">
          <Ionicons name="log-out-outline" size={16} color={colors.error} />
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>

        {loading && <ActivityIndicator color={colors.navy} style={{ marginTop: spacing.md }} />}
        <Text style={styles.footer}>
          Velora · by Mission Velora · <Text style={{ fontStyle: "italic" }}>keep exploring</Text>
        </Text>
        <Text style={styles.footerSub}>Tasks total: {tasksTotal}</Text>
      </ScrollView>
    </GridPaper>
  );
}

function LinkRow({ icon, title, sub, onPress, testID, danger, busy }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; sub?: string;
  onPress: () => void; testID?: string; danger?: boolean; busy?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={busy} testID={testID} style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
      <View style={[styles.linkIcon, danger && { backgroundColor: colors.paperCool }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.error : colors.navy} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.linkTitle, danger && { color: colors.error }]}>{title}</Text>
        {sub && <Text style={styles.linkSub}>{sub}</Text>}
      </View>
      {busy ? <ActivityIndicator color={colors.navy} /> : <Ionicons name="chevron-forward" size={16} color={colors.inkMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },

  top: { alignItems: "center", marginBottom: spacing.xl },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.paperWarm,
    ...shadow.lift,
    marginBottom: spacing.md,
  },
  avatarText: {
    color: colors.paper,
    fontFamily: font.display,
    fontStyle: "italic",
    fontSize: 34,
  },
  avatarImg: { width: "100%", height: "100%", borderRadius: 42 },
  cameraBadge: {
    position: "absolute", right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12,
    backgroundColor: colors.navy, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: colors.paperWarm,
  },
  linkRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.paperInk,
  },
  linkIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.paperCool, alignItems: "center", justifyContent: "center" },
  linkTitle: { fontFamily: font.display, fontSize: fontSize.lg, color: colors.ink, fontWeight: "500" },
  linkSub: { fontFamily: font.text, fontSize: fontSize.sm, color: colors.inkMuted, marginTop: 2 },
  name: {
    fontFamily: font.display,
    fontSize: fontSize.xxl,
    color: colors.ink,
    fontWeight: "500",
  },
  email: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    marginTop: 2,
  },

  statsCard: {
    flexDirection: "row",
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.paperInk,
    ...shadow.soft,
  },
  statCell: { flex: 1, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: colors.paperInk, alignSelf: "stretch" },
  statNum: {
    fontFamily: font.display,
    fontSize: fontSize.xxl,
    color: colors.ink,
    fontWeight: "500",
  },
  statLbl: {
    fontFamily: font.text,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.inkMuted,
    fontWeight: "700",
    marginTop: 2,
  },

  progressBarWrap: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.paperInk,
    marginTop: spacing.md,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 6,
    backgroundColor: colors.navy,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    color: colors.inkMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
    marginTop: 6,
  },

  section: { marginTop: spacing.xxl },
  sectionLabel: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 2.5,
    color: colors.navy,
    fontWeight: "700",
    marginBottom: spacing.md,
  },
  blueprintQuote: {
    fontFamily: font.display,
    fontSize: fontSize.lg,
    lineHeight: 24,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  themeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  themeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.paperCool,
    borderWidth: 1,
    borderColor: colors.paperInk,
  },
  themeChipText: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    fontWeight: "500",
  },
  blueprintSource: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    color: colors.inkFaint,
    fontSize: fontSize.xs,
    marginTop: spacing.sm,
  },

  emptyText: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    lineHeight: 20,
  },
  savedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    marginBottom: spacing.sm,
  },
  savedKind: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 1.5,
    color: colors.inkMuted,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  savedRef: {
    fontFamily: font.text,
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: "500",
  },

  signOut: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.xxl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  signOutText: {
    fontFamily: font.text,
    color: colors.error,
    fontSize: fontSize.md,
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    fontFamily: font.text,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    marginTop: spacing.lg,
  },
  footerSub: {
    textAlign: "center",
    fontFamily: font.text,
    fontSize: 10,
    color: colors.inkFaint,
    marginTop: 2,
  },
});
