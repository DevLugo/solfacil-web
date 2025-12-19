import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ArrowRight } from 'lucide-react'
import type { LocalityInfo } from '../types'

interface MoveConfirmationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceRouteName: string
  targetRouteName: string
  localities: LocalityInfo[]
  onConfirm: () => void
  isLoading?: boolean
}

/**
 * Confirmation dialog for moving localities between routes
 * Shows summary of the move operation before executing
 */
export function MoveConfirmationModal({
  open,
  onOpenChange,
  sourceRouteName,
  targetRouteName,
  localities,
  onConfirm,
  isLoading = false,
}: MoveConfirmationModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground">
            Confirm locality move
          </AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground">
            You are about to move {localities.length} {localities.length === 1 ? 'locality' : 'localities'}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          {/* Route Transfer Visual */}
          <div className="flex items-center justify-center gap-3 p-4 rounded-lg bg-muted">
            <span className="text-sm font-medium text-foreground">{sourceRouteName}</span>
            <ArrowRight className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">{targetRouteName}</span>
          </div>

          {/* Localities List */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Localities:</p>
            <ul className="space-y-1 max-h-[200px] overflow-y-auto rounded-md border border-border p-3">
              {localities.map((locality) => (
                <li
                  key={locality.employeeId}
                  className="text-sm text-muted-foreground flex items-start gap-2"
                >
                  <span className="text-primary">•</span>
                  <span>{locality.localityName}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading} className="border-border">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-primary text-primary-foreground"
          >
            {isLoading ? 'Moving...' : 'Confirm'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
