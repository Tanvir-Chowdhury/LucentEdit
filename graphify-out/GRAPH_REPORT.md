# Graph Report - photoAgent  (2026-10-18)

## Corpus Check
- 82 files · ~216,270 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1493 nodes · 4559 edges · 57 communities (52 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 59 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `58409221`
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
- findLayerIn
- infoPanels.tsx
- filters-algo.check.ts
- clamp
- assetThumb
- findLayerIn
- cloneLayers

## God Nodes (most connected - your core abstractions)
1. `cur()` - 126 edges
2. `commit()` - 86 edges
3. `ctx2d()` - 83 edges
4. `touch()` - 81 edges
5. `makeCanvas()` - 68 edges
6. `toast` - 60 edges
7. `activeLayer()` - 45 edges
8. `selectedLayers()` - 31 edges
9. `findLayer()` - 31 edges
10. `flatten()` - 30 edges

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

## Communities (57 total, 5 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.04
Nodes (46): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+38 more)

### Community 1 - "commands.ts"
Cohesion: 0.09
Nodes (36): layerSummary(), newPath(), removeLayers(), reorder(), toPaint(), toStroke(), ungroup(), activeIndex (+28 more)

### Community 2 - "io.ts"
Cohesion: 0.09
Nodes (25): rgbOf(), Gradient, Paint, canvasToBlob(), corners(), dataURLToBytes(), downloadBlob(), hslToRgb() (+17 more)

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
Cohesion: 0.12
Nodes (27): quickMask, groupTools(), commitText(), filterMenu(), flyout, FONTS, hideTip(), MenuBar() (+19 more)

### Community 8 - "util.ts"
Cohesion: 0.18
Nodes (24): baseName(), deserializeDoc(), docFromFile(), elementToPathData(), extOf(), importSvg(), layersFromFile(), MIME (+16 more)

### Community 9 - "panels.tsx"
Cohesion: 0.08
Nodes (22): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), copyImg(), defaultParams(), fbm(), FilterParam (+14 more)

