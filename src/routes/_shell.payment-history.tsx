import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/pms/bits'

export const Route = createFileRoute('/_shell/payment-history')({
  component: () => (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <PageHeader title="Payment History" subtitle="Ledger of completed transactions" />
    </div>
  ),
})
