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
  const { discounts, reservations, guests, requestDiscount, resolveDiscount, session } = usePms();
  const [open, setOpen] = React.useState(false);
  const [resId, setResId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");

  const pending = discounts.filter(d => d.status === 'PENDING');
  const history = discounts.filter(d => d.status !== 'PENDING');
  const activeRes = reservations.filter(r => r.status === 'PENDING' || r.status === 'CONFIRMED' || r.status === 'OCCUPIED');

  const getReservation = (id: string) => reservations.find(r => r.id === id);
  const getGuestName = (id: string) => guests.find(g => g.id === id)?.name;

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Finance"
        title="Discounts" 
        subtitle="Manage and approve discount requests"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90">
                <Plus className="size-4 mr-2" /> Request Discount
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a Discount</DialogTitle>
                <DialogDescription>Submit a discount request for approval.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Select Reservation</Label>
                  <Select value={resId} onValueChange={setResId}>
                    <SelectTrigger><SelectValue placeholder="Choose an active reservation" /></SelectTrigger>
                    <SelectContent>
                      {activeRes.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {getGuestName(r.guest_id) || r.id.slice(0,8)} ({r.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Discount Amount (₹)</Label>
                  <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Corporate Rate, Service Recovery" />
                </div>
                <Button 
                  className="w-full bg-brass text-gold-foreground hover:opacity-90 mt-4"
                  onClick={() => {
                    const amt = parseFloat(amount);
                    if (!resId || isNaN(amt) || amt <= 0 || !reason) {
                      toast.error("Please fill all fields correctly.");
                      return;
                    }
                    requestDiscount(resId, amt, reason);
                    toast.success("Discount requested.");
                    setOpen(false);
                  }}
                >
                  Submit Request
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {(session?.role === 'SUPER_ADMIN' || session?.role === 'GM') && (
        <Panel title="Pending Approvals" description="Review requests before they hit the folio">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((d) => {
                const res = getReservation(d.reservation_id);
                const guest = res ? getGuestName(res.guest_id) : "Unknown";
                return (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{guest}</TableCell>
                    <TableCell>{d.requested_by}</TableCell>
                    <TableCell>{d.reason}</TableCell>
                    <TableCell className="font-semibold">{inr(d.requested_amount)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => {
                          resolveDiscount(d.id, "REJECTED");
                          toast.error("Discount rejected.");
                        }}>Reject</Button>
                        <Button size="sm" className="bg-success text-success-foreground hover:opacity-90" onClick={() => {
                          resolveDiscount(d.id, "APPROVED");
                          toast.success("Discount approved.");
                        }}>Approve</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!pending.length && (
             <div className="p-6">
               <EmptyState title="No pending requests" body="You are all caught up!" icon={PiggyBank} />
             </div>
          )}
        </Panel>
      )}

      <Panel title="Discount History" description="Previously approved or rejected requests">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Guest</TableHead>
                <TableHead>Reason</TableHead>
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
                    <TableCell className="font-semibold">{inr(d.requested_amount)}</TableCell>
                    <TableCell>
                      <Pill tone={d.status === 'APPROVED' ? 'success' : 'destructive'}>{d.status}</Pill>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.approved_by || "—"}</TableCell>
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
