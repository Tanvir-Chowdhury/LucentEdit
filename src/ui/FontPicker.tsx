import { useEffect, useRef, useState } from 'preact/hooks';
import { Search, ChevronDown } from 'lucide-preact';
import { systemFonts, systemFontsState, loadSystemFonts, GENERIC_FONTS } from '../core/fonts';
import { libraryFonts, activeBrand, brandByName, library } from '../core/library';

// Searchable font picker: brand fonts first, then fonts from the Assets library, then every
// font installed on the computer. Each name is previewed in its own typeface.

const MAX_ROWS = 250; // keeps the popup fast with thousands of installed fonts

export function FontPicker({ value, onChange, width = 170 }: { value: string; onChange: (family: string) => void; width?: number }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    loadSystemFonts();
    const close = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);
  void library.value; // re-render when brands change
  const brand = brandByName(activeBrand.value);
  const brandFonts = brand ? (['heading', 'body', 'accent'] as const).map((k) => brand.fonts[k] && { role: k, family: brand.fonts[k]!.family }).filter(Boolean) as { role: string; family: string }[] : [];
  const match = (f: string) => !q || f.toLowerCase().includes(q.toLowerCase());
  const groups: [string, { family: string; hint?: string }[]][] = [
    [brand ? `${brand.name} brand` : '', brandFonts.filter((f) => match(f.family)).map((f) => ({ family: f.family, hint: f.role }))],
    ['Assets library', libraryFonts.value.filter(match).map((family) => ({ family }))],
    ['Installed on this computer', systemFonts.value.filter((f) => match(f.family)).map((f) => ({ family: f.family, hint: f.weights.length > 1 ? `${f.weights.length} weights` : undefined }))],
    ['Generic', GENERIC_FONTS.filter(match).map((family) => ({ family }))],
  ];
  let budget = MAX_ROWS;
  const pick = (f: string) => { onChange(f); setOpen(false); setQ(''); };
  return (
    <div class="fontpick" ref={box} style={{ width }}>
      <button class="fontpick-btn" style={{ fontFamily: `"${value}"` }} onClick={() => setOpen(!open)} title={value}>
        <span>{value}</span><ChevronDown size={13} />
      </button>
      {open && (
        <div class="fontpick-pop" onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Escape') setOpen(false); if (e.key === 'Enter' && q.trim()) pick(q.trim()); }}>
          <div class="fontpick-search"><Search size={13} /><input autoFocus placeholder="Search fonts… (Enter uses any name)" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} ref={(el) => { if (el) setTimeout(() => el.focus()); }} /></div>
          <div class="fontpick-list">
            {groups.map(([title, items]) => {
              if (!title || !items.length || budget <= 0) return null;
              const shown = items.slice(0, budget);
              budget -= shown.length;
              return (
                <>
                  <div class="fontpick-group">{title}{items.length > shown.length && ` (${shown.length} of ${items.length}, search to narrow)`}</div>
                  {shown.map((it) => (
                    <button class={`fontpick-item${it.family === value ? ' on' : ''}`} onClick={() => pick(it.family)}>
                      <span style={{ fontFamily: `"${it.family}", ${'sans-serif'}` }}>{it.family}</span>{it.hint && <small>{it.hint}</small>}
                    </button>
                  ))}
                </>
              );
            })}
            {systemFontsState.value === 'loading' && <div class="fontpick-group">Reading installed fonts…</div>}
            {systemFontsState.value === 'unavailable' && <div class="fontpick-group">Installed fonts can't be listed here; type any font name and press Enter.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
