import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const entrySchema = z
  .object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),

    // Optional structured metadata
    type: z.string().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    score: z.number().min(0).max(10).optional(),
    status: z.string().optional(),
    featured: z.boolean().optional(),
    series: z.string().optional(),
  })
  .passthrough();

const entries = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/imported",
  }),
  schema: entrySchema,
});

export const collections = { entries };