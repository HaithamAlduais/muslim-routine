import type { CalendarBlockEvent, CalendarExportRecord } from "./types"

type SyncedExportRecord = CalendarExportRecord & {
  action: "created" | "updated" | "skipped"
}

type SyncCalendarBlockEventsInput = {
  events: CalendarBlockEvent[]
  existingExports: CalendarExportRecord[]
  createEvent: (event: CalendarBlockEvent) => Promise<string>
  updateEvent: (
    calendarEventId: string,
    event: CalendarBlockEvent
  ) => Promise<void>
}

export async function syncCalendarBlockEvents({
  events,
  existingExports,
  createEvent,
  updateEvent,
}: SyncCalendarBlockEventsInput): Promise<{ records: SyncedExportRecord[] }> {
  const existing = new Map(
    existingExports.map((record) => [record.localId, record])
  )
  const records: SyncedExportRecord[] = []

  for (const event of events) {
    const record = existing.get(event.localId)

    if (!record) {
      const calendarEventId = await createEvent(event)
      records.push({
        localId: event.localId,
        calendarEventId,
        payloadHash: event.payloadHash,
        action: "created",
      })
      continue
    }

    if (record.payloadHash === event.payloadHash) {
      records.push({ ...record, action: "skipped" })
      continue
    }

    await updateEvent(record.calendarEventId, event)
    records.push({
      localId: event.localId,
      calendarEventId: record.calendarEventId,
      payloadHash: event.payloadHash,
      action: "updated",
    })
  }

  return { records }
}
