import { useEffect, useMemo, useRef, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";

import { GridPaper } from "@/src/components/GridPaper";
import { colors, font, fontSize, spacing, radius, shadow } from "@/src/theme";
import { api, Achievement, BoardImage, LifePrompt } from "@/src/api";
import { useAuth } from "@/src/AuthContext";
import { useRouter } from "expo-router";

type Step = "welcome" | "resume" | "life" | "board" | "generating" | "done";

export default function OnboardingIntro() {
  const insets = useSafeAreaInsets();
  const { user, markOnboarded } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("welcome");

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [lifePrompts, setLifePrompts] = useState<LifePrompt[]>([]);
  const [board, setBoard] = useState<BoardImage[]>([]);

  const [selectedResume, setSelectedResume] = useState<Set<string>>(new Set());
  const [customAchievement, setCustomAchievement] = useState("");
  const [customList, setCustomList] = useState<string[]>([]);
  const [selectedLife, setSelectedLife] = useState<Set<string>>(new Set());
  const [pins, setPins] = useState<{ id: string; url: string; tags?: string }[]>([]);
  const [pinUrl, setPinUrl] = useState("");

  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    api.onboardingLibrary().then((lib) => {
      setAchievements(lib.achievements);
      setLifePrompts(lib.life_prompts);
      setBoard(lib.board_images);
    });
  }, []);

  const nextStep = () => {
    if (step === "welcome") setStep("resume");
    else if (step === "resume") setStep("life");
    else if (step === "life") setStep("board");
    else if (step === "board") submit();
  };

  const backStep = () => {
    if (step === "resume") setStep("welcome");
    else if (step === "life") setStep("resume");
    else if (step === "board") setStep("life");
  };

  const submit = async () => {
    setStep("generating");
    setSubmitError(null);
    try {
      await api.completeOnboarding({
        dream_resume: Array.from(selectedResume),
        custom_achievements: customList,
        life_prompts: Array.from(selectedLife),
        board_pins: pins,
      });
      markOnboarded();
      setStep("done");
      setTimeout(() => router.replace("/(main)"), 1500);
    } catch (e: any) {
      setSubmitError(String(e?.message || e));
      setStep("board");
    }
  };

  const totalSteps = 4;
  const progressStep =
    step === "welcome" ? 0 : step === "resume" ? 1 : step === "life" ? 2 : step === "board" ? 3 : 4;

  const canAdvance =
    step === "welcome" ||
    (step === "resume" && selectedResume.size + customList.length >= 3) ||
    (step === "life" && selectedLife.size >= 3) ||
    (step === "board" && pins.length >= 4);

  return (
    <GridPaper style={styles.container} variant="warm">
      <View style={[styles.top, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.topRow}>
          <Pressable
            onPress={backStep}
            disabled={step === "welcome" || step === "generating" || step === "done"}
            hitSlop={10}
            testID="onboarding-back"
            style={styles.iconBtn}
          >
            <Ionicons
              name="chevron-back"
              size={22}
              color={step === "welcome" ? "transparent" : colors.ink}
            />
          </Pressable>
          <View style={styles.progressWrap}>
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.progressDot,
                  { backgroundColor: i < progressStep ? colors.navy : colors.paperInk },
                ]}
              />
            ))}
          </View>
          <View style={styles.iconBtn} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        {step === "welcome" && (
          <WelcomeStep name={user?.name?.split(" ")[0] || "friend"} />
        )}
        {step === "resume" && (
          <ResumeStep
            achievements={achievements}
            selected={selectedResume}
            setSelected={setSelectedResume}
            custom={customAchievement}
            setCustom={setCustomAchievement}
            customList={customList}
            setCustomList={setCustomList}
          />
        )}
        {step === "life" && (
          <LifeStep
            prompts={lifePrompts}
            selected={selectedLife}
            setSelected={setSelectedLife}
          />
        )}
        {step === "board" && (
          <BoardStep
            board={board}
            pins={pins}
            setPins={setPins}
            pinUrl={pinUrl}
            setPinUrl={setPinUrl}
          />
        )}
        {step === "generating" && <GeneratingStep />}
        {step === "done" && <DoneStep />}
      </View>

      {step !== "generating" && step !== "done" && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm },
          ]}
        >
          {submitError && <Text style={styles.err}>{submitError}</Text>}
          <Pressable
            onPress={nextStep}
            disabled={!canAdvance}
            testID="onboarding-next"
            style={({ pressed }) => [
              styles.cta,
              !canAdvance && styles.ctaDisabled,
              pressed && canAdvance && { opacity: 0.9 },
            ]}
          >
            <Text style={styles.ctaText}>
              {step === "welcome"
                ? "Let's begin"
                : step === "board"
                ? "Build my blueprint"
                : "Continue"}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.paper} />
          </Pressable>
          {step === "resume" && (
            <Text style={styles.help}>
              {selectedResume.size + customList.length}/3 minimum · pick as many as you like
            </Text>
          )}
          {step === "life" && (
            <Text style={styles.help}>{selectedLife.size}/3 minimum</Text>
          )}
          {step === "board" && (
            <Text style={styles.help}>{pins.length}/4 minimum</Text>
          )}
        </View>
      )}
    </GridPaper>
  );
}

