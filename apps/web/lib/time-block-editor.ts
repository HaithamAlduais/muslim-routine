import type { TimeBlock } from "./types"

type TimeBlockSource = TimeBlock["startSource"] | TimeBlock["endSource"]

export type TimeBlockEditorDraft = {
  nameAr: string
  sortOrder: number
  color: string
  startSource: TimeBlock["startSource"]
  endSource: TimeBlock["endSource"]
  fixedStart: string
  fixedEnd: string
}

const timeBlockSources: TimeBlockSource[] = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
  "last_sixth",
  "fixed",
  "custom",
]

export function timeBlockToEditorDraft(block: TimeBlock): TimeBlockEditorDraft {
  return {
    nameAr: block.nameAr,
    sortOrder: block.sortOrder,
    color: block.color,
    startSource: block.startSource,
    endSource: block.endSource,
    fixedStart: block.fixedStart ?? "00:00",
    fixedEnd: block.fixedEnd ?? "00:00",
  }
}

export function createTimeBlockFromDraft(
  draft: TimeBlockEditorDraft,
  existingBlocks: TimeBlock[]
): TimeBlock {
  return buildTimeBlock({
    id: nextTimeBlockId(existingBlocks),
    draft,
  })
}

export function updateTimeBlockById(
  blocks: TimeBlock[],
  id: string,
  draft: TimeBlockEditorDraft
) {
  return blocks.map((block) =>
    block.id === id
      ? buildTimeBlock({
          id,
          draft,
        })
      : block
  )
}

export function deleteTimeBlockById(blocks: TimeBlock[], id: string) {
  return blocks.filter((block) => block.id !== id)
}

export function serializeTimeBlocks(blocks: TimeBlock[]) {
  return JSON.stringify(blocks)
}

export function parseStoredTimeBlocks(value: string | null): TimeBlock[] | null {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      return null
    }

    const blocks = parsed.map(parseStoredTimeBlock)

    return blocks.every(Boolean) ? (blocks as TimeBlock[]) : null
  } catch {
    return null
  }
}

function buildTimeBlock({
  id,
  draft,
}: {
  id: string
  draft: TimeBlockEditorDraft
}): TimeBlock {
  const startSource = safeSource(draft.startSource, "Fajr")
  const endSource = safeSource(draft.endSource, "Sunrise")
  const block: TimeBlock = {
    id,
    nameAr: draft.nameAr.trim(),
    sortOrder: integerOrFallback(draft.sortOrder, 0),
    color: draft.color.trim() || "emerald",
    startSource: startSource as TimeBlock["startSource"],
    endSource: endSource as TimeBlock["endSource"],
  }
  const fixedStart = fixedTimeForSource(startSource, draft.fixedStart)
  const fixedEnd = fixedTimeForSource(endSource, draft.fixedEnd)

  if (fixedStart) {
    block.fixedStart = fixedStart
  }

  if (fixedEnd) {
    block.fixedEnd = fixedEnd
  }

  return block
}

function parseStoredTimeBlock(value: unknown): TimeBlock | null {
  if (!isRecord(value)) {
    return null
  }

  if (
    typeof value.id !== "string" ||
    !value.id.trim() ||
    typeof value.nameAr !== "string" ||
    !value.nameAr.trim()
  ) {
    return null
  }

  if (
    !isTimeBlockSource(value.startSource) ||
    !isTimeBlockSource(value.endSource)
  ) {
    return null
  }

  return buildTimeBlock({
    id: value.id,
    draft: {
      nameAr: value.nameAr,
      sortOrder: integerOrFallback(value.sortOrder, 0),
      color: typeof value.color === "string" ? value.color : "emerald",
      startSource: value.startSource as TimeBlock["startSource"],
      endSource: value.endSource as TimeBlock["endSource"],
      fixedStart: typeof value.fixedStart === "string" ? value.fixedStart : "",
      fixedEnd: typeof value.fixedEnd === "string" ? value.fixedEnd : "",
    },
  })
}

function nextTimeBlockId(existingBlocks: TimeBlock[]) {
  const ids = new Set(existingBlocks.map((block) => block.id))
  let index = existingBlocks.length + 1
  let id = `time-block-${index}`

  while (ids.has(id)) {
    index += 1
    id = `time-block-${index}`
  }

  return id
}

function fixedTimeForSource(source: TimeBlockSource, time: string) {
  if (source !== "fixed" && source !== "custom") {
    return undefined
  }

  return normalizeTime(time, "00:00")
}

function normalizeTime(value: string, fallback: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback
}

function integerOrFallback(value: unknown, fallback: number) {
  const number = Number(value)

  return Number.isInteger(number) ? number : fallback
}

function safeSource(value: unknown, fallback: TimeBlockSource) {
  return isTimeBlockSource(value) ? value : fallback
}

function isTimeBlockSource(value: unknown): value is TimeBlockSource {
  return (
    typeof value === "string" &&
    timeBlockSources.includes(value as TimeBlockSource)
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
