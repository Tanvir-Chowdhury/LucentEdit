// Adobe Illustrator's native PostScript-based format (AI 3–10 and the Illustrator data inside
// EPS files). Turns its drawing commands into SVG for importSvg: layers become named groups,
// u/U groups and *u/*U compound paths are kept, colors (CMYK, gray, spot, RGB), strokes and
// point text come across. Pure (no DOM), so aiformat.check.ts runs it under Node.

type Tok = { t: 'num'; v: number } | { t: 'str'; v: string } | { t: 'name'; v: string } | { t: 'arr'; v: number[] } | { t: 'op'; v: string };

/** Splits PostScript into tokens. Comment lines are returned as ops starting with '%' when they
 *  carry Illustrator structure (layer markers); other comments are dropped. */
export function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const n = src.length;
  const isDelim = (c: string) => /[\s()<>[\]{}/%]/.test(c);
  while (i < n) {
    const c = src[i];
    if (c === '%') {
      const e = src.indexOf('\n', i);
      const line = src.slice(i, e < 0 ? n : e).replace(/\r$/, '');
      if (/^%AI5_(Begin|End)Layer/.test(line)) out.push({ t: 'op', v: line.split(/\s/)[0] });
      i = e < 0 ? n : e + 1;
    } else if (/\s/.test(c)) i++;
    else if (c === '(') {
      let depth = 1, s = '';
      i++;
      while (i < n && depth) {
        const ch = src[i];
        if (ch === '\\') {
          const nx = src[i + 1];
          const esc: Record<string, string> = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', '(': '(', ')': ')', '\\': '\\' };
          if (/[0-7]/.test(nx)) { const m = /^[0-7]{1,3}/.exec(src.slice(i + 1))![0]; s += String.fromCharCode(parseInt(m, 8)); i += 1 + m.length; continue; }
          if (nx === '\r' || nx === '\n') { i += nx === '\r' && src[i + 2] === '\n' ? 3 : 2; continue; }
          s += esc[nx] ?? nx; i += 2; continue;
        }
        if (ch === '(') depth++;
        else if (ch === ')' && !--depth) { i++; break; }
        s += ch; i++;
      }
      out.push({ t: 'str', v: s });
    } else if (c === '[') {
      const e = src.indexOf(']', i);
      const inner = src.slice(i + 1, e < 0 ? n : e);
      out.push({ t: 'arr', v: inner.split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite) });
      i = e < 0 ? n : e + 1;
    } else if (c === '<' && src[i + 1] !== '<') {
      const e = src.indexOf('>', i);
      const hex = src.slice(i + 1, e < 0 ? n : e).replace(/\s/g, '');
      let s = '';
      for (let k = 0; k + 1 < hex.length; k += 2) s += String.fromCharCode(parseInt(hex.slice(k, k + 2), 16));
      out.push({ t: 'str', v: s });
      i = e < 0 ? n : e + 1;
    } else if (c === '/') {
      let j = i + 1;
      while (j < n && !isDelim(src[j])) j++;
      out.push({ t: 'name', v: src.slice(i + 1, j) });
      i = j;
    } else if ('{}]>)'.includes(c) || (c === '<' && src[i + 1] === '<')) i += c === '<' ? 2 : 1;
    else {
      let j = i;
      while (j < n && !isDelim(src[j])) j++;
      const w = src.slice(i, j);
      const v = Number(w);
      out.push(w !== '' && Number.isFinite(v) && /^[-+.\d]/.test(w) ? { t: 'num', v } : { t: 'op', v: w });
      i = j;
    }
  }
  return out;
}

