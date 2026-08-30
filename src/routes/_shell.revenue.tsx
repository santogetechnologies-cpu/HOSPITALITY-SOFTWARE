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
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { OCCUPANCY_TREND, FORECAST, RATE_CALENDAR_DATES, ROOM_TYPES } from "@/lib/pms-data";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_shell/revenue")({
  head: () => ({
    meta: [
      { title: "Revenue Management — DRB Hotel PMS" },
      { name: "description", content: "DRB Hotel revenue intelligence: occupancy, ADR, RevPAR trends, forecasts and a dynamic rate calendar." },
      { property: "og:title", content: "DRB Hotel — Revenue Management" },
      { property: "og:description", content: "DRB Hotel revenue intelligence: occupancy, ADR, RevPAR trends, forecasts and a dynamic rate calendar." },
    ],
  }),
  component: Revenue,
});

const tt = { borderRadius: 12, border: "1px solid var(--border)", background: "var(--card)", fontSize: 12 };

function Revenue() {
  const [rates, setRates] = React.useState<Record<string, number>>({});
  const key = (t: string, d: string) => `${t}|${d}`;
  const rateFor = (base: number, t: string, d: string, i: number) => rates[key(t, d)] ?? Math.round(base * (i >= 4 ? 1.22 : i === 3 ? 1.1 : 1));

  return (
    <>
      <PageHeader eyebrow="Commercial" title="Revenue Management" subtitle="Pricing intelligence and demand forecasting for the next seven days" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Occupancy" value="78%" delta="+4.2%" tone="gold" icon={TrendingUp} />
        <KpiCard label="ADR" value={inr(4780)} delta="+3.1%" tone="info" />
        <KpiCard label="RevPAR" value={inr(3728)} delta="+6.4%" tone="success" />
        <KpiCard label="Room Revenue" value={inr(612000)} delta="+9.2%" tone="gold" />
        <KpiCard label="7-day Forecast" value={inr(1249000)} delta="+12%" tone="info" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Occupancy & ADR trend">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={OCCUPANCY_TREND} margin={{ left: -18, top: 10 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <RTooltip contentStyle={tt} />
                <Line type="monotone" dataKey="occ" name="Occupancy %" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="adr" name="ADR" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="revpar" name="RevPAR" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Revenue forecast" description="Actual vs forecast room revenue">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={FORECAST} margin={{ left: -10, top: 10 }}>
                <defs>
                  <linearGradient id="fc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 6" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <RTooltip contentStyle={tt} />
                <Area type="monotone" dataKey="forecast" name="Forecast" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#fc)" />
                <Area type="monotone" dataKey="actual" name="Actual" stroke="var(--chart-2)" strokeWidth={2} fill="none" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <Panel title="Rate calendar" description="Edit any cell — weekend and high-demand dates are highlighted" bodyClassName="p-0">
        <div className="scroll-slim overflow-x-auto">
          <div className="min-w-[820px]">
            <div className="grid grid-cols-[190px_repeat(7,1fr)] border-b border-border bg-sheen">
              <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Room type</div>
              {RATE_CALENDAR_DATES.map((d, i) => (
                <div key={d} className={cn("px-2 py-3 text-center text-xs font-semibold", i >= 4 && "text-gold")}>
                  {d}<span className="block text-[9px] font-normal text-muted-foreground">{i >= 4 ? "High demand" : i === 3 ? "Weekend" : "Base"}</span>
                </div>
              ))}
            </div>
            {ROOM_TYPES.map((t) => (
              <div key={t.type} className="grid grid-cols-[190px_repeat(7,1fr)] border-b border-border last:border-0">
                <div className="px-4 py-3 text-sm font-medium">{t.type}</div>
                {RATE_CALENDAR_DATES.map((d, i) => (
                  <div key={d} className={cn("border-l border-border p-1.5", i >= 4 && "bg-gold/5")}>
                    <Input
                      className="h-9 text-center text-xs tabular-nums"
                      value={rateFor(t.base, t.type, d, i)}
                      onChange={(e) => setRates((s) => ({ ...s, [key(t.type, d)]: Number(e.target.value || 0) }))}
                      onBlur={() => toast.success(`${t.type} rate updated for ${d}`)}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </>
  );
}
