import { buildWeekPreview } from "./preview"
import type { PrayerDay, TaskTemplate } from "./types"

type BuildLiveWeekPreviewInput = {
  startDate: string
  days: number
  prayerDays: PrayerDay[]
  templates: TaskTemplate[]
  isPrayerTimesReady: boolean
}

export function buildLiveWeekPreview({
  startDate,
  days,
  prayerDays,
  templates,
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
  })
}
