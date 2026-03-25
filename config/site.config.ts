/**
 * Central Site Configuration
 * Single source of truth for all site behavior
 * Do NOT hardcode paths or settings elsewhere
 */

export const config = {
  // Source repository configuration
  source: {
    repo: "obsidian-repo", // Will be replaced with actual repo URL
    branch: "main",
    folder: "publish", // Only this folder is synced from Obsidian
  },

  // Content structure configuration
  content: {
    basePath: "src/content/imported", // Where synced content lands
    types: ["notes", "blog", "experiments"], // Supported content types
  },

  // Metadata parsing configuration
  metadata: {
    enabledParsers: ["rating", "score", "status"],
    requiredFields: ["title", "date", "tags", "type"],
  },

  // UI configuration
  ui: {
    showSidebar: true,
    showBreadcrumbs: true,
    showMetadata: true,
  },

  // Routing configuration
  routing: {
    notes: "/notes",
    blog: "/blog",
    experiments: "/experiments",
  },
};

export default config;
