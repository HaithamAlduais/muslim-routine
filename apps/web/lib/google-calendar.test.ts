import { describe, expect, it } from "vitest"

import { toGoogleCalendarEventResource } from "./google-calendar"
import type { CalendarBlockEvent } from "./types"

describe("toGoogleCalendarEventResource", () => {
  it("maps a block event to a Google Calendar event resource", () => {
    const event: CalendarBlockEvent = {
      localId: "2026-05-24:fajr_to_sunrise",
      summary: "الفجر إلى الشروق",
      description: "1. صلاة الفجر",
      start: "2026-05-24T04:12:00+03:00",
      end: "2026-05-24T05:37:00+03:00",
      payloadHash: "abc",
      timeBlockId: "fajr_to_sunrise",
      date: "2026-05-24",
      googleCalendarColorId: "10",
    }

    expect(toGoogleCalendarEventResource(event)).toEqual({
      summary: "الفجر إلى الشروق",
      description: "1. صلاة الفجر",
      colorId: "10",
      start: { dateTime: "2026-05-24T04:12:00+03:00" },
      end: { dateTime: "2026-05-24T05:37:00+03:00" },
      extendedProperties: {
        private: {
          localId: "2026-05-24:fajr_to_sunrise",
          payloadHash: "abc",
          app: "muslim-routine",
        },
      },
    })
  })
})
