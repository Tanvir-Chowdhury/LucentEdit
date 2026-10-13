# Contributing to LucentEdit

Thanks for helping make LucentEdit better. Bug reports, feature ideas, docs fixes and code are all welcome.

## How contributions work

`main` is protected: nobody can push to it directly. Every change goes through a pull request that passes CI and is approved by the maintainer.

- **Found a bug or have an idea?** [Open an issue](https://github.com/Tanvir-Chowdhury/LucentEdit/issues/new/choose). It can be picked up and solved later by you or anyone else.
- **Want to fix or build something?** Comment on the issue so others know you're on it, then:
  1. Fork the repo and clone your fork.
  2. Create a branch from `main`: `git checkout -b fix/short-description` (or `feat/...`, `docs/...`).
  3. Make your change, commit, and push the branch to your fork.
  4. Open a pull request against `main` and link the issue (`Fixes #123`).
  5. CI must pass and the maintainer must approve before it's merged.

## Getting started

1. Install the [build prerequisites](README.md#build-from-source).
2. `npm install`
3. `npm run app:dev` for the desktop app, or `npm run dev` for the browser-only version.

## Before opening a pull request

- `npm run typecheck` and `npm run build` pass.
- `cargo check` passes in `src-tauri/` if you touched Rust code.
- Keep changes focused: one feature or fix per PR, with a short description of what and why.
- UI changes: include a screenshot or short clip.
- New MCP tools: document them in the README tool table.

## Guidelines

- LucentEdit targets low-spec machines. Avoid heavy dependencies; prefer the platform (Canvas2D, Web APIs) over libraries.
- Match Photoshop/Illustrator behavior and shortcuts where it makes sense, so users feel at home.
- Be kind in issues and reviews.

## Reporting bugs

Use the [bug report template](https://github.com/Tanvir-Chowdhury/LucentEdit/issues/new?template=bug_report.md) and include your OS, LucentEdit version and steps to reproduce.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