const hex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v * 255))).toString(16).padStart(2, '0')).join('')}`;
/** CMYK -> RGB with the polynomial fit of Adobe's conversion that pdf.js uses (Apache-2.0), so
 *  colors match Acrobat and Illustrator instead of the naive formula's oversaturated ones. */
const cmyk = (c: number, m: number, y: number, k: number) => {
  const r = 255 + c * (-4.387332384609988 * c + 54.48615194189176 * m + 18.82290502165302 * y + 212.25662451639585 * k - 285.2331026137004) + m * (1.7149763477362134 * m - 5.6096736904047315 * y - 17.873870861415444 * k - 5.497006427196366) + y * (-2.5217340131683033 * y - 21.248923337353073 * k + 17.5119270841813) + k * (-21.86122147463605 * k - 189.48180835922747);
  const g = 255 + c * (8.841041422036149 * c + 60.118027045597366 * m + 6.871425592049007 * y + 31.159100130055922 * k - 79.2970844816548) + m * (-15.310361306967817 * m + 17.575251261109482 * y + 131.35250912493976 * k - 190.9453302588951) + y * (4.444339102852739 * y + 9.8632861493405 * k - 24.86741582555878) + k * (-20.737325471181034 * k - 187.80453709719578);
  const b = 255 + c * (0.8842522430003296 * c + 8.078677503112928 * m + 30.89978309703729 * y - 0.23883238689178934 * k - 14.183576799673286) + m * (10.49593273432072 * m + 63.02378494754052 * y + 50.606957656360734 * k - 112.23884253719248) + y * (0.03296041114873217 * y + 115.60384449646641 * k - 193.58209356861505) + k * (-22.33816807309886 * k - 180.12613974708367);
  return hex(r / 255, g / 255, b / 255);
};
const esc = (s: string) => s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r2 = (v: number) => Math.round(v * 100) / 100;

/** "_Helvetica-Bold" -> "Helvetica-Bold" (Illustrator prefixes re-encoded fonts with an underscore). */
const fontName = (s: string) => s.replace(/^_+/, '');

export interface AiParse { svg: string; width: number; height: number; layers: number; paths: number; texts: number }

/**
 * Illustrator-format PostScript -> SVG. `bbox` is [llx lly urx ury] in PostScript points (y up).
 * `psFont` maps a PostScript font name to CSS family/weight/italic.
 */
export function aiToSvg(src: string, bbox: [number, number, number, number], psFont: (n: string) => { family: string; weight: number; italic: boolean }): AiParse {
  const [llx, lly, urx, ury] = bbox;
  const W = Math.max(1, Math.round(urx - llx)), H = Math.max(1, Math.round(ury - lly));
  const X = (x: number) => r2(x - llx), Y = (y: number) => r2(ury - y);

  // Groups: layer (Lb..LB), group (u..U), clip group (a group whose first path is a W clip).
  type Node = { kind: 'layer' | 'group'; name: string; hidden?: boolean; items: string[] };
  const tree: Node[] = [{ kind: 'group', name: 'root', items: [] }];
  const emit = (s: string) => tree[tree.length - 1].items.push(s);
  const close = (kind: Node['kind']) => {
    const i = tree.map((t) => t.kind).lastIndexOf(kind);
    if (i <= 0) return;
    while (tree.length > i) {
      const c = tree.pop()!, body = c.items.join('');
      if (body) tree[tree.length - 1].items.push(`<g data-name="${esc(c.name)}"${c.kind === 'layer' ? ' data-keep="1"' : ''}${c.hidden ? ' data-hidden="1"' : ''}>${body}</g>`);
    }
  };

  let fill = '#000000', stroke = '#000000', lw = 1, cap = 0, join = 0, dash: number[] = [];
  let d = '', cx = 0, cy = 0;
  let compound: { d: string } | null = null;
  let clipNext = false, guide = false;
  let layers = 0, paths = 0, texts = 0;
  // Point text: To ... Tp (matrix) ... Tf (font) ... Tx (strings) ... TO
  let text: { m: number[]; font: string; size: number; leading: number; lines: string[]; fill: string; align: number } | null = null;
  const stack: Tok[] = [];
  const nums = (k: number) => stack.slice(-k).map((t) => (t.t === 'num' ? t.v : 0));

  const paint = (fillIt: boolean, strokeIt: boolean, closeIt: boolean) => {
    if (closeIt && d) d += 'Z';
    if (guide || !d) { d = ''; guide = false; return; }
    if (clipNext) { d = ''; clipNext = false; return; } // clipping paths are not drawn
    if (compound) { compound.d += d; d = ''; compoundStyle = { fillIt, strokeIt }; return; }
    out(d, fillIt, strokeIt, false);
    d = '';
  };
  let compoundStyle = { fillIt: true, strokeIt: false };
  const out = (pd: string, fillIt: boolean, strokeIt: boolean, evenodd: boolean) => {
    if (!fillIt && !strokeIt) return;
    paths++;
    emit(`<path data-name="${strokeIt && !fillIt ? 'Stroke' : 'Path'}" d="${pd}" fill="${fillIt ? fill : 'none'}"${evenodd ? ' fill-rule="evenodd"' : ''}${strokeIt ? ` stroke="${stroke}" stroke-width="${r2(lw)}"${cap ? ` stroke-linecap="${['butt', 'round', 'square'][cap]}"` : ''}${join ? ` stroke-linejoin="${['miter', 'round', 'bevel'][join]}"` : ''}${dash.length ? ` stroke-dasharray="${dash.join(' ')}"` : ''}` : ''}/>`);
  };

  const toks = tokenize(src);
  for (const tk of toks) {
    if (tk.t !== 'op') { stack.push(tk); continue; }
    const op = tk.v;
    const a = (k: number) => nums(k);
    switch (op) {
      // Layers
      case 'Lb': { // visible preview enabled printing … Lb: "visible" is the first number (later versions add more)
        const first = stack.find((t) => t.t === 'num') as { v: number } | undefined;
        tree.push({ kind: 'layer', name: 'Layer', hidden: first?.v === 0, items: [] }); layers++; break;
      }
      case 'Ln': { const s = stack[stack.length - 1]; if (s?.t === 'str') { const l = [...tree].reverse().find((t) => t.kind === 'layer'); if (l) l.name = s.v || 'Layer'; } break; }
      case 'LB': close('layer'); break;
      // Groups and compound paths
      case 'u': tree.push({ kind: 'group', name: 'Group', items: [] }); break;
      case 'U': close('group'); break;
      case '*u': compound = { d: '' }; break;
      case '*U': if (compound) { if (compound.d) out(compound.d, compoundStyle.fillIt, compoundStyle.strokeIt, true); compound = null; } break;
      // Path construction (y up; uppercase = corner point, same geometry)
      case 'm': { const [x, y] = a(2); d += `M${X(x)} ${Y(y)}`; cx = x; cy = y; break; }
      case 'l': case 'L': { const [x, y] = a(2); d += `L${X(x)} ${Y(y)}`; cx = x; cy = y; break; }
      case 'c': case 'C': { const [x1, y1, x2, y2, x3, y3] = a(6); d += `C${X(x1)} ${Y(y1)} ${X(x2)} ${Y(y2)} ${X(x3)} ${Y(y3)}`; cx = x3; cy = y3; break; }
      case 'v': case 'V': { const [x2, y2, x3, y3] = a(4); d += `C${X(cx)} ${Y(cy)} ${X(x2)} ${Y(y2)} ${X(x3)} ${Y(y3)}`; cx = x3; cy = y3; break; }
      case 'y': case 'Y': { const [x1, y1, x3, y3] = a(4); d += `C${X(x1)} ${Y(y1)} ${X(x3)} ${Y(y3)} ${X(x3)} ${Y(y3)}`; cx = x3; cy = y3; break; }
      // Painting: lowercase closes the path first
      case 'f': paint(true, false, true); break;
      case 'F': paint(true, false, false); break;
      case 's': paint(false, true, true); break;
      case 'S': paint(false, true, false); break;
      case 'b': paint(true, true, true); break;
      case 'B': paint(true, true, false); break;
      case 'n': case 'N': case 'h': case 'H': paint(false, false, false); break;
      case 'W': clipNext = true; break;
      case '*': guide = true; paint(false, false, false); break; // "(N) *": a guide, not artwork
      // Colors: fill lowercase, stroke uppercase
      case 'g': fill = hex(a(1)[0], a(1)[0], a(1)[0]); break;
      case 'G': stroke = hex(a(1)[0], a(1)[0], a(1)[0]); break;
      case 'k': fill = cmyk(...(a(4) as [number, number, number, number])); break;
      case 'K': stroke = cmyk(...(a(4) as [number, number, number, number])); break;
      case 'x': case 'X': {
        // c m y k (name) tint x  — a spot color, shown through its CMYK at the given tint
        const n = stack.filter((t) => t.t === 'num').map((t) => (t as any).v as number);
        const [c, m, y, k] = n.slice(0, 4), tint = n[n.length - 1] ?? 0;
        const col = cmyk(c * (1 - tint), m * (1 - tint), y * (1 - tint), k * (1 - tint));
        if (op === 'x') fill = col; else stroke = col;
        break;
      }
      case 'Xa': case 'XA': { const [r, g, b] = a(3); if (op === 'Xa') fill = hex(r, g, b); else stroke = hex(r, g, b); break; }
      case 'Xk': case 'XK': {
        // c m y k (name) tint type Xk, or c m y k r g b (name) tint type Xk (type 1 = RGB)
        const n = stack.filter((t) => t.t === 'num').map((t) => (t as any).v as number);
        const type = n[n.length - 1], tint = n[n.length - 2] ?? 0;
        const col = type === 1 && n.length >= 9 ? hex(n[4] + (1 - n[4]) * tint, n[5] + (1 - n[5]) * tint, n[6] + (1 - n[6]) * tint) : cmyk(n[0] * (1 - tint), n[1] * (1 - tint), n[2] * (1 - tint), n[3] * (1 - tint));
        if (op === 'Xk') fill = col; else stroke = col;
        break;
      }
      // Stroke style
      case 'w': lw = a(1)[0]; break;
      case 'J': cap = a(1)[0]; break;
      case 'j': join = a(1)[0]; break;
      case 'd': { const arr = stack.find((t) => t.t === 'arr'); dash = arr ? (arr as any).v : []; break; }
      // Point text
      case 'To': text = { m: [1, 0, 0, 1, 0, 0], font: 'Helvetica', size: 12, leading: 14.4, lines: [''], fill, align: 0 }; break;
      case 'Tp': if (text) text.m = a(7).slice(0, 6); break;
      case 'Tf': { // /font size ascent descent Tf: the size is the first number after the name
        const ni = stack.findIndex((t) => t.t === 'name');
        const size = stack.slice(ni + 1).find((t) => t.t === 'num') as { v: number } | undefined;
        if (text) { if (ni >= 0) text.font = fontName((stack[ni] as any).v); if (size && size.v > 0) text.size = size.v; text.leading = text.size * 1.2; }
        break;
      }
      case 'Tl': if (text) text.leading = a(2)[0] || text.leading; break;
      case 'Ta': if (text) text.align = a(1)[0]; break;
      case 'Tx': case 'Tj': case 'TX': { const s = stack.find((t) => t.t === 'str'); if (text && s) { text.lines[text.lines.length - 1] += (s as any).v; text.fill = fill; } break; }
      case 'T*': if (text) text.lines.push(''); break;
      case 'TO': {
        if (text) {
          const f = psFont(text.font);
          const [ma, mb, mc, md, tx, ty] = text.m;
          const anchor = text.align === 1 ? 'middle' : text.align === 2 ? 'end' : 'start';
          text.lines.forEach((line, i) => {
            if (!line.trim()) return;
            texts++;
            // The matrix's y axis points up; each line drops by the leading.
            const x = tx - mc * i * text!.leading, y = ty - md * i * text!.leading;
            const rot = Math.atan2(mb, ma) * 180 / Math.PI;
            emit(`<text data-name="${esc(line.trim().slice(0, 40))}" x="${X(x)}" y="${Y(y)}"${rot ? ` transform="rotate(${r2(-rot)} ${X(x)} ${Y(y)})"` : ''} font-family="${esc(f.family)}" font-size="${r2(text!.size * Math.hypot(mc, md))}" font-weight="${f.weight}"${f.italic ? ' font-style="italic"' : ''}${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${text!.fill}">${esc(line)}</text>`);
          });
        }
        text = null;
        break;
      }
      case 'XI': { // placed raster image: keep its spot as a marked placeholder
        const arr = stack.find((t) => t.t === 'arr') as { v: number[] } | undefined;
        const [iw, ih] = nums(9).slice(4, 6);
        if (arr && arr.v.length === 6 && iw && ih) {
          const [ia, , , idd, itx, ity] = arr.v;
          const w = Math.abs(ia * iw), h = Math.abs(idd * ih);
          emit(`<rect data-name="Image (embedded image not imported)" x="${X(itx)}" y="${Y(ity)}" width="${r2(w)}" height="${r2(h)}" fill="#c9c9cf"/>`);
        }
        break;
      }
    }
    stack.length = 0;
  }
  while (tree.length > 1) close(tree[tree.length - 1].kind);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${tree[0].items.join('')}</svg>`;
  return { svg, width: W, height: H, layers, paths, texts };
}

/** The PostScript part of an EPS (DOS EPS files wrap it in a binary header with a preview). */
export function epsPostScript(bytes: Uint8Array): string {
  if (bytes[0] === 0xc5 && bytes[1] === 0xd0 && bytes[2] === 0xd3 && bytes[3] === 0xc6) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const start = dv.getUint32(4, true), len = dv.getUint32(8, true);
    return latin1(bytes.subarray(start, start + len));
  }
  return latin1(bytes);
}
const latin1 = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i += 8192) s += String.fromCharCode(...b.subarray(i, i + 8192)); return s; };

/** Illustrator data inside a PostScript file, ready for aiToSvg, or null if it isn't Illustrator's. */
export function illustratorBody(ps: string): { body: string; bbox: [number, number, number, number] } | null {
  const bb = /%%HiResBoundingBox:\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/.exec(ps) ?? /%%BoundingBox:\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/.exec(ps);
  if (!bb) return null;
  const bbox = bb.slice(1, 5).map(Number) as [number, number, number, number];
  // Illustrator 9+ keeps its own editable copy after %AI9_PrivateDataBegin (plain text unless compressed).
  const priv = ps.indexOf('%AI9_PrivateDataBegin');
  if (priv >= 0 && !/%AI12_CompressedData/.test(ps.slice(priv, priv + 4000))) {
    const s = ps.indexOf('%%EndSetup', priv);
    const e = ps.indexOf('%AI9_PrivateDataEnd', priv);
    if (s >= 0) return { body: ps.slice(s, e > s ? e : undefined), bbox };
  }
  const isAI = /%%Creator:\s*Adobe Illustrator/i.test(ps) || /%AI\d_/.test(ps);
  if (!isAI) return null;
  const s = ps.indexOf('%%EndSetup');
  const e = ps.search(/%%PageTrailer|%%Trailer/);
  if (s < 0) return null;
  return { body: ps.slice(s, e > s ? e : undefined), bbox };
}
