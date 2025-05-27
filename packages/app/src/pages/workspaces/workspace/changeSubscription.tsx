import { Link, useNavigate, useParams } from "react-router";
import LoggedInLayout from "../../../layout/loggedIn.tsx";
import { useEffect, useState } from "react";
import { useWorkspace, type Workspace } from "../../../contexts/Workspace.tsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/shadcn/Card.tsx";
import { Separator } from "../../../components/shadcn/Separator.tsx";
import { Button } from "../../../components/shadcn/Button.tsx";
import { BillingApiTypes, WorkspaceApiTypes } from "@stackcore/core/responses";
import { Skeleton } from "../../../components/shadcn/Skeleton.tsx";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "../../../components/shadcn/ToggleGroup.tsx";
import { Badge } from "../../../components/shadcn/Badge.tsx";
import { Check, CreditCard, Loader2 } from "lucide-react";
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

export default function ChangeSubscriptionPage() {
  const coreApi = useCoreApi();
  const navigate = useNavigate();

  const [billingCycle, setBillingCycle] = useState<
    WorkspaceApiTypes.StripeBillingCycle
  >(
    WorkspaceApiTypes.YEARLY_BILLING_CYCLE,
  );

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

  return (
    <LoggedInLayout>
      <div className="w-full max-w-7xl mx-auto my-5 space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {workspace
                ? (
                  <div className="flex items-center space-x-2">
                    <span>
                      Change Subscription for workspace: {workspace.name}
                    </span>
                    {workspace.isTeam && <Badge variant="outline">Team</Badge>}
                  </div>
                )
                : <Skeleton className="h-6 w-full" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">
                Current Subscription:
              </span>
              {subscription
                ? (
                  <Badge variant="outline">
                    {subscription.product} ({subscription.billingCycle})
                  </Badge>
                )
                : <Skeleton className="w-full" />}
            </div>

            <Separator />

            {!isBusy && workspace && subscription
              ? (
                <div>
                  {subscription.product ===
                      WorkspaceApiTypes.CUSTOM_PRODUCT
                    ? (
                      <Card>
                        <CardHeader className="text-center">
                          <CardTitle>Custom</CardTitle>
                          <CardDescription>
                            You are on a custom Subscription. Please contact us
                            to change your subscription.
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
                      <div className="space-y-4">
                        <ToggleGroup
                          type="single"
                          value={billingCycle}
                          onValueChange={(value) =>
                            setBillingCycle(
                              value as WorkspaceApiTypes.StripeBillingCycle,
                            )}
                        >
                          <ToggleGroupItem
                            value={WorkspaceApiTypes.MONTHLY_BILLING_CYCLE}
                          >
                            Monthly
                          </ToggleGroupItem>
                          <ToggleGroupItem
                            value={WorkspaceApiTypes.YEARLY_BILLING_CYCLE}
                          >
                            Yearly (save 20%)
                          </ToggleGroupItem>
                        </ToggleGroup>

                        {billingCycle ===
                            WorkspaceApiTypes.MONTHLY_BILLING_CYCLE
                          ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <SubscriptionCard
                                workspaceId={workspace.id}
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
                              />
                              <SubscriptionCard
                                workspaceId={workspace.id}
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
                              />
                              <SubscriptionCard
                                workspaceId={workspace.id}
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
                              />
                              <SubscriptionCard
                                workspaceId={workspace.id}
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
                              />
                            </div>
                          )
                          : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <SubscriptionCard
                                workspaceId={workspace.id}
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
                              />
                              <SubscriptionCard
                                workspaceId={workspace.id}
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
                              />
                              <SubscriptionCard
                                workspaceId={workspace.id}
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
                              />
                            </div>
                          )}
                      </div>
                    )}
                </div>
              )
              : (
                <div className="space-y-5">
                  <Separator className="h-8" />
                  <Separator className="h-8" />
                  <Separator className="h-8" />
                  <Separator className="h-8" />
                  <Separator className="h-8" />
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    </LoggedInLayout>
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
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="text-center">
        <CardTitle>{props.title}</CardTitle>
        <CardDescription>
          {props.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="grow flex flex-col justify-between space-y-4">
        <div className="text-center text-3xl font-bold">
          {props.subscriptionPrice}
        </div>

        <ul className="space-y-3">
          {props.features.map((feature) => (
            <li key={feature} className="flex items-center space-x-2">
              <Check className="text-green-500 w-5 h-5" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>

        {props.changeType === "same"
          ? <Button className="w-full" disabled>Current Subscription</Button>
          : props.changeType === "custom"
          ? (
            <Link
              to="mailto:support@nanoapi.io"
              target="_blank"
            >
              <Button className="w-full">
                Contact us support@nanoapi.io
              </Button>
            </Link>
          )
          : (
            <ChangeSubscriptionDialog
              workspaceId={props.workspaceId}
              changeType={props.changeType}
              newProduct={props.product}
              newBillingCycle={props.billingCycle}
            />
          )}
      </CardContent>
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
      const { url, method, body } = BillingApiTypes.prepareCreatePortalSession({
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
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm {props.changeType === "upgrade" ? "Upgrade" : "Downgrade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
