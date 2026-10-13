# Graph Report - photoAgent  (2026-10-13)

## Corpus Check
- 70 files · ~151,324 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1225 nodes · 3796 edges · 59 communities (55 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `08bd2f7c`
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
- touch
- findLayerIn
- runDab
- filters.ts
- CurvesEditor.tsx
- blurImg

## God Nodes (most connected - your core abstractions)
1. `cur()` - 121 edges
2. `commit()` - 83 edges
3. `ctx2d()` - 82 edges
4. `touch()` - 79 edges
5. `makeCanvas()` - 67 edges
6. `toast` - 47 edges
7. `activeLayer()` - 45 edges
8. `findLayer()` - 31 edges
9. `flatten()` - 30 edges
10. `addLayer()` - 27 edges

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

## Communities (59 total, 4 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.06
Nodes (31): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+23 more)

### Community 1 - "commands.ts"
Cohesion: 0.15
Nodes (22): exportBytes(), saveAs(), addMask(), cur(), quickExport(), saveDoc(), setClipboard(), ExportDialog() (+14 more)

### Community 2 - "io.ts"
Cohesion: 0.15
Nodes (13): hsvToRgb(), rgbToHsv(), ColorPickerPopover(), evalNum(), NumField(), openPicker(), PickerReq, PRESETS (+5 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (35): historyShift, bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts (+27 more)

### Community 4 - "server.ts"
Cohesion: 0.07
Nodes (64): actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep(), dialogClosed() (+56 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (39): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+31 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (38): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+30 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.10
Nodes (38): closeDoc(), touch(), resetRotation(), groupTools(), setTool(), toolById(), applyCrop(), cancelCrop() (+30 more)

### Community 8 - "util.ts"
Cohesion: 0.07
Nodes (64): baseName(), buildSvg(), deserializeDoc(), docFromFile(), elementToPathData(), esc(), extOf(), importSvg() (+56 more)

### Community 9 - "panels.tsx"
Cohesion: 0.08
Nodes (17): boxSumEnd(), fbm(), FilterParam, keepLuma(), kuwahara(), luma(), lumaPlane(), on() (+9 more)

### Community 10 - "extra.tsx"
Cohesion: 0.08
Nodes (29): toPathProps(), shapeOpts, strokeColor, PathNode, addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool (+21 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.15
Nodes (10): ExportFormat, featherSelection(), newDocument(), prettyKeys(), FeatherDialog(), NewDialog(), Palette(), PresetCard() (+2 more)

### Community 12 - "lib.rs"
Cohesion: 0.18
Nodes (22): AppHandle, Cursor, Header, Option, Request, Response, Result, handle() (+14 more)

### Community 14 - "cur"
Cohesion: 0.10
Nodes (25): MaskMeta, Rect, identityGrid(), presetGrid(), Pt, Quad, cancelTransform(), EDGES (+17 more)

### Community 15 - "select2.tsx"
Cohesion: 0.10
Nodes (25): deselect(), edgePath(), floodWindow(), gradientMagnitude(), luma(), RangeSpec, slideMax(), snapToEdge() (+17 more)

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
Nodes (28): SelMode, gradientOpts, marquee, ToolId, wand, ellipseMarquee, GROUP_ORDER, groupCurrent (+20 more)

### Community 20 - "touch"
Cohesion: 0.18
Nodes (19): layerAt(), tick, tool, usePaint(), TextLayer, layerMatrix(), handTool, unrotate() (+11 more)

### Community 21 - "store.ts"
Cohesion: 0.13
Nodes (41): writePsdBytes(), applyMask(), flattenImage(), mergeDown(), newRaster(), rasterize(), applyAdjust(), checkerPattern() (+33 more)

### Community 22 - "select.ts"
Cohesion: 0.14
Nodes (27): alphaCanvas(), boxBlurAlpha(), ColorRangeTarget, drawQuickMaskOverlay(), flatData(), grow(), lastMask, maskAlpha() (+19 more)

### Community 23 - "App.tsx"
Cohesion: 0.19
Nodes (18): actionForKey(), fileToOpened(), pickFiles(), brush, toolShortcut(), beginTextEdit(), App(), isTyping() (+10 more)

### Community 24 - "move.ts"
Cohesion: 0.15
Nodes (15): viewOpts, Layer, applied, boxMatrix(), drawPill(), drawTransformBox(), guides, handlePoints() (+7 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.12
Nodes (47): align(), AlignMode, base(), convertToSmart(), distribute(), duplicateSelected(), fitAdjustments(), flipContent() (+39 more)

### Community 27 - "vector.ts"
Cohesion: 0.13
Nodes (19): applyH(), a, assert, b, dst, f, g, H (+11 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (9): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+1 more)

### Community 29 - "flatten"
Cohesion: 0.12
Nodes (26): setProps(), thumbnail(), BlendMode, Effects, historySource, PaintEditor(), AdjustProps(), anchorRef (+18 more)

### Community 31 - "Kind"
Cohesion: 0.16
Nodes (9): DocState, RasterLayer, Stroke, Kind, runDab(), smooth(), Stroke, strokeTo() (+1 more)

### Community 32 - "infoPanels.tsx"
Cohesion: 0.19
Nodes (14): cursorPos, fg, useTick(), samplers, viewportSize, hex(), HistogramPanel(), InfoPanel() (+6 more)

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
Cohesion: 0.16
Nodes (16): Field, Img, liquifyDab(), LiquifyKind, liquifyRender(), Mat3, newField(), sampleField() (+8 more)

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

### Community 46 - "adjust.ts"
Cohesion: 0.36
Nodes (6): newAdjustment(), defaultParams(), filterById(), FILTERS, resolveParams(), renderHooks

### Community 47 - "flatten"
Cohesion: 0.25
Nodes (11): bern(), bezierPatch(), boundsOf(), drawMesh(), patchMesh(), renderQuad(), renderWarp(), toOut() (+3 more)

### Community 48 - "filters.ts"
Cohesion: 0.15
Nodes (26): autoSampleRect(), Rect, addLayer(), editablePixels(), activeLayer(), toast, paintTarget(), begin() (+18 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (35): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+27 more)

### Community 50 - "walk"
Cohesion: 0.13
Nodes (23): cropDoc(), deleteSelected(), MaskMode, setClip(), clearSelection(), copyPixels(), invertSelection(), maskBounds() (+15 more)

### Community 51 - "clamp"
Cohesion: 0.25
Nodes (8): cbWeights(), convolve3(), hslShift(), medianImg(), minmaxLine(), rankMinMax(), stretchLUT(), clamp()

### Community 52 - "filters-algo.check.ts"
Cohesion: 0.18
Nodes (8): c, grouped, id, ids, menuFilters, rows, filterSubmenus(), Img

### Community 53 - "touch"
Cohesion: 0.16
Nodes (17): canReselect(), colorRange(), rangeSpec(), saveSelection(), colorRangeAlpha(), AddMode, close(), ColorRangeDialog() (+9 more)

### Community 54 - "findLayerIn"
Cohesion: 0.08
Nodes (48): readPath(), editSmartContents(), layerSummary(), newText(), removeLayers(), toPaint(), toStroke(), activeIndex (+40 more)

### Community 55 - "runDab"
Cohesion: 0.17
Nodes (14): AdjustLayer, Base, GlowFx, Gradient, GradientStop, GroupLayer, LayerMask, Paint (+6 more)

### Community 56 - "filters.ts"
Cohesion: 0.53
Nodes (5): FilterDef, applyFilter(), filteredCopy(), openFilter(), FilterDialog()

### Community 57 - "CurvesEditor.tsx"
Cohesion: 0.60
Nodes (5): curveLUT(), formatCurve(), parseCurve(), CHANNELS, CurvesEditor()

### Community 58 - "blurImg"
Cohesion: 0.40
Nodes (5): blurImg(), blurRGBA(), boxPlane(), copyImg(), unsharp()

## Knowledge Gaps
- **272 isolated node(s):** `chain`, `name`, `version`, `description`, `type` (+267 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `commands.ts` to `retouch.tsx`, `server.ts`, `chrome.tsx`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `select.ts`, `App.tsx`, `move.ts`, `selectops.ts`, `flatten`, `infoPanels.tsx`, `filters-algo.check.ts`, `filters.ts`, `walk`, `touch`, `findLayerIn`, `filters.ts`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `store.ts` to `commands.ts`, `retouch.tsx`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `touch`, `select.ts`, `selectops.ts`, `vector.ts`, `flatten`, `infoPanels.tsx`, `filters-algo.check.ts`, `filters.ts`, `walk`, `touch`, `findLayerIn`, `filters.ts`?**
  _High betweenness centrality (0.034) - this node is a cross-community bridge._
- **Why does `commit()` connect `selectops.ts` to `commands.ts`, `retouch.tsx`, `server.ts`, `filters-algo.check.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `flatten`, `filters.ts`, `walk`, `touch`, `store.ts`, `findLayerIn`, `App.tsx`, `move.ts`, `filters.ts`, `flatten`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `chain`, `name`, `version` to the rest of the system?**
  _272 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `retouch.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._
- **Should `server.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06559356136820925 - nodes in this community are weakly interconnected._