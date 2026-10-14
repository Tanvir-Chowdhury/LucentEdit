# LucentEdit Roadmap

From photo editor to brand-aware creative studio. These are the features planned for designers, design teams and marketing teams. They build on what LucentEdit already has: Smart Objects, Warp, Select Subject, Actions, Brands, the Assets library and the MCP server. Everything stays local-first and free, and your own AI agents do the repetitive work.

**Status key:** ✅ shipped · 🧭 planned. Have an idea or want to help build one? [Open an issue](https://github.com/Tanvir-Chowdhury/LucentEdit/issues/new?template=feature_request.md).

## Contents

- [Brand Training](#brand-training) ✅ v0.7.0
- [Designers](#designers)
- [Design teams](#design-teams)
- [Marketing teams](#marketing-teams)
- [AI agents](#ai-agents)
- [Build order](#build-order)

---

## Brand Training

✅ **Shipped in v0.7.0.** Agents learn how each brand designs.

Each brand gets a training library of its past designs and inspiration. LucentEdit analyzes them into a **Brand Style Profile**, a description of how that brand actually lays out, sets type, uses color and places its logo. AI agents read the profile and the closest examples, then recreate the look for new briefs using that brand's own logos, fonts, colors and photos. Every brand is trained separately, so an agency can run many clients side by side.

### What goes into a brand's training library

| Bucket | What to add | What is learned |
|---|---|---|
| **Approved** | Designs the brand shipped: `.lucentedit`, PSD, SVG, PNG, JPG | Everything: palette, type, layout, layouts to reuse. Layered files teach structure; flat images teach color |
| **Inspiration** | References the brand wants to move toward | Layout ideas only. Never their colors, fonts or content |
| **Avoid** | Rejected drafts and "never do this" examples, with a note | Colors to stay away from; agents treat them as negative examples |

Each example can carry a **note** ("logo always bottom right", "neon is off-brand"). Agents read the notes with the example.

### Where it lives

```
Assets folder/
└─ Brands/
   ├─ Acme Coffee/
   │  ├─ brand.json          # colors, fonts, guidelines
   │  ├─ Logos/ Photos/ …    # brand assets
   │  └─ Training/
   │     ├─ Approved/        # past designs
   │     ├─ Inspiration/     # reference only
   │     ├─ Avoid/           # don'ts
   │     └─ style.json       # the learned Brand Style Profile
   └─ Northwind Bank/
      └─ Training/ …         # a fully separate profile
```

Notes and tags are kept in the library's `library.json`, so the folders stay plain files you can sync with Drive, Dropbox or git.

### What the Brand Style Profile captures

- **Palette**: the brand's colors and how much of the canvas each one covers, plus colors to avoid.
- **Grounds**: whether the brand mostly designs on light or dark backgrounds.
- **Typography**: headline size relative to the canvas, headline-to-body ratio, weights, typical headline length, uppercase habit, fonts per role.
- **Layout**: margins, how much space is left empty, where the logo and headline usually sit, how often a button or photo appears.
- **Layouts (archetypes)**: recurring arrangements pulled from layered files, each a reusable template with slots (headline, body, CTA, logo, photo…).
- **Summary**: the same facts in plain language, for people and agents.

### How an agent uses it

1. **Read the brand.** `get_brand_style` returns the profile, learned layouts and summary.
2. **Find references.** `find_similar_examples` ranks the brand's examples for the brief or target size; `get_example` shows one with its analyzed structure.
3. **Start from a learned layout.** `recreate_layout` builds a new document from one of the brand's own layouts, with its fonts, colors and logo already in place. Every layer gets a role.
4. **Fill it.** The agent writes the copy and places photos from the brand's own folders.
5. **Check and fix.** `score_brand_fit` scores the design from 0 to 100 (brand colors, avoided colors, fonts, headline size, hierarchy, margins, logo, ground, empty space) and lists what to fix. Agents iterate until 85 or more.
6. **Learn from the verdict.** `add_training_example` saves approved work to Approved, and rejected drafts to Avoid with the reason. `retrain_brand` rebuilds the profile.

In the app, the same is in **Brands → Training**: add files or the open design, **Learn brand style**, **Check current design**, and click a learned layout to start a new document from it.

### Multiple brands, kept apart

- Each brand trains only on its own folder. Switching the active brand switches what agents learn from and which assets they use.
- Layers can carry a **role** (headline, logo, CTA…), set by hand, by agents, or inferred automatically.
- Everything stays in your local folder. No account and no upload.

> **No model fine-tuning.** "Training" means a structured style profile plus a searchable library of examples, so it works with whichever AI agent your team already uses.

### Next for Brand Training 🧭

- Optional on-device image embeddings for sharper similarity search on flat images.
- Region pins on examples (circle the logo and note "always this size").
- Agency mode: warn when one design mixes assets from two brands.
- Export a brand (assets, kit, training, profile) as one portable pack.
- A similarity guard that warns when a draft gets too close to an inspiration example.

---

## Designers

| # | Feature | Status |
|---|---|---|
| 1 | **Semantic layers**: layers carry a role (headline, logo, CTA…) | ✅ Basic, shipped with Brand Training; editing roles in the Properties panel 🧭 |
| 2 | **Auto-layout frames** for photo and vector: stacks with padding, gap, hug/fill, min/max | 🧭 |
| 3 | **Branch and compare**: fork into Direction A/B/C, compare side by side, merge winning layers back | 🧭 |
| 4 | **Visual diff** between versions, with a list of changed layers (shows exactly what an agent changed) | 🧭 |
| 5 | **Professional typography**: OpenType features, variable-font axes, optical kerning, text on a path, baseline grid | 🧭 |
| 6 | **Print-ready color**: CMYK soft-proof, ICC profiles, spot swatches, PDF/X with bleed and crop marks | 🧭 |
| 7 | **Mockup engine**: one design rendered into 20 scenes via Smart Object slots, perspective warp and displacement | 🧭 |
| 8 | **Color grading**: `.cube` LUTs, Match Color, grading presets per brand | 🧭 |
| 9 | **Moodboard canvas** linked to a brand; items can feed its Inspiration library | 🧭 |
| 10 | **Developer-ready export**: slices, @1x/@2x/@3x, WebP/AVIF size targets, naming templates | 🧭 |

## Design teams

A shared folder (Drive, Dropbox, a NAS) becomes the team library, with no servers and no accounts.

| # | Feature | Status |
|---|---|---|
| 11 | **Linked components**: update a logo once, every document using it updates | 🧭 |
| 12 | **Brand rules as code**: minimum logo size, clear space, allowed color pairs, required legal lines; run in app, MCP and CI | 🧭 |
| 13 | **Locked templates**: marketers edit only the slots a designer unlocked | 🧭 |
| 14 | **Design tokens** in and out: W3C DTCG, Tailwind, Figma variables | 🧭 |
| 15 | **Git-friendly files and a GitHub Action** that posts before/after previews on pull requests | 🧭 |
| 16 | **Inspect and handoff**: redlines, spacing, CSS/Tailwind/SwiftUI snippets | 🧭 |
| 17 | **Review rounds**: comment pins, approvals, reviewer mode; approved designs go straight into Brand Training | 🧭 |
| 18 | **Asset usage map**: find every file using the old logo and replace it everywhere | 🧭 |
| 19 | **Font licence tracker**: warns when a font isn't cleared for that use | 🧭 |

## Marketing teams

| # | Feature | Status |
|---|---|---|
| 20 | **Campaign matrix**: messages × channels × sizes, every cell a live render, export with a variant manifest | 🧭 |
| 21 | **Smart resize** by role and constraint, focal-point crops, auto-fit text, per-size overrides | 🧭 |
| 22 | **Channel spec library**: sizes, safe zones, file-size caps for Meta, Google Ads, LinkedIn, TikTok, YouTube, Amazon, email, print | 🧭 |
| 23 | **Data merge** from CSV, Sheets or JSON with conditional layers and locale formats | 🧭 |
| 24 | **Localization studio**: string tables, +35% length stress test, RTL, font fallback per script | 🧭 |
| 25 | **Compliance preflight**: disclaimers, trademark marks, price formats, WCAG contrast, alt text | 🧭 |
| 26 | **Branded QR codes** with UTM tracking per variant | 🧭 |
| 27 | **Product feed to catalog ads**: background removal, shadows, consistent framing, price badges | 🧭 |
| 28 | **Time-based variants**: countdown and date layers | 🧭 |
| 29 | **HTML5 banners and light motion**: GIF, MP4, Lottie | 🧭 |
| 30 | **Delivery packs**: ZIP per channel, naming conventions, approval contact sheet | 🧭 |
| 31 | **Results loop**: import CTR/CVR/ROAS by variant; winners join the brand's training library | 🧭 |

## AI agents

| # | Feature | Status |
|---|---|---|
| 32 | **Annotation channel**: circle an area, write a note; the agent gets the region, its layers and the note | 🧭 |
| 33 | **Brief to three directions**, each checked with the brand-fit score, on a comparison board | 🧭 |
| 34 | **Agent roles**: copy, layout and brand-guard agents working from MCP resources and prompts | 🧭 |
| 35 | **Trust controls**: per-session modes, tool approval, audit log with thumbnails, undo a whole agent session | 🧭 (folder-change confirmation shipped in v0.6.0) |
| 36 | **History as a tutorial**: scrub, replay or save an agent's steps as an Action | 🧭 |
| 37 | **Headless renderer**: CLI and Docker for cron, n8n or Zapier | 🧭 |
| 38 | **Bring your own model**: local ComfyUI / Stable Diffusion or any API | 🧭 |

## Build order

| Step | Build | Why then |
|---|---|---|
| 1 | Semantic layers + locked templates | Most other features depend on them |
| 2 | ✅ Brand Training | Agent output looks like the brand from day one |
| 3 | Smart resize + channel spec library | The most visible time-saver for marketers |
| 4 | Data merge + campaign matrix | Replaces paid bulk-creation tools |
| 5 | Brand rules as code | Lets teams trust agent output at volume |
| 6 | Linked components + review rounds | Team workflow on a shared folder; approvals feed training |
| 7 | Annotation channel + trust controls | Agent features nobody else has |
| 8 | Localization + compliance preflight | Needed by larger marketing teams |
| 9 | Headless renderer | Puts LucentEdit inside automation pipelines |
