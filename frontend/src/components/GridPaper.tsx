import React from "react";
import { View, StyleSheet, ViewStyle, StyleProp } from "react-native";

import { colors } from "@/src/theme";

type Variant = "default" | "warm" | "cool";

type Props = {
  cell?: number;
  color?: string;
  bg?: string;
  variant?: Variant;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/** Cream paper background with faint hand-drawn grid lines. */
export function GridPaper({
  cell = 28,
  color,
  bg,
  variant = "default",
  style,
  children,
}: Props) {
  const resolvedBg =
    bg ??
    (variant === "warm" ? colors.paperWarm : variant === "cool" ? colors.paperCool : colors.paper);
  const resolvedColor =
    color ?? (variant === "cool" ? colors.gridLineCool : colors.gridLine);

  return (
    <View style={[styles.wrap, { backgroundColor: resolvedBg }, style]}>
      <GridLines cell={cell} color={resolvedColor} />
      {children}
    </View>
  );
}

function GridLines({ cell, color }: { cell: number; color: string }) {
  const count = 60;
  const rows: React.ReactNode[] = [];
  const cols: React.ReactNode[] = [];
  for (let i = 1; i < count; i++) {
    rows.push(
      <View
        key={`r${i}`}
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: i * cell,
          height: 1,
          backgroundColor: color,
          opacity: 0.3,
        }}
      />
    );
    cols.push(
      <View
        key={`c${i}`}
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: i * cell,
          width: 1,
          backgroundColor: color,
          opacity: 0.3,
        }}
      />
    );
  }
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {rows}
      {cols}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: "hidden" },
});
