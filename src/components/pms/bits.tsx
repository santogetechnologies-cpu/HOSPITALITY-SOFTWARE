import * as React from "react";
import { cn } from "@/lib/utils";
import { STATUS_META, inr, type Room, type RoomStatus } from "@/lib/pms-data";
import { BedDouble, Users, Sparkles, Wifi, Wrench, Clock } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-6">
      <div>
        {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
        <h1 className="text-3xl font-semibold text-foreground md:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  className,
  bodyClassName,
  children,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("card-premium overflow-hidden", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-sheen px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            {description ? (
              <p className="text-xs text-muted-foreground">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  delta?: string;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "default" | "gold" | "success" | "warning" | "info" | "destructive";
}) {
  const up = delta?.startsWith("+");
  const toneRing: Record<string, string> = {
    default: "bg-secondary text-secondary-foreground",
    gold: "bg-gold/15 text-gold",
    success: "bg-success/12 text-success",
    warning: "bg-warning/15 text-warning",
    info: "bg-info/12 text-info",
    destructive: "bg-destructive/12 text-destructive",
  };
  return (
    <div className="card-premium hover-lift p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="eyebrow">{label}</div>
        {Icon ? (
          <span className={cn("grid size-9 place-items-center rounded-xl", toneRing[tone])}>
            <Icon className="size-4" />
          </span>
        ) : null}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem]">
        {value}
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {delta ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 font-semibold",
              up ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive",
            )}
          >
            {delta}
          </span>
        ) : null}
        {hint ? <span className="text-muted-foreground">{hint}</span> : null}
      </div>
    </div>
  );
}

export function StatusBadge({
  status,
  size = "md",
}: {
  status: RoomStatus;
  size?: "sm" | "md";
}) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-semibold ring-1",
        m.soft,
        m.text,
        m.ring,
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs",
      )}
    >
      <span className={cn("size-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "gold" | "success" | "warning" | "info" | "destructive" | "primary";
}) {
  const tones: Record<string, string> = {
    muted: "bg-secondary text-secondary-foreground",
    gold: "bg-gold/15 text-gold",
    success: "bg-success/12 text-success",
    warning: "bg-warning/18 text-warning",
    info: "bg-info/12 text-info",
    destructive: "bg-destructive/12 text-destructive",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Miniature room illustration built from tokens — no external assets. */
export function RoomGlyph({ status, type }: { status: RoomStatus; type: string }) {
  const m = STATUS_META[status];
  return (
    <div
      className={cn(
        "relative grid h-16 w-full place-items-center overflow-hidden rounded-xl ring-1",
        m.soft,
        m.ring,
      )}
    >
      <div className="absolute inset-x-3 bottom-2 h-px bg-current opacity-15" />
      <div className="flex items-end gap-1.5 opacity-80">
        <span className={cn("h-5 w-2 rounded-sm", m.dot)} />
        <span className={cn("h-8 w-10 rounded-t-md", m.dot)} />
        <span className={cn("h-4 w-2 rounded-sm", m.dot)} />
      </div>
      <span className={cn("absolute right-2 top-2 text-[9px] font-semibold uppercase", m.text)}>
        {type.split(" ")[0]}
      </span>
    </div>
  );
}

export function RoomCard({
  room,
  onClick,
  compact,
}: {
  room: Room;
  onClick?: () => void;
  compact?: boolean;
}) {
  const m = STATUS_META[room.status];
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "group flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-2 text-center transition-all hover:-translate-y-0.5 hover:shadow-soft",
        )}
      >
        <span className="text-sm font-semibold tabular-nums">{room.number}</span>
        <span className={cn("size-2.5 rounded-full", m.dot)} />
        <span className="text-[9px] text-muted-foreground">{m.label.split(" ")[0]}</span>
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className="card-premium hover-lift group w-full p-3 text-left"
    >
      <RoomGlyph status={room.status} type={room.type} />
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <div className="text-lg font-semibold leading-none tabular-nums">{room.number}</div>
          <div className="mt-1 text-xs text-muted-foreground">{room.type}</div>
        </div>
        <span className={cn("mt-1 size-2.5 shrink-0 rounded-full", m.dot)} />
      </div>
      <div className="mt-3">
        <StatusBadge status={room.status} size="sm" />
      </div>
      {room.guest ? (
        <div className="mt-3 truncate rounded-lg bg-secondary px-2 py-1.5 text-xs font-medium">
          {room.guest}
        </div>
      ) : null}
      <dl className="mt-3 space-y-1 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <BedDouble className="size-3" /> {room.bed} · Floor {room.floor}
        </div>
        <div className="flex items-center gap-1.5">
          <Users className="size-3" /> {room.maxGuests} guests
          <Wifi className="ml-2 size-3" />
          {room.amenities.includes("Minibar") ? <span>Minibar</span> : null}
        </div>
        {room.checkIn ? (
          <div className="flex items-center gap-1.5">
            <Clock className="size-3" /> {room.checkIn} → {room.checkOut}
          </div>
        ) : null}
        <div className="flex items-center gap-1.5">
          {room.housekeeper ? (
            <>
              <Sparkles className="size-3" /> {room.housekeeper} · {room.hkStatus}
            </>
          ) : room.status === "maintenance" || room.status === "ooo" ? (
            <>
              <Wrench className="size-3" /> Engineering assigned
            </>
          ) : (
            <>
              <Sparkles className="size-3" /> {room.hkStatus}
            </>
          )}
        </div>
      </dl>
      <div className="mt-3 flex items-center justify-between border-t border-border pt-2">
        <span className="text-sm font-semibold text-foreground">{inr(room.rate)}</span>
        <span className="text-[10px] text-muted-foreground">per night</span>
      </div>
    </button>
  );
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      {(Object.keys(STATUS_META) as RoomStatus[]).map((s) => (
        <span key={s} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={cn("size-2 rounded-full", STATUS_META[s].dot)} />
          {STATUS_META[s].label}
        </span>
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon: Icon,
  action,
}: {
  title: string;
  body?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border px-6 py-14 text-center">
      {Icon ? (
        <span className="mb-3 grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
          <Icon className="size-5" />
        </span>
      ) : null}
      <h3 className="text-base font-semibold">{title}</h3>
      {body ? <p className="mt-1 max-w-sm text-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ProgressBar({ value, tone = "gold" }: { value: number; tone?: string }) {
  const tones: Record<string, string> = {
    gold: "bg-brass",
    success: "bg-success",
    info: "bg-info",
    warning: "bg-warning",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
      <div
        className={cn("h-full rounded-full transition-all duration-500", tones[tone] ?? tones["gold"])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
