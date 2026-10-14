# Graph Report - photoAgent  (2026-10-13)

## Corpus Check
- 70 files · ~151,951 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1225 nodes · 3546 edges · 56 communities (51 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 51 edges (avg confidence: 0.57)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `73452f87`
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

## God Nodes (most connected - your core abstractions)
1. `cur()` - 120 edges
2. `commit()` - 82 edges
3. `ctx2d()` - 82 edges
4. `touch()` - 78 edges
5. `makeCanvas()` - 67 edges
6. `toast` - 47 edges
7. `activeLayer()` - 45 edges
8. `flatten()` - 30 edges
9. `findLayer()` - 28 edges
10. `selectedLayers()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `Viewport()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/Viewport.tsx → src/core/io.ts
- `previewDataURL()` --calls--> `flatten()`  [EXTRACTED]
  src/core/io.ts → src/core/render.ts
- `docInfo()` --indirect_call--> `layerSummary()`  [INFERRED]
  src/mcp/server.ts → src/core/ops.ts
- `Thumb()` --calls--> `thumbnail()`  [EXTRACTED]
  src/ui/panels.tsx → src/core/render.ts
- `hasMask()` --calls--> `cur()`  [EXTRACTED]
  src/ui/psCommands.tsx → src/core/store.ts

## Import Cycles
- None detected.

## Communities (56 total, 5 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.06
Nodes (31): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+23 more)

### Community 1 - "commands.ts"
Cohesion: 0.10
Nodes (23): applyMask(), rasterize(), setClip(), docs, touch(), resetRotation(), lastFilter, quickExport() (+15 more)

