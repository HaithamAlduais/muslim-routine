import { describe, expect, it } from "vitest"

import { autoPackDay, sortTimeBlocks } from "./schedule"
import type { PrayerDay, TaskOccurrence, TimeBlock } from "./types"

const blocks: TimeBlock[] = [
  {
    id: "maghrib_to_isha",
    nameAr: "المغرب إلى العشاء",
    sortOrder: 60,
    color: "rose",
    startSource: "Maghrib",
    endSource: "Isha",
  },
  {
    id: "fajr_to_sunrise",
    nameAr: "الفجر إلى الشروق",
    sortOrder: 20,
    color: "emerald",
    startSource: "Fajr",
    endSource: "Sunrise",
  },
]

const prayers: PrayerDay = {
  date: "2026-05-24",
  timezone: "Asia/Riyadh",
  timings: {
    Fajr: "04:12",
    Sunrise: "05:37",
    Dhuhr: "11:54",
    Asr: "15:15",
    Maghrib: "18:38",
    Isha: "20:08",
  },
}

const occurrence = (
  id: string,
  title: string,
  sortOrder: number,
  durationMinutes: number
): TaskOccurrence => ({
  id,
  templateId: id,
  title,
  date: "2026-05-24",
  timeBlockId: "fajr_to_sunrise",
  durationMinutes,
  status: "planned",
  checklist: [],
  notes: "",
  priority: "medium",
  color: "emerald",
  isModified: false,
  syncStatus: "not_synced",
  sortOrder,
  includeInCalendar: true,
})

describe("routine scheduling", () => {
  it("sorts prayer blocks by hidden order without needing visible numbers", () => {
    expect(sortTimeBlocks(blocks).map((block) => block.nameAr)).toEqual([
      "الفجر إلى الشروق",
      "المغرب إلى العشاء",
    ])
  })

  it("auto-packs tasks from the block start using sort order and duration", () => {
    const packed = autoPackDay({
      date: "2026-05-24",
      prayers,
      timeBlocks: blocks,
      occurrences: [
        occurrence("quran", "قرآن", 20, 25),
        occurrence("fajr", "صلاة الفجر", 10, 20),
      ],
    })

    expect(
      packed.blocks[0]!.occurrences.map((item) => ({
        title: item.title,
        startTime: item.startTime,
        endTime: item.endTime,
      }))
    ).toEqual([
      {
        title: "صلاة الفجر",
        startTime: "2026-05-24T04:12:00+03:00",
        endTime: "2026-05-24T04:32:00+03:00",
      },
      {
        title: "قرآن",
        startTime: "2026-05-24T04:32:00+03:00",
        endTime: "2026-05-24T04:57:00+03:00",
      },
    ])
  })

  it("flags a conflict when tasks exceed the prayer block window", () => {
    const packed = autoPackDay({
      date: "2026-05-24",
      prayers,
      timeBlocks: blocks,
      occurrences: [occurrence("long", "مهمة طويلة", 10, 120)],
    })

    expect(packed.conflicts).toEqual([
      expect.objectContaining({
        type: "duration_exceeds_block",
        timeBlockId: "fajr_to_sunrise",
        occurrenceId: "long",
      }),
    ])
  })
})
