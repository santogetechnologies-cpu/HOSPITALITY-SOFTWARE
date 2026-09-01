import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Pill, KpiCard, EmptyState } from "@/components/pms/bits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { usePms } from "@/lib/pms-store";
import { useSettings } from "@/lib/use-settings";
import { inr } from "@/lib/pms-data";
import { getReservationFinancials as calculateReservationFinancials } from "@/lib/financials";
import { toast } from "sonner";
import {
  Printer,
  Receipt,
  Search,
  CalendarDays,
  CreditCard,
  Banknote,
  QrCode,
  Landmark,
  CheckCircle2,
  Clock,
  BedDouble,
  PartyPopper,
  DollarSign,
  Download,
} from "lucide-react";

export const Route = createFileRoute("/_shell/billing")({
  head: () => ({
    meta: [
      { title: "Bills & Invoicing — HOTEL DRB" },
      { name: "description", content: "Generate, preview and print official HOTEL DRB tax invoices and folios in the exact standard tax invoice format." },
      { property: "og:title", content: "HOTEL DRB — Bills & Invoicing" },
    ],
  }),
  component: BillingPage,
});

type Timeframe = "1D" | "1W" | "1M" | "ALL" | "CUSTOM";
type PaperSize = "A4" | "A3" | "THERMAL_80" | "THERMAL_58" | "DOT_MATRIX";

function numberToWordsINR(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded === 0) return "Rupees Zero Only";

  const a = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
  ];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function inWords(num: number): string {
    if (num === 0) return "";
    if (num < 20) return a[num] + " ";
    if (num < 100) return b[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + a[num % 10] : "") + " ";
    if (num < 1000) return inWords(Math.floor(num / 100)) + "Hundred " + inWords(num % 100);
    if (num < 100000) return inWords(Math.floor(num / 1000)) + "Thousand " + inWords(num % 1000);
    if (num < 10000000) return inWords(Math.floor(num / 100000)) + "Lakh " + inWords(num % 100000);
    return inWords(Math.floor(num / 10000000)) + "Crore " + inWords(num % 10000000);
  }

  return `Rupees ${inWords(rounded).trim()} Only`;
}

