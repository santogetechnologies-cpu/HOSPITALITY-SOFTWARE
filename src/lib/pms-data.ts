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
  company_name?: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
  id_type?: string;
  id_number?: string;
  gst_number?: string;
  emergency_contact?: string;
  notes?: string;
  stays?: number;
  spend?: number;
  type?: string;
  vip?: boolean;
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
  gst_number?: string;
  company_name?: string;
  address?: string;

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

export type InventoryItemStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

export type InventoryCategory =
  | "Linens & Bedding"
  | "Beverages & Water"
  | "Guest Amenities"
  | "Housekeeping Supplies"
  | "F&B Supplies"
  | "Maintenance & Fixtures"
  | "General";

export type InventoryTransactionType =
  | "PURCHASE"
  | "DISCARD"
  | "CONSUMED"
  | "RETURN"
  | "ADJUSTMENT";

export type InventoryItem = {
  id: string;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  min_threshold: number;
  unit_cost: number;
  location?: string;
  status: InventoryItemStatus;
  created_at?: string;
  updated_at?: string;
};

export type InventoryTransaction = {
  id: string;
  item_id: string;
  item_name?: string;
  type: InventoryTransactionType;
  quantity: number;
  unit_price: number;
  total_cost: number;
  reason?: string;
  sync_to_expenses: boolean;
  expense_id?: string;
  performed_by?: string;
  notes?: string;
  created_at?: string;
};
export type Profile = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  pin?: string;
  role: "SUPER_ADMIN" | "GM" | "FRONT_DESK";
  status: string;
  created_at?: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  time?: string;
};

export type HkTask = {
  id: string;
  room_id: string;
  room?: Room;
  roomType?: string;
  checkout?: string;
  kind: string;
  assignee: string;
  stage: string;
  priority: string;
  created_at?: string;
};

export type Ticket = {
  id: string;
  room_id: string;
  room?: Room;
  issue: string;
  priority: string;
  status: string;
  assignee: string;
  raised?: string;
};

