'use client'

import { FileText } from 'lucide-react'
import {
  RouteSelector,
  LocalityGrid,
  GenerateActions,
  GenerateListadosSkeleton
} from './components'
import { useGenerateListados } from './hooks'

export default function GenerarListadosPage() {
  const {
    routes,
    localities,
    selectedRouteId,
    selectedLocalities,
    weekMode,
    routesLoading,
    localitiesLoading,
    isGenerating,
    setSelectedRouteId,
    setWeekMode,
    handleGeneratePDFs,
    toggleLocality,
    selectAll,
    selectNone
  } = useGenerateListados()

  if (routesLoading) {
    return <GenerateListadosSkeleton />
  }

  return (
    <div className="container max-w-5xl py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <FileText className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Generar Listados de Cobranza</h1>
        </div>
        <p className="text-muted-foreground">
          Genera PDFs semanales de cobranza por localidad para uso en campo
        </p>
      </div>

      <div className="space-y-6">
        {/* Step 1: Route Selection */}
        <RouteSelector
          routes={routes}
          value={selectedRouteId}
          onChange={setSelectedRouteId}
          loading={routesLoading}
        />

        {/* Step 2: Locality Selection (shown only when route is selected) */}
        {selectedRouteId && (
          <LocalityGrid
            localities={localities}
            selected={selectedLocalities}
            onToggle={toggleLocality}
            onSelectAll={selectAll}
            onSelectNone={selectNone}
            loading={localitiesLoading}
          />
        )}

        {/* Step 3: Generate Actions (shown only when route is selected and has localities) */}
        {selectedRouteId && localities.length > 0 && (
          <GenerateActions
            count={selectedLocalities.size}
            weekMode={weekMode}
            onWeekModeChange={setWeekMode}
            onGenerate={handleGeneratePDFs}
            isGenerating={isGenerating}
          />
        )}
      </div>
    </div>
  )
}
