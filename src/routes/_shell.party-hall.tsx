import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { usePms } from "@/lib/pms-store";
import { useSettings } from "@/lib/use-settings";
import { PageHeader, Panel, Pill } from "@/components/pms/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { inr } from "@/lib/pms-data";
import {
  calculateDurationHours,
  calculateHallPrice,
  getPartyHallTimerStatus,
} from "@/lib/timer-utils";
import {
  Calendar,
  Clock,
  Users,
  PlusCircle,
  AlertCircle,
  MoreHorizontal,
  Plus,
  CreditCard,
  Edit,
  CheckCircle2,
  Receipt,
  Sparkles,
  Timer,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_shell/party-hall")({
  component: PartyHallPage,
});

export function PartyHallPage() {
  const {
    reservations,
    guests,
    payments,
    discounts,
    addPartyHallBooking,
    updatePartyHallBooking,
    addReservationExtraCharge,
    settlePayment,
    checkOut,
    requestDiscount,
  } = usePms();

  const { settings } = useSettings();
  const hourlyRate = settings.partyHallHourlyRate || 3000;

  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  // Live timer state tick
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  // New Booking Form State
  const [form, setForm] = React.useState({
    customerName: "",
    phone: "",
    email: "",
    eventType: "Birthday",
    guests: "50",
    date: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    endTime: "14:00",
    baseAmount: "12000",
    advance: "2000",
    paymentMethod: "CASH" as "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER",
  });

  // Update times without overwriting user's custom package price
  const updateTimes = (start: string, end: string) => {
    setForm((prev) => ({
      ...prev,
      startTime: start,
      endTime: end,
    }));
  };

  const handleApplyHourlyEstimate = () => {
    const calculated = calculateHallPrice(form.startTime, form.endTime, hourlyRate);
    setForm((prev) => ({
      ...prev,
      baseAmount: String(calculated),
    }));
    toast.info(`Package price set to estimated ${inr(calculated)}`);
  };

  // Extra Charges / Overtime Modal State
  const [extraChargeModalOpen, setExtraChargeModalOpen] = React.useState(false);
  const [selectedResForCharge, setSelectedResForCharge] = React.useState<any>(null);
  const [extraChargeForm, setExtraChargeForm] = React.useState({
    reason: "Extra Hours / Overtime",
    amount: "3000",
    extendEndTime: false,
    newEndTime: "16:00",
    collectNow: true,
    collectAmount: "3000",
    paymentMethod: "CASH" as "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER",
  });

  // Collect Balance Modal State
  const [collectModalOpen, setCollectModalOpen] = React.useState(false);
  const [selectedResForCollect, setSelectedResForCollect] = React.useState<any>(null);
  const [collectForm, setCollectForm] = React.useState({
    amount: "",
    paymentMethod: "CASH" as "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER",
  });

  // Edit Booking Modal State
  const [editModalOpen, setEditModalOpen] = React.useState(false);
  const [selectedResForEdit, setSelectedResForEdit] = React.useState<any>(null);
  const [editForm, setEditForm] = React.useState({
    customerName: "",
    phone: "",
    email: "",
    eventType: "Birthday",
    guests: "50",
    date: "",
    startTime: "10:00",
    endTime: "14:00",
    baseAmount: "15000",
    status: "CONFIRMED",
  });

  // Request Discount Modal State
  const [discountModalOpen, setDiscountModalOpen] = React.useState(false);
  const [selectedResForDiscount, setSelectedResForDiscount] = React.useState<any>(null);
  const [discountAmount, setDiscountAmount] = React.useState("");
  const [discountReason, setDiscountReason] = React.useState("");

  const hallBookings = reservations
    .filter((r: any) => r.resource_type === "PARTY_HALL")
    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const getGuest = (guestId: string) => guests.find((x: any) => x.id === guestId);
  const getGuestName = (guestId: string) => getGuest(guestId)?.name || "Guest";
  const getGuestPhone = (guestId: string) => getGuest(guestId)?.phone || "";

  const getReservationPayment = (resId: string) =>
    payments.find(
      (p) => p.reservation_id === resId || p.reservation_id?.toLowerCase() === resId.toLowerCase()
    );

  const getReservationFinancials = (r: (typeof reservations)[0]) => {
    const p = getReservationPayment(r.id);
    const approvedDiscountList = discounts
      .filter(
        (d) =>
          (d.reservation_id === r.id || d.reservation_id?.toLowerCase() === r.id.toLowerCase()) &&
          d.status === "APPROVED"
      );
    const approvedDiscount = approvedDiscountList.reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);

    const hasPendingDiscount = discounts.some(
      (d) =>
        (d.reservation_id === r.id || d.reservation_id?.toLowerCase() === r.id.toLowerCase()) &&
        d.status === "PENDING"
    );

    const discountReasons = approvedDiscountList.map(d => d.reason).filter(Boolean);

    const rawResBase = Number(r.base_amount) || 0;
    const rawPayTotal = Number(p?.total_amount) || 0;

    let originalAmount = Math.max(rawResBase, rawPayTotal);
    let total = rawPayTotal || rawResBase || 0;

    if (approvedDiscount > 0) {
      if (rawPayTotal > 0 && rawPayTotal <= rawResBase - approvedDiscount + 1) {
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

  const handleNewBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const res = await addPartyHallBooking({
      customerName: form.customerName,
      phone: form.phone,
      email: form.email,
      eventType: form.eventType,
      guests: parseInt(form.guests) || 1,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      baseAmount: parseFloat(form.baseAmount) || 0,
      advance: parseFloat(form.advance) || 0,
      paymentMethod: form.paymentMethod,
    });

    setLoading(false);

    if (res.success) {
      toast.success("Party Hall booked successfully!");
      setOpen(false);
      setForm({
        customerName: "",
        phone: "",
        email: "",
        eventType: "Birthday",
        guests: "50",
        date: new Date().toISOString().split("T")[0],
        startTime: "10:00",
        endTime: "14:00",
        baseAmount: String(calculateHallPrice("10:00", "14:00", hourlyRate)),
        advance: "500",
        paymentMethod: "CASH",
      });
    } else {
      setErrorMsg(res.error || "Failed to book");
    }
  };

  const handleOpenExtraCharge = (r: any, defaultFee?: number, overtimeHrs?: number) => {
    setSelectedResForCharge(r);
    const endTimeStr = r.end_time ? new Date(r.end_time).toTimeString().slice(0, 5) : "16:00";
    const chargeAmt = defaultFee && defaultFee > 0 ? defaultFee : hourlyRate;

    setExtraChargeForm({
      reason: overtimeHrs && overtimeHrs > 0 ? `Overtime Extension (${overtimeHrs} hrs)` : "Extra Hours / Overtime",
      amount: String(chargeAmt),
      extendEndTime: true,
      newEndTime: endTimeStr,
      collectNow: true,
      collectAmount: String(chargeAmt),
      paymentMethod: "CASH",
    });
    setExtraChargeModalOpen(true);
  };

  const handleSaveExtraCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResForCharge) return;

    const amt = parseFloat(extraChargeForm.amount);
    if (isNaN(amt) || amt <= 0) {
      return toast.error("Please enter a valid extra amount");
    }

    const collectAmt = extraChargeForm.collectNow ? parseFloat(extraChargeForm.collectAmount) || 0 : 0;
    let newEndTs: string | undefined = undefined;
    if (extraChargeForm.extendEndTime && extraChargeForm.newEndTime) {
      newEndTs = new Date(`${selectedResForCharge.booking_date}T${extraChargeForm.newEndTime}`).toISOString();
    }

    setLoading(true);
    const res = await addReservationExtraCharge(selectedResForCharge.id, amt, extraChargeForm.reason, {
      newEndTime: newEndTs,
      collectedAmount: collectAmt,
      paymentMethod: extraChargeForm.paymentMethod,
    });
    setLoading(false);

    if (res.success) {
      toast.success(
        `Added ${inr(amt)} extra charges for ${extraChargeForm.reason}${
          collectAmt > 0 ? ` (${inr(collectAmt)} collected via ${extraChargeForm.paymentMethod})` : ""
        }`
      );
      setExtraChargeModalOpen(false);
      setSelectedResForCharge(null);
    } else {
      toast.error(res.error || "Failed to add extra charge");
    }
  };

  const handleOpenCollectBalance = (r: any) => {
    const fin = getReservationFinancials(r);
    setSelectedResForCollect(r);
    setCollectForm({
      amount: String(fin.balance > 0 ? fin.balance : 0),
      paymentMethod: "CASH",
    });
    setCollectModalOpen(true);
  };

  const handleSaveCollectBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResForCollect) return;

    const amt = parseFloat(collectForm.amount);
    if (isNaN(amt) || amt <= 0) {
      return toast.error("Please enter a valid collection amount");
    }

    setLoading(true);
    const res = await settlePayment(selectedResForCollect.id, amt, collectForm.paymentMethod);
    setLoading(false);

    if (res.success) {
      toast.success(`Collected ${inr(amt)} via ${collectForm.paymentMethod}`);
      setCollectModalOpen(false);
      setSelectedResForCollect(null);
    } else {
      toast.error(res.error || "Failed to collect payment");
    }
  };

  const handleOpenEdit = (r: any) => {
    const g = getGuest(r.guest_id);
    const startDate = r.booking_date || (r.start_time ? r.start_time.split("T")[0] : "");
    const sTime = r.start_time ? new Date(r.start_time).toTimeString().slice(0, 5) : "10:00";
    const eTime = r.end_time ? new Date(r.end_time).toTimeString().slice(0, 5) : "14:00";

    setSelectedResForEdit(r);
    setEditForm({
      customerName: g?.name || "",
      phone: g?.phone || "",
      email: g?.email || "",
      eventType: r.event_type || "Birthday",
      guests: String(r.number_of_guests || 50),
      date: startDate,
      startTime: sTime,
      endTime: eTime,
      baseAmount: String(r.base_amount || 0),
      status: r.status || "CONFIRMED",
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResForEdit) return;

    setLoading(true);
    const res = await updatePartyHallBooking(selectedResForEdit.id, {
      customerName: editForm.customerName,
      phone: editForm.phone,
      email: editForm.email,
      eventType: editForm.eventType,
      guests: parseInt(editForm.guests) || 1,
      date: editForm.date,
      startTime: editForm.startTime,
      endTime: editForm.endTime,
      baseAmount: parseFloat(editForm.baseAmount) || 0,
      status: editForm.status,
    });
    setLoading(false);

    if (res.success) {
      toast.success("Party Hall booking updated successfully!");
      setEditModalOpen(false);
      setSelectedResForEdit(null);
    } else {
      toast.error(res.error || "Failed to update booking");
    }
  };

  const handleOpenRequestDiscount = (r: any) => {
    setSelectedResForDiscount(r);
    const fin = getReservationFinancials(r);
    setDiscountAmount(String(Math.min(fin.total, 1000)));
    setDiscountReason("Customer satisfaction / Event adjustment");
    setDiscountModalOpen(true);
  };

  const handleSaveRequestDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResForDiscount) return;
    const amt = parseFloat(discountAmount);
    if (isNaN(amt) || amt <= 0) return toast.error("Please enter a valid discount amount");

    setLoading(true);
    const res = await requestDiscount(selectedResForDiscount.id, amt, discountReason.trim());
    setLoading(false);

    if (res?.success) {
      toast.success("Discount request submitted for Super Admin approval!");
      setDiscountModalOpen(false);
      setSelectedResForDiscount(null);
    } else {
      toast.error(res?.error || "Failed to submit discount request");
    }
  };

  const bookingDuration = calculateDurationHours(form.startTime, form.endTime);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <PageHeader
            eyebrow="Events & Banquets"
            title="Party Hall Bookings"
            subtitle={`Manage event schedules, overtime trackers, and hourly billing (@ ${inr(hourlyRate)}/hr).`}
          />
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90">
              <PlusCircle className="mr-2 h-4 w-4" /> New Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New Party Hall Booking</DialogTitle>
              <DialogDescription>
                Auto-computed @ {inr(hourlyRate)}/hr. Enter schedule and customer details.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleNewBooking} className="space-y-4 pt-2">
              {errorMsg && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" /> {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input
                    required
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number *</Label>
                  <Input
                    required
                    value={form.phone}
                    onChange={(e) => {
                      const ph = e.target.value;
                      const matched = ph.trim()
                        ? guests.find((g) => g.phone && g.phone.trim().toLowerCase() === ph.trim().toLowerCase())
                        : null;
                      if (matched) {
                        setForm((prev) => ({
                          ...prev,
                          phone: ph,
                          customerName: prev.customerName || matched.name,
                          email: prev.email || matched.email || "",
                        }));
                      } else {
                        setForm((prev) => ({ ...prev, phone: ph }));
                      }
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Event Date *</Label>
                  <Input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => updateTimes(e.target.value, form.endTime)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => updateTimes(form.startTime, e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select value={form.eventType} onValueChange={(v) => setForm({ ...form, eventType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Birthday">Birthday</SelectItem>
                      <SelectItem value="Wedding">Wedding</SelectItem>
                      <SelectItem value="Reception">Reception</SelectItem>
                      <SelectItem value="Corporate">Corporate Event</SelectItem>
                      <SelectItem value="Meeting">Conference / Meeting</SelectItem>
                      <SelectItem value="Other">Other Celebration</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Guests</Label>
                  <Input
                    type="number"
                    required
                    value={form.guests}
                    onChange={(e) => setForm({ ...form, guests: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Package Price (₹) *</Label>
                    <button
                      type="button"
                      onClick={handleApplyHourlyEstimate}
                      className="text-[10px] font-semibold text-gold hover:underline bg-gold/10 hover:bg-gold/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      title="Click to calculate from hourly rate"
                    >
                      {bookingDuration}h est: {inr(calculateHallPrice(form.startTime, form.endTime, hourlyRate))}
                    </button>
                  </div>
                  <Input
                    type="number"
                    required
                    placeholder="Enter custom package price"
                    value={form.baseAmount}
                    onChange={(e) => setForm({ ...form, baseAmount: e.target.value })}
                  />
                  <div className="text-[10px] text-muted-foreground">Custom price · Always editable</div>
                </div>
                <div className="space-y-2">
                  <Label>Advance Received (₹)</Label>
                  <Input
                    type="number"
                    required
                    value={form.advance}
                    onChange={(e) => setForm({ ...form, advance: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Select
                    value={form.paymentMethod}
                    onValueChange={(v: any) => setForm({ ...form, paymentMethod: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Payment Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="UPI">UPI / QR (GPay, PhonePe, Paytm)</SelectItem>
                      <SelectItem value="CARD">Credit / Debit Card (POS)</SelectItem>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                      <SelectItem value="OTHER">Other / Bill to Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-border">
                <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-brass text-gold-foreground hover:opacity-90"
                >
                  {loading ? "Booking..." : "Confirm Booking"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Panel className="p-0 overflow-hidden" bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event & Customer</TableHead>
              <TableHead>Date & Timing</TableHead>
              <TableHead>Live Timer / Status</TableHead>
              <TableHead>Financials & Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hallBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No party hall bookings found. Click "New Booking" to schedule an event.
                </TableCell>
              </TableRow>
            ) : (
              hallBookings.map((b: any) => {
                const gName = getGuestName(b.guest_id);
                const gPhone = getGuestPhone(b.guest_id);
                const { total, paid, balance, isPaid, payment, hasPendingDiscount } =
                  getReservationFinancials(b);
                const timer = getPartyHallTimerStatus(b, settings);

                return (
                  <TableRow key={b.id} className={timer.isOverdue ? "bg-destructive/5 hover:bg-destructive/10" : "hover:bg-accent/40"}>
                    <TableCell>
                      <div className="font-semibold flex items-center gap-1.5">
                        {b.event_type || "Event"}
                        {hasPendingDiscount && (
                          <span className="text-[10px] bg-warning/20 text-warning px-1.5 py-0.5 rounded font-medium">
                            Discount Pending
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">{gName} {gPhone ? `· ${gPhone}` : ""}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5"><Users className="inline size-3 mr-1" />{b.number_of_guests} Guests</div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center text-xs font-medium">
                        <Calendar className="mr-1.5 h-3.5 w-3.5 text-gold" /> {b.booking_date}
                      </div>
                      <div className="flex items-center text-xs text-muted-foreground mt-0.5">
                        <Clock className="mr-1.5 h-3 w-3" />
                        {b.start_time ? format(new Date(b.start_time), "p") : "—"} -{" "}
                        {b.end_time ? format(new Date(b.end_time), "p") : "—"}
                      </div>
                    </TableCell>

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

                    <TableCell>
                      <div className="text-xs font-medium">
                        Total: <span className="font-semibold">{inr(total)}</span>
                      </div>
                      <div className="text-[11px] text-success">
                        Paid: {inr(paid)} {payment?.payment_method ? `(${payment.payment_method})` : ""}
                      </div>
                      <div className={balance > 0 ? "text-[11px] font-bold text-warning" : "text-[11px] text-muted-foreground"}>
                        {balance > 0 ? `Due: ${inr(balance)}` : "Settled (₹0.00)"}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {timer.isOverdue && b.status !== "COMPLETED" && (
                          <Button
                            size="sm"
                            className="h-8 rounded-lg text-xs bg-destructive text-white hover:bg-destructive/90 animate-pulse"
                            onClick={() => handleOpenExtraCharge(b, timer.calculatedExtraFee, timer.overdueHours)}
                          >
                            <Timer className="mr-1 h-3 w-3" /> Apply Overtime ({inr(timer.calculatedExtraFee)})
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-xs bg-secondary/40 hover:bg-gold/10 hover:text-gold hover:border-gold/50"
                          onClick={() => handleOpenExtraCharge(b)}
                        >
                          <Plus className="mr-1 h-3 w-3 text-gold" /> Extra Charges
                        </Button>

                        {balance > 0 && (
                          <Button
                            size="sm"
                            className="h-8 rounded-lg text-xs bg-brass text-gold-foreground hover:opacity-90"
                            onClick={() => handleOpenCollectBalance(b)}
                          >
                            <CreditCard className="mr-1 h-3 w-3" /> Collect {inr(balance)}
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onClick={() => handleOpenEdit(b)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Booking Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenExtraCharge(b)}>
                              <Sparkles className="mr-2 h-4 w-4 text-gold" /> Add Overtime / Service
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOpenRequestDiscount(b)}>
                              <Tag className="mr-2 h-4 w-4 text-gold" /> Request Discount (Admin Approval)
                            </DropdownMenuItem>
                            {balance > 0 && (
                              <DropdownMenuItem onClick={() => handleOpenCollectBalance(b)}>
                                <Receipt className="mr-2 h-4 w-4 text-success" /> Collect Outstanding Balance
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {b.status !== "COMPLETED" && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (balance > 0) {
                                    if (
                                      !confirm(
                                        `This booking has an outstanding balance of ${inr(
                                          balance
                                        )}. Proceed to mark as Completed?`
                                      )
                                    )
                                      return;
                                  }
                                  await checkOut(b.id);
                                  toast.success(`Event completed and Party Hall cleared!`);
                                }}
                              >
                                <CheckCircle2 className="mr-2 h-4 w-4 text-success" /> Complete & Release Hall
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Panel>

      {/* Extra Charges / Overtime Modal */}
      <Dialog open={extraChargeModalOpen} onOpenChange={setExtraChargeModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Extra Charges / Overtime</DialogTitle>
            <DialogDescription>
              Add overtime, catering add-ons, or additional charges to this party hall booking.
            </DialogDescription>
          </DialogHeader>

          {selectedResForCharge && (
            <form onSubmit={handleSaveExtraCharge} className="space-y-4 pt-2">
              <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs space-y-1">
                <div className="font-semibold text-sm">
                  {selectedResForCharge.event_type} · {getGuestName(selectedResForCharge.guest_id)}
                </div>
                <div className="text-muted-foreground">
                  Current Base Rate: {inr(selectedResForCharge.base_amount || 0)} · Standard Rate: {inr(hourlyRate)}/hr
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Reason / Charge Category</Label>
                  <Select
                    value={extraChargeForm.reason}
                    onValueChange={(v) => setExtraChargeForm({ ...extraChargeForm, reason: v })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Extra Hours / Overtime">Extra Hours / Overtime</SelectItem>
                      <SelectItem value="Additional Catering / Guests">Additional Catering / Guests</SelectItem>
                      <SelectItem value="DJ & Sound System Extension">DJ & Sound System Extension</SelectItem>
                      <SelectItem value="Special Decoration Addon">Special Decoration Addon</SelectItem>
                      <SelectItem value="Cleaning & Damage Fee">Cleaning & Damage Fee</SelectItem>
                      <SelectItem value="Other Addon Service">Other Addon Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Extra Amount (₹) *</Label>
                  <Input
                    type="number"
                    required
                    className="h-9"
                    value={extraChargeForm.amount}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExtraChargeForm({
                        ...extraChargeForm,
                        amount: v,
                        collectAmount: extraChargeForm.collectNow ? v : extraChargeForm.collectAmount,
                      });
                    }}
                  />
                </div>
              </div>

              {/* Time Extension Option */}
              <div className="rounded-xl border border-border p-3 space-y-3">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <Checkbox
                    checked={extraChargeForm.extendEndTime}
                    onCheckedChange={(c) =>
                      setExtraChargeForm({ ...extraChargeForm, extendEndTime: !!c })
                    }
                  />
                  Extend Event End Time on Schedule
                </label>

                {extraChargeForm.extendEndTime && (
                  <div className="pt-1 grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">New End Time</Label>
                      <Input
                        type="time"
                        className="h-9"
                        value={extraChargeForm.newEndTime}
                        onChange={(e) => {
                          const newTime = e.target.value;
                          const oldEnd = selectedResForCharge.end_time ? new Date(selectedResForCharge.end_time).toTimeString().slice(0, 5) : "14:00";
                          const extraHours = calculateDurationHours(oldEnd, newTime);
                          const autoExtra = Math.max(1, extraHours) * hourlyRate;
                          setExtraChargeForm({
                            ...extraChargeForm,
                            newEndTime: newTime,
                            amount: String(autoExtra),
                            collectAmount: extraChargeForm.collectNow ? String(autoExtra) : extraChargeForm.collectAmount,
                          });
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Collection Option */}
              <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <Checkbox
                    checked={extraChargeForm.collectNow}
                    onCheckedChange={(c) =>
                      setExtraChargeForm({
                        ...extraChargeForm,
                        collectNow: !!c,
                        collectAmount: extraChargeForm.amount,
                      })
                    }
                  />
                  Collect payment for this extra charge immediately
                </label>

                {extraChargeForm.collectNow && (
                  <div className="pt-2 border-t border-border grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Collected Amount (₹)</Label>
                      <Input
                        type="number"
                        className="h-9"
                        value={extraChargeForm.collectAmount}
                        onChange={(e) =>
                          setExtraChargeForm({ ...extraChargeForm, collectAmount: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Payment Mode</Label>
                      <Select
                        value={extraChargeForm.paymentMethod}
                        onValueChange={(v: any) =>
                          setExtraChargeForm({ ...extraChargeForm, paymentMethod: v })
                        }
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="UPI">UPI / QR (GPay, PhonePe, Paytm)</SelectItem>
                          <SelectItem value="CARD">Credit / Debit Card (POS)</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                          <SelectItem value="OTHER">Other / Direct</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button variant="ghost" type="button" onClick={() => setExtraChargeModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-brass text-gold-foreground hover:opacity-90"
                >
                  {loading ? "Saving..." : "Apply Extra Charges"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Collect Balance Modal */}
      <Dialog open={collectModalOpen} onOpenChange={setCollectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Outstanding Balance</DialogTitle>
            <DialogDescription>Settle folio for party hall reservation.</DialogDescription>
          </DialogHeader>

          {selectedResForCollect && (() => {
            const fin = getReservationFinancials(selectedResForCollect);

            return (
              <form onSubmit={handleSaveCollectBalance} className="space-y-4 pt-2">
                <div className="rounded-xl border border-border bg-secondary/30 p-3 text-xs space-y-1">
                  <div className="font-semibold text-sm">
                    {selectedResForCollect.event_type} · {getGuestName(selectedResForCollect.guest_id)}
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground">Total Bill:</span>
                    <span className="font-medium">{inr(fin.total)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Already Paid:</span>
                    <span className="font-medium text-success">{inr(fin.paid)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-1 font-semibold">
                    <span>Remaining Due:</span>
                    <span className="text-warning text-sm">{inr(fin.balance)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Amount to Collect (₹) *</Label>
                    <Input
                      type="number"
                      required
                      className="h-9"
                      value={collectForm.amount}
                      onChange={(e) => setCollectForm({ ...collectForm, amount: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Payment Mode *</Label>
                    <Select
                      value={collectForm.paymentMethod}
                      onValueChange={(v: any) => setCollectForm({ ...collectForm, paymentMethod: v })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="UPI">UPI / QR (GPay, PhonePe, Paytm)</SelectItem>
                        <SelectItem value="CARD">Credit / Debit Card (POS)</SelectItem>
                        <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                        <SelectItem value="OTHER">Other / Direct</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="ghost" type="button" onClick={() => setCollectModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-brass text-gold-foreground hover:opacity-90"
                  >
                    {loading ? "Processing..." : "Settle Payment"}
                  </Button>
                </div>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Booking Details Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Party Hall Booking</DialogTitle>
            <DialogDescription>Modify event timing, guest count, and customer information.</DialogDescription>
          </DialogHeader>

          {selectedResForEdit && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input
                    required
                    value={editForm.customerName}
                    onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Event Date</Label>
                  <Input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    required
                    value={editForm.startTime}
                    onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    required
                    value={editForm.endTime}
                    onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select
                    value={editForm.eventType}
                    onValueChange={(v) => setEditForm({ ...editForm, eventType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Birthday">Birthday</SelectItem>
                      <SelectItem value="Wedding">Wedding</SelectItem>
                      <SelectItem value="Reception">Reception</SelectItem>
                      <SelectItem value="Corporate">Corporate Event</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Guests</Label>
                  <Input
                    type="number"
                    required
                    value={editForm.guests}
                    onChange={(e) => setEditForm({ ...editForm, guests: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Booking Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) => setEditForm({ ...editForm, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="OCCUPIED">In-Progress</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-border">
                <Label>Total Package Base Rate (₹)</Label>
                <Input
                  type="number"
                  required
                  value={editForm.baseAmount}
                  onChange={(e) => setEditForm({ ...editForm, baseAmount: e.target.value })}
                />
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-border">
                <Button variant="ghost" type="button" onClick={() => setEditModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-brass text-gold-foreground hover:opacity-90"
                >
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Discount Modal */}
      <Dialog open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Discount</DialogTitle>
            <DialogDescription>
              Submit discount request for Super Admin approval. Folio will be locked until resolved.
            </DialogDescription>
          </DialogHeader>

          {selectedResForDiscount && (() => {
            const fin = getReservationFinancials(selectedResForDiscount);

            return (
              <form onSubmit={handleSaveRequestDiscount} className="space-y-4 pt-2">
                <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs flex justify-between items-center">
                  <span className="text-muted-foreground">Original Total:</span>
                  <span className="font-bold text-sm">{inr(fin.total)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Discount Amount (₹) *</Label>
                  <Input
                    type="number"
                    required
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(e.target.value)}
                    placeholder="e.g. 1000"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reason / Justification *</Label>
                  <Input
                    required
                    value={discountReason}
                    onChange={(e) => setDiscountReason(e.target.value)}
                    placeholder="e.g. Long event concession, Service adjustment"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="ghost" type="button" onClick={() => setDiscountModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-brass text-gold-foreground hover:opacity-90"
                  >
                    Submit for Approval
                  </Button>
                </div>
              </form>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
