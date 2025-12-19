# Gastos Tab - Documentación de Edge Cases

## Resumen

El tab de Gastos permite crear, editar y eliminar transacciones de tipo EXPENSE. Cada operación afecta el balance de la cuenta origen asociada.

---

## Arquitectura de Balance

```
┌─────────────────────────────────────────────────────────────────┐
│                    POLÍTICA DE BALANCE                          │
├─────────────────────────────────────────────────────────────────┤
│  El campo `amount` de las cuentas NUNCA se modifica directamente│
│                                                                 │
│  Flujo correcto:                                                │
│  1. Crear/editar/eliminar transacción                          │
│  2. Llamar recalculateAndUpdateBalance(accountId)              │
│                                                                 │
│  Balance = INCOME + TRANSFER_IN - EXPENSE - TRANSFER_OUT       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Creación de Gasto

### Flujo Normal

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Usuario llena   │────▶│  Agregar gasto   │────▶│  Guardar cambios │
│  formulario      │     │  a lista pending │     │                  │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                           ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  UI actualizada  │◀────│  Refetch datos   │◀────│  Backend crea    │
│  con nuevo gasto │     │  (expenses +     │     │  transacción +   │
│                  │     │   accounts)      │     │  recalcula       │
└──────────────────┘     └──────────────────┘     │  balance         │
                                                  └──────────────────┘
```

### Edge Cases - Creación

| # | Edge Case | Comportamiento Esperado | Validación |
|---|-----------|------------------------|------------|
| 1 | Sin monto | Toast de error, no guarda | Frontend |
| 2 | Monto = 0 | Toast de error, no guarda | Frontend |
| 3 | Sin tipo de gasto | Toast de error, no guarda | Frontend |
| 4 | Sin cuenta seleccionada | Toast de error, no guarda | Frontend |
| 5 | Balance insuficiente | Se permite (no hay validación) | N/A |
| 6 | Gasto con líder seleccionado | Se asocia leadId al gasto | Backend |
| 7 | Múltiples gastos pendientes | Se guardan todos en secuencia | Backend |

### Impacto en Balance

```
Balance_nuevo = Balance_anterior - monto_gasto

Ejemplo:
  Balance inicial: $10,000
  Gasto creado:    $500
  Balance final:   $9,500
```

---

## 2. Edición de Gasto

### Flujo Normal

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Usuario click   │────▶│  Modal muestra   │────▶│  Usuario modifica│
│  en Editar       │     │  datos actuales  │     │  campos          │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                           ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  UI actualizada  │◀────│  Refetch datos   │◀────│  Backend:        │
│  con cambios     │     │                  │     │  1. Update tx    │
│                  │     │                  │     │  2. Recalcular   │
│                  │     │                  │     │     balances     │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Edge Cases - Edición

| # | Edge Case | Comportamiento Esperado | Impacto Balance |
|---|-----------|------------------------|-----------------|
| 1 | Cambio de monto (aumenta) | Recalcular cuenta | Disminuye más |
| 2 | Cambio de monto (disminuye) | Recalcular cuenta | Aumenta (se revierte parte) |
| 3 | Cambio de cuenta origen | Recalcular AMBAS cuentas | Cuenta vieja +, Cuenta nueva - |
| 4 | Cambio de tipo de gasto | Solo actualiza campo | Sin impacto |
| 5 | Sin cambios | No hace nada | Sin impacto |

### Impacto en Balance - Cambio de Cuenta

```
Escenario: Gasto de $500 se cambia de Cuenta A a Cuenta B

Cuenta A (origen anterior):
  Balance_nuevo = Balance + 500 (se revierte el gasto)

Cuenta B (nueva origen):
  Balance_nuevo = Balance - 500 (se aplica el gasto)
```

### Impacto en Balance - Cambio de Monto

```
Escenario: Gasto cambia de $500 a $800

Método: Se recalcula todo el balance desde las transacciones

  Balance_nuevo = SUM(INCOME) + SUM(TRANSFER_IN)
                - SUM(EXPENSE) - SUM(TRANSFER_OUT)

  El monto actualizado ya está incluido en SUM(EXPENSE)
```

---

## 3. Eliminación de Gasto

### Flujo Normal

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Usuario click   │────▶│  Modal de        │────▶│  Usuario confirma│
│  en Eliminar     │     │  confirmación    │     │  eliminación     │
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                           ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  UI actualizada  │◀────│  Refetch datos   │◀────│  Backend:        │
│  sin el gasto    │     │                  │     │  1. Delete tx    │
│                  │     │                  │     │  2. Recalcular   │
│                  │     │                  │     │     balance      │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Edge Cases - Eliminación

