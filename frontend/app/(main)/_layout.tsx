import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors, font, fontSize, spacing } from "@/src/theme";

function TabIcon({ focused, name }: { focused: boolean; name: any }) {
  return (
    <View
      style={[
        styles.iconWrap,
        focused && { backgroundColor: colors.paperWarm, borderColor: colors.ink },
      ]}
    >
      <Ionicons name={name} size={20} color={focused ? colors.ink : colors.inkMuted} />
    </View>
  );
}
function TabLabel({ focused, label }: { focused: boolean; label: string }) {
  return (
    <Text style={[styles.label, focused && { color: colors.ink, fontWeight: "700" }]}>
      {label}
    </Text>
  );
}

export default function MainTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Mission",
          tabBarButtonTestID: "tab-mission",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="planet" />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Mission" />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarButtonTestID: "tab-explore",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="compass" />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Explore" />,
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: "Planner",
          tabBarButtonTestID: "tab-planner",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="sparkles" />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Planner" />,
        }}
      />
      <Tabs.Screen
        name="vision"
        options={{
          title: "Vision",
          tabBarButtonTestID: "tab-vision",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="sparkles" />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Vision" />,
        }}
      />
      <Tabs.Screen name="discover" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Me",
          tabBarButtonTestID: "tab-profile",
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} name="person" />,
          tabBarLabel: ({ focused }) => <TabLabel focused={focused} label="Me" />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.paperInk,
    height: 82,
    paddingTop: 8,
    paddingBottom: 22,
  },
  tabItem: { paddingVertical: 4 },
  iconWrap: {
    width: 44,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  label: {
    fontFamily: font.text,
    fontSize: fontSize.xs,
    color: colors.inkMuted,
    fontWeight: "500",
    marginTop: 4,
    letterSpacing: 0.3,
  },
});
