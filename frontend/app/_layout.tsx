import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox, StatusBar } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { AuthProvider, useAuth } from "@/src/AuthContext";
import { colors } from "@/src/theme";

LogBox.ignoreAllLogs(true);
SplashScreen.preventAutoHideAsync();

function AuthGate() {
  const { status, user } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (status === "loading") return;
    const top = segments[0];
    const isSplash = top === undefined || top === "index";
    const isAuth = top === "auth";
    const isOnboarding = top === "onboarding";

    if (status === "unauthenticated" && !isAuth && !isSplash) {
      router.replace("/auth");
      return;
    }
    if (
      status === "authenticated" &&
      user &&
      !user.onboarding_complete &&
      !isOnboarding &&
      !isSplash &&
      !isAuth
    ) {
      router.replace("/onboarding");
    }
  }, [status, user, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
      }}
    >
      <Stack.Screen name="index" options={{ animation: "fade" }} />
      <Stack.Screen name="auth" options={{ animation: "fade" }} />
      <Stack.Screen name="onboarding" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="(main)" options={{ animation: "fade" }} />
      <Stack.Screen name="detail/[kind]/[id]" options={{ animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={colors.paper} />
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
