// DRB Hotel PMS — deterministic mock data. No real personal information.

export type RoomStatus =
  | "vacant-clean"
  | "occupied"
  | "vacant-dirty"
  | "cleaning"
  | "ooo"
  | "oos"
  | "reserved"
  | "maintenance";

export const STATUS_META: Record<
  RoomStatus,
  { label: string; dot: string; text: string; soft: string; ring: string }
> = {
  "vacant-clean": {
    label: "Vacant Clean",
    dot: "bg-st-vacant-clean",
    text: "text-st-vacant-clean",
    soft: "bg-st-vacant-clean/10",
    ring: "ring-st-vacant-clean/30",
  },
  occupied: {
    label: "Occupied",
    dot: "bg-st-occupied",
    text: "text-st-occupied",
    soft: "bg-st-occupied/10",
    ring: "ring-st-occupied/30",
  },
  "vacant-dirty": {
    label: "Vacant Dirty",
    dot: "bg-st-vacant-dirty",
    text: "text-st-vacant-dirty",
    soft: "bg-st-vacant-dirty/10",
    ring: "ring-st-vacant-dirty/30",
  },
  cleaning: {
    label: "Cleaning",
    dot: "bg-st-cleaning",
    text: "text-st-cleaning",
    soft: "bg-st-cleaning/10",
    ring: "ring-st-cleaning/30",
  },
  ooo: {
    label: "Out of Order",
    dot: "bg-st-ooo",
    text: "text-st-ooo",
    soft: "bg-st-ooo/10",
    ring: "ring-st-ooo/30",
  },
  oos: {
    label: "Out of Service",
    dot: "bg-st-oos",
    text: "text-st-oos",
    soft: "bg-st-oos/10",
    ring: "ring-st-oos/30",
  },
  reserved: {
    label: "Reserved",
    dot: "bg-st-reserved",
    text: "text-st-reserved",
    soft: "bg-st-reserved/10",
    ring: "ring-st-reserved/30",
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-st-maintenance",
    text: "text-st-maintenance",
    soft: "bg-st-maintenance/10",
    ring: "ring-st-maintenance/30",
  },
};

export const ROOM_STATUSES = Object.keys(STATUS_META) as RoomStatus[];

export type RoomType = "Standard Twin" | "Deluxe King" | "Executive Suite" | "Premier Balcony";

export type Room = {
  id: string;
  number: string;
  floor: number;
  floorName: string;
  type: RoomType;
  bed: string;
  maxGuests: number;
  rate: number;
  status: RoomStatus;
  guest?: string | undefined;
  reservationId?: string | undefined;
  checkIn?: string | undefined;
  checkOut?: string | undefined;
  housekeeper?: string | undefined;
  hkStatus: "Clean" | "Dirty" | "In Progress" | "Inspected";
  amenities: string[];
  view: string;
  notes?: string | undefined;
};

const FLOORS = ["Ground Floor", "First Floor", "Second Floor", "Third Floor", "Fourth Floor"];

const TYPE_BY_INDEX: { type: RoomType; bed: string; guests: number; rate: number }[] = [
  { type: "Deluxe King", bed: "King Bed", guests: 2, rate: 4500 },
  { type: "Deluxe King", bed: "King Bed", guests: 2, rate: 4500 },
  { type: "Standard Twin", bed: "Twin Beds", guests: 2, rate: 3200 },
  { type: "Premier Balcony", bed: "Queen Bed", guests: 3, rate: 5600 },
  { type: "Executive Suite", bed: "King + Lounge", guests: 4, rate: 8900 },
];

const GUEST_NAMES = [
  "Ananya Rao",
  "Vikram Sethi",
  "Meera Krishnan",
  "Daniel Whitmore",
  "Rhea Kapoor",
  "Arjun Balaraman",
  "Sofia Lindqvist",
  "Karan Mehrotra",
  "Ishita Bansal",
  "Thomas Aubert",
  "Nikhil Varma",
  "Lea Fontaine",
];

const AMENITIES = ["Wi-Fi", "Smart TV", "Minibar", "Safe", "Rain Shower", "Espresso", "Balcony"];

