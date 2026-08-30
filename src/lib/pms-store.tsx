import * as React from "react";
import { supabase } from "./supabase";
import {
  ROOMS as MOCK_ROOMS,
  RESERVATIONS as MOCK_RESERVATIONS,
  GUESTS as MOCK_GUESTS,
  HK_TASKS as MOCK_HK_TASKS,
  NOTIFICATIONS as MOCK_NOTIFICATIONS,
  TICKETS as MOCK_TICKETS,
  FOLIO_LINES as MOCK_FOLIO,
  EVENTS as MOCK_EVENTS,
  type Room,
  type RoomStatus,
  type Reservation,
  type ReservationStatus,
  type Guest,
  type HkTask,
  type Notification,
  type Ticket,
  type FolioLine,
  type EventBooking,
} from "./pms-data";

export type Role = "manager" | "frontdesk" | "housekeeping" | "accounts" | "SUPER_ADMIN" | "PENDING";

export type Session = { username: string; name: string; role: Role; roleLabel: string };

export type PosOrder = {
  id: string;
  target: string;
  guest: string;
  items: { name: string; qty: number; price: number }[];
  total: number;
  status: "Open" | "KOT Sent" | "Charged to Room" | "Paid";
  time: string;
};

type State = {
  session: Session | null;
  rooms: Room[];
  reservations: Reservation[];
  guests: Guest[];
  hkTasks: HkTask[];
  notifications: Notification[];
  tickets: Ticket[];
  folio: FolioLine[];
  events: EventBooking[];
  orders: PosOrder[];
  auditRun: boolean;
  businessDate: string;
};

const initialState: State = {
  session: null,
  rooms: [],
  reservations: [],
  guests: [],
  hkTasks: [],
  notifications: [],
  tickets: [],
  folio: [],
  events: MOCK_EVENTS, // Fallback for unmigrated data
  orders: [
    {
      id: "POS-1201",
      target: "Room 202",
      guest: "Vikram Sethi",
      items: [
        { name: "Butter Chicken", qty: 1, price: 720 },
        { name: "Dal Makhani", qty: 1, price: 480 },
      ],
      total: 1416,
      status: "Charged to Room",
      time: "20:42",
    },
    {
      id: "POS-1202",
      target: "Table 7",
      guest: "Walk-in",
      items: [{ name: "Masala Chai", qty: 3, price: 150 }],
      total: 531,
      status: "Paid",
      time: "21:05",
    },
  ],
  auditRun: false,
  businessDate: "12 August 2026",
};

type Ctx = State & {
  login: (email: string, password: string) => Promise<Session | null>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<Session | null>;
  setRoomStatus: (roomId: string, status: RoomStatus) => void;
  assignGuestToRoom: (roomId: string, guest: string) => void;
  checkIn: (reservationId: string, roomNumber?: string) => void;
  checkOut: (reservationId: string) => void;
  setReservationStatus: (id: string, status: ReservationStatus) => void;
  addReservation: (r: Partial<Reservation> & { guest: string }) => Reservation;
  transferRoom: (reservationId: string, toRoom: string) => void;
  setTaskStage: (taskId: string, stage: HkTask["stage"]) => void;
  assignTask: (taskId: string, assignee: string) => void;
  addFolioLine: (line: Omit<FolioLine, "id">) => void;
  addTicket: (t: Omit<Ticket, "id" | "raised">) => void;
  addOrder: (o: Omit<PosOrder, "id" | "time">) => void;
  addEvent: (e: Omit<EventBooking, "id">) => void;
  addGuest: (g: Omit<Guest, "id">) => Guest;
  markAllRead: () => void;
  toggleRead: (id: string) => void;
  pushNotification: (n: Omit<Notification, "id" | "read" | "time">) => void;
  runNightAudit: () => void;
  seedDatabase: () => Promise<void>; // Added for convenience
};

const PmsContext = React.createContext<Ctx | null>(null);

