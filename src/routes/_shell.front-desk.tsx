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
import { useSettings } from "@/lib/use-settings";
import { getStayTimerStatus } from "@/lib/timer-utils";
import { toast } from "sonner";
import { LogIn, LogOut, Plus, Users, DoorOpen, CheckCircle2, Calendar, CreditCard, ShieldCheck, MapPin, User, FileText, AlertTriangle, Timer, Clock } from "lucide-react";

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
  const { rooms, reservations, guests, payments, discounts, checkIn, checkOut, addRoomReservation, settlePayment, addReservationExtraCharge, adjustRoomStay } = usePms();
  const { settings } = useSettings();

  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);

  const arrivals = reservations.filter((r) => r.status === "CONFIRMED" || r.status === "PENDING");
  const inHouse = reservations.filter((r) => r.status === "OCCUPIED");

  const [selected, setSelected] = React.useState<string | null>(null);
  const res = reservations.find((r) => r.id === selected) ?? null;
  const resGuest = res ? guests.find((g) => g.id === res.guest_id) : null;
  const resRoom = res ? rooms.find((r) => r.id === res.room_id) : null;

  const [checkinPayAmount, setCheckinPayAmount] = React.useState("");
  const [checkinPayMethod, setCheckinPayMethod] = React.useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER">("CASH");

  // Stay Adjustment & Extra Days Modal State
  const [adjustModalOpen, setAdjustModalOpen] = React.useState(false);
  const [selectedResForAdjust, setSelectedResForAdjust] = React.useState<typeof reservations[0] | null>(null);
  const [adjustMode, setAdjustMode] = React.useState<"EXTEND" | "EARLY_CHECKOUT" | "EXTRA_CHARGE">("EXTEND");
  const [adjustExtraDays, setAdjustExtraDays] = React.useState(1);
  const [adjustNewEndDate, setAdjustNewEndDate] = React.useState("");
  const [adjustActualNights, setAdjustActualNights] = React.useState(1);
  const [adjustCollectNow, setAdjustCollectNow] = React.useState(false);
  const [adjustCollectAmount, setAdjustCollectAmount] = React.useState("");
  const [adjustPaymentMethod, setAdjustPaymentMethod] = React.useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER">("CASH");
  const [adjustExtraReason, setAdjustExtraReason] = React.useState("Room Service / Laundry / Addon");
  const [adjustExtraAmount, setAdjustExtraAmount] = React.useState("");
  const [adjustSubmitting, setAdjustSubmitting] = React.useState(false);

  const getGuest = (guestId: string) => guests.find((g) => g.id === guestId);
  const getGuestName = (guestId: string) => getGuest(guestId)?.name || "Guest";
  const getGuestPhone = (guestId: string) => getGuest(guestId)?.phone;
  const getRoom = (roomId?: string) => rooms.find((r) => r.id === roomId);
  const getRoomNum = (roomId?: string) => getRoom(roomId)?.room_number || "TBD";

  const getReservationPayment = (resId: string) => payments.find((p) => p.reservation_id === resId || p.reservation_id?.toLowerCase() === resId.toLowerCase());

  const getReservationFinancials = (r: typeof reservations[0]) => {
    const p = getReservationPayment(r.id);
    const approvedDiscountList = discounts
      .filter((d) => (d.reservation_id === r.id || d.reservation_id?.toLowerCase() === r.id.toLowerCase()) && d.status === "APPROVED");
    
    const approvedDiscount = approvedDiscountList.reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);

    const hasPendingDiscount = discounts.some(
      (d) => (d.reservation_id === r.id || d.reservation_id?.toLowerCase() === r.id.toLowerCase()) && d.status === "PENDING"
    );

    const discountReasons = approvedDiscountList.map(d => d.reason).filter(Boolean);

    // Identify pre-discount base amount
    const rawResBase = Number(r.base_amount) || 0;
    const rawPayTotal = Number(p?.total_amount) || 0;

    let originalAmount = Math.max(rawResBase, rawPayTotal);
    let total = rawPayTotal || rawResBase || 0;

    if (approvedDiscount > 0) {
      if (rawPayTotal > 0 && rawPayTotal <= rawResBase - approvedDiscount + 1) {
        // Payment in DB is already discounted
        total = rawPayTotal;
        originalAmount = rawPayTotal + approvedDiscount;
      } else if (rawResBase > approvedDiscount) {
        total = Math.max(0, rawResBase - approvedDiscount);
        originalAmount = rawResBase;
      } else if (rawPayTotal > approvedDiscount) {
        total = Math.max(0, rawPayTotal - approvedDiscount);
        originalAmount = rawPayTotal;
      }
    }

    const paid = Number(p?.paid_amount) || 0;
    const balance = Math.max(0, total - paid);
    const isPaid = balance === 0 && total > 0;
    return { total, paid, balance, isPaid, payment: p, approvedDiscount, hasPendingDiscount, originalAmount, discountReasons };
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
    paidAmount: "",
    paymentMethod: "CASH",
    notes: "",
  });

  const calcRoomTotals = (ratePerNight: number, nights: number) => {
    const n = Math.max(1, nights);
    const base = ratePerNight * n;
    const gst = Number(((base * 5) / 100).toFixed(2));
    const grand = base + gst;
    return { baseAmount: base, gstAmount: gst, totalAmount: grand };
  };

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
    
    const selRoom = rooms.find(r => r.id === b.roomId);
    const pricePerNight = Number(selRoom?.price) || (b.nights > 0 ? b.baseAmount / b.nights : 0);
    const { baseAmount, totalAmount } = calcRoomTotals(pricePerNight, calcNights);

    setB({
      ...b,
      startDate: newStart,
      endDate: newEndStr,
      nights: calcNights,
      baseAmount,
      totalAmount,
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
    const selRoom = rooms.find(r => r.id === b.roomId);
    const pricePerNight = Number(selRoom?.price) || (b.nights > 0 ? b.baseAmount / b.nights : 0);
    const { baseAmount, totalAmount } = calcRoomTotals(pricePerNight, calcNights);

    setB({
      ...b,
      endDate: newEnd,
      nights: calcNights,
      baseAmount,
      totalAmount,
    });
  };

  const handleNightsChange = (nightsVal: number) => {
    const nights = Math.max(1, nightsVal);
    const sDate = new Date(b.startDate);
    sDate.setDate(sDate.getDate() + nights);
    const newEndStr = sDate.toISOString().split("T")[0];
    const selRoom = rooms.find(r => r.id === b.roomId);
    const pricePerNight = Number(selRoom?.price) || (b.nights > 0 ? b.baseAmount / b.nights : 0);
    const { baseAmount, totalAmount } = calcRoomTotals(pricePerNight, nights);

    setB({
      ...b,
      nights,
      endDate: newEndStr,
      baseAmount,
      totalAmount,
    });
  };

  const [bookingLoading, setBookingLoading] = React.useState(false);
  const [checkinLoading, setCheckinLoading] = React.useState(false);
  const [checkoutLoading, setCheckoutLoading] = React.useState<string | null>(null);

  const handleBooking = async () => {
    if (bookingLoading) return;
    if (!b.guestName.trim()) return toast.error("Please enter guest name");
    if (!b.roomId) return toast.error("Please select a room");
    if (b.paidAmount === "" || b.paidAmount === null || b.paidAmount === undefined || String(b.paidAmount).trim() === "") {
      return toast.error("Please enter the Amount Paid / Advance (enter 0 if unpaid)");
    }
    const paidNum = parseFloat(String(b.paidAmount));
    if (isNaN(paidNum) || paidNum < 0) {
      return toast.error("Please enter a valid Amount Paid / Advance (enter 0 if unpaid)");
    }
    if (isRoomBookedForDates(b.roomId, b.startDate, b.endDate)) {
      return toast.error("This room is already reserved for the selected dates. Please select another room.");
    }

    setBookingLoading(true);
    try {
      const res = await addRoomReservation({
        ...b,
        paidAmount: paidNum,
      });
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
          paidAmount: "",
          paymentMethod: "CASH",
          notes: "",
        });
      } else {
        toast.error(res?.error || "Failed to book room");
      }
    } finally {
      setBookingLoading(false);
    }
  };

  const [assignedRoomId, setAssignedRoomId] = React.useState<string>("");

  React.useEffect(() => {
    if (res) {
      setAssignedRoomId(res.room_id || "");
      const { balance } = getReservationFinancials(res);
      setCheckinPayAmount(balance > 0 ? String(balance) : "");
    } else {
      setAssignedRoomId("");
      setCheckinPayAmount("");
    }
  }, [res, discounts, payments, reservations]);

  const handleCompleteCheckIn = async () => {
    if (!res || checkinLoading) return;
    const isPartyHall = res.resource_type === "PARTY_HALL";
    const targetRoomId = assignedRoomId || res.room_id;

    if (!isPartyHall && !targetRoomId) {
      return toast.error("Please assign an available room before completing check-in.");
    }

    setCheckinLoading(true);
    try {
      const { balance } = getReservationFinancials(res);

      // If there is an unpaid balance and staff entered an amount, settle it
      const payAmt = parseFloat(checkinPayAmount);
      if (balance > 0 && !isNaN(payAmt) && payAmt > 0) {
        await settlePayment(res.id, payAmt, checkinPayMethod);
      }

      await checkIn(res.id, targetRoomId);
      const assignedRoom = rooms.find((r) => r.id === targetRoomId);
      toast.success(
        isPartyHall
          ? `${resGuest?.name || "Guest"} checked in for Party Hall event`
          : `${resGuest?.name || "Guest"} checked in to Room ${assignedRoom?.room_number || resRoom?.room_number || "assigned"}`
      );
      setSelected(null);
      setCheckinPayAmount("");
      setAssignedRoomId("");
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleCheckoutSubmit = async (r: typeof reservations[0], timer: any, balance: number, isPartyHall: boolean, gName: string, rmNum: string) => {
    if (checkoutLoading === r.id) return;
    if (timer.isOverdue && timer.calculatedExtraFee > 0) {
      const fee = timer.calculatedExtraFee;
      const hrs = timer.overdueHours;
      if (confirm(`Guest is ${hrs} hour(s) overdue. Apply late checkout fee of ${inr(fee)} to the folio?`)) {
        await addReservationExtraCharge(r.id, fee, `Late Check-out Fee (${hrs} hrs)`);
        toast.info(`Late fee of ${inr(fee)} added to guest folio.`);
      }
    }

    if (balance > 0) {
      if (!confirm(`This guest has an outstanding balance of ${inr(balance)}. Proceed to check out and mark room for housekeeping?`)) return;
    }

    setCheckoutLoading(r.id);
    try {
      await checkOut(r.id);
      toast.success(`${gName} checked out · ${isPartyHall ? "Party Hall cleared" : `Room ${rmNum} moved to Housekeeping`}`);
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleOpenExtendStay = (r: typeof reservations[0]) => {
    setSelectedResForAdjust(r);
    setAdjustMode("EXTEND");
    setAdjustExtraDays(1);
    const currEnd = r.end_time ? new Date(r.end_time) : new Date();
    const newEnd = new Date(currEnd);
    newEnd.setDate(newEnd.getDate() + 1);
    setAdjustNewEndDate(newEnd.toISOString().split("T")[0]);
    
    const room = rooms.find(rm => rm.id === r.room_id);
    const ratePerNight = Number(room?.price) || 1600;
    const extraTotal = ratePerNight + Number(((ratePerNight * 5) / 100).toFixed(2));
    setAdjustCollectAmount(String(extraTotal));
    setAdjustCollectNow(false);
    setAdjustPaymentMethod("CASH");
    setAdjustModalOpen(true);
  };

  const handleOpenEarlyCheckout = (r: typeof reservations[0]) => {
    setSelectedResForAdjust(r);
    setAdjustMode("EARLY_CHECKOUT");
    const sDate = r.start_time ? new Date(r.start_time) : new Date();
    const today = new Date();
    const diffNights = Math.max(1, Math.ceil((today.getTime() - sDate.getTime()) / (1000 * 60 * 60 * 24)));
    setAdjustActualNights(diffNights);
    setAdjustNewEndDate(today.toISOString().split("T")[0]);
    setAdjustModalOpen(true);
  };

  const handleOpenExtraChargeModal = (r: typeof reservations[0]) => {
    setSelectedResForAdjust(r);
    setAdjustMode("EXTRA_CHARGE");
    setAdjustExtraReason("Room Service / Laundry / Addon");
    setAdjustExtraAmount("500");
    setAdjustCollectNow(false);
    setAdjustCollectAmount("500");
    setAdjustPaymentMethod("CASH");
    setAdjustModalOpen(true);
  };

  const handleSaveStayAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResForAdjust) return;

    setAdjustSubmitting(true);
    try {
      const r = selectedResForAdjust;
      const room = rooms.find(rm => rm.id === r.room_id);
      const ratePerNight = Number(room?.price) || 1600;
      const currentResBase = Number(r.base_amount) || 0;
      const p = getReservationPayment(r.id);
      const currentPayTotal = Number(p?.total_amount) || (currentResBase * 1.05);

      if (adjustMode === "EXTEND") {
        const extraDays = Math.max(1, adjustExtraDays);
        const extraBase = ratePerNight * extraDays;
        const extraGst = Number(((extraBase * 5) / 100).toFixed(2));
        const extraTotal = extraBase + extraGst;

        const newBase = currentResBase + extraBase;
        const newTotal = currentPayTotal + extraTotal;
        const collected = adjustCollectNow ? (parseFloat(adjustCollectAmount) || 0) : 0;

        const res = await adjustRoomStay(r.id, {
          newEndDate: adjustNewEndDate,
          newNights: extraDays,
          newBaseAmount: newBase,
          newTotalAmount: newTotal,
          collectedAmount: collected,
          paymentMethod: adjustPaymentMethod,
          isEarlyCheckout: false,
          reason: `Stay Extended (+${extraDays} days)`
        });

        if (res.success) {
          toast.success(`Stay extended by ${extraDays} day(s). Check-out updated to ${adjustNewEndDate}.`);
          setAdjustModalOpen(false);
          setSelectedResForAdjust(null);
        } else {
          toast.error(res.error || "Failed to extend stay");
        }
      } else if (adjustMode === "EARLY_CHECKOUT") {
        const actualNights = Math.max(1, adjustActualNights);
        const newBase = ratePerNight * actualNights;
        const newGst = Number(((newBase * 5) / 100).toFixed(2));
        const newTotal = newBase + newGst;

        const res = await adjustRoomStay(r.id, {
          newEndDate: adjustNewEndDate,
          newNights: actualNights,
          newBaseAmount: newBase,
          newTotalAmount: newTotal,
          isEarlyCheckout: true,
          reason: `Early Check-out (${actualNights} nights stayed)`
        });

        if (res.success) {
          toast.success(`Early check-out processed. Folio reduced to ${inr(newTotal)} and room marked for housekeeping.`);
          setAdjustModalOpen(false);
          setSelectedResForAdjust(null);
        } else {
          toast.error(res.error || "Failed to process early checkout");
        }
      } else if (adjustMode === "EXTRA_CHARGE") {
        const extraAmt = parseFloat(adjustExtraAmount) || 0;
        if (extraAmt <= 0) {
          toast.error("Please enter a valid extra amount");
          setAdjustSubmitting(false);
          return;
        }

        const collected = adjustCollectNow ? (parseFloat(adjustCollectAmount) || 0) : 0;
        const res = await addReservationExtraCharge(r.id, extraAmt, adjustExtraReason, {
          collectedAmount: collected,
          paymentMethod: adjustPaymentMethod
        });

        if (res.success) {
          toast.success(`Added extra charge of ${inr(extraAmt)} for ${adjustExtraReason}.`);
          setAdjustModalOpen(false);
          setSelectedResForAdjust(null);
        } else {
          toast.error(res.error || "Failed to add extra charge");
        }
      }
    } finally {
      setAdjustSubmitting(false);
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
              const isPartyHall = r.resource_type === 'PARTY_HALL';
              const { total, paid, balance, isPaid, approvedDiscount, originalAmount, discountReasons } = getReservationFinancials(r);
              const timer = getStayTimerStatus(r, settings);

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
                      <div className="text-right space-y-1">
                        <Pill tone={timer.tone}>{timer.label}</Pill>
                        {isPaid ? (
                          <div className="text-[10px] text-success font-semibold">Paid in Full</div>
                        ) : paid > 0 ? (
                          <div className="text-[10px] text-info font-semibold">Partial Paid</div>
                        ) : (
                          <div className="text-[10px] text-warning font-semibold">Pending Due</div>
                        )}
                      </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <dt className="text-muted-foreground">Resource / Key</dt>
                        <dd className="font-semibold text-foreground">
                          {isPartyHall ? (
                            <span className="text-gold">Party Hall ({r.event_type || 'Event'})</span>
                          ) : (
                            <>Room {rmNum} <span className="text-[10px] text-muted-foreground">({rm?.room_name || "Standard"})</span></>
                          )}
                        </dd>
                      </div>
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <dt className="text-muted-foreground">Stay Dates</dt>
                        <dd className="font-semibold text-foreground">{checkInDate} → {checkOutDate}</dd>
                      </div>
                      <div className="rounded-lg bg-secondary/60 p-2">
                        <dt className="text-muted-foreground">Total Bill</dt>
                        <dd className="font-semibold text-foreground">
                          {inr(total)}
                          {approvedDiscount > 0 && (
                            <span className="ml-1 text-[10px] text-success font-semibold">(-{inr(approvedDiscount)})</span>
                          )}
                        </dd>
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
                      setAssignedRoomId(r.room_id || "");
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
                  <TableHead>Room / Resource</TableHead>
                  <TableHead>Stay Window</TableHead>
                  <TableHead>Stay Timer & Overtime</TableHead>
                  <TableHead>Total Bill</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Pending Due</TableHead>
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
                  const isPartyHall = r.resource_type === 'PARTY_HALL';
                  const { total, paid, balance } = getReservationFinancials(r);
                  const timer = getStayTimerStatus(r, settings);

                  const checkInDate = r.start_time ? new Date(r.start_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : r.booking_date;
                  const checkOutDate = r.end_time ? new Date(r.end_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "—";

                  return (
                    <TableRow key={r.id} className={timer.isOverdue ? "bg-destructive/5 hover:bg-destructive/10" : undefined}>
                      <TableCell>
                        <div className="font-semibold">{gName}</div>
                        <div className="text-xs text-muted-foreground">{gPhone || "—"} {gId ? `· ${gId}` : ""}</div>
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {isPartyHall ? (
                          <span className="text-xs font-semibold text-gold">Party Hall ({r.event_type || 'Event'})</span>
                        ) : (
                          `Room ${rmNum}`
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{checkInDate} → {checkOutDate}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Pill tone={timer.tone}>{timer.label}</Pill>
                          {timer.subLabel && (
                            <div className={timer.isOverdue ? "text-[11px] font-bold text-destructive" : "text-[11px] text-muted-foreground"}>
                              {timer.subLabel}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{inr(total)}</TableCell>
                      <TableCell className="text-success font-medium">{inr(paid)}</TableCell>
                      <TableCell className={balance > 0 ? "font-bold text-warning" : "text-success font-medium"}>
                        {balance > 0 ? inr(balance) : "₹0 (Settled)"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 flex-wrap">
                          {timer.isOverdue && timer.calculatedExtraFee > 0 && (
                            <Button
                              size="sm"
                              className="rounded-lg text-xs bg-destructive text-white hover:bg-destructive/90 animate-pulse h-8"
                              onClick={async () => {
                                const fee = timer.calculatedExtraFee;
                                const hrs = timer.overdueHours;
                                const resAdd = await addReservationExtraCharge(r.id, fee, `Late Check-out Fee (${hrs} hrs)`);
                                if (resAdd.success) {
                                  toast.success(`Applied ${inr(fee)} late checkout fee. Folio updated.`);
                                } else {
                                  toast.error(resAdd.error || "Failed to apply late fee");
                                }
                              }}
                            >
                              <Timer className="size-3 mr-1" /> Add Late Fee ({inr(timer.calculatedExtraFee)})
                            </Button>
                          )}

                          {!isPartyHall && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg h-8 text-xs font-medium border-gold/40 text-gold hover:bg-gold/10"
                                onClick={() => handleOpenExtendStay(r)}
                                title="Add extra days to stay and compute extra tariff"
                              >
                                <Plus className="size-3 mr-1" /> Extend (+Days)
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg h-8 text-xs font-medium text-amber-600 hover:bg-amber-500/10 border-amber-500/30"
                                onClick={() => handleOpenEarlyCheckout(r)}
                                title="Guest checking out early: reduce tariff and bill"
                              >
                                <LogOut className="size-3 mr-1" /> Early Check-Out
                              </Button>
                            </>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg h-8 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenExtraChargeModal(r)}
                          >
                            + Charges
                          </Button>

                          <Button
                            size="sm"
                            variant="default"
                            disabled={checkoutLoading === r.id}
                            className="rounded-lg h-8 text-xs font-semibold bg-brass text-gold-foreground hover:opacity-90 shadow-sm"
                            onClick={() => handleCheckoutSubmit(r, timer, balance, isPartyHall, gName, rmNum)}
                          >
                            {checkoutLoading === r.id ? "Checking Out..." : "Check Out"}
                          </Button>
                        </div>
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
            <DialogDescription>
              {res?.resource_type === 'PARTY_HALL'
                ? `Party Hall (${res.event_type || 'Event'})`
                : `Room ${resRoom?.room_number || (rooms.find(r => r.id === assignedRoomId)?.room_number) || 'Assignment Required'}`
              } · Arrival Confirmation #{res?.id.slice(0, 8).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {res && (() => {
            const { total, paid, balance, approvedDiscount, originalAmount, discountReasons } = getReservationFinancials(res);
            const isPartyHall = res.resource_type === 'PARTY_HALL';

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
                    <div className="text-xs font-semibold uppercase text-gold">Resource / Key Assignment</div>
                    {isPartyHall ? (
                      <div className="mt-1 text-sm font-semibold text-gold">Party Hall ({res.event_type || 'Event'})</div>
                    ) : (
                      <div className="mt-1 space-y-1">
                        <Label className="text-xs font-medium">Select Room Key *</Label>
                        <Select value={assignedRoomId} onValueChange={setAssignedRoomId}>
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Choose a room..." />
                          </SelectTrigger>
                          <SelectContent>
                            {rooms.map((r) => {
                              const isOccupied = r.status === "OCCUPIED" && r.id !== res.room_id;
                              return (
                                <SelectItem
                                  key={r.id}
                                  value={r.id}
                                  disabled={isOccupied}
                                  className={isOccupied ? "opacity-50 line-through" : ""}
                                >
                                  Room {r.room_number} · {r.room_name || "Standard"} ({inr(r.price)}/night) {isOccupied ? "— [Occupied]" : `— [${r.status}]`}
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Breakdown */}
                <div className="rounded-xl border border-border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      {approvedDiscount > 0 ? (
                        <div className="space-y-0.5">
                          <div className="text-xs text-muted-foreground line-through">
                            Original Bill: {inr(originalAmount)}
                          </div>
                          <div className="text-xs font-semibold text-success flex items-center gap-1">
                            <span className="size-1.5 rounded-full bg-success inline-block" />
                            -{inr(approvedDiscount)} discount applied {discountReasons.length ? `(${discountReasons[0]})` : ""}
                          </div>
                          <div className="text-sm font-bold text-foreground">
                            Net Bill: {inr(total)}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm font-bold text-foreground">Total Bill: {inr(total)}</div>
                      )}
                      <div className="text-xs text-success font-medium mt-1">Already Paid: {inr(paid)}</div>
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
                  <Button variant="ghost" onClick={() => setSelected(null)} disabled={checkinLoading}>Cancel</Button>
                  <Button disabled={checkinLoading} className="bg-brass text-gold-foreground hover:opacity-90" onClick={handleCompleteCheckIn}>
                    {checkinLoading ? "Completing Check-In..." : "Complete Check-In"}
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
                        const { baseAmount, totalAmount } = calcRoomTotals(Number(room.price) || 0, b.nights);
                        setB({
                          ...b,
                          roomId: v,
                          baseAmount,
                          totalAmount,
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
                    onChange={(e) => {
                      const ph = e.target.value;
                      const matched = ph.trim() ? guests.find((g) => g.phone && g.phone.trim().toLowerCase() === ph.trim().toLowerCase()) : null;
                      if (matched) {
                        setB((prev) => ({
                          ...prev,
                          phone: ph,
                          guestName: prev.guestName || matched.name,
                          email: prev.email || matched.email || "",
                          idType: matched.id_type || prev.idType,
                          idNumber: prev.idNumber || matched.id_number || "",
                          address: prev.address || matched.address || "",
                          country: (matched as any).country || prev.country,
                        }));
                      } else {
                        setB((prev) => ({ ...prev, phone: ph }));
                      }
                    }}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-gold">
                  <CreditCard className="size-4" /> 3. Billing & Payment Settlement
                </div>
                <div className="text-xs font-semibold text-muted-foreground">
                  GST 5% (2.5% CGST + 2.5% SGST) Included
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Base Tariff (₹)</Label>
                  <Input
                    type="number"
                    value={b.baseAmount}
                    onChange={(e) => {
                      const base = parseFloat(e.target.value) || 0;
                      const gst = Number(((base * 5) / 100).toFixed(2));
                      const grand = base + gst;
                      setB({ ...b, baseAmount: base, totalAmount: grand });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">GST 5% (₹)</Label>
                  <div className="h-9 px-3 py-2 rounded-md border border-input bg-muted/50 text-xs font-mono font-medium flex items-center">
                    +{inr(Number(((b.baseAmount * 5) / 100).toFixed(2)))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Grand Total Bill (₹)</Label>
                  <Input
                    type="number"
                    className="font-bold text-gold"
                    value={b.totalAmount}
                    onChange={(e) => {
                      const grand = parseFloat(e.target.value) || 0;
                      const base = Math.round(grand / 1.05);
                      setB({ ...b, totalAmount: grand, baseAmount: base });
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground">Amount Paid / Advance (₹) *</Label>
                  </div>
                  <Input
                    type="number"
                    placeholder="Enter amount (or 0)..."
                    required
                    className="font-bold text-emerald-600"
                    value={b.paidAmount}
                    onChange={(e) => setB({ ...b, paidAmount: e.target.value })}
                  />
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      className="text-[11px] font-semibold text-gold hover:underline"
                      onClick={() => setB({ ...b, paidAmount: String(b.totalAmount) })}
                    >
                      + Full ({inr(b.totalAmount)})
                    </button>
                    <span className="text-muted-foreground text-[10px]">·</span>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-muted-foreground hover:underline"
                      onClick={() => setB({ ...b, paidAmount: "0" })}
                    >
                      ₹0 (Unpaid)
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 px-1 text-muted-foreground border-t border-border/50">
                <div>
                  Payment Status:{" "}
                  {b.paidAmount === "" ? (
                    <span className="text-muted-foreground italic">Type advance or 0 above to confirm</span>
                  ) : Number(b.paidAmount) >= b.totalAmount && b.totalAmount > 0 ? (
                    <span className="font-bold text-emerald-600">PAID IN FULL (₹0 Balance)</span>
                  ) : Number(b.paidAmount) > 0 ? (
                    <span className="font-bold text-amber-600">ADVANCE PAID (Balance Due: {inr(Math.max(0, b.totalAmount - Number(b.paidAmount)))})</span>
                  ) : (
                    <span className="font-bold text-destructive">UNPAID (Balance Due: {inr(b.totalAmount)})</span>
                  )}
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
            <Button variant="ghost" onClick={() => setBookingOpen(false)} disabled={bookingLoading}>
              Cancel
            </Button>
            <Button disabled={bookingLoading} onClick={handleBooking} className="bg-brass text-gold-foreground hover:opacity-90 font-medium">
              {bookingLoading ? "Booking Room..." : "Confirm & Book Room"}
            </Button>
          </div>
      {/* Stay Modification & Folio Adjustment Modal */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {adjustMode === "EXTEND" && "Extend Stay & Add Extra Days"}
              {adjustMode === "EARLY_CHECKOUT" && "Early Check-Out & Bill Reduction"}
              {adjustMode === "EXTRA_CHARGE" && "Add Extra Room Charges / Services"}
            </DialogTitle>
            <DialogDescription>
              {selectedResForAdjust && (() => {
                const g = getGuest(selectedResForAdjust.guest_id);
                const rm = getRoom(selectedResForAdjust.room_id);
                return `${g?.name || "Guest"} · Room ${rm?.room_number || "—"} (${rm?.room_name || "Standard"})`;
              })()}
            </DialogDescription>
          </DialogHeader>

          {selectedResForAdjust && (() => {
            const r = selectedResForAdjust;
            const rm = getRoom(r.room_id);
            const ratePerNight = Number(rm?.price) || 1600;
            const fin = getReservationFinancials(r);
            const checkInDate = r.start_time ? new Date(r.start_time) : new Date();
            const currEndDate = r.end_time ? new Date(r.end_time) : new Date();
            const currNights = Math.max(1, Math.ceil((currEndDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));

            // Extend calculation
            const extraDays = Math.max(1, adjustExtraDays);
            const extraBase = ratePerNight * extraDays;
            const extraGst = Number(((extraBase * 5) / 100).toFixed(2));
            const extraTotal = extraBase + extraGst;
            const newExtendedTotal = fin.total + extraTotal;

            // Early checkout calculation
            const actualNights = Math.max(1, adjustActualNights);
            const earlyBase = ratePerNight * actualNights;
            const earlyGst = Number(((earlyBase * 5) / 100).toFixed(2));
            const earlyGrandTotal = earlyBase + earlyGst;
            const refundOrCredit = Math.max(0, fin.paid - earlyGrandTotal);
            const newRemainingDue = Math.max(0, earlyGrandTotal - fin.paid);

            return (
              <form onSubmit={handleSaveStayAdjustment} className="space-y-4 pt-2">
                {/* Mode Selector Tabs */}
                <div className="grid grid-cols-3 gap-2 bg-secondary/80 p-1 rounded-xl">
                  <Button
                    type="button"
                    variant={adjustMode === "EXTEND" ? "default" : "ghost"}
                    className={adjustMode === "EXTEND" ? "h-8 text-xs font-semibold bg-brass text-gold-foreground" : "h-8 text-xs"}
                    onClick={() => {
                      setAdjustMode("EXTEND");
                      const newEnd = new Date(currEndDate);
                      newEnd.setDate(newEnd.getDate() + 1);
                      setAdjustNewEndDate(newEnd.toISOString().split("T")[0]);
                    }}
                  >
                    <Plus className="mr-1 size-3" /> Extend Stay (+Days)
                  </Button>
                  <Button
                    type="button"
                    variant={adjustMode === "EARLY_CHECKOUT" ? "default" : "ghost"}
                    className={adjustMode === "EARLY_CHECKOUT" ? "h-8 text-xs font-semibold bg-brass text-gold-foreground" : "h-8 text-xs text-amber-600"}
                    onClick={() => {
                      setAdjustMode("EARLY_CHECKOUT");
                      const today = new Date();
                      const dNights = Math.max(1, Math.ceil((today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
                      setAdjustActualNights(dNights);
                      setAdjustNewEndDate(today.toISOString().split("T")[0]);
                    }}
                  >
                    <LogOut className="mr-1 size-3" /> Early Check-Out
                  </Button>
                  <Button
                    type="button"
                    variant={adjustMode === "EXTRA_CHARGE" ? "default" : "ghost"}
                    className={adjustMode === "EXTRA_CHARGE" ? "h-8 text-xs font-semibold bg-brass text-gold-foreground" : "h-8 text-xs"}
                    onClick={() => setAdjustMode("EXTRA_CHARGE")}
                  >
                    + Extra Charges
                  </Button>
                </div>

                {/* Mode 1: EXTEND STAY */}
                {adjustMode === "EXTEND" && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl border border-border bg-secondary/30 text-xs grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-muted-foreground block">Current Stay:</span>
                        <span className="font-semibold">{currNights} Nights</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Current Total Bill:</span>
                        <span className="font-bold">{inr(fin.total)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Amount Paid So Far:</span>
                        <span className="font-bold text-emerald-600">{inr(fin.paid)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Extra Nights to Add *</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="30"
                            required
                            value={adjustExtraDays}
                            onChange={(e) => {
                              const days = Math.max(1, parseInt(e.target.value) || 1);
                              setAdjustExtraDays(days);
                              const newEnd = new Date(currEndDate);
                              newEnd.setDate(newEnd.getDate() + days);
                              setAdjustNewEndDate(newEnd.toISOString().split("T")[0]);
                              const extB = ratePerNight * days;
                              const extG = Number(((extB * 5) / 100).toFixed(2));
                              setAdjustCollectAmount(String(extB + extG));
                            }}
                          />
                          <div className="flex gap-1">
                            {[1, 2, 3].map((d) => (
                              <Button
                                key={d}
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-9 px-2 text-xs"
                                onClick={() => {
                                  setAdjustExtraDays(d);
                                  const newEnd = new Date(currEndDate);
                                  newEnd.setDate(newEnd.getDate() + d);
                                  setAdjustNewEndDate(newEnd.toISOString().split("T")[0]);
                                  const extB = ratePerNight * d;
                                  const extG = Number(((extB * 5) / 100).toFixed(2));
                                  setAdjustCollectAmount(String(extB + extG));
                                }}
                              >
                                +{d}d
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">New Check-Out Date *</Label>
                        <Input
                          type="date"
                          required
                          value={adjustNewEndDate}
                          onChange={(e) => {
                            setAdjustNewEndDate(e.target.value);
                            const nEnd = new Date(e.target.value);
                            const nDays = Math.max(1, Math.round((nEnd.getTime() - currEndDate.getTime()) / (1000 * 60 * 60 * 24)));
                            setAdjustExtraDays(nDays);
                            const extB = ratePerNight * nDays;
                            const extG = Number(((extB * 5) / 100).toFixed(2));
                            setAdjustCollectAmount(String(extB + extG));
                          }}
                        />
                      </div>
                    </div>

                    {/* Cost Calculation Box */}
                    <div className="rounded-xl border border-gold/30 bg-gold/5 p-4 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Additional Room Tariff ({extraDays} night(s) @ {inr(ratePerNight)}):</span>
                        <span className="font-semibold">{inr(extraBase)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Additional GST 5% (2.5% CGST + 2.5% SGST):</span>
                        <span className="font-semibold">+{inr(extraGst)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm border-t border-gold/20 pt-1.5 text-gold">
                        <span>Extra Amount Added to Bill:</span>
                        <span>+{inr(extraTotal)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-foreground border-t border-border pt-1">
                        <span>New Total Bill Payable:</span>
                        <span>{inr(newExtendedTotal)}</span>
                      </div>
                    </div>

                    {/* Immediate Collection Option */}
                    <div className="rounded-xl border border-border p-3.5 space-y-3 bg-secondary/20">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <Checkbox
                          checked={adjustCollectNow}
                          onCheckedChange={(c) => setAdjustCollectNow(!!c)}
                        />
                        Collect extra payment ({inr(extraTotal)}) immediately from guest
                      </label>

                      {adjustCollectNow && (
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
                          <div className="space-y-1">
                            <Label className="text-xs">Amount Collected (₹)</Label>
                            <Input
                              type="number"
                              className="font-bold text-emerald-600"
                              value={adjustCollectAmount}
                              onChange={(e) => setAdjustCollectAmount(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Payment Mode</Label>
                            <Select
                              value={adjustPaymentMethod}
                              onValueChange={(v: any) => setAdjustPaymentMethod(v)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash Payment</SelectItem>
                                <SelectItem value="UPI">UPI / QR (GPay, PhonePe, Paytm)</SelectItem>
                                <SelectItem value="CARD">Credit / Debit Card (POS)</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Mode 2: EARLY CHECK-OUT */}
                {adjustMode === "EARLY_CHECKOUT" && (
                  <div className="space-y-4">
                    <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs grid grid-cols-3 gap-3">
                      <div>
                        <span className="text-muted-foreground block">Original Stay:</span>
                        <span className="font-semibold">{currNights} Nights</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Original Total Billed:</span>
                        <span className="font-bold">{inr(fin.total)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Amount Paid So Far:</span>
                        <span className="font-bold text-emerald-600">{inr(fin.paid)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Actual Nights Stayed *</Label>
                        <Input
                          type="number"
                          min="1"
                          max={currNights}
                          required
                          value={adjustActualNights}
                          onChange={(e) => {
                            const n = Math.max(1, parseInt(e.target.value) || 1);
                            setAdjustActualNights(n);
                            const nEnd = new Date(checkInDate);
                            nEnd.setDate(nEnd.getDate() + n);
                            setAdjustNewEndDate(nEnd.toISOString().split("T")[0]);
                          }}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Actual Early Departure Date *</Label>
                        <Input
                          type="date"
                          required
                          value={adjustNewEndDate}
                          onChange={(e) => {
                            setAdjustNewEndDate(e.target.value);
                            const nEnd = new Date(e.target.value);
                            const n = Math.max(1, Math.round((nEnd.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
                            setAdjustActualNights(n);
                          }}
                        />
                      </div>
                    </div>

                    {/* Adjusted Bill Computation Box */}
                    <div className="rounded-xl border border-border bg-secondary/30 p-4 text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Adjusted Room Tariff ({actualNights} night(s) @ {inr(ratePerNight)}):</span>
                        <span className="font-semibold">{inr(earlyBase)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Adjusted GST 5% (2.5% CGST + 2.5% SGST):</span>
                        <span className="font-semibold">+{inr(earlyGst)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm border-t border-border pt-1.5 text-foreground">
                        <span>New Reduced Grand Total:</span>
                        <span>{inr(earlyGrandTotal)}</span>
                      </div>

                      {refundOrCredit > 0 ? (
                        <div className="flex justify-between font-bold text-sm border-t border-emerald-500/30 pt-1.5 text-emerald-600 bg-emerald-500/10 p-2 rounded-lg mt-2">
                          <span>Refund / Credit Due to Guest:</span>
                          <span>{inr(refundOrCredit)}</span>
                        </div>
                      ) : newRemainingDue > 0 ? (
                        <div className="flex justify-between font-bold text-sm border-t border-amber-500/30 pt-1.5 text-amber-600 bg-amber-500/10 p-2 rounded-lg mt-2">
                          <span>Remaining Balance Due:</span>
                          <span>{inr(newRemainingDue)}</span>
                        </div>
                      ) : (
                        <div className="text-emerald-600 font-semibold pt-1">
                          ✓ Exact amount cleared. No refund or balance due.
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground bg-secondary/40 p-3 rounded-lg border border-border">
                      ℹ️ Confirming early check-out will update the room folio, release Room {rm?.room_number}, and mark it as <span className="font-semibold text-warning">DIRTY</span> for housekeeping.
                    </div>
                  </div>
                )}

                {/* Mode 3: EXTRA CHARGE */}
                {adjustMode === "EXTRA_CHARGE" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Charge Reason / Service</Label>
                        <Select
                          value={adjustExtraReason}
                          onValueChange={setAdjustExtraReason}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Room Service / Food & Beverage">Room Service / Food & Beverage</SelectItem>
                            <SelectItem value="Laundry & Dry Cleaning">Laundry & Dry Cleaning</SelectItem>
                            <SelectItem value="Minibar Consumption">Minibar Consumption</SelectItem>
                            <SelectItem value="Late Check-out Extra Hours">Late Check-out Extra Hours</SelectItem>
                            <SelectItem value="Damage & Special Cleaning Fee">Damage & Special Cleaning Fee</SelectItem>
                            <SelectItem value="Extra Bed / Rollaway Mattress">Extra Bed / Rollaway Mattress</SelectItem>
                            <SelectItem value="Other Miscellaneous Addon">Other Miscellaneous Addon</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Extra Amount (₹) *</Label>
                        <Input
                          type="number"
                          required
                          value={adjustExtraAmount}
                          onChange={(e) => {
                            setAdjustExtraAmount(e.target.value);
                            setAdjustCollectAmount(e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    {/* Immediate Collection Option */}
                    <div className="rounded-xl border border-border p-3.5 space-y-3 bg-secondary/20">
                      <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
                        <Checkbox
                          checked={adjustCollectNow}
                          onCheckedChange={(c) => setAdjustCollectNow(!!c)}
                        />
                        Collect extra charge immediately from guest
                      </label>

                      {adjustCollectNow && (
                        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/60">
                          <div className="space-y-1">
                            <Label className="text-xs">Amount Collected (₹)</Label>
                            <Input
                              type="number"
                              className="font-bold text-emerald-600"
                              value={adjustCollectAmount}
                              onChange={(e) => setAdjustCollectAmount(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Payment Mode</Label>
                            <Select
                              value={adjustPaymentMethod}
                              onValueChange={(v: any) => setAdjustPaymentMethod(v)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="CASH">Cash Payment</SelectItem>
                                <SelectItem value="UPI">UPI / QR (GPay, PhonePe, Paytm)</SelectItem>
                                <SelectItem value="CARD">Credit / Debit Card (POS)</SelectItem>
                                <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t border-border">
                  <Button variant="ghost" type="button" onClick={() => setAdjustModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={adjustSubmitting}
                    className="bg-brass text-gold-foreground hover:opacity-90 font-semibold shadow-brass"
                  >
                    {adjustSubmitting ? "Processing..." : adjustMode === "EARLY_CHECKOUT" ? "Confirm Early Check-Out" : adjustMode === "EXTEND" ? "Confirm Stay Extension" : "Apply Extra Charge"}
                  </Button>
                </div>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </>
  );
}

