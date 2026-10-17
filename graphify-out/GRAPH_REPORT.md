# Graph Report - photoAgent  (2026-10-18)

## Corpus Check
- 87 files · ~225,237 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1550 nodes · 4850 edges · 67 communities (63 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 72 edges (avg confidence: 0.63)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `72f38c0e`
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
- training.check.ts
- controls.tsx
- filters-algo.check.ts
- LucentEdit Roadmap
- findLayerIn
- clamp
- contentAware.tsx
- factsFromAsset
- runDab
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
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `FilterDialog()` --indirect_call--> `on()`  [INFERRED]
  src/ui/dialogs.tsx → src/core/filters-algo.ts
- `onPaste()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/App.tsx → src/core/io.ts
- `Viewport()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/Viewport.tsx → src/core/io.ts
- `readPsdDoc()` --indirect_call--> `common()`  [INFERRED]
  src/core/io.ts → src/mcp/server.ts

## Import Cycles
- None detected.

## Communities (67 total, 4 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.04
Nodes (45): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+37 more)

### Community 1 - "commands.ts"
Cohesion: 0.12
Nodes (27): editSmartContents(), moveInto(), setClip(), deselect(), closeDoc(), openDocState(), restore(), select() (+19 more)

### Community 2 - "io.ts"
Cohesion: 0.18
Nodes (25): baseName(), deserializeDoc(), docFromFile(), elementToPathData(), extOf(), fileToOpened(), importSvg(), layersFromFile() (+17 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (37): historyShift, rgbToHsl(), bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool (+29 more)

### Community 4 - "server.ts"
Cohesion: 0.06
Nodes (66): actionForKey(), actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep() (+58 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (44): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, pdfjs-dist (+36 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.11
Nodes (32): esc(), ToolId, groupTools(), setTool(), toolById(), toolShortcut(), CUSTOM_SHAPES, commitText() (+24 more)

### Community 8 - "util.ts"
Cohesion: 0.14
Nodes (19): cssToPsFont(), psFontToCss(), WEIGHT_NAMES, serializeDoc(), apply(), BLEND, concat(), deflate() (+11 more)

### Community 9 - "panels.tsx"
Cohesion: 0.09
Nodes (14): boxSumEnd(), fbm(), FilterParam, keepLuma(), kuwahara(), luma(), lumaPlane(), on() (+6 more)

### Community 10 - "extra.tsx"
Cohesion: 0.09
Nodes (20): shapeOpts, addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, EXTRA_TOOLS, free, freeformTool (+12 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.12
Nodes (14): SelMode, floodWindow(), line(), lineMarquee(), magnetic, magneticLassoTool, poly, polyLassoTool (+6 more)

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.05
Nodes (68): applyH(), bern(), bezierPatch(), boundsOf(), a, assert, b, dst (+60 more)

### Community 15 - "select2.tsx"
Cohesion: 0.24
Nodes (20): psdMaskOut(), psdTextOut(), writePsdBytes(), flipContent(), flipLayers(), cssToRgb(), docToPdf(), flatten() (+12 more)

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
Nodes (31): marquee, wand, ellipseMarquee, GROUP_ORDER, groupCurrent, rectMarquee, ShapeKind, shapeVariant() (+23 more)

### Community 20 - "touch"
Cohesion: 0.19
Nodes (14): bg, cursorPos, useTick(), samplers, viewportSize, hex(), HistogramPanel(), InfoPanel() (+6 more)

### Community 21 - "store.ts"
Cohesion: 0.05
Nodes (84): Brand, trainingPath(), addCurrentDocument(), addTrainingFiles(), Archetype, archetypesOf(), area(), bodyOf() (+76 more)

### Community 22 - "select.ts"
Cohesion: 0.29
Nodes (12): gradientIn(), hex2(), hexToPsd(), psdAdjustIn(), psdAdjustOut(), psdColor(), psdEffectsIn(), psdEffectsOut() (+4 more)

### Community 23 - "App.tsx"
Cohesion: 0.19
Nodes (24): applyAdjust(), applyStroke(), checkerPattern(), composite(), drawContent(), drawLayer(), drawLayers(), drawShadowOnly() (+16 more)

### Community 24 - "move.ts"
Cohesion: 0.18
Nodes (4): ell, M, ours, psRect

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.06
Nodes (97): FALLBACK, FontFamily, fontWeights(), GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, tauriInvoke() (+89 more)

### Community 27 - "vector.ts"
Cohesion: 0.18
Nodes (22): buildSvg(), layerBoundsPx(), layerAt(), toPathProps(), arcToCubics(), bezierExtents(), Cubic, mapPaths() (+14 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (9): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+1 more)

### Community 29 - "flatten"
Cohesion: 0.15
Nodes (21): setProps(), maskTarget, historySource, FontSelect(), AdjustProps(), anchorRef, Appearance(), BLEND_LABEL() (+13 more)

### Community 30 - "Tool"
Cohesion: 0.13
Nodes (31): newAdjustment(), addLayer(), addMask(), commit(), cur(), selectedLayers(), onPaste(), applyBrandFonts() (+23 more)

### Community 31 - "Kind"
Cohesion: 0.12
Nodes (26): align(), distribute(), topLevel(), GroupLayer, Layer, bounds(), corners(), refreshGroups() (+18 more)

### Community 32 - "select2.tsx"
Cohesion: 0.09
Nodes (47): boxBlurAlpha(), canReselect(), colorRange(), ColorRangeTarget, drawQuickMaskOverlay(), flatData(), grow(), lastMask (+39 more)

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
Cohesion: 0.33
Nodes (4): defaultParams(), FILTERS, resolveParams(), renderHooks

### Community 47 - "contentAware.tsx"
Cohesion: 0.14
Nodes (19): exportBytes(), saveAs(), applyMask(), rasterize(), jumpTo(), redo(), syncSmartParent(), undo() (+11 more)

### Community 48 - "filters.ts"
Cohesion: 0.13
Nodes (18): AdjustLayer, Base, BlendMode, Doc, Effects, GlowFx, GradientStop, LayerMask (+10 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.14
Nodes (34): placeAsset(), AlignMode, base(), convertToSmart(), cropDoc(), deleteSelected(), duplicateSelected(), fitAdjustments() (+26 more)

### Community 51 - "training.check.ts"
Cohesion: 0.60
Nodes (5): curveLUT(), formatCurve(), parseCurve(), CHANNELS, CurvesEditor()

### Community 52 - "store.ts"
Cohesion: 0.10
Nodes (29): activeIndex, brush, bucket, curDoc(), DialogState, docs, gradientOpts, interaction (+21 more)

### Community 53 - "paint.ts"
Cohesion: 0.31
Nodes (10): rgbOf(), quickMaskStandIn(), cloneCanvas(), parseColor(), brushLike(), isDark(), makeDab(), maskStandIn() (+2 more)

### Community 54 - "findLayerIn"
Cohesion: 0.08
Nodes (27): featherSelection(), mcpStatus, TOOLS, beginTextEdit(), ActionDialogs(), App(), isTyping(), onKeyDown() (+19 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.14
Nodes (31): FilterDef, applyFilter(), filteredCopy(), editablePixels(), flattenImage(), mergeDown(), newRaster(), clearSelection() (+23 more)

### Community 57 - "training.check.ts"
Cohesion: 0.40
Nodes (5): blurImg(), blurRGBA(), boxPlane(), copyImg(), unsharp()

### Community 58 - "controls.tsx"
Cohesion: 0.13
Nodes (16): Gradient, Paint, hsvToRgb(), hx(), normHex(), rgbToHsv(), toHex(), ColorPickerPopover() (+8 more)

### Community 59 - "filters-algo.check.ts"
Cohesion: 0.18
Nodes (8): c, grouped, id, ids, menuFilters, rows, filterSubmenus(), Img

### Community 60 - "LucentEdit Roadmap"
Cohesion: 0.40
Nodes (5): n(), edgePath(), snapToEdge(), hslToRgb(), magLive()

### Community 61 - "findLayerIn"
Cohesion: 0.50
Nodes (4): DocState, RasterLayer, Stroke, Stroke

### Community 62 - "clamp"
Cohesion: 0.25
Nodes (8): cbWeights(), convolve3(), hslShift(), medianImg(), minmaxLine(), rankMinMax(), stretchLUT(), clamp()

### Community 63 - "contentAware.tsx"
Cohesion: 0.30
Nodes (11): autoSampleRect(), alphaCanvas(), close(), contentAwareFill(), FillDialog(), FillOpts, progress, ProgressDialog() (+3 more)

### Community 64 - "factsFromAsset"
Cohesion: 0.50
Nodes (4): finish(), magAnchor(), magClose(), polyClose()

### Community 66 - "runDab"
Cohesion: 0.24
Nodes (5): Kind, runDab(), smooth(), strokeTo(), PEvent

### Community 68 - "findLayerIn"
Cohesion: 0.11
Nodes (23): ExportFormat, psdBlendIn(), readPath(), layerSummary(), whenIdle(), BLEND_MODES, findLayerIn, BRAND_SCHEMA (+15 more)

## Knowledge Gaps
- **363 isolated node(s):** `chain`, `name`, `version`, `description`, `type` (+358 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `Tool` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `selectops.ts`, `vector.ts`, `flatten`, `Kind`, `select2.tsx`, `contentAware.tsx`, `walk`, `store.ts`, `paint.ts`, `findLayerIn`, `infoPanels.tsx`, `contentAware.tsx`, `factsFromAsset`, `findLayerIn`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `select2.tsx` to `commands.ts`, `io.ts`, `retouch.tsx`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `touch`, `store.ts`, `App.tsx`, `selectops.ts`, `vector.ts`, `Tool`, `Kind`, `select2.tsx`, `contentAware.tsx`, `walk`, `paint.ts`, `findLayerIn`, `infoPanels.tsx`, `contentAware.tsx`, `findLayerIn`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `toast` connect `infoPanels.tsx` to `commands.ts`, `retouch.tsx`, `server.ts`, `findLayerIn`, `extra.tsx`, `cur`, `contentAware.tsx`, `select2.tsx`, `walk`, `store.ts`, `paint.ts`, `findLayerIn`, `store.ts`, `selectops.ts`, `Tool`, `contentAware.tsx`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **What connects `chain`, `name`, `version` to the rest of the system?**
  _363 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12183908045977011 - nodes in this community are weakly interconnected._
- **Should `retouch.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.04081632653061224 - nodes in this community are weakly interconnected._