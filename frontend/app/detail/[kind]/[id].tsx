import { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, font, fontSize, spacing, radius, shadow } from "@/src/theme";
import { api, ExploreKind } from "@/src/api";

const KIND_LABEL: Record<string, string> = {
  scholarships: "Scholarship",
  universities: "University",
  hidden_courses: "Hidden Course",
  muns: "MUN Conference",
  countries: "Country",
};

function planTasks(kind: string, item: any): { title: string; detail: string; xp: number }[] {
  switch (kind) {
    case "scholarships":
      return [
        { title: `Research eligibility for ${item.title}`, detail: "Skim the official page & note anything unclear.", xp: 10 },
        { title: `Draft essay for ${item.title}`, detail: "Aim for a very rough first draft — 30 min.", xp: 30 },
        { title: `Line up 2 recommendation letters`, detail: "Ask early. Choose people who actually know you.", xp: 20 },
        { title: `Submit ${item.title}`, detail: `Due ${item.deadline || "soon"} — do not leave this last.`, xp: 50 },
      ];
    case "universities":
      return [
        { title: `Read ${item.title}'s admissions page`, detail: "10 minute skim.", xp: 10 },
        { title: `Watch a virtual campus tour of ${item.title}`, detail: "See how it feels.", xp: 10 },
        { title: `Note 3 majors that intrigue you at ${item.title}`, detail: `Especially check: ${item.hidden_program || "hidden programs"}.`, xp: 15 },
      ];
    case "hidden_courses":
      return [
        { title: `Watch a 10-min intro to ${item.title}`, detail: "YouTube is fine. Just orient yourself.", xp: 10 },
        { title: `Find one book/blog on ${item.title}`, detail: "Note the author who intrigued you.", xp: 15 },
      ];
    case "muns":
      return [
        { title: `Register for ${item.title}`, detail: `Deadline / date: ${item.date}. Note fee: ${item.fee}.`, xp: 20 },
        { title: `Pick committee & country`, detail: "Choose based on genuine curiosity, not prestige.", xp: 10 },
      ];
    case "countries":
      return [
        { title: `Research 3 universities in ${item.title}`, detail: "Any level.", xp: 15 },
        { title: `Read 1 essay on studying/working in ${item.title}`, detail: "Prefer first-person accounts.", xp: 10 },
      ];
    default:
      return [];
  }
}

