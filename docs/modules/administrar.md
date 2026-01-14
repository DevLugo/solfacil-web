# Administrar - Documentacion del Modulo

## Descripcion General

El modulo de Administracion contiene herramientas para gestionar la configuracion del sistema: rutas, lideres, usuarios, gastos y cartera muerta.

**Ruta Base**: `/administrar`

---

## Sub-Modulos

| Modulo | Ruta | Descripcion |
|--------|------|-------------|
| Gastos | `/administrar/gastos` | Analitica de gastos |
| Cartera Muerta | `/administrar/cartera-muerta` | Gestion de cartera incobrable |
| Lideres | `/administrar/lideres/nuevo` | Crear nuevos lideres |
| Usuarios | `/administrar/usuarios` | Gestion de usuarios del sistema |
| Usuarios Telegram | `/administrar/usuarios-telegram` | Usuarios de Telegram |
| Notificaciones Telegram | `/administrar/notificaciones-telegram` | Config de notificaciones |
| Rutas | `/administrar/rutas` | Gestion de rutas y localidades |

---

## Administrar Gastos

**Ruta**: `/administrar/gastos`
**Archivo**: `app/(auth)/administrar/gastos/page.tsx`

### Componentes

| Componente | Archivo | Descripcion |
|------------|---------|-------------|
| ExpenseTable | `ExpenseTable.tsx` | Tabla de gastos |
| ExpenseKPIs | `ExpenseKPIs.tsx` | KPIs de gastos |
| ExpenseByCategoryChart | `ExpenseByCategoryChart.tsx` | Grafico por categoria |
| ExpenseDistributionChart | `ExpenseDistributionChart.tsx` | Distribucion de gastos |
| ExpenseTrendDialog | `ExpenseTrendDialog.tsx` | Tendencias |
| ExpenseInsights | `ExpenseInsights.tsx` | Insights automaticos |

### Business Rules - Gastos

#### KPIs

| KPI | Calculo |
|-----|---------|
| Total Gastos | SUM(gastos del periodo) |
| Promedio Diario | Total / dias_del_periodo |
| Gasto Mayor | MAX(gasto individual) |
| Categoria Top | Categoria con mayor suma |

#### Categorias de Gasto

