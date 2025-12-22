import { ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export interface ChecklistSection {
  title: string;
  total: number;
  completed: number;
}

interface MissionChecklistSummaryProps {
  title: string;
  description?: string;
  sections: ChecklistSection[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MissionChecklistSummary({
  title,
  description,
  sections,
  isOpen,
  onOpenChange,
}: MissionChecklistSummaryProps) {
  if (!sections.length) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ClipboardCheck className="h-4 w-4" />
          {title}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="space-y-3">
          {sections.map((section) => (
            <div
              key={section.title}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3"
            >
              <span className="font-medium">{section.title}</span>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                {section.completed} / {section.total} done
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
