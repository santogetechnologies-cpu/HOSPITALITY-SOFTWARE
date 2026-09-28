/**
 * Standard Sequential GST Invoice Numbering Utility for HOTEL DRB.
 * August 31st last invoice number was 962.
 * September 1st onwards invoice sequence begins strictly at 963 (continuous integer sequence).
 */

export interface InvoiceSequenceOptions {
  startingInvoiceNumber?: number;
  sequenceStartDate?: string;
}

/**
 * Builds a deterministic mapping of reservation/payment ID -> sequential invoice number
 */
export function buildInvoiceNumberMap(
  reservations: any[] = [],
  options: InvoiceSequenceOptions = {}
): Map<string, number> {
  const startNum = options.startingInvoiceNumber ?? 963;
  const startDateStr = options.sequenceStartDate ?? "2026-09-01";
  const startTimestamp = new Date(`${startDateStr}T00:00:00`).getTime();

  // Filter non-cancelled reservations on or after sequence start date
  const validRes = reservations.filter(
    (r) => r.status !== "CANCELLED"
  );

  // Sort chronologically by check-in / start time / booking date / creation
  const sorted = [...validRes].sort((a, b) => {
    const timeA = new Date(a.start_time || a.booking_date || a.created_at || "2026-09-01").getTime();
    const timeB = new Date(b.start_time || b.booking_date || b.created_at || "2026-09-01").getTime();
    if (timeA !== timeB) return timeA - timeB;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });

  const map = new Map<string, number>();
  
  // Separate into pre-Sept 1 and post-Sept 1 if needed
  let seqCounter = startNum;
  sorted.forEach((r) => {
    const rTime = new Date(r.start_time || r.booking_date || r.created_at || "2026-09-01").getTime();
    if (rTime >= startTimestamp) {
      map.set(r.id, seqCounter);
      if (r.id) map.set(r.id.toLowerCase(), seqCounter);
      seqCounter++;
    } else {
      // Prior to Sept 1, offset below 963
      const legacyNum = Math.max(1, 962 - (sorted.length - map.size));
      map.set(r.id, legacyNum);
      if (r.id) map.set(r.id.toLowerCase(), legacyNum);
    }
  });

  return map;
}

/**
 * Gets the sequential invoice number string for a given reservation
 */
export function getSequentialInvoiceNumber(
  reservation: any,
  allReservations: any[] = [],
  options: InvoiceSequenceOptions = {}
): string {
  if (!reservation) return "963";
  const map = buildInvoiceNumberMap(allReservations, options);
  const found = map.get(reservation.id) || (reservation.id ? map.get(reservation.id.toLowerCase()) : undefined);
  if (found !== undefined) {
    return String(found);
  }
  return "963";
}
