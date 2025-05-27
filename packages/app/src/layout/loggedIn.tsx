import {
  Check,
  ChevronsUpDown,
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
import { cn } from "../lib/utils.ts";
import { Link } from "react-router";
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
  CommandSeparator,
} from "../components/shadcn/Command.tsx";
import { Badge } from "../components/shadcn/Badge.tsx";

export default function LoggedInLayout(
  { children, className, navChildren, ...props }: {
    navChildren?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
  },
) {
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
    <div {...props} className={cn("min-h-screen flex flex-col", className)}>
      <div className="flex items-center justify-between space-x-2 border-b px-2 py-1">
        <div className="flex items-center space-x-2">
          <Link
            to="/"
            className="flex items-center space-x-2"
          >
            <img src="/logo.png" alt="NanoAPI" width={48} height={48} />
            <span className="text-2xl font-bold">NanoAPI</span>
          </Link>

          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild disabled={isBusy}>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[200px] justify-between"
                disabled={isBusy}
              >
                {selectedWorkspaceId
                  ? workspaces.find(
                    (workspace) =>
                      workspace.id === selectedWorkspaceId,
                  )?.name
                  : "Select workspace..."}
                <ChevronsUpDown className="opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <Command>
                <CommandGroup>
                  <Button variant="link" className="w-full">
                    <Link
                      to="/workspaces/new"
                      className="flex items-center space-x-2"
                    >
                      <Plus size={16} />
                      <div>
                        Create new workspace
                      </div>
                    </Link>
                  </Button>
                </CommandGroup>
                <CommandSeparator />
                <CommandInput
                  disabled={isBusy}
                  placeholder="Search workspace..."
                  className="h-9"
                />
                <CommandList>
                  <CommandEmpty>No workspaces found.</CommandEmpty>
                  <CommandGroup>
                    {workspaces.map((workspace) => (
                      <div className="flex items-center space-x-2">
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
                            <Badge variant="outline">Team</Badge>
                          )}
                          <Check
                            className={cn(
                              "ml-auto",
                              selectedWorkspaceId === workspace.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
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

          {navChildren}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() =>
              setTheme(theme === "light" ? "dark" : "light")}
          >
            {theme === "light" ? <Moon /> : <Sun />}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem>
                  <Link to="/user" className="flex items-center space-x-2">
                    <User size={16} />
                    <div>
                      Profile
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut size={16} />
                <div>
                  Log out
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {children}
    </div>
  );
}