export function PmsProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<State>(initialState);

  // Fetch initial data
  const fetchData = React.useCallback(async () => {
    try {
      const [
        { data: rooms },
        { data: reservations },
        { data: guests },
        { data: hkTasks },
        { data: tickets },
        { data: notifications },
        { data: folio }
      ] = await Promise.all([
        supabase.from('rooms').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('guests').select('*'),
        supabase.from('hk_tasks').select('*'),
        supabase.from('tickets').select('*'),
        supabase.from('notifications').select('*'),
        supabase.from('folio_lines').select('*'),
      ]);

      setState(s => ({
        ...s,
        rooms: (rooms as any) || [],
        reservations: (reservations as any) || [],
        guests: (guests as any) || [],
        hkTasks: (hkTasks as any) || [],
        tickets: (tickets as any) || [],
        notifications: (notifications as any) || [],
        folio: (folio as any) || []
      }));
    } catch (err) {
      console.error("Failed to fetch Supabase data", err);
    }
  }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || "PENDING";
        setState((s) => ({
          ...s,
          session: {
            username: session.user.email || "",
            name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "",
            role: role as Role,
            roleLabel: role === "SUPER_ADMIN" ? "Super Admin" : role,
          }
        }));
        fetchData();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || "PENDING";
        setState((s) => ({
          ...s,
          session: {
            username: session.user.email || "",
            name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "",
            role: role as Role,
            roleLabel: role === "SUPER_ADMIN" ? "Super Admin" : role,
          }
        }));
        fetchData();
      } else {
        setState((s) => ({ ...s, session: null }));
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchData]);

  // Realtime Subscriptions
  React.useEffect(() => {
    if (!state.session) return;
    
    const channel = supabase.channel('pms_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        // Simple approach: re-fetch everything on any change to keep it perfectly synced.
        // In a production app you'd apply patches based on payload.new / payload.old
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [state.session, fetchData]);

  const value = React.useMemo<Ctx>(() => {
    const patch = (fn: (s: State) => Partial<State>) => setState((s) => ({ ...s, ...fn(s) }));

    return {
      ...state,
      login: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error || !data.user) return null;
        
        const role = data.user.user_metadata?.role || "PENDING";
        const session: Session = {
          username: data.user.email || "",
          name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "",
          role: role as Role,
          roleLabel: role === "SUPER_ADMIN" ? "Super Admin" : role,
        };
        return session;
      },
      signUp: async (email, password) => {
        const role = "SUPER_ADMIN";
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role, name: email.split("@")[0] }
          }
        });
        if (error || !data.user) return null;

        const session: Session = {
          username: data.user.email || "",
          name: email.split("@")[0],
          role: role as Role,
          roleLabel: "Super Admin",
        };
        return session;
      },
      logout: async () => {
        await supabase.auth.signOut();
        setState((s) => ({ ...s, session: null }));
      },
      
      // Mapped Supabase Mutators
      setRoomStatus: async (roomId, status) => {
        // Optimistic update
        patch((s) => ({ rooms: s.rooms.map(r => r.id === roomId ? { ...r, status } : r) }));
        const hkStatus = status === "cleaning" ? "In Progress" : status === "vacant-dirty" ? "Dirty" : status === "vacant-clean" ? "Inspected" : undefined;
        const updates: any = { status };
        if (hkStatus) updates.hk_status = hkStatus;
        if (status !== 'occupied') { updates.guest = null; updates.reservationId = null; }
        await supabase.from('rooms').update(updates).eq('id', roomId);
      },
      
      assignGuestToRoom: async (roomId, guest) => {
        patch((s) => ({ rooms: s.rooms.map((r) => r.id === roomId ? { ...r, status: "occupied", guest } : r) }));
        await supabase.from('rooms').update({ status: 'occupied', guest }).eq('id', roomId);
      },
      
      checkIn: async (reservationId, roomNumber) => {
        // Simplified optimistic update
        await supabase.from('reservations').update({ status: 'Checked In', room: roomNumber }).eq('id', reservationId);
        if (roomNumber) {
          const res = state.reservations.find(r => r.id === reservationId);
          await supabase.from('rooms').update({ status: 'occupied', guest: res?.guest, reservationId }).eq('number', roomNumber);
        }
        fetchData();
      },
      
      checkOut: async (reservationId) => {
        const res = state.reservations.find((r) => r.id === reservationId);
        await supabase.from('reservations').update({ status: 'Checked Out', payment_status: 'Paid', paid: res?.amount }).eq('id', reservationId);
        if (res?.room) {
          await supabase.from('rooms').update({ status: 'vacant-dirty', hk_status: 'Dirty', guest: null, reservationId: null }).eq('number', res.room);
          await supabase.from('hk_tasks').insert({
            id: `HK-${Date.now()}`, room_id: res.room, room_type: res.roomType, checkout: "11:00 AM", kind: "Departure Clean", assignee: "Unassigned", stage: "Dirty", priority: "High"
          });
        }
        fetchData();
      },
      
      setReservationStatus: async (id, status) => {
        patch((s) => ({ reservations: s.reservations.map(r => r.id === id ? { ...r, status } : r) }));
        await supabase.from('reservations').update({ status }).eq('id', id);
      },
      
      addReservation: (r) => {
        // A real app would return a Promise here, but keeping signature sync for UI compat.
        const res: Reservation = {
          id: `DRB-24${Math.floor(Math.random() * 800 + 100)}`,
          guest: r.guest,
          email: r.email ?? "guest@example.com",
          phone: r.phone ?? "+91 90000 00000",
          room: r.room ?? "—",
          roomType: r.roomType ?? "Deluxe King",
          arrival: r.arrival ?? "12 Aug 2026",
          departure: r.departure ?? "14 Aug 2026",
          nights: r.nights ?? 2,
          adults: r.adults ?? 2,
          ratePlan: r.ratePlan ?? "Best Flexible",
          source: r.source ?? "Direct Website",
          amount: r.amount ?? 9000,
          paid: r.paid ?? 0,
          payment: r.payment ?? "Pending",
          status: r.status ?? "Confirmed",
          eta: r.eta ?? "14:00",
          vip: r.vip ?? false,
        };
        
        // Optimistic
        patch((s) => ({ reservations: [res, ...s.reservations] }));
        
        // Async push
        supabase.from('reservations').insert({
          id: res.id, guest_id: "G-1000", room_id: "room-101", arrival: '2026-08-12', departure: '2026-08-14', nights: res.nights, status: res.status
        }).then(() => fetchData());
        
        return res;
      },
      
      transferRoom: async (reservationId, toRoom) => {
        await supabase.from('reservations').update({ room: toRoom }).eq('id', reservationId);
        fetchData();
      },
      
      setTaskStage: async (taskId, stage) => {
        patch((s) => ({ hkTasks: s.hkTasks.map((t) => (t.id === taskId ? { ...t, stage } : t)) }));
        await supabase.from('hk_tasks').update({ stage }).eq('id', taskId);
      },
      
      assignTask: async (taskId, assignee) => {
        patch((s) => ({ hkTasks: s.hkTasks.map((t) => (t.id === taskId ? { ...t, assignee, stage: t.stage === 'Dirty' ? 'Assigned' : t.stage } : t)) }));
        await supabase.from('hk_tasks').update({ assignee }).eq('id', taskId);
      },
      
      addFolioLine: async (line) => {
        const id = `F-${Date.now()}`;
        patch((s) => ({ folio: [...s.folio, { ...line, id }] }));
        await supabase.from('folio_lines').insert({ id, date: new Date().toISOString().split('T')[0], description: line.description, category: line.category, amount: line.amount });
      },
      
      addTicket: async (t) => {
        const id = `MT-${Date.now()}`;
        patch((s) => ({ tickets: [{ ...t, id, raised: "Just now" }, ...s.tickets] }));
        await supabase.from('tickets').insert({ id, issue: t.issue, priority: t.priority, status: t.status });
      },
      
      addOrder: (o) => patch((s) => ({ orders: [{ ...o, id: `POS-${1200 + s.orders.length + 1}`, time: "Just now" }, ...s.orders] })),
      
      addEvent: (e) => patch((s) => ({ events: [{ ...e, id: `EV-${s.events.length + 1}` }, ...s.events] })),
      
      addGuest: (g) => {
        const guest: Guest = { ...g, id: `G-${1100 + Math.floor(Math.random() * 800)}` };
        patch((s) => ({ guests: [guest, ...s.guests] }));
        supabase.from('guests').insert({ id: guest.id, name: guest.name, email: guest.email }).then();
        return guest;
      },
      
      markAllRead: async () => {
        patch((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) }));
        await supabase.from('notifications').update({ read: true }).eq('read', false);
      },
      
      toggleRead: async (id) => {
        const n = state.notifications.find(x => x.id === id);
        if (n) {
          patch((s) => ({ notifications: s.notifications.map((x) => (x.id === id ? { ...x, read: !x.read } : x)) }));
          await supabase.from('notifications').update({ read: !n.read }).eq('id', id);
        }
      },
      
      pushNotification: async (n) => {
        const id = `N-${Date.now()}`;
        patch((s) => ({ notifications: [{ ...n, id, read: false, time: "Just now" }, ...s.notifications] }));
        await supabase.from('notifications').insert({ id, title: n.title, body: n.body, type: n.type });
      },
      
      runNightAudit: () => patch(() => ({ auditRun: true })),
      
      seedDatabase: async () => {
        try {
          // Push Guests
          const gPromises = MOCK_GUESTS.map(g => supabase.from('guests').insert({
            id: g.id, name: g.name, email: g.email, phone: g.phone, country: g.country, type: g.type, vip: g.vip, notes: g.notes
          }));
          await Promise.all(gPromises);
          
          // Push Rooms
          const rmPromises = MOCK_ROOMS.map(r => supabase.from('rooms').insert({
            id: r.id, number: r.number, floor: r.floor, floor_name: r.floorName, type: r.type, bed: r.bed, max_guests: r.maxGuests, rate: r.rate, status: r.status, hk_status: r.hkStatus, view: r.view
          }));
          await Promise.all(rmPromises);
          
          // Push Reservations
          const resPromises = MOCK_RESERVATIONS.map(r => supabase.from('reservations').insert({
            id: r.id, guest_id: MOCK_GUESTS.find(g => g.name === r.guest)?.id || MOCK_GUESTS[0].id, room_id: MOCK_ROOMS.find(rm => rm.number === r.room)?.id, arrival: '2026-08-12', departure: '2026-08-14', nights: r.nights, adults: r.adults, rate_plan: r.ratePlan, source: r.source, amount: r.amount, paid: r.paid, payment_status: r.payment, status: r.status, eta: r.eta, vip: r.vip
          }));
          await Promise.all(resPromises);
          
          fetchData();
          alert("Database seeded successfully!");
        } catch (err) {
          console.error("Seeding failed", err);
          alert("Failed to seed database.");
        }
      }
    };
  }, [state, fetchData]);

  return <PmsContext.Provider value={value}>{children}</PmsContext.Provider>;
}

export function usePms() {
  const ctx = React.useContext(PmsContext);
  if (!ctx) throw new Error("usePms must be used inside PmsProvider");
  return ctx;
}

export function useHydrated() {
  const [h, setH] = React.useState(false);
  React.useEffect(() => setH(true), []);
  return h;
}
