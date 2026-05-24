import { describe, expect, it } from "vitest"

import { syncCalendarBlockEvents } from "./calendar-sync"
import type { CalendarBlockEvent } from "./types"

const event: CalendarBlockEvent = {
  localId: "2026-05-24:fajr_to_sunrise",
  summary: "الفجر إلى الشروق",
  description: "1. صلاة الفجر",
  start: "2026-05-24T04:12:00+03:00",
  end: "2026-05-24T05:37:00+03:00",
  payloadHash: "abc123",
  timeBlockId: "fajr_to_sunrise",
  date: "2026-05-24",
  googleCalendarColorId: "10",
}

describe("syncCalendarBlockEvents", () => {
  it("creates a calendar event when no export record exists", async () => {
    const created: string[] = []

    const result = await syncCalendarBlockEvents({
      events: [event],
      existingExports: [],
      createEvent: async () => {
        created.push(event.localId)
        return "google-event-1"
      },
      updateEvent: async () => undefined,
    })

    expect(created).toEqual(["2026-05-24:fajr_to_sunrise"])
    expect(result.records[0]).toMatchObject({
      localId: event.localId,
      calendarEventId: "google-event-1",
      payloadHash: "abc123",
      action: "created",
    })
  })

  it("skips Google writes when the existing payload hash is unchanged", async () => {
    let writes = 0

    const result = await syncCalendarBlockEvents({
      events: [event],
      existingExports: [
        {
          localId: event.localId,
          calendarEventId: "google-event-1",
          payloadHash: "abc123",
        },
      ],
      createEvent: async () => {
        writes += 1
        return "new"
      },
      updateEvent: async () => {
        writes += 1
      },
    })

    expect(writes).toBe(0)
    expect(result.records[0]!.action).toBe("skipped")
  })

  it("updates the stored Google event when the payload hash changes", async () => {
    const updated: string[] = []

    const result = await syncCalendarBlockEvents({
      events: [{ ...event, payloadHash: "changed" }],
      existingExports: [
        {
          localId: event.localId,
          calendarEventId: "google-event-1",
          payloadHash: "abc123",
        },
      ],
      createEvent: async () => "new",
      updateEvent: async (calendarEventId) => {
        updated.push(calendarEventId)
      },
    })

    expect(updated).toEqual(["google-event-1"])
    expect(result.records[0]).toMatchObject({
      calendarEventId: "google-event-1",
      payloadHash: "changed",
      action: "updated",
    })
  })
})
