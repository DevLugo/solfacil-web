/**
 * VDO (Valor de Deuda Observada) Calculations
 *
 * Cálculos para determinar el monto adeudado por un préstamo basado en
 * las semanas sin pago y el sobrepago acumulado (abono parcial).
 */

export interface LoanLike {
  id?: string;
  signDate: string;
  expectedWeeklyPayment?: number | string;
  requestedAmount?: number | string;
  loantype?: { weekDuration?: number; rate?: number | string } | null;
  payments?: Array<{ amount: number | string; receivedAt?: string; createdAt?: string }>;
}

export interface VDOResult {
  expectedWeeklyPayment: number;
  weeksWithoutPayment: number;
  arrearsAmount: number;          // Monto adeudado (PAGO VDO)
  partialPayment: number;         // Abono parcial (sobrepago disponible)
}

export interface AbonoParcialResult {
  expectedWeeklyPayment: number;
  totalPaidInCurrentWeek: number;
  abonoParcialAmount: number;
}

/**
 * Convierte un valor a número, manejando strings, undefined y null
 */
function toNumber(value: number | string | undefined | null): number {
  if (value === undefined || value === null) return 0;
  if (typeof value === 'number') return value;
  const n = parseFloat(String(value));
  return isNaN(n) ? 0 : n;
}

/**
 * Calcula el pago semanal esperado de un préstamo
 * Usa expectedWeeklyPayment si está disponible, de lo contrario lo calcula
 */
export function computeExpectedWeeklyPayment(loan: LoanLike): number {
  const direct = toNumber(loan.expectedWeeklyPayment as any);
  if (direct > 0) return direct;

  const rate = toNumber(loan.loantype?.rate as any);
  const duration = loan.loantype?.weekDuration ?? 0;
  const principal = toNumber(loan.requestedAmount as any);

  if (duration && principal) {
    const total = principal * (1 + rate);
    return total / duration;
  }

  return 0;
}

/**
 * Obtiene el lunes de una fecha en formato ISO (lunes = 0)
 */
