"use client"

import { useState, type ChangeEvent, type FormEvent } from "react"
import { GripVertical, Plus, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Checklist, ChecklistItemPayload, ChecklistType } from "@/types/checklists.types"

const CHECKLIST_TYPES: ChecklistType[] = ["PRE_FLIGHT", "POST_FLIGHT"]

export interface ChecklistFormPayload {
  title: string
  type: ChecklistType | string
  items: ChecklistItemPayload[]
}

interface ChecklistFormProps {
  mode: "create" | "edit"
  initialData?: Checklist | null
  onSubmit: (payload: ChecklistFormPayload) => Promise<void> | void
  onCancel?: () => void
  isSubmitting?: boolean
  error?: string | null
}

export function ChecklistForm({ mode, initialData, onSubmit, onCancel, isSubmitting, error }: ChecklistFormProps) {
  const [values, setValues] = useState({
    title: initialData?.title ?? "",
    type: (initialData?.type as ChecklistType) ?? "PRE_FLIGHT",
  })
  const [items, setItems] = useState<ChecklistItemPayload[]>(() =>
    initialData?.items?.length
      ? [...initialData.items]
          .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          .map((item, index) => ({ item_text: item.item_text, order: index }))
      : [{ item_text: "", order: 0 }],
  )
  const [itemError, setItemError] = useState<string | null>(null)

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index: number, value: string) => {
    setItems((prev) => prev.map((item, idx) => (idx === index ? { ...item, item_text: value } : item)))
  }

  const handleAddItem = () => {
    setItems((prev) => [...prev, { item_text: "", order: prev.length }])
  }

  const handleRemoveItem = (index: number) => {
    setItems((prev) => {
      if (prev.length === 1) return prev
      const nextItems = prev.filter((_, idx) => idx !== index).map((item, idx) => ({ ...item, order: idx }))
      return nextItems
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!values.title.trim()) {
      return
    }

    const preparedItems = items
      .map((item, index) => ({
        item_text: item.item_text.trim(),
        order: index,
      }))
      .filter((item) => item.item_text.length > 0)

    if (!preparedItems.length) {
      setItemError("At least one checklist item is required.")
      return
    }

    setItemError(null)

    await onSubmit({
      title: values.title.trim(),
      type: values.type,
      items: preparedItems,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Checklist title</Label>
          <Input id="title" name="title" placeholder="Pre-flight safety" value={values.title} onChange={handleChange} required disabled={isSubmitting} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type">Checklist type</Label>
          <select
            id="type"
            name="type"
            value={values.type}
            onChange={handleChange}
            className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isSubmitting}
          >
            {CHECKLIST_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-dashed p-4">
        <div className="flex items-center justify-between">
          <div>
            <Label>Checklist items</Label>
            <p className="text-xs text-muted-foreground">Create a step-by-step list for pilots to follow.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={handleAddItem} disabled={isSubmitting}>
            <Plus className="mr-2 h-4 w-4" />
            Add item
          </Button>
        </div>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`checklist-item-${index}`} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <GripVertical className="h-4 w-4" />
                  Step {index + 1}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(index)}
                  disabled={items.length === 1 || isSubmitting}
                  aria-label="Remove checklist item"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3">
                <Input
                  value={item.item_text}
                  onChange={(event) => handleItemChange(index, event.target.value)}
                  placeholder="Inspect propellers for damage"
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
          ))}
        </div>
        {itemError && <p className="text-sm text-destructive">{itemError}</p>}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting} className="min-w-[150px]">
          {isSubmitting ? "Saving..." : mode === "create" ? "Create checklist" : "Save changes"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
