import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/shadcn/Card.tsx";
import { Input } from "../../components/shadcn/Input.tsx";
import LoggedInLayout from "../../layout/loggedIn.tsx";
import { Button } from "../../components/shadcn/Button.tsx";
import { Loader } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "../../components/shadcn/hooks/use-toast.tsx";
import { useCoreApi } from "../../contexts/CoreApi.tsx";
import { useOrganization } from "../../contexts/Organization.tsx";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../../components/shadcn/Form.tsx";

export default function AddOrganizationPage() {
  const navigate = useNavigate();

  const coreApi = useCoreApi();
  const { refreshOrganizations } = useOrganization();
  const [isBusy, setIsBusy] = useState(false);

  const formSchema = z.object({
    name: z.string().min(1).max(50),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    disabled: isBusy,
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsBusy(true);

    try {
      const response = await coreApi.handleRequest(
        "/organizations",
        "POST",
        {
          name: values.name,
        },
      );

      if (!response.ok || response.status !== 201) {
        const { error } = await response.json();
        if (error && error === "organization_already_exists") {
          form.setError("name", {
            message: "Organization already exists",
          });
          setIsBusy(false);
          return;
        }

        throw new Error("Failed to create organization");
      }

      toast({
        title: "Organization created",
        description: "You can now manage your organization",
      });

      const organization = await response.json() as { id: number };

      await refreshOrganizations();

      navigate(`/organizations/${organization.id}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive",
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <LoggedInLayout>
      <Card className="mt-20 w-md mx-auto">
        <CardHeader>
          <CardTitle>Create new organization</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col space-y-4"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                disabled={isBusy}
                className="flex items-center space-x-2"
              >
                {isBusy && <Loader className="animate-spin" />}
                <div>
                  Create
                </div>
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </LoggedInLayout>
  );
}
