import { RoutinePlanner } from "@/components/routine-planner"

export default function Page() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Riyadh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())

  return <RoutinePlanner initialStartDate={today} />
}
