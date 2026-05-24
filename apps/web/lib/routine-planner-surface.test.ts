import { describe, expect, it } from "vitest"

import {
  floatingPlannerActions,
  routinePlannerTabs,
  userFacingSettingsCopy,
} from "./routine-planner-surface"

describe("routine planner surface", () => {
  it("keeps calendar and settings as floating actions instead of separate tabs", () => {
    expect(routinePlannerTabs.map((tab) => tab.value)).toEqual([
      "preview",
      "routine",
    ])
    expect(floatingPlannerActions.map((action) => action.value)).toEqual([
      "calendar",
      "settings",
    ])
  })

  it("does not expose technical setup copy in the user-facing settings panel", () => {
    const settingsCopy = Object.values(userFacingSettingsCopy).join(" ")

    expect(settingsCopy).not.toContain("GOOGLE_")
    expect(settingsCopy).not.toContain("SUPABASE")
    expect(settingsCopy).not.toContain("Service Account")
    expect(settingsCopy).not.toContain("متغيرات البيئة")
  })
})
