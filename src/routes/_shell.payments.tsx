import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { PageHeader, KpiCard, Panel, Pill } from '@/components/pms/bits'
import { usePms } from '@/lib/pms-store'
import { inr } from '@/lib/pms-data'
import { Banknote, CreditCard, Receipt, PiggyBank, ArrowRight } from 'lucide-react'

export const Route = createFileRoute('/_shell/payments')({
  component: PaymentsDashboard,
})

function PaymentsDashboard() {
  const { payments, expenses, session } = usePms();

  const totalCollected = payments.reduce((acc, p) => acc + (Number(p.paid_amount) || 0), 0);
  
  const pendingPayments = payments.filter(p => {
    const total = Number(p.total_amount) || 0;
    const paid = Number(p.paid_amount) || 0;
    return (total - paid) > 0 && p.status !== 'COMPLETED';
  });
  const totalPending = pendingPayments.reduce((acc, p) => acc + Math.max(0, (Number(p.total_amount) || 0) - (Number(p.paid_amount) || 0)), 0);

  const totalExpenses = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

  const frozenPayments = payments.filter(p => p.status === 'FROZEN');

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Finance"
        title="Payment Dashboard" 
        subtitle="Real-time overview of all property collections, pending folios, and petty cash"
        actions={<Pill tone="info">{pendingPayments.length} Pending Folios</Pill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard 
          label="Total Collected" 
          value={inr(totalCollected)} 
          icon={Banknote} 
          tone="success" 
          hint="All-time paid amount" 
        />
        <KpiCard 
          label="Total Pending" 
          value={inr(totalPending)} 
          icon={CreditCard} 
          tone="warning" 
          hint={`${pendingPayments.length} folios to collect`} 
        />
        <KpiCard 
          label="Total Expenses" 
          value={inr(totalExpenses)} 
          icon={Receipt} 
          tone="destructive" 
          hint={`${expenses.length} petty cash records`} 
        />
        <KpiCard 
          label="Frozen Accounts" 
          value={String(frozenPayments.length)} 
          icon={PiggyBank} 
          tone="info" 
          hint="City ledger & disputes" 
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Panel title="Action Required" description="Collections and approvals">
          <div className="flex flex-col gap-3 mt-4">
            <Link to="/pending-payments" className="group flex items-center justify-between rounded-xl border border-border p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="grid size-10 place-items-center rounded-full bg-warning/10 text-warning">
                  <CreditCard className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Pending Folios</h3>
                  <p className="text-sm text-muted-foreground">Collect balances for {pendingPayments.length} in-house or departed guests.</p>
                </div>
              </div>
              <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>

            {(session?.role === 'SUPER_ADMIN' || session?.role === 'GM') && (
              <Link to="/discounts" className="group flex items-center justify-between rounded-xl border border-border p-4 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="grid size-10 place-items-center rounded-full bg-info/10 text-info">
                    <PiggyBank className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Discount Approvals</h3>
                    <p className="text-sm text-muted-foreground">Review and approve requested discounts.</p>
                  </div>
                </div>
                <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </Link>
            )}
          </div>
        </Panel>

        <Panel title="Ledgers & History" description="Historical records and logs">
          <div className="flex flex-col gap-3 mt-4">
            <Link to="/payment-history" className="group flex items-center justify-between rounded-xl border border-border p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="grid size-10 place-items-center rounded-full bg-success/10 text-success">
                  <Banknote className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Payment History</h3>
                  <p className="text-sm text-muted-foreground">Audit log of all completed and settled payments.</p>
                </div>
              </div>
              <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>

            <Link to="/expenses" className="group flex items-center justify-between rounded-xl border border-border p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="grid size-10 place-items-center rounded-full bg-destructive/10 text-destructive">
                  <Receipt className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Expenses & Petty Cash</h3>
                  <p className="text-sm text-muted-foreground">Record daily payouts and operational costs.</p>
                </div>
              </div>
              <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </Panel>
      </div>
    </div>
  )
}
