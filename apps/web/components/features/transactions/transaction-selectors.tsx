'use client'

import { useEffect } from 'react'
import { useQuery, useLazyQuery } from '@apollo/client'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { CalendarIcon, MapPin, User, Loader2, X, Wallet, Building2, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { SearchableSelect } from '@/components/ui/searchable-select'
import type { SearchableSelectOption } from '@/components/ui/searchable-select'
import { useTransactionContext } from './transaction-context'
import { ROUTES_WITH_ACCOUNTS_QUERY } from '@/graphql/queries/transactions'
import { cn, formatCurrency } from '@/lib/utils'
import { gql } from '@apollo/client'

// Query para obtener líderes por ruta - incluye direcciones para mostrar localidad
const LEADS_BY_ROUTE_QUERY = gql`
  query LeadsByRoute($routeId: ID!) {
    employees(routeId: $routeId, type: LEAD) {
      id
      personalData {
        id
        fullName
        addresses {
          id
          location {
            id
            name
          }
        }
      }
    }
  }
`

interface Account {
  id: string
  name: string
  type: 'EMPLOYEE_CASH_FUND' | 'BANK' | 'MAIN_CASH_FUND' | string
  amount: string
  accountBalance: string
}

interface Route {
  id: string
  name: string
  accounts?: Account[]
}

interface Lead {
  id: string
  personalData?: {
    fullName: string
    addresses?: Array<{
      id: string
      location?: {
        id: string
        name: string
      } | null
    }>
  }
}

// Función para generar el label del líder como en el código original
function getLeadLabel(lead: Lead): string {
  const locality = lead.personalData?.addresses?.[0]?.location?.name || ''
  const fullName = lead.personalData?.fullName || 'Sin nombre'

  if (locality) {
    return `${locality} · (${fullName})`
  }
  return fullName
}

export function TransactionSelectors() {
  const {
    selectedRouteId,
    selectedLeadId,
    selectedDate,
    setSelectedRouteId,
    setSelectedLeadId,
    setSelectedLocationId,
    setSelectedLocationName,
    setSelectedDate,
  } = useTransactionContext()

  const { data: routesData, loading: routesLoading } = useQuery<{ routes: Route[] }>(ROUTES_WITH_ACCOUNTS_QUERY)

  // Usar useLazyQuery para cargar líderes
  const [getLeads, { data: leadsData, loading: leadsLoading, error: leadsError }] = useLazyQuery<{ employees: Lead[] }>(
    LEADS_BY_ROUTE_QUERY,
    {
      fetchPolicy: 'network-only',
    }
  )

  // Cargar líderes cuando cambia la ruta seleccionada
  useEffect(() => {
    if (selectedRouteId) {
      getLeads({ variables: { routeId: selectedRouteId } })
    }
  }, [selectedRouteId, getLeads])

  const routes = routesData?.routes || []
  const leads = leadsData?.employees || []
  const selectedRoute = routes.find(r => r.id === selectedRouteId)

  // Convert routes to SearchableSelect options
  const routeOptions: SearchableSelectOption[] = routes.map((route) => ({
    value: route.id,
    label: route.name,
  }))

  // Convert leads to SearchableSelect options
  const leadOptions: SearchableSelectOption[] = [
    { value: 'all', label: 'Todas las localidades' },
    ...leads.map((lead) => ({
      value: lead.id,
      label: getLeadLabel(lead),
    })),
  ]

  // Sort accounts: EMPLOYEE_CASH_FUND first, then BANK, then others
  const accounts = (selectedRoute?.accounts || []).slice().sort((a, b) => {
    const order: Record<string, number> = {
      'EMPLOYEE_CASH_FUND': 0,
      'BANK': 1,
    }
    const orderA = order[a.type] ?? 2
    const orderB = order[b.type] ?? 2
    return orderA - orderB
  })

  // Helper function to get account icon
  const getAccountIcon = (type: string) => {
    if (type === 'BANK') return <Building2 className="h-3.5 w-3.5" />
    if (type === 'EMPLOYEE_CASH_FUND') return <Wallet className="h-3.5 w-3.5" />
    return <DollarSign className="h-3.5 w-3.5" />
  }

  // Helper function to get account badge style
  const getAccountStyle = (type: string) => {
    if (type === 'BANK') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (type === 'EMPLOYEE_CASH_FUND') return 'bg-green-50 text-green-700 border-green-200'
    return 'bg-slate-50 text-slate-700 border-slate-200'
  }

  return (
    <div className="space-y-3">
      {/* Main Selectors Row */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg border">
        {/* Route Selector */}
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <SearchableSelect
            options={routeOptions}
            value={selectedRouteId}
            onValueChange={(value) => {
              setSelectedRouteId(value)
              setSelectedLeadId(null) // Reset lead when route changes
              setSelectedLocationId(null) // Reset location when route changes
              setSelectedLocationName(null)
            }}
            placeholder="Seleccionar ruta"
            searchPlaceholder="Buscar ruta..."
            emptyText="No se encontraron rutas"
            loading={routesLoading}
            className="w-[200px]"
          />
        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[200px] justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                {selectedDate ? (
                  format(selectedDate, "d 'de' MMMM, yyyy", { locale: es })
                ) : (
                  <span>Seleccionar fecha</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                initialFocus
                locale={es}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Localidad/Líder Selector (only shown when route is selected) */}
        {selectedRouteId && (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <SearchableSelect
              options={leadOptions}
              value={selectedLeadId || 'all'}
              onValueChange={(value) => {
                const leadId = value === 'all' ? null : value
                setSelectedLeadId(leadId)
                // Also set locationId and locationName from the selected lead
                const lead = leads.find((l) => l.id === leadId)
                const location = lead?.personalData?.addresses?.[0]?.location
                setSelectedLocationId(location?.id || null)
                setSelectedLocationName(location?.name || null)
              }}
              placeholder="Seleccionar localidad"
              searchPlaceholder="Buscar localidad..."
              emptyText="No hay localidades en esta ruta"
              loading={leadsLoading}
              className="w-[300px]"
            />
            {/* Botón para limpiar selección */}
            {selectedLeadId && (
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setSelectedLeadId(null)
                  setSelectedLocationId(null)
                  setSelectedLocationName(null)
                }}
                title="Limpiar localidad seleccionada"
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Current Selection Summary */}
        {selectedRouteId && (
          <div className="ml-auto text-sm text-muted-foreground">
            {selectedRoute?.name} •{' '}
            {format(selectedDate, "d MMM yyyy", { locale: es })}
          </div>
        )}
      </div>

      {/* Account Balances Row - shown when route is selected */}
      {selectedRouteId && accounts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-medium text-muted-foreground mr-1">Cuentas:</span>
          {accounts.map((account) => (
            <Badge
              key={account.id}
              variant="outline"
              className={cn('text-xs py-1 px-2 gap-1.5', getAccountStyle(account.type))}
            >
              {getAccountIcon(account.type)}
              <span className="font-medium">{account.name}</span>
              <span className="font-bold">{formatCurrency(parseFloat(account.amount || '0'))}</span>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
