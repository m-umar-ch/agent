import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  HANDBOOK_CATALOG,
  HANDBOOK_TOOL_NAMES,
  type HandbookToolName,
} from "../src/handbook/catalog";
import { extractHrConfirmations } from "../src/handbook/hr-confirmation";
import {
  loadHandbookDocument,
  resolveHandbookPath,
} from "../src/handbook/loader";
import { handbookTools } from "../src/handbook/tools";

describe("handbook catalog and corpus", () => {
  test("catalog has exactly the 15 tool names documented by the README", async () => {
    expect(HANDBOOK_TOOL_NAMES).toHaveLength(15);
    expect(Object.keys(HANDBOOK_CATALOG)).toEqual([...HANDBOOK_TOOL_NAMES]);

    const readme = await readFile(resolveHandbookPath("README.md"), "utf8");
    const documentedNames = [
      ...readme.matchAll(/`(get_[a-z0-9_]+)`/g),
    ].map(match => match[1]);

    expect(documentedNames).toEqual([...HANDBOOK_TOOL_NAMES]);
  });

  test("every catalog file loads with validated frontmatter and content", async () => {
    const documents = await Promise.all(
      HANDBOOK_TOOL_NAMES.map(toolName => loadHandbookDocument(toolName)),
    );

    expect(documents).toHaveLength(15);
    for (const [index, document] of documents.entries()) {
      const toolName = HANDBOOK_TOOL_NAMES[index]!;
      const entry = HANDBOOK_CATALOG[toolName];

      expect(document.source).toEqual({
        id: `handbook:${toolName}`,
        toolName,
        filePath: entry.filePath,
        path: `docs/handbook/${entry.filePath}`,
      });
      expect(document.sourceId).toBe(`handbook:${toolName}`);
      expect(document.title.trim().length).toBeGreaterThan(0);
      expect(document.summary.trim().length).toBeGreaterThan(0);
      expect(document.topics.length).toBeGreaterThan(0);
      expect(document.topics.every(topic => topic.trim().length > 0)).toBe(true);
      expect(document.body.trim().length).toBeGreaterThan(0);
    }
  });

  test("all related files map to catalog tools and stable source identifiers", async () => {
    const documents = await Promise.all(
      HANDBOOK_TOOL_NAMES.map(toolName => loadHandbookDocument(toolName)),
    );

    for (const document of documents) {
      for (const related of document.related) {
        expect(related.path).toBe(`docs/handbook/${related.filePath}`);
        expect(related.toolName).not.toBeNull();
        if (related.toolName === null) {
          throw new Error(`Unmapped related handbook file: ${related.filePath}`);
        }
        expect(related.sourceId).toBe(`handbook:${related.toolName}`);
        expect(
          HANDBOOK_CATALOG[related.toolName as HandbookToolName]
            .filePath as string,
        ).toBe(related.filePath);
      }
    }

    const leave = await loadHandbookDocument("get_leave_policy");
    expect(leave.related).toEqual([
      {
        filePath: "benefits/employee-benefits.md",
        path: "docs/handbook/benefits/employee-benefits.md",
        toolName: "get_employee_benefits",
        sourceId: "handbook:get_employee_benefits",
      },
      {
        filePath: "benefits/working-hours-and-attendance.md",
        path: "docs/handbook/benefits/working-hours-and-attendance.md",
        toolName: "get_working_hours_and_attendance",
        sourceId: "handbook:get_working_hours_and_attendance",
      },
      {
        filePath: "benefits/work-from-home-policy.md",
        path: "docs/handbook/benefits/work-from-home-policy.md",
        toolName: "get_work_from_home_policy",
        sourceId: "handbook:get_work_from_home_policy",
      },
      {
        filePath: "general-employment-policies.md",
        path: "docs/handbook/general-employment-policies.md",
        toolName: "get_employment_policies",
        sourceId: "handbook:get_employment_policies",
      },
      {
        filePath: "offboarding-policy.md",
        path: "docs/handbook/offboarding-policy.md",
        toolName: "get_offboarding_policy",
        sourceId: "handbook:get_offboarding_policy",
      },
    ]);
  });

  test("rejects absolute, null-byte, and traversal paths", () => {
    for (const unsafePath of [
      "../package.json",
      "benefits/../../package.json",
      "/etc/passwd",
      "C:/Windows/system.ini",
      String.raw`..\package.json`,
      "leave-policy.md\0.txt",
    ]) {
      expect(() => resolveHandbookPath(unsafePath)).toThrow();
    }

    expect(() =>
      resolveHandbookPath("../../package.json", "benefits/leave-policy.md"),
    ).toThrow();
  });
});

