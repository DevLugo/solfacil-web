# AGENTS.md - Solufacil Web (@solufacil/web)

## Reglas Fundamentales

### Reglas de Git
- **NUNCA hacer commits automaticos** - Siempre esperar confirmacion explicita del usuario
- **NUNCA agregar "Co-Authored-By: Claude"** ni ninguna atribucion automatica en commits
- **NUNCA hacer push automatico** - Solo cuando el usuario lo solicite explicitamente

### Reglas de Codigo
- **NUNCA crear archivos nuevos** a menos que sea absolutamente necesario
- **Preferir editar archivos existentes** sobre crear nuevos
- **NUNCA agregar comentarios innecesarios** o documentacion no solicitada
- **NUNCA agregar emojis** a menos que el usuario lo solicite

---

## Reglas de Arquitectura (CRITICAS)

### DRY - Don't Repeat Yourself
- **NUNCA duplicar logica** - Si algo se repite, extraerlo a hook/utilidad
- **Buscar codigo existente antes de escribir nuevo**
- **Componentes similares deben consolidarse**
- **Hooks con logica repetida** deben abstraerse

### Logica de Balances - Usar business-logic

**IMPORTANTE**: Toda logica financiera esta en `@solufacil/business-logic` y sera migrada a Flutter.

#### Reglas:
1. **NUNCA calcular balances/profit en componentes**
   - Usar funciones de `@solufacil/business-logic`
   - El API ya devuelve datos calculados

2. **Para calculos en cliente** (si es necesario):
   - Importar de `@solufacil/business-logic`
   - Usar Decimal.js, no `number`

3. **El frontend principalmente MUESTRA datos**
   - Los calculos criticos los hace el API
   - Solo formateo/display en componentes

---

## Estructura del Proyecto

```
web/
├── app/                    # App Router de Next.js (rutas y paginas)
│   ├── (auth)/            # Rutas protegidas (requieren autenticacion)
│   └── (public)/          # Rutas publicas
├── components/            # Componentes React
│   ├── ui/               # Componentes base (shadcn/ui)
│   ├── features/         # Componentes de features especificas
│   ├── layout/           # Componentes de layout
│   ├── auth/             # Componentes de autenticacion
│   └── shared/           # Componentes compartidos
├── hooks/                 # Custom React hooks
├── lib/                   # Utilidades y configuraciones
├── graphql/               # Queries y mutations GraphQL
├── packages/              # Paquetes internos del monorepo
│   ├── shared/           # Tipos y utilidades compartidas
│   ├── graphql-schema/   # Schema GraphQL compartido
│   └── business-logic/   # Logica de negocio compartida
├── e2e/                   # Tests end-to-end (Playwright)
├── styles/                # Estilos globales
└── public/                # Assets estaticos
```

---

## Stack Tecnologico

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19
- **Estilos**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Estado/Data**: Apollo Client (GraphQL)
- **Forms**: React Hook Form + Zod
- **Testing**: Playwright (E2E)
- **Package Manager**: pnpm (workspace)

---

## Convenciones

### Componentes
- Usar componentes de `components/ui/` para elementos base
- Crear features en `components/features/`
- Los componentes deben ser funcionales con TypeScript

### Rutas
- Rutas protegidas van en `app/(auth)/`
- Rutas publicas van en `app/(public)/`
- Seguir convenciones de Next.js App Router

### GraphQL
- Queries y mutations en `graphql/`
- Usar Apollo Client hooks (`useQuery`, `useMutation`)

### Estilos
- Usar Tailwind CSS para estilos
- Usar `cn()` de `lib/utils` para clases condicionales
- Evitar CSS custom cuando Tailwind sea suficiente

---

## Scripts Disponibles

```bash
pnpm dev          # Servidor de desarrollo (puerto 3000)
pnpm build        # Build de produccion
pnpm test:e2e     # Ejecutar tests E2E
pnpm lint         # Linter
```

---

## Paquetes Internos

Este proyecto usa paquetes del workspace:
- `@solufacil/shared` - Tipos y utilidades compartidas
- `@solufacil/graphql-schema` - Schema GraphQL
- `@solufacil/business-logic` - Logica de negocio
