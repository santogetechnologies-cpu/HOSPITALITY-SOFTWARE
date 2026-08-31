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
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, KpiCard, PageHeader, Panel, Pill } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { inr } from "@/lib/pms-data";
import { toast } from "sonner";
import { LogIn, LogOut, Plus, Users, DoorOpen, CheckCircle2, Calendar, CreditCard, ShieldCheck, MapPin, User, FileText, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_shell/front-desk")({
  head: () => ({
    meta: [
      { title: "Front Desk & Check-In — DRB Hotel PMS" },
      { name: "description", content: "Front desk arrivals queue, room assignments, departures, and walk-in bookings." },
    ],
  }),
  component: FrontDesk,
});

const HK_CHECKLIST = ["Keycards encoded & assigned", "Government ID scanned & verified", "Registration card signed", "Advance deposit settled"];

export function FrontDesk() {
  const { rooms, reservations, guests, payments, checkIn, checkOut, addRoomReservation, settlePayment } = usePms();

  const arrivals = reservations.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING");
  const inHouse = reservations.filter((r) => r.status === "OCCUPIED");

  const [selected, setSelected] = React.useState<string | null>(null);
  const res = reservations.find((r) => r.id === selected) ?? null;
  const resGuest = res ? guests.find((g) => g.id === res.guest_id) : null;
  const resRoom = res ? rooms.find((r) => r.id === res.room_id) : null;

  const [checkinPayAmount, setCheckinPayAmount] = React.useState("");
  const [checkinPayMethod, setCheckinPayMethod] = React.useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER">("CASH");

  const getGuest = (guestId: string) => guests.find((g) => g.id === guestId);
  const getGuestName = (guestId: string) => getGuest(guestId)?.name || "Guest";
  const getGuestPhone = (guestId: string) => getGuest(guestId)?.phone;
  const getRoom = (roomId?: string) => rooms.find((r) => r.id === roomId);
  const getRoomNum = (roomId?: string) => getRoom(roomId)?.room_number || "TBD";

  const getReservationPayment = (resId: string) => payments.find((p) => p.reservation_id === resId);

  const getReservationFinancials = (r: typeof reservations[0]) => {
    const p = getReservationPayment(r.id);
    const total = Number(p?.total_amount) || Number(r.base_amount) || 0;
    const paid = Number(p?.paid_amount) || 0;
    const balance = total - paid > 0 ? total - paid : 0;
    const isPaid = balance === 0 && total > 0;
    return { total, paid, balance, isPaid, payment: p };
  };

  // Helper: check if a room is overlapping with any active reservation on given dates
  const isRoomBookedForDates = (roomId: string, startStr: string, endStr: string) => {
    if (!startStr || !endStr) return false;
    const reqStart = new Date(`${startStr}T14:00:00`).getTime();
    const reqEnd = new Date(`${endStr}T11:00:00`).getTime();
    return reservations.some((r) => {
      if (r.room_id !== roomId || r.status === "CANCELLED" || r.status === "COMPLETED") return false;
      const rStart = new Date(r.start_time || `${r.booking_date}T14:00:00`).getTime();
      const rEnd = new Date(r.end_time || `${r.booking_date}T11:00:00`).getTime();
      const effEnd = rEnd > rStart ? rEnd : rStart + 24 * 60 * 60 * 1000;
      return reqStart < effEnd && reqEnd > rStart;
    });
  };

  // Form Dates setup
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split("T")[0];

  const [bookingOpen, setBookingOpen] = React.useState(false);
  const [b, setB] = React.useState({
    guestName: "",
    phone: "",
    email: "",
    idType: "Aadhaar Card",
    idNumber: "",
    address: "",
    country: "India",
    numberOfGuests: 1,
    roomId: "",
    startDate: todayStr,
    endDate: tomorrowStr,
    nights: 1,
    baseAmount: 0,
    totalAmount: 0,
    paidAmount: 0,
    paymentMethod: "CASH",
    notes: "",
  });

  const handleStartDateChange = (newStart: string) => {
    const sDate = new Date(newStart);
    let eDate = new Date(b.endDate);
    if (isNaN(sDate.getTime())) return;
    if (eDate <= sDate) {
      eDate = new Date(sDate);
      eDate.setDate(eDate.getDate() + b.nights);
    }
    const calcNights = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
    const newEndStr = eDate.toISOString().split("T")[0];
    setB({
      ...b,
      startDate: newStart,
      endDate: newEndStr,
      nights: calcNights,
      totalAmount: b.baseAmount * calcNights,
    });
  };

  const handleEndDateChange = (newEnd: string) => {
    const sDate = new Date(b.startDate);
    const eDate = new Date(newEnd);
    if (isNaN(eDate.getTime()) || eDate <= sDate) {
      toast.error("Check-out date must be after check-in date");
      return;
    }
    const calcNights = Math.max(1, Math.round((eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
    setB({
      ...b,
      endDate: newEnd,
      nights: calcNights,
      totalAmount: b.baseAmount * calcNights,
    });
  };

  const handleNightsChange = (nightsVal: number) => {
    const nights = Math.max(1, nightsVal);
    const sDate = new Date(b.startDate);
    sDate.setDate(sDate.getDate() + nights);
    const newEndStr = sDate.toISOString().split("T")[0];
    setB({
      ...b,
      nights,
      endDate: newEndStr,
      totalAmount: b.baseAmount * nights,
    });
  };

  const handleBooking = async () => {
    if (!b.guestName.trim()) return toast.error("Please enter guest name");
    if (!b.roomId) return toast.error("Please select a room");
    if (isRoomBookedForDates(b.roomId, b.startDate, b.endDate)) {
      return toast.error("This room is already reserved for the selected dates. Please select another room.");
    }

    const res = await addRoomReservation(b);
    if (res?.success) {
      toast.success("Room booked successfully!");
      setBookingOpen(false);
      setB({
        guestName: "",
        phone: "",
        email: "",
        idType: "Aadhaar Card",
        idNumber: "",
        address: "",
        country: "India",
        numberOfGuests: 1,
        roomId: "",
        startDate: todayStr,
        endDate: tomorrowStr,
        nights: 1,
        baseAmount: 0,
        totalAmount: 0,
        paidAmount: 0,
        paymentMethod: "CASH",
        notes: "",
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
    toast.success(`${resGuest?.name || "Guest"} checked in to Room ${resRoom?.room_number}`);
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
            <Plus className="mr-2 size-4" /> New Room Reservation
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Today's Arrivals" value={String(arrivals.length)} icon={LogIn} tone="info" hint="Check-In queue" />
        <KpiCard label="Today's Departures" value={String(inHouse.length)} icon={LogOut} tone="warning" hint="In-house guests" />
        <KpiCard label="Occupied Keys" value={String(rooms.filter((r) => r.status === "OCCUPIED").length)} icon={Users} tone="gold" hint="In-house keys" />
        <KpiCard label="Vacant Clean" value={String(rooms.filter((r) => r.status === "AVAILABLE").length)} icon={DoorOpen} tone="success" hint="Ready for walk-in" />
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
              const g = getGuest(r.guest_id);
              const gName = g?.name || "Guest";
              const gPhone = g?.phone;
              const gId = g?.id_number ? `${g.id_type || 'ID'}: ${g.id_number}` : null;
              const rmNum = getRoomNum(r.room_id);
              const rm = getRoom(r.room_id);
              const { total, paid, balance, isPaid } = getReservationFinancials(r);

              const checkInDate = r.start_time ? new Date(r.start_time).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : r.booking_date;
              const checkOutDate = r.end_time ? new Date(r.end_time).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";

              return (
                <div key={r.id} className="card-premium hover-lift p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 text-base font-semibold">{gName}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {r.id.slice(0, 8).toUpperCase()} {gPhone ? `· ${gPhone}` : ""}
                        </div>
                        {gId && <div className="text-[11px] text-muted-foreground mt-0.5">{gId}</div>}
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
                        <dt className="text-muted-foreground">Room Key</dt>
                        <dd className="font-semibold text-foreground">Room {rmNum} <span className="text-[10px] text-muted-foreground">({rm?.room_name || "Standard"})</span></dd>
                      </div>
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <dt className="text-muted-foreground">Stay Dates</dt>
                        <dd className="font-semibold text-foreground">{checkInDate} → {checkOutDate}</dd>
                      </div>
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <dt className="text-muted-foreground">Total Bill</dt>
                        <dd className="font-semibold text-foreground">{inr(total)}</dd>
                      </div>
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <dt className="text-muted-foreground">Pending Balance</dt>
                        <dd className={balance > 0 ? "font-bold text-warning" : "font-semibold text-success"}>
                          {balance > 0 ? inr(balance) : "₹0 (Settled)"}
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
            {!arrivals.length ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState title="Queue clear" body="Every expected arrival has been checked in." icon={LogIn} />
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="checkout" className="mt-5">
          <Panel bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest & Contact</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Stay Window</TableHead>
                  <TableHead>Total Bill</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Outstanding Balance</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inHouse.map((r) => {
                  const g = getGuest(r.guest_id);
                  const gName = g?.name || "Guest";
                  const gPhone = g?.phone;
                  const gId = g?.id_number ? `${g.id_type || 'ID'}: ${g.id_number}` : null;
                  const rmNum = getRoomNum(r.room_id);
                  const { total, paid, balance } = getReservationFinancials(r);

                  const checkInDate = r.start_time ? new Date(r.start_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : r.booking_date;
                  const checkOutDate = r.end_time ? new Date(r.end_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

                  return (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-semibold">{gName}</div>
                        <div className="text-xs text-muted-foreground">{gPhone || "—"} {gId ? `· ${gId}` : ""}</div>
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">Room {rmNum}</TableCell>
                      <TableCell className="text-xs">{checkInDate} → {checkOutDate}</TableCell>
                      <TableCell className="font-medium">{inr(total)}</TableCell>
                      <TableCell className="text-success font-medium">{inr(paid)}</TableCell>
                      <TableCell className={balance > 0 ? "font-bold text-warning" : "text-success font-medium"}>
                        {balance > 0 ? inr(balance) : "₹0 (Settled)"}
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
                <EmptyState title="No In-House Departures" body="All active guest folios are currently checked in or completed." icon={LogOut} />
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
            const { total, paid, balance } = getReservationFinancials(res);

            return (
              <div className="space-y-4 pt-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-xs font-semibold uppercase text-gold">Guest Details</div>
                    <div className="mt-1 text-sm font-semibold">{resGuest?.name}</div>
                    <div className="text-xs text-muted-foreground">{resGuest?.phone || "No phone on record"}</div>
                    {resGuest?.id_number && (
                      <div className="text-xs text-muted-foreground mt-0.5">{resGuest.id_type || "ID"}: {resGuest.id_number}</div>
                    )}
                    {resGuest?.address && (
                      <div className="text-xs text-muted-foreground mt-0.5">{resGuest.address}</div>
                    )}
                  </div>

                  <div className="rounded-xl border border-border p-3">
                    <div className="text-xs font-semibold uppercase text-gold">Room Assignment</div>
                    <div className="mt-1 text-sm font-semibold">Room {resRoom?.room_number || "TBD"} ({resRoom?.room_name || "Standard"})</div>
                    <div className="text-xs text-muted-foreground">Floor {resRoom?.floor || "1"} · Capacity: {resRoom?.capacity || 2} Guests</div>
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

      {/* Comprehensive New Room Booking Dialog */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Calendar className="size-5 text-gold" />
              New Room Reservation
            </DialogTitle>
            <DialogDescription>
              Book a room for a walk-in or phone reservation with date availability and conflict checks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* Section 1: Stay & Date Selection */}
            <div className="rounded-xl border border-border p-4 space-y-3 bg-secondary/20">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gold">
                <Calendar className="size-4" /> 1. Stay Period & Room Assignment
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Check-In Date *</Label>
                  <Input
                    type="date"
                    value={b.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Check-Out Date *</Label>
                  <Input
                    type="date"
                    value={b.endDate}
                    onChange={(e) => handleEndDateChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nights Duration</Label>
                  <Input
                    type="number"
                    min={1}
                    value={b.nights}
                    onChange={(e) => handleNightsChange(parseInt(e.target.value) || 1)}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Select Room Key *</Label>
                  <Select
                    value={b.roomId}
                    onValueChange={(v) => {
                      const room = rooms.find((r) => r.id === v);
                      if (room) {
                        setB({
                          ...b,
                          roomId: v,
                          baseAmount: room.price,
                          totalAmount: room.price * b.nights,
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((r) => {
                        const isBooked = isRoomBookedForDates(r.id, b.startDate, b.endDate);
                        return (
                          <SelectItem
                            key={r.id}
                            value={r.id}
                            disabled={isBooked}
                            className={isBooked ? "opacity-50 line-through" : ""}
                          >
                            Room {r.room_number} · {r.room_name || "Standard"} ({inr(r.price)}/night) {isBooked ? "— [Booked for these dates]" : "— [Available]"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Number of Guests</Label>
                  <Select
                    value={String(b.numberOfGuests)}
                    onValueChange={(v) => setB({ ...b, numberOfGuests: parseInt(v) || 1 })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Guest (Single Occupancy)</SelectItem>
                      <SelectItem value="2">2 Guests (Double Occupancy)</SelectItem>
                      <SelectItem value="3">3 Guests (Triple Occupancy)</SelectItem>
                      <SelectItem value="4">4+ Guests (Family / Group)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Section 2: Guest Information & Identity Verification */}
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gold">
                <User className="size-4" /> 2. Guest Information & ID Verification
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Guest Full Name *</Label>
                  <Input
                    placeholder="e.g. Rajesh Sharma"
                    value={b.guestName}
                    onChange={(e) => setB({ ...b, guestName: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Phone Number</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={b.phone}
                    onChange={(e) => setB({ ...b, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="guest@example.com"
                    value={b.email}
                    onChange={(e) => setB({ ...b, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">ID Proof Type</Label>
                  <Select
                    value={b.idType}
                    onValueChange={(v) => setB({ ...b, idType: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aadhaar Card">Aadhaar Card</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                      <SelectItem value="Driving License">Driving License</SelectItem>
                      <SelectItem value="Voter ID">Voter ID</SelectItem>
                      <SelectItem value="PAN Card">PAN Card</SelectItem>
                      <SelectItem value="Government ID">Government Employee ID</SelectItem>
                      <SelectItem value="Other">Other ID</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">ID Document Number</Label>
                  <Input
                    placeholder="e.g. 1234 5678 9012 / K9876543"
                    value={b.idNumber}
                    onChange={(e) => setB({ ...b, idNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Nationality / Country</Label>
                  <Input
                    placeholder="India"
                    value={b.country}
                    onChange={(e) => setB({ ...b, country: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-1">
                <Label className="text-xs font-medium">Residential Address / City</Label>
                <Input
                  placeholder="e.g. #42 MG Road, Bangalore, Karnataka - 560001"
                  value={b.address}
                  onChange={(e) => setB({ ...b, address: e.target.value })}
                />
              </div>
            </div>

            {/* Section 3: Billing & Payment Settlement */}
            <div className="rounded-xl border border-border p-4 space-y-3 bg-secondary/10">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gold">
                <CreditCard className="size-4" /> 3. Billing & Payment Settlement
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Room Rate (₹ / Night)</Label>
                  <Input
                    type="number"
                    value={b.baseAmount}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      setB({ ...b, baseAmount: base, totalAmount: base * b.nights });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Total Bill Amount (₹)</Label>
                  <Input
                    type="number"
                    value={b.totalAmount}
                    onChange={(e) => setB({ ...b, totalAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Advance Paid / Deposit (₹)</Label>
                  <Input
                    type="number"
                    value={b.paidAmount}
                    onChange={(e) => setB({ ...b, paidAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Payment Mode</Label>
                  <Select
                    value={b.paymentMethod}
                    onValueChange={(v) => setB({ ...b, paymentMethod: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Payment Method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash Payment</SelectItem>
                      <SelectItem value="UPI">UPI / QR (GPay, PhonePe, Paytm)</SelectItem>
                      <SelectItem value="CARD">Credit / Debit Card (POS Terminal)</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT / IMPS</SelectItem>
                      <SelectItem value="OTHER">Other / Bill to Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Special Requests & Notes</Label>
                  <Input
                    placeholder="e.g. Late check-in, extra bed, ground floor preference"
                    value={b.notes}
                    onChange={(e) => setB({ ...b, notes: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setBookingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBooking} className="bg-brass text-gold-foreground hover:opacity-90">
              Confirm & Book Room
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

