# 📘 0. System Definition

## Objective

Build a **GitHub Pages website** that:

* Uses an Obsidian repo as the **single source of truth**
* Automatically syncs a **specific folder subtree**
* Renders markdown into a structured website
* Preserves:

  * folder hierarchy
  * tags
  * metadata (ratings, status, etc.)
* Supports extensible metadata parsing (e.g., stars, scores, future types)

---

# 🧭 1. Core Principles (NON-NEGOTIABLE)

1. **Source of Truth**

   * Obsidian repo = canonical content
   * Website repo = derived output

2. **Deterministic Build**

   * Same input → same output
   * No runtime fetching

3. **Strict Schema**

   * No implicit assumptions
   * Fail fast on invalid data

4. **Single Config Control**

   * All behavior configurable via ONE file

5. **Extensibility**

   * Parsers and UI components must be pluggable

---

# 🏗️ 2. Repository Architecture

## Repo A — Obsidian Vault

```id="obsidian-structure"
vault/
├── publish/                # ONLY this folder is synced
│   ├── notes/
│   ├── blog/
│   └── experiments/
│
├── private/                # NEVER synced
└── assets/
```

---

## Repo B — Website

```id="website-structure"
site/
├── src/
│   ├── content/imported/   # AUTO-GENERATED (DO NOT EDIT)
│   ├── parsers/            # metadata parsers
│   ├── components/
│   ├── layouts/
│   └── pages/
│
├── config/
│   └── site.config.ts      # SINGLE SOURCE CONFIG
│
├── scripts/
│   └── sync.ts             # optional local sync
│
└── .github/workflows/
```

---

# 🔄 3. Sync System (CRITICAL)

## Trigger

* On every push to Obsidian repo (`main` branch)

## Workflow

```id="sync-flow"
1. Detect changes in /publish
2. Copy subtree
3. Push to site repo:
   → src/content/imported/
4. Trigger site build
5. Deploy to GitHub Pages
```

---

## Sync Rules

### MUST:

* Preserve folder structure EXACTLY
* Preserve filenames
* Copy referenced images

### MUST NOT:

* Modify markdown content
* Inject metadata during sync
* Flatten directories

---

# 📁 4. Content Contract

## Required Frontmatter

```yaml id="required-frontmatter"
---
title: string
date: YYYY-MM-DD
tags: string[]
type: "note" | "blog" | "experiment"
---
```

---

## Optional Metadata (Extensible)

```yaml id="optional-frontmatter"
---
rating: 4          # 1–5 stars
score: 8           # out of 10
status: "draft"    # draft | final | idea
featured: true
series: "ml-notes"
---
```

---

## Inline Tags

```md id="inline-tags"
This is important #ml #agents
```

---

## Rules

* Frontmatter overrides inline tags only for structured fields
* Tags = union(frontmatter + inline)
* Unknown fields → passed to parser system

---

# 🧠 5. Metadata Parsing System (EXTENSIBLE CORE)

This is the most important extensibility layer.

## Design

Each metadata field is handled by a **parser module**.

---

## Parser Interface

```ts id="parser-interface"
export interface MetadataParser {
  key: string;
  render: (value: any) => string | JSX.Element;
  validate?: (value: any) => boolean;
  priority?: number;
}
```

---

## Parser Registry

```ts id="parser-registry"
export const parsers = [
  ratingParser,
  scoreParser,
  statusParser,
];
```

---

## Example Parsers

### ⭐ Star Rating

```ts id="rating-parser"
export const ratingParser = {
  key: "rating",
  render: (value: number) => "★".repeat(value) + "☆".repeat(5 - value),
};
```

---

### 🔢 Score (Out of 10)

```ts id="score-parser"
export const scoreParser = {
  key: "score",
  render: (value: number) => `${value}/10`,
};
```

---

### 🏷 Status

```ts id="status-parser"
export const statusParser = {
  key: "status",
  render: (value: string) => `[${value.toUpperCase()}]`,
};
```

---

## Expansion Rule

To add new metadata:

1. Add field in markdown
2. Create parser
3. Register in registry

NO other code changes required.

---

# 🗂️ 6. URL + Routing Rules

| Type        | URL Pattern            |
| ----------- | ---------------------- |
| Notes       | `/notes/<path>/<slug>` |
| Blog        | `/blog/<slug>`         |
| Experiments | `/experiments/<slug>`  |

---

## Folder Mapping

```id="folder-mapping"
publish/notes/ml/transformers.md
→ /notes/ml/transformers
```

---

# 🎨 7. UI Rendering Rules

## Page Layout

```id="layout"
Header
Sidebar (folder tree)
Main Content
Metadata Panel
Footer
```

---

## Metadata Display

* Render using parser system
* Order by parser priority
* Unknown fields → fallback renderer

---

## Tag System

* Tags rendered as clickable chips
* `/tags/<tag>` pages auto-generated

---

# 🧩 8. Navigation System

## Must Support

* Folder tree navigation
* Breadcrumbs
* Tag navigation

---

# ⚙️ 9. Central Config (MANDATORY)

```ts id="site-config"
export const config = {
  source: {
    repo: "obsidian-repo",
    branch: "main",
    folder: "publish",
  },

  content: {
    basePath: "src/content/imported",
    types: ["notes", "blog", "experiments"],
  },

  metadata: {
    enabledParsers: ["rating", "score", "status"],
  },

  ui: {
    showSidebar: true,
    showBreadcrumbs: true,
  },
};
```

---

## Rule

👉 ALL behavior must be configurable from this file
👉 No hardcoded paths anywhere else

---

# 🧪 10. Agent Implementation Plan

## Phase 1 — Sync

* Implement GitHub Action
* Mirror publish folder
* Verify integrity

---

## Phase 2 — Content Engine

* Parse markdown
* Load metadata
* Build parser system

---

## Phase 3 — Pages

* Dynamic routing
* Folder mapping
* Content rendering

---

## Phase 4 — UI

* Sidebar
* Tag pages
* Metadata display

---

## Phase 5 — Deployment

* GitHub Pages workflow
* Auto rebuild

---

# ⚠️ 11. Error Handling Rules

## Build MUST FAIL if:

* Missing required frontmatter
* Invalid date
* Invalid type

## Build MUST WARN if:

* Missing images
* Unknown metadata keys
* Empty tags

---

# 🧭 12. Agent Coding Rules (VERY IMPORTANT)

## Maintainability Rules

1. **No magic values**

   * Everything from config

2. **Pure functions**

   * Parsing must be deterministic

3. **No tight coupling**

   * Parsers independent of UI

4. **Readable code**

   * No clever hacks

5. **File size limit**

   * Max ~300 lines per file

---

## Extensibility Rules

* New metadata = new parser only
* No modification of core pipeline
* UI should auto-adapt

---

## Naming Rules

* Clear, explicit names
* No abbreviations

---

## Logging

* Log:

  * files processed
  * metadata parsed
  * warnings

---

# 🧩 13. Future Extensions (Pre-Designed)

The system should allow:

* Graph view (Obsidian-style)
* Backlinks (`[[note]]`)
* Search index
* MDX support
* CMS layer

---

# ✅ 14. Success Criteria

* Obsidian → commit → site updates automatically
* Folder structure visible in UI
* Tags preserved exactly
* Ratings render correctly (stars / score)
* New metadata types can be added in <5 min
* No manual intervention required
