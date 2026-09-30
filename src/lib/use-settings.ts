import * as React from 'react';

export type RoomTypeConfig = {
  id: string;
  name: string;
  basePrice: number;
};

export type HotelProfile = {
  name: string;
  legalEntity: string;
  gstin: string;
  phone: string;
  address: string;
  city?: string;
  stateCode?: string;
  hsnSac?: string;
};

export type SettingsState = {
  hotelProfile: HotelProfile;
  floors: string[];
  roomTypes: RoomTypeConfig[];
  partyHallHourlyRate: number;
  roomLateCheckoutFeePerHour: number;
  stayCycleMode: "24_HOURS" | "STANDARD_HOURS";
  checkInStandardTime: string;
  checkOutStandardTime: string;
  gracePeriodMinutes: number;
  startingInvoiceNumber: number;
  sequenceStartDate: string;
  allowGmDiscountApproval: boolean;
  allowFrontDeskDiscountApproval: boolean;
};

const DEFAULT_SETTINGS: SettingsState = {
  hotelProfile: {
    name: "HOTEL DRB",
    legalEntity: "HOTEL DRB MARTHANDAM",
    gstin: "33ABQPD6510M4ZI",
    phone: "04651-272302 | Mobile: 9442501809",
    address: "Market Road, Marthandam, Tamil Nadu",
    city: "MARTHANDAM",
    stateCode: "33",
    hsnSac: "9963",
  },
  floors: ["Floor 1", "Floor 2", "Floor 3", "Floor 4"],
  roomTypes: [
    { id: "rt1", name: "Double Bed Non AC", basePrice: 700 },
    { id: "rt2", name: "Double Bed Non AC Standard", basePrice: 1000 },
    { id: "rt3", name: "3 Bed Non AC", basePrice: 1300 },
    { id: "rt4", name: "Double Bed Standard AC", basePrice: 1600 },
    { id: "rt5", name: "Double Bed Deluxe AC", basePrice: 2200 },
    { id: "rt6", name: "Suite Room", basePrice: 3200 },
    { id: "rt7", name: "PARTY HALL", basePrice: 4000 },
  ],
  partyHallHourlyRate: 3000,
  roomLateCheckoutFeePerHour: 0,
  stayCycleMode: "24_HOURS",
  checkInStandardTime: "12:00",
  checkOutStandardTime: "12:00",
  gracePeriodMinutes: 15,
  startingInvoiceNumber: 963,
  sequenceStartDate: "2026-09-01",
  allowGmDiscountApproval: false,
  allowFrontDeskDiscountApproval: false,
};

export function useSettings() {
  const [settings, setSettings] = React.useState<SettingsState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("drb_pms_settings");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          parsed.roomLateCheckoutFeePerHour = 0;
          if (!parsed.startingInvoiceNumber) {
            parsed.startingInvoiceNumber = 963;
          }
          if (!parsed.sequenceStartDate) {
            parsed.sequenceStartDate = "2026-09-01";
          }
          if (parsed.roomTypes && !parsed.roomTypes.some((t: any) => t.name?.toUpperCase() === "PARTY HALL")) {
            parsed.roomTypes.push({ id: "rt7", name: "PARTY HALL", basePrice: 4000 });
          }
          const CANONICAL_CATEGORY_RATES: Record<string, number> = {
            "double bed non ac": 700,
            "double bed non ac standard": 1000,
            "3 bed non ac": 1300,
            "double bed standard ac": 1600,
            "double bed deluxe ac": 2200,
            "dlx ac": 2200,
            "suite room": 3200,
            "suite ac": 3200,
            "party hall": 4000,
          };
          if (Array.isArray(parsed.roomTypes)) {
            parsed.roomTypes = parsed.roomTypes.map((rt: any) => {
              const lower = (rt.name || "").trim().toLowerCase();
              if (CANONICAL_CATEGORY_RATES[lower] !== undefined) {
                return { ...rt, basePrice: CANONICAL_CATEGORY_RATES[lower] };
              }
              return rt;
            });
          }
          return { ...DEFAULT_SETTINGS, ...parsed };
        } catch (e) {
          console.error("Failed to parse settings", e);
        }
      }
    }
    return DEFAULT_SETTINGS;
  });

  const saveSettings = (newSettings: SettingsState) => {
    setSettings(newSettings);
    if (typeof window !== "undefined") {
      localStorage.setItem("drb_pms_settings", JSON.stringify(newSettings));
    }
  };

  const updatePolicySettings = (partial: Partial<SettingsState>) => {
    const updated = { ...settings, ...partial };
    saveSettings(updated);
    return updated;
  };

  const addFloor = (floor: string) => {
    const trimmed = floor.trim();
    if (!trimmed || settings.floors.includes(trimmed)) return false;
    saveSettings({ ...settings, floors: [...settings.floors, trimmed] });
    return true;
  };

  const removeFloor = (floor: string) => {
    saveSettings({ ...settings, floors: settings.floors.filter(f => f !== floor) });
  };

  const addRoomType = (name: string, basePrice: number) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const newType = { id: crypto.randomUUID(), name: trimmed, basePrice: Number(basePrice) || 0 };
    saveSettings({ ...settings, roomTypes: [...settings.roomTypes, newType] });
    return true;
  };

  const removeRoomType = (id: string) => {
    saveSettings({ ...settings, roomTypes: settings.roomTypes.filter(t => t.id !== id) });
  };

  const updateHotelProfile = (profile: Partial<HotelProfile>) => {
    const updated = {
      ...settings,
      hotelProfile: {
        ...(settings.hotelProfile || DEFAULT_SETTINGS.hotelProfile),
        ...profile,
      },
    };
    saveSettings(updated);
    return updated;
  };

  return { settings, saveSettings, updatePolicySettings, updateHotelProfile, addFloor, removeFloor, addRoomType, removeRoomType };
}
