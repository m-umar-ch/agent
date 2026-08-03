import { createHash } from "node:crypto";

export interface HrConfirmationFlag {
  readonly id: string;
  readonly sourceId: string;
  readonly section: string | null;
  readonly sectionLevel: 2 | 3 | null;
  readonly content: string;
  readonly lineStart: number;
  readonly lineEnd: number;
}

interface SectionHeading {
  readonly title: string;
  readonly level: 2 | 3;
}

const HR_MARKER =
  /^\s*>\s*\*\*Needs HR confirmation:\*\*\s*(?<content>.*)$/;
const BLOCKQUOTE_LINE = /^\s*>\s?(?<content>.*)$/;
const SECTION_HEADING = /^(?<hashes>#{2,3})\s+(?<title>.*?)(?:\s+#+)?\s*$/;

function confirmationId(
  sourceId: string,
  section: SectionHeading | null,
  content: string,
  occurrence: number,
): string {
  const digest = createHash("sha256")
    .update(sourceId)
    .update("\0")
    .update(section?.title ?? "")
    .update("\0")
    .update(content)
    .update("\0")
    .update(String(occurrence))
    .digest("hex")
    .slice(0, 16);

  return `hr-confirmation:${digest}`;
}

/**
 * Extracts handbook warnings without interpreting or rewriting their content.
 * A warning extends through all immediately contiguous blockquote lines.
 */
export function extractHrConfirmations(
  markdown: string,
  sourceId = "handbook",
): readonly HrConfirmationFlag[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const flags: HrConfirmationFlag[] = [];
  let h2: SectionHeading | null = null;
  let h3: SectionHeading | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const headingMatch = SECTION_HEADING.exec(line);

    if (headingMatch?.groups) {
      const hashes = headingMatch.groups.hashes;
      const title = headingMatch.groups.title;
      if (hashes === undefined || title === undefined) {
        continue;
      }

      const level = hashes.length as 2 | 3;
      const heading = {
        title: title.trim(),
        level,
      } as const;

      if (level === 2) {
        h2 = heading;
        h3 = null;
      } else {
        h3 = heading;
      }
      continue;
    }

    const markerMatch = HR_MARKER.exec(line);
    if (!markerMatch?.groups) {
      continue;
    }

    const section = h3 ?? h2;
    const contentLines = [markerMatch.groups.content];
    const lineStart = index + 1;
    let lineEnd = lineStart;

    while (index + 1 < lines.length) {
      const nextLine = lines[index + 1] ?? "";
      if (HR_MARKER.test(nextLine)) {
        break;
      }

      const quoteMatch = BLOCKQUOTE_LINE.exec(nextLine);
      if (!quoteMatch?.groups) {
        break;
      }

      contentLines.push(quoteMatch.groups.content);
      index += 1;
      lineEnd = index + 1;
    }

    const content = contentLines.join("\n").trim();
    const occurrence = flags.length + 1;
    flags.push(
      Object.freeze({
        id: confirmationId(sourceId, section, content, occurrence),
        sourceId,
        section: section?.title ?? null,
        sectionLevel: section?.level ?? null,
        content,
        lineStart,
        lineEnd,
      }),
    );
  }

  return Object.freeze(flags);
}
