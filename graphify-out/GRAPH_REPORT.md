# Graph Report - photoAgent  (2026-10-18)

## Corpus Check
- 85 files · ~222,306 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1525 nodes · 4783 edges · 62 communities (57 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 71 edges (avg confidence: 0.62)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5574b6c3`
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
- select2.tsx
- install.ps1
- mcp-smoke-test.mjs
- lucentedit-mcp.mjs
- BrandsPanel.tsx
- CLAUDE.md
- pct
- check
- colorToRGBA
- adjust.ts
- contentAware.tsx
- filters.ts
- contentaware.ts
- walk
- training.check.ts
- store.ts
- paint.ts
- findLayerIn
- warp.check.ts
- infoPanels.tsx
- controls.tsx
- filters-algo.check.ts
- findLayerIn
- clamp
- runDab

## God Nodes (most connected - your core abstractions)
1. `cur()` - 131 edges
2. `ctx2d()` - 93 edges
3. `commit()` - 90 edges
4. `touch()` - 83 edges
5. `makeCanvas()` - 78 edges
6. `toast` - 62 edges
7. `activeLayer()` - 45 edges
8. `flatten()` - 36 edges
9. `addLayer()` - 31 edges
10. `selectedLayers()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `parseActions()` --references--> `KINDS`  [EXTRACTED]
  src/core/actions-steps.ts → src/core/library.ts
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `FilterDialog()` --indirect_call--> `on()`  [INFERRED]
  src/ui/dialogs.tsx → src/core/filters-algo.ts
- `rgbOf()` --calls--> `parseColor()`  [EXTRACTED]
  src/core/filters-algo.ts → src/core/util.ts
- `onPaste()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/App.tsx → src/core/io.ts

## Import Cycles
- None detected.

## Communities (62 total, 5 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.04
Nodes (45): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+37 more)

### Community 1 - "commands.ts"
Cohesion: 0.12
Nodes (20): readPath(), layerSummary(), whenIdle(), BLEND_MODES, findLayerIn, BRAND_SCHEMA, common(), docInfo() (+12 more)

### Community 2 - "io.ts"
Cohesion: 0.16
Nodes (11): canvasToBlob(), corners(), dataURLToBytes(), downloadBlob(), hslToRgb(), hx(), loadImage(), normHex() (+3 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (34): bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts, cloneStampTool (+26 more)

### Community 4 - "server.ts"
Cohesion: 0.07
Nodes (64): actionForKey(), actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep() (+56 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (44): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, pdfjs-dist (+36 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.11
Nodes (26): esc(), quickMask, bucket, closeDoc(), ToolId, GROUP_ORDER, groupTools(), setTool() (+18 more)

### Community 8 - "util.ts"
Cohesion: 0.14
Nodes (19): cssToPsFont(), psFontToCss(), WEIGHT_NAMES, serializeDoc(), apply(), BLEND, concat(), deflate() (+11 more)

### Community 9 - "panels.tsx"
Cohesion: 0.08
Nodes (22): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), copyImg(), fbm(), FilterParam, keepLuma() (+14 more)

### Community 10 - "extra.tsx"
Cohesion: 0.08
Nodes (27): shapeOpts, strokeColor, addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, EXTRA_TOOLS, free (+19 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.10
Nodes (25): deselect(), colorRangeAlpha(), edgePath(), floodWindow(), gradientMagnitude(), luma(), RangeSpec, slideMax() (+17 more)

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.05
Nodes (69): MaskMeta, Rect, applyH(), bern(), bezierPatch(), boundsOf(), a, assert (+61 more)

### Community 15 - "select2.tsx"
Cohesion: 0.22
Nodes (17): duplicateSelected(), groupSelected(), removeLayers(), reorder(), toPaint(), toStroke(), ungroup(), containerOf() (+9 more)

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
Cohesion: 0.08
Nodes (26): gradientOpts, marquee, wand, ellipseMarquee, groupCurrent, rectMarquee, ShapeKind, shapeVariant() (+18 more)

### Community 20 - "touch"
Cohesion: 0.17
Nodes (15): bg, cursorPos, fg, useTick(), samplers, viewportSize, hex(), HistogramPanel() (+7 more)

### Community 21 - "store.ts"
Cohesion: 0.05
Nodes (85): pickFiles(), trainingPath(), addCurrentDocument(), addTrainingFiles(), Archetype, archetypesOf(), area(), bodyOf() (+77 more)

### Community 22 - "select.ts"
Cohesion: 0.21
Nodes (21): baseName(), deserializeDoc(), docFromFile(), elementToPathData(), extOf(), fileToOpened(), importSvg(), layersFromFile() (+13 more)

### Community 23 - "App.tsx"
Cohesion: 0.21
Nodes (23): psdTextOut(), applyAdjust(), applyStroke(), checkerPattern(), composite(), drawContent(), drawLayer(), drawLayers() (+15 more)

### Community 24 - "move.ts"
Cohesion: 0.16
Nodes (15): brush, tick, toasts, usePaint(), toolShortcut(), beginTextEdit(), ActionDialogs(), App() (+7 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.05
Nodes (99): FALLBACK, FontFamily, fontWeights(), GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, tauriInvoke() (+91 more)

### Community 27 - "vector.ts"
Cohesion: 0.22
Nodes (15): arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths(), parseSvgPath(), pathBounds() (+7 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (10): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+2 more)

### Community 29 - "flatten"
Cohesion: 0.11
Nodes (31): moveInto(), setProps(), maskTarget, select(), walk(), snap(), historySource, FontSelect() (+23 more)

### Community 30 - "Tool"
Cohesion: 0.14
Nodes (31): addLayer(), editablePixels(), mergeDown(), newRaster(), maskBounds(), activeIndex, activeLayer(), docs (+23 more)

### Community 31 - "Kind"
Cohesion: 0.16
Nodes (16): viewOpts, Layer, applied, boxMatrix(), drawPill(), drawTransformBox(), guides, handlePoints() (+8 more)

### Community 32 - "select2.tsx"
Cohesion: 0.10
Nodes (41): alphaCanvas(), boxBlurAlpha(), canReselect(), colorRange(), ColorRangeTarget, drawQuickMaskOverlay(), featherSelection(), flatData() (+33 more)

### Community 33 - "install.ps1"
Cohesion: 0.48
Nodes (5): Get-LucentEditInstalls(), Uninstall-LucentEdit(), Write-Ok(), Write-Step(), Write-Warn2()

### Community 34 - "mcp-smoke-test.mjs"
Cohesion: 0.40
Nodes (4): checks, out, rpc(), tool()

### Community 35 - "lucentedit-mcp.mjs"
Cohesion: 0.60
Nodes (4): chain, findApp(), forward(), out()

### Community 36 - "BrandsPanel.tsx"
Cohesion: 0.06
Nodes (31): AI client সেটআপ, Developer quickstart, Filter ও adjustment menu capture-এর পূর্ণ নামের তালিকা, LucentEdit — ৫ মিনিটের বাংলা ডেভেলপার এক্সপ্লেইনার, ক্রিয়েটিভ নির্দেশনা, ডাউনলোড, দাবির নির্ভুলতা ও রেকর্ডিংয়ের প্রস্তুতি, ভিডিও ডেসক্রিপশনে কপি করার সেটআপ গাইড (+23 more)

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

### Community 46 - "adjust.ts"
Cohesion: 0.12
Nodes (32): applyMask(), rasterize(), setClip(), cur(), touch(), resetRotation(), unrotate(), zoomAt() (+24 more)

### Community 47 - "contentAware.tsx"
Cohesion: 0.12
Nodes (19): saveAs(), cropDoc(), flattenImage(), MaskMode, applyCrop(), clip, cropToSelection(), FILTER_KEYS (+11 more)

### Community 48 - "filters.ts"
Cohesion: 0.15
Nodes (16): AdjustLayer, Base, BlendMode, Doc, Effects, GlowFx, GradientStop, GroupLayer (+8 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.07
Nodes (45): adaptColor(), autoSampleRect(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill() (+37 more)

### Community 50 - "walk"
Cohesion: 0.14
Nodes (36): placeAsset(), addMask(), align(), AlignMode, base(), convertToSmart(), distribute(), editSmartContents() (+28 more)

### Community 51 - "training.check.ts"
Cohesion: 0.25
Nodes (15): deleteSelected(), commit(), selectedLayers(), applyBrandFonts(), applyColorToSelection(), commitText(), alignCmd(), arrange() (+7 more)

### Community 52 - "store.ts"
Cohesion: 0.14
Nodes (20): curDoc(), DialogState, historyShift, interaction, jumpTo(), needsFit, paint, redo() (+12 more)

### Community 53 - "paint.ts"
Cohesion: 0.24
Nodes (14): pixelMatrix(), quickMaskStandIn(), DocState, RasterLayer, cloneCanvas(), parseColor(), brushLike(), isDark() (+6 more)

### Community 54 - "findLayerIn"
Cohesion: 0.11
Nodes (13): ExportFormat, mcpStatus, TOOLS, MenuItems(), prettyKeys(), FeatherDialog(), NewDialog(), Palette() (+5 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.16
Nodes (31): FilterDef, applyFilter(), filteredCopy(), buildSvg(), exportBytes(), layerBoundsPx(), writePsdBytes(), layerAt() (+23 more)

### Community 58 - "controls.tsx"
Cohesion: 0.14
Nodes (15): Gradient, Paint, hsvToRgb(), rgbToHsv(), openColor(), ColorPickerPopover(), evalNum(), NumField() (+7 more)

### Community 59 - "filters-algo.check.ts"
Cohesion: 0.13
Nodes (14): newAdjustment(), c, grouped, id, ids, menuFilters, rows, defaultParams() (+6 more)

### Community 62 - "clamp"
Cohesion: 0.26
Nodes (11): cbWeights(), convolve3(), curveLUT(), formatCurve(), hslShift(), medianImg(), parseCurve(), stretchLUT() (+3 more)

### Community 66 - "runDab"
Cohesion: 0.25
Nodes (4): Kind, runDab(), smooth(), strokeTo()

## Knowledge Gaps
- **359 isolated node(s):** `chain`, `name`, `version`, `description`, `type` (+354 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `adjust.ts` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `move.ts`, `selectops.ts`, `flatten`, `Tool`, `Kind`, `select2.tsx`, `contentAware.tsx`, `contentaware.ts`, `walk`, `training.check.ts`, `store.ts`, `paint.ts`, `findLayerIn`, `infoPanels.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `infoPanels.tsx` to `commands.ts`, `io.ts`, `retouch.tsx`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `touch`, `store.ts`, `select.ts`, `App.tsx`, `selectops.ts`, `flatten`, `Tool`, `select2.tsx`, `adjust.ts`, `contentAware.tsx`, `contentaware.ts`, `walk`, `training.check.ts`, `paint.ts`, `findLayerIn`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `makeCanvas()` connect `infoPanels.tsx` to `commands.ts`, `io.ts`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `store.ts`, `select.ts`, `App.tsx`, `selectops.ts`, `flatten`, `Tool`, `select2.tsx`, `adjust.ts`, `contentAware.tsx`, `contentaware.ts`, `walk`, `training.check.ts`, `paint.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `chain`, `name`, `version` to the rest of the system?**
  _359 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12318840579710146 - nodes in this community are weakly interconnected._
- **Should `retouch.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._