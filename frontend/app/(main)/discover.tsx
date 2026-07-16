import { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, font, fontSize, spacing, radius, shadow } from "@/src/theme";
import { api } from "@/src/api";

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [today, setToday] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const t = await api.discoverToday();
      setToday(t);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const addChallenge = async () => {
    if (!today?.challenge) return;
    try {
      await api.createTask({
        title: today.challenge.title,
        kind: "side_quest",
        xp: today.challenge.xp,
      });
      router.push("/(main)/planner");
    } catch {}
  };

  return (
    <GridPaper style={styles.container} variant="warm">
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />
        }
      >
        <Text style={styles.eyebrow}>DAILY DISCOVERY</Text>
        <Text style={styles.title}>
          Today, {" "}
          <Text style={styles.titleAccent}>something new.</Text>
        </Text>

        {!today ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.navy} />
          </View>
        ) : (
          <>
            <Animated.View entering={FadeInUp.duration(400)} style={styles.quoteCard}>
              <Text style={styles.quoteMark}>&ldquo;</Text>
              <Text style={styles.quote}>{today.quote}</Text>
            </Animated.View>

            <DiscoverCard
              index={0}
              label="HIDDEN COURSE"
              title={today.hidden_course?.title}
              body={today.hidden_course?.summary}
              extra={`Offered at: ${today.hidden_course?.at}`}
              onPress={() => router.push(`/detail/hidden_courses/${today.hidden_course?.id}`)}
            />
            <DiscoverCard
              index={1}
              label="SCHOLARSHIP SPOTLIGHT"
              title={today.scholarship?.title}
              body={today.scholarship?.summary}
              extra={`${today.scholarship?.country} · deadline ${today.scholarship?.deadline}`}
              onPress={() => router.push(`/detail/scholarships/${today.scholarship?.id}`)}
            />
            <DiscoverCard
              index={2}
              label="UNIVERSITY SPOTLIGHT"
              title={today.university?.title}
              body={today.university?.summary}
              extra={`${today.university?.country} · hidden program: ${today.university?.hidden_program}`}
              onPress={() => router.push(`/detail/universities/${today.university?.id}`)}
            />
            <DiscoverCard
              index={3}
              label="COUNTRY TO WATCH"
              title={today.country?.title}
              body={today.country?.why}
              extra={today.country?.region}
              onPress={() => router.push(`/detail/countries/${today.country?.id}`)}
            />
            <DiscoverCard
              index={4}
              label="MUN PICK"
              title={today.mun?.title}
              body={`${today.mun?.city}, ${today.mun?.country} · ${today.mun?.date} · ${today.mun?.format}`}
              onPress={() => router.push(`/detail/muns/${today.mun?.id}`)}
            />

            <View style={styles.challengeCard}>
              <View style={styles.challengeTop}>
                <Text style={styles.challengeLabel}>TODAY'S CHALLENGE</Text>
                <View style={styles.challengeXp}>
                  <Text style={styles.challengeXpText}>+{today.challenge?.xp} XP</Text>
                </View>
              </View>
              <Text style={styles.challengeText}>{today.challenge?.title}</Text>
              <Pressable onPress={addChallenge} style={styles.challengeCta} testID="add-challenge">
                <Ionicons name="add" size={16} color={colors.paper} />
                <Text style={styles.challengeCtaText}>Add to Planner</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </GridPaper>
  );
}

function DiscoverCard({
  index,
  label,
  title,
  body,
  extra,
  onPress,
}: {
  index: number;
  label: string;
  title?: string;
  body?: string;
  extra?: string;
  onPress?: () => void;
}) {
  const rot = ((index % 3) - 1) * 0.6;
  const bgs = [colors.white, colors.paperCool, colors.paperWarm];
  return (
    <Animated.View entering={FadeInUp.duration(400).delay(80 * index)}>
      <Pressable
        onPress={onPress}
        style={[
          styles.card,
          { backgroundColor: bgs[index % bgs.length], transform: [{ rotate: `${rot}deg` }] },
        ]}
      >
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardTitle}>{title}</Text>
        {body && <Text style={styles.cardBody}>{body}</Text>}
        {extra && <Text style={styles.cardExtra}>{extra}</Text>}
        <View style={styles.cardArrow}>
          <Ionicons name="arrow-forward" size={16} color={colors.navy} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },
  eyebrow: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.navy,
    fontWeight: "700",
    marginBottom: 6,
  },
  title: {
    fontFamily: font.display,
    fontSize: fontSize.xxxl,
    color: colors.ink,
    fontWeight: "500",
    marginBottom: spacing.xl,
  },
  titleAccent: { fontFamily: font.displayItalic, fontStyle: "italic", color: colors.navy },
  loading: { padding: spacing.xxxl, alignItems: "center" },

  quoteCard: {
    padding: spacing.lg,
    backgroundColor: colors.navy,
    borderRadius: radius.lg,
    marginBottom: spacing.lg,
    transform: [{ rotate: "-1deg" }],
    ...shadow.card,
  },
  quoteMark: {
    fontFamily: font.display,
    fontSize: 34,
    color: colors.accentYellow,
    lineHeight: 32,
  },
  quote: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.xl,
    lineHeight: 26,
    color: colors.paper,
    marginTop: 4,
  },

  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.paperInk,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  cardLabel: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.navy,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: colors.ink,
    fontWeight: "500",
    marginBottom: spacing.xs,
  },
  cardBody: {
    fontFamily: font.text,
    fontSize: fontSize.base,
    color: colors.inkSoft,
    lineHeight: 20,
    marginBottom: 6,
  },
  cardExtra: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.sm,
    color: colors.inkMuted,
  },
  cardArrow: {
    alignSelf: "flex-end",
    marginTop: 4,
  },

  challengeCard: {
    marginTop: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.paperWarm,
    borderWidth: 2,
    borderColor: colors.accentYellow,
    ...shadow.card,
  },
  challengeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  challengeLabel: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.navy,
    fontWeight: "700",
  },
  challengeXp: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
  },
  challengeXpText: {
    fontFamily: font.text,
    color: colors.paper,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  challengeText: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: colors.ink,
    fontWeight: "500",
    lineHeight: 26,
    marginBottom: spacing.md,
  },
  challengeCta: {
    flexDirection: "row",
    alignSelf: "flex-start",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
  },
  challengeCtaText: {
    color: colors.paper,
    fontFamily: font.text,
    fontSize: fontSize.sm,
    fontWeight: "600",
  },
});
