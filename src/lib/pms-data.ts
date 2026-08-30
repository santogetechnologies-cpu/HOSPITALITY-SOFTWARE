export type RoomStatus =
  | "AVAILABLE"
  | "BOOKED"
  | "OCCUPIED"
  | "DIRTY"
  | "CLEANING"
  | "INSPECTION"
  | "MAINTENANCE"
  | "OUT OF SERVICE";

export const STATUS_META: Record<
  RoomStatus,
  { label: string; dot: string; text: string; soft: string; ring: string }
> = {
  AVAILABLE: {
    label: "Available",
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    soft: "bg-emerald-50",
    ring: "ring-emerald-500/30",
  },
  BOOKED: {
    label: "Booked",
    dot: "bg-blue-500",
    text: "text-blue-700",
    soft: "bg-blue-50",
    ring: "ring-blue-500/30",
  },
  OCCUPIED: {
    label: "Occupied",
    dot: "bg-indigo-500",
    text: "text-indigo-700",
    soft: "bg-indigo-50",
    ring: "ring-indigo-500/30",
  },
  DIRTY: {
    label: "Dirty",
    dot: "bg-red-500",
    text: "text-red-700",
    soft: "bg-red-50",
    ring: "ring-red-500/30",
  },
  CLEANING: {
    label: "Cleaning",
    dot: "bg-orange-500",
    text: "text-orange-700",
    soft: "bg-orange-50",
    ring: "ring-orange-500/30",
  },
  INSPECTION: {
    label: "Inspection",
    dot: "bg-purple-500",
    text: "text-purple-700",
    soft: "bg-purple-50",
    ring: "ring-purple-500/30",
  },
  MAINTENANCE: {
    label: "Maintenance",
    dot: "bg-slate-500",
    text: "text-slate-700",
    soft: "bg-slate-50",
    ring: "ring-slate-500/30",
  },
  "OUT OF SERVICE": {
    label: "Out of Service",
    dot: "bg-stone-500",
    text: "text-stone-700",
    soft: "bg-stone-50",
    ring: "ring-stone-500/30",
  },
};

export const ROOM_STATUSES = Object.keys(STATUS_META) as RoomStatus[];

export type RoomType = {
  id: string;
  name: string;
  description: string;
  status: string;
};

export type Room = {
  id: string;
  room_number: string;
  room_name?: string;
  room_type_id?: string;
  capacity: number;
  floor?: string;
  location?: string;
  price: number;
  amenities: string[];
  photos: string[];
  status: RoomStatus;
  is_active: boolean;
  
  // Relations mapped by join
  room_type?: RoomType;
};

export type Guest = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  id_type?: string;
  id_number?: string;
  emergency_contact?: string;
  notes?: string;
};

export type Reservation = {
  id: string;
  guest_id: string;
  resource_type: "ROOM" | "PARTY_HALL";
  room_id?: string;
  party_hall_id?: string;
  event_type?: string;
  number_of_guests: number;
  booking_date: string;
  start_time?: string;
  end_time?: string;
  base_amount: number;
  additional_charges: number;
  status: "PENDING" | "CONFIRMED" | "OCCUPIED" | "ONGOING" | "COMPLETED" | "CANCELLED";
  notes?: string;

  // Relations
  guest?: Guest;
  room?: Room;
};

export type Payment = {
  id: string;
  reservation_id: string;
  total_amount: number;
  paid_amount: number;
  status: "PENDING" | "PARTIAL" | "COMPLETED" | "FROZEN";
  payment_method?: string;
};

export type Discount = {
  id: string;
  reservation_id: string;
  requested_amount: number;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requested_by?: string;
  approved_by?: string;
  created_at?: string;
};

export type Expense = {
  id: string;
  amount: number;
  category: string;
  description: string;
  receipt_url?: string;
  recorded_by?: string;
  created_at?: string;
};


export type Profile = {
  id: string;
  name: string;
  phone?: string;
  role: "SUPER_ADMIN" | "GM" | "FRONT_DESK";
  status: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  time?: string;
};
