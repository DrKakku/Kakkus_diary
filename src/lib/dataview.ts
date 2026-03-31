import vm from "node:vm";
import { DateTime } from "luxon";
import type { NoteRecord, SiteData } from "./site-data";
import { normalizeVaultPath, toDateTime } from "./obsidian";

type DataviewPage = Record<string, unknown> & {
  file: {
    name: string;
    path: string;
    folder: string;
    ext: string;
    link: string;
  };
};

type DataviewRenderContext = {
  note: NoteRecord;
  siteData: SiteData;
};

type TableColumn = {
  key: string;
  label: string;
};

type DataviewBlockResult = {
  html: string;
  kind: "success" | "warning";
};

class DataArray<T> implements Iterable<T> {
  constructor(private readonly values: T[]) {}

  where(predicate: (value: T, index: number) => boolean) {
    return new DataArray(this.values.filter(predicate));
  }

  map<U>(mapper: (value: T, index: number) => U) {
    return new DataArray(this.values.map(mapper));
  }

  array() {
    return [...this.values];
  }

  forEach(callback: (value: T, index: number) => void) {
    this.values.forEach(callback);
  }

  reduce<U>(reducer: (accumulator: U, value: T, index: number) => U, initialValue: U) {
    return this.values.reduce(reducer, initialValue);
  }

  get length() {
    return this.values.length;
  }

  [Symbol.iterator]() {
    return this.values[Symbol.iterator]();
  }
}

export async function renderDataviewBlock(
  code: string,
  context: DataviewRenderContext,
): Promise<DataviewBlockResult> {
  try {
    const parsed = parseTableQuery(code);
    const pages = filterPages(context.siteData, parsed.source, context.note)
      .filter((page) => evaluateWhere(parsed.where, page))
      .sort((left, right) => compareValues(readField(right, parsed.sort?.field), readField(left, parsed.sort?.field), parsed.sort?.direction ?? "desc"));

    const rows = pages.map((page) =>
      parsed.columns.map((column) => formatLiteral(readField(page, column.key))),
    );

    return {
      kind: "success",
      html: renderTableHtml(parsed.columns, rows, "Dataview Query"),
    };
  } catch (error) {
    return {
      kind: "warning",
      html: renderWarningCard(
        "Dataview query could not be rendered.",
        error instanceof Error ? error.message : "Unknown Dataview error.",
        code,
      ),
    };
  }
}

export async function renderDataviewJsBlock(
  code: string,
  context: DataviewRenderContext,
): Promise<DataviewBlockResult> {
  const outputs: string[] = [];

  const dv = createDataviewApi(context.siteData, context.note, outputs);

  try {
    vm.runInNewContext(code, {
      dv,
      DateTime,
      console,
      Math,
      Number,
      String,
      Boolean,
      Array,
      Set,
      Map,
      JSON,
    }, {
      timeout: 1000,
      microtaskMode: "afterEvaluate",
    });

    return {
      kind: "success",
      html:
        outputs.join("") ||
        renderWarningCard(
          "DataviewJS block completed without rendering output.",
          "The script ran successfully but did not call a Dataview render helper.",
          code,
        ),
    };
  } catch (error) {
    return {
      kind: "warning",
      html: renderWarningCard(
        "DataviewJS block could not be rendered.",
        error instanceof Error ? error.message : "Unknown DataviewJS error.",
        code,
      ),
    };
  }
}

function createDataviewApi(siteData: SiteData, currentNote: NoteRecord, outputs: string[]) {
  return Object.freeze({
    pages(source?: string) {
      return new DataArray(filterPages(siteData, source, currentNote));
    },
    current() {
      return createPage(currentNote);
    },
    table(headers: string[], rows: Iterable<unknown[]>) {
      outputs.push(renderTableHtml(
        headers.map((header) => ({ key: header, label: header })),
        [...rows].map((row) => row.map((value) => formatLiteral(value))),
        "DataviewJS Table",
      ));
    },
    header(level: number, text: string) {
      const safeLevel = Math.min(6, Math.max(1, Math.round(level)));
      outputs.push(`<h${safeLevel}>${escapeHtml(text)}</h${safeLevel}>`);
    },
    paragraph(text: string) {
      outputs.push(`<p>${escapeHtml(text)}</p>`);
    },
    date(value: unknown) {
      return toDateTime(value) ?? DateTime.invalid("Unsupported date input");
    },
  });
}

