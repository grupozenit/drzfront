import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Rutas públicas que no requieren autenticación
const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

// Rutas del dashboard que requieren organización y proyecto.
//
// Tiene que listar TODAS las secciones bajo app/(dashboard): una ruta que falte
// acá igual queda protegida por el chequeo de `userId` de más abajo, pero se
// saltea la verificación de organización, así que un usuario sin org carga la
// página y recibe 403 del backend en vez de ser redirigido limpiamente.
// Al agregar una sección nueva en app/(dashboard), agregarla también acá.
//
// Nota: '/reporte(.*)' ya cubre '/reporte-semanal'.
const isDashboardRoute = createRouteMatcher([
  '/tablero(.*)',
  '/avances(.*)',
  '/configuracion(.*)',
  '/maquinaria(.*)',
  '/equipos(.*)',
  '/flota(.*)',
  '/choferes(.*)',
  '/reporte(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId } = await auth()

  // Si no está autenticado y no está en ruta pública, redirigir a sign-in
  if (!userId && !isPublicRoute(req)) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', req.url)
    return NextResponse.redirect(signInUrl)
  }

  // Si está autenticado y está en ruta pública, redirigir a home
  if (userId && isPublicRoute(req)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Si está autenticado pero no tiene organización, redirigir a home
  // (Clerk mostrará el selector de organización si corresponde)
  if (userId && !orgId && isDashboardRoute(req)) {
    return NextResponse.redirect(new URL('/', req.url))
  }

  // Si intenta acceder al dashboard, verificar que tenga al menos un proyecto
  // Esto se verificará en el cliente porque necesitamos consultar la BD
  if (userId && orgId && isDashboardRoute(req)) {
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Ignorar archivos estáticos y API de Next.js
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Siempre ejecutar para API routes
    '/(api|trpc)(.*)',
  ],
}