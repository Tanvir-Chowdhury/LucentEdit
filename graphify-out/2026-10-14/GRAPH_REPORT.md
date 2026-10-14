# Graph Report - photoAgent  (2026-10-14)

## Corpus Check
- 80 files · ~147,486 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1455 nodes · 4616 edges · 56 communities (53 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.59)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `883d8210`
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
- install.ps1
- mcp-smoke-test.mjs
- lucentedit-mcp.mjs
- CLAUDE.md
- pct
- check
- colorToRGBA
- adjust.ts
- filters.ts
- contentaware.ts
- walk
- filters-algo.check.ts
- controls.tsx
- findLayerIn
- runDab
- infoPanels.tsx
- warp.ts
- cloneLayers
- render

## God Nodes (most connected - your core abstractions)
1. `cur()` - 131 edges
2. `commit()` - 90 edges
3. `ctx2d()` - 89 edges
4. `touch()` - 83 edges
5. `makeCanvas()` - 73 edges
6. `toast` - 62 edges
7. `activeLayer()` - 45 edges
8. `flatten()` - 34 edges
9. `addLayer()` - 31 edges
10. `selectedLayers()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `ActionsPanel()` --indirect_call--> `on()`  [INFERRED]
  src/ui/ActionsPanel.tsx → src/core/filters-algo.ts
- `FilterDialog()` --indirect_call--> `on()`  [INFERRED]
  src/ui/dialogs.tsx → src/core/filters-algo.ts
- `rgbOf()` --calls--> `parseColor()`  [EXTRACTED]
  src/core/filters-algo.ts → src/core/util.ts
- `MenuBar()` --indirect_call--> `esc()`  [INFERRED]
  src/ui/chrome.tsx → src/core/io.ts
- `previewDataURL()` --calls--> `flatten()`  [EXTRACTED]
  src/core/io.ts → src/core/render.ts

## Import Cycles
- None detected.

## Communities (56 total, 3 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.04
Nodes (45): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+37 more)

### Community 1 - "commands.ts"
Cohesion: 0.10
Nodes (31): readPath(), groupSelected(), layerSummary(), removeLayers(), toPaint(), toStroke(), ungroup(), docs (+23 more)

### Community 2 - "io.ts"
Cohesion: 0.16
Nodes (12): layerBoundsPx(), Doc, corners(), dataURLToBytes(), downloadBlob(), hslToRgb(), hx(), layerMatrix() (+4 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (35): bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts, cloneStampTool (+27 more)

### Community 4 - "server.ts"
Cohesion: 0.06
Nodes (65): actionForKey(), actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep() (+57 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (42): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+34 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (39): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+31 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.13
Nodes (23): quickMask, groupTools(), CUSTOM_SHAPES, filterMenu(), flyout, FONTS, FontSelect(), hideTip() (+15 more)

### Community 8 - "util.ts"
Cohesion: 0.16
Nodes (25): baseName(), buildSvg(), deserializeDoc(), docFromFile(), elementToPathData(), esc(), exportBytes(), extOf() (+17 more)

### Community 9 - "panels.tsx"
Cohesion: 0.05
Nodes (47): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), cbWeights(), c, grouped, id (+39 more)

### Community 10 - "extra.tsx"
Cohesion: 0.11
Nodes (17): addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, EXTRA_TOOLS, free, freeformTool, pathTarget() (+9 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.10
Nodes (15): ExportFormat, mcpStatus, TOOLS, Welcome(), MenuItems(), lastFilter, newDocument(), prettyKeys() (+7 more)

### Community 12 - "lib.rs"
Cohesion: 0.15
Nodes (33): AppHandle, Cursor, Header, Option, PathBuf, Request, Response, Result (+25 more)

### Community 14 - "cur"
Cohesion: 0.10
Nodes (25): MaskMeta, Rect, identityGrid(), presetGrid(), Pt, Quad, cancelTransform(), EDGES (+17 more)

### Community 15 - "select2.tsx"
Cohesion: 0.07
Nodes (23): deselect(), edgePath(), floodWindow(), snapToEdge(), finish(), line(), lineMarquee(), magAnchor() (+15 more)

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
Cohesion: 0.14
Nodes (25): fileToOpened(), OpenedFile, pickFiles(), activeIndex, interaction, needsFit, paint, tick (+17 more)

### Community 21 - "store.ts"
Cohesion: 0.05
Nodes (87): Asset, Brand, readAsset(), setAssetInfo(), trainingPath(), newText(), addCurrentDocument(), addTrainingFiles() (+79 more)

### Community 22 - "select.ts"
Cohesion: 0.10
Nodes (40): saveAs(), applyMask(), cropDoc(), deleteSelected(), MaskMode, rasterize(), reorder(), setClip() (+32 more)

### Community 23 - "App.tsx"
Cohesion: 0.20
Nodes (23): applyStroke(), composite(), drawContent(), drawLayer(), drawLayers(), drawShadowOnly(), drawShape(), drawText() (+15 more)

### Community 24 - "move.ts"
Cohesion: 0.19
Nodes (13): viewOpts, Layer, applied, boxMatrix(), drawTransformBox(), guides, handlePoints(), hitHandle() (+5 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.06
Nodes (87): FALLBACK, FontFamily, fontWeights(), GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, tauriInvoke() (+79 more)

### Community 27 - "vector.ts"
Cohesion: 0.18
Nodes (21): layerAt(), newPath(), toPathProps(), arcToCubics(), bezierExtents(), Cubic, mapPaths(), node() (+13 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (9): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+1 more)

### Community 29 - "flatten"
Cohesion: 0.14
Nodes (28): commit(), selectedLayers(), applyBrandFonts(), commitText(), OptionsBar(), updateText(), cmd(), rotateLayers() (+20 more)

### Community 30 - "Tool"
Cohesion: 0.33
Nodes (7): editSmartContents(), openDocState(), restore(), snapshotOf(), syncSmartParent(), cloneLayers(), restoreStart()

### Community 31 - "Kind"
Cohesion: 0.17
Nodes (9): DocState, RasterLayer, Stroke, Kind, runDab(), smooth(), Stroke, strokeTo() (+1 more)

### Community 33 - "install.ps1"
Cohesion: 0.48
Nodes (5): Get-LucentEditInstalls(), Uninstall-LucentEdit(), Write-Ok(), Write-Step(), Write-Warn2()

### Community 34 - "mcp-smoke-test.mjs"
Cohesion: 0.40
Nodes (4): checks, out, rpc(), tool()

### Community 35 - "lucentedit-mcp.mjs"
Cohesion: 0.60
Nodes (4): chain, findApp(), forward(), out()

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

### Community 46 - "adjust.ts"
Cohesion: 0.16
Nodes (29): placeAsset(), align(), AlignMode, base(), convertToSmart(), distribute(), fitAdjustments(), flipContent() (+21 more)

### Community 48 - "filters.ts"
Cohesion: 0.17
Nodes (15): AdjustLayer, Base, Effects, GlowFx, GradientStop, GroupLayer, LayerMask, ShadowFx (+7 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.31
Nodes (11): duplicateSelected(), moveInto(), select(), containerOf(), duplicateLayer(), walk(), duplicateLayerOp(), paste() (+3 more)

### Community 52 - "filters-algo.check.ts"
Cohesion: 0.13
Nodes (19): applyH(), a, assert, b, dst, f, g, H (+11 more)

### Community 53 - "controls.tsx"
Cohesion: 0.15
Nodes (13): Gradient, Paint, hsvToRgb(), rgbToHsv(), ColorPickerPopover(), evalNum(), NumField(), PaintEditor() (+5 more)

### Community 54 - "findLayerIn"
Cohesion: 0.15
Nodes (18): ToolId, setTool(), toolById(), toolShortcut(), beginTextEdit(), ActionDialogs(), App(), isTyping() (+10 more)

### Community 55 - "runDab"
Cohesion: 0.06
Nodes (112): autoSampleRect(), psdMaskIn(), writePsdBytes(), assetPreviewPNG(), assetThumb(), downscaled(), editablePixels(), flattenImage() (+104 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.10
Nodes (21): bg, brush, bucket, curDoc(), cursorPos, DialogState, gradientOpts, historyShift (+13 more)

### Community 57 - "warp.ts"
Cohesion: 0.16
Nodes (16): Field, Img, liquifyDab(), LiquifyKind, liquifyRender(), Mat3, newField(), sampleField() (+8 more)

### Community 62 - "cloneLayers"
Cohesion: 0.13
Nodes (20): newAdjustment(), filterById(), FILTERS, addLayer(), addMask(), createDoc(), uid(), finishPen() (+12 more)

### Community 63 - "render"
Cohesion: 0.25
Nodes (11): bern(), bezierPatch(), boundsOf(), drawMesh(), patchMesh(), renderQuad(), renderWarp(), toOut() (+3 more)

## Knowledge Gaps
- **324 isolated node(s):** `chain`, `name`, `version`, `description`, `type` (+319 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `select.ts` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `panels.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `move.ts`, `selectops.ts`, `vector.ts`, `flatten`, `Tool`, `adjust.ts`, `walk`, `findLayerIn`, `runDab`, `infoPanels.tsx`, `warp.ts`, `cloneLayers`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `commit()` connect `flatten` to `commands.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `panels.tsx`, `extra.tsx`, `dialogs.tsx`, `cur`, `touch`, `store.ts`, `select.ts`, `move.ts`, `selectops.ts`, `vector.ts`, `Tool`, `adjust.ts`, `walk`, `findLayerIn`, `runDab`, `infoPanels.tsx`, `warp.ts`, `cloneLayers`, `render`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `runDab` to `commands.ts`, `io.ts`, `retouch.tsx`, `util.ts`, `panels.tsx`, `extra.tsx`, `adjust.ts`, `select2.tsx`, `cur`, `filters-algo.check.ts`, `store.ts`, `select.ts`, `App.tsx`, `infoPanels.tsx`, `warp.ts`, `selectops.ts`, `vector.ts`, `cloneLayers`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **What connects `chain`, `name`, `version` to the rest of the system?**
  _324 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.041666666666666664 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10317460317460317 - nodes in this community are weakly interconnected._
- **Should `retouch.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.0425531914893617 - nodes in this community are weakly interconnected._