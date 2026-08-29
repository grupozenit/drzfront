"use client"

import { List, LayoutGrid } from "lucide-react"
import type { ViewMode } from "@/lib/hooks/useViewMode"

interface ViewToggleProps {
  value: ViewMode
  onChange: (mode: ViewMode) => void
  className?: string
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={`hidden md:flex items-center gap-1 rounded-lg border border-border p-1 ${className || ""}`}>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
          value === "list"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <List className="w-3.5 h-3.5" />
        Lista
      </button>
      <button
        type="button"
        onClick={() => onChange("cards")}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors ${
          value === "cards"
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <LayoutGrid className="w-3.5 h-3.5" />
        Tarjetas
      </button>
    </div>
  )
}
