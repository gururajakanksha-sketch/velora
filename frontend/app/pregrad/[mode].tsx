import { useEffect, useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Platform, KeyboardAvoidingView } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Image } from "expo-image";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, spacing, font, fontSize, radius } from "@/src/theme";
import { api, Pregrad, PregradSection } from "@/src/api";

type Mode = "fun" | "formal";

const FUN_SECTIONS: PregradSection[] = [
  { id: "s-highlights", title: "Highlights", entries: [] },
  { id: "s-projects", title: "Things I've made", entries: [] },
  { id: "s-adventures", title: "Adventures", entries: [] },
  { id: "s-learning", title: "Learning right now", entries: [] },
  { id: "s-people", title: "People + communities", entries: [] },
];
const FORMAL_SECTIONS: PregradSection[] = [
  { id: "s-education", title: "Education (school, board, expected year, GPA/percentage)", entries: [] },
  { id: "s-scores", title: "Standardised Tests (SAT, ACT, TOEFL, IELTS, AP, IB, etc.)", entries: [] },
  { id: "s-honors", title: "Honors & Awards (national/regional/school, year, level)", entries: [] },
  { id: "s-activities", title: "Extracurricular Activities (role, hrs/wk, wks/yr, grade levels)", entries: [] },
  { id: "s-experience", title: "Work Experience & Internships", entries: [] },
  { id: "s-research", title: "Research & Publications", entries: [] },
  { id: "s-projects", title: "Projects & Portfolio", entries: [] },
  { id: "s-leadership", title: "Leadership & Community Service", entries: [] },
  { id: "s-skills", title: "Skills (languages, technical, certifications)", entries: [] },
  { id: "s-refs", title: "References (2-3 with role, org, contact)", entries: [] },
];

