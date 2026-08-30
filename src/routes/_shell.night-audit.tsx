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
import { Moon, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_shell/night-audit")({
  head: () => ({
    meta: [
      { title: "Night Audit — DRB Hotel PMS" },
      { name: "description", content: "Run the DRB Hotel night audit: verify postings, payments, taxes and roll the business date." },
      { property: "og:title", content: "DRB Hotel — Night Audit" },
      { property: "og:description", content: "Run the DRB Hotel night audit: verify postings, payments, taxes and roll the business date." },
    ],
  }),
  component: NightAudit,
});

const CHECKS = ["Room charges posted", "Restaurant charges posted", "Payments reconciled", "No-show processed", "Taxes calculated", "Revenue verified"];

function NightAudit() {
  const { auditRun, runNightAudit, businessDate, rooms } = usePms();
  const [open, setOpen] = React.useState(false);
  const [done, setDone] = React.useState<string[]>(CHECKS.slice(0, 4));
  const occupied = rooms.filter((r) => r.status === "occupied").length;

  return (
    <>
      <PageHeader eyebrow="Finance" title="Night Audit" subtitle={`Business date ${businessDate} · ${auditRun ? "audit complete" : "audit open"}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Occupancy" value={`${Math.round((occupied / 25) * 100)}%`} icon={Moon} tone="gold" />
        <KpiCard label="Room Revenue" value={inr(312000)} tone="info" />
        <KpiCard label="F&B Revenue" value={inr(96400)} tone="success" />
        <KpiCard label="Tax Collected" value={inr(58900)} tone="warning" />
        <KpiCard label="Payments" value={inr(388000)} tone="info" />
        <KpiCard label="Outstanding" value={inr(148600)} tone="destructive" />
        <KpiCard label="Cash Balance" value={inr(42600)} tone="default" />
        <KpiCard label="Business Date" value={businessDate} tone="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Audit checklist" description="All items must pass before the date rolls">
          <ul className="space-y-2">
            {CHECKS.map((c) => (
              <li key={c}>
                <label className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm">
                  <Checkbox checked={auditRun || done.includes(c)} onCheckedChange={() => setDone((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))} />
                  <span className={cn((auditRun || done.includes(c)) && "text-muted-foreground line-through")}>{c}</span>
                </label>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Run the audit" description="Closes the business date and rolls postings forward">
          <div className="rounded-2xl bg-secondary/50 p-5 text-sm text-muted-foreground">
            <ShieldCheck className="mb-3 size-6 text-gold" />
            {auditRun ? "Night audit completed. Business date rolled to 13 August 2026." : "Once run, no further postings can be made against today's business date."}
          </div>
          <Button disabled={auditRun} className="mt-4 h-12 w-full rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90" onClick={() => setOpen(true)}>
            {auditRun ? "Night Audit Completed" : "Run Night Audit"}
          </Button>
        </Panel>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Confirm night audit</DialogTitle><DialogDescription>This closes {businessDate} and rolls the property to the next business date.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-brass text-gold-foreground hover:opacity-90" onClick={() => { runNightAudit(); setDone(CHECKS); setOpen(false); toast.success("Night audit completed · business date rolled"); }}>Run audit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
