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
import { PageHeader, Panel, Pill } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { useSettings } from "@/lib/use-settings";
import { inr } from "@/lib/pms-data";
import { Plus, Building2, Layers, Trash2 } from "lucide-react";
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
  const { settings, addFloor, removeFloor, addRoomType, removeRoomType, updatePolicySettings } = useSettings();
  
  const [active, setActive] = React.useState("Rooms");
  
  const [addRoomOpen, setAddRoomOpen] = React.useState(false);
  const [r, setR] = React.useState({ number: "", type: "", floor: "", price: 0 });
  const [newFloor, setNewFloor] = React.useState("");
  const [newType, setNewType] = React.useState({ name: "", price: "" });

  // Policy Form State
  const [policyForm, setPolicyForm] = React.useState({
    partyHallHourlyRate: settings.partyHallHourlyRate || 3000,
    roomLateCheckoutFeePerHour: settings.roomLateCheckoutFeePerHour || 500,
    checkInStandardTime: settings.checkInStandardTime || "14:00",
    checkOutStandardTime: settings.checkOutStandardTime || "11:00",
    gracePeriodMinutes: settings.gracePeriodMinutes || 15,
  });

  React.useEffect(() => {
    setPolicyForm({
      partyHallHourlyRate: settings.partyHallHourlyRate || 3000,
      roomLateCheckoutFeePerHour: settings.roomLateCheckoutFeePerHour || 500,
      checkInStandardTime: settings.checkInStandardTime || "14:00",
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
    }
  }, [addRoomOpen, settings]);

  const handleAddRoom = async () => {
    if (!r.number.trim()) return toast.error("Please enter a room number (e.g. 101)");
    if (!r.price || r.price <= 0) return toast.error("Please enter a valid room rate");
    
    const floorToSave = r.floor || settings.floors[0] || "1";
    const typeToSave = r.type || settings.roomTypes[0]?.name || "Standard Room";

    const res = await addRoom(r.number.trim(), typeToSave, floorToSave, r.price);
    if (res?.success) {
      toast.success(`Room ${r.number.trim()} created successfully!`);
      setAddRoomOpen(false);
      setR({ number: "", type: "", floor: "", price: 0 });
    } else {
      toast.error(res?.error || "Failed to create room");
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
              <div className="space-y-2"><Label>Hotel name</Label><Input defaultValue="DRB Hotel" /></div>
              <div className="space-y-2"><Label>Legal entity</Label><Input defaultValue="DRB Hospitality Pvt Ltd" /></div>
              <div className="space-y-2"><Label>GSTIN</Label><Input defaultValue="29ABCDE1234F1Z5" /></div>
              <div className="space-y-2"><Label>Contact</Label><Input defaultValue="+91 80 4000 1200" /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input defaultValue="14 Residency Avenue, Bengaluru 560001" /></div>
              <div className="sm:col-span-2"><Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => toast.success("Hotel profile saved")}>Save changes</Button></div>
            </div>
          ) : active === "Rooms" ? (
            <div className="space-y-8">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4 rounded-xl border border-border p-4 bg-secondary/20">
                  <div className="flex items-center gap-2 font-semibold"><Layers className="size-4 text-gold" /> Configured Floors</div>
                  <div className="flex flex-wrap gap-2">
                    {settings.floors.map(f => (
                      <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-card border border-border">
                        Floor {f}
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
                        <TableCell>Floor {room.floor || "1"}</TableCell>
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
                    <Label>Room Late Check-Out Fee (₹ / Hour) *</Label>
                    <Input
                      type="number"
                      value={policyForm.roomLateCheckoutFeePerHour}
                      onChange={(e) => setPolicyForm({ ...policyForm, roomLateCheckoutFeePerHour: parseFloat(e.target.value) || 0 })}
                      placeholder="500"
                    />
                    <span className="text-[11px] text-muted-foreground">Auto-calculated when guest exceeds checkout time</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border p-4 bg-secondary/20 space-y-4">
                <div className="font-semibold text-base flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-gold inline-block" /> Standard Check-in / Check-out Schedule
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Standard Check-In Time</Label>
                    <Input
                      type="time"
                      value={policyForm.checkInStandardTime}
                      onChange={(e) => setPolicyForm({ ...policyForm, checkInStandardTime: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Standard Check-Out Time</Label>
                    <Input
                      type="time"
                      value={policyForm.checkOutStandardTime}
                      onChange={(e) => setPolicyForm({ ...policyForm, checkOutStandardTime: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Grace Period (Minutes)</Label>
                    <Input
                      type="number"
                      value={policyForm.gracePeriodMinutes}
                      onChange={(e) => setPolicyForm({ ...policyForm, gracePeriodMinutes: parseInt(e.target.value) || 0 })}
                      placeholder="15"
                    />
                    <span className="text-[11px] text-muted-foreground">Buffer before overtime kicks in</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 shadow-brass"
                  onClick={() => {
                    updatePolicySettings(policyForm);
                    toast.success("Timers and Hourly Rates policy saved successfully!");
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
                  {settings.floors.map(f => <SelectItem key={f} value={f}>Floor {f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Room Category *</Label>
              <Select value={r.type} onValueChange={v => {
                const rt = settings.roomTypes.find(t => t.name === v);
                setR({...r, type: v, price: rt ? rt.basePrice : r.price});
              }}>
                <SelectTrigger><SelectValue placeholder="Select Category..." /></SelectTrigger>
                <SelectContent>
                  {settings.roomTypes.map(rt => (
                    <SelectItem key={rt.id} value={rt.name}>
                      {rt.name} ({inr(rt.basePrice)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nightly Rate (₹) *</Label>
              <Input type="number" value={r.price} onChange={e => setR({...r, price: parseFloat(e.target.value) || 0})} placeholder="0.00" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAddRoomOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRoom} className="bg-brass text-gold-foreground hover:opacity-90">Create Room Key</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
