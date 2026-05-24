import { describe, expect, it, vi } from "vitest"

import {
  buildPrayerTimesApiUrl,
  fetchPrayerDaysForPreview,
  parsePrayerTime,
} from "./prayer-times"

describe("prayer time API integration", () => {
  it("builds AlAdhan coordinate URLs with Umm Al-Qura defaults", () => {
    expect(buildPrayerTimesApiUrl("2026-05-24").toString()).toBe(
      "https://api.aladhan.com/v1/timings/24-05-2026?latitude=24.7136&longitude=46.6753&method=4&school=0"
    )
  })

  it("normalizes API timings that include timezone suffixes", () => {
    expect(parsePrayerTime("03:37 (+03)")).toBe("03:37")
  })

  it("fetches previous, visible, and next prayer days for moving previews", async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const date = input.toString().match(/timings\/([^?]+)/)?.[1]
      const minutesByDate: Record<string, string> = {
        "23-05-2026": "36",
        "24-05-2026": "37",
        "25-05-2026": "38",
        "26-05-2026": "39",
      }

      return Response.json({
        code: 200,
        status: "OK",
        data: {
          timings: {
            Fajr: `03:${minutesByDate[date ?? ""]} (+03)`,
            Sunrise: "05:06 (+03)",
            Dhuhr: "11:50 (+03)",
            Asr: "15:13 (+03)",
            Maghrib: "18:35 (+03)",
            Isha: "20:05 (+03)",
          },
          meta: {
            timezone: "Asia/Riyadh",
          },
        },
      })
    })

    const days = await fetchPrayerDaysForPreview({
      startDate: "2026-05-24",
      days: 2,
      fetcher,
    })

    expect(days.map((day) => day.date)).toEqual([
      "2026-05-23",
      "2026-05-24",
      "2026-05-25",
      "2026-05-26",
    ])
    expect(days.map((day) => day.timings.Fajr)).toEqual([
      "03:36",
      "03:37",
      "03:38",
      "03:39",
    ])
    expect(fetcher).toHaveBeenCalledTimes(4)
  })
})