const SEED_STATUS: RoomStatus[] = [
  "vacant-clean",
  "occupied",
  "vacant-dirty",
  "vacant-clean",
  "reserved",
  "occupied",
  "vacant-clean",
  "ooo",
  "cleaning",
  "occupied",
  "occupied",
  "vacant-clean",
  "maintenance",
  "occupied",
  "reserved",
  "vacant-dirty",
  "occupied",
  "vacant-clean",
  "cleaning",
  "occupied",
  "vacant-clean",
  "oos",
  "occupied",
  "reserved",
  "occupied",
];

export const HOUSEKEEPERS = ["Priya", "Sunita", "Ramesh", "Anil", "Fatima"];

export const ROOMS: Room[] = Array.from({ length: 25 }, (_, i) => {
  const floor = Math.floor(i / 5);
  const idx = i % 5;
  const meta = TYPE_BY_INDEX[idx]!;
  const number = `${floor + 1}0${idx + 1}`;
  const status = SEED_STATUS[i]!;
  const occupied = status === "occupied";
  return {
    id: `room-${number}`,
    number,
    floor: floor + 1,
    floorName: FLOORS[floor]!,
    type: meta.type,
    bed: meta.bed,
    maxGuests: meta.guests,
    rate: meta.rate + floor * 250,
    status,
    guest: occupied ? GUEST_NAMES[i % GUEST_NAMES.length] : undefined,
    reservationId: occupied ? `DRB-24${100 + i}` : undefined,
    checkIn: occupied ? "14:00, 10 Aug" : undefined,
    checkOut: occupied ? "11:00, 13 Aug" : undefined,
    housekeeper:
      status === "cleaning" || status === "vacant-dirty"
        ? HOUSEKEEPERS[i % HOUSEKEEPERS.length]
        : undefined,
    hkStatus:
      status === "cleaning"
        ? "In Progress"
        : status === "vacant-dirty"
          ? "Dirty"
          : status === "vacant-clean"
            ? "Inspected"
            : "Clean",
    amenities: AMENITIES.slice(0, 4 + (idx % 3)),
    view: idx >= 3 ? "City skyline" : "Courtyard",
  };
});

export type ReservationStatus =
  | "Confirmed"
  | "Tentative"
  | "Checked In"
  | "Checked Out"
  | "Cancelled"
  | "No Show"
  | "Waitlist";

export type Reservation = {
  id: string;
  guest: string;
  email: string;
  phone: string;
  room: string;
  roomType: RoomType;
  arrival: string;
  departure: string;
  nights: number;
  adults: number;
  ratePlan: string;
  source: string;
  amount: number;
  paid: number;
  payment: "Paid" | "Partial" | "Pending";
  status: ReservationStatus;
  eta?: string | undefined;
  vip?: boolean | undefined;
};

const SOURCES = [
  "Direct Website",
  "Booking.com",
  "MakeMyTrip",
  "Goibibo",
  "Agoda",
  "Airbnb",
  "Walk-in",
  "Corporate",
];
const RATE_PLANS = ["Best Flexible", "Advance Purchase", "Corporate LRA", "Bed & Breakfast"];
const RES_STATUS: ReservationStatus[] = [
  "Confirmed",
  "Checked In",
  "Tentative",
  "Confirmed",
  "Checked Out",
  "Confirmed",
  "Cancelled",
  "Confirmed",
  "No Show",
  "Checked In",
  "Waitlist",
  "Confirmed",
];

