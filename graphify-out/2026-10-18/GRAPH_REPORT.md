# Graph Report - photoAgent  (2026-10-18)

## Corpus Check
- 82 files · ~216,270 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1493 nodes · 4656 edges · 63 communities (58 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `647f8b55`
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
- training.ts
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
- training.ts
- controls.tsx
- findLayerIn
- runDab
- infoPanels.tsx
- filters-algo.check.ts
- layerMatrix
- clamp
- assetThumb
- findLayerIn
- cloneLayers

## God Nodes (most connected - your core abstractions)
1. `cur()` - 131 edges
2. `commit()` - 90 edges
3. `ctx2d()` - 89 edges
4. `touch()` - 83 edges
5. `makeCanvas()` - 73 edges
6. `toast` - 62 edges
7. `activeLayer()` - 45 edges
8. `flatten()` - 34 edges
9. `addLayer()` - 31 edges
10. `selectedLayers()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `FilterDialog()` --indirect_call--> `on()`  [INFERRED]
  src/ui/dialogs.tsx → src/core/filters-algo.ts
- `Viewport()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/Viewport.tsx → src/core/io.ts
- `MenuBar()` --indirect_call--> `esc()`  [INFERRED]
  src/ui/chrome.tsx → src/core/io.ts
- `previewDataURL()` --calls--> `flatten()`  [EXTRACTED]
  src/core/io.ts → src/core/render.ts

## Import Cycles
- None detected.

## Communities (63 total, 5 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.04
Nodes (46): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+38 more)

### Community 1 - "commands.ts"
Cohesion: 0.12
Nodes (20): readPath(), layerSummary(), docs, whenIdle(), findLayerIn, BRAND_SCHEMA, common(), docInfo() (+12 more)

