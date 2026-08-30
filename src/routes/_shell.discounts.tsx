import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePms } from '@/lib/pms-store'
import { inr } from '@/lib/pms-data'
import { toast } from 'sonner'
import { PiggyBank, Plus } from 'lucide-react'

export const Route = createFileRoute('/_shell/discounts')({
  component: DiscountsPage,
})

function DiscountsPage() {
  const { discounts, reservations, guests, rooms, requestDiscount, resolveDiscount, session } = usePms();
  const [open, setOpen] = React.useState(false);
  const [resId, setResId] = React.useState("");
  const [percent, setPercent] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");

  const pending = discounts.filter(d => d.status === 'PENDING');
  const history = discounts.filter(d => d.status !== 'PENDING');
  const activeRes = reservations.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED' || r.status === 'OCCUPIED');

  const selectedReservation = reservations.find(r => r.id === resId);
  const totalBill = selectedReservation?.base_amount || 0;

  // Auto calculate amount when percentage changes
  const handlePercentChange = (val: string) => {
    setPercent(val);
    const p = parseFloat(val);
    if (!isNaN(p) && totalBill > 0) {
      const clampedP = Math.min(100, Math.max(0, p));
      const calculatedAmount = ((totalBill * clampedP) / 100).toFixed(2);
      setAmount(calculatedAmount);
    } else if (!val) {
      setAmount("");
    }
  };

  // Auto calculate percentage when amount changes
  const handleAmountChange = (val: string) => {
    setAmount(val);
    const amt = parseFloat(val);
    if (!isNaN(amt) && totalBill > 0) {
      const p = Math.min(100, (amt / totalBill) * 100).toFixed(1);
      setPercent(p);
    } else if (!val) {
      setPercent("");
    }
  };

  const setPreset = (presetPercent: number) => {
    setPercent(String(presetPercent));
    if (totalBill > 0) {
      const calculated = ((totalBill * presetPercent) / 100).toFixed(2);
      setAmount(calculated);
    }
  };

  const handleSubmit = async () => {
    const amt = parseFloat(amount);
    if (!resId) return toast.error("Please select a reservation");
    if (isNaN(amt) || amt <= 0) return toast.error("Please enter a valid discount percentage or amount");
    if (!reason.trim()) return toast.error("Please provide a reason for the discount");

    const reasonWithPercent = percent ? `${reason.trim()} (${percent}% off)` : reason.trim();
    const res = await requestDiscount(resId, amt, reasonWithPercent);
    if (res?.success) {
      toast.success("Discount request submitted for approval");
      setOpen(false);
      setResId("");
      setPercent("");
      setAmount("");
      setReason("");
    } else {
      toast.error(res?.error || "Failed to submit discount request");
    }
  };

  const getReservation = (id: string) => reservations.find(r => r.id === id);
  const getGuestName = (guestId?: string) => guests.find(g => g.id === guestId)?.name || "Guest";
  const getRoomNumber = (roomId?: string) => rooms.find(r => r.id === roomId)?.room_number || "Room";

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Finance"
        title="Discounts & Adjustments" 
        subtitle="Request, review, and approve rate adjustments in real-time"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90">
                <Plus className="size-4 mr-2" /> Request Discount
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Request a Discount</DialogTitle>
                <DialogDescription>Apply a percentage or flat discount to a reservation folio.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>Select Reservation *</Label>
                  <Select value={resId} onValueChange={(val) => {
                    setResId(val);
                    setPercent("");
                    setAmount("");
                  }}>
                    <SelectTrigger><SelectValue placeholder="Choose an active reservation" /></SelectTrigger>
                    <SelectContent>
                      {activeRes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {getGuestName(r.guest_id)} · Room {getRoomNumber(r.room_id)} ({inr(r.base_amount)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedReservation && (
                  <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs flex justify-between items-center">
                    <span className="text-muted-foreground">Original Folio Total:</span>
                    <span className="font-bold text-sm">{inr(totalBill)}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Discount (%)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        min="0" 
                        max="100" 
                        step="0.5"
                        value={percent} 
                        onChange={(e) => handlePercentChange(e.target.value)} 
                        placeholder="0 - 100%" 
                        disabled={!resId}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Discount (₹)</Label>
                    <div className="relative">
                      <Input 
                        type="number" 
                        value={amount} 
                        onChange={(e) => handleAmountChange(e.target.value)} 
                        placeholder="0.00" 
                        disabled={!resId}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
                    </div>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
                  {[5, 10, 15, 20, 50, 100].map(p => (
                    <button
                      key={p}
                      type="button"
                      disabled={!resId}
                      onClick={() => setPreset(p)}
                      className="px-2 py-0.5 rounded text-xs font-medium bg-secondary hover:bg-gold/20 hover:text-gold border border-border transition-colors disabled:opacity-50"
                    >
                      {p}%
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Reason / Justification *</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Corporate Partner, Service Recovery, Long Stay" />
                </div>

                <Button 
                  className="w-full bg-brass text-gold-foreground hover:opacity-90 mt-2"
                  onClick={handleSubmit}
                >
                  Submit Discount Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {(session?.role === 'SUPER_ADMIN' || session?.role === 'GM') && (
        <Panel title="Pending Approvals" description="Review and approve discount requests before they apply to the folio">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest & Folio</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Reason / Details</TableHead>
                <TableHead>Discount Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((d) => {
                const res = getReservation(d.reservation_id);
                const guest = res ? getGuestName(res.guest_id) : "Unknown";
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">
                      <div>{guest}</div>
                      <div className="text-xs text-muted-foreground">Folio: {d.reservation_id}</div>
                    </TableCell>
                    <TableCell>{d.requested_by || "Staff"}</TableCell>
                    <TableCell>{d.reason}</TableCell>
                    <TableCell className="font-bold text-success">- {inr(d.requested_amount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={async () => {
                          const r = await resolveDiscount(d.id, "REJECTED");
                          if (r?.success) toast.info("Discount request rejected");
                          else toast.error(r?.error || "Action failed");
                        }}>Reject</Button>
                        <Button size="sm" className="bg-success text-success-foreground hover:opacity-90" onClick={async () => {
                          const r = await resolveDiscount(d.id, "APPROVED");
                          if (r?.success) toast.success("Discount approved and applied to folio!");
                          else toast.error(r?.error || "Action failed");
                        }}>Approve & Deduct</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!pending.length && (
             <div className="p-6">
               <EmptyState title="No pending requests" body="All discount requests have been processed." icon={PiggyBank} />
             </div>
          )}
        </Panel>
      )}

      <Panel title="Discount Audit History" description="Historical log of approved and rejected discounts">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Guest</TableHead>
              <TableHead>Reason / Details</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Approver</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((d) => {
              const res = getReservation(d.reservation_id);
              const guest = res ? getGuestName(res.guest_id) : "Unknown";
              return (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{guest}</TableCell>
                  <TableCell>{d.reason}</TableCell>
                  <TableCell className="font-semibold text-destructive">- {inr(d.requested_amount)}</TableCell>
                  <TableCell>
                    <Pill tone={d.status === 'APPROVED' ? 'success' : 'destructive'}>{d.status}</Pill>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.approved_by || "System"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!history.length && (
          <div className="p-6">
            <EmptyState title="No history" body="No discounts have been processed yet." icon={PiggyBank} />
          </div>
        )}
      </Panel>
    </div>
  )
}