export const RESERVATIONS: Reservation[] = Array.from({ length: 28 }, (_, i) => {
  const room = ROOMS[(i * 3) % 25]!;
  const nights = 1 + (i % 5);
  const rate = room.rate;
  const status = RES_STATUS[i % RES_STATUS.length]!;
  const amount = rate * nights;
  const paidFactor = i % 3 === 0 ? 1 : i % 3 === 1 ? 0.4 : 0;
  return {
    id: `DRB-24${200 + i}`,
    guest: GUEST_NAMES[i % GUEST_NAMES.length]!,
    email: `guest${i + 1}@example.com`,
    phone: `+91 98${(100000 + i * 137).toString().slice(0, 6)}`,
    room: room.number,
    roomType: room.type,
    arrival: `${10 + (i % 6)} Aug 2026`,
    departure: `${10 + (i % 6) + nights} Aug 2026`,
    nights,
    adults: 1 + (i % 3),
    ratePlan: RATE_PLANS[i % RATE_PLANS.length]!,
    source: SOURCES[i % SOURCES.length]!,
    amount,
    paid: Math.round(amount * paidFactor),
    payment: paidFactor === 1 ? "Paid" : paidFactor === 0 ? "Pending" : "Partial",
    status,
    eta: `${11 + (i % 8)}:${i % 2 ? "30" : "00"}`,
    vip: i % 7 === 0,
  };
});

export type Guest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  lastStay: string;
  stays: number;
  spend: number;
  type: "Individual" | "Corporate" | "Travel Agent";
  vip: boolean;
  preferences: string[];
  notes: string;
};

const COUNTRIES = ["India", "India", "France", "Sweden", "United Kingdom", "Singapore", "UAE"];
const PREFS = [
  "King bed",
  "High floor",
  "Non-smoking",
  "Extra pillow",
  "Vegetarian",
  "Late checkout",
  "Airport pickup",
  "Quiet room",
];

export const GUESTS: Guest[] = GUEST_NAMES.map((name, i) => ({
  id: `G-${1000 + i}`,
  name,
  email: `${name.split(" ")[0]!.toLowerCase()}@example.com`,
  phone: `+91 90${(120000 + i * 911).toString().slice(0, 6)}`,
  country: COUNTRIES[i % COUNTRIES.length]!,
  lastStay: `${2 + i} Aug 2026`,
  stays: 1 + ((i * 3) % 14),
  spend: 18000 + i * 7400,
  type: i % 5 === 0 ? "Corporate" : i % 7 === 0 ? "Travel Agent" : "Individual",
  vip: i % 4 === 0,
  preferences: PREFS.slice(i % 4, (i % 4) + 4),
  notes: "Prefers early check-in when available. Allergic to feather bedding.",
}));

export type HkTask = {
  id: string;
  room: string;
  roomType: RoomType;
  checkout: string;
  kind: "Departure Clean" | "Deep Clean" | "Stayover" | "Turndown";
  assignee: string;
  stage: "Dirty" | "Assigned" | "Cleaning" | "Inspection" | "Ready";
  priority: "High" | "Normal";
};

export const HK_TASKS: HkTask[] = ROOMS.slice(0, 14).map((r, i) => ({
  id: `HK-${300 + i}`,
  room: r.number,
  roomType: r.type,
  checkout: `${10 + (i % 3)}:${i % 2 ? "30" : "00"} AM`,
  kind: (["Departure Clean", "Deep Clean", "Stayover", "Turndown"] as const)[i % 4]!,
  assignee: HOUSEKEEPERS[i % HOUSEKEEPERS.length]!,
  stage: (["Dirty", "Assigned", "Cleaning", "Inspection", "Ready"] as const)[i % 5]!,
  priority: i % 3 === 0 ? "High" : "Normal",
}));

export const HK_CHECKLIST = [
  "Bed linen",
  "Towels",
  "Bathroom",
  "Toiletries",
  "Floor",
  "Dusting",
  "Minibar",
  "Final inspection",
];

export type Staff = {
  id: string;
  name: string;
  department: string;
  role: string;
  shift: "Morning" | "Evening" | "Night" | "Off";
  attendance: "Present" | "Absent" | "On Leave";
  tasks: number;
  done: number;
};

