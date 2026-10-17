# Graph Report - photoAgent  (2026-10-18)

## Corpus Check
- 85 files · ~222,306 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1525 nodes · 4274 edges · 69 communities (62 shown, 7 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 65 edges (avg confidence: 0.61)
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
- runDab
- Facts
- findLayerIn

## God Nodes (most connected - your core abstractions)
1. `cur()` - 99 edges
2. `ctx2d()` - 82 edges
3. `touch()` - 73 edges
4. `commit()` - 70 edges
5. `makeCanvas()` - 67 edges
6. `toast` - 51 edges
7. `activeLayer()` - 32 edges
8. `findLayer()` - 28 edges
9. `flatten()` - 27 edges
10. `Viewport()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `copy()` --indirect_call--> `out()`  [INFERRED]
  src/ui/commands.ts → mcp/lucentedit-mcp.mjs
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `Viewport()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/Viewport.tsx → src/core/io.ts
- `MenuBar()` --indirect_call--> `esc()`  [INFERRED]
  src/ui/chrome.tsx → src/core/io.ts
- `edgePath()` --indirect_call--> `n()`  [INFERRED]
  src/core/selectops.ts → src/core/pdf.ts

## Import Cycles
- None detected.

## Communities (69 total, 7 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.06
Nodes (31): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+23 more)

### Community 1 - "commands.ts"
Cohesion: 0.12
Nodes (23): editSmartContents(), brush, bucket, closeDoc(), createDoc(), curDoc(), DialogState, gradientOpts (+15 more)

### Community 2 - "io.ts"
Cohesion: 0.16
Nodes (8): corners(), hx(), imageToCanvas(), loadImage(), normHex(), RGBA, rgbToHsl(), toHex()

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (35): bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts, cloneStampTool (+27 more)