### Community 2 - "io.ts"
Cohesion: 0.15
Nodes (15): rgbOf(), corners(), dataURLToBytes(), hslToRgb(), hsvToRgb(), hx(), loadImage(), normHex() (+7 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (36): brush, historyShift, bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool (+28 more)

### Community 4 - "server.ts"
Cohesion: 0.07
Nodes (63): actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep(), dialogClosed() (+55 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (42): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+34 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.10
Nodes (34): quickMask, closeDoc(), ToolId, groupTools(), setTool(), toolById(), toolShortcut(), commitText() (+26 more)

### Community 8 - "util.ts"
Cohesion: 0.21
Nodes (23): baseName(), deserializeDoc(), docFromFile(), elementToPathData(), extOf(), importSvg(), layersFromFile(), MIME (+15 more)

### Community 9 - "panels.tsx"
Cohesion: 0.08
Nodes (21): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), copyImg(), fbm(), FilterParam, keepLuma() (+13 more)

### Community 10 - "extra.tsx"
Cohesion: 0.08
Nodes (31): toPathProps(), shapeOpts, strokeColor, SubPath, addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool (+23 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.12
Nodes (12): ExportFormat, mcpStatus, TOOLS, lastFilter, prettyKeys(), Dialogs(), Palette(), PresetCard() (+4 more)

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.06
Nodes (64): MaskMeta, Rect, applyH(), bern(), bezierPatch(), boundsOf(), a, assert (+56 more)

### Community 15 - "select2.tsx"
Cohesion: 0.09
Nodes (28): modifyBorder(), modifyContract(), modifyExpand(), SelMode, border(), dilate(), edgePath(), erode() (+20 more)

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
Nodes (27): marquee, wand, ellipseMarquee, GROUP_ORDER, groupCurrent, rectMarquee, ShapeKind, shapeVariant() (+19 more)

### Community 20 - "touch"
Cohesion: 0.18
Nodes (15): bg, cursorPos, fg, useTick(), sampleAt(), samplers, viewportSize, hex() (+7 more)

### Community 21 - "store.ts"
Cohesion: 0.13
Nodes (25): Archetype, archetypesOf(), area(), bodyOf(), buildProfile(), Check, contains(), El (+17 more)

### Community 22 - "select.ts"
Cohesion: 0.16
Nodes (15): addMask(), deleteSelected(), MaskMode, copyPixels(), clip, copy(), FILTER_KEYS, hasDoc() (+7 more)

### Community 23 - "App.tsx"
Cohesion: 0.18
Nodes (25): applyAdjust(), applyStroke(), checkerPattern(), composite(), drawContent(), drawLayer(), drawLayers(), drawShadowOnly() (+17 more)

### Community 24 - "move.ts"
Cohesion: 0.16
Nodes (16): layerAt(), viewOpts, layerMatrix(), applied, boxMatrix(), drawPill(), drawTransformBox(), guides (+8 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.06
Nodes (91): FALLBACK, FontFamily, fontWeights(), GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, tauriInvoke() (+83 more)

### Community 27 - "vector.ts"
Cohesion: 0.24
Nodes (12): buildSvg(), esc(), arcToCubics(), bezierExtents(), Cubic, node(), parseSvgPath(), pathBounds() (+4 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (9): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+1 more)

### Community 29 - "flatten"
Cohesion: 0.12
Nodes (25): setProps(), maskTarget, historySource, FontSelect(), updateText(), SwatchesPanel(), AdjustProps(), anchorRef (+17 more)

### Community 30 - "Tool"
Cohesion: 0.18
Nodes (27): applyMask(), flattenImage(), flipContent(), flipLayers(), rasterize(), transformCanvas(), flatten(), clearSelection() (+19 more)

### Community 31 - "Kind"
Cohesion: 0.25
Nodes (4): Kind, runDab(), smooth(), strokeTo()

### Community 32 - "training.ts"
Cohesion: 0.17
Nodes (24): Brand, trainingPath(), addCurrentDocument(), addTrainingFiles(), Bucket, FitResult, brandFonts(), brandStyles (+16 more)

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
Nodes (27): activeIndex, bucket, curDoc(), DialogState, gradientOpts, interaction, needsFit, paint (+19 more)

### Community 47 - "contentAware.tsx"
Cohesion: 0.14
Nodes (36): autoSampleRect(), addLayer(), editablePixels(), mergeDown(), newRaster(), alphaCanvas(), maskForLayer(), pixelMatrix() (+28 more)

### Community 48 - "filters.ts"
Cohesion: 0.13
Nodes (18): AdjustLayer, Base, BlendMode, Doc, Effects, GlowFx, GradientStop, GroupLayer (+10 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.11
Nodes (54): align(), AlignMode, base(), convertToSmart(), cropDoc(), distribute(), duplicateSelected(), editSmartContents() (+46 more)

### Community 51 - "training.check.ts"
Cohesion: 0.09
Nodes (21): center(), clean(), inferRoles(), NAME_RULES, RawEl, all, bad, boxAt() (+13 more)

### Community 52 - "training.ts"
Cohesion: 0.18
Nodes (20): placeAsset(), readAsset(), newText(), openDocState(), colorDist(), Facts, lum(), parseHex() (+12 more)

### Community 53 - "controls.tsx"
Cohesion: 0.17
Nodes (10): Gradient, Paint, evalNum(), NumField(), PaintEditor(), PickerReq, PRESETS, recent (+2 more)

### Community 54 - "findLayerIn"
Cohesion: 0.15
Nodes (21): actionForKey(), fileToOpened(), OpenedFile, pickFiles(), toasts, beginTextEdit(), ActionDialogs(), App() (+13 more)

### Community 55 - "runDab"
Cohesion: 0.11
Nodes (37): boxBlurAlpha(), canReselect(), colorRange(), ColorRangeTarget, drawQuickMaskOverlay(), featherSelection(), flatData(), grow() (+29 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.10
Nodes (36): setClip(), deselect(), invertSelection(), maskBounds(), cur(), jumpTo(), redo(), restore() (+28 more)

### Community 57 - "filters-algo.check.ts"
Cohesion: 0.15
Nodes (10): c, grouped, id, ids, menuFilters, rows, defaultParams(), filterSubmenus() (+2 more)

### Community 58 - "layerMatrix"
Cohesion: 0.25
Nodes (8): exportBytes(), layerBoundsPx(), saveAs(), serializeDoc(), writePsdBytes(), canvasToBlob(), downloadBlob(), ExportDialog()

### Community 59 - "clamp"
Cohesion: 0.26
Nodes (11): cbWeights(), convolve3(), curveLUT(), formatCurve(), hslShift(), medianImg(), parseCurve(), stretchLUT() (+3 more)

### Community 62 - "cloneLayers"
Cohesion: 0.18
Nodes (13): newAdjustment(), filterById(), FilterDef, FILTERS, applyFilter(), filteredCopy(), DocState, Layer (+5 more)

## Knowledge Gaps
- **355 isolated node(s):** `chain`, `name`, `version`, `description`, `type` (+350 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `infoPanels.tsx` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `select.ts`, `move.ts`, `selectops.ts`, `flatten`, `Tool`, `training.ts`, `adjust.ts`, `contentAware.tsx`, `walk`, `training.ts`, `findLayerIn`, `runDab`, `layerMatrix`, `cloneLayers`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **Why does `commit()` connect `walk` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `adjust.ts`, `contentAware.tsx`, `cur`, `training.ts`, `select.ts`, `cloneLayers`, `infoPanels.tsx`, `move.ts`, `selectops.ts`, `findLayerIn`, `flatten`, `Tool`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `touch()` connect `infoPanels.tsx` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `select.ts`, `move.ts`, `selectops.ts`, `flatten`, `Tool`, `Kind`, `adjust.ts`, `contentAware.tsx`, `walk`, `training.ts`, `runDab`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `chain`, `name`, `version` to the rest of the system?**
  _355 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11956521739130435 - nodes in this community are weakly interconnected._
- **Should `retouch.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._