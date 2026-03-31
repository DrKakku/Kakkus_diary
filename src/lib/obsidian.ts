import path from "node:path";
import { DateTime } from "luxon";

export type InlineFields = Record<string, unknown>;

const frontmatterDateKeys = ["date", "practice_date"];

export function normalizeVaultPath(value: string) {
  return value
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replace(/^publish\//i, "")
    .replace(/\\/g, "/")
    .replace(/\.md$/i, "");
}

export function getVaultPathFromFilePath(filePath: string, importedRoot: string) {
  return normalizeVaultPath(path.relative(importedRoot, filePath).split(path.sep).join("/"));
}

export function parseInlineFields(body: string): InlineFields {
  const fields = new Map<string, unknown>();
  const lines = body.split("\n");
  let inFence = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^```/.test(trimmed)) {
      inFence = !inFence;
      continue;
    }

    if (inFence || !trimmed) continue;

    for (const match of trimmed.matchAll(/\[([A-Za-z][A-Za-z0-9_-]*)::\s*([^[\]]*)\]/g)) {
      registerField(fields, match[1], match[2]);
    }

    const lineMatch =
      /^(?:[-*+]\s+)?(?:\*\*([^*]+)\*\*|([A-Za-z][A-Za-z0-9_-]*))::\s*(.*)$/.exec(trimmed);

    if (lineMatch) {
      registerField(fields, lineMatch[1] ?? lineMatch[2], lineMatch[3]);
    }
  }

  return Object.fromEntries(fields);
}

export function mergeObsidianFields(
  frontmatter: Record<string, unknown>,
  inlineFields: InlineFields,
) {
  const merged = { ...inlineFields, ...frontmatter };

  for (const key of frontmatterDateKeys) {
    const coerced = coerceDate(merged[key]);
    if (coerced) {
      merged[key] = coerced;
    }
  }

  return merged;
}

export function coerceDate(value: unknown): Date | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return undefined;
}

export function getCanonicalDate(fields: Record<string, unknown>) {
  return coerceDate(fields.date) ?? coerceDate(fields.practice_date);
}

export function toDateTime(value: unknown) {
  if (DateTime.isDateTime(value)) {
    return value;
  }

  if (value instanceof Date) {
    return DateTime.fromJSDate(value);
  }

  if (typeof value === "string") {
    if (value.trim().toLowerCase() === "today") {
      return DateTime.local();
    }

    const parsed = DateTime.fromISO(value);
    if (parsed.isValid) {
      return parsed;
    }
  }

  if (typeof value === "number") {
    return DateTime.fromMillis(value);
  }

  return undefined;
}

function registerField(store: Map<string, unknown>, rawKey: string, rawValue: string) {
  const key = rawKey.trim();
  if (!key || store.has(key)) return;
  store.set(key, parseInlineValue(rawValue.trim()));
}

function parseInlineValue(rawValue: string): unknown {
  if (!rawValue) return "";

  if (/^(true|false)$/i.test(rawValue)) {
    return rawValue.toLowerCase() === "true";
  }

  if (/^-?\d+(?:\.\d+)?$/.test(rawValue)) {
    return Number(rawValue);
  }

  if (/^\[\]$/.test(rawValue)) {
    return [];
  }

  const date = coerceDate(rawValue);
  if (date) {
    return date;
  }

  return rawValue;
}
