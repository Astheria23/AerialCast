"use client"

import Link from "next/link"
import { ChevronRight } from "lucide-react"

import { cn } from "@/lib/utils"

export type BreadcrumbItem = {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items.length) return null

  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-3.5 w-3.5 text-border" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="font-medium text-foreground/80 transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-foreground">{item.label}</span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