export const STAFF: Staff[] = [
  ["Priya Nandan", "Housekeeping", "Room Attendant", "Morning", "Present", 12, 8],
  ["Sunita Devi", "Housekeeping", "Room Attendant", "Morning", "Present", 10, 6],
  ["Ramesh Iyer", "Housekeeping", "Supervisor", "Evening", "Present", 8, 5],
  ["Anil Kumar", "Maintenance", "Technician", "Morning", "Present", 6, 4],
  ["Fatima Sheikh", "Housekeeping", "Room Attendant", "Evening", "On Leave", 0, 0],
  ["Rohit Menon", "Front Office", "Front Desk Agent", "Morning", "Present", 14, 11],
  ["Ayesha Qureshi", "Front Office", "Guest Relations", "Evening", "Present", 9, 7],
  ["Deepak Sharma", "F&B", "Restaurant Manager", "Evening", "Present", 11, 9],
  ["Neha Joshi", "Accounts", "Finance Executive", "Morning", "Present", 5, 5],
  ["Imran Ali", "Security", "Security Officer", "Night", "Present", 4, 3],
  ["Kavya Suresh", "F&B", "Server", "Morning", "Absent", 0, 0],
  ["Manish Gupta", "Front Office", "Night Auditor", "Night", "Present", 7, 4],
].map(([name, department, role, shift, attendance, tasks, done], i) => ({
  id: `S-${400 + i}`,
  name: name as string,
  department: department as string,
  role: role as string,
  shift: shift as Staff["shift"],
  attendance: attendance as Staff["attendance"],
  tasks: tasks as number,
  done: done as number,
}));

export type MenuItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  veg: boolean;
  emoji: string;
};

export const MENU: MenuItem[] = [
  ["Masala Omelette", "Breakfast", 320, false, "🍳"],
  ["Belgian Waffles", "Breakfast", 380, true, "🧇"],
  ["Poha & Filter Coffee", "Breakfast", 260, true, "☕"],
  ["Eggs Benedict", "Breakfast", 460, false, "🥚"],
  ["Paneer Tikka", "Starters", 480, true, "🧀"],
  ["Chicken Malai Kebab", "Starters", 620, false, "🍢"],
  ["Truffle Arancini", "Starters", 540, true, "🍘"],
  ["Butter Chicken", "Main Course", 720, false, "🍛"],
  ["Dal Makhani", "Main Course", 480, true, "🥘"],
  ["Grilled Sea Bass", "Main Course", 1150, false, "🐟"],
  ["Wild Mushroom Risotto", "Main Course", 780, true, "🍚"],
  ["Fresh Lime Soda", "Beverages", 180, true, "🥤"],
  ["Masala Chai", "Beverages", 150, true, "🍵"],
  ["Cold Brew", "Beverages", 260, true, "🧋"],
  ["House Red Glass", "Beverages", 650, true, "🍷"],
  ["Tiramisu", "Desserts", 420, true, "🍰"],
  ["Gulab Jamun", "Desserts", 280, true, "🍮"],
  ["Dark Chocolate Tart", "Desserts", 460, true, "🍫"],
  ["Club Sandwich", "Room Service", 520, false, "🥪"],
  ["Midnight Soup Bowl", "Room Service", 340, true, "🍜"],
].map(([name, category, price, veg, emoji], i) => ({
  id: `M-${500 + i}`,
  name: name as string,
  category: category as string,
  price: price as number,
  veg: veg as boolean,
  emoji: emoji as string,
}));

export const MENU_CATEGORIES = [
  "Breakfast",
  "Starters",
  "Main Course",
  "Beverages",
  "Desserts",
  "Room Service",
];

export type Channel = {
  name: string;
  logo: string;
  connected: boolean;
  bookings: number;
  revenue: number;
  commission: number;
  sync: string;
  rate: number;
};

export const CHANNELS: Channel[] = [
  { name: "Booking.com", logo: "B.", connected: true, bookings: 48, revenue: 412000, commission: 15, sync: "3 min ago", rate: 4850 },
  { name: "MakeMyTrip", logo: "MMT", connected: true, bookings: 36, revenue: 298000, commission: 18, sync: "7 min ago", rate: 4790 },
  { name: "Goibibo", logo: "Go", connected: true, bookings: 21, revenue: 164000, commission: 17, sync: "12 min ago", rate: 4820 },
  { name: "Agoda", logo: "Ag", connected: true, bookings: 17, revenue: 131000, commission: 16, sync: "21 min ago", rate: 4900 },
  { name: "Airbnb", logo: "Ab", connected: false, bookings: 6, revenue: 52000, commission: 12, sync: "2 hrs ago", rate: 5100 },
  { name: "Direct Website", logo: "DRB", connected: true, bookings: 63, revenue: 587000, commission: 0, sync: "Live", rate: 4500 },
];

