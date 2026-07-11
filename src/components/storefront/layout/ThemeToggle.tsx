"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ds/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ds/dropdown";

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

const topBarBtnClass = "h-9 w-9 shrink-0 [&_svg]:!size-5";

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={topBarBtnClass}
        aria-label="Toggle theme"
        disabled
      >
        <Sun className="opacity-60" strokeWidth={2.25} />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" className={topBarBtnClass} aria-label="Toggle theme">
          <Sun className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" strokeWidth={2.25} />
          <Moon className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" strokeWidth={2.25} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="h-4 w-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="h-4 w-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="h-4 w-4" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
