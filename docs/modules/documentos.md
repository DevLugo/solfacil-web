# Documentos - Documentacion del Modulo

## Descripcion General

El modulo de Documentos permite cargar, visualizar y validar documentos asociados a prestamos. Esta optimizado para uso en dispositivos moviles con recursos limitados.

**Ruta**: `/documentos/cargar`
**Archivo Principal**: `app/(auth)/documentos/cargar/page.tsx`

---

## Componentes

| Componente | Archivo | Descripcion |
|------------|---------|-------------|
| WeekSelector | `components/WeekSelector.tsx` | Selector de semana |
| LocationFilter | `components/LocationFilter.tsx` | Filtro por ruta/localidad |
| LoansList | `components/LoansList.tsx` | Lista de prestamos |
| LoanDocumentCard | `components/LoanDocumentCard.tsx` | Card de prestamo |
| DocumentsGallery | `components/DocumentsGallery.tsx` | Galeria de documentos |
| DocumentUpload | `components/DocumentUpload.tsx` | Componente de subida |
| DocumentGallery | `components/DocumentGallery.tsx` | Galeria individual |
| DocumentValidation | `components/DocumentValidation.tsx` | Validacion de documentos |

---

## Flujo de Uso

```
1. Seleccionar semana (por defecto: actual)
2. Opcionalmente filtrar por ruta y localidad
3. Ver lista de prestamos de esa semana
4. Click en prestamo para ver/subir documentos
5. Subir documentos via Cloudinary
6. Validar documentos (opcional)
```

---

## Business Rules

### 1. Filtros por Semana

```javascript
// Prestamos se filtran por semana de firma
// weekNumber: 1-52
// year: YYYY

const weekStart = getWeekStartDate(year, weekNumber) // Lunes
const weekEnd = getWeekEndDate(year, weekNumber)     // Domingo
```

### 2. Tipos de Documento

| Tipo | Codigo | Descripcion |
|------|--------|-------------|
| INE Cliente | INE_FRONT | Frente de INE del cliente |
| INE Cliente (reverso) | INE_BACK | Reverso de INE |
| Comprobante Domicilio | ADDRESS_PROOF | Comprobante de domicilio |
| Pagare | PROMISSORY_NOTE | Pagare firmado |
| INE Aval | COLLATERAL_INE_FRONT | INE del aval |
| INE Aval (reverso) | COLLATERAL_INE_BACK | Reverso INE aval |
| Selfie | SELFIE | Foto del cliente |
| Otro | OTHER | Documento adicional |

### 3. Almacenamiento en Cloudinary

```javascript
// Configuracion de subida
const uploadConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  folder: `loans/${loanId}/documents`,
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'pdf'],
}
```

### 4. Estructura de Documento en BD

```typescript
interface LoanDocument {
  id: string
  loanId: string
  type: DocumentType
  cloudinaryId: string
  url: string
  thumbnailUrl: string
  uploadedAt: Date
  uploadedBy: string
  validated: boolean
  validatedAt?: Date
  validatedBy?: string
}
```

### 5. Validacion de Documentos

| Regla | Descripcion |
|-------|-------------|
| Manual | Un usuario con permisos valida el documento |
| Estado | validated: boolean |
| Auditoria | Se registra quien y cuando valido |

---

## Hook Principal

### useDocumentManager

```typescript
const {
  weekInfo,              // { year, weekNumber }
  selectedLocation,      // locationId | null
  selectedRouteId,       // routeId | null
  loans,                 // Loan[]
  locations,             // Location[]
  loansLoading,
  locationsLoading,
  loansError,
  handleWeekChange,
  handleLocationChange,
  handleRouteChange,
  refetchLoans,
} = useDocumentManager()
```

---

## Queries GraphQL

| Query | Uso |
|-------|-----|
| LOANS_BY_WEEK | Prestamos de una semana |
| LOCATIONS_BY_ROUTE | Localidades de una ruta |
| LOAN_DOCUMENTS | Documentos de un prestamo |

---

## Mutations GraphQL

| Mutation | Uso |
|----------|-----|
| CREATE_DOCUMENT | Registrar documento subido |
| DELETE_DOCUMENT | Eliminar documento |
| VALIDATE_DOCUMENT | Marcar como validado |

---

## Integracion con Cloudinary

### Upload Widget

```javascript
// Se usa el widget de Cloudinary para subir
const widget = cloudinary.createUploadWidget({
  cloudName: CLOUD_NAME,
  uploadPreset: UPLOAD_PRESET,
  folder: `loans/${loanId}`,
  sources: ['local', 'camera'],
  multiple: true,
  maxFiles: 10,
}, (error, result) => {
  if (result.event === 'success') {
    // Guardar referencia en BD
    createDocument({
      loanId,
      type: selectedType,
      cloudinaryId: result.info.public_id,
      url: result.info.secure_url,
    })
  }
})
```

### URL de Imagen

```javascript
// Transformaciones de Cloudinary
const thumbnailUrl = `${baseUrl}/c_thumb,w_200,h_200/${publicId}`
const fullUrl = `${baseUrl}/c_limit,w_1200/${publicId}`
```

---

## Optimizacion Mobile

### Estrategias Implementadas

| Estrategia | Descripcion |
|------------|-------------|
| Lazy Loading | Imagenes se cargan al scroll |
| Thumbnails | Miniaturas de 200x200 |
| Compresion | Imagenes comprimidas al subir |
| Dialog Modal | Gallery en modal para no cargar todo |
| CSS overflow | Prevencion de scroll horizontal |

### Estilos Mobile-First

```css
/* Contenedor principal */
.container {
  max-width: 100vw;
  overflow-x: hidden;
  padding: 1rem;
}

/* Cards adaptables */
.loan-card {
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}
```

---

## Estados de UI

| Estado | Descripcion |
|--------|-------------|
| Cargando prestamos | Spinner en lista |
| Sin prestamos | Mensaje "No hay prestamos esta semana" |
| Dialog abierto | Modal con galeria/upload |
| Subiendo | Progress bar en widget |
| Error subida | Toast destructivo |

---

## Permisos

| Accion | Rol Requerido |
|--------|---------------|
| Ver documentos | Todos |
| Subir documentos | LEAD, ROUTE_SUPERVISOR, ADMIN |
| Eliminar documentos | ADMIN |
| Validar documentos | ROUTE_SUPERVISOR, ADMIN |

---

## Notas Importantes

1. **Cloudinary**: Todos los documentos se almacenan en Cloudinary
2. **Referencias**: En BD solo se guarda la referencia (publicId, url)
3. **Mobile**: Optimizado para uso en campo con celulares basicos
4. **Semana actual**: Por defecto muestra la semana actual
5. **Refetch**: Despues de subir se actualiza la lista automaticamente
