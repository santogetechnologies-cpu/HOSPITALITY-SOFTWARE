import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BedDouble,
  LogIn,
  LogOut,
  DoorOpen,
  IndianRupee,
  TrendingUp,
  Wallet,
  PercentCircle,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { KpiCard, PageHeader, Panel, Pill, ProgressBar, RoomCard, StatusLegend } from "@/components/pms/bits";
import { Button } from "@/components/ui/button";
import { usePms } from "@/lib/pms-store";
import { OCCUPANCY_TREND, inr, STATUS_META, type Room } from "@/lib/pms-data";
import { toast } from "sonner";
import { RoomDrawer } from "@/components/pms/room-drawer";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — DRB Hotel PMS" },
      {
        name: "description",
        content:
          "Live DRB Hotel operations dashboard: occupancy, arrivals, departures, ADR, RevPAR, revenue and room status.",
      },
      { property: "og:title", content: "DRB Hotel — Today's Operations" },
      {
        property: "og:description",
        content: "Occupancy, arrivals, departures, housekeeping and revenue at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { rooms, reservations, hkTasks, session, checkIn, checkOut, setTaskStage } = usePms();
  const navigate = useNavigate();
  const [openRoom, setOpenRoom] = React.useState<Room | null>(null);

  const occupied = rooms.filter((r) => r.status === "occupied").length;
  const reserved = rooms.filter((r) => r.status === "reserved").length;
  const vacant = rooms.filter((r) => r.status === "vacant-clean" || r.status === "vacant-dirty").length;
  const blocked = rooms.filter((r) => ["ooo", "oos", "maintenance"].includes(r.status)).length;
  const occPct = Math.round((occupied / rooms.length) * 100);

  const arrivals = reservations.filter((r) => r.status === "Confirmed" || r.status === "Tentative").slice(0, 6);
  const departures = reservations.filter((r) => r.status === "Checked In").slice(0, 5);
  const adr = 4780;
  const revenue = occupied * adr + 184000 * 0.35;

  const donut = [
    { name: "Occupied", value: occupied, color: "var(--st-occupied)" },
    { name: "Reserved", value: reserved, color: "var(--st-reserved)" },
    { name: "Vacant", value: vacant, color: "var(--st-vacant-clean)" },
    { name: "Out of Order", value: blocked, color: "var(--st-ooo)" },
  ];

  const hour = 9;
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  return (
    <>
      <PageHeader
        eyebrow="DRB Hotel — Today's Operations"
        title={`${greeting}, ${session?.name.split(" ")[0] ?? "Manager"}`}
        subtitle="Wednesday, 12 August 2026 · Business date open · 25 keys"
        actions={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => void navigate({ to: "/front-desk" })}>
              Front Desk
            </Button>
            <Button
              className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90"
              onClick={() => void navigate({ to: "/reservations/new" })}
            >
              New Reservation
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Occupancy" value={`${occPct}%`} delta="+4.2%" hint="vs yesterday" icon={PercentCircle} tone="gold" />
        <KpiCard label="Today's Arrivals" value={String(arrivals.length)} delta="+2" hint="vs last week" icon={LogIn} tone="info" />
        <KpiCard label="Today's Departures" value={String(departures.length)} delta="-1" hint="vs yesterday" icon={LogOut} tone="warning" />
        <KpiCard label="Rooms Available" value={String(vacant)} hint={`${blocked} blocked`} icon={DoorOpen} tone="success" />
        <KpiCard label="ADR" value={inr(adr)} delta="+3.1%" hint="vs last week" icon={IndianRupee} tone="gold" />
        <KpiCard label="RevPAR" value={inr(Math.round(adr * (occPct / 100)))} delta="+6.4%" hint="vs last week" icon={TrendingUp} tone="success" />
        <KpiCard label="Today's Revenue" value={inr(revenue)} delta="+8.7%" hint="vs yesterday" icon={Wallet} tone="info" />
        <KpiCard label="Outstanding Dues" value={inr(148600)} delta="-2.4%" hint="12 open folios" icon={IndianRupee} tone="destructive" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Panel title="Occupancy & rate trend" description="Rolling 7 days — occupancy %, ADR and RevPAR">
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={OCCUPANCY_TREND} margin={{ left: -18, right: 8, top: 10 }}>
                <defs>
                  <linearGradient id="occFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="revparFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <RTooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="occ" name="Occupancy %" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#occFill)" />
                <Area type="monotone" dataKey="revpar" name="RevPAR" stroke="var(--chart-2)" strokeWidth={2} fill="url(#revparFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Room mix" description="Live inventory split across 25 keys">
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-[190px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donut} dataKey="value" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">
                    {donut.map((d) => (
                      <Cell key={d.name} fill={d.color} />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-2xl font-semibold">{occPct}%</div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Occupied</div>
                </div>
              </div>
            </div>
            <ul className="w-full space-y-2">
              {donut.map((d) => (
                <li key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-semibold tabular-nums">{d.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Panel
          title="Arrivals"
          description={`${arrivals.length} expected today`}
          action={<Pill tone="info">ETA sorted</Pill>}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {arrivals.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-semibold">{r.guest}</span>
                    {r.vip ? <Pill tone="gold">VIP</Pill> : null}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Room {r.room} · ETA {r.eta} · {r.source}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Pill tone={r.payment === "Paid" ? "success" : r.payment === "Partial" ? "warning" : "destructive"}>
                    {r.payment}
                  </Pill>
                  <Button
                    size="sm"
                    className="rounded-lg"
                    onClick={() => {
                      checkIn(r.id);
                      toast.success(`${r.guest} checked in to room ${r.room}`);
                    }}
                  >
                    Check In
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Departures" description={`${departures.length} in-house checking out`} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {departures.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{r.guest}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    Room {r.room} · Checkout 11:00 · Folio {inr(r.amount - r.paid)}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 rounded-lg"
                  onClick={() => {
                    checkOut(r.id);
                    toast.success(`${r.guest} checked out — room ${r.room} sent to housekeeping`);
                  }}
                >
                  Check Out
                </Button>
              </li>
            ))}
            {!departures.length ? (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                All departures settled for today.
              </li>
            ) : null}
          </ul>
        </Panel>

        <Panel title="Housekeeping" description="Live cleaning pipeline" bodyClassName="p-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Rooms to clean", value: hkTasks.filter((t) => t.stage === "Dirty" || t.stage === "Assigned").length, tone: "warning" as const },
              { label: "Cleaning", value: hkTasks.filter((t) => t.stage === "Cleaning").length, tone: "info" as const },
              { label: "Ready", value: hkTasks.filter((t) => t.stage === "Ready").length, tone: "success" as const },
              { label: "Maintenance", value: rooms.filter((r) => r.status === "maintenance" || r.status === "ooo").length, tone: "destructive" as const },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-secondary/50 p-3">
                <div className="text-xl font-semibold">{s.value}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-3">
            {hkTasks.slice(0, 4).map((t) => (
              <div key={t.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Room {t.room}</span>
                  <Pill tone={t.stage === "Ready" ? "success" : t.stage === "Cleaning" ? "info" : "warning"}>
                    {t.stage}
                  </Pill>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {t.kind} · {t.assignee}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 rounded-lg text-xs"
                    onClick={() => {
                      setTaskStage(t.id, "Cleaning");
                      toast.info(`Cleaning started in room ${t.room}`);
                    }}
                  >
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-lg text-xs"
                    onClick={() => {
                      setTaskStage(t.id, "Ready");
                      toast.success(`Room ${t.room} marked ready`);
                    }}
                  >
                    Mark Ready
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <Button variant="ghost" className="mt-3 w-full" onClick={() => void navigate({ to: "/housekeeping" })}>
            Open housekeeping board <ArrowUpRight className="ml-1 size-4" />
          </Button>
        </Panel>
      </div>

      <Panel
        title="Room status overview"
        description="All 25 keys — click any room to open its details"
        action={<Pill tone="muted">{occupied} occupied · {vacant} vacant</Pill>}
      >
        <div className="mb-4">
          <StatusLegend />
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-8 md:grid-cols-10 xl:grid-cols-13">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} compact onClick={() => setOpenRoom(r)} />
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {(["vacant-clean", "occupied", "vacant-dirty", "reserved"] as const).map((s) => {
            const count = rooms.filter((r) => r.status === s).length;
            return (
              <div key={s} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{STATUS_META[s].label}</span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={(count / rooms.length) * 100} tone={s === "occupied" ? "info" : s === "vacant-clean" ? "success" : "warning"} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Revenue by source" description="Room nights booked this week">
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: "Direct", value: 63 },
                  { name: "Booking", value: 48 },
                  { name: "MMT", value: 36 },
                  { name: "Goibibo", value: 21 },
                  { name: "Agoda", value: 17 },
                  { name: "Corp", value: 14 },
                ]}
                margin={{ left: -20, top: 10 }}
              >
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <RTooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 }}
                />
                <Bar dataKey="value" name="Room nights" fill="var(--chart-1)" radius={[8, 8, 0, 0]} maxBarSize={42} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Shift notes" description="Handover log from the previous shift">
          <ul className="space-y-3 text-sm">
            {[
              { icon: Sparkles, text: "Suite 505 flowers refreshed for VIP arrival at 15:30." },
              { icon: BedDouble, text: "Room 108 blocked — AC replacement scheduled 14:00." },
              { icon: Wallet, text: "Corporate folio for Meridian Corp to be routed to city ledger." },
              { icon: LogIn, text: "Group of 6 from MakeMyTrip arriving late (ETA 23:15)." },
            ].map((n, i) => (
              <li key={i} className="flex gap-3 rounded-xl border border-border bg-secondary/40 p-3">
                <n.icon className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <RoomDrawer room={openRoom} onOpenChange={(o: boolean) => {
          if (!o) setOpenRoom(null);
        }} />
    </>
  );
}
