import { useNavigate, useParams } from "react-router";
import LoggedInLayout from "../../layout/loggedIn.tsx";
import { useEffect, useState } from "react";
import {
  type Organization,
  useOrganization,
} from "../../contexts/Organization.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/shadcn/Card.tsx";
import { Separator } from "../../components/shadcn/Separator.tsx";
import { Button } from "../../components/shadcn/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/shadcn/Dialog.tsx";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/shadcn/Form.tsx";
import { Input } from "../../components/shadcn/Input.tsx";
import { useCoreApi } from "../../contexts/CoreApi.tsx";
import { toast } from "../../components/shadcn/hooks/use-toast.tsx";
import { CreditCard, Edit, Loader, Minus, Trash } from "lucide-react";
import { Badge } from "../../components/shadcn/Badge.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/shadcn/Table.tsx";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { DataTablePagination } from "../../components/shadcn/Datatablepagination.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/shadcn/Select.tsx";

type Member = {
  id: number;
  email: string;
  role: "admin" | "member";
};

export default function OrganizationPage() {
  const coreApi = useCoreApi();

  const [isBusy, setIsBusy] = useState(false);

  const { organizationId } = useParams<{ organizationId: string }>();

  const { organizations } = useOrganization();

  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const organization = organizations.find(
      (o) => o.id === parseInt(organizationId),
    );

    if (!organization) {
      return;
    }

    setOrganization(organization);
  }, [organizations, organizationId]);

  async function goToBillingPortal() {
    setIsBusy(true);
    try {
      const response = await coreApi.handleRequest(
        "/billing/portal",
        "POST",
        {
          organizationId: organization?.id,
          returnUrl: globalThis.location.href,
        },
      );

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to go to billing portal");
      }

      const data = await response.json();
      globalThis.location.href = data.url;
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to go to billing portal",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <LoggedInLayout>
      <Card className="w-full max-w-7xl mx-auto mt-5 mb-5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-1">
              <span>Organization: {organization?.name}</span>
              {organization?.type === "team" && (
                <Badge variant="outline" className="ml-2">Team</Badge>
              )}
            </CardTitle>
            {(organization && organization.role === "admin" &&
              organization.type === "team") && (
              <DeleteOrganizationDialog
                organization={organization}
              />
            )}
          </div>
        </CardHeader>
        <CardContent>
          <p>{organization?.type}</p>
          <p>{organization?.role}</p>
          <Button onClick={goToBillingPortal} disabled={isBusy}>
            {isBusy ? <Loader className="animate-spin" /> : <CreditCard />}
            Manage Plan
          </Button>
        </CardContent>
        <Separator className="my-3" />
        <CardHeader>
          <CardTitle>
            Members:
          </CardTitle>
        </CardHeader>
        <CardContent>
          {organization && (
            <OrganizationMembersTable organization={organization} />
          )}
        </CardContent>
      </Card>
    </LoggedInLayout>
  );
}

function OrganizationMembersTable(
  props: { organization: Organization },
) {
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
      const url =
        `/organizations/${props.organization.id}/members?page=${page}&limit=${pageSize}`;

      const response = await coreApi.handleRequest(url, "GET");

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
          role: "member",
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
  }, []);

  const columns: ColumnDef<Member>[] = [
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => {
        const badgeVariant = row.original.role === "admin"
          ? "default"
          : "outline";

        if (props.organization.role === "admin") {
          return (
            <div className="flex items-center space-x-2">
              <Badge
                variant={badgeVariant}
              >
                {row.original.role}
              </Badge>
              <EditMemberDialog
                organization={props.organization}
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
            {table.getRowModel().rows?.length
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

function DeleteOrganizationDialog(
  props: { organization: Organization },
) {
  const navigate = useNavigate();

  const coreApi = useCoreApi();
  const { refreshOrganizations } = useOrganization();

  const [isBusy, setIsBusy] = useState(false);

  const formSchema = z.object({
    name: z.string().refine(
      (value) => value === `delete ${props.organization.name}`,
      {
        message: "must match for confirmation",
      },
    ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
    disabled: isBusy,
  });

  async function onSubmit() {
    setIsBusy(true);
    try {
      const response = await coreApi.handleRequest(
        `/organizations/${props.organization.id}`,
        "DELETE",
      );

      if (!response.ok || response.status !== 204) {
        toast({
          title: "Error",
          description: "Failed to delete organization",
          variant: "destructive",
        });
        setIsBusy(false);
        throw new Error("Failed to delete organization");
      }

      await refreshOrganizations();

      navigate("/");
    } catch (error) {
      console.error(error);
    } finally {
      setIsBusy(false);
    }
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
        >
          <Trash />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete organization</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <div>
                You are about to delete the organization{" "}
                <span className="font-bold">
                  {props.organization.name}
                </span>.
              </div>
              <br />
              <span>
                All data associated with this organization will be lost
                (products,manifests, reports...).
              </span>
              <Separator className="my-2" />
              <span className="font-bold">This action is irreversible.</span>
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    To confirm, type "
                    <span className="font-bold">
                      delete {props.organization.name}
                    </span>
                    "
                  </FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <DialogClose asChild>
                <Button type="button" disabled={isBusy}>
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" variant="destructive" disabled={isBusy}>
                {isBusy && <Loader className="animate-spin" />}
                Permanently delete
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
    organization: Organization;
    member: Member;
    onEdited: () => void;
    disable: boolean;
  },
) {
  const [isBusy, setIsBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const coreApi = useCoreApi();

  const formSchema = z.object({
    role: z.enum(["admin", "member"]),
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
      const response = await coreApi.handleRequest(
        `/organizations/${props.organization.id}/members/${props.member.id}`,
        "PATCH",
        {
          role: form.getValues("role"),
        },
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
                      <SelectItem value="admin">
                        admin
                      </SelectItem>
                      <SelectItem value="member">
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
