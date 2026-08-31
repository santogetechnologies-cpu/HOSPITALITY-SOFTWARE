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
  Network,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePms, type Role } from "@/lib/pms-store";
import { drbLogo } from "@/lib/assets";
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
      { to: "/billing", label: "Bills", icon: Receipt },
      { to: "/guests", label: "Guests", icon: Users },
      { to: "/rooms", label: "Rooms", icon: BedDouble },
      { to: "/front-desk", label: "Check-In / Out", icon: ConciergeBell },
      { to: "/housekeeping", label: "Cleaning", icon: Sparkles },
      { to: "/party-hall", label: "Party Hall", icon: PartyPopper },
    ],
  },
  {
    section: "Finance",
    items: [
      { to: "/profits", label: "Profit & Loss (P&L)", icon: TrendingUp, roles: ["SUPER_ADMIN"] },
      { to: "/payments", label: "Payment Dashboard & Inflow Analytics", icon: Receipt, roles: ["SUPER_ADMIN", "GM"] },
      { to: "/pending-payments", label: "Pending Payments", icon: Receipt },
      { to: "/payment-history", label: "Payment History", icon: Receipt, roles: ["SUPER_ADMIN"] },
      { to: "/discounts", label: "Raised Discounts", icon: TrendingUp },
      { to: "/expenses", label: "Expenses", icon: Receipt, roles: ["SUPER_ADMIN", "GM"] },
    ],
  },
  {
    section: "Administration",
    items: [
      { to: "/staff", label: "Staff & Access", icon: UserCog, roles: ["SUPER_ADMIN"] },
      { to: "/settings", label: "Configuration", icon: Settings, roles: ["SUPER_ADMIN", "GM"] },
    ],
  },
  {
    section: "System",
    items: [
      { to: "/notifications", label: "Notifications", icon: Bell },
      { to: "/help", label: "Help & Support", icon: ShieldCheck },
      { to: "/system-workflow", label: "System Workflow", icon: Network, roles: ["SUPER_ADMIN"] },
    ],
  },
];

