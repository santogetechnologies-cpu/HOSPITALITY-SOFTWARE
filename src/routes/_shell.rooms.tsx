import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState, PageHeader, Panel, Pill, RoomCard, StatusBadge, StatusLegend } from "@/components/pms/bits";
import { RoomDrawer } from "@/components/pms/room-drawer";
import { usePms } from "@/lib/pms-store";
import { ROOM_STATUSES, STATUS_META, inr, type Room, type RoomStatus } from "@/lib/pms-data";
import { getSafeStatusMeta } from "@/components/pms/bits";
import { cn } from "@/lib/utils";
import { Search, LayoutGrid, Building2, CalendarRange, Rows3, BedDouble } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_shell/rooms")({
  head: () => ({
    meta: [
      { title: "Rooms & Inventory — DRB Hotel PMS" },
      {
        name: "description",
        content:
          "Visual room status grid, floor plan, tape chart and inventory list for all 25 DRB Hotel keys.",
      },
      { property: "og:title", content: "DRB Hotel — Rooms & Inventory" },
      { property: "og:description", content: "Live room status across every floor of DRB Hotel." },
    ],
  }),
  component: RoomsPage,
});

const DATES = ["12 Aug", "13 Aug", "14 Aug", "15 Aug", "16 Aug", "17 Aug", "18 Aug"];

