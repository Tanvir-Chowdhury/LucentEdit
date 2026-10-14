# Graph Report - photoAgent  (2026-10-14)

## Corpus Check
- 72 files · ~156,453 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1289 nodes · 3196 edges · 66 communities (60 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.54)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `71171866`
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

## God Nodes (most connected - your core abstractions)
1. `cur()` - 76 edges
2. `ctx2d()` - 75 edges
3. `makeCanvas()` - 60 edges
4. `touch()` - 58 edges
5. `commit()` - 50 edges
6. `toast` - 37 edges
7. `activeLayer()` - 32 edges
8. `flatten()` - 24 edges
9. `findLayer()` - 23 edges
10. `editablePixels()` - 20 edges

## Surprising Connections (you probably didn't know these)
- `cancelCrop()` --calls--> `touch()`  [EXTRACTED]
  src/tools/select.ts → src/core/store.ts
- `actualPixels()` --calls--> `cur()`  [EXTRACTED]
  src/ui/commands.ts → src/core/store.ts
- `hasDoc()` --calls--> `cur()`  [EXTRACTED]
  src/ui/commands.ts → src/core/store.ts
- `hasMask()` --calls--> `cur()`  [EXTRACTED]
  src/ui/commands.ts → src/core/store.ts
- `hasSel()` --calls--> `cur()`  [EXTRACTED]
  src/ui/commands.ts → src/core/store.ts

## Import Cycles
- None detected.

## Communities (66 total, 6 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.06
Nodes (31): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+23 more)

### Community 1 - "commands.ts"
Cohesion: 0.07
Nodes (3): CONTENTS, PS_COMMANDS, PsDialogs()

