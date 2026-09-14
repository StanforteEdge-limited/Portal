export type BrandThemeKey =
  | "ocean"
  | "forest"
  | "royal"
  | "sunset"
  | "rose"
  | "graphite";

export type BrandShade =
  | "50"
  | "100"
  | "200"
  | "300"
  | "400"
  | "500"
  | "600"
  | "700"
  | "800"
  | "900";

export type BrandTheme = {
  key: BrandThemeKey;
  label: string;
  colors: Record<BrandShade, string>;
};

export const DEFAULT_BRAND_THEME_KEY: BrandThemeKey = "ocean";

export const BRAND_THEMES: BrandTheme[] = [
  {
    key: "ocean",
    label: "Ocean (default)",
    colors: {
      "50": "#EEF4FB",
      "100": "#D8E6F3",
      "200": "#B2CDE9",
      "300": "#86ABD9",
      "400": "#4E87C3",
      "500": "#2B66AC",
      "600": "#19549A",
      "700": "#0E4588",
      "800": "#073C76",
      "900": "#034785",
    },
  },
  {
    key: "forest",
    label: "Forest",
    colors: {
      "50": "#EEF7F1",
      "100": "#D8EEDF",
      "200": "#B2DCC1",
      "300": "#84C4A0",
      "400": "#4FA377",
      "500": "#2D8A5F",
      "600": "#1D754E",
      "700": "#116441",
      "800": "#0A5436",
      "900": "#05472C",
    },
  },
  {
    key: "royal",
    label: "Royal",
    colors: {
      "50": "#F3EEFB",
      "100": "#E4D8F5",
      "200": "#C8B0EB",
      "300": "#A685DD",
      "400": "#8456CB",
      "500": "#6E3DB6",
      "600": "#5D2FA4",
      "700": "#4D268E",
      "800": "#3E1F74",
      "900": "#331A5E",
    },
  },
  {
    key: "sunset",
    label: "Sunset",
    colors: {
      "50": "#FEF3EC",
      "100": "#FBE2CE",
      "200": "#F6C29A",
      "300": "#EFA05F",
      "400": "#E57E2D",
      "500": "#D7651A",
      "600": "#C05413",
      "700": "#A04410",
      "800": "#80360E",
      "900": "#662C0C",
    },
  },
  {
    key: "rose",
    label: "Rose",
    colors: {
      "50": "#FCF0F3",
      "100": "#F7DCE4",
      "200": "#EEB8C8",
      "300": "#E08AA3",
      "400": "#CE5C7D",
      "500": "#B93F63",
      "600": "#A32F54",
      "700": "#882447",
      "800": "#6E1C3A",
      "900": "#57152E",
    },
  },
  {
    key: "graphite",
    label: "Graphite",
    colors: {
      "50": "#F2F4F6",
      "100": "#E1E5E9",
      "200": "#C3CBD3",
      "300": "#9FACB8",
      "400": "#778593",
      "500": "#5B6876",
      "600": "#485562",
      "700": "#3A4550",
      "800": "#2F3942",
      "900": "#262E36",
    },
  },
];

export function getBrandTheme(key?: string | null): BrandTheme {
  const found = BRAND_THEMES.find((theme) => theme.key === key);
  return found ?? BRAND_THEMES.find((theme) => theme.key === DEFAULT_BRAND_THEME_KEY)!;
}

export function hexToRgbTriplet(hex: string): string {
  const value = hex.replace("#", "").trim();
  const normalized =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  if (normalized.length !== 6) return "0 0 0";
  const parsed = parseInt(normalized, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `${r} ${g} ${b}`;
}

export function brandThemeCssVars(theme: BrandTheme): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [shade, hex] of Object.entries(theme.colors)) {
    vars[`--brand-${shade}`] = hexToRgbTriplet(hex);
  }
  return vars;
}

export function applyBrandTheme(theme: BrandTheme): void {
  const vars = brandThemeCssVars(theme);
  for (const [name, value] of Object.entries(vars)) {
    document.documentElement.style.setProperty(name, value);
  }
}