import { RoutinePlanner } from "@/components/routine-planner"

export default function Page() {
  const today = new Date().toISOString().slice(0, 10)

  return <RoutinePlanner initialStartDate={today} />
}
