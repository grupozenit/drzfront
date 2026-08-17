"use client"

import { useOrganization, useOrganizationList } from "@clerk/nextjs"
import { useEffect } from "react"

/**
 * Componente que asegura que el usuario tenga una organización activa.
 * Si el usuario pertenece a una organización pero no está activa, la activa automáticamente.
 */
export function OrganizationProvider({ children }: { children: React.ReactNode }) {
  const { organization } = useOrganization()
  const { setActive, userMemberships } = useOrganizationList({
    userMemberships: {
      infinite: true,
    },
  })

  useEffect(() => {
    // Si no hay organización activa pero el usuario pertenece a alguna, activar la primera
    if (!organization && userMemberships.data && userMemberships.data.length > 0) {
      const firstOrg = userMemberships.data[0].organization
      setActive?.({ organization: firstOrg.id })
    }
  }, [organization, userMemberships.data, setActive])

  return <>{children}</>
}

