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
import type { PrayerDay, RepeatType, TaskTemplate, Weekday } from "@/lib/types"
import { buildCalendarBlockEvents } from "@/lib/calendar"
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

export function RoutinePlanner({ initialStartDate }: RoutinePlannerProps) {
  const [startDate, setStartDate] = React.useState(initialStartDate)
  const [templates, setTemplates] = React.useState(defaultTaskTemplates)
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
  const [hasLoadedStoredTemplates, setHasLoadedStoredTemplates] =
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
        isPrayerTimesReady: hasPrayerApiTimes,
      }),
    [hasPrayerApiTimes, prayerDays, startDate, templates]
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
    const controller = new AbortController()
    const params = new URLSearchParams({
      startDate,
      days: "7",
    })

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
  }, [startDate])

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

  function addTemplate() {
    const title = draft.title.trim()

    if (!title) {
      setExportState({ status: "error", message: "اكتب اسم الروتين أولا." })
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
    setTemplates(exampleTaskTemplates)
    setEditingDraft(null)
    setExportState({ status: "idle" })
  }

  async function fillCalendar() {
    setExportState({ status: "loading" })

    try {
      const response = await fetch("/api/calendar/fill-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate, days: 7, templates }),
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
                            {seedTimeBlocks.map((block) => (
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
                          {blockLabel(template.defaultTimeBlockId)}
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
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon data-icon="inline-start" />
                    إعدادات الصلاة
                  </CardTitle>
                  <CardDescription>
                    القيم الافتراضية مبنية على السعودية وأم القرى.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm leading-6">
                  <SettingRow label="الدولة" value="Saudi Arabia" />
                  <SettingRow label="المدينة" value="Riyadh" />
                  <SettingRow label="الإحداثيات" value="24.7136, 46.6753" />
                  <SettingRow label="طريقة الحساب" value="Umm Al-Qura" />
                  <SettingRow label="مذهب العصر" value="Standard" />
                  <SettingRow label="مصدر الوقت" value="AlAdhan API" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>إعدادات Google</CardTitle>
                  <CardDescription>
                    لا تحفظ المفاتيح داخل الكود. استخدم متغيرات البيئة فقط.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 text-sm leading-6 text-muted-foreground">
                  <p>
                    GOOGLE_SERVICE_ACCOUNT_FILE أو GOOGLE_SERVICE_ACCOUNT_JSON
                  </p>
                  <p>
                    شارك التقويم مع بريد Service Account بصلاحية تعديل الأحداث.
                  </p>
                  <p>
                    GOOGLE_CALENDAR_ID يؤخذ من إعدادات Google Calendar ثم
                    Integrate calendar، وليس Unique ID أو Client ID لحساب
                    الخدمة.
                  </p>
                  <p>
                    NEXT_PUBLIC_SUPABASE_URL و
                    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
                  </p>
                </CardContent>
              </Card>
            </section>
          </TabsContent>
        </Tabs>

        <TemplateEditorDialog
          draft={editingDraft}
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

function TemplateEditorDialog({
  draft,
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
                          {seedTimeBlocks.map((block) => (
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

function SettingRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <Badge variant="secondary">{value}</Badge>
    </div>
  )
}

function blockLabel(blockId: string) {
  return seedTimeBlocks.find((block) => block.id === blockId)?.nameAr ?? blockId
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
