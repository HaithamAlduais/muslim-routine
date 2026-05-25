import { describe, expect, it } from "vitest"

import { calendarEventsToIcs } from "./ics"
import type { CalendarBlockEvent } from "./types"

const event: CalendarBlockEvent = {
  localId: "2026-05-24:fajr_to_sunrise",
  summary: "الفجر إلى الشروق",
  description: "1. صلاة الفجر\n- قبل الصلاة",
  start: "2026-05-24T03:37:00+03:00",
  end: "2026-05-24T05:06:00+03:00",
  payloadHash: "abc123",
  timeBlockId: "fajr_to_sunrise",
  date: "2026-05-24",
  googleCalendarColorId: "10",
}

describe("calendarEventsToIcs", () => {
  it("creates an importable calendar file with routine events", () => {
    const ics = calendarEventsToIcs(
      [event],
      new Date("2026-05-24T00:00:00Z")
    )

    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("BEGIN:VEVENT")
    expect(ics).toContain("DTSTART:20260524T003700Z")
    expect(ics).toContain("DTEND:20260524T020600Z")
    expect(ics).toContain("SUMMARY:الفجر إلى الشروق")
    expect(ics).toContain("DESCRIPTION:1. صلاة الفجر\\n- قبل الصلاة")
    expect(ics).toContain("END:VCALENDAR")
  })
})
