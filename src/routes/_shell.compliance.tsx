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
import { ShieldCheck, FileCheck2, Globe2, Lock } from "lucide-react";

export const Route = createFileRoute("/_shell/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance — DRB Hotel PMS" },
      { name: "description", content: "DRB Hotel compliance: guest ID verification, foreign guest C-Forms, GST filings, audit logs and data security." },
      { property: "og:title", content: "DRB Hotel — Compliance" },
      { property: "og:description", content: "DRB Hotel compliance: guest ID verification, foreign guest C-Forms, GST filings, audit logs and data security." },
    ],
  }),
  component: Compliance,
});

function Compliance() {
  const { guests } = usePms();
  return (
    <>
      <PageHeader eyebrow="Governance" title="Compliance" subtitle="Statutory records, verification status and audit trail" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="ID documents verified" value="86%" icon={FileCheck2} tone="success" />
        <KpiCard label="Foreign guest records" value="7" icon={Globe2} tone="info" />
        <KpiCard label="C-Forms filed" value="5 of 7" icon={ShieldCheck} tone="warning" />
        <KpiCard label="GST returns" value="Up to date" icon={Lock} tone="gold" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Guest ID documents" description="Masked previews only — no real identity data stored" bodyClassName="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Guest</TableHead><TableHead>Document</TableHead><TableHead>Number</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {guests.slice(0, 8).map((g, i) => (
                <TableRow key={g.id}>
                  <TableCell className="font-medium">{g.name}</TableCell>
                  <TableCell>{g.country === "India" ? "Aadhaar" : "Passport"}</TableCell>
                  <TableCell className="font-mono text-xs">{g.country === "India" ? "XXXX XXXX 48" + (10 + i) : "P-XXXXX" + (200 + i)}</TableCell>
                  <TableCell><Pill tone={i % 4 === 0 ? "warning" : i % 7 === 0 ? "destructive" : "success"}>{i % 4 === 0 ? "Pending" : i % 7 === 0 ? "Needs Review" : "Verified"}</Pill></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
        <div className="space-y-6">
          <Panel title="Foreign guest C-Form status">
            <ul className="space-y-2 text-sm">
              {guests.filter((g) => g.country !== "India").slice(0, 5).map((g, i) => (
                <li key={g.id} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <div><div className="font-medium">{g.name}</div><div className="text-[11px] text-muted-foreground">{g.country} · arrived {g.lastStay}</div></div>
                  <Button size="sm" variant={i === 0 ? "default" : "outline"} className="rounded-lg" onClick={() => toast.success(`C-Form submitted for ${g.name}`)}>{i === 0 ? "File C-Form" : "Filed"}</Button>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Audit log">
            <ul className="space-y-2 text-xs text-muted-foreground">
              {["Rate override applied — Deluxe King 15 Aug (manager)", "Folio discount ₹900 approved (frontdesk)", "Night audit run for 11 Aug (accounts)", "User role updated — housekeeping supervisor", "Invoice DRB/2026/0841 emailed"].map((l, i) => (
                <li key={i} className="flex justify-between rounded-lg border border-border px-3 py-2"><span>{l}</span><span>{i + 1}h ago</span></li>
              ))}
            </ul>
          </Panel>
          <Panel title="Data security">
            <ul className="space-y-3 text-sm">
              {[["Guest data encryption", true], ["Role-based access control", true], ["Document retention policy (12 months)", true], ["Two-factor authentication", false]].map(([l, on]) => (
                <li key={l as string} className="flex items-center justify-between rounded-xl border border-border p-3">
                  <span>{l as string}</span><Switch defaultChecked={on as boolean} onCheckedChange={() => toast.info(`${l} setting updated`)} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
