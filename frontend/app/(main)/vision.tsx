import { useCallback, useState } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator, RefreshControl, Platform, Alert } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, spacing, font, fontSize, radius, shadow } from "@/src/theme";
import { api, VisionBoard } from "@/src/api";

const COVERS = [
  "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800",
  "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800",
  "https://images.unsplash.com/photo-1531913764164-f85c52e6e654?w=800",
];

export default function VisionTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [boards, setBoards] = useState<VisionBoard[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api.visionBoards();
      setBoards(r.boards);
    } catch {
      setBoards([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const createNew = async () => {
    const r = await api.saveVisionBoard({
      title: "New Vision",
      background: "paper",
      items: [],
    });
    router.push(`/vision-editor/${r.board.id}`);
  };

  const deleteBoard = async (board: VisionBoard) => {
    const previousBoards = boards || [];
    setDeletingId(board.id);
    setBoards((current) => (current || []).filter((item) => item.id !== board.id));
    try {
      await api.deleteVisionBoard(board.id);
    } catch {
      setBoards(previousBoards);
      Alert.alert("Couldn't delete", "Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

  const confirmDelete = (board: VisionBoard) => {
    const message = `"${board.title}" will be permanently removed.`;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`Delete ${message}`)) {
        void deleteBoard(board);
      }
      return;
    }
    Alert.alert("Delete this board?", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteBoard(board) },
    ]);
  };

  return (
    <GridPaper style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Text style={styles.eyebrow}>GENERATE YOUR VISION</Text>
        <Text style={styles.h1}>Vision boards</Text>
        <Text style={styles.sub}>
          Pin pictures, drop stickers, layer quotes. Make it messy, make it yours. Download when you love it.
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 + insets.bottom }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.navy} />}
      >
        <Pressable testID="vision-new" onPress={createNew} style={styles.newCard}>
          <View style={styles.newIcon}>
            <Ionicons name="add" size={26} color={colors.paper} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.newTitle}>Start a new board</Text>
            <Text style={styles.newSub}>Blank canvas. Add pictures, text, stickers.</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={colors.ink} />
        </Pressable>

        {!boards && (
          <View style={{ paddingTop: 40, alignItems: "center" }}>
            <ActivityIndicator color={colors.navy} />
          </View>
        )}

        {boards?.map((b, i) => (
          <Animated.View key={b.id} entering={FadeInUp.delay(i * 60).duration(400)}>
            <View style={styles.boardCard}>
              <Pressable
                testID={`vision-board-${b.id}`}
                onPress={() => router.push(`/vision-editor/${b.id}`)}
                style={styles.boardCardMain}
              >
                <Image
                  source={b.items.find((i) => i.kind === "image")?.url || COVERS[i % COVERS.length]}
                  style={styles.boardImage}
                  contentFit="cover"
                />
                <View style={styles.boardBody}>
                  <Text style={styles.boardTitle}>{b.title}</Text>
                  <Text style={styles.boardMeta}>
                    {b.items.length} {b.items.length === 1 ? "item" : "items"} · updated {new Date(b.updated_at).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.inkMuted} />
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(b)}
                testID={`vision-delete-${b.id}`}
                hitSlop={10}
                style={styles.boardDeleteBtn}
                disabled={deletingId === b.id}
              >
                {deletingId === b.id ? (
                  <ActivityIndicator size="small" color={colors.error} />
                ) : (
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                )}
              </Pressable>
            </View>
          </Animated.View>
        ))}

        {boards?.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="sparkles-outline" size={30} color={colors.inkMuted} />
            <Text style={styles.emptyTitle}>No boards yet</Text>
            <Text style={styles.emptySub}>Tap "Start a new board" above.</Text>
          </View>
        )}
      </ScrollView>
    </GridPaper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.paperInk },
  eyebrow: { fontFamily: font.text, fontSize: fontSize.xs, letterSpacing: 2, color: colors.navy, marginBottom: spacing.xs, fontWeight: "700" },
  h1: { fontFamily: font.display, fontSize: 36, color: colors.ink, marginBottom: spacing.xs },
  sub: { fontFamily: font.text, fontSize: fontSize.md, color: colors.inkSoft, lineHeight: 21, marginBottom: spacing.md },
  newCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.paperInk, marginBottom: spacing.lg,
    ...shadow.soft,
  },
  newIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.navy, alignItems: "center", justifyContent: "center" },
  newTitle: { fontFamily: font.display, fontSize: fontSize.xl, color: colors.ink, fontWeight: "500" },
  newSub: { fontFamily: font.text, fontSize: fontSize.sm, color: colors.inkSoft },
  boardCard: {
    flexDirection: "row", alignItems: "stretch",
    borderRadius: radius.lg, backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.paperInk, marginBottom: spacing.md,
    overflow: "hidden",
    ...shadow.soft,
  },
  boardCardMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  boardDeleteBtn: {
    width: 46, alignItems: "center", justifyContent: "center",
    borderLeftWidth: 1, borderLeftColor: colors.paperInk, backgroundColor: colors.paperCool,
  },
  boardImage: { width: 70, height: 70, borderRadius: radius.md, backgroundColor: colors.paperCool },
  boardBody: { flex: 1 },
  boardTitle: { fontFamily: font.display, fontSize: fontSize.lg, color: colors.ink, fontWeight: "500" },
  boardMeta: { fontFamily: font.text, fontSize: fontSize.xs, color: colors.inkMuted, marginTop: 2 },
  emptyState: { alignItems: "center", paddingTop: 60, gap: spacing.sm },
  emptyTitle: { fontFamily: font.display, fontSize: fontSize.xl, color: colors.ink },
  emptySub: { fontFamily: font.text, fontSize: fontSize.md, color: colors.inkMuted },
});
