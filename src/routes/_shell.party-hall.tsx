import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { usePms } from "@/lib/pms-store";
import { PageHeader, Panel, Pill } from "@/components/pms/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar, Clock, Users, PlusCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/_shell/party-hall")({
  component: PartyHallPage,
});

function PartyHallPage() {
  const { reservations, guests, addPartyHallBooking } = usePms();
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState("");

  // Form State
  const [form, setForm] = React.useState({
    customerName: "",
    phone: "",
    email: "",
    eventType: "Birthday",
    guests: "50",
    date: new Date().toISOString().split("T")[0],
    startTime: "10:00",
    endTime: "14:00",
    baseAmount: "15000",
    advance: "5000",
  });

  const hallBookings = reservations
    .filter((r: any) => r.resource_type === "PARTY_HALL")
    .sort((a: any, b: any) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

  const getGuestName = (guestId: string) => {
    const g = guests.find((x: any) => x.id === guestId);
    return g ? g.name : "Unknown";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const res = await addPartyHallBooking({
      customerName: form.customerName,
      phone: form.phone,
      email: form.email,
      eventType: form.eventType,
      guests: parseInt(form.guests) || 1,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      baseAmount: parseFloat(form.baseAmount) || 0,
      advance: parseFloat(form.advance) || 0,
    });

    setLoading(false);

    if (res.success) {
      toast.success("Party Hall booked successfully!");
      setOpen(false);
      setForm({ ...form, customerName: "", phone: "", email: "" });
    } else {
      setErrorMsg(res.error || "Failed to book");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <PageHeader title="Party Hall Bookings" subtitle="Manage events, banquets, and hall availability." />
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary text-white"><PlusCircle className="mr-2 h-4 w-4" /> New Booking</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>New Party Hall Booking</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              {errorMsg && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" /> {errorMsg}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Input required value={form.customerName} onChange={e => setForm({...form, customerName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input 
                    required 
                    value={form.phone} 
                    onChange={(e) => {
                      const ph = e.target.value;
                      const matched = ph.trim() ? guests.find((g) => g.phone && g.phone.trim().toLowerCase() === ph.trim().toLowerCase()) : null;
                      if (matched) {
                        setForm((prev) => ({
                          ...prev,
                          phone: ph,
                          customerName: prev.customerName || matched.name,
                          email: prev.email || matched.email || "",
                        }));
                      } else {
                        setForm((prev) => ({ ...prev, phone: ph }));
                      }
                    }} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Event Date</Label>
                  <Input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input type="time" required value={form.startTime} onChange={e => setForm({...form, startTime: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input type="time" required value={form.endTime} onChange={e => setForm({...form, endTime: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Event Type</Label>
                  <Select value={form.eventType} onValueChange={v => setForm({...form, eventType: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Birthday">Birthday</SelectItem>
                      <SelectItem value="Wedding">Wedding</SelectItem>
                      <SelectItem value="Corporate">Corporate Event</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Expected Guests</Label>
                  <Input type="number" required value={form.guests} onChange={e => setForm({...form, guests: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="space-y-2">
                  <Label>Total Amount (₹)</Label>
                  <Input type="number" required value={form.baseAmount} onChange={e => setForm({...form, baseAmount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Advance Received (₹)</Label>
                  <Input type="number" required value={form.advance} onChange={e => setForm({...form, advance: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading}>{loading ? "Booking..." : "Confirm Booking"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Panel className="p-0 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Date & Time</TableHead>
              <TableHead>Guests</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {hallBookings.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-12">No hall bookings found.</TableCell>
              </TableRow>
            ) : (
              hallBookings.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium">{b.event_type || "Event"}</div>
                    <div className="text-xs text-slate-500">₹{b.base_amount}</div>
                  </TableCell>
                  <TableCell>{getGuestName(b.guest_id)}</TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm"><Calendar className="mr-1.5 h-3 w-3 text-slate-400" /> {b.booking_date}</div>
                    <div className="flex items-center text-xs text-slate-500 mt-0.5"><Clock className="mr-1.5 h-3 w-3" /> {format(new Date(b.start_time), "p")} - {format(new Date(b.end_time), "p")}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm"><Users className="mr-1.5 h-3 w-3 text-slate-400" /> {b.number_of_guests}</div>
                  </TableCell>
                  <TableCell>
                    <Pill variant={b.status === 'CONFIRMED' ? 'blue' : b.status === 'COMPLETED' ? 'green' : 'slate'}>{b.status}</Pill>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Panel>
    </div>
  );
}
