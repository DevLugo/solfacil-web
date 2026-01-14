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
