import { describe, expect, it } from "vitest"

import {
  MAX_PREVIEW_DAYS,
  parseFillWeekRequestBody,
  parsePrayerSettingsSearchParams,
  parsePreviewSearchParams,
} from "./request-validation"
import { exampleTaskTemplates } from "./routine-data"

describe("request validation", () => {
  it("parses preview query params with safe defaults", () => {
    expect(
      parsePreviewSearchParams(
        new URLSearchParams("startDate=2026-05-24&days=7")
      )
    ).toEqual({
      startDate: "2026-05-24",
      days: 7,
    })
  })

  it("rejects preview windows larger than the production limit", () => {
    expect(() =>
      parsePreviewSearchParams(
        new URLSearchParams(`startDate=2026-05-24&days=${MAX_PREVIEW_DAYS + 1}`)
      )
    ).toThrow(`between 1 and ${MAX_PREVIEW_DAYS}`)
  })

  it("rejects impossible calendar dates", () => {
    expect(() =>
      parsePreviewSearchParams(
        new URLSearchParams("startDate=2026-02-31&days=7")
      )
    ).toThrow("valid YYYY-MM-DD")
  })

  it("validates fill-week request bodies and task template payloads", () => {
    const parsed = parseFillWeekRequestBody({
      startDate: "2026-05-24",
      days: 1,
      settings: {
        latitude: 21.3891,
        longitude: 39.8579,
        method: 4,
        school: 1,
        timezone: "Asia/Riyadh",
      },
      timeBlocks: [
        {
          id: "custom_morning",
          nameAr: "صباح مخصص",
          sortOrder: 10,
          color: "violet",
          startSource: "Fajr",
          endSource: "fixed",
          fixedEnd: "07:30",
        },
      ],
      templates: [exampleTaskTemplates[0]],
    })

    expect(parsed.startDate).toBe("2026-05-24")
    expect(parsed.days).toBe(1)
    expect(parsed.settings).toEqual({
      latitude: 21.3891,
      longitude: 39.8579,
      method: 4,
      school: 1,
      timezone: "Asia/Riyadh",
    })
    expect(parsed.timeBlocks).toHaveLength(1)
    expect(parsed.timeBlocks?.[0]?.id).toBe("custom_morning")
    expect(parsed.templates).toHaveLength(1)
  })

  it("parses prayer settings from preview query params", () => {
    expect(
      parsePrayerSettingsSearchParams(
        new URLSearchParams(
          "latitude=51.5072&longitude=-0.1276&method=3&school=1&timezone=Europe/London"
        )
      )
    ).toEqual({
      latitude: 51.5072,
      longitude: -0.1276,
      method: 3,
      school: 1,
      timezone: "Europe/London",
    })
  })

  it("rejects invalid prayer settings", () => {
    expect(() =>
      parsePrayerSettingsSearchParams(
        new URLSearchParams("latitude=200&longitude=46.6753")
      )
    ).toThrow("latitude must be between -90 and 90")
  })

  it("rejects malformed fill-week template payloads", () => {
    expect(() =>
      parseFillWeekRequestBody({
        startDate: "2026-05-24",
        days: 1,
        templates: [{ title: "missing required fields" }],
      })
    ).toThrow("Invalid request")
  })
})
