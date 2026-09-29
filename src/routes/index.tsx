import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePms, useHydrated } from "@/lib/pms-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ShieldCheck, Sparkles, BedDouble, ArrowRight, KeyRound } from "lucide-react";
import { drbLogo } from "@/lib/assets";

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
      { property: "og:image", content: drbLogo },
      { name: "twitter:image", content: drbLogo },
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
          <div className="flex items-center gap-3.5">
            <img
              src={drbLogo}
              alt="DRB Hotel"
              className="size-14 rounded-2xl bg-sidebar-accent/60 p-1.5 object-contain shadow-soft"
            />
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
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img
              src={drbLogo}
              alt="DRB Hotel"
              className="size-12 rounded-xl bg-card border border-border p-1 object-contain shadow-sm"
            />
            <div>
              <div className="text-display text-2xl font-semibold tracking-[0.16em]">DRB HOTEL</div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Property Management System
              </div>
            </div>
          </div>

          <div className="eyebrow">Staff Sign In</div>
          <h2 className="mt-2 text-3xl font-semibold">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to access your property management workspace.
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Email Address / Staff Username</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="drbhoteladmin@drb.com or admin"
                autoComplete="username"
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password / PIN</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-11"
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
              className="h-11 w-full rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90 font-semibold"
            >
              {loading ? "Signing in…" : "Sign in to PMS"}
              {!loading ? <ArrowRight className="ml-1 size-4" /> : null}
            </Button>
          </form>

          {/* Quick Staff Sign-In Pills */}
          <div className="mt-6 border-t border-border pt-4">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
              Quick Role Sign-In
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={async () => {
                  setUsername("drbhoteladmin@drb.com");
                  setPassword("admin123");
                  setLoading(true);
                  const { session: s, error: authErr } = await login("drbhoteladmin@drb.com", "admin123");
                  setLoading(false);
                  if (s) {
                    toast.success("Signed in as Super Admin");
                    void navigate({ to: "/dashboard" });
                  } else {
                    setError(authErr);
                  }
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-secondary/40 hover:bg-gold/15 hover:border-gold/50 transition-colors text-center group"
              >
                <span className="text-xs font-semibold text-foreground group-hover:text-gold">Super Admin</span>
                <span className="text-[10px] text-muted-foreground">Full Access</span>
              </button>
              
              <button
                type="button"
                onClick={async () => {
                  setUsername("drbgm@gmail.com");
                  setPassword("00");
                  setLoading(true);
                  const { session: s, error: authErr } = await login("drbgm@gmail.com", "00");
                  setLoading(false);
                  if (s) {
                    toast.success("Signed in as General Manager");
                    void navigate({ to: "/dashboard" });
                  } else {
                    setError(authErr);
                  }
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-secondary/40 hover:bg-gold/15 hover:border-gold/50 transition-colors text-center group"
              >
                <span className="text-xs font-semibold text-foreground group-hover:text-gold">Manager</span>
                <span className="text-[10px] text-muted-foreground">Operations</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  setUsername("drbreception@gmail.com");
                  setPassword("00");
                  setLoading(true);
                  const { session: s, error: authErr } = await login("drbreception@gmail.com", "00");
                  setLoading(false);
                  if (s) {
                    toast.success("Signed in as Front Desk");
                    void navigate({ to: "/dashboard" });
                  } else {
                    setError(authErr);
                  }
                }}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl border border-border bg-secondary/40 hover:bg-gold/15 hover:border-gold/50 transition-colors text-center group"
              >
                <span className="text-xs font-semibold text-foreground group-hover:text-gold">Front Desk</span>
                <span className="text-[10px] text-muted-foreground">Reception</span>
              </button>
            </div>
          </div>

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
