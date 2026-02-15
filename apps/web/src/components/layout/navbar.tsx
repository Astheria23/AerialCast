"use client";

import { Search, Bell, Moon, Sun } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { useAuth } from "@/hooks/auth.hooks";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const displayName = user?.full_name ?? "User";
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const avatarSrc = user?.avatar_url ?? undefined;

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatarSrc} alt={displayName} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {avatarInitial}
          </AvatarFallback>
        </Avatar>
        <span className="text-base font-medium">
          Hello, <span className="text-foreground">{displayName}!</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-64 hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search"
            className="pl-10 bg-secondary border-0"
          />
        </div>

        <Button variant="ghost" size="icon" className="sm:hidden">
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
    </div>
  );
}
