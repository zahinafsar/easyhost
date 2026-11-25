import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";
import { Tooltip } from "@/components/ui/tooltip";

export const ThemeToggle = ({ className, variant = "icon" }: { className?: string; variant?: "icon" | "segmented" }) => {
  const { theme, setTheme, toggleTheme } = useTheme();
  if (variant === "segmented") {
    return (
      <div role="radiogroup" aria-label="Theme" data-slot="theme-toggle" className={cn("inline-flex items-center gap-0.5 rounded-md border border-border bg-surface-2 p-0.5", className)}>
        <button
          type="button"
          role="radio"
          aria-checked={theme === "light"}
          aria-label="Light theme"
          onClick={() => setTheme("light")}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-checked:bg-surface aria-checked:text-foreground"
        >
          <Sun className="size-3.5" />
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={theme === "dark"}
          aria-label="Dark theme"
          onClick={() => setTheme("dark")}
          className="inline-flex size-7 cursor-pointer items-center justify-center rounded-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/40 aria-checked:bg-surface-3 aria-checked:text-foreground"
        >
          <Moon className="size-3.5" />
        </button>
      </div>
    );
  }
  let label = "Switch to dark theme";
  if (theme === "dark") {
    label = "Switch to light theme";
  }
  return (
    <Tooltip content={label}>
      <button
        type="button"
        aria-label={label}
        onClick={toggleTheme}
        data-slot="theme-toggle"
        className={cn("inline-flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-foreground transition-colors outline-none hover:bg-surface-2 focus-visible:ring-[3px] focus-visible:ring-ring/40", className)}
      >
        {theme === "dark" && <Sun className="size-4" />}
        {theme === "light" && <Moon className="size-4" />}
      </button>
    </Tooltip>
  );
};
