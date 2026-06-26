/**
 * colorUtils
 * ──────────
 * Lightweight colour helpers — no external dependencies.
 */

/** Parse a #RRGGBB or #RGB hex string to { r, g, b } */
export function hexToRgb(hex: string): {r: number; g: number; b: number} | null {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return {r, g, b};
  }
  if (clean.length === 6) {
    const r = parseInt(clean.slice(0, 2), 16);
    const g = parseInt(clean.slice(2, 4), 16);
    const b = parseInt(clean.slice(4, 6), 16);
    return {r, g, b};
  }
  return null;
}

/** Convert { r, g, b } to #RRGGBB */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map(v => Math.min(255, Math.max(0, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Darken a hex colour by `amount` (0–1) */
export function darken(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r * (1 - amount),
    rgb.g * (1 - amount),
    rgb.b * (1 - amount),
  );
}

/** Lighten a hex colour by `amount` (0–1) */
export function lighten(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * amount,
    rgb.g + (255 - rgb.g) * amount,
    rgb.b + (255 - rgb.b) * amount,
  );
}

/** Add alpha to a hex colour → rgba() string */
export function hexWithAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
}

/** Relative luminance per WCAG 2.1 */
export function luminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

/** WCAG contrast ratio between two hex colours */
export function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Pick whichever of `light` / `dark` has better contrast against `bg` */
export function bestTextColor(
  bg: string,
  light = '#FFFFFF',
  dark = '#000000',
): string {
  const cl = contrastRatio(bg, light);
  const cd = contrastRatio(bg, dark);
  return cl >= cd ? light : dark;
}

/** Interpolate between two hex colours by `t` (0–1) */
export function lerpColor(hex1: string, hex2: string, t: number): string {
  const a = hexToRgb(hex1);
  const b = hexToRgb(hex2);
  if (!a || !b) return hex1;
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t,
  );
}

/** Convert hex to `rgb(r,g,b)` string */
export function hexToRgbString(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return 'rgb(0,0,0)';
  return `rgb(${rgb.r},${rgb.g},${rgb.b})`;
}
