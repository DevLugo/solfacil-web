import { ClientesMorosos } from '@/components/features/clientes-morosos'

export const metadata = {
  title: 'Clientes Morosos | SoluFácil',
  description: 'Lista de clientes con cartera vencida o excluidos por limpieza de portafolio',
}

export default function ClientesMorososPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Clientes Morosos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Clientes con cartera vencida o excluidos por limpieza de portafolio
        </p>
      </div>

      <ClientesMorosos />
    </div>
  )
}
