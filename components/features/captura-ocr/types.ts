export interface CapturaException {
  pos: number
  marca: string
  montoPagado: number
  comision?: number
  paymentMethod: string
  notas?: string
  clientCode?: string
  loanId?: string
  borrowerId?: string
  montoImpreso?: number
  matchConfidence?: string
}

export interface CapturaCredit {
  nombre?: string
  clientCode?: string
  tipo?: string
  monto: number
  entregado?: number
  semanas?: number
  porcentaje?: number
  loantypeId?: string
  aval?: { nombre?: string; telefono?: string } | null
  telefonoTitular?: string
  loanIdAnterior?: string
  // Auto-match fields
  matchedClientPos?: number
  matchConfidence?: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'
  // Commission (from loantype.loanGrantedComission)
  comisionCredito?: number
  // First payment
  primerPago?: boolean
  primerPagoMonto?: number
  primerPagoComision?: number
  // Phone from DB (for diff detection against OCR-extracted phone)
  _dbPhone?: string
  _dbAvalPhone?: string
  _dbAvalNombre?: string
  // OCR original phones (for toggle back)
  _ocrPhone?: string
  _ocrAvalPhone?: string
  _ocrAvalNombre?: string
  // OCR edit tracking
  _ocrOriginal?: {
    nombre?: string
    monto?: number
    avalNombre?: string
    avalTelefono?: string
  }
}

export interface CapturaComision {
  clientes?: number
  tarifa?: number
  total: number
  cantidad?: number
}

export interface CapturaAdelanto {
  nombre?: string
  monto: number
}

export interface CapturaRecuperado {
  nombre?: string
  codigo?: string
  monto: number
}

export interface CapturaResumenInferior {
  cobranzaBase: number
  adelantosCreditos: CapturaAdelanto[]
  recuperados: CapturaRecuperado[]
  cobranzaTotal: number
  tarifaComision: number
  comisionRegular: CapturaComision
  comisionCreditos: CapturaComision
  comisionTotal: number
  cashToBank?: number
  inicialCaja?: number | null
}

export interface CapturaValidation {
  totalFilas: number
  marcasEnTabla: number
  marcasAlgoritmo: number
}

export interface CapturaClient {
  pos: number
  clientCode: string
  loanId: string
  borrowerId?: string
  borrowerName?: string
  expectedWeeklyPayment: number
  loanPaymentComission?: number
  // Loan financial (for renewal summary)
  requestedAmount?: number
  totalDebtAcquired?: number
  totalPaid?: number
  pendingBalance?: number
  // Loantype info (for calculations)
  loantypeId?: string
  loantypeName?: string
  weekDuration?: number
  rate?: number
  loanGrantedComission?: number
  // Collateral (for aval pre-fill)
  collateralName?: string
  collateralPhone?: string
  borrowerPhone?: string
  loanStatus?: string
}

export interface CapturaLocalityResult {
  localidad: string
  leadId: string
  locationId: string
  fecha: string
  totalClientes: number
  yaCaptured: boolean
  confidence: string
  errores: string[]
  duracionSegundos: number
  resumenInferior?: CapturaResumenInferior
  excepciones?: CapturaException[]
  creditos?: CapturaCredit[]
  validacion?: CapturaValidation
  clientsList?: CapturaClient[]
}

export interface CapturaUsage {
  claudeInputTokens: number
  claudeOutputTokens: number
  claudeCalls: number
  claudeCostUsd: number
  googleOcrCalls: number
  googleCostUsd: number
  totalCostUsd: number
}

export interface CapturaGasto {
  concepto: string
  monto: number
  expenseSource?: string
  description?: string
  sourceAccountType?: string
}

export interface CapturaLoanType {
  id: string
  name: string
  weekDuration: number
  rate: string
  loanPaymentComission: string
  loanGrantedComission: string
}

/**
 * Global extra collection entry — payment captured for a client from ANY
 * route without being bound to a specific locality's excepciones.
 * Stored at `CapturaResult.extracobranzas[]`.
 *
 * A single entry can split the payment between cash and bank transfer; the
 * backend materializes each non-zero amount as a separate `LoanPayment`
 * under the same `LeadPaymentReceived`.
 */
export interface CapturaExtracobranzaEntry {
  id: string
  matchedClientPos: number
  matchedLocalidad: string
  clientCode?: string
  borrowerName: string
  loanId?: string
  montoEfectivo: number
  montoTransferencia: number
}

export interface CapturaResult {
  sessionId: string
  fecha: string
  fechaPdf?: string
  fechaWarning?: string
  routeCode: string
  routeId: string
  localities: CapturaLocalityResult[]
  processingTimeSeconds: number
  usage?: CapturaUsage | null
  loantypes?: CapturaLoanType[]
  gastos?: CapturaGasto[]
  extracobranzas?: CapturaExtracobranzaEntry[]
}

export type JobStatus = 'pending' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed'

export interface UploadItem {
  id: string
  routeId: string
  routeCode: string
  routeName: string
  /** ISO date string (YYYY-MM-DD) assigned via grid cell */
  date?: string
  file: File | null
  status: JobStatus
  jobId?: string
  elapsedSeconds?: number
  error?: string
  progress?: string
  /** Upload progress: bytes sent / total bytes */
  uploadProgress?: { loaded: number; total: number }
  /** Queue position (1-based) when status is 'queued' */
  queuePosition?: number
  /** Total jobs in queue */
  queueTotal?: number
  result?: CapturaResult
}

export interface SystemLocality {
  locationKey: string
  localityName: string
  leaderName: string
  leaderId: string
  totalPayments: number
  cashPayments: number
  bankPayments: number
  paymentCount: number
  totalCommissions: number
  totalExpenses: number
  totalLoansGranted: number
  loansGrantedCount: number
  balanceEfectivo: number
  balanceBanco: number
  balance: number
}

// --- DB-backed types ---

export interface CapturaJobRecord {
  id: string
  status: string
  routeId: string
  routeCode: string
  date: string
  fileName: string
  pdfUrl: string | null
  result: CapturaResult | null
  editedResult: CapturaResult | null
  processingTimeSeconds: number | null
  costUsd: number | null
  confirmedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CapturaJobSummary {
  id: string
  status: string
  routeId: string
  routeCode: string
  date: string
  fileName: string
  localityCount: number
  processingTimeSeconds: number | null
  costUsd: number | null
  hasEdits: boolean
  confirmedAt: string | null
  createdAt: string
}

export interface CapturaDayGroup {
  date: string
  dayLabel: string
  jobs: CapturaJobSummary[]
}

export interface CapturaWeekGroup {
  weekStart: string
  weekLabel: string
  days: CapturaDayGroup[]
}
