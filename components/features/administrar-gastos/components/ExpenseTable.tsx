'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Filter,
  X,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import type { ExpenseTransaction } from '../types'
import { EXPENSE_SOURCE_LABELS, EXPENSE_TYPES } from '../constants'
import { formatCurrency } from '../utils'

interface ExpenseTableProps {
  expenses: ExpenseTransaction[]
  loading?: boolean
}

type SortField = 'date' | 'amount' | 'expenseSource' | 'route' | 'lead'
type SortDirection = 'asc' | 'desc'

export function ExpenseTable({ expenses, loading }: ExpenseTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 15

  // Filter and sort expenses
  const filteredExpenses = useMemo(() => {
    let result = [...expenses]

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter((expense) => {
        const label = EXPENSE_SOURCE_LABELS[expense.expenseSource || ''] || ''
        return (
          label.toLowerCase().includes(search) ||
          expense.route?.name.toLowerCase().includes(search) ||
          expense.lead?.personalData.fullName.toLowerCase().includes(search) ||
          expense.sourceAccount?.name.toLowerCase().includes(search)
        )
      })
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter((expense) => expense.expenseSource === selectedCategory)
    }

    // Sort
    result.sort((a, b) => {
      let aValue: string | number | Date
      let bValue: string | number | Date

      switch (sortField) {
        case 'date':
          aValue = new Date(a.date)
          bValue = new Date(b.date)
          break
        case 'amount':
          aValue = parseFloat(a.amount)
          bValue = parseFloat(b.amount)
          break
        case 'expenseSource':
          aValue = EXPENSE_SOURCE_LABELS[a.expenseSource || ''] || ''
          bValue = EXPENSE_SOURCE_LABELS[b.expenseSource || ''] || ''
          break
        case 'route':
          aValue = a.route?.name || ''
          bValue = b.route?.name || ''
          break
        case 'lead':
          aValue = a.lead?.personalData.fullName || ''
          bValue = b.lead?.personalData.fullName || ''
          break
        default:
          aValue = a.date
          bValue = b.date
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [expenses, searchTerm, selectedCategory, sortField, sortDirection])

  // Pagination
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage)
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-4 w-4" />
    return sortDirection === 'asc' ? (
      <ArrowUp className="h-4 w-4" />
    ) : (
      <ArrowDown className="h-4 w-4" />
    )
  }

  // Calculate totals for filtered data
  const totalAmount = filteredExpenses.reduce(
    (sum, e) => sum + parseFloat(e.amount),
    0
  )

  // Get unique categories from expenses
  const categories = useMemo(() => {
    const uniqueCategories = new Set(expenses.map((e) => e.expenseSource).filter(Boolean))
    return Array.from(uniqueCategories)
      .map((cat) => ({
        value: cat!,
        label: EXPENSE_SOURCE_LABELS[cat!] || cat!,
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [expenses])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Gastos</CardTitle>
          <CardDescription>Lista completa de gastos del mes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Cargando...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Detalle de Gastos</CardTitle>
            <CardDescription>
              {filteredExpenses.length} gastos • Total: {formatCurrency(totalAmount)}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por tipo, ruta, lider..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Select
            value={selectedCategory}
            onValueChange={(value) => {
              setSelectedCategory(value)
              setCurrentPage(1)
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Todas las categorias" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-2">
                    Fecha
                    <SortIcon field="date" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('expenseSource')}
                >
                  <div className="flex items-center gap-2">
                    Tipo
                    <SortIcon field="expenseSource" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50 text-right"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-2">
                    Monto
                    <SortIcon field="amount" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('route')}
                >
                  <div className="flex items-center gap-2">
                    Ruta
                    <SortIcon field="route" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('lead')}
                >
                  <div className="flex items-center gap-2">
                    Lider
                    <SortIcon field="lead" />
                  </div>
                </TableHead>
                <TableHead>Cuenta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedExpenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    No se encontraron gastos con los filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                paginatedExpenses.map((expense) => {
                  const typeConfig = EXPENSE_TYPES.find(
                    (t) => t.value === expense.expenseSource
                  )
                  return (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium">
                        {format(new Date(expense.date), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="font-medium border-current"
                          style={{
                            color: typeConfig?.color,
                            borderColor: typeConfig?.color,
                          }}
                        >
                          {EXPENSE_SOURCE_LABELS[expense.expenseSource || ''] ||
                            expense.expenseSource ||
                            '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(parseFloat(expense.amount))}
                      </TableCell>
                      <TableCell>{expense.route?.name || '-'}</TableCell>
                      <TableCell>
                        {expense.lead?.personalData.fullName || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {expense.sourceAccount?.name || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Mostrando {(currentPage - 1) * itemsPerPage + 1} -{' '}
              {Math.min(currentPage * itemsPerPage, filteredExpenses.length)} de{' '}
              {filteredExpenses.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Anterior
              </Button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
