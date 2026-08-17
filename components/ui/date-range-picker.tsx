"use client"

import { useState, useEffect } from "react"
import { DayPicker, type DateRange } from "react-day-picker"
import { format, parse } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar } from "lucide-react"

interface DateRangePickerProps {
  startDate: string
  endDate: string
  onDateChange: (startDate: string, endDate: string) => void
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

export function DateRangePicker({ startDate, endDate, onDateChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [range, setRange] = useState<DateRange | undefined>({
    from: parseDate(startDate),
    to: parseDate(endDate),
  })

  useEffect(() => {
    setRange({
      from: parseDate(startDate),
      to: parseDate(endDate),
    })
  }, [startDate, endDate])

  const handleSelect = (selected: DateRange | undefined) => {
    setRange(selected)
    if (selected?.from && selected?.to) {
      onDateChange(
        format(selected.from, "yyyy-MM-dd"),
        format(selected.to, "yyyy-MM-dd")
      )
      // Cerrar solo cuando hay rango completo
      setIsOpen(false)
    } else if (selected?.from && !selected?.to) {
      // Solo fecha inicio seleccionada: actualizar start, limpiar end
      onDateChange(format(selected.from, "yyyy-MM-dd"), "")
    } else {
      onDateChange("", "")
    }
  }

  const handleClear = () => {
    setRange(undefined)
    onDateChange("", "")
    setIsOpen(false)
  }

  const displayText = () => {
    if (range?.from && range?.to) {
      if (format(range.from, "yyyy-MM-dd") === format(range.to, "yyyy-MM-dd")) {
        return format(range.from, "dd/MM/yyyy", { locale: es })
      }
      return `${format(range.from, "dd/MM/yy", { locale: es })} – ${format(range.to, "dd/MM/yy", { locale: es })}`
    }
    if (range?.from) {
      return `${format(range.from, "dd/MM/yyyy", { locale: es })} – ...`
    }
    return "Seleccionar rango"
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 text-left rounded-lg bg-input border border-border text-foreground text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between"
      >
        <span className={range?.from ? "text-foreground" : "text-muted-foreground"}>
          {displayText()}
        </span>
        <Calendar className="w-4 h-4 shrink-0 text-muted-foreground" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute left-0 z-50 mt-2 bg-card border border-border rounded-lg shadow-lg p-4 min-w-[320px]">
            <DayPicker
              mode="range"
              selected={range}
              onSelect={handleSelect}
              locale={es}
              numberOfMonths={1}
            />
            <div className="mt-3 border-t border-border pt-3 flex gap-2">
              <button
                onClick={() => {
                  const today = new Date()
                  const todayStr = format(today, "yyyy-MM-dd")
                  setRange({ from: today, to: today })
                  onDateChange(todayStr, todayStr)
                  setIsOpen(false)
                }}
                className="flex-1 py-1.5 px-3 bg-primary text-primary-foreground text-xs font-medium rounded-md hover:bg-primary/90 transition-colors"
              >
                Hoy
              </button>
              <button
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
