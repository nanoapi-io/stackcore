import {
  Check,
  ChevronsUpDown,
  Home,
  LogOut,
  Menu,
  Moon,
  Plus,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { Button } from "../components/shadcn/Button.tsx";
import { useTheme } from "../contexts/ThemeProvider.tsx";
import { Link, Outlet } from "react-router";
import { useCoreApi } from "../contexts/CoreApi.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/shadcn/Dropdownmenu.tsx";
import { useWorkspace } from "../contexts/Workspace.tsx";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../components/shadcn/Popover.tsx";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../components/shadcn/Command.tsx";
import { Badge } from "../components/shadcn/Badge.tsx";

export default function LoggedInLayout() {
  const { logout } = useCoreApi();
  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    isBusy,
    refreshWorkspaces,
  } = useWorkspace();

  useEffect(() => {
    if (!selectedWorkspaceId) {
      refreshWorkspaces();
    }
  }, []);

  const { theme, setTheme } = useTheme();

  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="w-full px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 font-bold text-2xl">
              <Link
                to="/"
                className="flex items-center gap-2 hover:opacity-80"
              >
                <img src="/logo.png" alt="NanoAPI" width={48} height={48} />
                <span>NanoAPI</span>
              </Link>

              <div className="flex items-center gap-2">
                <Link to="/">
                  <Button variant="outline" size="icon">
                    <Home />
                  </Button>
                </Link>

                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild disabled={isBusy}>
                    <Button
                      variant="secondary"
                      disabled={isBusy}
                      className="min-w-[200px] justify-between"
                    >
                      {selectedWorkspaceId
                        ? workspaces.find(
                          (workspace) => workspace.id === selectedWorkspaceId,
                        )?.name
                        : "Select workspace..."}
                      <ChevronsUpDown />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent>
                    <Button variant="link" className="w-full">
                      <Link
                        to="/workspaces/add"
                        className="flex items-center gap-2"
                      >
                        <Plus />
                        Create new workspace
                      </Link>
                    </Button>
                    <Command>
                      <CommandInput
                        disabled={isBusy}
                        placeholder="Search workspace..."
                      />
                      <CommandList>
                        <CommandEmpty>No workspaces found.</CommandEmpty>
                        <CommandGroup>
                          {workspaces.map((workspace) => (
                            <div
                              key={workspace.id}
                              className="flex items-center gap-2"
                            >
                              <CommandItem
                                key={workspace.id}
                                value={workspace.id.toString()}
                                disabled={isBusy}
                                onSelect={(currentValue) => {
                                  setSelectedWorkspaceId(Number(currentValue));
                                  setOpen(false);
                                }}
                                className="w-full"
                              >
                                {workspace.name}
                                {workspace.isTeam && (
                                  <Badge variant="secondary">Team</Badge>
                                )}
                                {selectedWorkspaceId === workspace.id && (
                                  <Check className="ml-auto" />
                                )}
                              </CommandItem>
                              <Link to={`/workspaces/${workspace.id}`}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    setSelectedWorkspaceId(workspace.id);
                                    setOpen(false);
                                  }}
                                >
                                  <Settings />
                                </Button>
                              </Link>
                            </div>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                {theme === "light" ? <Moon /> : <Sun />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuGroup>
                    <DropdownMenuItem>
                      <Link to="/user" className="flex items-center gap-2">
                        <User size={16} />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut size={16} />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="grow flex flex-col">
        <Outlet />
      </main>
    </div>
  );
}
