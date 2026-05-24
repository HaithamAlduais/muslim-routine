import type { ScheduleMode } from "./types"

type DurationLabelTemplate = {
  defaultDurationMinutes: number
  scheduleMode?: ScheduleMode
}

export function durationLabel(template: DurationLabelTemplate) {
  if (template.scheduleMode === "fill_until_next_anchor") {
    return "حتى آخر ساعة"
  }

  if (template.scheduleMode === "anchor_to_block_end") {
    if (template.defaultDurationMinutes === 60) {
      return "آخر ساعة"
    }

    return `آخر ${template.defaultDurationMinutes} دقيقة`
  }

  return `${template.defaultDurationMinutes} دقيقة`
}
