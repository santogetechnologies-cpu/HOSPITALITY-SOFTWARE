import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState, KpiCard } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { usePms } from '@/lib/pms-store'
import { inr } from '@/lib/pms-data'
import { Banknote, Search, CreditCard, CheckCircle2, Clock, ShieldAlert, Layers, QrCode, Building2, Landmark } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_shell/payment-history')({
  component: PaymentHistoryPage,
})

function PaymentHistoryPage() {
  const { payments, paymentSplits, reservations, guests, rooms, discounts, deletePayment, session } = usePms();
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
    if (approvedDiscount > 0 && total >= originalAmount && originalAmount >= approvedDiscount) {
      total = Math.max(0, originalAmount - approvedDiscount);
    }
    const paid = Number(p.paid_amount) || 0;
    const isComplimentary = approvedDiscount > 0 && total === 0;
    return p.status === 'COMPLETED' || (paid >= total && total > 0) || isComplimentary;
  };

  const isPaymentPartial = (p: typeof payments[0]) => {
    if (isPaymentCompleted(p)) return false;
    const paid = Number(p.paid_amount) || 0;
    return p.status === 'PARTIAL' || paid > 0;
  };

  const totalCollected = payments.reduce((acc, p) => {
    const res = getReservation(p.reservation_id);
    const approvedDiscount = getApprovedDiscount(p.reservation_id);
    const originalAmount = Number(res?.base_amount) || Number(p.total_amount) || 0;
    let total = Number(p.total_amount) || originalAmount;
    if (approvedDiscount > 0 && total >= originalAmount && originalAmount >= approvedDiscount) {
      total = Math.max(0, originalAmount - approvedDiscount);
    }
    const isComplimentary = approvedDiscount > 0 && total === 0;
    if (isComplimentary) return acc;
    return acc + Math.min(Number(p.paid_amount) || 0, total > 0 ? total : Number(p.paid_amount) || 0);
  }, 0);
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

  if (session && session.role !== "SUPER_ADMIN" && session.role !== "GM") {
    return (
      <div className="space-y-6 pb-12">
        <PageHeader eyebrow="Finance" title="Payment History & Audit Log" subtitle="Financial Audit Log" />
        <Panel className="p-12 text-center">
          <EmptyState title="Executive Access Only" body="Payment ledger and historical transaction logs are restricted to Super Administrators and General Managers." icon={Receipt} />
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
              if (approvedDiscount > 0 && total >= originalAmount && originalAmount >= approvedDiscount) {
                total = Math.max(0, originalAmount - approvedDiscount);
              }
              const isComplimentary = approvedDiscount > 0 && total === 0;
              const rawPaid = Number(p.paid_amount) || 0;
              const paid = isComplimentary ? 0 : Math.min(rawPaid, total > 0 ? total : rawPaid);
              const balance = Math.max(0, total - paid);
              const isSettled = isComplimentary || (balance === 0 && total > 0) || p.status === 'COMPLETED';
              const folioId = String(p.id || 'FOLIO').slice(0, 10).toUpperCase();

              const rawSplits = paymentSplits.filter(
                (s) => (p.reservation_id && s.reservation_id === p.reservation_id) || s.payment_id === p.id
              );
              const rawMethod = (p.payment_method || "CASH").toUpperCase();
              const isSplit = rawSplits.length > 1 || rawMethod.includes("SPLIT");

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
                      <div className="text-[11px] text-amber-600 font-medium">
                        -{inr(approvedDiscount)} discount applied
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-semibold text-success">{inr(paid)}</TableCell>
                  <TableCell className={balance > 0 ? "font-semibold text-warning" : "text-muted-foreground"}>
                    {balance > 0 ? inr(balance) : "₹0.00"}
                  </TableCell>
                  <TableCell>
                    {isSplit && rawSplits.length > 0 ? (
                      <div className="space-y-1.5 py-0.5">
                        <Badge
                          variant="outline"
                          className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-400/60 text-[10.5px] font-bold flex items-center gap-1 w-fit shadow-2xs py-0.5 px-2"
                        >
                          <Layers className="size-3 text-purple-600 dark:text-purple-400" />
                          <span>Split ({rawSplits.length} modes)</span>
                        </Badge>
                        <div className="flex flex-wrap items-center gap-1 text-[10px]">
                          {rawSplits.map((s: any, idx: number) => {
                            const sm = (s.method || "CASH").toUpperCase();
                            const amt = Number(s.amount) || 0;
                            if (sm.includes("CASH")) {
                              return (
                                <span
                                  key={s.id || idx}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 font-mono font-medium text-emerald-700 dark:text-emerald-300 shadow-2xs"
                                >
                                  <Banknote className="size-2.5" />
                                  <span>CASH: {inr(amt)}</span>
                                </span>
                              );
                            }
                            if (
                              sm.includes("UPI") ||
                              sm.includes("GPAY") ||
                              sm.includes("PHONEPE") ||
                              sm.includes("PAYTM") ||
                              sm.includes("QR")
                            ) {
                              return (
                                <span
                                  key={s.id || idx}
                                  className="inline-flex items-center gap-1 rounded-md bg-purple-500/15 border border-purple-500/30 px-1.5 py-0.5 font-mono font-medium text-purple-700 dark:text-purple-300 shadow-2xs"
                                >
                                  <QrCode className="size-2.5" />
                                  <span>UPI: {inr(amt)}</span>
                                </span>
                              );
                            }
                            if (
                              sm.includes("CARD") ||
                              sm.includes("POS") ||
                              sm.includes("DEBIT") ||
                              sm.includes("CREDIT")
                            ) {
                              return (
                                <span
                                  key={s.id || idx}
                                  className="inline-flex items-center gap-1 rounded-md bg-blue-500/15 border border-blue-500/30 px-1.5 py-0.5 font-mono font-medium text-blue-700 dark:text-blue-300 shadow-2xs"
                                >
                                  <CreditCard className="size-2.5" />
                                  <span>CARD: {inr(amt)}</span>
                                </span>
                              );
                            }
                            if (sm.includes("COMPANY") || sm.includes("CORP")) {
                              return (
                                <span
                                  key={s.id || idx}
                                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 font-mono font-medium text-amber-800 dark:text-amber-300 shadow-2xs"
                                >
                                  <Building2 className="size-2.5" />
                                  <span>COMPANY: {inr(amt)}</span>
                                </span>
                              );
                            }
                            if (
                              sm.includes("BANK") ||
                              sm.includes("TRANSFER") ||
                              sm.includes("NEFT") ||
                              sm.includes("RTGS") ||
                              sm.includes("IMPS")
                            ) {
                              return (
                                <span
                                  key={s.id || idx}
                                  className="inline-flex items-center gap-1 rounded-md bg-indigo-500/15 border border-indigo-500/30 px-1.5 py-0.5 font-mono font-medium text-indigo-700 dark:text-indigo-300 shadow-2xs"
                                >
                                  <Landmark className="size-2.5" />
                                  <span>BANK: {inr(amt)}</span>
                                </span>
                              );
                            }
                            return (
                              <span
                                key={s.id || idx}
                                className="inline-flex items-center gap-1 rounded-md bg-secondary border border-border px-1.5 py-0.5 font-mono font-medium text-muted-foreground shadow-2xs"
                              >
                                <span>{sm}: {inr(amt)}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs font-medium">{p.payment_method || "CASH"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Pill tone={isComplimentary ? 'info' : isSettled ? 'success' : balance > 0 && paid > 0 ? 'warning' : p.status === 'FROZEN' ? 'info' : 'destructive'}>
                      {isComplimentary ? 'COMPLIMENTARY' : isSettled ? 'COMPLETED' : balance > 0 && paid > 0 ? 'PARTIAL' : (p.status || 'PENDING')}
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
