import * as React from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  CalendarCheck,
  ConciergeBell,
  BedDouble,
  Users,
  Sparkles,
  Receipt,
  TrendingUp,
  UtensilsCrossed,
  Globe,
  UserCog,
  FileBarChart,
  ShieldCheck,
  Bell,
  Settings,
  LifeBuoy,
  LogOut,
  Search,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  PartyPopper,
  ClipboardCheck,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePms, type Role } from "@/lib/pms-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { Pill } from "./bits";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: Role[];
  badge?: (n: number) => string | null;
};

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Operations",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/reservations", label: "Reservations", icon: CalendarCheck },
      { to: "/front-desk", label: "Front Desk", icon: ConciergeBell },
      { to: "/rooms", label: "Rooms", icon: BedDouble },
      { to: "/guests", label: "Guests", icon: Users },
      { to: "/housekeeping", label: "Housekeeping", icon: Sparkles },
    ],
  },
  {
    section: "Commercial",
    items: [
      { to: "/billing", label: "Billing & Finance", icon: Receipt, roles: ["manager", "accounts", "frontdesk"] },
      { to: "/night-audit", label: "Night Audit", icon: Moon, roles: ["manager", "accounts"] },
      { to: "/revenue", label: "Revenue", icon: TrendingUp, roles: ["manager", "accounts"] },
      { to: "/banquet", label: "Banquet & Events", icon: PartyPopper },
      { to: "/channel-manager", label: "Channel Manager", icon: Globe, roles: ["manager", "frontdesk"] },
    ],
  },
  {
    section: "Administration",
    items: [
      { to: "/staff", label: "Staff", icon: UserCog },
      { to: "/reports", label: "Reports", icon: FileBarChart },
      { to: "/compliance", label: "Compliance", icon: ShieldCheck, roles: ["manager", "accounts"] },
      { to: "/notifications", label: "Notifications", icon: Bell },
    ],
  },
];

