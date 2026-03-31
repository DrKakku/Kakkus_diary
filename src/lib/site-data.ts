import { getCollection } from "astro:content";
import path from "node:path";
import { readdir } from "node:fs/promises";
import GithubSlugger from "github-slugger";
import { siteConfig } from "../config/site.config";
import {
  buildHref,
  extractExcerpt,
  getEntryPath,
  getEntrySummary,
  getEntryTitle,
  getEntryUrl,
  getInlineTags,
  getProjectUrl,
  getUniqueTags,
  humanizeSlug,
  normalizeLookup,
  slugify,
  withBase,
} from "./content";
import {
  deriveDate,
  deriveTitle,
  deriveType,
  getCanonicalDate,
  getVaultPathFromFilePath,
  mergeObsidianFields,
  normalizeVaultPath,
  parseInlineFields,
} from "./obsidian";
import type { Entry, ProjectEntry } from "./content";

export type HeadingInfo = {
  level: number;
  text: string;
  slug: string;
};

export type BlockInfo = {
  id: string;
  anchor: string;
  preview: string;
};

export type ResolvedLink = {
  raw: string;
  label: string;
  href: string;
  type: "note" | "heading" | "block" | "asset" | "unresolved";
  embed: boolean;
  path?: string;
};

export type NoteRecord = {
  entry: Entry;
  path: string;
  vaultPath: string;
  vaultFolder: string;
  url: string;
  title: string;
  canonicalTitle: string;
  canonicalDate?: Date;
  derivedType: string;
  derivationSource: {
    title: string;
    date: string;
    type: string;
  };
  summary: string;
  sectionKey: string;
  sectionLabel: string;
  tags: string[];
  aliases: string[];
  inlineFields: Record<string, unknown>;
  fields: Record<string, unknown>;
  headings: HeadingInfo[];
  blocks: BlockInfo[];
  links: ResolvedLink[];
  backlinks: NoteRecord[];
  related: NoteRecord[];
  searchText: string;
};

export type ProjectRecord = {
  entry: ProjectEntry;
  url: string;
  summary: string;
  statusTone: string;
};

export type GraphNode = {
  id: string;
  label: string;
  kind: "note" | "tag";
  url: string;
  path?: string;
  section?: string;
  sectionLabel?: string;
  tags?: string[];
  radius: number;
  degree: number;
};

export type GraphLink = {
  source: string;
  target: string;
  kind: "note-link" | "tag-link";
};

export type SectionRecord = {
  key: string;
  label: string;
  description: string;
  url: string;
  notes: NoteRecord[];
  featured: boolean;
  order: number;
};

export type TagRecord = {
  key: string;
  slug: string;
  label: string;
  url: string;
  notes: NoteRecord[];
};

export type FolderRecord = {
  path: string;
  label: string;
  description?: string;
  depth: number;
  url: string;
  childFolders: FolderRecord[];
  directNotes: NoteRecord[];
  descendantNotes: NoteRecord[];
};

export type AssetRecord = {
  relativePath: string;
  sourcePath: string;
  basename: string;
  url: string;
};

type ParsedWikiLink = {
  raw: string;
  target: string;
  label?: string;
  embed: boolean;
};

export type SiteData = {
  notes: NoteRecord[];
  notesByPath: Map<string, NoteRecord>;
  sections: SectionRecord[];
  sectionsByKey: Map<string, SectionRecord>;
  tags: TagRecord[];
  tagsBySlug: Map<string, TagRecord>;
  folders: FolderRecord[];
  foldersByPath: Map<string, FolderRecord>;
  projects: ProjectRecord[];
  featuredProjects: ProjectRecord[];
  featuredWriting: NoteRecord[];
  searchIndex: {
    notes: Array<{
      title: string;
      normalizedTitle: string;
      summary: string;
      url: string;
      tags: string[];
      aliases: string[];
      section: string;
      path: string;
      excerpt: string;
    }>;
    tags: Array<{
      label: string;
      url: string;
      count: number;
    }>;
  };
  graph: {
    nodes: GraphNode[];
    links: GraphLink[];
  };
  assets: AssetRecord[];
  resolveWikiLink: (rawTarget: string, currentNote: NoteRecord, embed?: boolean) => ResolvedLink;
  resolveAssetPath: (rawTarget: string, currentNote: NoteRecord) => AssetRecord | undefined;
};

