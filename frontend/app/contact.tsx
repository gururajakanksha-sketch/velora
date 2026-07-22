import { useEffect, useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, Linking, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, spacing, font, fontSize, radius } from "@/src/theme";
import { api } from "@/src/api";

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [c, setC] = useState<any>(null);

  useEffect(() => { api.contact().then(setC).catch(() => setC(null)); }, []);

  if (!c) return <GridPaper style={{ flex: 1 }}><View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.navy} /></View></GridPaper>;

  return (
    <GridPaper style={{ flex: 1 }}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={22} color={colors.ink} /></Pressable>
        <Text style={styles.topTitle}>Reach out</Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 40 + insets.bottom }}>
        <View style={styles.card}>
          <View style={styles.tape} />
          <Text style={styles.eyebrow}>THE TEAM BEHIND {c.app_name?.toUpperCase()}</Text>
          <Text style={styles.h}>{c.org_name}</Text>
          <Text style={styles.p}>{c.message}</Text>

          <Pressable onPress={() => Linking.openURL(`mailto:${c.email}`)} style={styles.emailBtn} testID="contact-email">
            <Ionicons name="mail-outline" size={20} color={colors.paper} />
            <Text style={styles.emailText}>{c.email}</Text>
          </Pressable>
        </View>

        <Text style={styles.section}>CO-FOUNDERS</Text>
        {(c.co_founders || []).map((f: any, i: number) => (
          <View key={i} style={styles.founder}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{(f.name || "?").slice(0, 1)}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fName}>{f.name}</Text>
              <Text style={styles.fRole}>{f.role}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </GridPaper>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.paperInk },
  topTitle: { fontFamily: font.display, fontSize: fontSize.xl, color: colors.ink },
  card: { backgroundColor: colors.white, padding: spacing.xl, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.paperInk },
  tape: { position: "absolute", top: -10, left: 30, width: 60, height: 20, backgroundColor: colors.accentPink, transform: [{ rotate: "-4deg" }] },
  eyebrow: { fontFamily: font.text, fontSize: 10, letterSpacing: 2, color: colors.navy, fontWeight: "700", marginTop: spacing.md },
  h: { fontFamily: font.display, fontSize: 32, color: colors.ink, marginTop: 4 },
  p: { fontFamily: font.text, fontSize: fontSize.md, color: colors.inkSoft, lineHeight: 22, marginTop: spacing.md },
  emailBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, backgroundColor: colors.ink, borderRadius: radius.md, paddingVertical: 14, marginTop: spacing.lg },
  emailText: { fontFamily: font.mono, color: colors.paper, fontSize: fontSize.md, fontWeight: "600" },
  section: { fontFamily: font.text, fontSize: fontSize.xs, letterSpacing: 2, color: colors.inkMuted, fontWeight: "700", marginTop: spacing.xxl, marginBottom: spacing.md },
  founder: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, backgroundColor: colors.paperCool, borderRadius: radius.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.paperInk },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  avatarText: { color: colors.paper, fontFamily: font.display, fontSize: 20 },
  fName: { fontFamily: font.display, fontSize: fontSize.lg, color: colors.ink },
  fRole: { fontFamily: font.text, fontSize: fontSize.sm, color: colors.inkMuted },
});
