# Graph Report - photoAgent  (2026-10-14)

## Corpus Check
- 75 files · ~160,121 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1328 nodes · 3328 edges · 67 communities (61 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 46 edges (avg confidence: 0.54)
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
- touch
- findLayerIn
- runDab
- infoPanels.tsx
- warp.ts
- filters-algo.check.ts
- clamp
- Viewport.tsx
- setSelection
- cloneLayers
- render
- blurImg
- Rect
- DocState

## God Nodes (most connected - your core abstractions)
1. `cur()` - 76 edges
2. `ctx2d()` - 75 edges
3. `makeCanvas()` - 60 edges
4. `touch()` - 58 edges
5. `commit()` - 50 edges
6. `toast` - 37 edges
7. `activeLayer()` - 32 edges
8. `refreshLibrary()` - 25 edges
9. `flatten()` - 24 edges
10. `findLayer()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `previewDataURL()` --calls--> `flatten()`  [EXTRACTED]
  src/core/io.ts → src/core/render.ts
- `cancelCrop()` --calls--> `touch()`  [EXTRACTED]
  src/tools/select.ts → src/core/store.ts
- `ContentAwareDialogs()` --calls--> `cur()`  [EXTRACTED]
  src/ui/contentAware.tsx → src/core/store.ts
- `hasDoc()` --calls--> `cur()`  [EXTRACTED]
  src/ui/selectDialogs.tsx → src/core/store.ts
- `hasMask()` --calls--> `cur()`  [EXTRACTED]
  src/ui/selectDialogs.tsx → src/core/store.ts

## Import Cycles
- None detected.

## Communities (67 total, 6 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.06
Nodes (31): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+23 more)

### Community 1 - "commands.ts"
Cohesion: 0.05
Nodes (16): BRAND_SCHEMA, callTool(), common(), handleMcp(), handleOne(), Json, num(), paintSchema (+8 more)

### Community 2 - "io.ts"
Cohesion: 0.11
Nodes (19): rgbOf(), Gradient, hsvToRgb(), normHex(), parseColor(), rgbToHsv(), toHex(), isDark() (+11 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (36): bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts, cloneStampTool (+28 more)

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
Cohesion: 0.13
Nodes (18): commitText(), filterMenu(), flyout, FONTS, FontSelect(), hideTip(), MenuBar(), MenuEntry (+10 more)

### Community 8 - "util.ts"
Cohesion: 0.17
Nodes (26): baseName(), deserializeDoc(), docFromFile(), elementToPathData(), ExportFormat, extOf(), fileToOpened(), importSvg() (+18 more)

### Community 9 - "panels.tsx"
Cohesion: 0.05
Nodes (43): blurImg(), blurRGBA(), boxPlane(), boxSumEnd(), cbWeights(), c, grouped, id (+35 more)

### Community 10 - "extra.tsx"
Cohesion: 0.11
Nodes (14): toPathProps(), addAnchorTool, convertPointTool, deleteAnchorTool, EXTRA_TOOLS, free, freeformTool, pathTarget() (+6 more)

### Community 12 - "lib.rs"
Cohesion: 0.16
Nodes (29): AppHandle, Cursor, Header, Option, Request, Response, Result, DirEntry (+21 more)

### Community 14 - "cur"
Cohesion: 0.11
Nodes (20): MaskMeta, Rect, Pt, Quad, cancelTransform(), EDGES, H_PARTNER, handles() (+12 more)

### Community 15 - "select2.tsx"
Cohesion: 0.11
Nodes (19): deselect(), SelMode, finish(), line(), magAnchor(), magClose(), magLive(), magnetic (+11 more)

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
Cohesion: 0.11
Nodes (14): marquee, wand, cancelCrop(), cropTool, lassoTool, marqueeTool, points, wandTool (+6 more)

### Community 20 - "touch"
Cohesion: 0.11
Nodes (16): activeIndex, brush, bucket, curDoc(), DialogState, gradientOpts, historyShift, interaction (+8 more)

### Community 21 - "store.ts"
Cohesion: 0.15
Nodes (31): FilterDef, applyFilter(), filteredCopy(), psdMaskIn(), applyMask(), flattenImage(), flipContent(), flipLayers() (+23 more)

### Community 22 - "select.ts"
Cohesion: 0.23
Nodes (8): border(), colorRangeAlpha(), dilate(), erode(), gradientMagnitude(), luma(), RangeSpec, slideMax()

### Community 23 - "App.tsx"
Cohesion: 0.15
Nodes (28): autoSampleRect(), addLayer(), editablePixels(), mergeDown(), newRaster(), rasterize(), activeLayer(), toast (+20 more)

### Community 24 - "move.ts"
Cohesion: 0.14
Nodes (16): viewOpts, hx(), applied, boxMatrix(), drawPill(), drawTransformBox(), guides, handlePoints() (+8 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.06
Nodes (85): FALLBACK, FontFamily, fontWeights(), GENERIC_FONTS, loadSystemFonts(), systemFonts, systemFontsState, activeBrand (+77 more)

### Community 27 - "vector.ts"
Cohesion: 0.22
Nodes (14): arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths(), parseSvgPath(), pathBounds() (+6 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.31
Nodes (5): blurred(), box1(), inpaint(), pushPull(), Px

### Community 29 - "flatten"
Cohesion: 0.14
Nodes (17): AdjustProps(), anchorRef, Appearance(), BLEND_LABEL(), BOTTOM_TABS, commitSoon(), DocProps(), done() (+9 more)

### Community 31 - "Kind"
Cohesion: 0.25
Nodes (4): Kind, runDab(), smooth(), strokeTo()

### Community 32 - "infoPanels.tsx"
Cohesion: 0.16
Nodes (14): select(), shapeOpts, strokeColor, beginTextEdit(), CUSTOM_SHAPES, directTool, editTarget(), hitNode() (+6 more)

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
Cohesion: 0.23
Nodes (22): writePsdBytes(), applyAdjust(), applyStroke(), checkerPattern(), composite(), drawContent(), drawLayer(), drawLayers() (+14 more)

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

### Community 46 - "adjust.ts"
Cohesion: 0.15
Nodes (43): align(), AlignMode, base(), convertToSmart(), distribute(), duplicateSelected(), fitAdjustments(), groupSelected() (+35 more)

### Community 47 - "flatten"
Cohesion: 0.10
Nodes (21): ToolId, ellipseMarquee, GROUP_ORDER, groupCurrent, handTool, rectMarquee, setTool(), ShapeKind (+13 more)

### Community 48 - "filters.ts"
Cohesion: 0.13
Nodes (17): newAdjustment(), renderHooks, AdjustLayer, Base, Effects, GlowFx, GradientStop, GroupLayer (+9 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.09
Nodes (36): adaptColor(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill(), dilateBin() (+28 more)

### Community 50 - "walk"
Cohesion: 0.10
Nodes (37): saveAs(), addMask(), cropDoc(), deleteSelected(), MaskMode, setClip(), clearSelection(), copyPixels() (+29 more)

### Community 51 - "clamp"
Cohesion: 0.14
Nodes (16): canReselect(), loadSelection(), saveSelection(), AddMode, close(), Dialog(), hasDoc(), hasMask() (+8 more)

### Community 52 - "filters-algo.check.ts"
Cohesion: 0.14
Nodes (14): assert, b, dst, f, g, H, img, m (+6 more)

### Community 54 - "findLayerIn"
Cohesion: 0.20
Nodes (13): App(), isTyping(), onKeyDown(), onKeyUp(), onPaste(), Welcome(), StatusBar(), Tabs() (+5 more)

### Community 55 - "runDab"
Cohesion: 0.14
Nodes (25): alphaCanvas(), boxBlurAlpha(), colorRange(), ColorRangeTarget, drawQuickMaskOverlay(), flatData(), grow(), lastMask (+17 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.19
Nodes (13): bg, cursorPos, fg, useTick(), samplers, viewportSize, hex(), HistogramPanel() (+5 more)

### Community 57 - "warp.ts"
Cohesion: 0.16
Nodes (15): bern(), bezierPatch(), Field, Img, liquifyDab(), LiquifyKind, liquifyRender(), Mat3 (+7 more)

### Community 58 - "filters-algo.check.ts"
Cohesion: 0.15
Nodes (11): layerBoundsPx(), Doc, Layer, corners(), dataURLToBytes(), downloadBlob(), hslToRgb(), layerMatrix() (+3 more)

### Community 59 - "clamp"
Cohesion: 0.29
Nodes (8): applyH(), a, gridFromQuad(), homography(), quadMesh(), solve8(), setTransformMode(), startTransform()

### Community 60 - "Viewport.tsx"
Cohesion: 0.38
Nodes (9): COALESCE, drawRulers(), endGuideDrag(), niceStep(), spaceDown, startGuideDrag(), TextEditor(), viewMatrix() (+1 more)

### Community 61 - "setSelection"
Cohesion: 0.33
Nodes (5): jumpTo(), redo(), undo(), Liquify(), TOOLS

### Community 62 - "cloneLayers"
Cohesion: 0.33
Nodes (7): editSmartContents(), openDocState(), restore(), snapshotOf(), cloneLayers(), restoreStart(), newDocument()

### Community 63 - "render"
Cohesion: 0.36
Nodes (8): boundsOf(), drawMesh(), renderQuad(), renderWarp(), toOut(), applyTransform(), layer(), render()

### Community 64 - "blurImg"
Cohesion: 0.40
Nodes (5): buildSvg(), esc(), exportBytes(), serializeDoc(), canvasToBlob()

### Community 65 - "Rect"
Cohesion: 0.40
Nodes (5): identityGrid(), presetGrid(), schedule(), setPreset(), TransformOptions()

### Community 66 - "DocState"
Cohesion: 0.67
Nodes (4): DocState, RasterLayer, Stroke, Stroke

## Knowledge Gaps
- **306 isolated node(s):** `Table of contents`, `Why LucentEdit`, `Features`, `macOS`, `Windows` (+301 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `runStep()` connect `server.ts` to `commands.ts`, `walk`, `adjust.ts`, `App.tsx`?**
  _High betweenness centrality (0.221) - this node is a cross-community bridge._
- **Why does `cur()` connect `walk` to `retouch.tsx`, `server.ts`, `extra.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `App.tsx`, `move.ts`, `infoPanels.tsx`, `adjust.ts`, `flatten`, `clamp`, `runDab`, `infoPanels.tsx`, `clamp`, `setSelection`, `cloneLayers`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Why does `commit()` connect `adjust.ts` to `infoPanels.tsx`, `retouch.tsx`, `server.ts`, `extra.tsx`, `cur`, `walk`, `touch`, `store.ts`, `App.tsx`, `move.ts`, `setSelection`, `cloneLayers`, `render`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **What connects `Table of contents`, `Why LucentEdit`, `Features` to the rest of the system?**
  _306 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04846938775510204 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10666666666666667 - nodes in this community are weakly interconnected._