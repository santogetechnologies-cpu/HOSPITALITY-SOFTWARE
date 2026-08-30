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
import { Bell, CheckCheck } from "lucide-react";

export const Route = createFileRoute("/_shell/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — DRB Hotel PMS" },
      { name: "description", content: "Every DRB Hotel operational alert: bookings, housekeeping, payments, VIPs, maintenance and OTA activity." },
      { property: "og:title", content: "DRB Hotel — Notifications" },
      { property: "og:description", content: "Every DRB Hotel operational alert: bookings, housekeeping, payments, VIPs, maintenance and OTA activity." },
    ],
  }),
  component: Notifications,
});

function Notifications() {
  const { notifications, markAllRead, toggleRead } = usePms();
  const [filter, setFilter] = React.useState("all");
  const rows = notifications.filter((n) => filter === "all" || n.type === filter);
  return (
    <>
      <PageHeader eyebrow="Alerts" title="Notification Centre" subtitle={`${notifications.filter((n) => !n.read).length} unread alerts`}
        actions={<Button variant="outline" className="rounded-xl" onClick={() => { markAllRead(); toast.success("All notifications marked read"); }}><CheckCheck className="mr-1 size-4" /> Mark all read</Button>} />
      <Panel bodyClassName="p-4">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="flex-wrap rounded-xl">
            {["all", "booking", "housekeeping", "payment", "vip", "maintenance", "ota"].map((t) => (
              <TabsTrigger key={t} value={t} className="rounded-lg capitalize">{t}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Panel>
      <Panel bodyClassName="p-0">
        <ul className="divide-y divide-border">
          {rows.map((n) => (
            <li key={n.id} className={cn("flex items-start gap-4 px-5 py-4", !n.read && "bg-accent/40")}>
              <span className="text-xl">{n.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{n.title}</span><Pill tone="muted">{n.type}</Pill></div>
                <p className="text-sm text-muted-foreground">{n.body}</p>
                <span className="text-[11px] text-muted-foreground">{n.time}</span>
              </div>
              <Button size="sm" variant="ghost" onClick={() => toggleRead(n.id)}>{n.read ? "Mark unread" : "Mark read"}</Button>
            </li>
          ))}
        </ul>
        {!rows.length ? <div className="p-6"><EmptyState title="Nothing here" body="No notifications of this type." icon={Bell} /></div> : null}
      </Panel>
    </>
  );
}
