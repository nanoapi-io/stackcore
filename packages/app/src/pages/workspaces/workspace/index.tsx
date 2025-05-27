import { Link, useNavigate, useParams } from "react-router";
import LoggedInLayout from "../../../layout/loggedIn.tsx";
import { useEffect, useState } from "react";
import { useWorkspace, type Workspace } from "../../../contexts/Workspace.tsx";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/shadcn/Card.tsx";
import { Separator } from "../../../components/shadcn/Separator.tsx";
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
import { Input } from "../../../components/shadcn/Input.tsx";
import { useCoreApi } from "../../../contexts/CoreApi.tsx";
import { toast } from "../../../components/shadcn/hooks/use-toast.tsx";
import { CalendarCog, CreditCard, Edit, Loader, Trash } from "lucide-react";
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
import {
  BillingApiTypes,
  MemberApiTypes,
  WorkspaceApiTypes,
} from "@stackcore/core/responses";
import { Skeleton } from "../../../components/shadcn/Skeleton.tsx";

type Member = {
  id: number;
  email: string;
  role: MemberApiTypes.MemberRole;
};

export default function WorkspacePage() {
  const coreApi = useCoreApi();
  const navigate = useNavigate();

  const [isBusy, setIsBusy] = useState(false);
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces } = useWorkspace();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [subscription, setSubscription] = useState<
    BillingApiTypes.SubscriptionDetails | null
  >(null);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    if (workspaces.length === 0) {
      return;
    }

    const workspace = workspaces.find(
      (w) => w.id === parseInt(workspaceId),
    );

    if (!workspace) {
      console.error("Workspace not found");
      navigate("/");
      return;
    }

    setWorkspace(workspace);

    getSubscription(workspace.id);
  }, [workspaces, workspaceId]);

  async function getSubscription(workspaceId: number) {
    setIsBusy(true);

    try {
      const { url, method } = BillingApiTypes.prepareGetSubscription(
        workspaceId,
      );

      const response = await coreApi.handleRequest(url, method);

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to get subscription");
      }

      const data = await response.json() as BillingApiTypes.SubscriptionDetails;

      setSubscription(data);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to get subscription",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function goToStripePortal() {
    if (!workspace) {
      return;
    }

    setIsBusy(true);

    try {
      const { url, method, body } = BillingApiTypes.prepareCreatePortalSession({
        workspaceId: workspace.id,
        returnUrl: globalThis.location.href,
      });

      const response = await coreApi.handleRequest(url, method, body);

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
          {workspace
            ? (
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-1">
                  <span>Workspace: {workspace.name}</span>
                  {workspace.isTeam && (
                    <Badge variant="outline" className="ml-2">Team</Badge>
                  )}
                </CardTitle>
                {(workspace &&
                  workspace.role === MemberApiTypes.ADMIN_ROLE &&
                  workspace.isTeam) && (
                  <DeactivateWorkspaceDialog
                    workspace={workspace}
                  />
                )}
              </div>
            )
            : <Skeleton className="w-full h-8" />}
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscription status</TableHead>
                <TableHead>Current Subscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                {workspace && subscription
                  ? (
                    <>
                      <TableCell>
                        <div className="flex flex-col items-start space-y-2">
                          {workspace.access_enabled
                            ? (
                              <Badge variant="outline">
                                Up to date
                              </Badge>
                            )
                            : (
                              <Badge variant="destructive">
                                Access disabled. Update your payment method
                              </Badge>
                            )}
                          <Button
                            onClick={goToStripePortal}
                            disabled={isBusy}
                          >
                            {isBusy
                              ? <Loader className="animate-spin" />
                              : <CreditCard />}
                            Invoices and payment method
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start space-y-2">
                          <Badge variant="outline">
                            {subscription.product}{" "}
                            ({subscription.billingCycle || "unknown"})
                          </Badge>
                          {workspace.role === MemberApiTypes.ADMIN_ROLE && (
                            <Link
                              to={`changeSubascription`}
                            >
                              <Button>
                                <CalendarCog />
                                Update current subscription
                              </Button>
                            </Link>
                          )}
                          {subscription.cancelAt && (
                            <div className="text-muted-foreground text-sm">
                              <p>
                                Your subscription will be canceled on{" "}
                                <span className="font-bold">
                                  {new Date(subscription.cancelAt)
                                    .toLocaleDateString()}
                                </span>.
                              </p>
                              <p>
                                Once cancelled, your subscription will be
                                downgraded to{" "}
                                <span className="font-bold">
                                  {subscription.newProductWhenCanceled ||
                                    "unknown"}
                                </span>{" "}
                                with{" "}
                                <span className="font-bold">
                                  {subscription.newBillingCycleWhenCanceled ||
                                    "unknown"}
                                </span>{" "}
                                billing.
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </>
                  )
                  : (
                    <TableCell colSpan={2}>
                      <Skeleton className="w-full h-12" />
                    </TableCell>
                  )}
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
        {workspace && workspace.isTeam && (
          <>
            <Separator className="my-3" />
            <CardHeader>
              <CardTitle>
                Members:
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workspace && <WorkspaceMembersTable workspace={workspace} />}
            </CardContent>
          </>
        )}
      </Card>
    </LoggedInLayout>
  );
}

function WorkspaceMembersTable(
  props: { workspace: Workspace },
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
      const { url, method } = MemberApiTypes.prepareGetMembers({
        workspaceId: props.workspace.id,
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
  }, [props.workspace]);

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

        if (props.workspace.role === MemberApiTypes.ADMIN_ROLE) {
          return (
            <div className="flex items-center space-x-2">
              <Badge
                variant={badgeVariant}
              >
                {row.original.role}
              </Badge>
              <EditMemberDialog
                workspace={props.workspace}
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

function DeactivateWorkspaceDialog(
  props: { workspace: Workspace },
) {
  const navigate = useNavigate();

  const coreApi = useCoreApi();
  const { refreshWorkspaces } = useWorkspace();

  const [isBusy, setIsBusy] = useState(false);

  const formSchema = z.object({
    name: z.string().refine(
      (value) => value === `deactivate ${props.workspace.name}`,
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
      const { url, method } = WorkspaceApiTypes.prepareDeactivateWorkspace(
        props.workspace.id,
      );

      const response = await coreApi.handleRequest(
        url,
        method,
      );

      if (!response.ok || response.status !== 204) {
        toast({
          title: "Error",
          description: "Failed to deactivate workspace",
          variant: "destructive",
        });
        setIsBusy(false);
        throw new Error("Failed to deactivate workspace");
      }

      await refreshWorkspaces();

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
          <DialogTitle>Deactivate workspace</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <div>
                You are about to deactivate the workspace{" "}
                <span className="font-bold">
                  {props.workspace.name}
                </span>.
              </div>
              <br />
              <span>
                All data associated with this workspace will be inaccessible
                (projects, manifests, reports...).
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
                      deactivate {props.workspace.name}
                    </span>
                    "
                  </FormLabel>
                  <FormControl>
                    <Input {...field} disabled={isBusy} autoComplete="off" />
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
                Deactivate
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