const importedRoot = path.resolve("src/content/imported");
let cachedSiteData: Promise<SiteData> | undefined;

export function getSiteData() {
  if (!cachedSiteData) {
    cachedSiteData = buildSiteData();
  }

  return cachedSiteData;
}

async function buildSiteData(): Promise<SiteData> {
  const [entryCollection, projectCollection, assets] = await Promise.all([
    getCollection("entries"),
    getCollection("projects"),
    getImportedAssets(importedRoot),
  ]);

  const noteLookup = new Map<string, NoteRecord[]>();
  const assetLookup = buildAssetLookup(assets);
  const warningCache = new Set<string>();

  const notes: NoteRecord[] = entryCollection
    .map((entry) => {
      const entryPath = getEntryPath(entry);
      const vaultPath = entry.filePath
        ? getVaultPathFromFilePath(path.resolve(entry.filePath), importedRoot)
        : normalizeVaultPath(`${entryPath}.md`);
      const sectionKey = entryPath.split("/")[0] ?? "writing";
      const sectionOverride =
        siteConfig.sectionOverrides[sectionKey as keyof typeof siteConfig.sectionOverrides];
      const sectionLabel = (sectionOverride as { label?: string } | undefined)?.label;

      const headings = extractHeadings(entry.body ?? "");
      const blocks = extractBlocks(entry.body ?? "");
      const tags = getUniqueTags(entry.data.tags, getInlineTags(entry.body ?? ""));
      const aliases = getUniqueTags(entry.data.aliases);
      const inlineFields = parseInlineFields(entry.body ?? "");
      const fields = mergeObsidianFields(entry.data, inlineFields);
      const titleField = deriveTitle(fields, vaultPath, entry.body ?? "");
      const dateField = deriveDate(fields, vaultPath);
      const typeField = deriveType(fields, vaultPath, titleField.value ?? getEntryTitle(entry));
      const canonicalTitle = titleField.value ?? getEntryTitle(entry);
      const canonicalDate = dateField.value ?? getCanonicalDate(fields);
      const derivedType = typeField.value ?? "note";
      if (!fields.type) {
        fields.type = derivedType;
      }
      const excerpt = extractExcerpt(entry.body ?? "", 400);

      const note: NoteRecord = {
        entry,
        path: entryPath,
        vaultPath,
        vaultFolder: vaultPath.split("/").slice(0, -1).join("/"),
        url: getEntryUrl(entry),
        title: canonicalTitle,
        canonicalTitle,
        canonicalDate,
        derivedType,
        derivationSource: {
          title: titleField.source,
          date: dateField.source,
          type: typeField.source,
        },
        summary: getEntrySummary(entry),
        sectionKey,
        sectionLabel: sectionLabel ?? humanizeSlug(sectionKey),
        tags,
        aliases,
        inlineFields,
        fields,
        headings,
        blocks,
        links: [],
        backlinks: [],
        related: [],
        searchText: [
          canonicalTitle,
          getEntrySummary(entry),
          vaultPath,
          tags.join(" "),
          aliases.join(" "),
          excerpt,
        ]
          .filter(Boolean)
          .join(" "),
      };

      registerNoteLookup(noteLookup, note);
      return note;
    })
    .sort(compareNotesByDate);

  const notesByPath = new Map(notes.map((note) => [note.path, note]));

  const resolveAssetPath = (rawTarget: string, currentNote: NoteRecord) =>
    resolveAsset(rawTarget, currentNote, assets, assetLookup);

  const resolveWikiLink = (rawTarget: string, currentNote: NoteRecord, embed = false) =>
    resolveWikilink({
      rawTarget,
      currentNote,
      embed,
      noteLookup,
      resolveAssetPath,
      warningCache,
    });

  for (const note of notes) {
    const parsedLinks = parseWikiLinks(note.entry.body ?? "");
    const wikiLinks = parsedLinks.map((link) =>
      resolveWikiLink(link.target + (link.label ? `|${link.label}` : ""), note, link.embed),
    );
    const structuredLinks = collectStructuredNoteLinks(note, noteLookup, warningCache);
    const dataviewLinks = collectDataviewCollectionLinks(note, notes);
    note.links = dedupeResolvedLinks([...wikiLinks, ...structuredLinks, ...dataviewLinks]);
  }

  const backlinks = new Map<string, NoteRecord[]>();

  for (const note of notes) {
    for (const link of note.links) {
      if (!link.path) continue;

      const list = backlinks.get(link.path) ?? [];
      list.push(note);
      backlinks.set(link.path, list);
    }
  }

  for (const note of notes) {
    note.backlinks = dedupeNotes(backlinks.get(note.path) ?? []).sort(
      compareNotesByDate,
    );
    note.related = computeRelatedNotes(note, notes);
  }

  const sections = buildSections(notes);
  const sectionsByKey = new Map(sections.map((section) => [section.key, section]));
  const tags = buildTags(notes);
  const tagsBySlug = new Map(tags.map((tag) => [tag.slug, tag]));
  const folders = buildFolders(notes, sectionsByKey);
  const foldersByPath = new Map(folders.map((folder) => [folder.path, folder]));
  const featuredProjectIds = new Set(siteConfig.featuredProjectSlugs);
  const featuredWritingPaths = new Set(siteConfig.featuredWritingPaths);
  const projects = buildProjects(projectCollection);
  const featuredProjects = projects.filter(
    (project) => project.entry.data.featured || featuredProjectIds.has(project.entry.id),
  );

  const featuredWriting = notes.filter(
    (note) => note.entry.data.featured || featuredWritingPaths.has(note.path),
  );
  const graph = buildGraph(notes, tags);

  return {
    notes,
    notesByPath,
    sections,
    sectionsByKey,
    tags,
    tagsBySlug,
    folders,
    foldersByPath,
    projects,
    featuredProjects,
    featuredWriting,
    searchIndex: {
      notes: notes.map((note) => ({
        title: note.title,
        normalizedTitle: normalizeLookup(note.title),
        summary: note.summary,
        url: note.url,
        tags: note.tags,
        aliases: note.aliases,
        section: note.sectionLabel,
        path: note.vaultPath,
        excerpt: extractExcerpt(note.entry.body ?? "", 220),
      })),
      tags: tags.map((tag) => ({
        label: tag.label,
        url: tag.url,
        count: tag.notes.length,
      })),
    },
    graph,
    assets,
    resolveWikiLink,
    resolveAssetPath,
  };
}

