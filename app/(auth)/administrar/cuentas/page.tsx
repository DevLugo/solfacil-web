'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation } from '@apollo/client'
import { Wallet, Plus, Landmark, CreditCard, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency } from '@/lib/utils'
import { AccountTable, AccountFormDialog } from './components'
import { GET_ACCOUNTS, CREATE_ACCOUNT, UPDATE_ACCOUNT } from './queries'
import type { Account, AccountFormData, AccountType } from './types'
import { ACCOUNT_TYPE_LABELS } from './types'

export default function CuentasPage() {
  const { toast } = useToast()

  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [filterType, setFilterType] = useState<string>('all')

  const { data, loading, refetch } = useQuery<{ accounts: Account[] }>(GET_ACCOUNTS)

  const [createAccount, { loading: isCreating }] = useMutation(CREATE_ACCOUNT)
  const [updateAccount, { loading: isUpdating }] = useMutation(UPDATE_ACCOUNT)

  const accounts = data?.accounts || []

  const filteredAccounts = useMemo(() => {
    if (filterType === 'all') return accounts
    return accounts.filter((a) => a.type === filterType)
  }, [accounts, filterType])

  // Stats
  const totalBalance = useMemo(
    () =>
      accounts.reduce(
        (sum, a) => sum + parseFloat(a.accountBalance || a.amount || '0'),
        0
      ),
    [accounts]
  )

  const bankCount = accounts.filter((a) => a.type === 'BANK').length
  const cashCount = accounts.filter(
    (a) => a.type === 'EMPLOYEE_CASH_FUND' || a.type === 'OFFICE_CASH_FUND'
  ).length

  const handleCreate = () => {
    setSelectedAccount(null)
    setFormDialogOpen(true)
  }

  const handleEdit = (account: Account) => {
    setSelectedAccount(account)
    setFormDialogOpen(true)
  }

  const handleSubmit = async (formData: AccountFormData) => {
    try {
      if (selectedAccount) {
        await updateAccount({
          variables: {
            id: selectedAccount.id,
            input: {
              name: formData.name,
              routeIds: formData.routeIds,
            },
          },
        })
        toast({
          title: 'Cuenta actualizada',
          description: `La cuenta "${formData.name}" fue actualizada correctamente.`,
        })
      } else {
        await createAccount({
          variables: {
            input: {
              name: formData.name,
              type: formData.type,
              amount: formData.amount || '0',
              routeIds: formData.routeIds,
            },
          },
        })
        toast({
          title: 'Cuenta creada',
          description: `La cuenta "${formData.name}" fue creada correctamente.`,
        })
      }

      setFormDialogOpen(false)
      setSelectedAccount(null)
      await refetch()
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Error al guardar la cuenta',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Administrar Cuentas
          </h1>
          <p className="text-muted-foreground">
            Gestiona las cuentas y sus asignaciones a rutas
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cuenta
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Cuentas
                </p>
                <div className="text-2xl font-bold mt-1">
                  {loading ? <Skeleton className="h-8 w-16" /> : accounts.length}
                </div>
              </div>
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cuentas Banco
                </p>
                <div className="text-2xl font-bold mt-1">
                  {loading ? <Skeleton className="h-8 w-16" /> : bankCount}
                </div>
              </div>
              <Landmark className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Cuentas Caja
                </p>
                <div className="text-2xl font-bold mt-1">
                  {loading ? <Skeleton className="h-8 w-16" /> : cashCount}
                </div>
              </div>
              <Wallet className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Balance Total
                </p>
                <div className="text-2xl font-bold mt-1">
                  {loading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    formatCurrency(totalBalance)
                  )}
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter + Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Cuentas</CardTitle>
              <CardDescription>
                {filteredAccounts.length} cuenta(s)
                {filterType !== 'all' &&
                  ` de tipo ${ACCOUNT_TYPE_LABELS[filterType as AccountType]}`}
              </CardDescription>
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {(Object.entries(ACCOUNT_TYPE_LABELS) as [AccountType, string][]).map(
                  ([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <AccountTable accounts={filteredAccounts} onEdit={handleEdit} />
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <AccountFormDialog
        open={formDialogOpen}
        onOpenChange={(open) => {
          setFormDialogOpen(open)
          if (!open) setSelectedAccount(null)
        }}
        account={selectedAccount}
        onSubmit={handleSubmit}
        isSaving={isCreating || isUpdating}
      />
    </div>
  )
}
