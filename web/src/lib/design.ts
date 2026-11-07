import type { DesignSystem } from "./model";
export const forest: DesignSystem = {
  id: "ict-forest",
  name: "숲녹색 컨설팅",
  font: "Pretendard",
  colors: {
    primary: "#244C3C",
    darkest: "#15291F",
    textSub: "#2B3A31",
    muted: "#526158",
    tint: "#D8E5DC",
    panel: "#F1F4F2",
    connector: "#DADFDB",
    accent: "#3E7D5F",
    onDarkSub: "#B9CCBF",
    coverLine: "#8FB8A2",
    risk: "#9B3B3B",
  },
};
function rgb(hex: string) {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
}
export function contrast(a: string, b = "#FFFFFF") {
  const lum = (h: string) =>
    rgb(h)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = lum(a),
    y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
function hsl(hex: string) {
  const [r, g, b] = rgb(hex),
    max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min,
    l = (max + min) / 2;
  let h = 0;
  if (d)
    h =
      max === r
        ? (g - b) / d + (g < b ? 6 : 0)
        : max === g
          ? (b - r) / d + 2
          : (r - g) / d + 4;
  return [h / 6, d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l];
}
function hex(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return (
    "#" +
    [f(0), f(8), f(4)]
      .map((v) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
      .toUpperCase()
  );
}
const approvedThemes: Record<string, { name: string; primary: string; darkest: string; tint: string; panel: string }> = {
  lemonade: { name: "레모네이드 보라", primary: "#5131B5", darkest: "#2E1D64", tint: "#DED7F6", panel: "#F5F2FC" },
  sand: { name: "샌드 브라운", primary: "#876244", darkest: "#4C3829", tint: "#EADFD3", panel: "#F8F5F0" },
  charcoal: { name: "차콜 모노", primary: "#42474F", darkest: "#20252D", tint: "#E1E4E8", panel: "#F5F6F7" },
};
export function design(id: string, primary?: string): DesignSystem {
  const approved = approvedThemes[id];
  if (approved) {
    const generated = design("custom", approved.primary);
    return { ...generated, id, name: approved.name, colors: { ...generated.colors, primary: approved.primary, darkest: approved.darkest, tint: approved.tint, panel: approved.panel } };
  }
  if (id === "ict-forest") return structuredClone(forest);
  const p = id === "navy" ? "#1F3A5F" : id === "coral" ? "#D9534F" : primary ?? "#244C3C",
    [h, s, l] = hsl(p);
  let dark = l * 0.55;
  while (contrast(hex(h, s, dark)) < 4.5 && dark > 0.01) dark -= 0.01;
  return {
    id,
    name:
      id === "navy"
        ? "네이비 리포트"
        : id === "coral"
          ? "코랄 브랜드"
          : "나의 색",
    font: "Pretendard",
    colors: {
      primary: p,
      darkest: hex(h, s, dark),
      textSub: hex(h, s * 0.4, 0.22),
      muted: hex(h, s * 0.2, 0.35),
      tint: hex(h, s * 0.35, 0.88),
      panel: hex(h, s * 0.15, 0.95),
      connector: hex(h, s * 0.08, 0.86),
      accent: hex(h, s, Math.min(0.95, l + 0.12)),
      onDarkSub: hex(h, s * 0.25, 0.77),
      coverLine: hex(h, s * 0.4, 0.64),
      risk: "#9B3B3B",
    },
  };
}
