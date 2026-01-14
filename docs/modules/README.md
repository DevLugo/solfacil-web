# Documentacion de Modulos - SoluFacil Web

Este directorio contiene la documentacion detallada de cada modulo del sistema.

## Indice de Modulos

| Modulo | Archivo | Ruta en App | Descripcion |
|--------|---------|-------------|-------------|
| Dashboard | [dashboard.md](./dashboard.md) | `/dashboard` | Panel principal CEO/Admin |
| Transacciones | [transacciones.md](./transacciones.md) | `/transacciones` | Operaciones del dia |
| Reportes | [reportes.md](./reportes.md) | `/reportes/*` | Reportes y analitica |
| Administrar | [administrar.md](./administrar.md) | `/administrar/*` | Administracion del sistema |
| Historial Clientes | [historial-clientes.md](./historial-clientes.md) | `/historial-clientes` | Historial de clientes |
| Documentos | [documentos.md](./documentos.md) | `/documentos/*` | Gestion de documentos |
| Listados | [listados.md](./listados.md) | `/listados/*` | Generacion de PDFs |

## Documentacion Detallada

| Documento | Descripcion |
|-----------|-------------|
| [gastos-tab.md](./gastos-tab.md) | Documentacion exhaustiva del tab de gastos con edge cases |

---

## Proposito

Esta documentacion sirve para:

1. **Onboarding**: Nuevos desarrolladores pueden entender cada modulo rapidamente
2. **Claude Code**: Claude debe leer la documentacion del modulo antes de trabajar en features
3. **Business Rules**: Referencia centralizada de reglas de negocio
4. **Consistencia**: Asegurar que cambios respeten el comportamiento existente

---

## Estructura de Cada Documento

Cada documento de modulo contiene:

- **Descripcion General**: Que hace el modulo
- **Componentes**: Lista de componentes principales
- **Business Rules**: Reglas de negocio a respetar
- **Flujos**: Diagramas de flujo de las operaciones
- **Queries/Mutations**: GraphQL utilizado
- **Estados de UI**: Estados posibles y comportamiento
- **Notas Importantes**: Consideraciones especiales

---

## Mantenimiento

- Actualizar al agregar nuevas features
- Documentar edge cases descubiertos
- Mantener sincronizado con el codigo
- Revisar periodicamente para accuracy

---

## Como Contribuir

1. Leer el documento existente del modulo
2. Agregar/modificar seccion relevante
3. Usar formato consistente (tablas, codigo, listas)
4. No agregar emojis
5. Ser conciso pero completo
