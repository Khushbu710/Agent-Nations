// app/page.tsx  — Dashboard (Server Component shell)
import { DashboardShell } from "@/components/dashboard/DashboardShell";

// Attempt to fetch initial world state from the backend at SSR time.
// If backend is unreachable, initial is null and the client polling takes over.
async function getInitialSnapshot() {
  try {
    const base = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";
    const res  = await fetch(`${base}/api/snapshot`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const initial = await getInitialSnapshot();

  return <DashboardShell initial={initial} />;
}
