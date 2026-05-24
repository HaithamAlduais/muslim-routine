import { OverloadTracker } from "@/components/overload-tracker"
import type { WorkoutPlanDay } from "@/lib/workout-plan"

type WorkoutPageProps = {
  searchParams: Promise<{
    day?: string
  }>
}

export default async function WorkoutPage({ searchParams }: WorkoutPageProps) {
  const params = await searchParams
  const initialDay: WorkoutPlanDay = params.day === "Day 2" ? "Day 2" : "Day 1"

  return <OverloadTracker initialDay={initialDay} />
}
