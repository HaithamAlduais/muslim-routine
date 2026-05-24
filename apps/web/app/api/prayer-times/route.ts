import { NextResponse } from "next/server"

import {
  fetchPrayerDaysForPreview,
  type PrayerApiSettings,
} from "@/lib/prayer-times"
import {
  parsePrayerSettingsSearchParams,
  parsePreviewSearchParams,
  validationErrorMessage,
} from "@/lib/request-validation"

export async function GET(request: Request) {
  const url = new URL(request.url)
  let previewWindow: ReturnType<typeof parsePreviewSearchParams>
  let settings: PrayerApiSettings

  try {
    previewWindow = parsePreviewSearchParams(url.searchParams)
    settings = parsePrayerSettingsSearchParams(url.searchParams)
  } catch (error) {
    return NextResponse.json(
      {
        message: validationErrorMessage(error),
      },
      { status: 400 }
    )
  }

  try {
    const prayerDays = await fetchPrayerDaysForPreview({
      startDate: previewWindow.startDate,
      days: previewWindow.days,
      settings,
    })

    return NextResponse.json(
      {
        source: "aladhan",
        prayerDays,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400",
        },
      }
    )
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
