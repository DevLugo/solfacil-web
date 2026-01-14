# Reportes - Documentacion del Modulo

## Descripcion General

El modulo de Reportes proporciona analisis y visualizaciones del estado del portafolio de prestamos, clientes morosos, y metricas financieras.

**Ruta Base**: `/reportes`

---

## Sub-Modulos

| Reporte | Ruta | Descripcion |
|---------|------|-------------|
| Cartera | `/reportes/cartera` | Analisis del portafolio de prestamos |
| Clientes Morosos | `/reportes/clientes-morosos` | Lista de clientes en mora |
| Financiero | `/reportes/financiero` | Metricas financieras |
| Limpieza Cartera | `/reportes/limpieza-cartera` | Exclusion de prestamos antiguos |
| Cumpleanos Lideres | `/reportes/cumpleanos-lideres` | Fechas de cumpleanos |

---

## Reporte de Cartera

**Ruta**: `/reportes/cartera`
**Archivo**: `app/(auth)/reportes/cartera/page.tsx`

### Componentes

| Componente | Descripcion |
|------------|-------------|
| WeekSelector | Selector de periodo (mes/semana) |
| LocationBreakdown | Desglose por localidad |
| ClientBalanceChart | Grafico de balance de clientes |
| MonthComparisonChart | Comparacion mensual |
| PortfolioSummaryCard | Resumen del portafolio |
| CVStatusTable | Tabla de estado de CV |
| LocalityDetailModal | Modal con detalle de localidad |
| LocalityWeeklyTable | Tabla semanal por localidad |

### Tabs

1. **Resumen** - Vista general del mes
2. **Por Ruta** - Desglose por ruta/localidad

### Business Rules - Cartera

#### Metricas Principales

| Metrica | Calculo |
|---------|---------|
| Clientes Activos | Prestamos con status ACTIVE |
| Clientes Al Corriente | Sin pagos atrasados |
| Clientes en CV | Con 1+ semana de atraso |
| % CV | (clientesEnCV / clientesActivos) * 100 |
| Tasa Renovacion | (renovados / terminados) * 100 |

#### Balance de Clientes

```
Balance = Nuevos + Reintegros - TerminadosSinRenovar

Trend:
  - UP: Balance > 0
  - DOWN: Balance < 0
  - STABLE: Balance = 0
```

#### Comparacion Mensual

```javascript
// clientesActivosInicio = mes_anterior.totalClientesActivos
// Esto da el conteo al "inicio del mes"
const clientesActivosInicio = previousReport?.summary.totalClientesActivos
```

### Filtros

| Filtro | Descripcion |
|--------|-------------|
| Mes/Ano | Selector de periodo |
| Rutas | Multi-select de rutas |

### Drill-down

```
Vista General → Seleccionar Ruta → Ver Localidades de esa Ruta
```

---

## Reporte de Clientes Morosos

**Ruta**: `/reportes/clientes-morosos`
**Archivo**: `app/(auth)/reportes/clientes-morosos/page.tsx`

### Componentes

| Componente | Archivo |
|------------|---------|
| BadDebtClientList | Lista de clientes |
| BadDebtClientCard | Card de cliente individual |
| FilterBar | Barra de filtros |

### Business Rules - Morosos

#### Clasificacion por Semanas

| Semanas sin Pago | Clasificacion |
|------------------|---------------|
| 1-2 | Atraso leve |
| 3-4 | Atraso moderado |
| 5-7 | Atraso grave |
| 8+ | Cartera critica |

#### Ordenamiento

```
Default: Por semanas sin pago (descendente)
Secundario: Por monto pendiente (descendente)
```

### Filtros

| Filtro | Opciones |
|--------|----------|
| Ruta | Todas / Especifica |
| Localidad | Todas / Especifica |
| Semanas min | 1-8+ |

---

## Reporte Financiero

**Ruta**: `/reportes/financiero`
**Archivo**: `app/(auth)/reportes/financiero/page.tsx`

### Metricas

| Metrica | Descripcion |
|---------|-------------|
| Total Colocado | Suma de prestamos otorgados |
| Total Cobrado | Suma de pagos recibidos |
| Total Gastos | Suma de gastos operativos |
| Utilidad | Cobrado - Gastos |

