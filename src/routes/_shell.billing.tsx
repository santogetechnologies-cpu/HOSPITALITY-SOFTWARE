import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { EmptyState, KpiCard, PageHeader, Panel, Pill, ProgressBar } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { inr } from "@/lib/pms-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EXPENSES } from "@/lib/pms-data";
import { Wallet, Receipt, UtensilsCrossed, Percent, AlertCircle, Undo2 } from "lucide-react";

export const Route = createFileRoute("/_shell/billing")({
  head: () => ({
    meta: [
      { title: "Billing & Finance — DRB Hotel PMS" },
      { name: "description", content: "DRB Hotel folios, payments, GST invoices, refunds and expenses in one finance workspace." },
      { property: "og:title", content: "DRB Hotel — Billing & Finance" },
      { property: "og:description", content: "DRB Hotel folios, payments, GST invoices, refunds and expenses in one finance workspace." },
    ],
  }),
  component: Billing,
});

function Billing() {
  const { folio, addFolioLine } = usePms();
  const [invoice, setInvoice] = React.useState(false);
  const charges = folio.filter((f) => f.category !== "Payment").reduce((a, b) => a + b.amount, 0);
  const payments = folio.filter((f) => f.category === "Payment").reduce((a, b) => a + b.amount, 0);
  const balance = charges + payments;

  return (
    <>
      <PageHeader eyebrow="Finance" title="Billing & Finance" subtitle="Folio 202 · Vikram Sethi · Deluxe King"
        actions={<Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => setInvoice(true)}>Generate Invoice</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="Today's Revenue" value={inr(438000)} delta="+8.7%" icon={Wallet} tone="gold" />
        <KpiCard label="Room Revenue" value={inr(312000)} delta="+5.1%" icon={Receipt} tone="info" />
        <KpiCard label="F&B Revenue" value={inr(96400)} delta="+11%" icon={UtensilsCrossed} tone="success" />
        <KpiCard label="Taxes" value={inr(58900)} icon={Percent} tone="warning" />
        <KpiCard label="Outstanding" value={inr(148600)} delta="-2.4%" icon={AlertCircle} tone="destructive" />
        <KpiCard label="Refunds" value={inr(6200)} icon={Undo2} tone="default" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Panel title="Guest folio" description="All postings for the current stay" bodyClassName="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {folio.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>{l.date}</TableCell>
                  <TableCell className="font-medium">{l.description}</TableCell>
                  <TableCell><Pill tone={l.category === "Payment" ? "success" : l.category === "Discount" ? "warning" : "muted"}>{l.category}</Pill></TableCell>
                  <TableCell className={cn("text-right tabular-nums", l.amount < 0 && "text-success")}>{inr(l.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t border-border bg-sheen px-5 py-4">
            <span className="text-sm text-muted-foreground">Balance due</span>
            <span className="text-xl font-semibold">{inr(balance)}</span>
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Folio actions">
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="outline" className="rounded-xl" onClick={() => { addFolioLine({ date: "12 Aug", description: "Room service — Club sandwich", category: "F&B", amount: 520 }); toast.success("Charge added to folio"); }}>Add Charge</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => { addFolioLine({ date: "12 Aug", description: "Payment — UPI", category: "Payment", amount: -5000 }); toast.success("Payment of ₹5,000 recorded"); }}>Add Payment</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => toast.info("Folio split into Guest and Company ledgers")}>Split Folio</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => { addFolioLine({ date: "12 Aug", description: "Refund — minibar dispute", category: "Payment", amount: 480 }); toast.warning("Refund of ₹480 issued"); }}>Refund</Button>
            </div>
          </Panel>
          <Panel title="Expenses" description="Recent vendor postings" bodyClassName="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Vendor</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
              <TableBody>
                {EXPENSES.map((e) => (
                  <TableRow key={e.id}><TableCell className="font-medium">{e.vendor}</TableCell><TableCell>{e.category}</TableCell><TableCell className="text-right">{inr(e.amount)}</TableCell><TableCell><Pill tone={e.status === "Paid" ? "success" : "warning"}>{e.status}</Pill></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </Panel>
        </div>
      </div>

      <Dialog open={invoice} onOpenChange={setInvoice}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>GST Invoice preview</DialogTitle><DialogDescription>DRB Hotel · GSTIN 000</DialogDescription></DialogHeader>
          <div className="space-y-2 rounded-xl border border-border p-4 text-sm">
            <div className="flex justify-between"><span>Invoice #</span><span className="font-mono">DRB/2026/0842</span></div>
            <div className="flex justify-between"><span>Guest</span><span>Vikram Sethi</span></div>
            <Separator />
            <div className="flex justify-between"><span>Taxable value</span><span>{inr(charges * 0.82)}</span></div>
            <div className="flex justify-between"><span>CGST 9%</span><span>{inr(charges * 0.09)}</span></div>
            <div className="flex justify-between"><span>SGST 9%</span><span>{inr(charges * 0.09)}</span></div>
            <Separator />
            <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{inr(charges)}</span></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => toast.success("Invoice PDF downloaded (demo)")}>Download PDF</Button>
            <Button className="bg-brass text-gold-foreground hover:opacity-90" onClick={() => { setInvoice(false); toast.success("Invoice emailed to guest"); }}>Email invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
