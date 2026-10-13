# Graph Report - photoAgent  (2026-10-13)

## Corpus Check
- 53 files · ~109,970 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 915 nodes · 2724 edges · 46 communities (43 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.61)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7b37179c`
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
- tools/types.ts
- install.ps1
- mcp-smoke-test.mjs
- lucentedit-mcp.mjs
- DocState
- CLAUDE.md
- pct
- check
- colorToRGBA

## God Nodes (most connected - your core abstractions)
1. `cur()` - 81 edges
2. `ctx2d()` - 67 edges
3. `touch()` - 63 edges
4. `commit()` - 57 edges
5. `makeCanvas()` - 53 edges
6. `activeLayer()` - 30 edges
7. `flatten()` - 25 edges
8. `toast` - 23 edges
9. `findLayer()` - 23 edges
10. `refreshGroups()` - 22 edges

## Surprising Connections (you probably didn't know these)
- `onPaste()` --indirect_call--> `fileToOpened()`  [INFERRED]
  src/ui/App.tsx → src/core/io.ts
- `MenuBar()` --indirect_call--> `esc()`  [INFERRED]
  src/ui/chrome.tsx → src/core/io.ts
- `Thumb()` --calls--> `thumbnail()`  [EXTRACTED]
  src/ui/panels.tsx → src/core/render.ts
- `eachSource()` --calls--> `ctx2d()`  [EXTRACTED]
  src/tools/retouch.tsx → src/core/util.ts
- `ToolFlyout()` --indirect_call--> `close()`  [INFERRED]
  src/ui/chrome.tsx → src/ui/selectDialogs.tsx

## Import Cycles
- None detected.

## Communities (46 total, 3 thin omitted)

### Community 0 - "Contributing to Lucent"
Cohesion: 0.06
Nodes (31): Before opening a pull request, Contributing to LucentEdit, Getting started, Guidelines, How contributions work, Reporting bugs, Build and run, Build from source (+23 more)

### Community 1 - "commands.ts"
Cohesion: 0.07
Nodes (92): newAdjustment(), applyFilter(), defaultParams(), filterById(), FilterDef, filteredCopy(), FilterParam, FILTERS (+84 more)

### Community 2 - "io.ts"
Cohesion: 0.06
Nodes (84): baseName(), buildSvg(), deserializeDoc(), docFromFile(), elementToPathData(), esc(), exportBytes(), extOf() (+76 more)

### Community 3 - "retouch.tsx"
Cohesion: 0.04
Nodes (37): bgEraserKind, bgEraserOpts, bgEraserTool, blurKind, blurTool, burnTool, cloneOpts, cloneStampTool (+29 more)

### Community 4 - "server.ts"
Cohesion: 0.09
Nodes (42): readPath(), base(), groupSelected(), layerSummary(), newPath(), newShape(), newText(), removeLayers() (+34 more)

### Community 5 - "package.json"
Cohesion: 0.05
Nodes (39): ag-psd, @fontsource-variable/inter, lucide-preact, dependencies, ag-psd, @fontsource-variable/inter, lucide-preact, preact (+31 more)

### Community 6 - "bundle"
Cohesion: 0.05
Nodes (38): icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, libgtk-3-0, libwebkit2gtk-4.1-0, app (+30 more)

### Community 7 - "chrome.tsx"
Cohesion: 0.10
Nodes (35): maskBounds(), groupTools(), setTool(), toolById(), applyCrop(), cancelCrop(), commitText(), flyout (+27 more)

### Community 8 - "util.ts"
Cohesion: 0.10
Nodes (23): blurRGBA(), Gradient, Paint, clamp(), corners(), dataURLToBytes(), hslToRgb(), hsvToRgb() (+15 more)

### Community 9 - "panels.tsx"
Cohesion: 0.15
Nodes (24): moveInto(), scaleLayer(), setProps(), select(), walk(), snap(), snapshotLayer(), anchorRef (+16 more)

### Community 10 - "extra.tsx"
Cohesion: 0.09
Nodes (22): toPathProps(), hx(), addAnchorTool, anchorsOverlay(), convertPointTool, deleteAnchorTool, EXTRA_TOOLS, free (+14 more)

### Community 11 - "dialogs.tsx"
Cohesion: 0.10
Nodes (18): ExportFormat, resizeCanvas(), resizeImage(), featherSelection(), dialog, Welcome(), newDocument(), prettyKeys() (+10 more)

### Community 12 - "lib.rs"
Cohesion: 0.18
Nodes (22): AppHandle, Cursor, Header, Option, Request, Response, Result, handle() (+14 more)

### Community 13 - "selection.ts"
Cohesion: 0.15
Nodes (23): alphaCanvas(), boxBlurAlpha(), lastMask, maskAlpha(), MaskMeta, meta, modify(), modifyBorder() (+15 more)

### Community 14 - "cur"
Cohesion: 0.12
Nodes (22): canReselect(), ColorRangeTarget, loadSelection(), saveSelection(), cur(), Command, hasDoc(), hasMask() (+14 more)

### Community 15 - "select2.tsx"
Cohesion: 0.12
Nodes (19): deselect(), edgePath(), floodWindow(), snapToEdge(), finish(), magAnchor(), magClose(), magLive() (+11 more)

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
Nodes (17): gradientOpts, ToolId, ellipseMarquee, GROUP_ORDER, groupCurrent, handTool, rectMarquee, ShapeKind (+9 more)

### Community 20 - "touch"
Cohesion: 0.25
Nodes (17): fileToOpened(), OpenedFile, pickFiles(), touch(), unrotate(), zoomAt(), beginTextEdit(), fitView() (+9 more)

### Community 21 - "store.ts"
Cohesion: 0.12
Nodes (16): activeIndex, brush, bucket, closeDoc(), curDoc(), cursorPos, DialogState, interaction (+8 more)

### Community 22 - "select.ts"
Cohesion: 0.13
Nodes (12): SelMode, marquee, wand, drawTransformBox(), line(), ants(), cropTool, lassoTool (+4 more)

### Community 23 - "App.tsx"
Cohesion: 0.27
Nodes (12): useTick(), toolShortcut(), App(), isTyping(), onKeyDown(), onKeyUp(), onPaste(), MenuBar() (+4 more)

### Community 24 - "move.ts"
Cohesion: 0.19
Nodes (12): Layer, applied, boxMatrix(), drawPill(), guides, handlePoints(), hitHandle(), HP (+4 more)

### Community 25 - "permissions"
Cohesion: 0.15
Nodes (12): core:default, core:window:allow-destroy, core:window:allow-set-title, dialog:allow-open, dialog:allow-save, dialog:default, main, description (+4 more)

### Community 26 - "selectops.ts"
Cohesion: 0.29
Nodes (9): colorRange(), rangeSpec(), colorRangeAlpha(), gradientMagnitude(), luma(), RangeSpec, parseColor(), isDark() (+1 more)

### Community 27 - "vector.ts"
Cohesion: 0.20
Nodes (9): shapeOpts, strokeColor, CUSTOM_SHAPES, directTool, finishPen(), penNodes, penTool, shapeTool (+1 more)

### Community 28 - "retouch-px.ts"
Cohesion: 0.27
Nodes (9): blurred(), box1(), inpaint(), luma(), mix(), over(), pushPull(), Px (+1 more)

### Community 29 - "flatten"
Cohesion: 0.25
Nodes (9): previewDataURL(), flatten(), flatData(), grow(), magicWand(), similar(), growMask(), sampleAt() (+1 more)

### Community 31 - "Kind"
Cohesion: 0.29
Nodes (4): Kind, runDab(), smooth(), strokeTo()

### Community 32 - "tools/types.ts"
Cohesion: 0.25
Nodes (5): cropRect, PEvent, textEditing, ToolMeta, view

### Community 33 - "install.ps1"
Cohesion: 0.48
Nodes (5): Get-LucentEditInstalls(), Uninstall-LucentEdit(), Write-Ok(), Write-Step(), Write-Warn2()

### Community 34 - "mcp-smoke-test.mjs"
Cohesion: 0.40
Nodes (4): checks, out, rpc(), tool()

### Community 35 - "lucentedit-mcp.mjs"
Cohesion: 0.60
Nodes (4): chain, findApp(), forward(), out()

### Community 36 - "DocState"
Cohesion: 0.50
Nodes (4): DocState, RasterLayer, Stroke, Stroke

### Community 37 - "CLAUDE.md"
Cohesion: 0.50
Nodes (3): graphify, Project: LucentEdit, Skills (use automatically, no need to be asked)

### Community 38 - "pct"
Cohesion: 0.50
Nodes (4): BrushSliders(), FocusOptions(), pct(), ToneOptions()

## Knowledge Gaps
- **227 isolated node(s):** `chain`, `name`, `version`, `description`, `type` (+222 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cur()` connect `cur` to `commands.ts`, `io.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `panels.tsx`, `extra.tsx`, `dialogs.tsx`, `selection.ts`, `select2.tsx`, `index.ts`, `touch`, `store.ts`, `select.ts`, `App.tsx`, `move.ts`, `selectops.ts`, `vector.ts`, `flatten`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `touch()` connect `touch` to `commands.ts`, `io.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `panels.tsx`, `extra.tsx`, `dialogs.tsx`, `selection.ts`, `cur`, `select2.tsx`, `index.ts`, `store.ts`, `select.ts`, `App.tsx`, `move.ts`, `vector.ts`, `Kind`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `ctx2d()` connect `commands.ts` to `io.ts`, `retouch.tsx`, `server.ts`, `chrome.tsx`, `util.ts`, `panels.tsx`, `extra.tsx`, `dialogs.tsx`, `selection.ts`, `cur`, `select2.tsx`, `selectops.ts`, `flatten`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `chain`, `name`, `version` to the rest of the system?**
  _227 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Contributing to Lucent` be split into smaller, more focused modules?**
  _Cohesion score 0.06060606060606061 - nodes in this community are weakly interconnected._
- **Should `commands.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07379921665635951 - nodes in this community are weakly interconnected._
- **Should `io.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05747126436781609 - nodes in this community are weakly interconnected._