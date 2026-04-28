// parseQuickAdd.ts
// Natural language parser for quick task creation

import type { QuickAddResult } from "./agenda-types";

const MONTHS: Record<string, number> = {
  jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
  may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7, sep: 8, september: 8,
  oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11,
};

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export function parseQuickAdd(input: string): QuickAddResult {
  let text = input.trim();
  let dueDate: string | null = null;
  let dueTime: string | null = null;
  let priority: "high" | "medium" | "low" | null = null;
  const labels: string[] = [];
  let recurring: string | null = null;

  // Extract labels (#tag)
  text = text.replace(/#(\w+)/g, (_, tag) => { labels.push(tag); return ""; });

  // Extract priority
  const priorityMatch = text.match(/\b(high|medium|low|urgent)\b\s*(priority)?/i);
  if (priorityMatch) {
    const p = priorityMatch[1].toLowerCase();
    priority = p === "urgent" ? "high" : p as "high" | "medium" | "low";
    text = text.replace(priorityMatch[0], "");
  }

  // Extract recurring
  const recurringPatterns = [
    /every\s+(day|week|month|year)/i,
    /every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /every\s+([A-Za-z]+\s+\d{1,2})/i,
  ];
  for (const pattern of recurringPatterns) {
    const match = text.match(pattern);
    if (match) { recurring = match[0]; text = text.replace(match[0], ""); break; }
  }

  // Extract time
  const timeMatch = text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3]?.toLowerCase();
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    dueTime = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    text = text.replace(timeMatch[0], "");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (/\btoday\b/i.test(text)) {
    dueDate = today.toISOString().split("T")[0];
    text = text.replace(/\btoday\b/i, "");
  }

  if (/\btomorrow\b/i.test(text)) {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    dueDate = tomorrow.toISOString().split("T")[0];
    text = text.replace(/\btomorrow\b/i, "");
  }

  if (/\bnext\s+week\b/i.test(text)) {
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);
    dueDate = nextWeek.toISOString().split("T")[0];
    text = text.replace(/\bnext\s+week\b/i, "");
  }

  for (let i = 0; i < DAY_NAMES.length; i++) {
    const regex = new RegExp(`\\b${DAY_NAMES[i]}\\b`, "i");
    if (regex.test(text)) {
      const targetDay = i;
      const currentDay = today.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil <= 0) daysUntil += 7;
      const target = new Date(today);
      target.setDate(target.getDate() + daysUntil);
      dueDate = target.toISOString().split("T")[0];
      text = text.replace(regex, "");
      break;
    }
  }

  const monthDayMatch = text.match(/\b([A-Za-z]+)\s+(\d{1,2})\b/);
  if (monthDayMatch && !dueDate) {
    const monthName = monthDayMatch[1].toLowerCase();
    const day = parseInt(monthDayMatch[2], 10);
    const month = MONTHS[monthName];
    if (month !== undefined) {
      const year = today.getFullYear();
      const date = new Date(year, month, day);
      if (date < today) date.setFullYear(year + 1);
      dueDate = date.toISOString().split("T")[0];
      text = text.replace(monthDayMatch[0], "");
    }
  }

  text = text.replace(/\s+/g, " ").trim();

  return {
    title: text || "Untitled",
    dueDate,
    dueTime,
    priority,
    labels,
    recurring,
  };
}
