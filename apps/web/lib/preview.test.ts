import { describe, expect, it } from "vitest"

import { buildWeekPreview } from "./preview"
import { seedTaskTemplates } from "./routine-data"

describe("buildWeekPreview", () => {
  it("builds a seven-day prayer-block preview from the seeded routine", () => {
    const preview = buildWeekPreview({
      startDate: "2026-05-24",
      days: 7,
    })

    expect(preview).toHaveLength(7)
    expect(preview[0]!.blocks.map((block) => block.nameAr)).toContain(
      "الفجر إلى الشروق"
    )
    expect(
      preview.flatMap((day) =>
        day.blocks.flatMap((block) =>
          block.occurrences.map((occurrence) => occurrence.title)
        )
      )
    ).toContain("صلاة الفجر")
  })

  it("keeps suhoor selected to Monday and Thursday in the generated week", () => {
    const preview = buildWeekPreview({
      startDate: "2026-05-24",
      days: 7,
      templates: seedTaskTemplates,
    })

    const suhoorDates = preview.flatMap((day) =>
      day.blocks.flatMap((block) =>
        block.occurrences
          .filter((occurrence) => occurrence.title === "سحور + استغفار")
          .map((occurrence) => occurrence.date)
      )
    )

    expect(suhoorDates).toEqual(["2026-05-25", "2026-05-28"])
  })
})
