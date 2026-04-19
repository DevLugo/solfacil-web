'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Users2 } from 'lucide-react'
import { PersonalDataTab } from './components/PersonalDataTab'
import { ActiveLoansTab } from './components/ActiveLoansTab'
import { ManualMergeTab } from './components/ManualMergeTab'

export default function DuplicadosPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Duplicados</CardTitle>
              <CardDescription>
                Detecta y fusiona registros duplicados en el sistema (PersonalData y préstamos
                activos).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="personal-data" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal-data">PersonalData</TabsTrigger>
          <TabsTrigger value="active-loans">Préstamos Activos</TabsTrigger>
          <TabsTrigger value="manual-merge">Fusión manual</TabsTrigger>
        </TabsList>

        <TabsContent value="personal-data">
          <PersonalDataTab />
        </TabsContent>

        <TabsContent value="active-loans">
          <ActiveLoansTab />
        </TabsContent>

        <TabsContent value="manual-merge">
          <ManualMergeTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
