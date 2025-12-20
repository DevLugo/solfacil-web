'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  DollarSign,
  CreditCard,
  Receipt,
  ArrowLeftRight,
  Database,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  TransactionProvider,
  TransactionSelectors,
  ResumenTab,
  AbonosTab,
  CreditosTab,
  GastosTab,
  TransferenciasTab,
  BulkDateMigrationModal,
} from '@/components/features/transactions'

export default function TransaccionesPage() {
  const [activeTab, setActiveTab] = useState('resumen')
  const [showMigrationModal, setShowMigrationModal] = useState(false)

  return (
    <TransactionProvider>
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Operaciones del Día</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              Centro de operaciones para registro de cobranza, créditos, gastos y transferencias
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMigrationModal(true)}
            className="gap-2 self-start sm:self-auto"
          >
            <Database className="h-4 w-4" />
            Migración de Fechas
          </Button>
        </div>

        {/* Selectors Bar */}
        <TransactionSelectors />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
          <TabsList className="grid w-full grid-cols-5 h-auto lg:w-auto lg:inline-grid">
            <TabsTrigger value="resumen" className="gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Resumen</span>
            </TabsTrigger>
            <TabsTrigger value="abonos" className="gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Abonos</span>
            </TabsTrigger>
            <TabsTrigger value="creditos" className="gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">Créditos</span>
            </TabsTrigger>
            <TabsTrigger value="gastos" className="gap-2">
              <Receipt className="h-4 w-4" />
              <span className="hidden sm:inline">Gastos</span>
            </TabsTrigger>
            <TabsTrigger value="transferencias" className="gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              <span className="hidden sm:inline">Transferencias</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-4">
            <ResumenTab />
          </TabsContent>

          <TabsContent value="abonos" className="space-y-4">
            <AbonosTab />
          </TabsContent>

          <TabsContent value="creditos" className="space-y-4">
            <CreditosTab />
          </TabsContent>

          <TabsContent value="gastos" className="space-y-4">
            <GastosTab />
          </TabsContent>

          <TabsContent value="transferencias" className="space-y-4">
            <TransferenciasTab />
          </TabsContent>
        </Tabs>

        {/* Bulk Date Migration Modal */}
        <BulkDateMigrationModal
          open={showMigrationModal}
          onOpenChange={setShowMigrationModal}
        />
      </div>
    </TransactionProvider>
  )
}
