import { readFile } from "node:fs/promises";
import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import {
  HANDBOOK_CATALOG,
  type HandbookFilePath,
  type HandbookToolName,
  isHandbookToolName,
} from "./catalog";
import {
  extractHrConfirmations,
  type HrConfirmationFlag,
} from "./hr-confirmation";

const handbookFrontmatterSchema = z
  .object({
    title: z.string().trim().min(1),
    summary: z.string().trim().min(1),
    topics: z.array(z.string().trim().min(1)).min(1),
    related: z.array(z.string().trim().min(1)),
  })
  .strict();

export interface HandbookFrontmatter {
  readonly title: string;
  readonly summary: string;
  readonly topics: readonly string[];
  readonly related: readonly string[];
}

export interface HandbookSourceIdentifier {
  readonly id: `handbook:${HandbookToolName}`;
  readonly toolName: HandbookToolName;
  readonly filePath: HandbookFilePath;
  readonly path: `docs/handbook/${HandbookFilePath}`;
}

export interface HandbookRelatedSource {
  readonly filePath: string;
  readonly path: `docs/handbook/${string}`;
  readonly toolName: HandbookToolName | null;
  readonly sourceId: `handbook:${HandbookToolName}` | null;
}

export interface HandbookDocument {
  readonly source: HandbookSourceIdentifier;
  readonly sourceId: `handbook:${HandbookToolName}`;
  readonly title: string;
  readonly summary: string;
  readonly topics: readonly string[];
  readonly related: readonly HandbookRelatedSource[];
  readonly body: string;
  readonly hrConfirmations: readonly HrConfirmationFlag[];
}

const HANDBOOK_ROOT = resolve(process.cwd(), "docs/handbook");

const PATH_TO_TOOL = new Map<string, HandbookToolName>(
  Object.entries(HANDBOOK_CATALOG).map(([toolName, entry]) => [
    entry.filePath,
    toolName as HandbookToolName,
  ]),
);

const documentCache = new Map<
  HandbookToolName,
  Promise<HandbookDocument>
>();

function normalizeRelativePath(path: string): string {
  if (path.includes("\0")) {
    throw new Error("Handbook paths cannot contain null bytes.");
  }

  const normalized = path.replaceAll("\\", "/");
  if (
    normalized.length === 0 ||
    isAbsolute(normalized) ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.startsWith("//")
  ) {
    throw new Error(`Handbook path must be relative: ${path}`);
  }

  return normalized;
}

function assertInsideHandbookRoot(absolutePath: string): void {
  const pathFromRoot = relative(HANDBOOK_ROOT, absolutePath);
  if (
    pathFromRoot === "" ||
    pathFromRoot === ".." ||
    pathFromRoot.startsWith(`..${sep}`) ||
    isAbsolute(pathFromRoot)
  ) {
    throw new Error("Resolved path must remain inside docs/handbook.");
  }
}

/**
 * Resolves a corpus-relative path, optionally relative to another corpus file.
 * Absolute paths and paths that escape docs/handbook are rejected.
 */
export function resolveHandbookPath(
  path: string,
  fromFilePath?: string,
): string {
  const normalizedPath = normalizeRelativePath(path);
  const baseDirectory =
    fromFilePath === undefined
      ? HANDBOOK_ROOT
      : dirname(resolveHandbookPath(fromFilePath));
  const absolutePath = resolve(baseDirectory, normalizedPath);
  assertInsideHandbookRoot(absolutePath);
  return absolutePath;
}

function toCorpusRelativePath(absolutePath: string): string {
  assertInsideHandbookRoot(absolutePath);
  return relative(HANDBOOK_ROOT, absolutePath).split(sep).join("/");
}

function sourceIdentifier(
  toolName: HandbookToolName,
): `handbook:${HandbookToolName}` {
  return `handbook:${toolName}`;
}

function splitFrontmatter(source: string, sourcePath: string): {
  frontmatter: HandbookFrontmatter;
  body: string;
} {
  const normalizedSource = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n");
  const lines = normalizedSource.split("\n");

  if (lines[0]?.trim() !== "---") {
    throw new Error(`Missing YAML frontmatter in ${sourcePath}.`);
  }

  const closingIndex = lines.findIndex(
    (line, index) => index > 0 && line.trim() === "---",
  );
  if (closingIndex < 0) {
    throw new Error(`Unterminated YAML frontmatter in ${sourcePath}.`);
  }

  let yamlValue: unknown;
  try {
    yamlValue = parseYaml(lines.slice(1, closingIndex).join("\n"));
  } catch (error) {
    throw new Error(`Invalid YAML frontmatter in ${sourcePath}.`, {
      cause: error,
    });
  }

  const validation = handbookFrontmatterSchema.safeParse(yamlValue);
  if (!validation.success) {
    throw new Error(
      `Invalid handbook frontmatter in ${sourcePath}: ${z.prettifyError(validation.error)}`,
    );
  }

  return {
    frontmatter: Object.freeze({
      ...validation.data,
      topics: Object.freeze([...validation.data.topics]),
      related: Object.freeze([...validation.data.related]),
    }),
    body: lines.slice(closingIndex + 1).join("\n").trimStart(),
  };
}

function mapRelatedSources(
  relatedPaths: readonly string[],
  fromFilePath: HandbookFilePath,
): readonly HandbookRelatedSource[] {
  return Object.freeze(
    relatedPaths.map((relatedPath) => {
      const absolutePath = resolveHandbookPath(relatedPath, fromFilePath);
      const filePath = toCorpusRelativePath(absolutePath);
      const toolName = PATH_TO_TOOL.get(filePath) ?? null;

      return Object.freeze({
        filePath,
        path: `docs/handbook/${filePath}` as const,
        toolName,
        sourceId: toolName === null ? null : sourceIdentifier(toolName),
      });
    }),
  );
}

async function readHandbookDocument(
  toolName: HandbookToolName,
): Promise<HandbookDocument> {
  const entry = HANDBOOK_CATALOG[toolName];
  const absolutePath = resolveHandbookPath(entry.filePath);
  const sourcePath = `docs/handbook/${entry.filePath}` as const;
  const sourceText = await readFile(absolutePath, "utf8");
  const { frontmatter, body } = splitFrontmatter(sourceText, sourcePath);
  const id = sourceIdentifier(toolName);
  const source = Object.freeze({
    id,
    toolName,
    filePath: entry.filePath,
    path: sourcePath,
  });

  return Object.freeze({
    source,
    sourceId: id,
    title: frontmatter.title,
    summary: frontmatter.summary,
    topics: frontmatter.topics,
    related: mapRelatedSources(frontmatter.related, entry.filePath),
    body,
    hrConfirmations: extractHrConfirmations(body, id),
  });
}

/**
 * Loads and validates one catalog document. Concurrent callers share the same
 * promise, and successful immutable results remain cached for the process.
 */
export function loadHandbookDocument(
  toolName: HandbookToolName,
): Promise<HandbookDocument> {
  if (!isHandbookToolName(toolName)) {
    return Promise.reject(new Error(`Unknown handbook tool: ${toolName}`));
  }

  const cached = documentCache.get(toolName);
  if (cached !== undefined) {
    return cached;
  }

  const pending = readHandbookDocument(toolName);
  documentCache.set(toolName, pending);
  void pending.catch(() => {
    if (documentCache.get(toolName) === pending) {
      documentCache.delete(toolName);
    }
  });
  return pending;
}

export const loadHandbook = loadHandbookDocument;
