import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState, KpiCard } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePms } from '@/lib/pms-store'
import { inr } from '@/lib/pms-data'
import { Banknote, Search, CreditCard, CheckCircle2, Clock, ShieldAlert } from 'lucide-react'

export const Route = createFileRoute('/_shell/payment-history')({
  component: PaymentHistoryPage,
})

function PaymentHistoryPage() {
  const { payments, reservations, guests, rooms } = usePms();
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<string>("all");

  const getReservation = (id: string) => reservations.find(r => r.id === id);
  const getGuest = (id: string) => guests.find(g => g.id === id);
  const getRoom = (roomId?: string) => rooms.find(r => r.id === roomId);

  const totalCollected = payments.reduce((acc, p) => acc + (p.paid_amount || 0), 0);
  const completedPayments = payments.filter(p => p.status === 'COMPLETED');
  const partialPayments = payments.filter(p => p.status === 'PARTIAL');

  const filtered = payments.filter((p) => {
    if (filter === "completed" && p.status !== "COMPLETED") return false;
    if (filter === "partial" && p.status !== "PARTIAL") return false;
    if (filter === "frozen" && p.status !== "FROZEN") return false;
    if (filter === "pending" && p.status !== "PENDING") return false;

    if (!q.trim()) return true;
    const res = getReservation(p.reservation_id);
    const guest = res ? getGuest(res.guest_id) : null;
    const room = res ? getRoom(res.room_id) : null;

    const term = q.toLowerCase().trim();
    return (
      p.id.toLowerCase().includes(term) ||
      (guest?.name && guest.name.toLowerCase().includes(term)) ||
      (guest?.phone && guest.phone.includes(term)) ||
      (room?.room_number && room.room_number.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Finance"
        title="Payment History & Audit Log" 
        subtitle="Complete ledger of all collected payments, advances, and settlements"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard 
          label="Total Collected" 
          value={inr(totalCollected)} 
          icon={Banknote} 
          tone="success" 
          hint={`${payments.length} total transaction folios`} 
        />
        <KpiCard 
          label="Settled Folios" 
          value={String(completedPayments.length)} 
          icon={CheckCircle2} 
          tone="gold" 
          hint="100% paid and closed" 
        />
        <KpiCard 
          label="Partial Collections" 
          value={String(partialPayments.length)} 
          icon={Clock} 
          tone="warning" 
          hint="Advances with balance pending" 
        />
      </div>

      <Panel bodyClassName="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by Folio ID, Guest Name, Phone or Room..."
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Transactions</SelectItem>
              <SelectItem value="completed">Settled / Completed</SelectItem>
              <SelectItem value="partial">Partial / Advance</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="frozen">Frozen / Disputed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio / Receipt ID</TableHead>
              <TableHead>Guest & Contact</TableHead>
              <TableHead>Resource / Booking</TableHead>
              <TableHead>Total Bill</TableHead>
              <TableHead>Collected</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const res = getReservation(p.reservation_id);
              const guest = res ? getGuest(res.guest_id) : null;
              const room = res ? getRoom(res.room_id) : null;
              const balance = p.total_amount - (p.paid_amount || 0);

              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold text-gold">
                    {p.id.slice(0, 10).toUpperCase()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{guest?.name || "Guest"}</div>
                    <div className="text-xs text-muted-foreground">{guest?.phone || "No phone"}</div>
                  </TableCell>
                  <TableCell>
                    {res?.resource_type === 'PARTY_HALL' ? (
                      <span className="font-medium text-xs text-gold">Party Hall ({res.event_type || 'Event'})</span>
                    ) : room ? (
                      <span className="font-medium text-xs">Room {room.room_number} ({room.room_name || 'Standard'})</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">General Booking</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{inr(p.total_amount || 0)}</TableCell>
                  <TableCell className="font-semibold text-success">{inr(p.paid_amount || 0)}</TableCell>
                  <TableCell className={balance > 0 ? "font-semibold text-warning" : "text-muted-foreground"}>
                    {balance > 0 ? inr(balance) : "₹0.00"}
                  </TableCell>
                  <TableCell className="text-xs font-medium">{p.payment_method || "CASH / UPI"}</TableCell>
                  <TableCell>
                    <Pill tone={p.status === 'COMPLETED' ? 'success' : p.status === 'PARTIAL' ? 'warning' : p.status === 'FROZEN' ? 'info' : 'destructive'}>
                      {p.status}
                    </Pill>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {!filtered.length && (
          <div className="p-8">
            <EmptyState title="No Payment Records Found" body="No matching payment or transaction logs found." icon={Banknote} />
          </div>
        )}
      </Panel>
    </div>
  )
}
