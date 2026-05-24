"use client"

import * as React from "react"
import {
  CalendarCheckIcon,
  ClockIcon,
  ListChecksIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SaveIcon,
  SettingsIcon,
  Trash2Icon,
} from "lucide-react"

import { buildWeekPreview } from "@/lib/preview"
import { buildLiveWeekPreview } from "@/lib/live-preview"
import {
  applyTemplateEditorDraft,
  deleteTemplateById,
  migrateTemplateDuration,
  parseStoredTemplates,
  serializeTemplates,
  templateToEditorDraft,
  toggleEditorDraftDay,
  type TemplateEditorDraft,
  type TemplateEditorScheduleMode,
} from "@/lib/template-editor"
import {
  defaultTaskTemplates,
  exampleTaskTemplates,
  seedCategories,
  seedTimeBlocks,
} from "@/lib/routine-data"
import { durationLabel } from "@/lib/template-labels"
import type {
  PrayerDay,
  RepeatType,
  TaskTemplate,
  TimeBlock,
  Weekday,
} from "@/lib/types"
import { buildCalendarBlockEvents } from "@/lib/calendar"
import {
  defaultPrayerApiSettings,
  type PrayerApiSettings,
} from "@/lib/prayer-times"
import {
  createTimeBlockFromDraft,
  deleteTimeBlockById,
  parseStoredTimeBlocks,
  serializeTimeBlocks,
  timeBlockToEditorDraft,
  updateTimeBlockById,
  type TimeBlockEditorDraft,
} from "@/lib/time-block-editor"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Switch } from "@workspace/ui/components/switch"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@workspace/ui/components/field"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert"
import { Separator } from "@workspace/ui/components/separator"
import { ScrollArea } from "@workspace/ui/components/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog"

type RoutinePlannerProps = {
  initialStartDate: string
}

type ExportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; message: string; configured: boolean }
  | { status: "error"; message: string }

type PrayerTimesState =
  | { status: "loading" }
  | { status: "ready"; source: string }
  | { status: "error"; message: string }

type PrayerSettingsDraft = PrayerApiSettings & {
  country: string
  city: string
}

const weekdayOptions: Array<{ value: Weekday; label: string }> = [
  { value: 0, label: "الأحد" },
  { value: 1, label: "الإثنين" },
  { value: 2, label: "الثلاثاء" },
  { value: 3, label: "الأربعاء" },
  { value: 4, label: "الخميس" },
  { value: 5, label: "الجمعة" },
  { value: 6, label: "السبت" },
]

const repeatOptions: Array<{ value: RepeatType; label: string }> = [
  { value: "daily", label: "يومي" },
  { value: "selected_days", label: "أيام محددة" },
  { value: "weekly", label: "أسبوعي" },
  { value: "monthly", label: "شهري" },
  { value: "custom", label: "مخصص" },
  { value: "none", label: "مرة واحدة" },
]

const priorityOptions = [
  { value: "high", label: "عالي" },
  { value: "medium", label: "متوسط" },
  { value: "low", label: "منخفض" },
] as const

const scheduleModeOptions: Array<{
  value: TemplateEditorScheduleMode
  label: string
}> = [
  { value: "fixed_duration", label: "مدة ثابتة" },
  { value: "fill_until_next_anchor", label: "يمتد حتى المهمة التالية" },
  { value: "anchor_to_block_end", label: "مثبت في نهاية البلوك" },
]

const templateStorageKey = "muslim-routine.templates.v2"
const timeBlockStorageKey = "muslim-routine.time-blocks.v1"
const prayerSettingsStorageKey = "muslim-routine.prayer-settings.v1"

const defaultPrayerSettings: PrayerSettingsDraft = {
  country: "Saudi Arabia",
  city: "Riyadh",
  ...defaultPrayerApiSettings,
}

const prayerMethodOptions = [
  { value: "4", label: "أم القرى - السعودية" },
  { value: "3", label: "رابطة العالم الإسلامي" },
  { value: "5", label: "الهيئة المصرية العامة للمساحة" },
  { value: "2", label: "ISNA - أمريكا الشمالية" },
  { value: "1", label: "جامعة العلوم الإسلامية - كراتشي" },
  { value: "9", label: "الكويت" },
  { value: "10", label: "قطر" },
  { value: "11", label: "سنغافورة" },
]

const asrSchoolOptions = [
  { value: "0", label: "قياسي" },
  { value: "1", label: "حنفي" },
]

const timezoneOptions = [
  "Asia/Riyadh",
  "Asia/Dubai",
  "Asia/Kuwait",
  "Asia/Qatar",
  "Asia/Jakarta",
  "Asia/Kuala_Lumpur",
  "Europe/London",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
]

const blockSourceOptions: Array<{
  value: TimeBlock["startSource"]
  label: string
}> = [
  { value: "last_sixth", label: "السدس الأخير" },
  { value: "Fajr", label: "الفجر" },
  { value: "Sunrise", label: "الشروق" },
  { value: "Dhuhr", label: "الظهر" },
  { value: "Asr", label: "العصر" },
  { value: "Maghrib", label: "المغرب" },
  { value: "Isha", label: "العشاء" },
  { value: "fixed", label: "وقت ثابت" },
]

const blockColorOptions = [
  { value: "indigo", label: "نيلي" },
  { value: "emerald", label: "أخضر" },
  { value: "sky", label: "سماوي" },
  { value: "amber", label: "ذهبي" },
  { value: "orange", label: "برتقالي" },
  { value: "rose", label: "وردي" },
  { value: "violet", label: "بنفسجي" },
  { value: "teal", label: "فيروزي" },
  { value: "slate", label: "رمادي" },
]

const defaultBlockDraft: TimeBlockEditorDraft = {
  nameAr: "",
  sortOrder: 80,
  color: "emerald",
  startSource: "Fajr",
  endSource: "Sunrise",
  fixedStart: "06:00",
  fixedEnd: "07:00",
}

