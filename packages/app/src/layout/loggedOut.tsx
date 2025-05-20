import { Moon, Sun } from "lucide-react";
import { Button } from "../components/shadcn/Button.tsx";
import { useTheme } from "../contexts/ThemeProvider.tsx";
import { cn } from "../lib/utils.ts";

export default function LoggedOutLayout(
  { children, className, ...props }: {
    children: React.ReactNode;
    className?: string;
  },
) {
  const { theme, setTheme } = useTheme();

  return (
    <div {...props} className={cn("min-h-screen", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="absolute top-2 right-2"
      >
        {theme === "light" ? <Moon /> : <Sun />}
      </Button>
      {children}
    </div>
  );
}
