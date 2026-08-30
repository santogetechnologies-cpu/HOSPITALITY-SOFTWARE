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
      { name: "description", content: "Manage every DRB Hotel reservation: confirmed, in-house, checked out, and cancelled bookings." },
      { property: "og:title", content: "DRB Hotel — Reservations" },
      { property: "og:description", content: "Manage every DRB Hotel reservation: confirmed, in-house, checked out, and cancelled bookings." },
    ],
  }),
  component: ReservationsPage,
});

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const TABS: (ReservationStatus | "All")[] = ["All", "CONFIRMED", "OCCUPIED", "PENDING", "COMPLETED", "CANCELLED"];

function ReservationsPage() {
  const { reservations, guests, rooms, checkIn, checkOut, setReservationStatus, setRoomStatus } = usePms();
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<string>("All");
  const [q, setQ] = React.useState("");
  const [sortBy, setSortBy] = React.useState("arrival");

  const [blockOpen, setBlockOpen] = React.useState(false);
  const [selectedRoomToBlock, setSelectedRoomToBlock] = React.useState("");
  const [blockStatus, setBlockStatus] = React.useState("MAINTENANCE");
  const [blockReason, setBlockReason] = React.useState("");

  const getGuest = (guestId?: string) => guests.find(g => g.id === guestId);
  const getRoom = (roomId?: string) => rooms.find(rm => rm.id === roomId);

  const handleBlockRoom = async () => {
    if (!selectedRoomToBlock) return toast.error("Please select a room to block");
    await setRoomStatus(selectedRoomToBlock, blockStatus as any);
    const rm = rooms.find(r => r.id === selectedRoomToBlock);
    toast.success(`Room ${rm?.room_number || ''} status updated to ${blockStatus}`);
    setBlockOpen(false);
    setSelectedRoomToBlock("");
    setBlockReason("");
  };

  const rows = reservations
    .filter((r) => (tab === "All" || r.status === tab))
    .filter((r) => {
      if (!q.trim()) return true;
      const guest = getGuest(r.guest_id);
      const room = getRoom(r.room_id);
      const term = q.toLowerCase().trim();
      return (
        r.id.toLowerCase().includes(term) ||
        (guest?.name && guest.name.toLowerCase().includes(term)) ||
        (guest?.phone && guest.phone.includes(term)) ||
        (room?.room_number && room.room_number.toLowerCase().includes(term))
      );
    })
    .sort((a, b) => {
      if (sortBy === "amount") return (b.base_amount || 0) - (a.base_amount || 0);
      return (a.booking_date || "").localeCompare(b.booking_date || "");
    });

  return (
    <>
      <PageHeader
        eyebrow="Front Office"
        title="Reservations"
        subtitle={`${reservations.length} total bookings on the books`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setBlockOpen(true)}>
              <Layers className="mr-1 size-4" /> Block Room / OOS
            </Button>
            <Button className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90" onClick={() => void navigate({ to: "/front-desk" })}>
              <CalendarPlus className="mr-1 size-4" /> New Booking
            </Button>
          </div>
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
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search guest name, phone, confirmation # or room" className="pl-9" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sort" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="arrival">Sort: Booking Date</SelectItem>
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
                <TableHead>Guest Name & Contact</TableHead>
                <TableHead>Room / Resource</TableHead>
                <TableHead>Booking Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const guest = getGuest(r.guest_id);
                const room = getRoom(r.room_id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-semibold text-gold">{r.id.slice(0, 10).toUpperCase()}</TableCell>
                    <TableCell>
                      <div className="font-medium">{guest?.name || "Guest"}</div>
                      <div className="text-[11px] text-muted-foreground">{guest?.phone || "No phone"}</div>
                    </TableCell>
                    <TableCell>
                      {r.resource_type === 'PARTY_HALL' ? (
                        <span className="font-semibold text-xs text-gold">Party Hall ({r.event_type || 'Event'})</span>
                      ) : room ? (
                        <span className="font-semibold text-xs">Room {room.room_number || (room as any).number}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">General Room</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{r.booking_date || "—"}</TableCell>
                    <TableCell className="font-semibold">{inr(r.base_amount || 0)}</TableCell>
                    <TableCell>
                      <Pill tone={r.status === "OCCUPIED" ? "info" : r.status === "CONFIRMED" ? "success" : r.status === "COMPLETED" ? "gold" : "warning"}>
                        {r.status}
                      </Pill>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost"><MoreHorizontal className="size-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { checkIn(r.id, r.room_id); toast.success("Checked in"); }}>Check in</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { checkOut(r.id); toast.success("Checked out"); }}>Check out</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setReservationStatus(r.id, "CONFIRMED"); toast.success("Confirmed"); }}>Mark Confirmed</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setReservationStatus(r.id, "CANCELLED"); toast.warning("Cancelled"); }}>Cancel Booking</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!rows.length && <div className="p-6"><EmptyState title="No reservations found" body="Try a different tab or clear the search filter." /></div>}
      </Panel>

      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Block Room / Out of Service</DialogTitle>
            <DialogDescription>Change room status for maintenance or operational hold.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Select Room</Label>
              <Select value={selectedRoomToBlock} onValueChange={setSelectedRoomToBlock}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.map((rm) => (
                    <SelectItem key={rm.id} value={rm.id}>
                      Room {rm.room_number || (rm as any).number} — Floor {rm.floor || "1"} ({rm.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Target Status</Label>
              <Select value={blockStatus} onValueChange={setBlockStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAINTENANCE">Maintenance (Engineering)</SelectItem>
                  <SelectItem value="OUT OF SERVICE">Out of Service (Blocked)</SelectItem>
                  <SelectItem value="DIRTY">Mark Dirty (Needs Cleaning)</SelectItem>
                  <SelectItem value="AVAILABLE">Available (Unblock / Vacant Clean)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason / Notes</Label>
              <Input
                placeholder="e.g. AC servicing, deep painting, plumbing repair"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setBlockOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-brass text-gold-foreground hover:opacity-90" onClick={handleBlockRoom}>
                Apply Status Change
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
