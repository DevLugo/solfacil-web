'use client'

import { useState, useRef } from 'react'
import { FileUp, Loader2, RefreshCw, ScanSearch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { PROCESS_OCR_DOCUMENT } from '@/graphql/mutations/ocr'
import { uploadFileWithGraphQL } from '@/lib/apollo-client'
import { OCRReviewModal } from './OCRReviewModal'

interface Account {
  id: string
  name: string
  type: string
  amount: string
  accountBalance: string
}

interface OCRUploadButtonProps {
  routeId: string
  businessDate: Date
  accounts: Account[]
}

export function OCRUploadButton({ routeId, businessDate, accounts }: OCRUploadButtonProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [skipCache, setSkipCache] = useState(false)
  const [fullProcess, setFullProcess] = useState(false)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      toast({
        title: 'Archivo inválido',
        description: 'Solo se aceptan archivos PDF',
        variant: 'destructive',
      })
      return
    }

    setProcessing(true)
    try {
      const data = await uploadFileWithGraphQL({
        file,
        query: PROCESS_OCR_DOCUMENT.loc?.source.body || '',
        variables: {
          routeId,
          businessDate: businessDate.toISOString(),
          skipCache: skipCache || undefined,
          testMode: fullProcess ? undefined : true,
        },
        operationName: 'ProcessOCRDocument',
        fileVariablePath: 'variables.file',
        timeoutMs: 600000,
      })

      if (data?.processOCRDocument) {
        setResult(data.processOCRDocument)
        setModalOpen(true)
        toast({
          title: 'PDF procesado',
          description: `${data.processOCRDocument.pagesProcessed} páginas procesadas${skipCache ? ' (sin cache)' : ''}${!fullProcess ? ' (rápido)' : ' (completo)'}`,
        })
      }
    } catch (error: any) {
      toast({
        title: 'Error al procesar PDF',
        description: error.message || 'Ocurrió un error inesperado',
        variant: 'destructive',
      })
    } finally {
      setProcessing(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf"
        onChange={handleFileSelect}
        className="hidden"
      />
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={processing}
          className="gap-1.5"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4" />
              Cargar PDF
            </>
          )}
        </Button>
        <Button
          variant={skipCache ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSkipCache(!skipCache)}
          disabled={processing}
          className="gap-1 px-2"
          title={skipCache ? 'Reprocesar con Claude (cache desactivado)' : 'Activar para forzar reprocesamiento con Claude'}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${skipCache ? 'text-white' : 'text-muted-foreground'}`} />
        </Button>
        <Button
          variant={fullProcess ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setFullProcess(!fullProcess)}
          disabled={processing}
          className="gap-1 px-2"
          title={fullProcess ? 'Procesamiento completo: todas las páginas' : 'Activar para procesar todas las páginas (más lento, más tokens)'}
        >
          <ScanSearch className={`h-3.5 w-3.5 ${fullProcess ? 'text-white' : 'text-muted-foreground'}`} />
        </Button>
      </div>

      <OCRReviewModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        result={result}
        routeId={routeId}
        businessDate={businessDate}
        accounts={accounts}
      />
    </>
  )
}
