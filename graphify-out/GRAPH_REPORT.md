# Graph Report - photoAgent  (2026-10-18)

## Corpus Check
- 89 files · ~230,111 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1580 nodes · 4920 edges · 66 communities (62 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 73 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3a285d72`
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
- training.check.ts
- util.ts
- filters.ts
- contentaware.ts
- walk
- adjust.ts
- store.ts
- paint.ts
- findLayerIn
- warp.check.ts
- infoPanels.tsx
- aiformat.ts
- controls.tsx
- psdx.ts
- clamp
- findLayerIn
- LiquifyDialog.tsx
- contentAware.tsx
- walk
- findLayerIn

## God Nodes (most connected - your core abstractions)
1. `cur()` - 131 edges
2. `ctx2d()` - 94 edges
3. `commit()` - 90 edges
4. `touch()` - 83 edges
5. `makeCanvas()` - 79 edges
6. `toast` - 62 edges
7. `activeLayer()` - 45 edges
8. `flatten()` - 36 edges
9. `addLayer()` - 31 edges
10. `selectedLayers()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `aiToSvg()` --indirect_call--> `line()`  [INFERRED]
  src/core/aiformat.ts → src/tools/select2.tsx
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `FilterDialog()` --indirect_call--> `on()`  [INFERRED]
  src/ui/dialogs.tsx → src/core/filters-algo.ts
- `vectorFileToSvg()` --indirect_call--> `psFontToCss()`  [INFERRED]
  src/core/io.ts → src/core/fontnames.ts
- `onPaste()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/App.tsx → src/core/io.ts

## Import Cycles
- None detected.

## Communities (66 total, 4 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.04
Nodes (45): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+37 more)

### Community 1 - "commands.ts"
Cohesion: 0.25
Nodes (9): setClip(), closeDoc(), touch(), resetRotation(), applyCrop(), cancelCrop(), Tabs(), PrefsDialog() (+1 more)

### Community 2 - "io.ts"
Cohesion: 0.12
Nodes (30): archetypesOf(), area(), bodyOf(), buildProfile(), center(), Check, colorDist(), contains() (+22 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (35): bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts, cloneStampTool (+27 more)

### Community 4 - "server.ts"
Cohesion: 0.08
Nodes (55): actionForKey(), actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep() (+47 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (44): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, pdfjs-dist (+36 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.10
Nodes (30): quickMask, ToolId, groupTools(), setTool(), toolShortcut(), filterMenu(), flyout, FONTS (+22 more)

### Community 8 - "util.ts"
Cohesion: 0.12
Nodes (25): cssToPsFont(), psFontToCss(), WEIGHT_NAMES, serializeDoc(), apply(), BLEND, concat(), deflate() (+17 more)

### Community 9 - "panels.tsx"
Cohesion: 0.08
Nodes (21): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), copyImg(), fbm(), FilterParam, keepLuma() (+13 more)

### Community 10 - "extra.tsx"
Cohesion: 0.07
Nodes (32): shapeOpts, strokeColor, PathNode, addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, EXTRA_TOOLS (+24 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.09
Nodes (28): deselect(), border(), dilate(), edgePath(), erode(), floodWindow(), gradientMagnitude(), luma() (+20 more)

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (36): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+28 more)

### Community 14 - "cur"
Cohesion: 0.05
Nodes (65): applyH(), bern(), bezierPatch(), boundsOf(), a, assert, b, dst (+57 more)

### Community 15 - "select2.tsx"
Cohesion: 0.25
Nodes (4): Kind, runDab(), smooth(), strokeTo()

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
Cohesion: 0.07
Nodes (29): marquee, wand, ellipseMarquee, GROUP_ORDER, groupCurrent, handTool, rectMarquee, registerTools() (+21 more)

### Community 20 - "touch"
Cohesion: 0.11
Nodes (22): bg, bucket, curDoc(), cursorPos, DialogState, fg, gradientOpts, historyShift (+14 more)

### Community 21 - "store.ts"
Cohesion: 0.14
Nodes (34): Brand, readAsset(), trainingPath(), addCurrentDocument(), addTrainingFiles(), Archetype, Bucket, FitResult (+26 more)

### Community 22 - "select.ts"
Cohesion: 0.10
Nodes (30): duplicateSelected(), groupSelected(), layerSummary(), newPath(), newShape(), reorder(), toPaint(), toStroke() (+22 more)

### Community 23 - "App.tsx"
Cohesion: 0.26
Nodes (19): applyStroke(), composite(), drawContent(), drawLayer(), drawLayers(), drawShadowOnly(), drawShape(), drawText() (+11 more)

### Community 24 - "move.ts"
Cohesion: 0.18
Nodes (4): ell, M, ours, psRect

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.06
Nodes (93): FALLBACK, FontFamily, fontWeights(), GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, tauriInvoke() (+85 more)

### Community 27 - "vector.ts"
Cohesion: 0.21
Nodes (16): buildSvg(), esc(), arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths() (+8 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (10): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+2 more)

### Community 29 - "flatten"
Cohesion: 0.12
Nodes (26): setProps(), thumbnail(), historySource, hex(), InfoPanel(), SwatchesPanel(), AdjustProps(), anchorRef (+18 more)

### Community 30 - "Tool"
Cohesion: 0.15
Nodes (34): exportBytes(), saveAs(), addLayer(), editablePixels(), newRaster(), maskBounds(), cur(), toast (+26 more)

### Community 31 - "Kind"
Cohesion: 0.17
Nodes (14): MaskMeta, viewOpts, Layer, Rect, applied, boxMatrix(), guides, handlePoints() (+6 more)

### Community 32 - "select2.tsx"
Cohesion: 0.11
Nodes (37): boxBlurAlpha(), canReselect(), colorRange(), ColorRangeTarget, flatData(), grow(), lastMask, loadSelection() (+29 more)

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

### Community 46 - "training.check.ts"
Cohesion: 0.08
Nodes (23): clean(), Facts, inferRoles(), NAME_RULES, Profile, RawEl, all, bad (+15 more)

### Community 47 - "util.ts"
Cohesion: 0.15
Nodes (18): align(), distribute(), topLevel(), Doc, bounds(), canvasToBlob(), corners(), dataURLToBytes() (+10 more)

### Community 48 - "filters.ts"
Cohesion: 0.16
Nodes (15): Base, BlendMode, Effects, GlowFx, GradientStop, GroupLayer, LayerMask, ShadowFx (+7 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.22
Nodes (18): placeAsset(), AlignMode, base(), convertToSmart(), cropDoc(), fitAdjustments(), flipContent(), flipLayers() (+10 more)

### Community 51 - "adjust.ts"
Cohesion: 0.13
Nodes (15): newAdjustment(), c, grouped, id, ids, menuFilters, rows, defaultParams() (+7 more)

### Community 52 - "store.ts"
Cohesion: 0.19
Nodes (22): layerAt(), removeLayers(), restore(), usePaint(), findLayer(), layerMatrix(), place(), toolById() (+14 more)

### Community 53 - "paint.ts"
Cohesion: 0.10
Nodes (45): FilterDef, applyFilter(), filteredCopy(), psdMaskOut(), assetPreviewPNG(), downscaled(), addMask(), flattenImage() (+37 more)

### Community 54 - "findLayerIn"
Cohesion: 0.08
Nodes (30): ExportFormat, featherSelection(), brush, tool, App(), isTyping(), onKeyDown(), onKeyUp() (+22 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.14
Nodes (30): applyMask(), deleteSelected(), rasterize(), clearSelection(), activeLayer(), commit(), selectedLayers(), commitText() (+22 more)

### Community 57 - "aiformat.ts"
Cohesion: 0.18
Nodes (16): AiParse, aiToSvg(), dos, ps, r, t, cmyk(), epsPostScript() (+8 more)

### Community 58 - "controls.tsx"
Cohesion: 0.12
Nodes (19): rgbOf(), Gradient, Paint, hsvToRgb(), hx(), normHex(), parseColor(), rgbToHsv() (+11 more)

### Community 59 - "psdx.ts"
Cohesion: 0.23
Nodes (16): hexColors(), layerBoundsPx(), psdTextOut(), writePsdBytes(), cssToRgb(), gradientIn(), hex2(), hexToPsd() (+8 more)

### Community 60 - "clamp"
Cohesion: 0.26
Nodes (11): cbWeights(), convolve3(), curveLUT(), formatCurve(), hslShift(), medianImg(), parseCurve(), stretchLUT() (+3 more)

### Community 61 - "findLayerIn"
Cohesion: 0.20
Nodes (11): editSmartContents(), jumpTo(), openDocState(), redo(), snapshotOf(), syncSmartParent(), undo(), cloneLayers() (+3 more)

### Community 62 - "LiquifyDialog.tsx"
Cohesion: 0.27
Nodes (10): dialog, Field, liquifyDab(), liquifyRender(), newField(), sampleField(), Liquify(), LiquifyDialog() (+2 more)

### Community 63 - "contentAware.tsx"
Cohesion: 0.30
Nodes (11): autoSampleRect(), alphaCanvas(), close(), contentAwareFill(), FillDialog(), FillOpts, progress, ProgressDialog() (+3 more)

### Community 64 - "walk"
Cohesion: 0.60
Nodes (6): moveInto(), select(), walk(), LayerRow(), LayersPanel(), selectAdjacent()

### Community 68 - "findLayerIn"
Cohesion: 0.12
Nodes (36): baseName(), deserializeDoc(), docFromFile(), elementToPathData(), extOf(), fileToOpened(), importSvg(), layersFromFile() (+28 more)

## Knowledge Gaps
- **369 isolated node(s):** `chain`, `name`, `version`, `description`, `type` (+364 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `Tool` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `index.ts`, `touch`, `store.ts`, `select.ts`, `selectops.ts`, `flatten`, `Kind`, `select2.tsx`, `util.ts`, `walk`, `store.ts`, `paint.ts`, `findLayerIn`, `infoPanels.tsx`, `findLayerIn`, `LiquifyDialog.tsx`, `contentAware.tsx`, `walk`, `findLayerIn`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `touch()` connect `commands.ts` to `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `select.ts`, `selectops.ts`, `flatten`, `Tool`, `Kind`, `select2.tsx`, `util.ts`, `walk`, `store.ts`, `paint.ts`, `findLayerIn`, `infoPanels.tsx`, `findLayerIn`, `walk`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `commit()` connect `infoPanels.tsx` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `cur`, `touch`, `store.ts`, `select.ts`, `selectops.ts`, `flatten`, `Tool`, `Kind`, `util.ts`, `walk`, `store.ts`, `paint.ts`, `findLayerIn`, `findLayerIn`, `LiquifyDialog.tsx`, `contentAware.tsx`, `walk`, `findLayerIn`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `chain`, `name`, `version` to the rest of the system?**
  _369 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12121212121212122 - nodes in this community are weakly interconnected._
- **Should `retouch.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._