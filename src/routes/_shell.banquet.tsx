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
import { PartyPopper } from "lucide-react";

export const Route = createFileRoute("/_shell/banquet")({
  head: () => ({
    meta: [
      { title: "Banquet & Events — DRB Hotel PMS" },
      { name: "description", content: "DRB Hotel banquet management: hall availability, event bookings and event revenue." },
      { property: "og:title", content: "DRB Hotel — Banquet & Events" },
      { property: "og:description", content: "DRB Hotel banquet management: hall availability, event bookings and event revenue." },
    ],
  }),
  component: Banquet,
});

function Banquet() {
  const { events, addEvent } = usePms();
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ name: "", hall: "DRB Grand Hall", type: "Wedding", guests: "100", date: "22 Aug", revenue: "75000" });
  return (
    <>
      <PageHeader eyebrow="Events" title="Banquet & Events" subtitle="Three venues · August season"
        actions={<Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => setOpen(true)}>New Event</Button>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Events this month" value={String(events.length)} tone="gold" icon={PartyPopper} />
        <KpiCard label="Confirmed revenue" value={inr(events.filter((e) => e.status === "Confirmed").reduce((a, b) => a + b.revenue, 0))} tone="success" />
        <KpiCard label="Tentative pipeline" value={inr(events.filter((e) => e.status === "Tentative").reduce((a, b) => a + b.revenue, 0))} tone="warning" />
        <KpiCard label="Halls available today" value="2 of 3" tone="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Event bookings" bodyClassName="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Event</TableHead><TableHead>Hall</TableHead><TableHead>Guests</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Revenue</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}<div className="text-[11px] text-muted-foreground">{e.type}</div></TableCell>
                  <TableCell>{e.hall}</TableCell>
                  <TableCell className="tabular-nums">{e.guests}</TableCell>
                  <TableCell>{e.date}</TableCell>
                  <TableCell className="text-right tabular-nums">{inr(e.revenue)}</TableCell>
                  <TableCell><Pill tone={e.status === "Confirmed" ? "success" : "warning"}>{e.status}</Pill></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <Panel title="Hall availability" description="Next seven days">
          <div className="space-y-3">
            {["DRB Grand Hall", "Boardroom Ivory", "Terrace Pavilion"].map((h) => (
              <div key={h} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between text-sm font-medium">{h}<Pill tone={h === "DRB Grand Hall" ? "warning" : "success"}>{h === "DRB Grand Hall" ? "2 dates held" : "Open"}</Pill></div>
                <div className="mt-2 grid grid-cols-7 gap-1">
                  {Array.from({ length: 7 }, (_, i) => (
                    <span key={i} className={cn("h-6 rounded", i % 3 === 0 && h === "DRB Grand Hall" ? "bg-st-reserved/70" : "bg-secondary")} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New event booking</DialogTitle><DialogDescription>Blocks the hall and creates an event folio.</DialogDescription></DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2"><Label>Event name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Sharma Reception" /></div>
            <div className="space-y-2"><Label>Hall</Label>
              <Select value={form.hall} onValueChange={(v) => setForm({ ...form, hall: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["DRB Grand Hall", "Boardroom Ivory", "Terrace Pavilion"].map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Guests</Label><Input value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })} /></div>
            <div className="space-y-2"><Label>Date</Label><Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            <div className="space-y-2"><Label>Revenue (₹)</Label><Input value={form.revenue} onChange={(e) => setForm({ ...form, revenue: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="bg-brass text-gold-foreground hover:opacity-90" onClick={() => {
              if (!form.name.trim()) { toast.error("Give the event a name"); return; }
              addEvent({ name: form.name, hall: form.hall, type: form.type, guests: Number(form.guests), date: form.date, revenue: Number(form.revenue), status: "Tentative" });
              setOpen(false); toast.success("Event booked · hall held for 48 hours");
            }}>Book event</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
