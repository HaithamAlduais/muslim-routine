export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type PrayerName =
  | "Fajr"
  | "Sunrise"
  | "Dhuhr"
  | "Asr"
  | "Maghrib"
  | "Isha"

export type RepeatType =
  | "none"
  | "daily"
  | "selected_days"
  | "weekly"
  | "monthly"
  | "custom"

export type TaskStatus =
  | "planned"
  | "in_progress"
  | "done"
  | "skipped"
  | "moved"
  | "cancelled"

export type Priority = "high" | "medium" | "low"

export type SyncStatus = "not_synced" | "synced" | "needs_update" | "conflict"

export type TimeBlock = {
  id: string
  nameAr: string
  sortOrder: number
  color: string
  startSource: PrayerName | "fixed" | "custom"
  endSource: PrayerName | "fixed" | "custom"
  fixedStart?: string
  fixedEnd?: string
}

export type TaskTemplate = {
  id: string
  title: string
  categoryId: string
  defaultTimeBlockId: string
  defaultDurationMinutes: number
  defaultPriority: Priority
  repeatType: RepeatType
  repeatDays: Weekday[]
  repeatInterval: number
  startDate: string
  endDate?: string | null
  notes: string
  checklist: string[]
  color: string
  isActive: boolean
  includeInCalendar: boolean
  sortOrder: number
}

export type TaskOccurrence = {
  id: string
  templateId: string | null
  title: string
  date: string
  timeBlockId: string
  durationMinutes: number
  status: TaskStatus
  checklist: string[]
  notes: string
  priority: Priority
  color: string
  isModified: boolean
  syncStatus: SyncStatus
  sortOrder: number
  includeInCalendar: boolean
  startTime?: string
  endTime?: string
}

export type PrayerDay = {
  date: string
  timezone: string
  timings: Record<PrayerName, string>
}

export type ScheduleConflict = {
  type: "duration_exceeds_block" | "overlap" | "missing_prayer_time"
  date: string
  timeBlockId: string
  occurrenceId?: string
  message: string
}

export type PackedBlock = {
  timeBlockId: string
  nameAr: string
  sortOrder: number
  startTime: string
  endTime: string
  occurrences: TaskOccurrence[]
}

export type PackedDay = {
  date: string
  blocks: PackedBlock[]
  conflicts: ScheduleConflict[]
}

export type CalendarBlockEvent = {
  localId: string
  summary: string
  description: string
  start: string
  end: string
  payloadHash: string
  timeBlockId: string
  date: string
}

export type Category = {
  id: string
  nameAr: string
  icon: string
  color: string
  defaultDurationMinutes: number
  defaultPriority: Priority
}

export type CalendarExportRecord = {
  localId: string
  calendarEventId: string
  payloadHash: string
}
