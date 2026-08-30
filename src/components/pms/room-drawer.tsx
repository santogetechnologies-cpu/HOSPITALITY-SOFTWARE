import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { inr, type Room } from "@/lib/pms-data";
import { usePms } from "@/lib/pms-store";
import { RoomGlyph, StatusBadge, getSafeStatusMeta } from "./bits";
import { useNavigate } from "@tanstack/react-router";
import { BedDouble, Users, CalendarCheck, ShieldCheck } from "lucide-react";

export function RoomDrawer({
  room,
  onOpenChange,
}: {
  room: Room | null;
  onOpenChange: (open: boolean) => void;
  }) {
  const { rooms, reservations, guests, setRoomStatus, deleteRoom, session } = usePms();
  const isAdmin = session?.role === "SUPER_ADMIN" || session?.role === "GM" || !session;
  const navigate = useNavigate();

  const live = room ? rooms.find((r) => r.id === room.id) ?? room : null;

  const roomNum = live?.room_number || (live as any)?.number || "—";
  const roomName = live?.room_name || (live as any)?.type || "Standard Room";
  const floorNum = live?.floor || "1";
  const priceNum = live?.price || (live as any)?.rate || 0;
  const capacityNum = live?.capacity || 2;
  const currentStatus = live?.status || "AVAILABLE";

  // Look up active reservation & guest if occupied or booked
  const activeReservation = live
    ? reservations.find((r) => r.room_id === live.id && (r.status === "OCCUPIED" || r.status === "CONFIRMED" || r.status === "PENDING"))
    : null;

  const activeGuest = activeReservation
    ? guests.find((g) => g.id === activeReservation.guest_id)
    : null;

  const handleStatusChange = async (newStatus: string) => {
    if (!live) return;
    await setRoomStatus(live.id, newStatus as any);
    toast.success(`Room ${roomNum} status updated to ${newStatus}`);
  };

  return (
    <Sheet open={!!room} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {live ? (
          <>
            <SheetHeader className="text-left pb-4 border-b border-border">
              <SheetTitle className="text-2xl font-bold flex items-center justify-between">
                <span>Room {roomNum}</span>
                <StatusBadge status={currentStatus} size="sm" />
              </SheetTitle>
              <SheetDescription className="text-sm">
                Floor {floorNum} · {roomName} · Up to {capacityNum} guests
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 py-6">
              <div className="overflow-hidden rounded-2xl border border-border">
                <div className="h-28">
                  <RoomGlyph status={currentStatus} type={roomName} />
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border bg-sheen px-4 py-3">
                  <span className="text-xs text-muted-foreground">Standard Nightly Rate</span>
                  <span className="text-base font-bold text-foreground">{inr(priceNum)} / night</span>
                </div>
              </div>

              {/* Room & Occupancy Information */}
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-gold">
                  Occupancy & Reservation
                </div>

                {activeReservation ? (
                  <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Current Guest</span>
                      <span className="font-semibold text-foreground">{activeGuest?.name || "Guest"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Contact Phone</span>
                      <span className="font-medium text-muted-foreground">{activeGuest?.phone || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Booking Date</span>
                      <span className="text-foreground">{activeReservation.booking_date || "—"}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Booking ID</span>
                      <span className="font-mono text-xs text-gold">{activeReservation.id.slice(0, 10).toUpperCase()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    No active in-house guest. Room is {currentStatus.toLowerCase()}.
                  </div>
                )}
              </div>

              {/* Status Update Control */}
              <div className="space-y-3 pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-gold">
                  Update Room Status
                </div>
                <Select value={currentStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Available (Vacant Clean)</SelectItem>
                    <SelectItem value="BOOKED">Booked / Reserved</SelectItem>
                    <SelectItem value="OCCUPIED">Occupied (Guest In-House)</SelectItem>
                    <SelectItem value="DIRTY">Dirty (Needs Turnover Clean)</SelectItem>
                    <SelectItem value="CLEANING">Cleaning In Progress</SelectItem>
                    <SelectItem value="INSPECTION">Inspection Pending</SelectItem>
                    <SelectItem value="MAINTENANCE">Maintenance (Engineering)</SelectItem>
                    <SelectItem value="OUT OF SERVICE">Out of Service (Blocked)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Direct Booking Action if Available */}
              {currentStatus === "AVAILABLE" && (
                <div className="pt-2">
                  <Button
                    className="w-full rounded-xl bg-brass text-gold-foreground hover:opacity-90 shadow-brass"
                    onClick={() => {
                      onOpenChange(false);
                      void navigate({ to: "/front-desk" });
                    }}
                  >
                    <CalendarCheck className="mr-2 size-4" /> Book Room {roomNum} at Front Desk
                  </Button>
                </div>
              )}

              {isAdmin && (
                <div className="pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={async () => {
                      if (confirm(`Are you sure you want to permanently delete Room ${roomNum}?`)) {
                        onOpenChange(false);
                        const res = await deleteRoom(live.id);
                        if (res?.success) toast.success(`Room ${roomNum} deleted`);
                        else toast.error(res?.error || "Failed to delete room");
                      }
                    }}
                  >
                    Delete Room
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
