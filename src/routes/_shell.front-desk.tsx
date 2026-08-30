import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, KpiCard, PageHeader, Panel, Pill } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { inr } from "@/lib/pms-data";
import { toast } from "sonner";
import { LogIn, LogOut, Plus, Users, DoorOpen, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_shell/front-desk")({
  head: () => ({
    meta: [
      { title: "Front Desk & Check-In — DRB Hotel PMS" },
      { name: "description", content: "Front desk arrivals queue, room assignments, departures, and walk-in bookings." },
    ],
  }),
  component: FrontDesk,
});

const HK_CHECKLIST = ["Keycards encoded", "ID verified & scanned", "Registration card signed", "Deposit settled"];

function FrontDesk() {
  const { rooms, reservations, guests, payments, checkIn, checkOut, addRoomReservation, settlePayment } = usePms();

  const arrivals = reservations.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING");
  const inHouse = reservations.filter((r) => r.status === "OCCUPIED");
  const vacant = rooms.filter((r) => r.status === "AVAILABLE");

  const [selected, setSelected] = React.useState<string | null>(null);
  const res = reservations.find((r) => r.id === selected) ?? null;
  const resGuest = res ? guests.find((g) => g.id === res.guest_id) : null;
  const resRoom = res ? rooms.find((r) => r.id === res.room_id) : null;

  const [checkinPayAmount, setCheckinPayAmount] = React.useState("");
  const [checkinPayMethod, setCheckinPayMethod] = React.useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER">("CASH");

  const getGuestName = (guestId: string) => guests.find(g => g.id === guestId)?.name || "Guest";
  const getGuestPhone = (guestId: string) => guests.find(g => g.id === guestId)?.phone;
  const getRoomNum = (roomId?: string) => rooms.find(r => r.id === roomId)?.room_number || "TBD";

  const getReservationPayment = (resId: string) => payments.find(p => p.reservation_id === resId);

  const getReservationFinancials = (r: typeof reservations[0]) => {
    const p = getReservationPayment(r.id);
    const total = Number(p?.total_amount) || Number(r.base_amount) || 0;
    const paid = Number(p?.paid_amount) || 0;
    const balance = total - paid > 0 ? total - paid : 0;
    const isPaid = balance === 0 && total > 0;
    return { total, paid, balance, isPaid, payment: p };
  };

  const [bookingOpen, setBookingOpen] = React.useState(false);
  const [b, setB] = React.useState({
    guestName: "", phone: "", email: "", roomId: "", date: new Date().toISOString().split('T')[0], nights: 1, baseAmount: 0, totalAmount: 0, paidAmount: 0, paymentMethod: "CASH"
  });

  const handleBooking = async () => {
    if (!b.guestName.trim()) return toast.error("Please enter guest name");
    if (!b.roomId) return toast.error("Please select a room");
    
    const res = await addRoomReservation(b);
    if (res?.success) {
      toast.success("Room booked successfully!");
      setBookingOpen(false);
      setB({
        guestName: "", phone: "", email: "", roomId: "", date: new Date().toISOString().split('T')[0], nights: 1, baseAmount: 0, totalAmount: 0, paidAmount: 0, paymentMethod: "CASH"
      });
    } else {
      toast.error(res?.error || "Failed to book room");
    }
  };

  const handleCompleteCheckIn = async () => {
    if (!res || !res.room_id) return;
    const { balance } = getReservationFinancials(res);

    // If there is an unpaid balance and staff entered an amount, settle it
    const payAmt = parseFloat(checkinPayAmount);
    if (balance > 0 && !isNaN(payAmt) && payAmt > 0) {
      await settlePayment(res.id, payAmt, checkinPayMethod);
    }

    await checkIn(res.id, res.room_id);
    toast.success(`${resGuest?.name || 'Guest'} checked in to Room ${resRoom?.room_number}`);
    setSelected(null);
    setCheckinPayAmount("");
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
          <TabsTrigger value="checkin" className="rounded-lg">
            Check-In Queue ({arrivals.length})
          </TabsTrigger>
          <TabsTrigger value="checkout" className="rounded-lg">
            Departures ({inHouse.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="checkin" className="mt-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {arrivals.map((r) => {
              const gName = getGuestName(r.guest_id);
              const gPhone = getGuestPhone(r.guest_id);
              const rmNum = getRoomNum(r.room_id);
              const { total, paid, balance, isPaid } = getReservationFinancials(r);

              return (
                <div key={r.id} className="card-premium hover-lift p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-base font-semibold">{gName}</div>
                        <div className="text-xs text-muted-foreground font-mono">{r.id.slice(0, 8).toUpperCase()} {gPhone ? `· ${gPhone}` : ''}</div>
                      </div>
                      {isPaid ? (
                        <Pill tone="success">Paid in Full</Pill>
                      ) : paid > 0 ? (
                        <Pill tone="info">Partial Paid</Pill>
                      ) : (
                        <Pill tone="warning">Pending Due</Pill>
                      )}
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <dt className="text-muted-foreground">Room</dt>
                        <dd className="font-semibold">{rmNum}</dd>
                      </div>
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <dt className="text-muted-foreground">Arrival</dt>
                        <dd className="font-semibold">{r.booking_date}</dd>
                      </div>
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <dt className="text-muted-foreground">Total Bill</dt>
                        <dd className="font-semibold">{inr(total)}</dd>
                      </div>
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <dt className="text-muted-foreground">Pending Balance</dt>
                        <dd className={balance > 0 ? "font-bold text-warning" : "font-semibold text-success"}>
                          {balance > 0 ? inr(balance) : "₹0.00 (Settled)"}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <Button 
                    className="mt-4 w-full rounded-xl bg-brass text-gold-foreground hover:opacity-90" 
                    onClick={() => {
                      setSelected(r.id);
                      setCheckinPayAmount(String(balance > 0 ? balance : 0));
                    }}
                  >
                    Start Check In
                  </Button>
                </div>
              );
            })}
            {!arrivals.length ? <div className="md:col-span-2 xl:col-span-3"><EmptyState title="Queue clear" body="Every expected arrival has been checked in." icon={LogIn} /></div> : null}
          </div>
        </TabsContent>

        <TabsContent value="checkout" className="mt-5">
          <Panel bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest & Contact</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Total Bill</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Outstanding Balance</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inHouse.map((r) => {
                  const gName = getGuestName(r.guest_id);
                  const gPhone = getGuestPhone(r.guest_id);
                  const rmNum = getRoomNum(r.room_id);
                  const { total, paid, balance } = getReservationFinancials(r);

                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-semibold">{gName}</div>
                        <div className="text-xs text-muted-foreground">{gPhone || "—"}</div>
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">Room {rmNum}</TableCell>
                      <TableCell className="font-medium">{inr(total)}</TableCell>
                      <TableCell className="text-success font-medium">{inr(paid)}</TableCell>
                      <TableCell className={balance > 0 ? "font-bold text-warning" : "text-success font-medium"}>
                        {balance > 0 ? inr(balance) : "₹0.00 (Settled)"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="rounded-lg" 
                          onClick={async () => {
                            if (balance > 0) {
                              if (!confirm(`This guest has an outstanding balance of ${inr(balance)}. Proceed to check out and mark room for housekeeping?`)) return;
                            }
                            await checkOut(r.id); 
                            toast.success(`${gName} checked out · Room ${rmNum} moved to Housekeeping`); 
                          }}
                        >
                          Check Out
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            {!inHouse.length && (
              <div className="p-8">
                <EmptyState title="No In-House Departures" body="All active guest folios are currently checked in." icon={LogOut} />
              </div>
            )}
          </Panel>
        </TabsContent>
      </Tabs>

      {/* Check-In Modal */}
      <Dialog open={!!res} onOpenChange={(o: boolean) => { if (!o) setSelected(null); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check In · {resGuest?.name}</DialogTitle>
            <DialogDescription>Room {resRoom?.room_number} · Arrival Confirmation #{res?.id.slice(0, 8).toUpperCase()}</DialogDescription>
          </DialogHeader>

          {res && (() => {
            const { total, paid, balance, isPaid } = getReservationFinancials(res);

            return (
              <div className="space-y-4 pt-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-xs font-semibold uppercase text-gold">Guest Details</div>
                    <div className="mt-1 text-sm font-semibold">{resGuest?.name}</div>
                    <div className="text-xs text-muted-foreground">{resGuest?.phone || "No phone on record"}</div>
                  </div>

                  <div className="rounded-xl border border-border p-3">
                    <div className="text-xs font-semibold uppercase text-gold">Room Assignment</div>
                    <div className="mt-1 text-sm font-semibold">Room {resRoom?.room_number || "TBD"} ({resRoom?.room_name || "Standard"})</div>
                    <div className="text-xs text-muted-foreground">Floor {resRoom?.floor || "1"}</div>
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-muted-foreground">Total Bill: {inr(total)}</div>
                      <div className="text-xs text-success font-medium">Already Paid: {inr(paid)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] uppercase font-semibold text-muted-foreground">Balance Due</div>
                      <div className={balance > 0 ? "text-xl font-bold text-warning" : "text-xl font-bold text-success flex items-center gap-1 justify-end"}>
                        {balance > 0 ? inr(balance) : <><CheckCircle2 className="size-5 text-success inline" /> Settled (₹0.00)</>}
                      </div>
                    </div>
                  </div>

                  {balance > 0 && (
                    <div className="mt-4 pt-3 border-t border-border grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Collect Balance on Check-in (₹)</Label>
                        <Input 
                          type="number" 
                          value={checkinPayAmount} 
                          onChange={(e) => setCheckinPayAmount(e.target.value)} 
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Payment Method</Label>
                        <Select value={checkinPayMethod} onValueChange={(v: any) => setCheckinPayMethod(v)}>
                          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASH">Cash</SelectItem>
                            <SelectItem value="UPI">UPI / QR</SelectItem>
                            <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                            <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase text-gold mb-2">Arrival Checkpoints</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {HK_CHECKLIST.map((c) => (
                      <label key={c} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
                        <Checkbox defaultChecked /> {c}
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-border">
                  <Button variant="ghost" onClick={() => setSelected(null)}>Cancel</Button>
                  <Button className="bg-brass text-gold-foreground hover:opacity-90" onClick={handleCompleteCheckIn}>
                    Complete Check-In
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* New Room Booking Dialog */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>New Room Reservation</DialogTitle>
            <DialogDescription>Book a room for a walk-in or phone reservation</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2"><Label>Guest name *</Label><Input value={b.guestName} onChange={(e) => setB({ ...b, guestName: e.target.value })} placeholder="e.g. Rajesh Sharma" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={b.phone} onChange={(e) => setB({ ...b, phone: e.target.value })} placeholder="+91 98765 43210" /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={b.email} onChange={(e) => setB({ ...b, email: e.target.value })} placeholder="guest@example.com" /></div>
            <div className="space-y-2"><Label>ID Verification Number</Label><Input value={(b as any).idNumber || ""} onChange={(e) => setB({ ...b, idNumber: e.target.value } as any)} placeholder="Passport, Aadhaar, etc." /></div>
            <div className="space-y-2"><Label>Room *</Label>
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
            <div className="space-y-2"><Label>Total Amount (₹)</Label><Input type="number" value={b.totalAmount} onChange={(e) => setB({ ...b, totalAmount: parseFloat(e.target.value) || 0 })} /></div>
            <div className="space-y-2"><Label>Paid Amount / Deposit (₹)</Label><Input type="number" value={b.paidAmount} onChange={(e) => setB({ ...b, paidAmount: parseFloat(e.target.value) || 0 })} /></div>
            <div className="space-y-2 sm:col-span-2"><Label>Payment Method</Label>
              <Select value={b.paymentMethod} onValueChange={(v) => setB({ ...b, paymentMethod: v })}>
                <SelectTrigger><SelectValue placeholder="Payment Method" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="UPI">UPI / QR (GPay, PhonePe, Paytm)</SelectItem>
                  <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setBookingOpen(false)}>Cancel</Button>
            <Button onClick={handleBooking} className="bg-brass text-gold-foreground hover:opacity-90">Confirm Booking</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
