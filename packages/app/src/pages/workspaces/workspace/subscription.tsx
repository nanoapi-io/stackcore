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
import { billingApiTypes, memberTypes, stripeTypes } from "@stackcore/shared";
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
import { toast } from "sonner";
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
    billingApiTypes.SubscriptionDetails | undefined
  >(undefined);
  const [billingCycle, setBillingCycle] = useState<
    stripeTypes.StripeBillingCycle
  >(
    stripeTypes.YEARLY_BILLING_CYCLE,
  );

  useEffect(() => {
    getSubscription(context.workspace.id);
  }, [context.workspace]);

  async function getSubscription(workspaceId: number) {
    try {
      const { url, method } = billingApiTypes.prepareGetSubscription(
        workspaceId,
      );

      const response = await coreApi.handleRequest(url, method);

      if (!response.ok || response.status !== 200) {
        throw new Error("Failed to get subscription");
      }

      const data = await response.json() as billingApiTypes.SubscriptionDetails;

      setSubscription(data);
    } catch (error) {
      console.error(error);
      toast.error("Failed to get subscription");
    }
  }

  const [stripePortalBusy, setStripePortalBusy] = useState(false);

  async function goToStripePortal() {
    setStripePortalBusy(true);

    try {
      const { url, method, body } = billingApiTypes.prepareCreatePortalSession({
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
      toast.error("Failed to go to billing portal");
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
      const { url, method, body } = billingApiTypes
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
      toast.error("Failed to go to billing portal");
      setStripePortalPaymentMethodBusy(false);
    }
    // We do not set stripePortalBusy to false here because
    // the user will be redirected to the billing portal anyway
    // however this sometimes takes a while to load, so we don't want to
    // show a loading state false to the user in the meantime
  }

  function getChangeType(
    currentProduct: stripeTypes.StripeProduct,
    currentBillingCycle: stripeTypes.StripeBillingCycle | null,
    newProduct: stripeTypes.StripeProduct,
    newBillingCycle: stripeTypes.StripeBillingCycle,
  ): "upgrade" | "downgrade" | "same" | "custom" {
    if (
      currentProduct === stripeTypes.CUSTOM_PRODUCT ||
      newProduct === stripeTypes.CUSTOM_PRODUCT ||
      currentBillingCycle === null
    ) {
      return "custom";
    }

    // Check if changing to a higher tier product
    const isUpgradingProduct = (currentProduct === stripeTypes.BASIC_PRODUCT &&
      [stripeTypes.PRO_PRODUCT, stripeTypes.PREMIUM_PRODUCT]
        .includes(newProduct)) ||
      (currentProduct === stripeTypes.PRO_PRODUCT &&
        newProduct === stripeTypes.PREMIUM_PRODUCT);

    // If products are different, determine if upgrade or downgrade
    if (currentProduct !== newProduct) {
      return isUpgradingProduct ? "upgrade" : "downgrade";
    }

    // If only billing cycle changed, yearly is an upgrade from monthly
    if (currentBillingCycle !== newBillingCycle) {
      const isUpgradingBilling =
        currentBillingCycle === stripeTypes.MONTHLY_BILLING_CYCLE &&
        newBillingCycle === stripeTypes.YEARLY_BILLING_CYCLE;

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
                <TableHead>Current Credits Usage</TableHead>
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
                    {context.workspace.role === memberTypes.ADMIN_ROLE && (
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
                <TableCell>
                  <Badge variant="secondary">
                    {subscription.currentUsage} credits
                  </Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      {subscription.product ===
          stripeTypes.CUSTOM_PRODUCT
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
                      value as stripeTypes.StripeBillingCycle,
                    )}
                >
                  <TabsList>
                    <TabsTrigger
                      value={stripeTypes.MONTHLY_BILLING_CYCLE}
                    >
                      Monthly
                    </TabsTrigger>
                    <TabsTrigger value={stripeTypes.YEARLY_BILLING_CYCLE}>
                      Yearly
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {billingCycle ===
                  stripeTypes.MONTHLY_BILLING_CYCLE
                ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={stripeTypes.BASIC_PRODUCT}
                      title="Basic"
                      description="Perfect for trying out the platform"
                      features={[
                        "5 credits included per month",
                        "2.00 USD per additional credit",
                      ]}
                      subscriptionPrice="Free"
                      billingCycle={stripeTypes
                        .MONTHLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        stripeTypes.BASIC_PRODUCT,
                        stripeTypes.MONTHLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={stripeTypes.PRO_PRODUCT}
                      title="Pro"
                      description="Great for small teams and growing businesses"
                      features={[
                        "50 credits included per month",
                        "1.00 USD per additional credit",
                      ]}
                      subscriptionPrice="20 USD/month"
                      billingCycle={stripeTypes
                        .MONTHLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        stripeTypes.PRO_PRODUCT,
                        stripeTypes.MONTHLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={stripeTypes.PREMIUM_PRODUCT}
                      title="Premium"
                      description="Perfect for medium teams with high volume needs"
                      features={[
                        "250 credits included per month",
                        "0.50 USD per additional credit",
                      ]}
                      subscriptionPrice="50 USD/month"
                      billingCycle={stripeTypes
                        .MONTHLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        stripeTypes.PREMIUM_PRODUCT,
                        stripeTypes.MONTHLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={stripeTypes.CUSTOM_PRODUCT}
                      title="Custom pricing"
                      description="Everything tailored to your needs"
                      features={[
                        "Anything you need",
                      ]}
                      subscriptionPrice="Custom"
                      billingCycle={stripeTypes
                        .MONTHLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        stripeTypes.CUSTOM_PRODUCT,
                        stripeTypes.MONTHLY_BILLING_CYCLE,
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
                      product={stripeTypes.PRO_PRODUCT}
                      title="Pro"
                      description="Great for small teams and growing businesses"
                      features={[
                        "50 credits included per month",
                        "1.00 USD per additional credit",
                        "2 months free compared to monthly subscription",
                      ]}
                      subscriptionPrice="200 USD/year"
                      billingCycle={stripeTypes
                        .YEARLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        stripeTypes.PRO_PRODUCT,
                        stripeTypes.YEARLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={stripeTypes.PREMIUM_PRODUCT}
                      title="Premium"
                      description="Perfect for medium teams with high volume needs"
                      features={[
                        "250 credits included per month",
                        "0.50 USD per additional credit",
                        "2 months free compared to monthly subscription",
                      ]}
                      subscriptionPrice="500 USD/year"
                      billingCycle={stripeTypes
                        .YEARLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        stripeTypes.PREMIUM_PRODUCT,
                        stripeTypes.YEARLY_BILLING_CYCLE,
                      )}
                      role={context.workspace.role}
                    />
                    <SubscriptionCard
                      workspaceId={context.workspace.id}
                      currentSubscription={subscription}
                      product={stripeTypes.CUSTOM_PRODUCT}
                      title="Custom pricing"
                      description="Everything tailored to your needs"
                      features={[
                        "Anything you need",
                      ]}
                      subscriptionPrice="Custom"
                      billingCycle={stripeTypes
                        .YEARLY_BILLING_CYCLE}
                      changeType={getChangeType(
                        subscription.product,
                        subscription.billingCycle,
                        stripeTypes.CUSTOM_PRODUCT,
                        stripeTypes.YEARLY_BILLING_CYCLE,
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
  currentSubscription: billingApiTypes.SubscriptionDetails;
  product: stripeTypes.StripeProduct;
  title: string;
  description: string;
  features: string[];
  subscriptionPrice: string;
  billingCycle: stripeTypes.StripeBillingCycle;
  changeType: "upgrade" | "downgrade" | "same" | "custom";
  role: memberTypes.MemberRole | null;
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
          : props.role === memberTypes.MEMBER_ROLE
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
  newProduct: stripeTypes.StripeProduct;
  newBillingCycle: stripeTypes.StripeBillingCycle;
}) {
  const coreApi = useCoreApi();
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);

  async function handleManagePaymentMethodClick() {
    setBusy(true);

    try {
      const { url, method, body } = billingApiTypes
        .prepareCreatePortalSessionPaymentMethod({
          workspaceId: props.workspaceId,
          returnUrl: globalThis.location.href,
        });

      const response = await coreApi.handleRequest(url, method, body);

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const data = await response
        .json() as billingApiTypes.CreatePortalSessionResponse;

      globalThis.location.href = data.url;
    } catch (error) {
      console.error(error);
      toast.error("Failed to create portal session");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit() {
    setBusy(true);

    try {
      if (props.newProduct === stripeTypes.CUSTOM_PRODUCT) {
        throw new Error("Custom product is not supported");
      }

      if (props.changeType === "upgrade") {
        const { url, method, body } = billingApiTypes
          .prepareUpgradeSubscription({
            workspaceId: props.workspaceId,
            product: props.newProduct,
            billingCycle: props.newBillingCycle,
          });

        const response = await coreApi.handleRequest(url, method, body);

        if (!response.ok) {
          throw new Error("Failed to upgrade subscription");
        }

        toast.success("Subscription upgraded successfully");
      } else {
        const { url, method, body } = billingApiTypes
          .prepareDowngradeSubscription({
            workspaceId: props.workspaceId,
            product: props.newProduct,
            billingCycle: props.newBillingCycle,
          });

        const response = await coreApi.handleRequest(url, method, body);

        if (!response.ok) {
          throw new Error("Failed to downgrade subscription");
        }

        toast.success("Subscription downgraded successfully");
      }
      navigate(`/workspaces/${props.workspaceId}`);
    } catch (error) {
      console.error(error);
      toast.error(
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
        </div>,
      );
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
