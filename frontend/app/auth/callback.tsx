import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/src/AuthContext";

export default function AuthCallbackScreen() {
    const router = useRouter();
    const { status } = useAuth();

    useEffect(() => {
        if (status === "authenticated") {
            router.replace("/");
        }
    }, [status, router]);

    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" />
            <Text style={styles.text}>Completing your Google sign-in…</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: 24,
    },
    text: {
        fontSize: 16,
    },
});