### Community 2 - "io.ts"
Cohesion: 0.14
Nodes (11): Gradient, Paint, evalNum(), NumField(), openPicker(), PickerReq, PRESETS, recent (+3 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (36): historyShift, bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts (+28 more)

### Community 4 - "server.ts"
Cohesion: 0.07
Nodes (61): actionForKey(), actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep() (+53 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (39): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+31 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (38): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+30 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.13
Nodes (21): buildSvg(), esc(), quickMask, closeDoc(), filterMenu(), flyout, FontSelect(), hideTip() (+13 more)

### Community 8 - "util.ts"
Cohesion: 0.17
Nodes (23): baseName(), deserializeDoc(), docFromFile(), elementToPathData(), exportBytes(), ExportFormat, extOf(), importSvg() (+15 more)

### Community 9 - "panels.tsx"
Cohesion: 0.05
Nodes (44): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), cbWeights(), c, grouped, id (+36 more)

### Community 10 - "extra.tsx"
Cohesion: 0.10
Nodes (15): toPathProps(), addAnchorTool, convertPointTool, deleteAnchorTool, EXTRA_TOOLS, free, freeformTool, pathTarget() (+7 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.13
Nodes (11): bg, mcpStatus, MenuItems(), newDocument(), prettyKeys(), Dialogs(), FeatherDialog(), NewDialog() (+3 more)

### Community 12 - "lib.rs"
Cohesion: 0.18
Nodes (22): AppHandle, Cursor, Header, Option, Request, Response, Result, handle() (+14 more)

### Community 14 - "cur"
Cohesion: 0.05
Nodes (70): MaskMeta, Rect, applyH(), bern(), bezierPatch(), boundsOf(), a, assert (+62 more)

### Community 15 - "select2.tsx"
Cohesion: 0.11
Nodes (19): deselect(), SelMode, finish(), line(), lineMarquee(), magAnchor(), magClose(), magLive() (+11 more)

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
Cohesion: 0.06
Nodes (35): marquee, ToolId, wand, ellipseMarquee, GROUP_ORDER, groupCurrent, handTool, rectMarquee (+27 more)

### Community 20 - "touch"
Cohesion: 0.11
Nodes (27): layerBoundsPx(), layerAt(), activeIndex, brush, bucket, curDoc(), cursorPos, DialogState (+19 more)

### Community 21 - "store.ts"
Cohesion: 0.05
Nodes (124): autoSampleRect(), FilterDef, applyFilter(), filteredCopy(), psdMaskIn(), writePsdBytes(), editablePixels(), flattenImage() (+116 more)

### Community 22 - "select.ts"
Cohesion: 0.24
Nodes (7): border(), dilate(), erode(), gradientMagnitude(), luma(), RangeSpec, slideMax()

### Community 23 - "App.tsx"
Cohesion: 0.15
Nodes (21): fileToOpened(), OpenedFile, pickFiles(), usePaint(), ActionDialogs(), App(), isTyping(), onKeyDown() (+13 more)

### Community 24 - "move.ts"
Cohesion: 0.17
Nodes (13): Layer, applied, boxMatrix(), drawPill(), guides, handlePoints(), hitHandle(), HP (+5 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.35
Nodes (13): align(), convertToSmart(), distribute(), moveLayer(), setProps(), topLevel(), bounds(), refreshGroups() (+5 more)

### Community 27 - "vector.ts"
Cohesion: 0.22
Nodes (14): arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths(), parseSvgPath(), pathBounds() (+6 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.31
Nodes (5): blurred(), box1(), inpaint(), pushPull(), Px

### Community 29 - "flatten"
Cohesion: 0.12
Nodes (29): maskTarget, useTick(), hex(), HistogramPanel(), InfoPanel(), NavigatorPanel(), preview(), previewCache (+21 more)

### Community 31 - "Kind"
Cohesion: 0.24
Nodes (6): DocState, RasterLayer, Stroke, Kind, Stroke, PEvent

### Community 32 - "infoPanels.tsx"
Cohesion: 0.15
Nodes (14): fg, shapeOpts, strokeColor, beginTextEdit(), CUSTOM_SHAPES, directTool, editTarget(), hitNode() (+6 more)

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
Cohesion: 0.17
Nodes (13): Doc, dataURLToBytes(), hslToRgb(), hsvToRgb(), hx(), normHex(), parseColor(), RGBA (+5 more)

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

### Community 46 - "adjust.ts"
Cohesion: 0.14
Nodes (35): newAdjustment(), addLayer(), addMask(), AlignMode, base(), editSmartContents(), groupSelected(), layerSummary() (+27 more)

### Community 47 - "flatten"
Cohesion: 0.39
Nodes (8): moveInto(), select(), walk(), newLayer(), LayerRow(), LayersPanel(), selectAdjacent(), toGrayscale()

### Community 48 - "filters.ts"
Cohesion: 0.40
Nodes (6): fitAdjustments(), resizeCanvas(), resizeImage(), scaleLayer(), transformCanvas(), SizeDialog()

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.11
Nodes (40): cropDoc(), deleteSelected(), duplicateSelected(), MaskMode, commit(), cur(), jumpTo(), redo() (+32 more)

### Community 51 - "clamp"
Cohesion: 0.50
Nodes (3): drawTransformBox(), OverlayCtx, drawNodes()

### Community 52 - "filters-algo.check.ts"
Cohesion: 0.50
Nodes (3): runDab(), smooth(), strokeTo()

### Community 54 - "findLayerIn"
Cohesion: 0.12
Nodes (18): psdBlendIn(), readPath(), whenIdle(), BLEND_MODES, common(), docInfo(), handleMcp(), handleOne() (+10 more)

### Community 55 - "runDab"
Cohesion: 0.13
Nodes (17): renderHooks, AdjustLayer, Base, BlendMode, Effects, GlowFx, GradientStop, GroupLayer (+9 more)

## Knowledge Gaps
- **281 isolated node(s):** `Table of contents`, `Why LucentEdit`, `Features`, `macOS`, `Windows` (+276 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `walk` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `App.tsx`, `move.ts`, `selectops.ts`, `flatten`, `infoPanels.tsx`, `adjust.ts`, `flatten`, `filters.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `commit()` connect `walk` to `infoPanels.tsx`, `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `adjust.ts`, `cur`, `filters.ts`, `flatten`, `touch`, `store.ts`, `App.tsx`, `move.ts`, `selectops.ts`, `flatten`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `touch()` connect `commands.ts` to `infoPanels.tsx`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `adjust.ts`, `flatten`, `select2.tsx`, `cur`, `walk`, `index.ts`, `touch`, `store.ts`, `filters-algo.check.ts`, `move.ts`, `selectops.ts`, `flatten`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **What connects `Table of contents`, `Why LucentEdit`, `Features` to the rest of the system?**
  _281 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09686609686609686 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13970588235294118 - nodes in this community are weakly interconnected._