function parseTableQuery(code: string) {
  const lines = code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length || !/^table\b/i.test(lines[0])) {
    throw new Error("Only TABLE Dataview queries are supported right now.");
  }

  let mode: "table" | "from" | "where" | "sort" | "limit" = "table";
  const sections = {
    table: [lines[0].replace(/^table\b/i, "").trim()].filter(Boolean),
    from: [] as string[],
    where: [] as string[],
    sort: [] as string[],
    limit: [] as string[],
  };

  for (const rawLine of lines.slice(1)) {
    const upper = rawLine.toUpperCase();

    if (upper.startsWith("FROM ")) {
      mode = "from";
      sections.from.push(rawLine.slice(5).trim());
      continue;
    }

    if (upper.startsWith("WHERE ")) {
      mode = "where";
      sections.where.push(rawLine.slice(6).trim());
      continue;
    }

    if (upper.startsWith("SORT ")) {
      mode = "sort";
      sections.sort.push(rawLine.slice(5).trim());
      continue;
    }

    if (upper.startsWith("LIMIT ")) {
      mode = "limit";
      sections.limit.push(rawLine.slice(6).trim());
      continue;
    }

    sections[mode].push(rawLine);
  }

  const columns = splitTopLevel(sections.table.join(" ")).map((segment) => {
    const match = /(.*?)\s+AS\s+(.+)$/i.exec(segment);
    const key = (match?.[1] ?? segment).trim();
    const label = stripQuotes((match?.[2] ?? key).trim());

    return { key, label };
  });

  if (!columns.length) {
    throw new Error("TABLE queries need at least one column.");
  }

  const sortMatch = /^(.+?)(?:\s+(ASC|DESC))?$/i.exec(sections.sort.join(" ").trim());

  return {
    columns,
    source: sections.from.join(" ").trim(),
    where: sections.where.join(" ").trim(),
    sort: sortMatch?.[1]
      ? {
          field: sortMatch[1].trim(),
          direction: (sortMatch[2]?.toLowerCase() as "asc" | "desc" | undefined) ?? "asc",
        }
      : undefined,
  };
}

function filterPages(siteData: SiteData, source: string | undefined, currentNote: NoteRecord) {
  const pages = siteData.notes.map((note) => createPage(note));

  if (!source) {
    return pages;
  }

  const cleanSource = stripQuotes(source.trim());

  if (!cleanSource) {
    return pages;
  }

  if (cleanSource.startsWith("#")) {
    const targetTag = cleanSource.slice(1).toLowerCase();
    return pages.filter((page) =>
      ((page.tags as string[] | undefined) ?? []).some((tag) => tag.toLowerCase() === targetTag),
    );
  }

  if (cleanSource.toLowerCase() === "this") {
    return [createPage(currentNote)];
  }

  const normalizedSource = normalizeVaultPath(cleanSource);

  return pages.filter((page) => {
    const filePath = String(page.file.path ?? "");
    return filePath === normalizedSource || filePath.startsWith(`${normalizedSource}/`);
  });
}

function createPage(note: NoteRecord): DataviewPage {
  return Object.freeze({
    ...note.fields,
    title: note.title,
    tags: note.tags,
    aliases: note.aliases,
    summary: note.summary,
    date: note.canonicalDate ?? note.fields.date,
    practice_date: note.fields.practice_date ?? note.canonicalDate,
    file: Object.freeze({
      name: note.title,
      path: note.vaultPath,
      folder: note.vaultFolder,
      ext: "md",
      link: note.url,
    }),
  });
}

function evaluateWhere(expression: string, page: DataviewPage) {
  if (!expression.trim()) {
    return true;
  }

  const orClauses = splitByKeyword(expression, "OR");
  return orClauses.some((orClause) =>
    splitByKeyword(orClause, "AND").every((andClause) => evaluateComparison(andClause, page)),
  );
}

function evaluateComparison(expression: string, page: DataviewPage) {
  const match = /(.*?)(=|!=|>=|<=|>|<)(.*)/.exec(expression);
  if (!match) {
    throw new Error(`Unsupported WHERE clause: ${expression}`);
  }

  const left = evaluateValueExpression(match[1].trim(), page);
  const right = evaluateValueExpression(match[3].trim(), page);

  switch (match[2]) {
    case "=":
      return compareValues(left, right, "desc") === 0;
    case "!=":
      return compareValues(left, right, "desc") !== 0;
    case ">":
      return compareValues(left, right, "desc") > 0;
    case "<":
      return compareValues(left, right, "desc") < 0;
    case ">=":
      return compareValues(left, right, "desc") >= 0;
    case "<=":
      return compareValues(left, right, "desc") <= 0;
    default:
      return false;
  }
}

