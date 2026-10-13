# Contributing to Lucent

Thanks for helping make Lucent better. Bug reports, feature ideas, docs fixes and code are all welcome.

## Getting started

1. Fork and clone the repo, then install the [build prerequisites](README.md#build-from-source).
2. `npm install`
3. `npm run app:dev` for the desktop app, or `npm run dev` for the browser-only version.

## Before opening a pull request

- `npm run typecheck` and `npm run build` pass.
- `cargo check` passes in `src-tauri/` if you touched Rust code.
- Keep changes focused: one feature or fix per PR, with a short description of what and why.
- UI changes: include a screenshot or short clip.
- New MCP tools: document them in the README tool table.

## Guidelines

- Lucent targets low-spec machines. Avoid heavy dependencies; prefer the platform (Canvas2D, Web APIs) over libraries.
- Match Photoshop/Illustrator behavior and shortcuts where it makes sense, so users feel at home.
- Be kind in issues and reviews.

## Reporting bugs

Use the [bug report template](https://github.com/Tanvir-Chowdhury/lucent/issues/new?template=bug_report.md) and include your OS, Lucent version and steps to reproduce.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
