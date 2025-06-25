import { useEffect, useState } from "react";
import type { Workspace } from "../../../contexts/Workspace.tsx";
import { Button } from "../../../components/shadcn/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
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
import { toast } from "sonner";
import { Edit, Loader, Plus } from "lucide-react";
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
import { InvitationApiTypes, MemberApiTypes } from "@stackcore/coreApiTypes";
import { useOutletContext } from "react-router";
import type { WorkspacePageContext } from "./index.tsx";
import { Separator } from "../../../components/shadcn/Separator.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/shadcn/Card.tsx";
import { Input } from "../../../components/shadcn/Input.tsx";

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
      toast.error("Failed to get members");
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
        return (
          <div className="flex items-center space-x-2">
            <Badge
              variant={row.original.role === MemberApiTypes.ADMIN_ROLE
                ? "default"
                : "secondary"}
            >
              {row.original.role}
            </Badge>
            {(context.workspace.role === MemberApiTypes.ADMIN_ROLE &&
              row.original.email !== coreApi.getUserFromToken()?.email) && (
              <EditMemberDialog
                workspace={context.workspace}
                member={row.original}
                onEdited={() => {
                  getMembers(pagination);
                }}
                disable={isBusy}
              />
            )}
          </div>
        );
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
    <Card>
      <CardHeader>
        <CardTitle>Workspace Members</CardTitle>
        <CardDescription>
          View and manage members and their roles in this workspace
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {context.workspace.role === MemberApiTypes.ADMIN_ROLE && (
          <InviteMemberDialog
            workspace={context.workspace}
            disable={isBusy}
          />
        )}
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
                      No results.
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

function InviteMemberDialog(
  props: {
    workspace: Workspace;
    disable: boolean;
  },
) {
  const [isBusy, setIsBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const coreApi = useCoreApi();

  const formSchema = z.object({
    email: z.string().email(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
    disabled: isBusy,
  });

  async function onSubmit() {
    setIsBusy(true);
    try {
      const { url, method, body } = InvitationApiTypes.prepareCreateInvitation(
        {
          workspaceId: props.workspace.id,
          email: form.getValues("email"),
          returnUrl: `${globalThis.location.origin}/invitations/claim`,
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

      toast.success("Invitation sent");
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to send invitation");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={props.disable}>
          <Plus />
          Invite someone to join this workspace
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a new member</DialogTitle>
          <DialogDescription>
            Send an email invitation to someone to join this workspace. They
            will receive an email with a link to accept the invitation and join
            as a member.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <Input {...field} />
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
                Invite
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
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

      toast.success("Member updated");
      props.onEdited();
    } catch (error) {
      console.error(error);
      toast.error("Failed to edit member");
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
          <DialogDescription>
            Change the member's role in this workspace. Admins can manage
            workspace settings, invite new members, and modify member roles.
            Members have standard access to workspace resources.
          </DialogDescription>
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