export const inr = (amount: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const CHANNELS = [
  { id: "c1", name: "Booking.com", sync: true, bookings: 4 },
  { id: "c2", name: "Agoda", sync: true, bookings: 2 },
  { id: "c3", name: "MakeMyTrip", sync: false, bookings: 0 },
  { id: "c4", name: "Goibibo", sync: false, bookings: 1 },
];

export const EXPENSES = [
  { id: "e1", category: "Operational", amount: 1500, date: "2026-08-12", description: "Plumbing repair" },
  { id: "e2", category: "F&B Supplies", amount: 450, date: "2026-08-12", description: "Milk packets" },
];

export const CANONICAL_ROOMS = [
  { room_number: "202", room_name: "Double Bed Non AC", floor: "Floor 2", price: 700, sgst: 17.5, cgst: 17.5, total_gst: 35.0, total_bill: 735.0, capacity: 2 },
  { room_number: "104", room_name: "Double Bed Non AC Standard", floor: "Floor 1", price: 1000, sgst: 25.0, cgst: 25.0, total_gst: 50.0, total_bill: 1050.0, capacity: 2 },
  { room_number: "201", room_name: "Double Bed Non AC Standard", floor: "Floor 2", price: 1000, sgst: 25.0, cgst: 25.0, total_gst: 50.0, total_bill: 1050.0, capacity: 2 },
  { room_number: "204", room_name: "Double Bed Non AC Standard", floor: "Floor 2", price: 1000, sgst: 25.0, cgst: 25.0, total_gst: 50.0, total_bill: 1050.0, capacity: 2 },
  { room_number: "301", room_name: "Double Bed Non AC Standard", floor: "Floor 3", price: 1000, sgst: 25.0, cgst: 25.0, total_gst: 50.0, total_bill: 1050.0, capacity: 2 },
  { room_number: "304", room_name: "Double Bed Non AC Standard", floor: "Floor 3", price: 1000, sgst: 25.0, cgst: 25.0, total_gst: 50.0, total_bill: 1050.0, capacity: 2 },
  { room_number: "401", room_name: "Double Bed Non AC Standard", floor: "Floor 4", price: 1000, sgst: 25.0, cgst: 25.0, total_gst: 50.0, total_bill: 1050.0, capacity: 2 },
  { room_number: "404", room_name: "Double Bed Non AC Standard", floor: "Floor 4", price: 1000, sgst: 25.0, cgst: 25.0, total_gst: 50.0, total_bill: 1050.0, capacity: 2 },
  { room_number: "103", room_name: "3 Bed Non AC", floor: "Floor 1", price: 1300, sgst: 32.5, cgst: 32.5, total_gst: 65.0, total_bill: 1365.0, capacity: 3 },
  { room_number: "203", room_name: "3 Bed Non AC", floor: "Floor 2", price: 1300, sgst: 32.5, cgst: 32.5, total_gst: 65.0, total_bill: 1365.0, capacity: 3 },
  { room_number: "303", room_name: "3 Bed Non AC", floor: "Floor 3", price: 1300, sgst: 32.5, cgst: 32.5, total_gst: 65.0, total_bill: 1365.0, capacity: 3 },
  { room_number: "403", room_name: "3 Bed Non AC", floor: "Floor 4", price: 1300, sgst: 32.5, cgst: 32.5, total_gst: 65.0, total_bill: 1365.0, capacity: 3 },
  { room_number: "102", room_name: "Double Bed Standard AC", floor: "Floor 1", price: 1600, sgst: 40.0, cgst: 40.0, total_gst: 80.0, total_bill: 1680.0, capacity: 2 },
  { room_number: "105", room_name: "Double Bed Standard AC", floor: "Floor 1", price: 1600, sgst: 40.0, cgst: 40.0, total_gst: 80.0, total_bill: 1680.0, capacity: 2 },
  { room_number: "205", room_name: "Double Bed Standard AC", floor: "Floor 2", price: 1600, sgst: 40.0, cgst: 40.0, total_gst: 80.0, total_bill: 1680.0, capacity: 2 },
  { room_number: "302", room_name: "Double Bed Standard AC", floor: "Floor 3", price: 1600, sgst: 40.0, cgst: 40.0, total_gst: 80.0, total_bill: 1680.0, capacity: 2 },
  { room_number: "305", room_name: "Double Bed Standard AC", floor: "Floor 3", price: 1600, sgst: 40.0, cgst: 40.0, total_gst: 80.0, total_bill: 1680.0, capacity: 2 },
  { room_number: "402", room_name: "Double Bed Standard AC", floor: "Floor 4", price: 1600, sgst: 40.0, cgst: 40.0, total_gst: 80.0, total_bill: 1680.0, capacity: 2 },
  { room_number: "405", room_name: "Double Bed Standard AC", floor: "Floor 4", price: 1600, sgst: 40.0, cgst: 40.0, total_gst: 80.0, total_bill: 1680.0, capacity: 2 },
  { room_number: "306", room_name: "Double Bed Deluxe AC", floor: "Floor 3", price: 2200, sgst: 55.0, cgst: 55.0, total_gst: 110.0, total_bill: 2310.0, capacity: 2 },
  { room_number: "406", room_name: "Double Bed Deluxe AC", floor: "Floor 4", price: 2200, sgst: 55.0, cgst: 55.0, total_gst: 110.0, total_bill: 2310.0, capacity: 2 },
  { room_number: "307", room_name: "Suite Room", floor: "Floor 3", price: 3200, sgst: 80.0, cgst: 80.0, total_gst: 160.0, total_bill: 3360.0, capacity: 4 },
  { room_number: "308", room_name: "Suite Room", floor: "Floor 3", price: 3200, sgst: 80.0, cgst: 80.0, total_gst: 160.0, total_bill: 3360.0, capacity: 4 },
  { room_number: "407", room_name: "Suite Room", floor: "Floor 4", price: 3200, sgst: 80.0, cgst: 80.0, total_gst: 160.0, total_bill: 3360.0, capacity: 4 },
  { room_number: "408", room_name: "Suite Room", floor: "Floor 4", price: 3200, sgst: 80.0, cgst: 80.0, total_gst: 160.0, total_bill: 3360.0, capacity: 4 },
];

export const ROOM_TYPES = [
  { type: "Double Bed Non AC", base: 700 },
  { type: "Double Bed Non AC Standard", base: 1000 },
  { type: "3 Bed Non AC", base: 1300 },
  { type: "Double Bed Standard AC", base: 1600 },
  { type: "Double Bed Deluxe AC", base: 2200 },
  { type: "Suite Room", base: 3200 },
];

export const MENU_CATEGORIES = ["Breakfast", "Starters", "Mains", "Drinks"];

export const MENU = [
  { category: "Breakfast", name: "Masala Dosa", price: 150 },
  { category: "Starters", name: "Paneer Tikka", price: 300 },
  { category: "Mains", name: "Butter Chicken", price: 450 },
  { category: "Drinks", name: "Fresh Lime Soda", price: 90 },
];

export const OCCUPANCY_TREND = [
  { day: "Mon", occ: 65, adr: 4500 },
  { day: "Tue", occ: 70, adr: 4600 },
  { day: "Wed", occ: 68, adr: 4550 },
  { day: "Thu", occ: 85, adr: 5200 },
  { day: "Fri", occ: 95, adr: 5800 },
];

export const FORECAST = [
  { day: "Mon", rev: 120000 },
  { day: "Tue", rev: 125000 },
  { day: "Wed", rev: 122000 },
  { day: "Thu", rev: 150000 },
  { day: "Fri", rev: 190000 },
];

export const RATE_CALENDAR_DATES = ["Mon 12", "Tue 13", "Wed 14", "Thu 15", "Fri 16", "Sat 17", "Sun 18"];

export const HK_CHECKLIST = [
  { id: "hk1", task: "Change linens and towels", required: true },
  { id: "hk2", task: "Vacuum carpets and rugs", required: true },
  { id: "hk3", task: "Clean and sanitize bathroom", required: true },
  { id: "hk4", task: "Restock amenities (soap, shampoo)", required: true },
  { id: "hk5", task: "Empty trash bins", required: true },
  { id: "hk6", task: "Check minibar inventory", required: false },
];

export const HOUSEKEEPERS = [
  { id: "emp1", name: "Sunita M.", status: "On Duty", assigned: 4, completed: 2 },
  { id: "emp2", name: "Ramesh K.", status: "On Duty", assigned: 6, completed: 5 },
  { id: "emp3", name: "Priya D.", status: "Break", assigned: 3, completed: 3 },
  { id: "emp4", name: "Anita V.", status: "Off Duty", assigned: 0, completed: 0 },
];
