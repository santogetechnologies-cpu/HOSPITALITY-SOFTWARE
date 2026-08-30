import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState, PageHeader, Panel, Pill } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { inr, type ReservationStatus } from "@/lib/pms-data";
import { Search, MoreHorizontal, CalendarPlus, Users2, Layers, ListOrdered } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/reservations/")({
  head: () => ({
    meta: [
      { title: "Reservations — DRB Hotel PMS" },
      { name: "description", content: "Manage every DRB Hotel reservation: confirmed, tentative, in-house, checked out, cancelled and waitlisted bookings." },
      { property: "og:title", content: "DRB Hotel — Reservations" },
      { property: "og:description", content: "Manage every DRB Hotel reservation: confirmed, tentative, in-house, checked out, cancelled and waitlisted bookings." },
    ],
  }),
  component: ReservationsPage,
});

const TABS: (ReservationStatus | "All")[] = ["All", "Confirmed", "Tentative", "Checked In", "Checked Out", "Cancelled", "No Show", "Waitlist"];

function ReservationsPage() {
  const { reservations, checkIn, checkOut, setReservationStatus } = usePms();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<string>("All");
  const [q, setQ] = React.useState("");
  const [source, setSource] = React.useState("all");
  const [type, setType] = React.useState("all");
  const [sortBy, setSortBy] = React.useState("arrival");

  const sources = Array.from(new Set(reservations.map((r) => r.source)));
  const types = Array.from(new Set(reservations.map((r) => r.roomType)));

  const rows = reservations
    .filter((r) => (tab === "All" || r.status === tab))
    .filter((r) => (source === "all" || r.source === source))
    .filter((r) => (type === "all" || r.roomType === type))
    .filter((r) => !q.trim() || r.guest.toLowerCase().includes(q.toLowerCase()) || r.id.toLowerCase().includes(q.toLowerCase()) || r.room.includes(q))
    .sort((a, b) => (sortBy === "amount" ? b.amount - a.amount : a.arrival.localeCompare(b.arrival)));

  return (
    <>
      <PageHeader
        eyebrow="Front Office"
        title="Reservations"
        subtitle={`${reservations.length} bookings on the books · live demo data`}
        actions={
          <>
            <Button variant="outline" className="rounded-xl" onClick={() => toast.info("Group booking wizard opened (demo)")}> <Users2 className="mr-1 size-4" /> Group Booking</Button>
            <Button variant="outline" className="rounded-xl" onClick={() => toast.success("5 rooms blocked for Meridian Corp")}> <Layers className="mr-1 size-4" /> Block Rooms</Button>
            <Button variant="outline" className="rounded-xl" onClick={() => toast.info("Waitlist has 2 pending requests")}> <ListOrdered className="mr-1 size-4" /> Waitlist</Button>
            <Button className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90" onClick={() => void navigate({ to: "/reservations/new" })}>
              <CalendarPlus className="mr-1 size-4" /> New Reservation
            </Button>
          </>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap rounded-xl">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-lg">
              {t}
              <span className="ml-1.5 text-[10px] text-muted-foreground">
                {t === "All" ? reservations.length : reservations.filter((r) => r.status === t).length}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Panel bodyClassName="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guest, confirmation # or room" className="pl-9" />
          </div>
          <Input type="date" className="w-[170px]" defaultValue="2026-08-12" />
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-[170px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Room type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All room types</SelectItem>
              {types.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="arrival">Sort: Arrival</SelectItem>
              <SelectItem value="amount">Sort: Value</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Panel>

      <Panel bodyClassName="p-0">
        <div className="scroll-slim overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Confirmation #</TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Room Type</TableHead>
                <TableHead>Arrival</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Nights</TableHead>
                <TableHead>Rate Plan</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">{r.guest}{r.vip ? <Pill tone="gold">VIP</Pill> : null}</div>
                    <div className="text-[11px] text-muted-foreground">{r.phone}</div>
                  </TableCell>
                  <TableCell className="tabular-nums">{r.room}</TableCell>
                  <TableCell>{r.roomType}</TableCell>
                  <TableCell>{r.arrival}</TableCell>
                  <TableCell>{r.departure}</TableCell>
                  <TableCell>{r.nights}</TableCell>
                  <TableCell>{r.ratePlan}</TableCell>
                  <TableCell>{r.source}</TableCell>
                  <TableCell>
                    <Pill tone={r.payment === "Paid" ? "success" : r.payment === "Partial" ? "warning" : "destructive"}>{r.payment}</Pill>
                    <div className="mt-1 text-[11px] text-muted-foreground">{inr(r.amount)}</div>
                  </TableCell>
                  <TableCell>
                    <Pill tone={r.status === "Checked In" ? "info" : r.status === "Confirmed" ? "primary" : r.status === "Cancelled" || r.status === "No Show" ? "destructive" : "muted"}>{r.status}</Pill>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost"><MoreHorizontal className="size-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { checkIn(r.id); toast.success(`${r.guest} checked in`); }}>Check in</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { checkOut(r.id); toast.success(`${r.guest} checked out`); }}>Check out</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setReservationStatus(r.id, "Confirmed"); toast.success("Reservation confirmed"); }}>Confirm</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setReservationStatus(r.id, "Cancelled"); toast.warning("Reservation cancelled"); }}>Cancel</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setReservationStatus(r.id, "No Show"); toast.info("Marked as no show"); }}>Mark no show</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {!rows.length ? <div className="p-6"><EmptyState title="No reservations found" body="Try a different tab or clear the filters." /></div> : null}
      </Panel>
    </>
  );
}
