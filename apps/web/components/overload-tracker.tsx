"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ClockIcon,
  LockIcon,
  PlusIcon,
  TimerResetIcon,
} from "lucide-react"

import {
  workoutPlan,
  type WorkoutPlanDay,
  type WorkoutSuperset,
} from "@/lib/workout-plan"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Checkbox } from "@workspace/ui/components/checkbox"
import { Input } from "@workspace/ui/components/input"
import { Separator } from "@workspace/ui/components/separator"

type SetLog = {
  weight: string
  reps: string
  targetWeight: string
  targetReps: number
  requiresWeightIncrease: boolean
  completed: boolean
}

type SessionData = Record<string, SetLog[]>

type WorkoutRecord = {
  id: string
  day: WorkoutPlanDay
  completedAt: string
  exercises: SessionData
}

const workoutHistoryStorageKey = "muslim-routine.workout-history.v1"

export function OverloadTracker({
  initialDay = "Day 1",
}: {
  initialDay?: WorkoutPlanDay
}) {
  const [activeDay, setActiveDay] = React.useState<WorkoutPlanDay>(initialDay)
  const [activeSuperset, setActiveSuperset] = React.useState(0)
  const [history, setHistory] = React.useState<WorkoutRecord[]>([])
  const [sessionData, setSessionData] = React.useState<SessionData>({})
  const [timerSeconds, setTimerSeconds] = React.useState(0)
  const [isTimerRunning, setIsTimerRunning] = React.useState(false)

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(workoutHistoryStorageKey)
      if (stored) {
        setHistory(JSON.parse(stored) as WorkoutRecord[])
      }
    } catch {
      setHistory([])
    }
  }, [])

  const lastWorkout = React.useMemo(
    () => history.find((record) => record.day === activeDay),
    [activeDay, history]
  )

  React.useEffect(() => {
    setSessionData(buildInitialSession(activeDay, lastWorkout))
    setActiveSuperset(0)
  }, [activeDay, lastWorkout])

  React.useEffect(() => {
    if (!isTimerRunning || timerSeconds <= 0) {
      return
    }

    const timer = window.setInterval(() => {
      setTimerSeconds((current) => current - 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [isTimerRunning, timerSeconds])

  React.useEffect(() => {
    if (timerSeconds === 0 && isTimerRunning) {
      setIsTimerRunning(false)
      navigator.vibrate?.([250, 150, 250])
    }
  }, [isTimerRunning, timerSeconds])

  const isComplete = React.useMemo(
    () =>
      Object.values(sessionData).length > 0 &&
      Object.values(sessionData).every((sets) =>
        sets.every((set) => set.completed)
      ),
    [sessionData]
  )

  function updateSet(
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps" | "completed",
    value: string | boolean
  ) {
    setSessionData((current) => ({
      ...current,
      [exerciseId]:
        current[exerciseId]?.map((set, index) =>
          index === setIndex
            ? {
                ...set,
                [field]: value,
                completed: field === "completed" ? Boolean(value) : false,
              }
            : set
        ) ?? [],
    }))
  }

  function startTimer(seconds: number) {
    if (seconds <= 0) {
      return
    }

    setTimerSeconds(seconds)
    setIsTimerRunning(true)
  }

  function finishWorkout() {
    const record: WorkoutRecord = {
      id: crypto.randomUUID(),
      day: activeDay,
      completedAt: new Date().toISOString(),
      exercises: sessionData,
    }
    const nextHistory = [record, ...history].slice(0, 20)

    setHistory(nextHistory)
    window.localStorage.setItem(
      workoutHistoryStorageKey,
      JSON.stringify(nextHistory)
    )
    setSessionData(buildInitialSession(activeDay, record))
  }

  return (
    <main className="min-h-svh bg-background">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-4 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-2">
            <Button asChild variant="ghost" className="w-fit">
              <Link href="/">
                <ArrowRightIcon data-icon="inline-start" />
                العودة للروتين
              </Link>
            </Button>
            <div>
              <Badge variant="secondary" className="mb-2 w-fit">
                Progressive Overload
              </Badge>
              <h1 className="text-2xl font-semibold tracking-normal">
                Overload Tracker
              </h1>
              <p className="text-sm text-muted-foreground">
                سجل الأوزان والتكرارات، والتايمر يبدأ بعد نهاية السوبرست.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(["Day 1", "Day 2"] as WorkoutPlanDay[]).map((day) => (
              <Button
                key={day}
                type="button"
                variant={activeDay === day ? "default" : "outline"}
                onClick={() => setActiveDay(day)}
              >
                {day}
              </Button>
            ))}
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <section className="flex flex-col gap-3">
            {workoutPlan[activeDay].map((superset, index) => (
              <SupersetCard
                key={superset.id}
                index={index}
                isActive={activeSuperset === index}
                onToggle={() =>
                  setActiveSuperset(activeSuperset === index ? -1 : index)
                }
                onStartTimer={startTimer}
                sessionData={sessionData}
                superset={superset}
                updateSet={updateSet}
              />
            ))}
          </section>

          <aside className="flex flex-col gap-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClockIcon data-icon="inline-start" />
                  المؤقت
                </CardTitle>
                <CardDescription>راحة السوبرست الحالية.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="rounded-lg border bg-muted/40 px-3 py-5 text-center font-mono text-4xl font-semibold tabular-nums">
                  {formatTimer(timerSeconds)}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setTimerSeconds((current) => current + 30)}
                  >
                    <PlusIcon data-icon="inline-start" />
                    30s
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setTimerSeconds(0)
                      setIsTimerRunning(false)
                    }}
                  >
                    <TimerResetIcon data-icon="inline-start" />
                    Reset
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Button
              type="button"
              disabled={!isComplete}
              onClick={finishWorkout}
              className="h-11 w-full"
            >
              <CheckCircle2Icon data-icon="inline-start" />
              Finish & Save
            </Button>
          </aside>
        </div>
      </div>
    </main>
  )
}

