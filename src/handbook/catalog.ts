export const HANDBOOK_TOOL_NAMES = [
  "get_employment_policies",
  "get_focus_hours_policy",
  "get_workplace_conduct_and_safety",
  "get_work_management_tools",
  "get_performance_appraisal",
  "get_employee_benefits",
  "get_leave_policy",
  "get_working_hours_and_attendance",
  "get_work_from_home_policy",
  "get_eobi_policy",
  "get_night_work_compensation",
  "get_offboarding_policy",
  "get_engineering_roles",
  "get_ui_ux_roles",
  "get_business_development_roles",
] as const;

export type HandbookToolName = (typeof HANDBOOK_TOOL_NAMES)[number];

export type HandbookFilePath =
  | "general-employment-policies.md"
  | "focus-hours-policy.md"
  | "workplace-conduct-and-safety.md"
  | "work-management-tools.md"
  | "performance-appraisal.md"
  | "benefits/employee-benefits.md"
  | "benefits/leave-policy.md"
  | "benefits/working-hours-and-attendance.md"
  | "benefits/work-from-home-policy.md"
  | "benefits/eobi-policy.md"
  | "benefits/night-work-compensation.md"
  | "offboarding-policy.md"
  | "roles/engineering.md"
  | "roles/ui-ux.md"
  | "roles/business-development.md";

export interface HandbookRoutingMetadata {
  readonly kind: "policy" | "role";
  readonly useFor: readonly string[];
  readonly avoidFor: readonly string[];
}

export interface HandbookCatalogEntry {
  readonly filePath: HandbookFilePath;
  readonly description: string;
  readonly routing: HandbookRoutingMetadata;
}

/**
 * The static tool inventory documented in docs/handbook/README.md.
 *
 * Keep the keys explicit: AI SDK UI message inference depends on the literal
 * tool names remaining visible to TypeScript.
 */
