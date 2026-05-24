import { describe, expect, it } from "vitest"

import { durationLabel } from "./template-labels"

describe("durationLabel", () => {
  it("labels anchored 60-minute templates as the last hour", () => {
    expect(
      durationLabel({
        defaultDurationMinutes: 60,
        scheduleMode: "anchor_to_block_end",
      })
    ).toBe("آخر ساعة")
  })

  it("keeps non-hour anchored templates explicit", () => {
    expect(
      durationLabel({
        defaultDurationMinutes: 30,
        scheduleMode: "anchor_to_block_end",
      })
    ).toBe("آخر 30 دقيقة")
  })
})
