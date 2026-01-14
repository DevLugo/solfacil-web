# Dashboard - Documentacion del Modulo

## Descripcion General

El Dashboard es el panel principal de control para CEO/administradores. Muestra metricas clave del negocio de microfinanzas con comparaciones semanales y mensuales.

**Ruta**: `/dashboard`
**Archivo Principal**: `app/(auth)/dashboard/page.tsx`

---

## Componentes Principales

| Componente | Archivo | Descripcion |
|------------|---------|-------------|
| DashboardHeader | `components/DashboardHeader.tsx` | Header con selector de semana y ruta |
| DashboardKPIRow | `components/DashboardKPIRow.tsx` | Fila de KPIs principales |
| WeeklyComparisonTable | `components/WeeklyComparisonTable.tsx` | Tabla comparativa semanal |
| WeeklyTransactionsCard | `components/WeeklyTransactionsCard.tsx` | Card de transacciones semanales |
| LocalityAlertsCard | `components/LocalityAlertsCard.tsx` | Alertas por localidad |
| CriticalClientsCard | `components/CriticalClientsCard.tsx` | Clientes criticos (sin pagar) |
| TopLocationsCard | `components/TopLocationsCard.tsx` | Top localidades por deuda |
| WeeklyExpensesCard | `components/WeeklyExpensesCard.tsx` | Resumen de gastos semanales |
| RecoveredDeadDebtCard | `components/RecoveredDeadDebtCard.tsx` | Cartera muerta recuperada |
| WeeklyActivityChart | `components/WeeklyActivityChart.tsx` | Grafico de actividad semanal |
| NewLocationsCard | `components/NewLocationsCard.tsx` | Nuevas localidades |

---

## Business Rules

### 1. Seleccion de Semana

```
- La semana se calcula usando getCurrentWeek() al cargar
- El mes se deriva de la semana seleccionada usando getMajorityMonthFromWeek()
- El lunes de la semana se calcula para queries del API
```

### 2. KPIs Principales

| KPI | Calculo | Descripcion |
|-----|---------|-------------|
| Clientes Activos | `selectedWeekData.clientesActivos` | Total clientes con prestamo activo |
| Clientes Al Corriente | `selectedWeekData.clientesAlCorriente` | Clientes sin atraso |
| Clientes en CV | `selectedWeekData.clientesEnCV` | Clientes en cartera vencida |
| % CV | `(clientesEnCV / clientesActivos) * 100` | Porcentaje de cartera vencida |
| Clientes Criticos | Filtrado por `weeksWithoutPaymentMin` | Sin pagar N semanas |

### 3. Comparaciones

```
Vs Semana Anterior:
  clientesActivosVsPrev = semana_actual.clientesActivos - semana_anterior.clientesActivos

Vs Inicio de Mes:
  clientesActivosVsStart = semana_actual.clientesActivos - clientesActivosInicio
```

### 4. Filtro de Clientes Criticos

```javascript
// Si weeksWithoutPaymentMin >= 8, mostrar todos los de 8+ semanas
const filtered = weeksWithoutPaymentMin >= 8
  ? loans.filter(c => c.weeksWithoutPayment >= 8)
  : loans.filter(c => c.weeksWithoutPayment === weeksWithoutPaymentMin)
```

### 5. Alertas de Localidad

```
MIN_CLIENTS_FOR_ALERT = 2
MAX_ALERTS_DISPLAYED = 5

Se generan alertas cuando:
- Una localidad tiene >= 2 clientes criticos
- Se ordenan por cantidad de clientes criticos (descendente)
```

### 6. Gastos Semanales

```javascript
// Cambio porcentual vs semana anterior
const expensesChangePercent = ((current - previous) / previous) * 100

// Si no hay semana anterior, no mostrar cambio
if (previous === 0) return undefined
```

---

## Hooks Utilizados

| Hook | Archivo | Responsabilidad |
|------|---------|-----------------|
| useCEODashboard | `hooks/useCEODashboard.ts` | Datos principales del dashboard |
| useDashboardComparisons | `hooks/useDashboardComparisons.ts` | Calculos de comparacion |

---

## Queries GraphQL

- `ROUTES_QUERY` - Lista de rutas disponibles
- `CEO_DASHBOARD_QUERY` - Datos del dashboard (via useCEODashboard)
- `CRITICAL_CLIENTS_QUERY` - Clientes sin pagar
- `WEEKLY_EXPENSES_QUERY` - Gastos semanales

---

## Estados de Carga

```
1. routesLoading && !stats → Mostrar DashboardSkeleton
2. error → Mostrar mensaje de error con icono TrendingDown
3. Datos cargados → Mostrar dashboard completo
```

---

## Filtros Disponibles

| Filtro | Componente | Efecto |
|--------|------------|--------|
| Ruta | DashboardHeader (dropdown) | Filtra todas las metricas por ruta |
| Semana | DashboardHeader (WeekSelector) | Cambia periodo de visualizacion |
| Semanas sin pago | CriticalClientsCard (slider) | Filtra clientes criticos |

---

## Modales

| Modal | Trigger | Contenido |
|-------|---------|-----------|
| RecoveredDeadDebtModal | Click en RecoveredDeadDebtCard | Detalle de pagos recuperados |
| ExpensesDetailModal | Click en KPI de gastos | Desglose de gastos por ruta/tipo |

---

## Notas Importantes

1. **Performance**: Los datos se cargan de forma lazy (shouldLoadPrevious, shouldLoadRecovered)
2. **Refetch**: El boton de refresh en el header llama a refetch() del hook principal
3. **Responsivo**: El layout se adapta a mobile con clases sm:/lg:
