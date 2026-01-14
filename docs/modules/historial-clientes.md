# Historial de Clientes - Documentacion del Modulo

## Descripcion General

El modulo de Historial de Clientes permite buscar clientes y ver su historial completo de prestamos, tanto como cliente principal como aval.

**Ruta**: `/historial-clientes`
**Archivo Principal**: `app/(auth)/historial-clientes/page.tsx`
**Componente Principal**: `components/features/historial-clientes/index.tsx`

---

## Componentes

| Componente | Archivo | Descripcion |
|------------|---------|-------------|
| HistorialClientes | `index.tsx` | Componente principal |
| SearchBar | `components/SearchBar.tsx` | Barra de busqueda con autocomplete |
| ClientProfile | `components/ClientProfile.tsx` | Perfil del cliente |
| LoansList | `components/LoansList.tsx` | Lista de prestamos |
| LoanDocumentPhotos | `components/LoanDocumentPhotos.tsx` | Fotos de documentos |
| ClientProfileSkeleton | `components/Skeletons.tsx` | Skeleton de perfil |
| LoansListSkeleton | `components/Skeletons.tsx` | Skeleton de lista |

---

## Flujo de Uso

```
1. Usuario escribe nombre/telefono en SearchBar
2. Autocomplete muestra resultados (debounce 300ms)
3. Usuario selecciona cliente
4. Sistema hace fetchClientHistory(clientId)
5. Se muestra perfil + lista de prestamos
6. Usuario puede generar PDF de historial
```

---

## Estructura de Datos

### ClientSearchResult

```typescript
interface ClientSearchResult {
  id: string
  clientCode: string
  fullName: string
  phone?: string
}
```

### ClientHistoryData

```typescript
interface ClientHistoryData {
  client: {
    id: string
    clientCode: string
    fullName: string
    phone: string
    address: string
  }
  summary: {
    totalLoansAsClient: number
    totalLoansAsCollateral: number
    totalPaid: string
    totalPending: string
    loansCompleted: number
    loansActive: number
  }
  loansAsClient: Loan[]
  loansAsCollateral: Loan[]
}
```

---

## Business Rules

### 1. Busqueda

| Regla | Descripcion |
|-------|-------------|
| Minimo caracteres | 2 caracteres para iniciar busqueda |
| Debounce | 300ms antes de ejecutar busqueda |
| Campos buscados | fullName, clientCode, phone |
| Limite resultados | 10 resultados en autocomplete |

### 2. Prestamos como Cliente vs Aval

```
loansAsClient: Prestamos donde el cliente es el titular (borrower)
loansAsCollateral: Prestamos donde el cliente es el aval (collateral)
```

### 3. Fotos de Documentos

```javascript
// Solo se muestran fotos del prestamo mas reciente
const sortedLoans = [...loansAsClient].sort(
  (a, b) => new Date(b.signDate) - new Date(a.signDate)
)
const mostRecentLoan = sortedLoans[0]
```

### 4. Generacion de PDF

```javascript
// Dos tipos de PDF:
// 1. Resumen: Solo totales
// 2. Detallado: Con lista completa de pagos

const handleGeneratePDF = async (detailed: boolean) => {
  const response = await fetch(`${API_URL}/api/export-client-history-pdf`, {
    method: 'POST',
    body: JSON.stringify({
      clientId: selectedClient.id,
      detailed,
    }),
  })
}
```

---

## Hook Principal

### useClientHistory

```typescript
const {
  data: ClientHistoryData | null,
  loading: boolean,
  fetchClientHistory: (clientId: string) => void,
  reset: () => void,
} = useClientHistory()
```

---

## Estados de UI

| Estado | Descripcion |
|--------|-------------|
| Sin seleccion | Mensaje "Selecciona un cliente" |
| Cargando | Skeletons de perfil y lista |
| Con datos | Perfil + Listas + Fotos |
| Sin historial | Mensaje "Sin historial de prestamos" |
| Generando PDF | Spinner en boton |

---

## Queries GraphQL

| Query | Uso |
|-------|-----|
| SEARCH_CLIENTS | Busqueda por autocomplete |
| CLIENT_HISTORY | Historial completo del cliente |
| LOAN_DOCUMENTS | Documentos de un prestamo |

---

## Integracion con API

### Endpoint de PDF

```
POST /api/export-client-history-pdf
Content-Type: application/json

Request:
{
  "clientId": "uuid",
  "detailed": true|false
}

Response: application/pdf (blob)
```

---

## Mobile Optimization

- SearchBar con layout adaptable
- Boton de limpiar visible en mobile
- Cards responsivas
- Imagenes con lazy loading
- Skeleton loading para feedback rapido

---

## Notas Importantes

1. **Auto-fetch**: Al seleccionar cliente se carga historial automaticamente
2. **Ordenamiento**: Prestamos ordenados por fecha (mas reciente primero)
3. **Documentos**: Solo se muestran del prestamo mas reciente para reducir carga
4. **PDF**: Se genera en el servidor (API separada)
