import { addDays, addMinutes, minutesBetween, prayerDateTime } from "./date-utils"
import type {
  PackedDay,
  PrayerDay,
  ScheduleConflict,
  TaskOccurrence,
  TimeBlock,
} from "./types"

type AutoPackDayInput = {
  date: string
  prayers: PrayerDay
  previousPrayers?: PrayerDay
  timeBlocks: TimeBlock[]
  occurrences: TaskOccurrence[]
}

export function sortTimeBlocks(blocks: TimeBlock[]) {
  return [...blocks].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.nameAr.localeCompare(b.nameAr)
  )
}

export function autoPackDay({
  date,
  prayers,
  previousPrayers,
  timeBlocks,
  occurrences,
}: AutoPackDayInput): PackedDay {
  const conflicts: ScheduleConflict[] = []
  const blocks = sortTimeBlocks(timeBlocks).map((block) => {
    const startTime = resolveBlockTime(
      block.startSource,
      block.fixedStart,
      prayers,
      previousPrayers
    )
    const endTime = resolveBlockTime(
      block.endSource,
      block.fixedEnd,
      prayers,
      previousPrayers
    )
    const blockOccurrences = occurrences
      .filter(
        (occurrence) =>
          occurrence.date === date && occurrence.timeBlockId === block.id
      )
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
      )

    let cursor = startTime
    const packedOccurrences = blockOccurrences.map((occurrence) => {
      const start = cursor
      const end = addMinutes(start, occurrence.durationMinutes)
      cursor = end

      if (minutesBetween(endTime, end) > 0) {
        conflicts.push({
          type: "duration_exceeds_block",
          date,
          timeBlockId: block.id,
          occurrenceId: occurrence.id,
          message: `${occurrence.title} لا يناسب وقت ${block.nameAr}`,
        })
      }

      return {
        ...occurrence,
        startTime: start,
        endTime: end,
        syncStatus:
          minutesBetween(endTime, end) > 0 ? "conflict" : occurrence.syncStatus,
      }
    })

    return {
      timeBlockId: block.id,
      nameAr: block.nameAr,
      sortOrder: block.sortOrder,
      startTime,
      endTime,
      occurrences: packedOccurrences,
    }
  })

  return { date, blocks, conflicts }
}

function resolveBlockTime(
  source: TimeBlock["startSource"],
  fixedTime: string | undefined,
  prayers: PrayerDay,
  previousPrayers: PrayerDay | undefined
) {
  if (source === "fixed" || source === "custom") {
    return prayerDateTime(prayers, fixedTime ?? "00:00")
  }

  if (source === "last_sixth") {
    return resolveLastSixthStart(prayers, previousPrayers)
  }

  return prayerDateTime(prayers, prayers.timings[source])
}

function resolveLastSixthStart(
  prayers: PrayerDay,
  previousPrayers: PrayerDay | undefined
) {
  const nightStart = previousPrayers
    ? prayerDateTime(previousPrayers, previousPrayers.timings.Maghrib)
    : prayerDateTime(
        { ...prayers, date: addDays(prayers.date, -1) },
        prayers.timings.Maghrib
      )
  const nightEnd = prayerDateTime(prayers, prayers.timings.Fajr)
  const nightMinutes = minutesBetween(nightStart, nightEnd)
  const lastSixthMinutes = Math.round(nightMinutes / 6)

  return addMinutes(nightEnd, -lastSixthMinutes)
}
