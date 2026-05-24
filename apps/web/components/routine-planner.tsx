"use client"

import * as React from "react"
import {
  CalendarCheckIcon,
  ClockIcon,
  ListChecksIcon,
  PlusIcon,
  RefreshCwIcon,
  SettingsIcon,
} from "lucide-react"

import { buildWeekPreview } from "@/lib/preview"
import {
  seedCategories,
  seedTaskTemplates,
  seedTimeBlocks,
} from "@/lib/routine-data"
import type { RepeatType, Weekday } from "@/lib/types"
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

type RoutinePlannerProps = {
  initialStartDate: string
}

type ExportState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; message: string; configured: boolean }
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

export function RoutinePlanner({ initialStartDate }: RoutinePlannerProps) {
  const [startDate, setStartDate] = React.useState(initialStartDate)
  const [templates, setTemplates] = React.useState(seedTaskTemplates)
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

  const preview = React.useMemo(
    () =>
      buildWeekPreview({
        startDate,
        days: 7,
        templates,
      }),
    [startDate, templates]
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
                روتين أسبوع كامل بضغطة واحدة
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                عدل قوالبك، راجع الأسبوع القادم حسب أوقات الصلاة، ثم أرسل كل
                بلوك إلى Google Calendar كحدث واحد مرتب.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <Metric label="القوالب" value={activeTemplateCount.toString()} />
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
                  <Button
                    type="button"
                    className="w-full"
                    onClick={() => setStartDate(initialStartDate)}
                    variant="outline"
                  >
                    <RefreshCwIcon data-icon="inline-start" />
                    اليوم
                  </Button>
                </CardFooter>
              </Card>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {preview.map((day) => (
                  <DayPreview key={day.date} day={day} />
                ))}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="routine" className="m-0">
            <section className="grid gap-4 lg:grid-cols-[360px_1fr]">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PlusIcon data-icon="inline-start" />
                    قالب جديد
                  </CardTitle>
                  <CardDescription>
                    أضف روتين بسيط يظهر في المعاينة والتصدير.
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
                  <Button
                    type="button"
                    className="w-full"
                    onClick={addTemplate}
                  >
                    <PlusIcon data-icon="inline-start" />
                    إضافة القالب
                  </Button>
                </CardFooter>
              </Card>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {templates.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {template.title}
                      </CardTitle>
                      <CardDescription>
                        {repeatLabel(template.repeatType, template.repeatDays)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">
                          {blockLabel(template.defaultTimeBlockId)}
                        </Badge>
                        <Badge variant="outline">
                          {template.defaultDurationMinutes} دقيقة
                        </Badge>
                      </div>
                      {template.notes && (
                        <p className="text-sm leading-6 text-muted-foreground">
                          {template.notes}
                        </p>
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
                    disabled={exportState.status === "loading"}
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
                  <SettingRow label="طريقة الحساب" value="Umm Al-Qura" />
                  <SettingRow label="مذهب العصر" value="Standard" />
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
        {day.blocks
          .filter((block) => block.occurrences.length > 0)
          .map((block) => (
            <div key={block.timeBlockId} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium">{block.nameAr}</h3>
                <Badge variant="outline" dir="ltr">
                  {block.startTime.slice(11, 16)}-{block.endTime.slice(11, 16)}
                </Badge>
              </div>
              <div className="flex flex-col gap-2">
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
