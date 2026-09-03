import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, KpiCard, Panel, Pill, EmptyState, ProgressBar } from "@/components/pms/bits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { usePms } from "@/lib/pms-store";
import { inr } from "@/lib/pms-data";
import { useSettings } from "@/lib/use-settings";
import { getReservationFinancials as calculateReservationFinancials } from "@/lib/financials";
import { toast } from "sonner";
import {
  Banknote,
  CreditCard,
  Receipt,
  PiggyBank,
  QrCode,
  Landmark,
  CalendarDays,
  Search,
  CheckCircle2,
  Clock,
  TrendingUp,
  PartyPopper,
  BedDouble,
  DollarSign,
  Download,
  FileSpreadsheet,
  Calculator,
  ShieldCheck,
  Building2,
  Percent,
  Layers,
  Printer,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";

export const Route = createFileRoute("/_shell/payments")({
  head: () => ({
    meta: [
      { title: "Payment Dashboard & Inflow Analytics — HOTEL DRB" },
      { name: "description", content: "Financial audit ledger, monthly GST calculation, payment channel breakdown, and inflow analytics." },
      { property: "og:title", content: "HOTEL DRB — Payment Dashboard & Inflow Analytics" },
    ],
  }),
  component: PaymentsDashboard,
});

type Timeframe = "1D" | "1W" | "1M" | "ALL" | "CUSTOM";

function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function PaymentsDashboard() {
  const { payments, expenses, reservations, guests, rooms, discounts, settlePayment, session } = usePms();
  const { settings } = useSettings();

  // Timeframe filter state
  const todayStr = new Date().toISOString().split("T")[0];
  const [timeframe, setTimeframe] = React.useState<Timeframe>("ALL");
  const [customStart, setCustomStart] = React.useState<string>(todayStr);
  const [customEnd, setCustomEnd] = React.useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [channelFilter, setChannelFilter] = React.useState<string>("all");
  const [resourceFilter, setResourceFilter] = React.useState<string>("all");

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

    let label = "All Time Transactions";

    if (timeframe === "ALL") {
      label = "All Time Transactions";
    } else if (timeframe === "1D") {
      label = "Today";
    } else if (timeframe === "1W") {
      start.setDate(start.getDate() - 6);
      label = "Last 7 Days";
    } else if (timeframe === "1M") {
      start.setDate(start.getDate() - 29);
      label = "Current Month / 30 Days";
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

  // Helpers
  const getGuest = (guestId?: string) => guests.find((g) => g.id === guestId);
  const getRoom = (roomId?: string) => rooms.find((r) => r.id === roomId);
  const getReservation = (resId?: string) =>
    reservations.find((r) => r.id === resId || r.id?.toLowerCase() === resId?.toLowerCase());

  const getApprovedDiscount = (resId?: string) => {
    if (!resId) return 0;
    return discounts
      .filter(
        (d) =>
          (d.reservation_id === resId || d.reservation_id?.toLowerCase() === resId?.toLowerCase()) &&
          d.status === "APPROVED"
      )
      .reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);
  };

  // Processed Transaction Ledger
  const transactions = React.useMemo(() => {
    const list: any[] = [];
    const processedResIds = new Set<string>();

    reservations.forEach((res) => {
      if (res.status === "CANCELLED") return;
      processedResIds.add(res.id.toLowerCase());

      if (!searchQuery.trim() && timeframe !== "ALL") {
        const resDateStr = res.booking_date || (res.start_time ? res.start_time.split("T")[0] : todayStr);
        const resDate = new Date(`${resDateStr}T00:00:00`);
        if (resDate < startDate || resDate > endDate) return;
      }

      const resDateStr = res.booking_date || (res.start_time ? res.start_time.split("T")[0] : todayStr);
      const isPartyHall = res.resource_type === "PARTY_HALL";
      if (resourceFilter === "rooms" && isPartyHall) return;
      if (resourceFilter === "party_hall" && !isPartyHall) return;

      const fin = calculateReservationFinancials(res, payments, discounts, rooms);
      const p = fin.payment;

      if (statusFilter === "settled" && !fin.isPaid) return;
      if (statusFilter === "partial" && !fin.isPartial) return;
      if (statusFilter === "pending" && (fin.isPaid || fin.isPartial)) return;

      // Normalize channel
      const rawMethod = (p?.payment_method || "CASH").toUpperCase();
      let channel: "UPI" | "CARD" | "CASH" | "BANK_TRANSFER" | "OTHER" = "CASH";
      if (rawMethod.includes("UPI") || rawMethod.includes("GPAY") || rawMethod.includes("PHONEPE") || rawMethod.includes("PAYTM") || rawMethod.includes("QR")) {
        channel = "UPI";
      } else if (rawMethod.includes("CARD") || rawMethod.includes("POS") || rawMethod.includes("DEBIT") || rawMethod.includes("CREDIT")) {
        channel = "CARD";
      } else if (rawMethod.includes("BANK") || rawMethod.includes("TRANSFER") || rawMethod.includes("NEFT") || rawMethod.includes("RTGS") || rawMethod.includes("IMPS")) {
        channel = "BANK_TRANSFER";
      } else if (rawMethod.includes("CASH")) {
        channel = "CASH";
      } else {
        channel = "OTHER";
      }

      if (channelFilter !== "all" && channel !== channelFilter) return;

      const guest = getGuest(res.guest_id);
      const room = getRoom(res.room_id);

      const searchLower = searchQuery.toLowerCase().trim();
      const invoiceNum = `INV-${String(res.id).slice(0, 8).toUpperCase()}`;
      const rawResId = String(res.id || "").toLowerCase();
      const rawPayId = String(p?.id || "").toLowerCase();
      const guestGstin = (res as any)?.gst_number || guest?.gst_number || "";
      const companyName = (res as any)?.company_name || (guest as any)?.company_name || "";
      const guestAddress = (res as any)?.address || (guest as any)?.address || "";

      if (
        searchLower &&
        !invoiceNum.toLowerCase().includes(searchLower) &&
        !rawResId.includes(searchLower) &&
        !rawPayId.includes(searchLower) &&
        !guest?.name?.toLowerCase().includes(searchLower) &&
        !companyName.toLowerCase().includes(searchLower) &&
        !guestGstin.toLowerCase().includes(searchLower) &&
        !guestAddress.toLowerCase().includes(searchLower) &&
        !guest?.phone?.includes(searchLower) &&
        !room?.room_number?.toLowerCase().includes(searchLower) &&
        !res?.event_type?.toLowerCase().includes(searchLower) &&
        !((res as any)?.customer_name && (res as any).customer_name.toLowerCase().includes(searchLower))
      ) {
        return;
      }

      list.push({
        id: p?.id || res.id,
        paymentId: p?.id,
        reservationId: res.id,
        invoiceNum,
        date: resDateStr,
        guestName: guest?.name || (res as any)?.customer_name || "Guest",
        companyName,
        guestAddress,
        guestPhone: guest?.phone || (res as any)?.customer_phone || "—",
        guestGstin,
        resourceType: isPartyHall ? "PARTY_HALL" : "ROOM",
        resourceLabel: isPartyHall ? `Party Hall (${res?.event_type || "Banquet"})` : room ? `Room ${room.room_number} (${room.room_name || "Standard"})` : "Room Stay",
        taxableBase: fin.taxableValue,
        cgst: fin.cgst,
        sgst: fin.sgst,
        totalGst: fin.totalGst,
        grandTotal: fin.grandTotal,
        paid: fin.paid,
        balance: fin.balance,
        channel,
        channelRaw: p?.payment_method || "CASH",
        isPaid: fin.isPaid,
        isPartial: fin.isPartial,
        status: fin.isPaid ? "SETTLED" : fin.isPartial ? "PARTIAL / ADVANCE" : "PENDING",
      });
    });

    // Also include standalone payment records if any exist without an active reservation
    payments.forEach((p) => {
      if (p.reservation_id && processedResIds.has(p.reservation_id.toLowerCase())) return;

      const totalBill = Number(p.total_amount) || 0;
      if (totalBill <= 0) return;

      const gstDivisor = 1.05;
      const taxableBase = Math.round(totalBill / gstDivisor);
      const totalGst = totalBill - taxableBase;
      const cgst = Number((totalGst / 2).toFixed(2));
      const sgst = Number((totalGst - cgst).toFixed(2));
      const grandTotal = totalBill;
      const paid = Number(p.paid_amount) || 0;
      const balance = Math.max(0, grandTotal - paid);
      const isPaid = balance === 0 && grandTotal > 0;
      const isPartial = !isPaid && (p.status === "PARTIAL" || paid > 0);

      const rawMethod = (p.payment_method || "CASH").toUpperCase();
      let channel: "UPI" | "CARD" | "CASH" | "BANK_TRANSFER" | "OTHER" = "CASH";
      if (rawMethod.includes("UPI") || rawMethod.includes("GPAY") || rawMethod.includes("PHONEPE") || rawMethod.includes("PAYTM") || rawMethod.includes("QR")) {
        channel = "UPI";
      } else if (rawMethod.includes("CARD") || rawMethod.includes("POS") || rawMethod.includes("DEBIT") || rawMethod.includes("CREDIT")) {
        channel = "CARD";
      } else if (rawMethod.includes("BANK") || rawMethod.includes("TRANSFER") || rawMethod.includes("NEFT") || rawMethod.includes("RTGS") || rawMethod.includes("IMPS")) {
        channel = "BANK_TRANSFER";
      } else if (rawMethod.includes("CASH")) {
        channel = "CASH";
      } else {
        channel = "OTHER";
      }

      if (channelFilter !== "all" && channel !== channelFilter) return;
      if (statusFilter === "settled" && !isPaid) return;
      if (statusFilter === "partial" && !isPartial) return;
      if (statusFilter === "pending" && (isPaid || isPartial)) return;

      list.push({
        id: p.id,
        paymentId: p.id,
        reservationId: p.reservation_id || p.id,
        invoiceNum: `INV-${String(p.id).slice(0, 8).toUpperCase()}`,
        date: todayStr,
        guestName: "Direct Payment",
        guestPhone: "—",
        guestGstin: "",
        resourceType: "ROOM",
        resourceLabel: "Direct Payment Receipt",
        taxableBase,
        cgst,
        sgst,
        totalGst,
        grandTotal,
        paid,
        balance,
        channel,
        channelRaw: p.payment_method || "CASH",
        isPaid,
        isPartial,
        status: isPaid ? "SETTLED" : isPartial ? "PARTIAL / ADVANCE" : "PENDING",
      });
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [reservations, payments, discounts, rooms, guests, startDate, endDate, resourceFilter, channelFilter, statusFilter, searchQuery, todayStr, timeframe]);

  // Aggregate Financial & Inflow Metrics
  const metrics = React.useMemo(() => {
    let grossRevenue = 0;
    let netTaxableTurnover = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalGst = 0;
    let totalInflowCollected = 0;
    let totalOutstanding = 0;

    // Channel breakdown
    let upiTotal = 0, upiCount = 0;
    let cardTotal = 0, cardCount = 0;
    let cashTotal = 0, cashCount = 0;
    let bankTotal = 0, bankCount = 0;
    let otherTotal = 0, otherCount = 0;

    // Resource breakdown
    let roomsTaxable = 0, roomsGst = 0, roomsTotal = 0, roomsInflow = 0;
    let partyTaxable = 0, partyGst = 0, partyTotal = 0, partyInflow = 0;

    transactions.forEach((tx) => {
      grossRevenue += tx.grandTotal;
      netTaxableTurnover += tx.taxableBase;
      totalCgst += tx.cgst;
      totalSgst += tx.sgst;
      totalGst += tx.totalGst;
      totalInflowCollected += tx.paid;
      totalOutstanding += tx.balance;

      if (tx.channel === "UPI") {
        upiTotal += tx.paid;
        upiCount++;
      } else if (tx.channel === "CARD") {
        cardTotal += tx.paid;
        cardCount++;
      } else if (tx.channel === "CASH") {
        cashTotal += tx.paid;
        cashCount++;
      } else if (tx.channel === "BANK_TRANSFER") {
        bankTotal += tx.paid;
        bankCount++;
      } else {
        otherTotal += tx.paid;
        otherCount++;
      }

      if (tx.resourceType === "ROOM") {
        roomsTaxable += tx.taxableBase;
        roomsGst += tx.totalGst;
        roomsTotal += tx.grandTotal;
        roomsInflow += tx.paid;
      } else {
        partyTaxable += tx.taxableBase;
        partyGst += tx.totalGst;
        partyTotal += tx.grandTotal;
        partyInflow += tx.paid;
      }
    });

    // Operational expenses in timeframe
    const totalExpenses = expenses
      .filter((e) => {
        const d = new Date(e.date || todayStr);
        return d >= startDate && d <= endDate;
      })
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const netRealizedCashFlow = totalInflowCollected - totalExpenses;

    return {
      grossRevenue,
      netTaxableTurnover,
      totalCgst,
      totalSgst,
      totalGst,
      totalInflowCollected,
      totalOutstanding,
      totalExpenses,
      netRealizedCashFlow,
      upi: { total: upiTotal, count: upiCount, pct: totalInflowCollected > 0 ? (upiTotal / totalInflowCollected) * 100 : 0 },
      card: { total: cardTotal, count: cardCount, pct: totalInflowCollected > 0 ? (cardTotal / totalInflowCollected) * 100 : 0 },
      cash: { total: cashTotal, count: cashCount, pct: totalInflowCollected > 0 ? (cashTotal / totalInflowCollected) * 100 : 0 },
      bank: { total: bankTotal, count: bankCount, pct: totalInflowCollected > 0 ? (bankTotal / totalInflowCollected) * 100 : 0 },
      other: { total: otherTotal, count: otherCount, pct: totalInflowCollected > 0 ? (otherTotal / totalInflowCollected) * 100 : 0 },
      rooms: { taxable: roomsTaxable, gst: roomsGst, total: roomsTotal, inflow: roomsInflow, pct: totalInflowCollected > 0 ? (roomsInflow / totalInflowCollected) * 100 : 0 },
      party: { taxable: partyTaxable, gst: partyGst, total: partyTotal, inflow: partyInflow, pct: totalInflowCollected > 0 ? (partyInflow / totalInflowCollected) * 100 : 0 },
    };
  }, [transactions, expenses, startDate, endDate, todayStr]);

  // Export 1: Full Audit Ledger CSV
  const handleExportAuditLedger = () => {
    const headers = [
      "Invoice Number",
      "Date",
      "Guest Name",
      "Phone",
      "Guest GSTIN",
      "Resource Type",
      "Resource Details",
      "Taxable Value (INR)",
      "CGST (INR)",
      "SGST (INR)",
      "Total GST (INR)",
      "Gross Total (INR)",
      "Amount Paid (INR)",
      "Balance Due (INR)",
      "Payment Channel",
      "Settlement Status"
    ];

    const rows = transactions.map((tx) => [
      `"${tx.invoiceNum}"`,
      `"${tx.date}"`,
      `"${tx.guestName.replace(/"/g, '""')}"`,
      `"${tx.guestPhone}"`,
      `"${tx.guestGstin || "—"}"`,
      `"${tx.resourceType}"`,
      `"${tx.resourceLabel.replace(/"/g, '""')}"`,
      tx.taxableBase.toFixed(2),
      tx.cgst.toFixed(2),
      tx.sgst.toFixed(2),
      tx.totalGst.toFixed(2),
      tx.grandTotal.toFixed(2),
      tx.paid.toFixed(2),
      tx.balance.toFixed(2),
      `"${tx.channel}"`,
      `"${tx.status}"`
    ]);

    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    downloadCSV(csvString, `HOTEL_DRB_Audit_Ledger_${todayStr}.csv`);
    toast.success("Audit Transaction Ledger exported successfully!");
  };

  // Export 2: GSTR-1 Monthly Tax Return CSV
  const handleExportGSTR1 = () => {
    const headers = [
      "GSTIN/UIN of Recipient",
      "Receiver Name",
      "Invoice Number",
      "Invoice date",
      "Invoice Value",
      "Place Of Supply",
      "Reverse Charge",
      "Applicable % of Tax Rate",
      "Invoice Type",
      "E-Commerce GSTIN",
      "Rate",
      "Taxable Value",
      "Cess Amount"
    ];

    const rows = transactions.map((tx) => [
      `"${tx.guestGstin || "Unregistered"}"`,
      `"${tx.guestName.replace(/"/g, '""')}"`,
      `"${tx.invoiceNum}"`,
      `"${tx.date}"`,
      tx.grandTotal.toFixed(2),
      `"33-Tamil Nadu"`,
      `"N"`,
      `"5%"`,
      tx.guestGstin ? `"B2B Regular"` : `"Regular"`,
      `""`,
      `"5.00"`,
      tx.taxableBase.toFixed(2),
      `"0.00"`
    ]);

    const csvString = [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    downloadCSV(csvString, `HOTEL_DRB_GSTR1_Return_${todayStr}.csv`);
    toast.success("GSTR-1 Monthly Tax Return format exported successfully!");
  };

  const handleOpenCollectModal = (tx: any) => {
    setSelectedPaymentForCollect(tx);
    setCollectAmount(String(tx.balance > 0 ? tx.balance : 0));
    setCollectMethod("CASH");
    setCollectModalOpen(true);
  };

  const handleSaveCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForCollect) return;

    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      return toast.error("Please enter a valid collection amount");
    }

    setSettling(true);
    const res = await settlePayment(selectedPaymentForCollect.reservationId || selectedPaymentForCollect.paymentId, amt, collectMethod);
    setSettling(false);

    if (res.success) {
      toast.success(`Payment of ${inr(amt)} recorded via ${collectMethod}!`);
      setCollectModalOpen(false);
      setSelectedPaymentForCollect(null);
    } else {
      toast.error(res.error || "Failed to settle payment");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        eyebrow="Financial Management & Audit"
        title="Payment Dashboard & Inflow Analytics"
        subtitle={`Comprehensive Financial Inflow, Audit Ledger, Monthly GST Filing Calculator & Channel Analytics · ${dateRangeLabel}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl border-gold/40 text-gold hover:bg-gold/10"
              onClick={handleExportAuditLedger}
            >
              <FileSpreadsheet className="mr-1.5 size-4" /> Export Ledger (Excel/CSV)
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-border hover:bg-secondary"
              onClick={handleExportGSTR1}
            >
              <Download className="mr-1.5 size-4 text-emerald-600" /> Export GSTR-1 Return
            </Button>
            <Link to="/billing">
              <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 shadow-brass">
                <Printer className="mr-1.5 size-4" /> View Invoices & Bills
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
            <span className="text-xs font-semibold uppercase text-foreground">Audit Period:</span>
            <div className="inline-flex rounded-xl bg-secondary/80 p-1">
              <Button
                size="sm"
                variant={timeframe === "ALL" ? "default" : "ghost"}
                className={timeframe === "ALL" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("ALL")}
              >
                All Time
              </Button>
              <Button
                size="sm"
                variant={timeframe === "1D" ? "default" : "ghost"}
                className={timeframe === "1D" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("1D")}
              >
                Daily (Today)
              </Button>
              <Button
                size="sm"
                variant={timeframe === "1W" ? "default" : "ghost"}
                className={timeframe === "1W" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("1W")}
              >
                Weekly (7 Days)
              </Button>
              <Button
                size="sm"
                variant={timeframe === "1M" ? "default" : "ghost"}
                className={timeframe === "1M" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("1M")}
              >
                Monthly (Current Month)
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
            Current Filter: <span className="font-semibold text-gold">{dateRangeLabel}</span>
          </div>
        </div>
      </Panel>

      {/* Top Level Financial Summary KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Total Inflow Realized (${dateRangeLabel})`}
          value={inr(metrics.totalInflowCollected)}
          icon={CheckCircle2}
          tone="success"
          hint={`Realized Inflow across all channels`}
        />
        <KpiCard
          label="Net Taxable Turnover"
          value={inr(metrics.netTaxableTurnover)}
          icon={DollarSign}
          tone="gold"
          hint="Gross revenue excluding taxes"
        />
        <KpiCard
          label="Total Output GST (5%)"
          value={inr(metrics.totalGst)}
          icon={Calculator}
          tone="info"
          hint={`CGST: ${inr(metrics.totalCgst)} | SGST: ${inr(metrics.totalSgst)}`}
        />
        <KpiCard
          label="Net Cash Flow (After Expenses)"
          value={inr(metrics.netRealizedCashFlow)}
          icon={TrendingUp}
          tone={metrics.netRealizedCashFlow >= 0 ? "success" : "destructive"}
          hint={`Expenses: -${inr(metrics.totalExpenses)}`}
        />
      </div>

      {/* Monthly GST Calculation & Tax Audit Center */}
      <Panel
        title="Monthly GST Calculation & Tax Compliance Calculator"
        subtitle={`Audit-ready Output Tax computations for DRB Hotel under GSTIN: 33ABQPD6510M4ZI (State Code: 33)`}
        bodyClassName="p-6 space-y-6"
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {/* GST Slabs Summary Table */}
          <div className="lg:col-span-2 rounded-xl border border-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/40">
                  <TableHead>Service / SAC Category</TableHead>
                  <TableHead className="text-center">SAC Code</TableHead>
                  <TableHead className="text-right">Taxable Turnover (₹)</TableHead>
                  <TableHead className="text-right">CGST</TableHead>
                  <TableHead className="text-right">SGST</TableHead>
                  <TableHead className="text-right font-bold">Total GST</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-1.5">
                      <BedDouble className="size-4 text-gold" />
                      <span>Room Stays & Lodging (5%)</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">996311</TableCell>
                  <TableCell className="text-right font-mono">{inr(metrics.rooms.taxable)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(metrics.rooms.gst / 2)} <span className="text-[10px] text-muted-foreground block">(2.5%)</span></TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(metrics.rooms.gst / 2)} <span className="text-[10px] text-muted-foreground block">(2.5%)</span></TableCell>
                  <TableCell className="text-right font-mono font-bold text-gold">{inr(metrics.rooms.gst)} <span className="text-[10px] text-muted-foreground font-normal block">(5.0%)</span></TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-semibold">
                    <div className="flex items-center gap-1.5">
                      <PartyPopper className="size-4 text-gold" />
                      <span>Party Hall & Banquets (18%)</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">996312</TableCell>
                  <TableCell className="text-right font-mono">{inr(metrics.party.taxable)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(metrics.party.gst / 2)} <span className="text-[10px] text-muted-foreground block">(9.0%)</span></TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(metrics.party.gst / 2)} <span className="text-[10px] text-muted-foreground block">(9.0%)</span></TableCell>
                  <TableCell className="text-right font-mono font-bold text-gold">{inr(metrics.party.gst)} <span className="text-[10px] text-muted-foreground font-normal block">(18.0%)</span></TableCell>
                </TableRow>
                <TableRow className="bg-secondary/20 font-bold border-t-2 border-border">
                  <TableCell colSpan={2} className="text-foreground">
                    Total Taxable Aggregate Turnover
                  </TableCell>
                  <TableCell className="text-right font-mono text-foreground font-bold">{inr(metrics.netTaxableTurnover)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(metrics.totalCgst)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{inr(metrics.totalSgst)}</TableCell>
                  <TableCell className="text-right font-mono font-bold text-sm text-gold">{inr(metrics.totalGst)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          {/* Tax Liability Card */}
          <div className="rounded-xl border border-border p-5 bg-secondary/10 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-xs font-bold uppercase tracking-wider text-gold">GST Return Summary</span>
                <Pill tone="gold">GSTR-1 / 3B</Pill>
              </div>
              <div className="space-y-3 pt-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Output Tax:</span>
                  <span className="font-bold text-foreground">{inr(metrics.totalGst)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Eligible Input Tax Credit (ITC):</span>
                  <span className="font-semibold text-emerald-600">₹0.00</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 text-sm font-bold">
                  <span>Net GST Output Payable:</span>
                  <span className="text-gold font-mono">{inr(metrics.totalGst)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold border-gold/40 text-gold hover:bg-gold/10"
                onClick={handleExportGSTR1}
              >
                <Download className="mr-1.5 size-3.5" /> Download GSTR-1 CSV Return
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                *Ready for GST Portal monthly / quarterly filing upload
              </p>
            </div>
          </div>
        </div>
      </Panel>

      {/* Payment Collections by Method (Channel Distribution) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Payment Collections by Method & Channel ({dateRangeLabel})
          </div>
          <div className="text-xs text-muted-foreground">
            Total Inflow: <span className="font-bold text-emerald-600">{inr(metrics.totalInflowCollected)}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {/* UPI Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-gold/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <QrCode className="size-5" />
              </div>
              <span className="text-xs font-mono font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                {metrics.upi.pct.toFixed(1)}%
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground font-mono">{inr(metrics.upi.total)}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-0.5">UPI / QR (GPay, PhonePe, Paytm)</div>
            </div>
            <div className="pt-1 border-t border-border/60 text-xs text-muted-foreground flex justify-between">
              <span>Transactions:</span>
              <span className="font-semibold text-foreground">{metrics.upi.count} txns</span>
            </div>
          </div>

          {/* Card POS Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-gold/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <CreditCard className="size-5" />
              </div>
              <span className="text-xs font-mono font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full">
                {metrics.card.pct.toFixed(1)}%
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground font-mono">{inr(metrics.card.total)}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-0.5">Card Swipes (POS Terminal)</div>
            </div>
            <div className="pt-1 border-t border-border/60 text-xs text-muted-foreground flex justify-between">
              <span>Transactions:</span>
              <span className="font-semibold text-foreground">{metrics.card.count} txns</span>
            </div>
          </div>

          {/* Cash in Drawer Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-gold/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Banknote className="size-5" />
              </div>
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {metrics.cash.pct.toFixed(1)}%
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground font-mono">{inr(metrics.cash.total)}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-0.5">Cash in Drawer / Hand</div>
            </div>
            <div className="pt-1 border-t border-border/60 text-xs text-muted-foreground flex justify-between">
              <span>Transactions:</span>
              <span className="font-semibold text-foreground">{metrics.cash.count} txns</span>
            </div>
          </div>

          {/* Bank Transfer Card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-3 hover:border-gold/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                <Landmark className="size-5" />
              </div>
              <span className="text-xs font-mono font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                {metrics.bank.pct.toFixed(1)}%
              </span>
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground font-mono">{inr(metrics.bank.total)}</div>
              <div className="text-xs font-semibold text-muted-foreground mt-0.5">Bank Transfer / NEFT / RTGS</div>
            </div>
            <div className="pt-1 border-t border-border/60 text-xs text-muted-foreground flex justify-between">
              <span>Transactions:</span>
              <span className="font-semibold text-foreground">{metrics.bank.count} txns</span>
            </div>
          </div>
        </div>
      </div>

      {/* Inflow by Revenue Streams & Operational Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel
          title="Revenue & Inflow by Resource Stream"
          subtitle="Distribution between Room Stays vs Banquet / Party Hall"
          bodyClassName="p-5 space-y-4"
        >
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <div className="flex items-center gap-1.5">
                  <BedDouble className="size-4 text-gold" />
                  <span>Rooms Lodging Revenue</span>
                </div>
                <span className="font-mono text-foreground font-bold">{inr(metrics.rooms.inflow)} ({metrics.rooms.pct.toFixed(1)}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-gold rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.rooms.pct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                <span>Taxable Base: {inr(metrics.rooms.taxable)}</span>
                <span>GST (5%): {inr(metrics.rooms.gst)}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <div className="flex items-center gap-1.5">
                  <PartyPopper className="size-4 text-purple-600" />
                  <span>Party Hall & Banquets</span>
                </div>
                <span className="font-mono text-foreground font-bold">{inr(metrics.party.inflow)} ({metrics.party.pct.toFixed(1)}%)</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.party.pct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                <span>Taxable Base: {inr(metrics.party.taxable)}</span>
                <span>GST (5%): {inr(metrics.party.gst)}</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Cash Flow & Audit Reconciliation"
          subtitle="Operating Inflow vs Operational Expenses summary"
          bodyClassName="p-5 space-y-4"
        >
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
              <span className="font-semibold text-emerald-700">Gross Realized Cash Inflow (+)</span>
              <span className="font-mono font-bold text-sm text-emerald-600">{inr(metrics.totalInflowCollected)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-destructive/5 border border-destructive/20">
              <span className="font-semibold text-destructive">Operational Expenses Deducted (-)</span>
              <span className="font-mono font-bold text-sm text-destructive">-{inr(metrics.totalExpenses)}</span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-gold/5 border border-gold/20">
              <span className="font-bold text-foreground">Net Realized Cash Balance (=)</span>
              <span className={`font-mono font-bold text-base ${metrics.netRealizedCashFlow >= 0 ? "text-gold" : "text-destructive"}`}>
                {inr(metrics.netRealizedCashFlow)}
              </span>
            </div>
            <div className="flex justify-between items-center p-2 rounded-lg bg-secondary/40">
              <span className="text-muted-foreground">Outstanding Accounts Receivable (Pending)</span>
              <span className="font-mono font-bold text-amber-600">{inr(metrics.totalOutstanding)}</span>
            </div>
          </div>
        </Panel>
      </div>

      {/* Comprehensive Audit & Transaction Ledger Table */}
      <Panel
        title="Comprehensive Audit & Transaction Ledger"
        subtitle={`Complete itemized financial transaction entries for ${dateRangeLabel}`}
        bodyClassName="p-4 space-y-4"
      >
        {/* Search and Filters Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Invoice #, Guest Name, Phone, Room or Party Hall..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Modes</SelectItem>
                <SelectItem value="UPI">UPI / QR (GPay/PhonePe)</SelectItem>
                <SelectItem value="CARD">Card Swipes (POS)</SelectItem>
                <SelectItem value="CASH">Cash Counter</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Settlement Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="settled">Settled / Fully Paid</SelectItem>
                <SelectItem value="partial">Partial / Advance</SelectItem>
                <SelectItem value="pending">Pending / Open</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Resource Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                <SelectItem value="rooms">Room Stays</SelectItem>
                <SelectItem value="party_hall">Party Hall</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Guest & Contact</TableHead>
                <TableHead>Resource / Room</TableHead>
                <TableHead className="text-right">Taxable Base</TableHead>
                <TableHead className="text-right">GST (5%)</TableHead>
                <TableHead className="text-right">Gross Total</TableHead>
                <TableHead className="text-right">Paid (Inflow)</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id} className="hover:bg-accent/40">
                  <TableCell className="font-mono text-xs font-bold text-gold">
                    {tx.invoiceNum}
                  </TableCell>

                  <TableCell className="text-xs font-medium">
                    {tx.date}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground flex-wrap">
                      <span>{tx.guestName}</span>
                      {tx.guestGstin && (
                        <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1 py-0.5 rounded">
                          GST: {tx.guestGstin}
                        </span>
                      )}
                    </div>
                    {tx.companyName && (
                      <div className="text-xs font-medium text-gold flex items-center gap-1 mt-0.5">
                        <Building2 className="size-3" />
                        <span>{tx.companyName}</span>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground">{tx.guestPhone}</div>
                  </TableCell>

                  <TableCell>
                    {tx.resourceType === "PARTY_HALL" ? (
                      <div className="flex items-center gap-1 text-xs font-semibold text-purple-600">
                        <PartyPopper className="size-3.5" />
                        <span>{tx.resourceLabel}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs font-medium">
                        <BedDouble className="size-3.5 text-muted-foreground" />
                        <span>{tx.resourceLabel}</span>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-right font-mono text-xs">
                    {inr(tx.taxableBase)}
                  </TableCell>

                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {inr(tx.totalGst)}
                  </TableCell>

                  <TableCell className="text-right font-mono font-bold text-foreground">
                    {inr(tx.grandTotal)}
                  </TableCell>

                  <TableCell className="text-right font-mono font-bold text-emerald-600">
                    {inr(tx.paid)}
                  </TableCell>

                  <TableCell className={`text-right font-mono ${tx.balance > 0 ? "font-bold text-amber-600" : "text-muted-foreground text-xs"}`}>
                    {tx.balance > 0 ? inr(tx.balance) : "₹0 (Cleared)"}
                  </TableCell>

                  <TableCell>
                    <Pill tone={tx.channel === "UPI" ? "info" : tx.channel === "CARD" ? "gold" : tx.channel === "CASH" ? "success" : "default"}>
                      {tx.channel}
                    </Pill>
                  </TableCell>

                  <TableCell>
                    <Pill tone={tx.isPaid ? "success" : tx.isPartial ? "warning" : "destructive"}>
                      {tx.status}
                    </Pill>
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {tx.balance > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-gold/40 text-gold hover:bg-gold/10"
                          onClick={() => handleOpenCollectModal(tx)}
                        >
                          Collect
                        </Button>
                      )}
                      <Link to="/billing">
                        <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground hover:text-foreground">
                          Invoice
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {!transactions.length && (
          <div className="p-8">
            <EmptyState
              title="No Transactions Found"
              body="No payment or ledger entries match the selected audit timeframe and filter criteria."
              icon={Receipt}
            />
          </div>
        )}
      </Panel>

      {/* Collect Balance Modal */}
      <Dialog open={collectModalOpen} onOpenChange={setCollectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Settle Balance & Record Inflow</DialogTitle>
            <DialogDescription>
              Record payment settlement for this audit transaction entry.
            </DialogDescription>
          </DialogHeader>

          {selectedPaymentForCollect && (
            <form onSubmit={handleSaveCollect} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Amount to Settle (₹) *</Label>
                <Input
                  type="number"
                  required
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Mode *</Label>
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
