import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/shadcn/Card.tsx";
import { Button } from "../components/shadcn/Button.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/shadcn/Dialog.tsx";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/shadcn/Form.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/shadcn/Table.tsx";
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  type PaginationState,
  useReactTable,
} from "@tanstack/react-table";
import { DataTablePagination } from "../components/shadcn/Datatablepagination.tsx";
import { Input } from "../components/shadcn/Input.tsx";
import { Badge } from "../components/shadcn/Badge.tsx";
import { Separator } from "../components/shadcn/Separator.tsx";
import { toast } from "sonner";
import { useCoreApi } from "../contexts/CoreApi.tsx";
import { Copy, Key, Loader, Plus, Trash, User } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TokenApiTypes } from "@stackcore/core/responses";

type Token = {
  id: number;
  name: string;
  maskedUuid: string;
  last_used_at: Date | null;
  created_at: Date;
};

export default function ProfilePage() {
  const coreApi = useCoreApi();
  const user = coreApi.getUserFromToken();

  const [isBusy, setIsBusy] = useState(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [total, setTotal] = useState(0);

  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  async function getTokens(pagination: PaginationState) {
    setIsBusy(true);

    const page = pagination.pageIndex + 1;
    const pageSize = pagination.pageSize;

    try {
      const { url, method } = TokenApiTypes.prepareGetTokens({
        page,
        limit: pageSize,
      });

      const response = await coreApi.handleRequest(url, method);

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to get tokens");
      }

      const data = await response.json() as TokenApiTypes.GetTokensResponse;

      setTokens(data.results);
      setTotal(data.total);
    } catch (error) {
      console.error(error);
      toast.error("Failed to get tokens");
    } finally {
      setIsBusy(false);
    }
  }

  useEffect(() => {
    getTokens(pagination);
  }, []);

  const columns: ColumnDef<Token>[] = [
    {
      accessorKey: "name",
      header: "Token Name",
      cell: ({ row }) => {
        return (
          <div className="flex items-center space-x-2">
            <Key size={16} />
            <span>{row.original.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "maskedUuid",
      header: "Token",
      cell: ({ row }) => {
        return (
          <Badge variant="outline" className="font-mono">
            {row.original.maskedUuid}
          </Badge>
        );
      },
    },
    {
      accessorKey: "last_used_at",
      header: "Last Used",
      cell: ({ row }) => {
        return (
          <div>
            {row.original.last_used_at
              ? new Date(row.original.last_used_at).toLocaleDateString()
              : "Never"}
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
          <DeleteTokenDialog
            token={row.original}
            onDeleted={() => getTokens(pagination)}
            disable={isBusy}
          />
        );
      },
    },
  ];

  const table = useReactTable({
    data: tokens,
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
      await getTokens(newPagination);
    },
  });

  return (
    <div className="w-full max-w-7xl mx-auto mt-5 space-y-4">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User />
            <span>Profile</span>
          </CardTitle>
          <CardDescription>
            Manage your account settings and API tokens
          </CardDescription>
        </CardHeader>
      </Card>

      {/* User Information */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
          <CardDescription>
            Your account details and basic information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>{user?.email || "Not available"}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* API Tokens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Key />
              <span>API Tokens</span>
            </div>
            <CreateTokenDialog
              onCreated={() => getTokens(pagination)}
              disable={isBusy}
            />
          </CardTitle>
          <CardDescription>
            Manage your API tokens for programmatic access. Keep these tokens
            secure and never share them.
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
                          <Key />
                          <p>No API tokens found</p>
                          <p>
                            Create your first token to get started with the API
                          </p>
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

function CreateTokenDialog(
  props: {
    onCreated: () => void;
    disable: boolean;
  },
) {
  const [isBusy, setIsBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const coreApi = useCoreApi();

  const formSchema = z.object({
    name: z.string().min(1, "Token name is required").max(100),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
    disabled: isBusy,
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsBusy(true);
    try {
      const { url, method, body } = TokenApiTypes.prepareCreateToken({
        name: values.name,
      });

      const response = await coreApi.handleRequest(
        url,
        method,
        body,
      );

      if (!response.ok || response.status !== 201) {
        throw new Error("Failed to create token");
      }

      const data = await response.json() as TokenApiTypes.CreateTokenResponse;

      setCreatedToken(data.uuid);
      toast.success("Token created");
      props.onCreated();
      form.reset();
    } catch (error) {
      console.error(error);
      toast.error("Failed to create token");
    } finally {
      setIsBusy(false);
    }
  }

  function handleOpenChange(open: boolean) {
    setOpen(open);
    if (!open) {
      setCreatedToken(null);
      form.reset();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button disabled={props.disable}>
          <Plus />
          Create Token
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create API Token</DialogTitle>
          <DialogDescription>
            Create a new API token for programmatic access to your account.
          </DialogDescription>
        </DialogHeader>

        {createdToken
          ? (
            <div className="space-y-4">
              <div className="p-4 rounded-lg">
                <p className="text-sm font-medium mb-2">Your new API token:</p>
                <div className="flex items-center gap-2">
                  <code className="p-2 border rounded text-sm">
                    {createdToken}
                  </code>
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(createdToken);
                      toast.info("Copied to clipboard");
                    }}
                  >
                    <Copy />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="font-medium text-destructive">
                  Important: Copy this token now!
                </p>
                <p>
                  This is the only time you'll be able to see the full token.
                  Store it securely and never share it with anyone.
                </p>
              </div>
              <div className="flex justify-end">
                <DialogClose asChild>
                  <Button>Done</Button>
                </DialogClose>
              </div>
            </div>
          )
          : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Token Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., My API Token" />
                      </FormControl>
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
                    Create Token
                  </Button>
                </div>
              </form>
            </Form>
          )}
      </DialogContent>
    </Dialog>
  );
}

function DeleteTokenDialog(
  props: {
    token: Token;
    onDeleted: () => void;
    disable: boolean;
  },
) {
  const [isBusy, setIsBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const coreApi = useCoreApi();

  async function handleDelete() {
    setIsBusy(true);
    try {
      const { url, method } = TokenApiTypes.prepareDeleteToken(props.token.id);

      const response = await coreApi.handleRequest(url, method);

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to delete token");
      }

      toast.success("Token deleted");
      props.onDeleted();
      setOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete token");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" size="icon" disabled={props.disable}>
          <Trash />
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Delete API Token</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            You are about to delete the API token{" "}
            <span className="font-bold">{props.token.name}</span>.
          </div>
          <div className="text-muted-foreground">
            This action cannot be undone. Any applications using this token will
            no longer be able to access the API.
          </div>
          <Separator />
          <span className="font-bold text-destructive">
            This action is irreversible.
          </span>
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button type="button" disabled={isBusy}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            onClick={handleDelete}
            variant="destructive"
            disabled={isBusy}
          >
            {isBusy && <Loader className="animate-spin" />}
            Delete Token
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
