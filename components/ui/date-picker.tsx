"use client"

import { useState, useEffect } from "react"
import { DayPicker } from "react-day-picker"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "lucide-react"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

// Helper para convertir string a Date sin problemas de zona horaria
const parseDate = (dateString: string): Date | undefined => {
  if (!dateString) return undefined
  try {
    return parse(dateString, "yyyy-MM-dd", new Date())
  } catch {
    return undefined
  }
}

export function DatePicker({ value, onChange, placeholder = "Seleccionar fecha", disabled, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<Date | undefined>(parseDate(value))

  useEffect(() => {
    setSelected(parseDate(value))
  }, [value])

  const handleSelect = (date: Date | undefined) => {
    setSelected(date)
    onChange(date ? format(date, "yyyy-MM-dd") : "")
    setIsOpen(false)
  }

  const handleClear = () => {
    setSelected(undefined)
    onChange("")
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className || ""}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left rounded-lg bg-input border border-border text-foreground text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? "text-foreground" : "text-muted-foreground"}>
          {selected ? format(selected, "dd/MM/yyyy", { locale: es }) : placeholder}
        </span>
        <Calendar className="w-4 h-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen && !disabled && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 z-50 mt-2 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[300px]">
            <DayPicker
              mode="single"
              selected={selected}
              onSelect={handleSelect}
              locale={es}
              numberOfMonths={1}
            />
            <div className="mt-3 border-t border-border pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleSelect(new Date())}
                className="flex-1 py-1.5 px-3 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="flex-1 py-1.5 px-3 bg-muted text-muted-foreground text-xs font-medium rounded-md hover:bg-muted/80 transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
