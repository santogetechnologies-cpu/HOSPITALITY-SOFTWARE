import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PageHeader, KpiCard, Panel, Pill, EmptyState, ProgressBar } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { usePms } from '@/lib/pms-store'
import { inr } from '@/lib/pms-data'
import { toast } from 'sonner'
import {
  Banknote,
  CreditCard,
  Receipt,
  PiggyBank,
  ArrowRight,
  QrCode,
  Landmark,
  CalendarDays,
  Search,
  CheckCircle2,
  Clock,
  ShieldCheck,
  TrendingUp,
  PercentCircle,
  Building,
  PartyPopper,
  BedDouble,
  DollarSign
} from 'lucide-react'

export const Route = createFileRoute('/_shell/payments')({
  head: () => ({
    meta: [
      { title: "Payment Dashboard — DRB Hotel PMS" },
      { name: "description", content: "Comprehensive payment collections, settlement channels, UPI, Card, Cash, and folio ledgers." },
      { property: "og:title", content: "DRB Hotel — Payment Dashboard" },
    ],
  }),
  component: PaymentsDashboard,
})

type Timeframe = "1D" | "1W" | "1M" | "CUSTOM";

function PaymentsDashboard() {
  const { payments, expenses, reservations, guests, rooms, discounts, settlePayment, session } = usePms();

  const isSuperAdminOrGM = session?.role === "SUPER_ADMIN" || session?.role === "GM" || !session;

  // Timeframe filter state
  const todayStr = new Date().toISOString().split("T")[0];
  const [timeframe, setTimeframe] = React.useState<Timeframe>("1W");
  const [customStart, setCustomStart] = React.useState<string>(todayStr);
  const [customEnd, setCustomEnd] = React.useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");

  // Quick Collect Balance Modal State
  const [collectModalOpen, setCollectModalOpen] = React.useState(false);
  const [selectedPaymentForCollect, setSelectedPaymentForCollect] = React.useState<any>(null);
  const [collectAmount, setCollectAmount] = React.useState("");
  const [collectMethod, setCollectMethod] = React.useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER">("CASH");
  const [settling, setSettling] = React.useState(false);

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

  // Filtered Payments for the selected timeframe
  const filteredPayments = React.useMemo(() => {
    return payments.filter((p) => {
      const pDate = new Date(p.created_at || (p as any).date || todayStr);
      return pDate >= startDate && pDate <= endDate;
    });
  }, [payments, startDate, endDate, todayStr]);

  const totalCollectedInPeriod = React.useMemo(() => {
    return filteredPayments.reduce((acc, p) => acc + (Number(p.paid_amount) || 0), 0);
  }, [filteredPayments]);

  const pendingPayments = payments.filter((p) => {
    const total = Number(p.total_amount) || 0;
    const paid = Number(p.paid_amount) || 0;
    return total - paid > 0 && p.status !== "COMPLETED";
  });

  const totalPendingDues = pendingPayments.reduce(
    (acc, p) => acc + Math.max(0, (Number(p.total_amount) || 0) - (Number(p.paid_amount) || 0)),
    0
  );

  const filteredExpenses = React.useMemo(() => {
    return expenses.filter((e) => {
      const eDate = new Date(e.created_at || (e as any).date || todayStr);
      return eDate >= startDate && eDate <= endDate;
    });
  }, [expenses, startDate, endDate, todayStr]);

  const totalPeriodExpenses = filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  // Payment Breakdown by Method
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

    return {
      upi,
      card,
      cash,
      bankTransfer,
      other,
      grandTotal: upi.total + card.total + cash.total + bankTransfer.total + other.total,
    };
  }, [filteredPayments]);

  // Breakdown by Resource (Rooms vs Party Hall vs Other)
  const resourceBreakdown = React.useMemo(() => {
    let roomRevenue = 0;
    let hallRevenue = 0;
    let otherRevenue = 0;

    filteredPayments.forEach((p) => {
      const amt = Number(p.paid_amount) || 0;
      const res = reservations.find(r => r.id === p.reservation_id || r.id?.toLowerCase() === p.reservation_id?.toLowerCase());
      if (res?.resource_type === 'PARTY_HALL') {
        hallRevenue += amt;
      } else if (res?.resource_type === 'ROOM' || res?.room_id) {
        roomRevenue += amt;
      } else {
        otherRevenue += amt;
      }
    });

    return { roomRevenue, hallRevenue, otherRevenue };
  }, [filteredPayments, reservations]);

  const getReservation = (id: string) => reservations.find(r => r.id === id || r.id?.toLowerCase() === id.toLowerCase());
  const getGuest = (id?: string) => guests.find(g => g.id === id);
  const getRoom = (roomId?: string) => rooms.find(r => r.id === roomId);

  const getApprovedDiscount = (resId?: string) => {
    if (!resId) return 0;
    return discounts
      .filter(d => (d.reservation_id === resId || d.reservation_id?.toLowerCase() === resId.toLowerCase()) && d.status === 'APPROVED')
      .reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);
  };

  // Filtered Payments Table
  const tablePayments = React.useMemo(() => {
    return filteredPayments.filter((p) => {
      const res = getReservation(p.reservation_id);
      const discount = getApprovedDiscount(p.reservation_id);
      const origTotal = Number(res?.base_amount) || Number(p.total_amount) || 0;
      let billTotal = Number(p.total_amount) || origTotal;
      if (discount > 0 && billTotal >= origTotal && origTotal > discount) {
        billTotal = Math.max(0, origTotal - discount);
      }
      const paid = Number(p.paid_amount) || 0;
      const balance = Math.max(0, billTotal - paid);
      const isCompleted = p.status === 'COMPLETED' || (paid >= billTotal && billTotal > 0);
      const isPartial = !isCompleted && (p.status === 'PARTIAL' || paid > 0);

      if (statusFilter === "completed" && !isCompleted) return false;
      if (statusFilter === "partial" && !isPartial) return false;
      if (statusFilter === "pending" && (isCompleted || isPartial || p.status === "FROZEN")) return false;
      if (statusFilter === "frozen" && p.status !== "FROZEN") return false;

      if (!searchQuery.trim()) return true;
      const guest = res ? getGuest(res.guest_id) : null;
      const room = res ? getRoom(res.room_id) : null;
      const term = searchQuery.toLowerCase().trim();

      return (
        p.id.toLowerCase().includes(term) ||
        (guest?.name && guest.name.toLowerCase().includes(term)) ||
        (guest?.phone && guest.phone.includes(term)) ||
        (room?.room_number && room.room_number.toLowerCase().includes(term)) ||
        (res?.event_type && res.event_type.toLowerCase().includes(term))
      );
    });
  }, [filteredPayments, searchQuery, statusFilter, reservations, guests, rooms, discounts]);

  const handleOpenCollect = (p: typeof payments[0]) => {
    const res = getReservation(p.reservation_id);
    const discount = getApprovedDiscount(p.reservation_id);
    const origTotal = Number(res?.base_amount) || Number(p.total_amount) || 0;
    let billTotal = Number(p.total_amount) || origTotal;
    if (discount > 0 && billTotal >= origTotal && origTotal > discount) {
      billTotal = Math.max(0, origTotal - discount);
    }
    const paid = Number(p.paid_amount) || 0;
    const balance = Math.max(0, billTotal - paid);

    setSelectedPaymentForCollect(p);
    setCollectAmount(String(balance > 0 ? balance : 0));
    setCollectMethod("CASH");
    setCollectModalOpen(true);
  };

  const handleSaveCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForCollect) return;

    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      return toast.error("Please enter a valid payment amount");
    }

    setSettling(true);
    const res = await settlePayment(selectedPaymentForCollect.reservation_id, amt, collectMethod);
    setSettling(false);

    if (res.success) {
      toast.success(`Collected ${inr(amt)} via ${collectMethod}!`);
      setCollectModalOpen(false);
      setSelectedPaymentForCollect(null);
    } else {
      toast.error(res.error || "Failed to settle payment");
    }
  };

  if (!isSuperAdminOrGM) {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader eyebrow="Finance" title="Payment Dashboard" subtitle="Financial Operations" />
        <Panel className="p-12 text-center">
          <EmptyState title="Manager Access Only" body="Payment analytics and financial collections dashboards are restricted to Super Administrators and General Managers." icon={Receipt} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Financial Operations"
        title="Payment Dashboard & Inflow Analytics" 
        subtitle={`Live cash drawer, UPI settlements, card swipes, and folio collections · ${dateRangeLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <Link to="/billing">
              <Button variant="outline" className="rounded-xl">
                <Receipt className="mr-1.5 size-4 text-gold" /> Bills Workspace
              </Button>
            </Link>
            <Link to="/pending-payments">
              <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 font-semibold shadow-brass">
                <CreditCard className="mr-1.5 size-4" /> Collect Pending Dues
              </Button>
            </Link>
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
            Auditing Inflow: <span className="font-semibold text-gold">{dateRangeLabel}</span>
          </div>
        </div>
      </Panel>

      {/* Main KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard 
          label={`Collected Inflow (${dateRangeLabel})`} 
          value={inr(totalCollectedInPeriod)} 
          icon={Banknote} 
          tone="success" 
          hint={`${filteredPayments.length} transactions processed`} 
        />
        <KpiCard 
          label="Total Pending Dues" 
          value={inr(totalPendingDues)} 
          icon={CreditCard} 
          tone="warning" 
          hint={`${pendingPayments.length} open folios to collect`} 
        />
        <KpiCard 
          label={`Operating Expenses (${dateRangeLabel})`} 
          value={inr(totalPeriodExpenses)} 
          icon={Receipt} 
          tone="destructive" 
          hint={`${filteredExpenses.length} petty cash records`} 
        />
        <KpiCard 
          label="Net Cash Position" 
          value={inr(totalCollectedInPeriod - totalPeriodExpenses)} 
          icon={DollarSign} 
          tone={totalCollectedInPeriod - totalPeriodExpenses >= 0 ? "gold" : "destructive"} 
          hint="Collections minus Expenses" 
        />
      </div>

      {/* Payment Channel Cards (UPI, Card, Cash, Bank Transfer) */}
      <Panel
        title="Payment Inflow by Collection Method"
        description={`Exact breakdown of all received payments for ${dateRangeLabel}`}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 pt-1">
          {/* UPI Collections */}
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                  <QrCode className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">UPI / QR Codes</div>
                  <div className="text-xs text-muted-foreground">GPay, PhonePe, Paytm</div>
                </div>
              </div>
              <span className="text-xs font-semibold bg-emerald-500/15 text-emerald-600 px-2 py-0.5 rounded-full">
                {paymentBreakdown.upi.count} txns
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600 tabular-nums">
                {inr(paymentBreakdown.upi.total)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalCollectedInPeriod > 0 ? `${Math.round((paymentBreakdown.upi.total / totalCollectedInPeriod) * 100)}% of total collections` : "0% share"}
              </div>
            </div>
          </div>

          {/* Card Collections */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-blue-500/15 text-blue-600 flex items-center justify-center">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Card Swipes (POS)</div>
                  <div className="text-xs text-muted-foreground">Debit / Credit POS</div>
                </div>
              </div>
              <span className="text-xs font-semibold bg-blue-500/15 text-blue-600 px-2 py-0.5 rounded-full">
                {paymentBreakdown.card.count} txns
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600 tabular-nums">
                {inr(paymentBreakdown.card.total)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalCollectedInPeriod > 0 ? `${Math.round((paymentBreakdown.card.total / totalCollectedInPeriod) * 100)}% of total collections` : "0% share"}
              </div>
            </div>
          </div>

          {/* Cash Collections */}
          <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-amber-500/15 text-amber-600 flex items-center justify-center">
                  <Banknote className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Cash in Drawer</div>
                  <div className="text-xs text-muted-foreground">Physical Currency</div>
                </div>
              </div>
              <span className="text-xs font-semibold bg-amber-500/15 text-amber-600 px-2 py-0.5 rounded-full">
                {paymentBreakdown.cash.count} txns
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-600 tabular-nums">
                {inr(paymentBreakdown.cash.total)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalCollectedInPeriod > 0 ? `${Math.round((paymentBreakdown.cash.total / totalCollectedInPeriod) * 100)}% of total collections` : "0% share"}
              </div>
            </div>
          </div>

          {/* Bank Transfer / Other */}
          <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-9 rounded-lg bg-purple-500/15 text-purple-600 flex items-center justify-center">
                  <Landmark className="size-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-foreground">Bank Transfers</div>
                  <div className="text-xs text-muted-foreground">NEFT, RTGS & Other</div>
                </div>
              </div>
              <span className="text-xs font-semibold bg-purple-500/15 text-purple-600 px-2 py-0.5 rounded-full">
                {paymentBreakdown.bankTransfer.count + paymentBreakdown.other.count} txns
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600 tabular-nums">
                {inr(paymentBreakdown.bankTransfer.total + paymentBreakdown.other.total)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {totalCollectedInPeriod > 0 ? `${Math.round(((paymentBreakdown.bankTransfer.total + paymentBreakdown.other.total) / totalCollectedInPeriod) * 100)}% of total collections` : "0% share"}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      {/* Revenue Breakdown by Resource */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
              <BedDouble className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Room Stays & Lodging</div>
              <div className="text-lg font-bold text-foreground">{inr(resourceBreakdown.roomRevenue)}</div>
            </div>
          </div>
          <Pill tone="gold">Rooms</Pill>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
              <PartyPopper className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Party Hall & Banquets</div>
              <div className="text-lg font-bold text-foreground">{inr(resourceBreakdown.hallRevenue)}</div>
            </div>
          </div>
          <Pill tone="info">Events</Pill>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center">
              <DollarSign className="size-5" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground">F&B & Extra Folios</div>
              <div className="text-lg font-bold text-foreground">{inr(resourceBreakdown.otherRevenue)}</div>
            </div>
          </div>
          <Pill tone="success">Services</Pill>
        </div>
      </div>

      {/* Payment Ledger & Folio Transactions Table */}
      <Panel
        title={`Payment Transactions (${tablePayments.length})`}
        description={`Detailed settlement records for ${dateRangeLabel}`}
        bodyClassName="p-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Folio ID, Guest Name, Phone or Room/Event..."
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[190px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Settlements</SelectItem>
              <SelectItem value="completed">Settled / Completed</SelectItem>
              <SelectItem value="partial">Partial / Advance</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="frozen">Frozen / Disputed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Folio ID</TableHead>
                <TableHead>Guest & Details</TableHead>
                <TableHead>Booking Resource</TableHead>
                <TableHead>Total Bill</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Due Balance</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tablePayments.map((p) => {
                const res = getReservation(p.reservation_id);
                const guest = res ? getGuest(res.guest_id) : null;
                const room = res ? getRoom(res.room_id) : null;
                const approvedDiscount = getApprovedDiscount(p.reservation_id);
                const originalAmount = Number(res?.base_amount) || Number(p.total_amount) || 0;
                let total = Number(p.total_amount) || originalAmount;
                if (approvedDiscount > 0 && total >= originalAmount && originalAmount > approvedDiscount) {
                  total = Math.max(0, originalAmount - approvedDiscount);
                }
                const paid = Number(p.paid_amount) || 0;
                const balance = Math.max(0, total - paid);
                const folioId = String(p.id || 'FOLIO').slice(0, 10).toUpperCase();

                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs font-semibold text-gold">
                      #{folioId}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm text-foreground">{guest?.name || "Guest"}</div>
                      <div className="text-xs text-muted-foreground">{guest?.phone || "No phone"}</div>
                    </TableCell>
                    <TableCell>
                      {res?.resource_type === 'PARTY_HALL' ? (
                        <span className="text-xs font-semibold text-gold flex items-center gap-1">
                          <PartyPopper className="size-3.5" /> Party Hall ({res.event_type || 'Event'})
                        </span>
                      ) : room ? (
                        <span className="text-xs font-medium flex items-center gap-1">
                          <BedDouble className="size-3.5 text-muted-foreground" /> Room {room.room_number || (room as any)?.number}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Folio Service</span>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div>{inr(total)}</div>
                      {approvedDiscount > 0 && (
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          -{inr(approvedDiscount)} discount
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600">{inr(paid)}</TableCell>
                    <TableCell className={balance > 0 ? "font-bold text-amber-600" : "text-muted-foreground"}>
                      {balance > 0 ? inr(balance) : "₹0.00"}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold bg-secondary px-2 py-0.5 rounded border border-border">
                        {p.payment_method || "CASH"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Pill tone={balance === 0 && total > 0 ? 'success' : balance > 0 && paid > 0 ? 'warning' : p.status === 'FROZEN' ? 'info' : 'destructive'}>
                        {balance === 0 && total > 0 ? 'COMPLETED' : balance > 0 && paid > 0 ? 'PARTIAL' : (p.status || 'PENDING')}
                      </Pill>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {balance > 0 && (
                          <Button
                            size="sm"
                            className="h-8 rounded-lg text-xs bg-brass text-gold-foreground hover:opacity-90 font-medium"
                            onClick={() => handleOpenCollect(p)}
                          >
                            Collect
                          </Button>
                        )}
                        <Link to="/billing">
                          <Button size="sm" variant="outline" className="h-8 rounded-lg text-xs">
                            Bill
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {!tablePayments.length && (
          <div className="p-8">
            <EmptyState title="No Payment Records Found" body="No matching payment settlements found for the selected filter." icon={Banknote} />
          </div>
        )}
      </Panel>

      {/* Collect Balance Modal */}
      <Dialog open={collectModalOpen} onOpenChange={setCollectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Outstanding Folio Payment</DialogTitle>
            <DialogDescription>
              Record cash, UPI, card, or bank settlement against this folio balance.
            </DialogDescription>
          </DialogHeader>

          {selectedPaymentForCollect && (
            <form onSubmit={handleSaveCollect} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Amount to Collect (₹) *</Label>
                <Input
                  type="number"
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select
                  value={collectMethod}
                  onValueChange={(v: any) => setCollectMethod(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI / QR (GPay, PhonePe, Paytm)</SelectItem>
                    <SelectItem value="CARD">Credit / Debit Card (POS)</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                    <SelectItem value="OTHER">Other / Bill to Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-border">
                <Button variant="ghost" type="button" onClick={() => setCollectModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={settling}
                  className="bg-brass text-gold-foreground hover:opacity-90 font-medium"
                >
                  {settling ? "Recording..." : `Confirm Settlement (${inr(parseFloat(collectAmount) || 0)})`}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
