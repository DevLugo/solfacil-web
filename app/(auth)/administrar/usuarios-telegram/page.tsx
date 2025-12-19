'use client'

import { Send } from 'lucide-react'
import { TelegramUsersTable } from './components/TelegramUsersTable'
import { TelegramUserStats } from './components/TelegramUserStats'

export default function UsuariosTelegramPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Send className="h-6 w-6" />
          Usuarios Telegram
        </h1>
        <p className="text-muted-foreground">
          Vincula usuarios registrados desde el chatbot con usuarios de la plataforma
        </p>
      </div>

      {/* Stats */}
      <TelegramUserStats />

      {/* Table */}
      <TelegramUsersTable />
    </div>
  )
}
