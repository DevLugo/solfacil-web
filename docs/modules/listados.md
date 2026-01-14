# Listados - Documentacion del Modulo

## Descripcion General

El modulo de Listados permite generar PDFs de cobranza semanal por localidad para uso en campo. Los lideres usan estos listados impresos para cobrar a los clientes.

**Ruta**: `/listados/generar`
**Archivo Principal**: `app/(auth)/listados/generar/page.tsx`

---

## Componentes

| Componente | Archivo | Descripcion |
|------------|---------|-------------|
| RouteSelector | `components/RouteSelector.tsx` | Selector de ruta |
| LocalityGrid | `components/LocalityGrid.tsx` | Grid de localidades |
| GenerateActions | `components/GenerateActions.tsx` | Botones de generacion |
| GenerateListadosSkeleton | `components/Skeletons.tsx` | Loading state |

---

## Flujo de Uso

```
1. Seleccionar ruta
2. Seleccionar localidades (checkbox grid)
3. Elegir modo de semana (actual/siguiente)
4. Click "Generar PDFs"
5. Sistema genera y descarga ZIP con PDFs
```

---

## Hook Principal

### useGenerateListados

```typescript
const {
  routes,              // Route[]
  localities,          // Locality[]
  selectedRouteId,     // string | null
  selectedLocalities,  // Set<string>
  weekMode,            // 'current' | 'next'
  routesLoading,
  localitiesLoading,
  isGenerating,
  setSelectedRouteId,
  setWeekMode,
  handleGeneratePDFs,
  toggleLocality,
  selectAll,
  selectNone,
} = useGenerateListados()
```

---

## Business Rules

### 1. Seleccion de Semana

| Modo | Descripcion |
|------|-------------|
| current | Semana actual (lunes a domingo) |
| next | Semana siguiente |

```javascript
// Calculo de semana
const currentMonday = getMondayOfCurrentWeek()
const nextMonday = addDays(currentMonday, 7)
```

### 2. Localidades por Ruta

```
Al seleccionar ruta:
  - Se cargan localidades de esa ruta
  - Cada localidad muestra:
    - Nombre
    - Nombre del lider
    - Cantidad de clientes activos
```

### 3. Seleccion Multiple

```javascript
// Opciones de seleccion
selectAll()   // Selecciona todas las localidades
selectNone()  // Deselecciona todas
toggleLocality(id) // Toggle individual
```

### 4. Generacion de PDF

```javascript
// Endpoint de generacion
POST /api/generate-listados

Request:
{
  "routeId": "uuid",
  "locationIds": ["uuid1", "uuid2"],
  "weekMode": "current" | "next"
}

Response:
- Content-Type: application/zip
- Contiene: listado-{localidad}-{fecha}.pdf por cada localidad
```

### 5. Contenido del PDF

Cada PDF de listado incluye:

```
┌────────────────────────────────────────────────────┐
│ LISTADO DE COBRANZA                                │
│ Localidad: {nombre}                                │
│ Lider: {nombre_lider}                              │
│ Semana: {fecha_inicio} - {fecha_fin}              │
├────────────────────────────────────────────────────┤
│ # | Cliente | Monto | Pagado | Pendiente | Estado │
├───┼─────────┼───────┼────────┼───────────┼────────┤
│ 1 | Juan... | $1000 | $500   | $500      | CV     │
│ 2 | Maria.. | $800  | $800   | $0        | OK     │
│ ...                                                │
├────────────────────────────────────────────────────┤
│ TOTALES: Monto: $X | Cobrado: $Y | Pendiente: $Z  │
└────────────────────────────────────────────────────┘
```

---

## Estructura de Datos

### Localidad en Grid

```typescript
interface LocalityInfo {
  id: string
  name: string
  leadName: string
  clientCount: number
  pendingAmount: string
}
```

### Request de Generacion

```typescript
interface GenerateRequest {
  routeId: string
  locationIds: string[]
  weekMode: 'current' | 'next'
}
```

---

## Estados de UI

| Estado | Componente | Descripcion |
|--------|------------|-------------|
| Cargando rutas | GenerateListadosSkeleton | Skeleton completo |
| Cargando localidades | LocalityGrid | Spinner en grid |
| Sin seleccion | RouteSelector | Solo dropdown visible |
| Con seleccion | Todo | Muestra grid + botones |
| Generando | GenerateActions | Spinner en boton |
| Descargando | Browser | Descarga automatica ZIP |

---

## Queries GraphQL

| Query | Uso |
|-------|-----|
| GET_ROUTES | Lista de rutas |
| GET_LOCALITIES_FOR_LISTADO | Localidades con info para listado |

---

## Integracion con API

### Endpoint de Generacion

```javascript
const handleGeneratePDFs = async () => {
  setIsGenerating(true)
  try {
    const response = await fetch(`${API_URL}/api/generate-listados`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routeId: selectedRouteId,
        locationIds: Array.from(selectedLocalities),
        weekMode,
      }),
    })

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)

    // Descargar automaticamente
    const link = document.createElement('a')
    link.href = url
    link.download = `listados-${formatDate(new Date())}.zip`
    link.click()
  } finally {
    setIsGenerating(false)
  }
}
```

---

## Grid de Localidades

### Layout Responsivo

```
Desktop (lg): 4 columnas
Tablet (md): 3 columnas
Mobile (sm): 2 columnas
Mini: 1 columna
```

### Card de Localidad

```
┌─────────────────────────────┐
│ [checkbox] Nombre Localidad │
│ Lider: Juan Perez           │
│ 15 clientes | $12,500 pend. │
└─────────────────────────────┘
```

---

## Permisos

| Accion | Rol Requerido |
|--------|---------------|
| Ver modulo | LEAD, ROUTE_SUPERVISOR, ADMIN, CEO |
| Generar PDFs | Todos los anteriores |
| Ver todas las rutas | ADMIN, CEO |
| Ver solo su ruta | LEAD, ROUTE_SUPERVISOR |

---

## Notas Importantes

1. **Uso en Campo**: PDFs diseñados para imprimirse y usarse sin internet
2. **Semana Siguiente**: Permite preparar listados con anticipacion
3. **ZIP**: Multiples PDFs se empaquetan en ZIP para descarga unica
4. **Formato**: PDFs optimizados para papel carta/A4
5. **Actualizado**: Datos son los mas recientes al momento de generar
6. **Sin Cache**: Siempre genera con datos frescos
