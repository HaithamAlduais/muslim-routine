import { addDays } from "./date-utils"
import type { PrayerDay, PrayerName } from "./types"

const ALADHAN_API_BASE_URL = "https://api.aladhan.com/v1"
const PRAYER_NAMES: PrayerName[] = [
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
]

export type PrayerApiSettings = {
  latitude: number
  longitude: number
  method: number
  school: 0 | 1
  timezone: string
}

type FetchPrayerDaysInput = {
  startDate: string
  days: number
  settings?: PrayerApiSettings
  fetcher?: PrayerTimesFetch
}

type PrayerTimesFetch = (input: URL) => Promise<Response>

type AladhanTimingResponse = {
  code: number
  status: string
  data?: {
    timings?: Partial<Record<PrayerName, string>>
    meta?: {
      timezone?: string
    }
  }
}

export const defaultPrayerApiSettings: PrayerApiSettings = {
  latitude: 24.7136,
  longitude: 46.6753,
  method: 4,
  school: 0,
  timezone: "Asia/Riyadh",
}

export function buildPrayerTimesApiUrl(
  date: string,
  settings: PrayerApiSettings = defaultPrayerApiSettings
) {
  const [year, month, day] = date.split("-")
  const url = new URL(
    `${ALADHAN_API_BASE_URL}/timings/${day}-${month}-${year}`
  )

  url.searchParams.set("latitude", settings.latitude.toString())
  url.searchParams.set("longitude", settings.longitude.toString())
  url.searchParams.set("method", settings.method.toString())
  url.searchParams.set("school", settings.school.toString())

  return url
}

export async function fetchPrayerDaysForPreview({
  startDate,
  days,
  settings = defaultPrayerApiSettings,
  fetcher = fetch,
}: FetchPrayerDaysInput): Promise<PrayerDay[]> {
  const firstDate = addDays(startDate, -1)
  const dates = Array.from({ length: days + 2 }, (_, index) =>
    addDays(firstDate, index)
  )

  return Promise.all(
    dates.map((date) => fetchPrayerDay({ date, fetcher, settings }))
  )
}

export function parsePrayerTime(value: string) {
  const match = value.match(/\d{1,2}:\d{2}/)

  if (!match) {
    throw new Error(`Unsupported prayer time: ${value}`)
  }

  const [hour, minute] = match[0]!.split(":")

  return `${hour!.padStart(2, "0")}:${minute}`
}

async function fetchPrayerDay({
  date,
  fetcher,
  settings,
}: {
  date: string
  fetcher: PrayerTimesFetch
  settings: PrayerApiSettings
}): Promise<PrayerDay> {
  const response = await fetcher(buildPrayerTimesApiUrl(date, settings))

  if (!response.ok) {
    throw new Error(`Prayer API failed for ${date}`)
  }

  const payload = (await response.json()) as AladhanTimingResponse

  if (payload.code !== 200 || !payload.data?.timings) {
    throw new Error(`Prayer API returned invalid timings for ${date}`)
  }

  return {
    date,
    timezone: payload.data.meta?.timezone ?? settings.timezone,
    timings: Object.fromEntries(
      PRAYER_NAMES.map((name) => {
        const value = payload.data?.timings?.[name]

        if (!value) {
          throw new Error(`Prayer API omitted ${name} for ${date}`)
        }

        return [name, parsePrayerTime(value)]
      })
    ) as PrayerDay["timings"],
  }
}
