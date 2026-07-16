/**
 * Mission Velora design system.
 * Palette pulled straight from the logo (navy robot on cream grid paper)
 * + scrapbook accents (yellow paper, pink grid, star confetti).
 */
import { Platform } from "react-native";

export const colors = {
  // Paper / surfaces
  paper: "#FBF6E0",          // primary cream paper background
  paperWarm: "#F5EAB0",      // warm yellow paper accent
  paperCool: "#F3EEDC",      // cooler paper for cards
  paperInk: "#EAE3C6",       // paper edge/border
  gridLine: "#E5B8C0",       // pink grid lines (as seen on the logo bg)
  gridLineCool: "#C9D2E0",   // subtle cool grid variant

  // Ink / typography
  ink: "#132449",            // deep navy — primary text & primary CTA
  inkSoft: "#2C3E6B",        // secondary navy text
  inkMuted: "#5C6B8A",       // tertiary text
  inkFaint: "#8A94AB",

  // Brand navy family
  navy: "#1E3A8A",           // logo navy
  navyBright: "#2F52C4",     // bright navy for accents
  navyDark: "#0C1A3E",

  // Scrapbook accents
  accentYellow: "#F5C542",
  accentPink: "#E8A0A8",
  accentBlue: "#8FB4E8",
  accentGreen: "#A5C48F",

  // Semantics
  success: "#3F9764",
  warning: "#D9873A",
  error: "#C25B56",

  white: "#FFFFFF",
  black: "#0A0F1F",

  // Utility
  glassLight: "rgba(255,255,255,0.55)",
  scrim: "rgba(19,36,73,0.65)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
  huge: 56,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
};

/** Mixed / fun font stack — display serif + system sans + italic accent. */
export const font = {
  display: Platform.select({ ios: "Georgia", android: "serif", default: "serif" })!,
  displayItalic: Platform.select({
    ios: "Georgia-Italic",
    android: "serif",
    default: "serif",
  })!,
  text: Platform.select({ ios: "System", android: "sans-serif", default: "System" })!,
  mono: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: "monospace",
  })!,
};

export const fontSize = {
  xs: 11,
  sm: 12,
  base: 14,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
  hero: 44,
};

export const shadow = {
  card: {
    shadowColor: "#132449",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  soft: {
    shadowColor: "#132449",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  lift: {
    shadowColor: "#132449",
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
};
