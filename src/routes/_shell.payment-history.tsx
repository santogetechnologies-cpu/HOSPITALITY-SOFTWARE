import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader, Panel, Pill, EmptyState } from '@/components/pms/bits'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePms } from '@/lib/pms-store'
import { inr } from '@/lib/pms-data'
import { Banknote } from 'lucide-react'

export const Route = createFileRoute('/_shell/payment-history')({
  component: PaymentHistoryPage,
})

function PaymentHistoryPage() {
  const { payments, reservations, guests } = usePms();

  const history = payments.filter(p => p.status === 'COMPLETED');

  const getReservation = (id: string) => reservations.find(r => r.id === id);
  const getGuest = (id: string) => guests.find(g => g.id === id);

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        eyebrow="Finance"
        title="Payment History" 
        subtitle="Audit log of all completed and settled payments"
      />

      <Panel bodyClassName="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Folio ID</TableHead>
              <TableHead>Guest</TableHead>
              <TableHead>Collected</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((p) => {
              const res = getReservation(p.reservation_id);
              const guest = res ? getGuest(res.guest_id) : null;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-xs">{p.id.slice(0,8).toUpperCase()}</TableCell>
                  <TableCell>{guest?.name || "Unknown"}</TableCell>
                  <TableCell className="font-semibold">{inr(p.paid_amount || 0)}</TableCell>
                  <TableCell>
                    <Pill tone="success">{p.status}</Pill>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!history.length && (
          <div className="p-6">
            <EmptyState title="No History" body="No payments have been completed yet." icon={Banknote} />
          </div>
        )}
      </Panel>
    </div>
  )
}
