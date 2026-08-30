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
import { inr, HK_CHECKLIST } from "@/lib/pms-data";
import { LogIn, LogOut, Users, DoorOpen, ArrowLeftRight, ArrowUpNarrowWide } from "lucide-react";

export const Route = createFileRoute("/_shell/front-desk")({
  head: () => ({
    meta: [
      { title: "Front Desk — DRB Hotel PMS" },
      { name: "description", content: "Fast DRB Hotel front desk workflows: check-in queue, departures, walk-ins, room transfers and upgrades." },
      { property: "og:title", content: "DRB Hotel — Front Desk" },
      { property: "og:description", content: "Fast DRB Hotel front desk workflows: check-in queue, departures, walk-ins, room transfers and upgrades." },
    ],
  }),
  component: FrontDesk,
});

function FrontDesk() {
  const { reservations, rooms, checkIn, checkOut, transferRoom, addReservation, assignGuestToRoom } = usePms();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [walkIn, setWalkIn] = React.useState({ name: "", room: "", nights: "1" });
  const arrivals = reservations.filter((r) => r.status === "Confirmed" || r.status === "Tentative");
  const inHouse = reservations.filter((r) => r.status === "Checked In");
  const res = reservations.find((r) => r.id === selected) ?? null;
  const vacant = rooms.filter((r) => r.status === "vacant-clean");

  return (
    <>
      <PageHeader eyebrow="Operations" title="Front Desk" subtitle="Wednesday, 12 August 2026 · Shift: Morning · Agent on duty" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Today's Arrivals" value={String(arrivals.length)} icon={LogIn} tone="info" hint="Queue below" />
        <KpiCard label="Today's Departures" value={String(inHouse.length)} icon={LogOut} tone="warning" hint="Settle folios" />
        <KpiCard label="In-House Guests" value={String(rooms.filter((r) => r.status === "occupied").length)} icon={Users} tone="gold" hint="Occupied keys" />
        <KpiCard label="Walk-in Ready" value={String(vacant.length)} icon={DoorOpen} tone="success" hint="Vacant clean" />
      </div>

      <Tabs defaultValue="checkin">
        <TabsList className="rounded-xl">
          <TabsTrigger value="checkin" className="rounded-lg">Check-In Queue</TabsTrigger>
          <TabsTrigger value="checkout" className="rounded-lg">Departures</TabsTrigger>
          <TabsTrigger value="walkin" className="rounded-lg">Walk-in</TabsTrigger>
          <TabsTrigger value="transfer" className="rounded-lg">Transfer & Upgrade</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="mt-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {arrivals.map((r) => (
              <div key={r.id} className="card-premium hover-lift p-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 text-base font-semibold">{r.guest}{r.vip ? <Pill tone="gold">VIP</Pill> : null}</div>
                    <div className="text-xs text-muted-foreground">{r.id} · {r.source}</div>
                  </div>
                  <Pill tone={r.payment === "Paid" ? "success" : r.payment === "Partial" ? "warning" : "destructive"}>{r.payment}</Pill>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Room</dt><dd className="font-semibold">{r.room}</dd></div>
                  <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Arrival</dt><dd className="font-semibold">{r.arrival} · {r.eta}</dd></div>
                  <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">ID status</dt><dd className="font-semibold">{r.vip ? "Verified" : "Pending scan"}</dd></div>
                  <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Balance</dt><dd className="font-semibold">{inr(r.amount - r.paid)}</dd></div>
                </dl>
                <Button className="mt-4 w-full rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => setSelected(r.id)}>Check In</Button>
              </div>
            ))}
            {!arrivals.length ? <div className="md:col-span-2 xl:col-span-3"><EmptyState title="Queue clear" body="Every expected arrival has been checked in." icon={LogIn} /></div> : null}
          </div>
        </TabsContent>

        <TabsContent value="checkout" className="mt-5">
          <Panel bodyClassName="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Guest</TableHead><TableHead>Room</TableHead><TableHead>Checkout</TableHead><TableHead>Folio balance</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {inHouse.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.guest}</TableCell>
                    <TableCell className="tabular-nums">{r.room}</TableCell>
                    <TableCell>11:00 AM</TableCell>
                    <TableCell>{inr(r.amount - r.paid)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { checkOut(r.id); toast.success(`${r.guest} checked out · folio settled`); }}>Check Out</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!inHouse.length ? <div className="p-6"><EmptyState title="No in-house departures" body="All rooms have been settled." icon={LogOut} /></div> : null}
          </Panel>
        </TabsContent>

        <TabsContent value="walkin" className="mt-5">
          <Panel title="Walk-in booking" description="Fast three-field workflow for guests at the desk">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2"><Label>Guest name</Label><Input value={walkIn.name} onChange={(e) => setWalkIn({ ...walkIn, name: e.target.value })} placeholder="Guest name" /></div>
              <div className="space-y-2"><Label>Room</Label>
                <Select value={walkIn.room} onValueChange={(v) => setWalkIn({ ...walkIn, room: v })}>
                  <SelectTrigger><SelectValue placeholder="Vacant clean rooms" /></SelectTrigger>
                  <SelectContent>{vacant.map((r) => <SelectItem key={r.id} value={r.number}>{r.number} · {r.type} · {inr(r.rate)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Nights</Label><Input type="number" min={1} value={walkIn.nights} onChange={(e) => setWalkIn({ ...walkIn, nights: e.target.value })} /></div>
            </div>
            <Button className="mt-4 rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => {
              const room = rooms.find((r) => r.number === walkIn.room);
              if (!walkIn.name.trim() || !room) { toast.error("Add guest name and pick a room"); return; }
              const r = addReservation({ guest: walkIn.name, room: room.number, roomType: room.type, source: "Walk-in", nights: Number(walkIn.nights), amount: room.rate * Number(walkIn.nights), status: "Checked In", payment: "Paid" });
              assignGuestToRoom(room.id, walkIn.name);
              toast.success(`Walk-in ${r.id} checked into room ${room.number}`);
              setWalkIn({ name: "", room: "", nights: "1" });
            }}>Create walk-in & check in</Button>
          </Panel>
        </TabsContent>

        <TabsContent value="transfer" className="mt-5">
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Room transfer" description="Move an in-house guest to another vacant clean room">
              <ul className="space-y-3">
                {inHouse.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3">
                    <div><div className="text-sm font-semibold">{r.guest}</div><div className="text-xs text-muted-foreground">Currently in room {r.room}</div></div>
                    <div className="flex items-center gap-2">
                      <Select onValueChange={(v) => { transferRoom(r.id, v); toast.success(`${r.guest} moved to room ${v}`); }}>
                        <SelectTrigger className="w-[150px]"><SelectValue placeholder="Move to…" /></SelectTrigger>
                        <SelectContent>{vacant.map((v) => <SelectItem key={v.id} value={v.number}>{v.number} · {v.type}</SelectItem>)}</SelectContent>
                      </Select>
                      <ArrowLeftRight className="size-4 text-muted-foreground" />
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Upgrade / downgrade" description="Price difference is calculated per night">
              <ul className="space-y-3">
                {[["Standard Twin", 3200], ["Deluxe King", 4500], ["Premier Balcony", 5600], ["Executive Suite", 8900]].map(([t, p]) => (
                  <li key={t as string} className="flex items-center justify-between rounded-xl border border-border p-3">
                    <div><div className="text-sm font-semibold">{t as string}</div><div className="text-xs text-muted-foreground">{rooms.filter((r) => r.type === t && r.status === "vacant-clean").length} available</div></div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold">{inr(p as number)}</span>
                      <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.success(`Upgrade to ${t} applied · ${inr((p as number) - 4500)} / night difference`)}>
                        <ArrowUpNarrowWide className="mr-1 size-4" /> Apply
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!res} onOpenChange={(o: boolean) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check in · {res?.guest}</DialogTitle>
            <DialogDescription>{res?.id} · {res?.roomType} · {res?.arrival} → {res?.departure}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3"><div className="eyebrow">Guest</div><div className="mt-1 text-sm font-medium">{res?.guest}</div><div className="text-xs text-muted-foreground">{res?.phone}</div></div>
            <div className="rounded-xl border border-border p-3"><div className="eyebrow">ID document</div><div className="mt-2 grid h-16 place-items-center rounded-lg bg-secondary text-[10px] uppercase tracking-widest text-muted-foreground">Aadhaar · XXXX XXXX 4821</div></div>
            <div className="space-y-2"><Label>Room assignment</Label>
              <Select defaultValue={res?.room ?? ""}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{[...(res ? [res.room] : []), ...vacant.map((v) => v.number)].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Deposit collected (₹)</Label><Input defaultValue="5000" /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Payment method</Label>
              <Select defaultValue="Card">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Card", "UPI", "Cash", "Bank transfer", "City ledger"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <div className="eyebrow mb-2">Arrival checklist</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {HK_CHECKLIST.slice(0, 4).map((c) => (
                  <label key={c} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><Checkbox defaultChecked /> {c} verified</label>
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <div className="eyebrow mb-2">Guest signature</div>
              <div className="grid h-20 place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">Signature captured on tablet</div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
            <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => {
              if (res) { checkIn(res.id); toast.success(`${res.guest} checked into room ${res.room}`, { description: "Key card encoded · welcome message sent" }); }
              setSelected(null);
            }}>Complete check-in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
