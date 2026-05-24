import type {
  Category,
  Priority,
  RepeatType,
  ScheduleMode,
  TaskTemplate,
  Weekday,
} from "./types"

export type TemplateEditorScheduleMode = ScheduleMode | "fixed_duration"

export type TemplateEditorDraft = {
  id: string
  title: string
  categoryId: string
  timeBlockId: string
  duration: number
  defaultPriority: Priority
  repeatType: RepeatType
  repeatDays: Weekday[]
  repeatInterval: number
  startDate: string
  endDate: string
  notes: string
  checklist: string[]
  includeInCalendar: boolean
  isActive: boolean
  sortOrder: number
  scheduleMode: TemplateEditorScheduleMode
}

export function templateToEditorDraft(
  template: TaskTemplate
): TemplateEditorDraft {
  return {
    id: template.id,
    title: template.title,
    categoryId: template.categoryId,
    timeBlockId: template.defaultTimeBlockId,
    duration: template.defaultDurationMinutes,
    defaultPriority: template.defaultPriority,
    repeatType: template.repeatType,
    repeatDays: [...template.repeatDays],
    repeatInterval: template.repeatInterval,
    startDate: template.startDate,
    endDate: template.endDate ?? "",
    notes: template.notes,
    checklist: [...template.checklist],
    includeInCalendar: template.includeInCalendar,
    isActive: template.isActive,
    sortOrder: template.sortOrder,
    scheduleMode: template.scheduleMode ?? "fixed_duration",
  }
}

export function applyTemplateEditorDraft(
  template: TaskTemplate,
  draft: TemplateEditorDraft,
  categories: Category[]
): TaskTemplate {
  const category = categories.find((item) => item.id === draft.categoryId)
  const scheduleMode =
    draft.scheduleMode === "fixed_duration" ? undefined : draft.scheduleMode

  return {
    ...template,
    title: draft.title.trim(),
    categoryId: draft.categoryId,
    defaultTimeBlockId: draft.timeBlockId,
    defaultDurationMinutes: clampInteger(draft.duration, 0, 1440),
    defaultPriority: draft.defaultPriority,
    repeatType: draft.repeatType,
    repeatDays:
      draft.repeatType === "selected_days" || draft.repeatType === "weekly"
        ? uniqueSortedWeekdays(draft.repeatDays)
        : [],
    repeatInterval: clampInteger(draft.repeatInterval, 1, 365),
    startDate: draft.startDate,
    endDate: draft.endDate.trim() ? draft.endDate : null,
    notes: draft.notes.trim(),
    checklist: sanitizeChecklist(draft.checklist),
    color: category?.color ?? template.color,
    isActive: draft.isActive,
    includeInCalendar: draft.includeInCalendar,
    sortOrder: clampInteger(draft.sortOrder, 0, 10000),
    scheduleMode,
  }
}

export function toggleEditorDraftDay(
  draft: TemplateEditorDraft,
  day: Weekday
): TemplateEditorDraft {
  return {
    ...draft,
    repeatDays: draft.repeatDays.includes(day)
      ? draft.repeatDays.filter((value) => value !== day)
      : uniqueSortedWeekdays([...draft.repeatDays, day]),
  }
}

export function deleteTemplateById(
  templates: TaskTemplate[],
  templateId: string
) {
  return templates.filter((template) => template.id !== templateId)
}

export function serializeTemplates(templates: TaskTemplate[]) {
  return JSON.stringify(templates)
}

export function parseStoredTemplates(value: string | null) {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed) || !parsed.every(isTaskTemplateLike)) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function sanitizeChecklist(checklist: string[]) {
  return checklist.map((item) => item.trim()).filter(Boolean)
}

function uniqueSortedWeekdays(days: Weekday[]) {
  return [...new Set(days)].sort((a, b) => a - b) as Weekday[]
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min
  }

  return Math.min(max, Math.max(min, Math.round(value)))
}

function isTaskTemplateLike(value: unknown): value is TaskTemplate {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const template = value as Record<string, unknown>

  return (
    typeof template.id === "string" &&
    typeof template.title === "string" &&
    typeof template.categoryId === "string" &&
    typeof template.defaultTimeBlockId === "string" &&
    typeof template.defaultDurationMinutes === "number" &&
    typeof template.defaultPriority === "string" &&
    typeof template.repeatType === "string" &&
    Array.isArray(template.repeatDays) &&
    typeof template.repeatInterval === "number" &&
    typeof template.startDate === "string" &&
    typeof template.notes === "string" &&
    Array.isArray(template.checklist) &&
    typeof template.color === "string" &&
    typeof template.isActive === "boolean" &&
    typeof template.includeInCalendar === "boolean" &&
    typeof template.sortOrder === "number"
  )
}
