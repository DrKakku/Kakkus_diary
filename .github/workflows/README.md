# GitHub Workflows

This directory contains GitHub Actions workflows for automating the site.

## sync-content.yml

**Phase 1 — Content Synchronization**

This workflow:
- Triggers on pushes to the `publish/` folder in the Obsidian vault repo
- Mirrors the folder structure to `src/content/imported/`
- Validates content integrity
- Commits changes back to the website repo
- Triggers the build

### Setup

Replace the placeholder `OBSIDIAN_REPO_URL` in the workflow with your actual Obsidian vault repository URL.

### How it works

1. **Trigger**: Push to Obsidian vault's `main` branch in `publish/` folder
2. **Sync**: Mirror entire `publish/` structure to `src/content/imported/`
3. **Validate**: Check for required frontmatter, valid dates, correct types
4. **Build**: Run `npm run build`
5. **Deploy**: Astro handles GitHub Pages deployment

### Manual trigger

You can manually trigger this workflow from the GitHub Actions tab.

---

## Future workflows (Phases 2-5)

- **Phase 2**: Content engine & parser execution
- **Phase 3**: Dynamic page generation
- **Phase 4**: UI rendering
- **Phase 5**: GitHub Pages deployment
