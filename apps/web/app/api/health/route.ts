import { NextResponse } from "next/server"

import { getRuntimeConfigStatus } from "@/lib/env"

export function GET() {
  return NextResponse.json(
    {
      status: "ok",
      runtime: "nextjs",
      prayerApi: "aladhan",
      checks: getRuntimeConfigStatus(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  )
}