### Community 10 - "extra.tsx"
Cohesion: 0.08
Nodes (31): toPathProps(), shapeOpts, strokeColor, PathNode, hx(), addAnchorTool, anchorsOverlay(), convertPointTool (+23 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.12
Nodes (12): ExportFormat, mcpStatus, TOOLS, lastFilter, prettyKeys(), Dialogs(), Palette(), PresetCard() (+4 more)

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.05
Nodes (68): MaskMeta, Rect, applyH(), bern(), bezierPatch(), boundsOf(), a, assert (+60 more)

### Community 15 - "select2.tsx"
Cohesion: 0.06
Nodes (51): canReselect(), colorRange(), flatData(), grow(), modify(), modifyBorder(), modifyContract(), modifyExpand() (+43 more)

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
Nodes (28): marquee, wand, ellipseMarquee, GROUP_ORDER, groupCurrent, rectMarquee, ShapeKind, shapeVariant() (+20 more)

### Community 20 - "touch"
Cohesion: 0.11
Nodes (25): bg, bucket, closeDoc(), curDoc(), cursorPos, DialogState, fg, gradientOpts (+17 more)

### Community 21 - "store.ts"
Cohesion: 0.05
Nodes (85): Brand, trainingPath(), addCurrentDocument(), addTrainingFiles(), Archetype, archetypesOf(), area(), bodyOf() (+77 more)

### Community 22 - "select.ts"
Cohesion: 0.22
Nodes (9): readPath(), whenIdle(), handleMcp(), handleOne(), loadSource(), PROTOCOLS, startMcpBridge(), toContent() (+1 more)

### Community 23 - "App.tsx"
Cohesion: 0.19
Nodes (25): applyAdjust(), applyStroke(), checkerPattern(), composite(), cssFamily(), drawContent(), drawLayer(), drawLayers() (+17 more)

### Community 24 - "move.ts"
Cohesion: 0.17
Nodes (14): viewOpts, applied, boxMatrix(), drawPill(), drawTransformBox(), guides, handlePoints(), hitHandle() (+6 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.06
Nodes (90): FALLBACK, FontFamily, fontWeights(), GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, activeBrand (+82 more)

### Community 27 - "vector.ts"
Cohesion: 0.23
Nodes (15): buildSvg(), esc(), arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths() (+7 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (9): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+1 more)

### Community 29 - "flatten"
Cohesion: 0.13
Nodes (23): maskTarget, historySource, FontSelect(), SwatchesPanel(), AdjustProps(), anchorRef, Appearance(), BLEND_LABEL() (+15 more)

### Community 30 - "Tool"
Cohesion: 0.12
Nodes (47): writePsdBytes(), flipContent(), flipLayers(), transformCanvas(), flatten(), renderLayerToDocCanvas(), alphaCanvas(), boxBlurAlpha() (+39 more)

### Community 31 - "Kind"
Cohesion: 0.25
Nodes (4): Kind, runDab(), smooth(), strokeTo()

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
Cohesion: 0.15
Nodes (23): layerBoundsPx(), layerAt(), interaction, needsFit, paint, tick, usePaint(), layerMatrix() (+15 more)

### Community 47 - "contentAware.tsx"
Cohesion: 0.19
Nodes (27): autoSampleRect(), addLayer(), editablePixels(), mergeDown(), newRaster(), activeLayer(), toast, paintTarget() (+19 more)

### Community 48 - "filters.ts"
Cohesion: 0.13
Nodes (18): AdjustLayer, Base, BlendMode, Doc, Effects, GlowFx, GradientStop, GroupLayer (+10 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.11
Nodes (53): addMask(), align(), AlignMode, applyMask(), base(), convertToSmart(), cropDoc(), deleteSelected() (+45 more)

### Community 54 - "findLayerIn"
Cohesion: 0.17
Nodes (21): actionForKey(), fileToOpened(), pickFiles(), setTool(), toolById(), toolShortcut(), beginTextEdit(), ActionDialogs() (+13 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.09
Nodes (40): exportBytes(), saveAs(), editSmartContents(), moveInto(), setClip(), deselect(), cur(), openDocState() (+32 more)

### Community 57 - "filters-algo.check.ts"
Cohesion: 0.18
Nodes (8): c, grouped, id, ids, menuFilters, rows, filterSubmenus(), Img

### Community 59 - "clamp"
Cohesion: 0.26
Nodes (11): cbWeights(), convolve3(), curveLUT(), formatCurve(), hslShift(), medianImg(), parseCurve(), stretchLUT() (+3 more)

### Community 62 - "cloneLayers"
Cohesion: 0.20
Nodes (14): newAdjustment(), filterById(), FilterDef, FILTERS, resolveParams(), applyFilter(), filteredCopy(), DocState (+6 more)

## Knowledge Gaps
- **355 isolated node(s):** `Palette`, `BRAND_CATEGORIES`, `TRAINING_BUCKETS`, `Meta`, `DEFAULT_CATEGORIES` (+350 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `infoPanels.tsx` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `select.ts`, `move.ts`, `selectops.ts`, `flatten`, `Tool`, `adjust.ts`, `contentAware.tsx`, `walk`, `findLayerIn`, `cloneLayers`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **Why does `touch()` connect `infoPanels.tsx` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `move.ts`, `selectops.ts`, `flatten`, `Tool`, `Kind`, `adjust.ts`, `contentAware.tsx`, `walk`, `findLayerIn`, `cloneLayers`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `toast` connect `contentAware.tsx` to `retouch.tsx`, `server.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `adjust.ts`, `walk`, `touch`, `store.ts`, `findLayerIn`, `select.ts`, `infoPanels.tsx`, `cloneLayers`, `selectops.ts`, `Tool`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `Palette`, `BRAND_CATEGORIES`, `TRAINING_BUCKETS` to the rest of the system?**
  _355 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09390243902439024 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08817204301075268 - nodes in this community are weakly interconnected._