# Graph Report - photoAgent  (2026-10-13)

## Corpus Check
- 67 files · ~149,023 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1204 nodes · 3703 edges · 56 communities (51 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.59)
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

## God Nodes (most connected - your core abstractions)
1. `cur()` - 117 edges
2. `commit()` - 81 edges
3. `touch()` - 79 edges
4. `ctx2d()` - 79 edges
5. `makeCanvas()` - 65 edges
6. `activeLayer()` - 43 edges
7. `toast` - 43 edges
8. `findLayer()` - 29 edges
9. `flatten()` - 28 edges
10. `selectedLayers()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `Viewport()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/Viewport.tsx → src/core/io.ts
- `MenuBar()` --indirect_call--> `esc()`  [INFERRED]
  src/ui/chrome.tsx → src/core/io.ts
- `Thumb()` --calls--> `thumbnail()`  [EXTRACTED]
  src/ui/panels.tsx → src/core/render.ts
- `hasDoc()` --calls--> `cur()`  [EXTRACTED]
  src/ui/selectDialogs.tsx → src/core/store.ts

## Import Cycles
- None detected.

## Communities (56 total, 5 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.06
Nodes (31): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+23 more)

### Community 1 - "commands.ts"
Cohesion: 0.12
Nodes (28): newAdjustment(), exportBytes(), saveAs(), serializeDoc(), newShape(), createDoc(), cur(), BLEND_MODES (+20 more)

