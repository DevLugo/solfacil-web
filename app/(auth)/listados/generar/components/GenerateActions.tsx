import { FileText, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GenerateActionsProps {
  count: number
  weekMode: 'current' | 'next'
  onWeekModeChange: (mode: 'current' | 'next') => void
  onGenerate: () => void
  isGenerating: boolean
}

export function GenerateActions({
  count,
  weekMode,
  onWeekModeChange,
  onGenerate,
  isGenerating
}: GenerateActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            3
          </span>
          Generar PDFs
        </CardTitle>
        <CardDescription>
          Configura la semana objetivo y genera los listados de cobranza
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Selector de semana */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium whitespace-nowrap">Semana objetivo:</label>
          <div className="flex items-center gap-3 flex-1">
            <Select value={weekMode} onValueChange={onWeekModeChange}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">En curso</SelectItem>
                <SelectItem value="next">Siguiente</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Por defecto: Siguiente semana
            </span>
          </div>
        </div>

        {/* Botón de generar */}
        <Button
          size="lg"
          onClick={onGenerate}
          disabled={count === 0 || isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando PDFs...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Generar {count} PDF{count !== 1 ? 's' : ''}
            </>
          )}
        </Button>

        {/* Advertencia sobre popup blocker */}
        {count > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Los PDFs se abrirán en pestañas separadas. Asegúrate de permitir ventanas
              emergentes en tu navegador.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
