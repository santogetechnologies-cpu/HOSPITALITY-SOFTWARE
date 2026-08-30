import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageHeader } from '@/components/pms/bits'

export const Route = createFileRoute('/_shell/payments')({
  component: () => (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <PageHeader title="Payment Dashboard" subtitle="Overview of all property collections" />
    </div>
  ),
})
