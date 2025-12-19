import { Route } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'

interface RouteData {
  id: string
  name: string
}

interface RouteSelectorProps {
  routes: RouteData[]
  value: string
  onChange: (value: string) => void
  loading?: boolean
}

export function RouteSelector({ routes, value, onChange, loading }: RouteSelectorProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            1
          </span>
          Seleccionar Ruta
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Select value={value} onValueChange={onChange} disabled={loading}>
          <SelectTrigger className="w-full">
            <div className="flex items-center gap-2">
              <Route className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Selecciona una ruta..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {routes.map((route) => (
              <SelectItem key={route.id} value={route.id}>
                {route.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  )
}
