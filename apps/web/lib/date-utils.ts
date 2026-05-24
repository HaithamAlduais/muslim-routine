import type { PrayerDay, Weekday } from "./types"

const RIYADH_OFFSET = "+03:00"

export function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00.000Z`)
  next.setUTCDate(next.getUTCDate() + days)
  return toDateString(next)
}

export function toDateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function weekday(date: string) {
  return new Date(`${date}T00:00:00.000Z`).getUTCDay() as Weekday
}

export function compareDate(a: string, b: string) {
  return a.localeCompare(b)
}

export function prayerDateTime(prayers: PrayerDay, time: string) {
  const offset =
    prayers.timezone === "Asia/Riyadh" ? RIYADH_OFFSET : RIYADH_OFFSET
  return `${prayers.date}T${time}:00${offset}`
}

export function addMinutes(isoWithOffset: string, minutes: number) {
  const match = isoWithOffset.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):00([+-]\d{2}:\d{2})$/
  )

  if (!match) {
    throw new Error(`Unsupported datetime format: ${isoWithOffset}`)
  }

  const date = match[1]!
  const hour = match[2]!
  const minute = match[3]!
  const offset = match[4]!
  const total = Number(hour) * 60 + Number(minute) + minutes
  const dayOffset = Math.floor(total / 1440)
  const normalized = ((total % 1440) + 1440) % 1440
  const nextDate = addDays(date, dayOffset)
  const nextHour = String(Math.floor(normalized / 60)).padStart(2, "0")
  const nextMinute = String(normalized % 60).padStart(2, "0")

  return `${nextDate}T${nextHour}:${nextMinute}:00${offset}`
}

export function minutesBetween(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return Math.round((endDate.getTime() - startDate.getTime()) / 60000)
}
