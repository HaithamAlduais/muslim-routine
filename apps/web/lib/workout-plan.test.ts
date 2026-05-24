import { describe, expect, it } from "vitest"

import {
  workoutHrefForTemplate,
  workoutPlan,
  workoutScheduleTemplates,
} from "./workout-plan"

describe("workout plan", () => {
  it("maps the overload tracker to Sunday day 1 and Tuesday day 2", () => {
    expect(workoutScheduleTemplates).toEqual([
      {
        day: 0,
        planDay: "Day 1",
        templateId: "overload-day-1",
        title: "Overload Tracker - Day 1",
      },
      {
        day: 2,
        planDay: "Day 2",
        templateId: "overload-day-2",
        title: "Overload Tracker - Day 2",
      },
    ])
  })

  it("keeps the attached progressive overload supersets available in app data", () => {
    expect(workoutPlan["Day 1"]).toHaveLength(4)
    expect(workoutPlan["Day 2"]).toHaveLength(5)
    expect(
      workoutPlan["Day 1"][0]?.exercises.map((exercise) => exercise.name)
    ).toEqual(["Squats", "Pull-ups / Rack Chins"])
    expect(workoutPlan["Day 2"][4]?.exercises[0]?.name).toBe(
      "Hip Abductor & Adductor"
    )
  })

  it("links routine templates to the tracker day", () => {
    expect(workoutHrefForTemplate("overload-day-1")).toBe(
      "/workout?day=Day%201"
    )
    expect(workoutHrefForTemplate("overload-day-2")).toBe(
      "/workout?day=Day%202"
    )
    expect(workoutHrefForTemplate("fajr")).toBeNull()
  })
})
