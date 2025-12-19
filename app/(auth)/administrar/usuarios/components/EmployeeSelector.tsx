'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Search, User, Briefcase, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Employee } from '../types'
import { EMPLOYEE_TYPE_LABELS } from '../types'

interface EmployeeSelectorProps {
  employees: Employee[]
  selectedEmployeeId?: string
  onSelectEmployee: (employeeId: string) => void
  loading?: boolean
}

export function EmployeeSelector({
  employees,
  selectedEmployeeId,
  onSelectEmployee,
  loading,
}: EmployeeSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')

  // Filter employees by search term
  const filteredEmployees = useMemo(() => {
    if (!searchTerm.trim()) return employees

    const search = searchTerm.toLowerCase()
    return employees.filter((emp) => {
      const fullName = emp.personalData?.fullName?.toLowerCase() || ''
      const clientCode = emp.personalData?.clientCode?.toLowerCase() || ''
      const type = EMPLOYEE_TYPE_LABELS[emp.type]?.toLowerCase() || ''

      return (
        fullName.includes(search) || clientCode.includes(search) || type.includes(search)
      )
    })
  }, [employees, searchTerm])

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.id === selectedEmployeeId),
    [employees, selectedEmployeeId]
  )

  // Calculate stats for selected employee
  const employeeStats = useMemo(() => {
    if (!selectedEmployee) return null

    const loansGranted = selectedEmployee.loansGranted || []
    const loansManaged = selectedEmployee.loansManagedAsLead || []

    const activeGranted = loansGranted.filter((l) => l.status === 'ACTIVE').length
    const activeManaged = loansManaged.filter((l) => l.status === 'ACTIVE').length

    const totalGranted = loansGranted.reduce(
      (sum, l) => sum + parseFloat(l.amountGived || '0'),
      0
    )
    const totalManaged = loansManaged.reduce(
      (sum, l) => sum + parseFloat(l.amountGived || '0'),
      0
    )

    return {
      totalLoansGranted: loansGranted.length,
      totalLoansManaged: loansManaged.length,
      activeLoansGranted: activeGranted,
      activeLoansManaged: activeManaged,
      totalAmountGranted: totalGranted,
      totalAmountManaged: totalManaged,
    }
  }, [selectedEmployee])

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="employee-search">Buscar empleado</Label>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            id="employee-search"
            placeholder="Buscar por nombre, código o tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
            disabled={loading}
          />
        </div>
      </div>

      {/* Employee List */}
      <ScrollArea className="h-[200px] rounded-md border">
        <div className="p-4 space-y-2">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center py-4">Cargando...</div>
          ) : filteredEmployees.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              {searchTerm ? 'No se encontraron empleados' : 'No hay empleados disponibles'}
            </div>
          ) : (
            filteredEmployees.map((employee) => (
              <button
                key={employee.id}
                type="button"
                onClick={() => onSelectEmployee(employee.id)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  'hover:bg-accent hover:border-accent-foreground/20',
                  selectedEmployeeId === employee.id
                    ? 'bg-accent border-accent-foreground/50'
                    : 'bg-background'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium truncate">
                        {employee.personalData?.fullName || 'Sin nombre'}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{employee.personalData?.clientCode || 'Sin código'}</span>
                      <span>•</span>
                      <span>{EMPLOYEE_TYPE_LABELS[employee.type] || employee.type}</span>
                    </div>
                    {employee.routes && employee.routes.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Ruta: {employee.routes.map((r) => r.name).join(', ')}
                      </div>
                    )}
                  </div>
                  {employee.user && (
                    <Badge variant="secondary" className="text-xs">
                      Con usuario
                    </Badge>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Selected Employee Details */}
      {selectedEmployee && employeeStats && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Briefcase className="h-4 w-4" />
            Detalles del Empleado
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Loans Granted */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Préstamos Otorgados</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">
                  {employeeStats.totalLoansGranted}
                </div>
                <div className="text-xs text-muted-foreground">
                  {employeeStats.activeLoansGranted} activos
                </div>
              </div>
              {employeeStats.totalAmountGranted > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />$
                  {employeeStats.totalAmountGranted.toLocaleString('es-SV', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              )}
            </div>

            {/* Loans Managed as Lead */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Préstamos Gestionados</div>
              <div className="flex items-baseline gap-2">
                <div className="text-2xl font-bold">
                  {employeeStats.totalLoansManaged}
                </div>
                <div className="text-xs text-muted-foreground">
                  {employeeStats.activeLoansManaged} activos
                </div>
              </div>
              {employeeStats.totalAmountManaged > 0 && (
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />$
                  {employeeStats.totalAmountManaged.toLocaleString('es-SV', {
                    minimumFractionDigits: 2,
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent Loans Preview */}
          {((selectedEmployee.loansGranted?.length || 0) > 0 ||
            (selectedEmployee.loansManagedAsLead?.length || 0) > 0) && (
            <div className="pt-2 border-t">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Préstamos Recientes
              </div>
              <div className="space-y-1">
                {[
                  ...(selectedEmployee.loansGranted || []),
                  ...(selectedEmployee.loansManagedAsLead || []),
                ]
                  .slice(0, 3)
                  .map((loan) => (
                    <div
                      key={loan.id}
                      className="text-xs flex items-center justify-between py-1"
                    >
                      <span className="truncate flex-1">
                        {new Date(loan.signDate).toLocaleDateString('es-SV')}
                      </span>
                      <Badge
                        variant={loan.status === 'ACTIVE' ? 'default' : 'secondary'}
                        className="text-xs ml-2"
                      >
                        ${parseFloat(loan.amountGived || '0').toLocaleString('es-SV')}
                      </Badge>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
