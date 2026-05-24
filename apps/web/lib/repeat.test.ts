import { describe, expect, it } from "vitest"

import { generateOccurrences } from "./repeat"
import type { TaskTemplate, TimeBlock } from "./types"

const fajrBlock: TimeBlock = {
  id: "fajr_to_sunrise",
  nameAr: "الفجر إلى الشروق",
  sortOrder: 20,
  color: "emerald",
  startSource: "Fajr",
  endSource: "Sunrise",
}

describe("generateOccurrences", () => {
  it("generates selected-day suhoor only on Monday and Thursday", () => {
    const template: TaskTemplate = {
      id: "suhoor",
      title: "سحور",
      categoryId: "worship",
      defaultTimeBlockId: "fajr_to_sunrise",
      defaultDurationMinutes: 30,
      defaultPriority: "high",
      repeatType: "selected_days",
      repeatDays: [1, 4],
      repeatInterval: 1,
      startDate: "2026-05-24",
      notes: "",
      checklist: [],
      color: "emerald",
      isActive: true,
      includeInCalendar: true,
      sortOrder: 10,
    }

    const occurrences = generateOccurrences({
      templates: [template],
      timeBlocks: [fajrBlock],
      startDate: "2026-05-24",
      days: 7,
    })

    expect(occurrences.map((occurrence) => occurrence.date)).toEqual([
      "2026-05-25",
      "2026-05-28",
    ])
  })

  it("generates daily prayers for every day in the preview window", () => {
    const template: TaskTemplate = {
      id: "fajr-prayer",
      title: "صلاة الفجر",
      categoryId: "prayer",
      defaultTimeBlockId: "fajr_to_sunrise",
      defaultDurationMinutes: 20,
      defaultPriority: "high",
      repeatType: "daily",
      repeatDays: [],
      repeatInterval: 1,
      startDate: "2026-05-24",
      notes: "أذكار الصلاة",
      checklist: ["ترديد الأذان", "أذكار الصباح"],
      color: "emerald",
      isActive: true,
      includeInCalendar: true,
      sortOrder: 1,
    }

    const occurrences = generateOccurrences({
      templates: [template],
      timeBlocks: [fajrBlock],
      startDate: "2026-05-24",
      days: 7,
    })

    expect(occurrences).toHaveLength(7)
    expect(occurrences[0]).toMatchObject({
      title: "صلاة الفجر",
      date: "2026-05-24",
      timeBlockId: "fajr_to_sunrise",
      status: "planned",
      sortOrder: 1,
    })
  })

  it("does not generate inactive templates", () => {
    const template: TaskTemplate = {
      id: "inactive",
      title: "روتين متوقف",
      categoryId: "study",
      defaultTimeBlockId: "fajr_to_sunrise",
      defaultDurationMinutes: 45,
      defaultPriority: "medium",
      repeatType: "daily",
      repeatDays: [],
      repeatInterval: 1,
      startDate: "2026-05-24",
      notes: "",
      checklist: [],
      color: "slate",
      isActive: false,
      includeInCalendar: true,
      sortOrder: 1,
    }

    expect(
      generateOccurrences({
        templates: [template],
        timeBlocks: [fajrBlock],
        startDate: "2026-05-24",
        days: 7,
      })
    ).toEqual([])
  })
})
