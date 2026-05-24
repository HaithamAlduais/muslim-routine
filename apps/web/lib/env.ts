type ConfigState = "configured" | "missing"

export type RuntimeConfigStatus = {
  supabase: ConfigState
  supabaseServiceRole: ConfigState
  googleCalendar: ConfigState
}

export function getRuntimeConfigStatus(
  env: Record<string, string | undefined> = process.env
): RuntimeConfigStatus {
  return {
    supabase:
      env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
        ? "configured"
        : "missing",
    supabaseServiceRole: env.SUPABASE_SERVICE_ROLE_KEY
      ? "configured"
      : "missing",
    googleCalendar:
      env.GOOGLE_CALENDAR_ID &&
      (env.GOOGLE_SERVICE_ACCOUNT_FILE || env.GOOGLE_SERVICE_ACCOUNT_JSON)
        ? "configured"
        : "missing",
  }
}