export default function DetailScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [item, setItem] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [savingText, setSavingText] = useState<string | null>(null);

  useEffect(() => {
    if (!kind || !id) return;
    api
      .exploreItem(kind as ExploreKind, id)
      .then((r) => setItem(r))
      .catch((e) => setError(String(e)));
    // check if already saved
    api.collections().then((r) => {
      const found = (r.saves || []).find((s) => s.kind === kind && s.ref_id === id);
      if (found) {
        setSaved(true);
        setSavedId(found.id);
      }
    }).catch(() => {});
  }, [kind, id]);

  const toggleSave = async () => {
    if (!kind || !id) return;
    if (saved && savedId) {
      setSaved(false);
      setSavedId(null);
      await api.unsave(savedId).catch(() => {});
    } else {
      const r = await api.save(String(kind), String(id));
      setSaved(true);
      setSavedId(r.save?.id ?? null);
    }
  };

  const addAllToPlanner = async () => {
    if (!item) return;
    setSavingText("Adding…");
    try {
      const plan = planTasks(String(kind), item);
      for (const t of plan) {
        await api.createTask({
          title: t.title,
          detail: t.detail,
          kind: "task",
          xp: t.xp,
          source: { kind, id: item.id, title: item.title },
        });
      }
      setSavingText("Added ✓");
      setTimeout(() => setSavingText(null), 1200);
    } catch {
      setSavingText(null);
    }
  };

  if (!item && !error) {
    return (
      <GridPaper style={styles.centered} variant="warm">
        <ActivityIndicator color={colors.navy} />
      </GridPaper>
    );
  }
  if (error) {
    return (
      <GridPaper style={styles.centered} variant="warm">
        <Text style={styles.err}>Couldn't load this.</Text>
        <Pressable onPress={() => router.back()} style={styles.backBtn2}>
          <Text style={styles.backBtn2Text}>Go back</Text>
        </Pressable>
      </GridPaper>
    );
  }

  return (
    <GridPaper style={styles.container} variant="warm">
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl + 80 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            testID="detail-back"
            onPress={() => router.back()}
            style={styles.iconBtn}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
          <Pressable
            testID="detail-save"
            onPress={toggleSave}
            style={[styles.iconBtn, saved && { backgroundColor: colors.navy, borderColor: colors.navy }]}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={18}
              color={saved ? colors.paper : colors.ink}
            />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.eyebrow}>{KIND_LABEL[String(kind)] || String(kind)}</Text>
          <Animated.Text entering={FadeInUp.duration(400)} style={styles.title}>
            {item.title}
          </Animated.Text>

          <View style={styles.metaWrap}>
            {item.country && <MetaPill icon="location-outline" text={item.country} />}
            {item.city && <MetaPill icon="pin-outline" text={item.city} />}
            {item.region && <MetaPill icon="globe-outline" text={item.region} />}
            {item.deadline && <MetaPill icon="calendar-outline" text={`by ${item.deadline}`} />}
            {item.date && <MetaPill icon="calendar-outline" text={item.date} />}
            {item.funding && <MetaPill icon="cash-outline" text={item.funding} />}
            {item.level && <MetaPill icon="ribbon-outline" text={item.level} />}
            {item.difficulty && <MetaPill icon="pulse-outline" text={item.difficulty} />}
            {item.format && <MetaPill icon="tv-outline" text={item.format} />}
            {item.fee && <MetaPill icon="wallet-outline" text={item.fee} />}
            {item.field && <MetaPill icon="school-outline" text={item.field} />}
            {item.acceptance && <MetaPill icon="analytics-outline" text={`accept ${item.acceptance}`} />}
            {item.at && <MetaPill icon="school-outline" text={item.at} />}
          </View>

          <Animated.View entering={FadeInUp.duration(400).delay(100)} style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              {item.summary || item.why || `Details for ${item.title} — pulled from Mission Velora's curated catalog.`}
            </Text>
            {item.hidden_program && (
              <View style={styles.hiddenProgram}>
                <Ionicons name="eye" size={14} color={colors.paper} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.hiddenProgramLabel}>HIDDEN GEM PROGRAM</Text>
                  <Text style={styles.hiddenProgramTitle}>{item.hidden_program}</Text>
                </View>
              </View>
            )}
          </Animated.View>

          {item.tags && Array.isArray(item.tags) && item.tags.length > 0 && (
            <View style={styles.tagRow}>
              {item.tags.map((t: string) => (
                <View key={t} style={styles.tagChip}>
                  <Text style={styles.tagChipText}>#{t}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.planPreview}>
            <Text style={styles.sectionLabel}>SUGGESTED PLAN</Text>
            <Text style={styles.sectionSub}>
              Mission Velora can auto-add these as tasks with milestones.
            </Text>
            {planTasks(String(kind), item).map((t, i) => (
              <View key={i} style={styles.planRow}>
                <View style={styles.planNum}>
                  <Text style={styles.planNumText}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{t.title}</Text>
                  <Text style={styles.planDetail}>{t.detail}</Text>
                </View>
                <Text style={styles.planXp}>+{t.xp}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View
        style={[
          styles.ctaBar,
          { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
        ]}
      >
        <Pressable
          testID="add-to-planner-btn"
          onPress={addAllToPlanner}
          style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}
        >
          <Ionicons name="add-circle" size={18} color={colors.paper} />
          <Text style={styles.ctaText}>
            {savingText || "Add to Mission Planner"}
          </Text>
        </Pressable>
      </View>
    </GridPaper>
  );
}

function MetaPill({ icon, text }: { icon: any; text: string }) {
  return (
    <View style={styles.metaPill}>
      <Ionicons name={icon} size={11} color={colors.inkSoft} />
      <Text style={styles.metaPillText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md },
  err: { fontFamily: font.text, color: colors.error, fontSize: fontSize.md },
  backBtn2: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.ink,
    borderRadius: radius.md,
  },
  backBtn2Text: { color: colors.paper, fontFamily: font.text, fontWeight: "600" },

  topBar: {
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    alignItems: "center",
    justifyContent: "center",
  },

  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.md },
  eyebrow: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.navy,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: font.display,
    fontSize: 36,
    lineHeight: 42,
    color: colors.ink,
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  metaWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: spacing.lg },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.paperWarm,
    borderRadius: radius.pill,
  },
  metaPillText: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    fontWeight: "500",
  },
  summaryCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.paperInk,
    ...shadow.soft,
  },
  summaryText: {
    fontFamily: font.text,
    fontSize: fontSize.lg,
    lineHeight: 26,
    color: colors.ink,
  },
  hiddenProgram: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.navy,
  },
  hiddenProgramLabel: {
    fontFamily: font.text,
    fontSize: 10,
    color: colors.accentYellow,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: 2,
  },
  hiddenProgramTitle: {
    fontFamily: font.display,
    fontSize: fontSize.md,
    color: colors.paper,
    fontWeight: "500",
  },

  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: spacing.md,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.paperCool,
  },
  tagChipText: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.xs,
    color: colors.inkSoft,
  },

  planPreview: {
    marginTop: spacing.xxl,
    gap: spacing.sm,
  },
  sectionLabel: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 2.5,
    color: colors.navy,
    fontWeight: "700",
    marginBottom: 4,
  },
  sectionSub: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    marginBottom: spacing.md,
  },
  planRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.paperInk,
  },
  planNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.paperWarm,
    borderWidth: 1,
    borderColor: colors.accentYellow,
    alignItems: "center",
    justifyContent: "center",
  },
  planNumText: {
    fontFamily: font.display,
    fontStyle: "italic",
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  planTitle: {
    fontFamily: font.text,
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: "600",
  },
  planDetail: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  planXp: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.sm,
    color: colors.navy,
    alignSelf: "center",
  },

  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.paperInk,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.ink,
    height: 52,
    borderRadius: radius.lg,
    ...shadow.lift,
  },
  ctaText: {
    fontFamily: font.text,
    color: colors.paper,
    fontSize: fontSize.md,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});
