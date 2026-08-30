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
  type HkTask,
  type Ticket
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
  hkTasks: HkTask[];
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
  hkTasks: [],
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
  addTicket: (t: Omit<Ticket, "id" | "raised">) => Promise<void>;
  setTaskStage: (taskId: string, stage: string) => Promise<void>;
  assignTask: (taskId: string, assignee: string) => Promise<void>;
  addOrder: (o: Omit<PosOrder, "id" | "time">) => void;
  addEvent: (e: Omit<EventBooking, "id">) => void;
  addGuest: (g: Omit<Guest, "id">) => Promise<{id: string, success: boolean}>;
  markAllRead: () => void;
  toggleRead: (id: string) => void;
  pushNotification: (n: Omit<Notification, "id" | "read" | "time">) => void;
  runNightAudit: () => void;
  seedDatabase: () => Promise<void>; // Added for convenience
  addPartyHallBooking: (b: { customerName: string; phone: string; email: string; eventType: string; guests: number; date: string; startTime: string; endTime: string; baseAmount: number; advance: number; }) => Promise<{ success: boolean; error?: string }>;
  
  // Finance Mutators
  settlePayment: (paymentId: string, amount: number) => Promise<{ success: boolean; error?: string }>;
  freezePayment: (paymentId: string) => Promise<{ success: boolean; error?: string }>;
  requestDiscount: (reservationId: string, amount: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  resolveDiscount: (discountId: string, status: "APPROVED" | "REJECTED") => Promise<{ success: boolean; error?: string }>;
  addExpense: (amount: number, category: string, description: string) => Promise<{ success: boolean; error?: string }>;
  
  // Deletion Mutators
  deleteGuest: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteRoom: (id: string) => Promise<{ success: boolean; error?: string }>;
  deletePayment: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteExpense: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Room Mutators
  addRoom: (number: string, type: string, floor: string, price: number) => Promise<{ success: boolean; error?: string }>;

  // Staff Mutators
  addStaff: (name: string, role: string, phone: string, email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  updateStaffRole: (profileId: string, role: string) => Promise<void>;
  updateStaffPassword: (profileId: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  toggleStaffStatus: (profileId: string) => Promise<void>;
  deleteStaff: (profileId: string) => Promise<{ success: boolean; error?: string }>;
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
        { data: notifications },
        { data: hkTasks },
        { data: tickets }
      ] = await Promise.all([
        supabase.from('rooms').select('*'),
        supabase.from('reservations').select('*'),
        supabase.from('guests').select('*'),
        supabase.from('payments').select('*'),
        supabase.from('discounts').select('*'),
        supabase.from('expenses').select('*'),
        supabase.from('profiles').select('*'),
        supabase.from('notifications').select('*'),
        supabase.from('hk_tasks').select('*'),
        supabase.from('tickets').select('*')
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
        notifications: (notifications as any) || [],
        hkTasks: (hkTasks as any) || [],
        tickets: (tickets as any) || []
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
          // 1. Insert Guest (using columns guaranteed to exist on guests table)
          const guestId = crypto.randomUUID();
          const { error: gErr } = await supabase.from('guests').insert({
            id: guestId,
            name: b.guestName,
            phone: b.phone || null,
            email: b.email || null
          });
          if (gErr) throw gErr;

          // 2. Insert Reservation with valid ISO timestamp for start_time and end_time
          const resId = crypto.randomUUID();
          const bookingDate = b.date || new Date().toISOString().split('T')[0];
          const nights = Number(b.nights) || 1;
          const startTs = new Date(`${bookingDate}T14:00:00`).toISOString();
          const endDateObj = new Date(`${bookingDate}T11:00:00`);
          endDateObj.setDate(endDateObj.getDate() + nights);
          const endTs = endDateObj.toISOString();

          const { error: rErr } = await supabase.from('reservations').insert({
            id: resId,
            guest_id: guestId,
            room_id: b.roomId,
            resource_type: 'ROOM',
            booking_date: bookingDate,
            start_time: startTs,
            end_time: endTs,
            status: 'CONFIRMED',
            base_amount: Number(b.totalAmount) || Number(b.baseAmount) || 0
          });
          if (rErr) throw rErr;

          // 3. Update Room Status
          if (b.roomId) {
            await supabase.from('rooms').update({ status: 'BOOKED' }).eq('id', b.roomId);
          }

          // 4. Create Payment Folio (Immediately reflects in Pending Payments / Payment History)
          const totalAmt = Number(b.totalAmount) || Number(b.baseAmount) || 0;
          const paidAmt = Number(b.paidAmount) || 0;
          const payStatus = paidAmt >= totalAmt && totalAmt > 0 ? 'COMPLETED' : paidAmt > 0 ? 'PARTIAL' : 'PENDING';
          
          let method: 'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'OTHER' = 'CASH';
          if (b.paymentMethod) {
            const m = b.paymentMethod.toUpperCase().trim();
            if (m.includes('CARD') || m.includes('CREDIT') || m.includes('DEBIT')) method = 'CARD';
            else if (m.includes('UPI') || m.includes('GPAY') || m.includes('PHONEPE') || m.includes('PAYTM')) method = 'UPI';
            else if (m.includes('BANK') || m.includes('TRANSFER') || m.includes('NEFT')) method = 'BANK_TRANSFER';
            else if (m.includes('CASH')) method = 'CASH';
            else method = 'OTHER';
          }

          const { error: pErr } = await supabase.from('payments').insert({
            id: crypto.randomUUID(),
            reservation_id: resId,
            total_amount: totalAmt,
            paid_amount: paidAmt,
            status: payStatus,
            payment_method: method
          });
          if (pErr) throw pErr;

          await fetchData();
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
        await supabase.from('tickets').insert({ 
          id, 
          room_id: t.room_id || null, 
          issue: t.issue, 
          priority: t.priority, 
          status: t.status,
          assignee: t.assignee || 'Unassigned'
        });
        fetchData();
      },
      
      setTaskStage: async (taskId, stage) => {
        await supabase.from('hk_tasks').update({ stage }).eq('id', taskId);
        fetchData();
      },

      assignTask: async (taskId, assignee) => {
        await supabase.from('hk_tasks').update({ assignee }).eq('id', taskId);
        fetchData();
      },

      addOrder: (o) => patch((s) => ({ orders: [{ ...o, id: `POS-${1200 + s.orders.length + 1}`, time: "Just now" }, ...s.orders] })),
      
      addEvent: (e) => patch((s) => ({ events: [{ ...e, id: `EV-${s.events.length + 1}` }, ...s.events] })),
      
      addPayment: (p) => patch((s) => ({ payments: [{ ...p, id: `PAY-${s.payments.length + 1}` }, ...s.payments] })),

      addGuest: async (g) => {
        try {
          const id = crypto.randomUUID();
          const { error } = await supabase.from('guests').insert({ 
            id, 
            name: g.name, 
            email: g.email || null,
            phone: g.phone || null,
            address: g.address || null,
            id_number: g.id_number || null,
            notes: g.notes || null
          });
          if (error) {
            console.error("addGuest error:", error);
            return { id: '', success: false, error: error.message };
          }
          await fetchData();
          return { id, success: true };
        } catch (err: any) {
          console.error("addGuest catch:", err);
          return { id: '', success: false, error: err.message };
        }
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
        try {
          const payment = state.payments.find(p => p.id === paymentId);
          if (!payment) return { success: false, error: "Payment record not found" };
          const newPaid = (payment.paid_amount || 0) + amount;
          const status = newPaid >= payment.total_amount ? "COMPLETED" : "PARTIAL";
          const { error } = await supabase.from('payments').update({ paid_amount: newPaid, status }).eq('id', paymentId);
          if (error) throw error;
          fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("Settle payment error:", err);
          return { success: false, error: err.message || "Failed to settle payment" };
        }
      },

      freezePayment: async (paymentId) => {
        try {
          const { error } = await supabase.from('payments').update({ status: "FROZEN" }).eq('id', paymentId);
          if (error) throw error;
          fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("Freeze payment error:", err);
          return { success: false, error: err.message || "Failed to freeze account" };
        }
      },

      requestDiscount: async (reservationId, amount, reason) => {
        try {
          const id = crypto.randomUUID();
          const { error } = await supabase.from('discounts').insert({
            id,
            reservation_id: reservationId,
            requested_amount: amount,
            reason,
            status: "PENDING",
            requested_by: state.session?.username || "System"
          });
          if (error) throw error;
          fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("Discount error:", err);
          return { success: false, error: err.message || "Failed to request discount" };
        }
      },

      resolveDiscount: async (discountId, status) => {
        try {
          const discount = state.discounts.find(d => d.id === discountId);
          if (!discount) return { success: false, error: "Discount request not found" };
          const { error } = await supabase.from('discounts').update({ 
            status, 
            approved_by: state.session?.username || "System" 
          }).eq('id', discountId);
          if (error) throw error;

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
          return { success: true };
        } catch (err: any) {
          console.error("Resolve discount error:", err);
          return { success: false, error: err.message || "Failed to update discount" };
        }
      },

      addExpense: async (amount, category, description) => {
        try {
          const id = crypto.randomUUID();
          const { error } = await supabase.from('expenses').insert({
            id,
            amount,
            category,
            description,
            recorded_by: state.session?.username || "System"
          });
          if (error) throw error;
          fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("Expense error:", err);
          return { success: false, error: err.message || "Failed to record expense" };
        }
      },
      
      deleteGuest: async (id) => {
        try {
          const { error } = await supabase.from('guests').delete().eq('id', id);
          if (error) throw error;
          await fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("deleteGuest error:", err);
          return { success: false, error: err.message || "Failed to delete guest" };
        }
      },

      deleteRoom: async (id) => {
        try {
          const { error } = await supabase.from('rooms').delete().eq('id', id);
          if (error) throw error;
          await fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("deleteRoom error:", err);
          return { success: false, error: err.message || "Failed to delete room" };
        }
      },

      deletePayment: async (id) => {
        try {
          const { error } = await supabase.from('payments').delete().eq('id', id);
          if (error) throw error;
          await fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("deletePayment error:", err);
          return { success: false, error: err.message || "Failed to delete payment" };
        }
      },

      deleteExpense: async (id) => {
        try {
          const { error } = await supabase.from('expenses').delete().eq('id', id);
          if (error) throw error;
          await fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("deleteExpense error:", err);
          return { success: false, error: err.message || "Failed to delete expense" };
        }
      },

      addStaff: async (name, role, phone, email, pass) => {
        try {
          const userId = crypto.randomUUID();
          const { error: pErr } = await supabase.from('profiles').upsert({
            id: userId,
            name,
            role: role || 'FRONT_DESK',
            phone: phone || null,
            email: email || null,
            pin: pass || null,
            status: 'ACTIVE'
          });
          if (pErr) throw pErr;
          
          await fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("addStaff error:", err);
          return { success: false, error: err.message || "Failed to create staff profile" };
        }
      },
      
      updateStaffRole: async (profileId, role) => {
        await supabase.from('profiles').update({ role }).eq('id', profileId);
        fetchData();
      },

      updateStaffPassword: async (profileId, pass) => {
        try {
          const { error } = await supabase.from('profiles').update({ pin: pass }).eq('id', profileId);
          if (error) throw error;
          await fetchData();
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || "Failed to update password" };
        }
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
        try {
          const { error } = await supabase.from('profiles').delete().eq('id', profileId);
          if (error) throw error;
          await fetchData();
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || "Failed to delete staff member" };
        }
      },

      addRoom: async (number, type, floor, price) => {
        try {
          const id = crypto.randomUUID();
          const { error } = await supabase.from('rooms').insert({
            id,
            room_number: String(number),
            room_name: type || "Standard Room",
            floor: String(floor || "1"),
            price: Number(price) || 0,
            status: 'AVAILABLE',
            capacity: 2,
            is_active: true
          });
          if (error) {
            console.error("Error creating room:", error);
            return { success: false, error: error.message };
          }
          fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("Room insert exception:", err);
          return { success: false, error: err.message || "Failed to create room" };
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
