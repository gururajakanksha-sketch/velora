import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";

import { api, auth as authStore, User } from "@/src/api";

type AuthState = {
  status: "loading" | "authenticated" | "unauthenticated";
  user: User | null;
};
type Ctx = AuthState & {
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  processSessionId: (sessionId: string) => Promise<{ ok: boolean; error?: string }>;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  markOnboarded: () => void;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });

  const refresh = useCallback(async () => {
    try {
      const tok = await authStore.read();
      if (!tok) {
        setState({ status: "unauthenticated", user: null });
        return;
      }
      const { user } = await api.me();
      setState({ status: "authenticated", user });
    } catch {
      await authStore.clear();
      setState({ status: "unauthenticated", user: null });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // On web: check hash/query for session_id after redirect
  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;

    const handleSessionId = () => {
      const hash = window.location.hash || "";
      const q = window.location.search || "";
      const m1 = hash.match(/session_id=([^&]+)/);
      const m2 = q.match(/session_id=([^&]+)/);
      const sessionId = decodeURIComponent((m1?.[1] || m2?.[1] || "").trim());

      if (!sessionId) return;
      processSessionId(sessionId).then((result) => {
        try {
          window.history.replaceState(null, "", window.location.pathname);
        } catch {}
      });
    };

    handleSessionId();
    window.addEventListener("popstate", handleSessionId);

    return () => {
      window.removeEventListener("popstate", handleSessionId);
    };
  }, []);

  const processSessionId = useCallback(async (sessionId: string) => {
    try {
      const { session_token, user } = await api.createSession({ session_id: sessionId });
      await authStore.save(session_token);
      setState({ status: "authenticated", user });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectUrl =
      Platform.OS === "web"
        ? (typeof window !== "undefined" ? window.location.origin + "/" : "/")
        : Linking.createURL("");

    const authUrl = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api/auth/google/start`;

    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.location.href = authUrl;
      }
      return { ok: true };
    }

    try {
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type !== "success" || !result.url) {
        return { ok: false, error: "cancelled" };
      }
      // Parse hash or query for session_id
      const url = result.url;
      const m1 = url.match(/[#&?]session_id=([^&]+)/);
      const sessionId = m1?.[1];
      if (!sessionId) return { ok: false, error: "no session id" };
      return await processSessionId(decodeURIComponent(sessionId));
    } catch (e: any) {
      return { ok: false, error: String(e?.message || e) };
    }
  }, [processSessionId]);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    await authStore.clear();
    setState({ status: "unauthenticated", user: null });
  }, []);

  const markOnboarded = useCallback(() => {
    setState((s) =>
      s.user ? { ...s, user: { ...s.user, onboarding_complete: true } } : s
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, signInWithGoogle, processSessionId, refresh, signOut, markOnboarded }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
