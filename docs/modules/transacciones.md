# Transacciones - Documentacion del Modulo

## Descripcion General

El modulo de Transacciones es el centro de operaciones diarias para registro de cobranza, creditos, gastos y transferencias. Maneja todas las operaciones financieras del dia a dia.

**Ruta**: `/transacciones`
**Archivo Principal**: `app/(auth)/transacciones/page.tsx`

---

## Arquitectura

```
TransactionProvider (Context)
├── TransactionSelectors (Ruta/Localidad/Fecha)
├── Tabs
│   ├── ResumenTab      - Resumen del dia
│   ├── AbonosTab       - Pagos de clientes
│   ├── CreditosTab     - Otorgar prestamos
│   ├── GastosTab       - Gastos operativos
│   └── TransferenciasTab - Transferencias entre cuentas
└── BulkDateMigrationModal
```

---

## Context (Estado Global)

```typescript
interface TransactionContextType {
  selectedRouteId: string | null      // Ruta seleccionada
  selectedLeadId: string | null       // Lider seleccionado
  selectedLocationId: string | null   // Localidad (derivada del lead)
  selectedLocationName: string | null // Nombre de localidad
  selectedDate: Date                  // Fecha de operacion
}
```

**Archivo**: `components/features/transactions/transaction-context.tsx`

---

## Business Rules Generales

### 1. Jerarquia de Seleccion

```
RUTA → LIDER → LOCALIDAD

1. Usuario selecciona RUTA
2. Sistema carga LEADs de esa ruta
3. Usuario selecciona LEAD (dropdown muestra "Localidad · (Nombre Lider)")
4. Sistema extrae locationId del lead.personalData.addresses[0].location
```

### 2. Regla de Cuentas por Operacion

| Operacion | Cuenta Predeterminada | Descripcion |
|-----------|----------------------|-------------|
| Gastos | EMPLOYEE_CASH_FUND | Gastos salen de caja del lider/ruta |
| Creditos | EMPLOYEE_CASH_FUND | Creditos se otorgan desde caja de la ruta |
| Abonos | EMPLOYEE_CASH_FUND | Pagos entran a caja de la ruta |
| Transferencias | EMPLOYEE_CASH_FUND | Transferencias entre cajas |
| Vaciar Cuentas | EMPLOYEE_CASH_FUND → destino | Vaciar caja a oficina |
| Distribuir | origen → EMPLOYEE_CASH_FUND | Distribuir desde oficina a rutas |

**IMPORTANTE**: `OFFICE_CASH_FUND` solo se usa en operaciones centralizadas (vaciar/distribuir).

### 3. Arquitectura de Balance

```
┌─────────────────────────────────────────────────────────────────┐
│                    POLITICA DE BALANCE                          │
├─────────────────────────────────────────────────────────────────┤
│  El campo `amount` de cuentas NUNCA se modifica directamente    │
│                                                                 │
│  Flujo correcto:                                                │
│  1. Crear/editar/eliminar transaccion                          │
│  2. Backend llama recalculateAndUpdateBalance(accountId)        │
│                                                                 │
│  Balance = INCOME + TRANSFER_IN - EXPENSE - TRANSFER_OUT        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tab: Resumen

**Componente**: `components/features/transactions/resumen-tab.tsx`

Muestra un resumen consolidado del dia:
- Total abonos recibidos
- Total creditos otorgados
- Total gastos
- Transferencias realizadas
- Balance de cuentas

---

## Tab: Abonos (Pagos)

**Componente**: `components/features/transactions/abonos/`

### Flujo de Registro de Pago

```
1. Buscar cliente por nombre/telefono
2. Seleccionar prestamo activo del cliente
3. Ingresar monto del abono
4. Confirmar pago
5. Backend registra transaccion tipo INCOME
6. Backend recalcula balance de cuenta
```

### Business Rules - Abonos

| Regla | Descripcion |
|-------|-------------|
| Monto maximo | No puede exceder deuda pendiente |
| Cuenta destino | EMPLOYEE_CASH_FUND de la ruta |
| Fecha | Puede ser fecha pasada (con permisos) |

---

## Tab: Creditos (Prestamos)

**Componente**: `components/features/transactions/creditos/`

### Componentes Principales

| Componente | Responsabilidad |
|------------|-----------------|
| CreateLoansModal | Modal para crear nuevos prestamos |
| EditLoanModal | Editar prestamo existente |
| CancelLoanDialog | Cancelar prestamo |
| LoansTable | Tabla de prestamos del dia |
| LocationWarning | Warning si cliente es de otra localidad |

### Business Rules - Creditos

| Regla | Descripcion |
|-------|-------------|
| Monto minimo | Definido por politica (ej: $500) |
| Plazo | Semanas configurables |
| Tasa de interes | Calculada por LoanEngine |
| Comision | Se descuenta automaticamente |
| Cuenta origen | EMPLOYEE_CASH_FUND de la ruta |

### Warning de Localidad

```typescript
// Se muestra warning cuando:
const isBorrowerFromDifferentLocation =
  selectedBorrower &&
  selectedBorrower.isFromCurrentLocation === false