export function RoutinePlanner({ initialStartDate }: RoutinePlannerProps) {
  const [startDate, setStartDate] = React.useState(initialStartDate)
  const [templates, setTemplates] = React.useState(defaultTaskTemplates)
  const [timeBlocks, setTimeBlocks] = React.useState(seedTimeBlocks)
  const [prayerSettings, setPrayerSettings] =
    React.useState(defaultPrayerSettings)
  const [prayerDays, setPrayerDays] = React.useState<PrayerDay[]>([])
  const [prayerTimesState, setPrayerTimesState] =
    React.useState<PrayerTimesState>({ status: "loading" })
  const [draft, setDraft] = React.useState({
    title: "",
    timeBlockId: "fajr_to_sunrise",
    categoryId: "worship",
    duration: 30,
    repeatType: "daily" as RepeatType,
    repeatDays: [1, 4] as Weekday[],
    notes: "",
    includeInCalendar: true,
  })
  const [exportState, setExportState] = React.useState<ExportState>({
    status: "idle",
  })
  const [editingDraft, setEditingDraft] =
    React.useState<TemplateEditorDraft | null>(null)
  const [blockDraft, setBlockDraft] =
    React.useState<TimeBlockEditorDraft>(defaultBlockDraft)
  const [editingTimeBlock, setEditingTimeBlock] = React.useState<{
    id: string
    draft: TimeBlockEditorDraft
  } | null>(null)
  const [hasLoadedStoredTemplates, setHasLoadedStoredTemplates] =
    React.useState(false)
  const [hasLoadedTimeBlocks, setHasLoadedTimeBlocks] = React.useState(false)
  const [hasLoadedPrayerSettings, setHasLoadedPrayerSettings] =
    React.useState(false)
  const hasPrayerApiTimes =
    prayerTimesState.status === "ready" && prayerDays.length > 0

  const preview = React.useMemo(
    () =>
      buildLiveWeekPreview({
        startDate,
        days: 7,
        prayerDays,
        templates,
        timeBlocks,
        isPrayerTimesReady: hasPrayerApiTimes,
      }),
    [hasPrayerApiTimes, prayerDays, startDate, templates, timeBlocks]
  )

  const calendarEvents = React.useMemo(
    () => buildCalendarBlockEvents(preview),
    [preview]
  )

  const visibleEvents = calendarEvents
  const conflictCount = preview.reduce(
    (total, day) => total + day.conflicts.length,
    0
  )
  const activeTemplateCount = templates.filter(
    (template) => template.isActive
  ).length

  React.useEffect(() => {
    const storedSettings = parseStoredPrayerSettings(
      window.localStorage.getItem(prayerSettingsStorageKey)
    )

    if (storedSettings) {
      setPrayerSettings(storedSettings)
    }

    setHasLoadedPrayerSettings(true)
  }, [])

  React.useEffect(() => {
    if (!hasLoadedPrayerSettings) {
      return
    }

    try {
      window.localStorage.setItem(
        prayerSettingsStorageKey,
        JSON.stringify(prayerSettings)
      )
    } catch {
      // Keep prayer previews usable even when storage is unavailable.
    }
  }, [hasLoadedPrayerSettings, prayerSettings])

  React.useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({
      startDate,
      days: "7",
    })
    appendPrayerSettingsParams(params, prayerSettings)

    setPrayerDays([])
    setPrayerTimesState({ status: "loading" })

    fetch(`/api/prayer-times?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const body = (await response.json()) as {
          message?: string
          prayerDays?: PrayerDay[]
          source?: string
        }

        if (!response.ok || !body.prayerDays) {
          throw new Error(body.message ?? "تعذر جلب أوقات الصلاة.")
        }

        setPrayerDays(body.prayerDays)
        setPrayerTimesState({
          status: "ready",
          source: body.source ?? "aladhan",
        })
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }

        setPrayerTimesState({
          status: "error",
          message:
            error instanceof Error ? error.message : "تعذر جلب أوقات الصلاة.",
        })
      })

    return () => controller.abort()
  }, [prayerSettings, startDate])

  React.useEffect(() => {
    let storedTemplates: TaskTemplate[] | null = null

    try {
      storedTemplates = parseStoredTemplates(
        window.localStorage.getItem(templateStorageKey)
      )
    } catch {
      storedTemplates = null
    }

    if (storedTemplates) {
      setTemplates(
        migrateTemplateDuration(storedTemplates, "prepare-istighfar", 15)
      )
    }

    setHasLoadedStoredTemplates(true)
  }, [])

  React.useEffect(() => {
    const storedBlocks = parseStoredTimeBlocks(
      window.localStorage.getItem(timeBlockStorageKey)
    )

    if (storedBlocks?.length) {
      setTimeBlocks(storedBlocks)
    }

    setHasLoadedTimeBlocks(true)
  }, [])

  React.useEffect(() => {
    if (!hasLoadedStoredTemplates) {
      return
    }

    try {
      window.localStorage.setItem(
        templateStorageKey,
        serializeTemplates(templates)
      )
    } catch {
      // Keep the editor usable even when storage is unavailable.
    }
  }, [hasLoadedStoredTemplates, templates])

  React.useEffect(() => {
    if (!hasLoadedTimeBlocks) {
      return
    }

    try {
      window.localStorage.setItem(
        timeBlockStorageKey,
        serializeTimeBlocks(timeBlocks)
      )
    } catch {
      // Keep routine editing usable even when storage is unavailable.
    }
  }, [hasLoadedTimeBlocks, timeBlocks])

  React.useEffect(() => {
    if (
      timeBlocks.length > 0 &&
      !timeBlocks.some((block) => block.id === draft.timeBlockId)
    ) {
      setDraft((current) => ({
        ...current,
        timeBlockId: timeBlocks[0]!.id,
      }))
    }
  }, [draft.timeBlockId, timeBlocks])

  function addTimeBlock() {
    if (!blockDraft.nameAr.trim()) {
      setExportState({ status: "error", message: "اكتب اسم الفترة أولا." })
      return
    }

    const nextBlock = createTimeBlockFromDraft(blockDraft, timeBlocks)

    setTimeBlocks((current) => [...current, nextBlock])
    setBlockDraft({
      ...defaultBlockDraft,
      sortOrder: nextBlock.sortOrder + 10,
    })
    setExportState({ status: "idle" })
  }

  function editTimeBlock(block: TimeBlock) {
    setEditingTimeBlock({
      id: block.id,
      draft: timeBlockToEditorDraft(block),
    })
  }

  function updateEditingTimeBlockDraft(patch: Partial<TimeBlockEditorDraft>) {
    setEditingTimeBlock((current) =>
      current
        ? {
            ...current,
            draft: { ...current.draft, ...patch },
          }
        : current
    )
  }

  function saveEditingTimeBlock() {
    if (!editingTimeBlock) {
      return
    }

    if (!editingTimeBlock.draft.nameAr.trim()) {
      setExportState({ status: "error", message: "اكتب اسم الفترة أولا." })
      return
    }

    setTimeBlocks((current) =>
      updateTimeBlockById(current, editingTimeBlock.id, editingTimeBlock.draft)
    )
    setEditingTimeBlock(null)
    setExportState({ status: "idle" })
  }

  function deleteEditingTimeBlock() {
    if (!editingTimeBlock || timeBlocks.length <= 1) {
      return
    }

    setTimeBlocks((current) =>
      deleteTimeBlockById(current, editingTimeBlock.id)
    )
    setTemplates((current) =>
      current.filter(
        (template) => template.defaultTimeBlockId !== editingTimeBlock.id
      )
    )
    setEditingTimeBlock(null)
    setExportState({ status: "idle" })
  }

  function resetTimeBlocks() {
    setTimeBlocks(seedTimeBlocks)
    setTemplates((current) =>
      current.filter((template) =>
        seedTimeBlocks.some((block) => block.id === template.defaultTimeBlockId)
      )
    )
    setEditingTimeBlock(null)
    setExportState({ status: "idle" })
  }

  function addTemplate() {
    const title = draft.title.trim()

    if (!title) {
      setExportState({ status: "error", message: "اكتب اسم الروتين أولا." })
      return
    }

    if (!timeBlocks.some((block) => block.id === draft.timeBlockId)) {
      setExportState({ status: "error", message: "أضف فترة روتين أولا." })
      return
    }

    const category = seedCategories.find((item) => item.id === draft.categoryId)

    setTemplates((current) => [
      ...current,
      {
        id: `template-${Date.now()}`,
        title,
        categoryId: draft.categoryId,
        defaultTimeBlockId: draft.timeBlockId,
        defaultDurationMinutes: draft.duration,
        defaultPriority: category?.defaultPriority ?? "medium",
        repeatType: draft.repeatType,
        repeatDays: draft.repeatDays,
        repeatInterval: 1,
        startDate,
        notes: draft.notes,
        checklist: [],
        color: category?.color ?? "emerald",
        isActive: true,
        includeInCalendar: draft.includeInCalendar,
        sortOrder: current.length * 10 + 10,
      },
    ])
    setDraft((current) => ({ ...current, title: "", notes: "" }))
    setExportState({ status: "idle" })
  }

  function toggleTemplate(templateId: string) {
    setTemplates((current) =>
      current.map((template) =>
        template.id === templateId
          ? { ...template, isActive: !template.isActive }
          : template
      )
    )
  }

  function toggleDraftDay(day: Weekday) {
    setDraft((current) => ({
      ...current,
      repeatDays: current.repeatDays.includes(day)
        ? current.repeatDays.filter((value) => value !== day)
        : ([...current.repeatDays, day].sort() as Weekday[]),
    }))
  }

  function openTemplateEditor(template: TaskTemplate) {
    setEditingDraft(templateToEditorDraft(template))
    setExportState({ status: "idle" })
  }

  function updateEditingDraft(patch: Partial<TemplateEditorDraft>) {
    setEditingDraft((current) => (current ? { ...current, ...patch } : current))
  }

  function updateEditingCategory(categoryId: string) {
    const category = seedCategories.find((item) => item.id === categoryId)

    updateEditingDraft(
      category
        ? { categoryId, defaultPriority: category.defaultPriority }
        : { categoryId }
    )
  }

  function updateEditingChecklistItem(index: number, value: string) {
    setEditingDraft((current) =>
      current
        ? {
            ...current,
            checklist: current.checklist.map((item, itemIndex) =>
              itemIndex === index ? value : item
            ),
          }
        : current
    )
  }

  function addEditingChecklistItem() {
    setEditingDraft((current) =>
      current ? { ...current, checklist: [...current.checklist, ""] } : current
    )
  }

  function removeEditingChecklistItem(index: number) {
    setEditingDraft((current) =>
      current
        ? {
            ...current,
            checklist: current.checklist.filter(
              (_item, itemIndex) => itemIndex !== index
            ),
          }
        : current
    )
  }

  function toggleEditingDay(day: Weekday) {
    setEditingDraft((current) =>
      current ? toggleEditorDraftDay(current, day) : current
    )
  }

  function saveEditingTemplate() {
    if (!editingDraft) {
      return
    }

    if (!editingDraft.title.trim()) {
      setExportState({ status: "error", message: "اكتب اسم القالب أولا." })
      return
    }

    setTemplates((current) =>
      current.map((template) =>
        template.id === editingDraft.id
          ? applyTemplateEditorDraft(template, editingDraft, seedCategories)
          : template
      )
    )
    setEditingDraft(null)
    setExportState({ status: "idle" })
  }

  function deleteEditingTemplate() {
    if (!editingDraft) {
      return
    }

    setTemplates((current) => deleteTemplateById(current, editingDraft.id))
    setEditingDraft(null)
    setExportState({ status: "idle" })
  }

  function clearTemplates() {
    setTemplates(defaultTaskTemplates)
    setEditingDraft(null)
    setExportState({ status: "idle" })
  }

  function loadExampleTemplates() {
    setTimeBlocks(seedTimeBlocks)
    setTemplates(exampleTaskTemplates)
    setEditingDraft(null)
    setExportState({ status: "idle" })
  }

  function updatePrayerSettings(patch: Partial<PrayerSettingsDraft>) {
    setPrayerSettings((current) => ({ ...current, ...patch }))
    setExportState({ status: "idle" })
  }

  function updatePrayerSettingNumber(
    field: "latitude" | "longitude" | "method",
    value: string
  ) {
    const next = Number(value)

    if (!Number.isFinite(next)) {
      return
    }

    updatePrayerSettings({ [field]: next })
  }

  function resetPrayerSettings() {
    setPrayerSettings(defaultPrayerSettings)
    setExportState({ status: "idle" })
  }

  async function fillCalendar() {
    setExportState({ status: "loading" })

    try {
      const response = await fetch("/api/calendar/fill-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate,
          days: 7,
          settings: toPrayerApiSettings(prayerSettings),
          timeBlocks,
          templates,
        }),
      })
      const body = (await response.json()) as {
        configured?: boolean
        events?: unknown[]
        result?: { records?: Array<{ action: string }> }
        message?: string
      }

      if (!response.ok) {
        throw new Error(body.message ?? "تعذر تعبئة التقويم.")
      }

      if (!body.configured) {
        setExportState({
          status: "ready",
          configured: false,
          message: `تم تجهيز ${body.events?.length ?? visibleEvents.length} أحداث. أضف إعدادات Google Calendar لتفعيل الإرسال الحقيقي.`,
        })
        return
      }

      const createdOrUpdated = body.result?.records?.filter(
        (record) => record.action !== "skipped"
      ).length

      setExportState({
        status: "ready",
        configured: true,
        message: `تمت مزامنة الأسبوع. تغييرات جديدة: ${createdOrUpdated ?? 0}.`,
      })
    } catch (error) {
      setExportState({
        status: "error",
        message: error instanceof Error ? error.message : "تعذر تعبئة التقويم.",
      })
    }
  }

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-2">
            <Badge variant="secondary" className="w-fit">
              تقويم الصلاة والروتين
            </Badge>
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-semibold tracking-normal md:text-3xl">
                ابن روتينك حول أوقات الصلاة
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                أضف مهامك داخل كل فترة صلاة، راجع الأسبوع حسب أوقات الصلاة
                الحقيقية، ثم أرسل كل فترة إلى Google Calendar كحدث واحد.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <Metric label="المهام" value={activeTemplateCount.toString()} />
            <Metric label="الأحداث" value={visibleEvents.length.toString()} />
            <Metric label="تنبيهات" value={conflictCount.toString()} />
          </div>
        </header>

        <Tabs defaultValue="preview" className="flex flex-col gap-4">
          <TabsList className="grid w-full grid-cols-4 md:w-fit">
            <TabsTrigger value="preview">الأسبوع</TabsTrigger>
            <TabsTrigger value="routine">الروتين</TabsTrigger>
            <TabsTrigger value="calendar">التقويم</TabsTrigger>
            <TabsTrigger value="settings">الإعدادات</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="m-0">
            <section className="grid gap-4 lg:grid-cols-[320px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClockIcon data-icon="inline-start" />
                    معاينة الأسبوع
                  </CardTitle>
                  <CardDescription>
                    اختر بداية الأسبوع وشاهد الترتيب الفعلي قبل الإرسال.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="start-date">
                        تاريخ البداية
                      </FieldLabel>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(event) => setStartDate(event.target.value)}
                      />
                      <FieldDescription>
                        يتم توليد سبعة أيام ابتداء من هذا التاريخ.
                      </FieldDescription>
                    </Field>
                  </FieldGroup>
                </CardContent>
                <CardFooter>
                  <div className="flex w-full flex-col gap-3">
                    <PrayerTimesStatus state={prayerTimesState} />
                    <Button
                      type="button"
                      className="w-full"
                      onClick={() => setStartDate(initialStartDate)}
                      variant="outline"
                    >
                      <RefreshCwIcon data-icon="inline-start" />
                      اليوم
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              {hasPrayerApiTimes ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {preview.map((day) => (
                    <DayPreview key={day.date} day={day} />
                  ))}
                </div>
              ) : (
                <PrayerTimesPanel state={prayerTimesState} />
              )}
            </section>
          </TabsContent>

          <TabsContent value="routine" className="m-0">
            <div className="flex flex-col gap-6">
              <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClockIcon data-icon="inline-start" />
                      فترة روتين جديدة
                    </CardTitle>
                    <CardDescription>
                      أنشئ أو عدل فترات الروتين التي تحتوي المهام.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <TimeBlockFields
                      draft={blockDraft}
                      idPrefix="new-time-block"
                      onChange={(patch) =>
                        setBlockDraft((current) => ({ ...current, ...patch }))
                      }
                    />
                  </CardContent>
                  <CardFooter>
                    <div className="flex w-full flex-col gap-2">
                      <Button
                        type="button"
                        className="w-full"
                        onClick={addTimeBlock}
                      >
                        <PlusIcon data-icon="inline-start" />
                        إضافة الفترة
                      </Button>
                      <Button
                        type="button"
                        className="w-full"
                        variant="outline"
                        onClick={resetTimeBlocks}
                      >
                        <RefreshCwIcon data-icon="inline-start" />
                        استعادة فترات الصلاة
                      </Button>
                    </div>
                  </CardFooter>
                </Card>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {timeBlocks.map((block) => (
                    <Card key={block.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-col gap-2">
                            <CardTitle className="break-words text-base">
                              {block.nameAr}
                            </CardTitle>
                            <CardDescription>
                              {timeBlockBoundaryLabel(block)}
                            </CardDescription>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => editTimeBlock(block)}
                            aria-label={`تعديل ${block.nameAr}`}
                          >
                            <PencilIcon />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        <Badge variant="secondary" className="gap-2">
                          <span
                            className="size-2 rounded-full"
                            style={{
                              backgroundColor: colorSwatch(block.color),
                            }}
                          />
                          {colorLabel(block.color)}
                        </Badge>
                        <Badge variant="outline">
                          ترتيب {block.sortOrder}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>

              <Separator />

            <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusIcon data-icon="inline-start" />
                    مهمة جديدة
                  </CardTitle>
                  <CardDescription>
                    أضف مهمة داخل إحدى فترات الصلاة مع مدتها وتكرارها.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="template-title">
                        اسم الروتين
                      </FieldLabel>
                      <Input
                        id="template-title"
                        value={draft.title}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                        placeholder="مثلا: ورد قرآن"
                      />
                    </Field>
                    <Field>
                      <FieldLabel>بلوك الصلاة</FieldLabel>
                      <Select
                        value={draft.timeBlockId}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            timeBlockId: value,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {timeBlocks.map((block) => (
                              <SelectItem key={block.id} value={block.id}>
                                {block.nameAr}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel>التصنيف</FieldLabel>
                      <Select
                        value={draft.categoryId}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            categoryId: value,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            {seedCategories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.nameAr}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="duration">المدة بالدقائق</FieldLabel>
                      <Input
                        id="duration"
                        type="number"
                        min={5}
                        max={240}
                        value={draft.duration}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            duration: Number(event.target.value),
                          }))
                        }
                      />
                    </Field>
                    <Field>
                      <FieldLabel>التكرار</FieldLabel>
                      <Select
                        value={draft.repeatType}
                        onValueChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            repeatType: value as RepeatType,
                          }))
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="daily">يومي</SelectItem>
                            <SelectItem value="selected_days">
                              أيام محددة
                            </SelectItem>
                            <SelectItem value="none">مرة واحدة</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </Field>
                    {draft.repeatType === "selected_days" && (
                      <FieldSet>
                        <FieldLegend>الأيام</FieldLegend>
                        <div className="grid grid-cols-2 gap-2">
                          {weekdayOptions.map((day) => (
                            <Field key={day.value} orientation="horizontal">
                              <Checkbox
                                checked={draft.repeatDays.includes(day.value)}
                                onCheckedChange={() =>
                                  toggleDraftDay(day.value)
                                }
                              />
                              <FieldLabel>{day.label}</FieldLabel>
                            </Field>
                          ))}
                        </div>
                      </FieldSet>
                    )}
                    <Field>
                      <FieldLabel htmlFor="notes">ملاحظات</FieldLabel>
                      <Textarea
                        id="notes"
                        value={draft.notes}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        placeholder="أي تفاصيل تظهر داخل وصف حدث التقويم"
                      />
                    </Field>
                    <Field orientation="horizontal">
                      <Switch
                        checked={draft.includeInCalendar}
                        onCheckedChange={(checked) =>
                          setDraft((current) => ({
                            ...current,
                            includeInCalendar: checked,
                          }))
                        }
                      />
                      <FieldContent>
                        <FieldTitle>إدراجه في Google Calendar</FieldTitle>
                        <FieldDescription>
                          يمكن إبقاء بعض المهام في التخطيط فقط.
                        </FieldDescription>
                      </FieldContent>
                    </Field>
                  </FieldGroup>
                </CardContent>
                <CardFooter>
                  <div className="flex w-full flex-col gap-2">
                    <Button
                      type="button"
                      className="w-full"
                      onClick={addTemplate}
                    >
                      <PlusIcon data-icon="inline-start" />
                      إضافة المهمة
                    </Button>
                    <Button
                      type="button"
                      className="w-full"
                      variant="outline"
                      onClick={loadExampleTemplates}
                    >
                      <RefreshCwIcon data-icon="inline-start" />
                      تحميل مثال جاهز
                    </Button>
                    <Button
                      type="button"
                      className="w-full"
                      variant="ghost"
                      onClick={clearTemplates}
                    >
                      <Trash2Icon data-icon="inline-start" />
                      مسح كل المهام
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              {templates.length === 0 ? (
                <Alert>
                  <ListChecksIcon />
                  <AlertTitle>ابدأ بمهامك أنت</AlertTitle>
                  <AlertDescription>
                    فترات الصلاة جاهزة من أوقات الصلاة، لكن لا توجد مهام
                    داخلها بعد. أضف مهمة جديدة أو حمل مثالا جاهزا للتجربة.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-2">
                          <CardTitle className="break-words text-base">
                            {template.title}
                          </CardTitle>
                          <CardDescription>
                            {repeatLabel(
                              template.repeatType,
                              template.repeatDays
                            )}
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openTemplateEditor(template)}
                          aria-label={`تعديل ${template.title}`}
                        >
                          <PencilIcon />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {blockLabel(template.defaultTimeBlockId, timeBlocks)}
                        </Badge>
                        <Badge variant="outline">
                          {durationLabel(template)}
                        </Badge>
                      </div>
                      {template.notes && (
                        <p className="text-sm leading-6 text-muted-foreground">
                          {template.notes}
                        </p>
                      )}
                      {template.checklist.length > 0 && (
                        <ul className="flex flex-col gap-1 rounded-md bg-muted/40 px-3 py-2 text-sm leading-6 text-muted-foreground">
                          {template.checklist.map((item) => (
                            <li key={item}>- {item}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                    <CardFooter className="justify-between">
                      <Field orientation="horizontal" className="w-fit">
                        <Switch
                          checked={template.isActive}
                          onCheckedChange={() => toggleTemplate(template.id)}
                        />
                        <FieldLabel>نشط</FieldLabel>
                      </Field>
                      <Badge
                        variant={
                          template.includeInCalendar ? "default" : "outline"
                        }
                      >
                        {template.includeInCalendar ? "للتقويم" : "تخطيط فقط"}
                      </Badge>
                    </CardFooter>
                  </Card>
                  ))}
                </div>
              )}
            </section>
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="m-0">
            <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheckIcon data-icon="inline-start" />
                    تعبئة Google Calendar
                  </CardTitle>
                  <CardDescription>
                    يرسل التطبيق حدثا واحدا لكل بلوك صلاة يحتوي على مهام.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  <Alert>
                    <ListChecksIcon />
                    <AlertTitle>طريقة التصدير</AlertTitle>
                    <AlertDescription>
                      كل حدث يحمل معرفا داخليا وهاش للمحتوى، لذلك الضغط المتكرر
                      يحدث الموجود ولا يكرر الأسبوع.
                    </AlertDescription>
                  </Alert>
                  {exportState.status === "ready" && (
                    <Alert>
                      <CalendarCheckIcon />
                      <AlertTitle>
                        {exportState.configured ? "تم الإرسال" : "جاهز للإرسال"}
                      </AlertTitle>
                      <AlertDescription>{exportState.message}</AlertDescription>
                    </Alert>
                  )}
                  {exportState.status === "error" && (
                    <Alert variant="destructive">
                      <AlertTitle>تنبيه</AlertTitle>
                      <AlertDescription>{exportState.message}</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    type="button"
                    className="w-full"
                    onClick={fillCalendar}
                    disabled={
                      exportState.status === "loading" || !hasPrayerApiTimes
                    }
                  >
                    {exportState.status === "loading" ? (
                      <RefreshCwIcon data-icon="inline-start" />
                    ) : (
                      <CalendarCheckIcon data-icon="inline-start" />
                    )}
                    Fill One Week
                  </Button>
                </CardFooter>
              </Card>

              <div className="grid gap-3 md:grid-cols-2">
                {visibleEvents.map((event) => (
                  <Card key={event.localId}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {event.summary}
                      </CardTitle>
                      <CardDescription>{event.date}</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <p
                        className="font-mono text-xs text-muted-foreground"
                        dir="ltr"
                      >
                        {event.start} → {event.end}
                      </p>
                      <Separator />
                      <p className="line-clamp-5 text-sm leading-6 whitespace-pre-line">
                        {event.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="settings" className="m-0">
            <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon data-icon="inline-start" />
                    إعدادات الصلاة
                  </CardTitle>
                  <CardDescription>
                    غيّر موقعك وطريقة الحساب. المعاينة والتقويم يستخدمان هذه
                    القيم مباشرة.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <FieldGroup>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="settings-country">
                          الدولة
                        </FieldLabel>
                        <Input
                          id="settings-country"
                          value={prayerSettings.country}
                          onChange={(event) =>
                            updatePrayerSettings({
                              country: event.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="settings-city">
                          المدينة
                        </FieldLabel>
                        <Input
                          id="settings-city"
                          value={prayerSettings.city}
                          onChange={(event) =>
                            updatePrayerSettings({ city: event.target.value })
                          }
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <Field>
                        <FieldLabel htmlFor="settings-latitude">
                          خط العرض
                        </FieldLabel>
                        <Input
                          id="settings-latitude"
                          dir="ltr"
                          type="number"
                          min={-90}
                          max={90}
                          step="0.0001"
                          value={prayerSettings.latitude}
                          onChange={(event) =>
                            updatePrayerSettingNumber(
                              "latitude",
                              event.target.value
                            )
                          }
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="settings-longitude">
                          خط الطول
                        </FieldLabel>
                        <Input
                          id="settings-longitude"
                          dir="ltr"
                          type="number"
                          min={-180}
                          max={180}
                          step="0.0001"
                          value={prayerSettings.longitude}
                          onChange={(event) =>
                            updatePrayerSettingNumber(
                              "longitude",
                              event.target.value
                            )
                          }
                        />
                      </Field>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <Field>
                        <FieldLabel>طريقة الحساب</FieldLabel>
                        <Select
                          value={String(prayerSettings.method)}
                          onValueChange={(value) =>
                            updatePrayerSettingNumber("method", value)
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {prayerMethodOptions.map((method) => (
                                <SelectItem
                                  key={method.value}
                                  value={method.value}
                                >
                                  {method.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel>مذهب العصر</FieldLabel>
                        <Select
                          value={String(prayerSettings.school)}
                          onValueChange={(value) =>
                            updatePrayerSettings({
                              school: Number(value) as PrayerApiSettings["school"],
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {asrSchoolOptions.map((school) => (
                                <SelectItem
                                  key={school.value}
                                  value={school.value}
                                >
                                  {school.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>

                      <Field>
                        <FieldLabel>المنطقة الزمنية</FieldLabel>
                        <Select
                          value={prayerSettings.timezone}
                          onValueChange={(timezone) =>
                            updatePrayerSettings({ timezone })
                          }
                        >
                          <SelectTrigger className="w-full" dir="ltr">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              {timezoneOptions.map((timezone) => (
                                <SelectItem key={timezone} value={timezone}>
                                  {timezone}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </Field>
                    </div>
                  </FieldGroup>

                  <Alert>
                    <ClockIcon />
                    <AlertTitle>مصدر الأوقات: AlAdhan API</AlertTitle>
                    <AlertDescription>
                      اسم الدولة والمدينة للتنظيم فقط حاليا؛ الحساب يعتمد على
                      الإحداثيات وطريقة الحساب ومذهب العصر والمنطقة الزمنية.
                    </AlertDescription>
                  </Alert>
                </CardContent>
                <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge variant="secondary">محفوظ محليا</Badge>
                    <Badge variant="outline" dir="ltr">
                      {prayerSettings.latitude}, {prayerSettings.longitude}
                    </Badge>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetPrayerSettings}
                  >
                    <RefreshCwIcon data-icon="inline-start" />
                    استعادة إعدادات الرياض
                  </Button>
                </CardFooter>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarCheckIcon data-icon="inline-start" />
                    إعدادات Google Calendar
                  </CardTitle>
                  <CardDescription>
                    الربط الحقيقي يتم من متغيرات البيئة في السيرفر فقط.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 text-sm leading-6">
                  <ConfigRow
                    label="ملف حساب الخدمة"
                    value="GOOGLE_SERVICE_ACCOUNT_FILE"
                  />
                  <ConfigRow
                    label="أو JSON حساب الخدمة"
                    value="GOOGLE_SERVICE_ACCOUNT_JSON"
                  />
                  <ConfigRow
                    label="معرف التقويم"
                    value="GOOGLE_CALENDAR_ID"
                  />
                  <Separator />
                  <p className="text-muted-foreground">
                    شارك التقويم مع بريد Service Account بصلاحية تعديل
                    الأحداث. معرف التقويم هو Calendar ID من قسم Integrate
                    calendar، وليس Unique ID أو Client ID لحساب الخدمة.
                  </p>
                  <Alert>
                    <ListChecksIcon />
                    <AlertTitle>لا تضع المفاتيح في المتصفح</AlertTitle>
                    <AlertDescription>
                      مفاتيح Google الخاصة تبقى في متغيرات السيرفر. مفاتيح
                      Supabase العامة فقط يمكن أن تبدأ بـ NEXT_PUBLIC.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </Tabs>

        <TemplateEditorDialog
          draft={editingDraft}
          timeBlocks={timeBlocks}
          onOpenChange={(open) => {
            if (!open) {
              setEditingDraft(null)
            }
          }}
          onChange={updateEditingDraft}
          onCategoryChange={updateEditingCategory}
          onToggleDay={toggleEditingDay}
          onChecklistItemChange={updateEditingChecklistItem}
          onChecklistItemAdd={addEditingChecklistItem}
          onChecklistItemRemove={removeEditingChecklistItem}
          onSave={saveEditingTemplate}
          onDelete={deleteEditingTemplate}
        />
        <TimeBlockEditorDialog
          editingTimeBlock={editingTimeBlock}
          canDelete={timeBlocks.length > 1}
          onOpenChange={(open) => {
            if (!open) {
              setEditingTimeBlock(null)
            }
          }}
          onChange={updateEditingTimeBlockDraft}
          onSave={saveEditingTimeBlock}
          onDelete={deleteEditingTimeBlock}
        />
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-card-foreground">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}

function PrayerTimesStatus({ state }: { state: PrayerTimesState }) {
  if (state.status === "ready") {
    return (
      <Badge variant="secondary" className="justify-center">
        AlAdhan API
      </Badge>
    )
  }

  if (state.status === "error") {
    return (
      <Badge variant="destructive" className="justify-center">
        {state.message}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="justify-center">
      جاري جلب أوقات الصلاة
    </Badge>
  )
}

function PrayerTimesPanel({ state }: { state: PrayerTimesState }) {
  if (state.status === "error") {
    return (
      <Alert variant="destructive">
        <AlertTitle>تعذر جلب أوقات الصلاة</AlertTitle>
        <AlertDescription>
          {state.message} لن يتم عرض معاينة أو تعبئة التقويم حتى تصل أوقات
          الصلاة من AlAdhan API.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Alert>
      <ClockIcon />
      <AlertTitle>جاري تجهيز أوقات الصلاة</AlertTitle>
      <AlertDescription>
        المعاينة تنتظر أوقات الصلاة الحقيقية من AlAdhan API حتى لا تظهر أوقات
        تجريبية في الواجهة.
      </AlertDescription>
    </Alert>
  )
}

function TimeBlockFields({
  draft,
  idPrefix,
  onChange,
}: {
  draft: TimeBlockEditorDraft
  idPrefix: string
  onChange: (patch: Partial<TimeBlockEditorDraft>) => void
}) {
  const showFixedStart =
    draft.startSource === "fixed" || draft.startSource === "custom"
  const showFixedEnd =
    draft.endSource === "fixed" || draft.endSource === "custom"

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${idPrefix}-name`}>اسم الفترة</FieldLabel>
        <Input
          id={`${idPrefix}-name`}
          value={draft.nameAr}
          onChange={(event) => onChange({ nameAr: event.target.value })}
          placeholder="مثلا: الفجر إلى العمل"
        />
      </Field>

      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel>البداية</FieldLabel>
          <Select
            value={draft.startSource}
            onValueChange={(value) =>
              onChange({ startSource: value as TimeBlock["startSource"] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {blockSourceOptions.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel>النهاية</FieldLabel>
          <Select
            value={draft.endSource}
            onValueChange={(value) =>
              onChange({ endSource: value as TimeBlock["endSource"] })
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {blockSourceOptions.map((source) => (
                  <SelectItem key={source.value} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </div>

      {(showFixedStart || showFixedEnd) && (
        <div className="grid gap-4 md:grid-cols-2">
          {showFixedStart && (
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-fixed-start`}>
                وقت البداية
              </FieldLabel>
              <Input
                id={`${idPrefix}-fixed-start`}
                dir="ltr"
                type="time"
                value={draft.fixedStart}
                onChange={(event) =>
                  onChange({ fixedStart: event.target.value })
                }
              />
            </Field>
          )}

          {showFixedEnd && (
            <Field>
              <FieldLabel htmlFor={`${idPrefix}-fixed-end`}>
                وقت النهاية
              </FieldLabel>
              <Input
                id={`${idPrefix}-fixed-end`}
                dir="ltr"
                type="time"
                value={draft.fixedEnd}
                onChange={(event) => onChange({ fixedEnd: event.target.value })}
              />
            </Field>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Field>
          <FieldLabel>لون التقويم</FieldLabel>
          <Select
            value={draft.color}
            onValueChange={(color) => onChange({ color })}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {blockColorOptions.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    {color.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={`${idPrefix}-sort`}>الترتيب</FieldLabel>
          <Input
            id={`${idPrefix}-sort`}
            type="number"
            min={0}
            max={10000}
            value={draft.sortOrder}
            onChange={(event) =>
              onChange({ sortOrder: Number(event.target.value) })
            }
          />
        </Field>
      </div>
    </FieldGroup>
  )
}

function TimeBlockEditorDialog({
  editingTimeBlock,
  canDelete,
  onOpenChange,
  onChange,
  onSave,
  onDelete,
}: {
  editingTimeBlock: { id: string; draft: TimeBlockEditorDraft } | null
  canDelete: boolean
  onOpenChange: (open: boolean) => void
  onChange: (patch: Partial<TimeBlockEditorDraft>) => void
  onSave: () => void
  onDelete: () => void
}) {
  return (
    <Dialog open={Boolean(editingTimeBlock)} onOpenChange={onOpenChange}>
      {editingTimeBlock && (
        <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>تعديل فترة الروتين</DialogTitle>
            <DialogDescription>
              الفترة تحدد حدود المهام وألوان أحداث Google Calendar.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(100svh-12rem)]">
            <div className="px-4 py-4">
              <TimeBlockFields
                draft={editingTimeBlock.draft}
                idPrefix="edit-time-block"
                onChange={onChange}
              />
            </div>
          </ScrollArea>

          <DialogFooter className="border-t px-4 py-4">
            <Button type="button" onClick={onSave}>
              <SaveIcon data-icon="inline-start" />
              حفظ الفترة
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={!canDelete}
              onClick={onDelete}
            >
              <Trash2Icon data-icon="inline-start" />
              حذف الفترة
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}

function TemplateEditorDialog({
  draft,
  timeBlocks,
  onOpenChange,
  onChange,
  onCategoryChange,
  onToggleDay,
  onChecklistItemChange,
  onChecklistItemAdd,
  onChecklistItemRemove,
  onSave,
  onDelete,
}: {
  draft: TemplateEditorDraft | null
  timeBlocks: TimeBlock[]
  onOpenChange: (open: boolean) => void
  onChange: (patch: Partial<TemplateEditorDraft>) => void
  onCategoryChange: (categoryId: string) => void
  onToggleDay: (day: Weekday) => void
  onChecklistItemChange: (index: number, value: string) => void
  onChecklistItemAdd: () => void
  onChecklistItemRemove: (index: number) => void
  onSave: () => void
  onDelete: () => void
}) {
  return (
    <Dialog open={Boolean(draft)} onOpenChange={onOpenChange}>
      {draft && (
        <DialogContent className="max-h-[calc(100svh-2rem)] gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="border-b px-4 py-4">
            <DialogTitle>تعديل القالب</DialogTitle>
            <DialogDescription>
              أي تعديل هنا ينعكس مباشرة على معاينة الأسبوع وأحداث Google
              Calendar.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(100svh-12rem)]">
            <div className="grid gap-4 px-4 py-4">
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="edit-template-title">
                    اسم القالب
                  </FieldLabel>
                  <Input
                    id="edit-template-title"
                    value={draft.title}
                    onChange={(event) =>
                      onChange({ title: event.target.value })
                    }
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>بلوك الصلاة</FieldLabel>
                    <Select
                      value={draft.timeBlockId}
                      onValueChange={(value) =>
                        onChange({ timeBlockId: value })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {timeBlocks.map((block) => (
                            <SelectItem key={block.id} value={block.id}>
                              {block.nameAr}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel>التصنيف</FieldLabel>
                    <Select
                      value={draft.categoryId}
                      onValueChange={onCategoryChange}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {seedCategories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.nameAr}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="edit-template-duration">
                      المدة
                    </FieldLabel>
                    <Input
                      id="edit-template-duration"
                      type="number"
                      min={0}
                      max={1440}
                      value={draft.duration}
                      onChange={(event) =>
                        onChange({ duration: Number(event.target.value) })
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel>الأولوية</FieldLabel>
                    <Select
                      value={draft.defaultPriority}
                      onValueChange={(value) =>
                        onChange({
                          defaultPriority:
                            value as TemplateEditorDraft["defaultPriority"],
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {priorityOptions.map((priority) => (
                            <SelectItem
                              key={priority.value}
                              value={priority.value}
                            >
                              {priority.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-template-order">
                      الترتيب
                    </FieldLabel>
                    <Input
                      id="edit-template-order"
                      type="number"
                      min={0}
                      max={10000}
                      value={draft.sortOrder}
                      onChange={(event) =>
                        onChange({ sortOrder: Number(event.target.value) })
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel>طريقة الجدولة</FieldLabel>
                    <Select
                      value={draft.scheduleMode}
                      onValueChange={(value) =>
                        onChange({
                          scheduleMode: value as TemplateEditorScheduleMode,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {scheduleModeOptions.map((mode) => (
                            <SelectItem key={mode.value} value={mode.value}>
                              {mode.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <FieldLabel>التكرار</FieldLabel>
                    <Select
                      value={draft.repeatType}
                      onValueChange={(value) =>
                        onChange({ repeatType: value as RepeatType })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {repeatOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <Field>
                    <FieldLabel htmlFor="edit-template-interval">
                      الفاصل
                    </FieldLabel>
                    <Input
                      id="edit-template-interval"
                      type="number"
                      min={1}
                      max={365}
                      value={draft.repeatInterval}
                      onChange={(event) =>
                        onChange({ repeatInterval: Number(event.target.value) })
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-template-start">
                      البداية
                    </FieldLabel>
                    <Input
                      id="edit-template-start"
                      type="date"
                      value={draft.startDate}
                      onChange={(event) =>
                        onChange({ startDate: event.target.value })
                      }
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="edit-template-end">
                      النهاية
                    </FieldLabel>
                    <Input
                      id="edit-template-end"
                      type="date"
                      value={draft.endDate}
                      onChange={(event) =>
                        onChange({ endDate: event.target.value })
                      }
                    />
                  </Field>
                </div>

                {(draft.repeatType === "selected_days" ||
                  draft.repeatType === "weekly") && (
                  <FieldSet>
                    <FieldLegend>أيام التكرار</FieldLegend>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {weekdayOptions.map((day) => (
                        <Field key={day.value} orientation="horizontal">
                          <Checkbox
                            checked={draft.repeatDays.includes(day.value)}
                            onCheckedChange={() => onToggleDay(day.value)}
                          />
                          <FieldLabel>{day.label}</FieldLabel>
                        </Field>
                      ))}
                    </div>
                  </FieldSet>
                )}

                <Field>
                  <FieldLabel htmlFor="edit-template-notes">
                    ملاحظات
                  </FieldLabel>
                  <Textarea
                    id="edit-template-notes"
                    value={draft.notes}
                    onChange={(event) =>
                      onChange({ notes: event.target.value })
                    }
                  />
                </Field>

                <FieldSet>
                  <div className="flex items-center justify-between gap-3">
                    <FieldLegend>الأشياء داخل القالب</FieldLegend>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onChecklistItemAdd}
                    >
                      <PlusIcon data-icon="inline-start" />
                      إضافة
                    </Button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {draft.checklist.length === 0 && (
                      <p className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                        لا توجد عناصر داخلية بعد.
                      </p>
                    )}
                    {draft.checklist.map((item, index) => (
                      <div
                        key={`${draft.id}-checklist-${index}`}
                        className="grid grid-cols-[1fr_auto] gap-2"
                      >
                        <Input
                          value={item}
                          onChange={(event) =>
                            onChecklistItemChange(index, event.target.value)
                          }
                          aria-label={`عنصر داخلي ${index + 1}`}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => onChecklistItemRemove(index)}
                          aria-label="حذف العنصر"
                        >
                          <Trash2Icon />
                        </Button>
                      </div>
                    ))}
                  </div>
                </FieldSet>

                <div className="grid gap-3 md:grid-cols-2">
                  <Field orientation="horizontal">
                    <Switch
                      checked={draft.isActive}
                      onCheckedChange={(checked) =>
                        onChange({ isActive: checked })
                      }
                    />
                    <FieldContent>
                      <FieldTitle>نشط</FieldTitle>
                      <FieldDescription>
                        القالب غير النشط لا يظهر في المعاينة.
                      </FieldDescription>
                    </FieldContent>
                  </Field>

                  <Field orientation="horizontal">
                    <Switch
                      checked={draft.includeInCalendar}
                      onCheckedChange={(checked) =>
                        onChange({ includeInCalendar: checked })
                      }
                    />
                    <FieldContent>
                      <FieldTitle>للتقويم</FieldTitle>
                      <FieldDescription>
                        القالب غير المدرج يبقى للتخطيط فقط.
                      </FieldDescription>
                    </FieldContent>
                  </Field>
                </div>
              </FieldGroup>
            </div>
          </ScrollArea>

          <DialogFooter className="justify-between sm:justify-between">
            <Button type="button" variant="destructive" onClick={onDelete}>
              <Trash2Icon data-icon="inline-start" />
              حذف القالب
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button type="button" onClick={onSave}>
                <SaveIcon data-icon="inline-start" />
                حفظ التعديلات
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}

function DayPreview({
  day,
}: {
  day: ReturnType<typeof buildWeekPreview>[number]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{day.date}</CardTitle>
        <CardDescription>
          {day.conflicts.length
            ? `${day.conflicts.length} تنبيهات`
            : "جاهز للتقويم"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {day.blocks.map((block) => (
            <div key={block.timeBlockId} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">{block.nameAr}</h3>
                <Badge variant="outline" dir="ltr">
                  {block.startTime.slice(11, 16)}-{block.endTime.slice(11, 16)}
                </Badge>
              </div>
              <div className="flex flex-col gap-2">
                {block.occurrences.length === 0 && (
                  <div className="rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                    لا توجد مهام داخل هذه الفترة.
                  </div>
                )}
                {block.occurrences.map((occurrence) => (
                  <div
                    key={occurrence.id}
                    className="rounded-lg border bg-muted/40 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {occurrence.title}
                      </span>
                      <span
                        className="font-mono text-xs text-muted-foreground"
                        dir="ltr"
                      >
                        {occurrence.startTime?.slice(11, 16)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
      </CardContent>
    </Card>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-muted-foreground">{label}</span>
      <code
        className="break-all rounded-md bg-muted px-2 py-1 font-mono text-xs text-muted-foreground"
        dir="ltr"
      >
        {value}
      </code>
    </div>
  )
}

function toPrayerApiSettings(
  settings: PrayerSettingsDraft
): PrayerApiSettings {
  return {
    latitude: settings.latitude,
    longitude: settings.longitude,
    method: settings.method,
    school: settings.school,
    timezone: settings.timezone,
  }
}

function appendPrayerSettingsParams(
  params: URLSearchParams,
  settings: PrayerSettingsDraft
) {
  const apiSettings = toPrayerApiSettings(settings)

  params.set("latitude", apiSettings.latitude.toString())
  params.set("longitude", apiSettings.longitude.toString())
  params.set("method", apiSettings.method.toString())
  params.set("school", apiSettings.school.toString())
  params.set("timezone", apiSettings.timezone)
}

function parseStoredPrayerSettings(value: string | null) {
  if (!value) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as Partial<PrayerSettingsDraft>

    if (typeof parsed !== "object" || parsed === null) {
      return null
    }

    return {
      country:
        typeof parsed.country === "string" && parsed.country.trim()
          ? parsed.country
          : defaultPrayerSettings.country,
      city:
        typeof parsed.city === "string" && parsed.city.trim()
          ? parsed.city
          : defaultPrayerSettings.city,
      latitude: numberInRange(
        parsed.latitude,
        -90,
        90,
        defaultPrayerSettings.latitude
      ),
      longitude: numberInRange(
        parsed.longitude,
        -180,
        180,
        defaultPrayerSettings.longitude
      ),
      method: integerInRange(
        parsed.method,
        0,
        99,
        defaultPrayerSettings.method
      ),
      school:
        parsed.school === 0 || parsed.school === 1
          ? parsed.school
          : defaultPrayerSettings.school,
      timezone: isValidTimezone(parsed.timezone)
        ? parsed.timezone
        : defaultPrayerSettings.timezone,
    } satisfies PrayerSettingsDraft
  } catch {
    return null
  }
}

function numberInRange(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  const number = Number(value)

  return Number.isFinite(number) && number >= min && number <= max
    ? number
    : fallback
}

function integerInRange(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  const number = numberInRange(value, min, max, fallback)

  return Number.isInteger(number) ? number : fallback
}

function isValidTimezone(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 80) {
    return false
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date())
    return true
  } catch {
    return false
  }
}

function blockLabel(blockId: string, timeBlocks: TimeBlock[]) {
  return timeBlocks.find((block) => block.id === blockId)?.nameAr ?? blockId
}

function timeBlockBoundaryLabel(block: TimeBlock) {
  return `${sourceLabel(block.startSource, block.fixedStart)} إلى ${sourceLabel(
    block.endSource,
    block.fixedEnd
  )}`
}

function sourceLabel(source: TimeBlock["startSource"], fixedTime?: string) {
  if (source === "fixed" || source === "custom") {
    return fixedTime ?? "00:00"
  }

  return blockSourceOptions.find((option) => option.value === source)?.label ?? source
}

function colorLabel(color: string) {
  return blockColorOptions.find((option) => option.value === color)?.label ?? color
}

function colorSwatch(color: string) {
  const swatches: Record<string, string> = {
    indigo: "#6366f1",
    emerald: "#10b981",
    sky: "#0ea5e9",
    amber: "#f59e0b",
    orange: "#f97316",
    rose: "#f43f5e",
    violet: "#8b5cf6",
    teal: "#14b8a6",
    slate: "#64748b",
  }

  return swatches[color] ?? "#10b981"
}

function repeatLabel(repeatType: RepeatType, repeatDays: Weekday[]) {
  if (repeatType === "daily") {
    return "يتكرر يوميا"
  }

  if (repeatType === "none") {
    return "مرة واحدة"
  }

  return `أيام محددة: ${repeatDays
    .map((day) => weekdayOptions.find((option) => option.value === day)?.label)
    .filter(Boolean)
    .join("، ")}`
}
