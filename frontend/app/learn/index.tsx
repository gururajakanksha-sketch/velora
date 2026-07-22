import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, spacing, font, fontSize, radius } from "@/src/theme";
import { api, Article } from "@/src/api";

const CAT_LABELS: Record<string, string> = {
  all: "All",
  cybersecurity: "Cyber",
  "digital-wellness": "Wellbeing",
  "media-literacy": "Media",
  "ai-literacy": "AI",
  "online-safety": "Safety",
  "civic-tech": "Civic",
  "digital-education": "Digital Ed",
};

export default function LearnHub() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Article[] | null>(null);
  const [cats, setCats] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const r = await api.articles({ category: cat === "all" ? undefined : cat, q: q || undefined });
      setItems(r.items);
      setCats(r.categories);
    })();
  }, [cat, q]);

  return (
    <GridPaper style={styles.container}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={22} color={colors.ink} /></Pressable>
        <Text style={styles.title}>Digital Education</Text>
        <View style={{ width: 22 }} />
      </View>
      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={colors.inkMuted} />
        <TextInput
          testID="learn-search"
          value={q}
          onChangeText={setQ}
          placeholder="Search — passwords, AI, scams, VPN…"
          placeholderTextColor={colors.inkMuted}
          style={styles.search}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsContent}>
        {["all", ...cats].map((c) => (
          <Pressable key={c} onPress={() => setCat(c)} style={[styles.chip, cat === c && styles.chipSel]} testID={`learn-chip-${c}`}>
            <Text style={[styles.chipText, cat === c && styles.chipTextSel]}>{CAT_LABELS[c] || c}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 60 + insets.bottom, gap: spacing.md }}>
        {!items && <ActivityIndicator color={colors.navy} />}
        {items?.length === 0 && (
          <View style={{ alignItems: "center", paddingTop: 40 }}>
            <Text style={styles.empty}>Nothing matches "{q}". Try broader terms.</Text>
          </View>
        )}
        {items?.map((a) => (
          <Pressable key={a.id} onPress={() => router.push(`/learn/${a.id}`)} style={styles.card} testID={`article-${a.id}`}>
            <View style={styles.catBadge}><Text style={styles.catBadgeText}>{(CAT_LABELS[a.category] || a.category).toUpperCase()}</Text></View>
            <Text style={styles.h}>{a.title}</Text>
            <Text style={styles.p}>{a.summary}</Text>
            <View style={styles.tags}>
              {a.tags.slice(0, 3).map((t) => <Text key={t} style={styles.tag}>#{t}</Text>)}
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </GridPaper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.paperInk },
  title: { fontFamily: font.display, fontSize: fontSize.xxl, color: colors.ink },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginHorizontal: spacing.xl, marginTop: spacing.md, padding: spacing.md, backgroundColor: colors.paperCool, borderRadius: radius.md, borderWidth: 1, borderColor: colors.paperInk },
  search: { flex: 1, fontFamily: font.text, fontSize: fontSize.md, color: colors.ink },
  chipsRow: { maxHeight: 56, marginTop: spacing.sm },
  chipsContent: { paddingHorizontal: spacing.xl, gap: spacing.sm, alignItems: "center", height: 56 },
  chip: { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 1, borderColor: colors.paperInk, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  chipSel: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: font.text, fontSize: fontSize.sm, color: colors.inkSoft, fontWeight: "600" },
  chipTextSel: { color: colors.paper },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.paperInk },
  catBadge: { alignSelf: "flex-start", backgroundColor: colors.paperWarm, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, borderWidth: 1, borderColor: colors.ink, marginBottom: spacing.sm },
  catBadgeText: { fontFamily: font.text, fontSize: 10, letterSpacing: 1.4, color: colors.ink, fontWeight: "700" },
  h: { fontFamily: font.display, fontSize: fontSize.xl, color: colors.ink, marginBottom: 4 },
  p: { fontFamily: font.text, fontSize: fontSize.sm, color: colors.inkSoft, lineHeight: 20 },
  tags: { flexDirection: "row", gap: 8, marginTop: 6 },
  tag: { fontFamily: font.text, fontSize: 11, color: colors.navy, fontWeight: "600" },
  empty: { fontFamily: font.text, fontSize: fontSize.md, color: colors.inkMuted },
});
