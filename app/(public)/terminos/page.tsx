'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TerminosPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/login">
          <Button variant="ghost" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio de sesion
          </Button>
        </Link>

        <Card className="border-0 shadow-xl">
          <div className="absolute left-0 right-0 top-0 h-1 bg-gradient-primary rounded-t-lg" />

          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold">
              Terminos y Condiciones de Uso
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Lugorcorp SAPI de CV
            </p>
          </CardHeader>

          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm">
            <p className="text-muted-foreground">
              Ultima actualizacion: Diciembre 2024
            </p>

            <section>
              <h3 className="text-lg font-semibold mt-6 mb-3">1. Aceptacion de Terminos</h3>
              <p>
                Al acceder y utilizar este sistema de gestion de Lugorcorp SAPI de CV,
                usted acepta estar sujeto a estos terminos y condiciones de uso.
                Si no esta de acuerdo con alguna parte de estos terminos, no debera
                utilizar el sistema.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mt-6 mb-3">2. Confidencialidad de la Informacion</h3>
              <p className="font-medium text-destructive">
                TODA LA INFORMACION CONTENIDA EN ESTE SISTEMA ES ESTRICTAMENTE CONFIDENCIAL.
              </p>
              <p>
                Como usuario autorizado del sistema, usted se compromete a:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>
                  <strong>No compartir informacion</strong> del sistema con terceros,
                  incluyendo pero no limitado a: datos de clientes, informacion financiera,
                  reportes, estadisticas o cualquier otro dato accesible a traves del sistema.
                </li>
                <li>
                  <strong>No divulgar credenciales de acceso</strong> (usuario y contrasena)
                  a ninguna persona, bajo ninguna circunstancia.
                </li>
                <li>
                  <strong>No realizar capturas de pantalla, fotografias o copias</strong>
                  de la informacion del sistema para compartir externamente.
                </li>
                <li>
                  <strong>No descargar o exportar datos</strong> del sistema para uso personal
                  o para compartir con terceros no autorizados.
                </li>
                <li>
                  <strong>Reportar inmediatamente</strong> cualquier acceso no autorizado o
                  sospecha de filtracion de informacion.
                </li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mt-6 mb-3">3. Uso Autorizado</h3>
              <p>
                El acceso a este sistema esta restringido exclusivamente a empleados y
                colaboradores autorizados de Lugorcorp SAPI de CV. El uso del sistema
                debe ser unicamente para fines laborales relacionados con las operaciones
                de la empresa.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mt-6 mb-3">4. Proteccion de Datos Personales</h3>
              <p>
                La informacion de clientes y terceros almacenada en el sistema esta
                protegida conforme a la Ley Federal de Proteccion de Datos Personales
                en Posesion de los Particulares. El usuario se compromete a:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Tratar los datos personales con la debida confidencialidad.</li>
                <li>No utilizar los datos para fines distintos a los autorizados.</li>
                <li>No transferir datos personales sin autorizacion expresa.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mt-6 mb-3">5. Responsabilidades del Usuario</h3>
              <p>El usuario es responsable de:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Mantener la confidencialidad de sus credenciales de acceso.</li>
                <li>No permitir que otras personas utilicen su cuenta.</li>
                <li>Notificar cualquier uso no autorizado de su cuenta.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mt-6 mb-3">6. Consecuencias por Incumplimiento</h3>
              <p>
                El incumplimiento de estos terminos puede resultar en:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Suspension o revocacion inmediata del acceso al sistema.</li>
                <li>Acciones disciplinarias conforme a la normativa laboral.</li>
                <li>Acciones legales civiles o penales segun corresponda.</li>
                <li>Responsabilidad por danos y perjuicios ocasionados.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-lg font-semibold mt-6 mb-3">7. Modificaciones</h3>
              <p>
                Lugorcorp SAPI de CV se reserva el derecho de modificar estos terminos
                en cualquier momento. Los cambios entraran en vigor inmediatamente
                despues de su publicacion en el sistema.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold mt-6 mb-3">8. Contacto</h3>
              <p>
                Para cualquier duda sobre estos terminos, contacte a su supervisor
                inmediato o al departamento de administracion de Lugorcorp SAPI de CV.
              </p>
            </section>

            <div className="mt-8 p-4 bg-muted/50 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Lugorcorp SAPI de CV. Todos los derechos reservados.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
