import { useState, useMemo } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Loader2, FileX, Search, X, Filter } from 'lucide-react'
import { LoanDocumentCard } from './LoanDocumentCard'
import { calculateLoanDocumentStats } from '@/lib/documents'
import type { LoanDocument } from '@/types/documents'

interface LoansListProps {
  loans: LoanDocument[]
  loading: boolean
  onViewDocuments: (loanId: string) => void
}

type FilterType = 'pending' | 'problems' | 'all'

/**
 * Scrollable list of loans with document status
 * Includes filters for pending review and problem documents
 */
export function LoansList({
  loans,
  loading,
  onViewDocuments,
}: LoansListProps) {
  const [filter, setFilter] = useState<FilterType>('pending')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(true)

  // Calculate filter counts
  const filterCounts = useMemo(() => {
    const pending = loans.filter(loan => {
      const stats = calculateLoanDocumentStats(loan)
      return stats.hasPending
    }).length

    const problems = loans.filter(loan => {
      const stats = calculateLoanDocumentStats(loan)
      return stats.hasProblems
    }).length

    return { pending, problems, all: loans.length }
  }, [loans])

  // Filter loans based on selected filter and search term
  const filteredLoans = useMemo(() => {
    let result = loans

    // Apply status filter
    if (filter !== 'all') {
      result = result.filter(loan => {
        const stats = calculateLoanDocumentStats(loan)

        if (filter === 'pending') {
          // Show loans with pending review ("No revisados" - documents not yet reviewed)
          // A loan appears here if there are documents without any status yet
          // Even if some documents have errors, it still appears if there are pending ones
          return stats.hasPending
        }

        if (filter === 'problems') {
          // Show loans with errors
          return stats.hasProblems
        }

        return true
      })
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase().trim()
      result = result.filter(loan => {
        const clientName = loan.borrower?.personalData?.fullName?.toLowerCase() || ''
        const clientCode = loan.borrower?.personalData?.clientCode?.toLowerCase() || ''

        return clientName.includes(search) || clientCode.includes(search)
      })
    }

    return result
  }, [loans, filter, searchTerm])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Cargando préstamos...</p>
      </div>
    )
  }

  if (loans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <FileX className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <p className="font-medium">No hay préstamos</p>
          <p className="text-sm text-muted-foreground">
            No se encontraron préstamos para esta semana
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3 md:space-y-4 max-w-full overflow-x-hidden">
      {/* Search bar - always visible and sticky */}
      <div className="sticky top-0 z-10 bg-background pb-2 md:pb-3 border-b">
        <div className="space-y-2 md:space-y-3">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-9 h-9 md:h-10 text-sm"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Toggle filters button on mobile */}
          <div className="flex items-center justify-between md:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8 text-xs"
            >
              <Filter className="h-3.5 w-3.5 mr-1.5" />
              Filtros
              {!showFilters && (
                <Badge variant="secondary" className="ml-2 text-[10px] px-1.5">
                  {filter === 'pending' ? 'Pendientes' : filter === 'problems' ? 'Problemas' : 'Todos'}
                </Badge>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">
              {filteredLoans.length} resultado{filteredLoans.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Filter tabs - always visible on desktop, collapsible on mobile */}
          <div className={showFilters ? 'block' : 'hidden md:block'}>
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="pending" className="text-[11px] md:text-sm flex-col md:flex-row gap-0.5 md:gap-2 py-2 md:py-2.5">
                  <span>Pendientes</span>
                  {filterCounts.pending > 0 && (
                    <Badge variant="secondary" className="text-[10px] md:text-xs px-1 py-0 md:px-2 md:py-0.5">
                      {filterCounts.pending}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="problems" className="text-[11px] md:text-sm flex-col md:flex-row gap-0.5 md:gap-2 py-2 md:py-2.5">
                  <span>Problemas</span>
                  {filterCounts.problems > 0 && (
                    <Badge variant="destructive" className="text-[10px] md:text-xs px-1 py-0 md:px-2 md:py-0.5">
                      {filterCounts.problems}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all" className="text-[11px] md:text-sm flex-col md:flex-row gap-0.5 md:gap-2 py-2 md:py-2.5">
                  <span>Todos</span>
                  <Badge variant="secondary" className="text-[10px] md:text-xs px-1 py-0 md:px-2 md:py-0.5">
                    {filterCounts.all}
                  </Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Results count - desktop only */}
          <div className="hidden md:flex items-center justify-between">
            <p className="text-xs md:text-sm text-muted-foreground">
              {filteredLoans.length} {filteredLoans.length === 1 ? 'préstamo' : 'préstamos'}
            </p>
          </div>
        </div>
      </div>

      {/* Loans list */}
      {filteredLoans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <FileX className="h-12 w-12 text-muted-foreground" />
          <div className="text-center">
            <p className="font-medium">No hay préstamos en esta categoría</p>
            <p className="text-sm text-muted-foreground">
              {filter === 'pending' && 'No hay préstamos pendientes de subir documentos'}
              {filter === 'problems' && 'No hay préstamos con errores en documentos'}
            </p>
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[500px] md:h-[600px] w-full max-w-full loans-scroll-area">
          <div className="space-y-3 md:space-y-4 pr-4 pb-2 w-full loans-container" style={{maxWidth: '100%', display: 'block'}}>
            {filteredLoans.map((loan) => (
              <LoanDocumentCard
                key={loan.id}
                loan={loan}
                onViewDocuments={onViewDocuments}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