---

## Limpieza de Cartera

**Ruta**: `/reportes/limpieza-cartera`
**Archivo**: `app/(auth)/reportes/limpieza-cartera/page.tsx`

### Proposito

Excluir prestamos antiguos de los reportes de cartera activa para tener metricas mas precisas.

### Componentes

| Componente | Descripcion |
|------------|-------------|
| CleanupFilterForm | Formulario de filtros |
| CleanupPreview | Vista previa de exclusion |
| CleanupConfirmDialog | Confirmacion de accion |
| CleanupHistoryTable | Historial de limpiezas |
| CleanupEditDialog | Editar limpieza existente |

### Flujo

```
1. Seleccionar fecha maxima de firma (maxSignDate)
2. Opcionalmente filtrar por ruta
3. Ver preview de prestamos a excluir
4. Confirmar con nombre y descripcion
5. Sistema marca prestamos como excluidos
```

### Business Rules - Limpieza

| Regla | Descripcion |
|-------|-------------|
| maxSignDate | Prestamos firmados antes de esta fecha |
| No eliminacion | Los prestamos no se eliminan, solo se excluyen de reportes |
| Reversible | Se puede eliminar la limpieza (prestamos siguen excluidos) |
| Historial | Se mantiene registro de todas las limpiezas |

### Impacto en Reportes

```
Prestamos con portfolioCleanup != null:
  - NO aparecen en reporte de cartera
  - NO se cuentan en metricas de clientes activos
  - SI aparecen en reporte de cartera muerta
```

---

## Cumpleanos de Lideres

**Ruta**: `/reportes/cumpleanos-lideres`
**Archivo**: `app/(auth)/reportes/cumpleanos-lideres/page.tsx`

### Descripcion

Lista de fechas de cumpleanos de los lideres para recordatorios.

---

## Hooks Comunes

| Hook | Archivo | Uso |
|------|---------|-----|
| usePortfolioReport | `reportes/cartera/hooks.ts` | Datos del reporte de cartera |
| usePeriodNavigation | `reportes/cartera/hooks.ts` | Navegacion de periodos |
| useLocalityReport | `reportes/cartera/hooks.ts` | Reporte por localidad |
| useAnnualPortfolioData | `reportes/cartera/hooks.ts` | Datos anuales |
| useRecoveredDeadDebt | `reportes/cartera/hooks.ts` | Cartera muerta recuperada |
| useRouteKPIs | `reportes/cartera/hooks.ts` | KPIs por ruta |
| usePortfolioCleanup | `limpieza-cartera/hooks.ts` | Gestion de limpiezas |
| useBadDebtClients | `clientes-morosos/hooks.ts` | Clientes morosos |

---

## Queries GraphQL

| Query | Uso |
|-------|-----|
| GET_ROUTES | Lista de rutas |
| GET_MONTHLY_REPORT | Reporte mensual de cartera |
| GET_LOCALITY_REPORT | Reporte por localidad |
| GET_PORTFOLIO_CLEANUPS | Historial de limpiezas |
| GET_CLEANUP_PREVIEW | Preview de limpieza |
| GET_BAD_DEBT_CLIENTS | Clientes morosos |

---

## Mutations GraphQL

| Mutation | Uso |
|----------|-----|
| CREATE_PORTFOLIO_CLEANUP | Crear nueva limpieza |
| UPDATE_PORTFOLIO_CLEANUP | Editar limpieza |
| DELETE_PORTFOLIO_CLEANUP | Eliminar limpieza |

---

## Exportacion PDF

El reporte de cartera permite generar PDF:

```javascript
const handleDownloadPDF = async () => {
  const result = await generatePDF()
  if (result?.success && result.url) {
    window.open(result.url, '_blank')
  } else if (result?.success && result.base64) {
    // Download from base64
  }
}
```

---

## Notas Importantes

1. **Lazy Loading**: Datos de comparacion se cargan despues del reporte principal
2. **Cache**: Se usa `cache-and-network` para datos frescos
3. **Filtros Persistentes**: Los filtros de ruta se mantienen entre tabs
4. **Performance**: Annual data se carga con delay (500ms) para no bloquear UI
