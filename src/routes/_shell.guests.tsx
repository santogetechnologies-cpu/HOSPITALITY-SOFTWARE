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
  const { guests, addGuest } = usePms();
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("all");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const guest = guests.find((g) => g.id === openId) ?? null;
  const rows = guests.filter((g) => (type === "all" || g.type === type) && (!q.trim() || g.name.toLowerCase().includes(q.toLowerCase())));

  return (
    <>
      <PageHeader eyebrow="Relationships" title="Guest Management" subtitle="Profiles, preferences and lifetime value across the property"
        actions={
          <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => {
            const g = addGuest({ name: "New Guest Profile", email: "new@example.com", phone: "+91 90000 00000", country: "India", lastStay: "12 Aug 2026", stays: 1, spend: 0, type: "Individual", vip: false, preferences: ["Non-smoking"], notes: "Created from the guest desk." });
            toast.success(`Guest profile ${g.id} created`);
          }}>Add Guest</Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total Guests" value={String(guests.length)} icon={Users} tone="gold" hint="Active profiles" />
        <KpiCard label="Returning Guests" value={String(guests.filter((g) => g.stays > 3).length)} icon={Repeat} tone="info" delta="+12%" />
        <KpiCard label="VIP Guests" value={String(guests.filter((g) => g.vip).length)} icon={Crown} tone="warning" hint="Priority handling" />
        <KpiCard label="Corporate Guests" value={String(guests.filter((g) => g.type === "Corporate").length)} icon={Building2} tone="success" hint="City ledger" />
      </div>

      <Panel bodyClassName="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guests" />
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
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Contact</TableHead><TableHead>Country</TableHead><TableHead>Last Stay</TableHead><TableHead>Total Stays</TableHead><TableHead>Total Spend</TableHead><TableHead>Type</TableHead><TableHead>VIP</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell className="text-xs">{g.email}<br />{g.phone}</TableCell>
                  <TableCell>{g.country}</TableCell>
                  <TableCell>{g.lastStay}</TableCell>
                  <TableCell className="tabular-nums">{g.stays}</TableCell>
                  <TableCell className="tabular-nums">{inr(g.spend)}</TableCell>
                  <TableCell><Pill>{g.type}</Pill></TableCell>
                  <TableCell>{g.vip ? <Pill tone="gold">VIP</Pill> : "—"}</TableCell>
                  <TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setOpenId(g.id)}>Profile</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!rows.length ? <div className="p-6"><EmptyState title="No guests found" body="Try another search term." icon={Users} /></div> : null}
      </Panel>

      <Sheet open={!!guest} onOpenChange={(o: boolean) => { if (!o) setOpenId(null); }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {guest ? (
            <>
              <SheetHeader className="text-left">
                <SheetTitle className="flex items-center gap-2 text-2xl">{guest.name}{guest.vip ? <Pill tone="gold">VIP</Pill> : null}</SheetTitle>
                <SheetDescription>{guest.type} · {guest.country} · {guest.stays} stays · {inr(guest.spend)} lifetime</SheetDescription>
              </SheetHeader>
              <div className="px-4 pb-10">
                <Tabs defaultValue="overview">
                  <TabsList className="flex-wrap rounded-xl">
                    {["overview", "stays", "preferences", "billing", "communication", "feedback"].map((t) => (
                      <TabsTrigger key={t} value={t} className="rounded-lg capitalize">{t}</TabsTrigger>
                    ))}
                  </TabsList>
                  <TabsContent value="overview" className="mt-4 space-y-3 text-sm">
                    <div className="rounded-xl border border-border p-3"><div className="eyebrow">Contact</div><div className="mt-1">{guest.email}</div><div className="text-muted-foreground">{guest.phone}</div></div>
                    <div className="rounded-xl border border-border p-3"><div className="eyebrow">Notes</div><p className="mt-1 text-muted-foreground">{guest.notes}</p></div>
                  </TabsContent>
                  <TabsContent value="stays" className="mt-4 space-y-2 text-sm">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-border p-3">
                        <div><div className="font-medium">Deluxe King · {2 + i} nights</div><div className="text-xs text-muted-foreground">{i} Aug 2026 · Direct Website</div></div>
                        <span className="font-semibold">{inr(4500 * (2 + i))}</span>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="preferences" className="mt-4">
                    <div className="flex flex-wrap gap-2">{guest.preferences.map((p) => <Pill key={p} tone="gold">{p}</Pill>)}</div>
                  </TabsContent>
                  <TabsContent value="billing" className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between rounded-xl border border-border p-3"><span>Open folio balance</span><span className="font-semibold">{inr(0)}</span></div>
                    <div className="flex justify-between rounded-xl border border-border p-3"><span>Preferred payment</span><span className="font-semibold">Corporate card</span></div>
                  </TabsContent>
                  <TabsContent value="communication" className="mt-4 space-y-2 text-sm">
                    <div className="rounded-xl border border-border p-3">Pre-arrival email sent · 09 Aug</div>
                    <div className="rounded-xl border border-border p-3">Post-stay thank-you sent · 06 Aug</div>
                  </TabsContent>
                  <TabsContent value="feedback" className="mt-4 space-y-2 text-sm">
                    <div className="rounded-xl border border-border p-3"><div className="font-medium">9.2 / 10 — “Impeccable service, superb breakfast.”</div><div className="text-xs text-muted-foreground">Complaints: none logged</div></div>
                  </TabsContent>
                </Tabs>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  );
}
