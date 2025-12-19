import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { useToast } from '@/hooks/use-toast'
import {
  GET_ROUTES,
  GET_LOCATIONS,
  GET_MUNICIPALITIES,
  CHECK_EXISTING_LEADER
} from '@/graphql/queries/leader'
import { CREATE_NEW_LEADER, CREATE_LOCATION } from '@/graphql/mutations/leader'
import type { LeaderFormData, LocationFormData, ExistingLeader } from '../types'
import { validateLocationFormData, convertDateToISO } from '../utils/validation'

const initialFormData: LeaderFormData = {
  fullName: '',
  birthDate: '',
  phone: '',
  locationId: '',
  routeId: '',
  replaceExisting: false
}

const initialLocationFormData: LocationFormData = {
  name: '',
  municipalityId: ''
}

export function useNewLeader() {
  const { toast } = useToast()
  const [formData, setFormData] = useState<LeaderFormData>(initialFormData)
  const [locationFormData, setLocationFormData] = useState<LocationFormData>(initialLocationFormData)
  const [existingLeader, setExistingLeader] = useState<ExistingLeader | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showLocationForm, setShowLocationForm] = useState(false)

  // Queries
  const { data: routesData, loading: routesLoading } = useQuery(GET_ROUTES)

  const { data: locationsData, loading: locationsLoading, refetch: refetchLocations } = useQuery(GET_LOCATIONS, {
    variables: { routeId: formData.routeId || undefined },
    skip: !formData.routeId
  })

  const { data: municipalitiesData, loading: municipalitiesLoading } = useQuery(GET_MUNICIPALITIES)

  const { refetch: checkExistingLeaderQuery } = useQuery(CHECK_EXISTING_LEADER, {
    skip: true
  })

  // Mutations
  const [createNewLeader, { loading: creatingLeader }] = useMutation(CREATE_NEW_LEADER)
  const [createLocation, { loading: creatingLocation }] = useMutation(CREATE_LOCATION)

  // Check for existing leader when location changes
  useEffect(() => {
    if (formData.locationId) {
      checkExistingLeaderQuery({ locationId: formData.locationId })
        .then((result) => {
          if (result.data?.checkExistingLeader) {
            setExistingLeader(result.data.checkExistingLeader)
            setFormData((prev) => ({ ...prev, replaceExisting: false }))
          } else {
            setExistingLeader(null)
            setFormData((prev) => ({ ...prev, replaceExisting: false }))
          }
        })
        .catch(() => {
          setExistingLeader(null)
        })
    } else {
      setExistingLeader(null)
      setFormData((prev) => ({ ...prev, replaceExisting: false }))
    }
  }, [formData.locationId, checkExistingLeaderQuery])

  // Handlers
  const handleFormChange = useCallback((field: keyof LeaderFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleLocationFormChange = useCallback((field: keyof LocationFormData, value: string) => {
    setLocationFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const handleClearForm = useCallback(() => {
    setFormData(initialFormData)
    setExistingLeader(null)
    setShowSuccess(false)
  }, [])

  const handleCreateLocation = useCallback(async () => {
    const missingFields = validateLocationFormData(locationFormData, formData.routeId)

    if (missingFields.length > 0) {
      toast({
        title: 'Campos incompletos',
        description: `Completa los siguientes campos obligatorios: ${missingFields.join(', ')}`,
        variant: 'destructive'
      })
      return
    }

    try {
      const result = await createLocation({
        variables: {
          input: {
            name: locationFormData.name.trim(),
            municipalityId: locationFormData.municipalityId,
            routeId: formData.routeId
          }
        }
      })

      if (result.data?.createLocation) {
        toast({
          title: 'Localidad creada',
          description: `La localidad "${locationFormData.name}" ha sido creada exitosamente`
        })

        // Refetch locations and select the new one
        await refetchLocations()
        setFormData((prev) => ({
          ...prev,
          locationId: result.data.createLocation.id
        }))

        // Clear location form and hide it
        setLocationFormData(initialLocationFormData)
        setShowLocationForm(false)
      }
    } catch (error) {
      console.error('Error creating location:', error)
      toast({
        title: 'Error',
        description: 'Error al crear la localidad. Por favor intenta de nuevo.',
        variant: 'destructive'
      })
    }
  }, [locationFormData, formData.routeId, createLocation, refetchLocations, toast])

  const handleSubmit = useCallback(async () => {
    // Validation
    if (!formData.fullName || !formData.locationId || !formData.routeId) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor completa todos los campos obligatorios (Nombre completo, Localidad, Ruta)',
        variant: 'destructive'
      })
      return
    }

    if (existingLeader && !formData.replaceExisting) {
      toast({
        title: 'Líder existente',
        description: `Ya existe un líder (${existingLeader.fullName}) en esta localidad. Marca la opción "Reemplazar líder existente" para continuar.`,
        variant: 'destructive'
      })
      return
    }

    try {
      const result = await createNewLeader({
        variables: {
          input: {
            fullName: formData.fullName,
            birthDate: formData.birthDate ? convertDateToISO(formData.birthDate) : null,
            phone: formData.phone || null,
            locationId: formData.locationId,
            routeId: formData.routeId,
            replaceExisting: formData.replaceExisting
          }
        }
      })

      const response = result.data?.createNewLeader

      if (response?.success) {
        toast({
          title: 'Líder creado exitosamente',
          description: response.message
        })

        setShowSuccess(true)
        setFormData(initialFormData)
        setExistingLeader(null)

        // Auto-hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false)
        }, 5000)
      } else {
        toast({
          title: 'Error',
          description: response?.message || 'Error al crear el líder',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error creating leader:', error)
      toast({
        title: 'Error',
        description: 'Error al crear el líder. Por favor intenta de nuevo.',
        variant: 'destructive'
      })
    }
  }, [formData, existingLeader, createNewLeader, toast])

  return {
    // Form state
    formData,
    locationFormData,
    existingLeader,
    showSuccess,
    showLocationForm,

    // Data
    routes: routesData?.routes || [],
    locations: locationsData?.locations || [],
    municipalities: municipalitiesData?.municipalities || [],

    // Loading states
    routesLoading,
    locationsLoading,
    municipalitiesLoading,
    creatingLeader,
    creatingLocation,

    // Actions
    handleFormChange,
    handleLocationFormChange,
    handleClearForm,
    handleCreateLocation,
    handleSubmit,
    setShowLocationForm,
  }
}
