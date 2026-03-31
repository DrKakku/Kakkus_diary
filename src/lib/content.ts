import type { CollectionEntry } from "astro:content";

export type Entry = CollectionEntry<"entries">;
export type ProjectEntry = CollectionEntry<"projects">;

export type MetadataBadge = {
  label: string;
  kind: string;
  tone?: string;
};

export function withBase(path: string) {
  const base = import.meta.env.BASE_URL || "/";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedBase + normalizedPath;
}

export function getEntryPath(entry: Entry) {
  return entry.id.replace(/\/index$/, "");
}

export function getEntryUrl(entry: Entry) {
  return withBase("/" + getEntryPath(entry));
}

export function getProjectPath(entry: ProjectEntry) {
  return entry.id.replace(/\/index$/, "");
}

export function getProjectUrl(entry: ProjectEntry) {
  return withBase(`/projects/${getProjectPath(entry)}`);
}

export function getEntryTitle(entry: Entry) {
  return entry.data.title ?? humanizeSlug(getEntryPath(entry).split("/").pop() ?? "Untitled");
}

export function humanizeSlug(value: string) {
  return value
    .split(/[-/]/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['".,()[\]]+/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function normalizeLookup(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\.md$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function getInlineTags(body = "") {
  const matches = body.match(/(^|\s)#([A-Za-z][A-Za-z0-9/_-]*)/g) ?? [];
  return matches
    .map((match) => match.trim().replace(/^#/, ""))
    .filter(Boolean);
}

export function getUniqueTags(...groups: Array<string[] | undefined>) {
  const seen = new Map<string, string>();

  for (const group of groups) {
    for (const tag of group ?? []) {
      const cleaned = tag.trim();
      if (!cleaned) continue;

      const key = cleaned.toLowerCase();

      if (!seen.has(key)) {
        seen.set(key, cleaned);
      }
    }
  }

  return [...seen.values()];
}

export function getEntrySummary(entry: Entry) {
  return (
    entry.data.summary ??
    entry.data.description ??
    extractExcerpt(entry.body ?? "")
  );
}

export function extractExcerpt(body: string, maxLength = 180) {
  const cleaned = body
    .replace(/^---[\s\S]*?---/, "")
    .replace(/^#.*$/gm, "")
    .replace(/!\[\[.*?\]\]/g, "")
    .replace(/\[\[.*?\]\]/g, "")
    .replace(/`{3}[\s\S]*?`{3}/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "A note from the writing space.";
  if (cleaned.length <= maxLength) return cleaned;

  return `${cleaned.slice(0, maxLength).trimEnd()}...`;
}

export function formatDate(date?: Date | string | null) {
  if (!date) return "";

  const value = typeof date === "string" ? new Date(date) : date;

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(value);
}

export function formatDateRange(start?: Date, end?: Date) {
  if (!start && !end) return "";
  if (start && !end) return `${formatDate(start)} - Present`;
  if (!start && end) return formatDate(end);
  return `${formatDate(start)} - ${formatDate(end)}`;
}

export function formatStars(rating?: number | null) {
  if (typeof rating !== "number") return "";
  const max = 5;
  return "★".repeat(rating) + "☆".repeat(Math.max(0, max - rating));
}

export function formatScore(score?: number | null) {
  if (typeof score !== "number") return "";
  return `${score}/10`;
}

export function getStatusTone(status?: string | null) {
  if (!status) return "";
  return `status-${slugify(status)}`;
}

export function getMetadataBadges(data: Record<string, unknown>) {
  const badges: MetadataBadge[] = [];

  if (typeof data.status === "string" && data.status.trim()) {
    badges.push({
      label: data.status,
      kind: "status",
      tone: getStatusTone(data.status),
    });
  }

  if (typeof data.rating === "number") {
    badges.push({
      label: formatStars(data.rating),
      kind: "rating",
    });
  }

  if (typeof data.score === "number") {
    badges.push({
      label: formatScore(data.score),
      kind: "score",
    });
  }

  if (typeof data.series === "string" && data.series.trim()) {
    badges.push({
      label: data.series,
      kind: "series",
      tone: "tone-series",
    });
  }

  if (data.featured === true) {
    badges.push({
      label: "featured",
      kind: "featured",
      tone: "tone-featured",
    });
  }

  if (typeof data.type === "string" && data.type.trim()) {
    badges.push({
      label: data.type,
      kind: "type",
      tone: "tone-type",
    });
  }

  return badges;
}

export function encodeRoutePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
}

export function buildHref(path: string) {
  return withBase("/" + encodeRoutePath(path));
}
