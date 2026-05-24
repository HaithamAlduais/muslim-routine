import { describe, expect, it } from "vitest"

import { buildLiveWeekPreview } from "./live-preview"
import { seedTaskTemplates } from "./routine-data"
import type { PrayerDay } from "./types"

const prayerDays: PrayerDay[] = [
  {
    date: "2026-05-23",
    timezone: "Asia/Riyadh",
    timings: {
      Fajr: "03:36",
      Sunrise: "05:06",
      Dhuhr: "11:50",
      Asr: "15:13",
      Maghrib: "18:35",
      Isha: "20:05",
    },
  },
  {
    date: "2026-05-24",
    timezone: "Asia/Riyadh",
    timings: {
      Fajr: "03:37",
      Sunrise: "05:06",
      Dhuhr: "11:50",
      Asr: "15:13",
      Maghrib: "18:35",
      Isha: "20:05",
    },
  },
  {
    date: "2026-05-25",
    timezone: "Asia/Riyadh",
    timings: {
      Fajr: "03:38",
      Sunrise: "05:06",
      Dhuhr: "11:50",
      Asr: "15:13",
      Maghrib: "18:35",
      Isha: "20:05",
    },
  },
]

describe("live preview gating", () => {
  it("returns no preview until API prayer times are ready", () => {
    expect(
      buildLiveWeekPreview({
        startDate: "2026-05-24",
        days: 1,
        prayerDays: [],
        templates: seedTaskTemplates,
        isPrayerTimesReady: false,
      })
    ).toEqual([])
  })

  it("builds the preview only from fetched prayer API days", () => {
    const preview = buildLiveWeekPreview({
      startDate: "2026-05-24",
      days: 1,
      prayerDays,
      templates: seedTaskTemplates,
      isPrayerTimesReady: true,
    })
    const fajrBlock = preview[0]?.blocks.find(
      (block) => block.timeBlockId === "fajr_to_sunrise"
    )

    expect(fajrBlock?.startTime).toBe("2026-05-24T03:37:00+03:00")
  })
})
