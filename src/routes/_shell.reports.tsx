import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Panel, Pill, EmptyState, KpiCard } from "@/components/pms/bits";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePms } from "@/lib/pms-store";
import { inr } from "@/lib/pms-data";
import { useSettings } from "@/lib/use-settings";
import { getReservationFinancials } from "@/lib/financials";
import { getSequentialInvoiceNumber } from "@/lib/invoice-utils";
import { OfficialGstEInvoice } from "@/components/pms/official-gst-einvoice";
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
  Download,
  FileJson,
  ShieldCheck,
  Upload,
  Eye,
  ChevronLeft,
  ChevronRight,
  Layers,
  FileText,
  Copy,
  ExternalLink,
  Receipt,
  QrCode
} from "lucide-react";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({
    meta: [
      { title: "GST Sales Statement & GSTR-1 Invoicing — Hotel DRB" },
      { name: "description", content: "Official GST Sales Statement, GSTR-1 Portal JSON export, and individual standardized GST e-Invoices for Hotel DRB." },
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

function downloadJSON(jsonObject: object, filename: string) {
  const jsonStr = JSON.stringify(jsonObject, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
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
  const { settings } = useSettings();

  // Date range filters (default to the requested GST Sales Statement period 30-09-2026 to 30-10-2026)
  const [fromDate, setFromDate] = React.useState<string>("2026-09-30");
  const [toDate, setToDate] = React.useState<string>("2026-10-30");
  const [resourceFilter, setResourceFilter] = React.useState<"ALL" | "ROOMS" | "PARTY_HALL">("ALL");
  const [paymentFilter, setPaymentFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [viewMode, setViewMode] = React.useState<"TABLE" | "CARDS">("TABLE");

  // Single Bill Modal state
  const [selectedBillIndex, setSelectedBillIndex] = React.useState<number | null>(null);
  const [singleBillModalOpen, setSingleBillModalOpen] = React.useState(false);

  // GSTR-1 JSON Preview Modal State
  const [jsonPreviewModalOpen, setJsonPreviewModalOpen] = React.useState(false);

  // Batch Print All Modal / State
  const [isBatchPrinting, setIsBatchPrinting] = React.useState(false);

  // Preset Date Range Helpers
  const applyPreset = (preset: "HOTEL_DRB_PERIOD" | "THIS_MONTH" | "LAST_MONTH" | "TODAY" | "ALL") => {
    const today = new Date();
    if (preset === "HOTEL_DRB_PERIOD") {
      setFromDate("2026-09-30");
      setToDate("2026-10-30");
      toast.info("Date filter set: 30-09-2026 to 30-10-2026");
    } else if (preset === "THIS_MONTH") {
      setFromDate(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0] || "2026-09-01");
      setToDate(new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0] || "2026-09-30");
    } else if (preset === "LAST_MONTH") {
      setFromDate(new Date(today.getFullYear(), today.getMonth() - 1, 1).toISOString().split("T")[0] || "2026-08-01");
      setToDate(new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0] || "2026-08-31");
    } else if (preset === "TODAY") {
      const t = today.toISOString().split("T")[0] || "2026-09-28";
      setFromDate(t);
      setToDate(t);
    } else if (preset === "ALL") {
      setFromDate("2020-01-01");
      setToDate("2026-12-31");
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

    // Filter valid reservations
    const validReservations = reservations
      .filter((r) => r.status !== "CANCELLED")
      .sort((a, b) => {
        const da = new Date(a.booking_date || a.start_time || "").getTime();
        const db = new Date(b.booking_date || b.start_time || "").getTime();
        return da - db;
      });

    validReservations.forEach((r) => {
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

      const guestName = guest?.name || r.customer_name || "Mr. Guest";
      const companyName = r.company_name || guest?.company_name || "";
      const isB2B = Boolean(r.gst_number || guest?.gst_number);
      const billType = isB2B ? "B2B" : "B2C";
      const invoiceNo = getSequentialInvoiceNumber(r, reservations, settings);

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matches =
          invoiceNo.toLowerCase().includes(q) ||
          guestName.toLowerCase().includes(q) ||
          companyName.toLowerCase().includes(q) ||
          (rm?.room_number && rm.room_number.includes(q)) ||
          paymentMode.toLowerCase().includes(q);
        if (!matches) return;
      }

      rows.push({
        id: r.id,
        reservation: r,
        invoiceNo,
        billDate: formatIndianDate(resDateStr),
        rawDateStr: resDateStr,
        rawDate: resDate,
        roomNumber: rm?.room_number || (isPartyHall ? "Party Hall" : "Room"),
        roomName: rm?.room_name || "Room",
        isPartyHall,
        eventType: r.event_type,
        guestName,
        companyName,
        guestGst: r.gst_number || guest?.gst_number || "",
        guestAddress: r.address || guest?.address || "Marthandam, Tamil Nadu 629165",
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
        nights: Math.max(1, fin.nightsCount || 1),
      });
    });

    return rows;
  }, [reservations, payments, discounts, rooms, guests, fromDate, toDate, resourceFilter, paymentFilter, searchQuery, settings]);

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

  // Direct GST Portal GSTR-1 JSON Generator
  const gstr1JsonObject = React.useMemo(() => {
    const hotelGstin = (settings.hotelProfile?.gstin || "33ABQPD6510M4ZI").trim().toUpperCase();
    const d = new Date(fromDate || new Date());
    const monthStr = String(d.getMonth() + 1).padStart(2, "0");
    const yearStr = d.getFullYear();
    const fp = `${monthStr}${yearStr}`;

    const b2bMap: Record<string, any[]> = {};
    const b2csItems: any[] = [];

    statementRows.forEach((row) => {
      const gstin = (row.guestGst || "").trim().toUpperCase();
      const invoiceNum = row.invoiceNo.startsWith("FO") ? row.invoiceNo : `FO ${row.invoiceNo}`;
      const dateStr = row.billDate; // DD-MM-YYYY format

      if (gstin && gstin.length === 15) {
        if (!b2bMap[gstin]) b2bMap[gstin] = [];
        b2bMap[gstin].push({
          inum: invoiceNum,
          idt: dateStr,
          val: parseFloat(row.grandTotal.toFixed(2)),
          pos: "33",
          rchrg: "N",
          inv_typ: "R",
          itms: [
            {
              num: 1,
              itm_det: {
                ty: "S",
                txval: parseFloat(row.taxableValue.toFixed(2)),
                rt: 5,
                camt: parseFloat(row.cgst.toFixed(2)),
                samt: parseFloat(row.sgst.toFixed(2)),
                csamt: 0,
              },
            },
          ],
        });
      } else {
        b2csItems.push({
          sply_ty: "INTRA",
          pos: "33",
          typ: "OE",
          rt: 5,
          txval: parseFloat(row.taxableValue.toFixed(2)),
          camt: parseFloat(row.cgst.toFixed(2)),
          samt: parseFloat(row.sgst.toFixed(2)),
          csamt: 0,
        });
      }
    });

    const b2b = Object.entries(b2bMap).map(([ctin, inv]) => ({ ctin, inv }));

    const b2csAgg = b2csItems.reduce((acc, item) => {
      const key = `${item.rt}_${item.pos}_${item.sply_ty}`;
      if (!acc[key]) acc[key] = { ...item, txval: 0, camt: 0, samt: 0, csamt: 0 };
      acc[key].txval = parseFloat((acc[key].txval + item.txval).toFixed(2));
      acc[key].camt = parseFloat((acc[key].camt + item.camt).toFixed(2));
      acc[key].samt = parseFloat((acc[key].samt + item.samt).toFixed(2));
      return acc;
    }, {} as Record<string, any>);

    const firstInv = statementRows[0]?.invoiceNo || "963";
    const lastInv = statementRows[statementRows.length - 1]?.invoiceNo || "963";

    return {
      gstin: hotelGstin,
      fp,
      gt: parseFloat(totals.grandTotal.toFixed(2)),
      cur_gt: parseFloat(totals.grandTotal.toFixed(2)),
      b2b,
      b2cs: Object.values(b2csAgg),
      cdnr: [],
      cdnur: [],
      exp: [],
      b2ba: [],
      cdnra: [],
      cdnura: [],
      expa: [],
      at: [],
      txpd: [],
      hsn: {
        data: [
          {
            num: 1,
            hsn_sc: "9963",
            desc: "Room Accommodation and Hospitality Services",
            uqc: "OTH",
            cnt: statementRows.length,
            txval: parseFloat(totals.totalTaxable.toFixed(2)),
            rt: 5,
            camt: parseFloat(totals.totalCgst.toFixed(2)),
            samt: parseFloat(totals.totalSgst.toFixed(2)),
            csamt: 0,
          },
        ],
      },
      doc_issue: {
        doc_det: [
          {
            doc_num: 1,
            doc_typ: "Invoices for outward supply",
            from: firstInv,
            to: lastInv,
            totnum: statementRows.length,
            canc: 0,
            net_issue: statementRows.length,
          },
        ],
      },
    };
  }, [statementRows, settings, fromDate, totals]);

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
      "Company Name",
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
      `"${(r.guestName || "").replace(/"/g, '""')}"`,
      `"${(r.companyName || "").replace(/"/g, '""')}"`,
      `"${r.guestGst}"`,
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
      `"TOTAL BILLS: ${totals.totalRooms}"`,
      `""`,
      `""`,
      `""`,
    ]);

    const csvContent = [headers.join(","), ...csvRows.map((e) => e.join(","))].join("\n");
    downloadCSV(csvContent, `GST_Sales_Statement_Hotel_DRB_${fromDate}_to_${toDate}.csv`);
    toast.success("GST Statement CSV exported successfully!");
  };

  // Direct GST Portal GSTR-1 JSON Export
  const handleExportGSTR1JSON = () => {
    if (statementRows.length === 0) {
      toast.error("No statement records to export for this period.");
      return;
    }

    downloadJSON(gstr1JsonObject, `GST_Sales_Statement_GSTR1_Hotel_DRB_${fromDate}_to_${toDate}.json`);
    toast.success("GSTR-1 JSON downloaded! Upload directly into GST Portal Returns (GSTR-1 Offline Tool).");
  };

  const handlePrintStatement = () => {
    window.print();
  };

  // Open single bill modal
  const handleOpenBillModal = (index: number) => {
    setSelectedBillIndex(index);
    setSingleBillModalOpen(true);
  };

  // Batch Print All Separate Invoices
  const handleBatchPrintAll = () => {
    if (statementRows.length === 0) {
      toast.error("No bills available to print.");
      return;
    }
    toast.info(`Preparing separate GST e-Invoices for all ${statementRows.length} bills...`);
    setIsBatchPrinting(true);
    setTimeout(() => {
      window.print();
      setIsBatchPrinting(false);
    }, 400);
  };

  const selectedBill = selectedBillIndex !== null ? statementRows[selectedBillIndex] : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Action Controls */}
      <div className="print:hidden">
        <PageHeader
          eyebrow="Finance, Audit & GST Portal Filing"
          title="Hotel DRB GST Sales Statement"
          subtitle="Taxable lodging turnover, B2B/B2C CGST/SGST tax ledger, GSTR-1 JSON direct filing, and individual standardized GST e-Invoices"
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={handleExportGSTR1JSON}
                className="rounded-xl bg-amber-500 hover:bg-amber-450 text-neutral-950 font-bold text-xs shadow-sm transition-all h-9"
              >
                <FileJson className="size-4 mr-1.5" /> Download GSTR-1 JSON
              </Button>
              <Button
                variant="outline"
                onClick={() => setJsonPreviewModalOpen(true)}
                className="rounded-xl border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold h-9 shadow-xs"
              >
                <Eye className="size-3.5 mr-1.5" /> View GSTR-1 JSON
              </Button>
              <Button
                variant="outline"
                onClick={handleBatchPrintAll}
                className="rounded-xl border-blue-500/40 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20 text-xs font-semibold h-9 shadow-xs"
              >
                <Printer className="size-3.5 mr-1.5" /> Print All Invoices (Separate Sheets)
              </Button>
              <Button
                variant="outline"
                onClick={handleExportCSV}
                className="rounded-xl border-border bg-card text-xs font-medium text-foreground hover:bg-muted h-9 shadow-xs"
              >
                <Download className="size-3.5 mr-1.5 text-brass" /> Export CSV
              </Button>
              <Button
                onClick={handlePrintStatement}
                className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 shadow-sm text-xs font-semibold h-9"
              >
                <Printer className="size-4 mr-1.5" /> Print Statement Ledger
              </Button>
            </div>
          }
        />
      </div>

      {/* GST Filing Notice Banner & Direct Parameters */}
      <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-card to-amber-950/30 p-4 shadow-sm print:hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0 mt-0.5">
              <ShieldCheck className="size-5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-amber-300">
                  GST Portal Direct Filing (GSTR-1 JSON) & Separate GST e-Invoices
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                  Active Filing Schema Ready
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Place of Supply: <strong className="text-foreground">33-Tamil Nadu</strong></span>
                <span>Reverse Charge: <strong className="text-foreground">No</strong></span>
                <span>Billing Type: <strong className="text-foreground">Taxable, B2C / B2B</strong></span>
                <span>Supplier GSTIN: <strong className="text-foreground font-mono">{settings.hotelProfile?.gstin || "33ABQPD6510M4ZI"}</strong></span>
              </div>
              <p className="text-xs text-muted-foreground pt-0.5">
                Statement period filtered from <span className="text-amber-200 font-mono font-bold">{formatIndianDate(fromDate)}</span> to <span className="text-amber-200 font-mono font-bold">{formatIndianDate(toDate)}</span>. Contains <strong className="text-foreground">{statementRows.length} bills</strong> ready for direct portal upload and separate e-Invoice viewing.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={handleExportGSTR1JSON}
              className="bg-amber-500 hover:bg-amber-450 text-neutral-950 font-bold text-xs rounded-xl shadow-sm px-3.5 h-9"
            >
              <Upload className="size-3.5 mr-1.5" /> Download JSON for Portal
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleBatchPrintAll}
              className="border-border bg-card/90 text-xs font-semibold rounded-xl h-9 px-3.5"
            >
              <Layers className="size-3.5 mr-1.5 text-blue-400" /> View / Print All Invoices
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Cards (hidden in print) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 print:hidden">
        <KpiCard
          label="Total Bills / Statements"
          value={totals.totalRooms.toString()}
          hint="Rooms & Banquets billed"
          icon={FileBarChart}
        />
        <KpiCard
          label="Total Taxable Value"
          value={inr(totals.totalTaxable)}
          hint="Net lodging turnover"
          icon={Building}
        />
        <KpiCard
          label="Total CGST + SGST (5%)"
          value={inr(totals.totalGst)}
          hint={`CGST: ${inr(totals.totalCgst)} | SGST: ${inr(totals.totalSgst)}`}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Grand Gross Total"
          value={inr(totals.grandTotal)}
          hint="Total invoice collections"
          icon={Calendar}
        />
      </div>

      {/* Filter Controls & View Mode Toggle (hidden in print) */}
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3.5 shadow-xs print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-semibold mr-1 flex items-center gap-1">
              <Calendar className="size-3.5 text-brass" /> Presets:
            </span>
            <Button
              size="sm"
              variant={fromDate === "2026-09-30" && toDate === "2026-10-30" ? "default" : "outline"}
              onClick={() => applyPreset("HOTEL_DRB_PERIOD")}
              className={`h-7 text-xs rounded-lg ${
                fromDate === "2026-09-30" && toDate === "2026-10-30"
                  ? "bg-amber-500 text-neutral-950 font-bold hover:bg-amber-450"
                  : "border-amber-500/40 text-amber-300"
              }`}
            >
              ⭐ 30-09-2026 To 30-10-2026 (Audit Period)
            </Button>
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

          {/* View Mode Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setViewMode("TABLE")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === "TABLE"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <FileSpreadsheet className="size-3.5" /> Statement Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode("CARDS")}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  viewMode === "CARDS"
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Receipt className="size-3.5" /> Separate GST Invoices ({statementRows.length})
              </button>
            </div>
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
                <SelectItem value="cash">💵 Cash</SelectItem>
                <SelectItem value="card">💳 Card / POS</SelectItem>
                <SelectItem value="upi">📱 UPI</SelectItem>
                <SelectItem value="company">🏢 Company / Corporate</SelectItem>
                <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                <SelectItem value="split">⇄ Split</SelectItem>
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

      {/* VIEW MODE 1: TABULAR STATEMENT (with Action to view e-Invoice on each row) */}
      {viewMode === "TABLE" && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-xs print:p-0 print:border-none print:shadow-none font-sans">
          {/* Statement Header */}
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
                  <th className="p-2 border-r border-border whitespace-nowrap">Payment Mode</th>
                  <th className="p-2 text-center whitespace-nowrap print:hidden">GST e-Invoice Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {statementRows.map((r, i) => (
                  <tr key={r.id || i} className="hover:bg-muted/10 transition-colors">
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
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        r.billType === "B2B"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-muted text-foreground"
                      }`}>
                        {r.billType}
                      </span>
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
                      {r.guestName} {r.companyName ? `(${r.companyName})` : ""}
                    </td>
                    <td className="p-1.5 border-r border-border whitespace-nowrap text-muted-foreground">
                      {r.paymentMode}
                    </td>
                    <td className="p-1.5 text-center whitespace-nowrap print:hidden">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenBillModal(i)}
                        className="h-6 text-[11px] px-2 py-0 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 rounded-md font-semibold"
                      >
                        <Eye className="size-3 mr-1" /> View GST Invoice
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Bottom Totals */}
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
                  <td className="p-2 text-center print:hidden">
                    <Button
                      size="sm"
                      onClick={handleBatchPrintAll}
                      className="h-6 text-[10px] bg-blue-500 hover:bg-blue-600 text-white rounded font-bold px-2"
                    >
                      Print All
                    </Button>
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
      )}

      {/* VIEW MODE 2: SEPARATE GST INVOICE CARDS FOR ALL BILLS */}
      {viewMode === "CARDS" && (
        <div className="space-y-6 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/40 p-4 rounded-2xl border border-border">
            <div>
              <h3 className="font-bold text-sm text-foreground">
                Separate Standard GST e-Invoices ({statementRows.length} Bills)
              </h3>
              <p className="text-xs text-muted-foreground">
                Showing individual standardized NIC-IRP e-invoices with QR code, IRN, Ack No, and digital signature for each bill.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleBatchPrintAll}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-sm h-8"
              >
                <Printer className="size-3.5 mr-1.5" /> Print All {statementRows.length} Invoices
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statementRows.map((r, i) => (
              <div
                key={r.id || i}
                className="rounded-2xl border border-border bg-card p-4 space-y-3 hover:border-amber-500/50 transition-all shadow-xs flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-[11px] font-bold text-muted-foreground">INVOICE NO.</div>
                      <div className="text-base font-black font-mono text-foreground">
                        {r.invoiceNo.startsWith("FO") ? r.invoiceNo : `FO ${r.invoiceNo}`}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        r.billType === "B2B"
                          ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {r.billType}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs pt-1 border-t border-border/60">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Guest:</span>
                      <span className="font-bold text-foreground text-right">{r.guestName}</span>
                    </div>
                    {r.companyName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Company:</span>
                        <span className="font-semibold text-foreground text-right">{r.companyName}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bill Date:</span>
                      <span className="text-foreground">{r.billDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Taxable Value:</span>
                      <span className="font-mono text-foreground">{inr(r.taxableValue)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST (5%):</span>
                      <span className="font-mono text-foreground">{inr(r.totalGst)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border/40 font-bold">
                      <span className="text-foreground">Total Invoice Amt:</span>
                      <span className="font-mono text-amber-300 text-sm">{inr(r.grandTotal)}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleOpenBillModal(i)}
                    className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs rounded-xl h-8"
                  >
                    <Eye className="size-3.5 mr-1.5" /> View / Print e-Invoice
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* INDIVIDUAL BILL GST E-INVOICE MODAL */}
      <Dialog open={singleBillModalOpen} onOpenChange={setSingleBillModalOpen}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 bg-card border-border">
          {selectedBill && (
            <div className="space-y-4">
              <DialogHeader className="flex flex-row items-center justify-between border-b border-border pb-3">
                <div className="space-y-0.5">
                  <DialogTitle className="text-lg font-bold flex items-center gap-2">
                    <Receipt className="size-5 text-amber-400" />
                    Standard GST Tax Invoice ({selectedBill.invoiceNo})
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Official e-Invoice format with QR code, IRN, and NIC-IRP digital sign badge.
                  </DialogDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedBillIndex === 0}
                    onClick={() => setSelectedBillIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev))}
                    className="h-8 px-2 text-xs rounded-lg"
                  >
                    <ChevronLeft className="size-4 mr-0.5" /> Prev
                  </Button>
                  <span className="text-xs font-mono text-muted-foreground">
                    {(selectedBillIndex || 0) + 1} / {statementRows.length}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={selectedBillIndex === statementRows.length - 1}
                    onClick={() => setSelectedBillIndex((prev) => (prev !== null && prev < statementRows.length - 1 ? prev + 1 : prev))}
                    className="h-8 px-2 text-xs rounded-lg"
                  >
                    Next <ChevronRight className="size-4 ml-0.5" />
                  </Button>
                </div>
              </DialogHeader>

              {/* Render Official GST e-Invoice */}
              <div className="py-2 flex justify-center bg-muted/20 p-2 sm:p-4 rounded-xl border border-border">
                <OfficialGstEInvoice
                  invoiceNo={selectedBill.invoiceNo}
                  billDate={selectedBill.billDate}
                  rawDate={selectedBill.rawDate}
                  guestName={selectedBill.guestName}
                  companyName={selectedBill.companyName}
                  guestGst={selectedBill.guestGst}
                  guestAddress={selectedBill.guestAddress}
                  roomName={selectedBill.roomName}
                  roomNumber={selectedBill.roomNumber}
                  isPartyHall={selectedBill.isPartyHall}
                  eventType={selectedBill.eventType}
                  nights={selectedBill.nights}
                  taxableValue={selectedBill.taxableValue}
                  cgst={selectedBill.cgst}
                  sgst={selectedBill.sgst}
                  igst={selectedBill.igst}
                  grandTotal={selectedBill.grandTotal}
                  paymentMode={selectedBill.paymentMode}
                  hotelProfile={settings.hotelProfile}
                />
              </div>

              <DialogFooter className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>Supply: <strong>33-Tamil Nadu</strong></span>
                  <span>•</span>
                  <span>Type: <strong>{selectedBill.billType}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const singleJson = {
                        gstin: settings.hotelProfile?.gstin || "33ABQPD6510M4ZI",
                        invoice_number: selectedBill.invoiceNo,
                        invoice_date: selectedBill.billDate,
                        guest_name: selectedBill.guestName,
                        company_name: selectedBill.companyName,
                        recipient_gstin: selectedBill.guestGst || "Unregistered",
                        taxable_value: selectedBill.taxableValue,
                        cgst: selectedBill.cgst,
                        sgst: selectedBill.sgst,
                        grand_total: selectedBill.grandTotal,
                        pos: "33-Tamil Nadu",
                      };
                      downloadJSON(singleJson, `GST_Invoice_${selectedBill.invoiceNo}_Hotel_DRB.json`);
                      toast.success(`Invoice ${selectedBill.invoiceNo} JSON downloaded!`);
                    }}
                    className="rounded-xl text-xs h-8"
                  >
                    <Download className="size-3.5 mr-1" /> Download JSON
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => window.print()}
                    className="bg-brass text-gold-foreground font-bold rounded-xl text-xs h-8"
                  >
                    <Printer className="size-3.5 mr-1.5" /> Print This Invoice
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* GSTR-1 JSON PREVIEW & COPY MODAL */}
      <Dialog open={jsonPreviewModalOpen} onOpenChange={setJsonPreviewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileJson className="size-5 text-amber-400" />
              GST Portal GSTR-1 Return JSON Payload
            </DialogTitle>
            <DialogDescription className="text-xs">
              Official JSON structure ready for upload into GST Portal Offline Tool (GSTR-1). Period: {fromDate} to {toDate}
            </DialogDescription>
          </DialogHeader>

          <div className="relative mt-2">
            <pre className="bg-neutral-950 text-emerald-400 p-4 rounded-xl text-xs font-mono max-h-[400px] overflow-auto border border-border">
              {JSON.stringify(gstr1JsonObject, null, 2)}
            </pre>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t border-border">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(gstr1JsonObject, null, 2));
                toast.success("GSTR-1 JSON copied to clipboard!");
              }}
              className="rounded-xl text-xs h-8"
            >
              <Copy className="size-3.5 mr-1" /> Copy JSON
            </Button>
            <Button
              size="sm"
              onClick={handleExportGSTR1JSON}
              className="bg-amber-500 hover:bg-amber-450 text-neutral-950 font-bold rounded-xl text-xs h-8"
            >
              <Download className="size-3.5 mr-1.5" /> Download GSTR-1 File (.json)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MULTI-PAGE PRINT CONTAINER (Active during print when batch printing all separate invoices) */}
      <div className="hidden print:block font-sans">
        {statementRows.map((r, i) => (
          <div
            key={`print-${r.id || i}`}
            style={{ pageBreakAfter: i === statementRows.length - 1 ? "auto" : "always", breakAfter: i === statementRows.length - 1 ? "auto" : "page" }}
            className="w-full pb-6 pt-2"
          >
            <OfficialGstEInvoice
              invoiceNo={r.invoiceNo}
              billDate={r.billDate}
              rawDate={r.rawDate}
              guestName={r.guestName}
              companyName={r.companyName}
              guestGst={r.guestGst}
              guestAddress={r.guestAddress}
              roomName={r.roomName}
              roomNumber={r.roomNumber}
              isPartyHall={r.isPartyHall}
              eventType={r.eventType}
              nights={r.nights}
              taxableValue={r.taxableValue}
              cgst={r.cgst}
              sgst={r.sgst}
              igst={r.igst}
              grandTotal={r.grandTotal}
              paymentMode={r.paymentMode}
              hotelProfile={settings.hotelProfile}
              compactForPrint={true}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
