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
import { Plus, Building2, Layers } from "lucide-react";
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

const SECTIONS = ["Hotel Profile", "Rooms", "Policies", "Notifications", "Integrations", "Audit Logs"];

function SettingsPage() {
  const { rooms, addRoom } = usePms();
  const { settings, addFloor, removeFloor, addRoomType, removeRoomType } = useSettings();
  
  const [active, setActive] = React.useState("Hotel Profile");
  
  const [addRoomOpen, setAddRoomOpen] = React.useState(false);
  const [r, setR] = React.useState({ number: "", type: "", floor: "", price: 0 });
  const [newFloor, setNewFloor] = React.useState("");
  const [newType, setNewType] = React.useState({ name: "", price: "" });

  const handleAddRoom = async () => {
    if (!r.number || !r.price) return toast.error("Number and Price are required");
    const res = await addRoom(r.number, r.type, r.floor, r.price);
    if (res?.success) {
      toast.success(`Room ${r.number} added successfully`);
      setAddRoomOpen(false);
      setR({ number: "", type: "", floor: "", price: 0 });
    } else if (res?.error) {
      toast.error(res.error);
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
        <Panel title={active} description="Changes are stored in this demo session only">
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
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-medium"><Layers className="size-4" /> Configured Floors</div>
                  <div className="flex flex-wrap gap-2">
                    {settings.floors.map(f => (
                      <Pill key={f} tone="secondary" className="cursor-pointer hover:bg-destructive/10" onClick={() => removeFloor(f)}>{f} &times;</Pill>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newFloor} onChange={e => setNewFloor(e.target.value)} placeholder="New floor..." className="h-8" />
                    <Button size="sm" onClick={() => { if(newFloor) { addFloor(newFloor); setNewFloor(""); } }}>Add</Button>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-2 font-medium"><Building2 className="size-4" /> Room Types</div>
                  <div className="flex flex-wrap gap-2">
                    {settings.roomTypes.map(t => (
                      <Pill key={t.id} tone="secondary" className="cursor-pointer hover:bg-destructive/10" onClick={() => removeRoomType(t.id)}>{t.name} ({inr(t.basePrice)}) &times;</Pill>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input value={newType.name} onChange={e => setNewType({...newType, name: e.target.value})} placeholder="Type name..." className="h-8 w-1/2" />
                    <Input type="number" value={newType.price} onChange={e => setNewType({...newType, price: e.target.value})} placeholder="Base ₹" className="h-8 w-1/4" />
                    <Button size="sm" onClick={() => { if(newType.name) { addRoomType(newType.name, parseFloat(newType.price)||0); setNewType({name: "", price: ""}); } }}>Add</Button>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="font-medium">Active Rooms</div>
                  <Button onClick={() => setAddRoomOpen(true)} className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90">
                    <Plus className="mr-2 size-4" /> Add Room
                  </Button>
                </div>
                <Table>
                  <TableHeader><TableRow><TableHead>Room</TableHead><TableHead>Type</TableHead><TableHead>Floor</TableHead><TableHead className="text-right">Rate</TableHead></TableRow></TableHeader>
                  <TableBody>{rooms.map((room) => <TableRow key={room.id}><TableCell>{room.room_number || (room as any).number}</TableCell><TableCell>{room.room_type_id || (room as any).type || "Room"}</TableCell><TableCell>{room.floor}</TableCell><TableCell className="text-right">{inr(room.price || (room as any).rate)}</TableCell></TableRow>)}</TableBody>
                </Table>
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
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
            <DialogDescription>Configure a new room to be booked.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2"><Label>Room Number</Label><Input value={r.number} onChange={e => setR({...r, number: e.target.value})} placeholder="e.g. 101" /></div>
            <div className="space-y-2"><Label>Floor</Label>
              <Select value={r.floor} onValueChange={v => setR({...r, floor: v})}>
                <SelectTrigger><SelectValue placeholder="Select floor..." /></SelectTrigger>
                <SelectContent>
                  {settings.floors.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Room Category</Label>
              <Select value={r.type} onValueChange={v => {
                const rt = settings.roomTypes.find(t => t.name === v);
                setR({...r, type: v, price: rt ? rt.basePrice : r.price});
              }}>
                <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                <SelectContent>
                  {settings.roomTypes.map(rt => <SelectItem key={rt.id} value={rt.name}>{rt.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Base Rate (₹)</Label><Input type="number" value={r.price} onChange={e => setR({...r, price: parseFloat(e.target.value)})} /></div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setAddRoomOpen(false)}>Cancel</Button>
            <Button onClick={handleAddRoom} className="bg-brass text-gold-foreground hover:opacity-90">Add Room</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