function formatDateDMY(dateInput?: string | Date): string {
  if (!dateInput) return new Date().toLocaleDateString("en-GB").replace(/\//g, "-");
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatTimeAMPM(dateInput?: string | Date): string {
  if (!dateInput) return "10:40 AM";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "10:40 AM";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function BillingPage() {
  const { reservations, guests, rooms, payments, discounts, session, settlePayment } = usePms();
  const { settings } = useSettings();

  // Timeframe filter state
  const todayStr = new Date().toISOString().split("T")[0];
  const [timeframe, setTimeframe] = React.useState<Timeframe>("ALL");
  const [customStart, setCustomStart] = React.useState<string>(todayStr);
  const [customEnd, setCustomEnd] = React.useState<string>(todayStr);
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [resourceFilter, setResourceFilter] = React.useState<string>("all");

  // Print Modal State
  const [printModalOpen, setPrintModalOpen] = React.useState(false);
  const [selectedResForBill, setSelectedResForBill] = React.useState<any>(null);
  const [paperSize, setPaperSize] = React.useState<PaperSize>("A4");
  const [includeGst, setIncludeGst] = React.useState(true);

  // Quick Collect Balance Modal State
  const [collectModalOpen, setCollectModalOpen] = React.useState(false);
  const [selectedResForCollect, setSelectedResForCollect] = React.useState<any>(null);
  const [collectAmount, setCollectAmount] = React.useState("");
  const [collectMethod, setCollectMethod] = React.useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER">("CASH");
  const [settling, setSettling] = React.useState(false);

  // Compute Active Date Range
  const { startDate, endDate, dateRangeLabel } = React.useMemo(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    let label = "All Bills (All Time)";

    if (timeframe === "ALL") {
      label = "All Bills (All Time)";
    } else if (timeframe === "1D") {
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

  // Helper resolvers
  const getGuest = (guestId?: string) => guests.find((g) => g.id === guestId);
  const getRoom = (roomId?: string) => rooms.find((r) => r.id === roomId);
  const getPayment = (resId: string) =>
    payments.find((p) => p.reservation_id === resId || p.reservation_id?.toLowerCase() === resId.toLowerCase());

  const getReservationFinancials = (r: (typeof reservations)[0]) => {
    return calculateReservationFinancials(r, payments, discounts, rooms);
  };

  // Filtered reservations
  const filteredReservations = React.useMemo(() => {
    return reservations.filter((r) => {
      if (r.status === "CANCELLED") return false;

      // If search query is entered or timeframe is ALL, skip date bounding
      if (!searchQuery.trim() && timeframe !== "ALL") {
        const rDateStr = r.booking_date || (r.start_time ? r.start_time.split("T")[0] : todayStr);
        const rDate = new Date(`${rDateStr}T00:00:00`);
        if (rDate < startDate || rDate > endDate) return false;
      }

      if (resourceFilter === "rooms" && r.resource_type !== "ROOM") return false;
      if (resourceFilter === "party_hall" && r.resource_type !== "PARTY_HALL") return false;

      const fin = getReservationFinancials(r);
      if (statusFilter === "settled" && !fin.isPaid) return false;
      if (statusFilter === "partial" && !fin.isPartial) return false;
      if (statusFilter === "pending" && (fin.isPaid || fin.isPartial)) return false;

      if (!searchQuery.trim()) return true;
      const guest = getGuest(r.guest_id);
      const room = getRoom(r.room_id);
      const term = searchQuery.toLowerCase().trim();
      const folioNum = `INV-${r.id.slice(0, 8).toUpperCase()}`;
      const shortId = r.id.toLowerCase();
      const guestGstin = (r as any).gst_number || guest?.gst_number || "";

      return (
        r.id.toLowerCase().includes(term) ||
        shortId.includes(term) ||
        folioNum.toLowerCase().includes(term) ||
        (guest?.name && guest.name.toLowerCase().includes(term)) ||
        (guest?.phone && guest.phone.includes(term)) ||
        (guestGstin && guestGstin.toLowerCase().includes(term)) ||
        (room?.room_number && room.room_number.toLowerCase().includes(term)) ||
        (r.event_type && r.event_type.toLowerCase().includes(term)) ||
        ((r as any).customer_name && (r as any).customer_name.toLowerCase().includes(term))
      );
    });
  }, [reservations, startDate, endDate, resourceFilter, statusFilter, searchQuery, todayStr, payments, discounts, timeframe]);

  const kpiData = React.useMemo(() => {
    let totalBilled = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let settledCount = 0;
    let advanceCount = 0;
    let pendingCount = 0;

    filteredReservations.forEach((r) => {
      const fin = getReservationFinancials(r);
      totalBilled += fin.grandTotal;
      totalCollected += fin.paid;
      totalOutstanding += fin.balance;
      if (fin.isPaid) settledCount++;
      else if (fin.isPartial) advanceCount++;
      else pendingCount++;
    });

    return {
      totalBilled,
      totalCollected,
      totalOutstanding,
      settledCount,
      advanceCount,
      pendingCount,
    };
  }, [filteredReservations]);

  const handleOpenPrintBill = (r: (typeof reservations)[0]) => {
    setSelectedResForBill(r);
    setPrintModalOpen(true);
  };

  const handleOpenCollectBalance = (r: (typeof reservations)[0]) => {
    const fin = getReservationFinancials(r);
    setSelectedResForCollect(r);
    setCollectAmount(String(fin.balance > 0 ? fin.balance : 0));
    setCollectMethod("CASH");
    setCollectModalOpen(true);
  };

  const handleSaveCollect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResForCollect) return;

    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      return toast.error("Please enter a valid payment amount");
    }

    setSettling(true);
    const res = await settlePayment(selectedResForCollect.id, amt, collectMethod);
    setSettling(false);

    if (res.success) {
      toast.success(`Payment of ${inr(amt)} recorded via ${collectMethod}!`);
      setCollectModalOpen(false);
      setSelectedResForCollect(null);
    } else {
      toast.error(res.error || "Failed to settle payment");
    }
  };

  const handleTriggerBrowserPrint = () => {
    const printContent = document.getElementById("printable-bill");
    if (!printContent) {
      window.print();
      return;
    }

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>HOTEL DRB — TAX INVOICE</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 14mm;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #000000;
              background: #ffffff;
              padding: 0;
              font-size: 11px;
              line-height: 1.35;
            }
            #printable-bill {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              padding: 0 !important;
              box-shadow: none !important;
              border: none !important;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
              page-break-inside: avoid;
            }
            th, td {
              padding: 4px 6px;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .font-black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }
            .tracking-wider { letter-spacing: 0.05em; }
            .tracking-widest { letter-spacing: 0.1em; }
            .bg-neutral-50 { background-color: #f9fafb; }
            .bg-neutral-100 { background-color: #f3f4f6; }
          </style>
        </head>
        <body>
          ${printContent.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1500);
    }, 250);
  };

  const hotelInfo = {
    name: "HOTEL DRB",
    city: "MARTHANDAM",
    address: "Market Road, Marthandam, Tamil Nadu",
    phone: "04651-272302",
    mobile: "9442501809",
    gstin: "33ABQPD6510M4ZI",
    stateCode: "33",
    hsnSac: "9963",
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Operations & Billing"
        title="Bills & Guest Invoicing"
        subtitle={`Generate, configure, and print official HOTEL DRB Tax Invoices in exact standard format · ${dateRangeLabel}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                if (filteredReservations.length > 0) {
                  handleOpenPrintBill(filteredReservations[0]);
                } else {
                  toast.info("No active bill to preview");
                }
              }}
            >
              <Printer className="mr-1.5 size-4 text-gold" /> Preview Latest Bill
            </Button>
          </div>
        }
      />

      {/* Date & Timeframe Filter Toolbar */}
      <Panel bodyClassName="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-gold" />
            <span className="text-xs font-semibold uppercase text-foreground">Date Range:</span>
            <div className="inline-flex rounded-xl bg-secondary/80 p-1">
              <Button
                size="sm"
                variant={timeframe === "ALL" ? "default" : "ghost"}
                className={timeframe === "ALL" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("ALL")}
              >
                All Bills
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
                Monthly (30 Days)
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
            Filter Period: <span className="font-semibold text-gold">{dateRangeLabel}</span>
          </div>
        </div>
      </Panel>

      {/* Main KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Total Billed Amount (${dateRangeLabel})`}
          value={inr(kpiData.totalBilled)}
          icon={Receipt}
          tone="gold"
          hint={`${filteredReservations.length} total folios generated`}
        />
        <KpiCard
          label="Total Collected (Inflow)"
          value={inr(kpiData.totalCollected)}
          icon={CheckCircle2}
          tone="success"
          hint={`${kpiData.settledCount} fully paid + ${kpiData.advanceCount} advance`}
        />
        <KpiCard
          label="Outstanding Balance Due"
          value={inr(kpiData.totalOutstanding)}
          icon={Clock}
          tone={kpiData.totalOutstanding > 0 ? "warning" : "default"}
          hint={`${kpiData.advanceCount + kpiData.pendingCount} folios with open balances`}
        />
        <KpiCard
          label="Settlement Rate"
          value={kpiData.totalBilled > 0 ? `${Math.round((kpiData.totalCollected / kpiData.totalBilled) * 100)}%` : "100%"}
          icon={DollarSign}
          tone="info"
          hint="Collected vs Total Billed"
        />
      </div>

      {/* Filter and Search Bar */}
      <Panel bodyClassName="p-4 space-y-4">
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bill Statuses</SelectItem>
                <SelectItem value="settled">Settled / Fully Paid</SelectItem>
                <SelectItem value="partial">Advance / Partial Paid</SelectItem>
                <SelectItem value="pending">Unpaid / Open Folio</SelectItem>
              </SelectContent>
            </Select>

            <Select value={resourceFilter} onValueChange={setResourceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Booking Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bookings</SelectItem>
                <SelectItem value="rooms">Room Stays</SelectItem>
                <SelectItem value="party_hall">Party Hall</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Bills Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Guest & Contact</TableHead>
                <TableHead>Resource / Room</TableHead>
                <TableHead>Dates / Nights</TableHead>
                <TableHead>Taxable Amount</TableHead>
                <TableHead>GST (5%)</TableHead>
                <TableHead>Grand Total</TableHead>
                <TableHead>Paid / Advance</TableHead>
                <TableHead>Balance Due</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReservations.map((r) => {
                const guest = getGuest(r.guest_id);
                const room = getRoom(r.room_id);
                const fin = getReservationFinancials(r);
                const invoiceNum = String(r.id || "").replace(/\D/g, "").slice(-4) || "938";

                return (
                  <TableRow key={r.id} className="hover:bg-accent/40">
                    <TableCell className="font-mono text-xs font-bold text-gold">
                      #{invoiceNum}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-1.5 font-semibold text-sm text-foreground">
                        <span>{guest?.name || "Guest"}</span>
                        {((r as any).gst_number || guest?.gst_number) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            GST: {(r as any).gst_number || guest?.gst_number}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{guest?.phone || "No phone"}</div>
                    </TableCell>

                    <TableCell>
                      {r.resource_type === "PARTY_HALL" ? (
                        <div className="flex items-center gap-1 text-xs font-semibold text-gold">
                          <PartyPopper className="size-3.5" />
                          <span>Party Hall ({r.event_type || "Event"})</span>
                        </div>
                      ) : room ? (
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <BedDouble className="size-3.5 text-muted-foreground" />
                          <span>Room {room.room_number || (room as any)?.number} ({room.room_name || "Standard"})</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">General Stay</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <div className="text-xs font-medium">
                        {formatDateDMY(r.booking_date || (r.start_time ? r.start_time.split("T")[0] : todayStr))}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.resource_type === "PARTY_HALL" ? "Event Booking" : "Room Stay"}
                      </div>
                    </TableCell>

                    <TableCell className="font-medium">
                      {inr(fin.taxableValue)}
                    </TableCell>

                    <TableCell className="text-xs text-muted-foreground">
                      {inr(fin.totalGst)}
                    </TableCell>

                    <TableCell className="font-bold text-foreground">
                      {inr(fin.grandTotal)}
                    </TableCell>

                    <TableCell>
                      <div className="font-bold text-emerald-600">{inr(fin.paid)}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {fin.payment?.payment_method ? `(${fin.payment.payment_method})` : "Unsettled"}
                      </div>
                    </TableCell>

                    <TableCell className={fin.balance > 0 ? "font-bold text-amber-600" : "text-muted-foreground text-xs"}>
                      {fin.balance > 0 ? inr(fin.balance) : "₹0.00 (Cleared)"}
                    </TableCell>

                    <TableCell>
                      <Pill
                        tone={
                          fin.isPaid
                            ? "success"
                            : fin.isPartial
                            ? "warning"
                            : "destructive"
                        }
                      >
                        {fin.isPaid ? "PAID IN FULL" : fin.isPartial ? "ADVANCE PAID" : "PENDING"}
                      </Pill>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {fin.balance > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 rounded-lg text-xs border-gold/40 text-gold hover:bg-gold/10"
                            onClick={() => handleOpenCollectBalance(r)}
                          >
                            <CreditCard className="mr-1 size-3" /> Collect
                          </Button>
                        )}

                        <Button
                          size="sm"
                          className="h-8 rounded-lg text-xs bg-brass text-gold-foreground hover:opacity-90 font-semibold shadow-brass"
                          onClick={() => handleOpenPrintBill(r)}
                        >
                          <Printer className="mr-1 size-3.5" /> Print Bill
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {!filteredReservations.length && (
          <div className="p-8">
            <EmptyState
              title="No Bills Found"
              body="No reservations or billing records match the selected date range and filter criteria."
              icon={Receipt}
            />
          </div>
        )}
      </Panel>

      {/* Collect Balance Modal */}
      <Dialog open={collectModalOpen} onOpenChange={setCollectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Balance & Settle Bill</DialogTitle>
            <DialogDescription>
              Record cash, UPI, card, or bank transfer for this reservation folio.
            </DialogDescription>
          </DialogHeader>

          {selectedResForCollect && (
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
                    <SelectItem value="OTHER">Credit / Company Ledger</SelectItem>
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

      {/* Exact Standard HOTEL DRB Tax Invoice Modal */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl">HOTEL DRB — TAX INVOICE</DialogTitle>
                <DialogDescription>
                  Exact official tax invoice format with complete GST, day-by-day bill breakdown, and signatures.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedResForBill && (() => {
            const guest = getGuest(selectedResForBill.guest_id);
            const room = getRoom(selectedResForBill.room_id);
            const fin = getReservationFinancials(selectedResForBill);
            const invoiceNum = String(selectedResForBill.id || "").replace(/\D/g, "").slice(-4) || "938";
            
            const checkInDate = selectedResForBill.start_time 
              ? new Date(selectedResForBill.start_time)
              : new Date(`${selectedResForBill.booking_date || todayStr}T10:40:00`);
            
            const checkOutDate = selectedResForBill.end_time
              ? new Date(selectedResForBill.end_time)
              : new Date(checkInDate.getTime() + 5 * 24 * 60 * 60 * 1000);

            const diffTime = Math.abs(checkOutDate.getTime() - checkInDate.getTime());
            const nightsCount = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
            const ratePerNight = nightsCount > 0 ? fin.taxableValue / nightsCount : fin.taxableValue;

            // Generate daily rows
            const dailyTariffRows: { dateStr: string; amount: number }[] = [];
            const tempDate = new Date(checkInDate);
            for (let i = 0; i < nightsCount; i++) {
              dailyTariffRows.push({
                dateStr: formatDateDMY(tempDate),
                amount: ratePerNight,
              });
              tempDate.setDate(tempDate.getDate() + 1);
            }

            const invoiceDateStr = formatDateDMY(new Date());
            const checkInFormatted = `${formatDateDMY(checkInDate)}, ${formatTimeAMPM(checkInDate)}`;
            const checkOutFormatted = `${formatDateDMY(checkOutDate)}, ${formatTimeAMPM(checkOutDate)}`;
            const paymentModeStr = fin.payment?.payment_method || "Credit";

            return (
              <div className="space-y-6 pt-2">
                {/* Live Bill Preview Box with Exact HOTEL DRB Format */}
                <div className="overflow-x-auto bg-muted/40 p-4 rounded-xl border border-border flex justify-center">
                  <div
                    id="printable-bill"
                    className="w-full max-w-[760px] bg-white text-black p-8 rounded-lg shadow-sm border border-neutral-300 font-sans text-sm space-y-6"
                  >
                    {/* Header */}
                    <div className="text-center space-y-1 border-b-2 border-neutral-900 pb-4">
                      <h1 className="text-2xl font-black tracking-wide text-neutral-900">{hotelInfo.name}</h1>
                      <h3 className="text-sm font-bold tracking-wider text-neutral-800">{hotelInfo.city}</h3>
                      <p className="text-xs text-neutral-700 font-medium">{hotelInfo.address}</p>
                      <p className="text-xs text-neutral-800 font-semibold">
                        Phone: {hotelInfo.phone} | Mobile: {hotelInfo.mobile}
                      </p>
                      <div className="text-xs font-bold text-neutral-900 pt-1">
                        GSTIN: {hotelInfo.gstin}
                      </div>
                      <div className="text-xs font-semibold text-neutral-800">
                        State Code: {hotelInfo.stateCode} | HSN/SAC: {hotelInfo.hsnSac}
                      </div>
                    </div>

                    {/* Invoice Title */}
                    <div className="text-center pt-1 pb-1">
                      <h2 className="text-xl font-black uppercase tracking-widest text-neutral-900 border-b-2 border-neutral-900 pb-2 inline-block px-8">
                        TAX INVOICE
                      </h2>
                      {((selectedResForBill as any).gst_number || guest?.gst_number) && (
                        <div className="pt-1.5">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-0.5 rounded inline-block">
                            B2B Tax Invoice · Recipient GSTIN: {(selectedResForBill as any).gst_number || guest?.gst_number}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Section 1: INVOICE & GUEST DETAILS */}
                    <div className="space-y-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                        INVOICE & GUEST DETAILS
                      </h3>
                      <table className="w-full text-xs text-left border border-neutral-900 border-collapse">
                        <thead>
                          <tr className="bg-neutral-100 border-b border-neutral-900 font-bold text-neutral-900">
                            <th className="py-2 px-3 border-r border-neutral-900 w-1/3">Invoice Details</th>
                            <th className="py-2 px-3">Information</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-300">
                          <tr>
                            <td className="py-1.5 px-3 font-bold border-r border-neutral-900">Invoice No.</td>
                            <td className="py-1.5 px-3 font-mono font-bold">{invoiceNum}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 font-bold border-r border-neutral-900">Invoice Date</td>
                            <td className="py-1.5 px-3">{invoiceDateStr}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 font-bold border-r border-neutral-900">Guest Name</td>
                            <td className="py-1.5 px-3 font-bold">{guest?.name || "Guest"}</td>
                          </tr>
                          {((selectedResForBill as any).gst_number || guest?.gst_number) && (
                            <tr className="bg-amber-50/50">
                              <td className="py-1.5 px-3 font-bold border-r border-neutral-900 text-neutral-900">Customer GSTIN</td>
                              <td className="py-1.5 px-3 font-mono font-bold text-neutral-900">{(selectedResForBill as any).gst_number || guest?.gst_number}</td>
                            </tr>
                          )}
                          <tr>
                            <td className="py-1.5 px-3 font-bold border-r border-neutral-900">{fin.isPartyHall ? "Resource" : "Room No."}</td>
                            <td className="py-1.5 px-3 font-bold">{fin.isPartyHall ? "Party Hall / Banquet" : (room?.room_number || "—")}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 font-bold border-r border-neutral-900">{fin.isPartyHall ? "Event Type" : "Room Type"}</td>
                            <td className="py-1.5 px-3">{fin.isPartyHall ? (selectedResForBill.event_type || "Event Booking") : (room?.room_name || "STD AC")}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 font-bold border-r border-neutral-900">{fin.isPartyHall ? "Event Start" : "Check-In"}</td>
                            <td className="py-1.5 px-3">{checkInFormatted}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 font-bold border-r border-neutral-900">{fin.isPartyHall ? "Event End" : "Check-Out"}</td>
                            <td className="py-1.5 px-3">{checkOutFormatted}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 font-bold border-r border-neutral-900">{fin.isPartyHall ? "Duration / Type" : "No. of Nights"}</td>
                            <td className="py-1.5 px-3">{fin.isPartyHall ? `Event (${selectedResForBill.number_of_guests || 1} Guests)` : `${nightsCount} Night(s)`}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 font-bold border-r border-neutral-900">Payment Mode</td>
                            <td className="py-1.5 px-3 font-semibold">{paymentModeStr}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Section 2: BILL DETAILS */}
                    <div className="space-y-2 pt-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                        BILL DETAILS
                      </h3>
                      <table className="w-full text-xs text-left border border-neutral-900 border-collapse">
                        <thead>
                          <tr className="bg-neutral-100 border-b border-neutral-900 font-bold text-neutral-900">
                            <th className="py-2 px-3 border-r border-neutral-900">Date</th>
                            <th className="py-2 px-3 border-r border-neutral-900">Particulars</th>
                            <th className="py-2 px-3 border-r border-neutral-900 text-right">{fin.isPartyHall ? "Venue" : "Room No."}</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-300">
                          {dailyTariffRows.map((row, idx) => (
                            <tr key={idx}>
                              <td className="py-1.5 px-3 border-r border-neutral-900">{row.dateStr}</td>
                              <td className="py-1.5 px-3 border-r border-neutral-900 font-medium">
                                {fin.isPartyHall ? `Party Hall Tariff (${selectedResForBill.event_type || "Event"})` : "Room Tariff"}
                              </td>
                              <td className="py-1.5 px-3 border-r border-neutral-900 text-right">
                                {fin.isPartyHall ? "Party Hall" : (room?.room_number || "—")}
                              </td>
                              <td className="py-1.5 px-3 text-right font-medium">{inr(row.amount)}</td>
                            </tr>
                          ))}
                          {fin.addlCharges > 0 && (
                            <tr>
                              <td className="py-1.5 px-3 border-r border-neutral-900">{invoiceDateStr}</td>
                              <td className="py-1.5 px-3 border-r border-neutral-900 font-medium">Additional Services / Extra Charges</td>
                              <td className="py-1.5 px-3 border-r border-neutral-900 text-right">{fin.isPartyHall ? "Party Hall" : (room?.room_number || "—")}</td>
                              <td className="py-1.5 px-3 text-right font-medium">{inr(fin.addlCharges)}</td>
                            </tr>
                          )}
                          <tr className="bg-neutral-50 font-bold border-t-2 border-neutral-900">
                            <td colSpan={3} className="py-2 px-3 border-r border-neutral-900 text-neutral-900">
                              Total Taxable Value
                            </td>
                            <td className="py-2 px-3 text-right text-neutral-900">{inr(fin.taxableValue)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Section 3: GST / TAX SUMMARY */}
                    <div className="space-y-2 pt-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                        GST / TAX SUMMARY
                      </h3>
                      <table className="w-full text-xs text-left border border-neutral-900 border-collapse">
                        <thead>
                          <tr className="bg-neutral-100 border-b border-neutral-900 font-bold text-neutral-900">
                            <th className="py-2 px-3 border-r border-neutral-900">Description</th>
                            <th className="py-2 px-3 border-r border-neutral-900 text-right">Rate</th>
                            <th className="py-2 px-3 border-r border-neutral-900 text-right">Taxable Amount</th>
                            <th className="py-2 px-3 text-right">Tax Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-300">
                          <tr>
                            <td className="py-1.5 px-3 border-r border-neutral-900">
                              {fin.isPartyHall ? "Party Hall / Banquet Facility" : "Room Accommodation"}
                            </td>
                            <td className="py-1.5 px-3 border-r border-neutral-900 text-right">—</td>
                            <td className="py-1.5 px-3 border-r border-neutral-900 text-right">{inr(fin.taxableValue)}</td>
                            <td className="py-1.5 px-3 text-right">—</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 border-r border-neutral-900 font-medium">CGST</td>
                            <td className="py-1.5 px-3 border-r border-neutral-900 text-right">{fin.cgstRatePercent}%</td>
                            <td className="py-1.5 px-3 border-r border-neutral-900 text-right">{inr(fin.taxableValue)}</td>
                            <td className="py-1.5 px-3 text-right font-medium">{inr(fin.cgst)}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 border-r border-neutral-900 font-medium">SGST</td>
                            <td className="py-1.5 px-3 border-r border-neutral-900 text-right">{fin.sgstRatePercent}%</td>
                            <td className="py-1.5 px-3 border-r border-neutral-900 text-right">{inr(fin.taxableValue)}</td>
                            <td className="py-1.5 px-3 text-right font-medium">{inr(fin.sgst)}</td>
                          </tr>
                          <tr className="bg-neutral-50 font-bold border-t-2 border-neutral-900">
                            <td className="py-2 px-3 border-r border-neutral-900">Total GST</td>
                            <td className="py-2 px-3 border-r border-neutral-900 text-right">{fin.gstRatePercent}.0%</td>
                            <td className="py-2 px-3 border-r border-neutral-900 text-right"></td>
                            <td className="py-2 px-3 text-right text-neutral-900">{inr(fin.totalGst)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Section 4: GRAND TOTAL & WORDS */}
                    <div className="border-2 border-neutral-900 rounded-lg p-4 bg-neutral-50 text-center space-y-1.5">
                      <div className="text-xs font-black uppercase tracking-widest text-neutral-700">GRAND TOTAL</div>
                      <div className="text-3xl font-black text-neutral-900">{inr(fin.grandTotal)}</div>
                      <div className="text-xs font-bold text-neutral-800 pt-1">
                        Amount in Words:
                      </div>
                      <div className="text-xs font-bold text-neutral-900 italic">
                        {numberToWordsINR(fin.grandTotal)}
                      </div>
                    </div>

                    {/* Section 5: PAYMENT SUMMARY */}
                    <div className="space-y-2 pt-2">
                      <h3 className="text-xs font-black uppercase tracking-wider text-neutral-900">
                        PAYMENT SUMMARY
                      </h3>
                      <table className="w-full text-xs text-left border border-neutral-900 border-collapse">
                        <thead>
                          <tr className="bg-neutral-100 border-b border-neutral-900 font-bold text-neutral-900">
                            <th className="py-2 px-3 border-r border-neutral-900">Particulars</th>
                            <th className="py-2 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-300">
                          <tr>
                            <td className="py-1.5 px-3 border-r border-neutral-900">Taxable Amount</td>
                            <td className="py-1.5 px-3 text-right font-medium">{inr(fin.taxableValue)}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 border-r border-neutral-900">CGST @ {fin.cgstRatePercent}%</td>
                            <td className="py-1.5 px-3 text-right font-medium">{inr(fin.cgst)}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 border-r border-neutral-900">SGST @ {fin.sgstRatePercent}%</td>
                            <td className="py-1.5 px-3 text-right font-medium">{inr(fin.sgst)}</td>
                          </tr>
                          <tr className="font-semibold">
                            <td className="py-1.5 px-3 border-r border-neutral-900">Total GST ({fin.gstRatePercent}%)</td>
                            <td className="py-1.5 px-3 text-right">{inr(fin.totalGst)}</td>
                          </tr>
                          <tr className="bg-neutral-50 font-bold text-sm border-t-2 border-neutral-900">
                            <td className="py-2 px-3 border-r border-neutral-900">Grand Total</td>
                            <td className="py-2 px-3 text-right">{inr(fin.grandTotal)}</td>
                          </tr>
                          <tr>
                            <td className="py-1.5 px-3 border-r border-neutral-900 font-medium">Amount Received</td>
                            <td className="py-1.5 px-3 text-right font-semibold text-emerald-700">{inr(fin.paid)}</td>
                          </tr>
                          <tr className="font-bold border-t border-neutral-900">
                            <td className="py-2 px-3 border-r border-neutral-900">Balance Due</td>
                            <td className={`py-2 px-3 text-right ${fin.balance > 0 ? "text-amber-700 font-bold" : "text-neutral-900"}`}>
                              {inr(fin.balance)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                      <div className="text-xs text-neutral-800 font-semibold pt-1">
                        Payment Mode: <span className="font-bold">{paymentModeStr}</span>
                      </div>
                    </div>

                    {/* Section 6: CUSTOMER DETAILS */}
                    <div className="space-y-1.5 border border-neutral-900 p-3 rounded text-xs bg-neutral-50">
                      <h3 className="font-black uppercase tracking-wider text-neutral-900">
                        CUSTOMER DETAILS
                      </h3>
                      <div className="grid grid-cols-2 gap-2 text-neutral-800">
                        <div>
                          <p><span className="font-bold">Guest Name:</span> {guest?.name || "Guest"}</p>
                          <p><span className="font-bold">Room No.:</span> {room?.room_number || "—"}</p>
                          <p><span className="font-bold">Room Type:</span> {room?.room_name || "STD AC"}</p>
                        </div>
                        <div>
                          <p><span className="font-bold">Stay:</span> {formatDateDMY(checkInDate)} to {formatDateDMY(checkOutDate)}</p>
                          <p><span className="font-bold">Nights:</span> {nightsCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Section 7: SIGNATURES */}
                    <div className="pt-8 pb-4">
                      <table className="w-full text-xs text-center border-collapse">
                        <thead>
                          <tr className="font-bold text-neutral-900">
                            <th className="w-1/2 pb-16">Guest Signature</th>
                            <th className="w-1/2 pb-16">For HOTEL DRB</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-6">
                              <div className="border-t border-neutral-900 pt-1 font-bold">
                                Guest
                              </div>
                            </td>
                            <td className="px-6">
                              <div className="border-t border-neutral-900 pt-1 font-bold">
                                Authorized Signatory / Cashier
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Section 8: FOOTER */}
                    <div className="text-center border-t border-neutral-300 pt-4 space-y-1 text-xs text-neutral-700">
                      <div className="font-black text-neutral-900 tracking-wider">HOTEL DRB</div>
                      <div className="font-bold">Thank You for Staying With Us!</div>
                      <div>We look forward to welcoming you again.</div>
                      <div className="text-[10px] text-neutral-500 italic pt-1">
                        *This is a computer-generated tax invoice.*
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between">
                  <div className="text-xs text-muted-foreground">
                    HOTEL DRB Official Tax Invoice · Ready to print
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" onClick={() => setPrintModalOpen(false)}>
                      Close
                    </Button>
                    <Button
                      className="bg-brass text-gold-foreground hover:opacity-90 font-bold shadow-brass"
                      onClick={handleTriggerBrowserPrint}
                    >
                      <Printer className="mr-1.5 size-4" /> Print Document (Ctrl + P)
                    </Button>
                  </div>
                </DialogFooter>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
