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
import { FileBarChart, Download } from "lucide-react";

export const Route = createFileRoute("/_shell/reports")({
  head: () => ({
    meta: [
      { title: "Reports — DRB Hotel PMS" },
      { name: "description", content: "DRB Hotel reporting centre: front office, revenue, finance and operations reports with export." },
      { property: "og:title", content: "DRB Hotel — Reports" },
      { property: "og:description", content: "DRB Hotel reporting centre: front office, revenue, finance and operations reports with export." },
    ],
  }),
  component: Reports,
});

const GROUPS = [
  { name: "Front Office", items: ["Arrival Report", "Departure Report", "Occupancy Report", "Guest History"] },
  { name: "Revenue", items: ["Daily Revenue", "Room Revenue", "ADR", "RevPAR", "Revenue by Source"] },
  { name: "Finance", items: ["Payment Report", "Outstanding", "GST Report", "Tax Report", "Expense Report"] },
  { name: "Operations", items: ["Housekeeping", "Maintenance", "Staff Performance"] },
];

function Reports() {
  const [active, setActive] = React.useState("Daily Revenue");
  return (
    <>
      <PageHeader eyebrow="Insights" title="Reporting Centre" subtitle="Run, preview and export any operational report" />
      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <Panel title="Report library" bodyClassName="p-3">
          {GROUPS.map((g) => (
            <div key={g.name} className="mb-3">
              <div className="eyebrow px-2 py-1">{g.name}</div>
              <ul className="space-y-1">
                {g.items.map((i) => (
                  <li key={i}>
                    <button onClick={() => setActive(i)} className={cn("w-full rounded-lg px-3 py-2 text-left text-sm transition-colors", active === i ? "bg-gold/12 font-medium text-foreground" : "hover:bg-accent")}>{i}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Panel>

        <Panel title={active} description="Preview generated from demo data"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.success(`${active} exported as PDF`)}><Download className="mr-1 size-3.5" /> PDF</Button>
              <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.success(`${active} exported as Excel`)}><Download className="mr-1 size-3.5" /> Excel</Button>
            </div>
          }>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="space-y-1"><Label className="text-xs">From</Label><Input type="date" defaultValue="2026-08-01" className="w-[160px]" /></div>
            <div className="space-y-1"><Label className="text-xs">To</Label><Input type="date" defaultValue="2026-08-12" className="w-[160px]" /></div>
            <div className="space-y-1"><Label className="text-xs">Segment</Label>
              <Select defaultValue="all"><SelectTrigger className="w-[170px]"><SelectValue /></SelectTrigger>
                <SelectContent>{["all", "Direct", "OTA", "Corporate", "Walk-in"].map((s) => <SelectItem key={s} value={s}>{s === "all" ? "All segments" : s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button className="mt-5 rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => toast.success(`${active} refreshed`)}>Run report</Button>
          </div>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Rooms sold</TableHead><TableHead>Occupancy</TableHead><TableHead>ADR</TableHead><TableHead className="text-right">Revenue</TableHead></TableRow></TableHeader>
            <TableBody>
              {Array.from({ length: 8 }, (_, i) => (
                <TableRow key={i}>
                  <TableCell>{5 + i} Aug 2026</TableCell>
                  <TableCell className="tabular-nums">{15 + (i % 7)}</TableCell>
                  <TableCell className="tabular-nums">{60 + i * 3}%</TableCell>
                  <TableCell className="tabular-nums">{inr(4300 + i * 90)}</TableCell>
                  <TableCell className="text-right tabular-nums">{inr((15 + (i % 7)) * (4300 + i * 90))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><FileBarChart className="size-3.5" /> Figures are illustrative demo data.</div>
        </Panel>
      </div>
    </>
  );
}
