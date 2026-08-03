import { tool } from "ai";
import { z } from "zod";
import {
  HANDBOOK_CATALOG,
  type HandbookToolName,
} from "./catalog";
import { loadHandbookDocument } from "./loader";

function createHandbookTool<const Name extends HandbookToolName>(name: Name) {
  return tool({
    description: HANDBOOK_CATALOG[name].description,
    inputSchema: z.object({}).strict(),
    execute: async () => {
      const document = await loadHandbookDocument(name);

      return Object.freeze({
        source: document.source,
        policy: Object.freeze({
          title: document.title,
          summary: document.summary,
          topics: document.topics,
        }),
        relatedSources: document.related,
        hr: Object.freeze({
          requiresConfirmation: document.hrConfirmations.length > 0,
          flagCount: document.hrConfirmations.length,
        }),
      });
    },
    toModelOutput: async () => {
      const document = await loadHandbookDocument(name);
      return {
        type: "text" as const,
        value: JSON.stringify({
          source: document.source,
          policy: {
            title: document.title,
            summary: document.summary,
            topics: document.topics,
            content: document.body,
          },
          relatedSources: document.related,
          hr: {
            requiresConfirmation: document.hrConfirmations.length > 0,
            flags: document.hrConfirmations,
          },
        }),
      };
    },
  });
}

/**
 * Keep these properties statically declared so ToolLoopAgent and
 * InferAgentUIMessage retain the exact tool-name and result unions.
 */
export const handbookTools = {
  get_employment_policies: createHandbookTool("get_employment_policies"),
  get_focus_hours_policy: createHandbookTool("get_focus_hours_policy"),
  get_workplace_conduct_and_safety: createHandbookTool(
    "get_workplace_conduct_and_safety",
  ),
  get_work_management_tools: createHandbookTool("get_work_management_tools"),
  get_performance_appraisal: createHandbookTool("get_performance_appraisal"),
  get_employee_benefits: createHandbookTool("get_employee_benefits"),
  get_leave_policy: createHandbookTool("get_leave_policy"),
  get_working_hours_and_attendance: createHandbookTool(
    "get_working_hours_and_attendance",
  ),
  get_work_from_home_policy: createHandbookTool("get_work_from_home_policy"),
  get_eobi_policy: createHandbookTool("get_eobi_policy"),
  get_night_work_compensation: createHandbookTool(
    "get_night_work_compensation",
  ),
  get_offboarding_policy: createHandbookTool("get_offboarding_policy"),
  get_engineering_roles: createHandbookTool("get_engineering_roles"),
  get_ui_ux_roles: createHandbookTool("get_ui_ux_roles"),
  get_business_development_roles: createHandbookTool(
    "get_business_development_roles",
  ),
} as const;

export const HANDBOOK_TOOLS = handbookTools;
