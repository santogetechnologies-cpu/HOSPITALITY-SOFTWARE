import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePms } from '@/lib/pms-store'
import { inr, Payment } from '@/lib/pms-data'
import { toast } from 'sonner'
import { CreditCard, Snowflake } from 'lucide-react'

export const Route = createFileRoute('/_shell/pending-payments')({
  component: PendingPaymentsPage,
})

function PendingPaymentsPage() {
  const { payments, reservations, guests, settlePayment, freezePayment, session } = usePms();
  const [selectedPayment, setSelectedPayment] = React.useState<Payment | null>(null);
  const [collectionAmount, setCollectionAmount] = React.useState("");

  const pending = payments.filter(p => p.status === 'PENDING' || p.status === 'PARTIAL' || p.status === 'FROZEN');

  const getReservation = (id: string) => reservations.find(r => r.id === id);
  const getGuest = (id: string) => guests.find(g => g.id === id);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Finance"
        title="Pending Folios" 
        subtitle="Collect balances from in-house and departed guests"
      />

      <Panel bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio ID</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Paid</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.map((p) => {
              const res = getReservation(p.reservation_id);
              const guest = res ? getGuest(res.guest_id) : null;
              const balance = p.total_amount - (p.paid_amount || 0);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-xs">{p.id.slice(0,8).toUpperCase()}</TableCell>
                  <TableCell>{guest?.name || "Unknown"}</TableCell>
                  <TableCell>{inr(p.total_amount)}</TableCell>
                  <TableCell>{inr(p.paid_amount || 0)}</TableCell>
                  <TableCell className="font-semibold">{inr(balance)}</TableCell>
                  <TableCell>
                    <Pill tone={p.status === 'FROZEN' ? 'info' : 'warning'}>{p.status}</Pill>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => {
                        setSelectedPayment(p);
                        setCollectionAmount(String(balance));
                      }}
                    >
                      Collect
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!pending.length && (
          <div className="p-6">
            <EmptyState title="All Clear" body="No pending folios to collect." icon={CreditCard} />
          </div>
        )}
      </Panel>

      <Dialog open={!!selectedPayment} onOpenChange={(o) => { if (!o) setSelectedPayment(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collect Payment</DialogTitle>
            <DialogDescription>Record a payment for this folio.</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-center rounded-lg border border-border bg-secondary/50 p-3">
                <span className="text-sm font-medium">Remaining Balance</span>
                <span className="font-semibold">{inr(selectedPayment.total_amount - (selectedPayment.paid_amount || 0))}</span>
              </div>
              
              <div className="space-y-2">
                <Label>Collection Amount</Label>
                <Input 
                  type="number" 
                  value={collectionAmount} 
                  onChange={(e) => setCollectionAmount(e.target.value)} 
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select defaultValue="Card">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Card", "UPI", "Cash", "Bank Transfer"].map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 pt-4">
                <Button 
                  className="flex-1 bg-brass text-gold-foreground hover:opacity-90"
                  onClick={() => {
                    const amt = parseFloat(collectionAmount);
                    if (isNaN(amt) || amt <= 0) {
                      toast.error("Enter a valid amount");
                      return;
                    }
                    settlePayment(selectedPayment.id, amt);
                    toast.success(`Collected ${inr(amt)} successfully.`);
                    setSelectedPayment(null);
                  }}
                >
                  Confirm Payment
                </Button>
                
                {(session?.role === 'SUPER_ADMIN' || session?.role === 'GM') && selectedPayment.status !== 'FROZEN' && (
                  <Button 
                    variant="outline"
                    className="text-info hover:text-info"
                    onClick={() => {
                      freezePayment(selectedPayment.id);
                      toast.info("Folio frozen for City Ledger/Review.");
                      setSelectedPayment(null);
                    }}
                    title="Freeze for City Ledger or Dispute"
                  >
                    <Snowflake className="size-4 mr-2" />
                    Freeze
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
