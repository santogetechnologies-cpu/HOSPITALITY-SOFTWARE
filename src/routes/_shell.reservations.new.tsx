import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PageHeader, Panel, Pill } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { inr, ROOM_TYPES } from "@/lib/pms-data";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Check, CircleCheck } from "lucide-react";

export const Route = createFileRoute("/_shell/reservations/new")({
  head: () => ({
    meta: [
      { title: "New Reservation — DRB Hotel PMS" },
      { name: "description", content: "Create a DRB Hotel reservation through a guided guest, stay, pricing and confirmation workflow." },
      { property: "og:title", content: "DRB Hotel — New Reservation" },
      { property: "og:description", content: "Create a DRB Hotel reservation through a guided guest, stay, pricing and confirmation workflow." },
    ],
  }),
  component: NewReservation,
});

const STEPS = ["Guest", "Stay", "Pricing", "Confirmation"];

function NewReservation() {
  const { rooms, guests, addReservation } = usePms();
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const [done, setDone] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    guest: "",
    email: "",
    phone: "",
    idType: "Aadhaar",
    idNumber: "XXXX-XXXX-4821",
    arrival: "2026-08-12",
    departure: "2026-08-14",
    adults: "2",
    roomType: "Deluxe King",
    room: "",
    ratePlan: "Best Flexible",
    source: "Direct Website",
    discount: "0",
    deposit: "5000",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const nights = Math.max(1, (new Date(form.departure).getTime() - new Date(form.arrival).getTime()) / 86400000);
  const base = ROOM_TYPES.find((t) => t.type === form.roomType)?.base ?? 4500;
  const roomTotal = base * nights;
  const discount = Number(form.discount || 0);
  const service = Math.round(roomTotal * 0.05);
  const tax = Math.round((roomTotal - discount + service) * 0.18);
  const total = roomTotal - discount + service + tax;
  const available = rooms.filter((r) => r.type === form.roomType && ["vacant-clean", "vacant-dirty"].includes(r.status));

  if (done) {
    return (
      <>
        <PageHeader eyebrow="Reservations" title="Reservation confirmed" subtitle="A confirmation email and SMS have been queued (demo)." />
        <Panel>
          <div className="flex flex-col items-center py-10 text-center">
            <span className="grid size-16 place-items-center rounded-full bg-success/12 text-success"><CircleCheck className="size-8" /></span>
            <h2 className="mt-4 text-2xl font-semibold">{done}</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {form.guest} · {form.roomType} · {nights} night(s) · {inr(total)} total. Room {form.room || available[0]?.number || "to be assigned"}.
            </p>
            <div className="mt-6 flex gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => void navigate({ to: "/reservations" })}>View reservations</Button>
              <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90" onClick={() => { setDone(null); setStep(0); }}>Create another</Button>
            </div>
          </div>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Reservations" title="New Reservation" subtitle="Four quick steps — guest, stay, pricing, confirmation" />

      <Panel bodyClassName="p-4">
        <ol className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => (
            <li key={s} className="flex-1">
              <button onClick={() => setStep(i)} className={cn("flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm transition-colors", i === step ? "border-gold bg-gold/10 text-foreground" : i < step ? "border-success/40 bg-success/8" : "border-border")}>
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-[11px] font-bold", i < step ? "bg-success text-success-foreground" : i === step ? "bg-brass text-gold-foreground" : "bg-secondary text-muted-foreground")}>
                  {i < step ? <Check className="size-3" /> : i + 1}
                </span>
                <span className="truncate font-medium">{s}</span>
              </button>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Panel title={`Step ${step + 1} — ${STEPS[step]}`}>
          {step === 0 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Existing guest</Label>
                <Select onValueChange={(v) => { const g = guests.find((x) => x.name === v); set("guest", v); if (g) { set("email", g.email); set("phone", g.phone); } }}>
                  <SelectTrigger><SelectValue placeholder="Search profiles…" /></SelectTrigger>
                  <SelectContent>{guests.map((g) => <SelectItem key={g.id} value={g.name}>{g.name} · {g.stays} stays</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Guest name</Label><Input value={form.guest} onChange={(e) => set("guest", e.target.value)} placeholder="New guest name" /></div>
                <div className="space-y-2"><Label>Email</Label><Input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="guest@example.com" /></div>
                <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+91 90000 00000" /></div>
                <div className="space-y-2"><Label>ID proof type</Label>
                  <Select value={form.idType} onValueChange={(v) => set("idType", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{["Aadhaar", "Passport", "Driving Licence", "Voter ID"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2"><Label>ID number (masked)</Label><Input value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} /></div>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Arrival</Label><Input type="date" value={form.arrival} onChange={(e) => set("arrival", e.target.value)} /></div>
              <div className="space-y-2"><Label>Departure</Label><Input type="date" value={form.departure} onChange={(e) => set("departure", e.target.value)} /></div>
              <div className="space-y-2"><Label>Guests</Label><Input type="number" min={1} value={form.adults} onChange={(e) => set("adults", e.target.value)} /></div>
              <div className="space-y-2"><Label>Room type</Label>
                <Select value={form.roomType} onValueChange={(v) => { set("roomType", v); set("room", ""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROOM_TYPES.map((t) => <SelectItem key={t.type} value={t.type}>{t.type} · {inr(t.base)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Available rooms ({available.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {available.map((r) => (
                    <button key={r.id} onClick={() => set("room", r.number)} className={cn("rounded-xl border px-3 py-2 text-sm transition-colors", form.room === r.number ? "border-gold bg-gold/10" : "border-border hover:border-gold/50")}>
                      {r.number} <span className="text-xs text-muted-foreground">Floor {r.floor}</span>
                    </button>
                  ))}
                  {!available.length ? <p className="text-sm text-muted-foreground">No vacant rooms of this type — the booking will be waitlisted.</p> : null}
                </div>
              </div>
              <div className="space-y-2"><Label>Rate plan</Label>
                <Select value={form.ratePlan} onValueChange={(v) => set("ratePlan", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Best Flexible", "Advance Purchase", "Corporate LRA", "Bed & Breakfast"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Booking source</Label>
                <Select value={form.source} onValueChange={(v) => set("source", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{["Direct Website", "Booking.com", "MakeMyTrip", "Goibibo", "Agoda", "Walk-in", "Corporate"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Discount (₹)</Label><Input value={form.discount} onChange={(e) => set("discount", e.target.value)} /></div>
                <div className="space-y-2"><Label>Deposit (₹)</Label><Input value={form.deposit} onChange={(e) => set("deposit", e.target.value)} /></div>
              </div>
              <ul className="divide-y divide-border rounded-xl border border-border text-sm">
                <Row label={`Room rate · ${nights} night(s) × ${inr(base)}`} value={inr(roomTotal)} />
                <Row label="Service charge (5%)" value={inr(service)} />
                <Row label="Discount" value={`- ${inr(discount)}`} />
                <Row label="GST (18%)" value={inr(tax)} />
                <Row label="Total payable" value={inr(total)} strong />
                <Row label="Deposit now" value={inr(Number(form.deposit || 0))} />
                <Row label="Balance on arrival" value={inr(total - Number(form.deposit || 0))} />
              </ul>
            </div>
          ) : (
            <div className="space-y-4 text-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Guest" value={form.guest || "—"} />
                <Info label="Contact" value={form.phone || form.email || "—"} />
                <Info label="Stay" value={`${form.arrival} → ${form.departure} (${nights} nights)`} />
                <Info label="Room" value={`${form.roomType}${form.room ? ` · ${form.room}` : ""}`} />
                <Info label="Rate plan" value={form.ratePlan} />
                <Info label="Source" value={form.source} />
                <Info label="ID proof" value={`${form.idType} · ${form.idNumber}`} />
                <Info label="Total" value={inr(total)} />
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" className="rounded-xl" onClick={() => {
                  if (!form.guest.trim()) { toast.error("Add a guest name first"); return; }
                  addReservation({ guest: form.guest, email: form.email, phone: form.phone, room: form.room || "—", roomType: form.roomType as never, arrival: "12 Aug 2026", departure: "14 Aug 2026", nights, amount: total, status: "Tentative", source: form.source, ratePlan: form.ratePlan, payment: "Pending" });
                  setDone("Reservation held for 24 hours");
                }}>Hold Reservation</Button>
                <Button className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90" onClick={() => {
                  if (!form.guest.trim()) { toast.error("Add a guest name first"); return; }
                  const res = addReservation({ guest: form.guest, email: form.email, phone: form.phone, room: form.room || "—", roomType: form.roomType as never, arrival: "12 Aug 2026", departure: "14 Aug 2026", nights, amount: total, paid: Number(form.deposit || 0), status: "Confirmed", source: form.source, ratePlan: form.ratePlan, payment: Number(form.deposit || 0) > 0 ? "Partial" : "Pending" });
                  toast.success(`Booking ${res.id} confirmed`);
                  setDone(`Booking ${res.id} confirmed`);
                }}>Confirm Booking</Button>
              </div>
            </div>
          )}

          <div className="mt-6 flex justify-between border-t border-border pt-4">
            <Button variant="ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>Back</Button>
            <Button variant="outline" className="rounded-xl" disabled={step === 3} onClick={() => setStep((s) => s + 1)}>Continue</Button>
          </div>
        </Panel>

        <Panel title="Booking summary" description="Live pricing preview">
          <div className="space-y-3 text-sm">
            <div className="rounded-xl bg-secondary/60 p-4">
              <div className="eyebrow">Guest</div>
              <div className="mt-1 font-semibold">{form.guest || "Unnamed guest"}</div>
              <div className="text-xs text-muted-foreground">{form.phone || "No contact yet"}</div>
            </div>
            <ul className="divide-y divide-border rounded-xl border border-border">
              <Row label="Nights" value={String(nights)} />
              <Row label="Room type" value={form.roomType} />
              <Row label="Room" value={form.room || "Unassigned"} />
              <Row label="Subtotal" value={inr(roomTotal)} />
              <Row label="Taxes & charges" value={inr(tax + service)} />
              <Row label="Total" value={inr(total)} strong />
            </ul>
            <Pill tone="gold">{available.length} rooms available</Pill>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <li className="flex items-center justify-between px-4 py-2.5">
      <span className={cn("text-muted-foreground", strong && "font-semibold text-foreground")}>{label}</span>
      <span className={cn("tabular-nums", strong && "text-base font-semibold")}>{value}</span>
    </li>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