// ------------------- Welcome
function WelcomeStep({ name }: { name: string }) {
  return (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Animated.View entering={FadeInUp.duration(500)}>
        <Text style={styles.eyebrow}>WELCOME, {name.toUpperCase()}</Text>
        <Text style={styles.title} testID="welcome-title">
          Let's design your future
          <Text style={styles.titleAccent}> — playfully.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Three quick, unusual activities. No forms, no personality tests. Just you, your imagination, and an AI that quietly listens.
        </Text>
      </Animated.View>

      <View style={styles.welcomeCards}>
        <ScrapCard
          index={0}
          tape="pink"
          rotation={-2}
          title="1 · Dream Résumé"
          body="Pick achievements 15 years from now — the ones that would make future-you smile."
        />
        <ScrapCard
          index={1}
          tape="yellow"
          rotation={1.5}
          title="2 · Dream Life"
          body="Not a job. A life. Choose the environments, cities, and pace that feel like you."
        />
        <ScrapCard
          index={2}
          tape="blue"
          rotation={-1}
          title="3 · Future Board"
          body="Pin images that spark something. Paste from Pinterest, upload, or use our library."
        />
      </View>
    </ScrollView>
  );
}

function ScrapCard({
  index,
  tape,
  rotation,
  title,
  body,
}: {
  index: number;
  tape: "pink" | "yellow" | "blue";
  rotation: number;
  title: string;
  body: string;
}) {
  const tapeColor =
    tape === "pink" ? colors.accentPink : tape === "yellow" ? colors.accentYellow : colors.accentBlue;
  return (
    <Animated.View
      entering={FadeInUp.duration(500).delay(200 + index * 120)}
      style={[styles.scrap, { transform: [{ rotate: `${rotation}deg` }] }]}
    >
      <View style={[styles.scrapTape, { backgroundColor: tapeColor + "cc" }]} />
      <Text style={styles.scrapTitle}>{title}</Text>
      <Text style={styles.scrapBody}>{body}</Text>
    </Animated.View>
  );
}