export const HANDBOOK_CATALOG = {
  get_employment_policies: {
    filePath: "general-employment-policies.md",
    description:
      "Use for employment terms, probation, confidentiality, grievances, active-employment obligations, and common disciplinary grounds. Do not use for resignation, termination procedures, clearance, rehire, or department role progression.",
    routing: {
      kind: "policy",
      useFor: [
        "employment terms and classifications",
        "probation and employee obligations",
        "confidentiality, grievances, and discipline",
      ],
      avoidFor: [
        "offboarding procedures and discharge-for-cause grounds",
        "department responsibilities and progression",
      ],
    },
  },
  get_focus_hours_policy: {
    filePath: "focus-hours-policy.md",
    description:
      "Use for the daily 3:00 PM–5:00 PM focus block, Thursday meeting restrictions, and focus-time interruption controls. Do not use for remote-work eligibility, office schedules, ordinary working hours, or attendance.",
    routing: {
      kind: "policy",
      useFor: [
        "daily focus hours",
        "Thursday no-meeting restriction",
        "focus-time interruptions",
      ],
      avoidFor: [
        "remote-work eligibility and office-day schedules",
        "ordinary working hours and attendance",
      ],
    },
  },
  get_workplace_conduct_and_safety: {
    filePath: "workplace-conduct-and-safety.md",
    description:
      "Use for dress, professional conduct, safety, harassment prevention, and smoking rules. Do not use for general employment terms, leave, attendance, or termination procedures.",
    routing: {
      kind: "policy",
      useFor: [
        "dress and workplace conduct",
        "safety and harassment prevention",
        "smoking rules",
      ],
      avoidFor: [
        "employment terms and leave",
        "attendance and termination procedures",
      ],
    },
  },
  get_work_management_tools: {
    filePath: "work-management-tools.md",
    description:
      "Use to explain approved workplace systems and what each system is for. Do not use for operational policy rules merely performed in a system; use the governing leave, attendance, appraisal, or other policy instead.",
    routing: {
      kind: "policy",
      useFor: [
        "approved company systems",
        "the purpose of communication, time, task, HR, and code systems",
      ],
      avoidFor: [
        "leave and attendance rules performed in a system",
        "appraisal or other governing policy rules",
      ],
    },
  },
  get_performance_appraisal: {
    filePath: "performance-appraisal.md",
    description:
      "Use for KPIs, monthly evidence updates, quarterly reviews, ratings, and annual appraisal. Do not use for department responsibilities, qualifications, or career-ladder progression.",
    routing: {
      kind: "policy",
      useFor: [
        "KPIs and appraisal evidence",
        "quarterly reviews and ratings",
        "annual appraisal",
      ],
      avoidFor: [
        "department responsibilities",
        "role qualifications and progression",
      ],
    },
  },
  get_employee_benefits: {
    filePath: "benefits/employee-benefits.md",
    description:
      "Use for company-provided benefits, medical coverage, allowances, awards, loans, and compensation benefits. Do not use for leave quotas, EOBI statutory rules, ordinary overtime, or night-work compensation.",
    routing: {
      kind: "policy",
      useFor: [
        "employee and medical benefits",
        "allowances, awards, and loans",
        "company-provided compensation benefits",
      ],
      avoidFor: [
        "leave quotas and requests",
        "EOBI and work-hours compensation rules",
      ],
    },
  },
  get_leave_policy: {
    filePath: "benefits/leave-policy.md",
    description:
      "Use for leave quotas, requests, the sandwich rule, parental leave, public holidays, and leave encashment. Do not use for medical coverage, other benefits, ordinary attendance, or remote-work eligibility.",
    routing: {
      kind: "policy",
      useFor: [
        "leave quotas and requests",
        "sandwich rule and parental leave",
        "public holidays and leave encashment",
      ],
      avoidFor: [
        "medical coverage and other benefits",
        "ordinary attendance and remote-work eligibility",
      ],
    },
  },
  get_working_hours_and_attendance: {
    filePath: "benefits/working-hours-and-attendance.md",
    description:
      "Use for working hours, Hubstaff logging, late arrival, absences, breaks, attendance, and ordinary overtime. Do not use for Night Hours, standby duty, eligible-project compensation, or leave quotas.",
    routing: {
      kind: "policy",
      useFor: [
        "working hours and Hubstaff logging",
        "attendance, absences, and breaks",
        "ordinary overtime",
      ],
      avoidFor: [
        "night work and standby compensation",
        "leave quotas and requests",
      ],
    },
  },
  get_work_from_home_policy: {
    filePath: "benefits/work-from-home-policy.md",
    description:
      "Use for remote-work eligibility, categories, office-day schedules, and make-up requirements. Do not use for focus hours, Thursday meeting restrictions, or ordinary attendance rules.",
    routing: {
      kind: "policy",
      useFor: [
        "remote-work eligibility",
        "remote-work categories and office schedules",
        "remote-work make-up requirements",
      ],
      avoidFor: [
        "focus hours and Thursday meeting restrictions",
        "ordinary working-hours and attendance rules",
      ],
    },
  },
  get_eobi_policy: {
    filePath: "benefits/eobi-policy.md",
    description:
      "Use for EOBI pension eligibility, statutory contributions, benefits, verification, and claims. Do not use for company-provided medical coverage, allowances, awards, loans, or other compensation benefits.",
    routing: {
      kind: "policy",
      useFor: [
        "EOBI eligibility and contributions",
        "EOBI benefits and verification",
        "EOBI claims",
      ],
      avoidFor: [
        "company-provided medical benefits",
        "allowances, awards, loans, and compensation",
      ],
    },
  },
  get_night_work_compensation: {
    filePath: "benefits/night-work-compensation.md",
    description:
      "Use only for Night Hours, standby duty, project eligibility tiers, night-work rates, and related payment. Do not use for ordinary overtime, general attendance, breaks, or standard working hours.",
    routing: {
      kind: "policy",
      useFor: [
        "Night Hours and standby duty",
        "night-work project tiers and eligibility",
        "night-work rates and payment",
      ],
      avoidFor: [
        "ordinary overtime",
        "general attendance, breaks, and standard hours",
      ],
    },
  },
  get_offboarding_policy: {
    filePath: "offboarding-policy.md",
    description:
      "Use for resignation, termination, discharge-for-cause grounds, clearance, exit processes, and rehire. Do not use for active-employment obligations, common disciplinary grounds, or leave administration.",
    routing: {
      kind: "policy",
      useFor: [
        "resignation and termination",
        "discharge-for-cause grounds and clearance",
        "exit processes and rehire",
      ],
      avoidFor: [
        "active-employment obligations and common discipline",
        "leave administration",
      ],
    },
  },
  get_engineering_roles: {
    filePath: "roles/engineering.md",
    description:
      "Use for Engineering responsibilities, reporting lines, qualifications, and progression. Do not use for KPI and appraisal processes or non-Engineering role ladders.",
    routing: {
      kind: "role",
      useFor: [
        "Engineering responsibilities and reporting lines",
        "Engineering qualifications and progression",
      ],
      avoidFor: [
        "KPI and appraisal processes",
        "UI/UX and Business Development roles",
      ],
    },
  },
  get_ui_ux_roles: {
    filePath: "roles/ui-ux.md",
    description:
      "Use for UI/UX responsibilities, reporting lines, qualifications, and progression. Do not use for KPI and appraisal processes or non-UI/UX role ladders.",
    routing: {
      kind: "role",
      useFor: [
        "UI/UX responsibilities and reporting lines",
        "UI/UX qualifications and progression",
      ],
      avoidFor: [
        "KPI and appraisal processes",
        "Engineering and Business Development roles",
      ],
    },
  },
  get_business_development_roles: {
    filePath: "roles/business-development.md",
    description:
      "Use for Business Development responsibilities, handoffs, reporting lines, qualifications, and progression. Do not use for KPI and appraisal processes or non-Business-Development role ladders.",
    routing: {
      kind: "role",
      useFor: [
        "Business Development responsibilities and handoffs",
        "Business Development reporting lines, qualifications, and progression",
      ],
      avoidFor: [
        "KPI and appraisal processes",
        "Engineering and UI/UX roles",
      ],
    },
  },
} as const satisfies Readonly<Record<HandbookToolName, HandbookCatalogEntry>>;

export const handbookCatalog = HANDBOOK_CATALOG;

const TOOL_NAME_SET: ReadonlySet<string> = new Set(HANDBOOK_TOOL_NAMES);

export function isHandbookToolName(value: string): value is HandbookToolName {
  return TOOL_NAME_SET.has(value);
}