function buildProjects(projects: ProjectEntry[]) {
  return [...projects]
    .sort((a, b) => {
      const featuredDelta = Number(b.data.featured) - Number(a.data.featured);
      if (featuredDelta !== 0) return featuredDelta;

      const startA = a.data.startDate?.getTime() ?? 0;
      const startB = b.data.startDate?.getTime() ?? 0;

      return startB - startA;
    })
    .map((entry) => ({
      entry,
      url: getProjectUrl(entry),
      summary:
        entry.data.summary ??
        entry.data.description ??
        extractExcerpt(entry.body ?? "", 180),
      statusTone: entry.data.status ? `status-${slugify(entry.data.status)}` : "",
    }));
}

function buildSections(notes: NoteRecord[]) {
  const sectionMap = new Map<string, SectionRecord>();

  for (const note of notes) {
    const existing = sectionMap.get(note.sectionKey);
    const override =
      siteConfig.sectionOverrides[note.sectionKey as keyof typeof siteConfig.sectionOverrides];
    const sectionLabel = (override as { label?: string } | undefined)?.label;

    if (existing) {
      existing.notes.push(note);
      continue;
    }

    sectionMap.set(note.sectionKey, {
      key: note.sectionKey,
      label: sectionLabel ?? humanizeSlug(note.sectionKey),
      description:
        override?.description ?? "A dynamic slice of the writing space, derived directly from the note tree.",
      url: buildHref(note.sectionKey),
      notes: [note],
      featured: override?.featured ?? false,
      order: override?.order ?? 999,
    });
  }

  return [...sectionMap.values()].sort((a, b) => {
    const orderDelta = a.order - b.order;
    if (orderDelta !== 0) return orderDelta;
    const featuredDelta = Number(b.featured) - Number(a.featured);
    if (featuredDelta !== 0) return featuredDelta;
    return a.label.localeCompare(b.label);
  });
}

