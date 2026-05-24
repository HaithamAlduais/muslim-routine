import { z } from "zod"

import {
  defaultPrayerApiSettings,
  type PrayerApiSettings,
} from "./prayer-times"
import type {
  Priority,
  RepeatType,
  ScheduleMode,
  TaskTemplate,
  TimeBlock,
} from "./types"

export const MAX_PREVIEW_DAYS = 14

export type PreviewWindow = {
  startDate: string
  days: number
}

export type FillWeekRequest = PreviewWindow & {
  templates?: TaskTemplate[]
  timeBlocks?: TimeBlock[]
  settings?: PrayerApiSettings
}

const weekdaySchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
])
const prioritySchema: z.ZodType<Priority> = z.enum(["high", "medium", "low"])
const repeatTypeSchema: z.ZodType<RepeatType> = z.enum([
  "none",
  "daily",
  "selected_days",
  "weekly",
  "monthly",
  "custom",
])
const scheduleModeSchema: z.ZodType<ScheduleMode> = z.enum([
  "fixed_duration",
  "fill_until_next_anchor",
  "anchor_to_block_end",
])
const timeBlockSourceSchema = z.enum([
  "Fajr",
  "Sunrise",
  "Dhuhr",
  "Asr",
  "Maghrib",
  "Isha",
  "fixed",
  "custom",
  "last_sixth",
])
const timeBlockSchema: z.ZodType<TimeBlock> = z
  .object({
    id: z.string().min(1).max(160),
    nameAr: z.string().min(1).max(160),
    sortOrder: z.number().int(),
    color: z.string().min(1).max(80),
    startSource: timeBlockSourceSchema,
    endSource: timeBlockSourceSchema,
    fixedStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
    fixedEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  })
  .strict()
const taskTemplateSchema: z.ZodType<TaskTemplate> = z
  .object({
    id: z.string().min(1).max(160),
    title: z.string().min(1).max(160),
    categoryId: z.string().min(1).max(120),
    defaultTimeBlockId: z.string().min(1).max(120),
    defaultDurationMinutes: z.number().int().min(0).max(1440),
    defaultPriority: prioritySchema,
    repeatType: repeatTypeSchema,
    repeatDays: z.array(weekdaySchema).max(7),
    repeatInterval: z.number().int().min(1).max(365),
    startDate: z.string().refine(isValidCalendarDate),
    endDate: z.string().refine(isValidCalendarDate).nullable().optional(),
    notes: z.string().max(4000),
    checklist: z.array(z.string().max(300)).max(50),
    color: z.string().min(1).max(80),
    isActive: z.boolean(),
    includeInCalendar: z.boolean(),
    sortOrder: z.number().int(),
    scheduleMode: scheduleModeSchema.optional(),
  })
  .strict()

export function parsePreviewSearchParams(
  searchParams: URLSearchParams
): PreviewWindow {
  return {
    startDate: parseStartDate(searchParams.get("startDate") ?? undefined),
    days: parseDays(searchParams.get("days") ?? undefined),
  }
}

export function parsePrayerSettingsSearchParams(
  searchParams: URLSearchParams
): PrayerApiSettings {
  return parsePrayerApiSettings({
    latitude: searchParams.get("latitude") ?? undefined,
    longitude: searchParams.get("longitude") ?? undefined,
    method: searchParams.get("method") ?? undefined,
    school: searchParams.get("school") ?? undefined,
    timezone: searchParams.get("timezone") ?? undefined,
  })
}

export function parseFillWeekRequestBody(body: unknown): FillWeekRequest {
  if (!isPlainObject(body)) {
    throwInvalid("body must be a JSON object")
  }

  const templatesValue = body.templates
  const timeBlocksValue = body.timeBlocks
  let templates: TaskTemplate[] | undefined
  let timeBlocks: TimeBlock[] | undefined

  if (templatesValue !== undefined) {
    const result = z.array(taskTemplateSchema).max(100).safeParse(templatesValue)

    if (!result.success) {
      throwInvalid(summarizeZodError(result.error))
    }

    templates = result.data
  }

  if (timeBlocksValue !== undefined) {
    const result = z.array(timeBlockSchema).max(40).safeParse(timeBlocksValue)

    if (!result.success) {
      throwInvalid(summarizeZodError(result.error))
    }

    timeBlocks = result.data
  }

  return {
    startDate: parseStartDate(body.startDate),
    days: parseDays(body.days),
    settings:
      body.settings === undefined
        ? undefined
        : parsePrayerApiSettings(body.settings),
    timeBlocks,
    templates,
  }
}

export function validationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Invalid request."
}

function parseStartDate(value: unknown) {
  if (value === undefined) {
    return todayInRiyadh()
  }

  if (typeof value !== "string" || !isValidCalendarDate(value)) {
    throwInvalid("startDate must be a valid YYYY-MM-DD calendar date")
  }

  return value
}

function parseDays(value: unknown) {
  if (value === undefined) {
    return 7
  }

  const days =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : Number.NaN

  if (!Number.isInteger(days) || days < 1 || days > MAX_PREVIEW_DAYS) {
    throwInvalid(`days must be between 1 and ${MAX_PREVIEW_DAYS}`)
  }

  return days
}

function parsePrayerApiSettings(value: unknown): PrayerApiSettings {
  if (!isPlainObject(value)) {
    throwInvalid("settings must be a JSON object")
  }

  return {
    latitude: parseBoundedNumber(
      "latitude",
      value.latitude,
      defaultPrayerApiSettings.latitude,
      -90,
      90
    ),
    longitude: parseBoundedNumber(
      "longitude",
      value.longitude,
      defaultPrayerApiSettings.longitude,
      -180,
      180
    ),
    method: parseBoundedInteger(
      "method",
      value.method,
      defaultPrayerApiSettings.method,
      0,
      99
    ),
    school: parseSchool(value.school),
    timezone: parseTimezone(value.timezone),
  }
}

function parseBoundedNumber(
  name: string,
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  if (value === undefined) {
    return fallback
  }

  const number =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : Number.NaN

  if (!Number.isFinite(number)) {
    throwInvalid(`${name} must be a number`)
  }

  if (number < min || number > max) {
    throwInvalid(`${name} must be between ${min} and ${max}`)
  }

  return number
}

function parseBoundedInteger(
  name: string,
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  const number = parseBoundedNumber(name, value, fallback, min, max)

  if (!Number.isInteger(number)) {
    throwInvalid(`${name} must be an integer`)
  }

  return number
}

function parseSchool(value: unknown): 0 | 1 {
  if (value === undefined) {
    return defaultPrayerApiSettings.school
  }

  const school =
    typeof value === "number" || typeof value === "string"
      ? Number(value)
      : Number.NaN

  if (school !== 0 && school !== 1) {
    throwInvalid("school must be 0 or 1")
  }

  return school
}

function parseTimezone(value: unknown) {
  if (value === undefined) {
    return defaultPrayerApiSettings.timezone
  }

  if (typeof value !== "string") {
    throwInvalid("timezone must be a valid IANA timezone")
  }

  const timezone = value.trim()

  if (timezone.length === 0 || timezone.length > 80) {
    throwInvalid("timezone must be a valid IANA timezone")
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date())
  } catch {
    throwInvalid("timezone must be a valid IANA timezone")
  }

  return timezone
}

function isValidCalendarDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function summarizeZodError(error: z.ZodError) {
  return error.issues
    .slice(0, 3)
    .map((issue) => issue.message)
    .join("; ")
}

function throwInvalid(message: string): never {
  throw new Error(`Invalid request: ${message}.`)
}

function todayInRiyadh() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}
