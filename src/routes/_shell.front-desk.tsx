import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, KpiCard, PageHeader, Panel, Pill } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { toast } from "sonner";
import { inr } from "@/lib/pms-data";
import { LogIn, LogOut, Users, DoorOpen, Plus } from "lucide-react";

export const Route = createFileRoute("/_shell/front-desk")({
  head: () => ({
    meta: [
      { title: "Front Desk — DRB Hotel PMS" },
      { name: "description", content: "Fast DRB Hotel front desk workflows: check-in queue, departures, walk-ins, room transfers and upgrades." },
      { property: "og:title", content: "DRB Hotel — Front Desk" },
    ],
  }),
  component: FrontDesk,
});

const HK_CHECKLIST = [
  "Welcome letter",
  "Towels & robes",
  "Minibar restocked",
  "AC & Lights test"
];

function FrontDesk() {
  const { reservations, rooms, checkIn, checkOut, transferRoom, addRoomReservation, assignGuestToRoom, guests } = usePms();
  const [selected, setSelected] = React.useState<string | null>(null);
  const [walkIn, setWalkIn] = React.useState({ name: "", phone: "", email: "", room: "", nights: "1", amount: "" });
  
  const roomReservations = reservations.filter(r => r.resource_type === 'ROOM');
  const arrivals = roomReservations.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING");
  const inHouse = roomReservations.filter((r) => r.status === "OCCUPIED");
  
  const res = roomReservations.find((r) => r.id === selected) ?? null;
  const resGuest = res ? guests.find(g => g.id === res.guest_id) : null;
  const resRoom = res ? rooms.find(rm => rm.id === rm.id) : null;

  const vacant = rooms.filter((r) => r.status === "AVAILABLE" || r.status === "DIRTY");

  const getGuestName = (guestId: string) => guests.find(g => g.id === guestId)?.name || "Unknown";
  const getRoomNum = (roomId?: string) => rooms.find(r => r.id === roomId)?.room_number || "TBD";

  const [bookingOpen, setBookingOpen] = React.useState(false);
  const [b, setB] = React.useState({
    guestName: "", phone: "", email: "", roomId: "", date: new Date().toISOString().split('T')[0], nights: 1, baseAmount: 0, totalAmount: 0, paidAmount: 0, paymentMethod: "Credit Card"
  });

  const handleBooking = async () => {
    if (!b.guestName.trim()) return toast.error("Please enter guest name");
    if (!b.roomId) return toast.error("Please select a room");
    
    const res = await addRoomReservation(b);
    if (res?.success) {
      toast.success("Room booked successfully!");
      setBookingOpen(false);
      setB({
        guestName: "", phone: "", email: "", roomId: "", date: new Date().toISOString().split('T')[0], nights: 1, baseAmount: 0, totalAmount: 0, paidAmount: 0, paymentMethod: "Credit Card"
      });
    } else {
      toast.error(res?.error || "Failed to book room");
    }
  };

  return (
    <>
      <PageHeader 
        eyebrow="Operations" 
        title="Front Desk" 
        subtitle="Manage arrivals, departures, and new walk-in room bookings" 
        actions={
          <Button onClick={() => setBookingOpen(true)} className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90">
            <Plus className="mr-2 size-4" /> Book Room
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Today's Arrivals" value={String(arrivals.length)} icon={LogIn} tone="info" hint="Queue below" />
        <KpiCard label="Today's Departures" value={String(inHouse.length)} icon={LogOut} tone="warning" hint="Settle folios" />
        <KpiCard label="In-House Guests" value={String(rooms.filter((r) => r.status === "OCCUPIED").length)} icon={Users} tone="gold" hint="Occupied keys" />
        <KpiCard label="Walk-in Ready" value={String(rooms.filter(r => r.status === "AVAILABLE").length)} icon={DoorOpen} tone="success" hint="Vacant clean" />
      </div>

      <Tabs defaultValue="checkin">
        <TabsList className="rounded-xl">
          <TabsTrigger value="checkin" className="rounded-lg">Check-In Queue</TabsTrigger>
          <TabsTrigger value="checkout" className="rounded-lg">Departures</TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="mt-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {arrivals.map((r) => {
              const gName = getGuestName(r.guest_id);
              const rmNum = getRoomNum(r.room_id);
              return (
                <div key={r.id} className="card-premium hover-lift p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-base font-semibold">{gName}</div>
                      <div className="text-xs text-muted-foreground">{r.id.slice(0, 8).toUpperCase()}</div>
                    </div>
                    <Pill tone="warning">Pending</Pill>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Room</dt><dd className="font-semibold">{rmNum}</dd></div>
                    <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Arrival</dt><dd className="font-semibold">{r.booking_date}</dd></div>
                    <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Status</dt><dd className="font-semibold">{r.status}</dd></div>
                    <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Balance</dt><dd className="font-semibold">{inr(r.base_amount)}</dd></div>
                  </dl>
                  <Button className="mt-4 w-full rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => setSelected(r.id)}>Start Check In</Button>
                </div>
              );
            })}
            {!arrivals.length ? <div className="md:col-span-2 xl:col-span-3"><EmptyState title="Queue clear" body="Every expected arrival has been checked in." icon={LogIn} /></div> : null}
          </div>
        </TabsContent>

        <TabsContent value="checkout" className="mt-5">
          <Panel bodyClassName="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Guest</TableHead><TableHead>Room</TableHead><TableHead>Checkout Date</TableHead><TableHead>Base Amount</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {inHouse.map((r) => {
                  const gName = getGuestName(r.guest_id);
                  const rmNum = getRoomNum(r.room_id);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{gName}</TableCell>
                      <TableCell className="tabular-nums">{rmNum}</TableCell>
                      <TableCell>{r.end_time ? new Date(r.end_time).toLocaleDateString() : r.booking_date}</TableCell>
                      <TableCell>{inr(r.base_amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="rounded-lg" onClick={() => { checkOut(r.id); toast.success(`${gName} checked out`); }}>Check Out</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Panel>
        </TabsContent>
      </Tabs>

      <Dialog open={!!res} onOpenChange={(o: boolean) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check in · {resGuest?.name}</DialogTitle>
            <DialogDescription>{res?.id} · {resRoom?.room_number}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-3"><div className="eyebrow">Guest</div><div className="mt-1 text-sm font-medium">{resGuest?.name}</div><div className="text-xs text-muted-foreground">{resGuest?.phone || "No phone"}</div></div>
            <div className="rounded-xl border border-border p-3"><div className="eyebrow">ID document</div><div className="mt-2 grid h-16 place-items-center rounded-lg bg-secondary text-[10px] uppercase tracking-widest text-muted-foreground">Pending Scan</div></div>
            <div className="space-y-2"><Label>Room assignment</Label>
              <Select defaultValue={res?.room_id ?? ""}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {res?.room_id && <SelectItem value={res.room_id}>{resRoom?.room_number}</SelectItem>}
                  {vacant.map((v) => <SelectItem key={v.id} value={v.id}>{v.room_number}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Deposit collected (₹)</Label><Input defaultValue={res?.base_amount} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Payment method</Label>
              <Select defaultValue="Card">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Card", "UPI", "Cash", "Bank transfer", "City ledger"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <div className="eyebrow mb-2">Arrival checklist</div>
              <div className="grid gap-2 sm:grid-cols-2">
                {HK_CHECKLIST.map((c) => (
                  <label key={c} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><Checkbox defaultChecked /> {c} verified</label>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
            <Button className="bg-brass text-gold-foreground hover:opacity-90" onClick={() => {
              if (res && res.room_id) {
                checkIn(res.id, res.room_id);
                toast.success(`${resGuest?.name} checked in to room ${resRoom?.room_number}`);
                setSelected(null);
              }
            }}>Complete Check-In</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Room Reservation</DialogTitle>
            <DialogDescription>Book a room for a walk-in or phone reservation</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Guest name</Label><Input value={b.guestName} onChange={(e) => setB({ ...b, guestName: e.target.value })} placeholder="Guest name" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={b.phone} onChange={(e) => setB({ ...b, phone: e.target.value })} placeholder="Phone number" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={b.email} onChange={(e) => setB({ ...b, email: e.target.value })} placeholder="Email address" /></div>
            <div className="space-y-2"><Label>ID Verification Number</Label><Input value={(b as any).idNumber || ""} onChange={(e) => setB({ ...b, idNumber: e.target.value } as any)} placeholder="Passport, Aadhaar, etc." /></div>
            <div className="space-y-2"><Label>Room</Label>
              <Select value={b.roomId} onValueChange={(v) => {
                const room = rooms.find(r => r.id === v);
                if (room) setB({ ...b, roomId: v, baseAmount: room.price, totalAmount: room.price * b.nights });
              }}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>{vacant.map((r) => <SelectItem key={r.id} value={r.id}>{r.room_number} · {inr(r.price)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Nights</Label>
              <Input type="number" min={1} value={b.nights} onChange={(e) => {
                const nights = parseInt(e.target.value) || 1;
                setB({ ...b, nights, totalAmount: b.baseAmount * nights });
              }} />
            </div>
            <div className="space-y-2"><Label>Total Amount</Label><Input type="number" value={b.totalAmount} onChange={(e) => setB({ ...b, totalAmount: parseFloat(e.target.value) })} /></div>
            <div className="space-y-2"><Label>Paid Amount (Deposit)</Label><Input type="number" value={b.paidAmount} onChange={(e) => setB({ ...b, paidAmount: parseFloat(e.target.value) || 0 })} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={() => setBookingOpen(false)}>Cancel</Button>
            <Button onClick={handleBooking} className="bg-brass text-gold-foreground hover:opacity-90">Confirm Booking</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
