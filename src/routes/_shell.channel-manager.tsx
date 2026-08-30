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
import { CHANNELS } from "@/lib/pms-data";
import { RefreshCw, Globe } from "lucide-react";

export const Route = createFileRoute("/_shell/channel-manager")({
  head: () => ({
    meta: [
      { title: "Channel Manager — DRB Hotel PMS" },
      { name: "description", content: "Monitor DRB Hotel OTA connections, bookings, commissions, rate parity and inventory sync." },
      { property: "og:title", content: "DRB Hotel — Channel Manager" },
      { property: "og:description", content: "Monitor DRB Hotel OTA connections, bookings, commissions, rate parity and inventory sync." },
    ],
  }),
  component: ChannelManager,
});

function ChannelManager() {
  const [sync, setSync] = React.useState("3 min ago");
  const [busy, setBusy] = React.useState(false);
  return (
    <>
      <PageHeader eyebrow="Distribution" title="Channel Manager" subtitle={`Last full synchronisation ${sync}`}
        actions={
          <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90" disabled={busy} onClick={() => {
            setBusy(true);
            window.setTimeout(() => { setBusy(false); setSync("just now"); toast.success("All channels synced · rates and inventory pushed"); }, 900);
          }}><RefreshCw className={cn("mr-1 size-4", busy && "animate-spin")} /> {busy ? "Syncing…" : "Sync Now"}</Button>
        } />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {CHANNELS.map((c) => (
          <div key={c.name} className="card-premium hover-lift p-5">
            <div className="flex items-center justify-between">
              <span className="grid size-11 place-items-center rounded-xl bg-secondary text-xs font-bold">{c.logo}</span>
              <Pill tone={c.connected ? "success" : "warning"}>{c.connected ? "Demo Connected" : "Not connected"}</Pill>
            </div>
            <h3 className="mt-4 text-lg font-semibold">{c.name}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Bookings</dt><dd className="font-semibold">{c.bookings}</dd></div>
              <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Revenue</dt><dd className="font-semibold">{inr(c.revenue)}</dd></div>
              <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Commission</dt><dd className="font-semibold">{c.commission}%</dd></div>
              <div className="rounded-lg bg-secondary/60 p-2"><dt className="text-muted-foreground">Sync</dt><dd className="font-semibold">{c.sync}</dd></div>
            </dl>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1 rounded-lg" onClick={() => toast.success(`${c.name} inventory pushed`)}>Push inventory</Button>
              <Button size="sm" variant="ghost" onClick={() => toast.info(`${c.name} mapping opened`)}>Mapping</Button>
            </div>
          </div>
        ))}
      </div>

      <Panel title="Rate parity" description="Direct rate compared with connected channels for 15 Aug" bodyClassName="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Channel</TableHead><TableHead>Deluxe King rate</TableHead><TableHead>Variance vs direct</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {CHANNELS.map((c) => {
              const diff = c.rate - 4500;
              return (
                <TableRow key={c.name}>
                  <TableCell className="font-medium">{c.name === "Direct Website" ? "DRB Hotel (Direct)" : c.name}</TableCell>
                  <TableCell className="tabular-nums">{inr(c.rate)}</TableCell>
                  <TableCell className={cn("tabular-nums", diff < 0 ? "text-destructive" : "text-success")}>{diff === 0 ? "—" : `${diff > 0 ? "+" : ""}${inr(diff)}`}</TableCell>
                  <TableCell><Pill tone={diff < 0 ? "destructive" : "success"}>{diff < 0 ? "Parity breach" : "In parity"}</Pill></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Panel>

      <Panel title="Inventory sync" description="Rooms released to each channel">
        <div className="space-y-4">
          {CHANNELS.slice(0, 4).map((c) => (
            <div key={c.name}>
              <div className="mb-1 flex justify-between text-sm"><span className="flex items-center gap-2"><Globe className="size-3.5 text-gold" />{c.name}</span><span className="text-muted-foreground">{c.bookings} rooms sold</span></div>
              <ProgressBar value={Math.min(100, c.bookings)} tone="gold" />
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
