import { useState } from "react";
import { Link, useMatches } from "react-router";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./shadcn/Breadcrumb.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./shadcn/Dropdownmenu.tsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./shadcn/Sheet.tsx";
import { Button } from "./shadcn/Button.tsx";
import { useIsMobile } from "./shadcn/hooks/use-mobile.tsx";
import { Ellipsis } from "lucide-react";

// Type for breadcrumb configuration
export interface BreadcrumbHandle {
  breadcrumb: {
    title:
      | string
      | ((params: Record<string, string>, data?: unknown) => string);
    href: string | ((params: Record<string, string>) => string);
  };
}

// Type for route match with breadcrumb handle
interface RouteMatch {
  id: string;
  pathname: string;
  params: Record<string, string>;
  data: unknown;
  handle?: BreadcrumbHandle;
}

// Maximum number of breadcrumb items to display before showing ellipsis (desktop only)
const ITEMS_TO_DISPLAY = 3;

export function AutoBreadcrumb() {
  const matches = useMatches() as RouteMatch[];
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // Filter matches that have breadcrumb configuration
  const breadcrumbMatches = matches.filter(
    (match) => match.handle?.breadcrumb,
  );

  if (breadcrumbMatches.length === 0) {
    return null;
  }

  // Helper function to resolve breadcrumb data
  const resolveBreadcrumb = (match: RouteMatch) => {
    const { breadcrumb } = match.handle!;

    const title = typeof breadcrumb.title === "function"
      ? breadcrumb.title(match.params, match.data)
      : breadcrumb.title;

    const href = typeof breadcrumb.href === "function"
      ? breadcrumb.href(match.params)
      : breadcrumb.href;

    return { title, href };
  };

  // Mobile: Just show a button with drawer containing all breadcrumbs
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon">
            <Ellipsis />
          </Button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Navigate to</SheetTitle>
            <SheetDescription>
              Select a page to navigate to.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-2 pb-5 px-4">
            {breadcrumbMatches.map((match, index) => {
              const { title, href } = resolveBreadcrumb(match);
              const isLast = index === breadcrumbMatches.length - 1;
              if (isLast) {
                return (
                  <div className="text-muted-foreground text-sm pl-3">
                    {title}
                  </div>
                );
              }
              return (
                <Link
                  key={match.id}
                  to={href}
                >
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setOpen(false)}
                  >
                    {title}
                  </Button>
                </Link>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Show responsive breadcrumb with ellipsis for long paths
  // If we have fewer items than the display limit, show all items normally
  if (breadcrumbMatches.length <= ITEMS_TO_DISPLAY) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbMatches.map((match, index) => {
            const isLast = index === breadcrumbMatches.length - 1;
            const { title, href } = resolveBreadcrumb(match);

            return (
              <div key={match.id} className="contents">
                <BreadcrumbItem>
                  {!isLast
                    ? (
                      <BreadcrumbLink asChild>
                        <Link to={href}>{title}</Link>
                      </BreadcrumbLink>
                    )
                    : <BreadcrumbPage>{title}</BreadcrumbPage>}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator />}
              </div>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  // Desktop: For long breadcrumbs, show with ellipsis
  const firstItem = breadcrumbMatches[0];
  const lastItems = breadcrumbMatches.slice(-ITEMS_TO_DISPLAY + 1);
  const middleItems = breadcrumbMatches.slice(1, -ITEMS_TO_DISPLAY + 1);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* First item */}
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to={resolveBreadcrumb(firstItem).href}>
              {resolveBreadcrumb(firstItem).title}
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />

        {/* Ellipsis with dropdown for middle items */}
        {middleItems.length > 0 && (
          <>
            <BreadcrumbItem>
              <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger
                  className="flex items-center gap-1"
                  aria-label="Toggle menu"
                >
                  <BreadcrumbEllipsis className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {middleItems.map((match) => {
                    const { title, href } = resolveBreadcrumb(match);
                    return (
                      <DropdownMenuItem key={match.id} asChild>
                        <Link to={href}>
                          {title}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
          </>
        )}

        {/* Last items */}
        {lastItems.map((match, index) => {
          const isLast = index === lastItems.length - 1;
          const { title, href } = resolveBreadcrumb(match);

          return (
            <div key={match.id} className="contents">
              <BreadcrumbItem>
                {!isLast
                  ? (
                    <BreadcrumbLink asChild>
                      <Link to={href}>{title}</Link>
                    </BreadcrumbLink>
                  )
                  : <BreadcrumbPage>{title}</BreadcrumbPage>}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