export default function PregradEditor() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  const m: Mode = mode === "formal" ? "formal" : "fun";
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [doc, setDoc] = useState<Pregrad | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await api.pregrads();
      const found = r.pregrads.find((p) => p.mode === m);
      if (found) setDoc(found);
      else setDoc({
        mode: m, header: { name: "", tagline: "" }, photo_base64: undefined,
        sections: (m === "fun" ? FUN_SECTIONS : FORMAL_SECTIONS).map((s) => ({ ...s })),
      });
    })();
  }, [m]);

  const setHeader = (k: string, v: string) => doc && setDoc({ ...doc, header: { ...doc.header, [k]: v } });
  const addEntry = (secId: string) => {
    if (!doc) return;
    setDoc({
      ...doc,
      sections: doc.sections.map((s) =>
        s.id === secId ? { ...s, entries: [...s.entries, { id: `e_${Date.now()}`, title: "", detail: "", date: "" }] } : s
      ),
    });
  };
  const updateEntry = (secId: string, entryId: string, patch: any) => {
    if (!doc) return;
    setDoc({
      ...doc,
      sections: doc.sections.map((s) =>
        s.id === secId ? { ...s, entries: s.entries.map((e: any) => (e.id === entryId ? { ...e, ...patch } : e)) } : s
      ),
    });
  };
  const removeEntry = (secId: string, entryId: string) => {
    if (!doc) return;
    setDoc({
      ...doc,
      sections: doc.sections.map((s) =>
        s.id === secId ? { ...s, entries: s.entries.filter((e: any) => e.id !== entryId) } : s
      ),
    });
  };
  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], base64: true, quality: 0.6 });
    if (r.canceled || !doc) return;
    setDoc({ ...doc, photo_base64: `data:image/jpeg;base64,${r.assets[0].base64}` });
  };
  const save = async () => {
    if (!doc) return;
    setSaving(true);
    try { await api.savePregrad(m, doc); router.back(); } finally { setSaving(false); }
  };

  const [exporting, setExporting] = useState(false);
  const exportPDF = async () => {
    if (!doc) return;
    setExporting(true);
    try {
      const formal = m === "formal";
      const photoHtml = doc.photo_base64 ? `<img src="${doc.photo_base64}" style="width:100px;height:100px;border-radius:${formal?'6':'50'}px;object-fit:cover;float:right;margin:0 0 12px 12px" />` : "";
      const header = doc.header || {};
      const sectionsHtml = doc.sections.map(s => {
        if (!s.entries.length) return "";
        const items = s.entries.map((e: any) => `
          <div style="margin:6px 0">
            <div style="font-weight:600;font-size:12pt">${(e.title || '').replace(/</g,'&lt;')}</div>
            ${e.date ? `<div style="color:#666;font-size:9pt">${e.date}</div>` : ''}
            ${e.detail ? `<div style="font-size:10pt;line-height:1.4;white-space:pre-wrap">${(e.detail || '').replace(/</g,'&lt;')}</div>` : ''}
          </div>`).join("");
        return `<section style="margin:14px 0"><h3 style="border-bottom:1px solid #999;padding-bottom:3px;font-size:11pt;letter-spacing:1.5px;text-transform:uppercase">${s.title}</h3>${items}</section>`;
      }).join("");
      const styleFont = formal ? "'Helvetica Neue', Arial, sans-serif" : "Georgia, serif";
      const bg = formal ? "#fff" : "#FBF6E0";
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${(header.name||'Resume')}</title></head>
        <body style="font-family:${styleFont};padding:24px;background:${bg};color:#1a1a1a;max-width:780px;margin:0 auto">
          ${photoHtml}
          <h1 style="margin:0;font-size:26pt;letter-spacing:0.5px">${(header.name || 'Your Name')}</h1>
          <div style="color:#444;font-size:11pt;margin:4px 0">${[header.tagline, header.location, header.email, header.phone].filter(Boolean).join(' · ')}</div>
          <hr style="border:none;border-top:2px solid #132449;margin:14px 0" />
          ${sectionsHtml}
          <div style="margin-top:20px;color:#888;font-size:8pt;text-align:center">Generated by Velora · velora.app</div>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (Platform.OS === "web") {
        // On web, open in a new tab
        if (typeof window !== "undefined") window.open(uri, "_blank");
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Save your Velora CV" });
      }
    } finally { setExporting(false); }
  };

  if (!doc) return <GridPaper style={{ flex: 1 }}><View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.navy} /></View></GridPaper>;

  const bg = m === "fun" ? "warm" : "cool";
  const isFormal = m === "formal";

  return (
    <GridPaper style={{ flex: 1 }} variant={bg as any}>
      <View style={[styles.top, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}><Ionicons name="chevron-back" size={22} color={colors.ink} /></Pressable>
        <Text style={styles.topTitle}>{m === "fun" ? "Fun résumé" : "Formal CV"}</Text>
        <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
          <Pressable onPress={exportPDF} disabled={exporting} testID="pregrad-export" hitSlop={8}>
            {exporting ? <ActivityIndicator color={colors.navy} /> : <Ionicons name="download-outline" size={22} color={colors.ink} />}
          </Pressable>
          <Pressable onPress={save} disabled={saving} testID="pregrad-save">
            {saving ? <ActivityIndicator color={colors.navy} /> : <Text style={styles.saveText}>Save</Text>}
          </Pressable>
        </View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 40 + insets.bottom, gap: spacing.lg }} keyboardShouldPersistTaps="handled">
          <View style={styles.headerCard}>
            <Pressable onPress={pickPhoto} style={styles.photoBtn} testID="pregrad-photo">
              {doc.photo_base64 ? <Image source={doc.photo_base64} style={styles.photo} contentFit="cover" /> : <><Ionicons name="camera-outline" size={26} color={colors.paper} /><Text style={styles.photoLabel}>Add</Text></>}
            </Pressable>
            <View style={{ flex: 1, gap: spacing.sm }}>
              <TextInput style={styles.headerName} value={doc.header.name || ""} placeholder="Your name" placeholderTextColor={colors.inkMuted} onChangeText={(v) => setHeader("name", v)} />
              <TextInput style={styles.headerTag} value={doc.header.tagline || ""} placeholder={isFormal ? "e.g. Class of 2027 · Delhi" : "The one-line you want to be known for"} placeholderTextColor={colors.inkMuted} onChangeText={(v) => setHeader("tagline", v)} multiline />
              {isFormal && (
                <>
                  <TextInput style={styles.headerTag} value={doc.header.email || ""} placeholder="you@email.com" placeholderTextColor={colors.inkMuted} onChangeText={(v) => setHeader("email", v)} autoCapitalize="none" keyboardType="email-address" />
                  <TextInput style={styles.headerTag} value={doc.header.location || ""} placeholder="City, Country" placeholderTextColor={colors.inkMuted} onChangeText={(v) => setHeader("location", v)} />
                </>
              )}
            </View>
          </View>

          {doc.sections.map((s) => (
            <View key={s.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{s.title}</Text>
                <Pressable onPress={() => addEntry(s.id)} hitSlop={12} testID={`add-${s.id}`}>
                  <Ionicons name="add-circle" size={22} color={colors.navy} />
                </Pressable>
              </View>
              {s.entries.length === 0 && <Text style={styles.hint}>Tap + to add.</Text>}
              {s.entries.map((e: any) => (
                <View key={e.id} style={styles.entry}>
                  <View style={{ flex: 1, gap: 4 }}>
                    <TextInput style={styles.entryTitle} value={e.title} placeholder="Title" placeholderTextColor={colors.inkMuted} onChangeText={(v) => updateEntry(s.id, e.id, { title: v })} />
                    <TextInput style={styles.entryDetail} value={e.detail} placeholder={isFormal ? "Role · organisation · description" : "Say more about it..."} placeholderTextColor={colors.inkMuted} onChangeText={(v) => updateEntry(s.id, e.id, { detail: v })} multiline />
                    <TextInput style={styles.entryDate} value={e.date} placeholder="Date / period" placeholderTextColor={colors.inkMuted} onChangeText={(v) => updateEntry(s.id, e.id, { date: v })} />
                  </View>
                  <Pressable onPress={() => removeEntry(s.id, e.id)} hitSlop={12}><Ionicons name="trash-outline" size={18} color={colors.error} /></Pressable>
                </View>
              ))}
            </View>
          ))}

          {isFormal && (
            <View style={styles.exportNote}>
              <Ionicons name="print-outline" size={18} color={colors.ink} />
              <Text style={styles.exportText}>Tap the download icon (top-right) to save as PDF to your files. This CV follows the Common App / college-admission format — fill each section thoroughly for university applications.</Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </GridPaper>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.paperInk },
  topTitle: { fontFamily: font.display, fontSize: fontSize.xl, color: colors.ink },
  saveText: { fontFamily: font.text, fontSize: fontSize.md, color: colors.navy, fontWeight: "700" },
  headerCard: { flexDirection: "row", gap: spacing.md, alignItems: "flex-start", padding: spacing.lg, backgroundColor: colors.white, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.paperInk },
  photoBtn: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  photoLabel: { color: colors.paper, fontFamily: font.text, fontSize: 11, marginTop: 2, fontWeight: "700" },
  photo: { width: "100%", height: "100%" },
  headerName: { fontFamily: font.display, fontSize: 24, color: colors.ink, padding: 4 },
  headerTag: { fontFamily: font.text, fontSize: fontSize.sm, color: colors.inkSoft, padding: 4, minHeight: 32 },
  section: { backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.paperInk },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.sm },
  sectionTitle: { fontFamily: font.display, fontSize: fontSize.xl, color: colors.ink },
  hint: { fontFamily: font.textItalic, fontStyle: "italic", fontSize: fontSize.sm, color: colors.inkMuted },
  entry: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm, padding: spacing.sm, backgroundColor: colors.paperCool, borderRadius: radius.md, borderWidth: 1, borderColor: colors.paperInk },
  entryTitle: { fontFamily: font.display, fontSize: fontSize.md, color: colors.ink, padding: 2 },
  entryDetail: { fontFamily: font.text, fontSize: fontSize.sm, color: colors.inkSoft, padding: 2 },
  entryDate: { fontFamily: font.text, fontSize: fontSize.xs, color: colors.inkMuted, padding: 2 },
  exportNote: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.paperCool, borderWidth: 1, borderColor: colors.paperInk },
  exportText: { flex: 1, fontFamily: font.text, fontSize: fontSize.sm, color: colors.inkSoft, lineHeight: 20 },
});
