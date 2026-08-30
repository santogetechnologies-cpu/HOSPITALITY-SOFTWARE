import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { EmptyState, KpiCard, PageHeader, Panel, Pill, ProgressBar, RoomCard, StatusBadge } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { HK_CHECKLIST, HOUSEKEEPERS } from "@/lib/pms-data";
import { Sparkles, BrushCleaning, CheckCheck, Wrench, ClipboardCheck } from "lucide-react";

export const Route = createFileRoute("/_shell/housekeeping")({
  head: () => ({
    meta: [
      { title: "Housekeeping — DRB Hotel PMS" },
      { name: "description", content: "DRB Hotel housekeeping board: cleaning pipeline, attendant workload, checklists and inspections." },
      { property: "og:title", content: "DRB Hotel — Housekeeping" },
      { property: "og:description", content: "DRB Hotel housekeeping board: cleaning pipeline, attendant workload, checklists and inspections." },
    ],
  }),
  component: Housekeeping,
});

const STAGES = ["Dirty", "Assigned", "Cleaning", "Inspection", "Ready"] as const;

function Housekeeping() {
  const { hkTasks, rooms, setTaskStage, assignTask, addTicket } = usePms();
  const [checked, setChecked] = React.useState<string[]>(HK_CHECKLIST.slice(0, 3));

  return (
    <>
      <PageHeader eyebrow="Operations" title="Housekeeping" subtitle="Live cleaning pipeline across all 25 keys" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Rooms to Clean" value={String(hkTasks.filter((t) => t.stage === "Dirty" || t.stage === "Assigned").length)} icon={BrushCleaning} tone="warning" />
        <KpiCard label="Cleaning" value={String(hkTasks.filter((t) => t.stage === "Cleaning").length)} icon={Sparkles} tone="info" />
        <KpiCard label="Ready" value={String(hkTasks.filter((t) => t.stage === "Ready").length)} icon={CheckCheck} tone="success" />
        <KpiCard label="Inspected" value={String(rooms.filter((r) => r.hkStatus === "Inspected").length)} icon={ClipboardCheck} tone="gold" />
        <KpiCard label="Maintenance" value={String(rooms.filter((r) => r.status === "maintenance" || r.status === "ooo").length)} icon={Wrench} tone="destructive" />
      </div>

      <Panel title="Cleaning board" description="Dirty → Assigned → Cleaning → Inspection → Ready" bodyClassName="p-4">
        <div className="scroll-slim grid gap-4 overflow-x-auto lg:grid-cols-5">
          {STAGES.map((stage) => {
            const list = hkTasks.filter((t) => t.stage === stage);
            return (
              <div key={stage} className="min-w-[220px] rounded-2xl bg-secondary/40 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">{stage}</span>
                  <Pill>{list.length}</Pill>
                </div>
                <div className="space-y-3">
                  {list.map((t) => (
                    <div key={t.id} className="rounded-xl border border-border bg-card p-3 shadow-soft">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold tabular-nums">Room {t.room}</span>
                        {t.priority === "High" ? <Pill tone="destructive">High</Pill> : null}
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{t.roomType}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">Checkout {t.checkout} · {t.kind}</div>
                      <div className="mt-2">
                        <Select value={t.assignee} onValueChange={(v) => { assignTask(t.id, v); toast.success(`Room ${t.room} assigned to ${v}`); }}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Unassigned">Unassigned</SelectItem>
                            {HOUSEKEEPERS.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <Button size="sm" variant="secondary" className="h-7 rounded-lg text-[11px]" onClick={() => { setTaskStage(t.id, "Cleaning"); toast.info(`Cleaning started · room ${t.room}`); }}>Start</Button>
                        <Button size="sm" variant="secondary" className="h-7 rounded-lg text-[11px]" onClick={() => { setTaskStage(t.id, "Inspection"); toast.info(`Room ${t.room} awaiting inspection`); }}>Complete</Button>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]" onClick={() => { setTaskStage(t.id, "Ready"); toast.success(`Room ${t.room} inspected & ready`); }}>Inspect</Button>
                        <Button size="sm" variant="outline" className="h-7 rounded-lg text-[11px]" onClick={() => { addTicket({ room: t.room, issue: "Reported during cleaning", priority: "Medium", status: "Open", assignee: "Anil Kumar" }); toast.warning(`Issue reported for room ${t.room}`); }}>Issue</Button>
                      </div>
                    </div>
                  ))}
                  {!list.length ? <p className="rounded-xl border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground">Nothing here</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Attendant workload" description="Assignments for the morning shift">
          <div className="grid gap-4 sm:grid-cols-2">
            {HOUSEKEEPERS.map((h) => {
              const assigned = hkTasks.filter((t) => t.assignee === h);
              const done = assigned.filter((t) => t.stage === "Ready").length;
              return (
                <div key={h} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-brass text-xs font-bold text-gold-foreground">{h.slice(0, 2).toUpperCase()}</span>
                    <div><div className="font-semibold">{h}</div><div className="text-[11px] text-muted-foreground">{assigned.length} rooms assigned</div></div>
                  </div>
                  <div className="mt-3"><ProgressBar value={assigned.length ? (done / assigned.length) * 100 : 0} tone="success" /></div>
                  <div className="mt-2 flex justify-between text-[11px] text-muted-foreground"><span>{done} completed</span><span>{assigned.length - done} remaining</span></div>
                </div>
              );
            })}
          </div>
        </Panel>
        <Panel title="Room checklist" description="Standard departure clean">
          <ul className="space-y-2">
            {HK_CHECKLIST.map((c) => (
              <li key={c}>
                <label className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 text-sm">
                  <Checkbox checked={checked.includes(c)} onCheckedChange={() => setChecked((s) => (s.includes(c) ? s.filter((x) => x !== c) : [...s, c]))} />
                  <span className={cn(checked.includes(c) && "text-muted-foreground line-through")}>{c}</span>
                </label>
              </li>
            ))}
          </ul>
          <Button className="mt-4 w-full rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => toast.success(`Checklist submitted · ${checked.length}/${HK_CHECKLIST.length} complete`)}>Submit checklist</Button>
        </Panel>
      </div>
    </>
  );
}
