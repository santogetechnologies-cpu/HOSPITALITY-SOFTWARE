import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
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
  CalendarDays,
  QrCode,
  CreditCard,
  Banknote,
  Landmark,
  Receipt,
} from "lucide-react";
import { KpiCard, PageHeader, Panel, Pill, ProgressBar, RoomCard, StatusLegend } from "@/components/pms/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePms } from "@/lib/pms-store";
import { inr, STATUS_META, type Room } from "@/lib/pms-data";
import { toast } from "sonner";
import { RoomDrawer } from "@/components/pms/room-drawer";

export const Route = createFileRoute("/_shell/dashboard")({
  head: () => ({
    meta: [
      { title: "Operations Dashboard — DRB Hotel PMS" },
      {
        name: "description",
        content:
          "Live DRB Hotel operations dashboard: occupancy, arrivals, departures, ADR, RevPAR, revenue and room inventory.",
      },
      { property: "og:title", content: "DRB Hotel — Live Operations" },
    ],
  }),
  component: Dashboard,
});

type Timeframe = "1D" | "1W" | "1M" | "CUSTOM";

function Dashboard() {
  const { rooms, reservations, payments, discounts, tickets, guests, session, checkIn, checkOut } = usePms();
  const navigate = useNavigate();
  const [openRoom, setOpenRoom] = React.useState<Room | null>(null);

  // Timeframe filter state
  const todayStr = new Date().toISOString().split("T")[0];
  const [timeframe, setTimeframe] = React.useState<Timeframe>("1W");
  const [customStart, setCustomStart] = React.useState<string>(todayStr);
  const [customEnd, setCustomEnd] = React.useState<string>(todayStr);

  // Compute Active Date Range
  const { startDate, endDate, dateRangeLabel } = React.useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    let label = "Last 7 Days";

    if (timeframe === "1D") {
      label = "Today";
    } else if (timeframe === "1W") {
      start.setDate(start.getDate() - 6);
      label = "Last 7 Days";
    } else if (timeframe === "1M") {
      start.setDate(start.getDate() - 29);
      label = "Last 30 Days";
    } else if (timeframe === "CUSTOM") {
      if (customStart) {
        const s = new Date(`${customStart}T00:00:00`);
        if (!isNaN(s.getTime())) start.setTime(s.getTime());
      }
      if (customEnd) {
        const e = new Date(`${customEnd}T23:59:59`);
        if (!isNaN(e.getTime())) end.setTime(e.getTime());
      }
      label = `${customStart} to ${customEnd}`;
    }

    return { startDate: start, endDate: end, dateRangeLabel: label };
  }, [timeframe, customStart, customEnd]);

  // Filtered Payments & Revenue for the period
  const filteredPayments = React.useMemo(() => {
    return payments.filter((p) => {
      const pDate = new Date(p.created_at || (p as any).date || todayStr);
      return pDate >= startDate && pDate <= endDate;
    });
  }, [payments, startDate, endDate, todayStr]);

  const periodRevenue = React.useMemo(() => {
    return filteredPayments.reduce((acc, p) => {
      const resDiscounts = (discounts || []).filter(
        (d) =>
          (d.reservation_id === p.reservation_id ||
            d.reservation_id?.toLowerCase() === p.reservation_id?.toLowerCase()) &&
          d.status === "APPROVED"
      );
      const approvedDisc = resDiscounts.reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);
      const res = reservations.find(
        (r) => r.id === p.reservation_id || r.id?.toLowerCase() === p.reservation_id?.toLowerCase()
      );
      const orig = Number(res?.base_amount) || Number(p.total_amount) || 0;
      if (approvedDisc > 0 && approvedDisc >= orig && orig > 0) {
        // 100% complimentary discount - no cash revenue collected
        return acc;
      }
      return acc + (Number(p.paid_amount) || 0);
    }, 0);
  }, [filteredPayments, discounts, reservations]);

  const periodDiscounts = React.useMemo(() => {
    return (discounts || [])
      .filter((d) => {
        if (d.status !== "APPROVED") return false;
        const dDate = new Date(d.created_at || (d as any).date || todayStr);
        return dDate >= startDate && dDate <= endDate;
      })
      .reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);
  }, [discounts, startDate, endDate, todayStr]);

  // Payment Breakdown by Method for GM and Front Desk
  const paymentBreakdown = React.useMemo(() => {
    let upi = { total: 0, count: 0 };
    let card = { total: 0, count: 0 };
    let cash = { total: 0, count: 0 };
    let bankTransfer = { total: 0, count: 0 };
    let other = { total: 0, count: 0 };

    filteredPayments.forEach((p) => {
      const amt = Number(p.paid_amount) || 0;
      if (amt <= 0) return;
      const method = String(p.payment_method || "CASH").toUpperCase();

      if (method.includes("UPI") || method.includes("GPAY") || method.includes("PHONEPE") || method.includes("QR") || method.includes("PAYTM")) {
        upi.total += amt;
        upi.count += 1;
      } else if (method.includes("CARD") || method.includes("POS") || method.includes("DEBIT") || method.includes("CREDIT")) {
        card.total += amt;
        card.count += 1;
      } else if (method.includes("CASH")) {
        cash.total += amt;
        cash.count += 1;
      } else if (method.includes("BANK") || method.includes("NEFT") || method.includes("RTGS") || method.includes("IMPS") || method.includes("TRANSFER")) {
        bankTransfer.total += amt;
        bankTransfer.count += 1;
      } else {
        other.total += amt;
        other.count += 1;
      }
    });

    const grandTotal = upi.total + card.total + cash.total + bankTransfer.total + other.total;

    return {
      upi,
      card,
      cash,
      bankTransfer,
      other,
      grandTotal,
    };
  }, [filteredPayments]);

  const pendingPayments = React.useMemo(() => {
    return payments.filter((p) => {
      const approvedDiscount = (discounts || [])
        .filter((d) => (d.reservation_id === p.reservation_id || d.reservation_id?.toLowerCase() === p.reservation_id?.toLowerCase()) && d.status === 'APPROVED')
        .reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);
      const total = Number(p.total_amount) || 0;
      const effectiveTotal = (approvedDiscount > 0 && total >= approvedDiscount) ? Math.max(0, total - approvedDiscount) : total;
      const paid = Number(p.paid_amount) || 0;
      return effectiveTotal - paid > 0 && p.status !== "COMPLETED";
    });
  }, [payments, discounts]);

  const outstandingDues = React.useMemo(() => {
    return pendingPayments.reduce((acc, p) => {
      const approvedDiscount = (discounts || [])
        .filter((d) => (d.reservation_id === p.reservation_id || d.reservation_id?.toLowerCase() === p.reservation_id?.toLowerCase()) && d.status === 'APPROVED')
        .reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);
      const total = Number(p.total_amount) || 0;
      const effectiveTotal = (approvedDiscount > 0 && total >= approvedDiscount) ? Math.max(0, total - approvedDiscount) : total;
      const paid = Number(p.paid_amount) || 0;
      return acc + Math.max(0, effectiveTotal - paid);
    }, 0);
  }, [pendingPayments, discounts]);

  // Room Inventory Breakdown
  const occupied = rooms.filter((r) => r.status === "OCCUPIED").length;
  const reserved = rooms.filter((r) => r.status === "BOOKED").length;
  const vacant = rooms.filter((r) => r.status === "AVAILABLE").length;
  const dirty = rooms.filter((r) => r.status === "DIRTY").length;
  const cleaning = rooms.filter((r) => r.status === "CLEANING").length;
  const blocked = rooms.filter((r) => ["OUT OF SERVICE", "MAINTENANCE"].includes(r.status)).length;
  const totalKeys = rooms.length;
  const occPct = totalKeys > 0 ? Math.round((occupied / totalKeys) * 100) : 0;

  const arrivals = reservations.filter(
    (r) => r.resource_type === "ROOM" && (r.status === "CONFIRMED" || r.status === "PENDING")
  ).slice(0, 6);
  const departures = reservations.filter(
    (r) => r.resource_type === "ROOM" && r.status === "OCCUPIED"
  ).slice(0, 5);

  const occupiedRooms = rooms.filter((r) => r.status === "OCCUPIED");
  const avgRoomPrice = totalKeys > 0 ? Math.round(rooms.reduce((acc, r) => acc + (r.price || (r as any).rate || 0), 0) / totalKeys) : 0;
  const adr = occupied > 0 ? Math.round(occupiedRooms.reduce((acc, r) => acc + (r.price || (r as any).rate || 0), 0) / occupied) : avgRoomPrice;
  const revpar = totalKeys > 0 ? Math.round((adr * occupied) / totalKeys) : 0;

  // Real Daily Trend Data based on exact calendar days
  const occupancyTrendData = React.useMemo(() => {
    const points: { day: string; revenue: number; occ: number }[] = [];
    const curr = new Date(startDate);
    const end = new Date(endDate);

    let count = 0;
    while (curr <= end && count <= 31) {
      const dStr = curr.toISOString().split("T")[0];
      const dShort = curr.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

      const dayRev = payments
        .filter((p) => (p.created_at || (p as any).date || todayStr).startsWith(dStr))
        .reduce((sum, p) => sum + (Number(p.paid_amount) || 0), 0);

      points.push({
        day: dShort,
        revenue: dayRev,
        occ: occPct,
      });

      curr.setDate(curr.getDate() + 1);
      count++;
    }
    return points;
  }, [startDate, endDate, payments, todayStr, occPct]);

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
  const todayLong = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Live Operations"
        title={`${greeting}, ${session?.name ? session.name.split(" ")[0] : "Manager"}`}
        subtitle={`${todayLong} · ${totalKeys} keys · Live Operations`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => void navigate({ to: "/front-desk" })}>
              Front Desk
            </Button>
            <Button
              className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90"
              onClick={() => void navigate({ to: "/front-desk" })}
            >
              Book Room
            </Button>
          </div>
        }
      />

      {/* Date & Timeframe Filter Toolbar */}
      <Panel bodyClassName="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-gold" />
            <span className="text-xs font-semibold uppercase text-foreground">Timeframe:</span>
            <div className="inline-flex rounded-xl bg-secondary/80 p-1">
              <Button
                size="sm"
                variant={timeframe === "1D" ? "default" : "ghost"}
                className={timeframe === "1D" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("1D")}
              >
                1 Day (Today)
              </Button>
              <Button
                size="sm"
                variant={timeframe === "1W" ? "default" : "ghost"}
                className={timeframe === "1W" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("1W")}
              >
                1 Week
              </Button>
              <Button
                size="sm"
                variant={timeframe === "1M" ? "default" : "ghost"}
                className={timeframe === "1M" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("1M")}
              >
                1 Month
              </Button>
              <Button
                size="sm"
                variant={timeframe === "CUSTOM" ? "default" : "ghost"}
                className={timeframe === "CUSTOM" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("CUSTOM")}
              >
                Custom Range
              </Button>
            </div>
          </div>

          {timeframe === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-2 bg-secondary/50 p-1.5 rounded-xl border border-border">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">From:</Label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-7 w-32 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">To:</Label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-7 w-32 text-xs"
                />
              </div>
            </div>
          )}

          <div className="text-xs font-medium text-muted-foreground">
            Period: <span className="font-semibold text-gold">{dateRangeLabel}</span>
          </div>
        </div>
      </Panel>

      {/* Main KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Occupancy" value={`${occPct}%`} hint={`${occupied} of ${totalKeys} rooms`} icon={PercentCircle} tone="gold" />
        <KpiCard label="Today's Arrivals" value={String(arrivals.length)} hint="Queue at desk" icon={LogIn} tone="info" />
        <KpiCard label="Today's Departures" value={String(departures.length)} hint="Folios in-house" icon={LogOut} tone="warning" />
        <KpiCard label="Rooms Available" value={String(vacant)} hint={`${blocked} out of order`} icon={DoorOpen} tone="success" />
        <KpiCard label="ADR" value={inr(adr)} hint="Average Daily Rate" icon={IndianRupee} tone="gold" />
        <KpiCard label="RevPAR" value={inr(revpar)} hint="Revenue Per Room" icon={TrendingUp} tone="success" />
        <KpiCard
          label={`Revenue (${dateRangeLabel})`}
          value={inr(periodRevenue)}
          hint={periodDiscounts > 0 ? `${filteredPayments.length} payments (Discounts: ${inr(periodDiscounts)})` : `${filteredPayments.length} payments`}
          icon={Wallet}
          tone="info"
        />
        <KpiCard label="Outstanding Dues" value={inr(outstandingDues)} hint={`${pendingPayments.length} open folios`} icon={IndianRupee} tone="destructive" />
      </div>

      {/* Collection Breakdown by Payment Method (UPI, Card, Cash, Bank Transfer) */}
      <Panel
        title="Payment Collections by Method"
        description={`Direct breakdown of collected funds (${dateRangeLabel}) across UPI, Card terminals, Cash in drawer, and Bank transfers`}
        className="border-border/80"
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          {/* UPI Collections */}
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <QrCode className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">UPI / QR Codes</div>
                  <div className="text-[10px] text-muted-foreground">GPay, PhonePe, Paytm</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded">
                {paymentBreakdown.upi.count} txns
              </span>
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold text-emerald-600 tabular-nums">
                {inr(paymentBreakdown.upi.total)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {periodRevenue > 0 ? `${Math.round((paymentBreakdown.upi.total / periodRevenue) * 100)}% of period inflow` : "0% of inflow"}
              </div>
            </div>
          </div>

          {/* Card Collections */}
          <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                  <CreditCard className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Card Swipes (POS)</div>
                  <div className="text-[10px] text-muted-foreground">Debit / Credit Terminals</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded">
                {paymentBreakdown.card.count} txns
              </span>
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold text-blue-600 tabular-nums">
                {inr(paymentBreakdown.card.total)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {periodRevenue > 0 ? `${Math.round((paymentBreakdown.card.total / periodRevenue) * 100)}% of period inflow` : "0% of inflow"}
              </div>
            </div>
          </div>

          {/* Cash Collections */}
          <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Banknote className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Cash in Drawer</div>
                  <div className="text-[10px] text-muted-foreground">Physical currency collected</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded">
                {paymentBreakdown.cash.count} txns
              </span>
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold text-amber-600 tabular-nums">
                {inr(paymentBreakdown.cash.total)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {periodRevenue > 0 ? `${Math.round((paymentBreakdown.cash.total / periodRevenue) * 100)}% of period inflow` : "0% of inflow"}
              </div>
            </div>
          </div>

          {/* Bank Transfer / Other */}
          <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                  <Landmark className="size-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-foreground">Bank Transfers / NEFT</div>
                  <div className="text-[10px] text-muted-foreground">Direct account deposits</div>
                </div>
              </div>
              <span className="text-[10px] font-semibold bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded">
                {paymentBreakdown.bankTransfer.count + paymentBreakdown.other.count} txns
              </span>
            </div>
            <div className="mt-3">
              <div className="text-lg font-bold text-purple-600 tabular-nums">
                {inr(paymentBreakdown.bankTransfer.total + paymentBreakdown.other.total)}
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">
                {periodRevenue > 0 ? `${Math.round(((paymentBreakdown.bankTransfer.total + paymentBreakdown.other.total) / periodRevenue) * 100)}% of period inflow` : "0% of inflow"}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <Panel title="Revenue & Activity Trend" description={`Inflow performance over ${dateRangeLabel}`}>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={occupancyTrendData} margin={{ left: -18, right: 8, top: 10 }}>
                <defs>
                  <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <RTooltip
                  formatter={(val: any) => inr(Number(val))}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="revenue" name="Daily Revenue" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#revFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel title="Room Inventory Mix" description="Live inventory split across keys">
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
          title="Arrivals Queue"
          description={`${arrivals.length} expected arrivals`}
          action={<Pill tone="info">Check-in ready</Pill>}
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {arrivals.map((r) => {
              const guestName = guests.find((g) => g.id === r.guest_id)?.name || "Unknown";
              const roomNum = rooms.find((rm) => rm.id === r.room_id)?.room_number || "TBD";
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
                </li>
              );
            })}
            {!arrivals.length ? (
              <li className="px-5 py-8 text-center text-xs text-muted-foreground">
                No arrivals pending in queue.
              </li>
            ) : null}
          </ul>
        </Panel>

        <Panel title="Departures Queue" description={`${departures.length} in-house guests`} bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {departures.map((r) => {
              const guestName = guests.find((g) => g.id === r.guest_id)?.name || "Unknown";
              const roomNum = rooms.find((rm) => rm.id === r.room_id)?.room_number || "TBD";
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
              <li className="px-5 py-8 text-center text-xs text-muted-foreground">
                All departures settled for today.
              </li>
            ) : null}
          </ul>
        </Panel>

        <Panel title="Housekeeping Board" description="Live room cleaning status" bodyClassName="p-5">
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
        title="Room Status Overview"
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
      </Panel>

      <RoomDrawer room={openRoom} onOpenChange={(o: boolean) => {
          if (!o) setOpenRoom(null);
        }} />
    </div>
  );
}