const QUICK_ACTIONS: { label: string; to: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "New Room Booking", to: "/front-desk", icon: CalendarCheck },
  { label: "Front Desk Check-In", to: "/front-desk", icon: ConciergeBell },
  { label: "Add Guest", to: "/guests", icon: Users },
  { label: "Log Expense", to: "/expenses", icon: Receipt },
  { label: "Pending Folios", to: "/pending-payments", icon: Receipt },
  { label: "Request Discount", to: "/discounts", icon: TrendingUp },
  { label: "Book Party Hall", to: "/party-hall", icon: PartyPopper },
  { label: "Log Maintenance Ticket", to: "/complaints", icon: Settings },
  { label: "Housekeeping Tasks", to: "/housekeeping", icon: Sparkles },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { session, logout, notifications, rooms, reservations, guests } = usePms();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const unread = notifications.filter((n) => !n.read).length;

  const todayStr = React.useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { rooms: [], guests: [], reservations: [] };
    return {
      rooms: rooms
        .filter((r) => (r.room_number || (r as any).number || "").toLowerCase().includes(q) || (r.room_name || (r as any).type || "").toLowerCase().includes(q))
        .slice(0, 5),
      guests: guests.filter((g) => (g.name || "").toLowerCase().includes(q) || (g.phone || "").includes(q)).slice(0, 5),
      reservations: reservations
        .filter((r) => {
          const gName = guests.find(g => g.id === r.guest_id)?.name || "";
          return r.id.toLowerCase().includes(q) || gName.toLowerCase().includes(q);
        })
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
            <img
              src={drbLogo}
              alt="DRB Hotel"
              className="size-11 shrink-0 rounded-xl bg-sidebar-accent/60 p-1 object-contain shadow-soft"
            />
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
            <div className="flex items-center gap-2 lg:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMobileMenuOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border-gold/40 bg-gold/10 text-gold hover:bg-gold/20 font-semibold px-2.5 h-9 shadow-soft"
                aria-label="Open mobile menu"
              >
                <Menu className="size-4" />
                <span className="text-xs">Menu</span>
              </Button>
              <Link to="/dashboard" className="flex items-center gap-2">
                <img
                  src={drbLogo}
                  alt="DRB Hotel"
                  className="size-9 shrink-0 rounded-lg bg-card border border-border p-0.5 object-contain"
                />
              </Link>
            </div>
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
              <span className="text-muted-foreground">{todayStr}</span>
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
          DRB Hotel Property Management System · All rights reserved
        </footer>
      </div>

      <MobileMegaNav isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

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

function MobileMegaNav({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { session, logout, notifications } = usePms();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [search, setSearch] = React.useState("");
  const unread = notifications.filter((n) => !n.read).length;

  // Lock background scroll when open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/98 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 lg:hidden overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/80 px-5 py-4 bg-card/70">
        <div className="flex items-center gap-3">
          <img
            src={drbLogo}
            alt="DRB Hotel"
            className="size-10 rounded-xl bg-card border border-border p-1 object-contain shadow-soft"
          />
          <div>
            <div className="font-display text-base font-bold tracking-wider text-foreground">DRB HOTEL</div>
            <div className="text-[10px] uppercase tracking-widest text-gold font-semibold">
              {session?.roleLabel || "Property Management"}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="grid size-10 place-items-center rounded-xl border border-border bg-card text-foreground hover:bg-accent active:scale-90 transition-all shadow-sm"
          aria-label="Close menu"
        >
          <X className="size-5 text-gold" />
        </button>
      </div>

      {/* Quick Search */}
      <div className="px-5 pt-3.5 pb-1.5">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search all tools & menus..."
            className="pl-10 h-10 rounded-xl bg-card/90 border-border focus-visible:ring-gold text-sm"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Grid of Sections and Cards */}
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-6 scroll-slim">
        {NAV.map((group) => {
          const allowedItems = group.items.filter(
            (i) => !i.roles || !session || i.roles.includes(session.role),
          );
          const filteredItems = search.trim()
            ? allowedItems.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
            : allowedItems;

          if (!filteredItems.length) return null;

          return (
            <div key={group.section} className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground/80 px-1">
                <span>{group.section}</span>
                <span className="text-[10px] lowercase text-muted-foreground/60">({filteredItems.length})</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {filteredItems.map((item) => {
                  const active = pathname === item.to || pathname.startsWith(item.to + "/");
                  const isNotifications = item.to === "/notifications";

                  return (
                    <button
                      key={item.to}
                      onClick={() => {
                        onClose();
                        void navigate({ to: item.to });
                      }}
                      className={cn(
                        "relative flex flex-col items-start justify-between rounded-2xl border p-4 text-left transition-all active:scale-95 shadow-sm group",
                        active
                          ? "border-gold/80 bg-gold/15 text-gold-foreground ring-1 ring-gold/40 shadow-brass"
                          : "border-border/80 bg-card/90 text-foreground hover:border-gold/50 hover:bg-card"
                      )}
                    >
                      <div className="flex w-full items-center justify-between mb-3">
                        <div
                          className={cn(
                            "grid size-10 place-items-center rounded-xl transition-colors",
                            active
                              ? "bg-gold text-midnight shadow-soft"
                              : "bg-secondary text-gold group-hover:bg-gold/20"
                          )}
                        >
                          <item.icon className="size-5" />
                        </div>

                        {isNotifications && unread > 0 ? (
                          <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">
                            {unread} new
                          </span>
                        ) : active ? (
                          <span className="size-2 rounded-full bg-gold animate-pulse" />
                        ) : null}
                      </div>

                      <div className="w-full">
                        <div className="font-semibold text-sm leading-snug line-clamp-1">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                          {active ? "Active Screen" : "Tap to open"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Profile & Logout Footer */}
      <div className="border-t border-border/80 bg-card/95 p-4 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3 min-w-0">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brass text-xs font-bold text-gold-foreground">
            {session?.name?.slice(0, 2).toUpperCase() ?? "DR"}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">{session?.name}</div>
            <div className="truncate text-[11px] text-gold">{session?.roleLabel}</div>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onClose();
            logout();
            toast.success("Signed out of DRB Hotel PMS");
            void navigate({ to: "/" });
          }}
          className="rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-1.5 size-4" />
          Logout
        </Button>
      </div>
    </div>
  );
}
