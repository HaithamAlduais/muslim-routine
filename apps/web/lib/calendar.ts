import type { CalendarBlockEvent, PackedDay, TaskOccurrence } from "./types"
import { workoutHrefForTemplate } from "./workout-plan"

type BuildCalendarBlockEventsOptions = {
  baseUrl?: string
}

const googleCalendarColorIdsByTimeBlock: Record<string, string> = {
  last_sixth_to_fajr: "9",
  fajr_to_sunrise: "10",
  sunrise_to_dhuhr: "7",
  dhuhr_to_asr: "5",
  asr_to_maghrib: "6",
  maghrib_to_isha: "4",
  isha_to_sleep: "8",
}

const googleCalendarColorIdsByToken: Record<string, string> = {
  lavender: "1",
  sage: "2",
  violet: "3",
  rose: "4",
  amber: "5",
  orange: "6",
  sky: "7",
  slate: "8",
  indigo: "9",
  emerald: "10",
  red: "11",
  teal: "2",
  zinc: "8",
}

export function buildCalendarBlockEvents(
  days: PackedDay[],
  options: BuildCalendarBlockEventsOptions = {}
): CalendarBlockEvent[] {
  return days.flatMap((day) =>
    day.blocks
      .filter((block) =>
        block.occurrences.some(
          (occurrence) =>
            occurrence.includeInCalendar && occurrence.status !== "skipped"
        )
      )
      .map((block) => {
        const included = block.occurrences.filter(
          (occurrence) =>
            occurrence.includeInCalendar && occurrence.status !== "skipped"
        )
        const description = buildDescription(included, options.baseUrl)
        const googleCalendarColorId = googleCalendarColorIdForTimeBlock(
          block.timeBlockId,
          block.color
        )
        const payload = {
          summary: block.nameAr,
          description,
          start: block.startTime,
          end: block.endTime,
          googleCalendarColorId,
        }

        return {
          localId: `${day.date}:${block.timeBlockId}`,
          summary: block.nameAr,
          description,
          start: block.startTime,
          end: block.endTime,
          payloadHash: stableHash(JSON.stringify(payload)),
          timeBlockId: block.timeBlockId,
          date: day.date,
          googleCalendarColorId,
        }
      })
  )
}

export function googleCalendarColorIdForTimeBlock(
  timeBlockId: string,
  color?: string
) {
  return (
    (color ? googleCalendarColorIdsByToken[color] : undefined) ??
    googleCalendarColorIdsByTimeBlock[timeBlockId] ??
    "1"
  )
}

function buildDescription(occurrences: TaskOccurrence[], baseUrl?: string) {
  return occurrences
    .map((occurrence, index) => {
      const timeLabel = `(من ${formatEventTime(occurrence.startTime)} إلى ${formatEventTime(occurrence.endTime)})`
      const workoutHref = workoutHrefForTemplate(occurrence.templateId)
      const workoutUrl = workoutHref
        ? absoluteUrl(workoutHref, baseUrl)
        : null

      if (workoutUrl) {
        const notes = occurrence.notes ? `\n   ${occurrence.notes}` : ""

        return `${index + 1}. ${occurrence.title} ${timeLabel}${notes}\n   رابط التمرين: ${workoutUrl}`
      }

      const checklist = occurrence.checklist
        .map((item) => `   - ${item}`)
        .join("\n")
      const notes = occurrence.notes ? `\n   ${occurrence.notes}` : ""
      const details = [notes, checklist ? `\n${checklist}` : ""].join("")

      return `${index + 1}. ${occurrence.title} ${timeLabel}${details}`
    })
    .join("\n\n")
}

function absoluteUrl(path: string, baseUrl?: string) {
  if (!baseUrl) {
    return path
  }

  try {
    return new URL(path, baseUrl).toString()
  } catch {
    return path
  }
}

function formatEventTime(value: string | undefined) {
  return value?.slice(11, 16) ?? "--:--"
}

function stableHash(input: string) {
  let hash = 2166136261

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return (hash >>> 0).toString(16).padStart(8, "0")
}
