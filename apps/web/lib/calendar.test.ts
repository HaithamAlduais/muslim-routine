import { describe, expect, it } from "vitest"

import { buildCalendarBlockEvents } from "./calendar"
import { buildWeekPreview } from "./preview"
import type { PackedDay } from "./types"

const packedDay: PackedDay = {
  date: "2026-05-24",
  blocks: [
    {
      timeBlockId: "fajr_to_sunrise",
      nameAr: "الفجر إلى الشروق",
      sortOrder: 20,
      startTime: "2026-05-24T04:12:00+03:00",
      endTime: "2026-05-24T05:37:00+03:00",
      occurrences: [
        {
          id: "fajr",
          templateId: "fajr",
          title: "صلاة الفجر",
          date: "2026-05-24",
          timeBlockId: "fajr_to_sunrise",
          durationMinutes: 20,
          status: "planned",
          checklist: ["ترديد الأذان", "أذكار الصباح"],
          notes: "",
          priority: "high",
          color: "emerald",
          isModified: false,
          syncStatus: "not_synced",
          sortOrder: 10,
          includeInCalendar: true,
          startTime: "2026-05-24T04:12:00+03:00",
          endTime: "2026-05-24T04:32:00+03:00",
        },
        {
          id: "quran",
          templateId: "quran",
          title: "قرآن",
          date: "2026-05-24",
          timeBlockId: "fajr_to_sunrise",
          durationMinutes: 25,
          status: "planned",
          checklist: [],
          notes: "ورد الصباح",
          priority: "medium",
          color: "sky",
          isModified: false,
          syncStatus: "not_synced",
          sortOrder: 20,
          includeInCalendar: true,
          startTime: "2026-05-24T04:32:00+03:00",
          endTime: "2026-05-24T04:57:00+03:00",
        },
      ],
    },
  ],
  conflicts: [],
}

describe("buildCalendarBlockEvents", () => {
  it("creates one Google Calendar event per occupied prayer block", async () => {
    const events = await buildCalendarBlockEvents([packedDay])

    expect(events).toHaveLength(1)
    expect(events[0]!).toMatchObject({
      localId: "2026-05-24:fajr_to_sunrise",
      summary: "الفجر إلى الشروق",
      start: "2026-05-24T04:12:00+03:00",
      end: "2026-05-24T05:37:00+03:00",
    })
    expect(events[0]!.description).toContain("صلاة الفجر")
    expect(events[0]!.description).toContain("قرآن")
  })

  it("produces stable payload hashes for duplicate-protection", async () => {
    const first = await buildCalendarBlockEvents([packedDay])
    const second = await buildCalendarBlockEvents([packedDay])

    expect(first[0]!.payloadHash).toBe(second[0]!.payloadHash)
  })

  it("changes the payload hash when the block payload changes", async () => {
    const changed: PackedDay = {
      ...packedDay,
      blocks: [
        {
          ...packedDay.blocks[0]!,
          occurrences: [
            {
              ...packedDay.blocks[0]!.occurrences[0]!,
              title: "صلاة الفجر في المسجد",
            },
          ],
        },
      ],
    }

    const first = await buildCalendarBlockEvents([packedDay])
    const second = await buildCalendarBlockEvents([changed])

    expect(first[0]!.payloadHash).not.toBe(second[0]!.payloadHash)
  })

  it("includes Notion page checklist contents in Google Calendar descriptions", () => {
    const preview = buildWeekPreview({
      startDate: "2026-05-24",
      days: 7,
    })
    const descriptions = buildCalendarBlockEvents(preview)
      .map((event) => event.description)
      .join("\n")

    expect(descriptions).toContain("قبل الصلاة: ½حزب سنة")
    expect(descriptions).toContain("بعد الصلاة: لا إله إلا الله 100 مرة")
    expect(descriptions).toContain("قراءة / كتابة")
    expect(descriptions).toContain("½حزب ضحى")
    expect(descriptions).toContain("سورة الكهف")
    expect(descriptions).toContain("صدقة/صلاة ميت")
    expect(descriptions).toContain("تمر ولبن وبروتين")
    expect(descriptions).toContain("سبحان الله وبحمده 100 مرة")
  })
})
