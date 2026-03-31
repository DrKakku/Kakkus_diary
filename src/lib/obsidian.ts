import path from "node:path";
import { DateTime } from "luxon";
import { humanizeSlug } from "./content";

export type InlineFields = Record<string, unknown>;
export type DerivedField<T> = {
  value: T | undefined;
  source: string;
};

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
  return (
    coerceDate(fields.date) ??
    coerceDate(fields.practice_date) ??
    coerceDate(fields.session_date)
  );
}

export function deriveTitle(fields: Record<string, unknown>, vaultPath: string, body: string): DerivedField<string> {
  if (typeof fields.title === "string" && fields.title.trim()) {
    return { value: fields.title.trim(), source: "frontmatter.title" };
  }

  const fallback = humanizeSlug(vaultPath.split("/").pop() ?? "untitled");
  if (fallback) {
    return { value: fallback, source: "filename" };
  }

  const heading = body
    .split("\n")
    .map((line) => line.trim())
    .find((line) => /^#\s+/.test(line))
    ?.replace(/^#\s+/, "")
    .trim();

  if (heading) {
    return { value: heading, source: "body.heading" };
  }

  return { value: "Untitled", source: "default" };
}

export function deriveDate(fields: Record<string, unknown>, vaultPath: string): DerivedField<Date> {
  const direct =
    coerceDate(fields.date) ?? coerceDate(fields.practice_date) ?? coerceDate(fields.session_date);

  if (direct) {
    return {
      value: direct,
      source:
        coerceDate(fields.date)
          ? "frontmatter.date"
          : coerceDate(fields.practice_date)
            ? "frontmatter.practice_date"
            : "inline.session_date",
    };
  }

  const lastSegment = vaultPath.split("/").pop() ?? "";
  const dateMatch = /(\d{4}-\d{2}-\d{2})/.exec(lastSegment);
  if (dateMatch) {
    return { value: coerceDate(dateMatch[1]), source: "filename.date" };
  }

  return { value: undefined, source: "none" };
}

export function deriveType(fields: Record<string, unknown>, vaultPath: string, title: string): DerivedField<string> {
  if (typeof fields.type === "string" && fields.type.trim()) {
    return { value: fields.type.trim(), source: "frontmatter.type" };
  }

  const normalizedPath = vaultPath.toLowerCase();
  const normalizedTitle = title.toLowerCase();

  if (normalizedPath.includes("daily practice tracker") || /^day\s+\d+/i.test(title)) {
    return { value: "tracker-entry", source: "path-pattern" };
  }

  if (normalizedTitle.includes("summary")) {
    return { value: "summary", source: "title-pattern" };
  }

  if (normalizedPath.startsWith("goals/")) {
    return { value: "goal-note", source: "folder-pattern" };
  }

  if (normalizedPath.startsWith("ideas/") || normalizedPath.startsWith("random ideas/") || normalizedPath.startsWith("random-ideas/")) {
    return { value: "idea", source: "folder-pattern" };
  }

  if (normalizedPath.startsWith("practice diary/") || normalizedPath.startsWith("practice-diary/")) {
    return { value: "practice-note", source: "folder-pattern" };
  }

  return { value: "note", source: "default" };
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
