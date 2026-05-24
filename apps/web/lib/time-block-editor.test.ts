import { describe, expect, it } from "vitest"

import type { TimeBlock } from "./types"
import {
  createTimeBlockFromDraft,
  deleteTimeBlockById,
  parseStoredTimeBlocks,
  serializeTimeBlocks,
  timeBlockToEditorDraft,
  updateTimeBlockById,
} from "./time-block-editor"

const blocks: TimeBlock[] = [
  {
    id: "fajr",
    nameAr: "الفجر إلى الشروق",
    sortOrder: 10,
    color: "emerald",
    startSource: "Fajr",
    endSource: "Sunrise",
  },
  {
    id: "study",
    nameAr: "بعد الشروق",
    sortOrder: 20,
    color: "sky",
    startSource: "fixed",
    endSource: "Dhuhr",
    fixedStart: "06:00",
  },
]

describe("time block editor", () => {
  it("creates routine blocks from editable drafts", () => {
    expect(
      createTimeBlockFromDraft(
        {
          nameAr: "عمل عميق",
          startSource: "Sunrise",
          endSource: "fixed",
          fixedStart: "05:30",
          fixedEnd: "08:30",
          color: "violet",
          sortOrder: 30,
        },
        blocks
      )
    ).toEqual({
      id: "time-block-3",
      nameAr: "عمل عميق",
      startSource: "Sunrise",
      endSource: "fixed",
      fixedEnd: "08:30",
      color: "violet",
      sortOrder: 30,
    })
  })

  it("updates and deletes routine blocks without mutating the original list", () => {
    const updated = updateTimeBlockById(blocks, "study", {
      ...timeBlockToEditorDraft(blocks[1]!),
      nameAr: "تعلم",
      color: "amber",
      fixedStart: "06:30",
    })

    expect(updated).not.toBe(blocks)
    expect(updated.find((block) => block.id === "study")).toMatchObject({
      nameAr: "تعلم",
      color: "amber",
      fixedStart: "06:30",
    })
    expect(deleteTimeBlockById(updated, "study")).toEqual([blocks[0]])
  })

  it("round-trips stored routine blocks and rejects malformed storage", () => {
    expect(parseStoredTimeBlocks(serializeTimeBlocks(blocks))).toEqual(blocks)
    expect(parseStoredTimeBlocks("not json")).toBeNull()
    expect(
      parseStoredTimeBlocks(
        JSON.stringify([{ id: "", nameAr: "", sortOrder: "bad" }])
      )
    ).toBeNull()
  })
})