function buildTags(notes: NoteRecord[]) {
  const tagMap = new Map<string, TagRecord>();

  for (const note of notes) {
    for (const tag of note.tags) {
      const key = tag.toLowerCase();
      const existing = tagMap.get(key);

      if (existing) {
        existing.notes.push(note);
        continue;
      }

      tagMap.set(key, {
        key,
        slug: slugify(tag),
        label: tag,
        url: withBase(`/writing/tags/${slugify(tag)}`),
        notes: [note],
      });
    }
  }

  return [...tagMap.values()].sort((a, b) => b.notes.length - a.notes.length || a.label.localeCompare(b.label));
}

function buildFolders(notes: NoteRecord[], sectionsByKey: Map<string, SectionRecord>) {
  const folderMap = new Map<string, FolderRecord>();

  for (const note of notes) {
    const parts = note.path.split("/").filter(Boolean);

    for (let index = 0; index < parts.length - 1; index += 1) {
      const folderPath = parts.slice(0, index + 1).join("/");
      const existing = folderMap.get(folderPath);

      if (!existing) {
        const section = sectionsByKey.get(folderPath);
        folderMap.set(folderPath, {
          path: folderPath,
          label: section?.label ?? humanizeSlug(parts[index]),
          description: section?.description,
          depth: index,
          url: buildHref(folderPath),
          childFolders: [],
          directNotes: [],
          descendantNotes: [],
        });
      }
    }
  }

  for (const folder of folderMap.values()) {
    const prefix = `${folder.path}/`;
    const descendantNotes = notes.filter((note) => note.path.startsWith(prefix));
    const directNotes = descendantNotes.filter(
      (note) => note.path.slice(prefix.length).split("/").length === 1,
    );

    folder.descendantNotes = descendantNotes;
    folder.directNotes = directNotes;
  }

  for (const folder of folderMap.values()) {
    const prefix = `${folder.path}/`;
    folder.childFolders = [...folderMap.values()]
      .filter((candidate) => candidate.path.startsWith(prefix))
      .filter((candidate) => candidate.path.slice(prefix.length).split("/").length === 1)
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  return [...folderMap.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function registerNoteLookup(map: Map<string, NoteRecord[]>, note: NoteRecord) {
  const keys = new Set<string>([
    normalizeLookup(note.title),
    normalizeLookup(note.path),
    normalizeLookup(note.vaultPath),
    normalizeLookup(note.path.split("/").pop() ?? note.title),
  ]);

  for (const alias of note.aliases) {
    keys.add(normalizeLookup(alias));
  }

  for (const key of keys) {
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(note);
    map.set(key, list);
  }
}

function parseWikiLinks(body: string) {
  const matches = body.matchAll(/(!)?\[\[([^[\]]+)\]\]/g);
  const links: ParsedWikiLink[] = [];

  for (const match of matches) {
    const raw = match[0];
    const embed = Boolean(match[1]);
    const [target, label] = match[2].split("|");

    links.push({
      raw,
      target: target.trim(),
      label: label?.trim(),
      embed,
    });
  }

  return links;
}

function collectStructuredNoteLinks(
  note: NoteRecord,
  noteLookup: Map<string, NoteRecord[]>,
  warningCache: Set<string>,
) {
  const keys = Object.keys(note.fields).filter((key) => /(^|_)(note|notes|link|links)$/i.test(key));
  const references = keys.flatMap((key) => flattenReferenceCandidates(note.fields[key]));
  const links: ResolvedLink[] = [];

  for (const reference of references) {
    const candidate = sanitizeReference(reference);
    if (!candidate) continue;

    const target = resolveNoteTarget(noteLookup, candidate, warningCache, candidate);
    if (!target || target.path === note.path) continue;

    links.push({
      raw: candidate,
      label: target.title,
      href: target.url,
      type: "note",
      embed: false,
      path: target.path,
    });
  }

  return links;
}

function collectDataviewCollectionLinks(note: NoteRecord, notes: NoteRecord[]) {
  const folders = extractDataviewFolders(note.entry.body ?? "");
  const links: ResolvedLink[] = [];

  for (const folder of folders) {
    for (const candidate of notes) {
      if (candidate.path === note.path) continue;
      if (
        candidate.vaultFolder === folder ||
        candidate.vaultFolder.startsWith(`${folder}/`) ||
        candidate.vaultPath.startsWith(`${folder}/`)
      ) {
        links.push({
          raw: folder,
          label: candidate.title,
          href: candidate.url,
          type: "note",
          embed: false,
          path: candidate.path,
        });
      }
    }
  }

  return links;
}

type ResolveParams = {
  rawTarget: string;
  currentNote: NoteRecord;
  embed: boolean;
  noteLookup: Map<string, NoteRecord[]>;
  resolveAssetPath: (rawTarget: string, currentNote: NoteRecord) => AssetRecord | undefined;
  warningCache: Set<string>;
};

function resolveWikilink({
  rawTarget,
  currentNote,
  embed,
  noteLookup,
  resolveAssetPath,
  warningCache,
}: ResolveParams): ResolvedLink {
  const [targetPart, labelPart] = rawTarget.split("|");
  const trimmedTarget = targetPart.trim();
  const label = labelPart?.trim();

  if (!trimmedTarget) {
    return unresolvedLink(rawTarget);
  }

  const asset = resolveAssetPath(trimmedTarget, currentNote);

  if (asset && looksLikeAsset(trimmedTarget)) {
    return {
      raw: rawTarget,
      label: label ?? asset.basename,
      href: asset.url,
      type: "asset",
      embed,
    };
  }

  const hashIndex = trimmedTarget.indexOf("#");
  const noteTarget = hashIndex >= 0 ? trimmedTarget.slice(0, hashIndex) : trimmedTarget;
  const fragment = hashIndex >= 0 ? trimmedTarget.slice(hashIndex + 1) : "";
  const targetNote = noteTarget
    ? resolveNoteTarget(noteLookup, noteTarget, warningCache, rawTarget)
    : currentNote;

  if (!targetNote) {
    if (asset) {
      return {
        raw: rawTarget,
        label: label ?? asset.basename,
        href: asset.url,
        type: "asset",
        embed,
      };
    }

    return unresolvedLink(rawTarget);
  }

  const block = fragment.startsWith("^")
    ? targetNote.blocks.find((entry) => entry.id === fragment.slice(1))
    : undefined;
  const heading = fragment
    ? targetNote.headings.find(
        (entry) =>
          entry.slug === slugify(fragment) || normalizeLookup(entry.text) === normalizeLookup(fragment),
      )
    : undefined;

  const hrefSuffix = block
    ? `#${block.anchor}`
    : heading
      ? `#${heading.slug}`
      : fragment
        ? `#${slugify(fragment)}`
        : "";

  return {
    raw: rawTarget,
    label:
      label ??
      heading?.text ??
      block?.id ??
      targetNote.title,
    href: `${targetNote.url}${hrefSuffix}`,
    type: block ? "block" : heading ? "heading" : "note",
    embed,
    path: targetNote.path,
  };
}

function resolveNoteTarget(
  noteLookup: Map<string, NoteRecord[]>,
  query: string,
  warningCache: Set<string>,
  rawTarget: string,
) {
  const results = noteLookup.get(normalizeLookup(query)) ?? [];

  if (results.length > 1) {
    const warning = `Ambiguous wikilink "${rawTarget}" matched multiple notes: ${results
      .map((note) => note.path)
      .join(", ")}`;

    if (!warningCache.has(warning)) {
      warningCache.add(warning);
      console.warn(warning);
    }
  }

  return results[0];
}

function extractDataviewFolders(body: string) {
  const folders = new Set<string>();

  for (const match of body.matchAll(/FROM\s+"([^"]+)"/gi)) {
    const normalized = normalizeVaultPath(match[1]);
    if (normalized) folders.add(normalized);
  }

  return [...folders];
}

function unresolvedLink(rawTarget: string): ResolvedLink {
  return {
    raw: rawTarget,
    label: rawTarget,
    href: "",
    type: "unresolved",
    embed: false,
  };
}

function computeRelatedNotes(note: NoteRecord, notes: NoteRecord[]) {
  const scores = notes
    .filter((candidate) => candidate.path !== note.path)
    .map((candidate) => {
      let score = 0;

      const sharedTags = candidate.tags.filter((tag) =>
        note.tags.some((noteTag) => noteTag.toLowerCase() === tag.toLowerCase()),
      ).length;

      score += sharedTags * 2;

      if (candidate.sectionKey === note.sectionKey) {
        score += 1;
      }

      if (candidate.links.some((link) => link.path === note.path)) {
        score += 3;
      }

      if (note.links.some((link) => link.path === candidate.path)) {
        score += 3;
      }

      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((entry) => entry.candidate);

  return dedupeNotes(scores);
}

function compareNotesByDate(left: NoteRecord, right: NoteRecord) {
  const leftTime = left.canonicalDate?.getTime() ?? 0;
  const rightTime = right.canonicalDate?.getTime() ?? 0;

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return left.title.localeCompare(right.title);
}

function dedupeNotes(notes: NoteRecord[]) {
  const seen = new Set<string>();
  return notes.filter((note) => {
    if (seen.has(note.path)) return false;
    seen.add(note.path);
    return true;
  });
}

function dedupeResolvedLinks(links: ResolvedLink[]) {
  const seen = new Set<string>();

  return links.filter((link) => {
    const key = `${link.type}:${link.path ?? link.href ?? link.raw}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildGraph(notes: NoteRecord[], tags: TagRecord[]) {
  const nodeMap = new Map<string, GraphNode>();
  const edgeMap = new Map<string, GraphLink>();

  for (const note of notes) {
    const noteId = `note:${note.path}`;
    const degree = note.links.filter((link) => link.path).length + note.backlinks.length + note.tags.length;

    nodeMap.set(noteId, {
      id: noteId,
      label: note.title,
      kind: "note",
      url: note.url,
      path: note.path,
      section: note.sectionKey,
      sectionLabel: note.sectionLabel,
      tags: note.tags,
      radius: Math.max(7, Math.min(16, 7 + degree)),
      degree,
    });

    for (const link of note.links) {
      if (!link.path) continue;

      const targetId = `note:${link.path}`;
      const [source, target] = [noteId, targetId].sort();
      edgeMap.set(`${source}__${target}`, {
        source,
        target,
        kind: "note-link",
      });
    }
  }

  for (const tag of tags) {
    const tagId = `tag:${tag.slug}`;
    nodeMap.set(tagId, {
      id: tagId,
      label: `#${tag.label}`,
      kind: "tag",
      url: tag.url,
      radius: Math.max(6, Math.min(14, 5 + tag.notes.length)),
      degree: tag.notes.length,
    });

    for (const note of tag.notes) {
      const source = `note:${note.path}`;
      const target = tagId;
      edgeMap.set(`${source}__${target}`, {
        source,
        target,
        kind: "tag-link",
      });
    }
  }

  return {
    nodes: [...nodeMap.values()],
    links: [...edgeMap.values()],
  };
}

function flattenReferenceCandidates(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenReferenceCandidates(item));
  }

  return [];
}

function sanitizeReference(value: string) {
  return value
    .replace(/^\s*-\s*/, "")
    .replace(/^\[\[/, "")
    .replace(/\]\]$/, "")
    .trim();
}

function extractHeadings(body: string) {
  const slugger = new GithubSlugger();
  const headings: HeadingInfo[] = [];

  for (const line of body.split("\n")) {
    const match = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    if (!match) continue;

    const text = match[2].replace(/\s+\^([A-Za-z0-9-]+)\s*$/, "").trim();
    headings.push({
      level: match[1].length,
      text,
      slug: slugger.slug(text),
    });
  }

  return headings;
}

function extractBlocks(body: string) {
  const blocks: BlockInfo[] = [];

  for (const line of body.split("\n")) {
    const match = /^(.*?)(?:\s+\^([A-Za-z0-9-]+))\s*$/.exec(line.trim());
    if (!match?.[2]) continue;

    blocks.push({
      id: match[2],
      anchor: `block-${match[2]}`,
      preview: match[1].trim() || "Referenced block",
    });
  }

  return blocks;
}

async function getImportedAssets(root: string): Promise<AssetRecord[]> {
  const files = await walkFiles(root);

  return files
    .filter((file) => !file.toLowerCase().endsWith(".md"))
    .map((file) => {
      const relativePath = path.relative(root, file).split(path.sep).join("/");

      return {
        relativePath,
        sourcePath: file,
        basename: path.basename(file),
        url: withBase(`/content-assets/${relativePath.split("/").map(encodeURIComponent).join("/")}`),
      };
    })
    .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
}

async function walkFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return walkFiles(target);
      }

      return [target];
    }),
  );

  return files.flat();
}

