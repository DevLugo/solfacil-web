/**
 * Distribuye un monto entre multiples rutas, manejando el residuo correctamente.
 * El ultimo elemento recibe el residuo para asegurar que la suma sea exacta.
 *
 * @param total - Monto total a distribuir
 * @param routeIds - Array de IDs de rutas
 * @returns Map con routeId -> amount
 */
export function distributeAmount(
  total: number,
  routeIds: string[]
): Map<string, number> {
  if (routeIds.length === 0) {
    return new Map()
  }

  const perRoute = Math.floor((total / routeIds.length) * 100) / 100
  const distributed = new Map<string, number>()
  const remainder = parseFloat((total - perRoute * routeIds.length).toFixed(2))

  routeIds.forEach((id, index) => {
    // El ultimo elemento recibe el residuo
    const amount =
      index === routeIds.length - 1
        ? parseFloat((perRoute + remainder).toFixed(2))
        : perRoute
    distributed.set(id, amount)
  })

  return distributed
}

/**
 * Genera un ID de grupo unico para gastos distribuidos
 */
export function generateGroupId(): string {
  return `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}