| # | Edge Case | Comportamiento Esperado | Impacto Balance |
|---|-----------|------------------------|-----------------|
| 1 | Eliminar gasto normal | Se elimina, balance restaurado | +monto |
| 2 | Eliminar único gasto del día | Lista queda vacía | +monto |
| 3 | Eliminar gasto con líder | Se elimina normalmente | +monto |
| 4 | Error de red al eliminar | Toast de error, UI no cambia | Sin impacto |

### Impacto en Balance

```
Balance_nuevo = Balance_anterior + monto_gasto_eliminado

Ejemplo:
  Balance inicial: $9,500
  Gasto eliminado: $500
  Balance final:   $10,000 (restaurado)
```

---

## 4. Gastos Distribuidos

### Flujo Normal

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Usuario click   │────▶│  Modal muestra   │────▶│  Usuario ingresa │
│  en "Distribuir" │     │  rutas           │     │  monto total y   │
│                  │     │  disponibles     │     │  selecciona rutas│
└──────────────────┘     └──────────────────┘     └────────┬─────────┘
                                                           │
                                                           ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  N gastos        │◀────│  Se crean N      │◀────│  Sistema divide  │
│  creados en      │     │  transacciones   │     │  monto entre     │
│  diferentes rutas│     │  (una por ruta)  │     │  rutas           │
└──────────────────┘     └──────────────────┘     └──────────────────┘
```

### Lógica de División

```javascript
// Distribución de monto entre rutas
distributeAmount(total: number, routeIds: string[]): Map<string, number>

// Ejemplo: $1000 entre 3 rutas
const perRoute = Math.floor((1000 / 3) * 100) / 100  // = $333.33
const remainder = 1000 - (333.33 * 3)                // = $0.01

// Resultado:
// Ruta 1: $333.33
// Ruta 2: $333.33
// Ruta 3: $333.34  (recibe el residuo)
```

### Edge Cases - Distribución

| # | Edge Case | Comportamiento Esperado | Impacto Balance |
|---|-----------|------------------------|-----------------|
| 1 | División exacta | Montos iguales | -monto/N por cuenta |
| 2 | División con residuo | Último item recibe residuo | Variable |
| 3 | Una sola ruta | Equivale a gasto normal | -monto total |
| 4 | Cero rutas seleccionadas | Botón deshabilitado | Sin impacto |
| 5 | Monto muy pequeño | División puede dar $0.01 | Mínimo impacto |

---

## 5. Filtros y Visualización

### Filtro por Líder

```
┌─────────────────────────────────────────────────────────────────┐
│  Cuando selectedLeadId está seleccionado:                       │
│                                                                 │
│  filteredExpenses = expenses.filter(e => e.lead?.id === leadId) │
│                                                                 │
│  Gastos sin líder NO aparecen en el filtro                     │
└─────────────────────────────────────────────────────────────────┘
```

### Filtro por Tipo de Cuenta

```
┌─────────────────────────────────────────────────────────────────┐
│  Por defecto (showExtraAccountTypes = false):                   │
│  - EMPLOYEE_CASH_FUND                                           │
│  - PREPAID_GAS                                                  │
│  - TRAVEL_EXPENSES                                              │
│                                                                 │
│  Con toggle activado (showExtraAccountTypes = true):            │
│  - Todos los anteriores +                                       │
│  - BANK                                                         │
│  - OFFICE_CASH_FUND                                             │
└─────────────────────────────────────────────────────────────────┘
```

### Tipos de Gasto (expenseSource)

```
┌────────────────────────────────────────┬────────────────────────┐
│         GASTOS MANUALES                │   GASTOS AUTOMÁTICOS   │
├────────────────────────────────────────┼────────────────────────┤
│ VIATIC          - Viáticos             │ LOAN_GRANTED           │
│ GASOLINE        - Gasolina             │ LOAN_GRANTED_COMISSION │
│ ACCOMMODATION   - Hospedaje            │ LOAN_PAYMENT_COMISSION │
│ NOMINA_SALARY   - Nómina               │ LEAD_COMISSION         │
│ EXTERNAL_SALARY - Salario Externo      │                        │
│ VEHICULE_MAINTENANCE - Mantenimiento   │                        │
│ LEAD_EXPENSE    - Gasto de Líder       │                        │
│ LAVADO_DE_AUTO  - Lavado de Auto       │                        │
│ CASETA          - Caseta               │                        │
│ PAPELERIA       - Papelería            │                        │
│ HOUSE_RENT      - Renta                │                        │
│ CAR_PAYMENT     - Pago de Auto         │                        │
│ IMSS_INFONAVIT  - IMSS/INFONAVIT       │                        │
│ POSADA          - Posada               │                        │
│ REGALOS_LIDERES - Regalos Líderes      │                        │
│ AGUINALDO       - Aguinaldo            │                        │
│ OTRO            - Otro                 │                        │
└────────────────────────────────────────┴────────────────────────┘

