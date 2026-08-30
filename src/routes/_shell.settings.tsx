import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { EmptyState, KpiCard, PageHeader, Panel, Pill, ProgressBar } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { inr } from "@/lib/pms-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ROOM_TYPES, ROOMS } from "@/lib/pms-data";

export const Route = createFileRoute("/_shell/settings")({
  head: () => ({
    meta: [
      { title: "Settings — DRB Hotel PMS" },
      { name: "description", content: "Configure DRB Hotel: property profile, room types, rate plans, taxes, policies, users and integrations." },
      { property: "og:title", content: "DRB Hotel — Settings" },
      { property: "og:description", content: "Configure DRB Hotel: property profile, room types, rate plans, taxes, policies, users and integrations." },
    ],
  }),
  component: SettingsPage,
});

const SECTIONS = ["Hotel Profile", "Room Types", "Rooms", "Rate Plans", "Taxes", "Policies", "Payments", "Users & Roles", "Notifications", "Integrations", "Audit Logs"];

function SettingsPage() {
  const [active, setActive] = React.useState("Hotel Profile");
  return (
    <>
      <PageHeader eyebrow="Configuration" title="Settings" subtitle="Property configuration for DRB Hotel" />
      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <Panel bodyClassName="p-3">
          <ul className="space-y-1">
            {SECTIONS.map((s) => (
              <li key={s}><button onClick={() => setActive(s)} className={cn("w-full rounded-lg px-3 py-2 text-left text-sm transition-colors", active === s ? "bg-gold/12 font-medium" : "hover:bg-accent")}>{s}</button></li>
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
          ) : active === "Room Types" ? (
            <Table>
              <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Base rate</TableHead><TableHead>Rooms</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {ROOM_TYPES.map((t) => (
                  <TableRow key={t.type}><TableCell className="font-medium">{t.type}</TableCell><TableCell>{inr(t.base)}</TableCell><TableCell>{ROOMS.filter((r) => r.type === t.type).length}</TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => toast.info(`${t.type} editor opened`)}>Edit</Button></TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          ) : active === "Rooms" ? (
            <Table>
              <TableHeader><TableRow><TableHead>Room</TableHead><TableHead>Type</TableHead><TableHead>Floor</TableHead><TableHead className="text-right">Rate</TableHead></TableRow></TableHeader>
              <TableBody>{ROOMS.map((r) => <TableRow key={r.id}><TableCell>{r.number}</TableCell><TableCell>{r.type}</TableCell><TableCell>{r.floor}</TableCell><TableCell className="text-right">{inr(r.rate)}</TableCell></TableRow>)}</TableBody>
            </Table>
          ) : active === "Users & Roles" ? (
            <ul className="space-y-2 text-sm">
              {[["manager", "General Manager", "Full access"], ["frontdesk", "Front Desk", "Reservations, folios"], ["housekeeping", "Housekeeping", "Room status"], ["accounts", "Accounts", "Finance, audit"]].map(([u, r, p]) => (
                <li key={u} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div><div className="font-medium">{r}</div><div className="text-[11px] text-muted-foreground">{u} · {p}</div></div>
                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => toast.info(`Permissions for ${r} opened`)}>Permissions</Button>
                </li>
              ))}
            </ul>
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
    </>
  );
}
