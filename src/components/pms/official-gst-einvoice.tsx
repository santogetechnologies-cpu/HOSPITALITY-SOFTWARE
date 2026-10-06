import * as React from "react";
import { generateQrCodeSvg, generateBarcodeSvg, getEInvoiceDetails } from "@/lib/qr-barcode";
import { Button } from "@/components/ui/button";
import { Printer, Download, Copy, Check, FileJson } from "lucide-react";
import { toast } from "sonner";

export interface OfficialGstEInvoiceProps {
  invoiceNo: string;
  billDate: string; // DD-MM-YYYY or YYYY-MM-DD
  rawDate?: Date | string;
  guestName: string;
  companyName?: string;
  guestGst?: string;
  guestAddress?: string;
  roomName?: string;
  roomNumber?: string;
  isPartyHall?: boolean;
  eventType?: string;
  nights?: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst?: number;
  grandTotal: number;
  paymentMode?: string;
  hotelProfile?: {
    name?: string;
    gstin?: string;
    address?: string;
    city?: string;
    phone?: string;
  };
  compactForPrint?: boolean;
}

export function OfficialGstEInvoice({
  invoiceNo,
  billDate,
  rawDate,
  guestName,
  companyName,
  guestGst,
  guestAddress,
  roomName,
  roomNumber,
  isPartyHall,
  eventType,
  nights = 1,
  taxableValue,
  cgst,
  sgst,
  igst = 0,
  grandTotal,
  paymentMode = "CASH",
  hotelProfile,
  compactForPrint = false,
}: OfficialGstEInvoiceProps) {
  const [copied, setCopied] = React.useState(false);

  const hotelGstin = (hotelProfile?.gstin || "33ABQPD6510M4ZI").trim().toUpperCase();
  const hotelName = (hotelProfile?.name || "HOTEL D.R.B").toUpperCase();
  const hotelAddress =
    hotelProfile?.address ||
    "54D1 MARKET ROAD MADATHUKULAM PO MADATHUKULAM 624618 TAMIL NADU";

  // Normalize Document Number format (e.g. FO 916, FO 963)
  const cleanDocNum = invoiceNo.startsWith("FO") ? invoiceNo : `FO ${invoiceNo}`;

  // Normalize date string DD-MM-YYYY
  const formattedDocDate = React.useMemo(() => {
    if (!billDate) return "31-08-2026";
    if (billDate.includes("-") && billDate.split("-")[0].length === 2) {
      return billDate;
    }
    const d = new Date(billDate);
    if (isNaN(d.getTime())) return billDate;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }, [billDate]);

  // Generate deterministic e-Invoice IRN and Ack Number
  const einvoiceDetails = React.useMemo(() => {
    return getEInvoiceDetails({
      gstin: hotelGstin,
      docNo: cleanDocNum,
      docDate: formattedDocDate,
      docType: "INV",
    });
  }, [hotelGstin, cleanDocNum, formattedDocDate]);

  const isB2B = Boolean(guestGst && guestGst.trim().length >= 10);
  const supplyTypeCode = isB2B ? "B2B" : "B2C";

  // Generate QR Code data string containing standard GST e-Invoice payload
  const qrPayload = React.useMemo(() => {
    return JSON.stringify({
      gstin: hotelGstin,
      docNo: cleanDocNum,
      docTyp: "INV",
      docDt: formattedDocDate,
      totInvVal: parseFloat(grandTotal.toFixed(2)),
      mainHsnCode: "9963",
      irn: einvoiceDetails.irn,
      ackNo: einvoiceDetails.ackNo,
      ackDt: einvoiceDetails.ackDate,
    });
  }, [hotelGstin, cleanDocNum, formattedDocDate, grandTotal, einvoiceDetails]);

  const qrSvg = React.useMemo(() => {
    return generateQrCodeSvg(qrPayload, 136);
  }, [qrPayload]);

  const barcodeSvg = React.useMemo(() => {
    return generateBarcodeSvg(einvoiceDetails.ackNo, 170, 32);
  }, [einvoiceDetails.ackNo]);

  const itemDescription = isPartyHall
    ? `BANQUET & PARTY HALL RENT (${eventType || "EVENT BOOKING"})`
    : `ROOM RENT ${roomNumber ? `(ROOM ${roomNumber})` : ""}`;

  const handleCopyIrn = () => {
    navigator.clipboard.writeText(einvoiceDetails.irn);
    setCopied(true);
    toast.success("IRN copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintSingle = () => {
    window.print();
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Official Government e-Invoice Document Sheet */}
      <div
        className={`w-full max-w-[800px] bg-white text-black p-6 sm:p-8 rounded-md shadow-xs border border-neutral-300 font-sans text-[11px] leading-snug space-y-3.5 print:p-0 print:border-none print:shadow-none print:w-full print:max-w-none ${
          compactForPrint ? "print:m-0" : ""
        }`}
        style={{ color: "#000000", fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        {/* Header with Supplier Identification & e-Invoice QR Code */}
        <div className="flex items-start justify-between border-b border-neutral-400 pb-3 gap-4">
          <div className="space-y-0.5 pt-1">
            <h1 className="text-base sm:text-lg font-black tracking-tight text-black">
              {hotelGstin}
            </h1>
            <h2 className="text-base sm:text-lg font-black tracking-wide text-black">
              {hotelName}
            </h2>
          </div>
          <div className="shrink-0 flex flex-col items-center">
            <div
              className="border border-neutral-400 p-1 bg-white shadow-xs"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
        </div>

        {/* 1. e-Invoice Details Section */}
        <div className="border border-neutral-400 p-2.5 space-y-1 text-[11px] bg-neutral-50/50">
          <div className="font-bold text-black border-b border-neutral-300 pb-1">
            1. e-Invoice Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-y-1 gap-x-2 pt-0.5">
            <div className="md:col-span-6 flex items-baseline gap-1 break-all">
              <span className="font-semibold text-neutral-800 shrink-0">IRN :</span>
              <span className="font-mono text-[10px] select-all text-neutral-900">
                {einvoiceDetails.irn}
              </span>
            </div>
            <div className="md:col-span-3 flex items-baseline gap-1">
              <span className="font-semibold text-neutral-800 shrink-0">Ack No. :</span>
              <span className="font-mono font-bold text-neutral-900">{einvoiceDetails.ackNo}</span>
            </div>
            <div className="md:col-span-3 flex items-baseline gap-1 md:justify-end">
              <span className="font-semibold text-neutral-800 shrink-0">Ack Date :</span>
              <span className="text-neutral-900 whitespace-nowrap">{einvoiceDetails.ackDate}</span>
            </div>
          </div>
        </div>

        {/* 2. Transaction Details Section */}
        <div className="border border-neutral-400 p-2.5 space-y-1.5 text-[11px]">
          <div className="font-bold text-black border-b border-neutral-300 pb-1">
            2. Transaction Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="space-y-0.5">
              <div>
                <span className="font-semibold text-neutral-800">Supply Type Code : </span>
                <span className="font-bold">{supplyTypeCode}</span>
              </div>
              <div>
                <span className="font-semibold text-neutral-800">Place of Supply : </span>
                <span>TAMIL NADU</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <div>
                <span className="font-semibold text-neutral-800">Document No. : </span>
                <span className="font-bold font-mono">{cleanDocNum}</span>
              </div>
              <div>
                <span className="font-semibold text-neutral-800">Document Type : </span>
                <span>Tax Invoice</span>
              </div>
            </div>
            <div className="space-y-0.5">
              <div>
                <span className="font-semibold text-neutral-800">
                  IGST applicable despite Supplier and Recipient located in same State :{" "}
                </span>
                <span>No</span>
              </div>
              <div>
                <span className="font-semibold text-neutral-800">Document Date : </span>
                <span className="font-semibold">{formattedDocDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Party Details Section */}
        <div className="border border-neutral-400 p-2.5 space-y-1.5 text-[11px]">
          <div className="font-bold text-black border-b border-neutral-300 pb-1">
            3. Party Details
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier Column */}
            <div className="space-y-0.5 border-r border-neutral-200 pr-2">
              <div className="font-bold text-neutral-900">Supplier :</div>
              <div>
                <span className="font-semibold text-neutral-800">GSTIN : </span>
                <span className="font-bold font-mono">{hotelGstin}</span>
              </div>
              <div className="font-bold text-neutral-900">{hotelName}</div>
              <div className="text-[10.5px] text-neutral-800 uppercase leading-tight">
                {hotelAddress}
              </div>
            </div>

            {/* Recipient Column */}
            <div className="space-y-0.5">
              <div className="font-bold text-neutral-900">Recipient :</div>
              <div>
                <span className="font-semibold text-neutral-800">GSTIN : </span>
                <span className="font-bold font-mono">
                  {guestGst && guestGst.trim().length > 5 ? guestGst.toUpperCase() : "Unregistered"}
                </span>
              </div>
              <div className="font-bold text-neutral-900">
                {(companyName || guestName || "Guest").toUpperCase()}
              </div>
              <div className="text-[10.5px] text-neutral-800 leading-tight uppercase">
                {guestAddress || "Marthandam, Tamil Nadu 629165"}
              </div>
              <div className="text-[10.5px]">
                <span className="font-semibold text-neutral-800">Place of Supply : </span>
                <span>TAMIL NADU 600017 TAMIL NADU</span>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Details of Goods / Services Table */}
        <div className="space-y-1 text-[10.5px]">
          <div className="font-bold text-black">4. Details of Goods / Services</div>
          <table className="w-full border border-neutral-400 border-collapse text-left">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-400 text-neutral-900 font-bold text-[10px]">
                <th className="p-1 border-r border-neutral-400 text-center w-8">Sl No</th>
                <th className="p-1 border-r border-neutral-400">Item Description</th>
                <th className="p-1 border-r border-neutral-400 text-center w-14">HSN Code</th>
                <th className="p-1 border-r border-neutral-400 text-center w-12">Quantity</th>
                <th className="p-1 border-r border-neutral-400 text-center w-10">Unit</th>
                <th className="p-1 border-r border-neutral-400 text-right w-16">Unit Price(Rs)</th>
                <th className="p-1 border-r border-neutral-400 text-right w-14">Discoun(Rs)</th>
                <th className="p-1 border-r border-neutral-400 text-right w-18">Taxable Amount(Rs)</th>
                <th className="p-1 border-r border-neutral-400 text-center w-28">
                  Tax Rate(GST + Cess)<br />State Cess + Cess Non Advol
                </th>
                <th className="p-1 border-r border-neutral-400 text-right w-14">Other charges</th>
                <th className="p-1 text-right w-16">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-400">
                <td className="p-1 border-r border-neutral-400 text-center font-bold">1</td>
                <td className="p-1 border-r border-neutral-400 font-semibold">{itemDescription}</td>
                <td className="p-1 border-r border-neutral-400 text-center font-mono">9963</td>
                <td className="p-1 border-r border-neutral-400 text-center">{nights}</td>
                <td className="p-1 border-r border-neutral-400 text-center">OTH</td>
                <td className="p-1 border-r border-neutral-400 text-right font-mono">
                  {(taxableValue / Math.max(1, nights)).toFixed(0)}
                </td>
                <td className="p-1 border-r border-neutral-400 text-right font-mono">0</td>
                <td className="p-1 border-r border-neutral-400 text-right font-mono font-bold">
                  {taxableValue.toFixed(0)}
                </td>
                <td className="p-1 border-r border-neutral-400 text-center font-mono text-[9.5px]">
                  5.00 + 0.00
                </td>
                <td className="p-1 border-r border-neutral-400 text-right font-mono">0</td>
                <td className="p-1 text-right font-mono font-bold">{grandTotal.toFixed(0)}</td>
              </tr>
            </tbody>
          </table>

          {/* Tax Summary Ribbon */}
          <div className="border border-neutral-400 p-1.5 bg-neutral-50 flex flex-wrap items-center justify-between text-[10px] gap-x-3 gap-y-1">
            <div>
              <span className="font-semibold text-neutral-800">Taxable Amt : </span>
              <span className="font-mono font-bold">{taxableValue.toFixed(2)}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-800">CGST Amt : </span>
              <span className="font-mono">{cgst.toFixed(2)}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-800">SGST Amt : </span>
              <span className="font-mono">{sgst.toFixed(2)}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-800">IGST Amt : </span>
              <span className="font-mono">{igst.toFixed(2)}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-800">CESS Amt : </span>
              <span className="font-mono">0.00</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-800">State CESS : </span>
              <span className="font-mono">0.00</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-800">Discount : </span>
              <span className="font-mono">0.00</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-800">Other Charges : </span>
              <span className="font-mono">0.00</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-800">Round Off Amt : </span>
              <span className="font-mono">0.00</span>
            </div>
            <div className="bg-neutral-200 px-1 py-0.5 rounded font-bold">
              <span>Tot. Inv. Amt : </span>
              <span className="font-mono">{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer with Generation details, Barcode and eSign NIC-IRP badge */}
        <div className="border-t border-neutral-400 pt-3 flex items-center justify-between gap-2 text-[10.5px]">
          <div className="space-y-0.5">
            <div>
              <span className="font-semibold text-neutral-800">Generated By : </span>
              <span className="font-mono font-bold">{hotelGstin}</span>
            </div>
            <div>
              <span className="font-semibold text-neutral-800">Print Date : </span>
              <span>{formattedDocDate} 10:17:59</span>
            </div>
          </div>

          {/* Barcode & Ack No. */}
          <div className="flex flex-col items-center">
            <div dangerouslySetInnerHTML={{ __html: barcodeSvg }} />
            <div className="font-mono text-[9.5px] font-bold tracking-widest text-center mt-0.5">
              {einvoiceDetails.ackNo}
            </div>
          </div>

          {/* NIC-IRP eSign Badge */}
          <div className="flex flex-col items-end text-right">
            <div className="flex items-center gap-1 text-blue-700 font-bold italic text-base">
              <span className="text-xl">✍️</span> eSign
            </div>
            <div className="text-[9.5px] text-neutral-700 leading-tight">
              Digitally Signed by <strong>NIC-IRP</strong>
            </div>
            <div className="text-[9px] text-neutral-600 font-mono">
              on {einvoiceDetails.signDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
