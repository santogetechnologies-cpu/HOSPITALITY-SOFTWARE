import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState, KpiCard } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePms } from '@/lib/pms-store'
import { inr, Payment } from '@/lib/pms-data'
import { toast } from 'sonner'
import { CreditCard, Banknote, Clock, AlertCircle, CheckCircle2 } from 'lucide-react'

export const Route = createFileRoute('/_shell/pending-payments')({
  component: PendingPaymentsPage,
})

interface PendingItem {
  id: string; // payment id or reservation id
  paymentId?: string;
  reservationId: string;
  guestName: string;
  guestPhone?: string;
  resourceName: string;
  bookingDate: string;
  stage: 'PRE_CHECKIN' | 'IN_HOUSE' | 'CHECKED_OUT' | 'FROZEN';
  totalAmount: number;
  paidAmount: number;
  balance: number;
  status: string;
  discountAmount?: number;
  discountReason?: string;
  originalAmount?: number;
}

function PendingPaymentsPage() {
  const { payments, reservations, guests, rooms, discounts, settlePayment, freezePayment, requestDiscount } = usePms();
  const [selectedItem, setSelectedItem] = React.useState<PendingItem | null>(null);
  const [collectionAmount, setCollectionAmount] = React.useState("");
  const [method, setMethod] = React.useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "OTHER">("CASH");
  const [loading, setLoading] = React.useState(false);

  // Discount Request Modal State
  const [discountModalOpen, setDiscountModalOpen] = React.useState(false);
  const [selectedItemForDiscount, setSelectedItemForDiscount] = React.useState<PendingItem | null>(null);
  const [discountAmount, setDiscountAmount] = React.useState("");
  const [discountReason, setDiscountReason] = React.useState("");

  const getGuest = (id?: string) => guests.find(g => g.id === id);
  const getRoom = (roomId?: string) => rooms.find(rm => rm.id === roomId);

  const getApprovedDiscount = (resId?: string) => {
    if (!resId) return 0;
    return discounts
      .filter(d => (d.reservation_id === resId || d.reservation_id?.toLowerCase() === resId.toLowerCase()) && d.status === 'APPROVED')
      .reduce((sum, d) => sum + (Number(d.requested_amount) || 0), 0);
  };

  const getPendingDiscount = (resId?: string) => {
    if (!resId) return false;
    return discounts.some(d => (d.reservation_id === resId || d.reservation_id?.toLowerCase() === resId.toLowerCase()) && d.status === 'PENDING');
  };

  // Unified Pending Ledger
  const pendingItems: PendingItem[] = React.useMemo(() => {
    const list: PendingItem[] = [];
    const processedResIds = new Set<string>();

    // 1. Process all existing payment records with outstanding balance
    payments.forEach((p) => {
      if (p.reservation_id) processedResIds.add(p.reservation_id);

      const res = reservations.find(r => r.id === p.reservation_id || r.id?.toLowerCase() === p.reservation_id?.toLowerCase());
      if (res?.status === 'CANCELLED') return;

      const guest = res ? getGuest(res.guest_id) : null;
      const room = res ? getRoom(res.room_id) : null;
      const originalAmount = Number(res?.base_amount) || Number(p.total_amount) || 0;
      const approvedDiscount = getApprovedDiscount(p.reservation_id);
      const hasPendingDiscount = getPendingDiscount(p.reservation_id);

      // Effective total bill: apply approved discount if not already deducted
      let effectiveTotal = Number(p.total_amount) || originalAmount;
      if (approvedDiscount > 0 && effectiveTotal >= originalAmount && originalAmount > approvedDiscount) {
        effectiveTotal = Math.max(0, originalAmount - approvedDiscount);
      }
      
      const paid = Number(p.paid_amount) || 0;
      const balance = Math.max(0, effectiveTotal - paid);

      // Only display in Pending Folios if there is an actual remaining balance (> 0) or an unresolved discount request
      if (balance > 0 || hasPendingDiscount) {
        let stage: PendingItem['stage'] = 'PRE_CHECKIN';
        if (p.status === 'FROZEN' || hasPendingDiscount) stage = 'FROZEN';
        else if (res?.status === 'OCCUPIED') stage = 'IN_HOUSE';
        else if (res?.status === 'COMPLETED') stage = 'CHECKED_OUT';
        else stage = 'PRE_CHECKIN';

        list.push({
          id: p.id,
          paymentId: p.id,
          reservationId: p.reservation_id,
          guestName: guest?.name || "Guest",
          guestPhone: guest?.phone,
          resourceName: res?.resource_type === 'PARTY_HALL' ? `Party Hall (${res.event_type || 'Event'})` : room ? `Room ${room.room_number || (room as any).number}` : 'Room Booking',
          bookingDate: res?.booking_date || "—",
          stage,
          totalAmount: effectiveTotal,
          paidAmount: paid,
          balance,
          status: hasPendingDiscount ? 'FROZEN' : (paid >= effectiveTotal && effectiveTotal > 0 ? 'COMPLETED' : paid > 0 ? 'PARTIAL' : 'PENDING'),
          discountAmount: approvedDiscount,
          originalAmount: approvedDiscount > 0 ? (originalAmount > effectiveTotal ? originalAmount : effectiveTotal + approvedDiscount) : undefined
        });
      }
    });

    // 2. Include any confirmed or occupied reservations that don't have a fully settled payment record yet
    reservations.forEach((r) => {
      if (r.status === 'CANCELLED') return;
      if (processedResIds.has(r.id)) return;

      const matchingPayment = payments.find(p => p.reservation_id === r.id || p.reservation_id?.toLowerCase() === r.id.toLowerCase());
      const originalAmount = Number(r.base_amount) || 0;
      const approvedDiscount = getApprovedDiscount(r.id);
      const hasPendingDiscount = getPendingDiscount(r.id);
      const total = approvedDiscount > 0 ? Math.max(0, originalAmount - approvedDiscount) : originalAmount;
      const paid = matchingPayment ? Number(matchingPayment.paid_amount) || 0 : 0;
      const balance = Math.max(0, total - paid);

      if (balance > 0 || hasPendingDiscount) {
        const guest = getGuest(r.guest_id);
        const room = getRoom(r.room_id);
        let stage: PendingItem['stage'] = r.status === 'OCCUPIED' ? 'IN_HOUSE' : r.status === 'COMPLETED' ? 'CHECKED_OUT' : 'PRE_CHECKIN';
        if (hasPendingDiscount) stage = 'FROZEN';

        list.push({
          id: matchingPayment?.id || r.id,
          paymentId: matchingPayment?.id,
          reservationId: r.id,
          guestName: guest?.name || "Guest",
          guestPhone: guest?.phone,
          resourceName: r.resource_type === 'PARTY_HALL' ? `Party Hall (${r.event_type || 'Event'})` : room ? `Room ${room.room_number || (room as any).number}` : 'Room Booking',
          bookingDate: r.booking_date || "—",
          stage,
          totalAmount: total,
          paidAmount: paid,
          balance,
          status: hasPendingDiscount ? 'FROZEN' : (paid > 0 ? 'PARTIAL' : 'PENDING'),
          discountAmount: approvedDiscount,
          originalAmount: approvedDiscount > 0 ? originalAmount : undefined
        });
      }
    });

    return list;
  }, [payments, reservations, guests, rooms, discounts]);

  const totalOutstanding = pendingItems.reduce((acc, i) => acc + i.balance, 0);

  const handleCollect = async () => {
    if (!selectedItem) return;
    const amt = parseFloat(collectionAmount);
    if (isNaN(amt) || amt <= 0) return toast.error("Please enter a valid collection amount");

    setLoading(true);
    const targetId = selectedItem.paymentId || selectedItem.reservationId;
    const res = await settlePayment(targetId, amt, method as any);
    setLoading(false);

    if (res?.success) {
      toast.success(`Collected ${inr(amt)} for ${selectedItem.guestName}`);
      setSelectedItem(null);
      setCollectionAmount("");
    } else {
      toast.error(res?.error || "Failed to record payment");
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Finance"
        title="Pending Folios & Collections" 
        subtitle="Collect advances, in-house folios, and post-departure dues before and after check-in"
        actions={<Pill tone="warning">{pendingItems.length} Open Folios · {inr(totalOutstanding)} Total Due</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Total Outstanding Dues"
          value={inr(totalOutstanding)}
          icon={AlertCircle}
          tone="warning"
          hint={`${pendingItems.length} folios with unpaid balance`}
        />
        <KpiCard
          label="Pre-Arrival Pending"
          value={String(pendingItems.filter(i => i.stage === 'PRE_CHECKIN').length)}
          icon={Clock}
          tone="info"
          hint="Advances due before check-in"
        />
        <KpiCard
          label="In-House & Folio Dues"
          value={String(pendingItems.filter(i => i.stage === 'IN_HOUSE' || i.stage === 'CHECKED_OUT').length)}
          icon={Banknote}
          tone="gold"
          hint="Active guest balances"
        />
      </div>

      <Panel title="Active Outstanding Balances" description="All pending folios across property reservations">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest & Contact</TableHead>
              <TableHead>Room / Resource</TableHead>
              <TableHead>Booking Date</TableHead>
              <TableHead>Collection Stage</TableHead>
              <TableHead>Total Bill</TableHead>
              <TableHead>Collected</TableHead>
              <TableHead>Pending Balance</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-semibold">{item.guestName}</div>
                  <div className="text-xs text-muted-foreground">{item.guestPhone || "No phone"}</div>
                </TableCell>
                <TableCell className="font-medium text-xs">
                  {item.resourceName}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {item.bookingDate}
                </TableCell>
                <TableCell>
                  <Pill tone={item.stage === 'PRE_CHECKIN' ? 'info' : item.stage === 'IN_HOUSE' ? 'warning' : item.stage === 'FROZEN' ? 'destructive' : 'gold'}>
                    {item.stage === 'PRE_CHECKIN' ? 'Pre-Arrival Due' : item.stage === 'IN_HOUSE' ? 'In-House Folio' : item.stage === 'FROZEN' ? 'Frozen (Discount Pending)' : 'Departure Balance'}
                  </Pill>
                </TableCell>
                <TableCell className="font-medium">
                  <div>{inr(item.totalAmount)}</div>
                  {item.discountAmount && item.discountAmount > 0 ? (
                    <div className="text-[11px] text-success font-medium">
                      -{inr(item.discountAmount)} discount applied
                    </div>
                  ) : null}
                </TableCell>
                <TableCell className="text-success font-medium">{inr(item.paidAmount)}</TableCell>
                <TableCell className="font-bold text-warning tabular-nums">
                  {inr(item.balance)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1.5 flex-wrap">
                    {item.stage === 'FROZEN' || item.status === 'FROZEN' ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled
                        className="opacity-70 cursor-not-allowed text-xs text-warning border-warning/30"
                      >
                        🔒 Frozen (Approval Pending)
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs border-gold/40 text-gold hover:bg-gold/10"
                          onClick={() => {
                            setSelectedItemForDiscount(item);
                            setDiscountAmount(String(Math.min(item.balance, 500)));
                            setDiscountReason("Guest rate adjustment / Manager concession");
                            setDiscountModalOpen(true);
                          }}
                        >
                          Request Discount
                        </Button>
                        <Button 
                          size="sm" 
                          className="bg-brass text-gold-foreground hover:opacity-90 shadow-sm h-8 text-xs"
                          onClick={() => {
                            setSelectedItem(item);
                            setCollectionAmount(String(item.balance));
                          }}
                        >
                          Collect Balance
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {!pendingItems.length && (
          <div className="p-8">
            <EmptyState title="All Folios Settled" body="There are currently no unpaid or pending balances across the property." icon={CheckCircle2} />
          </div>
        )}
      </Panel>

      {/* Collect Balance Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(o) => { if (!o) setSelectedItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Collect Outstanding Balance</DialogTitle>
            <DialogDescription>
              Record settlement for {selectedItem?.guestName} ({selectedItem?.resourceName})
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 pt-2">
              <div className="flex justify-between items-center rounded-xl border border-border bg-secondary/40 p-4">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Total Bill: <span className="font-semibold text-foreground">{inr(selectedItem.totalAmount)}</span>
                    {selectedItem.discountAmount && selectedItem.discountAmount > 0 ? (
                      <span className="ml-1 text-success">(-{inr(selectedItem.discountAmount)} discount)</span>
                    ) : null}
                  </div>
                  <div className="text-xs text-success mt-0.5">Already Paid: {inr(selectedItem.paidAmount)}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase font-semibold text-muted-foreground">Outstanding Due</div>
                  <div className="text-xl font-bold text-warning">{inr(selectedItem.balance)}</div>
                </div>
              </div>
              
              <div className="space-y-1.5">
                <Label>Collection Amount (₹)</Label>
                <Input 
                  type="number" 
                  value={collectionAmount} 
                  onChange={(e) => setCollectionAmount(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select value={method} onValueChange={(v: any) => setMethod(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="UPI">UPI / QR (GPay, PhonePe, Paytm)</SelectItem>
                    <SelectItem value="CARD">Credit / Debit Card</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                    <SelectItem value="OTHER">Other / Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="ghost" onClick={() => setSelectedItem(null)}>Cancel</Button>
                <Button 
                  className="bg-brass text-gold-foreground hover:opacity-90"
                  disabled={loading}
                  onClick={handleCollect}
                >
                  {loading ? "Recording..." : `Confirm Collection of ${inr(parseFloat(collectionAmount) || 0)}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Discount Dialog */}
      <Dialog open={discountModalOpen} onOpenChange={setDiscountModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Folio Discount</DialogTitle>
            <DialogDescription>
              Submit discount for {selectedItemForDiscount?.guestName}. Requires Super Admin approval.
            </DialogDescription>
          </DialogHeader>

          {selectedItemForDiscount && (
            <div className="space-y-4 pt-2">
              <div className="p-3 rounded-xl bg-secondary/50 border border-border text-xs flex justify-between items-center">
                <span className="text-muted-foreground">Outstanding Folio Balance:</span>
                <span className="font-bold text-sm text-warning">{inr(selectedItemForDiscount.balance)}</span>
              </div>

              <div className="space-y-1.5">
                <Label>Discount Amount (₹) *</Label>
                <Input 
                  type="number" 
                  value={discountAmount} 
                  onChange={(e) => setDiscountAmount(e.target.value)} 
                />
              </div>

              <div className="space-y-1.5">
                <Label>Reason / Justification *</Label>
                <Input 
                  value={discountReason} 
                  onChange={(e) => setDiscountReason(e.target.value)} 
                  placeholder="e.g. Overtime waiver, Special corporate discount"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="ghost" onClick={() => setDiscountModalOpen(false)}>Cancel</Button>
                <Button 
                  className="bg-brass text-gold-foreground hover:opacity-90"
                  disabled={loading}
                  onClick={async () => {
                    const amt = parseFloat(discountAmount);
                    if (isNaN(amt) || amt <= 0) return toast.error("Please enter a valid discount amount");
                    if (!discountReason.trim()) return toast.error("Please enter a reason");

                    setLoading(true);
                    const res = await requestDiscount(selectedItemForDiscount.reservationId, amt, discountReason.trim());
                    setLoading(false);

                    if (res?.success) {
                      toast.success("Discount request submitted! Folio locked pending Super Admin approval.");
                      setDiscountModalOpen(false);
                      setSelectedItemForDiscount(null);
                    } else {
                      toast.error(res?.error || "Failed to submit request");
                    }
                  }}
                >
                  Submit for Approval
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
