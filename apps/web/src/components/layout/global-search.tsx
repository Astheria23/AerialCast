"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Plane,
  MapPin,
  ListChecks,
  Wrench,
  Navigation,
  FileText,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { globalSearch } from "@/services/search.service";

type SearchCategory =
  | "missions"
  | "drones"
  | "geofences"
  | "checklists"
  | "maintenance"
  | "pages";

interface SearchResult {
  id: string;
  title: string;
  subtitle?: string;
  category: SearchCategory;
  href: string;
  icon: React.ElementType;
}

const STATIC_PAGES: SearchResult[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    subtitle: "Home overview",
    category: "pages",
    href: "/",
    icon: FileText,
  },
  {
    id: "missions-page",
    title: "Missions",
    subtitle: "View all missions",
    category: "pages",
    href: "/missions",
    icon: Navigation,
  },
  {
    id: "fleet-page",
    title: "Drone",
    subtitle: "Manage drones",
    category: "pages",
    href: "/drones",
    icon: Plane,
  },
  {
    id: "geofences-page",
    title: "Geofences",
    subtitle: "Manage boundaries",
    category: "pages",
    href: "/geofences",
    icon: MapPin,
  },
  {
    id: "checklists-page",
    title: "Checklists",
    subtitle: "Pre-flight checks",
    category: "pages",
    href: "/checklists",
    icon: ListChecks,
  },
  {
    id: "maintenance-page",
    title: "Maintenance",
    subtitle: "Service logs",
    category: "pages",
    href: "/maintenance",
    icon: Wrench,
  },
];

interface GlobalSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearch({ open, onOpenChange }: GlobalSearchProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search handler
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults(STATIC_PAGES);
      return;
    }

    setIsLoading(true);
    const lowerQuery = query.toLowerCase();

    try {
      // Search through static pages
      const pageResults = STATIC_PAGES.filter(
        (page) =>
          page.title.toLowerCase().includes(lowerQuery) ||
          page.subtitle?.toLowerCase().includes(lowerQuery)
      );

      // Fetch real data from API
      const apiResults = await globalSearch(query);

      // Convert API results to SearchResult format
      const dynamicResults: SearchResult[] = apiResults.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        category: item.category,
        href: item.href,
        icon: getCategoryIcon(item.category),
      }));

      setResults([...pageResults, ...dynamicResults]);
    } catch (error) {
      console.error("Search error:", error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(searchQuery);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, performSearch]);

  // Initial load
  useEffect(() => {
    if (open) {
      performSearch("");
    }
  }, [open, performSearch]);

  const handleSelect = (href: string) => {
    onOpenChange(false);
    router.push(href);
    setSearchQuery("");
  };

  const getCategoryIcon = (category: SearchCategory) => {
    switch (category) {
      case "missions":
        return Navigation;
      case "drones":
        return Plane;
      case "geofences":
        return MapPin;
      case "checklists":
        return ListChecks;
      case "maintenance":
        return Wrench;
      default:
        return FileText;
    }
  };

  const getCategoryTitle = (category: SearchCategory) => {
    switch (category) {
      case "missions":
        return "Missions";
      case "drones":
        return "Fleet";
      case "geofences":
        return "Geofences";
      case "checklists":
        return "Checklists";
      case "maintenance":
        return "Maintenance";
      case "pages":
        return "Pages";
      default:
        return "Results";
    }
  };

  // Group results by category
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = [];
    }
    acc[result.category].push(result);
    return acc;
  }, {} as Record<SearchCategory, SearchResult[]>);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search missions, drones, geofences, and more..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isLoading ? "Searching..." : "No results found."}
        </CommandEmpty>
        {Object.entries(groupedResults).map(([category, items]) => (
          <CommandGroup
            key={category}
            heading={getCategoryTitle(category as SearchCategory)}
          >
            {items.map((result) => {
              const Icon = result.icon;
              return (
                <CommandItem
                  key={result.id}
                  value={`${result.title} ${result.subtitle || ""}`}
                  onSelect={() => handleSelect(result.href)}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <div className="flex flex-col">
                    <span>{result.title}</span>
                    {result.subtitle && (
                      <span className="text-xs text-muted-foreground">
                        {result.subtitle}
                      </span>
                    )}
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
