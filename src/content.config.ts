import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Base schema (shared across all content)
const baseSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  tags: z.array(z.string()).default([]),
  type: z.enum(["note", "blog", "experiment"]),

  // Optional metadata (your extensible system)
  rating: z.number().min(1).max(5).optional(),
  score: z.number().min(0).max(10).optional(),
  status: z.string().optional(),
  featured: z.boolean().optional(),
  series: z.string().optional(),
});

// -----------------------------
// COLLECTIONS
// -----------------------------

const notes = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/imported/notes",
  }),
  schema: baseSchema,
});

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/imported/blog",
  }),
  schema: baseSchema,
});

const experiments = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/imported/experiments",
  }),
  schema: baseSchema,
});

// -----------------------------

export const collections = {
  notes,
  blog,
  experiments,
};