"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ConfiguracionPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/configuracion/proyectos")
  }, [router])

  return null
}

