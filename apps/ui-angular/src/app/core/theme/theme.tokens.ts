export const themeTokens = {
  colors: {
    background: "var(--vf-bg)",
    elevated: "var(--vf-bg-elevated)",
    soft: "var(--vf-bg-soft)",
    surface: "var(--vf-surface)",
    border: "var(--vf-border)",
    text: "var(--vf-text)",
    muted: "var(--vf-text-muted)",
    primary: "var(--vf-primary)",
    success: "var(--vf-success)",
    warning: "var(--vf-warning)",
    danger: "var(--vf-danger)"
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px"
  },
  radius: {
    sm: "var(--vf-radius-sm)",
    md: "var(--vf-radius-md)",
    lg: "var(--vf-radius-lg)",
    xl: "var(--vf-radius-xl)",
    pill: "999px"
  },
  shadows: {
    sm: "var(--vf-shadow-sm)",
    md: "var(--vf-shadow-md)",
    glow: "var(--vf-shadow-glow)"
  },
  zIndex: {
    base: 1,
    sticky: 20,
    overlay: 100,
    modal: 200,
    toast: 300
  },
  typography: {
    familySans: "var(--vf-font-sans)",
    familyMono: "var(--vf-font-mono)",
    sizes: {
      xs: "12px",
      sm: "13px",
      base: "15px",
      lg: "18px",
      xl: "22px",
      xxl: "32px"
    }
  }
} as const;

export type ThemeTokens = typeof themeTokens;
