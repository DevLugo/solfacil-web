import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { FileText, Upload, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { LoanDocument } from '@/types/documents'
import { calculateLoanDocumentStats, getLoanStatusBadge } from '@/lib/documents'

interface LoanDocumentCardProps {
  loan: LoanDocument
  onViewDocuments: (loanId: string) => void
}

/**
 * Card component for displaying loan information and document status
 * Shows borrower details, loan info, and document upload status
 */
export function LoanDocumentCard({
  loan,
  onViewDocuments,
}: LoanDocumentCardProps) {
  // Calculate document statistics using utility function
  const stats = calculateLoanDocumentStats(loan)

  // Get status badge using utility function
  const status = getLoanStatusBadge(stats)

  return (
    <Card className="hover:shadow-md transition-shadow" style={{maxWidth: '100%', width: '100%', overflow: 'hidden', boxSizing: 'border-box'}}>
      <CardHeader className="pb-2 md:pb-3 px-4 md:px-6 pt-3 md:pt-6 w-full" style={{boxSizing: 'border-box'}}>
        <div className="flex items-start justify-between gap-2 max-w-full">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-sm md:text-base font-semibold truncate">
              {loan.borrower.personalData.fullName}
            </CardTitle>
            {loan.borrower.personalData.clientCode && (
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                Código: {loan.borrower.personalData.clientCode}
              </p>
            )}
            {loan.lead?.location?.name && (
              <p className="text-xs text-muted-foreground truncate">
                {loan.lead.location.name}
              </p>
            )}
          </div>
          <Badge variant={status.variant} className="shrink-0 text-[10px] md:text-xs px-1.5 py-0.5 md:px-2 md:py-1">
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 md:space-y-4 px-4 md:px-6 pb-3 md:pb-6 w-full" style={{boxSizing: 'border-box'}}>
        {/* Loan details - compact on mobile */}
        <div className="grid grid-cols-2 gap-2 text-xs md:text-sm w-full">
          <div className="min-w-0 overflow-hidden">
            <p className="text-muted-foreground text-[10px] md:text-xs">Monto</p>
            <p className="font-medium truncate">{formatCurrency(parseFloat(loan.amountGived))}</p>
          </div>
          <div className="min-w-0 overflow-hidden">
            <p className="text-muted-foreground text-[10px] md:text-xs">Tipo</p>
            <p className="font-medium truncate">{loan.loantype.name}</p>
          </div>
        </div>

        {/* Document statistics - visual indicators */}
        <div className="flex flex-wrap gap-1.5 md:gap-2 text-[10px] md:text-xs w-full">
          {stats.correctDocuments > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-green-50 rounded-md shrink-0">
              <CheckCircle className="h-3 w-3 text-green-600" />
              <span className="text-green-700 font-medium">{stats.correctDocuments} Cargado{stats.correctDocuments > 1 ? 's' : ''}</span>
            </div>
          )}
          {stats.documentsWithErrors > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-md shrink-0">
              <XCircle className="h-3 w-3 text-red-600" />
              <span className="text-red-700 font-medium">{stats.documentsWithErrors} Error{stats.documentsWithErrors > 1 ? 'es' : ''}</span>
            </div>
          )}
          {stats.missingDocuments > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-yellow-50 rounded-md shrink-0">
              <AlertTriangle className="h-3 w-3 text-yellow-600" />
              <span className="text-yellow-700 font-medium">{stats.missingDocuments} Sin doc</span>
            </div>
          )}
          {(stats.expectedDocuments - stats.uploadedDocuments) > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-md shrink-0">
              <FileText className="h-3 w-3 text-blue-600" />
              <span className="text-blue-700 font-medium">{stats.expectedDocuments - stats.uploadedDocuments} Pendiente{(stats.expectedDocuments - stats.uploadedDocuments) > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>

        {/* Action buttons - responsive */}
        <div className="flex gap-1.5 md:gap-2 w-full">
          <Button
            onClick={() => onViewDocuments(loan.id)}
            size="sm"
            className="flex-1 text-xs md:text-sm h-8 md:h-9 min-w-0 px-2 md:px-4"
            variant="default"
          >
            <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 shrink-0" />
            <span className="truncate">Documentos</span>
            {stats.totalDocuments > 0 && (
              <span className="ml-1">({stats.totalDocuments})</span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
