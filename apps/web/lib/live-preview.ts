import { buildWeekPreview } from "./preview"
import type { PrayerDay, TaskTemplate, TimeBlock } from "./types"

type BuildLiveWeekPreviewInput = {
  startDate: string
  days: number
  prayerDays: PrayerDay[]
  templates: TaskTemplate[]
  timeBlocks?: TimeBlock[]
  isPrayerTimesReady: boolean
}

export function buildLiveWeekPreview({
  startDate,
  days,
  prayerDays,
  templates,
  timeBlocks,
  isPrayerTimesReady,
}: BuildLiveWeekPreviewInput) {
  if (!isPrayerTimesReady || prayerDays.length === 0) {
    return []
  }

  return buildWeekPreview({
    startDate,
    days,
    prayerDays,
    templates,
    timeBlocks,
  })
}
