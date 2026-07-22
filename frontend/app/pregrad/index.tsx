import { StyleSheet, View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, spacing, font, fontSize, radius, shadow } from "@/src/theme";

export default function PregradHub() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <GridPaper style={{ flex: 1 }}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={22} color={colors.ink} /></Pressable>
        <Text style={styles.topTitle}>Pregrad</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 40 + insets.bottom, gap: spacing.lg }}>
        <Text style={styles.intro}>Two résumés. One for you, one for the world. Keep both up-to-date.</Text>

        <Pressable onPress={() => router.push("/pregrad/fun")} style={[styles.card, styles.funCard]} testID="pregrad-fun">
          <View style={styles.iconBig}><Ionicons name="sparkles" size={26} color={colors.paper} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.h}>Fun résumé</Text>
            <Text style={styles.p}>For your own motivation. Add photos, highlights, weird accomplishments. Categorise how you want.</Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color={colors.ink} />
        </Pressable>

        <Pressable onPress={() => router.push("/pregrad/formal")} style={styles.card} testID="pregrad-formal">
          <View style={[styles.iconBig, { backgroundColor: colors.ink }]}><Ionicons name="document-text-outline" size={26} color={colors.paper} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.h}>Formal CV</Text>
            <Text style={styles.p}>Aligned with what universities + institutions expect. Save + print / export as PDF from your browser.</Text>
          </View>
          <Ionicons name="arrow-forward" size={22} color={colors.ink} />
        </Pressable>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color={colors.inkMuted} />
          <Text style={styles.noteText}>Both are saved to your account. Edit any time.</Text>
        </View>
      </ScrollView>
    </GridPaper>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.paperInk },
  topTitle: { fontFamily: font.display, fontSize: fontSize.xl, color: colors.ink },
  intro: { fontFamily: font.displayItalic, fontStyle: "italic", fontSize: fontSize.lg, color: colors.inkSoft, marginBottom: spacing.sm },
  card: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, backgroundColor: colors.white,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.paperInk, ...shadow.soft,
  },
  funCard: { backgroundColor: colors.paperWarm },
  iconBig: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  h: { fontFamily: font.display, fontSize: fontSize.xl, color: colors.ink },
  p: { fontFamily: font.text, fontSize: fontSize.sm, color: colors.inkSoft, marginTop: 4, lineHeight: 18 },
  note: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, backgroundColor: colors.paperCool, borderRadius: radius.md, marginTop: spacing.md, borderWidth: 1, borderColor: colors.paperInk },
  noteText: { flex: 1, fontFamily: font.text, fontSize: fontSize.sm, color: colors.inkSoft },
});