export type Notification = {
  id: string;
  icon: string;
  title: string;
  body: string;
  time: string;
  type: "booking" | "housekeeping" | "payment" | "vip" | "maintenance" | "ota";
  read: boolean;
};

export const NOTIFICATIONS: Notification[] = [
  { id: "N1", icon: "🔔", title: "New booking received", body: "Rhea Kapoor — Deluxe King, 14–16 Aug", time: "2 min ago", type: "booking", read: false },
  { id: "N2", icon: "🧹", title: "Room 203 needs cleaning", body: "Departure clean queued for Priya", time: "11 min ago", type: "housekeeping", read: false },
  { id: "N3", icon: "⏱️", title: "Guest checkout in 30 minutes", body: "Room 402 — Karan Mehrotra", time: "24 min ago", type: "booking", read: false },
  { id: "N4", icon: "💳", title: "Payment pending", body: "Folio DRB-24207 balance ₹12,400", time: "48 min ago", type: "payment", read: true },
  { id: "N5", icon: "⭐", title: "VIP guest arriving", body: "Ananya Rao — Executive Suite 505, ETA 15:30", time: "1 hr ago", type: "vip", read: false },
  { id: "N6", icon: "🔧", title: "Maintenance issue reported", body: "Room 108 — AC not cooling", time: "2 hrs ago", type: "maintenance", read: true },
  { id: "N7", icon: "🌐", title: "OTA reservation received", body: "Booking.com — Standard Twin, 2 nights", time: "3 hrs ago", type: "ota", read: true },
  { id: "N8", icon: "📉", title: "Rate parity alert", body: "Goibibo rate 3% below direct for 18 Aug", time: "4 hrs ago", type: "ota", read: true },
];

export const OCCUPANCY_TREND = [
  { day: "Mon", occ: 68, adr: 4320, revpar: 2938 },
  { day: "Tue", occ: 72, adr: 4410, revpar: 3175 },
  { day: "Wed", occ: 76, adr: 4520, revpar: 3435 },
  { day: "Thu", occ: 71, adr: 4480, revpar: 3181 },
  { day: "Fri", occ: 84, adr: 4980, revpar: 4183 },
  { day: "Sat", occ: 92, adr: 5420, revpar: 4986 },
  { day: "Sun", occ: 80, adr: 4760, revpar: 3808 },
];

export const REVENUE_MIX = [
  { name: "Rooms", value: 612000 },
  { name: "F&B", value: 184000 },
  { name: "Banquet", value: 96000 },
  { name: "Other", value: 42000 },
];

export const FORECAST = [
  { day: "12 Aug", actual: 148000, forecast: 150000 },
  { day: "13 Aug", actual: 162000, forecast: 158000 },
  { day: "14 Aug", actual: 171000, forecast: 168000 },
  { day: "15 Aug", actual: null as number | null, forecast: 196000 },
  { day: "16 Aug", actual: null as number | null, forecast: 214000 },
  { day: "17 Aug", actual: null as number | null, forecast: 188000 },
  { day: "18 Aug", actual: null as number | null, forecast: 172000 },
];

export type FolioLine = {
  id: string;
  date: string;
  description: string;
  category: "Room" | "F&B" | "Laundry" | "Minibar" | "Tax" | "Discount" | "Payment";
  amount: number;
};

