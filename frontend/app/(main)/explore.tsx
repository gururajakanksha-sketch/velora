import { useCallback, useEffect, useMemo, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  FlatList,
  Modal,
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

type Filters = {
  country?: string;
  state?: string;
  field?: string;
  max_fees_inr_lakhs?: number;
};

const KINDS_SUPPORTING_STATE = new Set<ExploreKind>(["universities"]);
const KINDS_SUPPORTING_FEES = new Set<ExploreKind>(["universities"]);
const KINDS_SUPPORTING_FIELD = new Set<ExploreKind>([
  "universities",
  "scholarships",
  "hidden_courses",
]);

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [kind, setKind] = useState<ExploreKind>("universities");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [filterModal, setFilterModal] = useState(false);
  const [options, setOptions] = useState<{
    countries: string[];
    states_by_country: Record<string, string[]>;
    fields: string[];
    budget_buckets_inr_lakhs: number[];
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.explore(kind, { q: q || undefined, ...filters });
      setItems(r.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [kind, q, filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Load filter options whenever kind changes and reset filters
  useEffect(() => {
    setFilters({});
    (async () => {
      try {
        const o = await api.exploreFilterOptions(kind);
        setOptions(o);
      } catch {
        setOptions(null);
      }
    })();
  }, [kind]);

  const activeFilterCount = useMemo(
    () =>
      Object.values(filters).filter((v) => v !== undefined && v !== null && v !== "")
        .length,
    [filters]
  );

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
          <Pressable
            onPress={() => setFilterModal(true)}
            testID="explore-open-filters"
            hitSlop={8}
            style={styles.filterButton}
          >
            <Ionicons
              name="options-outline"
              size={16}
              color={activeFilterCount ? colors.paper : colors.ink}
            />
            {activeFilterCount > 0 && (
              <View style={styles.filterCount}>
                <Text style={styles.filterCountText}>{activeFilterCount}</Text>
              </View>
            )}
          </Pressable>
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
                <Ionicons
                  name={k.icon}
                  size={13}
                  color={on ? colors.paper : colors.ink}
                />
                <Text style={[styles.chipText, on && styles.chipTextOn]}>
                  {k.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Active filter chips */}
        {activeFilterCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFilterRow}
          >
            {filters.country && (
              <FilterPill
                label={filters.country}
                icon="earth"
                onClear={() =>
                  setFilters((f) => ({ ...f, country: undefined, state: undefined }))
                }
              />
            )}
            {filters.state && (
              <FilterPill
                label={filters.state}
                icon="location"
                onClear={() => setFilters((f) => ({ ...f, state: undefined }))}
              />
            )}
            {filters.field && (
              <FilterPill
                label={filters.field}
                icon="book"
                onClear={() => setFilters((f) => ({ ...f, field: undefined }))}
              />
            )}
            {filters.max_fees_inr_lakhs != null && (
              <FilterPill
                label={`≤ ₹${filters.max_fees_inr_lakhs}L/yr`}
                icon="cash"
                onClear={() =>
                  setFilters((f) => ({ ...f, max_fees_inr_lakhs: undefined }))
                }
              />
            )}
            <Pressable onPress={() => setFilters({})} style={styles.clearAllPill}>
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
          </ScrollView>
        )}
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
          ListHeaderComponent={
            <Text style={styles.resultCount}>
              {items.length} {items.length === 1 ? "result" : "results"}
            </Text>
          }
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
              <Text style={styles.emptyText}>
                Nothing matches — try clearing your search or filters.
              </Text>
            </View>
          }
        />
      )}

      <FilterModal
        visible={filterModal}
        onClose={() => setFilterModal(false)}
        kind={kind}
        options={options}
        filters={filters}
        onChange={setFilters}
      />
    </GridPaper>
  );
}

function FilterPill({
  label,
  icon,
  onClear,
}: {
  label: string;
  icon: any;
  onClear: () => void;
}) {
  return (
    <View style={styles.activePill}>
      <Ionicons name={icon} size={11} color={colors.paper} />
      <Text style={styles.activePillText} numberOfLines={1}>
        {label}
      </Text>
      <Pressable onPress={onClear} hitSlop={8}>
        <Ionicons name="close" size={12} color={colors.paper} />
      </Pressable>
    </View>
  );
}

