import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePms } from '@/lib/pms-store'
import { useSettings } from '@/lib/use-settings'
import { inr } from '@/lib/pms-data'
import { toast } from 'sonner'
import { PiggyBank, Plus, CheckCircle2, XCircle, Lock, User, FileText, ArrowRight, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react'

export const Route = createFileRoute('/_shell/discounts')({
  component: DiscountsPage,
})

function DiscountsPage() {
  const { discounts, reservations, guests, rooms, requestDiscount, resolveDiscount, session } = usePms();
  const { settings, updatePolicySettings } = useSettings();
  const [open, setOpen] = React.useState(false);
  const [resId, setResId] = React.useState("");
  const [percent, setPercent] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [resolvingId, setResolvingId] = React.useState<string | null>(null);

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
    if (submitting) return;
    const amt = parseFloat(amount);
    if (!resId) return toast.error("Please select a reservation");
    if (isNaN(amt) || amt <= 0) return toast.error("Please enter a valid discount percentage or amount");
    if (!reason.trim()) return toast.error("Please provide a reason for the discount");

    const reasonWithPercent = percent ? `${reason.trim()} (${percent}% off)` : reason.trim();
    setSubmitting(true);
    try {
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
    } finally {
      setSubmitting(false);
    }
  };

  const handleResolve = async (dId: string, status: "APPROVED" | "REJECTED", originalTotal: number, newPayable: number) => {
    if (resolvingId === dId) return;
    setResolvingId(dId);
    try {
      const r = await resolveDiscount(dId, status);
      if (r?.success) {
        if (status === "APPROVED") {
          toast.success(`Discount approved! New folio amount updated to ${inr(newPayable)}`);
        } else {
          toast.info(`Discount rejected. Original amount (${inr(originalTotal)}) restored and folio unfrozen.`);
        }
      } else {
        toast.error(r?.error || "Action failed to execute. Please check permissions.");
      }
    } finally {
      setResolvingId(null);
    }
  };

  const getReservation = (id: string) => reservations.find(r => r.id === id || (r.id && id && r.id.toLowerCase() === id.toLowerCase()));
  const getGuestName = (guestId?: string) => guests.find(g => g.id === guestId)?.name || "Guest";
  const getRoomNumber = (roomId?: string) => rooms.find(r => r.id === roomId)?.room_number || "Room";

  const isSuperAdmin = session?.role === 'SUPER_ADMIN' || !session;
  const isGM = session?.role === 'GM';
  const isFrontDesk = session?.role === 'FRONT_DESK';

  const canApprove = isSuperAdmin || 
    (isGM && Boolean(settings.allowGmDiscountApproval)) || 
    (isFrontDesk && Boolean(settings.allowFrontDeskDiscountApproval));

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Finance"
        title="Discounts & Adjustments" 
        subtitle="Request, review, and approve rate adjustments in real-time"
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-xl bg-brass text-gold-foreground hover:opacity-90 shadow-brass font-medium">
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
                    <span className="font-bold text-sm text-foreground">{inr(totalBill)}</span>
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
                  disabled={submitting}
                  className="w-full bg-brass text-gold-foreground hover:opacity-90 mt-2 font-medium"
                  onClick={handleSubmit}
                >
                  {submitting ? "Submitting Request..." : "Submit Discount Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Super Admin Approval Governance Panel */}
      {isSuperAdmin && (
        <Panel
          title="Approval Governance & Access Permissions"
          description="Control which staff roles are allowed to review, approve, or reject discount adjustments"
          className="border-gold/30 bg-gradient-to-r from-gold/5 via-card to-card"
        >
          <div className="grid gap-4 sm:grid-cols-2 pt-2">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-secondary/30">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="size-4 text-gold" />
                  General Manager (GM) Approval
                </div>
                <div className="text-xs text-muted-foreground">
                  Allow General Managers to approve & reject discount requests
                </div>
              </div>
              <Switch
                checked={Boolean(settings.allowGmDiscountApproval)}
                onCheckedChange={(val) => {
                  updatePolicySettings({ allowGmDiscountApproval: val });
                  toast.success(`GM Discount Approval ${val ? "Enabled" : "Disabled"}`);
                }}
              />
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-secondary/30">
              <div className="space-y-0.5">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  <KeyRound className="size-4 text-gold" />
                  Front Desk Staff Approval
                </div>
                <div className="text-xs text-muted-foreground">
                  Allow Front Desk operators to approve & reject discount requests
                </div>
              </div>
              <Switch
                checked={Boolean(settings.allowFrontDeskDiscountApproval)}
                onCheckedChange={(val) => {
                  updatePolicySettings({ allowFrontDeskDiscountApproval: val });
                  toast.success(`Front Desk Discount Approval ${val ? "Enabled" : "Disabled"}`);
                }}
              />
            </div>
          </div>
        </Panel>
      )}

      {!canApprove && (
        <div className="rounded-xl border border-border/80 bg-secondary/20 p-4 flex items-center gap-3">
          <ShieldAlert className="size-5 text-warning shrink-0" />
          <div className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Super Admin Approval Required:</span> Your current role ({session?.role || "Staff"}) can request rate discounts using the button above. All requested discounts are routed to Super Admin for real-time review and authorization before applying to guest folios.
          </div>
        </div>
      )}

      {canApprove && (
        <Panel 
          title="Pending Approvals" 
          description="Review and approve discount requests before they apply to the folio"
          className="p-0 overflow-hidden"
          bodyClassName="p-0"
        >
          {/* Mobile Card View */}
          <div className="block md:hidden divide-y divide-border">
            {pending.map((d) => {
              const res = getReservation(d.reservation_id);
              const guest = res ? getGuestName(res.guest_id) : "Unknown Guest";
              const originalTotal = Number(res?.base_amount) || 0;
              const discountAmt = Number(d.requested_amount) || 0;
              const newPayable = Math.max(0, originalTotal - discountAmt);
              const isResolving = resolvingId === d.id;

              return (
                <div key={d.id} className="p-4 space-y-3.5 bg-card/60">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-sm text-foreground">{guest}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        Folio: #{String(d.reservation_id || '').slice(0, 10).toUpperCase()}
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold bg-secondary px-2 py-0.5 rounded text-foreground">
                      By: {d.requested_by || "Staff"}
                    </span>
                  </div>

                  <div className="rounded-xl border border-border/80 bg-secondary/30 p-3 space-y-2">
                    <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                      <FileText className="size-3.5 text-gold shrink-0" />
                      <span>{d.reason}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                      <div>
                        <div className="text-[10px] text-muted-foreground">Original Folio</div>
                        <div className="line-through text-muted-foreground">{inr(originalTotal)}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-[10px] text-destructive">Discount</div>
                        <div className="font-bold text-destructive">- {inr(discountAmt)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-gold font-semibold">New Payable</div>
                        <div className="font-bold text-gold text-sm">{inr(newPayable)}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-[10px] font-medium text-warning">
                      <Lock className="size-3" />
                      <span>Folio payment frozen until approval</span>
                    </div>
                  </div>

                  {/* Actions Full Width for Mobile */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isResolving}
                      className="w-full rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10 text-xs font-semibold h-9"
                      onClick={() => handleResolve(d.id, "REJECTED", originalTotal, newPayable)}
                    >
                      <XCircle className="size-3.5 mr-1" />
                      {isResolving ? "Processing..." : "Reject"}
                    </Button>

                    <Button
                      size="sm"
                      disabled={isResolving}
                      className="w-full rounded-xl bg-brass text-gold-foreground hover:opacity-90 text-xs font-bold shadow-brass h-9"
                      onClick={() => handleResolve(d.id, "APPROVED", originalTotal, newPayable)}
                    >
                      <CheckCircle2 className="size-3.5 mr-1" />
                      {isResolving ? "Approving..." : `Approve (${inr(newPayable)})`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
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
                  const originalTotal = Number(res?.base_amount) || 0;
                  const discountAmt = Number(d.requested_amount) || 0;
                  const newPayable = Math.max(0, originalTotal - discountAmt);
                  const isResolving = resolvingId === d.id;

                  return (
                    <TableRow key={d.id} className="bg-warning/5">
                      <TableCell className="font-medium">
                        <div className="font-semibold">{guest}</div>
                        <div className="text-xs text-muted-foreground font-mono">Folio: {String(d.reservation_id || '').slice(0, 10).toUpperCase()}</div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs font-medium bg-secondary px-2 py-1 rounded">{d.requested_by || "Staff"}</span>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{d.reason}</div>
                        <div className="text-[11px] text-warning font-semibold mt-0.5">🔒 Folio Payment FROZEN</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-muted-foreground line-through">{inr(originalTotal)}</div>
                        <div className="font-bold text-success">- {inr(discountAmt)}</div>
                        <div className="text-xs font-semibold text-gold mt-0.5">New Total: {inr(newPayable)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isResolving}
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleResolve(d.id, "REJECTED", originalTotal, newPayable)}
                          >
                            {isResolving ? "..." : "Reject"}
                          </Button>
                          <Button
                            size="sm"
                            disabled={isResolving}
                            className="bg-brass text-gold-foreground hover:opacity-90 font-medium"
                            onClick={() => handleResolve(d.id, "APPROVED", originalTotal, newPayable)}
                          >
                            {isResolving ? "Approving..." : `Approve (${inr(newPayable)})`}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {!pending.length && (
             <div className="p-6">
               <EmptyState title="No pending requests" body="All discount requests have been processed." icon={PiggyBank} />
             </div>
          )}
        </Panel>
      )}

      <Panel title="Discount Audit History" description="Historical log of approved and rejected discounts" className="p-0 overflow-hidden" bodyClassName="p-0">
        <div className="overflow-x-auto">
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
        </div>
        {!history.length && (
          <div className="p-6">
            <EmptyState title="No history" body="No discounts have been processed yet." icon={PiggyBank} />
          </div>
        )}
      </Panel>
    </div>
  )
}
