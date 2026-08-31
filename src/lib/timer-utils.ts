import { Reservation } from "./pms-data";
import { SettingsState } from "./use-settings";

export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(":");
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
}

export function calculateDurationHours(startTime: string, endTime: string): number {
  const startMins = parseTimeToMinutes(startTime);
  const endMins = parseTimeToMinutes(endTime);
  let diff = endMins - startMins;
  if (diff <= 0) diff = 60; // minimum 1 hour if end <= start
  return Math.round((diff / 60) * 10) / 10;
}

export function calculateHallPrice(startTime: string, endTime: string, hourlyRate: number): number {
  const hours = calculateDurationHours(startTime, endTime);
  return Math.max(1, hours) * (hourlyRate || 3000);
}

export type TimerStatus = {
  tone: "info" | "success" | "warning" | "destructive" | "gold";
  label: string;
  subLabel?: string;
  isOverdue: boolean;
  overdueMinutes: number;
  overdueHours: number;
  calculatedExtraFee: number;
};

export function getStayTimerStatus(
  res: Reservation,
  settings: Partial<SettingsState> = {}
): TimerStatus {
  if (res.status === "COMPLETED" || res.status === "CANCELLED") {
    return {
      tone: "success",
      label: "Stay Completed",
      isOverdue: false,
      overdueMinutes: 0,
      overdueHours: 0,
      calculatedExtraFee: 0,
    };
  }

  const now = Date.now();
  const checkoutTimeStr = settings.checkOutStandardTime || "11:00";
  const lateFeePerHour = settings.roomLateCheckoutFeePerHour || 500;
  const graceMinutes = settings.gracePeriodMinutes || 15;

  const endDateStr = res.end_time
    ? res.end_time
    : `${res.booking_date}T${checkoutTimeStr}:00`;

  const endTs = new Date(endDateStr).getTime();

  if (res.status === "OCCUPIED") {
    const diffMs = endTs - now;
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins > 0) {
      const hrs = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return {
        tone: diffMins < 120 ? "warning" : "success",
        label: hrs > 0 ? `${hrs}h ${mins}m remaining` : `${mins}m remaining`,
        subLabel: `Expected Out: ${new Date(endTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        isOverdue: false,
        overdueMinutes: 0,
        overdueHours: 0,
        calculatedExtraFee: 0,
      };
    } else {
      const overdueMins = Math.abs(diffMins);
      const isPastGrace = overdueMins > graceMinutes;
      const overdueHrs = Math.max(1, Math.ceil((overdueMins - graceMinutes) / 60));
      const extraFee = isPastGrace ? overdueHrs * lateFeePerHour : 0;

      const hrs = Math.floor(overdueMins / 60);
      const mins = overdueMins % 60;

      return {
        tone: "destructive",
        label: `Late Check-out: +${hrs}h ${mins}m`,
        subLabel: isPastGrace ? `Late Fee Due: ₹${extraFee} (${overdueHrs}h @ ₹${lateFeePerHour}/hr)` : `Within grace (${graceMinutes}m)`,
        isOverdue: isPastGrace,
        overdueMinutes: overdueMins,
        overdueHours: overdueHrs,
        calculatedExtraFee: extraFee,
      };
    }
  }

  // Arrivals (PENDING / CONFIRMED)
  const checkinTimeStr = settings.checkInStandardTime || "14:00";
  const startTs = new Date(
    res.start_time || `${res.booking_date}T${checkinTimeStr}:00`
  ).getTime();

  const diffArrivalMs = startTs - now;
  const diffArrivalMins = Math.round(diffArrivalMs / 60000);

  if (diffArrivalMins > 0) {
    const hrs = Math.floor(diffArrivalMins / 60);
    const mins = diffArrivalMins % 60;
    return {
      tone: "info",
      label: `Expected in ${hrs > 0 ? `${hrs}h ` : ""}${mins}m`,
      subLabel: `Check-in window: ${new Date(startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      isOverdue: false,
      overdueMinutes: 0,
      overdueHours: 0,
      calculatedExtraFee: 0,
    };
  }

  return {
    tone: "gold",
    label: "Ready for Check-In",
    subLabel: "Arrival window is active",
    isOverdue: false,
    overdueMinutes: 0,
    overdueHours: 0,
    calculatedExtraFee: 0,
  };
}

export function getPartyHallTimerStatus(
  res: Reservation,
  settings: Partial<SettingsState> = {}
): TimerStatus {
  if (res.status === "COMPLETED" || res.status === "CANCELLED") {
    return {
      tone: "success",
      label: "Event Completed",
      isOverdue: false,
      overdueMinutes: 0,
      overdueHours: 0,
      calculatedExtraFee: 0,
    };
  }

  const now = Date.now();
  const startTs = new Date(res.start_time || `${res.booking_date}T10:00:00`).getTime();
  const endTs = new Date(res.end_time || `${res.booking_date}T14:00:00`).getTime();
  const hourlyRate = settings.partyHallHourlyRate || 3000;
  const graceMinutes = settings.gracePeriodMinutes || 15;

  if (now < startTs) {
    const diffMins = Math.round((startTs - now) / 60000);
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return {
      tone: "info",
      label: `Starts in ${hrs > 0 ? `${hrs}h ` : ""}${mins}m`,
      subLabel: `Schedule: ${new Date(startTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(endTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      isOverdue: false,
      overdueMinutes: 0,
      overdueHours: 0,
      calculatedExtraFee: 0,
    };
  }

  if (now >= startTs && now <= endTs) {
    const remainingMins = Math.round((endTs - now) / 60000);
    const hrs = Math.floor(remainingMins / 60);
    const mins = remainingMins % 60;
    return {
      tone: "gold",
      label: `🟢 Live Event (${hrs > 0 ? `${hrs}h ` : ""}${mins}m left)`,
      subLabel: `Scheduled end: ${new Date(endTs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      isOverdue: false,
      overdueMinutes: 0,
      overdueHours: 0,
      calculatedExtraFee: 0,
    };
  }

  // Past end time
  const overdueMins = Math.round((now - endTs) / 60000);
  const isPastGrace = overdueMins > graceMinutes;
  const overtimeHours = Math.max(1, Math.ceil((overdueMins - graceMinutes) / 60));
  const extraFee = isPastGrace ? overtimeHours * hourlyRate : 0;
  const hrs = Math.floor(overdueMins / 60);
  const mins = overdueMins % 60;

  return {
    tone: "destructive",
    label: `⚠️ Overtime: +${hrs}h ${mins}m`,
    subLabel: isPastGrace ? `Overtime Charge: ₹${extraFee} (${overtimeHours}h @ ₹${hourlyRate}/hr)` : `Within grace period (${graceMinutes}m)`,
    isOverdue: isPastGrace,
    overdueMinutes: overdueMins,
    overdueHours: overtimeHours,
    calculatedExtraFee: extraFee,
  };
}
