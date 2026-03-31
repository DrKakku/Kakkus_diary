import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";
import GithubSlugger from "github-slugger";
import { visit } from "unist-util-visit";
import { pluginAdapters } from "./plugin-adapters";
import type { NoteRecord, SiteData } from "./site-data";

type SiteDataLike = Pick<SiteData, "resolveWikiLink" | "resolveAssetPath" | "notes">;

export async function renderNoteHtml(note: NoteRecord, siteData: SiteData) {
  const preparedBody = await prepareNoteBody(note, siteData);

  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkWikiLinks, { note, siteData })
    .use(remarkLocalAssets, { note, siteData })
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeHeadingIds)
    .use(rehypeStringify)
    .process(preparedBody);

  return String(file);
}

async function prepareNoteBody(note: NoteRecord, siteData: SiteData) {
  let body = note.entry.body ?? "";

  body = stripLeadingTitle(body, note.title);
  body = stripInlineTagFooter(body);
  body = injectBlockAnchors(body);
  body = await applyCodeFenceAdapters(body, note, siteData);

  return body;
}

function stripLeadingTitle(body: string, title: string) {
  const lines = body.split("\n");
  const firstMeaningfulLineIndex = lines.findIndex((line) => line.trim());

  if (firstMeaningfulLineIndex === -1) return body;

  const firstLine = lines[firstMeaningfulLineIndex].trim();

  if (firstLine === `# ${title}`) {
    lines.splice(firstMeaningfulLineIndex, 1);
  }

  return lines.join("\n");
}

function stripInlineTagFooter(body: string) {
  return body.replace(
    /\n##\s*Tags(?:\s*\(inline\))?\s*\n(?:[^\n]*#[A-Za-z][^\n]*\n?)+$/i,
    "",
  );
}

function injectBlockAnchors(body: string) {
  const lines = body.split("\n");
  let inFence = false;

  return lines
    .map((line) => {
      if (/^```/.test(line.trim())) {
        inFence = !inFence;
        return line;
      }

      if (inFence) return line;

      const match = /^(.*?)(?:\s+\^([A-Za-z0-9-]+))\s*$/.exec(line);
      if (!match?.[2]) return line;

      const content = match[1].trimEnd();
      const anchor = `<span id="block-${match[2]}" class="block-anchor"></span>`;
      return content ? `${content} ${anchor}` : anchor;
    })
    .join("\n");
}

function remarkLocalAssets(options: { note: NoteRecord; siteData: SiteDataLike }) {
  return (tree: any) => {
    visit(tree, (node: any) => {
      if (node.type === "link" || node.type === "image") {
        const asset = options.siteData.resolveAssetPath(node.url, options.note);
        if (asset) {
          node.url = asset.url;
        }
      }
    });
  };
}

async function applyCodeFenceAdapters(body: string, note: NoteRecord, siteData: SiteData) {
  const lines = body.split("\n");
  const output: string[] = [];
  let fenceLanguage: string | undefined;
  let fenceBuffer: string[] = [];

  for (const line of lines) {
    const fenceStart = /^```([A-Za-z0-9_-]+)?\s*$/.exec(line.trim());

    if (!fenceLanguage && fenceStart) {
      fenceLanguage = fenceStart[1]?.trim();
      fenceBuffer = [];
      continue;
    }

    if (fenceLanguage && /^```\s*$/.test(line.trim())) {
      const adapter = pluginAdapters.find((candidate) => candidate.matches(fenceLanguage));

      if (adapter) {
        output.push(await adapter.render({ code: fenceBuffer.join("\n"), note, siteData }));
      } else {
        output.push(`\`\`\`${fenceLanguage}\n${fenceBuffer.join("\n")}\n\`\`\``);
      }

      fenceLanguage = undefined;
      fenceBuffer = [];
      continue;
    }

    if (fenceLanguage) {
      fenceBuffer.push(line);
      continue;
    }

    output.push(line);
  }

  if (fenceLanguage) {
    output.push(`\`\`\`${fenceLanguage}\n${fenceBuffer.join("\n")}`);
  }

  return output.join("\n");
}

function remarkWikiLinks(options: { note: NoteRecord; siteData: SiteDataLike }) {
  return (tree: any) => {
    transformTextNodes(tree, (value: string) => {
      const matches = [...value.matchAll(/(!)?\[\[([^[\]]+)\]\]/g)];
      if (matches.length === 0) return undefined;

      const nodes: any[] = [];
      let cursor = 0;

      for (const match of matches) {
        const index = match.index ?? 0;

        if (index > cursor) {
          nodes.push({ type: "text", value: value.slice(cursor, index) });
        }

        const embed = Boolean(match[1]);
        const resolved = options.siteData.resolveWikiLink(match[2], options.note, embed);

        if (!resolved.href) {
          nodes.push({
            type: "html",
            value: `<span class="wikilink unresolved">${escapeHtml(match[0])}</span>`,
          });
        } else if (embed) {
          nodes.push({
            type: "html",
            value: renderEmbed(resolved),
          });
        } else {
          nodes.push({
            type: "link",
            url: resolved.href,
            children: [{ type: "text", value: resolved.label }],
            data: {
              hProperties: {
                className: ["wikilink", `wikilink-${resolved.type}`],
              },
            },
          });
        }

        cursor = index + match[0].length;
      }

      if (cursor < value.length) {
        nodes.push({ type: "text", value: value.slice(cursor) });
      }

      return nodes;
    });
  };
}

function transformTextNodes(node: any, transform: (value: string) => any[] | undefined, parentType?: string) {
  if (!node || typeof node !== "object") return;
  if (!Array.isArray(node.children)) return;

  const nextChildren: any[] = [];

  for (const child of node.children) {
    if (
      child.type === "text" &&
      !["link", "inlineCode", "code", "html"].includes(parentType ?? node.type)
    ) {
      const replacement = transform(child.value);
      if (replacement) {
        nextChildren.push(...replacement);
        continue;
      }
    }

    transformTextNodes(child, transform, child.type);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function rehypeHeadingIds() {
  return (tree: any) => {
    const slugger = new GithubSlugger();

    visit(tree, "element", (node: any) => {
      if (!/^h[1-6]$/.test(node.tagName ?? "")) return;

      const text = toText(node).trim();
      if (!text) return;

      node.properties = node.properties ?? {};

      if (!node.properties.id) {
        node.properties.id = slugger.slug(text);
      }
    });
  };
}

function toText(node: any): string {
  if (!node) return "";
  if (node.type === "text") return node.value ?? "";
  if (!Array.isArray(node.children)) return "";
  return node.children.map((child: any) => toText(child)).join("");
}

function renderEmbed(resolved: { href: string; label: string; type: string }) {
  if (resolved.type === "asset") {
    return `<figure class="note-embed asset-embed"><img src="${escapeAttribute(
      resolved.href,
    )}" alt="${escapeAttribute(resolved.label)}" loading="lazy" /><figcaption>${escapeHtml(
      resolved.label,
    )}</figcaption></figure>`;
  }

  return `<aside class="note-embed note-embed-card"><span class="embed-label">Embedded note</span><a href="${escapeAttribute(
    resolved.href,
  )}">${escapeHtml(resolved.label)}</a></aside>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
