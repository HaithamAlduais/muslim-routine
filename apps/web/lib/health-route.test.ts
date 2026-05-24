import { describe, expect, it } from "vitest"

import { GET } from "../app/api/health/route"

describe("health route", () => {
  it("returns production readiness checks without secret values", async () => {
    const response = await GET()
    const body = (await response.json()) as {
      status: string
      checks: Record<string, string>
    }

    expect(response.status).toBe(200)
    expect(body.status).toBe("ok")
    expect(body.checks).toHaveProperty("supabase")
    expect(body.checks).toHaveProperty("googleCalendar")
    expect(JSON.stringify(body)).not.toContain("SERVICE_ROLE")
  })
})
