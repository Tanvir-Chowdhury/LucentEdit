## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).

## Skills (use automatically, no need to be asked)

- **ponytail** (plugin, auto-activated by its SessionStart hook): apply on every coding task. Simplest working solution, reuse before writing, stdlib/native first, mark shortcuts with `ponytail:` comments.
- **agent-skills** (addyosmani, 24 skills): at the start of any non-trivial task, consult `using-agent-skills` to pick the matching skill (spec, planning, incremental-implementation, TDD, debugging, code-review, security, shipping, etc.) and follow it.
- **graphify**: once the project has code, build the graph with `/graphify .` and follow the graphify rules above for codebase questions.

## Project: Lucent

Free, open-source Photoshop + Illustrator alternative with a built-in MCP server. Tauri v2 shell (`src-tauri/`, Rust) + Preact/TypeScript/Canvas2D frontend (`src/`).

- `src/core/`: document model (`types.ts`), store + history (`store.ts`), layer ops (`ops.ts`), renderer (`render.ts`), selections (`selection.ts`), filters (`filters.ts`), file formats incl. PSD/SVG (`io.ts`), bezier paths (`paths.ts`).
- `src/tools/`: one module per tool group; tools implement the `Tool` interface in `tools/types.ts`.
- `src/ui/`: components; every user action is a command in `ui/commands.ts` (menus, shortcuts, palette).
- `src/mcp/server.ts`: MCP JSON-RPC handler + tool definitions. Rust relays `POST 127.0.0.1:47800/mcp` to it via the `mcp-request` event. `mcp/lucent-mcp.mjs` is the stdio bridge.
- Rules: mutate layers in place, then `commit(label)` for a history step; never mutate a raster canvas that history may share (use `editablePixels`/clone first). Components that read `cur()` re-render on `tick`.
- Dev: `npm run dev` (web, port 1420), `npm run app:dev` (desktop), `npm run build`, `npm run test:mcp` (needs the app running). Rust toolchain lives at `~/.rustup/toolchains/stable-x86_64-unknown-linux-gnu/bin` (not on PATH).
