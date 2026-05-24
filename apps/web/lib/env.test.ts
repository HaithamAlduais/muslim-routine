import { describe, expect, it } from "vitest"

import { getRuntimeConfigStatus } from "./env"

describe("runtime environment status", () => {
  it("reports configured integrations by presence only", () => {
    expect(
      getRuntimeConfigStatus({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "publishable",
        SUPABASE_SERVICE_ROLE_KEY: "service-role",
        GOOGLE_CALENDAR_ID: "calendar-id",
        GOOGLE_SERVICE_ACCOUNT_JSON: '{"type":"service_account"}',
      })
    ).toEqual({
      supabase: "configured",
      supabaseServiceRole: "configured",
      googleCalendar: "configured",
    })
  })

  it("does not echo configured secret values", () => {
    const status = getRuntimeConfigStatus({
      GOOGLE_CALENDAR_ID: "secret-calendar",
      GOOGLE_SERVICE_ACCOUNT_FILE: "C:/secret/service-account.json",
    })

    expect(JSON.stringify(status)).not.toContain("secret-calendar")
    expect(JSON.stringify(status)).not.toContain("service-account.json")
  })
})
