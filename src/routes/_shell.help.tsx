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
import { LifeBuoy, BookOpen, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_shell/help")({
  head: () => ({
    meta: [
      { title: "Help & Support — DRB Hotel PMS" },
      { name: "description", content: "Guides, shortcuts and support contacts for the DRB Hotel property management system." },
      { property: "og:title", content: "DRB Hotel — Help & Support" },
      { property: "og:description", content: "Guides, shortcuts and support contacts for the DRB Hotel property management system." },
    ],
  }),
  component: Help,
});

function Help() {
  return (
    <>
      <PageHeader eyebrow="Support" title="Help & Support" subtitle="Guides, shortcuts and a direct line to the DRB systems team" />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: BookOpen, title: "Operating guides", body: "Step-by-step walkthroughs for check-in, night audit and housekeeping." },
          { icon: MessageSquare, title: "Live chat", body: "Systems desk available 06:00–23:00 daily." },
          { icon: LifeBuoy, title: "Raise a ticket", body: "Log an issue with the PMS or a connected channel." },
        ].map((c) => (
          <div key={c.title} className="card-premium hover-lift p-5">
            <c.icon className="size-5 text-gold" />
            <h3 className="mt-3 text-lg font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={() => toast.success(`${c.title} opened`)}>Open</Button>
          </div>
        ))}
      </div>
      <Panel title="Keyboard shortcuts">
        <ul className="grid gap-2 sm:grid-cols-2">
          {[["⌘ K", "Global search"], ["G then D", "Go to dashboard"], ["G then R", "Go to rooms"], ["N", "New reservation"], ["C", "Check-in queue"], ["H", "Housekeeping board"]].map(([k, l]) => (
            <li key={k} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm"><span>{l}</span><kbd className="rounded border border-border px-2 py-0.5 text-xs">{k}</kbd></li>
          ))}
        </ul>
      </Panel>
    </>
  );
}
