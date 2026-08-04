import { Clock3, Focus, HeartPulse, House } from "lucide-react";

export const EXAMPLE_QUESTIONS = [
  {
    icon: Clock3,
    label: "Leave & time off",
    question: "How many annual leave days do I get, and how do I request them?",
  },
  {
    icon: House,
    label: "Remote work",
    question: "When am I eligible to work from home, and which days apply?",
  },
  {
    icon: HeartPulse,
    label: "Benefits",
    question: "What medical and employee benefits are available to me?",
  },
  {
    icon: Focus,
    label: "Focus hours",
    question: "What are focus hours, and which meetings are restricted?",
  },
] as const;

export function statusCopy(status: "submitted" | "streaming" | "ready" | "error") {
  switch (status) {
    case "submitted":
      return "Connecting to the handbook…";
    case "streaming":
      return "Reviewing relevant policies…";
    case "error":
      return "The last request did not complete.";
    case "ready":
      return "Ready for your question.";
  }
}
