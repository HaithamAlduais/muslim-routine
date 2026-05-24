import { addDays } from "./date-utils"
import { generateOccurrences } from "./repeat"
import {
  seedPrayerDays,
  seedTaskTemplates,
  seedTimeBlocks,
} from "./routine-data"
import { autoPackDay } from "./schedule"
import type { PackedDay, PrayerDay, TaskTemplate, TimeBlock } from "./types"

type BuildWeekPreviewInput = {
  startDate: string
  days?: number
  templates?: TaskTemplate[]
  timeBlocks?: TimeBlock[]
  prayerDays?: PrayerDay[]
}

export function buildWeekPreview({
  startDate,
  days = 7,
  templates = seedTaskTemplates,
  timeBlocks = seedTimeBlocks,
  prayerDays = seedPrayerDays,
}: BuildWeekPreviewInput): PackedDay[] {
  const occurrences = generateOccurrences({
    templates,
    timeBlocks,
    startDate,
    days,
  })
  const prayerMap = new Map(prayerDays.map((day) => [day.date, day]))

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(startDate, index)
    const prayers = prayerMap.get(date) ?? fallbackPrayerDay(date)

    return autoPackDay({
      date,
      prayers,
      previousPrayers: prayerMap.get(addDays(date, -1)),
      timeBlocks,
      occurrences,
    })
  })
}

function fallbackPrayerDay(date: string): PrayerDay {
  return {
    date,
    timezone: "Asia/Riyadh",
    timings: {
      Fajr: "04:15",
      Sunrise: "05:40",
      Dhuhr: "11:55",
      Asr: "15:15",
      Maghrib: "18:40",
      Isha: "20:10",
    },
  }
}