```

### Logica de Determinacion de Localidad

```typescript
// Prioridad:
// 1. Location propia del borrower (de su address)
// 2. Fallback: Location del lead de su prestamo mas reciente
// 3. Si no hay ninguno: se asume local (no warning)

const isFromCurrentLocation =
  !locationId ||
  !finalLocationId ||
  finalLocationId === locationId
```

---

## Tab: Gastos

**Componente**: `components/features/transactions/gastos/`

Ver documentacion detallada en: [gastos-tab.md](./gastos-tab.md)

### Tipos de Gasto (expenseSource)

**Gastos Manuales:**
- VIATIC - Viaticos
- GASOLINE - Gasolina
- ACCOMMODATION - Hospedaje
- NOMINA_SALARY - Nomina
- EXTERNAL_SALARY - Salario Externo
- VEHICULE_MAINTENANCE - Mantenimiento
- LEAD_EXPENSE - Gasto de Lider
- LAVADO_DE_AUTO - Lavado de Auto
- CASETA - Caseta
- PAPELERIA - Papeleria
- HOUSE_RENT - Renta
- CAR_PAYMENT - Pago de Auto
- IMSS_INFONAVIT - IMSS/INFONAVIT
- POSADA - Posada
- REGALOS_LIDERES - Regalos Lideres
- AGUINALDO - Aguinaldo
- OTRO - Otro

**Gastos Automaticos (Comisiones):**
- LOAN_GRANTED
- LOAN_GRANTED_COMISSION
- LOAN_PAYMENT_COMISSION
- LEAD_COMISSION

### Auto-seleccion de Cuenta

```
GASOLINE     → PREPAID_GAS (Toka)
VIATIC       → TRAVEL_EXPENSES
ACCOMMODATION → TRAVEL_EXPENSES
[otros]      → EMPLOYEE_CASH_FUND (default)
```

---

## Tab: Transferencias

**Componente**: `components/features/transactions/transferencias/`

### Tipos de Transferencia

| Tipo | Descripcion |
|------|-------------|
| Entre Rutas | De caja de una ruta a otra |
| Vaciar Cuentas | De caja de ruta a oficina central |
| Distribuir | De oficina central a cajas de rutas |

### Business Rules - Transferencias

| Regla | Descripcion |
|-------|-------------|
| Balance suficiente | Cuenta origen debe tener balance >= monto |
| Cuentas diferentes | Origen y destino no pueden ser iguales |
| Tipos compatibles | Solo ciertos tipos de cuenta pueden transferir |

---

## Utilidad: Migracion de Fechas

**Componente**: `BulkDateMigrationModal`

Permite migrar transacciones de una fecha a otra en lote. Util para corregir errores de fecha.

---

## Queries GraphQL

| Query | Archivo | Uso |
|-------|---------|-----|
| ROUTES_QUERY | `graphql/queries/transactions.ts` | Lista de rutas |
| LEADS_BY_ROUTE_QUERY | `graphql/queries/transactions.ts` | Lideres por ruta |
| EXPENSES_QUERY | `graphql/queries/transactions.ts` | Gastos del dia |
| LOANS_QUERY | `graphql/queries/transactions.ts` | Prestamos del dia |
| PAYMENTS_QUERY | `graphql/queries/transactions.ts` | Pagos del dia |
| ACCOUNTS_QUERY | `graphql/queries/transactions.ts` | Cuentas y balances |

---

## Mutations GraphQL

| Mutation | Archivo | Uso |
|----------|---------|-----|
| CREATE_TRANSACTION | `graphql/mutations/transactions.ts` | Crear cualquier transaccion |
| UPDATE_TRANSACTION | `graphql/mutations/transactions.ts` | Editar transaccion |
| DELETE_TRANSACTION | `graphql/mutations/transactions.ts` | Eliminar transaccion |
| BATCH_TRANSFER | `graphql/mutations/batchTransfer.ts` | Transferencias en lote |

---

## Validaciones Frontend

| Campo | Validacion | Mensaje |
|-------|------------|---------|
| amount | > 0 | "El monto debe ser mayor a 0" |
| expenseSource | requerido | "Selecciona un tipo de gasto" |
| sourceAccountId | requerido | "Selecciona una cuenta" |
| borrowerId | requerido (creditos) | "Selecciona un cliente" |

---

## Manejo de Errores

| Operacion | Error | Comportamiento |
|-----------|-------|----------------|
| Crear | Red/API | Toast destructivo, mantiene datos en form |
| Editar | Red/API | Toast destructivo, modal abierto |
| Eliminar | Red/API | Toast destructivo, dialog abierto |
| Cargar datos | Red/API | Spinner indefinido |

---

## Notas Importantes

1. **Fecha**: Por defecto es hoy, pero puede cambiarse para registrar operaciones pasadas
2. **Refetch**: Despues de cada operacion se hace refetch de transacciones y balances
3. **Optimistic UI**: No se usa - siempre se espera respuesta del backend
4. **Permisos**: Ciertas operaciones requieren rol especifico
