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
  checkInStandardTime: string;
  checkOutStandardTime: string;
  gracePeriodMinutes: number;
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
  ],
  partyHallHourlyRate: 3000,
  roomLateCheckoutFeePerHour: 500,
  checkInStandardTime: "14:00",
  checkOutStandardTime: "11:00",
  gracePeriodMinutes: 15,
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
