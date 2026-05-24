import { readFile } from "node:fs/promises"

import { google } from "googleapis"

import type { CalendarBlockEvent } from "./types"

type ServiceAccountCredentials = {
  client_email: string
  private_key: string
}

export function toGoogleCalendarEventResource(event: CalendarBlockEvent) {
  return {
    summary: event.summary,
    description: event.description,
    colorId: event.googleCalendarColorId,
    start: { dateTime: event.start },
    end: { dateTime: event.end },
    extendedProperties: {
      private: {
        localId: event.localId,
        payloadHash: event.payloadHash,
        app: "muslim-routine",
      },
    },
  }
}

export async function createServiceAccountCalendarClient() {
  const credentials = await readServiceAccountCredentials()

  if (!credentials) {
    return null
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ["https://www.googleapis.com/auth/calendar.events"],
  })

  return google.calendar({ version: "v3", auth })
}

export async function readServiceAccountCredentials(): Promise<ServiceAccountCredentials | null> {
  const inlineJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  const filePath = process.env.GOOGLE_SERVICE_ACCOUNT_FILE

  if (inlineJson) {
    return JSON.parse(inlineJson) as ServiceAccountCredentials
  }

  if (filePath) {
    return JSON.parse(
      await readFile(filePath, "utf8")
    ) as ServiceAccountCredentials
  }

  return null
}
