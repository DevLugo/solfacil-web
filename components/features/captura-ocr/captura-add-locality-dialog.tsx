'use client'

import { useMemo, useState, useEffect } from 'react'
import { useQuery, useLazyQuery } from '@apollo/client'
import { Loader2, Plus, MapPin, Users } from 'lucide-react'

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'

import { CAPTURA_ROUTE_LEADS_QUERY, CAPTURA_LEAD_LOANS_QUERY } from '@/graphql/queries/captura'
import { useCapturaOcr } from './captura-ocr-context'
import type { CapturaLocalityResult, CapturaClient } from './types'

interface LeadPhone {
  id?: string
  number?: string
}

interface LeadLocation {
  id?: string
  name?: string
}

interface LeadAddress {
  id?: string
  location?: LeadLocation | null
}

interface LeadPersonalData {
  id?: string
  fullName?: string
  clientCode?: string
  addresses?: LeadAddress[] | null
}

interface LeadData {
  id: string
  personalData?: LeadPersonalData | null
}

interface LoanTypeData {
  id?: string
  name?: string
  weekDuration?: number | string
  rate?: number | string
  loanPaymentComission?: number | string
  loanGrantedComission?: number | string
}

interface LoanCollateral {
  id?: string
  fullName?: string
  phones?: LeadPhone[] | null
}

interface LoanBorrower {
  id?: string
  personalData?: {
    id?: string
    fullName?: string
    clientCode?: string
    phones?: LeadPhone[] | null
  } | null
}

interface LoanData {
  id: string
  requestedAmount?: number | string
  amountGived?: number | string
  signDate?: string
  expectedWeeklyPayment?: number | string
  totalPaid?: number | string
  comissionAmount?: number | string
  calculatedPendingAmount?: number | string | null
  pendingAmountStored?: number | string | null
  status?: string
  loantype?: LoanTypeData | null
  collaterals?: LoanCollateral[] | null
  borrower?: LoanBorrower | null
}

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0
  const n = typeof value === 'string' ? parseFloat(value) : value
  return Number.isFinite(n) ? n : 0
}

function buildManualLocality(
  lead: LeadData,
  loans: LoanData[],
  fecha: string,
): CapturaLocalityResult {
  const location = lead.personalData?.addresses?.[0]?.location || null
  const clientsList: CapturaClient[] = loans.map((loan, i) => {
    const pd = loan.borrower?.personalData || null
    const loantype = loan.loantype || null
    const firstCollateral = loan.collaterals?.[0] || null
    const collateralPhones = firstCollateral?.phones || []
    const borrowerPhones = pd?.phones || []
    const pendingBalance = toNumber(loan.calculatedPendingAmount ?? loan.pendingAmountStored)
    const totalPaid = toNumber(loan.totalPaid)
    const pendingStored = toNumber(loan.pendingAmountStored)

    return {
      pos: i + 1,
      loanId: loan.id,
      borrowerId: loan.borrower?.id || '',
      clientCode: pd?.clientCode || '',
      borrowerName: pd?.fullName || '',
      expectedWeeklyPayment: toNumber(loan.expectedWeeklyPayment),
      loanPaymentComission: toNumber(
        loantype?.loanPaymentComission ?? loan.comissionAmount,
      ),
      requestedAmount: toNumber(loan.requestedAmount),
      totalPaid,
      pendingBalance,
      totalDebtAcquired: pendingStored + totalPaid,
      loantypeId: loantype?.id || '',
      loantypeName: loantype?.name || '',
      weekDuration: Math.trunc(toNumber(loantype?.weekDuration)),
      rate: toNumber(loantype?.rate),
      loanGrantedComission: toNumber(loantype?.loanGrantedComission),
      collateralName: firstCollateral?.fullName || '',
      collateralPhone: collateralPhones[0]?.number || '',
      borrowerPhone: borrowerPhones[0]?.number || '',
    }
  })

  return {
    localidad: location?.name || 'SIN NOMBRE',
    leadId: lead.id,
    locationId: location?.id || '',
    fecha,
    totalClientes: clientsList.length,
    yaCaptured: false,
    confidence: 'HIGH',
    errores: [],
    duracionSegundos: 0,
    resumenInferior: {
      cobranzaBase: 0,
      cobranzaTotal: 0,
      tarifaComision: 0,
      comisionRegular: { clientes: 0, tarifa: 0, total: 0 },
      comisionCreditos: { cantidad: 0, tarifa: 0, total: 0 },
      comisionTotal: 0,
      adelantosCreditos: [],
      recuperados: [],
    },
    excepciones: [],
    creditos: [],
    clientsList,
  }
}

