import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState, KpiCard } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePms } from '@/lib/pms-store'
import { toast } from 'sonner'
import { Users, Plus, CheckCircle, Clock, ShieldCheck } from 'lucide-react'

export const Route = createFileRoute('/_shell/visitors')({
  component: VisitorsPage,
})

type VisitorLog = {
  id: string;
  name: string;
  phone: string;
  visitingRoom: string;
  visitingGuest: string;
  purpose: string;
  checkInTime: string;
  checkOutTime?: string;
  status: "In-House" | "Departed";
};

const DEFAULT_LOGS: VisitorLog[] = [
  {
    id: "VIS-101",
    name: "Sunil Verma",
    phone: "+91 98450 11223",
    visitingRoom: "102",
    visitingGuest: "Rohan Mehra",
    purpose: "Business Meeting",
    checkInTime: "10:30 AM",
    status: "In-House"
  },
  {
    id: "VIS-102",
    name: "Pooja Hegde",
    phone: "+91 97312 44556",
    visitingRoom: "205",
    visitingGuest: "Vikram Sethi",
    purpose: "Family Visit",
    checkInTime: "11:15 AM",
    checkOutTime: "01:45 PM",
    status: "Departed"
  }
];

function VisitorsPage() {
  const { rooms, reservations, guests } = usePms();
  const [logs, setLogs] = React.useState<VisitorLog[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("drb_pms_visitors");
      if (saved) {
        try { return JSON.parse(saved); } catch (e) {}
      }
    }
    return DEFAULT_LOGS;
  });

  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    phone: "",
    visitingRoom: "",
    visitingGuest: "",
    purpose: "Personal / Social Visit"
  });

  const saveLogs = (newLogs: VisitorLog[]) => {
    setLogs(newLogs);
    if (typeof window !== 'undefined') {
      localStorage.setItem("drb_pms_visitors", JSON.stringify(newLogs));
    }
  };

  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED' || r.status === 'occupied');

  const handleCheckIn = () => {
    if (!form.name.trim()) return toast.error("Please enter visitor name");
    if (!form.phone.trim()) return toast.error("Please enter visitor phone number");

    const newLog: VisitorLog = {
      id: `VIS-${Date.now().toString().slice(-4)}`,
      name: form.name.trim(),
      phone: form.phone.trim(),
      visitingRoom: form.visitingRoom || "General / Lobby",
      visitingGuest: form.visitingGuest || "Lobby Visitor",
      purpose: form.purpose,
      checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: "In-House"
    };

    saveLogs([newLog, ...logs]);
    toast.success(`Visitor pass issued for ${form.name.trim()}`);
    setOpen(false);
    setForm({ name: "", phone: "", visitingRoom: "", visitingGuest: "", purpose: "Personal / Social Visit" });
  };

  const handleCheckOut = (id: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const updated = logs.map(l => l.id === id ? { ...l, status: "Departed" as const, checkOutTime: time } : l);
    saveLogs(updated);
    toast.info("Visitor checked out");
  };

  const inHouseCount = logs.filter(l => l.status === "In-House").length;
  const departedCount = logs.filter(l => l.status === "Departed").length;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Security & Front Desk"
        title="Visitor Management & Entry Log" 
        subtitle="Track outside guests, delivery personnel, and visitor entry passes"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90">
                <Plus className="size-4 mr-2" /> Issue Visitor Pass
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Issue Visitor Pass</DialogTitle>
                <DialogDescription>Record visitor entry and generate temporary clearance.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Visitor Full Name *</Label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. Ramesh Kumar" />
                </div>
                <div className="space-y-2">
                  <Label>Contact Number *</Label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="+91 98000 00000" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Visiting Room</Label>
                    <Select value={form.visitingRoom} onValueChange={v => setForm({...form, visitingRoom: v})}>
                      <SelectTrigger><SelectValue placeholder="Select Room" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Lobby">Lobby / Reception</SelectItem>
                        {rooms.map(r => (
                          <SelectItem key={r.id} value={r.room_number || (r as any).number}>
                            Room {r.room_number || (r as any).number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Visiting Person</Label>
                    <Input value={form.visitingGuest} onChange={e => setForm({...form, visitingGuest: e.target.value})} placeholder="Guest or Staff" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Purpose of Visit</Label>
                  <Select value={form.purpose} onValueChange={v => setForm({...form, purpose: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["Personal / Social Visit", "Business Meeting", "Delivery / Courier", "Maintenance / Service", "Official / Inspection"].map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={handleCheckIn} className="w-full bg-brass text-gold-foreground mt-2">
                  Issue Entry Pass
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Active In-House Visitors" value={String(inHouseCount)} icon={Users} tone="warning" hint="Currently inside property" />
        <KpiCard label="Departed Today" value={String(departedCount)} icon={CheckCircle} tone="success" hint="Completed visits" />
        <KpiCard label="Total Passes Issued" value={String(logs.length)} icon={ShieldCheck} tone="info" hint="All-time visitor records" />
      </div>

      <Panel title="Visitor Entry Log" description="Live register of all visitor check-ins">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pass ID</TableHead>
              <TableHead>Visitor Details</TableHead>
              <TableHead>Visiting Room / Person</TableHead>
              <TableHead>Purpose</TableHead>
              <TableHead>In / Out Time</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((l) => (
              <TableRow key={l.id}>
                <TableCell className="font-mono text-xs font-semibold text-gold">{l.id}</TableCell>
                <TableCell>
                  <div className="font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{l.phone}</div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">Room {l.visitingRoom}</div>
                  <div className="text-xs text-muted-foreground">Meeting: {l.visitingGuest}</div>
                </TableCell>
                <TableCell className="text-xs">{l.purpose}</TableCell>
                <TableCell className="text-xs font-mono">
                  <div>In: {l.checkInTime}</div>
                  {l.checkOutTime && <div className="text-muted-foreground">Out: {l.checkOutTime}</div>}
                </TableCell>
                <TableCell>
                  <Pill tone={l.status === 'In-House' ? 'warning' : 'success'}>{l.status}</Pill>
                </TableCell>
                <TableCell className="text-right">
                  {l.status === 'In-House' && (
                    <Button size="sm" variant="outline" onClick={() => handleCheckOut(l.id)}>
                      Check Out
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!logs.length && (
          <div className="p-8">
            <EmptyState title="No Visitors Logged" body="No active or past visitor passes found." icon={Users} />
          </div>
        )}
      </Panel>
    </div>
  );
}
