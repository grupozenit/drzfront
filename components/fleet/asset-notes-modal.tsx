"use client"

import { useState, useEffect, useCallback } from "react"
import { X, Loader2, CheckCircle2, RotateCcw, Trash2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { machineryService, equipmentService } from "@/lib/api"
import { formatDateLocal } from "@/lib/utils"
import type { AssetNote, NoteTipo } from "@/lib/types"

const NOTE_LABELS: Record<NoteTipo, string> = {
  incidente: "Incidente",
  observacion: "Observación",
  reparacion: "Reparación",
  seguimiento: "Seguimiento",
}

const NOTE_COLORS: Record<NoteTipo, string> = {
  incidente: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  observacion: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  reparacion: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  seguimiento: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

interface AssetNotesModalProps {
  assetType: "maquinaria" | "equipo"
  asset: { id: string; codigoInterno?: string | null; tipo: string; marca: string; modelo: string } | null
  onClose: () => void
  onChanged?: (incidenciasAbiertas: number) => void
  canWrite?: boolean
}

export function AssetNotesModal({ assetType, asset, onClose, onChanged, canWrite = true }: AssetNotesModalProps) {
  const service = assetType === "maquinaria" ? machineryService : equipmentService

  const [notes, setNotes] = useState<AssetNote[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<"abierta" | "all">("abierta")

  const [newTipo, setNewTipo] = useState<NoteTipo>("incidente")
  const [newFecha, setNewFecha] = useState(todayStr())
  const [newDescripcion, setNewDescripcion] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const [replySubmitting, setReplySubmitting] = useState<string | null>(null)

  const countOpen = (list: AssetNote[]) => list.filter((n) => n.estado === "abierta").length

  const load = useCallback(() => {
    if (!asset) return
    setLoading(true)
    service
      .getNotes(asset.id, "all")
      .then((allNotes) => {
        setNotes(allNotes)
        onChanged?.(countOpen(allNotes))
      })
      .catch(() => setNotes([]))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset?.id])

  useEffect(() => {
    if (asset) {
      load()
      setNewTipo("incidente")
      setNewFecha(todayStr())
      setNewDescripcion("")
    }
  }, [asset, load])

  if (!asset) return null

  const visibleNotes = filter === "all" ? notes : notes.filter((n) => n.estado === "abierta")

  const handleCreate = async () => {
    if (!newDescripcion.trim()) return
    setSubmitting(true)
    try {
      await service.createNote(asset.id, { tipo: newTipo, descripcion: newDescripcion.trim(), fecha: newFecha })
      setNewDescripcion("")
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (parentId: string) => {
    const text = (replyDrafts[parentId] || "").trim()
    if (!text) return
    setReplySubmitting(parentId)
    try {
      await service.createNote(asset.id, {
        tipo: "seguimiento",
        descripcion: text,
        fecha: todayStr(),
        parentId,
      })
      setReplyDrafts((d) => ({ ...d, [parentId]: "" }))
      load()
    } finally {
      setReplySubmitting(null)
    }
  }

  const handleToggleResolved = async (note: AssetNote) => {
    await service.updateNote(asset.id, note.id, {
      estado: note.estado === "abierta" ? "resuelta" : "abierta",
    })
    load()
  }

  const handleDelete = async (noteId: string) => {
    await service.deleteNote(asset.id, noteId)
    load()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground">Bitácora</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {asset.codigoInterno ? `${asset.codigoInterno} — ` : ""}
              {asset.tipo} — {asset.marca} {asset.modelo}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {canWrite && (
          <div className="p-6 border-b border-border flex-shrink-0 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-[160px_160px_1fr] gap-3">
              <Select value={newTipo} onValueChange={(v: NoteTipo) => setNewTipo(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incidente">Incidente</SelectItem>
                  <SelectItem value="observacion">Observación</SelectItem>
                  <SelectItem value="reparacion">Reparación</SelectItem>
                </SelectContent>
              </Select>
              <DatePicker value={newFecha} onChange={setNewFecha} />
              <Textarea
                placeholder="Describe lo sucedido..."
                value={newDescripcion}
                onChange={(e) => setNewDescripcion(e.target.value)}
                className="min-h-[40px] text-sm"
              />
            </div>
            <Button onClick={handleCreate} disabled={submitting || !newDescripcion.trim()} className="text-sm">
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Registrar
            </Button>
          </div>
        )}

        <div className="px-6 pt-4 flex-shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter("abierta")}
              className={`px-3 py-1.5 text-xs rounded-lg border-2 transition-all ${
                filter === "abierta"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              Abiertas
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 text-xs rounded-lg border-2 transition-all ${
                filter === "all"
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              Todas
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : visibleNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin registros en la bitácora.</p>
          ) : (
            <div className="space-y-4">
              {visibleNotes.map((note) => (
                <div key={note.id} className="border-l-2 border-border pl-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${NOTE_COLORS[note.tipo]}`}>
                        {NOTE_LABELS[note.tipo]}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateLocal(note.fecha)}</span>
                      <span className="text-xs text-muted-foreground">· {note.userName}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${
                          note.estado === "abierta"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                        }`}
                      >
                        {note.estado === "abierta" ? "Abierta" : `Resuelta${note.resueltaAt ? " " + formatDateLocal(note.resueltaAt) : ""}`}
                      </span>
                    </div>
                    {canWrite && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleToggleResolved(note)}
                          title={note.estado === "abierta" ? "Marcar como resuelta" : "Reabrir"}
                          className="p-1 hover:bg-muted rounded-md transition-colors"
                        >
                          {note.estado === "abierta" ? (
                            <CheckCircle2 className="w-4 h-4 text-muted-foreground hover:text-green-600" />
                          ) : (
                            <RotateCcw className="w-4 h-4 text-muted-foreground hover:text-amber-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          title="Eliminar"
                          className="p-1 hover:bg-muted rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-foreground mt-1.5">{note.descripcion}</p>

                  {note.replies.length > 0 && (
                    <div className="mt-3 space-y-2 pl-4 border-l border-border">
                      {note.replies.map((reply) => (
                        <div key={reply.id}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">{formatDateLocal(reply.fecha)}</span>
                            <span className="text-xs text-muted-foreground">· {reply.userName}</span>
                          </div>
                          <p className="text-sm text-foreground">{reply.descripcion}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {canWrite && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Agregar seguimiento..."
                        value={replyDrafts[note.id] || ""}
                        onChange={(e) => setReplyDrafts((d) => ({ ...d, [note.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleReply(note.id)
                        }}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-input border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={() => handleReply(note.id)}
                        disabled={replySubmitting === note.id || !(replyDrafts[note.id] || "").trim()}
                        className="p-1.5 hover:bg-muted rounded-md transition-colors disabled:opacity-40"
                      >
                        {replySubmitting === note.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border flex-shrink-0">
          <Button onClick={onClose} variant="outline" className="w-full text-sm">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}
