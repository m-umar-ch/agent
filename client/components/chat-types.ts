import type {
  DynamicToolUIPart,
  StepStartUIPart,
  ToolUIPart,
  UIMessage,
} from 'ai';
import type { HandbookUIMessage } from '../../src/agent/handbook-agent';

export type HandbookMessage = HandbookUIMessage;

export type HandbookTools =
  HandbookMessage extends UIMessage<infer _Metadata, infer _Data, infer Tools>
    ? Tools
    : never;

export type HandbookToolPart =
  | ToolUIPart<HandbookTools>
  | DynamicToolUIPart;

export type ActivityPart = StepStartUIPart | HandbookToolPart;

const POLICY_NAMES: Record<string, string> = {
  get_employment_policies: 'Employment policies',
  get_focus_hours_policy: 'Focus hours policy',
  get_workplace_conduct_and_safety: 'Workplace conduct & safety',
  get_work_management_tools: 'Work management tools',
  get_performance_appraisal: 'Performance & appraisals',
  get_employee_benefits: 'Employee benefits',
  get_leave_policy: 'Leave policy',
  get_working_hours_and_attendance: 'Working hours & attendance',
  get_work_from_home_policy: 'Work-from-home policy',
  get_eobi_policy: 'EOBI policy',
  get_night_work_compensation: 'Night-work compensation',
  get_offboarding_policy: 'Offboarding policy',
  get_engineering_roles: 'Engineering roles',
  get_ui_ux_roles: 'UI/UX roles',
  get_business_development_roles: 'Business development roles',
};

export function getToolName(part: HandbookToolPart): string {
  return part.type === 'dynamic-tool'
    ? part.toolName
    : part.type.slice('tool-'.length);
}

export function getFriendlyToolName(part: HandbookToolPart): string {
  const name = getToolName(part);
  if (POLICY_NAMES[name]) return POLICY_NAMES[name];

  return name
    .replace(/^get[_-]/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

export function getToolStatus(part: HandbookToolPart): {
  label: string;
  tone: 'working' | 'complete' | 'warning' | 'muted';
} {
  switch (part.state) {
    case 'input-streaming':
      return { label: 'Preparing', tone: 'working' };
    case 'input-available':
      return { label: 'Checking policy', tone: 'working' };
    case 'approval-requested':
      return { label: 'Awaiting approval', tone: 'warning' };
    case 'approval-responded':
      return {
        label: part.approval.approved ? 'Approved' : 'Not approved',
        tone: part.approval.approved ? 'working' : 'muted',
      };
    case 'output-available':
      return {
        label: part.preliminary ? 'Reviewing' : 'Reviewed',
        tone: part.preliminary ? 'working' : 'complete',
      };
    case 'output-error':
      return { label: 'Could not review', tone: 'warning' };
    case 'output-denied':
      return { label: 'Access declined', tone: 'muted' };
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function getHrWarningCount(part: HandbookToolPart): number {
  if (part.state !== 'output-available') return 0;

  const output = asRecord(part.output);
  if (!output) return 0;
  const hr = asRecord(output.hr);
  if (
    typeof hr?.flagCount === 'number' &&
    Number.isFinite(hr.flagCount) &&
    hr.flagCount > 0
  ) {
    return Math.floor(hr.flagCount);
  }
  if (Array.isArray(hr?.flags)) {
    return hr.flags.length;
  }

  for (const key of [
    'hrWarningCount',
    'hr_warning_count',
    'needsHrConfirmationCount',
  ]) {
    const value = output[key];
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return Math.floor(value);
    }
  }

  for (const key of ['hrWarnings', 'hr_warnings']) {
    const value = output[key];
    if (Array.isArray(value)) return value.length;
  }

  if (Array.isArray(output.warnings)) {
    return output.warnings.filter(warning => {
      if (typeof warning === 'string') {
        return /hr|confirmation/i.test(warning);
      }

      const item = asRecord(warning);
      return (
        item?.needsHrConfirmation === true ||
        item?.needs_hr_confirmation === true ||
        (typeof item?.type === 'string' &&
          /hr|confirmation/i.test(item.type)) ||
        (typeof item?.severity === 'string' &&
          /hr|confirmation/i.test(item.severity))
      );
    }).length;
  }

  return 0;
}
