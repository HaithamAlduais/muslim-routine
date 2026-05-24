import { NextResponse } from "next/server"

import { fetchPrayerDaysForPreview } from "@/lib/prayer-times"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const startDate = url.searchParams.get("startDate") ?? todayInRiyadh()
  const days = Number(url.searchParams.get("days") ?? 7)

  try {
    const prayerDays = await fetchPrayerDaysForPreview({
      startDate,
      days: Number.isFinite(days) ? days : 7,
    })

    return NextResponse.json({
      source: "aladhan",
      prayerDays,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Unable to fetch prayer times.",
      },
      { status: 502 }
    )
  }
}

function todayInRiyadh() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}
