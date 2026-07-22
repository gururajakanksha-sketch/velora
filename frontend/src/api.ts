import { storage } from "@/src/utils/storage";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;
const TOKEN_KEY = "velora.session_token";

async function authHeaders(): Promise<Record<string, string>> {
  const tok = await storage.secureGet<string>(TOKEN_KEY, "");
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

async function req<T>(
  path: string,
  options: RequestInit & { auth?: boolean } = {}
): Promise<T> {
  const { auth = false, headers, ...rest } = options;
  const hdrs: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (auth) Object.assign(hdrs, await authHeaders());
  const res = await fetch(`${BASE}/api${path}`, { ...rest, headers: hdrs });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return (await res.json()) as T;
}

export type User = {
  user_id: string;
  email: string;
  name: string;
  picture?: string | null;
  picture_base64?: string | null;
  onboarding_complete: boolean;
};

export type Achievement = { id: string; title: string; tag: string; emoji_free_icon: string };
export type LifePrompt = { id: string; group: string; label: string };
export type BoardImage = { id: string; url: string; tags: string };

export type Blueprint = {
  themes: string[];
  one_line_summary: string;
  career_seeds: { title: string; why: string; first_step: string }[];
  hidden_paths: { title: string; why: string; first_step: string }[];
  recommended_scholarship_ids: string[];
  recommended_university_ids: string[];
  recommended_hidden_course_ids: string[];
  recommended_country_ids: string[];
  recommended_mun_ids: string[];
  side_quests: { title: string; detail: string; xp: number }[];
  generated_at: string;
  _source?: string;
};

export type Task = {
  id: string;
  user_id: string;
  title: string;
  detail?: string | null;
  kind: "task" | "side_quest";
  status: "todo" | "doing" | "done";
  due?: string | null;
  source?: any;
  xp: number;
  category: string;
  order: number;
  created_at: string;
  completed_at?: string;
};

export type ExploreKind =
  | "scholarships"
  | "universities"
  | "hidden_courses"
  | "muns"
  | "countries";

export type Article = {
  id: string;
  category: string;
  title: string;
  tags: string[];
  summary: string;
  body: string;
  links?: { label: string; url: string }[];
};

export type VisionBoardItem = {
  id: string;
  kind: "image" | "text" | "sticker";
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  z: number;
  url?: string;
  text?: string;
  font?: string;
  color?: string;
  fontSize?: number;
  sticker?: string;
};

export type VisionBoard = {
  id: string;
  title: string;
  background: string;
  items: VisionBoardItem[];
  updated_at: string;
};

export type PregradSection = { id: string; title: string; entries: any[] };
export type Pregrad = {
  mode: "fun" | "formal";
  header: Record<string, string>;
  photo_base64?: string;
  sections: PregradSection[];
};

export const auth = {
  save: (token: string) => storage.secureSet(TOKEN_KEY, token),
  read: () => storage.secureGet<string>(TOKEN_KEY, ""),
  clear: () => storage.secureRemove(TOKEN_KEY),
};

export const api = {
  quotes: () => req<{ quotes: string[] }>("/quotes"),
  contact: () => req<any>("/contact"),
  onboardingLibrary: () =>
    req<{
      achievements: Achievement[];
      life_prompts: LifePrompt[];
      board_images: BoardImage[];
      stickers: string[];
    }>("/onboarding/library"),

  createSession: (data: { session_id?: string; session_token?: string }) =>
    req<{ session_token: string; user: User }>("/auth/session", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  me: () => req<{ user: User }>("/auth/me", { auth: true }),
  logout: () => req<{ ok: boolean }>("/auth/logout", { method: "POST", auth: true }),
  updatePicture: (picture_base64: string) =>
    req<{ user: User }>("/profile/picture", {
      method: "PUT",
      auth: true,
      body: JSON.stringify({ picture_base64 }),
    }),

  completeOnboarding: (payload: {
    dream_resume: string[];
    custom_achievements: string[];
    life_prompts: string[];
    board_pins: { id: string; url: string; tags?: string }[];
  }) =>
    req<{ ok: boolean; blueprint: Blueprint }>("/onboarding/complete", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    }),
  blueprint: () => req<{ blueprint: Blueprint }>("/blueprint", { auth: true }),
  resetBlueprint: () => req<{ ok: boolean }>("/blueprint/reset", { method: "POST", auth: true }),

  explore: (kind: ExploreKind, params?: { q?: string; tag?: string }) => {
    const p = new URLSearchParams({ kind });
    if (params?.q) p.set("q", params.q);
    if (params?.tag) p.set("tag", params.tag);
    return req<{ items: any[] }>(`/explore?${p.toString()}`);
  },
  exploreItem: (kind: ExploreKind, id: string) => req<any>(`/explore/${kind}/${id}`),
  recommend: (payload: {
    kind: "countries" | "universities";
    fields?: string[];
    max_fees_inr_lakhs?: number;
    wants_pr?: boolean;
    region?: string;
    country?: string;
    state?: string;
    level?: string;
    tags?: string[];
  }) =>
    req<{ items: { item: any; score: number; reasons: string[] }[] }>(
      "/explore/recommend",
      { method: "POST", body: JSON.stringify(payload) }
    ),

  planner: () => req<{ tasks: Task[] }>("/planner", { auth: true }),
  createTask: (payload: {
    title: string;
    detail?: string;
    kind?: "task" | "side_quest";
    xp?: number;
    source?: any;
    due?: string;
    category?: string;
  }) => req<{ task: Task }>("/planner", { method: "POST", auth: true, body: JSON.stringify(payload) }),
  updateTask: (id: string, patch: any) =>
    req<{ task: Task }>(`/planner/${id}`, {
      method: "PATCH",
      auth: true,
      body: JSON.stringify(patch),
    }),
  reorderTasks: (category: string, ids: string[]) =>
    req<{ ok: boolean }>(`/planner/reorder`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ category, ids }),
    }),
  deleteTask: (id: string) =>
    req<{ ok: boolean }>(`/planner/${id}`, { method: "DELETE", auth: true }),

  collections: () =>
    req<{ saves: { id: string; kind: string; ref_id: string; payload?: any; created_at: string }[] }>(
      "/collections",
      { auth: true }
    ),
  save: (kind: string, ref_id: string, payload?: any) =>
    req<{ save: any; existed: boolean }>("/collections", {
      method: "POST",
      auth: true,
      body: JSON.stringify({ kind, ref_id, payload }),
    }),
  unsave: (save_id: string) =>
    req<{ ok: boolean }>(`/collections/${save_id}`, { method: "DELETE", auth: true }),

  discoverToday: () => req<any>("/discover/today", { auth: true }),
  news: (kind?: string) =>
    req<{ items: any[]; fresh_count: number; day: string }>(
      `/news${kind && kind !== "all" ? `?kind=${kind}` : ""}`
    ),

  articles: (params?: { q?: string; category?: string }) => {
    const p = new URLSearchParams();
    if (params?.q) p.set("q", params.q);
    if (params?.category) p.set("category", params.category);
    return req<{ items: Article[]; categories: string[] }>(
      `/articles${p.toString() ? `?${p}` : ""}`
    );
  },
  article: (id: string) => req<Article>(`/articles/${id}`),

  visionBoards: () => req<{ boards: VisionBoard[] }>("/vision-boards", { auth: true }),
  saveVisionBoard: (payload: Partial<VisionBoard>) =>
    req<{ board: VisionBoard }>("/vision-boards", {
      method: "POST",
      auth: true,
      body: JSON.stringify(payload),
    }),
  visionBoard: (id: string) =>
    req<{ board: VisionBoard }>(`/vision-boards/${id}`, { auth: true }),
  deleteVisionBoard: (id: string) =>
    req<{ ok: boolean }>(`/vision-boards/${id}`, { method: "DELETE", auth: true }),

  pregrads: () => req<{ pregrads: Pregrad[] }>("/pregrad", { auth: true }),
  savePregrad: (mode: "fun" | "formal", payload: Pregrad) =>
    req<{ pregrad: Pregrad }>(`/pregrad/${mode}`, {
      method: "PUT",
      auth: true,
      body: JSON.stringify(payload),
    }),
};
