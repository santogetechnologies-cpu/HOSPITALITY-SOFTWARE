import * as React from "react";
import { supabase } from "./supabase";
import {
  type Room,
  type RoomStatus,
  type Reservation,
  type Guest,
  type Notification,
  type Payment,
  type Discount,
  type Expense,
  type Profile,
} from "./pms-data";

export type Role = "SUPER_ADMIN" | "GM" | "FRONT_DESK" | "PENDING";

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
  payments: Payment[];
  discounts: Discount[];
  expenses: Expense[];
  profiles: Profile[];
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
  payments: [],
  discounts: [],
  expenses: [],
  profiles: [],
  notifications: [],
  tickets: [],
  folio: [],
  events: [],
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
  login: (email: string, password: string) => Promise<{ session: Session | null; error: string | null }>;
  logout: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ session: Session | null; error: string | null }>;
  setRoomStatus: (roomId: string, status: RoomStatus) => void;
  assignGuestToRoom: (roomId: string, guest: string) => void;
  checkIn: (reservationId: string, roomNumber?: string) => void;
  checkOut: (reservationId: string) => void;
  setReservationStatus: (id: string, status: ReservationStatus) => void;
  setReservationStatus: (id: string, status: ReservationStatus) => void;
  addRoomReservation: (booking: { guestName: string; phone: string; email: string; roomId: string; date: string; nights: number; baseAmount: number; totalAmount: number; paymentMethod: string; paidAmount: number; }) => Promise<{ success: boolean; error?: string }>;
  transferRoom: (reservationId: string, toRoom: string) => void;
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
  addPartyHallBooking: (b: { customerName: string; phone: string; email: string; eventType: string; guests: number; date: string; startTime: string; endTime: string; baseAmount: number; advance: number; }) => Promise<{ success: boolean; error?: string }>;
  
  // Finance Mutators
  settlePayment: (paymentId: string, amount: number) => Promise<void>;
  freezePayment: (paymentId: string) => Promise<void>;
  requestDiscount: (reservationId: string, amount: number, reason: string) => Promise<void>;
  resolveDiscount: (discountId: string, status: "APPROVED" | "REJECTED") => Promise<void>;
  addExpense: (amount: number, category: string, description: string) => Promise<void>;
  
  // Staff Mutators
  addStaff: (name: string, role: string, phone: string) => Promise<void>;
  updateStaffRole: (profileId: string, role: string) => Promise<void>;
  toggleStaffStatus: (profileId: string) => Promise<void>;
  deleteStaff: (profileId: string) => Promise<void>;
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
        { data: payments },
        { data: discounts },
        { data: expenses },
        { data: profiles },
        { data: notifications }
      ] = await Promise.all([
        supabase.from('rooms').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('guests').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('discounts').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('notifications').select('*')
      ]);

      setState(s => ({
        ...s,
        rooms: (rooms as any) || [],
        reservations: (reservations as any) || [],
        guests: (guests as any) || [],
        payments: (payments as any) || [],
        discounts: (discounts as any) || [],
        expenses: (expenses as any) || [],
        profiles: (profiles as any) || [],
        notifications: (notifications as any) || []
      }));
    } catch (err) {
      console.error("Failed to fetch Supabase data", err);
    }
  }, []);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) console.error("GetSession Error:", error);
      if (session?.user) {
        let role = session.user.user_metadata?.role || "SUPER_ADMIN";
        if (session.user.email?.toLowerCase() === "drbhoteladmin@drb.com") {
          role = "SUPER_ADMIN";
        }
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
        let role = session.user.user_metadata?.role || "SUPER_ADMIN";
        if (session.user.email?.toLowerCase() === "drbhoteladmin@drb.com") {
          role = "SUPER_ADMIN";
        }
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
        if (error || !data.user) {
          console.error("Supabase Login Error:", error);
          return { session: null, error: error?.message || "Invalid credentials." };
        }
        
        let role = data.user.user_metadata?.role || "SUPER_ADMIN";
        // Force super admin for the specific email
        if (email.toLowerCase() === "drbhoteladmin@drb.com") {
          role = "SUPER_ADMIN";
        }
        
        const session: Session = {
          username: data.user.email || "",
          name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "",
          role: role as Role,
          roleLabel: role === "SUPER_ADMIN" ? "Super Admin" : role,
        };
        return { session, error: null };
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
        if (error || !data.user) {
           return { session: null, error: error?.message || "Registration failed." };
        }

        const session: Session = {
          username: data.user.email || "",
          name: email.split("@")[0],
          role: role as Role,
          roleLabel: "Super Admin",
        };
        return { session, error: null };
      },
      logout: async () => {
        await supabase.auth.signOut();
        setState((s) => ({ ...s, session: null }));
      },
      
      // Mapped Supabase Mutators
      setRoomStatus: async (roomId, status) => {
        patch((s) => ({ rooms: s.rooms.map(r => r.id === roomId ? { ...r, status } : r) }));
        await supabase.from('rooms').update({ status }).eq('id', roomId);
      },
      
      assignGuestToRoom: async (roomId, guest) => {
        patch((s) => ({ rooms: s.rooms.map((r) => r.id === roomId ? { ...r, status: "occupied", guest } : r) }));
        await supabase.from('rooms').update({ status: 'occupied', guest }).eq('id', roomId);
      },
      
      checkIn: async (reservationId, roomId) => {
        await supabase.from('reservations').update({ status: 'OCCUPIED' }).eq('id', reservationId);
        if (roomId) {
          await supabase.from('rooms').update({ status: 'OCCUPIED' }).eq('id', roomId);
        }
        fetchData();
      },
      
      checkOut: async (reservationId) => {
        const res = state.reservations.find((r) => r.id === reservationId);
        await supabase.from('reservations').update({ status: 'COMPLETED' }).eq('id', reservationId);
        if (res?.room_id) {
          await supabase.from('rooms').update({ status: 'DIRTY' }).eq('id', res.room_id);
        }
        fetchData();
      },
      
      setReservationStatus: async (id, status) => {
        patch((s) => ({ reservations: s.reservations.map(r => r.id === id ? { ...r, status } : r) }));
        await supabase.from('reservations').update({ status }).eq('id', id);
      },
      
      addRoomReservation: async (b) => {
        try {
          // 1. Insert Guest
          const guestId = crypto.randomUUID();
          await supabase.from('guests').insert({
            id: guestId, name: b.guestName, phone: b.phone, email: b.email
          });

          // 2. Insert Reservation
          const resId = `RES-${Date.now().toString().slice(-6)}`;
          await supabase.from('reservations').insert({
            id: resId,
            guest_id: guestId,
            room_id: b.roomId,
            resource_type: 'ROOM',
            booking_date: b.date,
            start_time: '14:00:00',
            end_time: '11:00:00',
            status: 'CONFIRMED',
            base_amount: b.baseAmount
          });

          // 3. Update Room Status
          await supabase.from('rooms').update({ status: 'BOOKED' }).eq('id', b.roomId);

          // 4. Create Payment Folio
          await supabase.from('payments').insert({
            id: crypto.randomUUID(),
            reservation_id: resId,
            total_amount: b.totalAmount,
            paid_amount: b.paidAmount,
            status: b.paidAmount >= b.totalAmount ? 'COMPLETED' : b.paidAmount > 0 ? 'PARTIAL' : 'PENDING'
          });

          fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("Booking error:", err);
          return { success: false, error: err.message || "Failed to create booking" };
        }
      },
      
      transferRoom: async (reservationId, toRoom) => {
        await supabase.from('reservations').update({ room_id: toRoom }).eq('id', reservationId);
        fetchData();
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
        alert("Seeding is disabled for DRB 2.0 live mode.");
      },

      addPartyHallBooking: async (b) => {
        try {
          // 1. Check for overlapping bookings
          const startTs = new Date(`${b.date}T${b.startTime}`).toISOString();
          const endTs = new Date(`${b.date}T${b.endTime}`).toISOString();

          const { data: overlaps, error: overlapErr } = await supabase
            .from('reservations')
            .select('start_time, end_time')
            .eq('resource_type', 'PARTY_HALL')
            .eq('booking_date', b.date)
            .not('status', 'eq', 'CANCELLED');

          if (overlapErr) throw overlapErr;

          const isOverlapping = overlaps?.some(r => {
            const rStart = new Date(r.start_time).getTime();
            const rEnd = new Date(r.end_time).getTime();
            const bStart = new Date(startTs).getTime();
            const bEnd = new Date(endTs).getTime();
            return (bStart < rEnd && bEnd > rStart); // overlap condition
          });

          if (isOverlapping) {
            return { success: false, error: "Party Hall Unavailable — Overlapping booking detected for this time slot." };
          }

          // 2. Insert Guest
          const guestId = crypto.randomUUID();
          const { error: gErr } = await supabase.from('guests').insert({
            id: guestId, name: b.customerName, phone: b.phone, email: b.email
          });
          if (gErr) throw gErr;

          // 3. Get Party Hall ID (assuming only one exists)
          const { data: hall } = await supabase.from('party_hall').select('id').limit(1).single();
          const hallId = hall?.id;

          // 4. Create Reservation
          const resId = crypto.randomUUID();
          const { error: rErr } = await supabase.from('reservations').insert({
            id: resId,
            guest_id: guestId,
            resource_type: 'PARTY_HALL',
            party_hall_id: hallId,
            event_type: b.eventType,
            number_of_guests: b.guests,
            booking_date: b.date,
            start_time: startTs,
            end_time: endTs,
            base_amount: b.baseAmount,
            status: 'CONFIRMED'
          });
          if (rErr) throw rErr;

          // 5. Create Payment Record
          const { error: pErr } = await supabase.from('payments').insert({
            reservation_id: resId,
            total_amount: b.baseAmount,
            paid_amount: b.advance,
            status: b.advance >= b.baseAmount ? 'COMPLETED' : b.advance > 0 ? 'PARTIAL' : 'PENDING',
            payment_method: 'CASH'
          });
          if (pErr) throw pErr;

          // Refresh data
          fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("Booking error:", err);
          return { success: false, error: err.message || "Failed to create booking" };
        }
      },

      settlePayment: async (paymentId, amount) => {
        const payment = state.payments.find(p => p.id === paymentId);
        if (!payment) return;
        const newPaid = payment.paid_amount + amount;
        const status = newPaid >= payment.total_amount ? "COMPLETED" : "PARTIAL";
        await supabase.from('payments').update({ paid_amount: newPaid, status }).eq('id', paymentId);
        fetchData();
      },

      freezePayment: async (paymentId) => {
        await supabase.from('payments').update({ status: "FROZEN" }).eq('id', paymentId);
        fetchData();
      },

      requestDiscount: async (reservationId, amount, reason) => {
        const id = crypto.randomUUID();
        await supabase.from('discounts').insert({
          id,
          reservation_id: reservationId,
          requested_amount: amount,
          reason,
          status: "PENDING",
          requested_by: state.session?.username || "System"
        });
        fetchData();
      },

      resolveDiscount: async (discountId, status) => {
        const discount = state.discounts.find(d => d.id === discountId);
        if (!discount) return;
        await supabase.from('discounts').update({ 
          status, 
          approved_by: state.session?.username || "System" 
        }).eq('id', discountId);

        // If approved, apply the discount to the payment total
        if (status === "APPROVED") {
          const payment = state.payments.find(p => p.reservation_id === discount.reservation_id);
          if (payment) {
            const newTotal = Math.max(0, payment.total_amount - discount.requested_amount);
            const newStatus = payment.paid_amount >= newTotal ? "COMPLETED" : payment.status;
            await supabase.from('payments').update({ 
              total_amount: newTotal,
              status: newStatus
            }).eq('id', payment.id);
          }
        }
        fetchData();
      },

      addExpense: async (amount, category, description) => {
        const id = crypto.randomUUID();
        await supabase.from('expenses').insert({
          id,
          amount,
          category,
          description,
          recorded_by: state.session?.username || "System"
        });
        fetchData();
      },
      
      addStaff: async (name, role, phone) => {
        const id = crypto.randomUUID();
        await supabase.from('profiles').insert({ id, name, role, phone, status: 'ACTIVE' });
        fetchData();
      },
      
      updateStaffRole: async (profileId, role) => {
        await supabase.from('profiles').update({ role }).eq('id', profileId);
        fetchData();
      },

      toggleStaffStatus: async (profileId) => {
        const profile = state.profiles.find(p => p.id === profileId);
        if (profile) {
          const newStatus = profile.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
          await supabase.from('profiles').update({ status: newStatus }).eq('id', profileId);
          fetchData();
        }
      },

      deleteStaff: async (profileId) => {
        await supabase.from('profiles').delete().eq('id', profileId);
        fetchData();
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
