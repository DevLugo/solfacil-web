'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertCircle, FileImage } from 'lucide-react'
import { WeekSelector } from './components/WeekSelector'
import { LocationFilter } from './components/LocationFilter'
import { LoansList } from './components/LoansList'
import { DocumentsGallery } from './components/DocumentsGallery'
import { useDocumentManager } from './hooks/useDocumentManager'

/**
 * Cargar Documentos Page
 * Main page for managing loan documents by week and location
 * Optimized for mobile devices with low RAM
 */
export default function CargarDocumentosPage() {
  const {
    weekInfo,
    selectedLocation,
    selectedRouteId,
    loans,
    locations,
    loansLoading,
    locationsLoading,
    loansError,
    handleWeekChange,
    handleLocationChange,
    handleRouteChange,
    refetchLoans,
  } = useDocumentManager()

  const [selectedLoanId, setSelectedLoanId] = useState<string | null>(null)
  const [showDocumentsDialog, setShowDocumentsDialog] = useState(false)

  // Handle view documents button click (also used for uploading)
  const handleViewDocuments = (loanId: string) => {
    setSelectedLoanId(loanId)
    setShowDocumentsDialog(true)
  }

  // Handle upload success
  const handleUploadSuccess = () => {
    refetchLoans()
  }

  // Get selected loan info
  const selectedLoan = loans.find((loan: { id: string }) => loan.id === selectedLoanId)

  return (
    <div className="w-full mx-auto py-4 md:py-6 px-4 md:px-4 md:max-w-4xl"  style={{maxWidth: '100vw', overflowX: 'hidden'}}>
      <div className="space-y-4 md:space-y-6 w-full" style={{maxWidth: '100%'}}>
        {/* Page Header */}
        <div className="flex items-center gap-3">
          <FileImage className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cargar Documentos</h1>
            <p className="text-muted-foreground">
              Carga y valida documentos de préstamos por semana y localidad
            </p>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>
              Selecciona la semana para ver los préstamos. Opcionalmente filtra por ruta y localidad.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Week Selector */}
            <div>
              <WeekSelector
                year={weekInfo.year}
                weekNumber={weekInfo.weekNumber}
                onChange={handleWeekChange}
                disabled={loansLoading}
              />
            </div>

            {/* Location Filter */}
            <div>
              <LocationFilter
                selectedRouteId={selectedRouteId}
                selectedLocationId={selectedLocation}
                locations={locations}
                onRouteChange={handleRouteChange}
                onLocationChange={handleLocationChange}
                locationsLoading={locationsLoading}
                disabled={loansLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {loansError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Error al cargar los préstamos. Por favor intenta de nuevo.
            </AlertDescription>
          </Alert>
        )}

        {/* Loans List */}
        <Card className="w-full" style={{maxWidth: '100%', overflow: 'hidden', boxSizing: 'border-box'}}>
          <CardHeader className="px-3 md:px-6 w-full" style={{boxSizing: 'border-box'}}>
            <CardTitle>Préstamos</CardTitle>
            <CardDescription>
              Préstamos de la semana {weekInfo.weekNumber}, {weekInfo.year}
              {selectedLocation && locations.find((l: { id: string }) => l.id === selectedLocation) &&
                ` - ${locations.find((l: { id: string; name?: string }) => l.id === selectedLocation)?.name}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 md:px-6 w-full" style={{maxWidth: '100%', boxSizing: 'border-box'}}>
            <LoansList
              loans={loans}
              loading={loansLoading}
              onViewDocuments={handleViewDocuments}
            />
          </CardContent>
        </Card>
      </div>

      {/* Documents Dialog - Unified for viewing and uploading */}
      <Dialog open={showDocumentsDialog} onOpenChange={setShowDocumentsDialog}>
        <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[90vh] overflow-y-auto p-3 md:p-6">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base md:text-lg">Documentos del Préstamo</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">
              {selectedLoan && (
                <>
                  Cliente: {selectedLoan.borrower?.personalData?.fullName}
                  {' • '}
                  Monto: ${selectedLoan.amountGived}
                  {' • '}
                  Fecha: {new Date(selectedLoan.signDate).toLocaleDateString('es-MX')}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedLoan && (
            <DocumentsGallery
              loan={selectedLoan}
              onUploadSuccess={handleUploadSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