// ------------------- Resume Step
function ResumeStep({
  achievements,
  selected,
  setSelected,
  custom,
  setCustom,
  customList,
  setCustomList,
}: {
  achievements: Achievement[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
  custom: string;
  setCustom: (v: string) => void;
  customList: string[];
  setCustomList: (l: string[]) => void;
}) {
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const addCustom = () => {
    const t = custom.trim();
    if (!t) return;
    setCustomList([...customList, t]);
    setCustom("");
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>ACTIVITY 1 OF 3</Text>
        <Text style={styles.title}>
          Dream résumé,
          <Text style={styles.titleAccent}> 15 years from now.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Pick anything future-you might have done. Ambitious. Weird. Contradictory. All welcome.
        </Text>

        <View style={styles.chipCloud} testID="resume-cloud">
          {achievements.map((a) => {
            const on = selected.has(a.id);
            return (
              <Pressable
                key={a.id}
                testID={`resume-${a.id}`}
                onPress={() => toggle(a.id)}
                style={[
                  styles.achievementChip,
                  on && styles.achievementChipOn,
                ]}
              >
                <Ionicons
                  name={a.emoji_free_icon as any}
                  size={14}
                  color={on ? colors.paper : colors.ink}
                />
                <Text style={[styles.achievementText, on && styles.achievementTextOn]}>
                  {a.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.groupLabel}>Something we didn't list?</Text>
        <View style={styles.customRow}>
          <TextInput
            testID="resume-custom-input"
            style={styles.customInput}
            placeholder="Founded a chocolate lab, ran a supper club…"
            placeholderTextColor={colors.inkFaint}
            value={custom}
            onChangeText={setCustom}
            onSubmitEditing={addCustom}
            returnKeyType="done"
          />
          <Pressable onPress={addCustom} style={styles.addBtn} testID="resume-add-custom">
            <Ionicons name="add" size={20} color={colors.paper} />
          </Pressable>
        </View>
        {customList.length > 0 && (
          <View style={styles.customList}>
            {customList.map((c, i) => (
              <View key={i} style={styles.customPill}>
                <Text style={styles.customPillText}>{c}</Text>
                <Pressable
                  onPress={() => setCustomList(customList.filter((_, idx) => idx !== i))}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={14} color={colors.inkSoft} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ------------------- Life Step
function LifeStep({
  prompts,
  selected,
  setSelected,
}: {
  prompts: LifePrompt[];
  selected: Set<string>;
  setSelected: (s: Set<string>) => void;
}) {
  const groups = useMemo(() => {
    const g: Record<string, LifePrompt[]> = {};
    prompts.forEach((p) => {
      g[p.group] = g[p.group] || [];
      g[p.group].push(p);
    });
    return g;
  }, [prompts]);
  const groupLabels: Record<string, string> = {
    cities: "Cities that pull me",
    environments: "Environments I'd thrive in",
    work_style: "How I like to work",
    travel: "Movement",
    balance: "Pace of life",
    impact: "What I'd optimise for",
    industries: "Fields that spark curiosity",
  };
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  return (
    <ScrollView contentContainerStyle={styles.stepContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>ACTIVITY 2 OF 3</Text>
      <Text style={styles.title}>
        Design a
        <Text style={styles.titleAccent}> life</Text>, not a job.
      </Text>
      <Text style={styles.subtitle}>
        Skip the labels. Just pick what feels like <Text style={styles.italic}>you</Text>.
      </Text>

      {Object.keys(groups).map((k) => (
        <View key={k} style={{ marginTop: spacing.xl }}>
          <Text style={styles.groupLabel}>{groupLabels[k] || k}</Text>
          <View style={styles.chipCloud}>
            {groups[k].map((p) => {
              const on = selected.has(p.id);
              return (
                <Pressable
                  key={p.id}
                  testID={`life-${p.id}`}
                  onPress={() => toggle(p.id)}
                  style={[styles.softChip, on && styles.softChipOn]}
                >
                  <Text style={[styles.softChipText, on && styles.softChipTextOn]}>
                    {p.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

// ------------------- Board Step (Pinterest-style)
function BoardStep({
  board,
  pins,
  setPins,
  pinUrl,
  setPinUrl,
}: {
  board: BoardImage[];
  pins: { id: string; url: string; tags?: string }[];
  setPins: (p: { id: string; url: string; tags?: string }[]) => void;
  pinUrl: string;
  setPinUrl: (v: string) => void;
}) {
  const has = (id: string) => pins.some((p) => p.id === id);
  const toggle = (img: BoardImage) => {
    if (has(img.id)) setPins(pins.filter((p) => p.id !== img.id));
    else setPins([...pins, { id: img.id, url: img.url, tags: img.tags }]);
  };
  const addUrl = () => {
    const u = pinUrl.trim();
    if (!/^https?:\/\//.test(u)) return;
    const id = `custom-${Date.now()}`;
    setPins([...pins, { id, url: u }]);
    setPinUrl("");
  };
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <ScrollView
        contentContainerStyle={styles.stepContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.eyebrow}>ACTIVITY 3 OF 3</Text>
        <Text style={styles.title}>
          Pin the futures
          <Text style={styles.titleAccent}> that pull you.</Text>
        </Text>
        <Text style={styles.subtitle}>
          Tap our library, or paste a Pinterest image URL. No overthinking.
        </Text>

        <View style={styles.pinUrlRow}>
          <TextInput
            testID="board-url-input"
            style={styles.customInput}
            placeholder="Paste a Pinterest image URL"
            placeholderTextColor={colors.inkFaint}
            value={pinUrl}
            onChangeText={setPinUrl}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={addUrl}
          />
          <Pressable onPress={addUrl} style={styles.addBtn} testID="board-add-url">
            <Ionicons name="link" size={18} color={colors.paper} />
          </Pressable>
        </View>

        {pins.length > 0 && (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.groupLabel}>Your pins ({pins.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pinStrip}>
              {pins.map((p) => (
                <View key={p.id} style={styles.pinnedWrap} testID={`pinned-${p.id}`}>
                  <Image source={p.url} style={styles.pinned} contentFit="cover" />
                  <Pressable
                    onPress={() => setPins(pins.filter((x) => x.id !== p.id))}
                    style={styles.pinRemove}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={12} color={colors.paper} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={[styles.groupLabel, { marginTop: spacing.xl }]}>
          Or pick from our library — tap to pin
        </Text>
        <View style={styles.galleryGrid}>
          {board.map((img, i) => {
            const on = has(img.id);
            return (
              <Pressable
                key={img.id}
                testID={`board-tile-${img.id}`}
                onPress={() => toggle(img)}
                style={[
                  styles.gTile,
                  {
                    transform: [{ rotate: `${((i % 5) - 2) * 0.8}deg` }],
                  },
                  on && styles.gTileOn,
                ]}
              >
                <Image source={img.url} style={styles.gImg} contentFit="cover" />
                {on && (
                  <View style={styles.gTileCheck}>
                    <Ionicons name="checkmark" size={14} color={colors.paper} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ------------------- Generating & Done
function GeneratingStep() {
  return (
    <View style={styles.centered}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.genBadge}>
        <ActivityIndicator color={colors.paper} size="large" />
      </Animated.View>
      <Text style={styles.genTitle}>Reading between your lines…</Text>
      <Text style={styles.genSub}>
        Our AI is looking at your dreams together, not one at a time. Hang tight.
      </Text>
    </View>
  );
}

function DoneStep() {
  return (
    <View style={styles.centered}>
      <Animated.View entering={FadeIn} style={[styles.genBadge, { backgroundColor: colors.success }]}>
        <Ionicons name="checkmark" size={36} color={colors.paper} />
      </Animated.View>
      <Text style={styles.genTitle}>Your blueprint is ready.</Text>
      <Text style={styles.genSub}>Opening Mission Control…</Text>
    </View>
  );
}

// ------------------- Styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  top: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  progressWrap: { flexDirection: "row", gap: 6 },
  progressDot: { width: 22, height: 6, borderRadius: 3 },

  stepContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  eyebrow: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    letterSpacing: 3,
    color: colors.navy,
    fontWeight: "700",
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: font.display,
    fontSize: 34,
    lineHeight: 40,
    color: colors.ink,
    fontWeight: "500",
    marginBottom: spacing.md,
  },
  titleAccent: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    color: colors.navy,
  },
  italic: { fontFamily: font.displayItalic, fontStyle: "italic" },
  subtitle: {
    fontFamily: font.text,
    fontSize: fontSize.md,
    lineHeight: 22,
    color: colors.inkSoft,
    marginBottom: spacing.lg,
  },
  groupLabel: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    letterSpacing: 1.5,
    color: colors.inkMuted,
    textTransform: "uppercase",
    fontWeight: "600",
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  chipCloud: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: spacing.sm,
  },
  achievementChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.paperInk,
  },
  achievementChipOn: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  achievementText: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.ink,
    fontWeight: "500",
  },
  achievementTextOn: { color: colors.paper },

  softChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.paperCool,
    borderWidth: 1,
    borderColor: colors.paperInk,
  },
  softChipOn: {
    backgroundColor: colors.navy,
    borderColor: colors.navy,
  },
  softChipText: {
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.inkSoft,
    fontWeight: "500",
  },
  softChipTextOn: { color: colors.paper },

  customRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  customInput: {
    flex: 1,
    minHeight: 46,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.paperInk,
    paddingHorizontal: spacing.md,
    fontFamily: font.text,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
  },
  customList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  customPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.paperWarm,
    borderWidth: 1,
    borderColor: colors.accentYellow,
  },
  customPillText: {
    fontFamily: font.displayItalic,
    fontStyle: "italic",
    fontSize: fontSize.sm,
    color: colors.ink,
  },

  pinUrlRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  pinStrip: { gap: spacing.sm, paddingRight: spacing.xl },
  pinnedWrap: {
    width: 96,
    height: 128,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: colors.navy,
    ...shadow.soft,
  },
  pinned: { width: "100%", height: "100%" },
  pinRemove: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: colors.ink,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: spacing.sm,
  },
  gTile: {
    width: "31%",
    aspectRatio: 0.85,
    backgroundColor: colors.paperCool,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: colors.paperInk,
  },
  gTileOn: { borderColor: colors.navy, borderWidth: 3 },
  gImg: { width: "100%", height: "100%" },
  gTileCheck: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },

  welcomeCards: { marginTop: spacing.xl, gap: spacing.md },
  scrap: {
    backgroundColor: colors.white,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.paperInk,
    ...shadow.card,
  },
  scrapTape: {
    width: 60,
    height: 22,
    position: "absolute",
    top: -8,
    left: 24,
    transform: [{ rotate: "-6deg" }],
    borderRadius: 3,
  },
  scrapTitle: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: colors.ink,
    marginBottom: spacing.xs,
    fontWeight: "500",
  },
  scrapBody: {
    fontFamily: font.text,
    fontSize: fontSize.base,
    lineHeight: 22,
    color: colors.inkSoft,
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: 6,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.ink,
    height: 54,
    borderRadius: radius.lg,
    ...shadow.lift,
  },
  ctaDisabled: { backgroundColor: colors.inkFaint, opacity: 0.8 },
  ctaText: {
    color: colors.paper,
    fontFamily: font.text,
    fontSize: fontSize.lg,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  help: {
    textAlign: "center",
    fontFamily: font.text,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
  },
  err: {
    textAlign: "center",
    fontFamily: font.text,
    fontSize: fontSize.sm,
    color: colors.error,
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  genBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.ink,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xl,
    ...shadow.lift,
  },
  genTitle: {
    fontFamily: font.display,
    fontSize: fontSize.xxl,
    color: colors.ink,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  genSub: {
    fontFamily: font.text,
    fontSize: fontSize.md,
    color: colors.inkSoft,
    textAlign: "center",
    maxWidth: 300,
  },
});
