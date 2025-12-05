"use client"

import { Edit, ListChecks as ChecklistIcon, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Checklist } from "@/types/checklists.types"

interface ChecklistCardProps {
  checklist: Checklist
  onEdit?: (checklist: Checklist) => void
  onDelete?: (checklistId: string) => void
  disableActions?: boolean
}

const typeColors: Record<string, string> = {
  PRE_FLIGHT: "bg-sky-100 text-sky-800",
  POST_FLIGHT: "bg-emerald-100 text-emerald-800",
}

export function ChecklistCard({ checklist, onEdit, onDelete, disableActions }: ChecklistCardProps) {
  const typeLabel = (checklist.type || "").toString().replace(/_/g, " ") || "Unknown"
  const badgeClass = typeColors[checklist.type as string] ?? "bg-slate-100 text-slate-800"
  const sortedItems = [...(checklist.items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  const previewItems = sortedItems.slice(0, 3)

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">{checklist.title}</CardTitle>
            <CardDescription>Contains {checklist.items?.length ?? 0} checklist item(s)</CardDescription>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>{typeLabel}</span>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between gap-4">
        <div className="space-y-3 text-sm">
          {previewItems.length > 0 ? (
            <ul className="space-y-2 text-muted-foreground">
              {previewItems.map((item) => (
                <li key={`${checklist.checklist_id}-${item.order}`} className="flex gap-2">
                  <ChecklistIcon className="h-4 w-4 shrink-0 text-primary" />
                  <span className="leading-snug">{item.item_text}</span>
                </li>
              ))}
              {sortedItems.length > previewItems.length && <p className="text-xs text-muted-foreground">+ {sortedItems.length - previewItems.length} more item(s)</p>}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No items listed.</p>
          )}
        </div>

        {(onEdit || onDelete) && (
          <div className="flex flex-wrap gap-2">
            {onEdit && (
              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(checklist)} disabled={disableActions}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => onDelete(checklist.checklist_id)}
                disabled={disableActions}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
