'use client'

import { useState } from 'react'
import {
  LayoutDashboard,
  DollarSign,
  CreditCard,
  Receipt,
  ArrowLeftRight,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TransactionProvider,
  TransactionSelectors,
  ResumenTab,
  AbonosTab,
  CreditosTab,
  GastosTab,
  TransferenciasTab,
} from '@/components/features/transactions'

export default function TransaccionesPage() {
  const [activeTab, setActiveTab] = useState('resumen')

  return (
    <TransactionProvider>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operaciones del Día</h1>
          <p className="text-muted-foreground">
            Centro de operaciones para registro de cobranza, créditos, gastos y transferencias
          </p>
        </div>

        {/* Selectors Bar */}
        <TransactionSelectors />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
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
      </div>
    </TransactionProvider>
  )
}
