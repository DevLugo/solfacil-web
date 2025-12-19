'use client'

import { useState } from 'react'
import { Bell, Settings, History } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ReportConfigTab,
  NotificationHistoryTab,
} from './components'

export default function NotificacionesTelegramPage() {
  const [activeTab, setActiveTab] = useState('configuracion')

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Bell className="h-6 w-6" />
          Notificaciones Telegram
        </h1>
        <p className="text-muted-foreground">
          Configura reportes automaticos y revisa el historial de notificaciones
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[300px]">
          <TabsTrigger value="configuracion" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Configuracion</span>
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Historial</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="configuracion" className="mt-6">
          <ReportConfigTab />
        </TabsContent>

        <TabsContent value="historial" className="mt-6">
          <NotificationHistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
