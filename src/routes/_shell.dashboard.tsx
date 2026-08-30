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
  const { rooms, reservations, payments, tickets, guests, session, checkIn, checkOut } = usePms();
  const navigate = useNavigate();
  const [openRoom, setOpenRoom] = React.useState<Room | null>(null);

  const occupied = rooms.filter((r) => r.status === "OCCUPIED").length;
  const reserved = rooms.filter((r) => r.status === "BOOKED").length;
  const vacant = rooms.filter((r) => r.status === "AVAILABLE").length;
  const dirty = rooms.filter((r) => r.status === "DIRTY").length;
  const cleaning = rooms.filter((r) => r.status === "CLEANING").length;
  const blocked = rooms.filter((r) => ["OUT OF SERVICE", "MAINTENANCE"].includes(r.status)).length;
  const totalKeys = rooms.length;
  const occPct = totalKeys > 0 ? Math.round((occupied / totalKeys) * 100) : 0;

  const arrivals = reservations.filter((r) => r.resource_type === "ROOM" && (r.status === "CONFIRMED" || r.status === "PENDING")).slice(0, 6);
  const departures = reservations.filter((r) => r.resource_type === "ROOM" && r.status === "OCCUPIED").slice(0, 5);

  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED');
  const avgRoomPrice = totalKeys > 0 ? Math.round(rooms.reduce((acc, r) => acc + (r.price || (r as any).rate || 0), 0) / totalKeys) : 0;
  const adr = occupied > 0 ? Math.round(occupiedRooms.reduce((acc, r) => acc + (r.price || (r as any).rate || 0), 0) / occupied) : avgRoomPrice;
  const revpar = totalKeys > 0 ? Math.round((adr * occupied) / totalKeys) : 0;

  const todayRevenue = payments.reduce((acc, p) => acc + (p.paid_amount || 0), 0);
  const pendingPayments = payments.filter(p => p.status === 'PENDING' || p.status === 'PARTIAL');
  const outstandingDues = pendingPayments.reduce((acc, p) => acc + Math.max(0, (p.total_amount || 0) - (p.paid_amount || 0)), 0);

  const donut = [
    { name: "Occupied", value: occupied, color: "var(--indigo-500, #6366f1)" },
    { name: "Reserved", value: reserved, color: "var(--blue-500, #3b82f6)" },
    { name: "Vacant", value: vacant, color: "var(--emerald-500, #10b981)" },
    { name: "Dirty / Cleaning", value: dirty + cleaning, color: "var(--warning, #f59e0b)" },
    { name: "Out of Order", value: blocked, color: "var(--slate-500, #64748b)" },
  ];

  const safeDonut = totalKeys > 0 ? donut : [{ name: "No Rooms", value: 1, color: "var(--border)" }];

  const curHour = new Date().getHours();
  const greeting = curHour < 12 ? "Good Morning" : curHour < 17 ? "Good Afternoon" : "Good Evening";
  const todayLong = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader
        eyebrow="DRB Hotel — Today's Operations"
        title={`${greeting}, ${session?.name ? session.name.split(" ")[0] : "Manager"}`}
        subtitle={`${todayLong} · Live Operations · ${totalKeys} keys`}
        actions={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => void navigate({ to: "/front-desk" })}>
              Front Desk
            </Button>
            <Button
              className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90"
              onClick={() => void navigate({ to: "/front-desk" })}
            >
              Book Room
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Occupancy" value={`${occPct}%`} hint={`${occupied} of ${totalKeys} rooms`} icon={PercentCircle} tone="gold" />
        <KpiCard label="Today's Arrivals" value={String(arrivals.length)} hint="Queue at desk" icon={LogIn} tone="info" />
        <KpiCard label="Today's Departures" value={String(departures.length)} hint="Folios in-house" icon={LogOut} tone="warning" />
        <KpiCard label="Rooms Available" value={String(vacant)} hint={`${blocked} out of order`} icon={DoorOpen} tone="success" />
        <KpiCard label="ADR" value={inr(adr)} hint="Average Daily Rate" icon={IndianRupee} tone="gold" />
        <KpiCard label="RevPAR" value={inr(revpar)} hint="Revenue Per Room" icon={TrendingUp} tone="success" />
        <KpiCard label="Total Revenue Collected" value={inr(todayRevenue)} hint="Settled folios" icon={Wallet} tone="info" />
        <KpiCard label="Outstanding Dues" value={inr(outstandingDues)} hint={`${pendingPayments.length} open folios`} icon={IndianRupee} tone="destructive" />
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
                  <Pie data={safeDonut} dataKey="value" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">
                    {safeDonut.map((d) => (
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
            {arrivals.map((r) => {
              const guestName = guests.find(g => g.id === r.guest_id)?.name || "Unknown";
              const roomNum = rooms.find(rm => rm.id === r.room_id)?.room_number || "TBD";
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold">{guestName}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Room {roomNum} · Date: {r.booking_date}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg"
                      onClick={() => {
                        checkIn(r.id);
                        toast.success(`${guestName} checked in to room ${roomNum}`);
                      }}
                    >
                      Check In
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="Departures" description={`${departures.length} in-house checking out`} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {departures.map((r) => {
              const guestName = guests.find(g => g.id === r.guest_id)?.name || "Unknown";
              const roomNum = rooms.find(rm => rm.id === r.room_id)?.room_number || "TBD";
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{guestName}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      Room {roomNum} · Checkout 11:00
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 rounded-lg"
                    onClick={() => {
                      checkOut(r.id);
                      toast.success(`${guestName} checked out — room ${roomNum} sent to housekeeping`);
                    }}
                  >
                    Check Out
                  </Button>
                </li>
              );
            })}
            {!departures.length ? (
              <li className="px-5 py-10 text-center text-sm text-muted-foreground">
                All departures settled for today.
              </li>
            ) : null}
          </ul>
        </Panel>

        <Panel title="Housekeeping" description="Live room statuses" bodyClassName="p-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Dirty Rooms", value: rooms.filter((r) => r.status === "DIRTY").length, tone: "warning" as const },
              { label: "Cleaning", value: rooms.filter((r) => r.status === "CLEANING").length, tone: "info" as const },
              { label: "Available", value: rooms.filter((r) => r.status === "AVAILABLE").length, tone: "success" as const },
              { label: "Maintenance", value: rooms.filter((r) => ["OUT OF SERVICE", "MAINTENANCE"].includes(r.status)).length, tone: "destructive" as const },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-secondary/50 p-3">
                <div className="text-xl font-semibold">{s.value}</div>
                <div className="text-[11px] text-muted-foreground">{s.label}</div>
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
        description={`All ${totalKeys} keys — click any room to inspect or change its status`}
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
          {(["AVAILABLE", "OCCUPIED", "DIRTY", "BOOKED"] as const).map((s) => {
            const count = rooms.filter((r) => r.status === s).length;
            return (
              <div key={s} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{STATUS_META[s].label}</span>
                  <span className="font-semibold tabular-nums">{count}</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={(count / (rooms.length || 1)) * 100} tone={s === "OCCUPIED" ? "info" : s === "AVAILABLE" ? "success" : "warning"} />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Active Maintenance & Front Desk Log" description="Open tickets and room alerts">
          <ul className="space-y-3 text-sm">
            {tickets.filter(t => t.status !== 'RESOLVED').length > 0 ? (
              tickets.filter(t => t.status !== 'RESOLVED').slice(0, 4).map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 p-3">
                  <div className="flex items-center gap-3">
                    <BedDouble className="size-4 shrink-0 text-gold" />
                    <div>
                      <div className="font-semibold text-foreground">{t.issue}</div>
                      <div className="text-xs text-muted-foreground">Assigned: {t.assignee || 'Engineering'}</div>
                    </div>
                  </div>
                  <Pill tone={t.priority === 'HIGH' ? 'destructive' : 'warning'}>{t.priority}</Pill>
                </li>
              ))
            ) : (
              <li className="flex gap-3 rounded-xl border border-border bg-secondary/40 p-4 text-muted-foreground">
                <Sparkles className="mt-0.5 size-4 shrink-0 text-gold" />
                <span>All facilities and rooms operating in pristine condition. No active maintenance alerts.</span>
              </li>
            )}
          </ul>
        </Panel>

        <Panel title="Revenue Breakdown by Category" description="Split across live bookings">
          <div className="space-y-4 p-2">
            <div className="flex justify-between items-center text-sm border-b border-border pb-2">
              <span className="text-muted-foreground">Room Stays & Lodging</span>
              <span className="font-bold text-foreground">{inr(todayRevenue)}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-border pb-2">
              <span className="text-muted-foreground">Party Hall & Banquets</span>
              <span className="font-bold text-foreground">{inr(reservations.filter(r => r.resource_type === 'PARTY_HALL').reduce((a, b) => a + (b.base_amount || 0), 0))}</span>
            </div>
            <div className="flex justify-between items-center text-sm border-b border-border pb-2">
              <span className="text-muted-foreground">Outstanding Uncollected Balance</span>
              <span className="font-bold text-warning">{inr(outstandingDues)}</span>
            </div>
            <Button variant="outline" className="w-full mt-2" onClick={() => void navigate({ to: "/payment-history" })}>
              View Full Payment Audit Ledger
            </Button>
          </div>
        </Panel>
      </div>

      <RoomDrawer room={openRoom} onOpenChange={(o: boolean) => {
          if (!o) setOpenRoom(null);
        }} />
    </>
  );
}
