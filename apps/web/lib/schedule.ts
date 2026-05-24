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

    const packedOccurrences = packBlockOccurrences({
      block,
      blockEndTime: endTime,
      blockStartTime: startTime,
      conflicts,
      date,
      occurrences: blockOccurrences,
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

function packBlockOccurrences({
  block,
  blockEndTime,
  blockStartTime,
  conflicts,
  date,
  occurrences,
}: {
  block: TimeBlock
  blockEndTime: string
  blockStartTime: string
  conflicts: ScheduleConflict[]
  date: string
  occurrences: TaskOccurrence[]
}) {
  const anchoredTimes = new Map<
    string,
    { startTime: string; endTime: string }
  >()
  let anchorCursor = blockEndTime

  for (const occurrence of [...occurrences].reverse()) {
    if (occurrence.scheduleMode !== "anchor_to_block_end") {
      continue
    }

    const startTime = addMinutes(anchorCursor, -occurrence.durationMinutes)
    anchoredTimes.set(occurrence.id, {
      startTime,
      endTime: anchorCursor,
    })
    anchorCursor = startTime
  }

  let cursor = blockStartTime

  return occurrences.map((occurrence, index) => {
    const anchoredTime = anchoredTimes.get(occurrence.id)
    const nextAnchorStart =
      anchoredTime?.startTime ??
      nextAnchoredStart(occurrences, index, anchoredTimes) ??
      blockEndTime
    let startTime: string
    let endTime: string

    if (anchoredTime) {
      startTime = anchoredTime.startTime
      endTime = anchoredTime.endTime
      cursor = endTime
    } else if (occurrence.scheduleMode === "fill_until_next_anchor") {
      startTime = cursor
      endTime =
        minutesBetween(startTime, nextAnchorStart) >= 0
          ? nextAnchorStart
          : addMinutes(startTime, occurrence.durationMinutes)
      cursor = endTime
    } else {
      startTime = cursor
      endTime = addMinutes(startTime, occurrence.durationMinutes)
      cursor = endTime
    }

    const exceedsBlock = minutesBetween(blockEndTime, endTime) > 0
    const overlapsAnchor =
      !anchoredTime && minutesBetween(nextAnchorStart, endTime) > 0
    const startsBeforeBlock =
      anchoredTime && minutesBetween(blockStartTime, startTime) < 0
    const hasConflict = exceedsBlock || overlapsAnchor || startsBeforeBlock

    if (hasConflict) {
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
      startTime,
      endTime,
      syncStatus: hasConflict ? "conflict" : occurrence.syncStatus,
    }
  })
}

function nextAnchoredStart(
  occurrences: TaskOccurrence[],
  index: number,
  anchoredTimes: Map<string, { startTime: string; endTime: string }>
) {
  for (
    let nextIndex = index + 1;
    nextIndex < occurrences.length;
    nextIndex += 1
  ) {
    const time = anchoredTimes.get(occurrences[nextIndex]!.id)

    if (time) {
      return time.startTime
    }
  }

  return undefined
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
