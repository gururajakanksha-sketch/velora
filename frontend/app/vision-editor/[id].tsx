import { useEffect, useMemo, useState } from "react";
import {
  StyleSheet, View, Text, ScrollView, Pressable, TextInput, ActivityIndicator,
  Dimensions, Platform, Modal, KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, spacing, font, fontSize, radius, shadow } from "@/src/theme";
import { api, VisionBoard, VisionBoardItem } from "@/src/api";

const { width: SCREEN_W } = Dimensions.get("window");
const CANVAS_PAD = 16;

const STICKERS = ["star", "heart", "flower", "sparkles", "planet", "rocket", "moon", "trophy", "ribbon", "gift", "flame", "leaf"];
const FONTS = [
  { key: "display", label: "Serif", fontFamily: font.display, fontStyle: "normal" as const },
  { key: "displayItalic", label: "Italic", fontFamily: font.display, fontStyle: "italic" as const },
  { key: "text", label: "Sans", fontFamily: font.text, fontStyle: "normal" as const },
  { key: "mono", label: "Mono", fontFamily: font.mono, fontStyle: "normal" as const },
];
const COLORS = [colors.ink, colors.navy, colors.error, colors.success, colors.accentYellow, colors.accentPink];
const BG_OPTIONS: { key: string; label: string; bg: string }[] = [
  { key: "paper", label: "Paper", bg: colors.paper },
  { key: "warm", label: "Warm", bg: colors.paperWarm },
  { key: "cool", label: "Cool", bg: colors.paperCool },
  { key: "dark", label: "Ink", bg: colors.ink },
];

type PickerMode = null | "image" | "text" | "sticker";