function buildAssetLookup(assets: AssetRecord[]) {
  const byRelativePath = new Map<string, AssetRecord>();
  const byBasename = new Map<string, AssetRecord[]>();

  for (const asset of assets) {
    byRelativePath.set(asset.relativePath.toLowerCase(), asset);

    const basenameKey = asset.basename.toLowerCase();
    const list = byBasename.get(basenameKey) ?? [];
    list.push(asset);
    byBasename.set(basenameKey, list);
  }

  return { byRelativePath, byBasename };
}

function resolveAsset(
  rawTarget: string,
  currentNote: NoteRecord,
  assets: AssetRecord[],
  assetLookup: ReturnType<typeof buildAssetLookup>,
) {
  if (!rawTarget || /^https?:\/\//i.test(rawTarget) || rawTarget.startsWith("#")) {
    return undefined;
  }

  const cleanTarget = rawTarget.replace(/^\.\//, "").replace(/\\/g, "/");
  const currentFilePath = currentNote.entry.filePath
    ? path.relative(importedRoot, currentNote.entry.filePath).split(path.sep).join("/")
    : `${currentNote.path}.md`;
  const currentDir = path.posix.dirname(currentFilePath);
  const relativeTarget = path.posix.normalize(path.posix.join(currentDir, cleanTarget)).replace(/^\.\//, "");
  const rootTarget = path.posix.normalize(cleanTarget).replace(/^\.\//, "");

  const relativeMatch = assetLookup.byRelativePath.get(relativeTarget.toLowerCase());
  if (relativeMatch) return relativeMatch;

  const rootMatch = assetLookup.byRelativePath.get(rootTarget.toLowerCase());
  if (rootMatch) return rootMatch;

  const basename = path.posix.basename(cleanTarget).toLowerCase();
  const basenameMatches = assetLookup.byBasename.get(basename) ?? [];

  if (basenameMatches.length === 1) {
    return basenameMatches[0];
  }

  const looseMatch = assets.find((asset) => asset.relativePath.toLowerCase().endsWith(rootTarget.toLowerCase()));
  return looseMatch;
}

function looksLikeAsset(target: string) {
  return /\.(png|jpe?g|gif|webp|svg|mp4|webm|pdf|mp3|wav)$/i.test(target);
}

export function getFolderChildren(siteData: SiteData, folderPath: string) {
  const folder = siteData.foldersByPath.get(folderPath);

  return {
    folder,
    childFolders: folder?.childFolders ?? [],
    directNotes: folder?.directNotes ?? [],
    descendantNotes: folder?.descendantNotes ?? [],
  };
}
