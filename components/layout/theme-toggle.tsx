"use client"

import { useEffect, useState } from "react"
import { SunIcon } from "@/components/icons/sun-icon"
import { MoonIcon } from "@/components/icons/moon-icon"

export function ThemeToggle({ isOpen }: { isOpen?: boolean }) {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const isDarkMode =
      localStorage.getItem("theme") === "dark" ||
      (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches)
    setIsDark(isDarkMode)
    updateTheme(isDarkMode)
  }, [])

  const updateTheme = (dark: boolean) => {
    const html = document.documentElement
    if (dark) {
      html.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      html.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
    // Sincronizar color de barra de título de la PWA con el tema activo
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute("content", dark ? "#191b24" : "#f8f9fc")
    })
  }

  const toggleTheme = () => {
    const newDarkMode = !isDark
    setIsDark(newDarkMode)
    updateTheme(newDarkMode)
  }

  return (
    <button
      onClick={toggleTheme}
      className={`px-3 py-2 md:py-2.5 rounded-lg text-foreground hover:bg-sidebar-primary/10 transition-colors flex items-center gap-2 ${
        isOpen ? "w-full justify-start" : "md:justify-center"
      }`}
      title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
    >
      {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
      {isOpen && <span className="text-sm">Tema</span>}
    </button>
  )
}
