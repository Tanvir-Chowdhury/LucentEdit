# Graph Report - photoAgent  (2026-10-14)

## Corpus Check
- 75 files · ~161,246 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1347 nodes · 4285 edges · 59 communities (55 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.6)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4570bf85`
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
- findLayerIn
- runDab
- infoPanels.tsx
- warp.ts
- cloneLayers
- render

## God Nodes (most connected - your core abstractions)
1. `cur()` - 127 edges
2. `commit()` - 88 edges
3. `ctx2d()` - 86 edges
4. `touch()` - 83 edges
5. `makeCanvas()` - 71 edges
6. `toast` - 60 edges
7. `activeLayer()` - 45 edges
8. `flatten()` - 32 edges
9. `selectedLayers()` - 31 edges
10. `findLayer()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `rgbOf()` --calls--> `parseColor()`  [EXTRACTED]
  src/core/filters-algo.ts → src/core/util.ts
- `onPaste()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/App.tsx → src/core/io.ts
- `previewDataURL()` --calls--> `flatten()`  [EXTRACTED]
  src/core/io.ts → src/core/render.ts
- `saveLayersAsAsset()` --indirect_call--> `bounds()`  [INFERRED]
  src/core/library.ts → src/core/util.ts

## Import Cycles
- None detected.

## Communities (59 total, 4 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.06
Nodes (31): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+23 more)

### Community 1 - "commands.ts"
Cohesion: 0.09
Nodes (38): FILTERS, base(), groupSelected(), layerSummary(), newPath(), newShape(), newText(), removeLayers() (+30 more)

### Community 2 - "io.ts"
Cohesion: 0.10
Nodes (22): Doc, Gradient, Paint, dataURLToBytes(), downloadBlob(), hslToRgb(), hsvToRgb(), hx() (+14 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (35): historyShift, bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts (+27 more)

### Community 4 - "server.ts"
Cohesion: 0.06
Nodes (66): actionForKey(), actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep() (+58 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (42): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+34 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.12
Nodes (28): esc(), quickMask, groupTools(), setTool(), toolById(), filterMenu(), flyout, FONTS (+20 more)

### Community 8 - "util.ts"
Cohesion: 0.18
Nodes (24): baseName(), buildSvg(), deserializeDoc(), docFromFile(), elementToPathData(), exportBytes(), extOf(), importSvg() (+16 more)

### Community 9 - "panels.tsx"
Cohesion: 0.09
Nodes (14): boxSumEnd(), fbm(), FilterParam, keepLuma(), kuwahara(), luma(), lumaPlane(), ParamValue (+6 more)

### Community 10 - "extra.tsx"
Cohesion: 0.11
Nodes (19): toPathProps(), addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, EXTRA_TOOLS, free, freeformTool (+11 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.12
Nodes (11): ExportFormat, TOOLS, prettyKeys(), Dialogs(), FeatherDialog(), Palette(), PresetCard(), PRESETS (+3 more)

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.10
Nodes (23): identityGrid(), presetGrid(), WARP_PRESETS, WarpPreset, cancelTransform(), EDGES, H_PARTNER, handles() (+15 more)

### Community 15 - "select2.tsx"
Cohesion: 0.10
Nodes (22): deselect(), edgePath(), floodWindow(), snapToEdge(), finish(), line(), lineMarquee(), magAnchor() (+14 more)

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
Nodes (33): marquee, ToolId, wand, ellipseMarquee, GROUP_ORDER, groupCurrent, handTool, rectMarquee (+25 more)

### Community 20 - "touch"
Cohesion: 0.13
Nodes (23): fileToOpened(), OpenedFile, brush, bucket, curDoc(), DialogState, gradientOpts, interaction (+15 more)

### Community 21 - "store.ts"
Cohesion: 0.36
Nodes (8): defaultParams(), FilterDef, on(), resolveParams(), applyFilter(), filteredCopy(), openFilter(), FilterDialog()

### Community 22 - "select.ts"
Cohesion: 0.28
Nodes (13): duplicateSelected(), ungroup(), commit(), selectedLayers(), applyBrandFonts(), commitText(), alignCmd(), arrange() (+5 more)

### Community 23 - "App.tsx"
Cohesion: 0.18
Nodes (8): c, grouped, id, ids, menuFilters, rows, filterSubmenus(), Img

### Community 24 - "move.ts"
Cohesion: 0.13
Nodes (19): layerBoundsPx(), layerAt(), Layer, corners(), layerMatrix(), applied, boxMatrix(), drawPill() (+11 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.06
Nodes (92): FALLBACK, FontFamily, fontWeights(), GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, pickFiles() (+84 more)

### Community 27 - "vector.ts"
Cohesion: 0.19
Nodes (18): arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths(), parseSvgPath(), pathBounds() (+10 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (9): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+1 more)

### Community 29 - "flatten"
Cohesion: 0.12
Nodes (29): moveInto(), setProps(), select(), Effects, containerOf(), walk(), historySource, FontSelect() (+21 more)

### Community 31 - "Kind"
Cohesion: 0.17
Nodes (9): DocState, RasterLayer, Stroke, Kind, runDab(), smooth(), Stroke, strokeTo() (+1 more)

### Community 32 - "infoPanels.tsx"
Cohesion: 0.25
Nodes (8): cbWeights(), convolve3(), hslShift(), medianImg(), minmaxLine(), rankMinMax(), stretchLUT(), clamp()

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
Cohesion: 0.60
Nodes (5): curveLUT(), formatCurve(), parseCurve(), CHANNELS, CurvesEditor()

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

### Community 46 - "adjust.ts"
Cohesion: 0.21
Nodes (23): placeAsset(), align(), AlignMode, convertToSmart(), cropDoc(), distribute(), fitAdjustments(), flipContent() (+15 more)

### Community 47 - "flatten"
Cohesion: 0.40
Nodes (5): blurImg(), blurRGBA(), boxPlane(), copyImg(), unsharp()

### Community 48 - "filters.ts"
Cohesion: 0.15
Nodes (15): renderHooks, AdjustLayer, Base, GlowFx, GradientStop, GroupLayer, LayerMask, ShadowFx (+7 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.08
Nodes (49): newAdjustment(), saveAs(), addLayer(), addMask(), deleteSelected(), MaskMode, setClip(), closeDoc() (+41 more)

### Community 51 - "clamp"
Cohesion: 0.40
Nodes (5): MaskMeta, Rect, Pt, Quad, Session

### Community 52 - "filters-algo.check.ts"
Cohesion: 0.12
Nodes (21): applyH(), a, assert, b, dst, f, g, H (+13 more)

### Community 54 - "findLayerIn"
Cohesion: 0.13
Nodes (21): toasts, toolShortcut(), ActionDialogs(), App(), isTyping(), onKeyDown(), onKeyUp(), onPaste() (+13 more)

### Community 55 - "runDab"
Cohesion: 0.05
Nodes (128): autoSampleRect(), writePsdBytes(), applyMask(), editablePixels(), flattenImage(), mergeDown(), newRaster(), rasterize() (+120 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.16
Nodes (17): bg, cursorPos, fg, useTick(), sampleAt(), samplers, Tabs(), viewportSize (+9 more)

### Community 57 - "warp.ts"
Cohesion: 0.26
Nodes (12): Field, Img, liquifyDab(), LiquifyKind, liquifyRender(), Mat3, newField(), sampleField() (+4 more)

### Community 62 - "cloneLayers"
Cohesion: 0.17
Nodes (15): editSmartContents(), createDoc(), jumpTo(), openDocState(), redo(), restore(), snapshotOf(), syncSmartParent() (+7 more)

### Community 63 - "render"
Cohesion: 0.25
Nodes (11): bern(), bezierPatch(), boundsOf(), drawMesh(), patchMesh(), renderQuad(), renderWarp(), toOut() (+3 more)

## Knowledge Gaps
- **290 isolated node(s):** `chain`, `name`, `version`, `description`, `type` (+285 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `walk` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `select.ts`, `move.ts`, `selectops.ts`, `vector.ts`, `flatten`, `adjust.ts`, `findLayerIn`, `runDab`, `infoPanels.tsx`, `warp.ts`, `cloneLayers`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `touch()` connect `walk` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `select.ts`, `move.ts`, `selectops.ts`, `vector.ts`, `flatten`, `Kind`, `adjust.ts`, `runDab`, `infoPanels.tsx`, `cloneLayers`, `render`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `runDab` to `commands.ts`, `io.ts`, `infoPanels.tsx`, `retouch.tsx`, `util.ts`, `extra.tsx`, `adjust.ts`, `select2.tsx`, `cur`, `walk`, `filters-algo.check.ts`, `store.ts`, `move.ts`, `warp.ts`, `selectops.ts`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `chain`, `name`, `version` to the rest of the system?**
  _290 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09175377468060394 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._