export default function VisionEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [board, setBoard] = useState<VisionBoard | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [picker, setPicker] = useState<PickerMode>(null);
  const [textInput, setTextInput] = useState("");
  const [textFontKey, setTextFontKey] = useState("display");
  const [textColor, setTextColor] = useState(colors.ink);
  const [pinUrl, setPinUrl] = useState("");
  const [titleEdit, setTitleEdit] = useState(false);
  const [titleValue, setTitleValue] = useState("");
  const canvasW = SCREEN_W - CANVAS_PAD * 2;
  const canvasH = canvasW;

  useEffect(() => {
    (async () => {
      const r = await api.visionBoard(String(id));
      setBoard(r.board);
      setTitleValue(r.board.title);
    })();
  }, [id]);

  const bg = useMemo(() => BG_OPTIONS.find((b) => b.key === board?.background) ?? BG_OPTIONS[0], [board?.background]);

  const commitChange = (next: VisionBoard) => {
    setBoard(next);
    setDirty(true);
  };

  const addItem = (item: VisionBoardItem) => {
    if (!board) return;
    commitChange({ ...board, items: [...board.items, item] });
    setSelectedId(item.id);
  };
  const updateItem = (item: VisionBoardItem) => {
    if (!board) return;
    commitChange({ ...board, items: board.items.map((i) => (i.id === item.id ? item : i)) });
  };
  const deleteItem = (itemId: string) => {
    if (!board) return;
    commitChange({ ...board, items: board.items.filter((i) => i.id !== itemId) });
    setSelectedId(null);
  };

  const nextId = () => `it_${Math.random().toString(36).slice(2, 8)}`;
  const nextZ = () => (board?.items.reduce((mx, i) => Math.max(mx, i.z), 0) ?? 0) + 1;

  const addImage = (url: string) => {
    addItem({ id: nextId(), kind: "image", url, x: 30, y: 30, w: 140, h: 140, rotation: -3, z: nextZ() });
    setPicker(null);
    setPinUrl("");
  };
  const addText = () => {
    if (!textInput.trim()) return;
    const f = FONTS.find((f) => f.key === textFontKey) ?? FONTS[0];
    addItem({
      id: nextId(), kind: "text", text: textInput.trim(),
      x: 40, y: 60, w: 200, h: 60, rotation: 0, z: nextZ(),
      font: f.key, color: textColor, fontSize: 22,
    });
    setTextInput("");
    setPicker(null);
  };
  const addSticker = (s: string) => {
    addItem({ id: nextId(), kind: "sticker", sticker: s, x: 50, y: 50, w: 48, h: 48, rotation: 0, z: nextZ() });
    setPicker(null);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    const url = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
    addImage(url);
  };

  const move = (dir: "left" | "right" | "up" | "down") => {
    const sel = board?.items.find((i) => i.id === selectedId);
    if (!sel) return;
    const step = 12;
    const dx = dir === "left" ? -step : dir === "right" ? step : 0;
    const dy = dir === "up" ? -step : dir === "down" ? step : 0;
    updateItem({ ...sel, x: sel.x + dx, y: sel.y + dy });
  };
  const scale = (up: boolean) => {
    const sel = board?.items.find((i) => i.id === selectedId);
    if (!sel) return;
    const f = up ? 1.15 : 0.87;
    updateItem({ ...sel, w: Math.max(28, sel.w * f), h: Math.max(28, sel.h * f) });
  };
  const rotate = (cw: boolean) => {
    const sel = board?.items.find((i) => i.id === selectedId);
    if (!sel) return;
    updateItem({ ...sel, rotation: sel.rotation + (cw ? 10 : -10) });
  };

  const saveBoard = async () => {
    if (!board) return;
    setSaving(true);
    try {
      const r = await api.saveVisionBoard(board);
      setBoard(r.board);
      setDirty(false);
    } finally {
      setSaving(false);
    }
  };

  const commitTitle = () => {
    if (!board) return;
    commitChange({ ...board, title: titleValue.trim() || "Untitled" });
    setTitleEdit(false);
  };

  const setBackground = (key: string) => {
    if (!board) return;
    commitChange({ ...board, background: key });
  };

  if (!board) {
    return (
      <GridPaper style={styles.container}>
        <View style={styles.loading}><ActivityIndicator color={colors.navy} /></View>
      </GridPaper>
    );
  }

  const sel = board.items.find((i) => i.id === selectedId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="vision-back">
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        {titleEdit ? (
          <TextInput
            style={styles.titleInput}
            value={titleValue}
            autoFocus
            onChangeText={setTitleValue}
            onSubmitEditing={commitTitle}
            onBlur={commitTitle}
          />
        ) : (
          <Pressable onPress={() => setTitleEdit(true)} style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.title} testID="vision-title">{board.title}</Text>
          </Pressable>
        )}
        <Pressable onPress={saveBoard} disabled={saving} hitSlop={12} testID="vision-save">
          {saving ? <ActivityIndicator color={colors.navy} /> :
            <Ionicons name={dirty ? "save" : "checkmark-done"} size={22} color={dirty ? colors.navy : colors.success} />}
        </Pressable>
      </View>

      {/* Background switcher */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bgSwitcher} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {BG_OPTIONS.map((b) => (
          <Pressable key={b.key} onPress={() => setBackground(b.key)}
            style={[styles.bgChip, { backgroundColor: b.bg, borderColor: board.background === b.key ? colors.navy : colors.paperInk }]}>
            <Text style={[styles.bgChipText, { color: b.key === "dark" ? colors.paper : colors.ink }]}>{b.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Canvas */}
      <View style={styles.canvasWrap}>
        <View style={[styles.canvas, { width: canvasW, height: canvasH, backgroundColor: bg.bg }]}>
          {board.items.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => setSelectedId(it.id)}
              style={{
                position: "absolute", left: it.x, top: it.y, width: it.w, height: it.h,
                zIndex: it.z, transform: [{ rotate: `${it.rotation}deg` }],
                borderWidth: selectedId === it.id ? 2 : 0, borderColor: colors.navy, borderStyle: "dashed",
              }}
            >
              {it.kind === "image" && <Image source={it.url} style={{ width: "100%", height: "100%", borderRadius: 4 }} contentFit="cover" />}
              {it.kind === "sticker" && <Ionicons name={it.sticker as any} size={Math.min(it.w, it.h) * 0.9} color={colors.navy} />}
              {it.kind === "text" && (
                <Text style={{
                  fontFamily: (FONTS.find((f) => f.key === it.font) ?? FONTS[0]).fontFamily,
                  fontStyle: (FONTS.find((f) => f.key === it.font) ?? FONTS[0]).fontStyle,
                  fontSize: it.fontSize ?? 22, color: it.color ?? colors.ink,
                }}>{it.text}</Text>
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Selection controls */}
      {sel && (
        <View style={styles.selBar}>
          <Pressable onPress={() => move("left")} style={styles.selBtn}><Ionicons name="arrow-back" size={18} color={colors.ink} /></Pressable>
          <Pressable onPress={() => move("up")} style={styles.selBtn}><Ionicons name="arrow-up" size={18} color={colors.ink} /></Pressable>
          <Pressable onPress={() => move("down")} style={styles.selBtn}><Ionicons name="arrow-down" size={18} color={colors.ink} /></Pressable>
          <Pressable onPress={() => move("right")} style={styles.selBtn}><Ionicons name="arrow-forward" size={18} color={colors.ink} /></Pressable>
          <View style={styles.selSep} />
          <Pressable onPress={() => scale(false)} style={styles.selBtn}><Ionicons name="remove" size={18} color={colors.ink} /></Pressable>
          <Pressable onPress={() => scale(true)} style={styles.selBtn}><Ionicons name="add" size={18} color={colors.ink} /></Pressable>
          <Pressable onPress={() => rotate(false)} style={styles.selBtn}><Ionicons name="reload" size={18} color={colors.ink} /></Pressable>
          <View style={styles.selSep} />
          <Pressable onPress={() => deleteItem(sel.id)} style={styles.selBtn}><Ionicons name="trash" size={18} color={colors.error} /></Pressable>
        </View>
      )}

      {/* Add toolbar */}
      <View style={[styles.toolbar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable onPress={() => setPicker("image")} style={styles.toolBtn} testID="tool-add-image">
          <Ionicons name="image-outline" size={20} color={colors.paper} />
          <Text style={styles.toolTxt}>Image</Text>
        </Pressable>
        <Pressable onPress={() => setPicker("text")} style={styles.toolBtn} testID="tool-add-text">
          <Ionicons name="text-outline" size={20} color={colors.paper} />
          <Text style={styles.toolTxt}>Text</Text>
        </Pressable>
        <Pressable onPress={() => setPicker("sticker")} style={styles.toolBtn} testID="tool-add-sticker">
          <Ionicons name="star-outline" size={20} color={colors.paper} />
          <Text style={styles.toolTxt}>Sticker</Text>
        </Pressable>
      </View>

      {/* Pickers */}
      <Modal transparent visible={picker !== null} animationType="slide" onRequestClose={() => setPicker(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            {picker === "image" && (
              <>
                <Text style={styles.sheetTitle}>Add an image</Text>
                <Text style={styles.sheetSub}>Paste a Pinterest / any image URL, or pick from your phone.</Text>
                <TextInput
                  style={styles.sheetInput}
                  placeholder="https://i.pinimg.com/..."
                  placeholderTextColor={colors.inkMuted}
                  value={pinUrl}
                  onChangeText={setPinUrl}
                  autoCapitalize="none"
                  keyboardType="url"
                />
                <View style={{ flexDirection: "row", gap: spacing.md }}>
                  <Pressable onPress={() => pinUrl && addImage(pinUrl.trim())} style={[styles.sheetPrimary, { flex: 1 }]} testID="add-image-url">
                    <Text style={styles.sheetPrimaryText}>Add from URL</Text>
                  </Pressable>
                  <Pressable onPress={pickFromLibrary} style={[styles.sheetSecondary, { flex: 1 }]} testID="add-image-upload">
                    <Ionicons name="cloud-upload-outline" size={18} color={colors.ink} />
                    <Text style={styles.sheetSecondaryText}>Upload</Text>
                  </Pressable>
                </View>
              </>
            )}

            {picker === "text" && (
              <>
                <Text style={styles.sheetTitle}>Add text / quote</Text>
                <TextInput
                  style={[styles.sheetInput, { minHeight: 60 }]}
                  placeholder="Type your quote..."
                  placeholderTextColor={colors.inkMuted}
                  value={textInput}
                  onChangeText={setTextInput}
                  multiline
                />
                <Text style={styles.sheetLabel}>Font</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm }}>
                  {FONTS.map((f) => (
                    <Pressable key={f.key} onPress={() => setTextFontKey(f.key)}
                      style={[styles.fontChip, textFontKey === f.key && styles.fontChipSel]}>
                      <Text style={{ fontFamily: f.fontFamily, fontStyle: f.fontStyle, fontSize: 16, color: colors.ink }}>{f.label}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <Text style={styles.sheetLabel}>Colour</Text>
                <View style={{ flexDirection: "row", gap: spacing.sm }}>
                  {COLORS.map((c) => (
                    <Pressable key={c} onPress={() => setTextColor(c)}
                      style={[styles.colorChip, { backgroundColor: c, borderWidth: textColor === c ? 3 : 1, borderColor: c === colors.paper ? colors.ink : colors.paper }]} />
                  ))}
                </View>
                <Pressable onPress={addText} style={styles.sheetPrimary} testID="add-text-commit">
                  <Text style={styles.sheetPrimaryText}>Add to board</Text>
                </Pressable>
              </>
            )}

            {picker === "sticker" && (
              <>
                <Text style={styles.sheetTitle}>Pick a sticker</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
                  {STICKERS.map((s) => (
                    <Pressable key={s} onPress={() => addSticker(s)} style={styles.stickerBtn}>
                      <Ionicons name={s as any} size={26} color={colors.navy} />
                    </Pressable>
                  ))}
                </View>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  topBar: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.paperInk, backgroundColor: colors.paper,
  },
  title: { fontFamily: font.display, fontSize: fontSize.xl, color: colors.ink, fontWeight: "500" },
  titleInput: { flex: 1, textAlign: "center", fontFamily: font.display, fontSize: fontSize.xl, color: colors.ink,
    backgroundColor: colors.paperCool, borderRadius: 6, paddingVertical: 4, paddingHorizontal: 8 },
  bgSwitcher: { maxHeight: 44, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.paperInk },
  bgChip: { paddingHorizontal: 12, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  bgChipText: { fontFamily: font.text, fontSize: 12, fontWeight: "600" },
  canvasWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: CANVAS_PAD },
  canvas: { borderRadius: radius.md, overflow: "hidden", borderWidth: 1, borderColor: colors.paperInk, ...shadow.card },
  selBar: {
    position: "absolute", bottom: 92, left: 10, right: 10, backgroundColor: colors.paperWarm,
    borderRadius: radius.pill, flexDirection: "row", padding: 6, gap: 4, borderWidth: 1, borderColor: colors.ink,
    justifyContent: "center", alignItems: "center", ...shadow.card,
  },
  selBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
  selSep: { width: 1, height: 20, backgroundColor: colors.paperInk, marginHorizontal: 4 },
  toolbar: {
    flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    backgroundColor: colors.paper, borderTopWidth: 1, borderTopColor: colors.paperInk,
  },
  toolBtn: {
    flex: 1, backgroundColor: colors.ink, height: 46, borderRadius: radius.md,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  toolTxt: { color: colors.paper, fontFamily: font.text, fontWeight: "600", fontSize: fontSize.md },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(19,36,73,0.4)" },
  sheet: {
    backgroundColor: colors.paper, padding: spacing.xl, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    gap: spacing.md,
  },
  sheetTitle: { fontFamily: font.display, fontSize: fontSize.xxl, color: colors.ink },
  sheetSub: { fontFamily: font.text, fontSize: fontSize.md, color: colors.inkSoft },
  sheetLabel: { fontFamily: font.text, fontSize: fontSize.xs, letterSpacing: 1.5, color: colors.inkMuted, fontWeight: "700", marginTop: 4 },
  sheetInput: {
    backgroundColor: colors.paperCool, borderRadius: radius.md, padding: spacing.md,
    fontFamily: font.text, fontSize: fontSize.md, color: colors.ink,
  },
  sheetPrimary: { backgroundColor: colors.ink, height: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  sheetPrimaryText: { color: colors.paper, fontFamily: font.text, fontWeight: "600", fontSize: fontSize.md },
  sheetSecondary: {
    height: 48, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.ink,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
  },
  sheetSecondaryText: { color: colors.ink, fontFamily: font.text, fontWeight: "600", fontSize: fontSize.md },
  fontChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.paperInk },
  fontChipSel: { borderColor: colors.navy, backgroundColor: colors.paperCool },
  colorChip: { width: 34, height: 34, borderRadius: 17 },
  stickerBtn: { width: 54, height: 54, borderRadius: radius.md, backgroundColor: colors.paperCool, alignItems: "center", justifyContent: "center" },
});
