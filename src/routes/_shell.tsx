import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "@/components/pms/shell";
import { usePms, useHydrated } from "@/lib/pms-store";

export const Route = createFileRoute("/_shell")({
  component: ShellLayout,
});

function ShellLayout() {
  const { session } = usePms();
  const hydrated = useHydrated();
  const navigate = useNavigate();

  useEffect(() => {
    if (hydrated && !session) void navigate({ to: "/" });
  }, [hydrated, session, navigate]);

  if (!hydrated || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-center">
          <span className="mx-auto grid size-12 animate-pulse place-items-center rounded-xl bg-brass text-xs font-bold text-gold-foreground">
            DRB
          </span>
          <p className="mt-4 text-sm text-muted-foreground">Loading DRB Hotel PMS…</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
