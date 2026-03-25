# Phase 1 Setup Checklist — Quick Reference

All configurations are ready. **Copy-paste the workflow below into your Obsidian repo.**

## Your Details (Auto-configured)

- **GitHub Username**: DrKakku
- **Obsidian Repo**: https://github.com/DrKakku/obsidian-repo.git
- **Website Repo**: Kakkus_diary

## You Must Do (GitHub UI Only)

### 1. Create Personal Access Token (5 min)

1. Go to https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Name it: `OBSIDIAN_SYNC_TOKEN`
4. Select scopes:
   - ✅ `repo`
   - ✅ `workflow`
5. **Copy the token** (you'll need it next)

### 2. Add Secret to Website Repo (2 min)

1. Go to your website repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. **Name**: `OBSIDIAN_SYNC_TOKEN`
4. **Value**: Paste your token from Step 1
5. Click **Add secret**

### 3. Add Workflow to Obsidian Repo (5 min)

In your **Obsidian vault repo**, create this file:

**File path**: `.github/workflows/trigger-site-sync.yml`

**Content** (copy-paste below):

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

**How to add**:
- Create a new directory: `.github/workflows/`
- Create file `trigger-site-sync.yml`
- Paste the YAML above
- Commit and push

### 4. Add Secret to Obsidian Repo (2 min)

1. Go to your **Obsidian repo → Settings → Secrets and variables → Actions**
2. Click **New repository secret**
3. **Name**: `OBSIDIAN_SYNC_TOKEN`
4. **Value**: Paste your same token from Step 1
5. Click **Add secret**

### 5. Enable GitHub Actions on Website Repo (1 min)

1. Go to your website repo → **Actions** tab
2. If you see a message about enabling workflows, click **Enable**
3. Done!

### 6. Configure GitHub Pages (2 min)

1. Go to website repo → **Settings → Pages**
2. **Source**: `Deploy from a branch`
3. **Branch**: `gh-pages`
4. **Folder**: `/ (root)`
5. Click **Save**

---

## Total Time: ~15 minutes

---

## Test It (5 min)

Once all above is done:

1. Make a change in your Obsidian vault's `publish/` folder
2. Commit and push to `main`
3. Watch your Obsidian repo's **Actions** tab—workflow should start automatically
4. Then check website repo's **Actions** tab
5. Check `src/content/imported/` for synced files

🎉 **You're done with Phase 1!**

---

## Next

See [PHASE_1_SETUP.md](./PHASE_1_SETUP.md) for troubleshooting.

Then: **Phase 2** — Content engine & metadata parsing
