import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    heading: z.string().optional(),
    seoTitle: z.string().optional(),
    description: z.string().optional(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    author: z.string().optional(),
    categories: z.array(z.string()).default([]),
    image: z.string().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    heading: z.string().optional(),
    seoTitle: z.string().optional(),
    description: z.string().optional(),
  }),
});

const layouts = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/layouts' }),
  schema: z.object({
    title: z.string(),
    seoTitle: z.string().optional(),
    description: z.string().optional(),
    sections: z.array(z.any()),
    popups: z.record(z.string(), z.array(z.any())).optional(),
  }),
});

const team = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/team' }),
  schema: z.object({
    name: z.string(),
    role: z.string().optional(),
    description: z.string().optional(),
    photo: z.string().optional(),
    order: z.number().default(0),
  }),
});

export const collections = { blog, pages, layouts, team };
