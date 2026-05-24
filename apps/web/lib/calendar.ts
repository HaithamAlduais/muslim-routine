import type { CalendarBlockEvent, PackedDay, TaskOccurrence } from "./types"

export function buildCalendarBlockEvents(
  days: PackedDay[]
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
        const description = buildDescription(included)
        const payload = {
          summary: block.nameAr,
          description,
          start: block.startTime,
          end: block.endTime,
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
        }
      })
  )
}

function buildDescription(occurrences: TaskOccurrence[]) {
  return occurrences
    .map((occurrence, index) => {
      const checklist = occurrence.checklist
        .map((item) => `   - ${item}`)
        .join("\n")
      const notes = occurrence.notes ? `\n   ${occurrence.notes}` : ""
      const details = [notes, checklist ? `\n${checklist}` : ""].join("")

      return `${index + 1}. ${occurrence.title} (من ${formatEventTime(occurrence.startTime)} إلى ${formatEventTime(occurrence.endTime)})${details}`
    })
    .join("\n\n")
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
