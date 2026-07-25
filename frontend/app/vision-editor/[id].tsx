import { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet, View, Text, ScrollView, Pressable, TextInput, ActivityIndicator,
  Dimensions, Platform, Modal, KeyboardAvoidingView,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, { useAnimatedStyle, useSharedValue, runOnJS } from "react-native-reanimated";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, spacing, font, fontSize, radius, shadow } from "@/src/theme";
import { api, VisionBoard, VisionBoardItem } from "@/src/api";

const { width: SCREEN_W } = Dimensions.get("window");
const CANVAS_PAD = 16;

// Colorful stickers (Ionicons name + hex color for tinting)
const COLOR_STICKERS = [
  { s: "star", c: "#F5C542" }, { s: "heart", c: "#E75A6C" }, { s: "flower", c: "#EB89B6" },
  { s: "sparkles", c: "#D9873A" }, { s: "planet", c: "#4A6FDC" }, { s: "rocket", c: "#C25B56" },
  { s: "moon", c: "#F0C05A" }, { s: "sunny", c: "#F5B342" }, { s: "leaf", c: "#6BA368" },
  { s: "flame", c: "#E86842" }, { s: "trophy", c: "#D9A03A" }, { s: "ribbon", c: "#E75A6C" },
  { s: "gift", c: "#E86BAF" }, { s: "balloon", c: "#EB6B8F" }, { s: "musical-notes", c: "#7E60D6" },
  { s: "cafe", c: "#8B5A3C" }, { s: "book", c: "#4A6FDC" }, { s: "brush", c: "#EB6B8F" },
  { s: "camera", c: "#5A5A70" }, { s: "bicycle", c: "#6BA368" }, { s: "airplane", c: "#4A6FDC" },
  { s: "earth", c: "#3A8A7C" }, { s: "bulb", c: "#F5C542" }, { s: "paw", c: "#A87B4A" },
  { s: "medal", c: "#D9A03A" }, { s: "school", c: "#4A6FDC" }, { s: "football", c: "#8B5A3C" },
  { s: "key", c: "#D9A03A" }, { s: "diamond", c: "#5AB4E0" }, { s: "fitness", c: "#E75A6C" },
];

const FONTS = [
  { key: "display", label: "Serif", fontFamily: font.display, fontStyle: "normal" as const },
  { key: "displayItalic", label: "Italic", fontFamily: font.display, fontStyle: "italic" as const },
  { key: "text", label: "Sans", fontFamily: font.text, fontStyle: "normal" as const },
  { key: "mono", label: "Mono", fontFamily: font.mono, fontStyle: "normal" as const },
];
const COLORS = [colors.ink, colors.navy, colors.error, colors.success, colors.accentYellow, colors.accentPink, "#7E60D6", "#3A8A7C"];
const BG_OPTIONS: { key: string; label: string; bg: string }[] = [
  { key: "paper", label: "Paper", bg: colors.paper },
  { key: "warm", label: "Warm", bg: colors.paperWarm },
  { key: "cool", label: "Cool", bg: colors.paperCool },
  { key: "dark", label: "Ink", bg: colors.ink },
];

type PickerMode = null | "image" | "text" | "sticker";

