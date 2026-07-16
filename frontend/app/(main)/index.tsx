import { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, font, fontSize, spacing, radius, shadow } from "@/src/theme";
import { api, Blueprint } from "@/src/api";
import { useAuth } from "@/src/AuthContext";

type NewsItem = { id: string; kind: string; title: string; body: string; tags: string[]; source: string };

export default function MissionControl() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();

  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [today, setToday] = useState<any>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [b, t, n] = await Promise.all([
      api.blueprint().catch(() => null),
      api.discoverToday().catch(() => null),
      api.news().catch(() => ({ items: [] as NewsItem[] })),
    ]);
    if (b) setBlueprint(b.blueprint);
    if (t) setToday(t);
    if (n) setNews(n.items);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const addQuest = async (q: { title: string; detail: string; xp: number }) => {
    try {
      await api.createTask({
        title: q.title,
        detail: q.detail,
        kind: "side_quest",
        xp: q.xp,
      });
      router.push("/(main)/planner");
    } catch {}
  };

  return (
    <GridPaper style={styles.container} variant="warm">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.lg, paddingBottom: spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>MISSION CONTROL</Text>
            <Text style={styles.hi} testID="hello-name">
              Hi, <Text style={styles.hiName}>{(user?.name || "friend").split(" ")[0]}</Text>.
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(main)/profile")}
            style={styles.avatarWrap}
            testID="mission-profile-btn"
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.name || "?").trim().slice(0, 1).toUpperCase()}
              </Text>
            </View>
          </Pressable>
        </View>

        {/* Blueprint summary */}
        {blueprint ? (
          <Animated.View entering={FadeInUp.duration(500)} style={styles.blueprintCard} testID="blueprint-card">
            <View style={styles.tape} />
            <Text style={styles.sectionEyebrow}>YOUR FUTURE BLUEPRINT</Text>
            <Text style={styles.blueprintQuote}>&ldquo;{blueprint.one_line_summary}&rdquo;</Text>
            <View style={styles.themeRow}>
              {(blueprint.themes || []).slice(0, 5).map((t) => (
                <View key={t} style={styles.themeChip}>
                  <Text style={styles.themeChipText}>{t}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        ) : (
          <View style={[styles.blueprintCard, styles.centeredCard]}>
            <ActivityIndicator color={colors.navy} />
          </View>
        )}

        {/* Career seeds */}
        {blueprint?.career_seeds && blueprint.career_seeds.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label="CAREER SEEDS" title="Paths that fit today" />
            {blueprint.career_seeds.slice(0, 3).map((c, i) => (
              <Animated.View key={i} entering={FadeInUp.duration(400).delay(80 * i)}>
                <SeedCard
                  index={i}
                  title={c.title}
                  why={c.why}
                  firstStep={c.first_step}
                  onAdd={() =>
                    addQuest({
                      title: `Explore: ${c.title}`,
                      detail: c.first_step,
                      xp: 20,
                    })
                  }
                />
              </Animated.View>
            ))}
          </View>
        )}

        {/* Hidden paths */}
        {blueprint?.hidden_paths && blueprint.hidden_paths.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label="HIDDEN PATHS" title="You'd never search for these" />
            {blueprint.hidden_paths.slice(0, 3).map((c, i) => (
              <Animated.View key={i} entering={FadeInUp.duration(400).delay(80 * i)}>
                <SeedCard
                  index={i}
                  title={c.title}
                  why={c.why}
                  firstStep={c.first_step}
                  variant="hidden"
                  onAdd={() =>
                    addQuest({
                      title: `Try: ${c.title}`,
                      detail: c.first_step,
                      xp: 25,
                    })
                  }
                />
              </Animated.View>
            ))}
          </View>
        )}

        {/* Suggested side quests */}
        {blueprint?.side_quests && blueprint.side_quests.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label="SIDE QUESTS" title="Small moves. Big momentum." />
            {blueprint.side_quests.map((q, i) => (
              <Pressable
                key={i}
                onPress={() => addQuest(q)}
                style={({ pressed }) => [styles.questRow, pressed && { opacity: 0.85 }]}
                testID={`add-quest-${i}`}
              >
                <View style={styles.questXp}>
                  <Text style={styles.questXpText}>+{q.xp}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questTitle}>{q.title}</Text>
                  <Text style={styles.questDetail} numberOfLines={2}>
                    {q.detail}
                  </Text>
                </View>
                <View style={styles.questAdd}>
                  <Ionicons name="add" size={16} color={colors.paper} />
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {/* Today teaser */}
        {today && (
          <View style={styles.section}>
            <SectionHeader label="TODAY" title="One thing to check out" />
            <Pressable
              onPress={() => router.push("/(main)/discover")}
              style={styles.todayCard}
              testID="today-teaser"
            >
              <View>
                <Text style={styles.todayLabel}>Hidden course of the day</Text>
                <Text style={styles.todayTitle}>{today.hidden_course?.title}</Text>
                <Text style={styles.todayBody} numberOfLines={2}>
                  {today.hidden_course?.summary}
                </Text>
              </View>
              <Ionicons name="arrow-forward-circle" size={26} color={colors.ink} />
            </Pressable>
          </View>
        )}

        {/* Fresh from the world — news, new careers, industry facts */}
        {news && news.length > 0 && (
          <View style={styles.section}>
            <SectionHeader label="FRESH FROM THE WORLD" title="New careers · news · fun facts" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.newsStrip}
            >
              {news.slice(0, 8).map((n, i) => (
                <Animated.View
                  key={n.id}
                  entering={FadeInUp.duration(400).delay(40 * i)}
                  style={styles.newsCard}
                  testID={`news-${n.id}`}
                >
                  <View style={styles.newsBadgeRow}>
                    <View
                      style={[
                        styles.newsBadge,
                        n.kind === "new_career" && { backgroundColor: colors.accentYellow },
                        n.kind === "fact" && { backgroundColor: colors.accentPink },
                        n.kind === "news" && { backgroundColor: colors.accentBlue },
                      ]}
                    >
                      <Text style={styles.newsBadgeText}>
                        {n.kind === "new_career"
                          ? "NEW CAREER"
                          : n.kind === "fact"
                          ? "FACT"
                          : "NEWS"}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.newsTitle}>{n.title}</Text>
                  <Text style={styles.newsBody} numberOfLines={4}>
                    {n.body}
                  </Text>
                  <Text style={styles.newsSource}>— {n.source}</Text>
                </Animated.View>
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </GridPaper>
  );
}

function SectionHeader({ label, title }: { label: string; title: string }) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.sectionEyebrow}>{label}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function SeedCard({
  index,
  title,
  why,
  firstStep,
  onAdd,
  variant,
}: {
  index: number;
  title: string;
  why: string;
  firstStep: string;
  onAdd?: () => void;
  variant?: "hidden";
}) {
  const rot = ((index % 3) - 1) * 0.8;
  const bg = variant === "hidden" ? colors.paperWarm : colors.white;
  return (
    <View
      style={[
        styles.seedCard,
        { backgroundColor: bg, transform: [{ rotate: `${rot}deg` }] },
      ]}
    >
      <Text style={styles.seedTitle}>{title}</Text>
      <Text style={styles.seedWhy}>{why}</Text>
      <View style={styles.seedStep}>
        <Ionicons name="arrow-forward" size={14} color={colors.navy} />
        <Text style={styles.seedStepText}>{firstStep}</Text>
      </View>
      {onAdd && (
        <Pressable onPress={onAdd} style={styles.seedAdd} testID="seed-add-quest">
          <Ionicons name="add" size={14} color={colors.paper} />
          <Text style={styles.seedAddText}>Add as side quest</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xl,
  },
  eyebrow: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.navy,
    fontWeight: "700",
    marginBottom: 6,
  },
  hi: {
    fontFamily: font.display,
    fontSize: fontSize.xxxl,
    color: colors.ink,
    fontWeight: "500",
  },
  hiName: { fontFamily: font.displayItalic, fontStyle: "italic", color: colors.navy },
  avatarWrap: {},
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.paperWarm,
    ...shadow.soft,
  },
  avatarText: {
    color: colors.paper,
    fontFamily: font.display,
    fontStyle: "italic",
    fontSize: 20,
  },

  blueprintCard: {
    backgroundColor: colors.white,
    padding: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.paperInk,
    marginBottom: spacing.xl,
    transform: [{ rotate: "-0.6deg" }],
    ...shadow.card,
  },
  centeredCard: { alignItems: "center", minHeight: 120, justifyContent: "center" },
  tape: {
    position: "absolute",
    width: 72,
    height: 22,
    top: -10,
    left: 24,
    transform: [{ rotate: "-6deg" }],
    backgroundColor: colors.accentPink + "cc",
    borderWidth: 1,
    borderColor: colors.accentPink,
    borderRadius: 3,
  },
  sectionEyebrow: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 2.5,
    color: colors.navy,
    fontWeight: "700",
  },
  blueprintQuote: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    lineHeight: 28,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    fontWeight: "500",
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

  section: { marginBottom: spacing.xl },
  sectionTitle: {
    fontFamily: font.display,
    fontSize: fontSize.xxl,
    color: colors.ink,
    fontWeight: "500",
    marginTop: 6,
  },

  seedCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.paperInk,
    marginBottom: spacing.md,
    gap: spacing.sm,
    ...shadow.soft,
  },
  seedTitle: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: colors.ink,
    fontWeight: "500",
  },
  seedWhy: {
    fontFamily: font.text,
    fontSize: fontSize.base,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  seedStep: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    paddingTop: 6,
  },
  seedStepText: {
    flex: 1,
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.base,
    color: colors.navy,
  },
  seedAdd: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    marginTop: spacing.sm,
  },
  seedAddText: {
    color: colors.paper,
    fontFamily: font.text,
    fontSize: fontSize.xs,
    fontWeight: "600",
  },

  questRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    marginBottom: spacing.sm,
  },
  questXp: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.paperWarm,
    borderWidth: 1,
    borderColor: colors.accentYellow,
    alignItems: "center",
    justifyContent: "center",
  },
  questXpText: {
    fontFamily: font.display,
    fontStyle: "italic",
    color: colors.ink,
    fontSize: fontSize.sm,
  },
  questTitle: {
    fontFamily: font.text,
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: "600",
  },
  questDetail: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: 2,
  },
  questAdd: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  todayCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.navy,
    ...shadow.card,
  },
  todayLabel: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.accentYellow,
    fontWeight: "700",
    marginBottom: 6,
  },
  todayTitle: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: colors.paper,
    fontWeight: "500",
    marginBottom: 4,
  },
  todayBody: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.paperWarm,
    maxWidth: 240,
    lineHeight: 18,
  },
  newsStrip: {
    gap: spacing.md,
    paddingRight: spacing.xl,
    paddingVertical: spacing.xs,
  },
  newsCard: {
    width: 240,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    ...shadow.soft,
  },
  newsBadgeRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
  },
  newsBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.paperWarm,
    borderWidth: 1,
    borderColor: colors.ink,
  },
  newsBadgeText: {
    fontFamily: font.text,
    fontSize: 9,
    letterSpacing: 1.5,
    color: colors.ink,
    fontWeight: "700",
  },
  newsTitle: {
    fontFamily: font.display,
    fontSize: fontSize.lg,
    lineHeight: 22,
    color: colors.ink,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  newsBody: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    lineHeight: 19,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
  },
  newsSource: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.xs,
    color: colors.inkMuted,
  },
});
