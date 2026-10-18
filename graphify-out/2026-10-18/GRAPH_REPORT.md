# Graph Report - photoAgent  (2026-10-18)

## Corpus Check
- 87 files · ~225,237 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1550 nodes · 4448 edges · 59 communities (53 shown, 6 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.62)
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
- filters.ts
- contentaware.ts
- walk
- store.ts
- paint.ts
- findLayerIn
- warp.check.ts
- infoPanels.tsx
- controls.tsx
- findLayerIn
- contentAware.tsx
- runDab
- findLayerIn

## God Nodes (most connected - your core abstractions)
1. `cur()` - 122 edges
2. `commit()` - 75 edges
3. `ctx2d()` - 74 edges
4. `touch()` - 69 edges
5. `makeCanvas()` - 58 edges
6. `toast` - 55 edges
7. `activeLayer()` - 40 edges
8. `flatten()` - 27 edges
9. `Viewport()` - 27 edges
10. `addLayer()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `onPaste()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/App.tsx → src/core/io.ts
- `Viewport()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/Viewport.tsx → src/core/io.ts
- `MenuBar()` --indirect_call--> `esc()`  [INFERRED]
  src/ui/chrome.tsx → src/core/io.ts
- `docInfo()` --indirect_call--> `layerSummary()`  [INFERRED]
  src/mcp/server.ts → src/core/ops.ts

## Import Cycles
- None detected.

## Communities (59 total, 6 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.06
Nodes (31): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+23 more)

### Community 1 - "commands.ts"
Cohesion: 0.11
Nodes (23): editSmartContents(), moveInto(), closeDoc(), select(), touch(), containerOf(), duplicateLayer(), walk() (+15 more)

### Community 2 - "io.ts"
Cohesion: 0.13
Nodes (14): AI agents, Brand Training, Build order, Contents, Design teams, Designers, How an agent uses it, LucentEdit Roadmap (+6 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (37): historyShift, bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts (+29 more)

### Community 4 - "server.ts"
Cohesion: 0.06
Nodes (66): actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep(), dialogClosed() (+58 more)

### Community 5 - "package.json"
Cohesion: 0.04
Nodes (44): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, pdfjs-dist (+36 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.11
Nodes (27): gradientOpts, strokeColor, groupTools(), filterMenu(), flyout, FONTS, hideTip(), MenuBar() (+19 more)

### Community 8 - "util.ts"
Cohesion: 0.47
Nodes (3): cssToPsFont(), psFontToCss(), WEIGHT_NAMES

### Community 9 - "panels.tsx"
Cohesion: 0.05
Nodes (43): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), cbWeights(), c, grouped, id (+35 more)

### Community 10 - "extra.tsx"
Cohesion: 0.10
Nodes (20): hx(), addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, free, freeformTool, pathTarget() (+12 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.12
Nodes (19): deselect(), edgePath(), floodWindow(), snapToEdge(), finish(), lineMarquee(), magAnchor(), magClose() (+11 more)

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.05
Nodes (68): applyH(), bern(), bezierPatch(), boundsOf(), a, assert, b, dst (+60 more)

### Community 15 - "select2.tsx"
Cohesion: 0.50
Nodes (3): runDab(), smooth(), strokeTo()

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
Nodes (30): EXTRA_TOOLS, ellipseMarquee, GROUP_ORDER, groupCurrent, handTool, rectMarquee, ShapeKind, shapeVariant() (+22 more)

### Community 20 - "touch"
Cohesion: 0.14
Nodes (25): bg, cur(), cursorPos, fg, jumpTo(), redo(), undo(), useTick() (+17 more)

### Community 21 - "store.ts"
Cohesion: 0.05
Nodes (85): Brand, trainingPath(), addCurrentDocument(), addTrainingFiles(), Archetype, archetypesOf(), area(), bodyOf() (+77 more)

### Community 23 - "App.tsx"
Cohesion: 0.17
Nodes (26): applyAdjust(), applyStroke(), checkerPattern(), composite(), drawContent(), drawLayer(), drawLayers(), drawShadowOnly() (+18 more)

### Community 24 - "move.ts"
Cohesion: 0.17
Nodes (6): ell, M, ok(), ours, psRect, userApproves()

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.06
Nodes (96): FALLBACK, FontFamily, fontWeights(), GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, tauriInvoke() (+88 more)

### Community 27 - "vector.ts"
Cohesion: 0.15
Nodes (21): arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths(), parseSvgPath(), pathBounds() (+13 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (10): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+2 more)

### Community 29 - "flatten"
Cohesion: 0.10
Nodes (38): commit(), maskTarget, selectedLayers(), BlendMode, bounds(), refreshGroups(), unionRects(), transformTarget() (+30 more)

### Community 30 - "Tool"
Cohesion: 0.08
Nodes (39): newAdjustment(), filterById(), FILTERS, addLayer(), addMask(), renderHooks, brush, createDoc() (+31 more)

### Community 31 - "Kind"
Cohesion: 0.17
Nodes (15): duplicateSelected(), corners(), layerMatrix(), applied, boxMatrix(), drawTransformBox(), guides, handlePoints() (+7 more)

### Community 32 - "select2.tsx"
Cohesion: 0.09
Nodes (45): alphaCanvas(), boxBlurAlpha(), canReselect(), colorRange(), ColorRangeTarget, drawQuickMaskOverlay(), featherSelection(), flatData() (+37 more)

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

### Community 48 - "filters.ts"
Cohesion: 0.15
Nodes (16): AdjustLayer, Base, Doc, Effects, GlowFx, GradientStop, GroupLayer, LayerMask (+8 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.07
Nodes (43): saveAs(), align(), AlignMode, applyMask(), base(), convertToSmart(), cropDoc(), deleteSelected() (+35 more)

### Community 52 - "store.ts"
Cohesion: 0.09
Nodes (37): layerAt(), activeIndex, bucket, curDoc(), dialog, docs, interaction, marquee (+29 more)

### Community 53 - "paint.ts"
Cohesion: 0.19
Nodes (22): flatten(), floodRegion(), magicWand(), maskBounds(), quickMaskStandIn(), reselect(), sampleColor(), selectAll() (+14 more)

### Community 54 - "findLayerIn"
Cohesion: 0.18
Nodes (20): actionForKey(), openDocState(), setTool(), toolById(), toolShortcut(), beginTextEdit(), App(), isTyping() (+12 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.19
Nodes (26): FilterDef, applyFilter(), filteredCopy(), editablePixels(), newRaster(), clearSelection(), compositeMasked(), copyPixels() (+18 more)

### Community 58 - "controls.tsx"
Cohesion: 0.09
Nodes (20): MaskMeta, Gradient, Paint, hsvToRgb(), imageToCanvas(), loadImage(), normHex(), Rect (+12 more)

### Community 61 - "findLayerIn"
Cohesion: 0.40
Nodes (5): DocState, Layer, RasterLayer, Stroke, Stroke

### Community 63 - "contentAware.tsx"
Cohesion: 0.29
Nodes (9): autoSampleRect(), close(), FillDialog(), FillOpts, progress, ProgressDialog(), runJob(), useEscape() (+1 more)

### Community 68 - "findLayerIn"
Cohesion: 0.05
Nodes (74): baseName(), buildSvg(), deserializeDoc(), docFromFile(), elementToPathData(), esc(), exportBytes(), ExportFormat (+66 more)

## Knowledge Gaps
- **364 isolated node(s):** `Table of contents`, `Screenshots`, `Why LucentEdit`, `Features`, `macOS` (+359 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `touch` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `index.ts`, `store.ts`, `selectops.ts`, `vector.ts`, `flatten`, `Tool`, `Kind`, `select2.tsx`, `walk`, `store.ts`, `paint.ts`, `findLayerIn`, `infoPanels.tsx`, `contentAware.tsx`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `paint.ts` to `select2.tsx`, `commands.ts`, `retouch.tsx`, `controls.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `touch`, `store.ts`, `App.tsx`, `infoPanels.tsx`, `selectops.ts`, `Tool`, `contentAware.tsx`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `commit()` connect `flatten` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `cur`, `walk`, `store.ts`, `store.ts`, `paint.ts`, `findLayerIn`, `infoPanels.tsx`, `touch`, `selectops.ts`, `vector.ts`, `contentAware.tsx`, `Tool`, `Kind`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **What connects `Table of contents`, `Screenshots`, `Why LucentEdit` to the rest of the system?**
  _364 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11462450592885376 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._