Los gastos automáticos (comisiones) se muestran con:
- Fondo amarillo (bg-amber-50/50)
- Badge "Comisión"
- Icono en color ámbar
```

---

## 6. Auto-selección de Cuenta

```
┌─────────────────────────────────────────────────────────────────┐
│  Mapeo expenseSource → accountType preferido:                   │
│                                                                 │
│  GASOLINE     → PREPAID_GAS (Toka)                             │
│  VIATIC       → TRAVEL_EXPENSES                                │
│  ACCOMMODATION → TRAVEL_EXPENSES                                │
│  [otros]      → EMPLOYEE_CASH_FUND (default)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Estados de Carga

### Skeleton Loading

```
┌─────────────────────────────────────────────────────────────────┐
│  [████████] [██████████]           [████████] [██████]          │  KPI Bar
├─────────────────────────────────────────────────────────────────┤
│                                            [████████████████]   │  Filter
├─────────────────────────────────────────────────────────────────┤
│  [████████████████████]                                         │  Card Header
│  [████████████]                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [████] [████] [████████] [████] [██]                        │ │  Table Header
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [████] [████] [████████] [████] [██]                        │ │  Row 1
│ │ [████] [████] [████████] [████] [██]                        │ │  Row 2
│ │ [████] [████] [████████] [████] [██]                        │ │  Row 3
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│  [████████████████████]                                         │  Account Card
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐         │
│  │[██] [████████]│ │[██] [████████]│ │[██] [████████]│         │
│  │     [████]    │ │     [████]    │ │     [████]    │         │
│  └───────────────┘ └───────────────┘ └───────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Manejo de Errores

| Operación | Error | Comportamiento UI |
|-----------|-------|-------------------|
| Crear | Red/API | Toast destructivo, mantiene datos en form |
| Editar | Red/API | Toast destructivo, modal permanece abierto |
| Eliminar | Red/API | Toast destructivo, dialog permanece abierto |
| Distribuir | Red/API | Toast destructivo, modal permanece abierto |
| Cargar datos | Red/API | Muestra spinner indefinido |

---

## 9. Refetch Strategy

```javascript
// Hook useGastosQueries
const refetchAll = async () => {
  await Promise.all([
    refetchExpenses(),   // Lista de gastos
    refetchAccounts()    // Balances de cuentas
  ])
}

// Se llama después de:
// - Crear gasto(s)
// - Editar gasto
// - Eliminar gasto
// - Crear gastos distribuidos

// fetchPolicy: 'cache-and-network' para ambas queries
// Esto asegura que siempre se muestre data fresca después de mutaciones
```

---

## 10. Validaciones

### Frontend

| Campo | Validación | Mensaje |
|-------|------------|---------|
| amount | > 0 | "Agrega al menos un gasto con monto" |
| expenseSource | requerido | "Agrega al menos un gasto con tipo" |
| sourceAccountId | requerido | "Agrega al menos un gasto con cuenta" |

### Backend

| Validación | Ubicación | Acción |
|------------|-----------|--------|
| Cuenta existe | TransactionService | Throw error |
| Monto válido | Schema GraphQL | Parse error |
| Tipo de transacción | Schema GraphQL | Enum validation |

---

## Diagrama de Secuencia - Creación Completa

```
┌─────┐          ┌─────────┐         ┌─────────┐         ┌────────────┐
│ UI  │          │ Apollo  │         │   API   │         │  Database  │
└──┬──┘          └────┬────┘         └────┬────┘         └─────┬──────┘
   │                  │                   │                    │
   │ addNewExpense()  │                   │                    │
   │─────────────────▶│                   │                    │
   │                  │                   │                    │
   │ handleSaveAll()  │                   │                    │
   │─────────────────▶│                   │                    │
   │                  │                   │                    │
   │                  │ mutation          │                    │
   │                  │ createTransaction │                    │
   │                  │──────────────────▶│                    │
   │                  │                   │                    │
   │                  │                   │ INSERT Transaction │
   │                  │                   │───────────────────▶│
   │                  │                   │                    │
   │                  │                   │ recalculateBalance │
   │                  │                   │───────────────────▶│
   │                  │                   │                    │
   │                  │                   │◀───────────────────│
   │                  │◀──────────────────│                    │
   │                  │                   │                    │
   │ refetchAll()     │                   │                    │
   │─────────────────▶│                   │                    │
   │                  │ query expenses    │                    │
   │                  │──────────────────▶│                    │
   │                  │ query accounts    │                    │
   │                  │──────────────────▶│                    │
   │                  │                   │                    │
   │◀─────────────────│                   │                    │
   │ UI updated       │                   │                    │
   │                  │                   │                    │
```
