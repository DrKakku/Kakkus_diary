import type { CollectionEntry } from "astro:content";
import { siteConfig } from "../config/site.config";

export type Entry = CollectionEntry<"entries">;

export type HierarchyRow = {
  kind: "folder" | "file";
  label: string;
  path: string;
  depth: number;
  entry?: Entry;
};

export function getEntryPath(entry: Entry) {
  return entry.id.replace(/\/index$/, "");
}

export function getEntryTitle(entry: Entry) {
  const path = getEntryPath(entry);
  return entry.data.title ?? path.split("/").pop() ?? "Untitled";
}

export function withBase(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${import.meta.env.BASE_URL}${cleanPath.replace(/^\//, "")}`;
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

export function getBreadcrumbs(path: string) {
  const parts = path.split("/").filter(Boolean);

  return parts.map((part, index) => ({
    label: part,
    href: withBase("/" + parts.slice(0, index + 1).join("/")),
  }));
}

export function getMetadataBadges(data: Record<string, unknown>) {
  const badges: { label: string; kind: string }[] = [];

  for (const parser of siteConfig.metadataParsers) {
    const value = data[parser.key];

    if (parser.kind === "stars" && typeof value === "number") {
      badges.push({
        label: formatStars(value),
        kind: parser.key,
      });
    }

    if (parser.kind === "score" && typeof value === "number") {
      badges.push({
        label: formatScore(value),
        kind: parser.key,
      });
    }

    if (parser.kind === "label" && typeof value === "string" && value.trim()) {
      badges.push({
        label: value,
        kind: parser.key,
      });
    }

    if (parser.kind === "flag" && value === true) {
      badges.push({
        label: parser.key,
        kind: parser.key,
      });
    }
  }

  return badges;
}

export function buildHierarchy(entries: Entry[]): HierarchyRow[] {
  const rows = new Map<string, HierarchyRow>();

  for (const entry of entries) {
    const path = getEntryPath(entry);
    const parts = path.split("/").filter(Boolean);

    let currentPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      const folder = parts[i];
      currentPath = currentPath ? `${currentPath}/${folder}` : folder;

      if (!rows.has(currentPath)) {
        rows.set(currentPath, {
          kind: "folder",
          label: folder,
          path: currentPath,
          depth: i,
        });
      }
    }

    rows.set(path, {
      kind: "file",
      label: getEntryTitle(entry),
      path,
      depth: Math.max(0, parts.length - 1),
      entry,
    });
  }

  return [...rows.values()].sort((a, b) => a.path.localeCompare(b.path));
}