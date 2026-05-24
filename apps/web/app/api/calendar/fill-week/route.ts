import { NextResponse } from "next/server"

import { buildCalendarBlockEvents } from "@/lib/calendar"
import { syncCalendarBlockEvents } from "@/lib/calendar-sync"
import {
  createServiceAccountCalendarClient,
  toGoogleCalendarEventResource,
} from "@/lib/google-calendar"
import { buildWeekPreview } from "@/lib/preview"
import type {
  CalendarBlockEvent,
  CalendarExportRecord,
  TaskTemplate,
} from "@/lib/types"

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    startDate?: string
    days?: number
    templates?: TaskTemplate[]
  }
  const startDate = body.startDate ?? new Date().toISOString().slice(0, 10)
  const days = body.days ?? 7
  const preview = buildWeekPreview({
    startDate,
    days,
    templates: body.templates,
  })
  const events = await buildCalendarBlockEvents(preview)
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  const calendar = await createServiceAccountCalendarClient()

  if (!calendar || !calendarId) {
    return NextResponse.json({
      configured: false,
      message:
        "Calendar credentials are not configured. Set GOOGLE_SERVICE_ACCOUNT_FILE or GOOGLE_SERVICE_ACCOUNT_JSON and GOOGLE_CALENDAR_ID.",
      events,
    })
  }

  const existingExports = await listExistingExports(
    calendar,
    calendarId,
    events
  )
  const result = await syncCalendarBlockEvents({
    events,
    existingExports,
    createEvent: async (event) => {
      const created = await calendar.events.insert({
        calendarId,
        requestBody: toGoogleCalendarEventResource(event),
      })

      if (!created.data.id) {
        throw new Error(
          `Google Calendar did not return an event id for ${event.localId}`
        )
      }

      return created.data.id
    },
    updateEvent: async (calendarEventId, event) => {
      await calendar.events.update({
        calendarId,
        eventId: calendarEventId,
        requestBody: toGoogleCalendarEventResource(event),
      })
    },
  })

  return NextResponse.json({
    configured: true,
    events,
    result,
  })
}

async function listExistingExports(
  calendar: Awaited<ReturnType<typeof createServiceAccountCalendarClient>>,
  calendarId: string,
  events: CalendarBlockEvent[]
): Promise<CalendarExportRecord[]> {
  if (!calendar) {
    return []
  }

  const records: CalendarExportRecord[] = []

  for (const event of events) {
    const response = await calendar.events.list({
      calendarId,
      privateExtendedProperty: [`localId=${event.localId}`],
      maxResults: 1,
      singleEvents: true,
    })
    const existing = response.data.items?.[0]

    if (existing?.id) {
      records.push({
        localId: event.localId,
        calendarEventId: existing.id,
        payloadHash:
          existing.extendedProperties?.private?.payloadHash ?? "unknown",
      })
    }
  }

  return records
}
