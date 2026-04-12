'use client'

import { CapturaLocalitySummary } from './captura-locality-summary'
import { CapturaPaymentsTable } from './captura-payments-table'
import { CapturaCreditosTable } from './captura-creditos-table'
import { CapturaResumenEditor } from './captura-resumen-editor'
import type { CapturaLocalityResult, CapturaLoanType } from './types'

interface Props {
  jobId: string
  locality: CapturaLocalityResult
  loantypes: CapturaLoanType[]
}

export function CapturaLocalityPanel({ jobId, locality, loantypes }: Props) {
  return (
    <div className="space-y-4">
      {/* KPI summary */}
      <CapturaLocalitySummary locality={locality} />

      {/* Payments table (abonos) - main content */}
      <CapturaPaymentsTable
        jobId={jobId}
        locality={locality}
      />

      {/* Credits table */}
      <CapturaCreditosTable
        jobId={jobId}
        locality={locality}
        loantypes={loantypes}
      />

      {/* Resumen editor */}
      <CapturaResumenEditor
        jobId={jobId}
        locality={locality}
      />
    </div>
  )
}
