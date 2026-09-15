import type { PermissionAction, PermissionResource } from "@/lib/types"

/**
 * Mapeo ruta -> recurso de permisos. Único lugar que conoce esta relación;
 * sidebar.tsx y el guard de app/(dashboard)/layout.tsx lo comparten para
 * no divergir sobre qué ve cada rol.
 */
const ROUTE_RESOURCE_MAP: Record<string, PermissionResource> = {
  "/tablero": "tablero",
  "/avances": "avances",
  "/reporte": "reportes",
  "/reporte-semanal": "reportes_semanales",
  "/flota": "flota",
  "/choferes": "choferes",
  "/maquinaria": "maquinaria",
  "/equipos": "equipos",
}

type CanFn = (resource: PermissionResource, action: PermissionAction) => boolean

/** Recurso(s) de permisos asociados a una ruta del dashboard, o null si es
 * pública dentro del dashboard (no aplica) o desconocida. */
export function checkRouteAccess(pathname: string, can: CanFn): boolean {
  if (pathname.startsWith("/configuracion/equipo")) return can("usuarios", "read")
  if (pathname.startsWith("/configuracion/proyectos")) return can("proyectos", "read")
  if (pathname.startsWith("/configuracion")) return can("proyectos", "read") || can("usuarios", "read")

  const resource = ROUTE_RESOURCE_MAP[pathname] ?? ROUTE_RESOURCE_MAP[`/${pathname.split("/")[1] ?? ""}`]
  if (!resource) return true // ruta sin recurso conocido: no es responsabilidad de este guard

  return can(resource, "read")
}

/** Ítems de navegación visibles para el rol actual, en el mismo orden que
 * se pasen. Cada item debe traer su `href`. */
export function isNavItemVisible(href: string, can: CanFn): boolean {
  if (href === "/configuracion") return can("proyectos", "read") || can("usuarios", "read")
  const resource = ROUTE_RESOURCE_MAP[href]
  if (!resource) return true
  return can(resource, "read")
}
