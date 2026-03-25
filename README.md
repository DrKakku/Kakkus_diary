# Kakku's Digital Garden 🌱

A GitHub Pages website that syncs from an Obsidian vault with extensible metadata parsing and automatic content deployment.

## 📘 System Overview

This is a **two-repository system**:

1. **Obsidian Vault** (private) — your single source of truth
2. **Website** (this repo) — derived output, deployed to GitHub Pages

Content flows: `Obsidian publish/ → GitHub Actions → Site repo → GitHub Pages`

For full system design, see [plan.md](./plan.md).

## 🚀 Project Structure

```
site/
├── src/
│   ├── content/imported/       # AUTO-SYNCED from Obsidian (DO NOT EDIT)
│   ├── parsers/                # Metadata parsing system (extensible)
│   ├── components/             # Astro components
│   ├── layouts/                # Page layouts
│   └── pages/                  # Static pages
│
├── config/
│   └── site.config.ts          # SINGLE SOURCE OF TRUTH
│
├── scripts/
│   └── sync.ts                 # Local sync utility
│
├── .github/workflows/
│   └── sync-content.yml        # GitHub Actions (Phase 1)
│
├── plan.md                     # Full system specification
└── PHASE_1_SETUP.md           # GitHub setup guide
```

## 🔄 Quick Start

### Phase 1: Content Sync (Setup)

1. Read [PHASE_1_SETUP.md](./PHASE_1_SETUP.md)
2. Create Personal Access Token on GitHub
3. Configure secrets in repo settings
4. Setup trigger workflow in Obsidian repo
5. Test sync

### Local Development

```sh
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:4321)
npm run build        # Build for production
```

### Local Sync (Optional)

```sh
npx ts-node scripts/sync.ts /path/to/obsidian/vault
```

## 📝 Frontmatter Rules

Every markdown file in Obsidian's `publish/` folder **must** have:

```yaml
---
title: Your Title
date: YYYY-MM-DD
tags: [tag1, tag2]
type: note|blog|experiment
---
```

Optional fields (extensible):
- `rating: 1-5` (renders as ★)
- `score: 0-10` (renders as X/10)
- `status: draft|final|idea` (renders as [STATUS])

## 🧠 Extensible Metadata

Add new metadata types without touching the core system:

1. Create parser: `src/parsers/myfield.ts`
2. Implement `MetadataParser` interface
3. Register in `src/parsers/index.ts`

See [src/parsers/README.md](./src/parsers/README.md) for examples.

## ⚙️ Configuration

All site behavior is controlled from **one file**: [config/site.config.ts](./config/site.config.ts)

No hardcoded values elsewhere.

## 🧩 Implementation Phases

| Phase | Goal | Status |
|-------|------|--------|
| 1 | GitHub Actions sync | ⚙️ Setup guide ready |
| 2 | Content engine & parsing | 📋 Planned |
| 3 | Dynamic page generation | 📋 Planned |
| 4 | UI components & nav | 📋 Planned |
| 5 | GitHub Pages deployment | 📋 Planned |

## 🧪 Commands Reference

| Command | Action |
|---------|--------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview build |
| `npm run astro add` | Add Astro integrations |

## 📚 Documentation

- [plan.md](./plan.md) — Full system specification
- [PHASE_1_SETUP.md](./PHASE_1_SETUP.md) — GitHub Actions setup
- [config/README.md](./config/README.md) — Configuration docs
- [src/parsers/README.md](./src/parsers/README.md) — Metadata system

## 🎯 Design Principles

✅ **Source of Truth**: Obsidian vault is canonical
✅ **Deterministic**: Same input → same output
✅ **Strict Schema**: Fail fast on invalid data
✅ **Single Config**: All behavior from one file
✅ **Extensible**: Parsers & components pluggable
✅ **No Magic**: Everything explicit

---

**Next step**: Follow [PHASE_1_SETUP.md](./PHASE_1_SETUP.md) to configure GitHub.
