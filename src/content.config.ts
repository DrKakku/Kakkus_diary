import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const entrySchema = z
  .object({
    title: z.string(),
    date: z.coerce.date(),
    description: z.string().optional(),
    summary: z.string().optional(),
    tags: z.array(z.string()).default([]),
    aliases: z.array(z.string()).default([]),

    type: z.string().optional(),
    rating: z.number().int().min(1).max(5).optional(),
    score: z.number().min(0).max(10).optional(),
    status: z.string().optional(),
    featured: z.boolean().default(false),
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

const projects = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/projects",
  }),
  schema: z
    .object({
      title: z.string(),
      summary: z.string(),
      description: z.string().optional(),
      featured: z.boolean().default(false),
      status: z.string().optional(),
      role: z.string().optional(),
      kind: z.string().optional(),
      stack: z.array(z.string()).default([]),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
      links: z
        .object({
          live: z.string().url().optional(),
          repo: z.string().url().optional(),
          demo: z.string().url().optional(),
        })
        .default({}),
    })
    .passthrough(),
});

export const collections = { entries, projects };
