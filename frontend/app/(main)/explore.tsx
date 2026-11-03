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
  country?: string[];
  state?: string[];
  region?: string[];
  field?: string[];
  tier?: string[];
  max_fees_inr_lakhs?: number;
  level?: string;
  funding?: string;
  competitiveness?: string;
  pr_friendly?: boolean;
};

type FilterOptions = {
  countries: string[];
  regions: string[];
  states_by_country: Record<string, string[]>;
  fields: string[];
  budget_buckets_inr_lakhs: number[];
  levels: string[];
  fundings: string[];
  competitiveness: string[];
  tiers: string[];
  has_pr_friendly: boolean;
};

// Per-kind config: which sections show
const KIND_CONFIG: Record<
  ExploreKind,
  {
    country?: boolean;
    state?: boolean;
    region?: boolean;
    field?: boolean;
    tier?: boolean;
    fees?: boolean;
    level?: boolean;
    funding?: boolean;
    competitiveness?: boolean;
    pr?: boolean;
  }
> = {
  universities: {
    country: true,
    state: true,
    field: true,
    tier: true,
    fees: true,
  },
  scholarships: {
    country: true,
    field: true,
    level: true,
    funding: true,
    competitiveness: true,
  },
  hidden_courses: { country: true, field: true },
  muns: { country: true, region: true },
  countries: { region: true, field: true, fees: true, pr: true },
};

