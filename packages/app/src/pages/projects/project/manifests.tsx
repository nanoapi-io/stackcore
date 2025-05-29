import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router";
import { Button } from "../../../components/shadcn/Button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/shadcn/Card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/shadcn/Table.tsx";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { DataTablePagination } from "../../../components/shadcn/Datatablepagination.tsx";
import { toast } from "../../../components/shadcn/hooks/use-toast.tsx";
import { Eye, Plus } from "lucide-react";
import { ManifestApiTypes } from "@stackcore/core/responses";
import { Separator } from "../../../components/shadcn/Separator.tsx";
import { Badge } from "../../../components/shadcn/Badge.tsx";
import { useCoreApi } from "../../../contexts/CoreApi.tsx";
import type { ProjectPageContext } from "./base.tsx";
import { Input } from "../../../components/shadcn/Input.tsx";

type Manifest = {
  id: number;
  project_id: number;
  created_at: Date;
  branch: string | null;
  commitSha: string | null;
  commitShaDate: Date | null;
  version: number;
};

export default function ProjectManifests() {
  const context = useOutletContext<ProjectPageContext>();
  const coreApi = useCoreApi();

  const [isBusy, setIsBusy] = useState(false);
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  async function getManifests(
    pagination: PaginationState,
    searchValue?: string,
  ) {
    setIsBusy(true);

    const page = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;

    try {
      const { url, method } = ManifestApiTypes.prepareGetManifests({
        projectId: context.project.id,
        page,
        limit: pageSize,
        search: searchValue || undefined,
      });

      const response = await coreApi.handleRequest(url, method);

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to get manifests");
      }

      const data = await response
        .json() as ManifestApiTypes.GetManifestsResponse;

      setManifests(data.results);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to get manifests",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    getManifests(pagination, search);
  }, [context.project.id]);

  // Handle search with debounce effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Reset to first page when searching
      const newPagination = { ...pagination, pageIndex: 0 };
      setPagination(newPagination);
      getManifests(newPagination, search);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const columns: ColumnDef<Manifest>[] = [
    {
      accessorKey: "version",
      header: "Version",
      cell: ({ row }) => {
        return (
          <Badge variant="outline">
            v{row.original.version}
          </Badge>
        );
      },
    },
    {
      accessorKey: "branch",
      header: "Branch",
      cell: ({ row }) => {
        return row.original.branch || (
          <span className="text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "commitSha",
      header: "Commit SHA",
      cell: ({ row }) => {
        const sha = row.original.commitSha;
        return sha
          ? <code className="text-sm">{sha.substring(0, 8)}</code>
          : <span className="text-muted-foreground">-</span>;
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        return new Date(row.original.created_at).toLocaleDateString();
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <div className="flex items-center space-x-2">
            <Link to={`/manifests/${row.original.id}`}>
              <Button variant="outline" size="icon">
                <Eye className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: manifests,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: true,
    rowCount: total,
    state: {
      pagination,
    },
    onPaginationChange: async (updater) => {
      if (typeof updater !== "function") return;
      const newPagination = updater(pagination);
      if (newPagination.pageSize !== pagination.pageSize) {
        newPagination.pageIndex = 0;
      }
      setPagination(newPagination);
      await getManifests(newPagination, search);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Manifests</CardTitle>
        <CardDescription>
          View and manage manifests for this project
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between space-x-4">
          <Input
            placeholder="Search manifests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Link to={`/projects/${context.project.id}/manifests/add`}>
            <Button>
              <Plus className="h-4 w-4" />
              Add Manifest
            </Button>
          </Link>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder ? null : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {isBusy
                ? (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllColumns().length}
                      className="space-y-2"
                    >
                      <Separator className="w-full h-4" />
                      <Separator className="w-full h-4" />
                      <Separator className="w-full h-4" />
                    </TableCell>
                  </TableRow>
                )
                : table.getRowModel().rows?.length
                ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )
                : (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllColumns().length}
                      className="h-24 text-center"
                    >
                      No manifests found.
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
      </CardContent>
    </Card>
  );
}
