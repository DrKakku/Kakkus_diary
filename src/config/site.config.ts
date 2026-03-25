export const siteConfig = {
  siteName: "Kakku's Diary",
  siteDescription: "Notes, experiments, and writing from an Obsidian vault.",
  recentLimit: 8,

  // Expandable metadata parser registry
  metadataParsers: [
    { key: "rating", kind: "stars", max: 5 },
    { key: "score", kind: "score", max: 10 },
    { key: "status", kind: "label" },
    { key: "featured", kind: "flag" },
  ],
} as const;