export const FOLIO_LINES: FolioLine[] = [
  { id: "F1", date: "10 Aug", description: "Room Charge — Deluxe King", category: "Room", amount: 4500 },
  { id: "F2", date: "11 Aug", description: "Breakfast — 2 pax", category: "F&B", amount: 760 },
  { id: "F3", date: "11 Aug", description: "Room Charge — Deluxe King", category: "Room", amount: 4500 },
  { id: "F4", date: "11 Aug", description: "Restaurant — Dinner", category: "F&B", amount: 2340 },
  { id: "F5", date: "12 Aug", description: "Laundry — Express", category: "Laundry", amount: 620 },
  { id: "F6", date: "12 Aug", description: "Minibar consumption", category: "Minibar", amount: 480 },
  { id: "F7", date: "12 Aug", description: "GST @ 18%", category: "Tax", amount: 2377 },
  { id: "F8", date: "12 Aug", description: "Loyalty discount", category: "Discount", amount: -900 },
  { id: "F9", date: "10 Aug", description: "Advance deposit — Card", category: "Payment", amount: -8000 },
];

export type Expense = {
  id: string;
  date: string;
  vendor: string;
  category: string;
  amount: number;
  status: "Paid" | "Pending";
};

export const EXPENSES: Expense[] = [
  { id: "E1", date: "12 Aug", vendor: "Ivory Linens Co.", category: "Housekeeping", amount: 42000, status: "Paid" },
  { id: "E2", date: "12 Aug", vendor: "GreenLeaf Produce", category: "F&B", amount: 28400, status: "Pending" },
  { id: "E3", date: "11 Aug", vendor: "CoolAir Services", category: "Maintenance", amount: 15600, status: "Paid" },
  { id: "E4", date: "11 Aug", vendor: "State Electricity Board", category: "Utilities", amount: 96500, status: "Pending" },
  { id: "E5", date: "10 Aug", vendor: "Aroma Amenities", category: "Housekeeping", amount: 18900, status: "Paid" },
];

export type Ticket = {
  id: string;
  room: string;
  issue: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
  assignee: string;
  raised: string;
};

export const TICKETS: Ticket[] = [
  { id: "MT-01", room: "108", issue: "AC not cooling", priority: "High", status: "In Progress", assignee: "Anil Kumar", raised: "2 hrs ago" },
  { id: "MT-02", room: "205", issue: "Shower pressure low", priority: "Medium", status: "Open", assignee: "Anil Kumar", raised: "5 hrs ago" },
  { id: "MT-03", room: "313", issue: "TV remote replacement", priority: "Low", status: "Resolved", assignee: "Ramesh Iyer", raised: "Yesterday" },
  { id: "MT-04", room: "402", issue: "Wardrobe hinge loose", priority: "Medium", status: "Open", assignee: "Unassigned", raised: "Yesterday" },
];

export type EventBooking = {
  id: string;
  name: string;
  hall: string;
  type: string;
  guests: number;
  date: string;
  revenue: number;
  status: "Confirmed" | "Tentative";
};

export const EVENTS: EventBooking[] = [
  { id: "EV-1", name: "Kapoor–Sethi Wedding", hall: "DRB Grand Hall", type: "Wedding", guests: 150, date: "18 Aug", revenue: 85000, status: "Confirmed" },
  { id: "EV-2", name: "Meridian Corp Offsite", hall: "Boardroom Ivory", type: "Conference", guests: 40, date: "19 Aug", revenue: 42000, status: "Confirmed" },
  { id: "EV-3", name: "Sangeet Night", hall: "Terrace Pavilion", type: "Social", guests: 90, date: "21 Aug", revenue: 61000, status: "Tentative" },
  { id: "EV-4", name: "Product Launch — Nimbus", hall: "DRB Grand Hall", type: "Corporate", guests: 200, date: "24 Aug", revenue: 128000, status: "Tentative" },
];

export const RATE_CALENDAR_DATES = [
  "12 Aug",
  "13 Aug",
  "14 Aug",
  "15 Aug",
  "16 Aug",
  "17 Aug",
  "18 Aug",
];

export const ROOM_TYPES: { type: RoomType; base: number }[] = [
  { type: "Standard Twin", base: 3200 },
  { type: "Deluxe King", base: 4500 },
  { type: "Premier Balcony", base: 5600 },
  { type: "Executive Suite", base: 8900 },
];

export const inr = (n: number) =>
  `₹${Math.round(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
