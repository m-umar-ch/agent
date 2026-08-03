# Staunch Employee Handbook

This directory is the canonical, tool-ready handbook corpus. The original
handbook remains at [`../STAUNCH_EMPLOYEE_HANDBOOK.md`](../STAUNCH_EMPLOYEE_HANDBOOK.md)
as a source archive.

Each content file covers one employee question domain. A future handbook agent
should load only the file or files relevant to the employee's question.

## Policy files

| Topic | File | Suggested tool name |
| --- | --- | --- |
| Employment terms, probation, confidentiality, grievances, and discipline | [`general-employment-policies.md`](general-employment-policies.md) | `get_employment_policies` |
| Daily focus hours and Thursday meeting restrictions | [`focus-hours-policy.md`](focus-hours-policy.md) | `get_focus_hours_policy` |
| Dress, conduct, safety, harassment, and smoking | [`workplace-conduct-and-safety.md`](workplace-conduct-and-safety.md) | `get_workplace_conduct_and_safety` |
| Approved workplace systems and their purpose | [`work-management-tools.md`](work-management-tools.md) | `get_work_management_tools` |
| KPIs, quarterly reviews, ratings, and annual appraisal | [`performance-appraisal.md`](performance-appraisal.md) | `get_performance_appraisal` |
| Employee benefits, medical coverage, allowances, awards, and loans | [`benefits/employee-benefits.md`](benefits/employee-benefits.md) | `get_employee_benefits` |
| Leave quotas, requests, parental leave, holidays, and encashment | [`benefits/leave-policy.md`](benefits/leave-policy.md) | `get_leave_policy` |
| Working hours, Hubstaff, attendance, breaks, and overtime | [`benefits/working-hours-and-attendance.md`](benefits/working-hours-and-attendance.md) | `get_working_hours_and_attendance` |
| Remote-work eligibility, categories, and office schedules | [`benefits/work-from-home-policy.md`](benefits/work-from-home-policy.md) | `get_work_from_home_policy` |
| EOBI eligibility, contributions, benefits, and claims | [`benefits/eobi-policy.md`](benefits/eobi-policy.md) | `get_eobi_policy` |
| Standby duty, night-work eligibility, rates, and payment | [`benefits/night-work-compensation.md`](benefits/night-work-compensation.md) | `get_night_work_compensation` |
| Resignation, termination, clearance, and rehire | [`offboarding-policy.md`](offboarding-policy.md) | `get_offboarding_policy` |

## Role files

| Department | File | Suggested tool name |
| --- | --- | --- |
| Engineering | [`roles/engineering.md`](roles/engineering.md) | `get_engineering_roles` |
| UI/UX | [`roles/ui-ux.md`](roles/ui-ux.md) | `get_ui_ux_roles` |
| Business Development | [`roles/business-development.md`](roles/business-development.md) | `get_business_development_roles` |

Digital Marketing and HR role files are omitted because the source contains
only placeholders for those departments.

## Routing boundaries

- Use the leave policy for leave quotas, requests, the sandwich rule, parental
  leave, public holidays, and leave encashment. Use employee benefits for
  medical coverage, allowances, awards, and loans.
- Use working hours and attendance for Hubstaff logging, late arrival,
  absences, breaks, and ordinary overtime. Use night-work compensation only
  for Night Hours, standby duty, or eligible-project compensation.
- Use the work-from-home policy for remote-work eligibility and office-day
  schedules. Use the focus-hours policy for the 3:00 PM–5:00 PM focus block
  and Thursday meeting restriction.
- Use work-management tools to explain what a company system is for. Use the
  governing policy file for operational rules performed in that system.
- Use a department role file for responsibilities and progression. Use
  performance appraisal for KPI and review processes.
- Use general employment for active employment obligations and common
  disciplinary grounds. Use offboarding for discharge-for-cause grounds,
  resignation, termination procedures, clearance, and rehire.
- Use EOBI for pension eligibility, statutory contributions, verification, and
  claims. Use employee benefits for company-provided compensation and benefits.

## Unresolved policy

Some source statements conflict, are incomplete, or contain dated values.
Affected sections begin with `Needs HR confirmation`.

A future agent must:

1. state only the documented facts;
2. explain the conflict or missing detail;
3. avoid choosing an interpretation or calculating an uncertain entitlement;
   and
4. direct the employee to HR for the current rule.

## Content conventions

- Frontmatter provides a concise title, routing summary, topics, and related
  files.
- Body text contains policy or role information only.
- Relative links connect related topics without duplicating their details.
- Company marketing, decorative prose, image-only org-chart content, and empty
  role placeholders are intentionally excluded.
