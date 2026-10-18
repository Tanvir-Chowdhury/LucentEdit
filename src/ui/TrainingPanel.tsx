import { useEffect, useState } from 'preact/hooks';
import { signal } from '@preact/signals';
import { Upload, Save, Pencil, Trash2, Sparkles, Gauge, LayoutTemplate } from 'lucide-preact';
import { cur, toast, openDocState } from '../core/store';
import { Brand, Asset, deleteAsset, setAssetInfo, readAsset } from '../core/library';
import { pickFiles, docFromFile } from '../core/io';
import {
  trainingItems, isCurrent, brandStyles, loadStyle, retrainBrand, addTrainingFiles, addCurrentDocument, scoreDocument, recreateLayout,
  type Bucket, type FitResult,
} from '../core/training';
import { askConfirm, askText } from './dialogs';
import { Thumb } from './AssetsPanel';

// Brand Training: past designs, inspiration and don'ts per brand, the style learned from them,
// a fit check for the open design, and new documents from the brand's own layouts.

const BUCKETS: { id: Bucket; label: string; hint: string }[] = [
  { id: 'approved', label: 'Approved', hint: 'Designs that represent the brand. Layered files (.lucentedit, .psd, .svg) teach layout and type; images teach colors.' },
  { id: 'inspiration', label: 'Inspiration', hint: 'References to move toward. Agents learn layout ideas from them, never their colors, fonts or content.' },
  { id: 'avoid', label: 'Avoid', hint: "Don'ts. Add a note with the reason; colors used here are flagged in new designs." },
];
const bucket = signal<Bucket>('approved');
const fit = signal<Record<string, FitResult | null>>({});
const run = (p: Promise<unknown>, ok?: string) => p.then(() => ok && toast(ok, 'success')).catch((e) => toast(String(e?.message ?? e), 'error'));

async function openExample(a: Asset) {
  const doc = await docFromFile({ name: a.file, bytes: await readAsset(a) });
  openDocState(doc, `Open ${a.name}`);
}

function Example({ a }: { a: Asset }) {
  return (
    <div class="asset" title={`${a.file}${a.description ? `\n${a.description}` : ''}\nClick to open`} onClick={() => run(openExample(a))}>
      <div class="asset-thumb"><Thumb a={a} /></div>
      <div class="asset-name">{a.description ? `${a.name} ·` : a.name}{a.description && <span class="muted"> {a.description}</span>}</div>
      <div class="asset-actions" onClick={(e) => e.stopPropagation()}>
        <button class="icon-btn" title="Note (agents read it): why this works, or why to avoid it" aria-label="Edit note" onClick={() => askText('Note for this example', 'What should agents learn from it?', a.description ?? '', (v) => run(setAssetInfo(a, { description: v })))}><Pencil size={12} /></button>
        <button class="icon-btn" title="Remove from training (deletes the file)" aria-label="Remove example" onClick={() => askConfirm(`Remove ${a.file}?`, 'The file is deleted from this brand\'s training folder.', 'Remove', () => run(deleteAsset(a)))}><Trash2 size={12} /></button>
      </div>
    </div>
  );
}

