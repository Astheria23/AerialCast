"use client";

import { Search, Bell, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { authService } from "@/services/auth.service";
import { GlobalSearch } from "@/components/layout/global-search";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const [userName, setUserName] = useState<string>("");
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      setUserName(user.full_name);
    }
  }, []);

  // Keyboard shortcut for global search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src="" alt={userName} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-base font-medium">
          <span className="text-foreground">{userName}</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Search... (⌘K)"
            className="pl-10 bg-secondary border-0 cursor-pointer"
            onClick={() => setSearchOpen(true)}
            readOnly
          />
        </div>

        <Button 
          variant="ghost" 
          size="icon" 
          className="sm:hidden"
          onClick={() => setSearchOpen(true)}
        >
          <Search className="h-5 w-5" />
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {/* <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" /> */}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
      </div>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
