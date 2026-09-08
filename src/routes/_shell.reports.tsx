import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Pill, EmptyState, KpiCard } from "@/components/pms/bits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { usePms } from "@/lib/pms-store";
import { inr } from "@/lib/pms-data";
import { getReservationFinancials } from "@/lib/financials";
import { toast } from "sonner";
import {
  Printer,
  FileSpreadsheet,
  Calendar,
  Filter,
  FileBarChart,
  Building,
  CheckCircle2,
  Search,
  Download
} from "lucide-react";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({
    meta: [
      { title: "GST Sales Statement & Tax Audit — Hotel DRB" },
      { name: "description", content: "Official GST Sales Statement for tax and HST/GST filing with print and CSV export." },
    ],
  }),
  component: GstReportsPage,
});

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

export function GstReportsPage() {
  const { reservations, payments, guests, rooms, discounts } = usePms();

  // Date range filters (default: current month)
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const [fromDate, setFromDate] = React.useState<string>(firstDayOfMonth);
  const [toDate, setToDate] = React.useState<string>(lastDayOfMonth);
  const [resourceFilter, setResourceFilter] = React.useState<"ALL" | "ROOMS" | "PARTY_HALL">("ALL");
  const [paymentFilter, setPaymentFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");

  // Preset Date Range Helpers
  const applyPreset = (preset: "THIS_MONTH" | "LAST_MONTH" | "TODAY" | "ALL") => {
    const today = new Date();
    if (preset === "THIS_MONTH") {
      setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]);
      setToDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]);
    } else if (preset === "LAST_MONTH") {
      setFromDate(new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0]);
      setToDate(new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0]);
    } else if (preset === "TODAY") {
      const t = today.toISOString().split("T")[0];
      setFromDate(t);
      setToDate(t);
    } else if (preset === "ALL") {
      setFromDate("2020-01-01");
      setToDate(today.toISOString().split("T")[0]);
    }
  };

  // Helpers
  const getGuest = (guestId?: string) => guests.find((g) => g.id === guestId);
  const getRoom = (roomId?: string) => rooms.find((r) => r.id === roomId);

  // Formatted date string DD-MM-YYYY
  const formatIndianDate = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Build the Statement Ledger
  const statementRows = React.useMemo(() => {
    const sDate = new Date(`${fromDate}T00:00:00`);
    const eDate = new Date(`${toDate}T23:59:59`);

    const rows: any[] = [];
    let invoiceCounter = 7520; // Matches physical numbering scheme: FO/ 7520/0

    // Filter valid reservations
    const validReservations = reservations
      .filter((r) => r.status !== "CANCELLED")
      .sort((a, b) => {
        const da = new Date(a.booking_date || a.start_time || "").getTime();
        const db = new Date(b.booking_date || b.start_time || "").getTime();
        return da - db;
      });

    validReservations.forEach((r, idx) => {
      const isPartyHall = r.resource_type === "PARTY_HALL";
      if (resourceFilter === "ROOMS" && isPartyHall) return;
      if (resourceFilter === "PARTY_HALL" && !isPartyHall) return;

      const resDateStr = r.booking_date || (r.start_time ? r.start_time.split("T")[0] : "");
      const resDate = new Date(`${resDateStr}T00:00:00`);
      if (resDate < sDate || resDate > eDate) return;

      const fin = getReservationFinancials(r, payments, discounts, rooms);
      const guest = getGuest(r.guest_id);
      const rm = getRoom(r.room_id);
      const pay = fin.payment;

      // Payment method label
      let paymentMode = "Cash";
      if (pay?.payment_method) {
        paymentMode = pay.payment_method;
      } else if (fin.isComplimentary) {
        paymentMode = "Net Zero";
      }

      if (paymentFilter !== "all" && !paymentMode.toLowerCase().includes(paymentFilter.toLowerCase())) {
        return;
      }

      const guestName = guest?.name || "Mr. Guest";
      const isB2B = Boolean(r.gst_number || guest?.gst_number);
      const billType = isB2B ? "B2B" : "Regular";
      const invoiceNo = `FO/ ${invoiceCounter + idx}/0`;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          invoiceNo.toLowerCase().includes(q) ||
          guestName.toLowerCase().includes(q) ||
          (rm?.room_number && rm.room_number.includes(q)) ||
          paymentMode.toLowerCase().includes(q);
        if (!matches) return;
      }

      rows.push({
        id: r.id,
        invoiceNo,
        billDate: formatIndianDate(resDateStr),
        rawDate: resDate,
        roomNumber: rm?.room_number || (isPartyHall ? "Party Hall" : "Room"),
        guestName,
        gstNumber: r.gst_number || guest?.gst_number || "",
        placeOfSupply: "33-Tamil Nadu",
        reverseCharge: "No",
        billType,
        taxableValue: fin.taxableValue,
        cgst: fin.cgst,
        sgst: fin.sgst,
        igst: 0,
        totalGst: fin.totalGst,
        grandTotal: fin.grandTotal,
        paymentMode,
        isComplimentary: fin.isComplimentary,
        paid: fin.paid,
      });
    });

    return rows;
  }, [reservations, payments, discounts, rooms, guests, fromDate, toDate, resourceFilter, paymentFilter, searchQuery]);

  // Statement Totals
  const totals = React.useMemo(() => {
    let totalRooms = statementRows.length;
    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalGst = 0;
    let grandTotal = 0;

    statementRows.forEach((row) => {
      totalTaxable += row.taxableValue;
      totalCgst += row.cgst;
      totalSgst += row.sgst;
      totalIgst += row.igst;
      totalGst += row.totalGst;
      grandTotal += row.grandTotal;
    });

    return {
      totalRooms,
      totalTaxable,
      totalCgst,
      totalSgst,
      totalIgst,
      totalGst,
      grandTotal,
    };
  }, [statementRows]);

  // CSV Export Handler
  const handleExportCSV = () => {
    if (statementRows.length === 0) {
      toast.error("No statement rows to export.");
      return;
    }

    const headers = [
      "Bill No",
      "Bill Date",
      "Bill Amount",
      "Place of Supply",
      "Reverse Charge",
      "Bill Type",
      "Taxable Value",
      "CGST Amount",
      "SGST Amount",
      "IGST Amount",
      "Total GST",
      "Customer Name",
      "GSTIN",
      "Payment Mode",
    ];

    const csvRows = statementRows.map((r) => [
      `"${r.invoiceNo}"`,
      `"${r.billDate}"`,
      r.grandTotal.toFixed(2),
      `"${r.placeOfSupply}"`,
      `"${r.reverseCharge}"`,
      `"${r.billType}"`,
      r.taxableValue.toFixed(2),
      r.cgst.toFixed(2),
      r.sgst.toFixed(2),
      r.igst.toFixed(2),
      r.totalGst.toFixed(2),
      `"${r.guestName.replace(/"/g, '""')}"`,
      `"${r.gstNumber}"`,
      `"${r.paymentMode}"`,
    ]);

    // Summary row
    csvRows.push([
      `"TOTAL"`,
      `""`,
      totals.grandTotal.toFixed(2),
      `""`,
      `""`,
      `""`,
      totals.totalTaxable.toFixed(2),
      totals.totalCgst.toFixed(2),
      totals.totalSgst.toFixed(2),
      totals.totalIgst.toFixed(2),
      totals.totalGst.toFixed(2),
      `"TOTAL ROOMS: ${totals.totalRooms}"`,
      `""`,
      `""`,
    ]);

    const csvContent = [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    downloadCSV(csvContent, `GST_Sales_Statement_Hotel_DRB_${fromDate}_to_${toDate}.csv`);
    toast.success("GST Statement CSV exported successfully!");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header and Print/Export controls */}
      <div className="print:hidden">
        <PageHeader
          eyebrow="Finance & Audit"
          title="GST Sales Statement"
          subtitle="Taxable lodging turnover, CGST/SGST tax ledger, and official GST filing reports"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="rounded-xl border-border bg-card/80 text-xs font-medium text-foreground hover:bg-card shadow-xs"
              >
                <Download className="size-3.5 mr-1.5 text-brass" /> Export CSV
              </Button>
              <Button
                onClick={handlePrint}
                className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 shadow-sm text-xs font-medium"
              >
                <Printer className="size-4 mr-1.5" /> Print Statement
              </Button>
            </div>
          }
        />
      </div>

      {/* KPI Cards (hidden in print) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        <KpiCard
          label="Total Statements"
          value={totals.totalRooms.toString()}
          sub="Rooms & Banquets billed"
          icon={FileBarChart}
        />
        <KpiCard
          label="Total Taxable Value"
          value={inr(totals.totalTaxable)}
          sub="Net lodging revenue"
          icon={Building}
        />
        <KpiCard
          label="Total CGST + SGST"
          value={inr(totals.totalGst)}
          sub={`CGST: ${inr(totals.totalCgst)} | SGST: ${inr(totals.totalSgst)}`}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Grand Gross Total"
          value={inr(totals.grandTotal)}
          sub="Inclusive of all GST"
          icon={Calendar}
        />
      </div>

      {/* Filter Controls (hidden in print) */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-medium mr-1 flex items-center gap-1">
              <Calendar className="size-3.5" /> Presets:
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPreset("THIS_MONTH")}
              className="h-7 text-xs rounded-lg"
            >
              Current Month
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPreset("LAST_MONTH")}
              className="h-7 text-xs rounded-lg"
            >
              Previous Month
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPreset("TODAY")}
              className="h-7 text-xs rounded-lg"
            >
              Today
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => applyPreset("ALL")}
              className="h-7 text-xs rounded-lg"
            >
              All Time
            </Button>
          </div>

          {/* Resource Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">Billed Resource:</span>
            <Select
              value={resourceFilter}
              onValueChange={(val: any) => setResourceFilter(val)}
            >
              <SelectTrigger className="w-36 h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">🏨 All Resources</SelectItem>
                <SelectItem value="ROOMS">🛏️ Rooms Only</SelectItem>
                <SelectItem value="PARTY_HALL">🎉 Banquet Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Date Inputs & Search */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-border/60">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">From Date</Label>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">To Date</Label>
            <Input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Payment Mode</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payment Modes</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card / POS</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="bank">Bank Transfer</SelectItem>
                <SelectItem value="split">Split</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Search Records</Label>
            <div className="relative">
              <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Guest name, invoice #, room..."
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>
        </div>
      </div>
      {/* PRINTABLE OFFICIAL GST STATEMENT SHEET */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-xs print:p-0 print:border-none print:shadow-none font-sans">
        {/* Physical Statement Header matching attached user documents */}
        <div className="text-center space-y-1 border-b border-border pb-4 mb-4">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            Hotel DRB
          </h2>
          <p className="text-xs font-semibold tracking-wide text-foreground">
            GST Sales Statement From : {formatIndianDate(fromDate)} To : {formatIndianDate(toDate)}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground pt-1">
            <span>Place of Supply: <strong>33-Tamil Nadu</strong></span>
            <span>Reverse Charge: <strong>No</strong></span>
            <span>Billing Type: <strong>Taxable, B2C / B2B</strong></span>
          </div>
        </div>

        {/* Tabular Statement Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11px] text-left border border-border/80 print:text-[10px]">
            <thead>
              <tr className="bg-muted/30 border-b border-border text-foreground font-bold">
                <th className="p-2 border-r border-border whitespace-nowrap">Bill No</th>
                <th className="p-2 border-r border-border whitespace-nowrap">Bill Date</th>
                <th className="p-2 border-r border-border text-right whitespace-nowrap">Bill Amount</th>
                <th className="p-2 border-r border-border whitespace-nowrap">State</th>
                <th className="p-2 border-r border-border text-center whitespace-nowrap">R.Charge</th>
                <th className="p-2 border-r border-border whitespace-nowrap">Bill Type</th>
                <th className="p-2 border-r border-border text-right whitespace-nowrap">Taxable Amt</th>
                <th className="p-2 border-r border-border text-right whitespace-nowrap">CGST</th>
                <th className="p-2 border-r border-border text-right whitespace-nowrap">SGST</th>
                <th className="p-2 border-r border-border text-right whitespace-nowrap">IGST</th>
                <th className="p-2 border-r border-border text-right whitespace-nowrap">Total GST</th>
                <th className="p-2 border-r border-border whitespace-nowrap">Customer Name</th>
                <th className="p-2 whitespace-nowrap">Payment Mode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {statementRows.map((r, i) => (
                <tr key={r.id || i} className="hover:bg-muted/10">
                  <td className="p-1.5 border-r border-border font-mono font-semibold text-foreground whitespace-nowrap">
                    {r.invoiceNo}
                  </td>
                  <td className="p-1.5 border-r border-border text-muted-foreground whitespace-nowrap">
                    {r.billDate}
                  </td>
                  <td className="p-1.5 border-r border-border text-right font-mono font-bold text-foreground whitespace-nowrap">
                    {r.grandTotal.toFixed(2)}
                  </td>
                  <td className="p-1.5 border-r border-border text-muted-foreground whitespace-nowrap">
                    {r.placeOfSupply}
                  </td>
                  <td className="p-1.5 border-r border-border text-center text-muted-foreground">
                    {r.reverseCharge}
                  </td>
                  <td className="p-1.5 border-r border-border whitespace-nowrap">
                    {r.billType}
                  </td>
                  <td className="p-1.5 border-r border-border text-right font-mono whitespace-nowrap">
                    {r.taxableValue.toFixed(2)}
                  </td>
                  <td className="p-1.5 border-r border-border text-right font-mono whitespace-nowrap">
                    {r.cgst.toFixed(2)}
                  </td>
                  <td className="p-1.5 border-r border-border text-right font-mono whitespace-nowrap">
                    {r.sgst.toFixed(2)}
                  </td>
                  <td className="p-1.5 border-r border-border text-right font-mono text-muted-foreground whitespace-nowrap">
                    0.00
                  </td>
                  <td className="p-1.5 border-r border-border text-right font-mono font-medium text-foreground whitespace-nowrap">
                    {r.totalGst.toFixed(2)}
                  </td>
                  <td className="p-1.5 border-r border-border font-medium text-foreground whitespace-nowrap">
                    {r.guestName}
                  </td>
                  <td className="p-1.5 whitespace-nowrap text-muted-foreground">
                    {r.paymentMode}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Bottom Totals matching user's photo */}
            <tfoot>
              <tr className="bg-muted/40 font-bold border-t-2 border-border text-foreground text-xs print:text-[11px]">
                <td className="p-2 border-r border-border font-mono">
                  TOTAL
                </td>
                <td className="p-2 border-r border-border text-[11px] text-muted-foreground">
                  {totals.totalRooms} Rooms
                </td>
                <td className="p-2 border-r border-border text-right font-mono text-sm text-foreground">
                  {totals.grandTotal.toFixed(2)}
                </td>
                <td className="p-2 border-r border-border" colSpan={3}>
                  <span className="text-[10px] text-muted-foreground">Total Invoices: {totals.totalRooms}</span>
                </td>
                <td className="p-2 border-r border-border text-right font-mono">
                  {totals.totalTaxable.toFixed(2)}
                </td>
                <td className="p-2 border-r border-border text-right font-mono">
                  {totals.totalCgst.toFixed(2)}
                </td>
                <td className="p-2 border-r border-border text-right font-mono">
                  {totals.totalSgst.toFixed(2)}
                </td>
                <td className="p-2 border-r border-border text-right font-mono">
                  0.00
                </td>
                <td className="p-2 border-r border-border text-right font-mono text-brass">
                  {totals.totalGst.toFixed(2)}
                </td>
                <td className="p-2 border-r border-border" colSpan={2}>
                  <span className="text-[10px] text-muted-foreground">Hotel DRB GST Filing Statement</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {statementRows.length === 0 && (
          <div className="p-8 text-center">
            <EmptyState
              title="No bills found for selected dates"
              body="Adjust the From Date and To Date to view bills."
              icon={FileBarChart}
            />
          </div>
        )}

        {/* Print Signatures */}
        <div className="hidden print:flex justify-between items-end pt-12 text-[10px] text-foreground">
          <div>
            <div className="h-8 border-b border-black w-48"></div>
            <div className="pt-1">Prepared By: Accounts Dept</div>
          </div>
          <div className="text-right">
            <div className="h-8 border-b border-black w-48"></div>
            <div className="pt-1">Authorized Signatory - Hotel DRB</div>
          </div>
        </div>
      </div>
    </div>
  );
}
