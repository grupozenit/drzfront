'use client'

import { useAuth } from '@clerk/nextjs'
import { useEffect } from 'react'
import { setTokenGetter } from './client'

/**
 * Componente que configura el cliente API para usar tokens de Clerk
 * Debe ser montado una sola vez en el layout principal
 */
export function ClerkApiConfig({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth()

  useEffect(() => {
    // Configurar el getter de tokens para que use Clerk
    setTokenGetter(async () => {
      try {
        const token = await getToken()
        return token
      } catch (error) {
        console.error('Error getting Clerk token:', error)
        return null
      }
    })
  }, [getToken])

  return <>{children}</>
}

