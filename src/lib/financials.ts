export interface ReservationFinancials {
  originalGross: number;
  baseAmt: number;
  addlCharges: number;
  approvedDiscount: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  grandTotal: number;
  paid: number;
  balance: number;
  isPaid: boolean;
  isPartial: boolean;
  isDiscounted: boolean;
  isComplimentary: boolean;
  payment?: any;
  isPartyHall: boolean;
  gstRatePercent: number;
  cgstRatePercent: number;
  sgstRatePercent: number;
}

/**
 * Calculates total approved discounts for a reservation
 */
export function getApprovedDiscount(resId?: string, discounts: any[] = []): number {
  if (!resId) return 0;
  return discounts
    .filter(
      (d) =>
        (d.reservation_id === resId || d.reservation_id?.toLowerCase() === resId.toLowerCase()) &&
        d.status === "APPROVED"
    )
    .reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);
}

/**
 * Canonical unified financial calculation for folios, reservations, and payments.
 * Guarantees: grandTotal === taxableValue + totalGst exactly (and taxableValue + cgst + sgst === grandTotal)
 * Properly isolates and accounts for 100% complimentary discounts (e.g. VIP / Municipality waivers).
 */
export function getReservationFinancials(
  r: any,
  payments: any[] = [],
  discounts: any[] = [],
  rooms: any[] = []
): ReservationFinancials {
  if (!r) {
    return {
      originalGross: 0,
      baseAmt: 0,
      addlCharges: 0,
      approvedDiscount: 0,
      taxableValue: 0,
      cgst: 0,
      sgst: 0,
      totalGst: 0,
      grandTotal: 0,
      paid: 0,
      balance: 0,
      isPaid: false,
      isPartial: false,
      isDiscounted: false,
      isComplimentary: false,
      isPartyHall: false,
      gstRatePercent: 5,
      cgstRatePercent: 2.5,
      sgstRatePercent: 2.5,
    };
  }

  const p = payments.find(
    (pay) => pay.reservation_id === r.id || pay.reservation_id?.toLowerCase() === r.id?.toLowerCase()
  );
  const approvedDiscount = getApprovedDiscount(r.id, discounts);
  const addlCharges = Number(r.additional_charges) || 0;

  const payTotal = Number(p?.total_amount) || 0;
  const resBase = Number(r.base_amount) || 0;
  const isPartyHall = r.resource_type === "PARTY_HALL";
  const gstRate = isPartyHall ? 0.18 : 0.05;
  const gstDivisor = 1 + gstRate;

  // Determine pre-discount gross value
  let originalGross = Math.max(payTotal, resBase);
  if (approvedDiscount > 0) {
    if (payTotal === 0 && resBase === 0) {
      originalGross = approvedDiscount;
    } else if (originalGross <= approvedDiscount) {
      originalGross = Math.max(originalGross, approvedDiscount);
    } else if (payTotal > 0 && resBase > 0 && Math.abs(payTotal - resBase) >= approvedDiscount - 1) {
      // One of the totals was already discounted in DB
      originalGross = Math.max(payTotal, resBase) + (payTotal < resBase ? approvedDiscount : 0);
    }
  }

  let grandTotal = 0;
  let taxableValue = 0;

  if (approvedDiscount >= (originalGross + addlCharges) && (originalGross + addlCharges) > 0) {
    // 100% complimentary discount
    grandTotal = 0;
    taxableValue = 0;
  } else if (payTotal > 0) {
    // If payTotal is already discounted or pre-discount
    if (originalGross > payTotal && payTotal + approvedDiscount >= originalGross - 1) {
      grandTotal = Math.max(0, payTotal + addlCharges);
    } else {
      grandTotal = Math.max(0, payTotal + addlCharges - approvedDiscount);
    }
    taxableValue = Math.round(grandTotal / gstDivisor);
  } else if (resBase > 0) {
    const selRoom = rooms.find((rm) => rm.id === r.room_id);
    const isRoomTotalInclusive =
      selRoom && (resBase === selRoom.total_bill || resBase > Number(selRoom.price));

    if (isRoomTotalInclusive || isPartyHall) {
      grandTotal = Math.max(0, resBase + addlCharges - approvedDiscount);
      taxableValue = Math.round(grandTotal / gstDivisor);
    } else {
      taxableValue = Math.max(0, resBase + addlCharges - approvedDiscount);
      grandTotal = Math.round(taxableValue * (1 + gstRate));
    }
  }

  const totalGst = Math.max(0, grandTotal - taxableValue);
  const cgst = Number((totalGst / 2).toFixed(2));
  const sgst = Number((totalGst - cgst).toFixed(2));

  const paid = Number(p?.paid_amount) || 0;
  const balance = Math.max(0, grandTotal - paid);

  const isComplimentary = approvedDiscount > 0 && grandTotal === 0;
  const isDiscounted = approvedDiscount > 0;
  const isPaid = (balance === 0 && (grandTotal > 0 || isComplimentary)) || (paid >= grandTotal && grandTotal > 0);
  const isPartial = !isPaid && (p?.status === "PARTIAL" || paid > 0);

  return {
    originalGross,
    baseAmt: taxableValue,
    addlCharges,
    approvedDiscount,
    taxableValue,
    cgst,
    sgst,
    totalGst,
    grandTotal,
    paid,
    balance,
    isPaid,
    isPartial,
    isDiscounted,
    isComplimentary,
    payment: p,
    isPartyHall,
    gstRatePercent: isPartyHall ? 18 : 5,
    cgstRatePercent: isPartyHall ? 9 : 2.5,
    sgstRatePercent: isPartyHall ? 9 : 2.5,
  };
}
