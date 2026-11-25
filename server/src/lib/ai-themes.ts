export type AiTheme = {
  id: string;
  name: string;
  dark: boolean;
  colors: {
    background: string;
    surface: string;
    foreground: string;
    muted: string;
    border: string;
    primary: string;
    primaryForeground: string;
  };
  radius: string;
  font: string;
};

export const AI_THEMES: AiTheme[] = [
  {
    id: "easyhost",
    name: "Reverhost",
    dark: false,
    colors: { background: "#ffffff", surface: "#f8fafc", foreground: "#0f172a", muted: "#64748b", border: "#e2e8f0", primary: "#1e3a5f", primaryForeground: "#ffffff" },
    radius: "0px",
    font: "Geist",
  },
  {
    id: "slate",
    name: "Slate",
    dark: false,
    colors: { background: "#ffffff", surface: "#f4f4f5", foreground: "#18181b", muted: "#71717a", border: "#e4e4e7", primary: "#18181b", primaryForeground: "#fafafa" },
    radius: "8px",
    font: "Inter",
  },
  {
    id: "ocean",
    name: "Ocean",
    dark: false,
    colors: { background: "#f8fafc", surface: "#ffffff", foreground: "#0f172a", muted: "#64748b", border: "#e2e8f0", primary: "#2563eb", primaryForeground: "#ffffff" },
    radius: "12px",
    font: "Plus Jakarta Sans",
  },
  {
    id: "forest",
    name: "Forest",
    dark: false,
    colors: { background: "#f7faf7", surface: "#ffffff", foreground: "#14281d", muted: "#5b6b60", border: "#dfe7e0", primary: "#15803d", primaryForeground: "#ffffff" },
    radius: "10px",
    font: "DM Sans",
  },
  {
    id: "sunset",
    name: "Sunset",
    dark: false,
    colors: { background: "#fffaf5", surface: "#ffffff", foreground: "#2b1a10", muted: "#8a6f5c", border: "#f1e4d8", primary: "#ea580c", primaryForeground: "#ffffff" },
    radius: "16px",
    font: "Poppins",
  },
  {
    id: "grape",
    name: "Grape",
    dark: false,
    colors: { background: "#faf8ff", surface: "#ffffff", foreground: "#1e1433", muted: "#6e6487", border: "#e9e3f7", primary: "#7c3aed", primaryForeground: "#ffffff" },
    radius: "14px",
    font: "Outfit",
  },
  {
    id: "rose",
    name: "Rose",
    dark: false,
    colors: { background: "#fff7f9", surface: "#ffffff", foreground: "#2a1219", muted: "#8b6570", border: "#f5dfe5", primary: "#e11d48", primaryForeground: "#ffffff" },
    radius: "20px",
    font: "Nunito",
  },
  {
    id: "midnight",
    name: "Midnight",
    dark: true,
    colors: { background: "#0b1120", surface: "#111a2e", foreground: "#e2e8f0", muted: "#8b9bb4", border: "#1e2a44", primary: "#38bdf8", primaryForeground: "#0b1120" },
    radius: "10px",
    font: "Inter",
  },
  {
    id: "mono",
    name: "Mono",
    dark: true,
    colors: { background: "#0a0a0a", surface: "#161616", foreground: "#fafafa", muted: "#a1a1a1", border: "#262626", primary: "#fafafa", primaryForeground: "#0a0a0a" },
    radius: "4px",
    font: "Space Grotesk",
  },
];

export const findTheme = (id: string | null | undefined) => AI_THEMES.find((theme) => theme.id === id) ?? null;

const colorScheme = (theme: AiTheme) => {
  if (theme.dark) {
    return "dark";
  }
  return "light";
};

export const themeCss = (theme: AiTheme) => {
  const family = theme.font.replace(/ /g, "+");
  return `@import url("https://fonts.googleapis.com/css2?family=${family}:wght@400;500;600;700&display=swap");

:root {
  --color-background: ${theme.colors.background};
  --color-surface: ${theme.colors.surface};
  --color-foreground: ${theme.colors.foreground};
  --color-muted: ${theme.colors.muted};
  --color-border: ${theme.colors.border};
  --color-primary: ${theme.colors.primary};
  --color-primary-foreground: ${theme.colors.primaryForeground};
  --radius: ${theme.radius};
  --font-sans: "${theme.font}", system-ui, -apple-system, sans-serif;
  color-scheme: ${colorScheme(theme)};
}

body {
  margin: 0;
  background: var(--color-background);
  color: var(--color-foreground);
  font-family: var(--font-sans);
}
`;
};

export const themeSummary = (theme: AiTheme) => {
  return `Theme: ${theme.name}. public/theme.css defines --color-background, --color-surface, --color-foreground, --color-muted, --color-border, --color-primary, --color-primary-foreground, --radius and --font-sans. Link it in every page and use only these variables for colors, corner radius and font.`;
};