### Community 4 - "server.ts"
Cohesion: 0.07
Nodes (64): actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep(), dialogClosed() (+56 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (44): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, pdfjs-dist (+36 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.12
Nodes (27): commitText(), filterMenu(), flyout, FONTS, FontSelect(), hideTip(), MenuBar(), MenuEntry (+19 more)

### Community 8 - "util.ts"
Cohesion: 0.05
Nodes (60): cssToPsFont(), psFontToCss(), WEIGHT_NAMES, baseName(), buildSvg(), deserializeDoc(), docFromFile(), elementToPathData() (+52 more)

### Community 9 - "panels.tsx"
Cohesion: 0.08
Nodes (22): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), copyImg(), fbm(), FilterParam, keepLuma() (+14 more)

### Community 10 - "extra.tsx"
Cohesion: 0.11
Nodes (16): shapeOpts, addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, EXTRA_TOOLS, free, freeformTool (+8 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.11
Nodes (21): deselect(), SelMode, edgePath(), floodWindow(), snapToEdge(), finish(), line(), magAnchor() (+13 more)

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.06
Nodes (59): MaskMeta, Rect, applyH(), bern(), bezierPatch(), boundsOf(), a, assert (+51 more)

### Community 15 - "select2.tsx"
Cohesion: 0.36
Nodes (10): duplicateSelected(), moveInto(), select(), containerOf(), duplicateLayer(), walk(), duplicateLayerOp(), LayerRow() (+2 more)

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
Nodes (12): bg, cursorPos, samplers, viewportSize, hex(), HistogramPanel(), InfoPanel(), NavigatorPanel() (+4 more)

### Community 21 - "store.ts"
Cohesion: 0.13
Nodes (27): archetypesOf(), area(), bodyOf(), buildProfile(), Check, colorDist(), contains(), El (+19 more)

### Community 22 - "select.ts"
Cohesion: 0.16
Nodes (30): Brand, readAsset(), readLibraryText(), trainingPath(), writeLibraryText(), addCurrentDocument(), addTrainingFiles(), Archetype (+22 more)

### Community 23 - "App.tsx"
Cohesion: 0.24
Nodes (17): applyStroke(), drawContent(), drawShadowOnly(), drawShape(), drawText(), fitText(), fontString(), GENERIC (+9 more)

### Community 24 - "move.ts"
Cohesion: 0.13
Nodes (25): actionForKey(), fileToOpened(), pickFiles(), setTool(), toolById(), toolShortcut(), beginTextEdit(), ActionDialogs() (+17 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.06
Nodes (91): FALLBACK, FontFamily, fontWeights(), GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, tauriInvoke() (+83 more)

### Community 27 - "vector.ts"
Cohesion: 0.17
Nodes (22): layerAt(), toPathProps(), arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths() (+14 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (10): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+2 more)

### Community 29 - "flatten"
Cohesion: 0.15
Nodes (28): setProps(), commit(), selectedLayers(), BLEND_MODES, refreshGroups(), applyBrandFonts(), applyColorToSelection(), AdjustProps() (+20 more)

### Community 30 - "Tool"
Cohesion: 0.14
Nodes (37): newAdjustment(), addLayer(), addMask(), editablePixels(), mergeDown(), newRaster(), activeLayer(), cur() (+29 more)

### Community 31 - "Kind"
Cohesion: 0.16
Nodes (15): Layer, applied, boxMatrix(), drawPill(), drawTransformBox(), guides, handlePoints(), hitHandle() (+7 more)

### Community 32 - "select2.tsx"
Cohesion: 0.16
Nodes (24): boxBlurAlpha(), ColorRangeTarget, drawQuickMaskOverlay(), featherSelection(), flatData(), grow(), lastMask, maskAlpha() (+16 more)

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
Nodes (16): applyMask(), deleteSelected(), rasterize(), removeLayers(), setClip(), touch(), resetRotation(), schedule() (+8 more)

### Community 47 - "contentAware.tsx"
Cohesion: 0.09
Nodes (11): exportBytes(), OpenedFile, saveAs(), clip, copy(), FILTER_KEYS, quickExport(), saveDoc() (+3 more)

### Community 48 - "filters.ts"
Cohesion: 0.15
Nodes (16): AdjustLayer, Base, BlendMode, Doc, Effects, GlowFx, GradientStop, LayerMask (+8 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (37): adaptColor(), autoSampleRect(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill() (+29 more)

### Community 50 - "walk"
Cohesion: 0.11
Nodes (39): placeAsset(), align(), AlignMode, base(), convertToSmart(), cropDoc(), distribute(), fitAdjustments() (+31 more)

### Community 51 - "training.check.ts"
Cohesion: 0.11
Nodes (24): canReselect(), colorRange(), loadSelection(), rangeSpec(), reselect(), saveSelection(), selectAll(), selectLayerPixels() (+16 more)

### Community 52 - "store.ts"
Cohesion: 0.17
Nodes (17): interaction, needsFit, paint, tick, tool, usePaint(), viewOpts, handTool (+9 more)

### Community 53 - "paint.ts"
Cohesion: 0.16
Nodes (20): flatten(), floodRegion(), magicWand(), maskForLayer(), pixelMatrix(), quickMaskStandIn(), sampleColor(), toggleQuickMask() (+12 more)

### Community 54 - "findLayerIn"
Cohesion: 0.13
Nodes (9): lastFilter, newDocument(), prettyKeys(), Dialogs(), NewDialog(), Palette(), PresetCard(), PRESETS (+1 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.15
Nodes (30): FilterDef, applyFilter(), filteredCopy(), assetPreviewPNG(), assetThumb(), downscaled(), flipContent(), flipLayers() (+22 more)

### Community 57 - "training.check.ts"
Cohesion: 0.09
Nodes (21): center(), clean(), inferRoles(), NAME_RULES, RawEl, all, bad, boxAt() (+13 more)

### Community 58 - "controls.tsx"
Cohesion: 0.15
Nodes (14): Gradient, Paint, hsvToRgb(), rgbToHsv(), ColorPickerPopover(), evalNum(), NumField(), openPicker() (+6 more)

### Community 59 - "filters-algo.check.ts"
Cohesion: 0.12
Nodes (12): c, grouped, id, ids, menuFilters, rows, defaultParams(), FILTERS (+4 more)

### Community 60 - "LucentEdit Roadmap"
Cohesion: 0.13
Nodes (14): AI agents, Brand Training, Build order, Contents, Design teams, Designers, How an agent uses it, LucentEdit Roadmap (+6 more)

### Community 62 - "clamp"
Cohesion: 0.26
Nodes (11): cbWeights(), convolve3(), curveLUT(), formatCurve(), hslShift(), medianImg(), parseCurve(), stretchLUT() (+3 more)

### Community 63 - "contentAware.tsx"
Cohesion: 0.24
Nodes (11): alphaCanvas(), close(), FillDialog(), FillOpts, progress, ProgressDialog(), runJob(), selectBy() (+3 more)

### Community 64 - "factsFromAsset"
Cohesion: 0.33
Nodes (7): hex2(), quantize(), toHex(), factsFromAsset(), factsFromDoc(), paletteOf(), rawElements()

### Community 65 - "runDab"
Cohesion: 0.50
Nodes (3): runDab(), smooth(), strokeTo()

### Community 67 - "Facts"
Cohesion: 0.67
Nodes (3): Facts, Profile, StyleFile

## Knowledge Gaps
- **366 isolated node(s):** `Table of contents`, `Screenshots`, `Why LucentEdit`, `Features`, `macOS` (+361 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `Tool` to `commands.ts`, `retouch.tsx`, `server.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `select.ts`, `move.ts`, `selectops.ts`, `vector.ts`, `flatten`, `Kind`, `select2.tsx`, `adjust.ts`, `walk`, `training.check.ts`, `store.ts`, `paint.ts`, `infoPanels.tsx`, `contentAware.tsx`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `infoPanels.tsx` to `io.ts`, `retouch.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `touch`, `select.ts`, `App.tsx`, `selectops.ts`, `vector.ts`, `Tool`, `select2.tsx`, `adjust.ts`, `walk`, `training.check.ts`, `paint.ts`, `findLayerIn`, `contentAware.tsx`, `factsFromAsset`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `Tool` connect `warp.check.ts` to `retouch.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `index.ts`, `paint.ts`, `vector.ts`, `Kind`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `Table of contents`, `Screenshots`, `Why LucentEdit` to the rest of the system?**
  _366 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12333333333333334 - nodes in this community are weakly interconnected._
- **Should `retouch.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._