function evaluateValueExpression(expression: string, page: DataviewPage): unknown {
  const value = expression.trim();

  if (!value) return "";
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return stripQuotes(value);
  }

  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }

  const dateFormatMatch = /^dateformat\((.+),\s*(".*?"|'.*?')\)$/i.exec(value);
  if (dateFormatMatch) {
    const input = toDateTime(evaluateValueExpression(dateFormatMatch[1], page));
    const format = stripQuotes(dateFormatMatch[2]);
    return input?.isValid ? input.toFormat(format) : "";
  }

  const dateMatch = /^date\((.+)\)$/i.exec(value);
  if (dateMatch) {
    const inner = dateMatch[1].trim();
    return toDateTime(inner.toLowerCase() === "today" ? "today" : evaluateValueExpression(inner, page));
  }

  if (/^today$/i.test(value)) {
    return DateTime.local();
  }

  return readField(page, value);
}

function readField(page: DataviewPage, key: string | undefined) {
  if (!key) return undefined;
  return key.split(".").reduce<unknown>((current, segment) => {
    if (!segment) return current;
    if (!current || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, page);
}

function compareValues(left: unknown, right: unknown, direction: "asc" | "desc") {
  const leftComparable = toComparable(left);
  const rightComparable = toComparable(right);

  const delta =
    leftComparable < rightComparable ? -1 : leftComparable > rightComparable ? 1 : 0;

  return direction === "desc" ? -delta : delta;
}

function toComparable(value: unknown) {
  if (value == null) return "";
  if (DateTime.isDateTime(value)) return value.toMillis();
  if (value instanceof Date) return value.getTime();
  if (Array.isArray(value)) return value.join(" ");
  if (typeof value === "string") return value.toLowerCase();
  return value as string | number | boolean;
}

function formatLiteral(value: unknown): string {
  if (value == null) return "";
  if (DateTime.isDateTime(value)) return value.toFormat("yyyy-MM-dd");
  if (value instanceof Date) return DateTime.fromJSDate(value).toFormat("yyyy-MM-dd");
  if (Array.isArray(value)) return value.map((item) => formatLiteral(item)).join(", ");
  if (typeof value === "object") {
    if ("path" in (value as Record<string, unknown>) && "link" in (value as Record<string, unknown>)) {
      return escapeHtml(String((value as Record<string, unknown>).path));
    }

    return escapeHtml(JSON.stringify(value));
  }

  return escapeHtml(String(value));
}

function renderTableHtml(columns: TableColumn[], rows: string[][], title: string) {
  return [
    `<figure class="plugin-card dataview-card">`,
    `<figcaption>${escapeHtml(title)}</figcaption>`,
    `<div class="table-shell">`,
    `<table>`,
    `<thead>`,
    `<tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join("")}</tr>`,
    `</thead>`,
    `<tbody>`,
    rows.length
      ? rows
          .map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`)
          .join("")
      : `<tr><td colspan="${columns.length}">No matching notes.</td></tr>`,
    `</tbody>`,
    `</table>`,
    `</div>`,
    `</figure>`,
  ].join("");
}

function renderWarningCard(title: string, message: string, code: string) {
  return [
    `<aside class="plugin-card plugin-warning">`,
    `<strong>${escapeHtml(title)}</strong>`,
    `<p>${escapeHtml(message)}</p>`,
    `<pre><code>${escapeHtml(code.trim())}</code></pre>`,
    `</aside>`,
  ].join("");
}

function splitTopLevel(value: string) {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let quote: string | undefined;

  for (const char of value) {
    if ((char === '"' || char === "'") && (!quote || quote === char)) {
      quote = quote ? undefined : char;
      current += char;
      continue;
    }

    if (!quote) {
      if (char === "(") depth += 1;
      if (char === ")") depth = Math.max(0, depth - 1);
      if (char === "," && depth === 0) {
        if (current.trim()) parts.push(current.trim());
        current = "";
        continue;
      }
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function splitByKeyword(value: string, keyword: "AND" | "OR") {
  return value
    .split(new RegExp(`\\s+${keyword}\\s+`, "i"))
    .map((part) => part.trim())
    .filter(Boolean);
}

function stripQuotes(value: string) {
  return value.replace(/^['"]|['"]$/g, "");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
