# Claude Code Settings - SoluFacil Web

## Instrucciones para Desarrollo de Features

### IMPORTANTE: Documentacion de Modulos

Antes de trabajar en cualquier feature o bug fix, **DEBES** seguir estos pasos:

1. **Identificar el modulo afectado** basado en la ruta o componente:
   - `/dashboard` → `docs/modules/dashboard.md`
   - `/transacciones` → `docs/modules/transacciones.md`
   - `/reportes/*` → `docs/modules/reportes.md`
   - `/administrar/*` → `docs/modules/administrar.md`
   - `/historial-clientes` → `docs/modules/historial-clientes.md`
   - `/documentos/*` → `docs/modules/documentos.md`
   - `/listados/*` → `docs/modules/listados.md`

2. **Leer la documentacion del modulo** para entender:
   - Business Rules existentes
   - Flujos de datos
   - Componentes involucrados
   - Queries/Mutations GraphQL
   - Validaciones requeridas

3. **Respetar las Business Rules** documentadas:
   - No contradecir reglas existentes
   - Mantener consistencia con el comportamiento actual
   - Consultar con el usuario si hay conflicto

4. **Al terminar, actualizar la documentacion**:
   - Agregar nuevas Business Rules si aplica
   - Documentar nuevos componentes creados
   - Actualizar flujos modificados
   - Agregar edge cases descubiertos

---

## Estructura de Documentacion

```
docs/
├── modules/
│   ├── dashboard.md         # Dashboard CEO/Admin
│   ├── transacciones.md     # Operaciones del dia
│   ├── reportes.md          # Reportes y analitica
│   ├── administrar.md       # Administracion del sistema
│   ├── historial-clientes.md # Historial de clientes
│   ├── documentos.md        # Gestion de documentos
│   └── listados.md          # Generacion de listados PDF
└── gastos-tab.md            # Documentacion detallada de gastos (legacy)
```

---

## Reglas de Codigo (Heredadas de AGENTS.md)

### Git
- NUNCA hacer commits automaticos sin confirmacion
- NUNCA agregar "Co-Authored-By: Claude"
- NUNCA hacer push automatico

### Codigo
- NUNCA crear archivos nuevos a menos que sea necesario
- Preferir editar archivos existentes
- NUNCA agregar comentarios innecesarios
- NUNCA agregar emojis

### Arquitectura
- No duplicar logica (DRY)
- Buscar codigo existente antes de escribir nuevo
- Usar `@solufacil/business-logic` para calculos financieros
- El frontend MUESTRA datos, no los calcula

### Balances
- NUNCA calcular balances en componentes
- Usar funciones de `@solufacil/business-logic`
- Usar Decimal.js, no `number` para calculos financieros

---

## Features Recientes

### Listado de Lideres (`/administrar/lideres`)

Pagina para ver todos los lideres con sus datos y detectar faltantes.

**Archivos:**
- `app/(auth)/administrar/lideres/page.tsx` - Pagina principal con tabla
- `app/(auth)/administrar/lideres/components/edit-leader-dialog.tsx` - Dialog para editar datos del lider
- `graphql/queries/leader.ts` - Query `GET_LEADERS`
- `graphql/mutations/leader.ts` - Mutations `CREATE_NEW_LEADER`, `UPDATE_LEADER`
- `components/layout/sidebar.tsx` - Link "Lideres" en sidebar (antes era "Nuevo Lider")
- `lib/permissions.ts` - Permisos ADMIN + CAPTURA

**Funcionalidad:**
- Tabla con nombre, cumpleanos, telefono, localidad y ruta
- Indicadores visuales de datos faltantes (sin cumpleanos, sin telefono)
- Filtro por ruta
- Edicion inline de datos del lider

### Auto-Distribucion de Comisiones en Abonos (`/transacciones` > Abonos)

Sistema para distribuir automaticamente la comision reportada entre los creditos.

**Archivos:**
- `components/features/transactions/abonos/components/ActionBar.tsx` - Barra con input "Comision reportada" y boton "Distribuir"
- `components/features/transactions/abonos/components/LoanPaymentRow.tsx` - Fila de pago con resaltado visual de casos especiales
- `components/features/transactions/abonos/hooks/usePayments.ts` - Hook con logica de distribucion
- `components/features/transactions/abonos/types.ts` - Tipos actualizados
- `components/features/transactions/abonos/utils.ts` - Utilidades de distribucion

**Logica de distribucion:**
- Ingresa total de comision reportada → se distribuye automaticamente segun tipo de credito
- Respeta: comision doble si pago >= 2x esperado, comision mitad si pago < esperado, comision diferente por tipo de credito
- Deja sin abono creditos que no cuadren para hacer match con el total
- Resalta visualmente los casos especiales (comision 0, doble, diferente) para el capturista

**UX:**
- Input prominente "Comision reportada" con boton "Distribuir" (color indigo, fila superior)
- Comision fija (global) como control secundario compacto
- Casos especiales resaltados para deteccion rapida

### Comision Global por Primer Pago (Modal de Creditos)

Control de comisiones globales en el modal de creacion de creditos.

**Archivos:**
- `components/features/transactions/creditos/components/CreateLoansModal/GlobalCommissionControl.tsx` - Control rediseñado con dos inputs
- `components/features/transactions/creditos/components/CreateLoansModal/PendingLoanCard.tsx` - Card que muestra ambas comisiones
- `components/features/transactions/creditos/components/CreateLoansModal/index.tsx` - Estado y handler de aplicacion

**Funcionalidad:**
- Seccion "Comisiones globales" con dos inputs: "Por credito" y "Primer pago"
- "Primer pago" solo aparece si algun credito pendiente tiene primer pago habilitado
- Boton "Aplicar" aplica ambas comisiones en un solo paso (sin race condition)
- Si hay un credito en edicion, los inputs del formulario tambien se actualizan
- PendingLoanCard muestra "Com. credito: $X" y "Com. 1er pago: $X" por separado

**Reglas de aplicacion:**
- Comision por credito: solo aplica a creditos que ya tienen comision > 0
- Comision primer pago: solo aplica a creditos que tienen primer pago habilitado

---

## Flujo de Trabajo Recomendado

```
1. Leer documentacion del modulo
2. Entender business rules existentes
3. Implementar cambios respetando reglas
4. Probar cambios
5. Actualizar documentacion si es necesario
6. Esperar confirmacion para commit
```

---

## Ejemplo de Proceso

### Solicitud: "Agregar filtro de fecha al tab de gastos"

1. **Leer**: `docs/modules/transacciones.md` (seccion Gastos)
2. **Entender**:
   - Los gastos ya se filtran por fecha via `selectedDate` del context
   - La fecha se selecciona en `TransactionSelectors`
3. **Verificar**: Si el filtro ya existe o necesita modificarse
4. **Implementar**: Siguiendo patrones existentes
5. **Actualizar doc**: Si se agrega nuevo comportamiento

---

## Archivos de Referencia

| Proposito | Archivo |
|-----------|---------|
| Reglas generales | `AGENTS.md` |
| Overview proyecto | `README.md` |
| Modulos | `docs/modules/*.md` |
| Tipos compartidos | `packages/shared/src/types/` |
| Calculos | `packages/business-logic/src/` |

---

## Contacto con Usuario

Si encuentras:
- Conflicto entre business rules y solicitud
- Necesidad de crear archivo nuevo
- Cambio que afecta multiples modulos
- Duda sobre comportamiento esperado

**Pregunta al usuario antes de proceder.**
