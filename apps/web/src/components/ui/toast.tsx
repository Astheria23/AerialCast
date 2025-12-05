"use client"

import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider
const ToastViewport = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Viewport>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>>(
  ({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
      ref={ref}
      className={cn(
    "fixed bottom-4 right-4 z-100 flex w-full max-w-sm flex-col gap-2 p-0 sm:bottom-6 sm:right-6",
        className,
      )}
      {...props}
    />
  ),
)
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = {
  default: "bg-card text-foreground",
  destructive: "border-destructive bg-destructive text-destructive-foreground",
}

const Toast = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Root>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> & { variant?: keyof typeof toastVariants }>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <ToastPrimitives.Root
        ref={ref}
        className={cn(
			"group pointer-events-auto relative flex w-full min-w-[280px] max-w-sm items-center justify-between space-x-4 overflow-hidden rounded-xl border border-border/80 px-4 py-3 shadow-lg transition-all",
          toastVariants[variant],
          className,
        )}
        {...props}
      />
    )
  },
)
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Action>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action ref={ref} className={cn("inline-flex shrink-0 rounded-md border border-border px-3 py-1 text-sm font-medium transition hover:bg-muted", className)} {...props} />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Close>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close ref={ref} className={cn("absolute right-1 top-1 rounded-md p-1 text-foreground/60 transition hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring", className)} toast-close="" {...props}>
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Title>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<React.ElementRef<typeof ToastPrimitives.Description>, React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

export type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>
export type ToastActionElement = React.ReactElement<typeof ToastAction>

export { Toast, ToastAction, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport }
