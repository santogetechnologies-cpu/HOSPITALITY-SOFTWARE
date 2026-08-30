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
}

function PendingPaymentsPage() {
  const { payments, reservations, guests, rooms, settlePayment, freezePayment } = usePms();
  const [selectedItem, setSelectedItem] = React.useState<PendingItem | null>(null);
  const [collectionAmount, setCollectionAmount] = React.useState("");
  const [method, setMethod] = React.useState<"CASH" | "UPI" | "CARD" | "BANK_TRANSFER">("CASH");
  const [loading, setLoading] = React.useState(false);

  const getGuest = (id?: string) => guests.find(g => g.id === id);
  const getRoom = (roomId?: string) => rooms.find(rm => rm.id === roomId);

  // Unified Pending Ledger
  const pendingItems: PendingItem[] = React.useMemo(() => {
    const list: PendingItem[] = [];
    const processedResIds = new Set<string>();

    // 1. Process all existing payment records with outstanding balance
    payments.forEach((p) => {
      const res = reservations.find(r => r.id === p.reservation_id);
      const guest = res ? getGuest(res.guest_id) : null;
      const room = res ? getRoom(res.room_id) : null;
      const total = Number(p.total_amount) || 0;
      const paid = Number(p.paid_amount) || 0;
      const balance = total - paid;

      if (balance > 0 || p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'FROZEN') {
        if (p.reservation_id) processedResIds.add(p.reservation_id);

        let stage: PendingItem['stage'] = 'PRE_CHECKIN';
        if (p.status === 'FROZEN') stage = 'FROZEN';
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
          totalAmount: total,
          paidAmount: paid,
          balance: balance > 0 ? balance : 0,
          status: p.status
        });
      }
    });

    // 2. Include any confirmed or occupied reservations that don't have a fully settled payment record yet
    reservations.forEach((r) => {
      if (r.status === 'CANCELLED') return;
      if (processedResIds.has(r.id)) return;

      const matchingPayment = payments.find(p => p.reservation_id === r.id);
      const total = Number(r.base_amount) || 0;
      const paid = matchingPayment ? Number(matchingPayment.paid_amount) || 0 : 0;
      const balance = total - paid;

      if (balance > 0) {
        const guest = getGuest(r.guest_id);
        const room = getRoom(r.room_id);
        const stage: PendingItem['stage'] = r.status === 'OCCUPIED' ? 'IN_HOUSE' : r.status === 'COMPLETED' ? 'CHECKED_OUT' : 'PRE_CHECKIN';

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
          status: paid > 0 ? 'PARTIAL' : 'PENDING'
        });
      }
    });

    return list;
  }, [payments, reservations, guests, rooms]);

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
                    {item.stage === 'PRE_CHECKIN' ? 'Pre-Arrival Due' : item.stage === 'IN_HOUSE' ? 'In-House Folio' : item.stage === 'FROZEN' ? 'Frozen' : 'Departure Balance'}
                  </Pill>
                </TableCell>
                <TableCell className="font-medium">{inr(item.totalAmount)}</TableCell>
                <TableCell className="text-success font-medium">{inr(item.paidAmount)}</TableCell>
                <TableCell className="font-bold text-warning tabular-nums">
                  {inr(item.balance)}
                </TableCell>
                <TableCell className="text-right">
                  {item.stage === 'FROZEN' || item.status === 'FROZEN' ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      disabled
                      className="opacity-70 cursor-not-allowed text-xs text-warning border-warning/30"
                    >
                      🔒 Frozen (Pending Approval)
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      className="bg-brass text-gold-foreground hover:opacity-90 shadow-sm"
                      onClick={() => {
                        setSelectedItem(item);
                        setCollectionAmount(String(item.balance));
                      }}
                    >
                      Collect Balance
                    </Button>
                  )}
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
                  <div className="text-xs text-muted-foreground">Total Bill: {inr(selectedItem.totalAmount)}</div>
                  <div className="text-xs text-success">Already Paid: {inr(selectedItem.paidAmount)}</div>
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
    </div>
  )
}
