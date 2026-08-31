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
import { inr } from "@/lib/pms-data";
import { Search, MoreHorizontal, CalendarPlus, Layers, Ban, CheckCircle2, Trash2, CalendarDays, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_shell/reservations/")({
  head: () => ({
    meta: [
      { title: "Reservations & Bookings — DRB Hotel PMS" },
      { name: "description", content: "Manage every DRB Hotel reservation: confirmed, in-house, blocked, checked out, and cancelled bookings." },
      { property: "og:title", content: "DRB Hotel — Reservations" },
      { property: "og:description", content: "Manage every DRB Hotel reservation: confirmed, in-house, blocked, checked out, and cancelled bookings." },
    ],
  }),
  component: ReservationsPage,
});

const TABS = ["All", "CONFIRMED", "OCCUPIED", "PENDING", "BLOCKED", "COMPLETED", "CANCELLED"] as const;
type Timeframe = "ALL" | "1D" | "1W" | "1M" | "CUSTOM";

function ReservationsPage() {
  const { reservations, guests, rooms, checkIn, checkOut, setReservationStatus, setRoomStatus, deleteReservation, session } = usePms();
  const isAdmin = session?.role === "SUPER_ADMIN" || session?.role === "GM" || !session;
  const navigate = useNavigate();
  const [tab, setTab] = React.useState<string>("All");
  const [q, setQ] = React.useState("");
  const [sortBy, setSortBy] = React.useState("arrival");

  // Timeframe filter state
  const todayStr = new Date().toISOString().split("T")[0];
  const [timeframe, setTimeframe] = React.useState<Timeframe>("ALL");
  const [customStart, setCustomStart] = React.useState<string>(todayStr);
  const [customEnd, setCustomEnd] = React.useState<string>(todayStr);

  const [blockOpen, setBlockOpen] = React.useState(false);
  const [selectedRoomToBlock, setSelectedRoomToBlock] = React.useState("");
  const [blockStatus, setBlockStatus] = React.useState("OUT OF SERVICE");
  const [blockReason, setBlockReason] = React.useState("");

  const getGuest = (guestId?: string) => guests.find(g => g.id === guestId);
  const getRoom = (roomId?: string) => rooms.find(rm => rm.id === roomId);

  const blockedRooms = rooms.filter(r => r.status === "OUT OF SERVICE" || r.status === "MAINTENANCE");

  // Date range filter calculation
  const { rangeStart, rangeEnd } = React.useMemo(() => {
    if (timeframe === "ALL") return { rangeStart: null, rangeEnd: null };

    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    if (timeframe === "1D") {
      // today only
    } else if (timeframe === "1W") {
      start.setDate(start.getDate() - 6);
    } else if (timeframe === "1M") {
      start.setDate(start.getDate() - 29);
    } else if (timeframe === "CUSTOM") {
      if (customStart) {
        const s = new Date(`${customStart}T00:00:00`);
        if (!isNaN(s.getTime())) start.setTime(s.getTime());
      }
      if (customEnd) {
        const e = new Date(`${customEnd}T23:59:59`);
        if (!isNaN(e.getTime())) end.setTime(e.getTime());
      }
    }
    return { rangeStart: start, rangeEnd: end };
  }, [timeframe, customStart, customEnd]);

  const handleBlockRoom = async () => {
    if (!selectedRoomToBlock) return toast.error("Please select a room to block");
    await setRoomStatus(selectedRoomToBlock, blockStatus as any);
    const rm = rooms.find(r => r.id === selectedRoomToBlock);
    toast.success(`Room ${rm?.room_number || ''} status set to ${blockStatus}`);
    setBlockOpen(false);
    setSelectedRoomToBlock("");
    setBlockReason("");
  };

  const handleUnblockRoom = async (roomId: string, roomNum: string) => {
    await setRoomStatus(roomId, "AVAILABLE");
    toast.success(`Room ${roomNum} is now unblocked and AVAILABLE for booking`);
  };

  // Reservation rows with date & tab filtering
  const reservationRows = reservations
    .filter((r) => (tab === "All" || r.status === tab))
    .filter((r) => {
      if (!rangeStart || !rangeEnd) return true;
      const rDate = new Date(r.start_time || `${r.booking_date}T00:00:00`);
      return rDate >= rangeStart && rDate <= rangeEnd;
    })
    .filter((r) => {
      if (!q.trim()) return true;
      const guest = getGuest(r.guest_id);
      const room = getRoom(r.room_id);
      const term = q.toLowerCase().trim();
      const resId = String(r.id || "");
      const rNum = String(room?.room_number || (room as any)?.number || "");
      return (
        resId.toLowerCase().includes(term) ||
        (guest?.name && guest.name.toLowerCase().includes(term)) ||
        (guest?.phone && String(guest.phone).includes(term)) ||
        rNum.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => {
      if (sortBy === "amount") {
        return (Number(b.base_amount) || 0) - (Number(a.base_amount) || 0);
      }
      return new Date(b.booking_date || 0).getTime() - new Date(a.booking_date || 0).getTime();
    });

  // Blocked room rows (displayed in 'All' and 'BLOCKED' tab)
  const blockedRows = (tab === "All" || tab === "BLOCKED")
    ? blockedRooms.filter((rm) => {
        if (!q.trim()) return true;
        const term = q.toLowerCase().trim();
        const rNum = String(rm.room_number || (rm as any)?.number || "");
        const rStatus = String(rm.status || "");
        return rNum.toLowerCase().includes(term) || rStatus.toLowerCase().includes(term);
      })
    : [];

  const getTabCount = (t: typeof TABS[number]) => {
    if (t === "All") return reservations.length + blockedRooms.length;
    if (t === "BLOCKED") return blockedRooms.length + reservations.filter(r => r.status === "BLOCKED").length;
    return reservations.filter((r) => r.status === t).length;
  };

  const totalFilteredValue = reservationRows.reduce((acc, r) => acc + (Number(r.base_amount) || 0), 0);

  return (
    <>
      <PageHeader
        eyebrow="Front Office"
        title="Reservations & Bookings"
        subtitle={`${reservations.length} bookings on record · ${blockedRooms.length} rooms currently blocked`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setBlockOpen(true)}>
              <Layers className="mr-1.5 size-4" /> Block Room / OOS
            </Button>
            <Button className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90" onClick={() => void navigate({ to: "/front-desk" })}>
              <CalendarPlus className="mr-1.5 size-4" /> New Booking
            </Button>
          </div>
        }
      />

      {/* Date & Timeframe Filter Toolbar */}
      <Panel bodyClassName="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-gold" />
            <span className="text-xs font-semibold uppercase text-foreground">Date Window:</span>
            <div className="inline-flex rounded-xl bg-secondary/80 p-1">
              <Button
                size="sm"
                variant={timeframe === "ALL" ? "default" : "ghost"}
                className={timeframe === "ALL" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("ALL")}
              >
                All Time
              </Button>
              <Button
                size="sm"
                variant={timeframe === "1D" ? "default" : "ghost"}
                className={timeframe === "1D" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("1D")}
              >
                1 Day (Today)
              </Button>
              <Button
                size="sm"
                variant={timeframe === "1W" ? "default" : "ghost"}
                className={timeframe === "1W" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("1W")}
              >
                1 Week
              </Button>
              <Button
                size="sm"
                variant={timeframe === "1M" ? "default" : "ghost"}
                className={timeframe === "1M" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("1M")}
              >
                1 Month
              </Button>
              <Button
                size="sm"
                variant={timeframe === "CUSTOM" ? "default" : "ghost"}
                className={timeframe === "CUSTOM" ? "h-7 rounded-lg bg-brass text-gold-foreground shadow-sm text-xs font-semibold" : "h-7 rounded-lg text-xs"}
                onClick={() => setTimeframe("CUSTOM")}
              >
                Custom
              </Button>
            </div>
          </div>

          {timeframe === "CUSTOM" && (
            <div className="flex flex-wrap items-center gap-2 bg-secondary/50 p-1.5 rounded-xl border border-border">
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">From:</Label>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-7 w-32 text-xs"
                />
              </div>
              <div className="flex items-center gap-1">
                <Label className="text-xs text-muted-foreground">To:</Label>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-7 w-32 text-xs"
                />
              </div>
            </div>
          )}

          <div className="text-xs font-medium text-muted-foreground">
            Showing: <span className="font-semibold text-foreground">{reservationRows.length} bookings</span> · Total Value: <span className="font-semibold text-gold">{inr(totalFilteredValue)}</span>
          </div>
        </div>
      </Panel>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap rounded-xl">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="rounded-lg">
              {t}
              <span className="ml-1.5 text-[10px] text-muted-foreground font-semibold">
                {getTabCount(t)}
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
                <TableHead>Stay Window</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Render Blocked Room Rows */}
              {blockedRows.map((rm) => {
                const rNum = String(rm.room_number || (rm as any)?.number || rm.id);
                return (
                  <TableRow key={rm.id} className="bg-destructive/5">
                    <TableCell className="font-mono text-xs font-semibold text-destructive">
                      BLK-{rNum}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-destructive flex items-center gap-1.5">
                        <Ban className="size-3.5" /> Room Blocked / Out of Service
                      </div>
                      <div className="text-[11px] text-muted-foreground">Maintenance / Administrative Hold</div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold text-xs text-foreground">Room {rNum} ({rm.room_name || 'Standard'})</span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">Active Block</TableCell>
                    <TableCell className="font-semibold text-muted-foreground">—</TableCell>
                    <TableCell>
                      <Pill tone="destructive">{rm.status || "OUT OF SERVICE"}</Pill>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                        onClick={() => handleUnblockRoom(rm.id, rNum)}
                      >
                        <CheckCircle2 className="size-3.5 mr-1" /> Unblock
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}

              {/* Render Reservations Rows */}
              {reservationRows.map((r) => {
                const guest = getGuest(r.guest_id);
                const room = getRoom(r.room_id);
                const confNum = String(r.id || "RES").slice(0, 10).toUpperCase();
                const startDateStr = r.start_time ? new Date(r.start_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : r.booking_date;
                const endDateStr = r.end_time ? new Date(r.end_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "";

                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-semibold text-gold">{confNum}</TableCell>
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
                    <TableCell className="text-xs">
                      {startDateStr} {endDateStr ? `→ ${endDateStr}` : ''}
                    </TableCell>
                    <TableCell className="font-semibold">{inr(r.base_amount || 0)}</TableCell>
                    <TableCell>
                      <Pill tone={r.status === "OCCUPIED" ? "info" : r.status === "CONFIRMED" ? "success" : r.status === "COMPLETED" ? "gold" : "warning"}>
                        {r.status || "CONFIRMED"}
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
                          {isAdmin && (
                            <DropdownMenuItem 
                              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                              onClick={async () => {
                                if (confirm(`Are you sure you want to permanently delete reservation #${confNum} for ${guest?.name || 'Guest'}?`)) {
                                  const delRes = await deleteReservation(r.id);
                                  if (delRes?.success) toast.success("Reservation deleted");
                                  else toast.error(delRes?.error || "Failed to delete reservation");
                                }
                              }}
                            >
                              <Trash2 className="size-3.5 mr-2" /> Delete Reservation
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!reservationRows.length && !blockedRows.length ? (
          <div className="p-8">
            <EmptyState title="No bookings found" body="Try selecting a different tab or adjusting your timeframe date filter." />
          </div>
        ) : null}
      </Panel>

      {/* Block Room Dialog */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Block Room / Out of Service</DialogTitle>
            <DialogDescription>Mark a room key as temporarily unavailable for maintenance or administrative block.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Select Room *</Label>
              <Select value={selectedRoomToBlock} onValueChange={setSelectedRoomToBlock}>
                <SelectTrigger><SelectValue placeholder="Choose room..." /></SelectTrigger>
                <SelectContent>
                  {rooms.map(rm => (
                    <SelectItem key={rm.id} value={rm.id}>
                      Room {rm.room_number || (rm as any).number} ({rm.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Block Type</Label>
              <Select value={blockStatus} onValueChange={setBlockStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUT OF SERVICE">Out of Service (Administrative)</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance / Repairs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason / Notes</Label>
              <Input placeholder="e.g. AC repair, plumbing overhaul" value={blockReason} onChange={e => setBlockReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setBlockOpen(false)}>Cancel</Button>
              <Button onClick={handleBlockRoom} className="bg-destructive text-destructive-foreground">Apply Block</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