function SupersetCard({
  index,
  isActive,
  onStartTimer,
  onToggle,
  sessionData,
  superset,
  updateSet,
}: {
  index: number
  isActive: boolean
  onStartTimer: (seconds: number) => void
  onToggle: () => void
  sessionData: SessionData
  superset: WorkoutSuperset
  updateSet: (
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps" | "completed",
    value: string | boolean
  ) => void
}) {
  const isComplete = superset.exercises.every((exercise) =>
    sessionData[exercise.id]?.every((set) => set.completed)
  )

  return (
    <Card>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
      >
        <span className="flex min-w-0 items-center gap-3">
          <Badge variant={isComplete ? "default" : "outline"}>
            {index + 1}
          </Badge>
          <span className="truncate font-medium">{superset.title}</span>
        </span>
        <ChevronDownIcon
          className={`size-4 transition-transform ${isActive ? "rotate-180" : ""}`}
        />
      </button>
      {isActive && (
        <CardContent className="flex flex-col gap-5 border-t pt-4">
          {superset.exercises.map((exercise, exerciseIndex) => (
            <div key={exercise.id} className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">{exercise.name}</h3>
                <Badge variant="secondary">
                  {exercise.sets} x {exercise.minReps}-{exercise.maxReps}
                </Badge>
              </div>
              <div className="flex flex-col gap-2">
                {(sessionData[exercise.id] ?? []).map((set, setIndex) => (
                  <SetRow
                    key={setIndex}
                    exerciseId={exercise.id}
                    restTime={
                      exerciseIndex === superset.exercises.length - 1
                        ? superset.restTime
                        : 0
                    }
                    set={set}
                    setIndex={setIndex}
                    updateSet={updateSet}
                    onStartTimer={onStartTimer}
                  />
                ))}
              </div>
              <Separator />
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}

function SetRow({
  exerciseId,
  onStartTimer,
  restTime,
  set,
  setIndex,
  updateSet,
}: {
  exerciseId: string
  onStartTimer: (seconds: number) => void
  restTime: number
  set: SetLog
  setIndex: number
  updateSet: (
    exerciseId: string,
    setIndex: number,
    field: "weight" | "reps" | "completed",
    value: string | boolean
  ) => void
}) {
  const isValid = isSetValid(set)

  function toggleComplete(checked: boolean) {
    if (checked && !isValid) {
      return
    }

    updateSet(exerciseId, setIndex, "completed", checked)

    if (checked) {
      onStartTimer(restTime)
    }
  }

  return (
    <div className="grid grid-cols-[2rem_1fr_1fr_2.5rem] items-end gap-2 rounded-lg border bg-muted/30 px-3 py-2">
      <div className="pb-2 text-center text-sm font-medium text-muted-foreground">
        {setIndex + 1}
      </div>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Weight
        <Input
          dir="ltr"
          type="number"
          value={set.weight}
          disabled={set.completed}
          onChange={(event) =>
            updateSet(exerciseId, setIndex, "weight", event.target.value)
          }
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Reps
        <Input
          dir="ltr"
          type="number"
          value={set.reps}
          disabled={set.completed}
          onChange={(event) =>
            updateSet(exerciseId, setIndex, "reps", event.target.value)
          }
        />
      </label>
      <div className="flex h-8 items-center justify-center">
        <Checkbox
          checked={set.completed}
          disabled={!set.completed && !isValid}
          onCheckedChange={(checked) => toggleComplete(Boolean(checked))}
        />
      </div>
      {!set.completed && !isValid && set.targetWeight && (
        <div className="col-span-4 flex items-center gap-1 text-xs text-destructive">
          <LockIcon className="size-3" />
          {set.requiresWeightIncrease
            ? `Lift more than ${set.targetWeight}`
            : `Target ${set.targetWeight} x ${set.targetReps}`}
        </div>
      )}
    </div>
  )
}

function buildInitialSession(
  day: WorkoutPlanDay,
  lastWorkout?: WorkoutRecord
): SessionData {
  const data: SessionData = {}

  for (const superset of workoutPlan[day]) {
    for (const exercise of superset.exercises) {
      data[exercise.id] = Array.from({ length: exercise.sets }, (_, index) => {
        const lastSet = lastWorkout?.exercises[exercise.id]?.[index]
        const lastReps = Number(lastSet?.reps)
        const hitMaxReps =
          Number.isFinite(lastReps) && lastReps >= exercise.maxReps

        return {
          weight: lastSet?.weight ?? "",
          reps: hitMaxReps
            ? String(exercise.minReps)
            : String(
                Number.isFinite(lastReps)
                  ? Math.min(lastReps + 1, exercise.maxReps)
                  : exercise.minReps
              ),
          targetWeight: lastSet?.weight ?? "",
          targetReps: hitMaxReps
            ? exercise.minReps
            : Number.isFinite(lastReps)
              ? Math.min(lastReps + 1, exercise.maxReps)
              : exercise.minReps,
          requiresWeightIncrease: hitMaxReps,
          completed: false,
        }
      })
    }
  }

  return data
}

function isSetValid(set: SetLog) {
  if (!set.targetWeight) {
    return true
  }

  const currentWeight = Number(set.weight)
  const currentReps = Number(set.reps)
  const targetWeight = Number(set.targetWeight)

  if (set.requiresWeightIncrease) {
    return currentWeight > targetWeight
  }

  return (
    (currentWeight === targetWeight && currentReps >= set.targetReps) ||
    currentWeight > targetWeight
  )
}

function formatTimer(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
}
