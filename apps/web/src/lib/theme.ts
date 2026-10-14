export interface ThemeInfo {
  id: string;
  name: string;
  isDark: boolean;
  accent: string;
}

export const THEMES: ThemeInfo[] = [
  // Dark Themes
  { id: "dark", name: "Default Dark", isDark: true, accent: "#38bdf8" },
  { id: "night", name: "Night", isDark: true, accent: "#38bdf8" },
  { id: "dracula", name: "Dracula", isDark: true, accent: "#ff79c6" },
  { id: "dim", name: "Dim", isDark: true, accent: "#9feaf9" },
  { id: "sunset", name: "Sunset", isDark: true, accent: "#f43f5e" },
  { id: "synthwave", name: "Synthwave", isDark: true, accent: "#e779c1" },
  { id: "black", name: "Black", isDark: true, accent: "#343232" },
  { id: "luxury", name: "Luxury", isDark: true, accent: "#ffd700" },
  { id: "coffee", name: "Coffee", isDark: true, accent: "#db924b" },
  { id: "forest", name: "Forest", isDark: true, accent: "#1eb854" },
  { id: "halloween", name: "Halloween", isDark: true, accent: "#f28c18" },
  { id: "business", name: "Business", isDark: true, accent: "#1c4e80" },

  // Light Themes
  { id: "light", name: "Default Light", isDark: false, accent: "#4f46e5" },
  { id: "nord", name: "Nord", isDark: false, accent: "#5e81ac" },
  { id: "emerald", name: "Emerald", isDark: false, accent: "#66cc8a" },
  { id: "corporate", name: "Corporate", isDark: false, accent: "#4b6bfb" },
  { id: "cupcake", name: "Cupcake", isDark: false, accent: "#65c3c8" },
  { id: "bumblebee", name: "Bumblebee", isDark: false, accent: "#e0a82e" },
  { id: "retro", name: "Retro", isDark: false, accent: "#ef9995" },
  { id: "cyberpunk", name: "Cyberpunk", isDark: false, accent: "#ff7598" },
  { id: "valentine", name: "Valentine", isDark: false, accent: "#e96d7b" },
  { id: "garden", name: "Garden", isDark: false, accent: "#5c7f67" },
  { id: "aqua", name: "Aqua", isDark: false, accent: "#09ecf3" },
  { id: "lofi", name: "Lo-Fi", isDark: false, accent: "#0d0d0d" },
  { id: "pastel", name: "Pastel", isDark: false, accent: "#d1c1d7" },
  { id: "fantasy", name: "Fantasy", isDark: false, accent: "#6e0b75" },
  { id: "wireframe", name: "Wireframe", isDark: false, accent: "#b8b8b8" },
  { id: "cmyk", name: "CMYK", isDark: false, accent: "#45aeee" },
  { id: "autumn", name: "Autumn", isDark: false, accent: "#8c0327" },
  { id: "acid", name: "Acid", isDark: false, accent: "#ff00f4" },
  { id: "lemonade", name: "Lemonade", isDark: false, accent: "#519903" },
  { id: "winter", name: "Winter", isDark: false, accent: "#047aff" },
];

export const DEFAULT_THEME = "dark";

export const getStoredTheme = (): string => {
  if (typeof window === "undefined") return DEFAULT_THEME;
  try {
    return localStorage.getItem("chatflow-theme") || DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
};

export const applyTheme = (themeId: string): void => {
  if (typeof window === "undefined") return;
  try {
    document.documentElement.setAttribute("data-theme", themeId);
    localStorage.setItem("chatflow-theme", themeId);
  } catch (err) {
    console.error("Failed to save theme to localStorage", err);
  }
};
