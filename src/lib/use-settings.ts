import * as React from 'react';

type SettingsState = {
  floors: string[];
  roomTypes: { id: string; name: string; basePrice: number }[];
};

const DEFAULT_SETTINGS: SettingsState = {
  floors: ["Ground", "1", "2", "3", "4", "5"],
  roomTypes: [
    { id: "rt1", name: "Standard Room", basePrice: 2500 },
    { id: "rt2", name: "Deluxe King", basePrice: 4500 },
    { id: "rt3", name: "Executive Suite", basePrice: 8000 }
  ]
};

export function useSettings() {
  const [settings, setSettings] = React.useState<SettingsState>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    const saved = localStorage.getItem("drb_pms_settings");
    if (saved) {
      try {
        setSettings(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse settings", e);
      }
    } else {
      localStorage.setItem("drb_pms_settings", JSON.stringify(DEFAULT_SETTINGS));
    }
  }, []);

  const saveSettings = (newSettings: SettingsState) => {
    setSettings(newSettings);
    localStorage.setItem("drb_pms_settings", JSON.stringify(newSettings));
  };

  const addFloor = (floor: string) => {
    if (settings.floors.includes(floor)) return;
    saveSettings({ ...settings, floors: [...settings.floors, floor] });
  };

  const removeFloor = (floor: string) => {
    saveSettings({ ...settings, floors: settings.floors.filter(f => f !== floor) });
  };

  const addRoomType = (name: string, basePrice: number) => {
    const newType = { id: crypto.randomUUID(), name, basePrice };
    saveSettings({ ...settings, roomTypes: [...settings.roomTypes, newType] });
  };

  const removeRoomType = (id: string) => {
    saveSettings({ ...settings, roomTypes: settings.roomTypes.filter(t => t.id !== id) });
  };

  return { settings, saveSettings, addFloor, removeFloor, addRoomType, removeRoomType };
}
