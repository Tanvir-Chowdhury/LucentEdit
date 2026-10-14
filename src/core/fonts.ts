import { signal } from '@preact/signals';
import { isTauri, tauriInvoke } from './io';

// Every font available to text layers: installed system fonts, font files from the Assets
// library and brands, and CSS generic families. System fonts are read once at startup.

export interface FontFamily { family: string; weights: number[]; italic: boolean }

export const GENERIC_FONTS = ['Inter Variable', 'system-ui', 'sans-serif', 'serif', 'monospace', 'cursive'];
/** Common fonts used before the system list has loaded (or where it can't be read). */
const FALLBACK = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Trebuchet MS', 'Impact', 'Segoe UI', 'Roboto', 'Ubuntu', 'Noto Sans'];

export const systemFonts = signal<FontFamily[]>([]);
export const systemFontsState = signal<'idle' | 'loading' | 'ready' | 'unavailable'>('idle');

export async function loadSystemFonts() {
  if (systemFontsState.value === 'loading' || systemFontsState.value === 'ready') return;
  systemFontsState.value = 'loading';
  try {
    if (isTauri) {
      systemFonts.value = await tauriInvoke<FontFamily[]>('list_system_fonts');
    } else if ('queryLocalFonts' in window) {
      // Chromium: needs a user gesture the first time (permission prompt).
      const faces: any[] = await (window as any).queryLocalFonts();
      const map = new Map<string, FontFamily>();
      for (const f of faces) {
        const e: FontFamily = map.get(f.family) ?? { family: f.family, weights: [], italic: false };
        const w = /thin/i.test(f.style) ? 100 : /extra ?light/i.test(f.style) ? 200 : /light/i.test(f.style) ? 300 : /medium/i.test(f.style) ? 500 : /semi ?bold/i.test(f.style) ? 600 : /extra ?bold/i.test(f.style) ? 800 : /black|heavy/i.test(f.style) ? 900 : /bold/i.test(f.style) ? 700 : 400;
        if (!e.weights.includes(w)) e.weights.push(w);
        e.italic ||= /italic|oblique/i.test(f.style);
        map.set(f.family, e);
      }
      systemFonts.value = [...map.values()].sort((a, b) => a.family.localeCompare(b.family));
    } else {
      systemFontsState.value = 'unavailable';
      return;
    }
    systemFontsState.value = 'ready';
  } catch {
    systemFontsState.value = 'unavailable';
  }
}

/** Family names for pickers and MCP, without duplicates. */
export function fontNames(extra: string[] = []): string[] {
  const sys = systemFonts.value.map((f) => f.family);
  return [...new Set([...extra, ...GENERIC_FONTS, ...(sys.length ? sys : FALLBACK)])];
}

/** Weights a family offers (falls back to the common set). */
export function fontWeights(family: string): number[] {
  const f = systemFonts.value.find((x) => x.family.toLowerCase() === family.toLowerCase());
  return f?.weights.length ? f.weights : [100, 200, 300, 400, 500, 600, 700, 800, 900];
}
