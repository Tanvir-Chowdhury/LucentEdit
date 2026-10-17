# Graph Report - photoAgent  (2026-10-14)

## Corpus Check
- 80 files · ~147,486 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1455 nodes · 4221 edges · 63 communities (58 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 56 edges (avg confidence: 0.58)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5e2c30e6`
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
- FontPicker.tsx
- filters-algo.check.ts
- controls.tsx
- findLayerIn
- runDab
- infoPanels.tsx
- warp.ts
- layerMatrix
- Tool
- assetThumb
- findLayerIn
- cloneLayers

## God Nodes (most connected - your core abstractions)
1. `cur()` - 112 edges
2. `ctx2d()` - 71 edges
3. `commit()` - 68 edges
4. `touch()` - 65 edges
5. `makeCanvas()` - 56 edges
6. `toast` - 42 edges
7. `activeLayer()` - 40 edges
8. `flatten()` - 27 edges
9. `addLayer()` - 26 edges
10. `Viewport()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `Viewport()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/Viewport.tsx → src/core/io.ts
- `MenuBar()` --indirect_call--> `esc()`  [INFERRED]
  src/ui/chrome.tsx → src/core/io.ts
- `previewDataURL()` --calls--> `flatten()`  [EXTRACTED]
  src/core/io.ts → src/core/render.ts
- `hasDoc()` --calls--> `cur()`  [EXTRACTED]
  src/ui/commands.ts → src/core/store.ts

## Import Cycles
- None detected.

## Communities (63 total, 5 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.04
Nodes (45): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+37 more)

### Community 1 - "commands.ts"
Cohesion: 0.11
Nodes (19): psdBlendIn(), layerSummary(), ok(), BLEND_MODES, BRAND_SCHEMA, callTool(), common(), docInfo() (+11 more)

### Community 2 - "io.ts"
Cohesion: 0.21
Nodes (13): topLevel(), bounds(), corners(), dataURLToBytes(), hslToRgb(), refreshGroups(), RGBA, rgbToHsl() (+5 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (34): bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts, cloneStampTool (+26 more)

### Community 4 - "server.ts"
Cohesion: 0.06
Nodes (68): actionForKey(), actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep() (+60 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (42): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+34 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.11
Nodes (28): quickMask, closeDoc(), ToolId, groupCurrent, groupTools(), setTool(), toolById(), CUSTOM_SHAPES (+20 more)

### Community 8 - "util.ts"
Cohesion: 0.18
Nodes (24): baseName(), deserializeDoc(), docFromFile(), elementToPathData(), ExportFormat, extOf(), importSvg(), layersFromFile() (+16 more)

### Community 9 - "panels.tsx"
Cohesion: 0.07
Nodes (23): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), copyImg(), defaultParams(), fbm(), FilterParam (+15 more)

### Community 10 - "extra.tsx"
Cohesion: 0.10
Nodes (26): toPathProps(), shapeOpts, PathNode, ShapeLayer, SubPath, addAnchorTool, anchorsOverlay(), convertPointTool (+18 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.12
Nodes (6): applyMask(), rasterize(), Dialogs(), FilterDialog(), PresetCard(), PRESETS

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.05
Nodes (69): applyH(), bern(), bezierPatch(), boundsOf(), a, assert, b, dst (+61 more)

### Community 15 - "select2.tsx"
Cohesion: 0.11
Nodes (20): deselect(), SelMode, edgePath(), floodWindow(), snapToEdge(), finish(), flatImage(), magAnchor() (+12 more)

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
Nodes (31): marquee, wand, ellipseMarquee, GROUP_ORDER, rectMarquee, ShapeKind, shapeVariant(), TOOLS (+23 more)

### Community 20 - "touch"
Cohesion: 0.18
Nodes (17): layerAt(), interaction, needsFit, paint, tick, tool, usePaint(), handTool (+9 more)

### Community 21 - "store.ts"
Cohesion: 0.07
Nodes (50): Archetype, archetypesOf(), area(), bodyOf(), buildProfile(), center(), Check, clean() (+42 more)

### Community 22 - "select.ts"
Cohesion: 0.15
Nodes (22): addLayer(), deleteSelected(), duplicateSelected(), flattenImage(), mergeDown(), newRaster(), copyPixels(), fillSelection() (+14 more)

### Community 23 - "App.tsx"
Cohesion: 0.26
Nodes (19): applyStroke(), composite(), drawContent(), drawLayer(), drawLayers(), drawShadowOnly(), drawShape(), drawText() (+11 more)

### Community 24 - "move.ts"
Cohesion: 0.13
Nodes (19): MaskMeta, viewOpts, Layer, Rect, applied, boxMatrix(), drawPill(), drawTransformBox() (+11 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.10
Nodes (44): activeBrand, Asset, assetPath(), BRAND_CATEGORIES, BrandColor, BrandFont, browserFS(), connect() (+36 more)

### Community 27 - "vector.ts"
Cohesion: 0.29
Nodes (12): arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths(), parseSvgPath(), pathBounds() (+4 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (10): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+2 more)

### Community 29 - "flatten"
Cohesion: 0.07
Nodes (47): editSmartContents(), moveInto(), thumbnail(), cursorPos, select(), useTick(), containerOf(), walk() (+39 more)

### Community 30 - "Tool"
Cohesion: 0.15
Nodes (38): FilterDef, applyFilter(), filteredCopy(), psdMaskIn(), editablePixels(), applyAdjust(), checkerPattern(), flatten() (+30 more)

### Community 31 - "Kind"
Cohesion: 0.20
Nodes (5): Kind, runDab(), smooth(), strokeTo(), PEvent

### Community 32 - "training.ts"
Cohesion: 0.13
Nodes (38): Brand, placeAsset(), readAsset(), readLibraryText(), registerFonts(), trainingPath(), scaleLayer(), addCurrentDocument() (+30 more)

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
Cohesion: 0.15
Nodes (28): brandByName(), categoryLabel(), chooseLibraryFolder(), createBrand(), deleteBrand(), disconnectLibrary(), library, librarySupported() (+20 more)

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

### Community 46 - "adjust.ts"
Cohesion: 0.21
Nodes (14): AlignMode, cropDoc(), fitAdjustments(), flipContent(), flipLayers(), MaskMode, reorder(), resizeCanvas() (+6 more)

### Community 47 - "contentAware.tsx"
Cohesion: 0.19
Nodes (13): autoSampleRect(), Command, close(), ContentAwareDialogs(), FillDialog(), FillOpts, progress, ProgressDialog() (+5 more)

### Community 48 - "filters.ts"
Cohesion: 0.11
Nodes (22): FILTERS, renderHooks, AdjustLayer, Base, BlendMode, Doc, DocState, Effects (+14 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.23
Nodes (16): align(), base(), convertToSmart(), distribute(), groupSelected(), moveLayer(), newPath(), newShape() (+8 more)

### Community 51 - "FontPicker.tsx"
Cohesion: 0.21
Nodes (10): FALLBACK, FontFamily, GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, libraryFonts, cssFamily() (+2 more)

### Community 52 - "filters-algo.check.ts"
Cohesion: 0.26
Nodes (11): cbWeights(), convolve3(), curveLUT(), formatCurve(), hslShift(), medianImg(), parseCurve(), stretchLUT() (+3 more)

### Community 53 - "controls.tsx"
Cohesion: 0.12
Nodes (18): rgbOf(), Gradient, Paint, hsvToRgb(), hx(), normHex(), parseColor(), rgbToHsv() (+10 more)

### Community 54 - "findLayerIn"
Cohesion: 0.13
Nodes (23): fileToOpened(), OpenedFile, pickFiles(), readPath(), brush, docs, toasts, toolShortcut() (+15 more)

### Community 55 - "runDab"
Cohesion: 0.09
Nodes (48): alphaCanvas(), boxBlurAlpha(), canReselect(), colorRange(), ColorRangeTarget, drawQuickMaskOverlay(), featherSelection(), flatData() (+40 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.15
Nodes (17): bucket, curDoc(), DialogState, gradientOpts, historyShift, jumpTo(), mcpStatus, openDocState() (+9 more)

### Community 57 - "warp.ts"
Cohesion: 0.18
Nodes (8): c, grouped, id, ids, menuFilters, rows, filterSubmenus(), Img

### Community 58 - "layerMatrix"
Cohesion: 0.24
Nodes (10): buildSvg(), esc(), exportBytes(), layerBoundsPx(), serializeDoc(), writePsdBytes(), pathsToD(), renderLayerToDocCanvas() (+2 more)

### Community 60 - "assetThumb"
Cohesion: 0.50
Nodes (4): assetPreviewPNG(), assetThumb(), downscaled(), Thumb()

### Community 62 - "cloneLayers"
Cohesion: 0.09
Nodes (50): newAdjustment(), addMask(), maskBounds(), activeIndex, commit(), cur(), selectedLayers(), toast (+42 more)

## Knowledge Gaps
- **326 isolated node(s):** `Table of contents`, `Why LucentEdit`, `Features`, `macOS`, `Windows` (+321 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `cloneLayers` to `io.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `util.ts`, `extra.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `select.ts`, `move.ts`, `flatten`, `Tool`, `contentAware.tsx`, `walk`, `findLayerIn`, `runDab`, `infoPanels.tsx`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `Tool` to `io.ts`, `retouch.tsx`, `util.ts`, `extra.tsx`, `cur`, `select2.tsx`, `contentAware.tsx`, `App.tsx`, `select.ts`, `runDab`, `layerMatrix`, `flatten`, `cloneLayers`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `Layer` connect `move.ts` to `training.ts`, `commands.ts`, `io.ts`, `retouch.tsx`, `util.ts`, `adjust.ts`, `filters.ts`, `walk`, `runDab`, `select.ts`, `App.tsx`, `infoPanels.tsx`, `cloneLayers`, `selectops.ts`, `flatten`, `Tool`, `Kind`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `Table of contents`, `Why LucentEdit`, `Features` to the rest of the system?**
  _326 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11231884057971014 - nodes in this community are weakly interconnected._
- **Should `retouch.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._