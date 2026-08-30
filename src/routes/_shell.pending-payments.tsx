import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/pms/bits'

export const Route = createFileRoute('/_shell/pending-payments')({
  component: () => (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <PageHeader title="Pending Payments" subtitle="Unsettled balances across property" />
    </div>
  ),
})