function getIsoMonday(d: Date): Date {
  const date = new Date(d);
  const isoDow = (date.getUTCDay() + 6) % 7; // 0=lunes
  date.setUTCDate(date.getUTCDate() - isoDow);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

/**
 * Calcula el VDO (Valor de Deuda Observada) para un préstamo
 *
 * @param loan - Datos del préstamo
 * @param now - Fecha actual de referencia
 * @param weekMode - 'current' para semana en curso, 'next' para siguiente semana
 *
 * @returns VDOResult con información de deuda y sobrepago
 *
 * Lógica:
 * - Para 'current': evalúa hasta el domingo anterior (semana pasada completa)
 * - Para 'next': evalúa hasta el domingo actual (semana actual completa)
 * - La semana de firma (semana 0) no cuenta para VDO
 * - El sobrepago se acumula entre semanas
 * - No se arrastra déficit entre semanas
 */
export function calculateVDOForLoan(
  loan: LoanLike,
  now: Date,
  weekMode: 'current' | 'next' = 'current'
): VDOResult {
  const expectedWeeklyPayment = computeExpectedWeeklyPayment(loan);
  const signDate = new Date(loan.signDate);

  // Calcular la fecha límite de evaluación según el modo de semana
  const weekStart = getIsoMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Para semana en curso: evaluar solo hasta el final de la semana anterior
  // Para semana siguiente: evaluar hasta HOY (no hasta el domingo futuro)
  const previousWeekEnd = new Date(weekStart);
  previousWeekEnd.setDate(weekStart.getDate() - 1);
  previousWeekEnd.setHours(23, 59, 59, 999);

  // IMPORTANTE: Para 'next', usamos HOY como fecha límite si aún no es domingo
  // Esto permite contar pagos de la semana actual sin evaluar la semana como "sin pago"
  // La semana actual solo se evalúa completamente si ya terminó (es domingo o después)
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Para 'next': usar el mínimo entre HOY y el domingo actual
  // Si hoy es domingo, weekEnd. Si hoy es antes del domingo, usar todayEnd
  const evaluationEndDate = weekMode === 'current'
    ? previousWeekEnd // Final de la semana anterior (domingo anterior)
    : (todayEnd < weekEnd ? todayEnd : weekEnd); // Hasta HOY o hasta el domingo (lo que sea menor)

  // Generar semanas desde el lunes de la semana de firma
  const weeks: Array<{ monday: Date; sunday: Date }> = [];
  let currentMonday = getIsoMonday(signDate);

  while (currentMonday <= evaluationEndDate) {
    const end = new Date(currentMonday);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    // Solo agregar la semana si su domingo no excede la fecha límite
    if (end <= evaluationEndDate) {
      weeks.push({ monday: new Date(currentMonday), sunday: end });
    }

    currentMonday.setDate(currentMonday.getDate() + 7);
  }

  // NUEVA LÓGICA: Calcular VDO basado en balance global, no semana por semana
  // Esto permite que un pago doble "recupere" faltas de semanas anteriores

  // Contar semanas que requieren pago (excluyendo semana de gracia)
  let weeksRequiringPayment = 0;
  let totalPaidInPeriod = 0;

  for (let i = 0; i < weeks.length; i++) {
    const week = weeks[i];
    if (week.sunday > evaluationEndDate) break;

    // Total pagado en la semana
    let weeklyPaid = 0;
    for (const p of loan.payments || []) {
      const dtStr = p.receivedAt || p.createdAt;
      if (!dtStr) continue;
      const dt = new Date(dtStr);
      if (dt >= week.monday && dt <= week.sunday) {
        weeklyPaid += toNumber(p.amount);
      }
    }

    totalPaidInPeriod += weeklyPaid;

    // La semana de firma (i=0) no cuenta como semana que requiere pago
    // Los pagos de esa semana SÍ cuentan como sobrepago/adelanto
    if (i > 0) {
      weeksRequiringPayment++;
    }
  }

  // Calcular cuánto debería haber pagado hasta ahora
  const totalExpected = weeksRequiringPayment * expectedWeeklyPayment;

  // Calcular déficit (si pagó menos de lo esperado)
  const deficit = Math.max(0, totalExpected - totalPaidInPeriod);

  // Calcular semanas de atraso basado en el déficit
  // Si pagó $2500 cuando debía $2000, está al día (0 semanas de atraso)
  // Si pagó $1500 cuando debía $2000, tiene 1 semana de atraso ($500 de déficit)
  const weeksWithoutPayment = expectedWeeklyPayment > 0
    ? Math.ceil(deficit / expectedWeeklyPayment)
    : 0;

  // El sobrepago acumulado es lo que pagó de más
  const surplusAccumulated = Math.max(0, totalPaidInPeriod - totalExpected);

  // Calcular deuda total pendiente
  const totalDebt = loan.requestedAmount
    ? toNumber(loan.requestedAmount) * (1 + toNumber(loan.loantype?.rate || 0))
    : 0;

  let totalPaid = 0;
  for (const p of loan.payments || []) {
    totalPaid += toNumber(p.amount);
  }
  const pendingAmount = Math.max(0, totalDebt - totalPaid);

  // El PAGO VDO no puede ser mayor a la deuda total pendiente
  const arrearsAmount = Math.min(
    weeksWithoutPayment * expectedWeeklyPayment,
    pendingAmount
  );

  return {
    expectedWeeklyPayment,
    weeksWithoutPayment,
    arrearsAmount,
    partialPayment: Math.max(0, surplusAccumulated)
  };
}

/**
 * Calcula el abono parcial para un préstamo en la semana actual
 *
 * @param loan - Datos del préstamo
 * @param now - Fecha actual de referencia
 *
 * @returns AbonoParcialResult con el sobrepago de la semana actual
 */
export function calculateAbonoParcialForLoan(
  loan: LoanLike,
  now: Date
): AbonoParcialResult {
  const expectedWeeklyPayment = computeExpectedWeeklyPayment(loan);
  const weekStart = getIsoMonday(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  let totalPaidInCurrentWeek = 0;
  for (const p of loan.payments || []) {
    const dtStr = p.receivedAt || p.createdAt;
    if (!dtStr) continue;
    const dt = new Date(dtStr);
    if (dt >= weekStart && dt <= weekEnd) {
      totalPaidInCurrentWeek += toNumber(p.amount);
    }
  }

  const abonoParcialAmount = Math.max(0, totalPaidInCurrentWeek - expectedWeeklyPayment);

  return {
    expectedWeeklyPayment,
    totalPaidInCurrentWeek,
    abonoParcialAmount
  };
}
