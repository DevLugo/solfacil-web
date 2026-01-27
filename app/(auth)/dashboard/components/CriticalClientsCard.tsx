'use client'

import { useState, useRef, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Skull, ChevronRight, Copy, Check, Filter, FileDown, Loader2 } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { getApiBaseUrl } from '@/lib/constants/api'
import html2canvas from 'html2canvas'

interface CriticalClientPayment {
  receivedAt: string | null
  amount: string
}

interface CriticalClient {
  id: string
  pendingAmountStored: string
  weeksWithoutPayment: number
  borrower: {
    fullName: string
    clientCode: string
  }
  lead: {
    fullName: string
    locality: string
    route: string
  }
  payments: CriticalClientPayment[]
}

// Week filter options - more flexible ranges
type WeekFilterOption = 'all' | '3' | '4' | '5' | '6' | '1-3' | '4-6' | '7+'

const WEEK_FILTER_OPTIONS: { value: WeekFilterOption; label: string }[] = [
  { value: 'all', label: 'Todas las semanas' },
  { value: '3', label: 'Semana 3' },
  { value: '4', label: 'Semana 4' },
  { value: '5', label: 'Semana 5' },
  { value: '6', label: 'Semana 6' },
  { value: '1-3', label: 'Semanas 1-3' },
  { value: '4-6', label: 'Semanas 4-6' },
  { value: '7+', label: 'Semanas 7+' },
]

// Filter clients by week selection
function filterByWeeks(clients: CriticalClient[], filter: WeekFilterOption): CriticalClient[] {
  if (filter === 'all') return clients

  return clients.filter(client => {
    const weeks = client.weeksWithoutPayment
    switch (filter) {
      case '3': return weeks === 3
      case '4': return weeks === 4
      case '5': return weeks === 5
      case '6': return weeks === 6
      case '1-3': return weeks >= 1 && weeks <= 3
      case '4-6': return weeks >= 4 && weeks <= 6
      case '7+': return weeks >= 7
      default: return true
    }
  })
}

// Helper to get the last payment date
function getLastPaymentDate(payments: CriticalClientPayment[]): string | null {
  if (!payments || payments.length === 0) return null

  // Find the most recent payment with a date
  const sortedPayments = [...payments]
    .filter(p => p.receivedAt)
    .sort((a, b) => new Date(b.receivedAt!).getTime() - new Date(a.receivedAt!).getTime())

  return sortedPayments.length > 0 ? sortedPayments[0].receivedAt : null
}

// Format date for display
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Sin pagos'
  const date = new Date(dateStr)
  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

// Get week filter label for display
function getWeekFilterLabel(filter: WeekFilterOption): string {
  const option = WEEK_FILTER_OPTIONS.find(o => o.value === filter)
  return option?.label || 'Todas'
}

interface CriticalClientsCardProps {
  clients: CriticalClient[]  // All critical clients (3+ weeks without payment)
  totalPendingAmount: string
}

