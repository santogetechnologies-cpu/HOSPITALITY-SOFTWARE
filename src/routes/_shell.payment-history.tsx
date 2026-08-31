import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState, KpiCard } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePms } from '@/lib/pms-store'
import { inr } from '@/lib/pms-data'
import { Banknote, Search, CreditCard, CheckCircle2, Clock, ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_shell/payment-history')({
  component: PaymentHistoryPage,
})

function PaymentHistoryPage() {
  const { payments, reservations, guests, rooms, discounts, deletePayment, session } = usePms();
  const isAdmin = session?.role === "SUPER_ADMIN" || session?.role === "GM" || !session;
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState<string>("all");

  const getReservation = (id: string) => reservations.find(r => r.id === id || r.id?.toLowerCase() === id.toLowerCase());
  const getGuest = (id: string) => guests.find(g => g.id === id);
  const getRoom = (roomId?: string) => rooms.find(r => r.id === roomId);

  const getApprovedDiscount = (resId?: string) => {
    if (!resId) return 0;
    return discounts
      .filter(d => (d.reservation_id === resId || d.reservation_id?.toLowerCase() === resId.toLowerCase()) && d.status === 'APPROVED')
      .reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);
  };

  const isPaymentCompleted = (p: typeof payments[0]) => {
    const res = getReservation(p.reservation_id);
    const approvedDiscount = getApprovedDiscount(p.reservation_id);
    const originalAmount = Number(res?.base_amount) || Number(p.total_amount) || 0;
    let total = Number(p.total_amount) || originalAmount;
    if (approvedDiscount > 0 && total >= originalAmount && originalAmount > approvedDiscount) {
      total = Math.max(0, originalAmount - approvedDiscount);
    }
    const paid = Number(p.paid_amount) || 0;
    return p.status === 'COMPLETED' || (paid >= total && total > 0);
  };

  const isPaymentPartial = (p: typeof payments[0]) => {
    if (isPaymentCompleted(p)) return false;
    const paid = Number(p.paid_amount) || 0;
    return p.status === 'PARTIAL' || paid > 0;
  };

  const totalCollected = payments.reduce((acc, p) => acc + (Number(p.paid_amount) || 0), 0);
  const completedPayments = payments.filter(isPaymentCompleted);
  const partialPayments = payments.filter(isPaymentPartial);

  const filtered = payments.filter((p) => {
    const isCompleted = isPaymentCompleted(p);
    const isPartial = isPaymentPartial(p);

    if (filter === "completed" && !isCompleted) return false;
    if (filter === "partial" && !isPartial) return false;
    if (filter === "frozen" && p.status !== "FROZEN") return false;
    if (filter === "pending" && (isCompleted || isPartial || p.status === "FROZEN")) return false;

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

  if (session && session.role !== "SUPER_ADMIN") {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader eyebrow="Finance" title="Payment History & Audit Log" subtitle="Financial Audit Log" />
        <Panel className="p-12 text-center">
          <EmptyState title="Super Admin Access Only" body="Payment ledger and historical transaction logs are restricted to Super Administrators." icon={Receipt} />
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Finance"
        title="Payment History & Audit Log" 
        subtitle="Complete ledger of all collected payments, advances, and settlements"
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard 
          label="Total Revenue Collected" 
          value={inr(totalCollected)} 
          icon={Banknote} 
          tone="gold" 
          hint="All confirmed settlements" 
        />
        <KpiCard 
          label="Settled Invoices" 
          value={String(completedPayments.length)} 
          icon={CheckCircle2} 
          tone="success" 
          hint="Fully cleared payments" 
        />
        <KpiCard 
          label="Partial / Pending Folios" 
          value={String(partialPayments.length)} 
          icon={Clock} 
          tone="warning" 
          hint="Active open balances" 
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
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((p) => {
              const res = getReservation(p.reservation_id);
              const guest = res ? getGuest(res.guest_id) : null;
              const room = res ? getRoom(res.room_id) : null;
              const approvedDiscount = getApprovedDiscount(p.reservation_id);
              const originalAmount = Number(res?.base_amount) || Number(p.total_amount) || 0;
              let total = Number(p.total_amount) || originalAmount;
              if (approvedDiscount > 0 && total >= originalAmount && originalAmount > approvedDiscount) {
                total = Math.max(0, originalAmount - approvedDiscount);
              }
              const paid = Number(p.paid_amount) || 0;
              const balance = Math.max(0, total - paid);
              const folioId = String(p.id || 'FOLIO').slice(0, 10).toUpperCase();

              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs font-semibold text-gold">
                    {folioId}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{guest?.name || "Guest"}</div>
                    <div className="text-xs text-muted-foreground">{guest?.phone || "No phone"}</div>
                  </TableCell>
                  <TableCell>
                    {res?.resource_type === 'PARTY_HALL' ? (
                      <span className="font-medium text-xs text-gold">Party Hall ({res.event_type || 'Event'})</span>
                    ) : room ? (
                      <span className="font-medium text-xs">Room {room.room_number || (room as any)?.number} ({room.room_name || 'Standard'})</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">General Booking</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    <div>{inr(total)}</div>
                    {approvedDiscount > 0 ? (
                      <div className="text-[11px] text-success font-medium">
                        -{inr(approvedDiscount)} discount applied
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-semibold text-success">{inr(paid)}</TableCell>
                  <TableCell className={balance > 0 ? "font-semibold text-warning" : "text-muted-foreground"}>
                    {balance > 0 ? inr(balance) : "₹0.00"}
                  </TableCell>
                  <TableCell className="text-xs font-medium">{p.payment_method || "CASH / UPI"}</TableCell>
                  <TableCell>
                    <Pill tone={balance === 0 && total > 0 ? 'success' : balance > 0 && paid > 0 ? 'warning' : p.status === 'FROZEN' ? 'info' : 'destructive'}>
                      {balance === 0 && total > 0 ? 'COMPLETED' : balance > 0 && paid > 0 ? 'PARTIAL' : (p.status || 'PENDING')}
                    </Pill>
                  </TableCell>
                  <TableCell className="text-right">
                    {isAdmin ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={async () => {
                          if (confirm(`Are you sure you want to delete payment folio record "${folioId}"?`)) {
                            const delRes = await deletePayment(p.id);
                            if (delRes?.success) toast.success("Payment record deleted");
                            else toast.error(delRes?.error || "Failed to delete payment record");
                          }
                        }}
                      >
                        Delete
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
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