describe("HR confirmation extraction", () => {
  test("captures multiline warnings under the nearest H2 or H3", () => {
    const markdown = [
      "## Leave",
      "> **Needs HR confirmation:** First line",
      "> second line",
      ">",
      "> final line",
      "",
      "### Carryover",
      "> **Needs HR confirmation:** H3 warning",
      "",
      "## Benefits",
      "> **Needs HR confirmation:** New H2 warning",
    ].join("\n");

    const flags = extractHrConfirmations(markdown, "handbook:test");

    expect(flags).toHaveLength(3);
    expect(flags[0]).toMatchObject({
      sourceId: "handbook:test",
      section: "Leave",
      sectionLevel: 2,
      content: "First line\nsecond line\n\nfinal line",
      lineStart: 2,
      lineEnd: 5,
    });
    expect(flags[1]).toMatchObject({
      section: "Carryover",
      sectionLevel: 3,
      content: "H3 warning",
    });
    expect(flags[2]).toMatchObject({
      section: "Benefits",
      sectionLevel: 2,
      content: "New H2 warning",
    });
    expect(new Set(flags.map(flag => flag.id)).size).toBe(3);
  });

  test("the catalog corpus contains exactly 42 HR confirmation flags", async () => {
    const documents = await Promise.all(
      HANDBOOK_TOOL_NAMES.map(toolName => loadHandbookDocument(toolName)),
    );
    expect(
      documents.reduce(
        (total, document) => total + document.hrConfirmations.length,
        0,
      ),
    ).toBe(42);
  });
});

describe("handbook tools", () => {
  test("leave policy returns the documented structured result", async () => {
    const leaveTool = handbookTools.get_leave_policy;
    expect(leaveTool.execute).toBeFunction();

    const output = await leaveTool.execute!(
      {},
      {
        toolCallId: "leave-call",
        messages: [],
        abortSignal: new AbortController().signal,
        context: {},
      },
    );
    if (Symbol.asyncIterator in output) {
      throw new Error("The leave policy tool unexpectedly returned a stream.");
    }

    expect(output.source).toEqual({
      id: "handbook:get_leave_policy",
      toolName: "get_leave_policy",
      filePath: "benefits/leave-policy.md",
      path: "docs/handbook/benefits/leave-policy.md",
    });
    expect(output.policy.title).toBe("Leave Policy");
    expect(output.policy.summary.length).toBeGreaterThan(0);
    expect(output.policy.topics).toContain("leave");
    expect(output.policy).not.toHaveProperty("content");
    expect(output.relatedSources).toHaveLength(5);
    expect(output.hr.requiresConfirmation).toBe(true);
    expect(output.hr.flagCount).toBe(7);

    const modelOutput = await leaveTool.toModelOutput!({
      toolCallId: "leave-call",
      input: {},
      output,
    });
    expect(modelOutput.type).toBe("text");
    if (modelOutput.type !== "text") {
      throw new Error("Expected the handbook tool to return model text.");
    }
    const modelPolicy = JSON.parse(modelOutput.value) as {
      policy: { content: string };
      hr: { flags: unknown[] };
    };
    expect(modelPolicy.policy.content).toContain("28 days");
    expect(modelPolicy.hr.flags).toHaveLength(7);
  });
});