/** Draggable + pinch-zoom item */
function CanvasItem({
  item, selected, onSelect, onCommit, colorForSticker,
}: {
  item: VisionBoardItem; selected: boolean;
  onSelect: () => void;
  onCommit: (patch: Partial<VisionBoardItem>) => void;
  colorForSticker: (s: string) => string;
}) {
  const x = useSharedValue(item.x);
  const y = useSharedValue(item.y);
  const scale = useSharedValue(1);
  const rotation = useSharedValue(item.rotation);
  const savedScale = useSharedValue(1);
  const savedRotation = useSharedValue(item.rotation);

  useEffect(() => {
    x.value = item.x; y.value = item.y; rotation.value = item.rotation;
    scale.value = 1; savedScale.value = 1; savedRotation.value = item.rotation;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, item.x, item.y, item.rotation]);

  const pan = Gesture.Pan()
    .onStart(() => { runOnJS(onSelect)(); })
    .onChange((e) => { x.value += e.changeX; y.value += e.changeY; })
    .onEnd(() => { runOnJS(onCommit)({ x: x.value, y: y.value }); });

  const pinch = Gesture.Pinch()
    .onStart(() => { runOnJS(onSelect)(); savedScale.value = scale.value; })
    .onChange((e) => { scale.value = savedScale.value * e.scale; })
    .onEnd(() => {
      const w = Math.max(28, item.w * scale.value);
      const h = Math.max(28, item.h * scale.value);
      runOnJS(onCommit)({ w, h });
    });

  const rot = Gesture.Rotation()
    .onStart(() => { runOnJS(onSelect)(); savedRotation.value = rotation.value; })
    .onChange((e) => { rotation.value = savedRotation.value + (e.rotation * 180) / Math.PI; })
    .onEnd(() => { runOnJS(onCommit)({ rotation: rotation.value }); });

  const composed = Gesture.Simultaneous(pan, Gesture.Simultaneous(pinch, rot));
  const tap = Gesture.Tap().onEnd(() => runOnJS(onSelect)());

  const style = useAnimatedStyle(() => ({
    position: "absolute" as const,
    left: x.value, top: y.value, width: item.w, height: item.h,
    transform: [{ scale: scale.value }, { rotate: `${rotation.value}deg` }],
    zIndex: item.z,
    borderWidth: selected ? 2 : 0, borderColor: colors.navy, borderStyle: "dashed" as const,
  }));

  return (
    <GestureDetector gesture={Gesture.Race(composed, tap)}>
      <Animated.View style={style}>
        {item.kind === "image" && <Image source={item.url} style={{ width: "100%", height: "100%", borderRadius: 4 }} contentFit="cover" />}
        {item.kind === "sticker" && (
          <Ionicons
            name={item.sticker as any}
            size={Math.min(item.w, item.h) * 0.9}
            color={item.color || colorForSticker(item.sticker || "star")}
          />
        )}
        {item.kind === "text" && (
          <Text style={{
            fontFamily: (FONTS.find((f) => f.key === item.font) ?? FONTS[0]).fontFamily,
            fontStyle: (FONTS.find((f) => f.key === item.font) ?? FONTS[0]).fontStyle,
            fontSize: item.fontSize ?? 22, color: item.color ?? colors.ink,
          }}>{item.text}</Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

export default function VisionEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [board, setBoard] = useState<VisionBoard | null>(null);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
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
  const colorForSticker = (s: string) => COLOR_STICKERS.find((cs) => cs.s === s)?.c || colors.navy;

  const commitChange = (next: VisionBoard) => { setBoard(next); setDirty(true); };
  const addItem = (item: VisionBoardItem) => {
    if (!board) return;
    commitChange({ ...board, items: [...board.items, item] });
    setSelectedId(item.id);
  };
  const patchItem = (itemId: string, patch: Partial<VisionBoardItem>) => {
    if (!board) return;
    commitChange({ ...board, items: board.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) });
  };
  const deleteItem = (itemId: string) => {
    if (!board) return;
    commitChange({ ...board, items: board.items.filter((i) => i.id !== itemId) });
    setSelectedId(null);
  };

  const nextId = () => `it_${Math.random().toString(36).slice(2, 8)}`;
  const nextZ = () => (board?.items.reduce((mx, i) => Math.max(mx, i.z), 0) ?? 0) + 1;

  const addImage = (url: string) => {
    addItem({ id: nextId(), kind: "image", url, x: 30, y: 30, w: 160, h: 160, rotation: -3, z: nextZ() });
    setPicker(null); setPinUrl("");
  };
  const addText = () => {
    if (!textInput.trim()) return;
    const f = FONTS.find((f) => f.key === textFontKey) ?? FONTS[0];
    addItem({
      id: nextId(), kind: "text", text: textInput.trim(),
      x: 40, y: 60, w: 220, h: 60, rotation: 0, z: nextZ(),
      font: f.key, color: textColor, fontSize: 24,
    });
    setTextInput(""); setPicker(null);
  };
  const addSticker = (cs: { s: string; c: string }) => {
    addItem({ id: nextId(), kind: "sticker", sticker: cs.s, color: cs.c, x: 50, y: 50, w: 56, h: 56, rotation: 0, z: nextZ() });
    setPicker(null);
  };

  const pickFromLibrary = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: undefined, quality: 0.7, base64: true,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    const url = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
    addImage(url);
  };
  const cropFromLibrary = async () => {
    // "Carve" MVP: use image picker's built-in crop tool (allowsEditing)
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, quality: 0.75, base64: true,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    const url = a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri;
    addImage(url);
  };

  const saveBoard = async () => {
    if (!board) return;
    setSaving(true);
    try { const r = await api.saveVisionBoard(board); setBoard(r.board); setDirty(false); } finally { setSaving(false); }
  };

  const exportPDF = async () => {
    if (!board) return;
    setExporting(true);
    try {
      const bgHex = bg.bg;
      const items = board.items.map((it) => {
        const base = `position:absolute;left:${it.x}px;top:${it.y}px;width:${it.w}px;height:${it.h}px;transform:rotate(${it.rotation}deg);z-index:${it.z}`;
        if (it.kind === "image") return `<img src="${it.url}" style="${base};object-fit:cover;border-radius:4px" />`;
        if (it.kind === "text") {
          const f = FONTS.find((f) => f.key === it.font) ?? FONTS[0];
          const family = f.key === "display" || f.key === "displayItalic" ? "Georgia, serif" : f.key === "mono" ? "Menlo, monospace" : "Helvetica, Arial, sans-serif";
          return `<div style="${base};font-family:${family};font-style:${f.fontStyle};font-size:${it.fontSize ?? 22}px;color:${it.color ?? "#132449"};display:flex;align-items:center">${(it.text || "").replace(/</g, "&lt;")}</div>`;
        }
        return `<div style="${base};display:flex;align-items:center;justify-content:center;color:${it.color || colorForSticker(it.sticker || "")};font-size:${Math.min(it.w, it.h) * 0.9}px">●</div>`;
      }).join("");
      const html = `<!doctype html><html><head><meta charset="utf-8"><title>${board.title}</title></head>
        <body style="margin:0;background:#fff;font-family:Georgia,serif">
          <div style="width:${canvasW}px;height:${canvasH}px;background:${bgHex};position:relative;margin:24px auto;box-shadow:0 4px 12px rgba(0,0,0,0.1);overflow:hidden">
            ${items}
          </div>
          <div style="text-align:center;color:#888;font-size:9pt;margin-top:6px">${board.title} · Velora vision board</div>
        </body></html>`;
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      if (Platform.OS === "web") {
        if (typeof window !== "undefined") window.open(uri, "_blank");
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Save your vision board" });
      }
    } finally { setExporting(false); }
  };

  const commitTitle = () => {
    if (!board) return;
    commitChange({ ...board, title: titleValue.trim() || "Untitled" });
    setTitleEdit(false);
  };
  const setBackground = (key: string) => board && commitChange({ ...board, background: key });

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
          <TextInput style={styles.titleInput} value={titleValue} autoFocus
            onChangeText={setTitleValue} onSubmitEditing={commitTitle} onBlur={commitTitle} />
        ) : (
          <Pressable onPress={() => setTitleEdit(true)} style={{ flex: 1, alignItems: "center" }}>
            <Text style={styles.title} testID="vision-title">{board.title}</Text>
          </Pressable>
        )}
        <View style={{ flexDirection: "row", gap: spacing.md, alignItems: "center" }}>
          <Pressable onPress={exportPDF} disabled={exporting} hitSlop={8} testID="vision-export">
            {exporting ? <ActivityIndicator color={colors.navy} /> : <Ionicons name="download-outline" size={22} color={colors.ink} />}
          </Pressable>
          <Pressable onPress={saveBoard} disabled={saving} hitSlop={8} testID="vision-save">
            {saving ? <ActivityIndicator color={colors.navy} /> :
              <Ionicons name={dirty ? "save" : "checkmark-done"} size={22} color={dirty ? colors.navy : colors.success} />}
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bgSwitcher} contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
        {BG_OPTIONS.map((b) => (
          <Pressable key={b.key} onPress={() => setBackground(b.key)}
            style={[styles.bgChip, { backgroundColor: b.bg, borderColor: board.background === b.key ? colors.navy : colors.paperInk }]}>
            <Text style={[styles.bgChipText, { color: b.key === "dark" ? colors.paper : colors.ink }]}>{b.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.canvasWrap}>
        <View style={[styles.canvas, { width: canvasW, height: canvasH, backgroundColor: bg.bg }]}>
          {board.items.map((it) => (
            <CanvasItem
              key={it.id}
              item={it}
              selected={selectedId === it.id}
              onSelect={() => setSelectedId(it.id)}
              onCommit={(patch) => patchItem(it.id, patch)}
              colorForSticker={colorForSticker}
            />
          ))}
        </View>
      </View>

      {sel && (
        <View style={styles.selBar}>
          <Text style={styles.selHint}>Drag · pinch to zoom · two-finger rotate</Text>
          <Pressable onPress={() => deleteItem(sel.id)} style={styles.deleteBtn} testID="vision-delete">
            <Ionicons name="trash" size={18} color={colors.error} />
          </Pressable>
        </View>
      )}

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

      <Modal transparent visible={picker !== null} animationType="slide" onRequestClose={() => setPicker(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setPicker(null)} />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
            {picker === "image" && (
              <>
                <Text style={styles.sheetTitle}>Add an image</Text>
                <Text style={styles.sheetSub}>Paste a Pinterest / any image URL, or pick from your phone. Tap "Carve" to crop-in-place before adding.</Text>
                <TextInput
                  style={styles.sheetInput} placeholder="https://i.pinimg.com/..." placeholderTextColor={colors.inkMuted}
                  value={pinUrl} onChangeText={setPinUrl} autoCapitalize="none" keyboardType="url"
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
                <Pressable onPress={cropFromLibrary} style={styles.sheetSecondary} testID="add-image-carve">
                  <Ionicons name="cut-outline" size={18} color={colors.ink} />
                  <Text style={styles.sheetSecondaryText}>Carve — pick + crop precisely</Text>
                </Pressable>
              </>
            )}

            {picker === "text" && (
              <>
                <Text style={styles.sheetTitle}>Add text / quote</Text>
                <TextInput
                  style={[styles.sheetInput, { minHeight: 60 }]}
                  placeholder='Type your quote — "just do it"' placeholderTextColor={colors.inkMuted}
                  value={textInput} onChangeText={setTextInput} multiline
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
                <View style={{ flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" }}>
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
                <ScrollView style={{ maxHeight: 320 }}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.md }}>
                    {COLOR_STICKERS.map((cs) => (
                      <Pressable key={cs.s} onPress={() => addSticker(cs)} style={styles.stickerBtn} testID={`sticker-${cs.s}`}>
                        <Ionicons name={cs.s as any} size={28} color={cs.c} />
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
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
    borderRadius: radius.pill, flexDirection: "row", padding: 8, gap: spacing.sm, borderWidth: 1, borderColor: colors.ink,
    justifyContent: "space-between", alignItems: "center", ...shadow.card,
  },
  selHint: { flex: 1, textAlign: "center", fontFamily: font.textItalic || font.text, fontSize: fontSize.xs, color: colors.ink, fontStyle: "italic" },
  deleteBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper },
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
