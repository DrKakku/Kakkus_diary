# Configuration

This directory contains the central site configuration.

## site.config.ts

This is the **single source of truth** for all site behavior.

### Rules

1. **All behavior must be configurable from this file**
2. No hardcoded paths or settings elsewhere
3. Changes here automatically propagate to all systems

### Structure

```typescript
export const config = {
  // Obsidian vault connection
  source: {
    repo: "...",      // GitHub repo URL
    branch: "main",   // Branch to sync from
    folder: "publish" // Folder to sync
  },

  // Where content ends up
  content: {
    basePath: "src/content/imported",
    types: ["notes", "blog", "experiments"]
  },

  // Parser system
  metadata: {
    enabledParsers: ["rating", "score", "status"],
    requiredFields: ["title", "date", "tags", "type"]
  },

  // UI behavior
  ui: {
    showSidebar: true,
    showBreadcrumbs: true,
    showMetadata: true
  },

  // URL patterns
  routing: {
    notes: "/notes",
    blog: "/blog",
    experiments: "/experiments"
  }
};
```

### Extending Configuration

To add a new setting:

1. Add field to `config` object
2. Document what it controls
3. Use in your code via `import { config } from '../config/site.config'`

### Future: Environment-specific configs

You could extend this to support:
- `site.config.development.ts`
- `site.config.production.ts`
- `site.config.staging.ts`

But keep them consistent with the base config.
