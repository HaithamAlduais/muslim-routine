import { addDays, compareDate, weekday } from "./date-utils"
import type { TaskOccurrence, TaskTemplate, TimeBlock } from "./types"

type GenerateOccurrencesInput = {
  templates: TaskTemplate[]
  timeBlocks: TimeBlock[]
  startDate: string
  days: number
}

export function generateOccurrences({
  templates,
  timeBlocks,
  startDate,
  days,
}: GenerateOccurrencesInput): TaskOccurrence[] {
  const blockIds = new Set(timeBlocks.map((block) => block.id))
  const dates = Array.from({ length: days }, (_, index) =>
    addDays(startDate, index)
  )

  return templates
    .filter((template) => template.isActive)
    .flatMap((template) =>
      dates
        .filter(() => blockIds.has(template.defaultTimeBlockId))
        .filter((date) => shouldGenerateOnDate(template, date))
        .map((date) => occurrenceFromTemplate(template, date))
    )
    .sort(
      (a, b) =>
        compareDate(a.date, b.date) ||
        a.timeBlockId.localeCompare(b.timeBlockId) ||
        a.sortOrder - b.sortOrder ||
        a.title.localeCompare(b.title)
    )
}

function shouldGenerateOnDate(template: TaskTemplate, date: string) {
  if (compareDate(date, template.startDate) < 0) {
    return false
  }

  if (template.endDate && compareDate(date, template.endDate) > 0) {
    return false
  }

  switch (template.repeatType) {
    case "none":
      return date === template.startDate
    case "daily":
      return matchesInterval(template.startDate, date, template.repeatInterval)
    case "selected_days":
      return template.repeatDays.includes(weekday(date))
    case "weekly":
      return (
        template.repeatDays.includes(weekday(date)) &&
        matchesInterval(template.startDate, date, template.repeatInterval * 7)
      )
    case "monthly":
      return date.slice(8, 10) === template.startDate.slice(8, 10)
    case "custom":
      return matchesInterval(template.startDate, date, template.repeatInterval)
  }
}

function matchesInterval(
  startDate: string,
  date: string,
  intervalDays: number
) {
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime()
  const current = new Date(`${date}T00:00:00.000Z`).getTime()
  const diffDays = Math.floor((current - start) / 86400000)
  const interval = Math.max(1, intervalDays)

  return diffDays % interval === 0
}

function occurrenceFromTemplate(
  template: TaskTemplate,
  date: string
): TaskOccurrence {
  return {
    id: `${template.id}:${date}`,
    templateId: template.id,
    title: template.title,
    date,
    timeBlockId: template.defaultTimeBlockId,
    durationMinutes: template.defaultDurationMinutes,
    status: "planned",
    checklist: template.checklist,
    notes: template.notes,
    priority: template.defaultPriority,
    color: template.color,
    isModified: false,
    syncStatus: "not_synced",
    sortOrder: template.sortOrder,
    includeInCalendar: template.includeInCalendar,
    scheduleMode: template.scheduleMode,
  }
}
