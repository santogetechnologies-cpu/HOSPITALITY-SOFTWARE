import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ROOM_STATUSES, STATUS_META, inr, type Room, type RoomStatus } from "@/lib/pms-data";
import { usePms } from "@/lib/pms-store";
import { Pill, RoomGlyph, StatusBadge } from "./bits";
import { Sparkles, Wrench, Ban, BrushCleaning, UserPlus } from "lucide-react";

export function RoomDrawer({
  room,
  onOpenChange,
}: {
  room: Room | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { rooms, setRoomStatus, assignGuestToRoom, addTicket } = usePms();
  const live = room ? rooms.find((r) => r.id === room.id) ?? room : null;
  const [guestName, setGuestName] = React.useState("");
  const [issue, setIssue] = React.useState("");

  return (
    <Sheet open={!!room} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {live ? (
          <>
            <SheetHeader className="text-left">
              <SheetTitle className="text-2xl">
                Room {live.number} · {live.type}
              </SheetTitle>
              <SheetDescription>
                {live.floorName} · {live.bed} · up to {live.maxGuests} guests · {live.view}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-10">
              <div className="overflow-hidden rounded-2xl border border-border">
                <div className="h-32">
                  <RoomGlyph status={live.status} type={live.type} />
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border bg-sheen px-4 py-3">
                  <StatusBadge status={live.status} />
                  <span className="text-sm font-semibold">{inr(live.rate)} / night</span>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Field label="Current guest" value={live.guest ?? "—"} />
                <Field label="Reservation" value={live.reservationId ?? "—"} />
                <Field label="Check-in" value={live.checkIn ?? "—"} />
                <Field label="Check-out" value={live.checkOut ?? "—"} />
                <Field label="Housekeeping" value={`${live.hkStatus}${live.housekeeper ? ` · ${live.housekeeper}` : ""}`} />
                <Field label="Maintenance" value={live.status === "maintenance" || live.status === "ooo" ? "Open ticket" : "No open issues"} />
              </dl>

              <div>
                <div className="eyebrow mb-2">Amenities</div>
                <div className="flex flex-wrap gap-2">
                  {live.amenities.map((a) => (
                    <Pill key={a}>{a}</Pill>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <MiniPanel title="Minibar">
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex justify-between"><span>Sparkling water ×2</span><span>{inr(240)}</span></li>
                    <li className="flex justify-between"><span>Almond bar ×1</span><span>{inr(180)}</span></li>
                    <li className="flex justify-between"><span>Craft cola ×1</span><span>{inr(160)}</span></li>
                  </ul>
                </MiniPanel>
                <MiniPanel title="Linen">
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex justify-between"><span>Bed set</span><span>Changed today</span></li>
                    <li className="flex justify-between"><span>Towels</span><span>4 fresh</span></li>
                    <li className="flex justify-between"><span>Bathrobes</span><span>2 fresh</span></li>
                  </ul>
                </MiniPanel>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="eyebrow">Change status</div>
                <Select
                  value={live.status}
                  onValueChange={(v) => {
                    setRoomStatus(live.id, v as RoomStatus);
                    toast.success(`Room ${live.number} → ${STATUS_META[v as RoomStatus].label}`);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_META[s].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="rounded-xl" onClick={() => { setRoomStatus(live.id, "vacant-clean"); toast.success(`Room ${live.number} marked clean`); }}>
                    <Sparkles className="mr-1 size-4" /> Mark Clean
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => { setRoomStatus(live.id, "vacant-dirty"); toast.info(`Room ${live.number} marked dirty`); }}>
                    <BrushCleaning className="mr-1 size-4" /> Mark Dirty
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => { setRoomStatus(live.id, "maintenance"); toast.warning(`Room ${live.number} sent to maintenance`); }}>
                    <Wrench className="mr-1 size-4" /> Maintenance
                  </Button>
                  <Button variant="outline" className="rounded-xl" onClick={() => { setRoomStatus(live.id, "ooo"); toast.warning(`Room ${live.number} blocked`); }}>
                    <Ban className="mr-1 size-4" /> Block Room
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="assign">Assign guest</Label>
                <div className="flex gap-2">
                  <Input
                    id="assign"
                    placeholder="Guest name"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                  />
                  <Button
                    className="shrink-0 rounded-xl bg-brass text-gold-foreground hover:opacity-90"
                    onClick={() => {
                      if (!guestName.trim()) {
                        toast.error("Enter a guest name first");
                        return;
                      }
                      assignGuestToRoom(live.id, guestName.trim());
                      toast.success(`${guestName.trim()} assigned to room ${live.number}`);
                      setGuestName("");
                    }}
                  >
                    <UserPlus className="mr-1 size-4" /> Assign
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="issue">Report an issue</Label>
                <div className="flex gap-2">
                  <Input id="issue" placeholder="e.g. Shower pressure low" value={issue} onChange={(e) => setIssue(e.target.value)} />
                  <Button
                    variant="outline"
                    className="shrink-0 rounded-xl"
                    onClick={() => {
                      if (!issue.trim()) {
                        toast.error("Describe the issue first");
                        return;
                      }
                      addTicket({ room: live.number, issue: issue.trim(), priority: "Medium", status: "Open", assignee: "Unassigned" });
                      toast.success(`Maintenance ticket raised for room ${live.number}`);
                      setIssue("");
                    }}
                  >
                    Raise ticket
                  </Button>
                </div>
              </div>

              <div>
                <div className="eyebrow mb-2">Room history</div>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex justify-between rounded-lg border border-border px-3 py-2"><span>Checked out — Daniel Whitmore</span><span>10 Aug</span></li>
                  <li className="flex justify-between rounded-lg border border-border px-3 py-2"><span>Deep clean completed — Sunita</span><span>10 Aug</span></li>
                  <li className="flex justify-between rounded-lg border border-border px-3 py-2"><span>Checked in — Meera Krishnan</span><span>07 Aug</span></li>
                  <li className="flex justify-between rounded-lg border border-border px-3 py-2"><span>Preventive maintenance passed</span><span>02 Aug</span></li>
                </ul>
              </div>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate text-sm font-medium">{value}</dd>
    </div>
  );
}

function MiniPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="eyebrow mb-2">{title}</div>
      {children}
    </div>
  );
}
