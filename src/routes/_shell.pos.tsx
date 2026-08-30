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
import { MENU, MENU_CATEGORIES } from "@/lib/pms-data";
import { Plus, Minus, UtensilsCrossed } from "lucide-react";

export const Route = createFileRoute("/_shell/pos")({
  head: () => ({
    meta: [
      { title: "POS / Restaurant — DRB Hotel PMS" },
      { name: "description", content: "DRB Hotel restaurant point of sale: menu, KOT, room charges and payments." },
      { property: "og:title", content: "DRB Hotel — POS / Restaurant" },
      { property: "og:description", content: "DRB Hotel restaurant point of sale: menu, KOT, room charges and payments." },
    ],
  }),
  component: Pos,
});

function Pos() {
  const { addOrder, orders } = usePms();
  const [cat, setCat] = React.useState("Breakfast");
  const [target, setTarget] = React.useState("Room 202");
  const [cart, setCart] = React.useState<{ name: string; qty: number; price: number }[]>([]);
  const subtotal = cart.reduce((a, b) => a + b.price * b.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const add = (name: string, price: number) => setCart((c) => (c.some((i) => i.name === name) ? c.map((i) => (i.name === name ? { ...i, qty: i.qty + 1 } : i)) : [...c, { name, qty: 1, price }]));
  const dec = (name: string) => setCart((c) => c.flatMap((i) => (i.name === name ? (i.qty > 1 ? [{ ...i, qty: i.qty - 1 }] : []) : [i])));
  const place = (status: "KOT Sent" | "Charged to Room" | "Paid") => {
    if (!cart.length) { toast.error("Add items to the order first"); return; }
    addOrder({ target, guest: target.startsWith("Room") ? "In-house guest" : "Walk-in", items: cart, total: subtotal + tax, status });
    toast.success(`${status} · ${target} · ${inr(subtotal + tax)}`);
    setCart([]);
  };

  return (
    <>
      <PageHeader eyebrow="F&B" title="POS / Restaurant" subtitle="The Ivory Room · Lunch service" />
      <div className="grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-4">
          <Tabs value={cat} onValueChange={setCat}>
            <TabsList className="flex-wrap rounded-xl">
              {MENU_CATEGORIES.map((c) => <TabsTrigger key={c} value={c} className="rounded-lg">{c}</TabsTrigger>)}
            </TabsList>
          </Tabs>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MENU.filter((m) => m.category === cat).map((m) => (
              <button key={m.id} onClick={() => add(m.name, m.price)} className="card-premium hover-lift p-4 text-left">
                <div className="grid h-20 place-items-center rounded-xl bg-secondary text-3xl">{m.emoji}</div>
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div><div className="text-sm font-semibold">{m.name}</div><div className="text-[11px] text-muted-foreground">{m.category}</div></div>
                  <span className={cn("mt-1 size-2.5 rounded-full", m.veg ? "bg-success" : "bg-destructive")} />
                </div>
                <div className="mt-2 text-sm font-semibold">{inr(m.price)}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Panel title="Current order">
            <div className="space-y-2">
              <Label>Table / Room</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["Room 202", "Room 305", "Room 401", "Table 4", "Table 7", "Poolside 2"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <ul className="mt-4 space-y-2">
              {cart.map((i) => (
                <li key={i.name} className="flex items-center justify-between rounded-xl border border-border px-3 py-2 text-sm">
                  <span className="min-w-0 truncate">{i.name}</span>
                  <span className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => dec(i.name)}><Minus className="size-3" /></Button>
                    <span className="w-5 text-center tabular-nums">{i.qty}</span>
                    <Button size="icon" variant="ghost" className="size-7" onClick={() => add(i.name, i.price)}><Plus className="size-3" /></Button>
                    <span className="w-16 text-right tabular-nums">{inr(i.price * i.qty)}</span>
                  </span>
                </li>
              ))}
              {!cart.length ? <EmptyState title="No items yet" body="Tap a dish to start the order." icon={UtensilsCrossed} /> : null}
            </ul>
            <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{inr(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST 5%</span><span>{inr(tax)}</span></div>
              <div className="flex justify-between text-base font-semibold"><span>Total</span><span>{inr(subtotal + tax)}</span></div>
            </div>
            <div className="mt-4 grid gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => place("KOT Sent")}>Send KOT</Button>
              <Button variant="outline" className="rounded-xl" onClick={() => place("Charged to Room")}>Charge to Room</Button>
              <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => place("Paid")}>Pay Now</Button>
            </div>
          </Panel>

          <Panel title="Recent orders" bodyClassName="p-0">
            <ul className="divide-y divide-border">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div><div className="font-medium">{o.target}</div><div className="text-[11px] text-muted-foreground">{o.id} · {o.time}</div></div>
                  <div className="text-right"><div className="font-semibold">{inr(o.total)}</div><Pill tone={o.status === "Paid" ? "success" : "info"}>{o.status}</Pill></div>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
