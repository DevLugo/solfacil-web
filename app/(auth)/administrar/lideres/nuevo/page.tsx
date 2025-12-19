'use client'

import { UserPlus, MapPin } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useNewLeader } from './hooks/useNewLeader'
import { LeaderFormSection } from './components/LeaderFormSection'
import { LocationSection } from './components/LocationSection'
import { ExistingLeaderWarning } from './components/ExistingLeaderWarning'
import { ActionButtons } from './components/ActionButtons'
import { Skeleton } from '@/components/ui/skeleton'

function NewLeaderPageSkeleton() {
  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function NuevoLiderPage() {
  const {
    formData,
    locationFormData,
    existingLeader,
    showSuccess,
    showLocationForm,
    routes,
    locations,
    municipalities,
    routesLoading,
    locationsLoading,
    municipalitiesLoading,
    creatingLeader,
    creatingLocation,
    handleFormChange,
    handleLocationFormChange,
    handleClearForm,
    handleCreateLocation,
    handleSubmit,
    setShowLocationForm,
  } = useNewLeader()

  if (routesLoading || municipalitiesLoading) {
    return <NewLeaderPageSkeleton />
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <UserPlus className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Nuevo Líder</h1>
        </div>
        <p className="text-muted-foreground">
          Registra un nuevo líder de ruta para gestionar una localidad
        </p>
      </div>

      {showSuccess && (
        <Alert className="mb-6 border-green-500 bg-green-50 dark:bg-green-950">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-200">
            El líder ha sido creado exitosamente
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Leader Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Información Personal
            </CardTitle>
            <CardDescription>
              Completa los datos personales del nuevo líder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LeaderFormSection
              formData={formData}
              onChange={handleFormChange}
            />
          </CardContent>
        </Card>

        {/* Route and Location Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Ruta y Localidad
            </CardTitle>
            <CardDescription>
              Asigna la ruta y localidad donde operará el líder
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LocationSection
              formData={formData}
              locationFormData={locationFormData}
              routes={routes}
              locations={locations}
              municipalities={municipalities}
              showLocationForm={showLocationForm}
              locationsLoading={locationsLoading}
              creatingLocation={creatingLocation}
              onFormChange={handleFormChange}
              onLocationFormChange={handleLocationFormChange}
              onCreateLocation={handleCreateLocation}
              onToggleLocationForm={setShowLocationForm}
            />
          </CardContent>
        </Card>

        {/* Existing Leader Warning */}
        {existingLeader && (
          <ExistingLeaderWarning
            existingLeader={existingLeader}
            replaceExisting={formData.replaceExisting}
            onToggleReplace={(checked) => handleFormChange('replaceExisting', checked)}
          />
        )}

        {/* Action Buttons */}
        <ActionButtons
          onSubmit={handleSubmit}
          onClear={handleClearForm}
          isSubmitting={creatingLeader}
          canSubmit={Boolean(formData.fullName && formData.locationId && formData.routeId)}
        />
      </div>
    </div>
  )
}
