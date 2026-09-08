import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, KpiCard, Panel, Pill, EmptyState } from "@/components/pms/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { usePms } from "@/lib/pms-store";
import { inr, type GroupBooking, type Reservation, type Room } from "@/lib/pms-data";
import { SplitPaymentInput, type SplitRow } from "@/components/pms/split-payment-input";
import { toast } from "sonner";
import {
  Users,
  BedDouble,
  Receipt,
  Plus,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  DoorOpen,
  Printer,
  Calendar,
  Layers,
  Sparkles,
  Phone,
  ShieldCheck,
  AlertTriangle,
  Building,
  CreditCard,
  Banknote,
  Trash2,
  Info
} from "lucide-react";

export const Route = createFileRoute("/_shell/group-bookings")({
  head: () => ({
    meta: [
      { title: "Group Bookings & Multi-Room Management — Hotel DRB" },
      { name: "description", content: "Master group folios, sequential room departures with bill transfer, and consolidated checkout." },
    ],
  }),
  component: GroupBookingsPage,
});

export function GroupBookingsPage() {
  const {
    rooms,
    reservations,
    guests,
    payments,
    groupBookings,
    addGroupBooking,
    groupExistingReservations,
    checkInGroupRoom,
    checkInAllGroupRooms,
    checkOutGroupRoom,
    settleGroupMaster,
    updateGroupBookingPayer,
    closeGroupBooking,
    deleteGroupBooking
  } = usePms();

  // Dialog states
  const [newGroupOpen, setNewGroupOpen] = React.useState(false);
  const [groupExistingOpen, setGroupExistingOpen] = React.useState(false);
  const [settleModalOpen, setSettleModalOpen] = React.useState(false);
  const [printModalOpen, setPrintModalOpen] = React.useState(false);
  const [confirmTransferModalOpen, setConfirmTransferModalOpen] = React.useState(false);
  const [groupFilterTab, setGroupFilterTab] = React.useState<"ACTIVE" | "COMPLETED" | "ALL">("ACTIVE");

  // Selected Group / Action state
  const [selectedGroup, setSelectedGroup] = React.useState<GroupBooking | null>(null);
  const [targetCheckoutRes, setTargetCheckoutRes] = React.useState<Reservation | null>(null);
  const [masterSettleGroup, setMasterSettleGroup] = React.useState<GroupBooking | null>(null);
  const [masterPayerRes, setMasterPayerRes] = React.useState<Reservation | null>(null);
  const [masterSettlementSplits, setMasterSettlementSplits] = React.useState<SplitRow[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  // New Group Booking Form State
  const todayStr = new Date().toISOString().split("T")[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split("T")[0];

  const [groupName, setGroupName] = React.useState("");
  const [contactName, setContactName] = React.useState("");
  const [contactPhone, setContactPhone] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [idType, setIdType] = React.useState("Aadhaar Card");
  const [idNumber, setIdNumber] = React.useState("");
  const [gstNumber, setGstNumber] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [startDate, setStartDate] = React.useState(todayStr);
  const [endDate, setEndDate] = React.useState(tomorrowStr);
  const [checkInTime, setCheckInTime] = React.useState("14:00");
  const [checkOutTime, setCheckOutTime] = React.useState("14:00");
  const [selectedRoomIds, setSelectedRoomIds] = React.useState<string[]>([]);
  const [payerType, setPayerType] = React.useState<"LAST_ROOM" | "CUSTOM_ROOM">("LAST_ROOM");
  const [customPayerRoomId, setCustomPayerRoomId] = React.useState<string>("");
  const [autoCheckIn, setAutoCheckIn] = React.useState(false);
  const [groupNotes, setGroupNotes] = React.useState("");
  const [advanceAmount, setAdvanceAmount] = React.useState<number>(0);
  const [advanceSplits, setAdvanceSplits] = React.useState<SplitRow[]>([
    { id: "1", method: "CASH", amount: 0, reference_note: "" }
  ]);

  // Group Existing Bookings Form State
  const [existingGroupName, setExistingGroupName] = React.useState("");
  const [existingSelectedResIds, setExistingSelectedResIds] = React.useState<string[]>([]);
  const [existingPayerType, setExistingPayerType] = React.useState<"LAST_ROOM" | "CUSTOM_ROOM">("LAST_ROOM");
  const [existingCustomRoomId, setExistingCustomRoomId] = React.useState<string>("");

  // Helpers
  const getGuest = (guestId?: string) => guests.find((g) => g.id === guestId);
  const getRoom = (roomId?: string) => rooms.find((r) => r.id === roomId);

  // Available Rooms for booking
  const availableRooms = React.useMemo(() => {
    return rooms.filter((r) => {
      if (r.status !== "AVAILABLE") return false;
      // Check for overlap
      const startTs = new Date(`${startDate}T${checkInTime}:00`).getTime();
      const endTs = new Date(`${endDate}T${checkOutTime}:00`).getTime();
      return !reservations.some((res) => {
        if (res.room_id !== r.id || res.status === "CANCELLED" || res.status === "COMPLETED") return false;
        const rStart = new Date(res.start_time || `${res.booking_date}T14:00:00`).getTime();
        const rEnd = new Date(res.end_time || `${res.booking_date}T11:00:00`).getTime();
        const effEnd = rEnd > rStart ? rEnd : rStart + 24 * 60 * 60 * 1000;
        return startTs < effEnd && endTs > rStart;
      });
    });
  }, [rooms, reservations, startDate, endDate, checkInTime, checkOutTime]);

  // Active / Confirmed Reservations that don't belong to an active group yet
  const unassignedActiveReservations = React.useMemo(() => {
    return reservations.filter(
      (r) =>
        r.resource_type === "ROOM" &&
        (r.status === "OCCUPIED" || r.status === "CONFIRMED") &&
        (!r.group_id || r.group_id === "")
    );
  }, [reservations]);

  // Pricing calculations for New Group Booking
  const nights = React.useMemo(() => {
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return 1;
    return Math.max(1, Math.ceil((e - s) / (24 * 60 * 60 * 1000)));
  }, [startDate, endDate]);

  const totalCalculatedGroupTariff = React.useMemo(() => {
    return selectedRoomIds.reduce((sum, rId) => {
      const rm = rooms.find((r) => r.id === rId);
      const pricePerNight = Number(rm?.price) || 1000;
      return sum + pricePerNight * nights;
    }, 0);
  }, [selectedRoomIds, rooms, nights]);

  const totalGroupWithTax = Math.round(totalCalculatedGroupTariff * 1.05);

  // Keep advance split total in sync with advanceAmount
  React.useEffect(() => {
    if (advanceSplits.length === 1) {
      setAdvanceSplits([{ ...advanceSplits[0], amount: advanceAmount }]);
    }
  }, [advanceAmount]);

  // Group Details Calculation
  const getGroupReservations = (grpId: string) => {
    return reservations.filter((r) => r.group_id === grpId && r.status !== "CANCELLED");
  };

  const getGroupFinancials = (grp: GroupBooking) => {
    const groupRes = getGroupReservations(grp.id);
    let totalBase = 0;
    let totalAddl = 0;
    let totalPaid = 0;
    let totalTransferred = 0;

    groupRes.forEach((r) => {
      const pay = payments.find((p) => p.reservation_id === r.id);
      const base = Number(pay?.total_amount) || Number(r.base_amount) || 0;
      const addl = Number(r.additional_charges) || 0;
      const paid = Number(pay?.paid_amount) || 0;
      const tr = Number(r.transferred_amount) || 0;

      totalBase += base;
      totalAddl += addl;
      totalPaid += paid;
      totalTransferred += tr;
    });

    const grandTotal = totalBase + totalAddl;
    const balance = Math.max(0, grandTotal - totalPaid);
    const activeRoomsCount = groupRes.filter((r) => r.status !== "COMPLETED").length;
    const completedRoomsCount = groupRes.filter((r) => r.status === "COMPLETED").length;

    return {
      groupRes,
      totalBase,
      totalAddl,
      totalPaid,
      grandTotal,
      balance,
      activeRoomsCount,
      completedRoomsCount,
      isFullyPaid: balance === 0 && grandTotal > 0,
    };
  };

  // KPI Metrics & Status Evaluation
  const isGroupActive = React.useCallback((grp: GroupBooking) => {
    if (grp.status === "COMPLETED" || grp.status === "CANCELLED") return false;
    const res = getGroupReservations(grp.id);
    if (res.length === 0) return false;
    const hasActiveRooms = res.some((r) => r.status !== "COMPLETED" && r.status !== "CANCELLED");
    const fin = getGroupFinancials(grp);
    return hasActiveRooms || fin.balance > 0;
  }, [reservations, payments]);

  const activeGroups = React.useMemo(() => groupBookings.filter(isGroupActive), [groupBookings, isGroupActive]);
  const completedGroups = React.useMemo(() => groupBookings.filter((g) => !isGroupActive(g)), [groupBookings, isGroupActive]);
  
  const displayedGroups = React.useMemo(() => {
    if (groupFilterTab === "ACTIVE") return activeGroups;
    if (groupFilterTab === "COMPLETED") return completedGroups;
    return groupBookings;
  }, [groupBookings, activeGroups, completedGroups, groupFilterTab]);

  const totalOccupiedGroupRooms = activeGroups.reduce((sum, g) => {
    const res = getGroupReservations(g.id);
    return sum + res.filter((r) => r.status === "OCCUPIED").length;
  }, 0);
  const totalGroupPendingBalance = activeGroups.reduce((sum, g) => {
    return sum + getGroupFinancials(g).balance;
  }, 0);

  // Handlers: Create Group
  const handleCreateGroupSubmit = async () => {
    if (submitting) return;
    if (!groupName.trim()) {
      toast.error("Please enter a Group Name (e.g., Sharma Wedding, TCS Tour).");
      return;
    }
    if (!contactName.trim()) {
      toast.error("Please enter Contact Guest Name.");
      return;
    }
    if (selectedRoomIds.length === 0) {
      toast.error("Please select at least one room for this group.");
      return;
    }

    const basePerRoom = Math.round(totalCalculatedGroupTariff / selectedRoomIds.length);
    const totalPerRoom = Math.round(totalGroupWithTax / selectedRoomIds.length);

    setSubmitting(true);
    try {
      const res = await addGroupBooking({
        name: groupName.trim(),
        contactName: contactName.trim(),
        contactPhone: contactPhone.trim(),
        contactEmail: contactEmail.trim(),
        idType,
        idNumber: idNumber.trim(),
        gstNumber: gstNumber.trim(),
        address: address.trim(),
        roomIds: selectedRoomIds,
        startDate,
        endDate,
        checkInTime,
        checkOutTime,
        nights,
        baseAmountPerRoom: basePerRoom,
        totalAmountPerRoom: totalPerRoom,
        advancePaid: advanceAmount,
        splits: advanceAmount > 0 ? advanceSplits : [],
        payerType,
        customPayerRoomId: payerType === "CUSTOM_ROOM" ? (customPayerRoomId || selectedRoomIds[0]) : undefined,
        notes: groupNotes.trim(),
        autoCheckIn,
      });

      if (res.success) {
        toast.success(`Group Booking "${groupName}" created with ${selectedRoomIds.length} rooms!`);
        setNewGroupOpen(false);
        // Reset form
        setGroupName("");
        setContactName("");
        setContactPhone("");
        setContactEmail("");
        setIdNumber("");
        setGstNumber("");
        setAddress("");
        setSelectedRoomIds([]);
        setAdvanceAmount(0);
        setGroupNotes("");
      } else {
        toast.error(res.error || "Failed to create group booking");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers: Group Existing Active Bookings
  const handleGroupExistingSubmit = async () => {
    if (submitting) return;
    if (!existingGroupName.trim()) {
      toast.error("Please enter a Group Name.");
      return;
    }
    if (existingSelectedResIds.length < 2) {
      toast.error("Please select at least 2 existing bookings to group together.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await groupExistingReservations({
        groupName: existingGroupName.trim(),
        reservationIds: existingSelectedResIds,
        payerType: existingPayerType,
        customPayerRoomId: existingPayerType === "CUSTOM_ROOM" ? existingCustomRoomId : undefined,
      });

      if (res.success) {
        toast.success(`Successfully grouped ${existingSelectedResIds.length} bookings under "${existingGroupName}"!`);
        setGroupExistingOpen(false);
        setExistingGroupName("");
        setExistingSelectedResIds([]);
      } else {
        toast.error(res.error || "Failed to group existing bookings");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handlers: Room Checkout in Group
  const initiateRoomCheckout = async (r: Reservation, grp: GroupBooking) => {
    const fin = getGroupFinancials(grp);
    const activeRes = fin.groupRes.filter((res) => res.status !== "COMPLETED");

    const isCustomPayer = grp.payer_type === "CUSTOM_ROOM";
    const isThisCustomPayerRoom = isCustomPayer && r.room_id === grp.custom_payer_room_id;
    const isLastActiveRoom = activeRes.length === 1 && activeRes[0].id === r.id;

    // If this is the master billing room:
    if (isThisCustomPayerRoom || (!isCustomPayer && isLastActiveRoom)) {
      setMasterSettleGroup(grp);
      setMasterPayerRes(r);
      const netDue = fin.balance;
      setMasterSettlementSplits([
        { id: "1", method: "CASH", amount: netDue, reference_note: "Final Group Settlement" }
      ]);
      setSettleModalOpen(true);
      return;
    }

    // Otherwise, this room is departing early and its bill transfers to the master room
    setTargetCheckoutRes(r);
    setSelectedGroup(grp);
    setConfirmTransferModalOpen(true);
  };

  const executeSequentialRoomCheckout = async () => {
    if (!targetCheckoutRes) return;
    setSubmitting(true);
    try {
      const result = await checkOutGroupRoom(targetCheckoutRes.id);
      if (result.success) {
        if (result.isMasterPayerRoom) {
          toast.info("This is the designated master room. Please complete group settlement.");
        } else {
          toast.success(
            `Room checked out! Outstanding bill of ${inr(result.transferredAmount || 0)} transferred to ${result.targetRoomNumber}.`
          );
        }
        setConfirmTransferModalOpen(false);
        setTargetCheckoutRes(null);
      } else {
        toast.error(result.error || "Failed to checkout room");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleMasterSettlementSubmit = async () => {
    if (!masterSettleGroup || !masterPayerRes || submitting) return;
    const fin = getGroupFinancials(masterSettleGroup);
    const totalToPay = fin.balance;
    const allocated = masterSettlementSplits.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

    if (totalToPay > 0 && allocated <= 0) {
      toast.error("Please enter a payment amount or split.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await settleGroupMaster({
        groupId: masterSettleGroup.id,
        payerReservationId: masterPayerRes.id,
        totalAmount: fin.grandTotal,
        paidAmount: fin.totalPaid + allocated,
        splits: masterSettlementSplits,
        notes: `Group Master Settlement for ${masterSettleGroup.name}`,
      });

      if (res.success) {
        toast.success(`Group "${masterSettleGroup.name}" master bill settled in full and all rooms checked out!`);
        setSettleModalOpen(false);
        setMasterSettleGroup(null);
        setMasterPayerRes(null);
      } else {
        toast.error(res.error || "Failed to settle master bill");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Operations"
        title="Group Bookings & Multi-Room Management"
        subtitle="Consolidated guest folios, individual room checkouts with bill transfer, and master settlement"
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => setGroupExistingOpen(true)}
              className="rounded-xl border-border bg-card/80 text-xs font-medium text-foreground hover:bg-card shadow-xs"
            >
              <ArrowRightLeft className="size-3.5 mr-1.5 text-brass" /> Group Existing Rooms
            </Button>
            <Button
              onClick={() => setNewGroupOpen(true)}
              className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 shadow-sm text-xs font-medium"
            >
              <Plus className="size-4 mr-1.5" /> New Group Booking
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label="Active Groups"
          value={activeGroups.length.toString()}
          sub="Ongoing group stays"
          icon={Users}
        />
        <KpiCard
          label="Group Rooms Occupied"
          value={totalOccupiedGroupRooms.toString()}
          sub="Across all active groups"
          icon={BedDouble}
        />
        <KpiCard
          label="Pending Group Balances"
          value={inr(totalGroupPendingBalance)}
          sub="To be settled by master checkout"
          icon={Receipt}
        />
      </div>

      {/* Group Bookings Filter Tabs & List */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={groupFilterTab === "ACTIVE" ? "default" : "outline"}
              onClick={() => setGroupFilterTab("ACTIVE")}
              className={`rounded-xl text-xs h-8 ${groupFilterTab === "ACTIVE" ? "bg-brass text-gold-foreground font-semibold" : ""}`}
            >
              Active Groups ({activeGroups.length})
            </Button>
            <Button
              size="sm"
              variant={groupFilterTab === "COMPLETED" ? "default" : "outline"}
              onClick={() => setGroupFilterTab("COMPLETED")}
              className={`rounded-xl text-xs h-8 ${groupFilterTab === "COMPLETED" ? "bg-brass text-gold-foreground font-semibold" : ""}`}
            >
              Completed & Settled ({completedGroups.length})
            </Button>
            <Button
              size="sm"
              variant={groupFilterTab === "ALL" ? "default" : "outline"}
              onClick={() => setGroupFilterTab("ALL")}
              className={`rounded-xl text-xs h-8 ${groupFilterTab === "ALL" ? "bg-brass text-gold-foreground font-semibold" : ""}`}
            >
              All Groups ({groupBookings.length})
            </Button>
          </div>
        </div>

        {displayedGroups.length === 0 ? (
          <Panel>
            <EmptyState
              title={groupFilterTab === "ACTIVE" ? "No Active Groups" : groupFilterTab === "COMPLETED" ? "No Completed Groups" : "No Group Bookings Found"}
              body={groupFilterTab === "ACTIVE" ? "All group stays have been fully settled and checked out." : "Create a new multi-room group booking or group existing occupied rooms."}
              icon={Users}
              action={
                <Button onClick={() => setNewGroupOpen(true)} className="bg-brass text-gold-foreground mt-4">
                  <Plus className="size-4 mr-1.5" /> Create New Group Booking
                </Button>
              }
            />
          </Panel>
        ) : (
          displayedGroups.map((grp) => {
            const fin = getGroupFinancials(grp);
            const isCompleted = grp.status === "COMPLETED" || !isGroupActive(grp);

            return (
              <Panel key={grp.id} className="border-border/80 shadow-xs overflow-hidden">
                {/* Group Card Header */}
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border/70 bg-muted/20 p-4 sm:p-5">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                        <Users className="size-4 text-brass" /> {grp.name}
                      </h3>
                      <Pill tone={isCompleted ? "neutral" : "success"}>
                        {isCompleted ? "Completed Stay" : "Active Group"}
                      </Pill>
                      <Badge variant="outline" className="text-[11px] font-mono text-muted-foreground border-border/80">
                        {grp.id}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building className="size-3.5 text-brass" /> Contact: <strong className="text-foreground font-medium">{grp.contact_name}</strong>
                      </span>
                      {grp.contact_phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="size-3.5" /> {grp.contact_phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="size-3.5" /> Billing Mode:{" "}
                        <strong className="text-foreground font-medium">
                          {grp.payer_type === "LAST_ROOM"
                            ? "Last Room Checked Out (Default Master)"
                            : `Designated Base Room (${getRoom(grp.custom_payer_room_id)?.room_number || "Master"})`}
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Top Right Group Balance Summary & Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="rounded-xl border border-border bg-card/90 px-3.5 py-1.5 text-right shadow-2xs">
                      <div className="text-[11px] text-muted-foreground">Group Master Balance Due</div>
                      <div className="text-sm font-bold font-mono text-foreground">
                        {fin.balance === 0 ? (
                          <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-end gap-1">
                            <CheckCircle2 className="size-3.5" /> All Settled
                          </span>
                        ) : (
                          <span className="text-destructive">{inr(fin.balance)}</span>
                        )}
                      </div>
                    </div>

                    {!isCompleted && fin.activeRoomsCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => checkInAllGroupRooms(grp.id)}
                        className="rounded-xl border-border text-xs font-medium"
                      >
                        <DoorOpen className="size-3.5 mr-1 text-brass" /> Check In All
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedGroup(grp);
                        setPrintModalOpen(true);
                      }}
                      className="rounded-xl border-border text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      <Printer className="size-3.5 mr-1" /> Statement
                    </Button>

                    {grp.status === "ACTIVE" && fin.activeRoomsCount === 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          await closeGroupBooking(grp.id);
                          toast.success(`Group "${grp.name}" marked as completed`);
                        }}
                        className="rounded-xl border-border text-xs font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        <CheckCircle2 className="size-3.5 mr-1" /> Close Group
                      </Button>
                    )}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (confirm(`Remove group booking record for "${grp.name}"?`)) {
                          await deleteGroupBooking(grp.id);
                          toast.success("Group booking removed");
                        }
                      }}
                      className="text-muted-foreground hover:text-destructive text-xs"
                      title="Delete / Archive Group"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Rooms Table */}
                <div className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/10">
                      <TableRow>
                        <TableHead className="w-28">Room</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Guest Name</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Tariff / Charges</TableHead>
                        <TableHead>Transferred Bill</TableHead>
                        <TableHead>Advance Paid</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fin.groupRes.map((r) => {
                        const rm = getRoom(r.room_id);
                        const g = getGuest(r.guest_id);
                        const pay = payments.find((p) => p.reservation_id === r.id);
                        const isOccupied = r.status === "OCCUPIED";
                        const isConfirmed = r.status === "CONFIRMED" || r.status === "PENDING";
                        const isDeparted = r.status === "COMPLETED";

                        const isCustomPayer = grp.payer_type === "CUSTOM_ROOM" && grp.custom_payer_room_id === r.room_id;
                        const activeGroupRes = fin.groupRes.filter((res) => res.status !== "COMPLETED");
                        const isLastActive = activeGroupRes.length === 1 && activeGroupRes[0].id === r.id;

                        const transferredAmt = Number(r.transferred_amount) || 0;
                        const roomBase = Number(pay?.total_amount) || Number(r.base_amount) || 0;
                        const paid = Number(pay?.paid_amount) || 0;

                        return (
                          <TableRow key={r.id} className={isDeparted ? "opacity-70 bg-muted/5" : ""}>
                            <TableCell className="font-bold font-mono">
                              <div className="flex items-center gap-1.5">
                                <span>Room {rm?.room_number || "TBD"}</span>
                                {isCustomPayer && (
                                  <Badge className="text-[10px] bg-brass/15 text-brass border-brass/30">
                                    Master Room
                                  </Badge>
                                )}
                                {!isCustomPayer && isLastActive && !isDeparted && (
                                  <Badge className="text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">
                                    Last Room (Payer)
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {rm?.room_name || "Standard Room"}
                            </TableCell>
                            <TableCell className="text-xs font-medium text-foreground">
                              {g?.name || grp.contact_name}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                              {r.booking_date} to {r.end_time ? r.end_time.split("T")[0] : ""}
                            </TableCell>
                            <TableCell className="text-xs font-mono font-medium">
                              {inr(roomBase)}
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {transferredAmt > 0 ? (
                                <span className="text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1">
                                  <ArrowRightLeft className="size-3" /> +{inr(transferredAmt)}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                              {paid > 0 ? inr(paid) : "₹0"}
                            </TableCell>
                            <TableCell>
                              {isDeparted ? (
                                <Pill tone="neutral">Checked Out</Pill>
                              ) : isOccupied ? (
                                <Pill tone="info">Occupied</Pill>
                              ) : (
                                <Pill tone="warning">Confirmed</Pill>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {!isCompleted && (
                                <div className="flex items-center justify-end gap-1.5">
                                  {isConfirmed && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        const res = await checkInGroupRoom(r.id);
                                        if (res.success) toast.success(`Room ${rm?.room_number} checked in!`);
                                        else toast.error(res.error || "Check-in failed");
                                      }}
                                      className="h-7 text-xs font-medium bg-card hover:bg-muted"
                                    >
                                      <DoorOpen className="size-3 mr-1 text-brass" /> Check-In
                                    </Button>
                                  )}

                                  {isOccupied && (
                                    <Button
                                      size="sm"
                                      variant={isLastActive || isCustomPayer ? "default" : "outline"}
                                      onClick={() => initiateRoomCheckout(r, grp)}
                                      className={`h-7 text-xs font-medium ${
                                        isLastActive || isCustomPayer
                                          ? "bg-brass text-gold-foreground hover:opacity-90"
                                          : "border-border text-foreground hover:bg-muted"
                                      }`}
                                    >
                                      {isLastActive || isCustomPayer ? (
                                        <>
                                          <Receipt className="size-3 mr-1" /> Settle & Checkout
                                        </>
                                      ) : (
                                        <>
                                          <ArrowRightLeft className="size-3 mr-1 text-brass" /> Transfer & Checkout
                                        </>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Group Bottom Consolidated Footer */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-border/70 bg-card/60 p-3.5 sm:px-5 text-xs">
                  <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                    <span>
                      Total Rooms: <strong className="text-foreground">{fin.groupRes.length}</strong>
                    </span>
                    <span>
                      Occupied: <strong className="text-foreground">{fin.activeRoomsCount}</strong>
                    </span>
                    <span>
                      Departed: <strong className="text-foreground">{fin.completedRoomsCount}</strong>
                    </span>
                    <span>
                      Total Charges: <strong className="text-foreground font-mono">{inr(fin.grandTotal)}</strong>
                    </span>
                    <span>
                      Total Advances Paid: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{inr(fin.totalPaid)}</strong>
                    </span>
                  </div>

                  {!isCompleted && fin.balance > 0 && fin.activeRoomsCount > 0 && (
                    <Button
                      size="sm"
                      onClick={() => {
                        const activeRes = fin.groupRes.filter((res) => res.status !== "COMPLETED");
                        const masterRes = grp.payer_type === "CUSTOM_ROOM"
                          ? fin.groupRes.find((res) => res.room_id === grp.custom_payer_room_id) || activeRes[activeRes.length - 1]
                          : activeRes[activeRes.length - 1];

                        if (masterRes) {
                          setMasterSettleGroup(grp);
                          setMasterPayerRes(masterRes);
                          setMasterSettlementSplits([
                            { id: "1", method: "CASH", amount: fin.balance, reference_note: "Consolidated Settlement" }
                          ]);
                          setSettleModalOpen(true);
                        }
                      }}
                      className="bg-brass text-gold-foreground hover:opacity-90 font-medium text-xs rounded-xl shadow-xs"
                    >
                      <Receipt className="size-3.5 mr-1.5" /> Settle Group Bill ({inr(fin.balance)})
                    </Button>
                  )}
                </div>
              </Panel>
            );
          })
        )}
      </div>

      {/* MODAL 1: NEW GROUP BOOKING */}
      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-brass" /> New Group Booking
            </DialogTitle>
            <DialogDescription>
              Reserve multiple rooms under a single master guest name with flexible billing rules.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label className="text-xs">Group / Organization Name *</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Kumar Family Wedding, Infosys Team"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Primary Contact Guest Name *</Label>
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="e.g. Mr. Rajesh Kumar"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Phone Number</Label>
                <Input
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Email Address</Label>
                <Input
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="guest@example.com"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">ID Type & Number</Label>
                <div className="flex gap-2">
                  <Select value={idType} onValueChange={setIdType}>
                    <SelectTrigger className="w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aadhaar Card">Aadhaar</SelectItem>
                      <SelectItem value="Passport">Passport</SelectItem>
                      <SelectItem value="Driving License">Driving License</SelectItem>
                      <SelectItem value="Voter ID">Voter ID</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="ID Card Number"
                    className="text-xs flex-1"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">GST Number (Optional B2B)</Label>
                <Input
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="e.g. 33AAAAA0000A1Z5"
                  className="text-xs uppercase"
                />
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs">Address / City</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Chennai, Tamil Nadu"
                  className="text-xs"
                />
              </div>
            </div>

            {/* Dates and Times */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 rounded-xl border border-border/70 bg-muted/20 p-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Check-In Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Check-In Time</Label>
                <Input
                  type="time"
                  value={checkInTime}
                  onChange={(e) => setCheckInTime(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Check-Out Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Check-Out Time</Label>
                <Input
                  type="time"
                  value={checkOutTime}
                  onChange={(e) => setCheckOutTime(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            {/* Room Selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Select Rooms for Group ({selectedRoomIds.length} Selected)</Label>
                <span className="text-[11px] text-muted-foreground">
                  Available: {availableRooms.length} rooms for chosen dates
                </span>
              </div>

              {availableRooms.length === 0 ? (
                <div className="rounded-lg border border-border p-4 text-center text-xs text-muted-foreground">
                  No rooms are available for the selected dates. Please adjust check-in/out dates.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 border border-border/60 rounded-xl bg-card">
                  {availableRooms.map((rm) => {
                    const isChecked = selectedRoomIds.includes(rm.id);
                    return (
                      <div
                        key={rm.id}
                        onClick={() => {
                          if (isChecked) setSelectedRoomIds(selectedRoomIds.filter((id) => id !== rm.id));
                          else setSelectedRoomIds([...selectedRoomIds, rm.id]);
                        }}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all text-xs ${
                          isChecked
                            ? "border-brass bg-brass/10 text-foreground"
                            : "border-border/60 hover:bg-muted/50"
                        }`}
                      >
                        <Checkbox checked={isChecked} />
                        <div className="leading-tight">
                          <div className="font-bold">Room {rm.room_number}</div>
                          <div className="text-[10px] text-muted-foreground">{rm.room_name}</div>
                          <div className="text-[10px] font-mono text-brass">{inr(rm.price)}/nt</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Master Billing Strategy */}
            <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-2.5">
              <Label className="text-xs font-semibold">Billing Strategy (Default: Last Room)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  onClick={() => setPayerType("LAST_ROOM")}
                  className={`p-3 rounded-lg border cursor-pointer text-xs ${
                    payerType === "LAST_ROOM"
                      ? "border-brass bg-brass/10"
                      : "border-border/70 hover:bg-muted/40"
                  }`}
                >
                  <div className="font-semibold text-foreground">Last Room Checked Out (Recommended)</div>
                  <div className="text-[11px] text-muted-foreground">
                    Rooms checkout one by one, and their unpaid charges automatically transfer forward. The last active room pays the consolidated group bill.
                  </div>
                </div>

                <div
                  onClick={() => setPayerType("CUSTOM_ROOM")}
                  className={`p-3 rounded-lg border cursor-pointer text-xs ${
                    payerType === "CUSTOM_ROOM"
                      ? "border-brass bg-brass/10"
                      : "border-border/70 hover:bg-muted/40"
                  }`}
                >
                  <div className="font-semibold text-foreground">Designate Specific Base Room</div>
                  <div className="text-[11px] text-muted-foreground">
                    Designate one master room (e.g. Head Guest room) where all transferred charges will aggregate for closing.
                  </div>
                </div>
              </div>

              {payerType === "CUSTOM_ROOM" && selectedRoomIds.length > 0 && (
                <div className="pt-2">
                  <Label className="text-[11px] text-muted-foreground">Select Master Payer Room</Label>
                  <Select value={customPayerRoomId} onValueChange={setCustomPayerRoomId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Choose master room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedRoomIds.map((rId) => {
                        const rm = rooms.find((r) => r.id === rId);
                        return (
                          <SelectItem key={rId} value={rId}>
                            Room {rm?.room_number} — {rm?.room_name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Advance Payment with Split Options */}
            <div className="rounded-xl border border-border/70 bg-card p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold">Advance Deposit / Payment (Optional)</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Collect group advance now with split payment support
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Est. Total Bill:</div>
                  <div className="text-sm font-bold font-mono text-foreground">{inr(totalGroupWithTax)}</div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Total Advance Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={advanceAmount || ""}
                  onChange={(e) => setAdvanceAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="text-xs font-mono font-semibold"
                />
              </div>

              {advanceAmount > 0 && (
                <SplitPaymentInput
                  totalAmount={advanceAmount}
                  splits={advanceSplits}
                  onChange={setAdvanceSplits}
                />
              )}
            </div>

            {/* Auto Check-in Toggle */}
            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="autoCheckin"
                checked={autoCheckIn}
                onCheckedChange={(c) => setAutoCheckIn(Boolean(c))}
              />
              <label
                htmlFor="autoCheckin"
                className="text-xs text-foreground cursor-pointer select-none font-medium"
              >
                Check-in all rooms immediately (Mark as Occupied now)
              </label>
            </div>

            <Button
              disabled={submitting || selectedRoomIds.length === 0}
              onClick={handleCreateGroupSubmit}
              className="w-full bg-brass text-gold-foreground hover:opacity-90 font-medium text-xs mt-2"
            >
              {submitting ? "Creating Group..." : `Confirm & Create Group (${selectedRoomIds.length} Rooms)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: GROUP EXISTING ACTIVE BOOKINGS */}
      <Dialog open={groupExistingOpen} onOpenChange={setGroupExistingOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-brass" /> Group Existing Occupied/Booked Rooms
            </DialogTitle>
            <DialogDescription>
              Combine existing independent room bookings into a single group booking with sequential bill transfer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Group Name *</Label>
              <Input
                value={existingGroupName}
                onChange={(e) => setExistingGroupName(e.target.value)}
                placeholder="e.g. VIP Delegation, Sharma Family"
                className="text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">
                Select Active Bookings to Group ({existingSelectedResIds.length} Selected)
              </Label>
              {unassignedActiveReservations.length === 0 ? (
                <div className="rounded-lg border border-border p-4 text-center text-xs text-muted-foreground">
                  No independent active or confirmed bookings available to group.
                </div>
              ) : (
                <div className="border border-border/70 rounded-xl max-h-56 overflow-y-auto p-1 bg-card space-y-1">
                  {unassignedActiveReservations.map((r) => {
                    const rm = getRoom(r.room_id);
                    const g = getGuest(r.guest_id);
                    const isChecked = existingSelectedResIds.includes(r.id);

                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          if (isChecked) setExistingSelectedResIds(existingSelectedResIds.filter((id) => id !== r.id));
                          else setExistingSelectedResIds([...existingSelectedResIds, r.id]);
                        }}
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer text-xs ${
                          isChecked
                            ? "border-brass bg-brass/10 text-foreground"
                            : "border-border/60 hover:bg-muted/40"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox checked={isChecked} />
                          <div>
                            <div className="font-bold">Room {rm?.room_number || "TBD"} — {g?.name || "Guest"}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {rm?.room_name} • Base: {inr(Number(r.base_amount) || 0)}
                            </div>
                          </div>
                        </div>
                        <Pill tone={r.status === "OCCUPIED" ? "info" : "warning"}>{r.status}</Pill>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Payer rule */}
            <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2 text-xs">
              <Label className="text-xs font-semibold">Master Closing Strategy</Label>
              <Select
                value={existingPayerType}
                onValueChange={(v: any) => setExistingPayerType(v)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LAST_ROOM">Last Room Checked Out (Default)</SelectItem>
                  <SelectItem value="CUSTOM_ROOM">Designated Base Room</SelectItem>
                </SelectContent>
              </Select>

              {existingPayerType === "CUSTOM_ROOM" && existingSelectedResIds.length > 0 && (
                <div className="pt-2">
                  <Label className="text-[11px] text-muted-foreground">Select Master Base Room</Label>
                  <Select value={existingCustomRoomId} onValueChange={setExistingCustomRoomId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Choose room..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingSelectedResIds.map((resId) => {
                        const r = reservations.find((x) => x.id === resId);
                        const rm = getRoom(r?.room_id);
                        return (
                          <SelectItem key={resId} value={r?.room_id || ""}>
                            Room {rm?.room_number} ({rm?.room_name})
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Button
              disabled={submitting || existingSelectedResIds.length < 2 || !existingGroupName.trim()}
              onClick={handleGroupExistingSubmit}
              className="w-full bg-brass text-gold-foreground hover:opacity-90 font-medium text-xs mt-2"
            >
              {submitting ? "Grouping Bookings..." : `Group Selected ${existingSelectedResIds.length} Bookings`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: SEQUENTIAL ROOM CHECKOUT TRANSFER CONFIRMATION */}
      <Dialog open={confirmTransferModalOpen} onOpenChange={setConfirmTransferModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-5 text-brass" /> Sequential Room Departure
            </DialogTitle>
            <DialogDescription>
              This room is departing early. Its unpaid charges will automatically transfer forward to the group master folio.
            </DialogDescription>
          </DialogHeader>

          {targetCheckoutRes && (
            <div className="space-y-4 pt-2">
              <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Departing Room:</span>
                  <span className="font-bold text-foreground">
                    Room {getRoom(targetCheckoutRes.room_id)?.room_number}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Guest:</span>
                  <span className="font-medium text-foreground">
                    {getGuest(targetCheckoutRes.guest_id)?.name || selectedGroup?.contact_name}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-1.5">
                  <span className="text-muted-foreground">Room Tariff:</span>
                  <span className="font-mono font-medium">{inr(Number(targetCheckoutRes.base_amount) || 0)}</span>
                </div>
                {Number(targetCheckoutRes.additional_charges) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Additional Charges:</span>
                    <span className="font-mono font-medium">
                      {inr(Number(targetCheckoutRes.additional_charges))}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border/60 pt-2 text-sm font-bold">
                  <span>Net Bill to Transfer:</span>
                  <span className="font-mono text-brass">
                    {inr(
                      Number(targetCheckoutRes.base_amount) +
                        Number(targetCheckoutRes.additional_charges || 0) -
                        Number(payments.find((p) => p.reservation_id === targetCheckoutRes.id)?.paid_amount || 0)
                    )}
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-400 flex items-start gap-2">
                <Info className="size-4 shrink-0 mt-0.5" />
                <span>
                  The room will be released and marked <strong>DIRTY</strong> for housekeeping. No payment is required from this guest at this moment—the bill transfers automatically to the group master.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setConfirmTransferModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={submitting}
                  onClick={executeSequentialRoomCheckout}
                  className="bg-brass text-gold-foreground hover:opacity-90"
                >
                  {submitting ? "Processing Departure..." : "Confirm & Transfer Bill"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 4: MASTER SETTLEMENT ON FINAL ROOM CHECKOUT */}
      <Dialog open={settleModalOpen} onOpenChange={setSettleModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="size-5 text-brass" /> Consolidated Group Master Settlement
            </DialogTitle>
            <DialogDescription>
              All room charges and transfers in group "{masterSettleGroup?.name}" will be settled together on this final checkout.
            </DialogDescription>
          </DialogHeader>

          {masterSettleGroup && masterPayerRes && (
            <div className="space-y-4 pt-2">
              {/* Itemized Folio Summary */}
              <div className="rounded-xl border border-border/80 bg-card p-3.5 space-y-2 text-xs">
                <h4 className="font-semibold text-foreground border-b border-border/60 pb-1.5 flex items-center justify-between">
                  <span>Group Folio Charges Summary</span>
                  <Badge variant="outline" className="font-mono">
                    {getGroupReservations(masterSettleGroup.id).length} Rooms
                  </Badge>
                </h4>

                <div className="space-y-1.5 pt-1">
                  {getGroupReservations(masterSettleGroup.id).map((r) => {
                    const rm = getRoom(r.room_id);
                    const pay = payments.find((p) => p.reservation_id === r.id);
                    const cost = Number(pay?.total_amount) || Number(r.base_amount) || 0;
                    const paid = Number(pay?.paid_amount) || 0;

                    return (
                      <div key={r.id} className="flex justify-between items-center text-muted-foreground">
                        <span>
                          Room {rm?.room_number || "TBD"} ({rm?.room_name}) {r.status === "COMPLETED" ? "• (Departed)" : "• (Final Room)"}
                        </span>
                        <div className="space-y-0.5 text-right font-mono">
                          <span className="font-medium text-foreground">{inr(cost)}</span>
                          {paid > 0 && <span className="text-[10px] text-emerald-600 block">- Paid: {inr(paid)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border/70 pt-2 flex justify-between items-center text-sm font-bold">
                  <span>Grand Net Group Balance Due:</span>
                  <span className="font-mono text-base text-brass">
                    {inr(getGroupFinancials(masterSettleGroup).balance)}
                  </span>
                </div>
              </div>

              {/* Split Payment Input */}
              <SplitPaymentInput
                totalAmount={getGroupFinancials(masterSettleGroup).balance}
                splits={masterSettlementSplits}
                onChange={setMasterSettlementSplits}
                disabled={submitting}
              />

              <Button
                disabled={submitting}
                onClick={handleMasterSettlementSubmit}
                className="w-full bg-brass text-gold-foreground hover:opacity-90 font-medium text-xs mt-2"
              >
                {submitting ? "Settling Master Account..." : "Confirm Full Group Settlement & Close All Rooms"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 5: PRINT GROUP STATEMENT / TAX INVOICE */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="size-5 text-brass" /> Group Master Tax Statement
            </DialogTitle>
            <DialogDescription>
              Official group lodging statement formatted for Hotel DRB.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4 pt-2">
              <div id="printableGroupBill" className="rounded-xl border border-border p-6 bg-background space-y-6 text-xs text-foreground font-sans print:p-0 print:border-none">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-border pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-foreground tracking-tight">Hotel DRB</h2>
                    <p className="text-muted-foreground text-[11px]">Luxury Lodging & Banquet Facility</p>
                    <p className="text-muted-foreground text-[11px]">GSTIN: 33AAACD1234F1Z5 • State: 33-Tamil Nadu</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-brass uppercase">Group Master Folio</div>
                    <div className="text-[11px] font-mono text-muted-foreground">Ref: {selectedGroup.id}</div>
                    <div className="text-[11px] text-muted-foreground">Date: {new Date().toLocaleDateString("en-IN")}</div>
                  </div>
                </div>

                {/* Group Details */}
                <div className="grid grid-cols-2 gap-4 bg-muted/20 p-3 rounded-lg">
                  <div>
                    <div className="text-[11px] text-muted-foreground">Group / Master Guest</div>
                    <div className="font-bold text-sm">{selectedGroup.name}</div>
                    <div className="text-[11px]">Contact: {selectedGroup.contact_name}</div>
                    {selectedGroup.contact_phone && <div className="text-[11px]">Phone: {selectedGroup.contact_phone}</div>}
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-muted-foreground">Group Status</div>
                    <div className="font-semibold">{selectedGroup.status}</div>
                    <div className="text-[11px] text-muted-foreground">Payer Strategy: {selectedGroup.payer_type}</div>
                  </div>
                </div>

                {/* Rooms Table */}
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground">
                      <th className="py-2">Room</th>
                      <th className="py-2">Type</th>
                      <th className="py-2">Stay Period</th>
                      <th className="py-2 text-right">Taxable</th>
                      <th className="py-2 text-right">GST (5%)</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {getGroupReservations(selectedGroup.id).map((r) => {
                      const rm = getRoom(r.room_id);
                      const gross = Number(r.base_amount) || 1000;
                      const taxable = Math.round(gross / 1.05);
                      const gst = gross - taxable;

                      return (
                        <tr key={r.id}>
                          <td className="py-2 font-mono font-bold">Room {rm?.room_number}</td>
                          <td className="py-2 text-muted-foreground">{rm?.room_name}</td>
                          <td className="py-2 text-muted-foreground">{r.booking_date}</td>
                          <td className="py-2 text-right font-mono">{inr(taxable)}</td>
                          <td className="py-2 text-right font-mono">{inr(gst)}</td>
                          <td className="py-2 text-right font-mono font-semibold">{inr(gross)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-bold">
                      <td colSpan={5} className="py-2.5 text-right">Grand Total:</td>
                      <td className="py-2.5 text-right font-mono text-sm">{inr(getGroupFinancials(selectedGroup).grandTotal)}</td>
                    </tr>
                    <tr className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      <td colSpan={5} className="py-1 text-right">Total Advance / Payments Made:</td>
                      <td className="py-1 text-right font-mono">-{inr(getGroupFinancials(selectedGroup).totalPaid)}</td>
                    </tr>
                    <tr className="border-t border-border text-base font-bold">
                      <td colSpan={5} className="py-2 text-right">Net Balance Due:</td>
                      <td className="py-2 text-right font-mono text-brass">{inr(getGroupFinancials(selectedGroup).balance)}</td>
                    </tr>
                  </tfoot>
                </table>

                {/* Footer Signatures */}
                <div className="flex justify-between items-end pt-8 border-t border-border/70 text-[11px] text-muted-foreground">
                  <div>
                    <div className="h-10 border-b border-border/60 w-40"></div>
                    <div className="pt-1">Guest / Group Signatory</div>
                  </div>
                  <div className="text-right">
                    <div className="h-10 border-b border-border/60 w-40"></div>
                    <div className="pt-1">Hotel DRB Authorized Signatory</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPrintModalOpen(false)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.print()}
                  className="bg-brass text-gold-foreground hover:opacity-90"
                >
                  <Printer className="size-3.5 mr-1" /> Print Official Statement
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
