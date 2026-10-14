# Graph Report - photoAgent  (2026-10-14)

## Corpus Check
- 75 files · ~136,508 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1347 nodes · 3744 edges · 62 communities (57 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 53 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `883d8210`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Contributing to Lucent
- commands.ts
- io.ts
- retouch.tsx
- server.ts
- package.json
- bundle
- chrome.tsx
- util.ts
- panels.tsx
- extra.tsx
- dialogs.tsx
- lib.rs
- selection.ts
- cur
- select2.tsx
- mcp/package.json
- install.sh
- compilerOptions
- index.ts
- touch
- store.ts
- select.ts
- App.tsx
- move.ts
- permissions
- selectops.ts
- vector.ts
- retouch-px.ts
- flatten
- Tool
- Kind
- infoPanels.tsx
- install.ps1
- mcp-smoke-test.mjs
- lucentedit-mcp.mjs
- filters-algo.check.ts
- CLAUDE.md
- pct
- check
- colorToRGBA
- adjust.ts
- flatten
- filters.ts
- contentaware.ts
- walk
- clamp
- filters-algo.check.ts
- controls.tsx
- findLayerIn
- runDab
- infoPanels.tsx
- warp.ts
- gridFromQuad
- findLayerIn
- cloneLayers
- render

## God Nodes (most connected - your core abstractions)
1. `cur()` - 126 edges
2. `commit()` - 86 edges
3. `touch()` - 82 edges
4. `ctx2d()` - 66 edges
5. `toast` - 60 edges
6. `makeCanvas()` - 53 edges
7. `activeLayer()` - 45 edges
8. `flatten()` - 30 edges
9. `selectedLayers()` - 30 edges
10. `refreshLibrary()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `onPaste()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/App.tsx → src/core/io.ts
- `Viewport()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/Viewport.tsx → src/core/io.ts
- `MenuBar()` --indirect_call--> `esc()`  [INFERRED]
  src/ui/chrome.tsx → src/core/io.ts
- `previewDataURL()` --calls--> `flatten()`  [EXTRACTED]
  src/core/io.ts → src/core/render.ts

## Import Cycles
- None detected.

## Communities (62 total, 5 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.06
Nodes (31): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+23 more)

### Community 1 - "commands.ts"
Cohesion: 0.06
Nodes (69): baseName(), buildSvg(), deserializeDoc(), docFromFile(), elementToPathData(), esc(), ExportFormat, extOf() (+61 more)

### Community 2 - "io.ts"
Cohesion: 0.11
Nodes (12): Layer, corners(), hslToRgb(), hx(), imageToCanvas(), layerMatrix(), loadImage(), normHex() (+4 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (36): historyShift, bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts (+28 more)

### Community 4 - "server.ts"
Cohesion: 0.07
Nodes (57): actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep(), dialogClosed() (+49 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (42): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+34 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.13
Nodes (20): textOpts, commitText(), filterMenu(), flyout, FONTS, hideTip(), MenuBar(), MenuEntry (+12 more)

### Community 8 - "util.ts"
Cohesion: 0.12
Nodes (23): filterById(), FILTERS, exportBytes(), saveAs(), cropDoc(), flipContent(), flipLayers(), MaskMode (+15 more)

### Community 9 - "panels.tsx"
Cohesion: 0.05
Nodes (43): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), cbWeights(), c, grouped, id (+35 more)

### Community 10 - "extra.tsx"
Cohesion: 0.11
Nodes (20): toPathProps(), addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, EXTRA_TOOLS, free, freeformTool (+12 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.12
Nodes (6): mcpStatus, Dialogs(), FeatherDialog(), PresetCard(), PRESETS, SizeDialog()

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.11
Nodes (24): MaskMeta, Rect, boundsOf(), Pt, Quad, applyTransform(), EDGES, H_PARTNER (+16 more)

### Community 15 - "select2.tsx"
Cohesion: 0.10
Nodes (23): deselect(), SelMode, edgePath(), floodWindow(), gradientMagnitude(), luma(), RangeSpec, slideMax() (+15 more)

### Community 16 - "mcp/package.json"
Cohesion: 0.09
Nodes (21): bin, lucentedit-mcp, description, engines, node, files, keywords, license (+13 more)

### Community 17 - "install.sh"
Cohesion: 0.27
Nodes (18): die(), download_asset(), fetch(), has(), info(), install_appimage(), install_deb(), install_linux() (+10 more)

### Community 18 - "compilerOptions"
Cohesion: 0.10
Nodes (19): DOM, DOM.Iterable, ES2022, src, vite/client, compilerOptions, isolatedModules, jsx (+11 more)

### Community 19 - "index.ts"
Cohesion: 0.11
Nodes (17): marquee, wand, drawPill(), line(), ants(), cancelCrop(), cropTool, lassoTool (+9 more)

### Community 20 - "touch"
Cohesion: 0.18
Nodes (18): activeIndex, bucket, curDoc(), cursorPos, DialogState, interaction, needsFit, paint (+10 more)

### Community 21 - "store.ts"
Cohesion: 0.11
Nodes (24): canReselect(), colorRange(), loadSelection(), rangeSpec(), reselect(), saveSelection(), selectAll(), selectLayerPixels() (+16 more)

### Community 22 - "select.ts"
Cohesion: 0.09
Nodes (41): addLayer(), addMask(), deleteSelected(), duplicateSelected(), commit(), cur(), jumpTo(), redo() (+33 more)

### Community 23 - "App.tsx"
Cohesion: 0.10
Nodes (21): gradientOpts, ToolId, ellipseMarquee, GROUP_ORDER, groupCurrent, handTool, rectMarquee, setTool() (+13 more)

### Community 24 - "move.ts"
Cohesion: 0.17
Nodes (14): applied, boxMatrix(), drawTransformBox(), guides, handlePoints(), hitHandle(), HP, Mode (+6 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.07
Nodes (84): tauriInvoke(), writePath(), activeBrand, Asset, assetPath(), assetPreviewPNG(), assetThumb(), Brand (+76 more)

### Community 27 - "vector.ts"
Cohesion: 0.13
Nodes (23): arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths(), parseSvgPath(), pathBounds() (+15 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (10): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+2 more)

### Community 29 - "flatten"
Cohesion: 0.17
Nodes (18): maskTarget, FontSelect(), anchorRef, Appearance(), BLEND_LABEL(), BOTTOM_TABS, DocProps(), done() (+10 more)

### Community 31 - "Kind"
Cohesion: 0.20
Nodes (5): Kind, runDab(), smooth(), strokeTo(), PEvent

### Community 32 - "infoPanels.tsx"
Cohesion: 0.18
Nodes (21): alphaCanvas(), boxBlurAlpha(), ColorRangeTarget, drawQuickMaskOverlay(), featherSelection(), flatData(), grow(), lastMask (+13 more)

### Community 33 - "install.ps1"
Cohesion: 0.48
Nodes (5): Get-LucentEditInstalls(), Uninstall-LucentEdit(), Write-Ok(), Write-Step(), Write-Warn2()

### Community 34 - "mcp-smoke-test.mjs"
Cohesion: 0.40
Nodes (4): checks, out, rpc(), tool()

### Community 35 - "lucentedit-mcp.mjs"
Cohesion: 0.60
Nodes (4): chain, findApp(), forward(), out()

### Community 36 - "filters-algo.check.ts"
Cohesion: 0.12
Nodes (14): FALLBACK, FontFamily, GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, registerTools(), RETOUCH_TOOLS (+6 more)

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

### Community 46 - "adjust.ts"
Cohesion: 0.40
Nodes (10): align(), distribute(), moveLayer(), setProps(), bounds(), refreshGroups(), unionRects(), flipSelected() (+2 more)

### Community 47 - "flatten"
Cohesion: 0.19
Nodes (17): maskForLayer(), pixelMatrix(), quickMaskStandIn(), toggleQuickMask(), DocState, RasterLayer, cloneCanvas(), parseColor() (+9 more)

### Community 48 - "filters.ts"
Cohesion: 0.13
Nodes (18): AdjustLayer, Base, BlendMode, Doc, Effects, GlowFx, Gradient, GradientStop (+10 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.10
Nodes (23): applyMask(), rasterize(), setClip(), closeDoc(), select(), touch(), BLEND_MODES, resetRotation() (+15 more)

### Community 51 - "clamp"
Cohesion: 0.24
Nodes (12): ToolFlyout(), close(), CONTENT_AWARE_COMMANDS, ContentAwareDialogs(), contentAwareFill(), FillDialog(), FillOpts, progress (+4 more)

### Community 52 - "filters-algo.check.ts"
Cohesion: 0.13
Nodes (16): assert, b, dst, f, g, H, img, m (+8 more)

### Community 53 - "controls.tsx"
Cohesion: 0.18
Nodes (9): ColorPickerPopover(), evalNum(), NumField(), PaintEditor(), PickerReq, PRESETS, recent, Seg() (+1 more)

### Community 54 - "findLayerIn"
Cohesion: 0.19
Nodes (14): actionForKey(), brush, toasts, useTick(), App(), isTyping(), onKeyDown(), onKeyUp() (+6 more)

### Community 55 - "runDab"
Cohesion: 0.16
Nodes (35): FilterDef, applyFilter(), filteredCopy(), editablePixels(), flattenImage(), layerAt(), mergeDown(), newRaster() (+27 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.22
Nodes (8): bg, fg, samplers, viewportSize, hex(), InfoPanel(), previewCache, SWATCHES

### Community 57 - "warp.ts"
Cohesion: 0.27
Nodes (9): Field, liquifyDab(), LiquifyKind, liquifyRender(), newField(), sampleField(), Liquify(), Setup (+1 more)

### Community 58 - "gridFromQuad"
Cohesion: 0.29
Nodes (8): applyH(), a, gridFromQuad(), homography(), quadMesh(), solve8(), setTransformMode(), startTransform()

### Community 62 - "cloneLayers"
Cohesion: 0.12
Nodes (39): newAdjustment(), AlignMode, base(), convertToSmart(), editSmartContents(), fitAdjustments(), groupSelected(), layerSummary() (+31 more)

### Community 63 - "render"
Cohesion: 0.24
Nodes (12): bern(), bezierPatch(), drawMesh(), Img, Mat3, patchMesh(), renderQuad(), renderWarp() (+4 more)

## Knowledge Gaps
- **306 isolated node(s):** `How contributions work`, `Getting started`, `Before opening a pull request`, `Guidelines`, `Reporting bugs` (+301 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `select.ts` to `commands.ts`, `io.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `App.tsx`, `move.ts`, `selectops.ts`, `vector.ts`, `flatten`, `infoPanels.tsx`, `adjust.ts`, `flatten`, `walk`, `clamp`, `findLayerIn`, `runDab`, `infoPanels.tsx`, `warp.ts`, `gridFromQuad`, `cloneLayers`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Why does `touch()` connect `walk` to `commands.ts`, `io.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `select.ts`, `App.tsx`, `move.ts`, `selectops.ts`, `vector.ts`, `flatten`, `Kind`, `infoPanels.tsx`, `adjust.ts`, `flatten`, `findLayerIn`, `runDab`, `infoPanels.tsx`, `gridFromQuad`, `cloneLayers`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `commit()` connect `select.ts` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `touch`, `move.ts`, `selectops.ts`, `vector.ts`, `flatten`, `adjust.ts`, `flatten`, `walk`, `clamp`, `runDab`, `warp.ts`, `cloneLayers`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **What connects `How contributions work`, `Getting started`, `Before opening a pull request` to the rest of the system?**
  _306 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05502392344497608 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._