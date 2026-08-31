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
  addRoomReservation: (booking: {
    guestName: string;
    phone?: string;
    email?: string;
    idType?: string;
    idNumber?: string;
    address?: string;
    country?: string;
    numberOfGuests?: number;
    roomId: string;
    startDate: string;
    endDate: string;
    nights: number;
    baseAmount: number;
    totalAmount: number;
    paymentMethod?: string;
    paidAmount?: number;
    notes?: string;
  }) => Promise<{ success: boolean; error?: string }>;
  transferRoom: (reservationId: string, toRoom: string) => void;
  addFolioLine: (line: Omit<FolioLine, "id">) => void;
  addTicket: (t: Omit<Ticket, "id" | "raised">) => Promise<void>;
  setTaskStage: (taskId: string, stage: string) => Promise<void>;
  assignTask: (taskId: string, assignee: string) => Promise<void>;
  addOrder: (o: Omit<PosOrder, "id" | "time">) => void;
  addEvent: (e: Omit<EventBooking, "id">) => void;
  addPayment: (p: Omit<Payment, "id">) => void;
  addGuest: (g: Omit<Guest, "id">) => Promise<{id: string, success: boolean, error?: string}>;
  markAllRead: () => void;
  toggleRead: (id: string) => void;
  pushNotification: (n: Omit<Notification, "id" | "read" | "time">) => void;
  runNightAudit: () => void;
  addPartyHallBooking: (b: { customerName: string; phone: string; email: string; eventType: string; guests: number; date: string; startTime: string; endTime: string; baseAmount: number; advance: number; paymentMethod?: string; }) => Promise<{ success: boolean; error?: string }>;
  updatePartyHallBooking: (reservationId: string, updates: { customerName?: string; phone?: string; email?: string; eventType?: string; guests?: number; date?: string; startTime?: string; endTime?: string; baseAmount?: number; status?: string; }) => Promise<{ success: boolean; error?: string }>;
  addReservationExtraCharge: (reservationId: string, additionalAmount: number, reason: string, options?: { newEndTime?: string; collectedAmount?: number; paymentMethod?: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER" }) => Promise<{ success: boolean; error?: string }>;
  
  // Finance Mutators
  settlePayment: (paymentId: string, amount: number, method?: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER") => Promise<{ success: boolean; error?: string }>;
  freezePayment: (paymentId: string) => Promise<{ success: boolean; error?: string }>;
  requestDiscount: (reservationId: string, amount: number, reason: string) => Promise<{ success: boolean; error?: string }>;
  resolveDiscount: (discountId: string, status: "APPROVED" | "REJECTED") => Promise<{ success: boolean; error?: string }>;
  addExpense: (amount: number, category: string, description: string) => Promise<{ success: boolean; error?: string }>;
  
  // Deletion Mutators
  deleteGuest: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteRoom: (id: string) => Promise<{ success: boolean; error?: string }>;
  deleteReservation: (id: string) => Promise<{ success: boolean; error?: string }>;
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

      const loadedDiscounts = (discounts as any) || [];
      const loadedPayments = (payments as any) || [];
      const loadedReservations = (reservations as any) || [];

      // Auto-reconciliation of approved discounts & payment statuses
      loadedPayments.forEach((pay: any) => {
        const res = loadedReservations.find((r: any) => r.id === pay.reservation_id || r.id?.toLowerCase() === pay.reservation_id?.toLowerCase());
        const approvedDisc = loadedDiscounts
          .filter((d: any) => (d.reservation_id === pay.reservation_id || d.reservation_id?.toLowerCase() === pay.reservation_id?.toLowerCase()) && d.status === 'APPROVED')
          .reduce((sum: number, d: any) => sum + (Number(d.requested_amount) || 0), 0);
        
        const originalAmount = Number(res?.base_amount) || Number(pay.total_amount) || 0;
        let effectiveTotal = Number(pay.total_amount) || originalAmount;
        if (approvedDisc > 0 && effectiveTotal >= originalAmount && originalAmount > approvedDisc) {
          effectiveTotal = Math.max(0, originalAmount - approvedDisc);
        }

        const paid = Number(pay.paid_amount) || 0;
        if (paid >= effectiveTotal && effectiveTotal > 0 && pay.status !== 'COMPLETED') {
          pay.status = 'COMPLETED';
          void supabase.from('payments').update({ status: 'COMPLETED' }).eq('id', pay.id);
        } else if (pay.status === 'FROZEN' && !loadedDiscounts.some((d: any) => (d.reservation_id === pay.reservation_id || d.reservation_id?.toLowerCase() === pay.reservation_id?.toLowerCase()) && d.status === 'PENDING')) {
          const newStatus = paid >= effectiveTotal && effectiveTotal > 0 ? 'COMPLETED' : (paid > 0 ? 'PARTIAL' : 'PENDING');
          pay.status = newStatus;
          void supabase.from('payments').update({ status: newStatus }).eq('id', pay.id);
        }
      });

      let loadedGuests = (guests as any) || [];

      // Auto-Deduplication: Merge duplicate guests with the same phone number
      const phoneToGuests = new Map<string, any[]>();
      loadedGuests.forEach((g: any) => {
        const phone = g.phone?.trim();
        if (phone) {
          const list = phoneToGuests.get(phone) || [];
          list.push(g);
          phoneToGuests.set(phone, list);
        }
      });

      const duplicateIdsToDelete: string[] = [];
      phoneToGuests.forEach((guestList) => {
        if (guestList.length > 1) {
          // Primary guest is the one with id_number, email, or first one
          const primary = guestList.find((g) => g.id_number || g.email) || guestList[0];
          const duplicates = guestList.filter((g) => g.id !== primary.id);

          duplicates.forEach((dup) => {
            duplicateIdsToDelete.push(dup.id);
            // Re-point any reservations from duplicate to primary
            loadedReservations.forEach((r: any) => {
              if (r.guest_id === dup.id) {
                r.guest_id = primary.id;
                void supabase.from('reservations').update({ guest_id: primary.id }).eq('guest_id', dup.id);
              }
            });
            // Delete duplicate from DB
            void supabase.from('guests').delete().eq('id', dup.id);
          });
        }
      });

      if (duplicateIdsToDelete.length > 0) {
        loadedGuests = loadedGuests.filter((g: any) => !duplicateIdsToDelete.includes(g.id));
      }

      setState(s => ({
        ...s,
        rooms: (rooms as any) || [],
        reservations: loadedReservations,
        guests: loadedGuests,
        payments: loadedPayments,
        discounts: loadedDiscounts,
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
        const updateData: any = { status: 'OCCUPIED' };
        if (roomId) updateData.room_id = roomId;
        await supabase.from('reservations').update(updateData).eq('id', reservationId);
        if (roomId) {
          await supabase.from('rooms').update({ status: 'OCCUPIED' }).eq('id', roomId);
        }
        await fetchData();
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
          if (!b.guestName || !b.guestName.trim()) {
            return { success: false, error: "Guest name is required." };
          }
          if (!b.roomId) {
            return { success: false, error: "Please select a room to reserve." };
          }
          if (!b.startDate || !b.endDate) {
            return { success: false, error: "Check-in and check-out dates are required." };
          }

          const startTs = new Date(`${b.startDate}T14:00:00`).getTime();
          const endTs = new Date(`${b.endDate}T11:00:00`).getTime();

          if (endTs <= startTs) {
            return { success: false, error: "Check-out date must be after check-in date." };
          }

          // 1. Conflict & Overlap Check: Verify no existing active reservation conflicts with [startTs, endTs]
          const isOverlapping = state.reservations.some((r) => {
            if (r.room_id !== b.roomId || r.status === "CANCELLED" || r.status === "COMPLETED") return false;
            const rStart = new Date(r.start_time || `${r.booking_date}T14:00:00`).getTime();
            const rEnd = new Date(r.end_time || `${r.booking_date}T11:00:00`).getTime();
            const effectiveEnd = rEnd > rStart ? rEnd : rStart + 24 * 60 * 60 * 1000;
            return (startTs < effectiveEnd && endTs > rStart);
          });

          if (isOverlapping) {
            const room = state.rooms.find((rm) => rm.id === b.roomId);
            return {
              success: false,
              error: `Room ${room?.room_number || "selected"} is already booked for these dates (${b.startDate} to ${b.endDate}). Please select different dates or another room.`
            };
          }

          // 2. Lookup or Insert Guest with ID and contact metadata
          const phoneTrimmed = b.phone?.trim();
          let guestId: string;

          const existingGuest = phoneTrimmed
            ? state.guests.find((g) => g.phone && g.phone.trim().toLowerCase() === phoneTrimmed.toLowerCase())
            : null;

          if (existingGuest) {
            guestId = existingGuest.id;
            // Update existing guest details if new info provided
            const updates: any = {};
            if (b.guestName.trim()) updates.name = b.guestName.trim();
            if (b.email?.trim()) updates.email = b.email.trim();
            if (b.idType) updates.id_type = b.idType;
            if (b.idNumber?.trim()) updates.id_number = b.idNumber.trim();
            if (b.address?.trim()) updates.address = b.address.trim();
            if (b.country?.trim()) updates.country = b.country.trim();
            if (b.notes?.trim()) updates.notes = b.notes.trim();

            if (Object.keys(updates).length > 0) {
              await supabase.from('guests').update(updates).eq('id', guestId);
            }
          } else {
            guestId = crypto.randomUUID();
            const { error: gErr } = await supabase.from('guests').insert({
              id: guestId,
              name: b.guestName.trim(),
              phone: phoneTrimmed || null,
              email: b.email?.trim() || null,
              id_type: b.idType || null,
              id_number: b.idNumber?.trim() || null,
              address: b.address?.trim() || null,
              country: b.country?.trim() || 'India',
              notes: b.notes?.trim() || null
            });
            if (gErr) throw gErr;
          }

          // 3. Insert Reservation with ISO start_time, end_time, and guest count
          const resId = crypto.randomUUID();
          const totalAmt = Number(b.totalAmount) || Number(b.baseAmount) || 0;
          const { error: rErr } = await supabase.from('reservations').insert({
            id: resId,
            guest_id: guestId,
            room_id: b.roomId,
            resource_type: 'ROOM',
            number_of_guests: Number(b.numberOfGuests) || 1,
            booking_date: b.startDate,
            start_time: new Date(`${b.startDate}T14:00:00`).toISOString(),
            end_time: new Date(`${b.endDate}T11:00:00`).toISOString(),
            status: 'CONFIRMED',
            base_amount: totalAmt,
            notes: b.notes?.trim() || null
          });
          if (rErr) throw rErr;

          // 4. Update Room Status to BOOKED
          if (b.roomId) {
            await supabase.from('rooms').update({ status: 'BOOKED' }).eq('id', b.roomId);
          }

          // 5. Create Payment Folio
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
          const phoneTrimmed = g.phone?.trim();
          if (phoneTrimmed) {
            const existing = state.guests.find(
              (x) => x.phone && x.phone.trim().toLowerCase() === phoneTrimmed.toLowerCase()
            );
            if (existing) {
              return {
                id: existing.id,
                success: false,
                error: `A guest profile with phone number "${phoneTrimmed}" already exists (${existing.name}).`,
              };
            }
          }

          const id = crypto.randomUUID();
          const { error } = await supabase.from('guests').insert({ 
            id, 
            name: g.name.trim(), 
            email: g.email?.trim() || null,
            phone: phoneTrimmed || null,
            address: g.address?.trim() || null,
            id_number: g.id_number?.trim() || null,
            country: g.country?.trim() || 'India',
            notes: g.notes?.trim() || null
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

          // 2. Lookup or Insert Guest
          const phoneTrimmed = b.phone?.trim();
          let guestId: string;
          const existingGuest = phoneTrimmed
            ? state.guests.find((g) => g.phone && g.phone.trim().toLowerCase() === phoneTrimmed.toLowerCase())
            : null;

          if (existingGuest) {
            guestId = existingGuest.id;
            const updates: any = {};
            if (b.customerName?.trim()) updates.name = b.customerName.trim();
            if (b.email?.trim()) updates.email = b.email.trim();
            if (Object.keys(updates).length > 0) {
              await supabase.from('guests').update(updates).eq('id', guestId);
            }
          } else {
            guestId = crypto.randomUUID();
            const { error: gErr } = await supabase.from('guests').insert({
              id: guestId,
              name: b.customerName.trim(),
              phone: phoneTrimmed || null,
              email: b.email?.trim() || null
            });
            if (gErr) throw gErr;
          }

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
            reservation_id: resId,
            total_amount: b.baseAmount,
            paid_amount: b.advance,
            status: b.advance >= b.baseAmount && b.baseAmount > 0 ? 'COMPLETED' : b.advance > 0 ? 'PARTIAL' : 'PENDING',
            payment_method: method
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

      updatePartyHallBooking: async (reservationId, updates) => {
        try {
          const res = state.reservations.find(r => r.id === reservationId);
          if (!res) return { success: false, error: "Booking not found" };

          // Update guest if provided
          if (res.guest_id && (updates.customerName || updates.phone || updates.email)) {
            const gUpdates: any = {};
            if (updates.customerName?.trim()) gUpdates.name = updates.customerName.trim();
            if (updates.phone?.trim()) gUpdates.phone = updates.phone.trim();
            if (updates.email?.trim()) gUpdates.email = updates.email.trim();
            await supabase.from('guests').update(gUpdates).eq('id', res.guest_id);
          }

          const rUpdates: any = {};
          if (updates.eventType) rUpdates.event_type = updates.eventType;
          if (updates.guests) rUpdates.number_of_guests = updates.guests;
          if (updates.date) rUpdates.booking_date = updates.date;
          if (updates.date && updates.startTime) rUpdates.start_time = new Date(`${updates.date}T${updates.startTime}`).toISOString();
          if (updates.date && updates.endTime) rUpdates.end_time = new Date(`${updates.date}T${updates.endTime}`).toISOString();
          if (updates.status) rUpdates.status = updates.status;
          if (typeof updates.baseAmount === 'number' && !isNaN(updates.baseAmount)) {
            rUpdates.base_amount = updates.baseAmount;
            const payment = state.payments.find(p => p.reservation_id === reservationId);
            if (payment) {
              const paid = Number(payment.paid_amount) || 0;
              const status = paid >= updates.baseAmount && updates.baseAmount > 0 ? 'COMPLETED' : paid > 0 ? 'PARTIAL' : 'PENDING';
              await supabase.from('payments').update({ total_amount: updates.baseAmount, status }).eq('id', payment.id);
            }
          }

          if (Object.keys(rUpdates).length > 0) {
            const { error } = await supabase.from('reservations').update(rUpdates).eq('id', reservationId);
            if (error) throw error;
          }

          await fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("Update party hall error:", err);
          return { success: false, error: err.message || "Failed to update booking" };
        }
      },

      addReservationExtraCharge: async (reservationId, additionalAmount, reason, options) => {
        try {
          const res = state.reservations.find(r => r.id === reservationId);
          if (!res) return { success: false, error: "Reservation not found" };

          const currentBase = Number(res.base_amount) || 0;
          const newBase = currentBase + Number(additionalAmount);

          const resUpdates: any = { base_amount: newBase };
          if (options?.newEndTime) {
            resUpdates.end_time = options.newEndTime;
          }
          const { error: rErr } = await supabase.from('reservations').update(resUpdates).eq('id', reservationId);
          if (rErr) throw rErr;

          let payment = state.payments.find(p => p.reservation_id === reservationId || (p.reservation_id && reservationId && p.reservation_id.toLowerCase() === reservationId.toLowerCase()));
          const collected = Number(options?.collectedAmount) || 0;
          const method = options?.paymentMethod || 'CASH';

          if (payment) {
            const currentTotal = Number(payment.total_amount) || currentBase;
            const newTotal = currentTotal + Number(additionalAmount);
            const currentPaid = Number(payment.paid_amount) || 0;
            const newPaid = currentPaid + collected;
            const status = newPaid >= newTotal && newTotal > 0 ? "COMPLETED" : newPaid > 0 ? "PARTIAL" : "PENDING";
            const payUpdates: any = { total_amount: newTotal, paid_amount: newPaid, status };
            if (collected > 0) payUpdates.payment_method = method;
            const { error: pErr } = await supabase.from('payments').update(payUpdates).eq('id', payment.id);
            if (pErr) throw pErr;
          } else {
            const status = collected >= newBase && newBase > 0 ? "COMPLETED" : collected > 0 ? "PARTIAL" : "PENDING";
            const { error: pErr } = await supabase.from('payments').insert({
              reservation_id: reservationId,
              total_amount: newBase,
              paid_amount: collected,
              status,
              payment_method: method
            });
            if (pErr) throw pErr;
          }

          await fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("Add extra charge error:", err);
          return { success: false, error: err.message || "Failed to add extra charge" };
        }
      },

      settlePayment: async (paymentId, amount, method = 'CASH') => {
        try {
          let payment = state.payments.find(p => p.id === paymentId || p.reservation_id === paymentId || (p.reservation_id && paymentId && p.reservation_id.toLowerCase() === paymentId.toLowerCase()));
          if (!payment) {
            // Check if it's a reservation ID without a payment record yet
            const res = state.reservations.find(r => r.id === paymentId || (r.id && paymentId && r.id.toLowerCase() === paymentId.toLowerCase()));
            if (res) {
              const payId = crypto.randomUUID();
              const totalAmt = Number(res.base_amount) || 0;
              const paidAmt = Number(amount) || 0;
              const status = paidAmt >= totalAmt && totalAmt > 0 ? "COMPLETED" : "PARTIAL";
              const { error } = await supabase.from('payments').insert({
                id: payId,
                reservation_id: res.id,
                total_amount: totalAmt,
                paid_amount: paidAmt,
                status,
                payment_method: method || 'CASH'
              });
              if (error) throw error;
              await fetchData();
              return { success: true };
            }
            return { success: false, error: "Payment record not found" };
          }
          const newPaid = (Number(payment.paid_amount) || 0) + Number(amount);
          const totalAmt = Number(payment.total_amount) || 0;
          const status = newPaid >= totalAmt && totalAmt > 0 ? "COMPLETED" : (newPaid > 0 ? "PARTIAL" : "PENDING");
          const { error } = await supabase.from('payments').update({ 
            paid_amount: newPaid, 
            status,
            payment_method: method || payment.payment_method || 'CASH'
          }).eq('id', payment.id);
          if (error) throw error;
          await fetchData();
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
            requested_by: state.session?.name || state.session?.username || "Staff"
          });
          if (error) throw error;

          // Freeze payment for this reservation until discount is resolved
          const payment = state.payments.find(p => p.reservation_id === reservationId);
          if (payment) {
            await supabase.from('payments').update({ status: 'FROZEN' }).eq('id', payment.id);
          }

          await fetchData();
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

          const approver = state.session?.name || state.session?.username || "Super Admin";
          const { error: dErr } = await supabase.from('discounts').update({ 
            status, 
            approved_by: approver
          }).eq('id', discountId);
          if (dErr) throw dErr;

          const resId = discount.reservation_id;
          const reservation = state.reservations.find(r => r.id === resId || (r.id && resId && r.id.toLowerCase() === resId.toLowerCase()));
          const payment = state.payments.find(p => p.reservation_id === resId || (p.reservation_id && resId && p.reservation_id.toLowerCase() === resId.toLowerCase()));

          if (status === "APPROVED") {
            const discountAmt = Number(discount.requested_amount) || 0;
            const originalTotal = Number(reservation?.base_amount) || Number(payment?.total_amount) || 0;
            const newTotal = Math.max(0, originalTotal - discountAmt);
            const paid = Number(payment?.paid_amount) || 0;
            const newStatus = paid >= newTotal && newTotal > 0 ? "COMPLETED" : (paid > 0 ? "PARTIAL" : "PENDING");

            if (payment) {
              const { error: pErr } = await supabase.from('payments').update({ 
                total_amount: newTotal,
                status: newStatus
              }).eq('id', payment.id);
              if (pErr) console.error("Error updating payment amount:", pErr);
            } else if (resId) {
              const { error: pErr } = await supabase.from('payments').insert({
                id: crypto.randomUUID(),
                reservation_id: resId,
                total_amount: newTotal,
                paid_amount: 0,
                status: 'PENDING',
                payment_method: 'CASH'
              });
              if (pErr) console.error("Error inserting payment record:", pErr);
            }

            if (reservation) {
              const { error: rErr } = await supabase.from('reservations').update({ base_amount: newTotal }).eq('id', reservation.id);
              if (rErr) console.error("Error updating reservation base_amount:", rErr);
            }
          } else {
            // REJECTED: Restore payment with original status and unfreeze
            if (payment) {
              const total = Number(payment.total_amount) || 0;
              const paid = Number(payment.paid_amount) || 0;
              const originalStatus = paid >= total && total > 0 ? "COMPLETED" : (paid > 0 ? "PARTIAL" : "PENDING");

              const { error: pErr } = await supabase.from('payments').update({ 
                status: originalStatus
              }).eq('id', payment.id);
              if (pErr) console.error("Error unfreezing payment:", pErr);
            }
          }

          await fetchData();
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
          // 1. Find all reservations for this guest
          const guestRes = state.reservations.filter(r => r.guest_id === id);
          const resIds = guestRes.map(r => r.id);
          
          if (resIds.length > 0) {
            // Delete payments, discounts, folio lines for these reservations
            await supabase.from('payments').delete().in('reservation_id', resIds);
            await supabase.from('discounts').delete().in('reservation_id', resIds);
            await supabase.from('folio_lines').delete().in('reservation_id', resIds);
            // Reset any active room status to AVAILABLE
            for (const r of guestRes) {
              if (r.room_id) {
                await supabase.from('rooms').update({ status: 'AVAILABLE' }).eq('id', r.room_id);
              }
            }
            // Delete reservations
            await supabase.from('reservations').delete().eq('guest_id', id);
          }

          // Delete the guest profile
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
          setState(s => ({
            ...s,
            rooms: s.rooms.filter(r => r.id !== id)
          }));
          // Unlink reservations from this room and delete tasks
          await supabase.from('reservations').update({ room_id: null }).eq('room_id', id);
          await supabase.from('hk_tasks').delete().eq('room_id', id);
          await supabase.from('tickets').delete().eq('room_id', id);

          const { error } = await supabase.from('rooms').delete().eq('id', id);
          if (error) throw error;
          await fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("deleteRoom error:", err);
          return { success: false, error: err.message || "Failed to delete room" };
        }
      },

      deleteReservation: async (id) => {
        try {
          const res = state.reservations.find(r => r.id === id);
          if (res?.room_id) {
            await supabase.from('rooms').update({ status: 'AVAILABLE' }).eq('id', res.room_id);
          }
          // Delete dependent records
          await supabase.from('payments').delete().eq('reservation_id', id);
          await supabase.from('discounts').delete().eq('reservation_id', id);
          await supabase.from('folio_lines').delete().eq('reservation_id', id);

          const { error } = await supabase.from('reservations').delete().eq('id', id);
          if (error) throw error;
          await fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("deleteReservation error:", err);
          return { success: false, error: err.message || "Failed to delete reservation" };
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
          const newStaff = {
            id: userId,
            name,
            role: role || 'FRONT_DESK',
            phone: phone || null,
            email: email || null,
            pin: pass || null,
            status: 'ACTIVE'
          };
          setState(s => ({
            ...s,
            profiles: [newStaff as any, ...s.profiles]
          }));
          const { error: pErr } = await supabase.from('profiles').upsert(newStaff);
          if (pErr) {
            console.error("addStaff db error:", pErr);
          }
          await fetchData();
          return { success: true };
        } catch (err: any) {
          console.error("addStaff error:", err);
          return { success: false, error: err.message || "Failed to create staff profile" };
        }
      },
      
      updateStaffRole: async (profileId, role) => {
        setState(s => ({
          ...s,
          profiles: s.profiles.map(p => p.id === profileId ? { ...p, role: role as any } : p)
        }));
        await supabase.from('profiles').update({ role }).eq('id', profileId);
        fetchData();
      },

      updateStaffPassword: async (profileId, pass) => {
        try {
          setState(s => ({
            ...s,
            profiles: s.profiles.map(p => p.id === profileId ? { ...p, pin: pass } : p)
          }));
          const { error } = await supabase.from('profiles').update({ pin: pass }).eq('id', profileId);
          if (error) console.error("updateStaffPassword error:", error);
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
          setState(s => ({
            ...s,
            profiles: s.profiles.map(p => p.id === profileId ? { ...p, status: newStatus } : p)
          }));
          await supabase.from('profiles').update({ status: newStatus }).eq('id', profileId);
          fetchData();
        }
      },

      deleteStaff: async (profileId) => {
        try {
          setState(s => ({
            ...s,
            profiles: s.profiles.filter(p => p.id !== profileId)
          }));
          const { error } = await supabase.from('profiles').delete().eq('id', profileId);
          if (error) console.error("deleteStaff error:", error);
          await fetchData();
          return { success: true };
        } catch (err: any) {
          return { success: false, error: err.message || "Failed to delete staff member" };
        }
      },

      addRoom: async (number, type, floor, price) => {
        try {
          const cleanNum = String(number).trim();
          if (!cleanNum) {
            return { success: false, error: "Please enter a valid room number" };
          }

          // Check local state
          const localExists = state.rooms.find(
            r => (r.room_number || (r as any).number)?.toString().toLowerCase() === cleanNum.toLowerCase()
          );
          if (localExists) {
            return { success: false, error: `Room ${cleanNum} already exists in your inventory.` };
          }

          // Check DB for existing room record (could be inactive or duplicate)
          const { data: dbExisting } = await supabase
            .from('rooms')
            .select('id, room_number, is_active')
            .eq('room_number', cleanNum)
            .maybeSingle();

          if (dbExisting) {
            // Reactivate / update existing room
            const { error: upErr } = await supabase
              .from('rooms')
              .update({
                room_name: type || "Standard Room",
                floor: String(floor || "1"),
                price: Number(price) || 0,
                status: 'AVAILABLE',
                is_active: true
              })
              .eq('id', dbExisting.id);

            if (upErr) throw upErr;
            await fetchData();
            return { success: true };
          }

          const id = crypto.randomUUID();
          const newRoom = {
            id,
            room_number: cleanNum,
            room_name: type || "Standard Room",
            floor: String(floor || "1"),
            price: Number(price) || 0,
            status: 'AVAILABLE' as const,
            capacity: 2,
            is_active: true,
            amenities: [],
            photos: []
          };

          setState(s => ({
            ...s,
            rooms: [...s.rooms, newRoom as any]
          }));

          const { error } = await supabase.from('rooms').insert(newRoom);
          if (error) {
            console.error("Error creating room:", error);
            await fetchData();
            return { success: false, error: error.message };
          }
          await fetchData();
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
