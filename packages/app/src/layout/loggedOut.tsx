import { Moon, Sun } from "lucide-react";
import { Button } from "../components/shadcn/Button.tsx";
import { useTheme } from "../contexts/ThemeProvider.tsx";
import { Outlet } from "react-router";

export default function LoggedOutLayout() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "light" ? "dark" : "light")}
        className="absolute top-2 right-2"
      >
        {theme === "light" ? <Moon /> : <Sun />}
      </Button>
      <Outlet />
    </div>
  );
}
