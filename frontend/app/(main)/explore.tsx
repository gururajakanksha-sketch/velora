import { useCallback, useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import { useRouter } from "expo-router";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, font, fontSize, spacing, radius, shadow } from "@/src/theme";
import { api, ExploreKind } from "@/src/api";

const KINDS: { key: ExploreKind; label: string; icon: any }[] = [
  { key: "scholarships", label: "Scholarships", icon: "trophy-outline" },
  { key: "universities", label: "Universities", icon: "school-outline" },
  { key: "hidden_courses", label: "Hidden Courses", icon: "eye-outline" },
  { key: "muns", label: "MUNs", icon: "globe-outline" },
  { key: "countries", label: "Countries", icon: "earth-outline" },
];

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [kind, setKind] = useState<ExploreKind>("scholarships");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.explore(kind, q ? { q } : undefined);
      setItems(r.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [kind, q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <GridPaper style={styles.container} variant="warm">
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Text style={styles.eyebrow}>EXPLORE</Text>
        <Text style={styles.title}>
          Discover the world
          <Text style={styles.titleAccent}> waiting for you.</Text>
        </Text>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={colors.inkMuted} />
          <TextInput
            testID="explore-search"
            value={q}
            onChangeText={setQ}
            placeholder={`Search ${kind.replace("_", " ")}…`}
            placeholderTextColor={colors.inkFaint}
            style={styles.searchInput}
            returnKeyType="search"
          />
          {q.length > 0 && (
            <Pressable onPress={() => setQ("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.inkMuted} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {KINDS.map((k) => {
            const on = kind === k.key;
            return (
              <Pressable
                key={k.key}
                testID={`kind-${k.key}`}
                onPress={() => setKind(k.key)}
                style={[styles.chip, on && styles.chipOn]}
              >
                <Ionicons name={k.icon} size={13} color={on ? colors.paper : colors.ink} />
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{k.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading && !items && (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.navy} />
        </View>
      )}
      {items && (
        <FlatList
          testID="explore-list"
          data={items}
          keyExtractor={(it: any) => it.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInUp.duration(400).delay(60 * (index % 6))}>
              <ExploreCard
                kind={kind}
                item={item}
                onPress={() => router.push(`/detail/${kind}/${item.id}`)}
              />
            </Animated.View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nothing matches — try clearing your search.</Text>
            </View>
          }
        />
      )}
    </GridPaper>
  );
}

function ExploreCard({
  kind,
  item,
  onPress,
}: {
  kind: ExploreKind;
  item: any;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      testID={`explore-card-${item.id}`}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.9 }]}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{item.title}</Text>
        {item.why_hidden && (
          <View style={styles.hiddenBadge}>
            <Ionicons name="eye" size={11} color={colors.paper} />
            <Text style={styles.hiddenBadgeText}>hidden gem</Text>
          </View>
        )}
      </View>
      <View style={styles.cardMeta}>
        {item.country && (
          <View style={styles.metaPill}>
            <Ionicons name="location-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.country}</Text>
          </View>
        )}
        {item.deadline && (
          <View style={styles.metaPill}>
            <Ionicons name="calendar-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>by {item.deadline}</Text>
          </View>
        )}
        {item.funding && (
          <View style={styles.metaPill}>
            <Ionicons name="cash-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.funding}</Text>
          </View>
        )}
        {item.level && (
          <View style={styles.metaPill}>
            <Ionicons name="ribbon-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.level}</Text>
          </View>
        )}
        {item.acceptance && (
          <View style={styles.metaPill}>
            <Ionicons name="analytics-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>accept {item.acceptance}</Text>
          </View>
        )}
        {item.city && kind === "muns" && (
          <View style={styles.metaPill}>
            <Ionicons name="location-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.city}</Text>
          </View>
        )}
        {item.difficulty && (
          <View style={styles.metaPill}>
            <Ionicons name="pulse-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.difficulty}</Text>
          </View>
        )}
        {item.region && (
          <View style={styles.metaPill}>
            <Ionicons name="globe-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.region}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardBody} numberOfLines={3}>
        {item.summary || item.why || item.at || ""}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardMore}>View & save</Text>
        <Ionicons name="arrow-forward" size={16} color={colors.navy} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.paperInk,
    backgroundColor: colors.paper,
    gap: spacing.sm,
  },
  eyebrow: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.navy,
    fontWeight: "700",
  },
  title: {
    fontFamily: font.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.ink,
    fontWeight: "500",
    marginBottom: spacing.sm,
  },
  titleAccent: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    color: colors.navy,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontFamily: font.text,
    fontSize: fontSize.base,
    color: colors.ink,
  },
  chipRow: {
    paddingRight: spacing.xl,
    gap: 8,
    height: 56,
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    flexShrink: 0,
  },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.ink,
    fontWeight: "500",
  },
  chipTextOn: { color: colors.paper },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },

  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    gap: spacing.sm,
    marginBottom: spacing.md,
    ...shadow.soft,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.sm },
  cardTitle: {
    flex: 1,
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: colors.ink,
    fontWeight: "500",
  },
  hiddenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.navy,
  },
  hiddenBadgeText: {
    color: colors.paper,
    fontFamily: font.text,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  cardMeta: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.paperWarm,
    borderRadius: radius.pill,
  },
  metaText: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    color: colors.inkSoft,
    fontWeight: "500",
  },
  cardBody: {
    fontFamily: font.text,
    fontSize: fontSize.base,
    color: colors.inkSoft,
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.paperInk,
  },
  cardMore: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.navy,
    fontWeight: "600",
  },

  empty: { padding: spacing.xl, alignItems: "center" },
  emptyText: {
    fontFamily: font.text,
    color: colors.inkMuted,
    fontSize: fontSize.md,
  },
});
