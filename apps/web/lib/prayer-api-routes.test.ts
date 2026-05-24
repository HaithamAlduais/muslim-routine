import { afterEach, describe, expect, it, vi } from "vitest"

import { POST as fillWeek } from "../app/api/calendar/fill-week/route"
import { GET as getPrayerTimes } from "../app/api/prayer-times/route"

describe("prayer API routes", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("returns API prayer days around the requested preview window", async () => {
    vi.stubGlobal("fetch", mockPrayerFetch())

    const response = await getPrayerTimes(
      new Request("http://localhost/api/prayer-times?startDate=2026-05-24&days=1")
    )
    const body = (await response.json()) as {
      prayerDays: Array<{ date: string; timings: { Fajr: string } }>
      source: string
    }

    expect(response.status).toBe(200)
    expect(body.source).toBe("aladhan")
    expect(body.prayerDays.map((day) => day.date)).toEqual([
      "2026-05-23",
      "2026-05-24",
      "2026-05-25",
    ])
    expect(body.prayerDays[1]!.timings.Fajr).toBe("03:37")
  })

  it("builds calendar events from prayer API timings", async () => {
    vi.stubGlobal("fetch", mockPrayerFetch())

    const response = await fillWeek(
      new Request("http://localhost/api/calendar/fill-week", {
        method: "POST",
        body: JSON.stringify({ startDate: "2026-05-24", days: 1 }),
      })
    )
    const body = (await response.json()) as {
      events: Array<{ localId: string; start: string }>
    }

    expect(response.status).toBe(200)
    expect(
      body.events.find((event) =>
        event.localId.endsWith(":fajr_to_sunrise")
      )?.start
    ).toBe("2026-05-24T03:37:00+03:00")
  })

  it("does not fill the calendar with fallback times when the prayer API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json({}, { status: 500 }))
    )

    const response = await fillWeek(
      new Request("http://localhost/api/calendar/fill-week", {
        method: "POST",
        body: JSON.stringify({ startDate: "2026-05-24", days: 1 }),
      })
    )
    const body = (await response.json()) as { message?: string }

    expect(response.status).toBe(502)
    expect(body.message).toContain("Prayer API failed")
  })
})

function mockPrayerFetch() {
  return vi.fn(async (input: string | URL) => {
    const date = input.toString().match(/timings\/([^?]+)/)?.[1]
    const fajrByDate: Record<string, string> = {
      "23-05-2026": "03:36",
      "24-05-2026": "03:37",
      "25-05-2026": "03:38",
    }

    return Response.json({
      code: 200,
      status: "OK",
      data: {
        timings: {
          Fajr: fajrByDate[date ?? ""],
          Sunrise: "05:06",
          Dhuhr: "11:50",
          Asr: "15:13",
          Maghrib: "18:35",
          Isha: "20:05",
        },
        meta: {
          timezone: "Asia/Riyadh",
        },
      },
    })
  })
}