export function CriticalClientsCard({
  clients,
  totalPendingAmount,
}: CriticalClientsCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<string>('all')
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<WeekFilterOption>('all')
  const [isCopying, setIsCopying] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  // Preview: show top 3 clients with most weeks without payment
  const previewClients = useMemo(() => {
    return [...clients]
      .sort((a, b) => b.weeksWithoutPayment - a.weeksWithoutPayment)
      .slice(0, 3)
  }, [clients])

  // Get unique routes from clients
  const availableRoutes = useMemo(() => {
    const routes = new Set<string>()
    clients.forEach((client) => {
      if (client.lead.route) {
        routes.add(client.lead.route)
      }
    })
    return Array.from(routes).sort()
  }, [clients])

  // Filter clients by week filter and route, then sort by locality
  const filteredClients = useMemo(() => {
    // First filter by weeks
    let filtered = filterByWeeks(clients, selectedWeekFilter)

    // Then filter by route
    if (selectedRoute !== 'all') {
      filtered = filtered.filter((client) => client.lead.route === selectedRoute)
    }

    // Sort by locality name
    return [...filtered].sort((a, b) => {
      const localityA = a.lead.locality || 'ZZZ' // Put empty localities at the end
      const localityB = b.lead.locality || 'ZZZ'
      return localityA.localeCompare(localityB, 'es')
    })
  }, [clients, selectedRoute, selectedWeekFilter])

  // Calculate filtered total
  const filteredTotal = useMemo(() => {
    return filteredClients.reduce(
      (sum, client) => sum + parseFloat(client.pendingAmountStored || '0'),
      0
    )
  }, [filteredClients])

  // Reset filters when modal opens
  const handleOpenModal = () => {
    setSelectedWeekFilter('all')
    setSelectedRoute('all')
    setShowModal(true)
  }

  // Copy table as image to clipboard
  const handleCopyAsImage = async () => {
    if (!tableRef.current || isCopying) return

    setIsCopying(true)
    setCopySuccess(false)

    try {
      const canvas = await html2canvas(tableRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        logging: false,
        useCORS: true,
      })

      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob }),
            ])
            setCopySuccess(true)
            setTimeout(() => setCopySuccess(false), 2000)
          } catch {
            // Fallback: download the image
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `cv-criticos-${new Date().toISOString().split('T')[0]}.png`
            a.click()
            URL.revokeObjectURL(url)
            setCopySuccess(true)
            setTimeout(() => setCopySuccess(false), 2000)
          }
        }
        setIsCopying(false)
      }, 'image/png')
    } catch {
      setIsCopying(false)
    }
  }

  // Export to PDF
  const handleExportPDF = async () => {
    if (isExportingPDF || filteredClients.length === 0) return

    setIsExportingPDF(true)

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/export-critical-clients-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clients: filteredClients,
          totalPendingAmount: filteredTotal.toString(),
          weekFilter: getWeekFilterLabel(selectedWeekFilter),
          routeFilter: selectedRoute !== 'all' ? selectedRoute : undefined,
        }),
      })

      if (!response.ok) {
        throw new Error('Error al generar PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url

      // Get filename from Content-Disposition header or generate one
      const contentDisposition = response.headers.get('Content-Disposition')
      let filename = `cv_criticos_${new Date().toISOString().split('T')[0]}.pdf`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match) filename = decodeURIComponent(match[1])
      }

      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error exporting PDF:', error)
    } finally {
      setIsExportingPDF(false)
    }
  }

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Skull className="h-5 w-5" />
              CV Críticos
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Skull className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Sin clientes en cartera vencida crítica</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader className="pb-3 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Skull className="h-5 w-5 text-red-600 shrink-0" />
              CV Críticos
              <Badge variant="outline" className="text-xs font-normal">
                3+ sem
              </Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="destructive" className="whitespace-nowrap">{clients.length}</Badge>
              <Badge variant="outline" className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800 whitespace-nowrap text-xs">
                {formatCurrency(totalPendingAmount)}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-2">
            {previewClients.map((client) => (
              <div
                key={client.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg bg-muted/50"
              >
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">{client.borrower.fullName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {client.lead.route} - {client.lead.locality}
                  </p>
                </div>
                <div className="text-left sm:text-right flex items-center gap-2 sm:block">
                  <p className="font-bold text-red-600 dark:text-red-400 text-sm">
                    {formatCurrency(client.pendingAmountStored)}
                  </p>
                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {client.weeksWithoutPayment} sem
                  </Badge>
                </div>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            className="w-full mt-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleOpenModal}
          >
            Ver todos ({clients.length})
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 flex-wrap">
              <Skull className="h-5 w-5 text-red-600" />
              <span>CV Críticos</span>
              <Badge variant="outline" className="ml-2">
                {filteredClients.length} clientes
              </Badge>
              <Badge variant="outline" className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800">
                {formatCurrency(filteredTotal)} pendiente
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Filters and Actions Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 py-2 border-b">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />

              {/* Week Filter - NEW */}
              <Select
                value={selectedWeekFilter}
                onValueChange={(val) => setSelectedWeekFilter(val as WeekFilterOption)}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Filtrar por semanas" />
                </SelectTrigger>
                <SelectContent>
                  {WEEK_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Route Filter */}
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="Filtrar por ruta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las rutas</SelectItem>
                  {availableRoutes.map((route) => (
                    <SelectItem key={route} value={route}>
                      {route}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPDF}
                disabled={isExportingPDF || filteredClients.length === 0}
                className="gap-2"
              >
                {isExportingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <FileDown className="h-4 w-4" />
                    Exportar PDF
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyAsImage}
                disabled={isCopying}
                className="gap-2"
              >
                {copySuccess ? (
                  <>
                    <Check className="h-4 w-4 text-green-600" />
                    Copiado
                  </>
                ) : isCopying ? (
                  <>
                    <Copy className="h-4 w-4 animate-pulse" />
                    Copiando...
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar imagen
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Table with ref for image capture */}
          <div ref={tableRef} className="bg-background p-4 rounded-lg border">
            <div className="text-center mb-4 pb-2 border-b">
              <h3 className="font-bold text-lg">CV Críticos - {getWeekFilterLabel(selectedWeekFilter)}</h3>
              <p className="text-sm text-muted-foreground">
                {filteredClients.length} clientes | {formatCurrency(filteredTotal)} pendiente
                {selectedRoute !== 'all' && ` | ${selectedRoute}`}
              </p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Ruta</TableHead>
                  <TableHead>Localidad</TableHead>
                  <TableHead className="text-right">Pendiente</TableHead>
                  <TableHead className="text-center">Sem</TableHead>
                  <TableHead>Último Pago</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => {
                  const lastPayment = getLastPaymentDate(client.payments)
                  return (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{client.borrower.fullName}</p>
                          <p className="text-xs text-muted-foreground">{client.borrower.clientCode}</p>
                        </div>
                      </TableCell>
                      <TableCell>{client.lead.route}</TableCell>
                      <TableCell>{client.lead.locality}</TableCell>
                      <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                        {formatCurrency(client.pendingAmountStored)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            client.weeksWithoutPayment >= 8
                              ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800'
                          )}
                        >
                          {client.weeksWithoutPayment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(lastPayment)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
