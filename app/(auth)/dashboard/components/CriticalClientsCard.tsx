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
import { Skull, ChevronRight, Copy, Check, Filter } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
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

interface CriticalClientsCardProps {
  clients: CriticalClient[]
  totalPendingAmount: string
  weeksWithoutPayment: number
  onWeeksChange: (weeks: number) => void
}

export function CriticalClientsCard({
  clients,
  totalPendingAmount,
  weeksWithoutPayment,
  onWeeksChange,
}: CriticalClientsCardProps) {
  const [showModal, setShowModal] = useState(false)
  const [selectedRoute, setSelectedRoute] = useState<string>('all')
  const [isCopying, setIsCopying] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const tableRef = useRef<HTMLDivElement>(null)

  const previewClients = clients.slice(0, 3)

  const weeksOptions = [
    { value: 3, label: '3 semanas' },
    { value: 4, label: '4 semanas' },
    { value: 5, label: '5 semanas' },
    { value: 6, label: '6 semanas' },
    { value: 8, label: '8+ semanas' },
  ]

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

  // Filter clients by selected route and sort by locality
  const filteredClients = useMemo(() => {
    const filtered = selectedRoute === 'all'
      ? clients
      : clients.filter((client) => client.lead.route === selectedRoute)

    // Sort by locality name
    return [...filtered].sort((a, b) => {
      const localityA = a.lead.locality || 'ZZZ' // Put empty localities at the end
      const localityB = b.lead.locality || 'ZZZ'
      return localityA.localeCompare(localityB, 'es')
    })
  }, [clients, selectedRoute])

  // Calculate filtered total
  const filteredTotal = useMemo(() => {
    return filteredClients.reduce(
      (sum, client) => sum + parseFloat(client.pendingAmountStored || '0'),
      0
    )
  }, [filteredClients])

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

  if (clients.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Skull className="h-5 w-5" />
              CV Criticos
            </CardTitle>
            <Select
              value={weeksWithoutPayment.toString()}
              onValueChange={(val) => onWeeksChange(parseInt(val))}
            >
              <SelectTrigger className="w-[130px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {weeksOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value.toString()}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Skull className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">Sin clientes con {weeksWithoutPayment} sem sin pago</p>
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
              CV Criticos
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={weeksWithoutPayment.toString()}
                onValueChange={(val) => onWeeksChange(parseInt(val))}
              >
                <SelectTrigger className="w-[100px] sm:w-[130px] h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {weeksOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value.toString()}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="destructive" className="whitespace-nowrap">{clients.length}</Badge>
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300 whitespace-nowrap text-xs">
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
            onClick={() => setShowModal(true)}
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
              <span>CV Criticos ({weeksWithoutPayment} sem)</span>
              <Badge variant="outline" className="ml-2">
                {filteredClients.length} clientes
              </Badge>
              <Badge variant="outline" className="bg-red-100 text-red-700 border-red-300">
                {formatCurrency(filteredTotal)} pendiente
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Filters and Actions Bar */}
          <div className="flex items-center justify-between gap-4 py-2 border-b">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={selectedRoute} onValueChange={setSelectedRoute}>
                <SelectTrigger className="w-[180px] h-9">
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
                  Copiar como imagen
                </>
              )}
            </Button>
          </div>

          {/* Table with ref for image capture */}
          <div ref={tableRef} className="bg-white p-4 rounded-lg">
            <div className="text-center mb-4 pb-2 border-b">
              <h3 className="font-bold text-lg">CV Críticos - {weeksWithoutPayment} semanas sin pago</h3>
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
                      <TableCell className="text-right font-bold text-red-600">
                        {formatCurrency(client.pendingAmountStored)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            client.weeksWithoutPayment >= 8
                              ? 'bg-red-100 text-red-700 border-red-300'
                              : 'bg-amber-100 text-amber-700 border-amber-300'
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