interface Props {
  jobId: string
  routeId: string
  fecha: string
  existingLeadIds: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CapturaAddLocalityDialog({
  jobId,
  routeId,
  fecha,
  existingLeadIds,
  open,
  onOpenChange,
}: Props) {
  const { addLocality } = useCapturaOcr()
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)

  const { data: leadsData, loading: leadsLoading } = useQuery(CAPTURA_ROUTE_LEADS_QUERY, {
    variables: { routeId },
    skip: !open || !routeId,
    fetchPolicy: 'cache-and-network',
  })

  const [fetchLoans, { data: loansData, loading: loansLoading }] = useLazyQuery(
    CAPTURA_LEAD_LOANS_QUERY,
    { fetchPolicy: 'network-only' },
  )

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedLeadId(null)
    }
  }, [open])

  const rawLeads: LeadData[] = leadsData?.employees || []
  const existingSet = useMemo(() => new Set(existingLeadIds), [existingLeadIds])
  const filteredLeads = useMemo(
    () => rawLeads.filter(l => !existingSet.has(l.id)),
    [rawLeads, existingSet],
  )

  const selectedLead = useMemo(
    () => filteredLeads.find(l => l.id === selectedLeadId) || null,
    [filteredLeads, selectedLeadId],
  )

  const loans: LoanData[] = useMemo(() => {
    const edges = loansData?.loans?.edges || []
    return edges.map((e: { node: LoanData }) => e.node)
  }, [loansData])

  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId)
    fetchLoans({ variables: { leadId } })
  }

  const handleAdd = () => {
    if (!selectedLead) return
    const locality = buildManualLocality(selectedLead, loans, fecha)
    addLocality(jobId, locality)
    onOpenChange(false)
  }

  const locationName = selectedLead?.personalData?.addresses?.[0]?.location?.name || 'SIN NOMBRE'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            Agregar localidad manualmente
          </DialogTitle>
          <DialogDescription>
            Selecciona un lider de la ruta cuya localidad no fue reconocida por el OCR.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {leadsLoading && (
            <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Cargando lideres de la ruta...
            </div>
          )}

          {!leadsLoading && filteredLeads.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              Todos los lideres de esta ruta ya estan agregados.
            </div>
          )}

          {!leadsLoading && filteredLeads.length > 0 && !selectedLead && (
            <Command className="rounded-md border">
              <CommandInput placeholder="Buscar lider o localidad..." className="h-9" />
              <CommandList className="max-h-64">
                <CommandEmpty className="py-4 text-xs text-center text-muted-foreground">
                  No se encontro ningun lider.
                </CommandEmpty>
                <CommandGroup>
                  {filteredLeads.map((lead) => {
                    const name = lead.personalData?.fullName || 'Sin nombre'
                    const locName = lead.personalData?.addresses?.[0]?.location?.name || 'Sin localidad'
                    return (
                      <CommandItem
                        key={lead.id}
                        value={`${name} ${locName}`}
                        onSelect={() => handleSelectLead(lead.id)}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="font-medium truncate">{name}</span>
                        <Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
                          <MapPin className="h-3 w-3" />
                          {locName}
                        </Badge>
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          )}

          {selectedLead && (
            <div className="rounded-md border bg-muted/30 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-0.5">
                    Lider seleccionado
                  </div>
                  <div className="font-semibold text-sm">
                    {selectedLead.personalData?.fullName || 'Sin nombre'}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="h-3 w-3" />
                    {locationName}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLeadId(null)}
                  className="h-7 text-xs"
                >
                  Cambiar
                </Button>
              </div>

              {loansLoading ? (
                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Cargando prestamos activos...
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Se agregara <strong>{locationName}</strong> con{' '}
                    <strong>{loans.length}</strong>{' '}
                    {loans.length === 1 ? 'cliente' : 'clientes'} (todos como REGULAR).
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleAdd}
            disabled={!selectedLead || loansLoading}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar localidad
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
