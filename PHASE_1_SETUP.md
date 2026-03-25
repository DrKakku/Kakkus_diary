# Phase 1 Setup Guide — Content Sync

This guide walks you through setting up the GitHub Actions workflow for Phase 1 (content synchronization from Obsidian).

## Overview

Phase 1 automates syncing your Obsidian vault's `publish/` folder to this website repo whenever you push changes.

## Prerequisites

- GitHub account with two repositories:
  1. **Obsidian vault repo** (private or public)
  2. **Website repo** (this repository)
- Both repos on `main` branch

## Step 1: Prepare Your Obsidian Repository

Your Obsidian vault should have this structure:

```
vault/
├── publish/           # Only this folder gets synced
│   ├── notes/
│   ├── blog/
│   └── experiments/
├── private/           # NEVER synced
└── assets/
```

### Required Frontmatter

Every markdown file in `publish/` must have:

```yaml
---
title: My Note
date: 2026-03-25
tags: [ml, notes]
type: note|blog|experiment
---

# Content here...
```

## Step 2: Create Personal Access Token (PAT)

1. Go to [GitHub Settings → Developer settings → Personal access tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Name: `OBSIDIAN_SYNC_TOKEN`
4. Scopes:
   - ✅ `repo` (full control of private repositories)
   - ✅ `workflow` (update GitHub Actions)
5. Click **Generate token**
6. **Copy and save** the token securely

## Step 3: Add Secret to Website Repository

1. Go to website repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. Name: `OBSIDIAN_SYNC_TOKEN`
4. Value: Paste your PAT from Step 2
5. Click **Add secret**

## Step 4: Add Trigger to Obsidian Repository

Create this workflow in your Obsidian vault repo (`.github/workflows/trigger-site-sync.yml`):

```yaml
name: Trigger Website Sync

on:
  push:
    branches:
      - main
    paths:
      - "publish/**"
  workflow_dispatch:

jobs:
  trigger:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger website sync
        run: |
          curl -X POST \
            -H "Authorization: token ${{ secrets.OBSIDIAN_SYNC_TOKEN }}" \
            -H "Accept: application/vnd.github.v3+json" \
            https://api.github.com/repos/DrKakku/Kakkus_diary/actions/workflows/sync-content.yml/dispatches \
            -d '{"ref":"main"}'
```

**Ready to use!** Copy this entire block to your Obsidian repo's `.github/workflows/trigger-site-sync.yml`

## Step 5: Configure Website Repository

### GitHub Pages settings

1. Go to website repo → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages**
4. Folder: **/ (root)**
5. Click **Save**

**Note**: The workflow is already configured with your repo details in `.github/workflows/sync-content.yml`

## Step 6: Enable GitHub Actions

1. Go to website repo → **Actions** tab
2. Confirm Actions are enabled (should see green checkmark)
3. Click **I understand my workflows, go ahead and enable them**

## Step 7: Test the Sync

### Process

1. Make a change in your Obsidian vault's `publish/` folder
2. Commit and push to `main`
3. Go to **Actions** tab in the Obsidian repo
4. Verify `trigger-site-sync` workflow runs
5. Go to **Actions** tab in the website repo
6. Verify `Sync Content from Obsidian Vault` workflow runs
7. Check `src/content/imported/` for synced files

### Manual trigger (if automatic doesn't work)

1. Go to website repo → **Actions**
2. Select **Sync Content from Obsidian Vault**
3. Click **Run workflow**
4. Check the logs

## Step 8: Verify Structure

After first sync, you should have:

```
site/
├── src/content/imported/
│   ├── notes/
│   ├── blog/
│   └── experiments/
├── config/site.config.ts
└── .github/workflows/
    └── sync-content.yml
```

## Troubleshooting

### Workflow doesn't trigger

- Check that Obsidian repo has `.github/workflows/trigger-site-sync.yml`
- Verify `OBSIDIAN_SYNC_TOKEN` is set correctly
- Check workflow permissions on PAT (needs `repo` and `workflow`)

### Sync fails

- Check `sync-content.yml` logs for errors
- Verify frontmatter is valid YAML
- Check that `publish/` folder exists in Obsidian repo
- Ensure file permissions allow reading

### Files not syncing

- Confirm `publish/` folder has actual content
- Check file paths don't have spaces or special characters
- Verify frontmatter has required fields

## Next Steps

After Phase 1 is working:

1. **Phase 2**: Content engine (parsing & metadata)
2. **Phase 3**: Dynamic page generation
3. **Phase 4**: UI components
4. **Phase 5**: GitHub Pages deployment

---

**Questions?** Check the main [plan.md](../plan.md) for the full system design.
