import { describe, expect, it } from "vitest"

import { buildWeekPreview } from "./preview"
import { seedTaskTemplates } from "./routine-data"

describe("buildWeekPreview", () => {
  it("keeps every Notion routine template visible in the seeded routine", () => {
    const titles = seedTaskTemplates.map((template) => template.title)

    expect(titles).toEqual([
      "قيام",
      "سحور+استغفار",
      "إعداد+استغفار",
      "تطوير",
      "صلاة الفجر",
      "رياضة",
      "انجليزي",
      "نوم",
      "فطور مع الأسرة",
      "صلاة الظهر",
      "غداء مع العائلة",
      "صلاة العصر",
      "الأسرة",
      "العائلة",
      "آخر ساعة",
      "صلاة المغرب",
      "عربي",
      "لعب",
      "صلاة العشاء",
      "عشاء مع العائلة",
      "الأصدقاء + الأسرة + العائلة",
      "الأصدقاء + الأسرة + العائلة",
      "نوم",
    ])
  })

  it("uses Notion repeat settings so all 23 templates repeat daily", () => {
    expect(seedTaskTemplates).toHaveLength(23)
    expect(
      seedTaskTemplates.map((template) => ({
        title: template.title,
        repeatType: template.repeatType,
        repeatDays: template.repeatDays,
      }))
    ).toEqual(
      seedTaskTemplates.map((template) => ({
        title: template.title,
        repeatType: "daily",
        repeatDays: [],
      }))
    )
  })

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

  it("generates all 23 Notion tasks on every day of the week", () => {
    const preview = buildWeekPreview({
      startDate: "2026-05-24",
      days: 7,
      templates: seedTaskTemplates,
    })

    expect(
      preview.map((day) =>
        day.blocks.reduce((total, block) => total + block.occurrences.length, 0)
      )
    ).toEqual([23, 23, 23, 23, 23, 23, 23])

    expect(
      preview.map((day) =>
        day.blocks.some((block) =>
          block.occurrences.some(
            (occurrence) => occurrence.title === "سحور+استغفار"
          )
        )
      )
    ).toEqual([true, true, true, true, true, true, true])
  })

  it("packs the Notion routine without scheduling conflicts", () => {
    const preview = buildWeekPreview({
      startDate: "2026-05-24",
      days: 7,
      templates: seedTaskTemplates,
    })

    expect(preview.flatMap((day) => day.conflicts)).toEqual([])
  })

  it("maps Notion status blocks to the correct prayer blocks", () => {
    const preview = buildWeekPreview({
      startDate: "2026-05-24",
      days: 1,
      templates: seedTaskTemplates,
    })

    const titlesByBlock = new Map(
      preview[0]!.blocks.map((block) => [
        block.timeBlockId,
        block.occurrences.map((occurrence) => occurrence.title),
      ])
    )

    expect(titlesByBlock.get("last_sixth_to_fajr")).toEqual([
      "قيام",
      "سحور+استغفار",
      "إعداد+استغفار",
      "تطوير",
    ])
    expect(titlesByBlock.get("fajr_to_sunrise")).toEqual([
      "صلاة الفجر",
      "رياضة",
      "انجليزي",
    ])
    expect(titlesByBlock.get("sunrise_to_dhuhr")).toEqual([
      "نوم",
      "فطور مع الأسرة",
    ])
    expect(titlesByBlock.get("maghrib_to_isha")).toEqual([
      "صلاة المغرب",
      "عربي",
      "لعب",
    ])
  })
})
