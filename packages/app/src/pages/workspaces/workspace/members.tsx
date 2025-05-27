import { useEffect, useState } from "react";
import type { Workspace } from "../../../contexts/Workspace.tsx";
import { Button } from "../../../components/shadcn/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/shadcn/Dialog.tsx";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../../components/shadcn/Form.tsx";
import { useCoreApi } from "../../../contexts/CoreApi.tsx";
import { toast } from "../../../components/shadcn/hooks/use-toast.tsx";
import { Edit, Loader } from "lucide-react";
import { Badge } from "../../../components/shadcn/Badge.tsx";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/shadcn/Select.tsx";
import { MemberApiTypes } from "@stackcore/core/responses";
import { useOutletContext } from "react-router";
import type { WorkspacePageContext } from "./base.tsx";
import { Separator } from "../../../components/shadcn/Separator.tsx";

type Member = {
  id: number;
  email: string;
  role: MemberApiTypes.MemberRole;
};

export default function WorkspaceMembers() {
  const context = useOutletContext<WorkspacePageContext>();

  const coreApi = useCoreApi();

  const [isBusy, setIsBusy] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  async function getMembers(pagination: PaginationState) {
    setIsBusy(true);

    const page = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;

    try {
      const { url, method } = MemberApiTypes.prepareGetMembers({
        workspaceId: context.workspace.id,
        page,
        limit: pageSize,
      });

      const response = await coreApi.handleRequest(url, method);

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to get members");
      }

      const data = await response.json() as {
        results: Member[];
        total: number;
      };

      const members: Member[] = [];
      for (let i = 0; i < 10; i++) {
        members.push({
          id: i,
          email: `test${i}@test.com`,
          role: MemberApiTypes.MEMBER_ROLE,
        });
      }

      setMembers(data.results);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to get members",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    getMembers(pagination);
  }, [context.workspace]);

  const columns: ColumnDef<Member>[] = [
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const badgeVariant = row.original.role === MemberApiTypes.ADMIN_ROLE
          ? "default"
          : "outline";

        if (context.workspace.role === MemberApiTypes.ADMIN_ROLE) {
          return (
            <div className="flex items-center space-x-2">
              <Badge
                variant={badgeVariant}
              >
                {row.original.role}
              </Badge>
              <EditMemberDialog
                workspace={context.workspace}
                member={row.original}
                onEdited={() => {
                  getMembers(pagination);
                }}
                disable={isBusy}
              />
            </div>
          );
        } else {
          return (
            <Badge
              variant={badgeVariant}
            >
              {row.original.role}
            </Badge>
          );
        }
      },
    },
  ];

  const table = useReactTable({
    data: members,
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
      await getMembers(newPagination);
    },
  });

  return (
    <div>
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
                  <TableCell colSpan={3} className="h-24 text-center">
                    No results.
                  </TableCell>
                </TableRow>
              )}
          </TableBody>
        </Table>
      </div>
      <div className="mt-4">
        <DataTablePagination table={table} />
      </div>
    </div>
  );
}

function EditMemberDialog(
  props: {
    workspace: Workspace;
    member: Member;
    onEdited: () => void;
    disable: boolean;
  },
) {
  const [isBusy, setIsBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const coreApi = useCoreApi();

  const formSchema = z.object({
    role: z.enum([
      MemberApiTypes.ADMIN_ROLE,
      MemberApiTypes.MEMBER_ROLE,
    ]),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: props.member.role,
    },
    disabled: isBusy,
  });

  async function onSubmit() {
    setIsBusy(true);
    try {
      const { url, method, body } = MemberApiTypes.prepareUpdateMemberRole(
        props.member.id,
        {
          role: form.getValues("role"),
        },
      );

      const response = await coreApi.handleRequest(
        url,
        method,
        body,
      );

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to edit member");
      }

      toast({
        title: "Member updated",
        description: "Member role updated successfully",
      });
      props.onEdited();
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to edit member",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" disabled={props.disable}>
          <Edit />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update role for {props.member.email}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role for this member" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={MemberApiTypes.ADMIN_ROLE}>
                        admin
                      </SelectItem>
                      <SelectItem value={MemberApiTypes.MEMBER_ROLE}>
                        member
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isBusy}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isBusy}>
                {isBusy && <Loader className="animate-spin" />}
                Update
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
