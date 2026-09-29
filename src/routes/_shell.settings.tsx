import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader, Panel, Pill, EmptyState } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { useSettings } from "@/lib/use-settings";
import { inr, formatFloor } from "@/lib/pms-data";
import { Plus, Building2, Layers, Trash2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings — DRB Hotel PMS" },
      { name: "description", content: "Configure DRB Hotel: property profile, room types, rate plans, taxes, policies, users and integrations." },
      { property: "og:title", content: "DRB Hotel — Settings" },
    ],
  }),
  component: SettingsPage,
});

const SECTIONS = ["Hotel Profile", "Rooms", "Timers & Overtime Policies", "Notifications", "Integrations", "Audit Logs"];

function SettingsPage() {
  const { rooms, addRoom, deleteRoom, session } = usePms();
  const isSuperAdmin = session?.role === "SUPER_ADMIN" || !session;
  const { settings, addFloor, removeFloor, addRoomType, removeRoomType, updatePolicySettings, updateHotelProfile } = useSettings();
  
  const [active, setActive] = React.useState("Rooms");
  
  const [addRoomOpen, setAddRoomOpen] = React.useState(false);
  const [r, setR] = React.useState({ number: "", type: "", floor: "", price: 0 });
  const [customCategory, setCustomCategory] = React.useState("");
  const [newFloor, setNewFloor] = React.useState("");
  const [newType, setNewType] = React.useState({ name: "", price: "" });

  // Hotel Profile Form State
  const [profileForm, setProfileForm] = React.useState({
    name: settings.hotelProfile?.name || "DRB Hotel",
    legalEntity: settings.hotelProfile?.legalEntity || "DRB Hospitality Pvt Ltd",
    gstin: settings.hotelProfile?.gstin || "000",
    phone: settings.hotelProfile?.phone || "+91 80 4000 1200",
    address: settings.hotelProfile?.address || "DRB Hotel, 5/116F1, 5, Market Rd, near Over bridge, Marthandam, Tamil Nadu 629165",
  });

  React.useEffect(() => {
    if (settings.hotelProfile) {
      setProfileForm({
        name: settings.hotelProfile.name || "DRB Hotel",
        legalEntity: settings.hotelProfile.legalEntity || "DRB Hospitality Pvt Ltd",
        gstin: settings.hotelProfile.gstin || "000",
        phone: settings.hotelProfile.phone || "+91 80 4000 1200",
        address: settings.hotelProfile.address || "DRB Hotel, 5/116F1, 5, Market Rd, near Over bridge, Marthandam, Tamil Nadu 629165",
      });
    }
  }, [settings.hotelProfile]);

  const handleSaveHotelProfile = () => {
    updateHotelProfile(profileForm);
    toast.success("Hotel profile saved successfully");
  };

  // Policy Form State
  const [policyForm, setPolicyForm] = React.useState({
    partyHallHourlyRate: settings.partyHallHourlyRate || 3000,
    roomLateCheckoutFeePerHour: 0,
    stayCycleMode: settings.stayCycleMode || "STANDARD_HOURS",
    checkInStandardTime: settings.checkInStandardTime || "12:00",
    checkOutStandardTime: settings.checkOutStandardTime || "11:00",
    gracePeriodMinutes: settings.gracePeriodMinutes || 15,
  });

  React.useEffect(() => {
    setPolicyForm({
      partyHallHourlyRate: settings.partyHallHourlyRate || 3000,
      roomLateCheckoutFeePerHour: 0,
      stayCycleMode: settings.stayCycleMode || "STANDARD_HOURS",
      checkInStandardTime: settings.checkInStandardTime || "12:00",
      checkOutStandardTime: settings.checkOutStandardTime || "11:00",
      gracePeriodMinutes: settings.gracePeriodMinutes || 15,
    });
  }, [settings]);

  // When opening add room modal, ensure default selection
  React.useEffect(() => {
    if (addRoomOpen) {
      const defFloor = settings.floors[0] || "1";
      const defType = settings.roomTypes[0]?.name || "Standard Room";
      const defPrice = settings.roomTypes[0]?.basePrice || 2500;
      setR({
        number: "",
        floor: defFloor,
        type: defType,
        price: defPrice
      });
      setCustomCategory("");
    }
  }, [addRoomOpen, settings]);

  const [addRoomLoading, setAddRoomLoading] = React.useState(false);

  const handleAddRoom = async () => {
    if (addRoomLoading) return;
    if (!r.number.trim()) return toast.error("Please enter a room number (e.g. 101)");
    if (!r.price || r.price <= 0) return toast.error("Please enter a valid room rate");
    
    const floorToSave = r.floor || settings.floors[0] || "1";
    const typeToSave = (r.type === "CUSTOM" ? customCategory.trim() : r.type) || settings.roomTypes[0]?.name || "Standard Room";

    setAddRoomLoading(true);
    try {
      const res = await addRoom(r.number.trim(), typeToSave, floorToSave, r.price);
      if (res?.success) {
        toast.success(`Room ${r.number.trim()} created successfully!`);
        setAddRoomOpen(false);
        setR({ number: "", type: "", floor: "", price: 0 });
        setCustomCategory("");
      } else {
        toast.error(res?.error || "Failed to create room");
      }
    } finally {
      setAddRoomLoading(false);
    }
  };

  const handleCreateFloor = () => {
    if (!newFloor.trim()) return toast.error("Please enter floor number or name");
    const ok = addFloor(newFloor.trim());
    if (ok) {
      toast.success(`Floor "${newFloor.trim()}" added`);
      setNewFloor("");
    } else {
      toast.error("Floor already exists or invalid");
    }
  };

  const handleCreateRoomType = () => {
    if (!newType.name.trim()) return toast.error("Please enter a category name");
    const price = parseFloat(newType.price) || 0;
    const ok = addRoomType(newType.name.trim(), price);
    if (ok) {
      toast.success(`Room Category "${newType.name.trim()}" added`);
      setNewType({ name: "", price: "" });
    } else {
      toast.error("Failed to add category");
    }
  };

  if (session && session.role === "FRONT_DESK") {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader eyebrow="Configuration" title="Settings" subtitle="Property configuration for DRB Hotel" />
        <Panel className="p-12 text-center">
          <EmptyState title="Access Restricted" body="Property configuration is only accessible by General Managers and Super Admins." icon={Settings} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader eyebrow="Configuration" title="Settings" subtitle="Property configuration for DRB Hotel" />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Panel bodyClassName="p-3">
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s}><button onClick={() => setActive(s)} className={cn("w-full rounded-lg px-3 py-2 text-left text-sm transition-colors", active === s ? "bg-gold/12 font-medium text-gold" : "hover:bg-accent")}>{s}</button></li>
            ))}
          </ul>
        </Panel>
        <Panel title={active} description={active === "Rooms" ? "Configure floors, room categories, and physical room keys" : "General property configuration"}>
          {active === "Hotel Profile" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Hotel name</Label>
                <Input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Legal entity</Label>
                <Input value={profileForm.legalEntity} onChange={e => setProfileForm(p => ({ ...p, legalEntity: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>GSTIN</Label>
                <Input value={profileForm.gstin} onChange={e => setProfileForm(p => ({ ...p, gstin: e.target.value }))} placeholder="000" />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input value={profileForm.address} onChange={e => setProfileForm(p => ({ ...p, address: e.target.value }))} />
              </div>

              <div className="sm:col-span-2 rounded-xl border border-gold/40 bg-gold/5 p-4 space-y-3">
                <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                  <span className="size-2.5 rounded-full bg-gold inline-block" />
                  Statutory GST Tax Invoice Sequence
                </div>
                <p className="text-xs text-muted-foreground">
                  As per GST Office compliance regulations, invoice numbering must continue uninterrupted. August 31st invoice was 962; all bookings on and after September 1st, 2026 sequentially start from 963.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Starting Invoice Number (e.g. 963)</Label>
                    <Input
                      type="number"
                      value={settings.startingInvoiceNumber || 963}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 963;
                        updatePolicySettings({ startingInvoiceNumber: val });
                      }}
                      className="font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Sequence Effective Date</Label>
                    <Input
                      type="date"
                      value={settings.sequenceStartDate || "2026-09-01"}
                      onChange={(e) => {
                        updatePolicySettings({ sequenceStartDate: e.target.value });
                      }}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="sm:col-span-2">
                <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 font-semibold" onClick={handleSaveHotelProfile}>
                  Save Hotel Profile & Tax Settings
                </Button>
              </div>
            </div>
          ) : active === "Rooms" ? (
            <div className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-border p-4 bg-secondary/20">
                  <div className="flex items-center gap-2 font-semibold"><Layers className="size-4 text-gold" /> Configured Floors</div>
                  <div className="flex flex-wrap gap-2">
                    {settings.floors.map(f => (
                      <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-card border border-border">
                        {formatFloor(f)}
                        <button type="button" className="text-muted-foreground hover:text-destructive font-bold ml-1" onClick={() => removeFloor(f)}>&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Input value={newFloor} onChange={e => setNewFloor(e.target.value)} placeholder="e.g. 6, Mezzanine" className="h-9" onKeyDown={e => { if (e.key === 'Enter') handleCreateFloor(); }} />
                    <Button size="sm" onClick={handleCreateFloor} className="bg-brass text-gold-foreground">Add Floor</Button>
                  </div>
                </div>
                
                <div className="space-y-4 rounded-xl border border-border p-4 bg-secondary/20">
                  <div className="flex items-center gap-2 font-semibold"><Building2 className="size-4 text-gold" /> Room Categories & Base Rates</div>
                  <div className="flex flex-wrap gap-2">
                    {settings.roomTypes.map(t => (
                      <span key={t.id} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-card border border-border">
                        {t.name} ({inr(t.basePrice)})
                        <button type="button" className="text-muted-foreground hover:text-destructive font-bold ml-1" onClick={() => removeRoomType(t.id)}>&times;</button>
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-[1.4fr_1fr_auto] gap-2 pt-2">
                    <Input value={newType.name} onChange={e => setNewType({...newType, name: e.target.value})} placeholder="Category Name" className="h-9" />
                    <Input type="number" value={newType.price} onChange={e => setNewType({...newType, price: e.target.value})} placeholder="Base ₹" className="h-9" />
                    <Button size="sm" onClick={handleCreateRoomType} className="bg-brass text-gold-foreground">Add</Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-semibold text-base">Active Room Inventory ({rooms.length} Keys)</h3>
                    <p className="text-xs text-muted-foreground">Synchronized in real-time with your Supabase database.</p>
                  </div>
                  <Button onClick={() => setAddRoomOpen(true)} className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90">
                    <Plus className="mr-2 size-4" /> Add Room
                  </Button>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Room Number</TableHead>
                      <TableHead>Category / Type</TableHead>
                      <TableHead>Floor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Base Rate</TableHead>
                      {isSuperAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-bold">Room {room.room_number || (room as any).number}</TableCell>
                        <TableCell>{room.room_name || room.room_type_id || (room as any).type || "Standard Room"}</TableCell>
                        <TableCell>{formatFloor(room.floor)}</TableCell>
                        <TableCell>
                          <Pill tone={room.status === 'AVAILABLE' ? 'success' : room.status === 'OCCUPIED' ? 'info' : 'warning'}>
                            {room.status || "AVAILABLE"}
                          </Pill>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{inr(room.price || (room as any).rate || 0)}</TableCell>
                        {isSuperAdmin && (
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
                              onClick={async () => {
                                const rNum = room.room_number || (room as any).number;
                                if (confirm(`Are you sure you want to permanently delete Room ${rNum}?`)) {
                                  const delRes = await deleteRoom(room.id);
                                  if (delRes?.success) toast.success(`Room ${rNum} deleted successfully`);
                                  else toast.error(delRes?.error || "Failed to delete room");
                                }
                              }}
                            >
                              <Trash2 className="size-3.5 mr-1" />
                              Delete
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {!rooms.length && (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    No rooms currently in database. Click "Add Room" to create one!
                  </div>
                )}
              </div>
            </div>
          ) : active === "Timers & Overtime Policies" || active === "Policies" ? (
            <div className="space-y-6">
              <div className="rounded-xl border border-border p-4 bg-secondary/20 space-y-4">
                <div className="font-semibold text-base flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-gold inline-block" /> Party Hall Hourly Pricing & Overtime
                </div>
                <p className="text-xs text-muted-foreground">
                  Set the standard hourly rate for Party Hall / Banquet bookings. The system will automatically compute booking costs and overtime charges based on event hours.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Party Hall Standard Rate (₹ / Hour) *</Label>
                    <Input
                      type="number"
                      value={policyForm.partyHallHourlyRate}
                      onChange={(e) => setPolicyForm({ ...policyForm, partyHallHourlyRate: parseFloat(e.target.value) || 0 })}
                      placeholder="3000"
                    />
                    <span className="text-[11px] text-muted-foreground">e.g. ₹3,000 per hour (4 hours = ₹12,000)</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Room Overstay Billing Policy</Label>
                    <div className="rounded-lg border border-border bg-secondary/30 p-2.5 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">No Late Fee System:</span> Overstay beyond the 24-hour cycle is billed by extending the stay at the standard room day rate.
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-5 bg-secondary/20 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border">
                  <div>
                    <div className="font-semibold text-base flex items-center gap-2">
                      <span className="size-2.5 rounded-full bg-gold inline-block" /> Hotel DRB Check-In / Check-Out Schedule
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      24-hour stay cycle from guest check-in time. Overstay is billed by extending stay by full days.
                    </p>
                  </div>
                  <div className="rounded-full border border-gold/50 text-gold bg-gold/10 px-2.5 py-0.5 text-xs font-semibold w-fit">
                    {policyForm.stayCycleMode === "24_HOURS" ? "⚡ 24-Hour Cycle Active" : "Standard Hours Active"}
                  </div>
                </div>

                {/* Stay Model Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Stay Schedule Model *</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div
                      onClick={() => setPolicyForm({ ...policyForm, stayCycleMode: "24_HOURS", checkOutStandardTime: policyForm.checkInStandardTime })}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        policyForm.stayCycleMode === "24_HOURS"
                          ? "border-gold bg-gold/10 shadow-sm"
                          : "border-border hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          <span className={`size-3 rounded-full border-2 ${policyForm.stayCycleMode === "24_HOURS" ? "border-gold bg-gold" : "border-muted-foreground"}`} />
                          24-Hour Cycle Model (Standard)
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gold/20 text-gold uppercase">Recommended</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        Guest check-out is calculated exactly 24 hours from arrival time (e.g. 3:00 PM check-in → 3:00 PM check-out next day).
                      </p>
                    </div>

                    <div
                      onClick={() => setPolicyForm({ ...policyForm, stayCycleMode: "STANDARD_HOURS", checkOutStandardTime: "11:00" })}
                      className={`cursor-pointer rounded-xl border p-3.5 transition-all ${
                        policyForm.stayCycleMode === "STANDARD_HOURS"
                          ? "border-gold bg-gold/10 shadow-sm"
                          : "border-border hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-sm flex items-center gap-2">
                          <span className={`size-3 rounded-full border-2 ${policyForm.stayCycleMode === "STANDARD_HOURS" ? "border-gold bg-gold" : "border-muted-foreground"}`} />
                          Fixed 11:00 AM Check-Out Model
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        Fixed property check-out at <strong>11:00 AM</strong> regardless of check-in time.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 pt-1">
                  <div className="space-y-2">
                    <Label>Default Check-In Time</Label>
                    <Input
                      type="time"
                      value={policyForm.checkInStandardTime}
                      onChange={(e) => {
                        const newIn = e.target.value;
                        setPolicyForm({
                          ...policyForm,
                          checkInStandardTime: newIn,
                          checkOutStandardTime: policyForm.stayCycleMode === "24_HOURS" ? newIn : policyForm.checkOutStandardTime,
                        });
                      }}
                    />
                    <span className="text-[11px] text-muted-foreground">Default arrival reference time</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Standard Check-Out Time</Label>
                    <Input
                      type="time"
                      value={policyForm.checkOutStandardTime}
                      onChange={(e) => setPolicyForm({ ...policyForm, checkOutStandardTime: e.target.value })}
                    />
                    <span className="text-[11px] text-muted-foreground">Check-out time for fixed schedule mode</span>
                  </div>

                  <div className="space-y-2">
                    <Label>Grace Period (Minutes)</Label>
                    <Input
                      type="number"
                      value={policyForm.gracePeriodMinutes}
                      onChange={(e) => setPolicyForm({ ...policyForm, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                      placeholder="15"
                    />
                    <span className="text-[11px] text-muted-foreground">Buffer before checkout reminder triggers</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPolicyForm({
                      ...policyForm,
                      stayCycleMode: "24_HOURS",
                      checkInStandardTime: "12:00",
                      checkOutStandardTime: "12:00",
                      gracePeriodMinutes: 15,
                      roomLateCheckoutFeePerHour: 0,
                    });
                    toast.info("Loaded Hotel DRB 24-Hour stay model defaults.");
                  }}
                >
                  Reset to 24-Hour Defaults
                </Button>
                <Button
                  className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 shadow-brass"
                  onClick={() => {
                    updatePolicySettings(policyForm);
                    toast.success("Hotel DRB Check-Out Policy configuration saved successfully!");
                  }}
                >
                  Save Policy Configuration
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[["Enable email confirmations", true], ["Auto-assign housekeeping on checkout", true], ["Allow rate overrides at front desk", false], ["Send OTA sync alerts", true]].map(([l, on]) => (
                <div key={l as string} className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">
                  <span>{l as string}</span><Switch defaultChecked={on as boolean} onCheckedChange={() => toast.success("Setting updated")} />
                </div>
              ))}
              <Separator />
              <p className="text-xs text-muted-foreground">This section uses demo configuration; nothing is sent to external services.</p>
            </div>
          )}
        </Panel>
      </div>

      <Dialog open={addRoomOpen} onOpenChange={setAddRoomOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Room Key</DialogTitle>
            <DialogDescription>Configure and register a room in the live database.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Room Number / Key ID *</Label>
              <Input value={r.number} onChange={e => setR({...r, number: e.target.value})} placeholder="e.g. 101, 204, Suite-A" />
            </div>

            <div className="space-y-2">
              <Label>Floor *</Label>
              <Select value={r.floor} onValueChange={v => setR({...r, floor: v})}>
                <SelectTrigger><SelectValue placeholder="Select Floor..." /></SelectTrigger>
                <SelectContent>
                  {settings.floors.map(f => <SelectItem key={f} value={f}>{formatFloor(f)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room Category *</Label>
              <Select value={r.type} onValueChange={v => {
                if (v === "CUSTOM") {
                  setR({...r, type: "CUSTOM"});
                } else {
                  const rt = settings.roomTypes.find(t => t.name === v);
                  setR({...r, type: v, price: rt ? rt.basePrice : r.price});
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select Category..." /></SelectTrigger>
                <SelectContent>
                  {settings.roomTypes.map(rt => (
                    <SelectItem key={rt.id} value={rt.name}>
                      {rt.name} ({inr(rt.basePrice)})
                    </SelectItem>
                  ))}
                  <SelectItem value="CUSTOM">+ Custom Category Name...</SelectItem>
                </SelectContent>
              </Select>
              {r.type === "CUSTOM" && (
                <Input
                  className="mt-1.5"
                  placeholder="e.g. PARTY HALL"
                  value={customCategory}
                  onChange={e => setCustomCategory(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-2">
              <Label>Nightly Rate (₹) *</Label>
              <Input type="number" value={r.price} onChange={e => setR({...r, price: parseFloat(e.target.value) || 0})} placeholder="0.00" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAddRoomOpen(false)} disabled={addRoomLoading}>Cancel</Button>
            <Button disabled={addRoomLoading} onClick={handleAddRoom} className="bg-brass text-gold-foreground hover:opacity-90">
              {addRoomLoading ? "Creating Room..." : "Create Room Key"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
