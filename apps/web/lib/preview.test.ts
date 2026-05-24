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
      "العائلة",
      "صلاة العصر",
      "الأسرة",
      "غداء وجلسة مع العائلة",
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

  it("keeps 27 templates while preserving selected-day repeat rules", () => {
    expect(seedTaskTemplates).toHaveLength(27)

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
      { title: "مهام", repeatDays: [1, 2, 3, 4, 5] },
      { title: "غداء مع العائلة", repeatDays: [0, 2, 3, 6] },
      { title: "مهام", repeatDays: [1, 2, 3, 4] },
      { title: "العائلة", repeatDays: [5] },
      { title: "الأسرة", repeatDays: [0, 1, 2, 3, 4] },
      { title: "غداء وجلسة مع العائلة", repeatDays: [5] },
      { title: "العائلة", repeatDays: [6] },
      { title: "آخر ساعة", repeatDays: [5] },
      { title: "عربي", repeatDays: [1, 2, 3, 4, 5] },
      { title: "لعب", repeatDays: [5, 6] },
      { title: "الأصدقاء + الأسرة + العائلة", repeatDays: [4] },
      { title: "الأصدقاء + الأسرة + العائلة", repeatDays: [5] },
      { title: "نوم", repeatDays: [0, 1, 2, 3, 6] },
    ])
  })

  it("keeps corrected duration defaults for worship and food templates", () => {
    const durations = Object.fromEntries(
      seedTaskTemplates.map((template) => [
        template.id,
        template.defaultDurationMinutes,
      ])
    )

    expect(durations).toMatchObject({
      "before-fajr": 30,
      "prepare-istighfar": 10,
      "suhoor-istighfar": 30,
      "family-breakfast": 30,
      "family-lunch": 30,
      "family-dinner": 30,
    })
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
    ).toEqual([14, 15, 17, 17, 15, 18, 15])

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
      "sunrise-tasks": [
        "2026-05-25",
        "2026-05-26",
        "2026-05-27",
        "2026-05-28",
        "2026-05-29",
      ],
      "family-lunch": [
        "2026-05-24",
        "2026-05-26",
        "2026-05-27",
        "2026-05-30",
      ],
      "dhuhr-tasks": [
        "2026-05-25",
        "2026-05-26",
        "2026-05-27",
        "2026-05-28",
      ],
      "friday-dhuhr-family": ["2026-05-29"],
      "family-core": [
        "2026-05-24",
        "2026-05-25",
        "2026-05-26",
        "2026-05-27",
        "2026-05-28",
      ],
      "friday-family-lunch-session": ["2026-05-29"],
      "saturday-asr-family": ["2026-05-30"],
      "last-hour": ["2026-05-29"],
      arabic: [
        "2026-05-25",
        "2026-05-26",
        "2026-05-27",
        "2026-05-28",
        "2026-05-29",
      ],
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

  it("uses the Friday lunch exception before the last Asr hour", () => {
    const preview = buildWeekPreview({
      startDate: "2026-05-29",
      days: 1,
      templates: seedTaskTemplates,
    })
    const friday = preview[0]!
    const blockById = new Map(
      friday.blocks.map((block) => [block.timeBlockId, block])
    )

    expect(
      blockById.get("dhuhr_to_asr")!.occurrences.map((occurrence) => ({
        templateId: occurrence.templateId,
        title: occurrence.title,
        startTime: occurrence.startTime,
      }))
    ).toEqual([
      {
        templateId: "dhuhr",
        title: "صلاة الظهر",
        startTime: "2026-05-29T11:54:00+03:00",
      },
      {
        templateId: "friday-dhuhr-family",
        title: "العائلة",
        startTime: "2026-05-29T12:14:00+03:00",
      },
    ])

    expect(
      blockById.get("asr_to_maghrib")!.occurrences.map((occurrence) => ({
        templateId: occurrence.templateId,
        title: occurrence.title,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
      }))
    ).toEqual([
      {
        templateId: "asr",
        title: "صلاة العصر",
        startTime: "2026-05-29T15:15:00+03:00",
        endTime: "2026-05-29T15:35:00+03:00",
      },
      {
        templateId: "friday-family-lunch-session",
        title: "غداء وجلسة مع العائلة",
        startTime: "2026-05-29T15:35:00+03:00",
        endTime: "2026-05-29T17:38:00+03:00",
      },
      {
        templateId: "last-hour",
        title: "آخر ساعة",
        startTime: "2026-05-29T17:38:00+03:00",
        endTime: "2026-05-29T18:38:00+03:00",
      },
    ])
  })

  it("uses the Saturday lunch exception and moves tasks into the Asr family slot", () => {
    const preview = buildWeekPreview({
      startDate: "2026-05-30",
      days: 1,
      templates: seedTaskTemplates,
    })
    const saturday = preview[0]!
    const blockById = new Map(
      saturday.blocks.map((block) => [block.timeBlockId, block])
    )

    expect(
      blockById.get("dhuhr_to_asr")!.occurrences.map((occurrence) => ({
        templateId: occurrence.templateId,
        title: occurrence.title,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
      }))
    ).toEqual([
      {
        templateId: "dhuhr",
        title: "صلاة الظهر",
        startTime: "2026-05-30T11:54:00+03:00",
        endTime: "2026-05-30T12:14:00+03:00",
      },
      {
        templateId: "family-lunch",
        title: "غداء مع العائلة",
        startTime: "2026-05-30T12:14:00+03:00",
        endTime: "2026-05-30T12:44:00+03:00",
      },
    ])

    expect(
      blockById.get("asr_to_maghrib")!.occurrences.map((occurrence) => ({
        templateId: occurrence.templateId,
        title: occurrence.title,
        startTime: occurrence.startTime,
        endTime: occurrence.endTime,
      }))
    ).toEqual([
      {
        templateId: "asr",
        title: "صلاة العصر",
        startTime: "2026-05-30T15:15:00+03:00",
        endTime: "2026-05-30T15:35:00+03:00",
      },
      {
        templateId: "saturday-asr-family",
        title: "العائلة",
        startTime: "2026-05-30T15:35:00+03:00",
        endTime: "2026-05-30T16:35:00+03:00",
      },
    ])
  })

  it("removes Arabic and generic task placeholders from Sunday and Saturday", () => {
    const preview = buildWeekPreview({
      startDate: "2026-05-24",
      days: 7,
      templates: seedTaskTemplates,
    })

    const titlesByDate = new Map(
      preview.map((day) => [
        day.date,
        day.blocks.flatMap((block) =>
          block.occurrences.map((occurrence) => occurrence.title)
        ),
      ])
    )

    for (const date of ["2026-05-24", "2026-05-30"]) {
      expect(titlesByDate.get(date)).not.toContain("عربي")
      expect(titlesByDate.get(date)).not.toContain("مهام")
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
    ])
    expect(titlesByBlock.get("dhuhr_to_asr")).toEqual([
      "صلاة الظهر",
      "غداء مع العائلة",
    ])
    expect(titlesByBlock.get("asr_to_maghrib")).toEqual([
      "صلاة العصر",
      "الأسرة",
    ])
    expect(titlesByBlock.get("maghrib_to_isha")).toEqual([
      "صلاة المغرب",
    ])
    expect(titlesByBlock.get("isha_to_sleep")).toEqual([
      "صلاة العشاء",
      "عشاء مع العائلة",
      "نوم",
    ])
  })
})
