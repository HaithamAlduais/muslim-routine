import { describe, expect, it } from "vitest"

import {
  applyTemplateEditorDraft,
  deleteTemplateById,
  migrateTemplateDuration,
  parseStoredTemplates,
  serializeTemplates,
  templateToEditorDraft,
  toggleEditorDraftDay,
} from "./template-editor"
import { seedCategories, seedTaskTemplates } from "./routine-data"
import type { Weekday } from "./types"

describe("template editor helpers", () => {
  it("updates all editable template fields and sanitizes checklist items", () => {
    const source = seedTaskTemplates.find((template) => template.id === "fajr")!
    const draft = {
      ...templateToEditorDraft(source),
      title: "صلاة الفجر المعدلة",
      categoryId: "worship",
      timeBlockId: "last_sixth_to_fajr",
      duration: 45,
      repeatType: "selected_days" as const,
      repeatDays: [5, 1, 1] as Weekday[],
      repeatInterval: 2,
      startDate: "2026-05-25",
      endDate: "2026-06-01",
      notes: "  ملاحظة جديدة  ",
      checklist: ["أذكار", " ", "دعاء"],
      includeInCalendar: false,
      isActive: false,
      sortOrder: 99,
      scheduleMode: "anchor_to_block_end" as const,
      defaultPriority: "medium" as const,
    }

    const updated = applyTemplateEditorDraft(source, draft, seedCategories)

    expect(updated).toMatchObject({
      id: source.id,
      title: "صلاة الفجر المعدلة",
      categoryId: "worship",
      defaultTimeBlockId: "last_sixth_to_fajr",
      defaultDurationMinutes: 45,
      defaultPriority: "medium",
      repeatType: "selected_days",
      repeatDays: [1, 5],
      repeatInterval: 2,
      startDate: "2026-05-25",
      endDate: "2026-06-01",
      notes: "ملاحظة جديدة",
      checklist: ["أذكار", "دعاء"],
      includeInCalendar: false,
      isActive: false,
      sortOrder: 99,
      scheduleMode: "anchor_to_block_end",
    })
    expect(updated.color).toBe("teal")
  })

  it("clears selected days and schedule mode when the draft does not need them", () => {
    const source = seedTaskTemplates.find((template) => template.id === "last-hour")!
    const updated = applyTemplateEditorDraft(
      source,
      {
        ...templateToEditorDraft(source),
        repeatType: "daily",
        repeatDays: [5],
        scheduleMode: "fixed_duration",
      },
      seedCategories
    )

    expect(updated.repeatDays).toEqual([])
    expect(updated.scheduleMode).toBeUndefined()
  })

  it("toggles selected weekdays in sorted order", () => {
    const draft = templateToEditorDraft(seedTaskTemplates[0]!)

    expect(toggleEditorDraftDay({ ...draft, repeatDays: [4] }, 1).repeatDays).toEqual([
      1,
      4,
    ])
    expect(toggleEditorDraftDay({ ...draft, repeatDays: [1, 4] }, 4).repeatDays).toEqual([
      1,
    ])
  })

  it("deletes a template by id", () => {
    expect(deleteTemplateById(seedTaskTemplates, "fajr")).not.toContainEqual(
      expect.objectContaining({ id: "fajr" })
    )
  })

  it("round-trips stored templates for client-side persistence", () => {
    expect(parseStoredTemplates(serializeTemplates(seedTaskTemplates))).toEqual(
      seedTaskTemplates
    )
  })

  it("ignores invalid stored template payloads", () => {
    expect(parseStoredTemplates("not json")).toBeNull()
    expect(parseStoredTemplates(JSON.stringify([{ title: "missing fields" }]))).toBeNull()
  })

  it("migrates a saved template duration without replacing other edits", () => {
    const templates = seedTaskTemplates.map((template) =>
      template.id === "prepare-istighfar"
        ? { ...template, title: "إعداد خاص", defaultDurationMinutes: 10 }
        : template
    )

    const migrated = migrateTemplateDuration(
      templates,
      "prepare-istighfar",
      15
    )
    const template = migrated.find((item) => item.id === "prepare-istighfar")

    expect(template?.title).toBe("إعداد خاص")
    expect(template?.defaultDurationMinutes).toBe(15)
  })
})