const QUICK_ACTIONS: { label: string; to: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "New Reservation", to: "/reservations/new", icon: CalendarCheck },
  { label: "Walk-in Guest", to: "/front-desk", icon: ConciergeBell },
  { label: "Check-in", to: "/front-desk", icon: ClipboardCheck },
  { label: "Check-out", to: "/front-desk", icon: ClipboardCheck },
  { label: "Add Payment", to: "/billing", icon: Receipt },
  { label: "Add Guest", to: "/guests", icon: Users },
  { label: "Maintenance Request", to: "/housekeeping", icon: Settings },
  { label: "Housekeeping Task", to: "/housekeeping", icon: Sparkles },
  { label: "Expense", to: "/billing", icon: Receipt },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, logout, notifications, rooms, reservations, guests } = usePms();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const unread = notifications.filter((n) => !n.read).length;

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { rooms: [], guests: [], reservations: [] };
    return {
      rooms: rooms.filter((r) => r.number.includes(q) || r.type.toLowerCase().includes(q)).slice(0, 5),
      guests: guests.filter((g) => g.name.toLowerCase().includes(q)).slice(0, 5),
      reservations: reservations
        .filter((r) => r.id.toLowerCase().includes(q) || r.guest.toLowerCase().includes(q))
        .slice(0, 5),
    };
  }, [query, rooms, guests, reservations]);

  const go = (to: string) => {
    setSearchOpen(false);
    setQuery("");
    void navigate({ to });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col justify-between bg-midnight text-sidebar-foreground transition-[width] duration-300 lg:flex",
          collapsed ? "w-[78px]" : "w-[266px]",
        )}
      >
        <div className="flex min-h-0 flex-col">
          <div className="flex items-center gap-3 px-5 py-6">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brass text-sm font-bold text-gold-foreground">
              DRB
            </span>
            {!collapsed ? (
              <div className="min-w-0">
                <div className="text-display truncate text-lg font-semibold tracking-wide text-sidebar-accent-foreground">
                  DRB HOTEL
                </div>
                <div className="truncate text-[10px] uppercase tracking-[0.18em] text-sidebar-primary">
                  Property Management
                </div>
              </div>
            ) : null}
          </div>

          <nav className="scroll-slim min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {NAV.map((group) => {
              const items = group.items.filter(
                (i) => !i.roles || !session || i.roles.includes(session.role),
              );
              if (!items.length) return null;
              return (
                <div key={group.section} className="mb-5">
                  {!collapsed ? (
                    <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/45">
                      {group.section}
                    </div>
                  ) : null}
                  <ul className="space-y-1">
                    {items.map((item) => {
                      const active = pathname === item.to || pathname.startsWith(item.to + "/");
                      return (
                        <li key={item.to}>
                          <Link
                            to={item.to}
                            title={item.label}
                            className={cn(
                              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                              active
                                ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-soft"
                                : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                            )}
                          >
                            <item.icon
                              className={cn("size-[18px] shrink-0", active && "text-sidebar-primary")}
                            />
                            {!collapsed ? <span className="truncate">{item.label}</span> : null}
                            {!collapsed && item.to === "/notifications" && unread ? (
                              <span className="ml-auto rounded-full bg-sidebar-primary px-1.5 py-0.5 text-[10px] font-bold text-sidebar-primary-foreground">
                                {unread}
                              </span>
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="border-t border-sidebar-border px-3 py-4">
          <ul className="mb-3 space-y-1">
            <li>
              <Link
                to="/help"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              >
                <LifeBuoy className="size-[18px]" />
                {!collapsed ? "Help & Support" : null}
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              >
                <Settings className="size-[18px]" />
                {!collapsed ? "Settings" : null}
              </Link>
            </li>
          </ul>
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl bg-sidebar-accent/70 p-3",
              collapsed && "justify-center p-2",
            )}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brass text-xs font-bold text-gold-foreground">
              {session?.name?.slice(0, 2).toUpperCase() ?? "DR"}
            </span>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-sidebar-accent-foreground">
                  {session?.name}
                </div>
                <div className="truncate text-[11px] text-sidebar-primary">{session?.roleLabel}</div>
              </div>
            ) : null}
            {!collapsed ? (
              <button
                onClick={() => {
                  logout();
                  toast.success("Signed out of DRB Hotel PMS");
                  void navigate({ to: "/" });
                }}
                title="Logout"
                className="rounded-lg p-1.5 text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LogOut className="size-4" />
              </button>
            ) : null}
          </div>
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border px-3 py-2 text-xs text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/60"
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!collapsed ? "Collapse" : null}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-3 px-4 py-3 md:px-6">
            <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
              <span className="grid size-9 place-items-center rounded-lg bg-brass text-[11px] font-bold text-gold-foreground">
                DRB
              </span>
            </Link>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-gold/50 md:max-w-md"
            >
              <Search className="size-4" />
              <span className="truncate">Search guests, rooms, reservations…</span>
              <kbd className="ml-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] md:block">
                ⌘K
              </kbd>
            </button>

            <div className="hidden items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-xs xl:flex">
              <span className="font-semibold text-foreground">DRB Hotel</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">Wed, 12 Aug 2026</span>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <QuickAdd />
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="relative rounded-xl">
                    <Bell className="size-4" />
                    {unread ? (
                      <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                        {unread}
                      </span>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-0">
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="text-sm font-semibold">Notifications</span>
                    <Pill tone="gold">{unread} new</Pill>
                  </div>
                  <ul className="max-h-80 overflow-y-auto">
                    {notifications.slice(0, 6).map((n) => (
                      <li
                        key={n.id}
                        className={cn(
                          "flex gap-3 border-b border-border px-4 py-3 text-sm last:border-0",
                          !n.read && "bg-accent/40",
                        )}
                      >
                        <span>{n.icon}</span>
                        <div className="min-w-0">
                          <div className="truncate font-medium">{n.title}</div>
                          <div className="truncate text-xs text-muted-foreground">{n.body}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{n.time}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <div className="p-2">
                    <Button variant="ghost" className="w-full justify-between" asChild>
                      <Link to="/notifications">
                        View all <ChevronRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-xl border border-border bg-card py-1.5 pl-1.5 pr-3 transition-colors hover:border-gold/50">
                    <span className="grid size-7 place-items-center rounded-lg bg-brass text-[10px] font-bold text-gold-foreground">
                      {session?.name?.slice(0, 2).toUpperCase() ?? "DR"}
                    </span>
                    <span className="hidden text-left leading-tight sm:block">
                      <span className="block text-xs font-semibold">{session?.name}</span>
                      <span className="block text-[10px] text-muted-foreground">
                        {session?.roleLabel}
                      </span>
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuLabel>Signed in as {session?.username}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/help">Help & Support</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      logout();
                      toast.success("Signed out of DRB Hotel PMS");
                      void navigate({ to: "/" });
                    }}
                  >
                    <LogOut className="mr-2 size-4" /> Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1500px] space-y-6">{children}</div>
        </main>

        <footer className="border-t border-border px-6 py-4 text-xs text-muted-foreground">
          DRB Hotel PMS · Demo environment with sample data · v2.4
        </footer>
      </div>

      <MobileNav />

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="max-w-lg p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Global search</DialogTitle>
            <DialogDescription>Search rooms, guests and reservations</DialogDescription>
          </DialogHeader>
          <div className="border-b border-border p-3">
            <Input
              autoFocus
              placeholder="Search room 204, Ananya, DRB-24201…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-80 overflow-y-auto p-2">
            {!query.trim() ? (
              <p className="p-4 text-sm text-muted-foreground">
                Start typing to search across the property.
              </p>
            ) : results.rooms.length + results.guests.length + results.reservations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No matches found.</p>
            ) : (
              <>
                {results.rooms.length ? (
                  <SearchGroup label="Rooms">
                    {results.rooms.map((r) => (
                      <SearchRow
                        key={r.id}
                        onClick={() => go("/rooms")}
                        title={`Room ${r.number}`}
                        sub={`${r.type} · ${r.floorName}`}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
                {results.guests.length ? (
                  <SearchGroup label="Guests">
                    {results.guests.map((g) => (
                      <SearchRow
                        key={g.id}
                        onClick={() => go("/guests")}
                        title={g.name}
                        sub={`${g.type} · ${g.stays} stays`}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
                {results.reservations.length ? (
                  <SearchGroup label="Reservations">
                    {results.reservations.map((r) => (
                      <SearchRow
                        key={r.id}
                        onClick={() => go("/reservations")}
                        title={`${r.id} · ${r.guest}`}
                        sub={`${r.arrival} → ${r.departure}`}
                      />
                    ))}
                  </SearchGroup>
                ) : null}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function SearchRow({ title, sub, onClick }: { title: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
    >
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{sub}</span>
    </button>
  );
}

function QuickAdd() {
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="rounded-xl bg-brass text-gold-foreground shadow-brass hover:opacity-90">
          <Plus className="mr-1 size-4" /> <span className="hidden sm:inline">Quick Add</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Quick actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {QUICK_ACTIONS.map((a) => (
          <DropdownMenuItem
            key={a.label}
            onClick={() => {
              void navigate({ to: a.to });
              toast.info(`${a.label} — opening workflow`);
            }}
          >
            <a.icon className="mr-2 size-4" /> {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MobileNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/dashboard", label: "Home", icon: LayoutDashboard },
    { to: "/front-desk", label: "Desk", icon: ConciergeBell },
    { to: "/rooms", label: "Rooms", icon: BedDouble },
    { to: "/housekeeping", label: "HK", icon: Sparkles },
    { to: "/settings", label: "More", icon: Settings },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-border bg-card/95 backdrop-blur lg:hidden">
      {items.map((i) => {
        const active = pathname.startsWith(i.to);
        return (
          <Link
            key={i.to}
            to={i.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-[10px]",
              active ? "text-gold" : "text-muted-foreground",
            )}
          >
            <i.icon className="size-4" />
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
