import { Link, useNavigate, useOutletContext } from "react-router";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../components/shadcn/Card.tsx";
import { Button } from "../../../components/shadcn/Button.tsx";
import {
  BillingApiTypes,
  MemberApiTypes,
  WorkspaceApiTypes,
} from "@stackcore/core/responses";
import { Check, CreditCard, Loader } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../../components/shadcn/Dialog.tsx";
import { toast } from "../../../components/shadcn/hooks/use-toast.tsx";
import { useCoreApi } from "../../../contexts/CoreApi.tsx";
import type { WorkspacePageContext } from "./index.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/shadcn/Table.tsx";
import { Skeleton } from "../../../components/shadcn/Skeleton.tsx";
import { Badge } from "../../../components/shadcn/Badge.tsx";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "../../../components/shadcn/Tabs.tsx";

export default function WorkspaceSubscription() {
  const context = useOutletContext<WorkspacePageContext>();

  const coreApi = useCoreApi();

  const [subscription, setSubscription] = useState<
    BillingApiTypes.SubscriptionDetails | undefined
  >(undefined);
  const [billingCycle, setBillingCycle] = useState<
    WorkspaceApiTypes.StripeBillingCycle
  >(
    WorkspaceApiTypes.YEARLY_BILLING_CYCLE,
  );

  useEffect(() => {
    getSubscription(context.workspace.id);
  }, [context.workspace]);

  async function getSubscription(workspaceId: number) {
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
    }
  }

  const [stripePortalBusy, setStripePortalBusy] = useState(false);

  async function goToStripePortal() {
    setStripePortalBusy(true);

    try {
      const { url, method, body } = BillingApiTypes.prepareCreatePortalSession({
        workspaceId: context.workspace.id,
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
      setStripePortalBusy(false);
    }
    // We do not set stripePortalBusy to false here because
    // the user will be redirected to the billing portal anyway
    // however this sometimes takes a while to load, so we don't want to
    // show a loading state false to the user in the meantime
  }

  const [stripePortalPaymentMethodBusy, setStripePortalPaymentMethodBusy] =
    useState(false);

  async function goToStripePortalPaymentMethod() {
    setStripePortalPaymentMethodBusy(true);

    try {
      const { url, method, body } = BillingApiTypes
        .prepareCreatePortalSessionPaymentMethod({
          workspaceId: context.workspace.id,
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
      setStripePortalPaymentMethodBusy(false);
    }
    // We do not set stripePortalBusy to false here because
    // the user will be redirected to the billing portal anyway
    // however this sometimes takes a while to load, so we don't want to
    // show a loading state false to the user in the meantime
  }

  function getChangeType(
    currentProduct: WorkspaceApiTypes.StripeProduct,
    currentBillingCycle: WorkspaceApiTypes.StripeBillingCycle | null,
    newProduct: WorkspaceApiTypes.StripeProduct,
    newBillingCycle: WorkspaceApiTypes.StripeBillingCycle,
  ): "upgrade" | "downgrade" | "same" | "custom" {
    if (
      currentProduct === WorkspaceApiTypes.CUSTOM_PRODUCT ||
      newProduct === WorkspaceApiTypes.CUSTOM_PRODUCT ||
      currentBillingCycle === null
    ) {
      return "custom";
    }

    // Check if changing to a higher tier product
    const isUpgradingProduct =
      (currentProduct === WorkspaceApiTypes.BASIC_PRODUCT &&
        [WorkspaceApiTypes.PRO_PRODUCT, WorkspaceApiTypes.PREMIUM_PRODUCT]
          .includes(newProduct)) ||
      (currentProduct === WorkspaceApiTypes.PRO_PRODUCT &&
        newProduct === WorkspaceApiTypes.PREMIUM_PRODUCT);

    // If products are different, determine if upgrade or downgrade
    if (currentProduct !== newProduct) {
      return isUpgradingProduct ? "upgrade" : "downgrade";
    }

    // If only billing cycle changed, yearly is an upgrade from monthly
    if (currentBillingCycle !== newBillingCycle) {
      const isUpgradingBilling =
        currentBillingCycle === WorkspaceApiTypes.MONTHLY_BILLING_CYCLE &&
        newBillingCycle === WorkspaceApiTypes.YEARLY_BILLING_CYCLE;

      return isUpgradingBilling ? "upgrade" : "downgrade";
    }

    return "same";
  }

  if (!subscription) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full h-32" />
        <Skeleton className="w-full h-20" />
        <Skeleton className="w-full h-40" />
      </div>
    );
  }

  return (
    <>
      {/* Current Subscription Status */}
      <Card>
        <CardHeader>
          <CardTitle>Current Subscription</CardTitle>
          <CardDescription>
            View and manage your workspace subscription and billing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subscription status</TableHead>
                <TableHead>Payment method</TableHead>
                <TableHead>Current Subscription</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>
                  <div className="flex flex-col items-start gap-2">
                    {context.workspace.access_enabled
                      ? (
                        <Badge variant="secondary">
                          Up to date
                        </Badge>
                      )
                      : (
                        <Badge variant="destructive">
                          Access disabled. Update your payment method
                        </Badge>
                      )}
                    {context.workspace.role === MemberApiTypes.ADMIN_ROLE && (
                      <Button
                        onClick={goToStripePortal}
                        disabled={stripePortalBusy}
                        size="sm"
                      >
                        {stripePortalBusy
                          ? <Loader className="animate-spin" />
                          : <CreditCard />}
                        Invoices and payment method
                      </Button>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-2">
                    {subscription.hasDefaultPaymentMethod
                      ? (
                        <Badge variant="secondary">
                          Default payment method
                        </Badge>
                      )
                      : (
                        <Badge variant="destructive">
                          No payment method set
                        </Badge>
                      )}
                    <Button
                      size="sm"
                      onClick={goToStripePortalPaymentMethod}
                      disabled={stripePortalPaymentMethodBusy}
                    >
                      {stripePortalPaymentMethodBusy
                        ? <Loader className="animate-spin" />
                        : <CreditCard />}
                      Manage payment method
                    </Button>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start space-y-2">
                    <Badge variant="secondary">
                      {subscription.product}{" "}
                      ({subscription.billingCycle || "unknown"})
                    </Badge>
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
                          Once cancelled, your subscription will be downgraded
                          to{" "}
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
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      {subscription.product ===
          WorkspaceApiTypes.CUSTOM_PRODUCT
        ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Custom</CardTitle>
              <CardDescription>
                You are on a custom Subscription. Please contact us to change
                your subscription.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link
                to="mailto:support@nanoapi.io"
                className="font-bold hover:underline"
              >
                support@nanoapi.io
              </Link>
            </CardContent>
          </Card>
        )
        : (
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>
                Choose the plan that best fits your needs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-center">
                <Tabs
                  value={billingCycle}
                  onValueChange={(value) =>
                    setBillingCycle(
                      value as WorkspaceApiTypes.StripeBillingCycle,
                    )}
                >
                  <TabsList>
                    <TabsTrigger
                      value={WorkspaceApiTypes.MONTHLY_BILLING_CYCLE}
                    >
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger value={WorkspaceApiTypes.YEARLY_BILLING_CYCLE}>
                      Yearly
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {billingCycle ===
                  WorkspaceApiTypes.MONTHLY_BILLING_CYCLE
                ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={WorkspaceApiTypes.BASIC_PRODUCT}
                      title="Basic"
                      description="Perfect for trying out the platform"
                      features={[
                        "50 credits included",
                        "0.50 USD per additional credit",
                      ]}
                      subscriptionPrice="Free"
                      billingCycle={WorkspaceApiTypes
                        .MONTHLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        WorkspaceApiTypes.BASIC_PRODUCT,
                        WorkspaceApiTypes.MONTHLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={WorkspaceApiTypes.PRO_PRODUCT}
                      title="Pro"
                      description="Great for small teams and growing businesses"
                      features={[
                        "100 credits included",
                        "0.25 USD per additional credit",
                      ]}
                      subscriptionPrice="20 USD/month"
                      billingCycle={WorkspaceApiTypes
                        .MONTHLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        WorkspaceApiTypes.PRO_PRODUCT,
                        WorkspaceApiTypes.MONTHLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={WorkspaceApiTypes.PREMIUM_PRODUCT}
                      title="Premium"
                      description="Perfect for medium teams with high volume needs"
                      features={[
                        "500 credits included",
                        "0.10 USD per additional credit",
                        "Support through discord and email (under 24h)",
                      ]}
                      subscriptionPrice="50 USD/month"
                      billingCycle={WorkspaceApiTypes
                        .MONTHLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        WorkspaceApiTypes.PREMIUM_PRODUCT,
                        WorkspaceApiTypes.MONTHLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={WorkspaceApiTypes.CUSTOM_PRODUCT}
                      title="Custom pricing"
                      description="Everything tailored to your needs"
                      features={[]}
                      subscriptionPrice="Custom"
                      billingCycle={WorkspaceApiTypes
                        .MONTHLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        WorkspaceApiTypes.CUSTOM_PRODUCT,
                        WorkspaceApiTypes.MONTHLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                  </div>
                )
                : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={WorkspaceApiTypes.PRO_PRODUCT}
                      title="Pro"
                      description="Great for small teams and growing businesses"
                      features={[
                        "100 credits included",
                        "0.25 USD per additional credit",
                        "Save 20% compared to monthly subscription",
                      ]}
                      subscriptionPrice="200 USD/year"
                      billingCycle={WorkspaceApiTypes
                        .YEARLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        WorkspaceApiTypes.PRO_PRODUCT,
                        WorkspaceApiTypes.YEARLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={WorkspaceApiTypes.PREMIUM_PRODUCT}
                      title="Premium"
                      description="Perfect for medium teams with high volume needs"
                      features={[
                        "500 credits included",
                        "0.10 USD per additional credit",
                        "Support through discord and email (under 24h)",
                        "Save 20% compared to monthly subscription",
                      ]}
                      subscriptionPrice="500 USD/year"
                      billingCycle={WorkspaceApiTypes
                        .YEARLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        WorkspaceApiTypes.PREMIUM_PRODUCT,
                        WorkspaceApiTypes.YEARLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={WorkspaceApiTypes.CUSTOM_PRODUCT}
                      title="Custom pricing"
                      description="Everything tailored to your needs"
                      features={[]}
                      subscriptionPrice="Custom"
                      billingCycle={WorkspaceApiTypes
                        .YEARLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        WorkspaceApiTypes.CUSTOM_PRODUCT,
                        WorkspaceApiTypes.YEARLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                  </div>
                )}
            </CardContent>
          </Card>
        )}
    </>
  );
}

function SubscriptionCard(props: {
  workspaceId: number;
  currentSubscription: BillingApiTypes.SubscriptionDetails;
  product: WorkspaceApiTypes.StripeProduct;
  title: string;
  description: string;
  features: string[];
  subscriptionPrice: string;
  billingCycle: WorkspaceApiTypes.StripeBillingCycle;
  changeType: "upgrade" | "downgrade" | "same" | "custom";
  role: MemberApiTypes.MemberRole | null;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="text-center">
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>
          {props.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="grow flex flex-col justify-between gap-4">
        <div className="text-center text-3xl font-bold">
          {props.subscriptionPrice}
        </div>

        <ul className="space-y-3">
          {props.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 text-sm">
              <Check />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        {props.changeType === "same"
          ? <Button className="w-full" disabled>Current Subscription</Button>
          : props.changeType === "custom"
          ? (
            <Link
              to="mailto:support@nanoapi.io"
              target="_blank"
              className="w-full"
            >
              <Button className="w-full">
                Contact us support@nanoapi.io
              </Button>
            </Link>
          )
          : props.role === MemberApiTypes.MEMBER_ROLE
          ? (
            <Button className="w-full" disabled>
              Contact your workspace admin
            </Button>
          )
          : (
            <ChangeSubscriptionDialog
              workspaceId={props.workspaceId}
              changeType={props.changeType}
              newProduct={props.product}
              newBillingCycle={props.billingCycle}
            />
          )}
      </CardFooter>
    </Card>
  );
}

function ChangeSubscriptionDialog(props: {
  workspaceId: number;
  changeType: "upgrade" | "downgrade";
  newProduct: WorkspaceApiTypes.StripeProduct;
  newBillingCycle: WorkspaceApiTypes.StripeBillingCycle;
}) {
  const coreApi = useCoreApi();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);

  async function handleManagePaymentMethodClick() {
    setBusy(true);

    try {
      const { url, method, body } = BillingApiTypes
        .prepareCreatePortalSessionPaymentMethod({
          workspaceId: props.workspaceId,
          returnUrl: globalThis.location.href,
        });

      const response = await coreApi.handleRequest(url, method, body);

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const data = await response
        .json() as BillingApiTypes.CreatePortalSessionResponse;

      globalThis.location.href = data.url;
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to create portal session",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    setBusy(true);

    try {
      if (props.newProduct === WorkspaceApiTypes.CUSTOM_PRODUCT) {
        throw new Error("Custom product is not supported");
      }

      if (props.changeType === "upgrade") {
        const { url, method, body } = BillingApiTypes
          .prepareUpgradeSubscription({
            workspaceId: props.workspaceId,
            product: props.newProduct,
            billingCycle: props.newBillingCycle,
          });

        const response = await coreApi.handleRequest(url, method, body);

        if (!response.ok) {
          throw new Error("Failed to upgrade subscription");
        }

        toast({
          title: "Success",
          description: "Subscription upgraded successfully",
        });
      } else {
        const { url, method, body } = BillingApiTypes
          .prepareDowngradeSubscription({
            workspaceId: props.workspaceId,
            product: props.newProduct,
            billingCycle: props.newBillingCycle,
          });

        const response = await coreApi.handleRequest(url, method, body);

        if (!response.ok) {
          throw new Error("Failed to downgrade subscription");
        }

        toast({
          title: "Success",
          description: "Subscription downgraded successfully",
        });
      }
      navigate(`/workspaces/${props.workspaceId}`);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: (
          <div className="space-y-2">
            <div>
              Failed to update subscription. Make sure you have a payment method
              added to your account and try again.
            </div>
            <Button
              onClick={handleManagePaymentMethodClick}
              disabled={busy}
            >
              <CreditCard />
              Manage payment method
            </Button>
          </div>
        ),
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  }

  function Description() {
    if (props.changeType === "upgrade") {
      return (
        <div className="space-y-4 text-muted-foreground">
          <div>
            Your subscription will be upgraded immediately to{" "}
            <span className="font-bold">{props.newProduct}</span> with{" "}
            <span className="font-bold">{props.newBillingCycle}</span>{" "}
            billing. You will be billed for your existing subscription now, and
            your new subscription will start from today.
          </div>
          <div>
            Are you sure you want to upgrade your subscription?
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 text-muted-foreground">
        <div>
          You will retain access to your current subscription until the end of
          your billing cycle. After that, your subscription will be downgraded
          to <span className="font-bold">{props.newProduct}</span> with{" "}
          <span className="font-bold">{props.newBillingCycle}</span> billing.
        </div>
        <div>
          Are you sure you want to downgrade your subscription?
        </div>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="w-full"
          disabled={busy}
        >
          {props.changeType === "upgrade" ? "Upgrade" : "Downgrade"}
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>
            {props.changeType === "upgrade"
              ? "Upgrade subscription"
              : "Downgrade subscription"}
          </DialogTitle>
        </DialogHeader>

        <Description />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={busy}>
              Cancel
            </Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={busy}>
            {busy && <Loader className="animate-spin" />}
            Confirm {props.changeType === "upgrade" ? "Upgrade" : "Downgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