Ver lista completa en [transacciones.md](./transacciones.md#tipos-de-gasto-expensesource)

---

## Cartera Muerta

**Ruta**: `/administrar/cartera-muerta`
**Archivo**: `app/(auth)/administrar/cartera-muerta/page.tsx`

### Descripcion

Gestion de prestamos marcados como incobrables (dead debt).

### Business Rules - Cartera Muerta

| Regla | Descripcion |
|-------|-------------|
| Definicion | Prestamos sin pago por 8+ semanas y sin esperanza de cobro |
| Marcado | Admin puede marcar prestamo como "muerto" |
| Recuperacion | Si cliente paga, se registra como "cartera muerta recuperada" |
| Exclusion | No aparece en reportes de cartera activa |

---

## Nuevo Lider

**Ruta**: `/administrar/lideres/nuevo`
**Archivo**: `app/(auth)/administrar/lideres/nuevo/page.tsx`

### Componentes

| Componente | Descripcion |
|------------|-------------|
| LeaderFormSection | Formulario de datos del lider |
| LocationSection | Seccion de localidad |
| CreateLocationForm | Formulario para nueva localidad |
| ExistingLeaderWarning | Warning si ya existe lider |
| ActionButtons | Botones de accion |

### Flujo de Creacion

```
1. Llenar datos personales del lider
2. Seleccionar ruta donde trabajara
3. Crear nueva localidad O seleccionar existente
4. Validar que no exista lider duplicado
5. Crear empleado tipo LEAD
6. Crear cuentas asociadas (EMPLOYEE_CASH_FUND, etc)
```

### Business Rules - Lideres

| Regla | Descripcion |
|-------|-------------|
| Tipo | Employee con type = 'LEAD' |
| Ruta | Debe pertenecer a una ruta |
| Localidad | Debe tener localidad asignada |
| Cuentas | Se crean automaticamente al crear lider |
| Unicidad | No puede haber 2 lideres en misma localidad |

---

## Usuarios

**Ruta**: `/administrar/usuarios`
**Archivo**: `app/(auth)/administrar/usuarios/page.tsx`

### Componentes

| Componente | Descripcion |
|------------|-------------|
| UserTable | Tabla de usuarios |
| UserFormDialog | Crear/editar usuario |
| ChangePasswordDialog | Cambiar contrasena |
| EmployeeSelector | Selector de empleado |
| PersonalDataSelector | Selector de datos personales |

### Business Rules - Usuarios

#### Roles

| Rol | Permisos |
|-----|----------|
| ADMIN | Acceso total |
| CEO | Dashboard, reportes, transacciones |
| ROUTE_SUPERVISOR | Operaciones de su ruta |
| LEAD | Operaciones de su localidad |

#### Creacion de Usuario

```
1. Seleccionar empleado existente O crear datos personales
2. Asignar username unico
3. Asignar contrasena temporal
4. Asignar rol
5. Usuario puede cambiar contrasena en primer login
```

---

## Usuarios Telegram

**Ruta**: `/administrar/usuarios-telegram`
**Archivo**: `app/(auth)/administrar/usuarios-telegram/page.tsx`

### Componentes

| Componente | Descripcion |
|------------|-------------|
| TelegramUsersTable | Tabla de usuarios Telegram |
| TelegramUserStats | Estadisticas |

### Business Rules

| Regla | Descripcion |
|-------|-------------|
| Vinculacion | Usuario se vincula via bot de Telegram |
| Chat ID | Se obtiene automaticamente al iniciar chat |
| Notificaciones | Solo usuarios vinculados reciben notificaciones |

---

## Notificaciones Telegram

**Ruta**: `/administrar/notificaciones-telegram`
**Archivo**: `app/(auth)/administrar/notificaciones-telegram/page.tsx`

### Componentes

| Componente | Descripcion |
|------------|-------------|
| TelegramUsersTab | Lista de usuarios |
| ReportConfigTab | Configuracion de reportes |
| NotificationHistoryTab | Historial de notificaciones |

### Configuracion de Reportes

| Reporte | Frecuencia | Contenido |
|---------|------------|-----------|
| Diario | 8am | Resumen del dia anterior |
| Semanal | Lunes 9am | Resumen de la semana |
| Mensual | Dia 1, 10am | Resumen del mes |

---

## Rutas

**Ruta**: `/administrar/rutas`
**Archivo**: `app/(auth)/administrar/rutas/page.tsx`

### Componentes

| Componente | Descripcion |
|------------|-------------|
| RouteBreakdownTable | Tabla de rutas con KPIs |
| LocalityList | Lista de localidades de una ruta |
| CreateRouteModal | Crear nueva ruta |
| MoveLocalitiesPanel | Mover localidades entre rutas |
| LocationHistoryPanel | Historial de movimientos |
| AddHistoryModal | Agregar entrada de historial |
| BatchAddHistoryModal | Agregar historial en lote |
| MoveConfirmationModal | Confirmar movimiento |

### Business Rules - Rutas

#### Estructura Jerarquica

```
Empresa
└── Rutas (ej: "Ruta Norte", "Ruta Sur")
    └── Localidades (ej: "Centro", "Periferia")
        └── Lideres (empleados tipo LEAD)
            └── Clientes (borrowers)
```

#### KPIs por Ruta

| KPI | Descripcion |
|-----|-------------|
| Clientes Activos | Total clientes con prestamo activo |
| CV | Clientes en cartera vencida |
| % CV | Porcentaje de CV |

#### Mover Localidades

```
1. Seleccionar localidad(es) a mover
2. Seleccionar ruta destino
3. Confirmar movimiento
4. Sistema actualiza leadId.routeId
5. Historial se registra automaticamente
```

#### Crear Nueva Ruta

```
1. Ingresar nombre de ruta
2. Sistema crea ruta vacia
3. Mover localidades existentes O crear nuevas
```

### Historial de Localidades

| Campo | Descripcion |
|-------|-------------|
| fecha | Fecha del movimiento |
| rutaOrigen | Ruta de origen |
| rutaDestino | Ruta de destino |
| motivo | Razon del movimiento |
| usuario | Usuario que realizo el cambio |

---

## Queries GraphQL

| Query | Modulo | Uso |
|-------|--------|-----|
| GET_ROUTES | Varios | Lista de rutas |
| GET_USERS | Usuarios | Lista de usuarios |
| GET_EMPLOYEES | Lideres | Lista de empleados |
| GET_TELEGRAM_USERS | Telegram | Usuarios vinculados |
| GET_ROUTE_KPIS | Rutas | KPIs por ruta |
| GET_LOCALITIES | Rutas | Localidades de una ruta |
| GET_EXPENSE_ANALYTICS | Gastos | Analitica de gastos |

---

## Mutations GraphQL

| Mutation | Modulo | Uso |
|----------|--------|-----|
| CREATE_USER | Usuarios | Crear usuario |
| UPDATE_USER | Usuarios | Actualizar usuario |
| CHANGE_PASSWORD | Usuarios | Cambiar contrasena |
| CREATE_EMPLOYEE | Lideres | Crear empleado/lider |
| CREATE_ROUTE | Rutas | Crear ruta |
| MOVE_LOCALITIES | Rutas | Mover localidades |
| ADD_LOCATION_HISTORY | Rutas | Agregar historial |

---

## Notas Importantes

1. **Permisos**: Solo ADMIN puede acceder a este modulo
2. **Auditoria**: Cambios importantes se registran en historial
3. **Integridad**: No se pueden eliminar rutas con localidades activas
4. **Telegram**: La vinculacion es iniciada por el usuario via bot