function RoomsPage() {
  const { rooms, reservations, transferRoom, guests, deleteRoom, session } = usePms();
  const isAdmin = session?.role === "SUPER_ADMIN" || session?.role === "GM" || !session;
  const [openRoom, setOpenRoom] = React.useState<Room | null>(null);
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<string>("all");
  const [floor, setFloor] = React.useState<string>("all");

  const filtered = rooms.filter(
    (r) =>
      (status === "all" || r.status === status) &&
      (floor === "all" || String(r.floor) === floor) &&
      (!q.trim() ||
        r.room_number?.includes(q.trim()) ||
        r.room_name?.toLowerCase().includes(q.trim().toLowerCase())),
  );

  const floors = Array.from(new Set(rooms.map((r) => r.floor || "1"))).sort();

  const getGuestName = (roomId: string) => {
    const res = reservations.find(r => r.room_id === roomId && r.status === 'OCCUPIED');
    if (res) {
      return guests.find(g => g.id === res.guest_id)?.name;
    }
    return undefined;
  };

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Rooms & Inventory"
        subtitle="25 keys across five floors · statuses update live as staff work the floor"
        actions={<Pill tone="gold">{rooms.filter((r) => r.status === "OCCUPIED").length} occupied</Pill>}
      />

      <Panel bodyClassName="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search room number, type or guest"
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {ROOM_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={floor} onValueChange={setFloor}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All floors</SelectItem>
              {floors.map((f) => (
                <SelectItem key={f} value={String(f)}>
                  Floor {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            onClick={() => {
              setQ("");
              setStatus("all");
              setFloor("all");
            }}
          >
            Reset
          </Button>
        </div>
        <div className="mt-4 border-t border-border pt-4">
          <StatusLegend />
        </div>
      </Panel>

      <Tabs defaultValue="grid">
        <TabsList className="rounded-xl">
          <TabsTrigger value="grid" className="rounded-lg">
            <LayoutGrid className="mr-1.5 size-4" /> Room Grid
          </TabsTrigger>
          <TabsTrigger value="floor" className="rounded-lg">
            <Building2 className="mr-1.5 size-4" /> Floor View
          </TabsTrigger>
          <TabsTrigger value="tape" className="rounded-lg">
            <CalendarRange className="mr-1.5 size-4" /> Tape Chart
          </TabsTrigger>
          <TabsTrigger value="list" className="rounded-lg">
            <Rows3 className="mr-1.5 size-4" /> List View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="grid" className="mt-5 space-y-6">
          {!filtered.length ? (
            <EmptyState
              icon={BedDouble}
              title="No rooms match these filters"
              body="Try clearing the status or floor filter to see the full inventory."
            />
          ) : (
            floors.map((f) => {
              const list = filtered.filter((r) => r.floor === f);
              if (!list.length) return null;
              return (
                <Panel
                  key={f}
                  title={`Floor ${f}`}
                  description={`${list.length} rooms · ${list.filter((r) => r.status === "OCCUPIED").length} occupied`}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                    {list.map((r) => (
                      <RoomCard key={r.id} room={r} onClick={() => setOpenRoom(r)} />
                    ))}
                  </div>
                </Panel>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="floor" className="mt-5 space-y-5">
          {floors.map((f) => {
            const list = rooms.filter((r) => r.floor === f);
            return (
              <Panel key={f} title={`Floor ${f}`} description="Corridor layout — lifts and service core at centre">
                <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-5">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr]">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {list.slice(0, 3).map((r) => (
                        <FloorTile key={r.id} room={r} onClick={() => setOpenRoom(r)} />
                      ))}
                    </div>
                    <div className="grid place-items-center rounded-xl bg-primary/5 px-4 py-3 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
                      Lift
                      <br />
                      lobby
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {list.slice(3).map((r) => (
                        <FloorTile key={r.id} room={r} onClick={() => setOpenRoom(r)} />
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            );
          })}
        </TabsContent>

        <TabsContent value="tape" className="mt-5">
          <Panel
            title="Tape chart"
            description="Seven-day reservation grid — click a block to simulate a room move"
            action={<Pill tone="info">Today marked</Pill>}
            bodyClassName="p-0"
          >
            <div className="scroll-slim overflow-x-auto">
              <div className="min-w-[860px]">
                <div className="grid grid-cols-[110px_repeat(7,1fr)] border-b border-border bg-sheen">
                  <div className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Room
                  </div>
                  {DATES.map((d, i) => (
                    <div
                      key={d}
                      className={cn(
                        "px-2 py-3 text-center text-xs font-semibold",
                        i === 0 && "bg-gold/10 text-gold",
                      )}
                    >
                      {d}
                      {i === 0 ? <span className="block text-[9px] font-normal">today</span> : null}
                    </div>
                  ))}
                </div>
                {rooms.map((room) => {
                  const res = reservations.filter((r) => r.room_id === room.id && r.status !== "CANCELLED");
                  const m = getSafeStatusMeta(room.status);
                  return (
                    <div
                      key={room.id}
                      className="grid grid-cols-[110px_repeat(7,1fr)] border-b border-border last:border-0"
                    >
                      <button
                        onClick={() => setOpenRoom(room)}
                        className="flex items-center gap-2 px-4 py-3 text-left text-sm hover:bg-accent/50"
                      >
                        <span className={cn("size-2 rounded-full", m.dot)} />
                        <span className="font-semibold tabular-nums">{room.room_number || (room as any).number}</span>
                      </button>
                      {DATES.map((d, i) => {
                        const booking = res.find((r) => {
                          const date = new Date(r.booking_date);
                          return i === 0;
                        });
                        return (
                          <div key={d} className={cn("relative border-l border-border px-1 py-2", i === 0 && "bg-gold/5")}>
                            {booking ? (
                              <button
                                onClick={() => {}}
                                className={cn(
                                  "w-full truncate rounded-md px-2 py-1.5 text-left text-[10px] font-semibold text-primary-foreground transition-transform hover:scale-[1.03]",
                                  booking.status === "OCCUPIED"
                                    ? "bg-st-occupied"
                                    : booking.status === "PENDING"
                                      ? "bg-st-cleaning text-gold-foreground"
                                      : booking.status === "COMPLETED"
                                        ? "bg-st-oos"
                                        : "bg-st-reserved",
                                )}
                              >
                                {booking.guest_id}
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-st-reserved" /> Confirmed</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-st-occupied" /> In-house</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-st-cleaning" /> Tentative</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-st-oos" /> Departed</span>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="list" className="mt-5">
          <Panel bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Housekeeping</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className="cursor-pointer" onClick={() => setOpenRoom(r)}>
                    <TableCell className="font-semibold tabular-nums">{r.room_number || (r as any).number}</TableCell>
                    <TableCell>{r.room_name || (r as any).type || "Room"}</TableCell>
                    <TableCell>{r.floor}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} size="sm" />
                    </TableCell>
                    <TableCell>{getGuestName(r.id) ?? "—"}</TableCell>
                    <TableCell>{r.status === 'DIRTY' ? 'Dirty' : 'Clean'}</TableCell>
                    <TableCell className="text-right font-medium">{inr(r.price || (r as any).rate || 0)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button size="sm" variant="ghost" onClick={() => setOpenRoom(r)}>
                          Open
                        </Button>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={async () => {
                              const rNum = r.room_number || (r as any).number;
                              if (confirm(`Are you sure you want to delete Room ${rNum}?`)) {
                                const res = await deleteRoom(r.id);
                                if (res?.success) toast.success(`Room ${rNum} deleted`);
                                else toast.error(res?.error || "Failed to delete room");
                              }
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {!filtered.length ? (
              <div className="p-6">
                <EmptyState title="Nothing to show" body="Adjust your filters to see rooms." />
              </div>
            ) : null}
          </Panel>
        </TabsContent>
      </Tabs>

      <RoomDrawer
        room={openRoom}
        onOpenChange={(o: boolean) => {
          if (!o) setOpenRoom(null);
        }}
      />
    </>
  );
}

function FloorTile({ room, onClick }: { room: Room; onClick: () => void }) {
  const m = getSafeStatusMeta(room.status);
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft",
        m.ring,
        "ring-1",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold tabular-nums">{room.room_number || (room as any).number}</span>
        <span className={cn("size-2.5 rounded-full", m.dot)} />
      </div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">{room.room_name || (room as any).type || "Room"}</div>
      <div className="mt-2 truncate text-[11px] font-medium">{m.label}</div>
    </button>
  );
}
