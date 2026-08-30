import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { EmptyState, KpiCard, PageHeader, Panel, Pill, StatusBadge } from "@/components/pms/bits";
import { usePms } from "@/lib/pms-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Sparkles, BrushCleaning, CheckCheck, Wrench, ClipboardCheck, ArrowRight, ShieldCheck } from "lucide-react";
import type { Room } from "@/lib/pms-data";

export const Route = createFileRoute("/_shell/housekeeping")({
  head: () => ({
    meta: [
      { title: "Housekeeping & Room Turnover — DRB Hotel PMS" },
      { name: "description", content: "Housekeeping room turnover, cleaning progress, and departure inspection checklist." },
    ],
  }),
  component: Housekeeping,
});

const DEFAULT_CHECKLIST = [
  "Bed linen stripped, fresh sheets & pillowcases fitted",
  "Bathroom disinfected, mirrors polished & dry",
  "Fresh bath & hand towels restocked",
  "Floors vacuumed and mopped",
  "Trash bins emptied, sanitized & relined",
  "Complimentary water bottles & coffee kit replenished",
  "Air conditioner, lights & TV tested",
  "Door locks and keycards verified",
];

function Housekeeping() {
  const { rooms, setRoomStatus } = usePms();

  const [inspectRoom, setInspectRoom] = React.useState<Room | null>(null);
  const [checkedItems, setCheckedItems] = React.useState<string[]>([]);

  const dirtyRooms = rooms.filter((r) => r.status === "DIRTY");
  const cleaningRooms = rooms.filter((r) => r.status === "CLEANING");
  const inspectionRooms = rooms.filter((r) => r.status === "INSPECTION");
  const availableRooms = rooms.filter((r) => r.status === "AVAILABLE");

  const turnoverQueue = rooms.filter((r) => ["DIRTY", "CLEANING", "INSPECTION"].includes(r.status));

  const handleStartCleaning = async (roomId: string, roomNum: string) => {
    await setRoomStatus(roomId, "CLEANING");
    toast.info(`Room ${roomNum} is now being cleaned`);
  };

  const handleSendToInspection = async (roomId: string, roomNum: string) => {
    await setRoomStatus(roomId, "INSPECTION");
    toast.info(`Room ${roomNum} marked cleaned · Awaiting inspection`);
  };

  const openInspection = (room: Room) => {
    setInspectRoom(room);
    setCheckedItems([]);
  };

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const selectAll = () => {
    if (checkedItems.length === DEFAULT_CHECKLIST.length) {
      setCheckedItems([]);
    } else {
      setCheckedItems([...DEFAULT_CHECKLIST]);
    }
  };

  const handleCompleteInspection = async () => {
    if (!inspectRoom) return;
    if (checkedItems.length < DEFAULT_CHECKLIST.length) {
      toast.error(`Please complete and tick all ${DEFAULT_CHECKLIST.length} checklist points before making room available`);
      return;
    }

    await setRoomStatus(inspectRoom.id, "AVAILABLE");
    const rNum = inspectRoom.room_number || (inspectRoom as any).number;
    toast.success(`Room ${rNum} verified & marked AVAILABLE for Front Desk!`);
    setInspectRoom(null);
    setCheckedItems([]);
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        eyebrow="Operations"
        title="Housekeeping & Turnover"
        subtitle={`Live room cleaning pipeline across all ${rooms.length} keys · Check out turnover & inspection`}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Needs Cleaning" value={String(dirtyRooms.length)} icon={BrushCleaning} tone="warning" hint="Post checkout / dirty" />
        <KpiCard label="In Progress" value={String(cleaningRooms.length)} icon={Sparkles} tone="info" hint="Cleaning underway" />
        <KpiCard label="Awaiting Inspection" value={String(inspectionRooms.length)} icon={ClipboardCheck} tone="gold" hint="Manager sign-off" />
        <KpiCard label="Ready & Available" value={String(availableRooms.length)} icon={CheckCheck} tone="success" hint="Vacant clean" />
      </div>

      <Panel
        title="Active Room Turnover Pipeline"
        description="Rooms vacated or flagged dirty — assign cleaning, inspect checklist, and mark available"
        action={<Pill tone={turnoverQueue.length > 0 ? "warning" : "success"}>{turnoverQueue.length} Rooms in Turnover</Pill>}
      >
        {!turnoverQueue.length ? (
          <div className="py-8">
            <EmptyState
              icon={CheckCheck}
              title="All Rooms are Clean & Ready"
              body="No rooms currently pending turnover. Checked-out rooms will automatically appear here."
            />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {turnoverQueue.map((r) => {
              const rNum = r.room_number || (r as any).number;
              const rType = r.room_name || (r as any).type || "Standard Room";

              return (
                <div
                  key={r.id}
                  className="card-premium flex flex-col justify-between rounded-2xl border border-border p-4 shadow-soft"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold">Room {rNum}</span>
                      <StatusBadge status={r.status} size="sm" />
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Floor {r.floor || "1"} · {rType}
                    </div>

                    <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3 text-xs">
                      {r.status === "DIRTY" && (
                        <p className="text-warning">
                          ⚠️ Room vacated / dirty. Assign cleaning to begin.
                        </p>
                      )}
                      {r.status === "CLEANING" && (
                        <p className="text-info flex items-center gap-1.5">
                          <Sparkles className="size-3 animate-spin text-info" /> Cleaning is in progress...
                        </p>
                      )}
                      {r.status === "INSPECTION" && (
                        <p className="text-gold font-medium">
                          🔍 Cleaning finished. Ready for manager inspection & checklist verification.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border">
                    {r.status === "DIRTY" && (
                      <Button
                        className="w-full rounded-xl bg-brass text-gold-foreground hover:opacity-90"
                        onClick={() => handleStartCleaning(r.id, rNum)}
                      >
                        <BrushCleaning className="mr-2 size-4" /> Start Cleaning
                      </Button>
                    )}

                    {r.status === "CLEANING" && (
                      <Button
                        className="w-full rounded-xl bg-info text-info-foreground hover:opacity-90"
                        onClick={() => handleSendToInspection(r.id, rNum)}
                      >
                        <CheckCheck className="mr-2 size-4" /> Cleaning Done (Send to Inspection)
                      </Button>
                    )}

                    {r.status === "INSPECTION" && (
                      <Button
                        className="w-full rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                        onClick={() => openInspection(r)}
                      >
                        <ClipboardCheck className="mr-2 size-4" /> Inspect & Sign-off Checklist
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel
        title="All Property Keys Status"
        description="Live overview of all room states"
      >
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
          {rooms.map((rm) => {
            const rNum = rm.room_number || (rm as any).number;
            return (
              <button
                key={rm.id}
                onClick={() => {
                  if (rm.status === "DIRTY" || rm.status === "CLEANING" || rm.status === "INSPECTION") {
                    openInspection(rm);
                  }
                }}
                className={cn(
                  "flex flex-col items-center justify-center rounded-xl border p-2.5 text-center transition-all",
                  rm.status === "AVAILABLE" && "border-emerald-500/30 bg-emerald-500/5 text-emerald-700",
                  rm.status === "OCCUPIED" && "border-indigo-500/30 bg-indigo-500/5 text-indigo-700",
                  rm.status === "DIRTY" && "border-warning/30 bg-warning/10 text-warning animate-pulse cursor-pointer",
                  rm.status === "CLEANING" && "border-info/30 bg-info/10 text-info cursor-pointer",
                  rm.status === "INSPECTION" && "border-gold/30 bg-gold/10 text-gold cursor-pointer",
                  rm.status === "MAINTENANCE" && "border-slate-500/30 bg-slate-500/10 text-slate-700"
                )}
              >
                <span className="text-sm font-bold">{rNum}</span>
                <span className="text-[9px] uppercase font-semibold">{rm.status.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Room Departure & Turnover Inspection Modal */}
      <Dialog open={!!inspectRoom} onOpenChange={(o) => { if (!o) setInspectRoom(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="size-5 text-gold" />
              Room {inspectRoom?.room_number || (inspectRoom as any)?.number} — Turnover Inspection
            </DialogTitle>
            <DialogDescription>
              Verify all quality and sanitation checkpoints before making this room available for new arrivals.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between rounded-xl bg-secondary/50 p-3">
              <span className="text-xs font-semibold text-muted-foreground">
                Checked: {checkedItems.length} of {DEFAULT_CHECKLIST.length} completed
              </span>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-gold" onClick={selectAll}>
                {checkedItems.length === DEFAULT_CHECKLIST.length ? "Deselect All" : "Select All"}
              </Button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {DEFAULT_CHECKLIST.map((item, idx) => {
                const isChecked = checkedItems.includes(item);
                return (
                  <label
                    key={idx}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-sm cursor-pointer transition-all",
                      isChecked
                        ? "border-emerald-500/40 bg-emerald-500/5 text-foreground"
                        : "border-border hover:bg-secondary/40 text-muted-foreground"
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => toggleCheck(item)}
                    />
                    <span className={cn(isChecked && "font-medium text-emerald-800 dark:text-emerald-300")}>
                      {item}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <Button variant="ghost" onClick={() => setInspectRoom(null)}>
                Cancel
              </Button>
              <Button
                className="bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
                disabled={checkedItems.length < DEFAULT_CHECKLIST.length}
                onClick={handleCompleteInspection}
              >
                <CheckCheck className="mr-2 size-4" /> Verify & Mark Room Available
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
