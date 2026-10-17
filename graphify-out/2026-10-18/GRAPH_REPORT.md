# Graph Report - photoAgent  (2026-10-18)

## Corpus Check
- 82 files · ~217,130 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1496 nodes · 4467 edges · 68 communities (63 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.58)
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
- contentAware.tsx
- controls.tsx
- filters-algo.check.ts
- assetThumb
- findLayerIn
- clamp
- gridFromQuad
- render
- CurvesEditor.tsx
- runDab
- findLayerIn

## God Nodes (most connected - your core abstractions)
1. `cur()` - 124 edges
2. `ctx2d()` - 85 edges
3. `commit()` - 84 edges
4. `touch()` - 78 edges
5. `makeCanvas()` - 69 edges
6. `toast` - 51 edges
7. `activeLayer()` - 45 edges
8. `flatten()` - 31 edges
9. `findLayer()` - 28 edges
10. `addLayer()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `parseActions()` --references--> `KINDS`  [EXTRACTED]
  src/core/actions-steps.ts → src/core/library.ts
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `FilterDialog()` --indirect_call--> `on()`  [INFERRED]
  src/ui/dialogs.tsx → src/core/filters-algo.ts
- `MenuBar()` --indirect_call--> `esc()`  [INFERRED]
  src/ui/chrome.tsx → src/core/io.ts
- `previewDataURL()` --calls--> `flatten()`  [EXTRACTED]
  src/core/io.ts → src/core/render.ts

## Import Cycles
- None detected.

## Communities (68 total, 5 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.04
Nodes (45): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+37 more)

### Community 1 - "commands.ts"
Cohesion: 0.14
Nodes (13): BRAND_SCHEMA, callTool(), common(), handleMcp(), handleOne(), Json, num(), paintSchema (+5 more)

### Community 2 - "io.ts"
Cohesion: 0.13
Nodes (17): rgbOf(), canvasToBlob(), corners(), dataURLToBytes(), downloadBlob(), hslToRgb(), hsvToRgb(), hx() (+9 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (34): bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts, cloneStampTool (+26 more)

### Community 4 - "server.ts"
Cohesion: 0.06
Nodes (66): actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep(), dialogClosed() (+58 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (42): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+34 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.10
Nodes (32): quickMask, ToolId, GROUP_ORDER, groupCurrent, groupTools(), setTool(), toolById(), TOOLS (+24 more)

### Community 8 - "util.ts"
Cohesion: 0.13
Nodes (19): buildSvg(), elementToPathData(), esc(), importSvg(), layerBoundsPx(), MIME, OPEN_EXTS, OpenedFile (+11 more)

### Community 9 - "panels.tsx"
Cohesion: 0.08
Nodes (19): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), copyImg(), fbm(), FilterParam, keepLuma() (+11 more)

### Community 10 - "extra.tsx"
Cohesion: 0.08
Nodes (28): toPathProps(), shapeOpts, strokeColor, addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, EXTRA_TOOLS (+20 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.13
Nodes (22): Brand, base(), newShape(), newText(), Archetype, Bucket, Facts, FitResult (+14 more)

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.11
Nodes (21): MaskMeta, Rect, Pt, Quad, cancelTransform(), EDGES, H_PARTNER, handles() (+13 more)

### Community 15 - "select2.tsx"
Cohesion: 0.21
Nodes (22): readAsset(), registerFonts(), trainingPath(), addCurrentDocument(), addTrainingFiles(), factKey(), findSimilar(), loadStyle() (+14 more)

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
Nodes (28): gradientOpts, marquee, wand, ellipseMarquee, handTool, rectMarquee, ShapeKind, shapeVariant() (+20 more)

### Community 20 - "touch"
Cohesion: 0.17
Nodes (16): bg, cursorPos, fg, useTick(), sampleAt(), samplers, viewportSize, hex() (+8 more)

### Community 21 - "store.ts"
Cohesion: 0.13
Nodes (29): archetypesOf(), area(), bodyOf(), buildProfile(), center(), Check, colorDist(), contains() (+21 more)

### Community 22 - "select.ts"
Cohesion: 0.22
Nodes (17): baseName(), deserializeDoc(), docFromFile(), extOf(), layersFromFile(), psdBlendIn(), psdMaskIn(), readPsdDoc() (+9 more)

### Community 23 - "App.tsx"
Cohesion: 0.19
Nodes (24): applyAdjust(), applyStroke(), checkerPattern(), composite(), drawContent(), drawLayer(), drawLayers(), drawShadowOnly() (+16 more)

### Community 24 - "move.ts"
Cohesion: 0.14
Nodes (18): actionForKey(), brush, closeDoc(), toasts, tool, toolShortcut(), ActionDialogs(), App() (+10 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.05
Nodes (91): FALLBACK, FontFamily, GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, activeBrand, Asset (+83 more)

### Community 27 - "vector.ts"
Cohesion: 0.26
Nodes (13): newPath(), arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths(), parseSvgPath() (+5 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (10): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+2 more)

### Community 29 - "flatten"
Cohesion: 0.16
Nodes (19): tick, historySource, FontSelect(), anchorRef, Appearance(), BLEND_LABEL(), BOTTOM_TABS, DocProps() (+11 more)

### Community 30 - "Tool"
Cohesion: 0.18
Nodes (33): addLayer(), editablePixels(), flattenImage(), flipContent(), flipLayers(), mergeDown(), newRaster(), clearSelection() (+25 more)

### Community 31 - "Kind"
Cohesion: 0.11
Nodes (17): Layer, applied, boxMatrix(), drawPill(), drawTransformBox(), guides, handlePoints(), hitHandle() (+9 more)

### Community 32 - "select2.tsx"
Cohesion: 0.05
Nodes (84): writePsdBytes(), applyMask(), flatten(), renderLayerToDocCanvas(), alphaCanvas(), boxBlurAlpha(), canReselect(), colorRange() (+76 more)

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
Cohesion: 0.19
Nodes (24): fileToOpened(), pickFiles(), layerAt(), touch(), usePaint(), layerMatrix(), unrotate(), zoomAt() (+16 more)

### Community 47 - "contentAware.tsx"
Cohesion: 0.10
Nodes (46): addMask(), cropDoc(), deleteSelected(), MaskMode, setClip(), topLevel(), commit(), cur() (+38 more)

### Community 48 - "filters.ts"
Cohesion: 0.15
Nodes (16): AdjustLayer, Base, Effects, GlowFx, GradientStop, GroupLayer, LayerMask, PathNode (+8 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.14
Nodes (38): align(), AlignMode, convertToSmart(), distribute(), duplicateSelected(), fitAdjustments(), groupSelected(), layerSummary() (+30 more)

### Community 51 - "training.check.ts"
Cohesion: 0.09
Nodes (20): clean(), inferRoles(), NAME_RULES, RawEl, all, bad, boxAt(), brand (+12 more)

### Community 52 - "store.ts"
Cohesion: 0.14
Nodes (15): activeIndex, bucket, curDoc(), DialogState, historyShift, interaction, maskTarget, needsFit (+7 more)

### Community 53 - "paint.ts"
Cohesion: 0.23
Nodes (11): DocState, RasterLayer, Field, LiquifyKind, newField(), Stroke, Stroke, Slider() (+3 more)

### Community 54 - "findLayerIn"
Cohesion: 0.12
Nodes (13): exportBytes(), ExportFormat, saveAs(), mcpStatus, lastFilter, quickExport(), saveDoc(), Dialogs() (+5 more)

### Community 55 - "warp.check.ts"
Cohesion: 0.14
Nodes (15): assert, b, dst, f, g, H, img, mesh (+7 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.11
Nodes (23): newAdjustment(), defaultParams(), filterById(), FilterDef, FILTERS, resolveParams(), applyFilter(), filteredCopy() (+15 more)

### Community 57 - "contentAware.tsx"
Cohesion: 0.21
Nodes (11): autoSampleRect(), Command, close(), ContentAwareDialogs(), FillDialog(), FillOpts, progress, ProgressDialog() (+3 more)

### Community 58 - "controls.tsx"
Cohesion: 0.18
Nodes (9): Gradient, Paint, evalNum(), NumField(), PaintEditor(), PickerReq, PRESETS, recent (+1 more)

### Community 59 - "filters-algo.check.ts"
Cohesion: 0.18
Nodes (8): c, grouped, id, ids, menuFilters, rows, filterSubmenus(), Img

### Community 60 - "assetThumb"
Cohesion: 0.25
Nodes (10): bern(), bezierPatch(), Img, liquifyDab(), liquifyRender(), Mat3, patchMesh(), sampleField() (+2 more)

### Community 62 - "clamp"
Cohesion: 0.25
Nodes (8): cbWeights(), convolve3(), hslShift(), medianImg(), minmaxLine(), rankMinMax(), stretchLUT(), clamp()

### Community 63 - "gridFromQuad"
Cohesion: 0.29
Nodes (8): applyH(), a, gridFromQuad(), homography(), quadMesh(), solve8(), setTransformMode(), startTransform()

### Community 64 - "render"
Cohesion: 0.36
Nodes (8): boundsOf(), drawMesh(), renderQuad(), renderWarp(), toOut(), applyTransform(), layer(), render()

### Community 65 - "CurvesEditor.tsx"
Cohesion: 0.60
Nodes (5): curveLUT(), formatCurve(), parseCurve(), CHANNELS, CurvesEditor()

### Community 66 - "runDab"
Cohesion: 0.50
Nodes (3): runDab(), smooth(), strokeTo()

## Knowledge Gaps
- **356 isolated node(s):** `Palette`, `BRAND_CATEGORIES`, `TRAINING_BUCKETS`, `Meta`, `DEFAULT_CATEGORIES` (+351 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `contentAware.tsx` to `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `select.ts`, `move.ts`, `flatten`, `Tool`, `Kind`, `select2.tsx`, `adjust.ts`, `walk`, `store.ts`, `paint.ts`, `findLayerIn`, `infoPanels.tsx`, `contentAware.tsx`, `gridFromQuad`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `commit()` connect `contentAware.tsx` to `render`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `adjust.ts`, `cur`, `walk`, `index.ts`, `store.ts`, `paint.ts`, `findLayerIn`, `infoPanels.tsx`, `contentAware.tsx`, `flatten`, `Tool`, `Kind`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `select2.tsx` to `io.ts`, `retouch.tsx`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `adjust.ts`, `contentAware.tsx`, `cur`, `walk`, `index.ts`, `touch`, `paint.ts`, `select.ts`, `App.tsx`, `infoPanels.tsx`, `contentAware.tsx`, `findLayerIn`, `Tool`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `Palette`, `BRAND_CATEGORIES`, `TRAINING_BUCKETS` to the rest of the system?**
  _356 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1368421052631579 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._