import { describe, expect, it } from "vitest"

import {
  MAX_PREVIEW_DAYS,
  parseFillWeekRequestBody,
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
      templates: [exampleTaskTemplates[0]],
    })

    expect(parsed.startDate).toBe("2026-05-24")
    expect(parsed.days).toBe(1)
    expect(parsed.templates).toHaveLength(1)
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