### Community 2 - "io.ts"
Cohesion: 0.09
Nodes (24): rgbOf(), Gradient, canvasToBlob(), corners(), dataURLToBytes(), downloadBlob(), hslToRgb(), hsvToRgb() (+16 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (36): historyShift, bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts (+28 more)

### Community 4 - "server.ts"
Cohesion: 0.07
Nodes (60): actionForKey(), actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep() (+52 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (39): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+31 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (38): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+30 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.11
Nodes (34): maskBounds(), groupTools(), setTool(), toolById(), commitText(), filterMenu(), flyout, FontSelect() (+26 more)

### Community 8 - "util.ts"
Cohesion: 0.05
Nodes (109): baseName(), buildSvg(), deserializeDoc(), docFromFile(), elementToPathData(), esc(), extOf(), importSvg() (+101 more)

### Community 9 - "panels.tsx"
Cohesion: 0.08
Nodes (20): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), copyImg(), fbm(), FilterParam, keepLuma() (+12 more)

### Community 10 - "extra.tsx"
Cohesion: 0.09
Nodes (26): newPath(), shapeOpts, addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, free, freeformTool (+18 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.11
Nodes (13): ExportFormat, featherSelection(), lastFilter, prettyKeys(), Dialogs(), FeatherDialog(), Palette(), PresetCard() (+5 more)

### Community 12 - "lib.rs"
Cohesion: 0.18
Nodes (22): AppHandle, Cursor, Header, Option, Request, Response, Result, handle() (+14 more)

### Community 14 - "cur"
Cohesion: 0.11
Nodes (23): gridFromQuad(), identityGrid(), presetGrid(), cancelTransform(), EDGES, H_PARTNER, handles(), hasLayer() (+15 more)

### Community 15 - "select2.tsx"
Cohesion: 0.06
Nodes (67): alphaCanvas(), boxBlurAlpha(), canReselect(), colorRange(), ColorRangeTarget, deselect(), flatData(), grow() (+59 more)

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
Cohesion: 0.09
Nodes (23): SelMode, marquee, EXTRA_TOOLS, ellipseMarquee, GROUP_ORDER, groupCurrent, handTool, rectMarquee (+15 more)

### Community 20 - "touch"
Cohesion: 0.17
Nodes (19): drawQuickMaskOverlay(), maskEdges(), interaction, needsFit, paint, tick, usePaint(), unrotate() (+11 more)

### Community 21 - "store.ts"
Cohesion: 0.11
Nodes (22): quickMaskStandIn(), bg, brush, bucket, curDoc(), DialogState, fg, gradientOpts (+14 more)

### Community 22 - "select.ts"
Cohesion: 0.25
Nodes (9): MaskMeta, DocState, RasterLayer, Rect, Pt, Quad, Stroke, Stroke (+1 more)

### Community 23 - "App.tsx"
Cohesion: 0.14
Nodes (23): fileToOpened(), OpenedFile, pickFiles(), closeDoc(), toasts, toolShortcut(), beginTextEdit(), ActionDialogs() (+15 more)

### Community 24 - "move.ts"
Cohesion: 0.14
Nodes (15): viewOpts, Layer, applied, boxMatrix(), drawPill(), drawTransformBox(), guides, handlePoints() (+7 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.16
Nodes (33): align(), base(), convertToSmart(), cropDoc(), distribute(), groupSelected(), moveLayer(), resizeCanvas() (+25 more)

### Community 27 - "vector.ts"
Cohesion: 0.11
Nodes (20): applyH(), a, assert, b, dst, f, g, H (+12 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (10): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+2 more)

### Community 29 - "flatten"
Cohesion: 0.15
Nodes (21): setProps(), AdjustProps(), anchorRef, Appearance(), BLEND_LABEL(), BOTTOM_TABS, commitSoon(), DocProps() (+13 more)

### Community 32 - "infoPanels.tsx"
Cohesion: 0.21
Nodes (13): cursorPos, useTick(), samplers, viewportSize, hex(), HistogramPanel(), InfoPanel(), NavigatorPanel() (+5 more)

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
Cohesion: 0.19
Nodes (13): Field, Img, liquifyDab(), LiquifyKind, liquifyRender(), Mat3, newField(), sampleField() (+5 more)

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

### Community 46 - "adjust.ts"
Cohesion: 0.24
Nodes (10): defaultParams(), filterById(), FilterDef, FILTERS, on(), resolveParams(), applyFilter(), filteredCopy() (+2 more)

### Community 47 - "flatten"
Cohesion: 0.25
Nodes (11): bern(), bezierPatch(), boundsOf(), drawMesh(), patchMesh(), renderQuad(), renderWarp(), toOut() (+3 more)

### Community 48 - "filters.ts"
Cohesion: 0.20
Nodes (25): addLayer(), deleteSelected(), editablePixels(), mergeDown(), newRaster(), clearSelection(), compositeMasked(), fillSelection() (+17 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.11
Nodes (32): adaptColor(), cleanMask(), components(), contentAwareFill(), dilateBin(), downLevel(), Field, FillOpts (+24 more)

### Community 50 - "walk"
Cohesion: 0.24
Nodes (13): duplicateSelected(), moveInto(), select(), containerOf(), duplicateLayer(), walk(), duplicateLayerOp(), snap() (+5 more)

### Community 51 - "clamp"
Cohesion: 0.26
Nodes (11): cbWeights(), convolve3(), curveLUT(), formatCurve(), hslShift(), medianImg(), parseCurve(), stretchLUT() (+3 more)

### Community 52 - "filters-algo.check.ts"
Cohesion: 0.18
Nodes (8): c, grouped, id, ids, menuFilters, rows, filterSubmenus(), Img

### Community 53 - "touch"
Cohesion: 0.29
Nodes (7): setClip(), touch(), resetRotation(), applyCrop(), cancelCrop(), PrefsDialog(), setView()

### Community 54 - "findLayerIn"
Cohesion: 0.08
Nodes (41): readPath(), editSmartContents(), layerSummary(), removeLayers(), reorder(), toPaint(), toStroke(), activeIndex (+33 more)

### Community 55 - "runDab"
Cohesion: 0.50
Nodes (3): runDab(), smooth(), strokeTo()

## Knowledge Gaps
- **272 isolated node(s):** `chain`, `name`, `version`, `description`, `type` (+267 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `commands.ts` to `retouch.tsx`, `server.ts`, `chrome.tsx`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `App.tsx`, `move.ts`, `selectops.ts`, `flatten`, `infoPanels.tsx`, `filters-algo.check.ts`, `adjust.ts`, `filters.ts`, `walk`, `touch`, `findLayerIn`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `touch()` connect `touch` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `util.ts`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `App.tsx`, `move.ts`, `selectops.ts`, `flatten`, `infoPanels.tsx`, `adjust.ts`, `flatten`, `filters.ts`, `walk`, `findLayerIn`, `runDab`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `util.ts` to `infoPanels.tsx`, `commands.ts`, `io.ts`, `retouch.tsx`, `filters-algo.check.ts`, `chrome.tsx`, `extra.tsx`, `dialogs.tsx`, `adjust.ts`, `select2.tsx`, `filters.ts`, `cur`, `walk`, `touch`, `store.ts`, `findLayerIn`, `selectops.ts`, `vector.ts`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `chain`, `name`, `version` to the rest of the system?**
  _272 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12043010752688173 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09425287356321839 - nodes in this community are weakly interconnected._