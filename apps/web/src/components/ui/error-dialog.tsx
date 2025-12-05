"use client"

import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface ErrorDialogProps {
  open: boolean
  message?: string
  title?: string
  onOpenChange?: (open: boolean) => void
}

export function ErrorDialog({ open, message, title = "Something went wrong", onOpenChange }: ErrorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="text-base text-foreground">
            {message ?? "Please try again or contact support if the issue persists."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end">
          <Button variant="destructive" onClick={() => onOpenChange?.(false)}>
            Dismiss
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
