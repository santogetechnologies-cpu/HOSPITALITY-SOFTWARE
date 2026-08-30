import * as React from 'react';

export type RoomTypeConfig = {
  id: string;
  name: string;
  basePrice: number;
};

type SettingsState = {
  floors: string[];
  roomTypes: RoomTypeConfig[];
};

const DEFAULT_SETTINGS: SettingsState = {
  floors: ["Ground", "1", "2", "3", "4", "5"],
  roomTypes: [
    { id: "rt1", name: "Standard Room", basePrice: 2500 },
    { id: "rt2", name: "Deluxe King", basePrice: 4500 },
    { id: "rt3", name: "Executive Suite", basePrice: 8000 },
    { id: "rt4", name: "Presidential Suite", basePrice: 15000 },
  ]
};

export function useSettings() {
  const [settings, setSettings] = React.useState<SettingsState>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("drb_pms_settings");
      if (saved) {
        try {
          return JSON.parse(saved);
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

  return { settings, saveSettings, addFloor, removeFloor, addRoomType, removeRoomType };
}

