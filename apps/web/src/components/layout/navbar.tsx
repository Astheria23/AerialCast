"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, Bell, Moon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NavbarProps {
  userName?: string;
  userAvatar?: string;
}

export default function Navbar({
  userName = "Username",
  userAvatar,
}: NavbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={userAvatar || "/placeholder.svg"} alt={userName} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {userName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className="text-base font-medium">
          Hello, <span className="text-foreground">{userName}!</span>
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
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
        </Button>

        <Button variant="ghost" size="icon">
          <Moon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