export function TrainingSection({ b }: { b: Brand }) {
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { void loadStyle(b.name); }, [b.name]);
  const style = brandStyles.value[b.name];
  const items = trainingItems(b.name);
  const shown = items.filter((a) => a.training === bucket.value);
  const result = fit.value[b.name];
  const stale = !!style && !isCurrent(style, items);
  const learn = () => {
    setBusy('Learning…');
    run(retrainBrand(b.name, (d, t) => setBusy(`Analyzing ${Math.min(d + 1, t)} of ${t}…`)).finally(() => setBusy(null)), 'Brand style updated');
  };
  const check = () => run(scoreDocument(b.name).then((r) => { fit.value = { ...fit.value, [b.name]: r }; }));
  const p = style?.profile;

  return (
    <div class="training">
      <div class="section-title" style={{ marginTop: 10 }}>Training
        <span class="muted" style={{ fontWeight: 400 }}>{items.length ? `${items.length} example${items.length === 1 ? '' : 's'}` : ''}</span>
      </div>
      <p class="muted training-intro">Add this brand's past designs. LucentEdit learns its layout, type and color habits so AI agents can create new work that looks like it, using this brand's own assets.</p>

      <div class="asset-cats" role="tablist">
        {BUCKETS.map((x) => (
          <button role="tab" aria-selected={bucket.value === x.id} class={`chip${bucket.value === x.id ? ' on' : ''}`} title={x.hint} onClick={() => (bucket.value = x.id)}>
            {x.label} <span>{items.filter((a) => a.training === x.id).length}</span>
          </button>
        ))}
      </div>
      <p class="muted training-hint">{BUCKETS.find((x) => x.id === bucket.value)!.hint}</p>
      {shown.length ? <div class="asset-grid">{shown.map((a) => <Example a={a} key={a.id} />)}</div>
        : <div class="empty" style={{ padding: '12px 0' }}>No {bucket.value} examples yet.</div>}
      <div class="asset-foot">
        <button class="btn" onClick={async () => { const files = await pickFiles(true); if (files.length) run(addTrainingFiles(b.name, bucket.value, files), `Added ${files.length} example${files.length === 1 ? '' : 's'}`); }}><Upload size={13} /> Add files</button>
        <button class="btn" disabled={!cur()} title="Save the open design here with all its layers" onClick={() => askText(`Add to ${BUCKETS.find((x) => x.id === bucket.value)!.label}`, 'Note for agents (optional)', '', (note) => run(addCurrentDocument(b.name, bucket.value, note || undefined), 'Added the current design'))}><Save size={13} /> Add current design</button>
      </div>

      <div class="training-actions">
        <button class={`btn${stale || (!style && items.length) ? ' primary' : ''}`} disabled={!items.length || !!busy} onClick={learn}><Sparkles size={13} /> {busy ?? (style ? (stale ? 'Update brand style' : 'Relearn') : 'Learn brand style')}</button>
        <button class="btn" disabled={!cur() || !items.length} title="Score the open design against this brand's style" onClick={check}><Gauge size={13} /> Check current design</button>
      </div>

      {result && (
        <div class="fit" aria-live="polite">
          <div class="fit-head"><b class={`fit-score ${result.score >= 85 ? 'good' : result.score >= 60 ? 'mid' : 'low'}`}>{result.score}</b><span>Brand fit for the open design</span></div>
          <ul class="fit-list">
            {result.checks.map((c) => <li class={c.ok ? 'ok' : 'bad'}><span aria-hidden="true">{c.ok ? '✓' : '!'}</span><span><b>{c.label}.</b> {c.detail}</span></li>)}
          </ul>
        </div>
      )}

      {p && (
        <div class="profile">
          <div class="section-title" style={{ marginTop: 10 }}>Learned style</div>
          {p.palette.length > 0 && (
            <div class="profile-palette" title="Palette by share of area in approved designs">
              {p.palette.map((s) => <i style={{ background: s.hex, flexGrow: Math.max(0.04, s.share) }} title={`${s.hex} · ${Math.round(s.share * 100)}%`} />)}
            </div>
          )}
          <ul class="profile-summary">{p.summary.map((line) => <li>{line}</li>)}</ul>
          {p.archetypes.length > 0 && (
            <>
              <div class="section-title" style={{ marginTop: 8 }}>Layouts</div>
              <p class="training-hint" style={{ marginTop: 0 }}>Click one to start a new document from a layout this brand already uses.</p>
              <div class="layouts">
                {p.archetypes.slice(0, 8).map((a) => (
                  <button class="layout-card" title={`${a.format} layout seen in ${a.from.length} design${a.from.length === 1 ? '' : 's'}${a.bucket === 'inspiration' ? ' (from inspiration)' : ''}`} onClick={() => run(recreateLayout(b.name, { layout: a.id }), 'New document from the brand layout')}>
                    <svg viewBox={`0 0 ${Math.round(60 * a.aspect)} 60`} style={{ width: Math.min(72, Math.round(48 * a.aspect)), height: 48 }} aria-hidden="true">
                      {a.slots.map((s) => <rect x={s.x * 60 * a.aspect} y={s.y * 60} width={Math.max(1, s.w * 60 * a.aspect)} height={Math.max(1, s.h * 60)} class={`slot ${s.role}`} />)}
                    </svg>
                    <small>{a.format}{a.from.length > 1 ? ` ×${a.from.length}` : ''}</small>
                  </button>
                ))}
              </div>
            </>
          )}
          <div class="muted" style={{ fontSize: 11, marginTop: 6 }}><LayoutTemplate size={11} /> Agents use this through MCP: get_brand_style, recreate_layout, score_brand_fit.</div>
        </div>
      )}
    </div>
  );
}
