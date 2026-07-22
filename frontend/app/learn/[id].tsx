import { useEffect, useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, Linking } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, spacing, font, fontSize, radius } from "@/src/theme";
import { api, Article } from "@/src/api";

export default function ArticleDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [a, setA] = useState<Article | null>(null);

  useEffect(() => { api.article(String(id)).then(setA).catch(() => setA(null)); }, [id]);

  if (!a) return (
    <GridPaper style={{ flex: 1 }}><View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.navy} /></View></GridPaper>
  );

  return (
    <GridPaper style={{ flex: 1 }}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={22} color={colors.ink} /></Pressable>
        <Text style={styles.topBadge}>{a.category.toUpperCase()}</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 40 + insets.bottom }}>
        <Text style={styles.title}>{a.title}</Text>
        <Text style={styles.summary}>{a.summary}</Text>
        <View style={styles.divider} />
        <Text style={styles.body}>{a.body}</Text>
        {(a.links || []).length > 0 && (
          <>
            <Text style={styles.linksHeader}>USEFUL LINKS</Text>
            {a.links!.map((l) => (
              <Pressable key={l.url} onPress={() => Linking.openURL(l.url)} style={styles.link} testID={`link-${l.url}`}>
                <Ionicons name="link-outline" size={18} color={colors.navy} />
                <Text style={styles.linkText}>{l.label}</Text>
                <Ionicons name="open-outline" size={14} color={colors.inkMuted} />
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>
    </GridPaper>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.paperInk },
  topBadge: { fontFamily: font.text, fontSize: 11, letterSpacing: 1.8, color: colors.navy, fontWeight: "700" },
  title: { fontFamily: font.display, fontSize: fontSize.xxxl, color: colors.ink, marginBottom: spacing.md, lineHeight: 40 },
  summary: { fontFamily: font.displayItalic, fontStyle: "italic", fontSize: fontSize.lg, color: colors.inkSoft, lineHeight: 24 },
  divider: { height: 1, backgroundColor: colors.paperInk, marginVertical: spacing.lg },
  body: { fontFamily: font.text, fontSize: fontSize.md, color: colors.ink, lineHeight: 24 },
  linksHeader: { marginTop: spacing.xl, fontFamily: font.text, fontSize: fontSize.xs, letterSpacing: 2, color: colors.inkMuted, fontWeight: "700", marginBottom: spacing.md },
  link: { flexDirection: "row", alignItems: "center", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.paperCool, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.paperInk },
  linkText: { flex: 1, fontFamily: font.text, fontSize: fontSize.md, color: colors.navy, fontWeight: "600" },
});
