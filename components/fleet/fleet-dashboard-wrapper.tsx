"use client"

import { useState, useEffect } from "react"
import { FleetDashboard } from "./fleet-dashboard"
import { apiClient } from "@/lib/api/client"
import type { FleetDashboard as FleetDashboardData } from "@/lib/types"

interface FleetDashboardWrapperProps {
  initialData: FleetDashboardData | null
}

export function FleetDashboardWrapper({ initialData }: FleetDashboardWrapperProps) {
  const [data, setData] = useState<FleetDashboardData | null>(initialData)
  const [isLoading, setIsLoading] = useState(!initialData)

  useEffect(() => {
    if (initialData) return
    setIsLoading(true)
    apiClient
      .get<FleetDashboardData>("/dashboard/fleet")
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setIsLoading(false))
  }, [initialData])

  return <FleetDashboard data={data} isLoading={isLoading} />
}