### Community 2 - "io.ts"
Cohesion: 0.12
Nodes (15): Gradient, Paint, hsvToRgb(), rgbToHsv(), ColorPickerPopover(), evalNum(), NumField(), openPicker() (+7 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (37): historyShift, bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts (+29 more)

### Community 4 - "server.ts"
Cohesion: 0.07
Nodes (58): actionForKey(), actions, assert, g, steps, confirmStop(), deleteAction(), deleteStep() (+50 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (39): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+31 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (38): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+30 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.09
Nodes (32): libraryFonts, App(), isTyping(), onKeyDown(), onKeyUp(), onPaste(), Welcome(), commitText() (+24 more)

### Community 8 - "util.ts"
Cohesion: 0.05
Nodes (79): newAdjustment(), baseName(), buildSvg(), deserializeDoc(), docFromFile(), elementToPathData(), esc(), exportBytes() (+71 more)

### Community 9 - "panels.tsx"
Cohesion: 0.08
Nodes (17): boxSumEnd(), defaultParams(), fbm(), FilterParam, keepLuma(), kuwahara(), luma(), lumaPlane() (+9 more)

### Community 10 - "extra.tsx"
Cohesion: 0.12
Nodes (12): addAnchorTool, convertPointTool, deleteAnchorTool, EXTRA_TOOLS, free, freeformTool, rotateViewTool, ruler (+4 more)

### Community 12 - "lib.rs"
Cohesion: 0.17
Nodes (27): AppHandle, Cursor, Header, Option, Request, Response, Result, DirEntry (+19 more)

### Community 14 - "cur"
Cohesion: 0.11
Nodes (23): gridFromQuad(), identityGrid(), presetGrid(), cancelTransform(), EDGES, H_PARTNER, handles(), hasLayer() (+15 more)

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
Nodes (16): marquee, wand, drawTransformBox(), cancelCrop(), cropTool, lassoTool, marqueeTool, points (+8 more)

### Community 20 - "touch"
Cohesion: 0.09
Nodes (22): brush, bucket, curDoc(), DialogState, gradientOpts, interaction, maskTarget, mcpStatus (+14 more)

### Community 21 - "store.ts"
Cohesion: 0.18
Nodes (25): FilterDef, applyFilter(), filteredCopy(), layerBoundsPx(), previewDataURL(), writePsdBytes(), flatten(), alphaCanvas() (+17 more)

### Community 22 - "select.ts"
Cohesion: 0.24
Nodes (7): border(), dilate(), erode(), gradientMagnitude(), luma(), RangeSpec, slideMax()

### Community 23 - "App.tsx"
Cohesion: 0.15
Nodes (29): saveAs(), addLayer(), editablePixels(), pixelMatrix(), activeLayer(), cur(), jumpTo(), redo() (+21 more)

### Community 24 - "move.ts"
Cohesion: 0.13
Nodes (26): align(), convertToSmart(), distribute(), moveLayer(), scaleLayer(), setProps(), topLevel(), viewOpts (+18 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.10
Nodes (48): Asset, assetPath(), assetPreviewPNG(), assetThumb(), browserFS(), chooseLibraryFolder(), connect(), createCategory() (+40 more)

### Community 27 - "vector.ts"
Cohesion: 0.22
Nodes (14): arcToCubics(), bezierExtents(), Cubic, mapPaths(), node(), normalizePaths(), parseSvgPath(), pathBounds() (+6 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.31
Nodes (5): blurred(), box1(), inpaint(), pushPull(), Px

### Community 29 - "flatten"
Cohesion: 0.12
Nodes (22): run(), AdjustProps(), anchorRef, Appearance(), BLEND_LABEL(), BOTTOM_TABS, commitSoon(), DocProps() (+14 more)

### Community 31 - "Kind"
Cohesion: 0.25
Nodes (4): Kind, runDab(), smooth(), strokeTo()

### Community 32 - "infoPanels.tsx"
Cohesion: 0.15
Nodes (16): flipContent(), flipLayers(), layerAt(), newPath(), toPathProps(), select(), pathTarget(), drawPill() (+8 more)

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
Cohesion: 0.25
Nodes (8): rgbOf(), hx(), normHex(), parseColor(), toHex(), isDark(), makeDab(), drawNodes()

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

### Community 46 - "adjust.ts"
Cohesion: 0.21
Nodes (23): AlignMode, base(), duplicateSelected(), groupSelected(), layerSummary(), MaskMode, moveInto(), newShape() (+15 more)

### Community 47 - "flatten"
Cohesion: 0.11
Nodes (20): ToolId, ellipseMarquee, GROUP_ORDER, groupCurrent, handTool, rectMarquee, setTool(), ShapeKind (+12 more)

### Community 48 - "filters.ts"
Cohesion: 0.31
Nodes (9): cropDoc(), fitAdjustments(), resizeCanvas(), resizeImage(), transformCanvas(), commit(), alignCmd(), rotateLayers() (+1 more)

### Community 49 - "contentaware.ts"
Cohesion: 0.07
Nodes (46): adaptColor(), autoSampleRect(), CaJob, diskImage(), noise(), cleanMask(), components(), contentAwareFill() (+38 more)

### Community 50 - "walk"
Cohesion: 0.10
Nodes (28): addMask(), applyMask(), deleteSelected(), flattenImage(), mergeDown(), newRaster(), rasterize(), setClip() (+20 more)

### Community 51 - "clamp"
Cohesion: 0.13
Nodes (20): canReselect(), colorRange(), loadSelection(), rangeSpec(), saveSelection(), colorRangeAlpha(), AddMode, close() (+12 more)

### Community 52 - "filters-algo.check.ts"
Cohesion: 0.12
Nodes (19): applyH(), a, assert, b, dst, f, g, H (+11 more)

### Community 54 - "findLayerIn"
Cohesion: 0.15
Nodes (13): callTool(), common(), handleMcp(), handleOne(), Json, num(), paintSchema, PROTOCOLS (+5 more)

### Community 55 - "runDab"
Cohesion: 0.18
Nodes (18): boxBlurAlpha(), ColorRangeTarget, drawQuickMaskOverlay(), featherSelection(), flatData(), grow(), lastMask, maskAlpha() (+10 more)

### Community 56 - "infoPanels.tsx"
Cohesion: 0.18
Nodes (14): bg, cursorPos, fg, useTick(), sampleAt(), samplers, viewportSize, hex() (+6 more)

### Community 57 - "warp.ts"
Cohesion: 0.17
Nodes (14): bern(), bezierPatch(), Field, Img, liquifyDab(), LiquifyKind, liquifyRender(), Mat3 (+6 more)

### Community 58 - "filters-algo.check.ts"
Cohesion: 0.17
Nodes (10): c, grouped, id, ids, menuFilters, rows, filterById(), FILTERS (+2 more)

### Community 59 - "clamp"
Cohesion: 0.26
Nodes (11): cbWeights(), convolve3(), curveLUT(), formatCurve(), hslShift(), medianImg(), parseCurve(), stretchLUT() (+3 more)

### Community 60 - "Viewport.tsx"
Cohesion: 0.38
Nodes (9): COALESCE, drawRulers(), endGuideDrag(), niceStep(), spaceDown, startGuideDrag(), TextEditor(), viewMatrix() (+1 more)

### Community 61 - "setSelection"
Cohesion: 0.25
Nodes (9): quickMaskStandIn(), reselect(), selectAll(), selectLayerPixels(), setSelection(), toggleQuickMask(), cloneCanvas(), maskStandIn() (+1 more)

### Community 62 - "cloneLayers"
Cohesion: 0.29
Nodes (8): editSmartContents(), openDocState(), restore(), snapshotOf(), syncSmartParent(), cloneLayers(), restoreStart(), newDocument()

### Community 63 - "render"
Cohesion: 0.36
Nodes (8): boundsOf(), drawMesh(), renderQuad(), renderWarp(), toOut(), applyTransform(), layer(), render()

### Community 64 - "blurImg"
Cohesion: 0.40
Nodes (5): blurImg(), blurRGBA(), boxPlane(), copyImg(), unsharp()

### Community 65 - "Rect"
Cohesion: 0.40
Nodes (5): MaskMeta, Rect, Pt, Quad, Session

## Knowledge Gaps
- **301 isolated node(s):** `Table of contents`, `Why LucentEdit`, `Features`, `macOS`, `Windows` (+296 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `runStep()` connect `server.ts` to `filters.ts`, `findLayerIn`, `App.tsx`?**
  _High betweenness centrality (0.212) - this node is a cross-community bridge._
- **Why does `cur()` connect `App.tsx` to `retouch.tsx`, `server.ts`, `extra.tsx`, `cur`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `move.ts`, `infoPanels.tsx`, `adjust.ts`, `flatten`, `filters.ts`, `contentaware.ts`, `walk`, `clamp`, `runDab`, `infoPanels.tsx`, `setSelection`, `cloneLayers`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Why does `activeLayer()` connect `App.tsx` to `infoPanels.tsx`, `retouch.tsx`, `server.ts`, `extra.tsx`, `adjust.ts`, `cur`, `filters.ts`, `contentaware.ts`, `walk`, `clamp`, `touch`, `setSelection`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **What connects `Table of contents`, `Why LucentEdit`, `Features` to the rest of the system?**
  _301 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._