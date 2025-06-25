import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useWorkspace } from "../../contexts/Workspace.tsx";
import { useCoreApi } from "../../contexts/CoreApi.tsx";
import { Button } from "../../components/shadcn/Button.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/shadcn/Card.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/shadcn/Table.tsx";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { DataTablePagination } from "../../components/shadcn/Datatablepagination.tsx";
import { toast } from "sonner";
import { PencilRuler, Plus } from "lucide-react";
import { ProjectApiTypes } from "@stackcore/coreApiTypes";
import { Separator } from "../../components/shadcn/Separator.tsx";

type Project = {
  id: number;
  name: string;
  workspace_id: number;
  max_code_char_per_symbol: number;
  max_code_char_per_file: number;
  max_char_per_symbol: number;
  max_char_per_file: number;
  max_code_line_per_symbol: number;
  max_code_line_per_file: number;
  max_line_per_symbol: number;
  max_line_per_file: number;
  max_dependency_per_symbol: number;
  max_dependency_per_file: number;
  max_dependent_per_symbol: number;
  max_dependent_per_file: number;
  max_cyclomatic_complexity_per_symbol: number;
  max_cyclomatic_complexity_per_file: number;
  created_at: Date;
};

export default function WorkspaceProjectsPage() {
  const { selectedWorkspaceId, workspaces } = useWorkspace();
  const coreApi = useCoreApi();

  const [isBusy, setIsBusy] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const selectedWorkspace = workspaces.find((w) =>
    w.id === selectedWorkspaceId
  );

  async function getProjects(pagination: PaginationState) {
    if (!selectedWorkspaceId) return;

    setIsBusy(true);

    const page = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;

    try {
      const { url, method } = ProjectApiTypes.prepareGetProjects({
        page,
        limit: pageSize,
        workspaceId: selectedWorkspaceId,
      });

      const response = await coreApi.handleRequest(url, method);

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to get projects");
      }

      const data = await response.json() as ProjectApiTypes.GetProjectsResponse;

      setProjects(data.results);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      toast.error("Failed to get projects");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    if (selectedWorkspaceId) {
      getProjects(pagination);
    }
  }, [selectedWorkspaceId]);

  const columns: ColumnDef<Project>[] = [
    {
      accessorKey: "name",
      header: "Project Name",
      cell: ({ row }) => {
        return (
          <div className="flex items-center space-x-2">
            <PencilRuler size={16} />
            <span>{row.original.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => {
        return (
          <div>
            {new Date(row.original.created_at).toLocaleDateString()}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        return (
          <Link to={`/projects/${row.original.id}`}>
            <Button variant="outline" size="sm">
              View Details
            </Button>
          </Link>
        );
      },
    },
  ];

  const table = useReactTable({
    data: projects,
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
      await getProjects(newPagination);
    },
  });

  if (!selectedWorkspaceId) {
    return (
      <div className="w-full max-w-7xl mx-auto mt-5">
        <Card>
          <CardHeader className="flex flex-col items-center gap-2">
            <CardTitle className="flex flex-col items-center gap-2">
              <PencilRuler />
              <div className="text-2xl">No Workspace Selected</div>
            </CardTitle>
            <CardDescription>
              Please select a workspace to view its projects
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto mt-5 space-y-4">
      {/* Workspace Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <PencilRuler />
              <span>Projects in {selectedWorkspace?.name}</span>
            </div>
            <Link to="/projects/add">
              <Button>
                <Plus />
                Create Project
              </Button>
            </Link>
          </CardTitle>
          <CardDescription>
            Manage and view all projects in this workspace. Each project
            represents a codebase where you can push and view manifests for
            specific commits.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Projects Table */}
      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
          <CardDescription>
            {total} projects in this workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <PencilRuler />
                          <p>No projects found</p>
                          <p>
                            Get started by creating your first project
                          </p>
                          <Link to="/projects/add">
                            <Button size="sm">
                              <Plus />
                              Create Project
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
              </TableBody>
            </Table>
          </div>
          <DataTablePagination table={table} />
        </CardContent>
      </Card>
    </div>
  );
}
