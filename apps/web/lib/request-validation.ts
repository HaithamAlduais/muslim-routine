import { z } from "zod"

import type { Priority, RepeatType, ScheduleMode, TaskTemplate } from "./types"

export const MAX_PREVIEW_DAYS = 14

export type PreviewWindow = {
  startDate: string
  days: number
}

export type FillWeekRequest = PreviewWindow & {
  templates?: TaskTemplate[]
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

export function parseFillWeekRequestBody(body: unknown): FillWeekRequest {
  if (!isPlainObject(body)) {
    throwInvalid("body must be a JSON object")
  }

  const templatesValue = body.templates
  let templates: TaskTemplate[] | undefined

  if (templatesValue !== undefined) {
    const result = z.array(taskTemplateSchema).max(100).safeParse(templatesValue)

    if (!result.success) {
      throwInvalid(summarizeZodError(result.error))
    }

    templates = result.data
  }

  return {
    startDate: parseStartDate(body.startDate),
    days: parseDays(body.days),
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
