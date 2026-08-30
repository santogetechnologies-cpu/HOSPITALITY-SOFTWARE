import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePms, useHydrated } from "@/lib/pms-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ShieldCheck, Sparkles, BedDouble, ArrowRight, KeyRound } from "lucide-react";

// DRB Hotel PMS Sign In Route
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DRB Hotel PMS — Property Management System Login" },
      {
        name: "description",
        content:
          "Sign in to DRB Hotel's Property Management System. Front desk, housekeeping, revenue and finance operations in one premium workspace.",
      },
      { property: "og:title", content: "DRB Hotel PMS — Property Management System" },
      {
        property: "og:description",
        content:
          "Premium hotel property management: reservations, front desk, room status, housekeeping, revenue and night audit.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { login, signUp, session } = usePms();
  const hydrated = useHydrated();
  const navigate = useNavigate();
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (hydrated && session) void navigate({ to: "/dashboard" });
  }, [hydrated, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    const { session: s, error: authError } = await login(username, password);
      
    setLoading(false);
    
    if (!s) {
      setError(authError || "Invalid credentials or error during authentication.");
      return;
    }
    
    toast.success(`Welcome back, ${s.name.split(" ")[0]}`, {
      description: `Signed in as ${s.roleLabel}`,
    });
    void navigate({ to: "/dashboard" });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-midnight p-12 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute -right-24 top-10 size-96 rounded-full opacity-25 blur-3xl"
          style={{ background: "var(--gradient-brass)" }}
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-brass text-sm font-bold text-gold-foreground">
              DRB
            </span>
            <div>
              <div className="text-display text-2xl font-semibold tracking-[0.16em]">DRB HOTEL</div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-gold">
                Property Management System
              </div>
            </div>
          </div>
        </div>

        <div className="relative max-w-lg">
          <h1 className="text-display text-5xl font-semibold leading-tight">
            Run the entire property from one refined workspace.
          </h1>
          <p className="mt-5 text-sm leading-relaxed text-primary-foreground/70">
            Reservations, front desk, live room status, housekeeping boards, folios, GST invoicing,
            revenue intelligence and night audit — designed for the pace of a real hotel floor.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              { icon: BedDouble, label: "25 rooms", sub: "Live status grid" },
              { icon: Sparkles, label: "Housekeeping", sub: "Board & inspections" },
              { icon: ShieldCheck, label: "Compliance", sub: "GST & C-Form ready" },
            ].map((f) => (
              <div
                key={f.label}
                className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/40 p-4"
              >
                <f.icon className="size-4 text-gold" />
                <div className="mt-3 text-sm font-semibold">{f.label}</div>
                <div className="text-[11px] text-primary-foreground/60">{f.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-primary-foreground/50">
          Demo environment · Sample data only · No live integrations
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-5 py-12 md:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <div className="text-display text-2xl font-semibold tracking-[0.16em]">DRB HOTEL</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Property Management System
            </div>
          </div>

          <div className="eyebrow">Staff Sign In</div>
          <h2 className="mt-2 text-3xl font-semibold">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your property management workspace.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Email Address</Label>
              <Input
                id="username"
                type="email"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin@hotel.com"
                autoComplete="username"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-11"
                required
              />
            </div>
            {error ? (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
                {error}
              </p>
            ) : null}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90"
            >
              {loading ? "Signing in…" : "Sign in to PMS"}
              {!loading ? <ArrowRight className="ml-1 size-4" /> : null}
            </Button>
          </form>

          <div className="mt-8">
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              Trouble signing in? Visit <Link to="/help" className="underline">Help & Support</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
