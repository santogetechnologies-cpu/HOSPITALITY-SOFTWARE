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
import { STAFF } from "@/lib/pms-data";
import { Users, UserCheck, UserX, CalendarClock } from "lucide-react";

export const Route = createFileRoute("/_shell/staff")({
  head: () => ({
    meta: [
      { title: "Staff — DRB Hotel PMS" },
      { name: "description", content: "DRB Hotel team roster: attendance, departments, shifts and task completion." },
      { property: "og:title", content: "DRB Hotel — Staff" },
      { property: "og:description", content: "DRB Hotel team roster: attendance, departments, shifts and task completion." },
    ],
  }),
  component: StaffPage,
});

function StaffPage() {
  const [dept, setDept] = React.useState("all");
  const rows = STAFF.filter((s) => dept === "all" || s.department === dept);
  const depts = Array.from(new Set(STAFF.map((s) => s.department)));
  return (
    <>
      <PageHeader eyebrow="People" title="Staff" subtitle="Morning shift in progress · 12 August 2026" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Total Staff" value={String(STAFF.length)} icon={Users} tone="gold" />
        <KpiCard label="Present" value={String(STAFF.filter((s) => s.attendance === "Present").length)} icon={UserCheck} tone="success" />
        <KpiCard label="Absent" value={String(STAFF.filter((s) => s.attendance === "Absent").length)} icon={UserX} tone="destructive" />
        <KpiCard label="On Leave" value={String(STAFF.filter((s) => s.attendance === "On Leave").length)} tone="warning" />
        <KpiCard label="Current Shift" value="Morning" icon={CalendarClock} tone="info" />
      </div>

      <Panel bodyClassName="p-4">
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All departments</SelectItem>{depts.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map((s) => (
          <div key={s.id} className="card-premium hover-lift p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-full bg-brass text-xs font-bold text-gold-foreground">{s.name.split(" ").map((n) => n[0]).join("")}</span>
              <div className="min-w-0"><div className="truncate text-sm font-semibold">{s.name}</div><div className="truncate text-[11px] text-muted-foreground">{s.role}</div></div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Pill>{s.department}</Pill>
              <Pill tone="info">{s.shift}</Pill>
              <Pill tone={s.attendance === "Present" ? "success" : s.attendance === "Absent" ? "destructive" : "warning"}>{s.attendance}</Pill>
            </div>
            <div className="mt-3"><ProgressBar value={s.tasks ? (s.done / s.tasks) * 100 : 0} tone="success" /></div>
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground"><span>{s.done}/{s.tasks} tasks</span><button className="underline" onClick={() => toast.info(`Task list opened for ${s.name}`)}>View</button></div>
          </div>
        ))}
      </div>

      <Panel title="Shift schedule" description="This week" bodyClassName="p-0">
        <div className="scroll-slim overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Team member</TableHead>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => <TableHead key={d}>{d}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
              {rows.slice(0, 8).map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, j) => (
                    <TableCell key={d}><Pill tone={(i + j) % 5 === 0 ? "muted" : (i + j) % 3 === 0 ? "info" : "success"}>{(i + j) % 5 === 0 ? "Off" : (i + j) % 3 === 0 ? "Evening" : "Morning"}</Pill></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Panel>
    </>
  );
}
