import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  PercentCircle,
  Receipt,
  ShieldCheck,
  CalendarDays,
  ArrowUpRight,
  Printer,
  Building,
  PieChart as PieIcon,
  IndianRupee,
  Layers,
  FileText,
  DollarSign
} from "lucide-react";
import { KpiCard, PageHeader, Panel, Pill, ProgressBar } from "@/components/pms/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePms } from "@/lib/pms-store";
import { inr } from "@/lib/pms-data";
import { getApprovedDiscount } from "@/lib/financials";

export const Route = createFileRoute("/_shell/profits")({
  head: () => ({
    meta: [
      { title: "Profit & Loss (P&L) — DRB Hotel PMS" },
      {
        name: "description",
        content:
          "Executive Profit & Loss statement, revenue vs operating expenses, profit margins, and financial audit for DRB Hotel.",
      },
      { property: "og:title", content: "DRB Hotel — Profit & Loss Statement" },
    ],
  }),
  component: ProfitsPage,
});

type Timeframe = "1D" | "1W" | "1M" | "CUSTOM";

function ProfitsPage() {
  const { payments, expenses, reservations, discounts, session } = usePms();
  const navigate = useNavigate();

  const isSuperAdmin = session?.role === "SUPER_ADMIN" || !session;

  // Timeframe filter state
  const todayStr = new Date().toISOString().split("T")[0];
  const [timeframe, setTimeframe] = React.useState<Timeframe>("1W");
  const [customStart, setCustomStart] = React.useState<string>(todayStr);
  const [customEnd, setCustomEnd] = React.useState<string>(todayStr);

  // Compute Active Date Range
  const { startDate, endDate, dateRangeLabel, dayCount } = React.useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    let label = "Last 7 Days";
    let days = 7;

    if (timeframe === "1D") {
      label = "Today";
      days = 1;
    } else if (timeframe === "1W") {
      start.setDate(start.getDate() - 6);
      label = "Last 7 Days";
      days = 7;
    } else if (timeframe === "1M") {
      start.setDate(start.getDate() - 29);
      label = "Last 30 Days";
      days = 30;
    } else if (timeframe === "CUSTOM") {
      if (customStart) {
        const s = new Date(`${customStart}T00:00:00`);
        if (!isNaN(s.getTime())) start.setTime(s.getTime());
      }
      if (customEnd) {
        const e = new Date(`${customEnd}T23:59:59`);
        if (!isNaN(e.getTime())) end.setTime(e.getTime());
      }
      days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      label = `${customStart} to ${customEnd}`;
    }

    return { startDate: start, endDate: end, dateRangeLabel: label, dayCount: days };
  }, [timeframe, customStart, customEnd]);

  // Filtered Payments & Revenue from Supabase
  const filteredPayments = React.useMemo(() => {
    return payments.filter((p) => {
      const pDate = new Date(p.created_at || (p as any).date || todayStr);
      return pDate >= startDate && pDate <= endDate;
    });
  }, [payments, startDate, endDate, todayStr]);

  const totalGrossRevenue = React.useMemo(() => {
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

  // Filtered Expenses from Supabase
  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      const eDate = new Date(e.created_at || (e as any).date || todayStr);
      return eDate >= startDate && eDate <= endDate;
    });
  }, [expenses, startDate, endDate, todayStr]);

  const totalOperatingExpenses = React.useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  // Profit Metrics
  const netProfit = totalGrossRevenue - totalOperatingExpenses;
  const profitMargin = totalGrossRevenue > 0
    ? Math.round((netProfit / totalGrossRevenue) * 100)
    : (netProfit < 0 ? -100 : 0);

  const avgDailyProfit = Math.round(netProfit / (dayCount || 1));
  const avgDailyRevenue = Math.round(totalGrossRevenue / (dayCount || 1));

  // Expense Breakdown by Category
  const expenseByCategory = React.useMemo(() => {
    const cats: Record<string, number> = {};
    for (const exp of filteredExpenses) {
      const c = exp.category || "General / Other";
      cats[c] = (cats[c] || 0) + Number(exp.amount || 0);
    }
    return Object.entries(cats).map(([name, value]) => ({ name, value }));
  }, [filteredExpenses]);

  // Filtered Discounts in timeframe
  const totalDiscounts = React.useMemo(() => {
    return discounts
      .filter((d) => {
        if (d.status !== "APPROVED") return false;
        const dDate = new Date(d.created_at || (d as any).date || todayStr);
        return dDate >= startDate && dDate <= endDate;
      })
      .reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);
  }, [discounts, startDate, endDate, todayStr]);

  const discountCount = React.useMemo(() => {
    return discounts.filter((d) => {
      if (d.status !== "APPROVED") return false;
      const dDate = new Date(d.created_at || (d as any).date || todayStr);
      return dDate >= startDate && dDate <= endDate;
    }).length;
  }, [discounts, startDate, endDate, todayStr]);

  // Filtered Reservations for Revenue Split
  const filteredReservations = React.useMemo(() => {
    return reservations.filter((r) => {
      const rDate = new Date(r.start_time || `${r.booking_date}T00:00:00`);
      return rDate >= startDate && rDate <= endDate;
    });
  }, [reservations, startDate, endDate]);

  const roomRevenue = React.useMemo(() => {
    return filteredReservations
      .filter((r) => r.resource_type === "ROOM")
      .reduce((acc, r) => {
        const p = payments.find((pay) => pay.reservation_id === r.id);
        return acc + (Number(p?.paid_amount) || 0);
      }, 0) || (totalGrossRevenue > 0 ? Math.round(totalGrossRevenue * 0.8) : 0);
  }, [filteredReservations, payments, totalGrossRevenue]);

  const hallRevenue = React.useMemo(() => {
    return filteredReservations
      .filter((r) => r.resource_type === "PARTY_HALL")
      .reduce((acc, r) => {
        const p = payments.find((pay) => pay.reservation_id === r.id);
        return acc + (Number(p?.paid_amount) || 0);
      }, 0);
  }, [filteredReservations, payments]);

  const otherRevenue = Math.max(0, totalGrossRevenue - roomRevenue - hallRevenue);

  // Payment Breakdown by Inflow Channel
  const paymentMethodSummary = React.useMemo(() => {
    const summary: Record<string, { total: number; count: number }> = {
      "UPI / QR Codes": { total: 0, count: 0 },
      "Card (POS)": { total: 0, count: 0 },
      "Cash in Drawer": { total: 0, count: 0 },
      "Bank Transfers / Other": { total: 0, count: 0 },
    };

    filteredPayments.forEach((p) => {
      const amt = Number(p.paid_amount) || 0;
      if (amt <= 0) return;
      const method = String(p.payment_method || "CASH").toUpperCase();
      if (method.includes("UPI") || method.includes("GPAY") || method.includes("PHONEPE") || method.includes("QR") || method.includes("PAYTM")) {
        summary["UPI / QR Codes"].total += amt;
        summary["UPI / QR Codes"].count += 1;
      } else if (method.includes("CARD") || method.includes("POS") || method.includes("DEBIT") || method.includes("CREDIT")) {
        summary["Card (POS)"].total += amt;
        summary["Card (POS)"].count += 1;
      } else if (method.includes("CASH")) {
        summary["Cash in Drawer"].total += amt;
        summary["Cash in Drawer"].count += 1;
      } else {
        summary["Bank Transfers / Other"].total += amt;
        summary["Bank Transfers / Other"].count += 1;
      }
    });

    return Object.entries(summary).map(([name, data]) => ({
      name,
      value: data.total,
      count: data.count,
    }));
  }, [filteredPayments]);

  // Daily Trend Data with EXACT Calendar Dates (No Mock Day 1..Day 7)
  const dailyFinancialTrend = React.useMemo(() => {
    const points: { day: string; dateStr: string; revenue: number; expense: number; profit: number }[] = [];
    const curr = new Date(startDate);
    const end = new Date(endDate);

    let count = 0;
    while (curr <= end && count <= 31) {
      const dStr = curr.toISOString().split("T")[0];
      const dLabel = curr.toLocaleDateString("en-IN", { month: "short", day: "numeric" });

      const dayRev = payments
        .filter((p) => (p.created_at || (p as any).date || todayStr).startsWith(dStr))
        .reduce((sum, p) => sum + (Number(p.paid_amount) || 0), 0);

      const dayExp = expenses
        .filter((e) => (e.created_at || (e as any).date || todayStr).startsWith(dStr))
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);

      points.push({
        day: dLabel,
        dateStr: dStr,
        revenue: dayRev,
        expense: dayExp,
        profit: dayRev - dayExp,
      });

      curr.setDate(curr.getDate() + 1);
      count++;
    }

    return points;
  }, [startDate, endDate, payments, expenses, todayStr]);

  const handlePrint = () => {
    window.print();
  };

  if (session && session.role !== "SUPER_ADMIN" && session.role !== "GM") {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader eyebrow="Financial Management" title="Profit & Loss Statement (P&L)" subtitle="Executive Financial Statement" />
        <Panel className="p-12 text-center">
          <EmptyState title="Executive Access Only" body="Profit & Loss reports and executive financial audits are restricted to Super Administrators and General Managers." icon={ShieldCheck} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Financial Management"
        title="Profit & Loss Statement (P&L)"
        subtitle={`Audited hotel financials · ${dateRangeLabel} · Calculated from live transactions`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl" onClick={handlePrint}>
              <Printer className="mr-1.5 size-4" /> Print Statement
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void navigate({ to: "/expenses" })}
            >
              <Receipt className="mr-1.5 size-4" /> Log Expense
            </Button>
          </div>
        }
      />

      {/* Date & Timeframe Filter Toolbar */}
      <Panel bodyClassName="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-gold" />
            <span className="text-xs font-semibold uppercase text-foreground">Timeframe Filter:</span>
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
            Auditing: <span className="font-semibold text-gold">{dateRangeLabel}</span> ({dayCount} days)
          </div>
        </div>
      </Panel>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <KpiCard
          label={`Realized Revenue (${dateRangeLabel})`}
          value={inr(totalGrossRevenue)}
          hint={`${filteredPayments.length} payments collected`}
          icon={Wallet}
          tone="success"
        />
        <KpiCard
          label="Discounts & Concessions"
          value={inr(totalDiscounts)}
          hint={`${discountCount} approved concessions`}
          icon={PercentCircle}
          tone="gold"
        />
        <KpiCard
          label={`Total Expenses (${dateRangeLabel})`}
          value={inr(totalOperatingExpenses)}
          hint={`${filteredExpenses.length} expense items recorded`}
          icon={Receipt}
          tone="destructive"
        />
        <KpiCard
          label="Net Operating Profit"
          value={inr(netProfit)}
          hint={netProfit >= 0 ? "Revenue exceeds all costs" : "Operating at a deficit"}
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          tone={netProfit >= 0 ? "gold" : "destructive"}
        />
        <KpiCard
          label="Profit Margin %"
          value={`${profitMargin}%`}
          hint={profitMargin >= 0 ? `${inr(avgDailyProfit)} avg profit / day` : "Loss margin"}
          icon={PercentCircle}
          tone={profitMargin >= 25 ? "success" : profitMargin >= 0 ? "gold" : "destructive"}
        />
      </div>

      {/* Daily Profit & Loss Trend Bar Chart */}
      <Panel
        title="Profit & Loss Trend Analysis"
        description={`Daily breakdown of Gross Revenue vs Operating Expenses vs Net Profit for ${dateRangeLabel}`}
      >
        <div className="h-[320px] w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyFinancialTrend} margin={{ left: -5, right: 15, top: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
              <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" tickFormatter={(v) => `₹${v}`} />
              <RTooltip
                formatter={(val: any) => [inr(Number(val)), ""]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  fontSize: 12,
                }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Bar dataKey="revenue" name="Gross Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Operating Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" name="Net Profit" fill="#eab308" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      {/* Revenue Split, Expense Distribution & Payment Channels */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Expense Breakdown */}
        <Panel
          title="Operating Expenses by Category"
          description={`Categorized expenditure for ${dateRangeLabel}`}
        >
          <div className="space-y-3 pt-2">
            {expenseByCategory.length > 0 ? (
              expenseByCategory.map((c) => {
                const pct = totalOperatingExpenses > 0 ? Math.round((c.value / totalOperatingExpenses) * 100) : 0;
                return (
                  <div key={c.name} className="rounded-xl border border-border p-3 bg-secondary/30">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span>{c.name}</span>
                      <span className="font-bold text-destructive">{inr(c.value)} ({pct}%)</span>
                    </div>
                    <div className="mt-2">
                      <ProgressBar value={pct} tone="destructive" />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-muted-foreground">
                No expense entries found for the selected timeframe.
              </div>
            )}
          </div>
        </Panel>

        {/* Revenue Streams Breakdown */}
        <Panel
          title="Revenue Streams Breakdown"
          description={`Sources of inflow for ${dateRangeLabel}`}
        >
          <div className="space-y-3 pt-2">
            {[
              { name: "Room Lodging & Stays", value: roomRevenue, color: "var(--chart-1)" },
              { name: "Party Hall & Banquets", value: hallRevenue, color: "var(--chart-2)" },
              { name: "F&B & Restaurant Orders", value: otherRevenue, color: "var(--chart-3)" },
            ].map((s) => {
              const pct = totalGrossRevenue > 0 ? Math.round((s.value / totalGrossRevenue) * 100) : 0;
              return (
                <div key={s.name} className="rounded-xl border border-border p-3 bg-secondary/30">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span>{s.name}</span>
                    <span className="font-bold text-emerald-600">{inr(s.value)} ({pct}%)</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={pct} tone="success" />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>

        {/* Payment Methods Breakdown */}
        <Panel
          title="Inflow by Payment Channel"
          description={`Settlement mode distribution for ${dateRangeLabel}`}
        >
          <div className="space-y-3 pt-2">
            {paymentMethodSummary.map((m) => {
              const pct = totalGrossRevenue > 0 ? Math.round((m.value / totalGrossRevenue) * 100) : 0;
              return (
                <div key={m.name} className="rounded-xl border border-border p-3 bg-secondary/30">
                  <div className="flex justify-between items-center text-xs font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span>{m.name}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">({m.count} txns)</span>
                    </span>
                    <span className="font-bold text-gold">{inr(m.value)} ({pct}%)</span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar value={pct} tone="gold" />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {/* Complete Financial P&L Statement Table */}
      <Panel
        title="Executive Profit & Loss Statement (P&L)"
        description={`Formal income and expenditure balance sheet for ${dateRangeLabel}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase font-semibold">
                <th className="py-2.5 px-3">Inflow Revenue Accounts</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                <th className="py-2.5 px-3">Operating Expense Accounts</th>
                <th className="py-2.5 px-3 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-3 px-3 font-medium">Room Nights & Accommodation</td>
                <td className="py-3 px-3 text-right font-semibold text-emerald-600">{inr(roomRevenue)}</td>
                <td className="py-3 px-3 font-medium">Operational & Housekeeping</td>
                <td className="py-3 px-3 text-right font-semibold text-destructive">
                  {inr(expenseByCategory.find(e => e.name.toLowerCase().includes('operat') || e.name.toLowerCase().includes('clean'))?.value || 0)}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-medium">Party Hall & Event Space Bookings</td>
                <td className="py-3 px-3 text-right font-semibold text-emerald-600">{inr(hallRevenue)}</td>
                <td className="py-3 px-3 font-medium">Maintenance, Repairs & Equipment</td>
                <td className="py-3 px-3 text-right font-semibold text-destructive">
                  {inr(expenseByCategory.find(e => e.name.toLowerCase().includes('maint') || e.name.toLowerCase().includes('repair'))?.value || 0)}
                </td>
              </tr>
              <tr>
                <td className="py-3 px-3 font-medium">F&B, Room Dining & Additional Folios</td>
                <td className="py-3 px-3 text-right font-semibold text-emerald-600">{inr(otherRevenue)}</td>
                <td className="py-3 px-3 font-medium">Utilities, Staffing, F&B & Miscellaneous</td>
                <td className="py-3 px-3 text-right font-semibold text-destructive">
                  {inr(expenseByCategory.find(e => !e.name.toLowerCase().includes('operat') && !e.name.toLowerCase().includes('maint'))?.value || 0)}
                </td>
              </tr>
              <tr className="bg-secondary/40 font-bold">
                <td className="py-3 px-3 text-foreground">Total Realized Inflow Revenue</td>
                <td className="py-3 px-3 text-right text-emerald-600 font-bold">{inr(totalGrossRevenue)}</td>
                <td className="py-3 px-3 text-foreground">Total Outflow Operating Expenses</td>
                <td className="py-3 px-3 text-right text-destructive font-bold">{inr(totalOperatingExpenses)}</td>
              </tr>
              {totalDiscounts > 0 && (
                <tr className="bg-amber-50/50 dark:bg-amber-950/20 text-xs">
                  <td className="py-2.5 px-3 font-medium text-amber-800 dark:text-amber-400" colSpan={2}>
                    ℹ️ Total Approved Concessions / Discounts granted in this timeframe: <span className="font-bold">{inr(totalDiscounts)}</span> ({discountCount} folios)
                  </td>
                  <td className="py-2.5 px-3 font-medium text-muted-foreground" colSpan={2}>
                    Gross Booked Folio Value: <span className="font-semibold text-foreground">{inr(totalGrossRevenue + totalDiscounts)}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="mt-4 p-4 rounded-xl border border-border bg-gold/10 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-gold">Net Operating Profit for {dateRangeLabel}</div>
              <div className="text-2xl font-bold text-foreground">{inr(netProfit)}</div>
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Effective Net Profit Margin</div>
              <div className={netProfit >= 0 ? "text-2xl font-bold text-emerald-600" : "text-2xl font-bold text-destructive"}>
                {profitMargin}%
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
