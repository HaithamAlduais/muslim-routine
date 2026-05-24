import type { Weekday } from "./types"

export type WorkoutPlanDay = "Day 1" | "Day 2"

export type WorkoutExercise = {
  id: string
  name: string
  sets: number
  minReps: number
  maxReps: number
}

export type WorkoutSuperset = {
  id: string
  title: string
  restTime: number
  exercises: WorkoutExercise[]
}

export const workoutPlan: Record<WorkoutPlanDay, WorkoutSuperset[]> = {
  "Day 1": [
    {
      id: "d1_s1",
      title: "Superset 1: The Squat Rack",
      restTime: 90,
      exercises: [
        { id: "squats", name: "Squats", sets: 3, minReps: 6, maxReps: 8 },
        {
          id: "pullups",
          name: "Pull-ups / Rack Chins",
          sets: 3,
          minReps: 6,
          maxReps: 8,
        },
      ],
    },
    {
      id: "d1_s2",
      title: "Superset 2: The Dumbbell Area",
      restTime: 90,
      exercises: [
        {
          id: "upper_chest_db",
          name: "Upper Chest DB Press",
          sets: 3,
          minReps: 6,
          maxReps: 8,
        },
        {
          id: "db_rdl",
          name: "Dumbbell RDLs",
          sets: 2,
          minReps: 8,
          maxReps: 10,
        },
      ],
    },
    {
      id: "d1_s3",
      title: "Superset 3: The Cable Tower",
      restTime: 60,
      exercises: [
        {
          id: "tri_pushdowns",
          name: "Triceps Pushdowns",
          sets: 2,
          minReps: 8,
          maxReps: 10,
        },
        {
          id: "cable_curls",
          name: "Cable Bicep Curls",
          sets: 2,
          minReps: 6,
          maxReps: 8,
        },
      ],
    },
    {
      id: "d1_s4",
      title: "Superset 4: Free Space",
      restTime: 60,
      exercises: [
        {
          id: "lat_raises",
          name: "Lateral Deltoid Raises",
          sets: 2,
          minReps: 6,
          maxReps: 8,
        },
        {
          id: "db_shrugs",
          name: "Dumbbell Shrugs",
          sets: 2,
          minReps: 8,
          maxReps: 8,
        },
      ],
    },
  ],
  "Day 2": [
    {
      id: "d2_s1",
      title: "Superset 1: The Flat Bench",
      restTime: 90,
      exercises: [
        {
          id: "mid_chest_db",
          name: "Mid Chest DB Press",
          sets: 3,
          minReps: 6,
          maxReps: 8,
        },
        {
          id: "db_rows",
          name: "Dumbbell Upper Back Rows",
          sets: 3,
          minReps: 6,
          maxReps: 8,
        },
      ],
    },
    {
      id: "d2_s2",
      title: "Superset 2: Leg & Arm Combo",
      restTime: 90,
      exercises: [
        {
          id: "one_leg_squats",
          name: "One-Leg / Split Squats",
          sets: 3,
          minReps: 6,
          maxReps: 8,
        },
        {
          id: "hammer_curls",
          name: "Hammer Curls",
          sets: 2,
          minReps: 8,
          maxReps: 10,
        },
      ],
    },
    {
      id: "d2_s3",
      title: "Superset 3: Hip Thrust Station",
      restTime: 60,
      exercises: [
        {
          id: "hip_thrusts",
          name: "Hip Thrusts",
          sets: 2,
          minReps: 6,
          maxReps: 8,
        },
        {
          id: "rear_delt_flys",
          name: "Rear Delt DB Flys",
          sets: 2,
          minReps: 8,
          maxReps: 10,
        },
      ],
    },
    {
      id: "d2_s4",
      title: "Superset 4: The Leg Curl Machine",
      restTime: 60,
      exercises: [
        {
          id: "ham_curls",
          name: "Hamstring Curls",
          sets: 2,
          minReps: 6,
          maxReps: 8,
        },
        {
          id: "calf_raises",
          name: "Standing Calf Raises",
          sets: 2,
          minReps: 6,
          maxReps: 8,
        },
      ],
    },
    {
      id: "d2_s5",
      title: "Standalone Finisher",
      restTime: 60,
      exercises: [
        {
          id: "abductors",
          name: "Hip Abductor & Adductor",
          sets: 2,
          minReps: 8,
          maxReps: 10,
        },
      ],
    },
  ],
}

export const workoutScheduleTemplates: Array<{
  day: Weekday
  planDay: WorkoutPlanDay
  templateId: string
  title: string
}> = [
  {
    day: 0,
    planDay: "Day 1",
    templateId: "overload-day-1",
    title: "Overload Tracker - Day 1",
  },
  {
    day: 2,
    planDay: "Day 2",
    templateId: "overload-day-2",
    title: "Overload Tracker - Day 2",
  },
]

export function workoutChecklist(planDay: WorkoutPlanDay) {
  return workoutPlan[planDay].map(
    (superset) =>
      `${superset.title}: ${superset.exercises
        .map((exercise) => exercise.name)
        .join(" + ")}`
  )
}

export function workoutHrefForTemplate(templateId: string | null) {
  const schedule = workoutScheduleTemplates.find(
    (item) => item.templateId === templateId
  )

  return schedule
    ? `/workout?day=${encodeURIComponent(schedule.planDay)}`
    : null
}
