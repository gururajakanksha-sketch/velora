import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";
import DraggableFlatList, {
  RenderItemParams,
  ScaleDecorator,
} from "react-native-draggable-flatlist";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, font, fontSize, spacing, radius, shadow } from "@/src/theme";
import { api, Task } from "@/src/api";

type Category = "general" | "daily" | "monthly" | "yearly";

export default function PlannerScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<Category>("general");

  const load = useCallback(async () => {
    try {
      const r = await api.planner();
      setTasks(r.tasks);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!newTitle.trim()) return;
    setBusy(true);
    try {
      const r = await api.createTask({ title: newTitle.trim(), category });
      setTasks((prev) => [...(prev || []), r.task]);
      setNewTitle("");
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (t: Task) => {
    const nextStatus = t.status === "done" ? "todo" : "done";
    setTasks((prev) =>
      (prev || []).map((x) => (x.id === t.id ? { ...x, status: nextStatus } : x))
    );
    try {
      await api.updateTask(t.id, { status: nextStatus });
    } catch {
      load();
    }
  };

  const remove = async (t: Task) => {
    setTasks((prev) => (prev || []).filter((x) => x.id !== t.id));
    try {
      await api.deleteTask(t.id);
    } catch {
      load();
    }
  };

  const active = useMemo(
    () =>
      (tasks || []).filter(
        (t) =>
          t.status !== "done" &&
          ((t as any).category || "general") === category
      ),
    [tasks, category]
  );
  const done = useMemo(
    () =>
      (tasks || []).filter(
        (t) =>
          t.status === "done" &&
          ((t as any).category || "general") === category
      ),
    [tasks, category]
  );
  const xp = useMemo(
    () =>
      (tasks || [])
        .filter((t) => t.status === "done")
        .reduce((sum, t) => sum + (t.xp || 0), 0),
    [tasks]
  );

  const onReorderActive = useCallback(
    async (reordered: Task[]) => {
      // Optimistically merge back into full task list
      setTasks((prev) => {
        if (!prev) return prev;
        const others = prev.filter(
          (t) =>
            !(
              t.status !== "done" &&
              ((t as any).category || "general") === category
            )
        );
        return [...others, ...reordered];
      });
      try {
        await api.reorderTasks(
          category,
          reordered.map((t) => t.id)
        );
      } catch {
        load();
      }
    },
    [category, load]
  );

  const renderActiveItem = useCallback(
    ({ item, drag, isActive }: RenderItemParams<Task>) => (
      <ScaleDecorator activeScale={1.03}>
        <TaskRow
          task={item}
          onToggle={() => toggle(item)}
          onDelete={() => remove(item)}
          onLongPress={drag}
          isDragging={isActive}
        />
      </ScaleDecorator>
    ),
    []
  );

  return (
    <GridPaper style={styles.container} variant="warm">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={80}
      >
        <DraggableFlatList
          testID="planner-list"
          data={active}
          keyExtractor={(t) => t.id}
          renderItem={renderActiveItem}
          onDragEnd={({ data }) => onReorderActive(data)}
          activationDistance={12}
          containerStyle={{ flex: 1 }}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + spacing.md, paddingBottom: spacing.xxxl },
          ]}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.eyebrow}>MISSION PLANNER</Text>
                  <Text style={styles.title}>
                    Your <Text style={styles.titleAccent}>next moves.</Text>
                  </Text>
                </View>
                <View style={styles.xpBadge} testID="xp-badge">
                  <Text style={styles.xpLabel}>XP</Text>
                  <Text style={styles.xpValue}>{xp}</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.catRow}
                style={{ maxHeight: 56, marginTop: spacing.sm }}
              >
                {(["general", "daily", "monthly", "yearly"] as Category[]).map((c) => (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={[styles.catChip, category === c && styles.catChipSel]}
                    testID={`planner-cat-${c}`}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        category === c && styles.catChipTextSel,
                      ]}
                    >
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <View style={styles.addRow}>
                <TextInput
                  testID="planner-input"
                  value={newTitle}
                  onChangeText={setNewTitle}
                  placeholder="Add a task or side quest…"
                  placeholderTextColor={colors.inkFaint}
                  style={styles.addInput}
                  onSubmitEditing={add}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={add}
                  disabled={!newTitle.trim() || busy}
                  style={[
                    styles.addBtn,
                    (!newTitle.trim() || busy) && { opacity: 0.5 },
                  ]}
                  testID="planner-add"
                >
                  {busy ? (
                    <ActivityIndicator color={colors.paper} size="small" />
                  ) : (
                    <Ionicons name="add" size={22} color={colors.paper} />
                  )}
                </Pressable>
              </View>

              {tasks === null ? (
                <View style={styles.loading}>
                  <ActivityIndicator color={colors.navy} />
                </View>
              ) : active.length === 0 && done.length === 0 ? (
                <EmptyState />
              ) : (
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionLabel}>ACTIVE ({active.length})</Text>
                  {active.length > 1 && (
                    <View style={styles.hint}>
                      <Ionicons
                        name="menu-outline"
                        size={11}
                        color={colors.inkMuted}
                      />
                      <Text style={styles.hintText}>Hold & drag to reorder</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          }
          ListFooterComponent={
            done.length > 0 ? (
              <View style={[styles.section, { marginTop: spacing.lg }]}>
                <Text style={styles.sectionLabel}>COMPLETED ({done.length})</Text>
                {done.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggle={() => toggle(t)}
                    onDelete={() => remove(t)}
                  />
                ))}
              </View>
            ) : null
          }
        />
      </KeyboardAvoidingView>
    </GridPaper>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  onLongPress,
  isDragging,
}: {
  task: Task;
  onToggle: () => void;
  onDelete: () => void;
  onLongPress?: () => void;
  isDragging?: boolean;
}) {
  const done = task.status === "done";
  return (
    <Animated.View entering={FadeInUp.duration(220)}>
      <View
        style={[
          styles.row,
          done && styles.rowDone,
          isDragging && styles.rowDragging,
        ]}
      >
        {onLongPress && !done && (
          <Pressable
            onLongPress={onLongPress}
            delayLongPress={200}
            hitSlop={8}
            style={styles.dragHandle}
            testID={`task-drag-${task.id}`}
          >
            <Ionicons name="reorder-two-outline" size={18} color={colors.inkMuted} />
          </Pressable>
        )}
        <Pressable
          onPress={onToggle}
          style={[styles.check, done && styles.checkDone]}
          testID={`task-toggle-${task.id}`}
          hitSlop={8}
        >
          {done && <Ionicons name="checkmark" size={16} color={colors.paper} />}
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.rowTitleWrap}>
            {task.kind === "side_quest" && (
              <View style={styles.questTag}>
                <Ionicons name="sparkles" size={10} color={colors.navy} />
                <Text style={styles.questTagText}>QUEST</Text>
              </View>
            )}
            <Text
              style={[styles.rowTitle, done && styles.rowTitleDone]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>
          {task.detail && (
            <Text
              style={[styles.rowDetail, done && styles.rowTitleDone]}
              numberOfLines={2}
            >
              {task.detail}
            </Text>
          )}
          {task.xp > 0 && <Text style={styles.rowXp}>+{task.xp} XP</Text>}
        </View>
        <Pressable
          onPress={onDelete}
          testID={`task-delete-${task.id}`}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={16} color={colors.inkMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyBadge}>
        <Ionicons name="sparkles" size={26} color={colors.paper} />
      </View>
      <Text style={styles.emptyTitle}>Nothing yet.</Text>
      <Text style={styles.emptyBody}>
        Add your first move above, or head to Mission Control and pick a Side Quest.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: spacing.xl },
  headerRow: { flexDirection: "row", alignItems: "flex-end", marginBottom: spacing.xl },
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
  },
  titleAccent: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    color: colors.navy,
  },
  xpBadge: {
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.lg,
    backgroundColor: colors.navy,
    ...shadow.soft,
  },
  xpLabel: {
    fontFamily: font.text,
    fontSize: 9,
    color: colors.accentYellow,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  xpValue: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: colors.paper,
    fontWeight: "500",
  },
  addRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.xl },
  addInput: {
    flex: 1,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    paddingHorizontal: spacing.md,
    fontFamily: font.text,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.soft,
  },
  loading: { alignItems: "center", padding: spacing.xxxl },
  section: { marginBottom: spacing.xl },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.inkMuted,
    fontWeight: "700",
  },
  hint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.paperWarm,
    borderRadius: radius.pill,
  },
  hintText: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: 10,
    color: colors.inkMuted,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    marginBottom: spacing.sm,
  },
  rowDone: { backgroundColor: colors.paperCool, opacity: 0.85 },
  rowDragging: {
    ...shadow.card,
    borderColor: colors.navy,
    backgroundColor: colors.paperWarm,
  },
  dragHandle: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  check: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  checkDone: { backgroundColor: colors.success, borderColor: colors.success },
  rowTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  questTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.paperWarm,
    borderWidth: 1,
    borderColor: colors.accentYellow,
  },
  questTagText: {
    fontFamily: font.text,
    fontSize: 9,
    color: colors.navy,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  rowTitle: {
    fontFamily: font.text,
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: "500",
    flex: 1,
  },
  rowTitleDone: {
    textDecorationLine: "line-through",
    color: colors.inkMuted,
  },
  rowDetail: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.inkMuted,
    lineHeight: 18,
    marginTop: 2,
  },
  rowXp: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.xs,
    color: colors.navy,
    marginTop: 4,
  },
  empty: { alignItems: "center", padding: spacing.xxl, gap: spacing.md },
  emptyBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.card,
  },
  emptyTitle: {
    fontFamily: font.display,
    fontSize: fontSize.xxl,
    color: colors.ink,
    fontWeight: "500",
  },
  emptyBody: {
    fontFamily: font.text,
    fontSize: fontSize.md,
    color: colors.inkSoft,
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },
  catRow: {
    paddingHorizontal: 4,
    gap: 8,
    alignItems: "center",
    height: 56,
  },
  catChip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.paperInk,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    backgroundColor: colors.paper,
  },
  catChipSel: { backgroundColor: colors.ink, borderColor: colors.ink },
  catChipText: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    fontWeight: "600",
  },
  catChipTextSel: { color: colors.paper },
});
