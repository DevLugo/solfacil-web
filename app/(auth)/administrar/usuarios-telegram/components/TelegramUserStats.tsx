'use client'

import { useQuery } from '@apollo/client'
import { Users, UserCheck, UserX, Link2, Bell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { GET_TELEGRAM_USER_STATS } from '../../notificaciones-telegram/queries'
import type { TelegramUserStats as StatsType } from '../../notificaciones-telegram/types'

export function TelegramUserStats() {
  const { data, loading } = useQuery<{ telegramUserStats: StatsType }>(GET_TELEGRAM_USER_STATS)

  const stats = data?.telegramUserStats

  const statItems = [
    {
      label: 'Total Usuarios',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      label: 'Activos',
      value: stats?.activeUsers ?? 0,
      icon: UserCheck,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      label: 'Inactivos',
      value: stats?.inactiveUsers ?? 0,
      icon: UserX,
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      label: 'Vinculados',
      value: stats?.linkedToPlataform ?? 0,
      icon: Link2,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      label: 'Reciben Reportes',
      value: stats?.inRecipientsList ?? 0,
      icon: Bell,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ]

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {statItems.map((item) => (
        <Card key={item.label}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-lg p-2 ${item.bgColor}`}>
                <item.icon className={`h-5 w-5 ${item.color}`} />
              </div>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
