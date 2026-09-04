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
    company_name: "",
    email: "",
    phone: "",
    country: "India",
    address: "",
    id_number: "",
    gst_number: "",
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
      const paid = Number(p?.paid_amount) || 0;
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
        company_name: form.company_name.trim() || undefined,
        email: form.email.trim() || undefined,
        phone: phoneTrimmed || undefined,
        country: form.country.trim() || "India",
        address: form.address.trim() || undefined,
        id_number: form.id_number.trim() || undefined,
        gst_number: form.gst_number.trim().toUpperCase() || undefined,
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
          company_name: "",
          email: "",
          phone: "",
          country: "India",
          address: "",
          id_number: "",
          gst_number: "",
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

  const rows = React.useMemo(() => {
    return guests.filter((g) => {
      const matchesType = type === "all" || (g.type || "Individual").toLowerCase() === type.toLowerCase();
      const matchesQ = !q || 
        g.name.toLowerCase().includes(q.toLowerCase()) || 
        ((g as any).company_name && (g as any).company_name.toLowerCase().includes(q.toLowerCase())) ||
        (g.phone && g.phone.includes(q)) || 
        (g.email && g.email.toLowerCase().includes(q.toLowerCase())) ||
        (g.gst_number && g.gst_number.toLowerCase().includes(q.toLowerCase())) ||
        (g.address && g.address.toLowerCase().includes(q.toLowerCase()));
      return matchesType && matchesQ;
    });
  }, [guests, type, q]);

  const guest = openId ? guests.find((g) => g.id === openId) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Guest CRM & Profiles"
        subtitle="Manage guest profiles, B2B company billing info, GST numbers, contact records, and preferences."
        actions={
          <Button onClick={() => setAddOpen(true)} className="bg-brass text-gold-foreground">
            <Users className="mr-1.5 size-4" /> Add Guest Profile
          </Button>
        }
      />

      <Panel bodyClassName="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[260px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by Guest Name, Company, Phone, GSTIN, Address..."
              className="pl-9"
            />
          </div>

          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Guest Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Guest Types</SelectItem>
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
            <TableHeader><TableRow><TableHead>Name & Company</TableHead><TableHead>Contact</TableHead><TableHead>GSTIN</TableHead><TableHead>Country</TableHead><TableHead>ID Number</TableHead><TableHead>Total Stays</TableHead><TableHead>Total Spend</TableHead><TableHead>Type</TableHead><TableHead>VIP</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <div className="font-semibold text-sm text-foreground">{g.name}</div>
                    {(g as any).company_name && (
                      <div className="text-xs font-medium text-gold flex items-center gap-1">
                        <Building2 className="size-3" />
                        <span>{(g as any).company_name}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{g.phone || "—"}<br /><span className="text-muted-foreground">{g.email || ""}</span></TableCell>
                  <TableCell>
                    {g.gst_number ? (
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                        {g.gst_number}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
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
                <SheetDescription>
                  {(guest as any).company_name ? `${(guest as any).company_name} · ` : ""}
                  {guest.type || "Individual"} · {guest.country || "India"} · {guest.stays || 0} stays · {inr(guest.spend || 0)} lifetime
                </SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-10 space-y-4 pt-4">
                <div className="rounded-xl border border-border p-3 space-y-2">
                  <div className="text-xs font-semibold uppercase text-gold">Contact & Billing / Tax Information</div>
                  {(guest as any).company_name && (
                    <div className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Building2 className="size-3.5 text-gold" />
                      <span>Company: {(guest as any).company_name}</span>
                    </div>
                  )}
                  <div className="text-sm">{guest.email || "No email on record"}</div>
                  <div className="text-sm text-muted-foreground">{guest.phone || "No phone"}</div>
                  {guest.gst_number && (
                    <div className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded inline-block">
                      Customer GSTIN: {guest.gst_number}
                    </div>
                  )}
                  {guest.address && (
                    <div className="text-xs text-foreground bg-muted/30 p-2 rounded-lg border border-border">
                      <span className="font-semibold text-muted-foreground block text-[10px] uppercase">Residential / Company Billing Address:</span>
                      {guest.address}
                    </div>
                  )}
                  {guest.id_number && <div className="font-mono text-xs">ID / Proof: {guest.id_number}</div>}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Full Name *</Label>
                <Input placeholder="e.g. Rajesh Sharma" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  <span>Company Name</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Optional B2B</span>
                </Label>
                <Input placeholder="e.g. Infosys / TCS" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
              </div>
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
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>ID Proof Number</Label>
                <Input placeholder="e.g. 482910384910" value={form.id_number} onChange={e => setForm({...form, id_number: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="flex items-center justify-between">
                  <span>Customer GSTIN</span>
                  <span className="text-[10px] text-muted-foreground font-normal">B2B</span>
                </Label>
                <Input placeholder="e.g. 33AAAAA0000A1Z5" className="uppercase font-mono text-xs" value={form.gst_number} onChange={e => setForm({...form, gst_number: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-1.5">
                <Label>Country</Label>
                <Input value={form.country} onChange={e => setForm({...form, country: e.target.value})} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Residential Address / Company Billing Address</Label>
              <Input placeholder="e.g. #42 MG Road, Bangalore, Karnataka - 560001" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
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
              <Label>Notes & Special Requests</Label>
              <Input placeholder="Special preferences or notes" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
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
    </div>
  );
}