const toggle = <T,>(arr: T[] | undefined, v: T): T[] => {
  const list = arr || [];
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
};

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [kind, setKind] = useState<ExploreKind>("universities");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Filters>({});
  const [filterModal, setFilterModal] = useState(false);
  const [options, setOptions] = useState<FilterOptions | null>(null);

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

  const activeFilterCount = useMemo(() => {
    let n = 0;
    (["country", "state", "region", "field", "tier"] as const).forEach((k) => {
      const v = filters[k];
      if (v && v.length) n += 1;
    });
    (["level", "funding", "competitiveness"] as const).forEach((k) => {
      if (filters[k]) n += 1;
    });
    if (filters.max_fees_inr_lakhs != null) n += 1;
    if (filters.pr_friendly != null) n += 1;
    return n;
  }, [filters]);

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

        {activeFilterCount > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.activeFilterRow}
          >
            {(filters.country || []).map((c) => (
              <FilterPill
                key={`c-${c}`}
                label={c}
                icon="earth"
                onClear={() =>
                  setFilters((f) => ({
                    ...f,
                    country: (f.country || []).filter((x) => x !== c),
                    state: [],
                  }))
                }
              />
            ))}
            {(filters.state || []).map((s) => (
              <FilterPill
                key={`s-${s}`}
                label={s}
                icon="location"
                onClear={() =>
                  setFilters((f) => ({
                    ...f,
                    state: (f.state || []).filter((x) => x !== s),
                  }))
                }
              />
            ))}
            {(filters.region || []).map((r) => (
              <FilterPill
                key={`r-${r}`}
                label={r}
                icon="globe"
                onClear={() =>
                  setFilters((f) => ({
                    ...f,
                    region: (f.region || []).filter((x) => x !== r),
                  }))
                }
              />
            ))}
            {(filters.field || []).map((c) => (
              <FilterPill
                key={`f-${c}`}
                label={c}
                icon="book"
                onClear={() =>
                  setFilters((f) => ({
                    ...f,
                    field: (f.field || []).filter((x) => x !== c),
                  }))
                }
              />
            ))}
            {(filters.tier || []).map((t) => (
              <FilterPill
                key={`t-${t}`}
                label={`Tier ${t}`}
                icon="ribbon"
                onClear={() =>
                  setFilters((f) => ({
                    ...f,
                    tier: (f.tier || []).filter((x) => x !== t),
                  }))
                }
              />
            ))}
            {filters.max_fees_inr_lakhs != null && (
              <FilterPill
                label={`≤ ₹${filters.max_fees_inr_lakhs}L/yr`}
                icon="cash"
                onClear={() =>
                  setFilters((f) => ({ ...f, max_fees_inr_lakhs: undefined }))
                }
              />
            )}
            {filters.level && (
              <FilterPill
                label={filters.level}
                icon="school"
                onClear={() => setFilters((f) => ({ ...f, level: undefined }))}
              />
            )}
            {filters.funding && (
              <FilterPill
                label={filters.funding}
                icon="wallet"
                onClear={() =>
                  setFilters((f) => ({ ...f, funding: undefined }))
                }
              />
            )}
            {filters.competitiveness && (
              <FilterPill
                label={filters.competitiveness}
                icon="pulse"
                onClear={() =>
                  setFilters((f) => ({ ...f, competitiveness: undefined }))
                }
              />
            )}
            {filters.pr_friendly != null && (
              <FilterPill
                label={filters.pr_friendly ? "PR friendly" : "No-PR"}
                icon="airplane"
                onClear={() =>
                  setFilters((f) => ({ ...f, pr_friendly: undefined }))
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
  options: FilterOptions | null;
  filters: Filters;
  onChange: (f: Filters) => void;
}) {
  const [draft, setDraft] = useState<Filters>(filters);
  useEffect(() => setDraft(filters), [filters, visible]);
  const insets = useSafeAreaInsets();
  const cfg = KIND_CONFIG[kind];

  // Combine states from all selected countries
  const availableStates = useMemo(() => {
    if (!options || !cfg.state) return [];
    const chosen = draft.country || [];
    if (chosen.length === 0) {
      // Show all Indian states as most common use-case, plus any other populated
      return Array.from(
        new Set(
          Object.values(options.states_by_country).flat()
        )
      ).sort();
    }
    return Array.from(
      new Set(chosen.flatMap((c) => options.states_by_country[c] || []))
    ).sort();
  }, [options, draft.country, cfg.state]);

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View
          style={[
            styles.modalSheet,
            { paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Refine{" "}
              <Text style={styles.modalTitleAccent}>
                {kind.replace("_", " ")}
              </Text>
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.ink} />
            </Pressable>
          </View>
          <Text style={styles.modalHint}>Tap to add — you can select many.</Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 540 }}>
            {cfg.region && options && options.regions.length > 0 && (
              <FilterSection title="Region">
                <ChipCloud
                  options={options.regions}
                  selected={draft.region || []}
                  multi
                  onToggle={(v) =>
                    setDraft((d) => ({ ...d, region: toggle(d.region, v) }))
                  }
                  testIDPrefix="filter-region"
                />
              </FilterSection>
            )}

            {cfg.country && options && options.countries.length > 0 && (
              <FilterSection
                title="Country"
                subtitle="Pick any number of countries"
              >
                <ChipCloud
                  options={options.countries}
                  selected={draft.country || []}
                  multi
                  onToggle={(v) =>
                    setDraft((d) => {
                      const nextCountries = toggle(d.country, v);
                      // clear states that don't belong anymore
                      const validStates = new Set(
                        nextCountries.flatMap(
                          (c) => options.states_by_country[c] || []
                        )
                      );
                      const cleanState = (d.state || []).filter((s) =>
                        validStates.has(s)
                      );
                      return { ...d, country: nextCountries, state: cleanState };
                    })
                  }
                  testIDPrefix="filter-country"
                />
              </FilterSection>
            )}

            {cfg.state && availableStates.length > 0 && (
              <FilterSection
                title="State / Region"
                subtitle={
                  draft.country && draft.country.length
                    ? `Within ${draft.country.join(", ")}`
                    : "Across all countries with state data"
                }
              >
                <ChipCloud
                  options={availableStates}
                  selected={draft.state || []}
                  multi
                  onToggle={(v) =>
                    setDraft((d) => ({ ...d, state: toggle(d.state, v) }))
                  }
                  testIDPrefix="filter-state"
                />
              </FilterSection>
            )}

            {cfg.field && options && options.fields.length > 0 && (
              <FilterSection
                title="Field / Course"
                subtitle="Choose one or many courses"
              >
                <ChipCloud
                  options={options.fields}
                  selected={draft.field || []}
                  multi
                  onToggle={(v) =>
                    setDraft((d) => ({ ...d, field: toggle(d.field, v) }))
                  }
                  testIDPrefix="filter-field"
                />
              </FilterSection>
            )}

            {cfg.tier && options && options.tiers.length > 0 && (
              <FilterSection title="Tier" subtitle="1 = Elite · 4 = Accessible">
                <ChipCloud
                  options={options.tiers}
                  selected={draft.tier || []}
                  multi
                  labelFn={(t) => `Tier ${t}`}
                  onToggle={(v) =>
                    setDraft((d) => ({ ...d, tier: toggle(d.tier, v) }))
                  }
                  testIDPrefix="filter-tier"
                />
              </FilterSection>
            )}

            {cfg.level && options && options.levels.length > 0 && (
              <FilterSection title="Level">
                <ChipCloud
                  options={options.levels}
                  selected={draft.level ? [draft.level] : []}
                  onToggle={(v) =>
                    setDraft((d) => ({
                      ...d,
                      level: d.level === v ? undefined : v,
                    }))
                  }
                  testIDPrefix="filter-level"
                />
              </FilterSection>
            )}

            {cfg.funding && options && options.fundings.length > 0 && (
              <FilterSection title="Funding">
                <ChipCloud
                  options={options.fundings}
                  selected={draft.funding ? [draft.funding] : []}
                  onToggle={(v) =>
                    setDraft((d) => ({
                      ...d,
                      funding: d.funding === v ? undefined : v,
                    }))
                  }
                  testIDPrefix="filter-funding"
                />
              </FilterSection>
            )}

            {cfg.competitiveness &&
              options &&
              options.competitiveness.length > 0 && (
                <FilterSection title="Competitiveness">
                  <ChipCloud
                    options={options.competitiveness}
                    selected={
                      draft.competitiveness ? [draft.competitiveness] : []
                    }
                    onToggle={(v) =>
                      setDraft((d) => ({
                        ...d,
                        competitiveness:
                          d.competitiveness === v ? undefined : v,
                      }))
                    }
                    testIDPrefix="filter-comp"
                  />
                </FilterSection>
              )}

            {cfg.fees && options && (
              <FilterSection
                title="Budget"
                subtitle="Max annual fees (₹ lakhs)"
              >
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

            {cfg.pr && (
              <FilterSection title="PR Friendly" subtitle="Post-study residency">
                <View style={styles.budgetRow}>
                  {[
                    { v: true, label: "PR-friendly" },
                    { v: false, label: "Others" },
                  ].map(({ v, label }) => {
                    const on = draft.pr_friendly === v;
                    return (
                      <Pressable
                        key={String(v)}
                        onPress={() =>
                          setDraft((d) => ({
                            ...d,
                            pr_friendly: on ? undefined : v,
                          }))
                        }
                        style={[styles.budgetChip, on && styles.budgetChipOn]}
                        testID={`filter-pr-${v}`}
                      >
                        <Text
                          style={[
                            styles.budgetChipText,
                            on && styles.budgetChipTextOn,
                          ]}
                        >
                          {label}
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
  multi,
  onToggle,
  testIDPrefix,
  labelFn,
}: {
  options: string[];
  selected: string[];
  multi?: boolean;
  onToggle: (v: string) => void;
  testIDPrefix?: string;
  labelFn?: (v: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const LIMIT = 24;
  const shown = expanded || options.length <= LIMIT ? options : options.slice(0, LIMIT);
  return (
    <View>
      <View style={styles.chipCloud}>
        {shown.map((o) => {
          const on = selected.includes(o);
          return (
            <Pressable
              key={o}
              onPress={() => onToggle(o)}
              style={[styles.cloudChip, on && styles.cloudChipOn]}
              testID={
                testIDPrefix
                  ? `${testIDPrefix}-${o.replace(/\s+/g, "-")}`
                  : undefined
              }
            >
              {multi && (
                <Ionicons
                  name={on ? "checkmark-circle" : "add-circle-outline"}
                  size={12}
                  color={on ? colors.paper : colors.inkMuted}
                  style={{ marginRight: 4 }}
                />
              )}
              <Text
                style={[styles.cloudChipText, on && styles.cloudChipTextOn]}
                numberOfLines={1}
              >
                {labelFn ? labelFn(o) : o}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {options.length > LIMIT && (
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          style={styles.showMore}
        >
          <Text style={styles.showMoreText}>
            {expanded
              ? "Show fewer"
              : `Show all ${options.length}`}
          </Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.navy}
          />
        </Pressable>
      )}
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
        {item.competitiveness && (
          <View style={styles.metaPill}>
            <Ionicons name="pulse-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.competitiveness}</Text>
          </View>
        )}
        {item.region && kind !== "universities" && (
          <View style={styles.metaPill}>
            <Ionicons name="globe-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>{item.region}</Text>
          </View>
        )}
        {item.pr_friendly && kind === "countries" && (
          <View style={styles.metaPill}>
            <Ionicons name="airplane-outline" size={11} color={colors.inkSoft} />
            <Text style={styles.metaText}>PR-friendly</Text>
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
  activeFilterRow: { gap: 8, paddingVertical: 4, alignItems: "center" },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.navy,
    borderRadius: radius.pill,
    maxWidth: 240,
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
  // Modal
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
  modalHint: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    marginBottom: spacing.md,
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
    maxWidth: 240,
  },
  cloudChipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  cloudChipText: {
    fontFamily: font.text,
    fontSize: 12,
    color: colors.ink,
    fontWeight: "500",
  },
  cloudChipTextOn: { color: colors.paper },
  showMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  showMoreText: {
    fontFamily: font.text,
    fontSize: 12,
    color: colors.navy,
    fontWeight: "700",
  },
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
