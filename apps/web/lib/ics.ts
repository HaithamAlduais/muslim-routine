import type { CalendarBlockEvent } from "./types"

export function calendarEventsToIcs(
  events: CalendarBlockEvent[],
  now = new Date()
) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Muslim Routine//Routine Planner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText("Muslim Routine")}`,
    ...events.flatMap((event) => eventToIcsLines(event, now)),
    "END:VCALENDAR",
  ]

  return `${lines.map(foldIcsLine).join("\r\n")}\r\n`
}

function eventToIcsLines(event: CalendarBlockEvent, now: Date) {
  return [
    "BEGIN:VEVENT",
    `UID:${escapeIcsText(`${event.localId}@muslim-routine`)}`,
    `DTSTAMP:${formatIcsDateTime(now)}`,
    `DTSTART:${formatIcsDateTime(new Date(event.start))}`,
    `DTEND:${formatIcsDateTime(new Date(event.end))}`,
    `SUMMARY:${escapeIcsText(event.summary)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    `X-MUSLIM-ROUTINE-BLOCK:${escapeIcsText(event.timeBlockId)}`,
    `X-MUSLIM-ROUTINE-HASH:${escapeIcsText(event.payloadHash)}`,
    "END:VEVENT",
  ]
}

function formatIcsDateTime(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z")
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
}

function foldIcsLine(line: string) {
  const maxLength = 75

  if (line.length <= maxLength) {
    return line
  }

  const parts: string[] = []
  let cursor = 0

  while (cursor < line.length) {
    const next = line.slice(cursor, cursor + maxLength)
    parts.push(cursor === 0 ? next : ` ${next}`)
    cursor += maxLength
  }

  return parts.join("\r\n")
}
