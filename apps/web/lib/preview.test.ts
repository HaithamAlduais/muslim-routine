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
      "مهام",
      "صلاة الظهر",
      "غداء مع العائلة",
      "مهام",
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

  it("keeps 25 templates while preserving selected-day repeat rules", () => {
    expect(seedTaskTemplates).toHaveLength(25)

    expect(
      seedTaskTemplates
        .filter((template) => template.repeatType === "selected_days")
        .map((template) => ({
          title: template.title,
          repeatDays: template.repeatDays,
        }))
    ).toEqual([
      { title: "سحور+استغفار", repeatDays: [1, 4] },
      { title: "إعداد+استغفار", repeatDays: [0, 2, 3, 5, 6] },
      { title: "رياضة", repeatDays: [0, 2, 3] },
      { title: "انجليزي", repeatDays: [1, 4] },
      { title: "نوم", repeatDays: [5, 6] },
      { title: "فطور مع الأسرة", repeatDays: [0, 2, 3, 5, 6] },
      { title: "غداء مع العائلة", repeatDays: [0, 2, 3, 5, 6] },
      { title: "الأسرة", repeatDays: [0, 1, 2, 3, 4] },
      { title: "العائلة", repeatDays: [6] },
      { title: "آخر ساعة", repeatDays: [5] },
      { title: "لعب", repeatDays: [5, 6] },
      { title: "الأصدقاء + الأسرة + العائلة", repeatDays: [4] },
      { title: "الأصدقاء + الأسرة + العائلة", repeatDays: [5] },
      { title: "نوم", repeatDays: [0, 1, 2, 3, 6] },
    ])
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

  it("generates only the correct selected-day occurrences", () => {
    const preview = buildWeekPreview({
      startDate: "2026-05-24",
      days: 7,
      templates: seedTaskTemplates,
    })

    expect(
      preview.map((day) =>
        day.blocks.reduce((total, block) => total + block.occurrences.length, 0)
      )
    ).toEqual([17, 15, 17, 17, 15, 18, 18])

    const datesForTemplate = (templateId: string) =>
      preview.flatMap((day) =>
        day.blocks.flatMap((block) =>
          block.occurrences
            .filter((occurrence) => occurrence.templateId === templateId)
            .map((occurrence) => occurrence.date)
        )
      )

    const expectedDates = {
      "suhoor-istighfar": ["2026-05-25", "2026-05-28"],
      "prepare-istighfar": [
        "2026-05-24",
        "2026-05-26",
        "2026-05-27",
        "2026-05-29",
        "2026-05-30",
      ],
      exercise: ["2026-05-24", "2026-05-26", "2026-05-27"],
      english: ["2026-05-25", "2026-05-28"],
      "morning-sleep": ["2026-05-29", "2026-05-30"],
      "family-breakfast": [
        "2026-05-24",
        "2026-05-26",
        "2026-05-27",
        "2026-05-29",
        "2026-05-30",
      ],
      "family-lunch": [
        "2026-05-24",
        "2026-05-26",
        "2026-05-27",
        "2026-05-29",
        "2026-05-30",
      ],
      "family-core": [
        "2026-05-24",
        "2026-05-25",
        "2026-05-26",
        "2026-05-27",
        "2026-05-28",
      ],
      "extended-family": ["2026-05-30"],
      "last-hour": ["2026-05-29"],
      play: ["2026-05-29", "2026-05-30"],
      "friends-family-first": ["2026-05-28"],
      "friends-family-second": ["2026-05-29"],
      "night-sleep": [
        "2026-05-24",
        "2026-05-25",
        "2026-05-26",
        "2026-05-27",
        "2026-05-30",
      ],
    }

    for (const [templateId, dates] of Object.entries(expectedDates)) {
      expect(datesForTemplate(templateId)).toEqual(dates)
    }
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
      "إعداد+استغفار",
      "تطوير",
    ])
    expect(titlesByBlock.get("fajr_to_sunrise")).toEqual([
      "صلاة الفجر",
      "رياضة",
    ])
    expect(titlesByBlock.get("sunrise_to_dhuhr")).toEqual([
      "فطور مع الأسرة",
      "مهام",
    ])
    expect(titlesByBlock.get("dhuhr_to_asr")).toEqual([
      "صلاة الظهر",
      "غداء مع العائلة",
      "مهام",
    ])
    expect(titlesByBlock.get("asr_to_maghrib")).toEqual([
      "صلاة العصر",
      "الأسرة",
    ])
    expect(titlesByBlock.get("maghrib_to_isha")).toEqual([
      "صلاة المغرب",
      "عربي",
    ])
    expect(titlesByBlock.get("isha_to_sleep")).toEqual([
      "صلاة العشاء",
      "عشاء مع العائلة",
      "نوم",
    ])
  })
})