function FilterModal({
  visible,
  onClose,
  kind,
  options,
  filters,
  onChange,
}: {
  visible: boolean;
  onClose: () => void;
  kind: ExploreKind;
  options: {
    countries: string[];
    states_by_country: Record<string, string[]>;
    fields: string[];
    budget_buckets_inr_lakhs: number[];
  } | null;
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const [draft, setDraft] = useState<Filters>(filters);
  useEffect(() => setDraft(filters), [filters, visible]);

  const insets = useSafeAreaInsets();
  const supportsState = KINDS_SUPPORTING_STATE.has(kind);
  const supportsFees = KINDS_SUPPORTING_FEES.has(kind);
  const supportsField = KINDS_SUPPORTING_FIELD.has(kind);

  const availableStates = useMemo(() => {
    if (!options || !draft.country) return [];
    return options.states_by_country[draft.country] || [];
  }, [options, draft.country]);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Refine <Text style={styles.modalTitleAccent}>{kind.replace("_", " ")}</Text>
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
            {/* Country */}
            {options && options.countries.length > 0 && (
              <FilterSection title="Country">
                <ChipCloud
                  options={options.countries}
                  selected={draft.country}
                  onSelect={(v) =>
                    setDraft((d) => ({
                      ...d,
                      country: d.country === v ? undefined : v,
                      state: d.country === v ? undefined : d.state,
                    }))
                  }
                  testIDPrefix="filter-country"
                />
              </FilterSection>
            )}

            {/* State */}
            {supportsState && availableStates.length > 0 && (
              <FilterSection
                title={`State / Region in ${draft.country ?? ""}`}
                subtitle="Narrow down by region"
              >
                <ChipCloud
                  options={availableStates}
                  selected={draft.state}
                  onSelect={(v) =>
                    setDraft((d) => ({ ...d, state: d.state === v ? undefined : v }))
                  }
                  testIDPrefix="filter-state"
                />
              </FilterSection>
            )}

            {/* Field / Course */}
            {supportsField && options && options.fields.length > 0 && (
              <FilterSection title="Field / Course">
                <ChipCloud
                  options={options.fields}
                  selected={draft.field}
                  onSelect={(v) =>
                    setDraft((d) => ({ ...d, field: d.field === v ? undefined : v }))
                  }
                  testIDPrefix="filter-field"
                />
              </FilterSection>
            )}

            {/* Budget */}
            {supportsFees && options && (
              <FilterSection title="Budget" subtitle="Max annual fees (₹ lakhs)">
                <View style={styles.budgetRow}>
                  {options.budget_buckets_inr_lakhs.map((b) => {
                    const on = draft.max_fees_inr_lakhs === b;
                    return (
                      <Pressable
                        key={b}
                        onPress={() =>
                          setDraft((d) => ({
                            ...d,
                            max_fees_inr_lakhs: on ? undefined : b,
                          }))
                        }
                        style={[styles.budgetChip, on && styles.budgetChipOn]}
                        testID={`filter-budget-${b}`}
                      >
                        <Text
                          style={[
                            styles.budgetChipText,
                            on && styles.budgetChipTextOn,
                          ]}
                        >
                          ≤ ₹{b}L
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </FilterSection>
            )}
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnGhost]}
              onPress={() => setDraft({})}
              testID="filter-reset"
            >
              <Text style={styles.modalBtnGhostText}>Reset</Text>
            </Pressable>
            <Pressable
              style={[styles.modalBtn, styles.modalBtnPrimary]}
              onPress={() => {
                onChange(draft);
                onClose();
              }}
              testID="filter-apply"
            >
              <Text style={styles.modalBtnPrimaryText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FilterSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSub}>{subtitle}</Text>}
      <View style={{ marginTop: spacing.sm }}>{children}</View>
    </View>
  );
}

function ChipCloud({
  options,
  selected,
  onSelect,
  testIDPrefix,
}: {
  options: string[];
  selected?: string;
  onSelect: (v: string) => void;
  testIDPrefix?: string;
}) {
  return (
    <View style={styles.chipCloud}>
      {options.map((o) => {
        const on = selected === o;
        return (
          <Pressable
            key={o}
            onPress={() => onSelect(o)}
            style={[styles.cloudChip, on && styles.cloudChipOn]}
            testID={testIDPrefix ? `${testIDPrefix}-${o.replace(/\s+/g, "-")}` : undefined}
          >
            <Text style={[styles.cloudChipText, on && styles.cloudChipTextOn]} numberOfLines={1}>
              {o}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
            <Ionicons name="earth-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.country}</Text>
          </View>
        )}
        {item.state && (
          <View style={styles.metaPill}>
            <Ionicons name="map-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.state}</Text>
          </View>
        )}
        {item.city && (
          <View style={styles.metaPill}>
            <Ionicons name="location-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.city}</Text>
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
        {item.fees_inr_pretty && (
          <View style={styles.metaPill}>
            <Ionicons name="cash-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.fees_inr_pretty}</Text>
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
  filterButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.paperWarm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.paperInk,
  },
  filterCount: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: colors.navy,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  filterCountText: {
    color: colors.paper,
    fontFamily: font.text,
    fontSize: 10,
    fontWeight: "700",
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

  activeFilterRow: {
    gap: 8,
    paddingVertical: 4,
    alignItems: "center",
  },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    maxWidth: 220,
  },
  activePillText: {
    color: colors.paper,
    fontFamily: font.text,
    fontSize: 11,
    fontWeight: "600",
  },
  clearAllPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.paper,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.paperInk,
  },
  clearAllText: {
    fontFamily: font.text,
    fontSize: 11,
    color: colors.inkSoft,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  list: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxxl },
  resultCount: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    letterSpacing: 1.5,
    fontWeight: "700",
    marginBottom: spacing.sm,
  },

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
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
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
    textAlign: "center",
  },

  // Filter modal
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(20,20,30,0.35)",
  },
  modalSheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderTopWidth: 1,
    borderColor: colors.paperInk,
    ...shadow.card,
  },
  modalHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.paperInk,
    marginBottom: spacing.md,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontFamily: font.display,
    fontSize: fontSize.xxl,
    color: colors.ink,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  modalTitleAccent: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    color: colors.navy,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 2,
    color: colors.navy,
    fontWeight: "700",
  },
  sectionSub: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    marginTop: 2,
  },
  chipCloud: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  cloudChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    maxWidth: 220,
  },
  cloudChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  cloudChipText: {
    fontFamily: font.text,
    fontSize: 12,
    color: colors.ink,
    fontWeight: "500",
  },
  cloudChipTextOn: { color: colors.paper },
  budgetRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  budgetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
  },
  budgetChipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  budgetChipText: {
    fontFamily: font.text,
    fontSize: 12,
    color: colors.ink,
    fontWeight: "600",
  },
  budgetChipTextOn: { color: colors.paper },
  modalActions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderColor: colors.paperInk,
    marginTop: spacing.sm,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnGhost: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
  },
  modalBtnGhostText: {
    fontFamily: font.text,
    color: colors.ink,
    fontWeight: "600",
  },
  modalBtnPrimary: { backgroundColor: colors.ink },
  modalBtnPrimaryText: {
    fontFamily: font.text,
    color: colors.paper,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
