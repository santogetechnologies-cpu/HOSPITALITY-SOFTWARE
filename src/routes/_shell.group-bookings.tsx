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
  Info,
  Pencil,
  Percent,
  Mail,
  FileText
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
    discounts,
    paymentSplits,
    groupBookings,
    addGroupBooking,
    groupExistingReservations,
    checkInGroupRoom,
    checkInAllGroupRooms,
    checkOutGroupRoom,
    settleGroupMaster,
    updateGroupBooking,
    updateGroupBookingPayer,
    closeGroupBooking,
    deleteGroupBooking,
    editBillFinancials,
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

  // Group Booking Edit State (Accessible to all logins)
  const [editGroupModalOpen, setEditGroupModalOpen] = React.useState(false);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = React.useState<GroupBooking | null>(null);
  const [editGroupName, setEditGroupName] = React.useState("");
  const [editContactName, setEditContactName] = React.useState("");
  const [editContactPhone, setEditContactPhone] = React.useState("");
  const [editContactEmail, setEditContactEmail] = React.useState("");
  const [editGroupPayerType, setEditGroupPayerType] = React.useState<"LAST_ROOM" | "CUSTOM_ROOM">("LAST_ROOM");
  const [editGroupCustomPayerRoomId, setEditGroupCustomPayerRoomId] = React.useState<string>("");
  const [editGroupStatus, setEditGroupStatus] = React.useState<"ACTIVE" | "COMPLETED">("ACTIVE");
  const [editGroupNotes, setEditGroupNotes] = React.useState("");
  const [savingGroupEdit, setSavingGroupEdit] = React.useState(false);

  // Comprehensive Room Folio Edit State (Accessible to all logins)
  const [editFolioModalOpen, setEditFolioModalOpen] = React.useState(false);
  const [selectedResForFolioEdit, setSelectedResForFolioEdit] = React.useState<Reservation | null>(null);
  const [editBaseAmount, setEditBaseAmount] = React.useState("");
  const [editAddlCharges, setEditAddlCharges] = React.useState("");
  const [editDiscount, setEditDiscount] = React.useState("");
  const [editAdvancePaid, setEditAdvancePaid] = React.useState("");
  const [editLaterReceived, setEditLaterReceived] = React.useState("");
  const [editTotalPaid, setEditTotalPaid] = React.useState("");
  const [editPaymentMethod, setEditPaymentMethod] = React.useState<string>("CASH");
  const [isEditSplitMode, setIsEditSplitMode] = React.useState(false);
  const [editSplitRows, setEditSplitRows] = React.useState<SplitRow[]>([]);
  const [editGuestName, setEditGuestName] = React.useState("");
  const [editGuestPhone, setEditGuestPhone] = React.useState("");
  const [editGuestEmail, setEditGuestEmail] = React.useState("");
  const [editGuestCompany, setEditGuestCompany] = React.useState("");
  const [editGuestGst, setEditGuestGst] = React.useState("");
  const [editGuestAddress, setEditGuestAddress] = React.useState("");
  const [editCheckInDate, setEditCheckInDate] = React.useState("");
  const [editCheckInTime, setEditCheckInTime] = React.useState("12:00");
  const [editCheckOutDate, setEditCheckOutDate] = React.useState("");
  const [editCheckOutTime, setEditCheckOutTime] = React.useState("12:00");
  const [editFolioNotes, setEditFolioNotes] = React.useState("");
  const [savingFolioEdit, setSavingFolioEdit] = React.useState(false);

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
  const [checkInTime, setCheckInTime] = React.useState("12:00");
  const [checkOutTime, setCheckOutTime] = React.useState("12:00");
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
        const rStart = new Date(res.start_time || `${res.booking_date}T12:00:00`).getTime();
        const rEnd = new Date(res.end_time || (res.start_time ? new Date(new Date(res.start_time).getTime() + 24 * 60 * 60 * 1000).toISOString() : `${res.booking_date}T12:00:00`)).getTime();
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

    const activeGroupRes = groupRes.filter((res) => res.status !== "COMPLETED");
    const masterPayerRes = grp.payer_type === "CUSTOM_ROOM"
      ? groupRes.find((res) => res.room_id === grp.custom_payer_room_id)
      : (activeGroupRes.length > 0 ? activeGroupRes[activeGroupRes.length - 1] : groupRes[groupRes.length - 1]);

    groupRes.forEach((r) => {
      const pay = payments.find((p) => p.reservation_id === r.id);
      const rm = rooms.find((room) => room.id === r.room_id);
      const isMasterRoom = masterPayerRes && masterPayerRes.id === r.id;

      let roomCharge = 0;
      if (Number(r.base_amount) > 0) {
        const isInclusive = rm && (r.base_amount === rm.total_bill || r.base_amount > Number(rm.price));
        roomCharge = isInclusive ? Number(r.base_amount) : Math.round(Number(r.base_amount) * 1.05);
      } else if (!isMasterRoom && Number(pay?.total_amount) > 0) {
        roomCharge = Number(pay.total_amount);
      } else {
        const rmPrice = Number(rm?.price) || 1000;
        roomCharge = Math.round(rmPrice * nights * 1.05);
      }

      const addl = Number(r.additional_charges) || 0;
      const paid = Number(pay?.paid_amount) || 0;
      const tr = Number(r.transferred_amount) || 0;

      totalBase += roomCharge;
      totalAddl += addl;
      totalPaid += paid;
      totalTransferred += tr;
    });

    const grandTotal = totalBase + totalAddl;
    const activeRoomsCount = groupRes.filter((r) => r.status !== "COMPLETED").length;
    const completedRoomsCount = groupRes.filter((r) => r.status === "COMPLETED").length;
    
    // Group is fully settled if grp is COMPLETED or all rooms are completed and balance cleared
    let balance = Math.max(0, grandTotal - totalPaid);
    if (grp.status === "COMPLETED" || (activeRoomsCount === 0 && totalPaid >= grandTotal * 0.95)) {
      balance = 0;
    }

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

    const roomAmounts: Record<string, { baseAmount: number; totalAmount: number }> = {};
    selectedRoomIds.forEach((rId) => {
      const rm = rooms.find((r) => r.id === rId);
      const pricePerNight = Number(rm?.price) || 1000;
      const base = pricePerNight * nights;
      const total = Math.round(base * 1.05);
      roomAmounts[rId] = { baseAmount: base, totalAmount: total };
    });

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
        roomAmounts,
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

  // Handlers: Edit Group Details (Accessible to all logins)
  const handleOpenEditGroup = (grp: GroupBooking) => {
    setSelectedGroupForEdit(grp);
    setEditGroupName(grp.name || "");
    setEditContactName(grp.contact_name || "");
    setEditContactPhone(grp.contact_phone || "");
    setEditContactEmail(grp.contact_email || "");
    setEditGroupPayerType(grp.payer_type || "LAST_ROOM");
    setEditGroupCustomPayerRoomId(grp.custom_payer_room_id || "");
    setEditGroupStatus(grp.status as "ACTIVE" | "COMPLETED");
    setEditGroupNotes(grp.notes || "");
    setEditGroupModalOpen(true);
  };

  const handleSaveGroupEdit = async () => {
    if (!selectedGroupForEdit || savingGroupEdit) return;
    if (!editGroupName.trim()) {
      toast.error("Group name cannot be blank.");
      return;
    }
    setSavingGroupEdit(true);
    try {
      const res = await updateGroupBooking(selectedGroupForEdit.id, {
        name: editGroupName.trim(),
        contactName: editContactName.trim(),
        contactPhone: editContactPhone.trim(),
        contactEmail: editContactEmail.trim(),
        payerType: editGroupPayerType,
        customPayerRoomId: editGroupPayerType === "CUSTOM_ROOM" ? editGroupCustomPayerRoomId : undefined,
        status: editGroupStatus,
        notes: editGroupNotes.trim(),
      });
      if (res.success) {
        toast.success(`Group "${editGroupName}" updated successfully!`);
        setEditGroupModalOpen(false);
      } else {
        toast.error(res.error || "Failed to update group details");
      }
    } finally {
      setSavingGroupEdit(false);
    }
  };

  // Handlers: Edit Room Folio Financials & Stay (Accessible to all logins)
  const handleOpenEditFolio = (r: Reservation) => {
    setSelectedResForFolioEdit(r);
    const g = getGuest(r.guest_id);
    const p = payments.find((pay) => pay.reservation_id === r.id);
    const d = discounts.find((disc) => disc.reservation_id === r.id && disc.status === "APPROVED");
    const rm = getRoom(r.room_id);

    let roomBase = 0;
    if (Number(r.base_amount) > 0) {
      const isInclusive = rm && (r.base_amount === rm.total_bill || r.base_amount > Number(rm.price));
      roomBase = isInclusive ? Number(r.base_amount) : Math.round(Number(r.base_amount) * 1.05);
    } else if (Number(p?.total_amount) > 0) {
      roomBase = Number(p.total_amount);
    } else {
      const rmPrice = Number(rm?.price) || 1000;
      roomBase = Math.round(rmPrice * nights * 1.05);
    }

    setEditGuestName(g?.name || (r as any).customer_name || "");
    setEditGuestPhone(g?.phone || (r as any).customer_phone || (r as any).phone || "");
    setEditGuestEmail(g?.email || (r as any).email || "");
    setEditGuestCompany((r as any).company_name || (g as any)?.company_name || "");
    setEditGuestGst((r as any).gst_number || g?.gst_number || "");
    setEditGuestAddress((r as any).address || g?.address || "");

    const startStr = r.start_time || `${r.booking_date || todayStr}T12:00:00`;
    const sDate = new Date(startStr);
    let endStr = r.end_time;
    if (!endStr) {
      if (!isNaN(sDate.getTime())) {
        endStr = new Date(sDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
      } else {
        endStr = startStr;
      }
    }
    const eDate = new Date(endStr);

    setEditCheckInDate(startStr.split("T")[0] || todayStr);
    const sH = !isNaN(sDate.getTime()) ? String(sDate.getHours()).padStart(2, "0") : "12";
    const sM = !isNaN(sDate.getTime()) ? String(sDate.getMinutes()).padStart(2, "0") : "00";
    setEditCheckInTime(`${sH}:${sM}`);

    setEditCheckOutDate(endStr.split("T")[0] || todayStr);
    const eH = !isNaN(eDate.getTime()) ? String(eDate.getHours()).padStart(2, "0") : sH;
    const eM = !isNaN(eDate.getTime()) ? String(eDate.getMinutes()).padStart(2, "0") : sM;
    setEditCheckOutTime(`${eH}:${eM}`);

    setEditFolioNotes(r.notes || "");

    setEditBaseAmount(String(Number(r.base_amount) || roomBase || 0));
    setEditAddlCharges(String(Number(r.additional_charges) || 0));
    setEditDiscount(String(d ? Number(d.discount_amount) || 0 : 0));

    const totalPaid = Number(p?.paid_amount) || 0;
    setEditTotalPaid(String(totalPaid));
    setEditAdvancePaid(String(totalPaid));
    setEditLaterReceived("0");

    const existingSplits = paymentSplits.filter(
      (s) => s.reservation_id === r.id || (p && s.payment_id === p.id)
    );

    if (existingSplits.length > 1) {
      setIsEditSplitMode(true);
      setEditSplitRows(
        existingSplits.map((s) => ({
          id: s.id || crypto.randomUUID(),
          method: (s.method as any) || "CASH",
          amount: Number(s.amount) || 0,
          reference_note: s.reference_note || "",
        }))
      );
      setEditPaymentMethod("OTHER");
    } else {
      setIsEditSplitMode(false);
      const m = p?.payment_method || "CASH";
      setEditPaymentMethod(m);
      setEditSplitRows([
        { id: "1", method: (m as any) || "CASH", amount: totalPaid, reference_note: "" }
      ]);
    }

    setEditFolioModalOpen(true);
  };

  const handleSaveEditFolio = async () => {
    if (!selectedResForFolioEdit || savingFolioEdit) return;
    if (!editGuestName.trim()) {
      toast.error("Guest full name cannot be blank.");
      return;
    }

    const base = Math.max(0, Number(editBaseAmount) || 0);
    const addl = Math.max(0, Number(editAddlCharges) || 0);
    const disc = Math.max(0, Number(editDiscount) || 0);
    const adv = Math.max(0, Number(editAdvancePaid) || 0);
    const lat = Math.max(0, Number(editLaterReceived) || 0);
    const computedPaid = isEditSplitMode
      ? editSplitRows.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
      : adv + lat;

    setSavingFolioEdit(true);
    try {
      const res = await editBillFinancials({
        reservationId: selectedResForFolioEdit.id,
        baseAmount: base,
        additionalCharges: addl,
        discountAmount: disc,
        advancePaid: adv,
        laterReceived: lat,
        totalPaid: computedPaid,
        paymentMethod: isEditSplitMode
          ? `Split (${editSplitRows.map((s) => s.method).join("+")})`
          : editPaymentMethod,
        splits: isEditSplitMode ? editSplitRows : undefined,
        guestDetails: {
          name: editGuestName.trim(),
          phone: editGuestPhone.trim(),
          email: editGuestEmail.trim(),
          company_name: editGuestCompany.trim(),
          gst_number: editGuestGst.trim().toUpperCase(),
          address: editGuestAddress.trim(),
        },
        stayDates: {
          checkInDate: editCheckInDate,
          checkInTime: editCheckInTime,
          checkOutDate: editCheckOutDate,
          checkOutTime: editCheckOutTime,
        },
        notes: editFolioNotes.trim(),
      });

      if (res.success) {
        toast.success("Room folio & financial records updated successfully!");
        setEditFolioModalOpen(false);
      } else {
        toast.error(res.error || "Failed to update folio financials");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update folio");
    } finally {
      setSavingFolioEdit(false);
    }
  };

  // Computed totals for Folio Edit Modal
  const folioGross = Math.round(((Number(editBaseAmount) || 0) * 1.05) + (Number(editAddlCharges) || 0));
  const folioGrandTotal = Math.max(0, folioGross - (Number(editDiscount) || 0));
  const folioTaxable = Math.round(folioGrandTotal / 1.05);
  const folioGst = folioGrandTotal - folioTaxable;
  const folioPaid = isEditSplitMode
    ? editSplitRows.reduce((sum, s) => sum + (Number(s.amount) || 0), 0)
    : (Number(editAdvancePaid) || 0) + (Number(editLaterReceived) || 0);
  const folioBalance = Math.max(0, folioGrandTotal - folioPaid);

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
                      onClick={() => handleOpenEditGroup(grp)}
                      className="rounded-xl border-border text-xs font-medium text-foreground hover:bg-muted shadow-2xs"
                    >
                      <Pencil className="size-3.5 mr-1 text-brass" /> Edit Group
                    </Button>

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
                        const isLastActive = (activeGroupRes.length === 1 && activeGroupRes[0].id === r.id) || (activeGroupRes.length === 0 && fin.groupRes[fin.groupRes.length - 1]?.id === r.id);
                        const isMasterPayer = isCustomPayer || isLastActive;

                        const transferredAmt = Number(r.transferred_amount) || 0;
                        let roomBase = 0;
                        if (Number(r.base_amount) > 0) {
                          const isInclusive = rm && (r.base_amount === rm.total_bill || r.base_amount > Number(rm.price));
                          roomBase = isInclusive ? Number(r.base_amount) : Math.round(Number(r.base_amount) * 1.05);
                        } else if (!isMasterPayer && Number(pay?.total_amount) > 0) {
                          roomBase = Number(pay.total_amount);
                        } else {
                          const rmPrice = Number(rm?.price) || 1000;
                          roomBase = Math.round(rmPrice * nights * 1.05);
                        }
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
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEditFolio(r)}
                                  className="h-7 text-xs font-medium border-border hover:bg-muted"
                                  title="Edit Room Folio, Financials & Payment Mode"
                                >
                                  <Pencil className="size-3 mr-1 text-brass" /> Edit
                                </Button>

                                {!isCompleted && (
                                  <>
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
                                  </>
                                )}
                              </div>
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
                  onChange={(e) => {
                    const val = e.target.value;
                    setCheckInTime(val);
                    setCheckOutTime(val);
                  }}
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

      {/* Edit Group Booking Modal */}
      <Dialog open={editGroupModalOpen} onOpenChange={setEditGroupModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="size-5 text-brass" /> Edit Group Booking
            </DialogTitle>
            <DialogDescription>
              Update group metadata, contact details, master payer strategy, and status.
            </DialogDescription>
          </DialogHeader>

          {selectedGroupForEdit && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Group Name *</Label>
                  <Input
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    placeholder="e.g. Acme Corp Conference"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Contact Person *</Label>
                  <Input
                    value={editContactName}
                    onChange={(e) => setEditContactName(e.target.value)}
                    placeholder="Contact name"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Contact Phone</Label>
                  <Input
                    value={editContactPhone}
                    onChange={(e) => setEditContactPhone(e.target.value)}
                    placeholder="Phone number"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Contact Email</Label>
                  <Input
                    value={editContactEmail}
                    onChange={(e) => setEditContactEmail(e.target.value)}
                    placeholder="Email address"
                    className="h-9"
                  />
                </div>
              </div>

              {/* Master Billing Strategy */}
              <div className="space-y-2.5 rounded-xl border border-border bg-muted/20 p-3.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Receipt className="size-3.5 text-brass" /> Master Payer Rule
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    onClick={() => setEditGroupPayerType("LAST_ROOM")}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      editGroupPayerType === "LAST_ROOM"
                        ? "border-brass bg-brass/10 font-medium"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editGroupPayer"
                      checked={editGroupPayerType === "LAST_ROOM"}
                      onChange={() => setEditGroupPayerType("LAST_ROOM")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-foreground">Last Departing Room</div>
                      <div className="text-[11px] text-muted-foreground">Departing rooms transfer bills sequentially to the last remaining room.</div>
                    </div>
                  </label>

                  <label
                    onClick={() => setEditGroupPayerType("CUSTOM_ROOM")}
                    className={`flex items-start gap-2.5 p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                      editGroupPayerType === "CUSTOM_ROOM"
                        ? "border-brass bg-brass/10 font-medium"
                        : "border-border bg-card hover:bg-muted/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="editGroupPayer"
                      checked={editGroupPayerType === "CUSTOM_ROOM"}
                      onChange={() => setEditGroupPayerType("CUSTOM_ROOM")}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-semibold text-foreground">Designated Base Room</div>
                      <div className="text-[11px] text-muted-foreground">All rooms transfer outstanding bills to one specific leader room.</div>
                    </div>
                  </label>
                </div>

                {editGroupPayerType === "CUSTOM_ROOM" && (
                  <div className="pt-2 space-y-1">
                    <Label className="text-xs">Select Designated Master Room</Label>
                    <Select
                      value={editGroupCustomPayerRoomId}
                      onValueChange={(val) => setEditGroupCustomPayerRoomId(val)}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Choose Master Room" />
                      </SelectTrigger>
                      <SelectContent>
                        {getGroupReservations(selectedGroupForEdit.id).map((r) => {
                          const rm = getRoom(r.room_id);
                          return (
                            <SelectItem key={r.room_id} value={r.room_id}>
                              Room {rm?.room_number || r.room_id} ({rm?.room_name || "Room"})
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Status & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Group Status</Label>
                  <Select
                    value={editGroupStatus}
                    onValueChange={(val: "ACTIVE" | "COMPLETED") => setEditGroupStatus(val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active (Ongoing Stay)</SelectItem>
                      <SelectItem value="COMPLETED">Completed (Settled / Archived)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-medium">Group Notes / Special Instructions</Label>
                  <Input
                    value={editGroupNotes}
                    onChange={(e) => setEditGroupNotes(e.target.value)}
                    placeholder="e.g. VIP guest, company billed, early breakfast requested"
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setEditGroupModalOpen(false)}
                  disabled={savingGroupEdit}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveGroupEdit}
                  disabled={savingGroupEdit}
                  className="bg-brass text-gold-foreground hover:opacity-90 font-medium"
                >
                  {savingGroupEdit ? "Saving Changes..." : "Save Group Details"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Comprehensive Room Folio Edit Modal (Accessible to all logins) */}
      <Dialog open={editFolioModalOpen} onOpenChange={setEditFolioModalOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Pencil className="size-4 text-brass" /> Edit Room Folio & Financial Records
            </DialogTitle>
            <DialogDescription className="text-xs">
              Directly adjust tariff, payment modes, multi-method splits, advances, later received, and guest/company details.
            </DialogDescription>
          </DialogHeader>

          {selectedResForFolioEdit && (
            <div className="space-y-5 pt-2">
              {/* Guest & Billing Information */}
              <div className="rounded-xl border border-border bg-card/60 p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground border-b border-border/60 pb-2">
                  <Users className="size-3.5 text-brass" /> Guest & Company Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Guest Full Name *</Label>
                    <Input
                      value={editGuestName}
                      onChange={(e) => setEditGuestName(e.target.value)}
                      placeholder="Primary guest name"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Phone Number</Label>
                    <Input
                      value={editGuestPhone}
                      onChange={(e) => setEditGuestPhone(e.target.value)}
                      placeholder="+91..."
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Email Address</Label>
                    <Input
                      value={editGuestEmail}
                      onChange={(e) => setEditGuestEmail(e.target.value)}
                      placeholder="guest@example.com"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Company Name (B2B)</Label>
                    <Input
                      value={editGuestCompany}
                      onChange={(e) => setEditGuestCompany(e.target.value)}
                      placeholder="Corporate bill to"
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">GSTIN (15 Digits)</Label>
                    <Input
                      value={editGuestGst}
                      onChange={(e) => setEditGuestGst(e.target.value.toUpperCase())}
                      placeholder="33AAAAA0000A1Z5"
                      className="h-8 text-xs uppercase font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Billing Address</Label>
                    <Input
                      value={editGuestAddress}
                      onChange={(e) => setEditGuestAddress(e.target.value)}
                      placeholder="Street, City, State"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Stay Dates & Check-In / Check-Out Times */}
              <div className="rounded-xl border border-border bg-card/60 p-3.5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground border-b border-border/60 pb-2">
                  <Calendar className="size-3.5 text-brass" /> Stay Schedule & 24-Hour Cycle
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Arrival Date</Label>
                    <Input
                      type="date"
                      value={editCheckInDate}
                      onChange={(e) => setEditCheckInDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Arrival Time</Label>
                    <Input
                      type="time"
                      value={editCheckInTime}
                      onChange={(e) => setEditCheckInTime(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Departure Date</Label>
                    <Input
                      type="date"
                      value={editCheckOutDate}
                      onChange={(e) => setEditCheckOutDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Departure Time</Label>
                    <Input
                      type="time"
                      value={editCheckOutTime}
                      onChange={(e) => setEditCheckOutTime(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Breakdown & Split Payments */}
              <div className="rounded-xl border border-border bg-card/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Receipt className="size-3.5 text-brass" /> Tariff, Inflows & Payment Breakdown
                  </div>
                  <Button
                    type="button"
                    variant={isEditSplitMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const next = !isEditSplitMode;
                      setIsEditSplitMode(next);
                      if (next && editSplitRows.length === 0) {
                        const total = (Number(editAdvancePaid) || 0) + (Number(editLaterReceived) || 0) || folioGrandTotal;
                        const half = Math.round(total / 2);
                        setEditSplitRows([
                          { id: "1", method: "CASH", amount: half, reference_note: "Cash portion" },
                          { id: "2", method: "UPI", amount: total - half, reference_note: "UPI portion" }
                        ]);
                      }
                    }}
                    className={`h-7 text-[11px] px-2.5 rounded-lg ${isEditSplitMode ? "bg-brass text-gold-foreground" : "border-border"}`}
                  >
                    <CreditCard className="size-3 mr-1" /> {isEditSplitMode ? "Split Payment Mode (Active)" : "Enable Split Payment"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Base Stay Tariff (Taxable ₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editBaseAmount}
                      onChange={(e) => setEditBaseAmount(e.target.value)}
                      className="h-8 text-xs font-mono font-medium"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Additional Charges (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editAddlCharges}
                      onChange={(e) => setEditAddlCharges(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">Approved Discount (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={editDiscount}
                      onChange={(e) => setEditDiscount(e.target.value)}
                      className="h-8 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium"
                    />
                  </div>
                </div>

                {/* Split Payment Editor or Single Payment Mode */}
                {isEditSplitMode ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
                      <span className="font-semibold text-muted-foreground">Multi-Method Split Breakdown:</span>
                      <div className="flex items-center gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-1.5 text-brass hover:bg-brass/10"
                          onClick={() => {
                            const tot = folioGrandTotal;
                            const half = Math.round(tot / 2);
                            setEditSplitRows([
                              { id: "1", method: "CASH", amount: half, reference_note: "50% Cash" },
                              { id: "2", method: "UPI", amount: tot - half, reference_note: "50% UPI" }
                            ]);
                          }}
                        >
                          50% Cash + 50% UPI
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-1.5 text-brass hover:bg-brass/10"
                          onClick={() => {
                            const tot = folioGrandTotal;
                            const half = Math.round(tot / 2);
                            setEditSplitRows([
                              { id: "1", method: "CARD", amount: half, reference_note: "50% Card" },
                              { id: "2", method: "UPI", amount: tot - half, reference_note: "50% UPI" }
                            ]);
                          }}
                        >
                          50% Card + 50% UPI
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-1.5 text-brass hover:bg-brass/10"
                          onClick={() => {
                            setEditSplitRows([
                              { id: "1", method: "CASH", amount: folioGrandTotal, reference_note: "100% Cash" }
                            ]);
                          }}
                        >
                          100% Cash
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[10px] px-1.5 text-brass hover:bg-brass/10"
                          onClick={() => {
                            setEditSplitRows([
                              { id: "1", method: "UPI", amount: folioGrandTotal, reference_note: "100% UPI" }
                            ]);
                          }}
                        >
                          100% UPI
                        </Button>
                      </div>
                    </div>

                    <SplitPaymentInput
                      value={editSplitRows}
                      onChange={setEditSplitRows}
                      totalAmount={folioGrandTotal}
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Payment Mode</Label>
                      <Select
                        value={editPaymentMethod}
                        onValueChange={(val) => setEditPaymentMethod(val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select method" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CASH">Cash</SelectItem>
                          <SelectItem value="UPI">UPI / QR Code</SelectItem>
                          <SelectItem value="CARD">Card / POS</SelectItem>
                          <SelectItem value="COMPANY">Company / Bill to Company</SelectItem>
                          <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                          <SelectItem value="OTHER">Other / Voucher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Advance Received (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editAdvancePaid}
                        onChange={(e) => setEditAdvancePaid(e.target.value)}
                        className="h-8 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-medium"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-medium text-muted-foreground">Later / Settlement Paid (₹)</Label>
                      <Input
                        type="number"
                        min="0"
                        value={editLaterReceived}
                        onChange={(e) => setEditLaterReceived(e.target.value)}
                        className="h-8 text-xs font-mono font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Real-time Calculation Summary Box */}
                <div className="mt-3 rounded-xl border border-border/80 bg-muted/40 p-3 text-xs space-y-1.5 font-mono">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxable Value (Base):</span>
                    <span>{inr(folioTaxable)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>GST (5% SGST+CGST):</span>
                    <span>{inr(folioGst)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Gross Total:</span>
                    <span>{inr(folioGross)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground border-t border-border/60 pt-1">
                    <span>Grand Effective Total:</span>
                    <span>{inr(folioGrandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span>Total Paid (Inflows):</span>
                    <span>{inr(folioPaid)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold border-t border-border/60 pt-1">
                    <span className="text-foreground">Remaining Balance:</span>
                    <span className={folioBalance === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}>
                      {folioBalance === 0 ? "Fully Paid (₹0)" : inr(folioBalance)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Folio Internal Notes */}
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">Folio Internal Notes / Remarks</Label>
                <Input
                  value={editFolioNotes}
                  onChange={(e) => setEditFolioNotes(e.target.value)}
                  placeholder="e.g. advance paid via GooglePay, 50% cash settled at counter"
                  className="h-8 text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => setEditFolioModalOpen(false)}
                  disabled={savingFolioEdit}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEditFolio}
                  disabled={savingFolioEdit}
                  className="bg-brass text-gold-foreground hover:opacity-90 font-medium text-xs shadow-sm"
                >
                  {savingFolioEdit ? "Saving Folio..." : "Save Folio Financials"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
