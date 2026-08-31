import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { EmptyState, KpiCard, PageHeader, Panel, Pill, ProgressBar, RoomCard, StatusBadge } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { inr } from "@/lib/pms-data";
import { Users, Repeat, Crown, Building2, Search } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export const Route = createFileRoute("/_shell/guests")({
  head: () => ({
    meta: [
      { title: "Guest CRM — DRB Hotel PMS" },
      { name: "description", content: "DRB Hotel guest profiles: stay history, preferences, billing, feedback and VIP recognition." },
      { property: "og:title", content: "DRB Hotel — Guest CRM" },
      { property: "og:description", content: "DRB Hotel guest profiles: stay history, preferences, billing, feedback and VIP recognition." },
    ],
  }),
  component: GuestsPage,
});

function GuestsPage() {
  const { guests, reservations, payments, addGuest, deleteGuest, session } = usePms();
  const isAdmin = session?.role === "SUPER_ADMIN" || session?.role === "GM" || !session;
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("all");
  const [openId, setOpenId] = React.useState<string | null>(null);
  
  const [addOpen, setAddOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    phone: "",
    country: "India",
    address: "",
    id_number: "",
    type: "Individual",
    vip: false,
    notes: ""
  });

  const guestStats = React.useMemo(() => {
    const stats: Record<string, { stays: number; spend: number }> = {};
    reservations.forEach((r) => {
      if (!r.guest_id || r.status === "CANCELLED") return;
      if (!stats[r.guest_id]) stats[r.guest_id] = { stays: 0, spend: 0 };
      stats[r.guest_id].stays += 1;

      const p = payments.find((pay) => pay.reservation_id === r.id);
      const paid = Number(p?.paid_amount) || Number(r.base_amount) || 0;
      stats[r.guest_id].spend += paid;
    });
    return stats;
  }, [reservations, payments]);

  const [saving, setSaving] = React.useState(false);

  const handleAdd = async () => {
    if (saving) return;
    if (!form.name.trim()) return toast.error("Guest full name is required");
    const phoneTrimmed = form.phone.trim();
    if (phoneTrimmed) {
      const existing = guests.find((g) => g.phone && g.phone.trim().toLowerCase() === phoneTrimmed.toLowerCase());
      if (existing) {
        return toast.error(`A guest profile with phone number "${phoneTrimmed}" already exists (${existing.name}).`);
      }
    }

    setSaving(true);
    try {
      const res = await addGuest({
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: phoneTrimmed || undefined,
        country: form.country.trim() || "India",
        address: form.address.trim() || undefined,
        id_number: form.id_number.trim() || undefined,
        type: form.type,
        vip: form.vip,
        notes: form.notes.trim() || undefined,
        stays: 0,
        spend: 0,
        preferences: []
      } as any);

      if (res?.success) {
        toast.success("Guest profile created successfully!");
        setAddOpen(false);
        setForm({
          name: "",
          email: "",
          phone: "",
          country: "India",
          address: "",
          id_number: "",
          type: "Individual",
          vip: false,
          notes: ""
        });
      } else {
        toast.error(res?.error || "Failed to add guest profile");
      }
    } finally {
      setSaving(false);
    }
  };

  const guest = guests.find((g) => g.id === openId) ?? null;
  const rows = guests.filter((g) => (type === "all" || g.type === type) && (!q.trim() || g.name.toLowerCase().includes(q.toLowerCase()) || (g.phone && g.phone.includes(q))));

  return (
    <>
      <PageHeader eyebrow="Relationships" title="Guest Management" subtitle="Profiles, preferences and lifetime value across the property"
        actions={
          <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => setAddOpen(true)}>Add Guest</Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Guests" value={String(guests.length)} icon={Users} tone="gold" hint="Unique profiles" />
        <KpiCard label="Returning Guests" value={String(guests.filter((g) => (guestStats[g.id]?.stays || (g as any).stays || 0) > 1).length)} icon={Repeat} tone="info" />
        <KpiCard label="VIP Guests" value={String(guests.filter((g) => g.vip).length)} icon={Crown} tone="warning" hint="Priority handling" />
        <KpiCard label="Corporate Guests" value={String(guests.filter((g) => g.type === "Corporate").length)} icon={Building2} tone="success" hint="City ledger" />
      </div>

      <Panel bodyClassName="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guests by name or phone" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All guest types</SelectItem>
              <SelectItem value="Individual">Individual</SelectItem>
              <SelectItem value="Corporate">Corporate</SelectItem>
              <SelectItem value="Travel Agent">Travel Agent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Panel>

      <Panel bodyClassName="p-0">
        <div className="scroll-slim overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Country</TableHead><TableHead>ID Number</TableHead><TableHead>Total Stays</TableHead><TableHead>Total Spend</TableHead><TableHead>Type</TableHead><TableHead>VIP</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-semibold">{g.name}</TableCell>
                  <TableCell className="text-xs">{g.phone || "—"}<br /><span className="text-muted-foreground">{g.email || ""}</span></TableCell>
                  <TableCell>{g.country || "India"}</TableCell>
                  <TableCell className="font-mono text-xs">{g.id_number || "—"}</TableCell>
                  <TableCell className="tabular-nums">{guestStats[g.id]?.stays || (g as any).stays || 0}</TableCell>
                  <TableCell className="tabular-nums">{inr(guestStats[g.id]?.spend || (g as any).spend || 0)}</TableCell>
                  <TableCell><Pill>{g.type || "Individual"}</Pill></TableCell>
                  <TableCell>{g.vip ? <Pill tone="gold">VIP</Pill> : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setOpenId(g.id)}>Profile</Button>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={async () => {
                            if (confirm(`Are you sure you want to delete guest profile "${g.name}" and all associated booking records?`)) {
                              const delRes = await deleteGuest(g.id);
                              if (delRes?.success) toast.success("Guest deleted");
                              else toast.error(delRes?.error || "Failed to delete guest");
                            }
                          }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!rows.length ? <div className="p-6"><EmptyState title="No guests found" body="Try adding a new guest above." icon={Users} /></div> : null}
      </Panel>

      <Sheet open={!!guest} onOpenChange={(o: boolean) => { if (!o) setOpenId(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {guest ? (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-2 text-2xl">{guest.name}{guest.vip ? <Pill tone="gold">VIP</Pill> : null}</SheetTitle>
                <SheetDescription>{guest.type || "Individual"} · {guest.country || "India"} · {guest.stays || 0} stays · {inr(guest.spend || 0)} lifetime</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-10 space-y-4 pt-4">
                <div className="rounded-xl border border-border p-3">
                  <div className="text-xs font-semibold uppercase text-gold">Contact Information</div>
                  <div className="mt-2 text-sm">{guest.email || "No email on record"}</div>
                  <div className="text-sm text-muted-foreground">{guest.phone || "No phone"}</div>
                  {guest.address && <div className="mt-1 text-xs text-muted-foreground">{guest.address}</div>}
                  {guest.id_number && <div className="mt-2 font-mono text-xs">ID / Proof: {guest.id_number}</div>}
                </div>
                {guest.notes && (
                  <div className="rounded-xl border border-border p-3">
                    <div className="text-xs font-semibold uppercase text-gold">Notes & Preferences</div>
                    <p className="mt-1 text-sm text-muted-foreground">{guest.notes}</p>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Guest Profile</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-3">
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input placeholder="e.g. Rajesh Sharma" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Phone Number</Label>
                <Input placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <Input type="email" placeholder="guest@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>ID Proof Number</Label>
                <Input placeholder="e.g. 482910384910" value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Guest Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm({...form, type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Corporate">Corporate</SelectItem>
                    <SelectItem value="Travel Agent">Travel Agent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-2.5 mt-auto">
                <Label className="text-xs">VIP Status</Label>
                <Switch checked={form.vip} onCheckedChange={(v) => setForm({...form, vip: v})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address / Notes</Label>
              <Input placeholder="City, State, or special requests" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button disabled={saving} onClick={handleAdd} className="bg-brass text-gold-foreground">
              {saving ? "Saving Guest..." : "Save Guest"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
